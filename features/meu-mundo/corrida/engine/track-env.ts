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
import "@babylonjs/core/Meshes/thinInstanceMesh"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Material } from "@babylonjs/core/Materials/material"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { STEP, type Track } from "../sim/track"
import { GridPlugin, WindowsPlugin } from "./night"
import { AirshipFleet, fleetRing } from "../../engine/steampunk/scenery"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import type { ThemeId } from "./circuit-art"

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

/** Malha-base + instâncias finas acumuladas (uma chamada de desenho). */
class Thin {
  private m: number[] = []
  private c: number[] = []
  constructor(
    readonly mesh: Mesh,
    private readonly colored: boolean,
  ) {}
  add(pos: Vector3, scale: Vector3, yaw = 0, rgb?: RGB, pitch = 0, roll = 0) {
    this.m.push(...Matrix.Compose(scale, Quaternion.RotationYawPitchRoll(yaw, pitch, roll), pos).asArray())
    if (this.colored) this.c.push(rgb?.[0] ?? 1, rgb?.[1] ?? 1, rgb?.[2] ?? 1, 1)
  }
  done() {
    if (!this.m.length) {
      this.mesh.setEnabled(false)
      return
    }
    this.mesh.thinInstanceSetBuffer("matrix", new Float32Array(this.m), 16, true)
    if (this.colored) this.mesh.thinInstanceSetBuffer("color", new Float32Array(this.c), 4, true)
    this.mesh.isPickable = false
  }
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
function base(ctx: Ctx, mesh: Mesh, mat: StandardMaterial, colored = false): Thin {
  mesh.material = mat
  ctx.d.push(mesh)
  return new Thin(mesh, colored)
}
const box = (ctx: Ctx, name: string, up = true) => {
  const m = CreateBox(name, { size: 1 }, ctx.scene)
  if (up) m.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  return m
}
const cyl = (ctx: Ctx, name: string, top: number, tess: number, up = true) => {
  const m = CreateCylinder(name, { diameterTop: top, diameterBottom: 1, height: 1, tessellation: tess }, ctx.scene)
  if (up) m.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
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

  const tower = CreateBox("corrida-tower", { size: 1 }, scene)
  tower.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  const towerMat = new StandardMaterial("corrida-tower", scene)
  towerMat.diffuseColor = new Color3(1, 1, 1)
  towerMat.specularColor = new Color3(0.08, 0.08, 0.12)
  // janelas acesas e coroas de neon (night.ts)
  new WindowsPlugin(towerMat)
  tower.material = towerMat
  tower.isPickable = false
  disposables.push(tower, towerMat)
  const rand = (() => {
    let s = 91731
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  const tooClose = (x: number, z: number, r: number) => {
    for (let i = 0; i < t.n; i += 3) if (Math.hypot(t.x[i] - x, t.z[i] - z) < r) return true
    return false
  }
  const tm: number[] = []
  const tc: number[] = []
  // Tijolo e cantaria escuros de noite.
  const PALETTE: RGB[] = [
    [0.17, 0.1, 0.08],
    [0.2, 0.13, 0.1],
    [0.12, 0.1, 0.09],
    [0.22, 0.17, 0.13],
    [0.15, 0.12, 0.11],
  ]
  // Chaminés de tijolo em cima de um em cada três prédios (uma malha só).
  const chim: number[] = []
  const want = low ? 140 : 320
  for (let k = 0, tries = 0; k < want && tries < want * 6; tries++) {
    const x = cx + (rand() - 0.5) * span * 2.2
    const z = cz + (rand() - 0.5) * span * 2.2
    const w = 10 + rand() * 18
    if (tooClose(x, z, w + 16)) continue
    const inside = Math.abs(x - cx) < span * 0.6 && Math.abs(z - cz) < span * 0.6
    const h = (inside ? 30 : 50) + rand() * (inside ? 70 : 150)
    const m = Matrix.Compose(new Vector3(w, h, w * (0.7 + rand() * 0.6)), Quaternion.RotationYawPitchRoll(rand() * Math.PI, 0, 0), new Vector3(x, GROUND_Y, z))
    tm.push(...m.asArray())
    if (rand() < 0.34) {
      const cr = 1.2 + rand() * 1.6
      const ch = 8 + rand() * 16
      for (const off of rand() < 0.4 ? [-w * 0.22, w * 0.22] : [0]) chim.push(...Matrix.Compose(new Vector3(cr, ch, cr), Quaternion.Identity(), new Vector3(x + off, GROUND_Y + h, z)).asArray())
    }
    const c = PALETTE[Math.floor(rand() * PALETTE.length)]
    tc.push(c[0], c[1], c[2], 1)
    k++
  }
  // montanhas ao longe (pirâmides baixas)
  const mtn = CreateCylinder("corrida-mtn", { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 4 }, scene)
  mtn.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  const mtnMat = new StandardMaterial("corrida-mtn", scene)
  mtnMat.diffuseColor = new Color3(0.08, 0.05, 0.04)
  mtnMat.specularColor = new Color3(0, 0, 0)
  mtn.material = mtnMat
  mtn.isPickable = false
  disposables.push(mtn, mtnMat)
  const mm: number[] = []
  for (let k = 0; k < 14; k++) {
    const ang = (k / 14) * Math.PI * 2 + rand() * 0.3
    const r = span * (1.5 + rand() * 0.6)
    const size = 160 + rand() * 260
    const m = Matrix.Compose(new Vector3(size, size * (0.45 + rand() * 0.35), size), Quaternion.RotationYawPitchRoll(rand(), 0, 0), new Vector3(cx + Math.sin(ang) * r, GROUND_Y, cz + Math.cos(ang) * r))
    mm.push(...m.asArray())
  }
  mtn.thinInstanceSetBuffer("matrix", new Float32Array(mm), 16, true)
  tower.thinInstanceSetBuffer("matrix", new Float32Array(tm), 16, true)
  tower.thinInstanceSetBuffer("color", new Float32Array(tc), 4, true)
  if (chim.length) {
    const stack = CreateCylinder("corrida-chimney", { diameterTop: 0.8, diameterBottom: 1, height: 1, tessellation: 8 }, scene)
    stack.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
    const stackMat = new StandardMaterial("corrida-chimney", scene)
    stackMat.diffuseColor = new Color3(0.26, 0.14, 0.1)
    stackMat.specularColor = new Color3(0, 0, 0)
    // a boca da chaminé brilha de leve (brasas lá dentro)
    stackMat.emissiveColor = new Color3(0.05, 0.02, 0.01)
    stack.material = stackMat
    stack.isPickable = false
    stack.thinInstanceSetBuffer("matrix", new Float32Array(chim), 16, true)
    disposables.push(stack, stackMat)
  }
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
  const { low, gy, rand } = ctx
  const sand = canvasTex(ctx, "corrida-sand", 256, 256, (g) => {
    g.fillStyle = "#9a4a2a"
    g.fillRect(0, 0, 256, 256)
    noiseFill(g, 256, 256, rand, ["#a85a34", "#8a3f22", "#b8693c", "#7a3520"], 380, 3, 22)
  })
  ground(ctx, [1, 1, 1], sand, [0.12, 0.07, 0.05], 60)
  // pedra em estratos (camadas horizontais)
  const strata = canvasTex(ctx, "corrida-strata", 64, 256, (g) => {
    for (let y = 0; y < 256; ) {
      const k = rand()
      const hh = 3 + rand() * 9
      g.fillStyle = `rgb(${(150 + k * 70) | 0},${(68 + k * 42) | 0},${(40 + k * 26) | 0})`
      g.fillRect(0, y, 64, hh)
      y += hh
    }
  })
  const rockMat = litMat(ctx, "corrida-rock", [1, 1, 1], 0.03, [0.16, 0.09, 0.06])
  rockMat.diffuseTexture = strata
  const mesa = base(ctx, cyl(ctx, "corrida-mesa", 0.84, 7), rockMat, true)
  const spire = base(ctx, cyl(ctx, "corrida-spire", 0.18, 6), rockMat, true)
  const cliff = base(ctx, box(ctx, "corrida-cliff"), rockMat, true)
  const arch = base(ctx, CreateTorus("corrida-arch", { diameter: 1, thickness: 0.2, tessellation: 20 }, ctx.scene), rockMat, true)
  const tones: RGB[] = [
    [1, 0.92, 0.86],
    [0.88, 0.76, 0.7],
    [1, 0.84, 0.72],
    [0.82, 0.68, 0.6],
  ]
  for (let k = 0; k < (low ? 40 : 85); k++) {
    const r = 18 + rand() * 70
    const p = scatter(ctx, 0.08, 1.3, r + 18)
    if (!p) continue
    const top = p.n.y + (rand() < 0.45 ? -12 - rand() * 50 : 8 + rand() * 60)
    mesa.add(new Vector3(p.x, gy, p.z), new Vector3(r * 2, top - gy, r * 2 * (0.7 + rand() * 0.6)), rand() * 6, tones[k % 4])
  }
  for (let k = 0; k < (low ? 22 : 50); k++) {
    const r = 4 + rand() * 9
    const p = scatter(ctx, 0.05, 1.1, r + 14)
    if (!p) continue
    spire.add(new Vector3(p.x, gy, p.z), new Vector3(r * 2, p.n.y + 20 + rand() * 70 - gy, r * 2), rand() * 6, tones[(k + 1) % 4])
  }
  // paredões do cânion no horizonte
  const hTop = ctx.t.bounds.y1 - gy
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * Math.PI * 2 + rand() * 0.15
    const R = ctx.span * (1.3 + rand() * 0.35)
    cliff.add(new Vector3(ctx.cx + Math.sin(a) * R, gy, ctx.cz + Math.cos(a) * R), new Vector3(220 + rand() * 260, hTop + 30 + rand() * 140, 140), a + Math.PI / 2, tones[k % 4])
  }
  // arcos de pedra (como na referência), meio enterrados
  for (let k = 0; k < 5; k++) {
    const sz = 130 + rand() * 120
    const p = scatter(ctx, 0.55, 1.2, sz * 0.6)
    if (!p) continue
    arch.add(new Vector3(p.x, gy + sz * 0.12, p.z), new Vector3(sz, sz, sz), rand() * 6, tones[k % 4], Math.PI / 2)
  }
  for (const th of [mesa, spire, cliff, arch]) th.done()
}

// ═══ FLORESTA ESPECTRAL — crepúsculo bioluminescente ══════════════════════════
function floresta(ctx: Ctx) {
  const { low, gy, rand, scene } = ctx
  const moss = canvasTex(ctx, "corrida-moss", 256, 256, (g) => {
    g.fillStyle = "#0c2418"
    g.fillRect(0, 0, 256, 256)
    noiseFill(g, 256, 256, rand, ["#123a24", "#08180f", "#1a4a2c", "#0a2a2a"], 420, 3, 18)
  })
  ground(ctx, [1, 1, 1], moss, [0.02, 0.05, 0.04], 50)
  const bark = canvasTex(ctx, "corrida-bark", 64, 256, (g) => {
    g.fillStyle = "#2a1d14"
    g.fillRect(0, 0, 64, 256)
    for (let x = 0; x < 64; x += 2 + rand() * 4) {
      g.fillStyle = rand() < 0.5 ? "#3a2a1c" : "#1a120c"
      g.fillRect(x, 0, 1 + rand() * 2.5, 256)
    }
  })
  const trunkMat = litMat(ctx, "corrida-trunk", [1, 1, 1], 0.02, [0.04, 0.05, 0.04])
  trunkMat.diffuseTexture = bark
  const canopyMat = litMat(ctx, "corrida-canopy", [1, 1, 1], 0.03, [0.02, 0.07, 0.06])
  const trunk = base(ctx, cyl(ctx, "corrida-trunk", 0.62, 9), trunkMat)
  const canopy = base(ctx, CreateSphere("corrida-canopy", { diameter: 1, segments: 6 }, scene), canopyMat, true)
  const capMat = glowMat(ctx, "corrida-cap")
  const cap = base(ctx, CreateSphere("corrida-cap", { diameter: 1, segments: 8, slice: 0.5 }, scene), capMat, true)
  const stem = base(ctx, cyl(ctx, "corrida-stem", 0.7, 8), litMat(ctx, "corrida-stem", [0.75, 0.82, 0.78], 0.02, [0.12, 0.16, 0.16]))
  const plant = base(ctx, cyl(ctx, "corrida-plant", 0, 5), glowMat(ctx, "corrida-plant"), true)
  const greens: RGB[] = [
    [0.07, 0.24, 0.14],
    [0.05, 0.2, 0.17],
    [0.1, 0.28, 0.12],
    [0.06, 0.16, 0.2],
  ]
  const CYAN: RGB = [0.25, 0.95, 1]
  const MAGENTA: RGB = [0.95, 0.25, 0.9]
  const VIOLET: RGB = [0.6, 0.3, 1]
  const tree = (x: number, z: number, y: number, r: number, nearTrack: boolean) => {
    // a copa nunca encosta em trecho nenhum da pista (a espiral passa por baixo de
    // outros trechos: perto no plano não basta). Sem lugar = árvore mais baixa ou sem copa.
    let top = y + 30 + rand() * 60
    let R = 16 + rand() * 22
    for (let k = 0; k < 3 && !ctx.clear(x, z, R + 6, top - R * 0.75 - 8, top + R * 0.45); k++) {
      R *= 0.7
      top += 14
    }
    if (!ctx.clear(x, z, R + 6, top - R * 0.75 - 8, top + R * 0.45)) return
    trunk.add(new Vector3(x, gy, z), new Vector3(r * 2, top - gy, r * 2), rand() * 6)
    canopy.add(new Vector3(x, top, z), new Vector3(R * 2, R * 0.8, R * 2), rand() * 6, greens[Math.floor(rand() * 4)])
    canopy.add(new Vector3(x + (rand() - 0.5) * R * 0.5, top - R * 0.3, z + (rand() - 0.5) * R * 0.5), new Vector3(R * 1.3, R * 0.55, R * 1.3), rand() * 6, greens[Math.floor(rand() * 4)])
    if (!nearTrack) return
    // cogumelos de prateleira e plantas acesas no tronco, na altura da pista
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2
      const hy = y - 5 + rand() * 16
      const cs = 2.5 + rand() * 3.5
      cap.add(new Vector3(x + Math.sin(a) * r * 0.95, hy, z + Math.cos(a) * r * 0.95), new Vector3(cs * 2, cs * 0.9, cs * 2), a, k % 2 ? CYAN : VIOLET)
    }
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2
      const ps = 1 + rand() * 2
      plant.add(new Vector3(x + Math.sin(a) * (r + 1.5), y - 6 + rand() * 4, z + Math.cos(a) * (r + 1.5)), new Vector3(ps, ps * 3.2, ps), 0, MAGENTA, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6)
    }
  }
  for (let k = 0; k < (low ? 36 : 70); k++) {
    const r = 3 + rand() * 5
    const p = beside(ctx, r + 6, r + 80)
    if (p) tree(p.x, p.z, p.y, r, true)
  }
  for (let k = 0; k < (low ? 30 : 60); k++) {
    const r = 4 + rand() * 6
    const p = scatter(ctx, 0.2, 1.4, r + 30)
    if (p) tree(p.x, p.z, p.n.y, r, false)
  }
  // cogumelos gigantes no chão (a pista passa por cima deles nas partes baixas)
  for (let k = 0; k < (low ? 18 : 40); k++) {
    const p = scatter(ctx, 0.02, 0.9, 16)
    if (!p) continue
    const h = Math.max(8, Math.min(p.n.y - gy - 4, 10 + rand() * 30))
    const cs = 6 + rand() * 9
    if (!ctx.clear(p.x, p.z, cs + 4, gy, gy + h + cs + 4)) continue
    stem.add(new Vector3(p.x, gy, p.z), new Vector3(cs * 0.45, h, cs * 0.45))
    cap.add(new Vector3(p.x, gy + h, p.z), new Vector3(cs * 2, cs * 1.1, cs * 2), rand() * 6, rand() < 0.6 ? CYAN : MAGENTA)
  }
  for (const th of [trunk, canopy, cap, stem, plant]) th.done()

  // cachoeiras: paredão de pedra + queda d'água (textura que corre, soma) + névoa
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
  const rock = base(ctx, box(ctx, "corrida-wfrock"), litMat(ctx, "corrida-wfrock", [0.16, 0.2, 0.18], 0.02, [0.02, 0.03, 0.03]))
  for (let k = 0; k < 5; k++) {
    const p = scatter(ctx, 0.25, 0.85, 50)
    if (!p) continue
    const top = p.n.y + 28 + rand() * 30
    const yaw = Math.atan2(ctx.cx - p.x, ctx.cz - p.z)
    rock.add(new Vector3(p.x, gy, p.z), new Vector3(46, top - gy, 22), yaw)
    const w = CreatePlane(`corrida-fall-${k}`, { width: 16, height: top - gy }, scene)
    w.position.set(p.x + Math.sin(yaw) * 11.5, gy + (top - gy) / 2, p.z + Math.cos(yaw) * 11.5)
    w.rotation.y = yaw + Math.PI
    w.material = fallMat
    w.isPickable = false
    w.freezeWorldMatrix()
    ctx.d.push(w)
  }
  rock.done()
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
  const { low, gy, rand, scene } = ctx
  const floor = canvasTex(ctx, "corrida-cityfloor", 256, 256, (g) => {
    g.fillStyle = "#3a4250"
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = "#5a6474"
    g.lineWidth = 3
    for (let x = 0; x <= 256; x += 64) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, 256)
      g.moveTo(0, x)
      g.lineTo(256, x)
      g.stroke()
    }
  })
  ground(ctx, [1, 1, 1], floor, [0.05, 0.05, 0.06], 50)
  const towerMat = litMat(ctx, "corrida-ctower", [1, 1, 1], 0.25, [0.04, 0.05, 0.07])
  new WindowsPlugin(towerMat)
  const tower = base(ctx, box(ctx, "corrida-ctower"), towerMat, true)
  const ring = base(ctx, CreateTorus("corrida-cring", { diameter: 1, thickness: 0.06, tessellation: 28 }, scene), glowMat(ctx, "corrida-cring", [0.2, 0.9, 1]))
  const disc = base(ctx, cyl(ctx, "corrida-cdisc", 1, 20), litMat(ctx, "corrida-cdisc", [0.6, 0.64, 0.7], 0.3, [0.05, 0.06, 0.07]))
  const screenTex = canvasTex(ctx, "corrida-screen", 64, 128, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 128)
    grad.addColorStop(0, "#ffffff")
    grad.addColorStop(0.5, "#b8b8b8")
    grad.addColorStop(1, "#ffffff")
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 128)
    g.fillStyle = "rgba(0,0,0,0.35)"
    for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 64, 1.5)
    g.fillStyle = "rgba(255,255,255,0.9)"
    g.fillRect(6, 30, 52, 6)
    g.fillRect(6, 44, 34, 4)
  }, false)
  const scrMat = glowMat(ctx, "corrida-screen")
  scrMat.emissiveColor = new Color3(0, 0, 0)
  scrMat.emissiveTexture = screenTex
  const screen = base(ctx, CreatePlane("corrida-screen", { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene), scrMat, true)
  const bridge = base(ctx, box(ctx, "corrida-cbridge", false), litMat(ctx, "corrida-cbridge", [0.5, 0.54, 0.6], 0.2, [0.04, 0.05, 0.06]))
  const under = base(ctx, box(ctx, "corrida-cunder", false), glowMat(ctx, "corrida-cunder", [0.2, 0.9, 1]))
  const steel: RGB[] = [
    [0.62, 0.66, 0.74],
    [0.48, 0.54, 0.64],
    [0.74, 0.76, 0.82],
    [0.38, 0.46, 0.58],
  ]
  const HOLO: RGB[] = [
    [1, 0.3, 0.85],
    [0.3, 0.85, 1],
    [0.65, 0.4, 1],
    [1, 0.55, 0.3],
  ]
  const towers: { x: number; z: number; w: number; top: number }[] = []
  for (let k = 0; k < (low ? 120 : 240); k++) {
    const w = 18 + rand() * 32
    const p = scatter(ctx, 0.04, 1.5, w * 0.75 + 20)
    if (!p) continue
    const top = Math.max(p.n.y + 30, gy + 80) + rand() * 260
    const yaw = rand() * Math.PI
    tower.add(new Vector3(p.x, gy, p.z), new Vector3(w, top - gy, w * (0.7 + rand() * 0.5)), yaw, steel[k % 4])
    towers.push({ x: p.x, z: p.z, w, top })
    if (rand() < 0.35) ring.add(new Vector3(p.x, gy + (top - gy) * (0.5 + rand() * 0.45), p.z), new Vector3(w * 1.9, w * 1.9, w * 1.9))
    if (rand() < 0.25) disc.add(new Vector3(p.x, top, p.z), new Vector3(w * 1.6, 3, w * 1.6))
    if (rand() < 0.4 && p.n.d < 260) {
      const sh = 18 + rand() * 30
      const face = yaw + (Math.floor(rand() * 4) * Math.PI) / 2
      const hy = Math.min(top - sh / 2 - 4, p.n.y + (rand() - 0.3) * 40)
      screen.add(new Vector3(p.x + Math.sin(face) * (w / 2 + 0.6), hy, p.z + Math.cos(face) * (w / 2 + 0.6)), new Vector3(w * 0.7, sh, 1), face, HOLO[k % 4])
    }
  }
  // passarelas no alto entre prédios vizinhos (longe da pista)
  let made = 0
  for (let a = 0; a < towers.length && made < (low ? 14 : 30); a++) {
    const A = towers[a]
    const B = towers.find((b) => b !== A && Math.hypot(b.x - A.x, b.z - A.z) < 140 && Math.hypot(b.x - A.x, b.z - A.z) > 50)
    if (!B) continue
    const mx = (A.x + B.x) / 2
    const mz = (A.z + B.z) / 2
    const n = ctx.near(mx, mz)
    if (n.d < 28) continue
    const y = Math.min(A.top, B.top) - 20 - rand() * 60
    const len = Math.hypot(B.x - A.x, B.z - A.z)
    const yaw = Math.atan2(B.x - A.x, B.z - A.z)
    bridge.add(new Vector3(mx, y, mz), new Vector3(6, 2.4, len), yaw)
    under.add(new Vector3(mx, y - 1.3, mz), new Vector3(1.2, 0.25, len), yaw)
    made++
  }
  for (const th of [tower, ring, disc, screen, bridge, under]) th.done()
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
  const rockMat = litMat(ctx, "corrida-srock", [0.2, 0.23, 0.24], 0.06, [0.02, 0.03, 0.03])
  const rock = base(ctx, cyl(ctx, "corrida-srock", 0.22, 6), rockMat, true)
  for (let k = 0; k < (low ? 16 : 32); k++) {
    const r = 10 + rand() * 30
    const p = scatter(ctx, 0.1, 1.3, r + 20)
    if (!p) continue
    rock.add(new Vector3(p.x, gy - 4, p.z), new Vector3(r * 2, 25 + rand() * 80, r * 2 * (0.6 + rand() * 0.6)), rand() * 6, [0.85 + rand() * 0.3, 0.9 + rand() * 0.2, 0.9 + rand() * 0.2])
  }
  rock.done()
  // plataformas (as do mar e as que flutuam)
  const steel = litMat(ctx, "corrida-rig", [0.42, 0.45, 0.48], 0.25, [0.04, 0.045, 0.05])
  const leg = base(ctx, cyl(ctx, "corrida-rigleg", 1, 8), steel)
  const deck = base(ctx, cyl(ctx, "corrida-rigdeck", 1, 18), steel)
  const tow = base(ctx, box(ctx, "corrida-rigtower"), steel)
  const rim = base(ctx, CreateTorus("corrida-rigrim", { diameter: 1, thickness: 0.04, tessellation: 32 }, scene), glowMat(ctx, "corrida-rigrim", [0.2, 0.9, 1]))
  const hazard = base(ctx, cyl(ctx, "corrida-righaz", 1, 18), litMat(ctx, "corrida-righaz", [0.85, 0.65, 0.12], 0.1, [0.15, 0.1, 0.02]))
  for (let k = 0; k < 7; k++) {
    const sz = 40 + rand() * 30
    const p = scatter(ctx, 0.15, 1.0, sz * 0.7 + 25)
    if (!p) continue
    const dy = gy + 14 + rand() * 16
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) leg.add(new Vector3(p.x + ox * sz * 0.3, gy - 2, p.z + oz * sz * 0.3), new Vector3(3, dy - gy + 2, 3))
    deck.add(new Vector3(p.x, dy, p.z), new Vector3(sz, 3, sz))
    hazard.add(new Vector3(p.x, dy + 3, p.z), new Vector3(sz * 1.02, 0.6, sz * 1.02))
    rim.add(new Vector3(p.x, dy + 3.4, p.z), new Vector3(sz * 1.05, sz * 1.05, sz * 1.05))
    tow.add(new Vector3(p.x + sz * 0.15, dy + 3, p.z), new Vector3(6, 22 + rand() * 20, 6))
  }
  for (let k = 0; k < 5; k++) {
    const sz = 30 + rand() * 25
    const p = scatter(ctx, 0.3, 1.1, sz + 30)
    if (!p) continue
    const fy = p.n.y + 30 + rand() * 50
    deck.add(new Vector3(p.x, fy, p.z), new Vector3(sz, 5, sz))
    hazard.add(new Vector3(p.x, fy + 5, p.z), new Vector3(sz * 1.02, 0.6, sz * 1.02))
    rim.add(new Vector3(p.x, fy - 0.5, p.z), new Vector3(sz * 0.9, sz * 0.9, sz * 0.9))
    tow.add(new Vector3(p.x, fy + 5, p.z), new Vector3(5, 14 + rand() * 12, 5))
  }
  for (const th of [leg, deck, tow, rim, hazard]) th.done()
  // raio: uma fita em zigue-zague que pisca de vez em quando, com clarão na luz
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
  const plate = canvasTex(ctx, "corrida-fplate", 128, 256, (g) => {
    g.fillStyle = "#3a3c42"
    g.fillRect(0, 0, 128, 256)
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle = "#24262b"
      g.fillRect(0, y, 128, 3)
    }
    for (let x = 0; x < 128; x += 64) {
      g.fillStyle = "#2a2c31"
      g.fillRect(x, 0, 3, 256)
    }
    noiseFill(g, 128, 256, rand, ["rgba(0,0,0,0.2)", "rgba(255,255,255,0.05)"], 80, 2, 10)
  })
  const colMat = litMat(ctx, "corrida-fcol", [1, 1, 1], 0.2, [0.06, 0.05, 0.05])
  colMat.diffuseTexture = plate
  const col = base(ctx, box(ctx, "corrida-fcol"), colMat, true)
  const slit = base(ctx, box(ctx, "corrida-fslit"), glowMat(ctx, "corrida-fslit", [1, 0.55, 0.16]))
  const beam = base(ctx, box(ctx, "corrida-fbeam", false), colMat, true)
  const lamp = base(ctx, box(ctx, "corrida-flamp", false), glowMat(ctx, "corrida-flamp", [1, 0.7, 0.3]))
  const hTop = t.bounds.y1
  for (let k = 0; k < (low ? 26 : 55); k++) {
    const w = 16 + rand() * 26
    const p = scatter(ctx, 0.03, 1.25, w * 0.75 + 16)
    if (!p) continue
    const top = hTop + 40 + rand() * 140
    const yaw = rand() * Math.PI
    col.add(new Vector3(p.x, gy, p.z), new Vector3(w, top - gy, w), yaw, [0.9 + rand() * 0.2, 0.9 + rand() * 0.15, 0.95])
    // fendas acesas (lava por dentro) em duas faces
    for (const f of [0, Math.PI]) {
      const fx = Math.sin(yaw + f) * (w / 2 + 0.2)
      const fz = Math.cos(yaw + f) * (w / 2 + 0.2)
      slit.add(new Vector3(p.x + fx, gy + (top - gy) * 0.1, p.z + fz), new Vector3(2.2, (top - gy) * 0.75, 0.6), yaw + f)
    }
  }
  // vigas por cima da pista, com as lâmpadas embaixo
  const every = Math.max(1, Math.floor(t.n / (low ? 14 : 28)))
  for (let i = 0; i < t.n; i += every) {
    if (t.flag[i] === 3 || t.flag[(i + 10) % t.n] === 3) continue
    const y = t.y[i] + 24 + rand() * 18
    beam.add(new Vector3(t.x[i], y, t.z[i]), new Vector3(140, 4, 5), t.yaw[i] + Math.PI / 2, [0.85, 0.85, 0.9])
    lamp.add(new Vector3(t.x[i], y - 2.2, t.z[i]), new Vector3(30, 0.4, 1.4), t.yaw[i] + Math.PI / 2)
  }
  for (const th of [col, slit, beam, lamp]) th.done()
  // o tubo de vidro ciano correndo ao lado da pista (2 trechos sem loop)
  const glass = glowMat(ctx, "corrida-ftube", [0.05, 0.38, 0.45], true)
  const frame = base(ctx, CreateTorus("corrida-fframe", { diameter: 1, thickness: 0.08, tessellation: 18 }, scene), colMat, true)
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
    for (let k = 0; k < path.length - 1; k += 3) {
      const dir = path[k + 1].subtract(path[k])
      const yaw = Math.atan2(dir.x, dir.z)
      frame.add(path[k], new Vector3(7.4, 7.4, 7.4), yaw, [0.95, 0.95, 1], Math.PI / 2)
    }
  }
  frame.done()
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
