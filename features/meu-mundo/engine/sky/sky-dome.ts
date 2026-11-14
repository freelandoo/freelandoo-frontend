// features/meu-mundo/engine/sky/sky-dome.ts
//
// A cúpula do céu com a arte panorâmica (registro em sky-registry.ts). UMA malha, UM material e 1–2
// texturas por cena (2 só no ciclo dia/noite do bairro/centro); sem luz, sem névoa, sem sombra, sem
// clique (isPickable false), presa à câmera (infiniteDistance) — girar ou andar não dá paralaxe.
//
// Projeção CILÍNDRICA no fragmento, com a proporção real da arte (faixa 19:7 que dá a volta inteira):
// altura no cilindro h = tan(elevação) → linha t = horizon − h/(2π·aspect). Acima do topo e abaixo do fundo
// da arte vale a cor lisa da borda; perto do zênite a arte se dissolve nela (sem anel).
// Coluna: a UV da malha (costura com vértice duplicado, sem risco).
//
// Sem arte (carregando, erro, região nula) a mesma malha desenha o degradê de sempre (haze → zênite):
// trocar de região nunca pisca preto nem mostra a textura antiga — cada pedido leva um token, a
// resposta atrasada de um pedido velho é descartada, e a nova arte entra por um fade curto.
//
// Custo: 1 chamada. No nível baixo o shader é compilado SEM efeitos (define FX) e não há trabalho por
// quadro além do fade. Nada disto passa pela rede: é local de cada aparelho.

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Effect } from "@babylonjs/core/Materials/effect"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { QUALITY, type QualityTier } from "../quality"
import { SKY_REGIONS, skyArt, skyUrl, type SkyArtId, type SkyFx, type SkyMode, type SkyRegion, type SkyRegionId } from "./sky-registry"

type C3 = readonly [number, number, number]

const VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vDir;
varying float vU;
void main(void) {
  vDir = position;
  vU = uv.x;
  gl_Position = viewProjection * world * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vDir;
varying float vU;
uniform sampler2D uTex;
uniform sampler2D uTexN;
uniform vec2 uTexel;
uniform vec3 uHaze;
uniform vec3 uZenith;
uniform vec3 uTop;
uniform vec3 uTopN;
uniform vec3 uTint;
uniform vec3 uLight;
uniform float uMixN;
uniform float uHorizon;
uniform float uAspect;
uniform float uFade;
uniform float uHazeBelow;
uniform float uAir;
uniform float uExposure;
uniform float uSat;
uniform float uTime;
uniform float uFlash;
uniform float uTw;
uniform float uAur;
uniform float uPulse;
const float PI = 3.14159265;
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 art(vec2 p) {
  vec2 q = vec2(p.x, 1.0 - clamp(p.y, 0.001, 0.999));
  vec3 d = texture2D(uTex, q).rgb * uLight;
  return uMixN > 0.0 ? mix(d, texture2D(uTexN, q).rgb, uMixN) : d;
}
void main(void) {
  vec3 d = normalize(vDir);
  // degradê de sempre (reserva enquanto a arte carrega): horizonte = névoa
  float k = pow(clamp((d.y + 0.02) / 0.55, 0.0, 1.0), 0.7);
  vec3 grad = mix(uHaze, uZenith, k);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float t = uHorizon - tan(clamp(el, -1.45, 1.45)) / (2.0 * PI * uAspect);
  vec2 p = vec2(vU, t);
  vec3 c = art(p);
  // perto do zênite a arte se dissolve na cor lisa do topo (o polo da imagem não "pinça")
  c = mix(c, mix(uTop, uTopN, uMixN), smoothstep(0.9, 1.3, el));
  c *= uExposure * uTint;
  float l = lum(c);
  c = mix(vec3(l), c, uSat);
  // 1 = céu alto, 0 = horizonte e abaixo
  float skyM = smoothstep(uHorizon - 0.02, uHorizon - 0.12, t);
#ifdef FX
  if (uTw > 0.0) {
    // estrela = ponto bem mais claro que a vizinhança (a lua e as nuvens não piscam)
    vec2 o = uTexel * 3.0;
    float nb = 0.25 * (lum(art(p + vec2(o.x, 0.0))) + lum(art(p - vec2(o.x, 0.0))) + lum(art(p + vec2(0.0, o.y))) + lum(art(p - vec2(0.0, o.y))));
    float star = smoothstep(0.08, 0.25, l - nb) * skyM;
    vec2 cell = floor(p / (uTexel * 4.0));
    float r = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    c *= 1.0 + uTw * star * (0.9 * sin(uTime * (1.3 + r * 2.7) + r * 6.2831));
  }
  if (uAur > 0.0) {
    float g = c.g - max(c.r, c.b * 0.82);
    float am = smoothstep(0.04, 0.22, g) * skyM;
    c += c * am * uAur * (0.32 * sin(vU * 38.0 + uTime * 0.55 + t * 12.0) + 0.14 * sin(vU * 91.0 - uTime * 1.05));
  }
  if (uPulse > 0.0) {
    float warm = smoothstep(0.12, 0.4, c.r - c.b) * smoothstep(0.45, 0.8, c.r);
    c += c * warm * uPulse * (0.16 + 0.2 * sin(uTime * 1.6 + vU * 37.0 + t * 9.0) * sin(uTime * 0.7 + vU * 11.0));
  }
  c += uFlash * vec3(0.62, 0.62, 0.95) * (0.25 + 0.75 * skyM) * 0.55;
#endif
  // bruma no horizonte: a arte funde com a névoa da cena (sem faixa entre o chão e o céu)
  c = mix(c, uHaze, uAir * (1.0 - smoothstep(uHorizon - 0.01, uHorizon - 0.22, t)));
  // abaixo do horizonte: névoa
  c = mix(c, uHaze, uHazeBelow * smoothstep(uHorizon - 0.004, uHorizon + 0.02, t));
  gl_FragColor = vec4(mix(grad, c, uFade), 1.0);
}
`

const UNIFORMS = ["world", "viewProjection", "uTexel", "uHaze", "uZenith", "uTop", "uTopN", "uTint", "uLight", "uMixN", "uHorizon", "uAspect", "uFade", "uHazeBelow", "uAir", "uExposure", "uSat", "uTime", "uFlash", "uTw", "uAur", "uPulse"]

/** Malha da cúpula: esfera com a coluna da arte na UV (u = 0 → 1 girando de +z para +x, sentido de quem vira à direita). */
function domeMesh(scene: Scene, cols: number): Mesh {
  const rings = [-90, -60, -35, -18, -8, -3, 0, 3, 8, 15, 25, 38, 52, 68, 80, 90].map((a) => (a * Math.PI) / 180)
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let r = 0; r < rings.length; r++) {
    const el = rings[r]
    const y = Math.sin(el), cr = Math.cos(el)
    for (let i = 0; i <= cols; i++) {
      const u = i / cols
      const a = u * Math.PI * 2
      pos.push(Math.sin(a) * cr, y, Math.cos(a) * cr)
      uv.push(u, 0)
    }
  }
  const W = cols + 1
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < cols; i++) {
      const a = r * W + i, b = a + 1, c = a + W, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  const vd = new VertexData()
  vd.positions = pos
  vd.uvs = uv
  vd.indices = idx
  const m = new Mesh("mm-sky-dome", scene)
  vd.applyToMesh(m, false)
  return m
}

const live = new Set<SkyDome>()
/** Quantos céus estão vivos (painel de teste / vazamento): deve ser 1 por cena aberta. */
export function skyStats() {
  let textures = 0
  for (const s of live) textures += s.textureCount
  return { domes: live.size, textures, regions: [...live].map((s) => (s.region ? `${s.region.id}:${s.mode}` : null)) }
}

export interface SkyDomeOptions {
  /** Raio (≤ maxZ da câmera). */
  radius: number
  tier: QualityTier
  region?: SkyRegionId | null
  mode?: SkyMode
  /** Degradê de reserva/da hora (padrão: azul do bairro). */
  haze?: C3
  zenith?: C3
  /** Luz do céu que o relâmpago acende de leve (opcional). */
  flashLight?: HemisphericLight | null
}

export interface SkyTune {
  yaw?: number
  horizon?: number
  airHaze?: number
  exposure?: number
  saturation?: number
  /** 0 = dia, 1 = noite (só no ciclo). */
  night?: number
  fx?: boolean
}

export class SkyDome {
  readonly mesh: Mesh
  region: SkyRegion | null = null
  mode: SkyMode = "dia"
  private mat: ShaderMaterial
  private tex: Texture[] = []
  private pending: Texture[] = []
  private token = 0
  private tier: QualityTier
  private texTier: QualityTier | null = null
  private mixN = 0
  private fade = 0
  private fadeTo = 0
  private time = 0
  private flash = 0
  private nextFlash = 4
  private flashSeq: number[] = []
  private fxOn: boolean
  private fxForced: boolean | null = null
  private fx: SkyFx = {}
  private obs: Observer<Scene> | null
  private readonly scene: Scene
  private readonly flashLight: HemisphericLight | null
  private flashBase = -1
  private disposed = false
  /** Duração do último carregamento (ms), para o painel. */
  lastLoadMs = 0

  constructor(scene: Scene, opts: SkyDomeOptions) {
    this.scene = scene
    this.tier = opts.tier
    this.fxOn = QUALITY[opts.tier].sky.fx
    this.flashLight = opts.flashLight ?? null
    this.mesh = domeMesh(scene, QUALITY[opts.tier].sky.segments)
    this.mesh.isPickable = false
    this.mesh.infiniteDistance = true
    this.mesh.alwaysSelectAsActiveMesh = true
    this.mesh.applyFog = false
    this.mesh.receiveShadows = false
    this.mesh.doNotSyncBoundingInfo = true
    this.mesh.scaling.setAll(opts.radius)
    this.mat = this.makeMaterial()
    this.mesh.material = this.mat
    this.setGradient(opts.haze ?? [0.66, 0.83, 0.95], opts.zenith ?? [0.42, 0.62, 0.82])
    this.setLight([1, 1, 1])
    this.setRegion(opts.region ?? null, opts.mode ?? "dia")
    this.obs = scene.onBeforeRenderObservable.add(() => this.update(scene.getEngine().getDeltaTime() / 1000))
    live.add(this)
  }

  get textureCount() {
    return this.tex.length + this.pending.length
  }

  private makeMaterial(): ShaderMaterial {
    Effect.ShadersStore.mmSkyVertexShader = VERTEX
    Effect.ShadersStore.mmSkyFragmentShader = FRAGMENT
    const m = new ShaderMaterial(
      "mm-sky",
      this.scene,
      { vertex: "mmSky", fragment: "mmSky" },
      { attributes: ["position", "uv"], uniforms: UNIFORMS, samplers: ["uTex", "uTexN"], defines: this.fxOn ? ["#define FX"] : [] },
    )
    m.backFaceCulling = false
    m.fogEnabled = false
    for (const [k, v] of [["uFade", 0], ["uTime", 0], ["uFlash", 0], ["uTw", 0], ["uAur", 0], ["uPulse", 0], ["uHorizon", 0.84], ["uAspect", 0.3684], ["uHazeBelow", 0], ["uAir", 0], ["uExposure", 1], ["uSat", 1], ["uMixN", 0]] as const) m.setFloat(k, v)
    for (const k of ["uTint", "uLight"]) m.setColor3(k, Color3.White())
    for (const k of ["uTop", "uTopN"]) m.setColor3(k, new Color3(0.3, 0.5, 0.8))
    m.setVector2("uTexel", { x: 1 / 2048, y: 1 / 1024 } as never)
    if (this.tex.length) this.bindTextures(m)
    return m
  }

  private bindTextures(m = this.mat) {
    const [a, b] = this.tex
    m.setTexture("uTex", a)
    m.setTexture("uTexN", b ?? a)
    const s = a.getSize()
    m.setVector2("uTexel", { x: 1 / (s.width || 2048), y: 1 / (s.height || 1024) } as never)
  }

  /** Degradê de reserva (e o horizonte/névoa da hora no bairro/centro): cor no horizonte e no alto. */
  setGradient(haze: C3, zenith: C3) {
    this.mat.setColor3("uHaze", new Color3(haze[0], haze[1], haze[2]))
    this.mat.setColor3("uZenith", new Color3(zenith[0], zenith[1], zenith[2]))
  }

  /** Cor que multiplica a arte de DIA (crepúsculo alaranjado no ciclo). */
  setLight(light: C3) {
    this.mat.setColor3("uLight", new Color3(light[0], light[1], light[2]))
  }

  /** Ciclo: 0 = arte de dia, 1 = arte de noite (as duas se misturam no meio). */
  setNightMix(m: number) {
    this.mixN = this.mode === "ciclo" ? Math.max(0, Math.min(1, m)) : 0
    this.mat.setFloat("uMixN", this.mixN)
    this.applyFx()
  }

  /** Liga a área (null = só o degradê) na arte de dia, de noite ou no ciclo. Pedido novo cancela o anterior. */
  setRegion(id: SkyRegionId | null, mode: SkyMode = "dia") {
    const tk = ++this.token
    this.dropPending()
    const reg = id ? SKY_REGIONS[id] : null
    if (!reg) {
      this.region = null
      this.fadeTo = 0
      return
    }
    if (this.region?.id === reg.id && this.mode === mode && this.tex.length && this.texTier === this.tier) return
    this.mode = mode
    this.applyRegion(reg)
    const arts: SkyArtId[] = mode === "ciclo" ? [skyArt(reg.id, "dia").art, skyArt(reg.id, "noite").art] : [skyArt(reg.id, mode).art]
    const t0 = performance.now()
    let failed = false
    const want = arts.map((art) => {
      const url = skyUrl(art, this.tier)
      const tex = new Texture(url, this.scene, {
        noMipmap: true,
        invertY: true,
        samplingMode: Texture.BILINEAR_SAMPLINGMODE,
        onLoad: () => done(),
        onError: () => {
          if (tk !== this.token) return
          console.warn("[mm-sky] não carregou", url)
          failed = true
          this.dropPending()
        },
      })
      tex.wrapU = Texture.WRAP_ADDRESSMODE
      tex.wrapV = Texture.CLAMP_ADDRESSMODE
      return tex
    })
    this.pending = want
    let left = want.length
    const done = () => {
      if (this.disposed || failed || tk !== this.token) return
      if (--left > 0) return
      // todas chegaram: troca de uma vez (a antiga sai agora, nunca volta depois)
      this.pending = []
      for (const t of this.tex) t.dispose()
      this.tex = want
      this.texTier = this.tier
      this.lastLoadMs = Math.round(performance.now() - t0)
      this.bindTextures()
      this.fade = 0
      this.fadeTo = 1
    }
  }

  private applyRegion(reg: SkyRegion) {
    this.region = reg
    const day = skyArt(reg.id, this.mode === "noite" ? "noite" : "dia")
    const night = skyArt(reg.id, this.mode === "dia" ? "dia" : "noite")
    this.mesh.rotation.y = reg.yaw
    this.mat.setFloat("uHorizon", day.horizon)
    this.mat.setFloat("uAspect", day.aspect)
    this.mat.setFloat("uHazeBelow", reg.hazeBelow)
    this.mat.setFloat("uAir", reg.airHaze)
    this.mat.setFloat("uExposure", reg.exposure)
    this.mat.setFloat("uSat", reg.saturation)
    this.mat.setColor3("uTint", new Color3(reg.tint[0], reg.tint[1], reg.tint[2]))
    this.mat.setColor3("uTop", new Color3(day.top[0], day.top[1], day.top[2]))
    this.mat.setColor3("uTopN", new Color3(night.top[0], night.top[1], night.top[2]))
    if (this.mode !== "ciclo") {
      this.mixN = 0
      this.mat.setFloat("uMixN", 0)
    }
    this.applyFx()
  }

  private applyFx() {
    const r = this.region
    const on = this.fxForced ?? this.fxOn
    let fx: SkyFx = {}
    if (r && on) {
      if (this.mode === "ciclo") {
        const a = r.fx.dia, b = r.fx.noite, m = this.mixN
        const mix = (k: keyof SkyFx) => (a[k] ?? 0) * (1 - m) + (b[k] ?? 0) * m
        fx = { twinkle: mix("twinkle"), aurora: mix("aurora"), pulse: mix("pulse"), lightning: mix("lightning") }
      } else fx = r.fx[this.mode]
    }
    this.fx = fx
    this.mat.setFloat("uTw", fx.twinkle ?? 0)
    this.mat.setFloat("uAur", fx.aurora ?? 0)
    this.mat.setFloat("uPulse", fx.pulse ?? 0)
  }

  /** Ajuste ao vivo (painel de teste). Não muda o registro. */
  tune(t: SkyTune) {
    if (!this.region) return
    if (t.yaw !== undefined) this.mesh.rotation.y = t.yaw
    if (t.horizon !== undefined) this.mat.setFloat("uHorizon", t.horizon)
    if (t.airHaze !== undefined) this.mat.setFloat("uAir", t.airHaze)
    if (t.exposure !== undefined) this.mat.setFloat("uExposure", t.exposure)
    if (t.saturation !== undefined) this.mat.setFloat("uSat", t.saturation)
    if (t.night !== undefined) this.setNightMix(t.night)
    if (t.fx !== undefined) {
      this.fxForced = t.fx
      this.applyFx()
    }
  }

  /** Nível de qualidade: troca o tamanho da arte e liga/desliga os efeitos (1 recompilação). */
  setQuality(tier: QualityTier) {
    if (tier === this.tier) return
    this.tier = tier
    const fx = QUALITY[tier].sky.fx
    if (fx !== this.fxOn) {
      this.fxOn = fx
      const old = this.mat
      this.mat = this.makeMaterial()
      this.mesh.material = this.mat
      old.dispose()
      if (this.region) this.applyRegion(this.region)
      this.mat.setFloat("uFade", this.fade)
      this.mat.setFloat("uMixN", this.mixN)
    }
    if (this.region) this.setRegion(this.region.id, this.mode)
  }

  setRadius(r: number) {
    this.mesh.scaling.setAll(r)
  }

  /** Disparar um relâmpago agora (teste). */
  strike() {
    this.flashSeq = [0, 0.09, 0.2]
  }

  update(dt: number) {
    if (this.disposed) return
    const d = Math.min(0.1, Math.max(0, dt))
    if (this.fade !== this.fadeTo) {
      this.fade = this.fadeTo > this.fade ? Math.min(this.fadeTo, this.fade + d / 0.45) : Math.max(this.fadeTo, this.fade - d / 0.3)
      this.mat.setFloat("uFade", this.fade)
    }
    const fx = this.fx
    if (!fx.twinkle && !fx.aurora && !fx.pulse && !fx.lightning && !this.flashSeq.length) return
    this.time += d
    this.mat.setFloat("uTime", this.time % 1000)
    if (fx.lightning) {
      this.nextFlash -= d
      if (this.nextFlash <= 0) {
        // clarão em 2–3 batidas curtas, a cada 7–15 s (nunca estroboscópico)
        this.flashSeq = Math.random() < 0.5 ? [0, 0.11] : [0, 0.08, 0.22]
        this.nextFlash = 7 + Math.random() * 8
      }
    }
    let f = 0
    const seq = this.flashSeq
    for (let i = 0; i < seq.length; i++) {
      seq[i] -= d
      const age = -seq[i]
      if (age >= 0) f = Math.max(f, Math.exp(-age / 0.07) * (i === 0 ? 1 : 0.7))
    }
    if (seq.length && seq.every((s) => s < -0.6)) this.flashSeq = []
    f *= fx.lightning || 0.8
    if (f < 0.002) f = 0
    if (f !== this.flash) {
      this.flash = f
      this.mat.setFloat("uFlash", f)
      const L = this.flashLight
      if (L) {
        if (this.flashBase < 0) this.flashBase = L.intensity
        L.intensity = this.flashBase + f * 0.22
        if (f === 0) this.flashBase = -1
      }
    }
  }

  private dropPending() {
    for (const t of this.pending) t.dispose()
    this.pending = []
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.token++
    if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
    this.obs = null
    if (this.flashLight && this.flashBase >= 0) this.flashLight.intensity = this.flashBase
    this.dropPending()
    for (const t of this.tex) t.dispose()
    this.tex = []
    this.mesh.dispose()
    this.mat.dispose()
    live.delete(this)
  }
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // Ajuste ao vivo no jogo (só desenvolvimento): __mmSky.stats(), __mmSky.tune({ horizon: 0.62, night: 1 }), __mmSky.strike()
  ;(window as unknown as { __mmSky?: unknown }).__mmSky = {
    stats: skyStats,
    list: () => [...live],
    tune: (t: SkyTune) => live.forEach((s) => s.tune(t)),
    strike: () => live.forEach((s) => s.strike()),
  }
}
