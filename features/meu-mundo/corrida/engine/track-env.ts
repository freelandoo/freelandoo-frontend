// features/meu-mundo/corrida/engine/track-env.ts — CORRIDA (mm3d-74): o CENÁRIO de cada pista.
//
// A pista (track-view.ts) é a mesma linguagem em todas; o que muda por
// circuito é o mundo em volta, pelas referências do Alex (Downloads/PISTAS):
//  - baia: a cidade de tijolo à noite sobre a baía (o cenário de sempre);
//  - abismo: cânion de dia — mesas e agulhas de pedra vermelha, arcos, paredões;
//  - floresta: crepúsculo verde-azulado — árvores gigantes, cogumelos que
//    brilham (ciano e magenta), plantas magenta, cachoeiras, vaga-lumes;
//  - neon: megacidade de dia — torres com telões, anéis, passarelas no alto;
//  - tempestade: mar revolto (textura que corre, sem água cara), ilhas de
//    pedra, plataformas, raios (um clarão que pisca) e chuva só no PC;
//  - forja: dentro da máquina — chão de lava, colunas com fendas acesas,
//    vigas por cima e o tubo de vidro ciano.
// Tudo com instância fina (uma chamada por tipo de peça), materiais padrão e
// texturas desenhadas no canvas. Céu = esfera com degradê por vértice.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Material } from "@babylonjs/core/Materials/material"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { STEP, type Track } from "../sim/track"
import { GridPlugin } from "./night"
import { AirshipFleet, fleetRing } from "../../engine/steampunk/scenery"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import type { ThemeId } from "./circuit-art"
import { CENARIO, type Lugar } from "./cena-pistas"
import type { V3 } from "../../engine/cena-codigo/kit"

type RGB = [number, number, number]
type D = { dispose(): void }

/** Altura do chão da Baía (a de sempre). */
export const GROUND_Y = -42
export const NIGHT_HORIZON: RGB = [0.27, 0.13, 0.08]
const NIGHT_MID: RGB = [0.09, 0.05, 0.06]
const NIGHT_TOP: RGB = [0.015, 0.015, 0.035]

/** Atmosfera da cena (neblina = horizonte do céu) e luzes, por tema. */
export interface Atmos {
  horizon: RGB
  mid: RGB
  top: RGB
  fog: [number, number]
  hemi: { diffuse: RGB; ground: RGB; intensity: number }
  sun: { dir: [number, number, number]; diffuse: RGB; intensity: number }
  stars: number
}

export const ATMOS: Record<ThemeId, Atmos> = {
  baia: {
    horizon: NIGHT_HORIZON,
    mid: NIGHT_MID,
    top: NIGHT_TOP,
    fog: [260, 1100],
    hemi: { diffuse: [0.62, 0.68, 1], ground: [0.32, 0.16, 0.4], intensity: 0.6 },
    sun: { dir: [-0.5, -1, 0.4], diffuse: [0.65, 0.75, 1], intensity: 0.45 },
    stars: 600,
  },
  abismo: {
    horizon: [0.95, 0.74, 0.56],
    mid: [0.55, 0.72, 0.92],
    top: [0.2, 0.42, 0.82],
    fog: [380, 1700],
    hemi: { diffuse: [0.95, 0.92, 0.88], ground: [0.55, 0.3, 0.2], intensity: 0.85 },
    sun: { dir: [-0.6, -0.9, 0.3], diffuse: [1, 0.9, 0.76], intensity: 1.05 },
    stars: 0,
  },
  floresta: {
    horizon: [0.1, 0.3, 0.32],
    mid: [0.05, 0.15, 0.19],
    top: [0.015, 0.04, 0.08],
    fog: [140, 820],
    hemi: { diffuse: [0.5, 0.85, 0.9], ground: [0.12, 0.25, 0.18], intensity: 0.62 },
    sun: { dir: [0.4, -1, 0.2], diffuse: [0.55, 0.9, 1], intensity: 0.42 },
    stars: 220,
  },
  neon: {
    horizon: [0.86, 0.9, 0.98],
    mid: [0.52, 0.72, 0.95],
    top: [0.22, 0.46, 0.88],
    fog: [420, 2000],
    hemi: { diffuse: [0.92, 0.95, 1], ground: [0.38, 0.4, 0.5], intensity: 0.85 },
    sun: { dir: [0.5, -0.9, 0.35], diffuse: [1, 0.96, 0.9], intensity: 0.95 },
    stars: 0,
  },
  tempestade: {
    horizon: [0.3, 0.34, 0.38],
    mid: [0.15, 0.18, 0.22],
    top: [0.06, 0.07, 0.09],
    fog: [180, 950],
    hemi: { diffuse: [0.62, 0.72, 0.82], ground: [0.12, 0.2, 0.24], intensity: 0.6 },
    sun: { dir: [-0.3, -1, 0.5], diffuse: [0.8, 0.85, 0.95], intensity: 0.45 },
    stars: 0,
  },
  forja: {
    horizon: [0.42, 0.24, 0.14],
    mid: [0.16, 0.1, 0.08],
    top: [0.05, 0.05, 0.07],
    fog: [200, 1000],
    hemi: { diffuse: [1, 0.78, 0.6], ground: [0.55, 0.22, 0.08], intensity: 0.62 },
    sun: { dir: [0.3, -1, -0.4], diffuse: [0.75, 0.85, 1], intensity: 0.5 },
    stars: 0,
  },
}

/** Altura do chão do cenário de cada tema (os pilares descem até ele). */
export function groundYOf(theme: ThemeId, t: Track): number {
  const y0 = t.bounds.y0
  switch (theme) {
    case "baia":
      return GROUND_Y
    case "abismo":
      return y0 - 110
    case "floresta":
      return y0 - 34
    case "neon":
      return y0 - 140
    case "tempestade":
      return Math.min(0, y0 - 20)
    case "forja":
      return y0 - 70
  }
}

export interface TrackEnv {
  tick(dt: number): void
  dispose(): void
}

interface Ctx {
  scene: Scene
  t: Track
  low: boolean
  d: D[]
  rand: () => number
  cx: number
  cz: number
  span: number
  gy: number
  /** Distância (no plano) até o ponto mais perto da pista e a altura dele. */
  near(x: number, z: number): { d: number; y: number }
  /** Nenhum trecho da pista passa dentro deste volume (cilindro de raio r entre y0 e y1)? */
  clear(x: number, z: number, r: number, y0: number, y1: number): boolean
  hemi: HemisphericLight
}

function litMat(ctx: Ctx, name: string, rgb: RGB = [1, 1, 1], spec = 0.05, emissive: RGB = [0, 0, 0]): StandardMaterial {
  const m = new StandardMaterial(name, ctx.scene)
  m.diffuseColor = new Color3(...rgb)
  m.specularColor = new Color3(spec, spec, spec)
  m.emissiveColor = new Color3(...emissive)
  ctx.d.push(m)
  return m
}
function glowMat(ctx: Ctx, name: string, rgb: RGB = [1, 1, 1], add = false): StandardMaterial {
  const m = new StandardMaterial(name, ctx.scene)
  m.disableLighting = true
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  m.emissiveColor = new Color3(...rgb)
  if (add) {
    m.alphaMode = Constants.ALPHA_ADD
    m.disableDepthWrite = true
    m.transparencyMode = Material.MATERIAL_ALPHABLEND
    m.backFaceCulling = false
  }
  ctx.d.push(m)
  return m
}

/** Ponto sorteado em volta do circuito (entre r0 e r1 vezes o tamanho), longe da pista. */
function scatter(ctx: Ctx, r0: number, r1: number, clear: number, tries = 30): { x: number; z: number; n: { d: number; y: number } } | null {
  for (let k = 0; k < tries; k++) {
    const a = ctx.rand() * Math.PI * 2
    const r = ctx.span * (r0 + (r1 - r0) * Math.sqrt(ctx.rand()))
    const x = ctx.cx + Math.sin(a) * r
    const z = ctx.cz + Math.cos(a) * r
    const n = ctx.near(x, z)
    if (n.d >= clear) return { x, z, n }
  }
  return null
}
/** Ponto perto da pista (de lado, a uma distância entre d0 e d1). */
function beside(ctx: Ctx, d0: number, d1: number): { x: number; z: number; y: number } | null {
  for (let k = 0; k < 20; k++) {
    const i = Math.floor(ctx.rand() * ctx.t.n)
    const t = ctx.t
    const side = ctx.rand() < 0.5 ? -1 : 1
    const off = (t.width / 2 + d0 + ctx.rand() * (d1 - d0)) * side
    const x = t.x[i] + Math.cos(t.yaw[i]) * off
    const z = t.z[i] - Math.sin(t.yaw[i]) * off
    const n = ctx.near(x, z)
    if (n.d >= t.width / 2 + d0 - 0.5) return { x, z, y: t.y[i] }
  }
  return null
}

/** O que o cenário em código (cena-pistas.ts) precisa saber da pista. */
function lugar(ctx: Ctx): Lugar {
  return {
    scene: ctx.scene,
    low: ctx.low,
    rand: ctx.rand,
    cx: ctx.cx,
    cz: ctx.cz,
    span: ctx.span,
    gy: ctx.gy,
    t: ctx.t,
    near: ctx.near,
    clear: ctx.clear,
    scatter: (r0, r1, clear, tries) => scatter(ctx, r0, r1, clear, tries),
    beside: (d0, d1) => beside(ctx, d0, d1),
  }
}

function sky(ctx: Ctx, a: Atmos) {
  const { scene, span, cx, cz } = ctx
  const sphere = CreateSphere("corrida-sky", { diameter: span * 8, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene)
  const p = sphere.getVerticesData("position")!
  const colors: number[] = []
  const R = span * 4
  const mix = (x: RGB, y: RGB, k: number) => [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]
  for (let i = 0; i < p.length; i += 3) {
    const h = Math.max(0, Math.min(1, p[i + 1] / R))
    const c = h < 0.18 ? mix(a.horizon, a.mid, Math.pow(h / 0.18, 0.7)) : mix(a.mid, a.top, Math.pow((h - 0.18) / 0.82, 0.6))
    colors.push(c[0], c[1], c[2], 1)
  }
  sphere.setVerticesData("color", colors)
  const m = new StandardMaterial("corrida-sky", scene)
  m.disableLighting = true
  m.emissiveColor = new Color3(1, 1, 1)
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  m.fogEnabled = false
  sphere.material = m
  sphere.position.set(cx, 0, cz)
  sphere.isPickable = false
  sphere.infiniteDistance = true
  ctx.d.push(sphere, m)
  if (a.stars > 0) {
    const R2 = span * 3.6
    const pos: number[] = []
    const col: number[] = []
    const count = ctx.low ? Math.round(a.stars * 0.45) : a.stars
    for (let k = 0; k < count; k++) {
      const yaw = ctx.rand() * Math.PI * 2
      const el = 0.12 + Math.pow(ctx.rand(), 0.7) * 1.4
      const c = Math.cos(el)
      pos.push(Math.cos(yaw) * c * R2, Math.sin(el) * R2, Math.sin(yaw) * c * R2)
      const b = 0.35 + ctx.rand() * 0.65
      col.push(b, b * 0.95, b, 1)
    }
    const stars = new Mesh("corrida-stars", scene)
    const vd = new VertexData()
    vd.positions = pos
    vd.colors = col
    vd.indices = pos.map((_, i) => i).slice(0, count)
    vd.applyToMesh(stars)
    const sm = new StandardMaterial("corrida-stars", scene)
    sm.disableLighting = true
    sm.emissiveColor = new Color3(1, 1, 1)
    sm.diffuseColor = new Color3(0, 0, 0)
    sm.fogEnabled = false
    sm.pointsCloud = true
    sm.pointSize = ctx.low ? 1.5 : 2
    stars.material = sm
    stars.position.set(cx, 0, cz)
    stars.isPickable = false
    stars.infiniteDistance = true
    stars.alwaysSelectAsActiveMesh = true
    ctx.d.push(stars, sm)
  }
}

/** Chão grande (caixa) numa cor, com textura opcional. */
function ground(ctx: Ctx, rgb: RGB, tex?: DynamicTexture, emissive: RGB = [0, 0, 0], repeat = 40) {
  const g = CreateBox("corrida-ground", { width: ctx.span * 7, depth: ctx.span * 7, height: 1 }, ctx.scene)
  g.position.set(ctx.cx, ctx.gy - 0.5, ctx.cz)
  const m = litMat(ctx, "corrida-ground", rgb, 0.02, emissive)
  if (tex) {
    tex.uScale = repeat
    tex.vScale = repeat
    m.diffuseTexture = tex
    if (emissive[0] + emissive[1] + emissive[2] > 0) m.emissiveTexture = tex
  }
  g.material = m
  g.isPickable = false
  g.freezeWorldMatrix()
  ctx.d.push(g)
  return m
}

function canvasTex(ctx: Ctx, name: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, wrap = true): DynamicTexture {
  const tex = new DynamicTexture(name, { width: w, height: h }, ctx.scene, true)
  draw(tex.getContext() as CanvasRenderingContext2D)
  tex.update(true)
  tex.wrapU = wrap ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  tex.wrapV = wrap ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  ctx.d.push(tex)
  return tex
}
function noiseFill(g: CanvasRenderingContext2D, w: number, h: number, rand: () => number, cols: string[], n: number, s0: number, s1: number) {
  for (let k = 0; k < n; k++) {
    g.fillStyle = cols[Math.floor(rand() * cols.length)]
    const s = s0 + rand() * (s1 - s0)
    g.beginPath()
    g.ellipse(rand() * w, rand() * h, s, s * (0.4 + rand() * 0.8), rand() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
}

// ═══ BAÍA SUSPENSA — o cenário de sempre (mm3d-41/55): cidade de tijolo, baía, céu de cobre ═══
function baia(ctx: Ctx) {
  const { scene, t, low } = ctx
  const disposables = ctx.d
  // ── cidade, montanhas, baía e céu ────────────────────────────────────────
  const b = t.bounds
  const cx = (b.x0 + b.x1) / 2
  const cz = (b.z0 + b.z1) / 2
  const span = Math.max(b.x1 - b.x0, b.z1 - b.z0)
  const water = CreateBox("corrida-water", { width: span * 6, depth: span * 6, height: 1 }, scene)
  water.position.set(cx, GROUND_Y - 0.5, cz)
  // chão escuro com a grade de neon (night.ts)
  const waterMat = new StandardMaterial("corrida-water", scene)
  waterMat.diffuseColor = new Color3(0.03, 0.02, 0.06)
  waterMat.specularColor = new Color3(0, 0, 0)
  new GridPlugin(waterMat)
  water.material = waterMat
  water.isPickable = false
  water.freezeWorldMatrix()
  disposables.push(water, waterMat)

  const rand = (() => {
    let s = 91731
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  const tooClose = (x: number, z: number, r: number) => {
    for (let i = 0; i < t.n; i += 3) if (Math.hypot(t.x[i] - x, t.z[i] - z) < r) return true
    return false
  }
  // prédios de tijolo, chaminés e morros: em código (cena-pistas.ts)
  disposables.push(CENARIO.baia(lugar(ctx), tooClose))
  // Dirigíveis com lanternas dando a volta lá no alto.
  const steam = createTrimMaterials(scene, low ? "low" : "mid")
  disposables.push(steam)
  if (!low) disposables.push(new AirshipFleet(scene, steam, fleetRing(6, span * 0.45, span * 0.8, 40, 90, 46, 39), cx, cz, 0.008))

  // céu de noite: esfera com degradê (sem neblina) — roxo no horizonte, quase preto no alto
  const sky = CreateSphere("corrida-sky", { diameter: span * 8, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene)
  {
    const p = sky.getVerticesData("position")!
    const colors: number[] = []
    const R = span * 4
    const mix = (a: RGB, c: RGB, k: number) => [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k, a[2] + (c[2] - a[2]) * k]
    for (let i = 0; i < p.length; i += 3) {
      const h = Math.max(0, Math.min(1, p[i + 1] / R))
      const c = h < 0.18 ? mix(NIGHT_HORIZON, NIGHT_MID, Math.pow(h / 0.18, 0.7)) : mix(NIGHT_MID, NIGHT_TOP, Math.pow((h - 0.18) / 0.82, 0.6))
      colors.push(c[0], c[1], c[2], 1)
    }
    sky.setVerticesData("color", colors)
  }
  const skyMat = new StandardMaterial("corrida-sky", scene)
  // sem luz: o emissivo branco satura e sobra a cor do vértice (o degradê)
  skyMat.disableLighting = true
  skyMat.emissiveColor = new Color3(1, 1, 1)
  skyMat.diffuseColor = new Color3(0, 0, 0)
  skyMat.specularColor = new Color3(0, 0, 0)
  skyMat.fogEnabled = false
  sky.material = skyMat
  sky.position.set(cx, 0, cz)
  sky.isPickable = false
  sky.infiniteDistance = true
  disposables.push(sky, skyMat)

  // estrelas: uma malha de pontos (uma chamada de desenho)
  {
    const R = span * 3.6
    const pos: number[] = []
    const col: number[] = []
    const count = low ? 260 : 600
    for (let k = 0; k < count; k++) {
      const yaw = rand() * Math.PI * 2
      const el = 0.12 + Math.pow(rand(), 0.7) * 1.4
      const c = Math.cos(el)
      pos.push(Math.cos(yaw) * c * R, Math.sin(el) * R, Math.sin(yaw) * c * R)
      const b = 0.35 + rand() * 0.65
      const warm = rand() < 0.2
      col.push(b, b * (warm ? 0.85 : 0.95), b * (warm ? 0.7 : 1), 1)
    }
    const stars = new Mesh("corrida-stars", scene)
    const vd = new VertexData()
    vd.positions = pos
    vd.colors = col
    vd.indices = pos.map((_, i) => i).slice(0, count)
    vd.applyToMesh(stars)
    const starMat = new StandardMaterial("corrida-stars", scene)
    starMat.disableLighting = true
    starMat.emissiveColor = new Color3(1, 1, 1)
    starMat.diffuseColor = new Color3(0, 0, 0)
    starMat.fogEnabled = false
    starMat.pointsCloud = true
    starMat.pointSize = low ? 1.5 : 2
    stars.material = starMat
    stars.position.set(cx, 0, cz)
    stars.isPickable = false
    stars.infiniteDistance = true
    stars.alwaysSelectAsActiveMesh = true
    disposables.push(stars, starMat)
  }

}

// ═══ ABISMO VERMELHO — cânion de dia ═════════════════════════════════════════
function abismo(ctx: Ctx) {
  // chão, penhascos, agulhas, paredões e arcos do Cânion: em código (cena-pistas.ts)
  ctx.d.push(CENARIO.abismo(lugar(ctx)))
}

// ═══ FLORESTA ESPECTRAL — crepúsculo bioluminescente ══════════════════════════
function floresta(ctx: Ctx) {
  const { low, gy, rand, scene } = ctx
  // chão, árvores, cogumelos, flores, rochedos e paredões: em código (cena-pistas.ts); aqui ficam os efeitos
  const verde = CENARIO.floresta(lugar(ctx))
  ctx.d.push(verde.saida)
  const fall = canvasTex(ctx, "corrida-fall", 64, 256, (g) => {
    g.fillStyle = "#000"
    g.fillRect(0, 0, 64, 256)
    for (let k = 0; k < 70; k++) {
      const x = rand() * 64
      const b = 120 + rand() * 135
      g.fillStyle = `rgba(${b * 0.75},${b},${b},0.8)`
      g.fillRect(x, rand() * 256, 1.5 + rand() * 3, 20 + rand() * 60)
    }
  })
  const fallMat = glowMat(ctx, "corrida-fall", [0.75, 0.95, 1], true)
  fallMat.emissiveColor = new Color3(0, 0, 0)
  fallMat.emissiveTexture = fall
  for (const [k, q] of verde.quedas.entries()) {
    const w = CreatePlane(`corrida-fall-${k}`, { width: 16, height: q.top - gy }, scene)
    w.position.set(q.x + Math.sin(q.yaw) * 11.5, gy + (q.top - gy) / 2, q.z + Math.cos(q.yaw) * 11.5)
    w.rotation.y = q.yaw + Math.PI
    w.material = fallMat
    w.isPickable = false
    w.freezeWorldMatrix()
    ctx.d.push(w)
  }
  // vaga-lumes: uma malha de pontos em volta da pista
  const pos: number[] = []
  const col: number[] = []
  const count = low ? 220 : 520
  for (let k = 0; k < count; k++) {
    const i = Math.floor(rand() * ctx.t.n)
    const a = rand() * Math.PI * 2
    const rr = ctx.t.width / 2 + 3 + rand() * 40
    pos.push(ctx.t.x[i] + Math.sin(a) * rr, ctx.t.y[i] - 4 + rand() * 18, ctx.t.z[i] + Math.cos(a) * rr)
    const c = rand() < 0.5 ? [0.7, 1, 0.5] : [0.4, 0.95, 1]
    col.push(c[0], c[1], c[2], 1)
  }
  const flies = new Mesh("corrida-flies", scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.colors = col
  vd.indices = pos.map((_, i) => i).slice(0, count)
  vd.applyToMesh(flies)
  const fm = new StandardMaterial("corrida-flies", scene)
  fm.disableLighting = true
  fm.emissiveColor = new Color3(1, 1, 1)
  fm.pointsCloud = true
  fm.pointSize = low ? 2 : 3
  flies.material = fm
  flies.isPickable = false
  flies.alwaysSelectAsActiveMesh = true
  ctx.d.push(flies, fm)
  let tt = 0
  return (dt: number) => {
    tt += dt
    fall.vOffset = (fall.vOffset + dt * 1.6) % 1
    flies.position.y = Math.sin(tt * 0.9) * 0.8
  }
}

// ═══ NEON OVERDRIVE — megacidade de dia ═══════════════════════════════════════
function neon(ctx: Ctx) {
  // chão de placas, torres de vidro com telão, torres de cristal da Orbital e passarelas: em código (cena-pistas.ts)
  ctx.d.push(CENARIO.neon(lugar(ctx)))
}

// ═══ TEMPESTADE OCEÂNICA — mar revolto ════════════════════════════════════════
function tempestade(ctx: Ctx) {
  const { low, gy, rand, scene } = ctx
  const sea = canvasTex(ctx, "corrida-sea", 512, 512, (g) => {
    g.fillStyle = "#0b3a42"
    g.fillRect(0, 0, 512, 512)
    noiseFill(g, 512, 512, rand, ["#0f4a52", "#08303a", "#14606a", "#0a2a33"], 500, 8, 40)
    g.strokeStyle = "rgba(220,245,245,0.75)"
    for (let k = 0; k < 160; k++) {
      g.lineWidth = 1 + rand() * 3
      const x = rand() * 512
      const y = rand() * 512
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + 20 + rand() * 30, y - 8 - rand() * 10, x + 45 + rand() * 50, y + rand() * 6)
      g.stroke()
    }
  })
  const seaMat = ground(ctx, [1, 1, 1], sea, [0.06, 0.12, 0.13], 26)
  seaMat.specularColor = new Color3(0.5, 0.6, 0.65)
  seaMat.specularPower = 24
  // espuma: uma segunda camada que corre para o outro lado (soma; só fora do celular)
  let foam: DynamicTexture | null = null
  if (!low) {
    foam = canvasTex(ctx, "corrida-foam", 256, 256, (g) => {
      g.fillStyle = "#000"
      g.fillRect(0, 0, 256, 256)
      g.strokeStyle = "rgba(200,235,240,0.6)"
      for (let k = 0; k < 90; k++) {
        g.lineWidth = 1 + rand() * 2.5
        const x = rand() * 256
        const y = rand() * 256
        g.beginPath()
        g.moveTo(x, y)
        g.quadraticCurveTo(x + 14, y - 6, x + 30 + rand() * 20, y)
        g.stroke()
      }
    })
    foam.uScale = 60
    foam.vScale = 60
    const fp = CreatePlane("corrida-foam", { size: ctx.span * 7 }, scene)
    fp.rotation.x = Math.PI / 2
    fp.position.set(ctx.cx, gy + 0.4, ctx.cz)
    const fmat = glowMat(ctx, "corrida-foam", [0, 0, 0], true)
    fmat.emissiveTexture = foam
    fp.material = fmat
    fp.isPickable = false
    fp.freezeWorldMatrix()
    ctx.d.push(fp)
  }
  // rochas do mar, plataformas e o navio encalhado: em código (cena-pistas.ts); aqui ficam mar, raio e chuva
  ctx.d.push(CENARIO.tempestade(lugar(ctx)))
  // raio: uma fita em zigue-zague que pisca de vez em quando, junto com um clarão na luz
  const bolt = new Mesh("corrida-bolt", scene)
  {
    const pos: number[] = []
    const idx: number[] = []
    let x = 0
    for (let k = 0; k <= 14; k++) {
      const y = 1 - k / 14
      if (k) x += (rand() - 0.5) * 0.12
      const w = 0.006 + 0.01 * (1 - y)
      pos.push(x - w, y, 0, x + w, y, 0)
      if (k) idx.push((k - 1) * 2, (k - 1) * 2 + 1, k * 2 + 1, (k - 1) * 2, k * 2 + 1, k * 2)
    }
    const vd = new VertexData()
    vd.positions = pos
    vd.indices = idx
    vd.applyToMesh(bolt)
  }
  bolt.material = glowMat(ctx, "corrida-bolt", [0.85, 0.92, 1], true)
  bolt.isPickable = false
  bolt.setEnabled(false)
  bolt.billboardMode = Mesh.BILLBOARDMODE_Y
  ctx.d.push(bolt)
  const baseI = ctx.hemi.intensity
  let next = 3 + rand() * 4
  let flash = 0
  // chuva: só fora do celular, presa à câmera
  let rain: ParticleSystem | null = null
  const emit = new Vector3()
  if (!low) {
    const drop = canvasTex(ctx, "corrida-rain", 8, 64, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 64)
      grad.addColorStop(0, "rgba(200,220,235,0)")
      grad.addColorStop(1, "rgba(200,220,235,0.7)")
      g.fillStyle = grad
      g.fillRect(3, 0, 2, 64)
    }, false)
    drop.hasAlpha = true
    rain = new ParticleSystem("corrida-rain", 900, scene)
    rain.particleTexture = drop
    rain.emitter = emit
    rain.minEmitBox = new Vector3(-45, 0, -45)
    rain.maxEmitBox = new Vector3(45, 0, 45)
    rain.direction1 = new Vector3(-4, -60, 2)
    rain.direction2 = new Vector3(-2, -70, 4)
    rain.minEmitPower = 1
    rain.maxEmitPower = 1
    rain.minLifeTime = 0.5
    rain.maxLifeTime = 0.7
    rain.minSize = 0.05
    rain.maxSize = 0.08
    rain.minScaleY = 14
    rain.maxScaleY = 22
    rain.emitRate = 1100
    rain.color1 = new Color4(0.8, 0.86, 0.95, 0.55)
    rain.color2 = new Color4(0.7, 0.78, 0.9, 0.4)
    rain.colorDead = new Color4(0.7, 0.78, 0.9, 0)
    rain.blendMode = ParticleSystem.BLENDMODE_STANDARD
    rain.billboardMode = ParticleSystem.BILLBOARDMODE_Y
    rain.updateSpeed = 1 / 60
    rain.start()
    ctx.d.push(rain)
  }
  return (dt: number) => {
    sea.uOffset = (sea.uOffset + dt * 0.012) % 1
    sea.vOffset = (sea.vOffset + dt * 0.02) % 1
    if (foam) {
      foam.uOffset = (foam.uOffset - dt * 0.03) % 1
      foam.vOffset = (foam.vOffset + dt * 0.01) % 1
    }
    const cam = scene.activeCamera
    if (rain && cam) {
      emit.copyFrom(cam.globalPosition)
      emit.y += 28
      rain.updateSpeed = Math.max(0.001, dt)
    }
    next -= dt
    if (next <= 0) {
      next = 4 + rand() * 6
      flash = 0.18
      const p = scatter(ctx, 0.5, 1.2, 60)
      if (p) {
        bolt.position.set(p.x, gy, p.z)
        const h = 260 + rand() * 120
        bolt.scaling.set(h, h, h)
        bolt.setEnabled(true)
      }
    }
    if (flash > 0) {
      flash -= dt
      // dois piscos rápidos
      const on = flash > 0.12 || (flash > 0.02 && flash < 0.07)
      ctx.hemi.intensity = on ? baseI * 2.6 : baseI
      if (flash <= 0) {
        bolt.setEnabled(false)
        ctx.hemi.intensity = baseI
      }
    }
  }
}

// ═══ FORJA INFINITA — dentro da máquina ═══════════════════════════════════════
function forja(ctx: Ctx) {
  const { low, gy, rand, scene, t } = ctx
  const lava = canvasTex(ctx, "corrida-lava", 256, 256, (g) => {
    g.fillStyle = "#1a0a05"
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = "#ff7a1a"
    for (let k = 0; k < 70; k++) {
      g.lineWidth = 1 + rand() * 3
      let x = rand() * 256
      let y = rand() * 256
      g.beginPath()
      g.moveTo(x, y)
      for (let s = 0; s < 6; s++) {
        x += (rand() - 0.5) * 40
        y += (rand() - 0.5) * 40
        g.lineTo(x, y)
      }
      g.stroke()
    }
    noiseFill(g, 256, 256, rand, ["rgba(255,140,40,0.5)", "rgba(255,80,10,0.4)"], 60, 2, 9)
  })
  ground(ctx, [0.5, 0.35, 0.3], lava, [1, 0.6, 0.35], 30)
  // o tubo de vidro ciano correndo ao lado da pista (2 trechos sem loop)
  const glass = glowMat(ctx, "corrida-ftube", [0.05, 0.38, 0.45], true)
  const tubos: { path: V3[] }[] = []
  for (const [from, side] of [[0.12, 1], [0.55, -1]] as const) {
    const i0 = Math.floor(t.n * from)
    const len = Math.floor(320 / STEP)
    let ok = true
    for (let i = i0; i < i0 + len; i++) if (t.flag[i % t.n] === 3 || t.flag[i % t.n] === 1) ok = false
    if (!ok) continue
    const path: Vector3[] = []
    for (let i = i0; i <= i0 + len; i += 4) {
      const k = i % t.n
      const off = side * (t.width / 2 + 12)
      path.push(new Vector3(t.x[k] + Math.cos(t.yaw[k]) * off, t.y[k] + 9, t.z[k] - Math.sin(t.yaw[k]) * off))
    }
    const tube = CreateTube(`corrida-ftube-${from}`, { path, radius: 3.4, tessellation: 14, cap: Mesh.NO_CAP }, scene)
    tube.material = glass
    tube.isPickable = false
    tube.freezeWorldMatrix()
    ctx.d.push(tube)
    tubos.push({ path: path.map((v) => [v.x, v.y, v.z] as V3) })
  }
  // colunas com fendas, engrenagens, caldeiras, vigas por cima da pista e os aros do tubo: em código (cena-pistas.ts)
  ctx.d.push(CENARIO.forja(lugar(ctx), tubos))
  return (dt: number) => {
    lava.uOffset = (lava.uOffset + dt * 0.004) % 1
  }
}

// ═══ montagem ═════════════════════════════════════════════════════════════════
export function buildEnvironment(scene: Scene, t: Track, theme: ThemeId, low: boolean, lights: { hemi: HemisphericLight; sun: DirectionalLight }): TrackEnv {
  const a = ATMOS[theme]
  lights.hemi.diffuse = new Color3(...a.hemi.diffuse)
  lights.hemi.groundColor = new Color3(...a.hemi.ground)
  lights.hemi.intensity = a.hemi.intensity
  lights.sun.direction = new Vector3(...a.sun.dir)
  lights.sun.diffuse = new Color3(...a.sun.diffuse)
  lights.sun.intensity = a.sun.intensity
  const fog = new Color3(...a.horizon)
  scene.clearColor = new Color4(fog.r, fog.g, fog.b, 1)
  scene.fogColor = fog
  scene.fogStart = low ? a.fog[0] * 0.62 : a.fog[0]
  scene.fogEnd = low ? a.fog[1] * 0.6 : a.fog[1]
  const b = t.bounds
  const samples: number[] = []
  for (let i = 0; i < t.n; i += 3) samples.push(t.x[i], t.z[i], t.y[i])
  let seed = 91731 + theme.length * 7919
  const ctx: Ctx = {
    scene,
    t,
    low,
    d: [],
    rand: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    cx: (b.x0 + b.x1) / 2,
    cz: (b.z0 + b.z1) / 2,
    span: Math.max(b.x1 - b.x0, b.z1 - b.z0),
    gy: groundYOf(theme, t),
    hemi: lights.hemi,
    near(x, z) {
      let best = Infinity
      let y = 0
      for (let k = 0; k < samples.length; k += 3) {
        const d = Math.hypot(samples[k] - x, samples[k + 1] - z)
        if (d < best) {
          best = d
          y = samples[k + 2]
        }
      }
      return { d: best, y }
    },
    clear(x, z, r, y0, y1) {
      const rr = r + ctx.t.width / 2
      for (let k = 0; k < samples.length; k += 3) {
        const y = samples[k + 2]
        if (y < y0 - 2 || y > y1 + 2) continue
        if (Math.hypot(samples[k] - x, samples[k + 1] - z) < rr) return false
      }
      return true
    },
  }
  let tick: ((dt: number) => void) | void = undefined
  if (theme === "baia") baia(ctx)
  else {
    sky(ctx, a)
    if (theme === "abismo") abismo(ctx)
    else if (theme === "floresta") tick = floresta(ctx)
    else if (theme === "neon") neon(ctx)
    else if (theme === "tempestade") tick = tempestade(ctx)
    else tick = forja(ctx)
  }
  return {
    tick(dt) {
      if (tick) tick(dt)
    },
    dispose() {
      for (const x of ctx.d) x.dispose()
      ctx.d.length = 0
    },
  }
}
