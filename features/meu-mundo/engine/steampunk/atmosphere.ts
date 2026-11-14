// features/meu-mundo/engine/steampunk/atmosphere.ts
//
// Céu, luz e o ciclo de DIA E NOITE do bairro steampunk (mm3d-51). Só o
// bairro: o centro segue com a luz de sempre.
//
// O relógio é o de Brasília (o mesmo da vida do hóspede): às 18h já é noite
// (escurece de 17h30 a 18h) e às 6h já é dia (clareia de 5h30 a 6h). Tudo sai
// de UM número, `night` (0 = dia, 1 = noite), que mistura três paletas (dia,
// crepúsculo, noite) — céu, neblina, luz do céu, sol/lua — e acende as poças
// de luz das lanternas e as estrelas. Mudar o número só troca cores e
// intensidades: nenhum material é recompilado, nada é recriado.
//
// Céu: a cúpula panorâmica (engine/sky — arte do bairro/centro; sem arte, o degradê
// de sempre com horizonte = cor da neblina). De dia a arte aparece como é; no
// crepúsculo e à noite ela escurece (`ART`) e o céu puxa o degradê da hora. Por
// cima, as estrelas e a lua numa malha que aparece com a noite. Sem luz, sem
// neblina, presas à câmera.

import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
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
import type { SkyRegionId } from "../sky/sky-registry"
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: C3, b: C3, t: number): C3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Paleta do momento: dia → crepúsculo (n = 0,5) → noite. */
function lookAt(n: number): Look {
  const [a, b, t] = n < 0.5 ? [DAY, DUSK, n * 2] : [DUSK, NIGHT, n * 2 - 1]
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

/** A arte panorâmica (pintada de dia) na hora: cor que multiplica a arte e quanto o céu puxa o degradê. */
const ART = {
  day: { light: [1, 1, 1] as C3, mix: 0 },
  dusk: { light: [0.95, 0.68, 0.6] as C3, mix: 0.35 },
  night: { light: [0.17, 0.18, 0.3] as C3, mix: 0.55 },
}
function artAt(n: number): { light: C3; mix: number } {
  const [a, b, t] = n < 0.5 ? [ART.day, ART.dusk, n * 2] : [ART.dusk, ART.night, n * 2 - 1]
  return { light: lerp3(a.light, b.light, t), mix: lerp(a.mix, b.mix, t) }
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
export function applyLights(scene: Scene, n: number) {
  const L = lookAt(n)
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

/** Cúpula do céu (arte panorâmica ou degradê) e a malha das estrelas e da lua. */
export class Sky {
  readonly dome: SkyDome
  readonly stars: Mesh
  private readonly starMat: StandardMaterial

  constructor(scene: Scene, r: number, opts: { region?: SkyRegionId | null; tier?: QualityTier } = {}) {
    this.dome = new SkyDome(scene, { radius: r, tier: opts.tier ?? "mid", region: opts.region ?? null, haze: DAY.haze, zenith: DAY.zenith })

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
  set(n: number) {
    const L = lookAt(n)
    this.dome.setGradient(L.haze, L.zenith)
    const A = artAt(n)
    this.dome.setLight(A.light, A.mix)
    const s = Math.max(0, (n - 0.45) / 0.55)
    this.starMat.alpha = s
    this.stars.setEnabled(s > 0.02)
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
