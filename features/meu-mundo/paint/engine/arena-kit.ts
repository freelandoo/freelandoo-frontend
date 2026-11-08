// features/meu-mundo/paint/engine/arena-kit.ts — PAINT (mm3d-77): o KIT MODULAR dos mapas novos.
//
// Peças de cenário reutilizáveis (LEVEL_ART_BIBLE.md), todas por geometria de
// código e com cor por vértice — entram nos MESMOS buffers da cena
// (arena-view.ts: `deco` aceso pela luz, `glow` sem luz), então não somam
// chamadas de desenho:
//  - moldura de borda (perfil lateral com 3 variantes A/B/C pela semente do mapa);
//  - corrimão (corda e madeira, pedra, ferro) só nas bordas "mortas" (sem ilha
//    à frente: nunca onde se faz ponte);
//  - lampião, pedestal de cristal, arco, círculo rúnico, estandarte, braseiro.
//
// Regra do kit: NADA aqui colide (é desenho) e nada fica em cima de gatinho,
// cápsula, nascimento ou portal (`Clearance`). O que é alto o bastante para
// tapar a câmera devolve um sólido só da câmera (`camBlock`).

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateCylinderVertexData } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateSphereVertexData } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { GeoBuilder, place, type RGB } from "../../engine/geometry"
import type { Island, PaintMap, Solid } from "../sim/map"

/** Construtor com cone, esfera esticada e malha livre (o chão das ilhas leva UV de mundo). */
export class ArenaGeo extends GeoBuilder {
  cone(dTop: number, dBottom: number, h: number, m: Matrix, color: RGB, sides = 8) {
    const vd = CreateCylinderVertexData({ height: h, diameterTop: dTop, diameterBottom: dBottom, tessellation: sides })
    vd.transform(m)
    this.append(vd, color)
  }
  /** Esfera achatada/esticada sem recalcular normal (nuvem, copa, cogumelo). */
  blob(d: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, color: RGB, seg = 6) {
    const vd = CreateSphereVertexData({ diameter: d, segments: seg })
    vd.transform(Matrix.Scaling(sx, sy, sz).multiply(Matrix.Translation(x, y, z)))
    this.append(vd, color)
  }
  raw(vd: VertexData, color: RGB) {
    this.append(vd, color)
  }
  /** Anel chato no chão (círculo rúnico): raio de dentro/fora, `n` lados. */
  annulus(x: number, y: number, z: number, r0: number, r1: number, color: RGB, n = 32) {
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      pos.push(x + Math.sin(a) * r0, y, z + Math.cos(a) * r0, x + Math.sin(a) * r1, y, z + Math.cos(a) * r1)
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2)
    }
    const vd = new VertexData()
    vd.positions = pos
    vd.indices = idx
    vd.normals = pos.map((_, k) => (k % 3 === 1 ? 1 : 0))
    this.append(vd, color)
  }
}

/** Pseudo-aleatório fixo (mesma cara a cada partida). */
export function krnd(n: number) {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 2246822519) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

/** Lugares que o desenho não pode cobrir: gatinhos, cápsulas, nascimentos, portais e enfeites que colidem. */
export class Clearance {
  private readonly pts: { x: number; y: number; z: number; r: number }[] = []
  constructor(map: PaintMap) {
    for (const c of map.cats) this.pts.push({ x: c.x, y: c.y, z: c.z, r: 1.3 })
    for (const c of map.capsules) this.pts.push({ x: c.x, y: c.y, z: c.z, r: 1.3 })
    for (const b of map.bases) for (const s of b.spawns) this.pts.push({ x: s.x, y: s.y, z: s.z, r: 1.2 })
    for (const p of map.portals) this.pts.push({ x: p.x, y: p.y, z: p.z, r: 2.6 })
    for (const p of map.props) this.pts.push({ x: p.x, y: p.y, z: p.z, r: Math.hypot(p.w ?? p.s, p.s) + 0.6 })
  }
  /** O ponto (com raio `r`) está livre? */
  free(x: number, y: number, z: number, r: number) {
    for (const p of this.pts) {
      if (Math.abs(p.y - y) > 2.5) continue
      if (Math.hypot(p.x - x, p.z - z) < p.r + r) return false
    }
    return true
  }
}

/** Os lados do contorno (cantos do polígono; o círculo do chefão vira 24 lados). */
export function edgesOf(isl: Island): { ax: number; az: number; bx: number; bz: number; nx: number; nz: number; len: number }[] {
  const pts: [number, number][] = []
  if (isl.poly) for (let i = 0; i < isl.poly.length; i += 2) pts.push([isl.poly[i], isl.poly[i + 1]])
  else for (let i = 0; i < 24; i++) pts.push([isl.x + Math.sin((i / 24) * Math.PI * 2) * isl.r, isl.z + Math.cos((i / 24) * Math.PI * 2) * isl.r])
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i]
    const [bx, bz] = pts[(i + 1) % pts.length]
    const len = Math.hypot(bx - ax, bz - az)
    let nx = (bz - az) / (len || 1)
    let nz = -(bx - ax) / (len || 1)
    if (nx * ((ax + bx) / 2 - isl.x) + nz * ((az + bz) / 2 - isl.z) < 0) {
      nx = -nx
      nz = -nz
    }
    out.push({ ax, az, bx, bz, nx, nz, len })
  }
  return out
}

/**
 * Borda "morta": nenhuma outra ilha à frente (cone de ±55°, até 34 m). É só
 * nela que entra corrimão — onde se faz ponte a borda fica livre.
 */
export function deadEdge(map: PaintMap, isl: Island, mx: number, mz: number, nx: number, nz: number) {
  for (const o of map.islands) {
    if (o.id === isl.id || o.kind === "boss") continue
    const dx = o.x - mx
    const dz = o.z - mz
    const d = Math.hypot(dx, dz)
    if (d > 34 + o.r) continue
    if ((dx * nx + dz * nz) / (d || 1) > 0.57) return false
  }
  return true
}

export interface FrameStyle {
  /** Faixa do perfil, peças de apoio e filete aceso (opcional). */
  band: RGB
  corbel: RGB
  line?: RGB
}

/**
 * Moldura de borda: faixa logo FORA do contorno (o pé nunca pisa nela), do
 * topo até `h` abaixo. Variante pela semente: A faixa lisa, B faixa com
 * mísulas a cada ~1,6 m, C faixa dupla em degrau.
 */
export function edgeFrame(deco: ArenaGeo, glow: ArenaGeo, isl: Island, st: FrameStyle, seed: number) {
  const v = Math.floor(krnd(seed * 31 + isl.id * 7) * 3)
  const h = 0.55
  for (const e of edgesOf(isl)) {
    if (e.len < 0.3) continue
    const ang = Math.atan2(e.bx - e.ax, e.bz - e.az) + Math.PI / 2
    const mx = (e.ax + e.bx) / 2 + e.nx * 0.09
    const mz = (e.az + e.bz) / 2 + e.nz * 0.09
    deco.box(e.len + 0.16, h, 0.2, place(mx, isl.y - h / 2 + 0.02, mz, ang), st.band)
    if (v === 2) deco.box(e.len + 0.1, 0.26, 0.2, place(mx + e.nx * 0.14, isl.y - h - 0.12, mz + e.nz * 0.14, ang), mul(st.band, 0.8))
    if (v === 1) {
      const n = Math.max(1, Math.floor(e.len / 1.6))
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n
        const x = e.ax + (e.bx - e.ax) * t + e.nx * 0.2
        const z = e.az + (e.bz - e.az) * t + e.nz * 0.2
        deco.box(0.34, 0.5, 0.32, place(x, isl.y - h - 0.2, z, ang), st.corbel)
      }
    }
    if (st.line && e.len > 1.2) glow.box(e.len * 0.8, 0.06, 0.04, place(mx + e.nx * 0.11, isl.y - 0.16, mz + e.nz * 0.11, ang), st.line)
  }
}

export type RailStyle = "rope" | "stone" | "iron"

/** Corrimão ao longo de um lado (só borda morta; deixa 0,8 m livre nas pontas). */
export function railing(deco: ArenaGeo, glow: ArenaGeo, y: number, ax: number, az: number, bx: number, bz: number, nx: number, nz: number, style: RailStyle, wood: RGB, metal: RGB, lampEvery = 0, lampC?: RGB) {
  const len = Math.hypot(bx - ax, bz - az)
  if (len < 2.4) return
  const inset = 0.32
  const ux = (bx - ax) / len
  const uz = (bz - az) / len
  const x0 = ax + ux * 0.8 - nx * inset
  const z0 = az + uz * 0.8 - nz * inset
  const L = len - 1.6
  const n = Math.max(1, Math.round(L / 1.8))
  const ang = Math.atan2(ux, uz)
  const postH = style === "stone" ? 0.95 : 1.05
  for (let k = 0; k <= n; k++) {
    const x = x0 + ux * (L * k) / n
    const z = z0 + uz * (L * k) / n
    if (style === "stone") deco.box(0.32, postH, 0.32, place(x, y + postH / 2, z, ang), wood)
    else if (style === "iron") deco.cylinder(0.1, postH, place(x, y + postH / 2, z), metal, 6)
    else deco.box(0.14, postH, 0.14, place(x, y + postH / 2, z, ang), wood)
    if (lampEvery && lampC && k % lampEvery === 0) {
      deco.box(0.26, 0.08, 0.26, place(x, y + postH + 0.04, z), metal)
      glow.box(0.18, 0.24, 0.18, place(x, y + postH + 0.2, z), lampC)
      deco.box(0.26, 0.06, 0.26, place(x, y + postH + 0.35, z), metal)
    }
  }
  const mx = x0 + (ux * L) / 2
  const mz = z0 + (uz * L) / 2
  if (style === "rope") {
    // corda que cede entre os postes
    for (let k = 0; k < n; k++) {
      const sx = x0 + ux * (L * (k + 0.5)) / n
      const sz = z0 + uz * (L * (k + 0.5)) / n
      deco.box(0.05, 0.05, L / n + 0.05, place(sx, y + postH - 0.18, sz, ang), metal)
      deco.box(0.04, 0.04, L / n + 0.05, place(sx, y + postH - 0.55, sz, ang), metal)
    }
  } else if (style === "stone") {
    deco.box(0.34, 0.16, L + 0.3, place(mx, y + postH + 0.08, mz, ang), mul(wood, 1.08))
    for (let k = 0; k < n * 3; k++) {
      const x = x0 + ux * (L * (k + 0.5)) / (n * 3)
      const z = z0 + uz * (L * (k + 0.5)) / (n * 3)
      deco.cylinder(0.13, postH - 0.2, place(x, y + (postH - 0.2) / 2 + 0.05, z), mul(wood, 0.95), 6)
    }
  } else {
    deco.box(0.07, 0.07, L, place(mx, y + postH, mz, ang), metal)
    deco.box(0.05, 0.05, L, place(mx, y + postH * 0.55, mz, ang), metal)
  }
}

/** Lampião de poste (corpo aceso). Devolve a altura total. */
export function lamp(deco: ArenaGeo, glow: ArenaGeo, x: number, y: number, z: number, wood: RGB, metal: RGB, light: RGB, h = 2.2) {
  deco.box(0.16, h, 0.16, place(x, y + h / 2, z), wood)
  deco.box(0.4, 0.12, 0.4, place(x, y + 0.06, z), mul(wood, 0.8))
  deco.box(0.42, 0.08, 0.42, place(x, y + h, z), metal)
  glow.box(0.3, 0.38, 0.3, place(x, y + h + 0.26, z), light)
  for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) deco.box(0.04, 0.42, 0.04, place(x + dx, y + h + 0.26, z + dz), metal)
  deco.cone(0.05, 0.5, 0.22, place(x, y + h + 0.56, z), metal, 4)
  return h + 0.7
}

/** Pedestal com cristal aceso por cima. */
export function crystalPedestal(deco: ArenaGeo, glow: ArenaGeo, x: number, y: number, z: number, stone: RGB, trim: RGB, crystal: RGB, s = 1) {
  deco.box(0.9 * s, 0.25 * s, 0.9 * s, place(x, y + 0.125 * s, z), stone)
  deco.box(0.62 * s, 0.6 * s, 0.62 * s, place(x, y + 0.55 * s, z), mul(stone, 1.06))
  deco.box(0.84 * s, 0.14 * s, 0.84 * s, place(x, y + 0.9 * s, z), trim)
  glow.cone(0, 0.5 * s, 1.1 * s, place(x, y + 1.52 * s, z, 0.4), crystal, 5)
  glow.cone(0.5 * s, 0, 0.36 * s, place(x, y + 0.79 * s + 0.36 * s, z, 0.4), crystal, 5)
}

/** Arco de pedra (dois pilares + verga). `ang` = para onde a passagem olha. */
export function arch(deco: ArenaGeo, glow: ArenaGeo, x: number, y: number, z: number, ang: number, w: number, h: number, stone: RGB, trim: RGB, gem?: RGB) {
  const cx = Math.cos(ang)
  const cz = -Math.sin(ang)
  for (const s of [-1, 1]) {
    const px = x + cx * s * w / 2
    const pz = z + cz * s * w / 2
    deco.box(0.7, 0.3, 0.7, place(px, y + 0.15, pz, ang), mul(stone, 0.9))
    deco.box(0.5, h, 0.5, place(px, y + h / 2, pz, ang), stone)
    deco.box(0.66, 0.2, 0.66, place(px, y + h, pz, ang), trim)
  }
  deco.box(w + 0.9, 0.5, 0.6, place(x, y + h + 0.35, z, ang), stone)
  deco.box(w + 1.1, 0.12, 0.66, place(x, y + h + 0.66, z, ang), trim)
  if (gem) glow.cone(0, 0.36, 0.7, Matrix.RotationX(Math.PI / 2).multiply(Matrix.RotationY(ang)).multiply(Matrix.Translation(x - cz * 0.31, y + h + 0.35, z + cx * 0.31)), gem, 4)
}

/** Círculo rúnico no chão (anéis + raios acesos), um tico acima do topo. */
export function runeCircle(glow: ArenaGeo, x: number, y: number, z: number, r: number, c: RGB, c2: RGB) {
  glow.annulus(x, y + 0.012, z, r - 0.16, r, c, 40)
  glow.annulus(x, y + 0.012, z, r * 0.62 - 0.08, r * 0.62, c2, 32)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    const m = (r * 0.62 + r) / 2
    glow.box(0.12, 0.012, r * 0.3, place(x + Math.sin(a) * m, y + 0.014, z + Math.cos(a) * m, a), c)
  }
}

/** Estandarte num mastro (pano + franja); `ang` = para onde o pano olha. */
export function banner(deco: ArenaGeo, glow: ArenaGeo, x: number, y: number, z: number, ang: number, cloth: RGB, trim: RGB, emblem: RGB, h = 3.4) {
  deco.cylinder(0.1, h, place(x, y + h / 2, z), trim, 6)
  deco.box(1.1, 0.07, 0.07, place(x, y + h - 0.1, z, ang), trim)
  deco.box(0.92, 1.7, 0.04, place(x, y + h - 1.0, z, ang), cloth)
  deco.box(0.92, 0.12, 0.05, place(x, y + h - 1.9, z, ang), trim)
  glow.box(0.32, 0.32, 0.03, place(x + Math.sin(ang) * 0.03, y + h - 0.95, z + Math.cos(ang) * 0.03, ang + Math.PI / 4), emblem)
}

/** Braseiro (taça + fogo aceso). */
export function brazier(deco: ArenaGeo, glow: ArenaGeo, x: number, y: number, z: number, metal: RGB, fire: RGB) {
  deco.cone(0.25, 0.42, 0.7, place(x, y + 0.35, z), metal, 8)
  deco.cone(0.9, 0.42, 0.32, place(x, y + 0.86, z), metal, 10)
  glow.cone(0, 0.6, 0.7, place(x, y + 1.3, z), fire, 7)
}

/** Sólido só da câmera (cilindro) para peça alta de enfeite. */
export function camCyl(x: number, z: number, y0: number, y1: number, r: number): Solid {
  return { k: 0, x, z, y0, y1, r }
}
