// features/meu-mundo/engine/steampunk/atmosphere.ts
//
// Céu, luz e o ciclo de DIA E NOITE do bairro steampunk (mm3d-51). Só o
// bairro: o centro segue com a luz de sempre.
//
// Visual premium E2 (2026-11-14): cada região tem a SUA paleta (`LOOKS`) e o
// bairro ganhou o tratamento de cor contínuo (`applyGrade`: exposição, contraste,
// saturação e tom frio nas sombras/quente nas luzes pela ColorCurves, no shader
// do material — sem passe de tela), a neblina pela hora e a sombra de contato
// dos personagens pela hora. O centro segue com a luz de sempre (sem grade) até
// a etapa 3 generalizar.
//
// O relógio é o de Brasília (o mesmo da vida do hóspede): às 18h já é noite
// (escurece de 17h30 a 18h) e às 6h já é dia (clareia de 5h30 a 6h). Tudo sai
// de UM número, `night` (0 = dia, 1 = noite), que mistura três paletas (dia,
// crepúsculo, noite) — céu, neblina, luz do céu, sol/lua — e acende as poças
// de luz das lanternas e as estrelas. Mudar o número só troca cores e
// intensidades: nenhum material é recompilado, nada é recriado.
//
// Céu: a cúpula panorâmica (engine/sky, modo "ciclo": arte de DIA e de NOITE do
// bairro/centro misturadas pela hora; sem arte, o degradê de sempre com horizonte =
// cor da neblina). No crepúsculo a arte de dia ganha o tom alaranjado (`ART`) e a
// de noite vai entrando. Com arte, o casco de estrelas/lua em malha fica desligado
// (a arte da noite já tem). Sem luz, sem neblina, presas à câmera.

import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { CreateSphereVertexData } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import type { Scene } from "@babylonjs/core/scene"
import { rng } from "./palette"
import { SkyDome } from "../sky/sky-dome"
import type { SkyMode, SkyRegionId } from "../sky/sky-registry"
import type { QualityTier } from "../quality"

type C3 = readonly [number, number, number]

interface Look {
  haze: C3
  zenith: C3
  hemi: number
  hemiColor: C3
  ground: C3
  sun: number
  sunColor: C3
}

/** Paleta de sempre (centro; e o bairro até a E2). */
const DAY: Look = {
  haze: [0.78, 0.8, 0.79],
  zenith: [0.42, 0.62, 0.82],
  hemi: 0.62,
  hemiColor: [0.86, 0.9, 1],
  ground: [0.36, 0.28, 0.2],
  sun: 0.78,
  sunColor: [1, 0.86, 0.66],
}
const DUSK: Look = {
  haze: [0.74, 0.5, 0.4],
  zenith: [0.22, 0.25, 0.45],
  hemi: 0.5,
  hemiColor: [0.85, 0.72, 0.7],
  ground: [0.3, 0.2, 0.15],
  sun: 0.55,
  sunColor: [1, 0.62, 0.38],
}
const NIGHT: Look = {
  haze: [0.1, 0.11, 0.18],
  zenith: [0.015, 0.025, 0.075],
  hemi: 0.46,
  hemiColor: [0.5, 0.6, 0.92],
  ground: [0.2, 0.15, 0.12],
  sun: 0.32,
  sunColor: [0.58, 0.68, 1],
}

/**
 * Bairro (E2): dia claro e quente; noite AZULADA e mais escura, para as janelas e
 * os postes (âmbar) virarem os pontos de luz. Céu e luz do céu mais frios à noite.
 */
const BAIRRO_DAY: Look = { ...DAY, hemi: 0.64, hemiColor: [0.9, 0.93, 1], ground: [0.4, 0.31, 0.22], sun: 0.82 }
const BAIRRO_DUSK: Look = { ...DUSK, hemi: 0.5, sun: 0.52 }
const BAIRRO_NIGHT: Look = {
  haze: [0.075, 0.095, 0.17],
  zenith: [0.012, 0.022, 0.07],
  hemi: 0.44,
  hemiColor: [0.48, 0.6, 0.98],
  ground: [0.14, 0.12, 0.13],
  sun: 0.3,
  sunColor: [0.52, 0.64, 1],
}

/**
 * Tratamento de cor (aplicado no shader do StandardMaterial). Os matizes são
 * fixos (sombras azuis, luzes âmbar); o que a hora mistura é a densidade.
 */
export interface Grade {
  exposure: number
  contrast: number
  /** ColorCurves.globalSaturation (−100…100). */
  saturation: number
  /** Densidade do azul nas sombras e do âmbar nas luzes (0–100). */
  coolShadows: number
  warmLights: number
  /** Multiplica o início da neblina do perfil (o fim não muda: é o que esconde o horizonte). */
  fogNear: number
  /** Opacidade da sombra de contato dos personagens. */
  contact: number
}
const NO_GRADE: Grade = { exposure: 1, contrast: 1, saturation: 0, coolShadows: 0, warmLights: 0, fogNear: 1, contact: 0.22 }
const BAIRRO_GRADE = {
  day: { exposure: 1.03, contrast: 1.14, saturation: 14, coolShadows: 10, warmLights: 8, fogNear: 1, contact: 0.5 },
  dusk: { exposure: 1.0, contrast: 1.12, saturation: 10, coolShadows: 18, warmLights: 22, fogNear: 0.85, contact: 0.42 },
  night: { exposure: 0.98, contrast: 1.1, saturation: 6, coolShadows: 28, warmLights: 26, fogNear: 0.72, contact: 0.36 },
} satisfies Record<string, Grade>

export type LookRegion = "bairro" | "centro"
const LOOKS: Record<LookRegion, { day: Look; dusk: Look; night: Look; grade: { day: Grade; dusk: Grade; night: Grade } | null }> = {
  bairro: { day: BAIRRO_DAY, dusk: BAIRRO_DUSK, night: BAIRRO_NIGHT, grade: BAIRRO_GRADE },
  centro: { day: DAY, dusk: DUSK, night: NIGHT, grade: null },
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: C3, b: C3, t: number): C3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Paleta do momento: dia → crepúsculo (n = 0,5) → noite. */
function lookAt(n: number, region: LookRegion = "centro"): Look {
  const L = LOOKS[region]
  const [a, b, t] = n < 0.5 ? [L.day, L.dusk, n * 2] : [L.dusk, L.night, n * 2 - 1]
  return {
    haze: lerp3(a.haze, b.haze, t),
    zenith: lerp3(a.zenith, b.zenith, t),
    hemi: lerp(a.hemi, b.hemi, t),
    hemiColor: lerp3(a.hemiColor, b.hemiColor, t),
    ground: lerp3(a.ground, b.ground, t),
    sun: lerp(a.sun, b.sun, t),
    sunColor: lerp3(a.sunColor, b.sunColor, t),
  }
}

/** Ciclo da arte: tom que multiplica a arte de DIA e quanto a arte de NOITE já entrou. */
const ART = {
  day: { light: [1, 1, 1] as C3, night: 0 },
  dusk: { light: [1, 0.74, 0.62] as C3, night: 0.3 },
  night: { light: [1, 0.74, 0.62] as C3, night: 1 },
}
function artAt(n: number): { light: C3; night: number } {
  const [a, b, t] = n < 0.5 ? [ART.day, ART.dusk, n * 2] : [ART.dusk, ART.night, n * 2 - 1]
  return { light: lerp3(a.light, b.light, t), night: lerp(a.night, b.night, t) }
}

/** Hora de Brasília com fração (0–24). */
export function brasiliaHour(now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now)
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12)
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
    return (h % 24) + m / 60
  } catch {
    // Sem fuso no aparelho: UTC−3 fixo (Brasília não tem horário de verão desde 2019).
    return (((now.getUTCHours() - 3 + 24) % 24) + now.getUTCMinutes() / 60) % 24
  }
}

/** 0 = dia, 1 = noite. Noite inteira de 18h às 5h30; as viradas levam meia hora. */
export function nightFactor(h: number): number {
  let t: number
  if (h >= 18 || h < 5.5) t = 1
  else if (h >= 17.5) t = (h - 17.5) / 0.5
  else if (h < 6) t = 1 - (h - 5.5) / 0.5
  else t = 0
  return t * t * (3 - 2 * t)
}

/** Luzes da cena no momento `n` (as do game.ts, pelo nome). */
export function applyLights(scene: Scene, n: number, region: LookRegion = "centro") {
  const L = lookAt(n, region)
  scene.clearColor = new Color4(L.haze[0], L.haze[1], L.haze[2], 1)
  scene.fogColor = new Color3(...L.haze)
  const hemi = scene.getLightByName("mm-hemi") as HemisphericLight | null
  const sun = scene.getLightByName("mm-sun") as DirectionalLight | null
  if (hemi) {
    hemi.intensity = L.hemi
    hemi.diffuse = new Color3(...L.hemiColor)
    hemi.groundColor = new Color3(...L.ground)
  }
  if (sun) {
    // De dia o sol vem baixo do oeste (luz de lado); de noite a lua, mais alta.
    sun.direction = n < 0.5 ? new Vector3(-0.62, -0.72, -0.3) : new Vector3(0.35, -0.85, -0.4)
    sun.intensity = L.sun
    sun.diffuse = new Color3(...L.sunColor)
  }
}

/** Tratamento do momento `n` (null = região sem grade). */
export function gradeAt(n: number, region: LookRegion): Grade | null {
  const G = LOOKS[region].grade
  if (!G) return null
  const [a, b, t] = n < 0.5 ? [G.day, G.dusk, n * 2] : [G.dusk, G.night, n * 2 - 1]
  const out = {} as Grade
  for (const k of Object.keys(a) as (keyof Grade)[]) out[k] = lerp(a[k], b[k], t)
  return out
}

/** Nunca exatamente 1: o define CONTRAST/EXPOSURE trocaria e todo material recompilaria. */
const off1 = (v: number) => (Math.abs(v - 1) < 0.002 ? 1.002 : v)

/**
 * Aplica o tratamento de cor do momento na cena (materiais), a neblina e a sombra
 * de contato, e devolve o que o céu precisa imitar (a cúpula é um shader próprio,
 * fora do image processing). Material congelado só religa os uniformes quando
 * muda de efeito: por isso é descongelado/congelado (sem recompilar) a cada
 * troca — as trocas são raras (o relógio confere a cada 20 s).
 */
export function applyGrade(scene: Scene, n: number, region: LookRegion, fogStart: number): Grade {
  const g = gradeAt(n, region) ?? NO_GRADE
  if (LOOKS[region].grade) {
    const ip = scene.imageProcessingConfiguration
    ip.exposure = off1(g.exposure)
    ip.contrast = off1(g.contrast)
    let cc = ip.colorCurves
    if (!cc) {
      cc = new ColorCurves()
      ip.colorCurves = cc
    }
    cc.globalSaturation = g.saturation
    cc.shadowsHue = 222
    cc.shadowsDensity = g.coolShadows
    cc.midtonesHue = 220
    cc.midtonesDensity = g.coolShadows * 0.35
    cc.highlightsHue = 36
    cc.highlightsDensity = g.warmLights
    ip.colorCurvesEnabled = true
    for (const m of scene.materials) {
      if (!m.isFrozen) continue
      m.unfreeze()
      m.freeze()
    }
  }
  scene.fogStart = fogStart * g.fogNear
  const shadow = scene.getMaterialByName("mm-shadow")
  if (shadow) shadow.alpha = g.contact
  return g
}

/** Cúpula do céu (arte panorâmica ou degradê) e a malha das estrelas e da lua. */
export class Sky {
  readonly dome: SkyDome
  readonly stars: Mesh
  private readonly starMat: StandardMaterial
  /** Com arte panorâmica: estrelas e lua vêm da arte da noite (o casco em malha fica desligado). */
  private readonly art: boolean
  /** "ciclo" = arte de dia e de noite pela hora; "dia"/"noite" = arte fixa (palco de luta do Domínio). */
  private readonly mode: SkyMode

  constructor(scene: Scene, r: number, opts: { region?: SkyRegionId | null; tier?: QualityTier; mode?: SkyMode } = {}) {
    this.mode = opts.mode ?? "ciclo"
    this.dome = new SkyDome(scene, { radius: r, tier: opts.tier ?? "mid", region: opts.region ?? null, mode: this.mode, haze: DAY.haze, zenith: DAY.zenith })
    this.art = !!opts.region

    // Estrelas (triângulos minúsculos acima de 8° do horizonte) e a lua.
    const sp: number[] = []
    const sc: number[] = []
    const si: number[] = []
    const sr = rng(4242)
    for (let i = 0; i < 260; i++) {
      const a = sr() * Math.PI * 2
      const el = 0.14 + Math.asin(sr()) * 0.9
      const c = new Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).scale(0.95)
      const s = 0.0007 + sr() * 0.0011
      const b = sp.length / 3
      // Triângulo virado para o centro (com descarte de face desligado).
      const u = Vector3.Cross(c, Vector3.Up()).normalize().scale(s)
      const v = Vector3.Cross(c, u).normalize().scale(s)
      for (const q of [c.add(u), c.subtract(u).add(v), c.subtract(u).subtract(v)]) sp.push(q.x, q.y, q.z)
      const w = 0.7 + sr() * 0.3
      for (let k = 0; k < 3; k++) sc.push(w, w, w * (0.9 + sr() * 0.1), 1)
      si.push(b, b + 1, b + 2)
    }
    const moon = CreateSphereVertexData({ diameter: 0.07, segments: 6 })
    moon.transform(Matrix.Translation(-0.45, 0.62, 0.55))
    const mb = sp.length / 3
    sp.push(...(moon.positions as number[]))
    for (let k = 0; k < (moon.positions as number[]).length / 3; k++) sc.push(0.98, 0.95, 0.85, 1)
    for (const n of moon.indices as number[]) si.push(n + mb)
    const sv = new VertexData()
    sv.positions = sp
    sv.colors = sc
    sv.indices = si
    this.stars = new Mesh("sp-stars", scene)
    sv.applyToMesh(this.stars, false)
    this.starMat = unlit("sp-stars", scene)
    this.starMat.alpha = 0
    this.stars.material = this.starMat
    finishSky(this.stars, r)
    this.stars.hasVertexAlpha = false
  }

  /** Cores do momento `n` (0 dia, 1 noite). */
  set(n: number, region: LookRegion = "centro") {
    const L = lookAt(n, region)
    this.dome.setGradient(L.haze, L.zenith)
    const A = artAt(n)
    if (this.mode === "ciclo") {
      this.dome.setLight(A.light)
      this.dome.setNightMix(A.night)
    }
    const s = Math.max(0, (n - 0.45) / 0.55)
    this.starMat.alpha = s
    this.stars.setEnabled(!this.art && s > 0.02)
  }

  /** O tratamento de cor da cena, imitado na cúpula (o horizonte casa com a neblina tratada). */
  setGrade(g: Pick<Grade, "exposure" | "contrast" | "saturation"> | null) {
    this.dome.setGrade(g ? Math.pow(g.exposure, 1 / 2.2) : 1, g ? g.contrast : 1, g ? 1 + g.saturation / 100 : 1)
  }

  setRadius(r: number) {
    this.dome.setRadius(r)
    this.stars.scaling.setAll(r)
  }

  /** Nível de qualidade: tamanho da arte e efeitos do céu. */
  setQuality(tier: QualityTier) {
    this.dome.setQuality(tier)
  }

  dispose() {
    this.dome.dispose()
    this.starMat.dispose()
    this.stars.dispose()
  }
}

function unlit(name: string, scene: Scene) {
  const mat = new StandardMaterial(name, scene)
  mat.disableLighting = true
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.diffuseColor = new Color3(0, 0, 0)
  mat.specularColor = new Color3(0, 0, 0)
  mat.fogEnabled = false
  mat.backFaceCulling = false
  return mat
}

function finishSky(mesh: Mesh, r: number) {
  mesh.isPickable = false
  mesh.infiniteDistance = true
  mesh.scaling.setAll(r)
  mesh.alwaysSelectAsActiveMesh = true
  mesh.applyFog = false
}
