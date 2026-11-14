// features/meu-mundo/engine/ambiente-fx/ambient-fx.ts — partículas de AMBIENTE (visual premium E5, §12/§17).
//
// Só o clima da cena (vaga-lume, folha, neve, poeira, cinza, brasa, vapor, luz tecnológica). Golpe e
// poder continuam no FxStage (`engine/fx/fx-core.ts`); o vapor das chaminés do bairro segue em
// `steampunk/fx.ts`. Isto NÃO é um segundo sistema de golpe.
//
// Como fica barato: UMA malha de quadradinhos e UM material por cena — as duas camadas da região
// vão no mesmo desenho (mistura pré-multiplicada: camada de luz soma, camada opaca cobre). Nada por
// partícula no processador: a posição sai do shader pelo tempo (nasce, deriva, balança, some e
// renasce noutro ponto). Por quadro a CPU só manda tempo, câmera e (quando muda) a intensidade.
//  - Teto: o número de quadradinhos do perfil (`preset.layers[i].n[tier]`); nunca nasce mais.
//  - Distância de ativação: a caixa (`range`) anda com a câmera, adiantada para onde ela olha; a borda
//    some em degradê. Fora da caixa não existe partícula. Perto demais do olho também some.
//  - Fora da câmera: a caixa fica à frente do olhar (quase nada atrás); quem sobra fora do quadro é
//    recortado pela placa antes de pintar; partícula apagada vai para fora do recorte (zero pixel).
//  - Emissão e vida: `day`/`night` (fração que nasce) × `life`; a hora muda a fração aos poucos.
//  - Dia e noite (§17): `setNight(0..1)` (Domínio: fixo pela arte da cena) ou `clock: true` (bairro e
//    centro: relógio de Brasília, conferido a cada 20 s, transição de ~8 s). Tudo local; nada na rede.
//  - Pausa: `setEnabled(false)` tira a malha do desenho (0 chamada).
//  - dispose() solta malha, material e o observador; o atlas é da cena (some com ela).

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Effect } from "@babylonjs/core/Materials/effect"
import { Constants } from "@babylonjs/core/Engines/constants"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { QUALITY, type QualityTier } from "../quality"
import { brasiliaHour, nightFactor } from "../steampunk/atmosphere"
import { ATLAS_COLS, ambientAtlas } from "./atlas"
import { AMBIENT_PRESETS, type AmbientPreset, type AmbientRegion } from "./presets"

const VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec4 seed;
attribute float kind;
uniform mat4 view;
uniform mat4 projection;
uniform vec3 uCenter;
uniform vec3 uEye;
uniform vec3 uBox;
uniform float uTime;
uniform float uLight;
uniform float uOn;
uniform vec4 uA[2];
uniform vec4 uB[2];
uniform vec4 uC[2];
uniform vec4 uD[2];
uniform vec4 uE[2];
varying vec2 vUV;
varying vec4 vCol;
varying float vAdd;
float h(float n) { return fract(sin(n) * 43758.5453); }
void main(void) {
  vec4 A = mix(uA[0], uA[1], kind);
  vec4 B = mix(uB[0], uB[1], kind);
  vec4 C = mix(uC[0], uC[1], kind);
  vec4 D = mix(uD[0], uD[1], kind);
  vec4 E = mix(uE[0], uE[1], kind);
  float life = A.w;
  float cyc = uTime / life + seed.w;
  float ph = fract(cyc);
  float gen = floor(cyc);
  float R = uBox.x;
  // ponto de nascimento novo a cada vida (posição no mundo, não presa à câmera)
  vec3 r = vec3(h(seed.x * 91.7 + gen * 1.37), h(seed.y * 53.1 + gen * 2.11), h(seed.z * 27.3 + gen * 0.73));
  float t = ph * life;
  vec3 p = r * vec3(2.0 * R, uBox.y, 2.0 * R) + A.xyz * t;
  float wa = B.y;
  float wf = B.z * 6.2832;
  p.x += sin(t * wf + seed.x * 40.0) * wa;
  p.z += cos(t * wf * 0.83 + seed.y * 33.0) * wa;
  p.y += sin(t * wf * 0.61 + seed.z * 21.0) * wa * 0.5;
  // envolve na caixa ao redor do centro do campo
  vec3 lo = vec3(uCenter.x - R, uCenter.y - uBox.z, uCenter.z - R);
  vec3 w = lo + mod(p - lo, vec3(2.0 * R, uBox.y, 2.0 * R));
  // vida: aparece e some; borda da caixa e perto do olho: some em degradê
  float a = smoothstep(0.0, 0.15, ph) * (1.0 - smoothstep(0.75, 1.0, ph));
  vec2 dc = abs(w.xz - uCenter.xz) / R;
  a *= 1.0 - smoothstep(0.7, 1.0, max(dc.x, dc.y));
  float vy = (w.y - lo.y) / uBox.y;
  a *= smoothstep(0.0, 0.12, vy) * (1.0 - smoothstep(0.85, 1.0, vy));
  a *= smoothstep(1.2, 3.5, distance(w, uEye));
  a *= mix(1.0, 0.5 + 0.5 * sin(uTime * (2.5 + 4.0 * seed.z) + seed.x * 60.0), B.w);
  // emissão: só a fração D.z nasce (dia/noite e o liga-desliga mexem aqui)
  float pick = fract(seed.x * 17.13 + seed.y * 5.71 + seed.z * 3.31);
  a *= step(pick, D.z) * uOn;
  float s = B.x * (1.0 + (seed.z - 0.5) * 2.0 * E.z);
  float ang = seed.x * 6.2832 + E.x * uTime * (seed.y < 0.5 ? -1.0 : 1.0) * (0.5 + seed.z);
  vec2 cr = vec2(cos(ang) * position.x - sin(ang) * position.y, sin(ang) * position.x + cos(ang) * position.y);
  vec4 vp = view * vec4(w, 1.0);
  vp.xy += cr * s;
  gl_Position = a > 0.004 ? projection * vp : vec4(2.0, 2.0, 2.0, 1.0);
  // flipbook: quadro pelo tempo, começando em ponto sorteado
  float fr = floor(fract(uTime * D.w + seed.y) * D.y);
  float cell = D.x + min(fr, D.y - 1.0);
  float col = mod(cell, ${ATLAS_COLS}.0);
  float row = floor(cell / ${ATLAS_COLS}.0);
  vec2 uv = position.xy * 0.5 + 0.5;
  vUV = vec2((col + uv.x) / ${ATLAS_COLS}.0, 1.0 - (row + 1.0 - uv.y) / ${ATLAS_COLS}.0);
  float cv = 1.0 + (h(seed.w * 13.7) - 0.5) * 2.0 * E.y;
  vAdd = C.w;
  vCol = vec4(C.rgb * cv * mix(uLight, 1.0, C.w), a);
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying vec4 vCol;
varying float vAdd;
uniform sampler2D uAtlas;
void main(void) {
  vec4 t = texture2D(uAtlas, vUV);
  float a = t.a * vCol.a;
  if (a < 0.003) discard;
  // pré-multiplicado: luz soma (alfa 0), o resto cobre
  gl_FragColor = vec4(t.rgb * vCol.rgb * a * (1.0 + 0.35 * vAdd), a * (1.0 - vAdd));
}
`

export interface AmbientOptions {
  /** Bairro/centro: segue o relógio de Brasília sozinho. */
  clock?: boolean
  /** 0 = dia, 1 = noite (ignorado com `clock`). */
  night?: number
}

export interface AmbientStats {
  region: AmbientRegion
  tier: QualityTier
  /** Quadradinhos na malha (o teto). */
  cap: number
  /** Partículas que nascem agora (teto × fração do momento). */
  live: number
  night: number
  enabled: boolean
}

const FWD_L = new Vector3(0, 0, 1)
const FWD_R = new Vector3(0, 0, -1)
const alive = new Set<AmbientFx>()
/** Quantos sistemas de ambiente existem agora (teste de troca de cena). */
export const ambientCount = () => alive.size

export class AmbientFx {
  private mesh: Mesh
  private readonly mat: ShaderMaterial
  private readonly obs: Observer<Scene>
  private readonly preset: AmbientPreset
  private caps: number[]
  private readonly center = new Vector3()
  private readonly fwd = new Vector3()
  private time = Math.random() * 100
  private night: number
  private target: number
  private sinceClock = 0
  private enabled = true
  private disposed = false

  constructor(
    private readonly scene: Scene,
    readonly region: AmbientRegion,
    private tierNow: QualityTier,
    private readonly opts: AmbientOptions = {},
  ) {
    this.preset = AMBIENT_PRESETS[region]
    this.night = this.target = opts.clock ? nightFactor(brasiliaHour()) : Math.max(0, Math.min(1, opts.night ?? 0))
    this.caps = capsFor(this.preset, tierNow)
    this.mesh = buildMesh(scene, this.caps)
    Effect.ShadersStore.mmAmbientVertexShader = VERTEX
    Effect.ShadersStore.mmAmbientFragmentShader = FRAGMENT
    this.mat = new ShaderMaterial(
      "mm-amb-fx",
      scene,
      { vertex: "mmAmbient", fragment: "mmAmbient" },
      {
        attributes: ["position", "seed", "kind"],
        uniforms: ["view", "projection", "uCenter", "uEye", "uBox", "uTime", "uLight", "uOn", "uA", "uB", "uC", "uD", "uE"],
        samplers: ["uAtlas"],
        needAlphaBlending: true,
      },
    )
    this.mat.backFaceCulling = false
    this.mat.disableDepthWrite = true
    this.mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
    this.mat.setTexture("uAtlas", ambientAtlas(scene))
    const R = this.preset.range[tierNow]
    this.mat.setVector3("uBox", new Vector3(R, this.preset.height, this.preset.below))
    this.mat.setFloat("uOn", 1)
    this.writeLayers()
    this.mesh.material = this.mat
    this.mesh.setEnabled(this.caps.some((n) => n > 0))
    this.obs = scene.onBeforeRenderObservable.add(() => this.frame())
    alive.add(this)
  }

  /** 0 = dia, 1 = noite: vai até lá em ~8 s (no Domínio a cena já nasce no valor certo). */
  setNight(n: number, instant = false) {
    this.target = Math.max(0, Math.min(1, n))
    if (instant) {
      this.night = this.target
      this.writeLayers()
    }
  }

  get tier() {
    return this.tierNow
  }

  /** Perfil trocou ao vivo (Automático no bairro/centro, via `world.setQuality`): refaz só a malha. */
  setTier(tier: QualityTier) {
    if (tier === this.tierNow || this.disposed) return
    this.tierNow = tier
    this.caps = capsFor(this.preset, tier)
    this.mesh.dispose()
    this.mesh = buildMesh(this.scene, this.caps)
    this.mesh.material = this.mat
    const R = this.preset.range[tier]
    this.mat.setVector3("uBox", new Vector3(R, this.preset.height, this.preset.below))
    this.setEnabled(this.enabled)
  }

  setEnabled(on: boolean) {
    this.enabled = on
    this.mesh.setEnabled(on && this.caps.some((n) => n > 0))
  }

  /** Painel técnico / harness. */
  stats(): AmbientStats {
    const live = this.preset.layers.slice(0, 2).reduce((s, l, i) => s + Math.round(this.caps[i] * this.frac(l.day, l.night)), 0)
    return { region: this.region, tier: this.tier, cap: this.caps[0] + (this.caps[1] ?? 0), live: this.enabled ? live : 0, night: +this.night.toFixed(3), enabled: this.enabled }
  }

  private frac(day: number, night: number) {
    return day + (night - day) * this.night
  }

  private writeLayers() {
    const ls = this.preset.layers
    const A: number[] = [], B: number[] = [], C: number[] = [], D: number[] = [], E: number[] = []
    for (let i = 0; i < 2; i++) {
      const l = ls[Math.min(i, ls.length - 1)]
      A.push(l.vel[0], l.vel[1], l.vel[2], l.life)
      B.push(l.size, l.wobble[0], l.wobble[1], l.flicker)
      C.push(l.color[0], l.color[1], l.color[2], l.add ? 1 : 0)
      D.push(l.cell, l.frames, this.frac(l.day, l.night), l.fps)
      E.push(l.spin, l.colorVar, l.sizeVar, 0)
    }
    this.mat.setArray4("uA", A)
    this.mat.setArray4("uB", B)
    this.mat.setArray4("uC", C)
    this.mat.setArray4("uD", D)
    this.mat.setArray4("uE", E)
    // luz da cena para as camadas que não brilham (noite escurece a folha/poeira)
    this.mat.setFloat("uLight", 1 - 0.62 * this.night)
  }

  private frame() {
    if (!this.enabled) return
    const dt = Math.min(0.1, this.scene.getEngine().getDeltaTime() / 1000)
    this.time = (this.time + dt) % 4096
    if (this.opts.clock) {
      this.sinceClock += dt
      if (this.sinceClock >= 20) {
        this.sinceClock = 0
        this.target = nightFactor(brasiliaHour())
      }
    }
    if (this.night !== this.target) {
      const step = dt / 8
      this.night = Math.abs(this.target - this.night) <= step ? this.target : this.night + Math.sign(this.target - this.night) * step
      this.writeLayers()
    }
    const cam = this.scene.activeCamera
    if (!cam) return
    const eye = cam.globalPosition
    // campo adiantado para onde a câmera olha (quase nada atrás dela)
    cam.getDirectionToRef(this.scene.useRightHandedSystem ? FWD_R : FWD_L, this.fwd)
    const f = this.fwd
    const fl = Math.hypot(f.x, f.z) || 1
    const ahead = this.preset.range[this.tierNow] * 0.6
    // altura da faixa: a do alvo da câmera (o personagem), não a do olho (a câmera fica alta, olhando para baixo)
    const tgt = (cam as Camera & { getTarget?: () => Vector3 }).getTarget?.()
    const y = tgt ? tgt.y : eye.y - 3
    this.center.set(eye.x + (f.x / fl) * ahead, y, eye.z + (f.z / fl) * ahead)
    this.mat.setVector3("uCenter", this.center)
    this.mat.setVector3("uEye", eye)
    this.mat.setFloat("uTime", this.time)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    alive.delete(this)
    this.scene.onBeforeRenderObservable.remove(this.obs)
    this.mesh.dispose()
    this.mat.dispose()
  }
}

/** Atalho: o ambiente da região (null se não houver preset). Uma linha por cena. */
export function createAmbientFx(scene: Scene, region: AmbientRegion | null | undefined, tier: QualityTier, opts?: AmbientOptions): AmbientFx | null {
  if (!region || !AMBIENT_PRESETS[region]) return null
  try {
    return new AmbientFx(scene, region, tier, opts)
  } catch (err) {
    console.warn("[meu-mundo] ambiente não abriu", region, err)
    return null
  }
}

/** Quadradinhos por camada no perfil, sem passar do teto de ambiente do perfil (`QUALITY[tier].maxParticles`, E7). */
function capsFor(preset: AmbientPreset, tier: QualityTier): number[] {
  const caps = preset.layers.slice(0, 2).map((l) => l.n[tier])
  const max = (QUALITY[tier] as { maxParticles?: number }).maxParticles
  const sum = caps.reduce((a, b) => a + b, 0)
  if (!max || sum <= max) return caps
  return caps.map((n) => Math.floor((n * max) / sum))
}

function buildMesh(scene: Scene, caps: number[]): Mesh {
  const pos: number[] = []
  const seed: number[] = []
  const kind: number[] = []
  const idx: number[] = []
  let s = 9876543
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  let q = 0
  caps.forEach((n, layer) => {
    for (let i = 0; i < n; i++, q++) {
      const a = rnd(), b = rnd(), c = rnd(), d = rnd()
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pos.push(x, y, 0)
        seed.push(a, b, c, d)
        kind.push(layer)
      }
      const k = q * 4
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3)
    }
  })
  const m = new Mesh("mm-amb-fx", scene)
  if (!q) return m
  const vd = new VertexData()
  vd.positions = pos
  vd.indices = idx
  vd.applyToMesh(m, false)
  m.setVerticesData("seed", seed, false, 4)
  m.setVerticesData("kind", kind, false, 1)
  // a posição sai do shader: caixa não vale, sempre no desenho (1 chamada)
  m.alwaysSelectAsActiveMesh = true
  m.isPickable = false
  m.doNotSyncBoundingInfo = true
  m.freezeWorldMatrix()
  return m
}
