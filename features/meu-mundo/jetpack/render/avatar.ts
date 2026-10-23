// O jogador do jetpack (mm3d-20): o avatar do Meu Mundo que a pessoa está
// usando (condição física ou skin vestida), no lugar do astronauta do jogo
// original. Mesmo GLB, mesma textura e mesmas animações do bairro
// (`avatarFiles`); o voo não tem clipe próprio — o corpo deita pelo invólucro
// (de cabeça para a frente, barriga para baixo) e as pernas balançam por cima
// do Idle. Assim gordo e forte mantêm o braço aberto do conjunto deles e
// nenhum arquivo novo é baixado. O jetpack é preso ao osso Spine2 e o fogo sai
// dos dois bocais na direção dos pés.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Particles } from './particles';
import { avatarFiles } from '../../engine/avatars';
import type { BodyId } from '../../types';

type Clip = 'idle' | 'fly' | 'impact';
type Mode = 'ready' | 'play' | 'empty' | 'dead';

/** Avatar de 1,76 m → ~1,25 m deitado, o tamanho do astronauta na tela. */
const MODEL_SCALE = 0.7;
/** Meio do corpo (m, no modelo em pé): vai para a origem do invólucro. */
const BODY_CENTER_Y = 0.92;

/**
 * Jetpack no espaço do osso Spine2 (m do modelo; +Y sobe a coluna, -Z são as
 * costas). O avatar é cabeçudo e de tronco curto: o pacote é maior que o do
 * astronauta em relação ao osso, para ler bem na tela.
 */
const PACK_SCALE = 1.7;
const PACK_CENTER = new THREE.Vector3(0, -0.03, -0.2);
/** Bocais: a mesma posição relativa do jogo original, ampliada com o pacote. */
const NOZZLES = [-1, 1].map((s) => new THREE.Vector3(0.055 * s, -0.13, -0.01).multiplyScalar(PACK_SCALE).add(PACK_CENTER));

function flameMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPower;
      void main() {
        // vUv.y = 1 no bocal, 0 na ponta da chama
        float along = vUv.y;
        float flick = 0.8 + 0.2 * sin(uTime * 60.0 + vUv.x * 25.0) * sin(uTime * 37.0);
        float core = smoothstep(0.35, 1.0, along);
        vec3 col = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.85, 0.35), core);
        col = mix(col, vec3(1.0, 0.75, 0.3), smoothstep(0.85, 1.0, along));
        float a = pow(along, 1.4) * flick * uPower;
        gl_FragColor = vec4(col * a * 1.25, a);
      }`,
  });
}

export class AvatarView {
  /** Posicionado pelo jogo no ponto (x, y) da simulação. */
  readonly root = new THREE.Group();
  /** Inclinação/vibração, separada do posicionamento. */
  private body = new THREE.Group();
  /** Deitar (voo) e girar (batida), em volta do meio do corpo. */
  private pose = new THREE.Group();
  private model!: THREE.Object3D;
  private mixer!: THREE.AnimationMixer;
  private idle: THREE.AnimationAction | null = null;
  private current: Clip = 'idle';
  private spine: THREE.Bone | null = null;
  private legs: THREE.Bone[] = [];
  /** Pose das pernas sem o balanço (o mixer só regrava osso cujo valor mudou). */
  private legBase: THREE.Quaternion[] = [];
  private flames: THREE.Mesh[] = [];
  private flameMat = flameMaterial();
  private glow: THREE.Sprite[] = [];
  private nozzleWorld = [new THREE.Vector3(), new THREE.Vector3()];
  private dirWorld = new THREE.Vector3();
  private power = 0;
  private emitAcc = 0;
  private pitch = 0;
  private lie = 0;
  private spin = 0;
  private spinV = 0;
  private timeScale = 1;
  private tmp = new THREE.Vector3();
  private qLeg = new THREE.Quaternion();
  private axisX = new THREE.Vector3(1, 0, 0);
  /** Turbo: contorno vermelho (casca da própria malha) + aura + brasas. */
  private outlineMat: THREE.MeshBasicMaterial | null = null;
  private outline: THREE.SkinnedMesh | null = null;
  private outlineWidth = { value: 0 };
  private aura: THREE.Sprite;
  private power01 = 0;
  private powerLeft = 0;
  private powerAcc = 0;

  constructor(
    scene: THREE.Scene,
    private fire: Particles,
    private smoke: Particles,
    private glowMap: THREE.Texture,
  ) {
    this.body.add(this.pose);
    this.root.add(this.body);
    scene.add(this.root);
    this.aura = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: 0xff1a0a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }),
    );
    this.aura.scale.set(2.6, 1.6, 1);
    this.aura.position.z = -0.4;
    this.aura.visible = false;
    this.body.add(this.aura);
  }

  async load(bodyId: BodyId, onProgress?: (ratio: number) => void) {
    const files = avatarFiles(bodyId);
    const loader = new GLTFLoader();
    let done = 0;
    const tick = () => onProgress?.(++done / 3);
    const [gltf, anims, tex] = await Promise.all([
      loader.loadAsync(files.body).then((g) => (tick(), g)),
      loader.loadAsync(files.anims).then((g) => (tick(), g)),
      new THREE.TextureLoader().loadAsync(files.texture).then((t) => (tick(), t)),
    ]);
    // Convenção do glTF (a mesma do Babylon com invertY = false).
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    // Igual ao material do bairro: o basecolor já traz o sombreado pintado,
    // então difuso + emissivo (a luz do espaço, escura e vermelha, não apaga o boneco).
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      color: new THREE.Color(0.72, 0.72, 0.72),
      emissiveMap: tex,
      emissive: new THREE.Color(0.48, 0.48, 0.48),
    });

    this.model = gltf.scene;
    // As animações do Mixamo olham para +Z; o percurso anda em +X.
    this.model.rotation.y = Math.PI / 2;
    this.model.scale.setScalar(MODEL_SCALE);
    this.model.position.y = -BODY_CENTER_Y * MODEL_SCALE;
    this.model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        mesh.material = mat;
      }
      if ((o as THREE.Bone).isBone) {
        if (/Spine2$/.test(o.name)) this.spine = o as THREE.Bone;
        if (/UpLeg$/.test(o.name)) {
          this.legs.push(o as THREE.Bone);
          this.legBase.push((o as THREE.Bone).quaternion.clone());
        }
      }
    });
    this.pose.add(this.model);
    this.buildOutline();

    this.mixer = new THREE.AnimationMixer(this.model);
    const clip = anims.animations.find((c) => c.name === 'Idle');
    if (clip) {
      this.idle = this.mixer.clipAction(clip);
      this.idle.play();
    }
    if (this.spine) this.buildJetpack(this.spine);
  }

  /**
   * Contorno: cópia da malha com a mesma pele/esqueleto, inflada pelas normais e
   * desenhada só por trás (BackSide). Acompanha qualquer animação sem custo extra
   * de CPU; fica invisível quando não há turbo.
   */
  private buildOutline() {
    let skinned: THREE.SkinnedMesh | null = null;
    this.model.traverse((o) => {
      if (!skinned && (o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
    });
    const sm = skinned as THREE.SkinnedMesh | null;
    if (!sm) return;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 0.15, 0.05),
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uOutline = this.outlineWidth;
      shader.vertexShader =
        'uniform float uOutline;\n' +
        shader.vertexShader.replace(
          '#include <skinning_vertex>',
          '#include <skinning_vertex>\n  transformed += normalize(objectNormal) * uOutline;',
        );
    };
    const shell = new THREE.SkinnedMesh(sm.geometry, mat);
    shell.bind(sm.skeleton, sm.bindMatrix);
    shell.position.copy(sm.position);
    shell.quaternion.copy(sm.quaternion);
    shell.scale.copy(sm.scale);
    shell.frustumCulled = false;
    shell.renderOrder = 4;
    shell.visible = false;
    sm.parent!.add(shell);
    this.outlineMat = mat;
    this.outline = shell;
  }

  /** Liga/desliga o visual do turbo; `left` = segundos restantes (pisca no fim). */
  setPower(left: number) {
    this.powerLeft = left;
  }

  private buildJetpack(spine: THREE.Bone) {
    const pack = new THREE.Group();
    pack.position.copy(PACK_CENTER);
    pack.scale.setScalar(PACK_SCALE);
    // Tanque em metal grafite: branco virava uma caixa estourada no bloom.
    const shell = new THREE.MeshStandardMaterial({ color: 0x5a5e66, metalness: 0.7, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d21, metalness: 0.8, roughness: 0.4 });
    const red = new THREE.MeshBasicMaterial({ color: 0xff1a12 });
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.09), shell);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.025, 0.092), red);
    stripe.position.y = 0.05;
    pack.add(tank, stripe);
    for (const n of NOZZLES) {
      const local = n.clone().sub(PACK_CENTER).divideScalar(PACK_SCALE);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.07, 12, 1, true), dark);
      nozzle.position.copy(local).add(new THREE.Vector3(0, 0.02, 0));
      pack.add(nozzle);
      // Chama: cone apontando para -Y do osso (pés), com a base no bocal.
      const geo = new THREE.ConeGeometry(0.045, 0.5, 14, 1, true);
      geo.rotateX(Math.PI); // ponta para baixo
      geo.translate(0, -0.25, 0);
      const flame = new THREE.Mesh(geo, this.flameMat);
      flame.position.copy(n);
      flame.renderOrder = 5;
      spine.add(flame);
      this.flames.push(flame);
      const g = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowMap, color: 0xff7a2a, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      g.position.copy(n).add(new THREE.Vector3(0, -0.04, 0));
      g.scale.setScalar(0.3);
      spine.add(g);
      this.glow.push(g);
    }
    spine.add(pack);
  }

  /** Estado visual: em pé flutuando, voando deitado ou batendo (giro de queda). */
  play(clip: Clip, _fade = 0.25) {
    if (clip === 'impact' && this.current !== 'impact') this.spinV = 9;
    if (clip !== 'impact') {
      this.spin = 0;
      this.spinV = 0;
    }
    this.current = clip;
  }

  setTimeScale(s: number) {
    this.timeScale = s;
    if (this.idle) this.idle.timeScale = s;
  }

  /**
   * thrust: jetpack ligado; vy: velocidade vertical (inclinação);
   * mode: estado visual do personagem.
   */
  update(dt: number, time: number, thrust: boolean, vy: number, mode: Mode) {
    if (!this.mixer) return;
    // Tira o balanço do quadro anterior antes do mixer: clipe parado não regrava
    // o osso, e o balanço somaria quadro a quadro (pernas a 90°).
    for (let i = 0; i < this.legs.length; i++) this.legs[i].quaternion.copy(this.legBase[i]);
    this.mixer.update(dt);
    for (let i = 0; i < this.legs.length; i++) this.legBase[i].copy(this.legs[i].quaternion);

    // Deitar: voando fica na horizontal; sem combustível, meio caído; parado, em pé.
    const lieWant = this.current === 'idle' ? 0 : mode === 'empty' ? 0.75 : 1;
    this.lie += (lieWant - this.lie) * (1 - Math.exp(-dt * 7));
    // Batida: gira e perde o giro aos poucos.
    this.spin += this.spinV * dt;
    this.spinV *= Math.exp(-dt * 1.6);
    this.pose.rotation.z = -this.lie * (Math.PI / 2) - this.spin;

    // Pernas: balançam devagar no voo (por cima da pose que o mixer acabou de pôr).
    if (this.lie > 0.05 && dt > 0) {
      for (let i = 0; i < this.legs.length; i++) {
        const swing = (0.12 + Math.sin(time * 5.2 * this.timeScale + i * Math.PI) * 0.1) * this.lie;
        this.legs[i].quaternion.multiply(this.qLeg.setFromAxisAngle(this.axisX, swing));
      }
    }

    // Inclinação: sobe de nariz para cima, cai de nariz para baixo.
    const target = mode === 'ready' ? 0 : mode === 'dead' ? this.pitch : THREE.MathUtils.clamp(vy * 0.05, -0.38, 0.3);
    this.pitch += (target - this.pitch) * (1 - Math.exp(-dt * 9));
    this.body.rotation.z = this.pitch;
    // Vibração do equipamento com o jetpack ligado.
    const shake = thrust ? 0.012 : 0;
    this.body.position.set(Math.sin(time * 83) * shake, Math.cos(time * 71) * shake, 0);
    if (mode === 'ready') this.body.position.y += Math.sin(time * 2) * 0.06;

    // Potência da chama: sobe rápido, apaga com um rabicho curto.
    const want = thrust ? 1 : mode === 'ready' ? 0.12 : 0;
    this.power += (want - this.power) * (1 - Math.exp(-dt * (thrust ? 30 : 12)));
    this.flameMat.uniforms.uPower.value = this.power;
    this.flameMat.uniforms.uTime.value = time;
    const len = 0.35 + this.power * 0.9 + Math.sin(time * 50) * 0.05 * this.power;
    for (const f of this.flames) {
      f.visible = this.power > 0.02;
      const w = (0.8 + this.power * 0.5) * PACK_SCALE;
      f.scale.set(w, len * PACK_SCALE, w);
    }
    for (const g of this.glow) {
      g.visible = this.power > 0.02;
      g.scale.setScalar((0.18 + this.power * 0.4) * PACK_SCALE);
      g.material.opacity = Math.min(1, this.power * 1.4);
    }

    if (this.spine && this.power > 0.05) this.emitTrail(dt, thrust);
    this.updatePower(dt, time);
  }

  private updatePower(dt: number, time: number) {
    const on = this.powerLeft > 0;
    this.power01 += ((on ? 1 : 0) - this.power01) * (1 - Math.exp(-dt * (on ? 14 : 6)));
    const vis = this.power01 > 0.01;
    // Último segundo: pisca para avisar que vai acabar.
    const blink = on && this.powerLeft < 1 ? 0.45 + 0.55 * (Math.sin(time * 28) > 0 ? 1 : 0) : 1;
    const pulse = 0.8 + 0.2 * Math.sin(time * 12);
    if (this.outlineMat && this.outline) {
      this.outlineMat.opacity = this.power01 * pulse * blink;
      // A casca infla no espaço do modelo, que está em escala reduzida.
      this.outlineWidth.value = (0.022 + 0.008 * Math.sin(time * 9)) / MODEL_SCALE;
      this.outline.visible = vis;
    }
    this.aura.visible = vis;
    this.aura.material.opacity = this.power01 * 0.32 * pulse * blink;
    if (!on) return;
    // Partículas vermelhas saindo de trás do jogador.
    this.powerAcc += dt * 120;
    const p = this.root.position;
    while (this.powerAcc >= 1) {
      this.powerAcc -= 1;
      this.fire.emit({
        x: p.x - 0.3 + (Math.random() - 0.5) * 0.6, y: p.y + (Math.random() - 0.5) * 0.45, z: (Math.random() - 0.5) * 0.4,
        vx: -2.5 - Math.random() * 2.5, vy: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.5,
        life: 0.35 + Math.random() * 0.35, size: 0.14 + Math.random() * 0.16,
        c0: [1, 0.45, 0.2], c1: [0.9, 0.04, 0.0], drag: 2.2, grow: 0.5,
      });
    }
  }

  private emitTrail(dt: number, thrust: boolean) {
    const spine = this.spine!;
    spine.updateWorldMatrix(true, false);
    for (let i = 0; i < 2; i++) this.nozzleWorld[i].copy(NOZZLES[i]).applyMatrix4(spine.matrixWorld);
    this.dirWorld.set(0, -1, 0).transformDirection(spine.matrixWorld);
    this.emitAcc += dt * (thrust ? 90 : 20);
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      const n = this.nozzleWorld[(Math.random() * 2) | 0];
      const sp = 3 + Math.random() * 2.5;
      const j = () => (Math.random() - 0.5) * 0.9;
      this.tmp.copy(this.dirWorld);
      this.fire.emit({
        x: n.x, y: n.y, z: n.z,
        vx: this.tmp.x * sp + j() - 2.5, vy: this.tmp.y * sp + j(), vz: this.tmp.z * sp + j(),
        life: 0.18 + Math.random() * 0.14, size: 0.16 + Math.random() * 0.1,
        c0: [1, 0.75, 0.3], c1: [0.9, 0.12, 0.02], drag: 3, grow: 0.6,
      });
      if (Math.random() < 0.3) {
        this.smoke.emit({
          x: n.x, y: n.y, z: n.z,
          vx: this.tmp.x * sp * 0.4 - 1.5, vy: this.tmp.y * sp * 0.4 + 0.3, vz: j(),
          life: 0.6 + Math.random() * 0.4, size: 0.25, c0: [0.35, 0.33, 0.33], c1: [0.1, 0.1, 0.11], drag: 2, grow: 2.2,
        });
      }
    }
  }

  /** Fumaça e faíscas de quando o jetpack é desligado. */
  puff() {
    if (!this.spine) return;
    for (const n of this.nozzleWorld) {
      for (let i = 0; i < 6; i++) {
        this.smoke.emit({
          x: n.x, y: n.y, z: n.z,
          vx: -1 + (Math.random() - 0.5), vy: -0.5 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.6,
          life: 0.5 + Math.random() * 0.3, size: 0.18, c0: [0.4, 0.38, 0.37], c1: [0.08, 0.08, 0.09], drag: 2.5, grow: 2,
        });
      }
    }
  }

  /** Posição de mundo do pacote, para efeitos (explosão, faíscas). */
  packWorld(out: THREE.Vector3) {
    if (!this.spine) return out.copy(this.root.position);
    return out.copy(PACK_CENTER).applyMatrix4(this.spine.matrixWorld);
  }
}
