// features/meu-mundo/corrida/engine/track-view.ts — CORRIDA (mm3d-39): o circuito desenhado.
//
// Tudo sai das amostras da pista (sim/track.ts): a faixa com zebra e linhas,
// as rampas listradas de alerta, o guarda-corpo com o neon em cima, a laje
// por baixo, os PENHASCOS dos vãos (blocos até o chão), os pilares, as faixas
// de turbo (textura de setas correndo), as cápsulas, os arcos e a cidade em
// volta (instâncias finas). Sem sombra nenhuma (pedido do Alex): só luz.
//
// Cor por vértice e duas malhas por tipo (corpo iluminado, brilho sem luz),
// como os prédios do centro.
//
// mm3d-41: À NOITE. Asfalto e concreto escuros, faixas e neon acesos (cor no
// brilho, sem luz), faixa rosa na parede de dentro, prédios com janelas e
// coroas de neon e o chão em grade (plugins de night.ts), céu roxo no
// horizonte. A neblina é da cor do horizonte, então o longe some no céu.
//
// mm3d-55 — STEAMPUNK À NOITE: chapa de ferro escura com faixas de marfim,
// zebra vermelho-laca, rampas listradas latão/ferro, guarda-corpo de ferro
// com o friso âmbar aceso (no lugar do neon ciano/rosa), pilares e penhascos
// de tijolo, prédios de tijolo com janelas de lampião e chaminés, céu de
// cobre e fumaça no horizonte, anéis de latão aceso, pórtico de largada de
// latão e dirigíveis com lanternas.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { STEP, type Track } from "../sim/track"
import { GridPlugin, WindowsPlugin } from "./night"
import { buildLogos } from "./logos"
import { buildBillboards, type BillboardSpot } from "./billboards"
import { AirshipFleet, fleetRing } from "../../engine/steampunk/scenery"
import { createTrimMaterials } from "../../engine/steampunk/materials"

/** Altura do chão (a baía) lá embaixo. */
export const GROUND_Y = -42

type RGB = [number, number, number]
/** Céu: horizonte (= neblina), meio e alto. */
export const NIGHT_HORIZON: RGB = [0.27, 0.13, 0.08]
const NIGHT_MID: RGB = [0.09, 0.05, 0.06]
const NIGHT_TOP: RGB = [0.015, 0.015, 0.035]
const ROAD_A: RGB = [0.12, 0.105, 0.095]
const ROAD_B: RGB = [0.145, 0.125, 0.105]
const LINE: RGB = [0.9, 0.84, 0.7]
/** Linha da faixa acesa (no brilho). */
const LANE: RGB = [0.95, 0.62, 0.24]
const ZEBRA_R: RGB = [0.66, 0.12, 0.12]
const WALL_IN: RGB = [0.22, 0.18, 0.15]
const WALL_OUT: RGB = [0.13, 0.11, 0.1]
const SLAB: RGB = [0.09, 0.075, 0.065]
const HAZARD_Y: RGB = [0.8, 0.6, 0.2]
const HAZARD_K: RGB = [0.1, 0.09, 0.08]
const CONCRETE: RGB = [0.3, 0.16, 0.11]
const CONCRETE_D: RGB = [0.22, 0.13, 0.09]
/** Antes neon; agora o latão aceso e o cobre aceso (o lampião). */
const NEON: RGB = [1.0, 0.68, 0.28]
const NEON_PINK: RGB = [0.92, 0.4, 0.16]
const NEON_HOT: RGB = [1.0, 0.85, 0.42]

/** Monta uma malha de quads com cor chapada por quad (vértices próprios). */
class Quads {
  pos: number[] = []
  col: number[] = []
  idx: number[] = []
  quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, rgb: RGB) {
    const n = this.pos.length / 3
    for (const p of [a, b, c, d]) {
      this.pos.push(p.x, p.y, p.z)
      this.col.push(rgb[0], rgb[1], rgb[2], 1)
    }
    // a-b-c-d no sentido que deixa a face para fora (o material desenha os dois lados)
    this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  build(name: string, scene: Scene, mat: StandardMaterial): Mesh | null {
    if (!this.idx.length) return null
    const m = new Mesh(name, scene)
    const vd = new VertexData()
    vd.positions = this.pos
    vd.indices = this.idx
    vd.colors = this.col
    const normals: number[] = []
    VertexData.ComputeNormals(this.pos, this.idx, normals)
    vd.normals = normals
    vd.applyToMesh(m)
    m.material = mat
    m.isPickable = false
    m.freezeWorldMatrix()
    m.doNotSyncBoundingInfo = true
    return m
  }
}

/** Quadro da pista na amostra i: centro, direita (inclinada) e "cima" (inclinado). */
function frameAt(t: Track, i: number) {
  const k = ((i % t.n) + t.n) % t.n
  const yaw = t.yaw[k]
  const b = t.bank[k]
  const hx = Math.cos(yaw)
  const hz = -Math.sin(yaw)
  return {
    c: new Vector3(t.x[k], t.y[k], t.z[k]),
    r: new Vector3(hx * Math.cos(b), -Math.sin(b), hz * Math.cos(b)),
    up: new Vector3(hx * Math.sin(b), Math.cos(b), hz * Math.sin(b)),
    fwd: new Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
  }
}
const at = (f: ReturnType<typeof frameAt>, u: number, h: number) => f.c.add(f.r.scale(u)).add(f.up.scale(h))

function vertexMat(name: string, scene: Scene, glow: boolean): StandardMaterial {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = glow ? new Color3(0, 0, 0) : new Color3(1, 1, 1)
  m.specularColor = glow ? new Color3(0, 0, 0) : new Color3(0.12, 0.12, 0.12)
  m.backFaceCulling = false
  if (glow) {
    // sem luz: o emissivo branco satura e sobra a cor do vértice
    m.disableLighting = true
    m.emissiveColor = new Color3(1, 1, 1)
  }
  return m
}

/** Textura das faixas de turbo: setas para a frente (v cresce para a frente). */
function padTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture("corrida-pad", { width: 128, height: 256 }, scene, true)
  const g = tex.getContext() as CanvasRenderingContext2D
  g.fillStyle = "#2a1a0e"
  g.fillRect(0, 0, 128, 256)
  for (let k = 0; k < 2; k++) {
    const y0 = 40 + k * 128
    g.beginPath()
    g.moveTo(10, y0 + 60)
    g.lineTo(64, y0 + 8)
    g.lineTo(118, y0 + 60)
    g.lineTo(118, y0 + 90)
    g.lineTo(64, y0 + 38)
    g.lineTo(10, y0 + 90)
    g.closePath()
    g.fillStyle = k === 0 ? "#ffb347" : "#ffe08a"
    g.fill()
  }
  tex.update(false)
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  return tex
}

/** Faixa xadrez do pórtico de largada. */
function checkerTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture("corrida-checker", { width: 256, height: 64 }, scene, true)
  const g = tex.getContext() as CanvasRenderingContext2D
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
    g.fillStyle = (x + y) % 2 ? "#1a1410" : "#efe4cc"
    g.fillRect(x * 16, y * 16, 16, 16)
  }
  tex.update(false)
  return tex
}

export interface TrackView {
  /** Cápsula some/volta. */
  setOrb(id: number, on: boolean): void
  tick(dt: number): void
  dispose(): void
}

export function buildTrackView(scene: Scene, t: Track, low: boolean): TrackView {
  const disposables: { dispose(): void }[] = []
  const bodyMat = vertexMat("corrida-body", scene, false)
  const glowMat = vertexMat("corrida-glow", scene, true)
  disposables.push(bodyMat, glowMat)
  const body = new Quads()
  const glow = new Quads()
  const W = t.width
  const hw = W / 2
  const wall0 = hw + 0.15
  const wall1 = hw + 0.5
  const wallH = 1.1
  const slab = -1.5
  const startI = Math.round(t.startS / STEP)

  // colunas da faixa: zebra | asfalto | linha | asfalto | linha | asfalto | zebra
  const lane = W / 3
  const cols: [number, number, "zebra" | "road" | "line"][] = [
    [-hw, -hw + 0.6, "zebra"],
    [-hw + 0.6, -lane / 2 - 0.13, "road"],
    [-lane / 2 - 0.13, -lane / 2 + 0.13, "line"],
    [-lane / 2 + 0.13, lane / 2 - 0.13, "road"],
    [lane / 2 - 0.13, lane / 2 + 0.13, "line"],
    [lane / 2 + 0.13, hw - 0.6, "road"],
    [hw - 0.6, hw, "zebra"],
  ]
  const solid = (i: number) => t.flag[((i % t.n) + t.n) % t.n] !== 1

  for (let i = 0; i < t.n; i++) {
    const j = (i + 1) % t.n
    if (!solid(i) || !solid(j)) continue
    const a = frameAt(t, i)
    const b = frameAt(t, j)
    const ramp = t.flag[i] === 2
    const panel = Math.floor(i / 5) % 2 ? ROAD_A : ROAD_B
    const startLine = Math.abs(i - startI) <= 1
    if (startLine) {
      // xadrez de 1 m na largada
      for (let u = -hw; u < hw - 1e-6; u += 1.5) {
        const c = (Math.floor((u + hw) / 1.5) + i) % 2 ? LINE : HAZARD_K
        body.quad(at(a, u, 0), at(a, u + 1.5, 0), at(b, u + 1.5, 0), at(b, u, 0), c)
      }
    } else {
      cols.forEach(([u0, u1, kind], ci) => {
        let c: RGB = panel
        if (ramp) c = (i + ci) % 2 ? HAZARD_Y : HAZARD_K
        else if (kind === "zebra") c = Math.floor(i / 2) % 2 ? ZEBRA_R : LINE
        else if (kind === "line" && i % 4 < 2) {
          // a linha tracejada acende (de noite ela é o guia da faixa)
          glow.quad(at(a, u0, 0), at(a, u1, 0), at(b, u1, 0), at(b, u0, 0), LANE)
          return
        }
        body.quad(at(a, u0, 0), at(a, u1, 0), at(b, u1, 0), at(b, u0, 0), c)
      })
    }
    for (const s of [-1, 1]) {
      const w0 = s * wall0
      const w1 = s * wall1
      // face de dentro, topo (neon), face de fora até a laje
      body.quad(at(a, w0, 0), at(b, w0, 0), at(b, w0, wallH), at(a, w0, wallH), WALL_IN)
      // faixa de neon na parede de dentro (um pouco à frente da face)
      const wn = w0 - s * 0.02
      glow.quad(at(a, wn, 0.42), at(b, wn, 0.42), at(b, wn, 0.6), at(a, wn, 0.6), ramp ? NEON_HOT : NEON_PINK)
      glow.quad(at(a, w0, wallH), at(b, w0, wallH), at(b, w1, wallH), at(a, w1, wallH), ramp ? NEON_HOT : NEON)
      body.quad(at(a, w1, wallH), at(b, w1, wallH), at(b, w1, slab), at(a, w1, slab), WALL_OUT)
      // degrau entre a faixa e o guarda-corpo
      body.quad(at(a, s * hw, 0), at(b, s * hw, 0), at(b, w0, 0), at(a, w0, 0), WALL_OUT)
      // filete de neon embaixo do guarda-corpo (a pista "flutua")
      glow.quad(at(a, w1 + s * 0.01, -0.5), at(b, w1 + s * 0.01, -0.5), at(b, w1 + s * 0.01, -0.3), at(a, w1 + s * 0.01, -0.3), NEON)
    }
    body.quad(at(a, -wall1, slab), at(a, wall1, slab), at(b, wall1, slab), at(b, -wall1, slab), SLAB)
  }

  // pontas dos trechos (bordas dos vãos): parede listrada no corte
  for (let i = 0; i < t.n; i++) {
    const j = (i + 1) % t.n
    if (solid(i) === solid(j)) continue
    const f = frameAt(t, solid(i) ? i : j)
    const stripes = 8
    for (let k = 0; k < stripes; k++) {
      const u0 = -wall1 + (2 * wall1 * k) / stripes
      const u1 = -wall1 + (2 * wall1 * (k + 1)) / stripes
      body.quad(at(f, u0, slab), at(f, u1, slab), at(f, u1, 0), at(f, u0, 0), k % 2 ? HAZARD_Y : HAZARD_K)
    }
    glow.quad(at(f, -wall1, 0.02), at(f, wall1, 0.02), at(f, wall1, -0.18), at(f, -wall1, -0.18), solid(i) ? NEON_HOT : NEON)
  }
  for (const m of [body.build("corrida-track", scene, bodyMat), glow.build("corrida-track-glow", scene, glowMat)]) if (m) disposables.push(m)

  // ── pilares e penhascos (caixas com instância fina) ──────────────────────
  const pillarMat = new StandardMaterial("corrida-pillar", scene)
  pillarMat.diffuseColor = new Color3(1, 1, 1)
  pillarMat.specularColor = new Color3(0.05, 0.05, 0.05)
  disposables.push(pillarMat)
  const pillar = CreateBox("corrida-pillar", { size: 1 }, scene)
  pillar.bakeTransformIntoVertices(Matrix.Translation(0, -0.5, 0)) // topo em y = 0
  pillar.material = pillarMat
  pillar.isPickable = false
  disposables.push(pillar)
  const mats: number[] = []
  const cols4: number[] = []
  const addBlock = (x: number, yTop: number, z: number, yaw: number, w: number, d: number, rgb: RGB) => {
    const h = Math.max(0.5, yTop - GROUND_Y)
    const m = Matrix.Compose(new Vector3(w, h, d), Quaternion.RotationYawPitchRoll(yaw, 0, 0), new Vector3(x, yTop, z))
    mats.push(...m.asArray())
    cols4.push(rgb[0], rgb[1], rgb[2], 1)
  }
  const gapNear = (i: number, m: number) => {
    for (let k = -m; k <= m; k++) if (!solid(i + k)) return true
    return false
  }
  for (let i = 0; i < t.n; i += 25) {
    if (gapNear(i, 6)) continue
    const f = frameAt(t, i)
    addBlock(f.c.x, f.c.y + slab, f.c.z, t.yaw[i], 3.2, 3.2, CONCRETE)
  }
  // penhascos: um bloco largo embaixo de cada borda de vão (a decolagem e o pouso)
  for (const g of t.gaps) {
    for (const [s, back] of [[g.s0, -1], [g.s1, 1]] as const) {
      const i = Math.round(s / STEP) % t.n
      const f = frameAt(t, i + back * 5)
      addBlock(f.c.x, f.c.y + slab, f.c.z, t.yaw[i], W + 1.6, 20, CONCRETE_D)
    }
  }
  pillar.thinInstanceSetBuffer("matrix", new Float32Array(mats), 16, true)
  pillar.thinInstanceSetBuffer("color", new Float32Array(cols4), 4, true)

  // ── faixas de turbo ──────────────────────────────────────────────────────
  const padTex = padTexture(scene)
  const padMat = new StandardMaterial("corrida-pad", scene)
  padMat.diffuseColor = new Color3(0, 0, 0)
  padMat.specularColor = new Color3(0, 0, 0)
  padMat.emissiveTexture = padTex
  padMat.disableLighting = true
  padMat.backFaceCulling = false
  disposables.push(padTex, padMat)
  {
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    for (const p of t.pads) {
      const n = Math.ceil(p.len / STEP)
      for (let k = 0; k < n; k++) {
        const s0 = p.s + k * STEP
        const i0 = Math.floor(s0 / STEP)
        const fa = frameAt(t, i0)
        const fb = frameAt(t, i0 + 1)
        const base = pos.length / 3
        for (const [f, v] of [[fa, (k * STEP) / 4.5], [fb, ((k + 1) * STEP) / 4.5]] as const) {
          const l = at(f, p.u0, 0.05)
          const r = at(f, p.u1, 0.05)
          pos.push(l.x, l.y, l.z, r.x, r.y, r.z)
          uv.push(0, v, 1, v)
        }
        idx.push(base, base + 1, base + 3, base, base + 3, base + 2)
      }
    }
    if (idx.length) {
      const m = new Mesh("corrida-pads", scene)
      const vd = new VertexData()
      vd.positions = pos
      vd.indices = idx
      vd.uvs = uv
      const normals: number[] = []
      VertexData.ComputeNormals(pos, idx, normals)
      vd.normals = normals
      vd.applyToMesh(m)
      m.material = padMat
      m.isPickable = false
      m.freezeWorldMatrix()
      disposables.push(m)
    }
  }

  // ── cápsulas de turbo = o logo da Freelandoo (logos.ts) ────────────────
  const logos = buildLogos(
    scene,
    t.orbs.map((o) => ({ id: o.id, at: at(frameAt(t, Math.round(o.s / STEP)), o.u, 2.0) })),
    low,
  )
  disposables.push(logos)

  // ── outdoors (billboards.ts): a cada ~170 m, lados alternados, longe da
  // largada, dos vãos e das rampas ──────────────────────────────────────
  {
    const spots: BillboardSpot[] = []
    const every = Math.round(170 / STEP)
    let side = 1
    for (let i = startI + 40; i < startI + t.n - 30; i += every) {
      const k = i % t.n
      if (gapNear(k, 25)) continue
      let ramp = false
      for (let d = -15; d <= 15; d++) if (t.flag[(k + d + t.n) % t.n] === 2) ramp = true
      if (ramp) continue
      const f = frameAt(t, k)
      spots.push({ at: at(f, side * (wall1 + 5), 0), yaw: t.yaw[k] + side * 0.55, drop: 1.5 })
      side = -side
    }
    disposables.push(buildBillboards(scene, spots))
  }

  // ── arcos: pórtico de largada + anéis de neon ────────────────────────────
  const gateMat = vertexMat("corrida-gate", scene, false)
  const neonMat = new StandardMaterial("corrida-neon", scene)
  neonMat.diffuseColor = new Color3(0, 0, 0)
  neonMat.emissiveColor = new Color3(1, 0.7, 0.3)
  neonMat.disableLighting = true
  const neonPinkMat = new StandardMaterial("corrida-neon-pink", scene)
  neonPinkMat.diffuseColor = new Color3(0, 0, 0)
  neonPinkMat.emissiveColor = new Color3(...NEON_PINK)
  neonPinkMat.disableLighting = true
  disposables.push(neonPinkMat)
  const checker = checkerTexture(scene)
  const bannerMat = new StandardMaterial("corrida-banner", scene)
  bannerMat.diffuseColor = new Color3(0, 0, 0)
  bannerMat.emissiveTexture = checker
  bannerMat.disableLighting = true
  bannerMat.backFaceCulling = false
  disposables.push(gateMat, neonMat, checker, bannerMat)
  const brassMat = new StandardMaterial("corrida-brass", scene)
  brassMat.diffuseColor = new Color3(0.7, 0.52, 0.2)
  brassMat.specularColor = new Color3(0.5, 0.42, 0.25)
  brassMat.emissiveColor = new Color3(0.08, 0.05, 0.02)
  disposables.push(brassMat)
  t.gates.forEach((s, gi) => {
    const i = Math.round(s / STEP) % t.n
    const f = frameAt(t, i)
    const yaw = t.yaw[i]
    if (gi === 0) {
      for (const side of [-1, 1]) {
        const p = at(f, side * (wall1 + 0.8), 0)
        const post = CreateBox(`corrida-post-${side}`, { width: 1, depth: 1, height: 10 }, scene)
        post.position.set(p.x, p.y + 5 - 1.5, p.z)
        post.rotation.y = yaw
        post.material = brassMat
        post.isPickable = false
        disposables.push(post)
      }
      const beam = CreateBox("corrida-beam", { width: 2 * wall1 + 2.6, height: 1.8, depth: 0.6 }, scene)
      beam.position.set(f.c.x, f.c.y + 8.6, f.c.z)
      beam.rotation.y = yaw
      beam.material = bannerMat
      beam.isPickable = false
      disposables.push(beam)
      return
    }
    const ring = CreateTorus(`corrida-halo-${gi}`, { diameter: W + 7, thickness: 0.45, tessellation: 40 }, scene)
    ring.rotation.set(Math.PI / 2, yaw, 0)
    const p = at(f, 0, 2.2)
    ring.position.copyFrom(p)
    ring.material = gi % 2 ? neonMat : neonPinkMat
    ring.isPickable = false
    ring.freezeWorldMatrix()
    disposables.push(ring)
  })

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

  let clock = 0
  return {
    setOrb(id, on) {
      logos.setOn(id, on)
    },
    tick(dt) {
      clock += dt
      padTex.vOffset = (padTex.vOffset - dt * 2.6) % 1
      logos.tick(clock)
    },
    dispose() {
      for (const d of disposables) d.dispose()
    },
  }
}
