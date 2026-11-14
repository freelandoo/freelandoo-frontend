// features/meu-mundo/dominio/engine/portal-fx.ts — o portal de cada passagem dos Domínios.
//
// Toda passagem (entrada = volta, saída = próxima parte / próximo Domínio) ganha um portal em pé no
// ponto do arquivo da cena, virado para o caminho: ANEL DE PARTÍCULAS girando na borda + véu no vão.
//   ABERTO  → anel aceso na cor do Domínio, véu claro e o REDEMOINHO de partículas girando para o centro;
//   FECHADO → anel cinza e lento, véu escuro, sem redemoinho (o chefe da parte explica o que falta).
// Anel e redemoinho são malhas de quadradinhos animadas no shader (posição pelo tempo, sempre de frente
// para a câmera): 1 chamada cada, nada por partícula no processador. Sem colisão, sem clique.

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Effect } from "@babylonjs/core/Materials/effect"
import { Constants } from "@babylonjs/core/Engines/constants"

type C3 = readonly [number, number, number]

/** Cor do portal por Domínio (id do back). */
export const PORTAL_COLOR: Readonly<Record<string, C3>> = {
  floresta: [0.72, 0.62, 1],
  canion: [0.62, 0.78, 1],
  gelo: [0.45, 0.95, 1],
  fabrica: [1, 0.72, 0.35],
  vulcao: [1, 0.45, 0.2],
  orbital: [1, 0.85, 1],
}

const VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 seed;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform float uTime;
uniform float uR;
uniform float uSize;
uniform float uSpin;
varying vec2 vC;
varying float vA;
void main(void) {
  // position.xy = canto do quadradinho (−1..1); seed = (fase, velocidade, tamanho)
#ifdef RING
  // anel: partículas correndo pela borda (duas voltas em sentidos opostos), cintilando
  float dir = seed.y < 0.5 ? 1.0 : -1.0;
  float a = seed.x * 6.2832 + uTime * dir * (0.35 + 0.25 * seed.z) * uSpin;
  float r = uR * (1.0 + (seed.y - 0.5) * 0.09);
  vec3 local = vec3(cos(a) * r, sin(a) * r, (seed.z - 0.5) * 0.12);
  vec4 vp = view * world * vec4(local, 1.0);
  float s = uSize * (0.7 + 0.7 * seed.z);
  vp.xy += position.xy * s;
  gl_Position = projection * vp;
  vC = position.xy;
  vA = 0.6 + 0.4 * sin(uTime * (2.0 + 3.0 * seed.z) + seed.x * 40.0);
#else
  // 3 braços de espiral girando: cada partícula nasce na borda de um braço e corre para o centro
  float t = fract(uTime * (0.16 + 0.1 * seed.y) + seed.x * 7.0);
  float r = uR * (1.0 - 0.9 * t);
  float arm = floor(seed.x * 3.0) * 2.0944;
  float a = arm + t * 4.2 + uTime * 1.3 + (seed.y - 0.5) * 0.5;
  vec3 local = vec3(cos(a) * r, sin(a) * r, sin(seed.x * 91.0 + uTime) * 0.18 * (1.0 - t));
  vec4 vp = view * world * vec4(local, 1.0);
  float s = uSize * (0.6 + 0.8 * seed.z) * (1.0 - 0.6 * t);
  vp.xy += position.xy * s;
  gl_Position = projection * vp;
  vC = position.xy;
  vA = sin(t * 3.14159) * (0.55 + 0.45 * seed.z);
#endif
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vC;
varying float vA;
uniform vec3 uColor;
uniform float uOn;
void main(void) {
  float d = 1.0 - length(vC);
  if (d <= 0.0) discard;
  float g = d * d * vA * uOn;
  gl_FragColor = vec4(uColor * g * 2.0 + vec3(g * 0.5), g);
}
`

function swirlMesh(scene: Scene, n: number): Mesh {
  const pos: number[] = []
  const seed: number[] = []
  const idx: number[] = []
  let s = 1234567
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < n; i++) {
    const a = rnd(), b = rnd(), c = rnd()
    const k = i * 4
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pos.push(x, y, 0)
      seed.push(a, b, c)
    }
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3)
  }
  const m = new Mesh("dom-portal-swirl", scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.indices = idx
  vd.applyToMesh(m, false)
  m.setVerticesData("seed", seed, false, 3)
  // a malha anda no shader: a caixa precisa cobrir o portal inteiro (senão some por recorte)
  m.alwaysSelectAsActiveMesh = true
  return m
}

export interface PortalSpec {
  x: number
  z: number
  /** Para onde o caminho segue (rad); o portal fica de frente para ele. */
  ang: number
  color: C3
  open: boolean
  low: boolean
  /** Raio do anel (m). */
  r?: number
}

export class DomainPortal {
  private readonly root: TransformNode
  private readonly ring: Mesh
  private readonly veil: Mesh
  private readonly swirl: Mesh
  private readonly ringMat: ShaderMaterial
  private readonly veilMat: StandardMaterial
  private readonly swirlMat: ShaderMaterial
  private readonly color: Color3
  private readonly obs: Observer<Scene>
  private time = Math.random() * 10
  /** Some quando a câmera encosta ou passa para trás (quem nasce na boca do portal vê o caminho, não o véu). */
  private camK = 1
  private readonly center = new Vector3()
  private on = 0
  private open: boolean
  private R = 2.3

  constructor(private readonly scene: Scene, spec: PortalSpec) {
    const R = spec.r ?? 2.3
    this.open = spec.open
    this.color = new Color3(spec.color[0], spec.color[1], spec.color[2])
    this.root = new TransformNode("dom-portal", scene)
    this.root.position.set(spec.x, R + 0.35, spec.z)
    this.root.rotation.y = spec.ang
    this.center.copyFrom(this.root.position)
    this.R = R
    Effect.ShadersStore.mmPortalVertexShader = VERTEX
    Effect.ShadersStore.mmPortalFragmentShader = FRAGMENT
    const mat = (name: string, ring: boolean) => {
      const m = new ShaderMaterial(
        name,
        scene,
        { vertex: "mmPortal", fragment: "mmPortal" },
        { attributes: ["position", "seed"], uniforms: ["world", "view", "projection", "uTime", "uR", "uSize", "uSpin", "uColor", "uOn"], needAlphaBlending: true, defines: ring ? ["#define RING"] : [] },
      )
      m.backFaceCulling = false
      m.disableDepthWrite = true
      m.alphaMode = Constants.ALPHA_ADD
      m.setFloat("uR", ring ? R : R * 0.94)
      m.setFloat("uSpin", 1)
      return m
    }
    // anel de partículas na borda (no lugar do aro sólido)
    this.ring = swirlMesh(scene, spec.low ? 110 : 240)
    this.ring.parent = this.root
    this.ringMat = mat("dom-portal-ring", true)
    this.ringMat.setFloat("uSize", 0.1)
    this.ring.material = this.ringMat
    // véu no vão (as duas faces)
    this.veil = CreateDisc("dom-portal-veil", { radius: R - 0.08, tessellation: spec.low ? 24 : 36, sideOrientation: Mesh.DOUBLESIDE }, scene)
    this.veil.parent = this.root
    this.veilMat = new StandardMaterial("dom-portal-veil", scene)
    this.veilMat.disableLighting = true
    this.veilMat.specularColor = Color3.Black()
    this.veilMat.backFaceCulling = false
    this.veilMat.disableDepthWrite = true
    this.veil.material = this.veilMat
    // redemoinho
    this.swirl = swirlMesh(scene, spec.low ? 140 : 320)
    this.swirl.parent = this.root
    this.swirlMat = mat("dom-portal-swirl", false)
    this.swirlMat.setFloat("uSize", 0.12)
    this.swirlMat.setColor3("uColor", this.color)
    this.swirl.material = this.swirlMat
    for (const m of [this.ring, this.veil, this.swirl]) m.isPickable = false
    this.on = spec.open ? 1 : 0
    this.paint()
    this.obs = scene.onBeforeRenderObservable.add(() => this.update(scene.getEngine().getDeltaTime() / 1000))
  }

  /** Abriu/fechou (o chefe caiu, a travessia liberou). Troca suave em ~0,6 s. */
  setOpen(open: boolean) {
    this.open = open
  }

  private paint() {
    const k = this.on
    const v = this.camK
    const c = this.color
    // fechado: anel de partículas cinza e lento; aberto: a cor do Domínio, girando rápido
    this.ringMat.setColor3("uColor", new Color3(0.55 + (c.r - 0.55) * k, 0.55 + (c.g - 0.55) * k, 0.62 + (c.b - 0.62) * k))
    this.ringMat.setFloat("uOn", (0.8 + 0.2 * k) * v)
    this.ringMat.setFloat("uSpin", 0.35 + 0.65 * k)
    this.veilMat.emissiveColor.set(0.16 + (c.r * 0.8 - 0.16) * k, 0.12 + (c.g * 0.8 - 0.12) * k, 0.24 + (c.b * 0.8 - 0.24) * k)
    this.veilMat.alpha = (0.2 - 0.06 * k) * v
    this.swirlMat.setFloat("uOn", k * v)
    this.swirl.setEnabled(k * v > 0.01)
  }

  private update(dt: number) {
    const d = Math.min(0.1, Math.max(0, dt))
    const want = this.open ? 1 : 0
    const cam = this.scene.activeCamera
    const camK = cam ? Math.min(1, Math.max(0.12, (Vector3.Distance(cam.globalPosition, this.center) - this.R - 0.8) / 4)) : 1
    if (this.on !== want || Math.abs(camK - this.camK) > 0.01) {
      this.on = want > this.on ? Math.min(1, this.on + d / 0.6) : want < this.on ? Math.max(0, this.on - d / 0.6) : this.on
      this.camK = camK
      this.paint()
    }
    this.time += d
    this.ringMat.setFloat("uTime", this.time % 1000)
    if (this.on > 0.01) {
      this.swirlMat.setFloat("uTime", this.time % 1000)
      // o véu respira de leve
      this.veilMat.alpha = (0.2 - 0.06 * this.on) * this.camK * (0.85 + 0.15 * Math.sin(this.time * 2.1))
    }
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this.obs)
    this.ring.dispose()
    this.veil.dispose()
    this.swirl.dispose()
    this.ringMat.dispose()
    this.veilMat.dispose()
    this.swirlMat.dispose()
    this.root.dispose()
  }
}
