// features/meu-mundo/engine/world.ts
//
// Constrói o bairro "ring-20" a partir da definição que veio do servidor.
//
// Quem diz ONDE fica cada lote e para onde ele olha é o servidor; o que este
// arquivo sabe é o DESENHO do tipo de bairro: um anel de ruas com a praça no
// meio, quatro quadras de cinco casas por fora, a cerca viva em volta e a saída
// para o Centro pela rua do canto nordeste.
//
// Tudo que é estático entra em DUAS malhas: a do mundo (cor por vértice) e a
// das placas (textura com os números). É por isso que o bairro inteiro custa
// um punhado de chamadas de desenho, não centenas.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { GeoBuilder, frameOf, place, type RGB } from "./geometry"
import { rotY, type Box2 } from "./collision"
import type { House, Interactable, Lot, Neighborhood } from "../types"

// ── Medidas do layout ring-20 (espelham src/utils/meuMundoDemo.js) ──────────
const RING = 26
const ROAD_HALF = 3
const INNER_WALK = RING - ROAD_HALF - 2 // 21
const OUTER_WALK = RING + ROAD_HALF + 2 // 31
const HEDGE = 47
const GATE_X = 48
const EXIT_Z = RING

// ── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  grassOut: [0.47, 0.67, 0.37],
  grass: [0.56, 0.77, 0.43],
  lawn: [0.6, 0.81, 0.46],
  lotLawn: [0.53, 0.75, 0.41],
  road: [0.36, 0.37, 0.42],
  roadLine: [0.97, 0.95, 0.86],
  walk: [0.84, 0.82, 0.78],
  plaza: [0.91, 0.85, 0.72],
  plazaEdge: [0.78, 0.7, 0.58],
  path: [0.86, 0.83, 0.76],
  stone: [0.7, 0.68, 0.64],
  hedge: [0.31, 0.54, 0.3],
  hedgeLot: [0.38, 0.61, 0.34],
  trunk: [0.5, 0.34, 0.22],
  leafA: [0.36, 0.63, 0.32],
  leafB: [0.44, 0.7, 0.37],
  wood: [0.66, 0.46, 0.3],
  woodDark: [0.48, 0.32, 0.21],
  metal: [0.26, 0.27, 0.31],
  bulb: [1, 0.93, 0.62],
  glass: [0.63, 0.83, 0.95],
  frame: [0.97, 0.96, 0.92],
  board: [0.97, 0.94, 0.85],
  knob: [0.92, 0.75, 0.3],
  spawn: [0.98, 0.78, 0.2],
  barrierA: [0.86, 0.24, 0.22],
  barrierB: [0.97, 0.96, 0.92],
} satisfies Record<string, RGB>

const WALLS: RGB[] = [
  [0.97, 0.87, 0.7],
  [0.96, 0.77, 0.7],
  [0.76, 0.86, 0.93],
  [0.8, 0.9, 0.76],
  [0.98, 0.92, 0.63],
  [0.9, 0.81, 0.92],
]
const ROOFS: RGB[] = [
  [0.8, 0.37, 0.3],
  [0.37, 0.46, 0.63],
  [0.43, 0.58, 0.39],
  [0.56, 0.39, 0.31],
]
const DOORS: RGB[] = [
  [0.48, 0.3, 0.2],
  [0.26, 0.43, 0.6],
  [0.74, 0.26, 0.26],
]
const FLOWERS: RGB[] = [
  [0.96, 0.45, 0.55],
  [0.98, 0.84, 0.3],
  [0.95, 0.95, 0.98],
  [0.62, 0.5, 0.9],
]

// ── Atlas de texto das placas (01–20 + Centro da cidade) ─────────────────────
const ATLAS_W = 1024
const ATLAS_H = 512
const CELL_W = 204
const CELL_H = 100
const WIDE_Y = 400
const WIDE_H = 112

function numberCell(n: number): [number, number, number, number] {
  const i = n - 1
  const col = i % 5
  const row = Math.floor(i / 5)
  return uvRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H)
}

// Textura com invertY: o topo do canvas é o v=1.
function uvRect(x: number, y: number, w: number, h: number): [number, number, number, number] {
  return [x / ATLAS_W, 1 - (y + h) / ATLAS_H, (x + w) / ATLAS_W, 1 - y / ATLAS_H]
}

function drawAtlas(tex: DynamicTexture, exitLabel: string) {
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.fillStyle = "#F7F0D9"
  ctx.fillRect(0, 0, ATLAS_W, ATLAS_H)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#2B2620"
  ctx.font = "800 70px system-ui, -apple-system, Segoe UI, sans-serif"
  for (let n = 1; n <= 20; n++) {
    const i = n - 1
    const cx = (i % 5) * CELL_W + CELL_W / 2
    const cy = Math.floor(i / 5) * CELL_H + CELL_H / 2 + 4
    ctx.fillText(String(n).padStart(2, "0"), cx, cy)
  }
  ctx.fillStyle = "#2B2620"
  ctx.fillRect(0, WIDE_Y, ATLAS_W, WIDE_H)
  ctx.fillStyle = "#FFC600"
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, sans-serif"
  ctx.fillText(exitLabel.toUpperCase(), ATLAS_W / 2, WIDE_Y + WIDE_H / 2 + 3)
  tex.update(true)
}

// ── Peças reaproveitadas ─────────────────────────────────────────────────────
// `boxes` param o personagem; `viewOnly` só a câmera (a copa das árvores:
// o personagem passa rente a ela, a câmera não pode entrar nela).
type Ctx = { geo: GeoBuilder; signs: GeoBuilder; boxes: Box2[]; viewOnly: Box2[] }

/** Placa de chão: caixa fina do y=0 até `top`. */
function slab(g: GeoBuilder, cx: number, cz: number, w: number, d: number, top: number, color: RGB) {
  g.box(w, top, d, place(cx, top / 2, cz), color)
}

function tree(ctx: Ctx, x: number, z: number, s = 1, collide = true) {
  const { geo } = ctx
  geo.cylinder(0.34 * s, 1.6 * s, place(x, 0.8 * s, z), C.trunk, 6)
  geo.sphere(2.2 * s, [1, 0.85, 1], place(x, 2.15 * s, z), C.leafA)
  geo.sphere(1.6 * s, [1, 0.9, 1], place(x + 0.45 * s, 2.8 * s, z - 0.2 * s), C.leafB)
  geo.sphere(1.3 * s, [1, 0.9, 1], place(x - 0.5 * s, 2.65 * s, z + 0.35 * s), C.leafB)
  if (collide) ctx.boxes.push({ x, z, hx: 0.35 * s, hz: 0.35 * s, rot: 0, h: 3.4 * s })
  ctx.viewOnly.push({ x, z, hx: 1.05 * s, hz: 1.05 * s, rot: 0, h: 3.4 * s })
}

function bench(ctx: Ctx, x: number, z: number, rot: number) {
  const { geo } = ctx
  const f = frameOf(x, z, rot)
  geo.box(2, 0.12, 0.55, place(0, 0.45, 0, 0, f), C.wood)
  geo.box(2, 0.45, 0.1, place(0, 0.78, 0.27, 0, f), C.wood)
  for (const sx of [-0.85, 0.85]) geo.box(0.1, 0.45, 0.5, place(sx, 0.22, 0, 0, f), C.metal)
  ctx.boxes.push({ x, z, hx: 1.05, hz: 0.38, rot, h: 1 })
}

function lamp(ctx: Ctx, x: number, z: number) {
  const { geo } = ctx
  geo.cylinder(0.16, 3.2, place(x, 1.6, z), C.metal, 6)
  geo.box(0.42, 0.42, 0.42, place(x, 3.35, z), C.bulb)
  geo.box(0.56, 0.08, 0.56, place(x, 3.6, z), C.metal)
  ctx.boxes.push({ x, z, hx: 0.2, hz: 0.2, rot: 0, h: 3.6 })
}

function flowerPatch(ctx: Ctx, x: number, z: number, seed: number) {
  for (let k = 0; k < 6; k++) {
    const a = seed * 1.7 + k * 1.05
    const r = 0.25 + (k % 3) * 0.22
    const n = FLOWERS.length
    ctx.geo.box(0.16, 0.22, 0.16, place(x + Math.cos(a) * r, 0.13, z + Math.sin(a) * r), FLOWERS[(((seed + k) % n) + n) % n])
  }
}

/** Uma caixa de obstáculo posicionada no quadro de um lote. */
function lotBox(lot: Lot, lx: number, lz: number, hx: number, hz: number, h: number): Box2 {
  const o = rotY(lx, lz, lot.rotationY)
  return { x: lot.position.x + o.x, z: lot.position.z + o.z, hx, hz, rot: lot.rotationY, h }
}

function house(ctx: Ctx, lot: Lot, h: House): Interactable {
  const { geo, signs, boxes } = ctx
  const f = frameOf(lot.position.x, lot.position.z, lot.rotationY)
  const v = h.variant
  const wall = WALLS[v % WALLS.length]
  const roof = ROOFS[Math.floor(v / 3) % ROOFS.length]
  const door = DOORS[v % DOORS.length]

  // Gramado do lote e caminho da porta até a calçada.
  geo.box(lot.width - 0.4, 0.025, lot.depth - 0.4, place(0, 0.0125, 0, 0, f), C.lotLawn)
  geo.box(1.3, 0.05, 3.95, place(0, 0.025, -4.03, 0, f), C.path)

  // Casa: base, corpo e telhado. A frente (porta) fica no -Z local.
  geo.box(5.4, 0.25, 4.8, place(0, 0.125, 0.8, 0, f), C.stone)
  geo.box(5, 2.6, 4.4, place(0, 1.55, 0.8, 0, f), wall)
  geo.prism(5.8, 5.2, 1.7, place(0, 2.85, 0.8, 0, f), roof)
  if (v % 2 === 0) geo.box(0.6, 1.4, 0.6, place(1.5, 3.4, 1.7, 0, f), [0.66, 0.41, 0.36])

  // Porta, degrau, maçaneta.
  geo.box(1, 1.8, 0.1, place(0, 1.15, -1.45, 0, f), door)
  geo.box(1.6, 0.12, 0.6, place(0, 0.06, -1.75, 0, f), C.stone)
  geo.box(0.1, 0.1, 0.06, place(0.32, 1.1, -1.52, 0, f), C.knob)

  // Janelas da frente e dos lados (moldura atrás do vidro).
  for (const sx of [-1.55, 1.55]) {
    geo.box(1.15, 1.05, 0.06, place(sx, 1.75, -1.42, 0, f), C.frame)
    geo.box(0.92, 0.82, 0.08, place(sx, 1.75, -1.45, 0, f), C.glass)
  }
  for (const sx of [-2.53, 2.53]) {
    geo.box(0.06, 1.05, 1.15, place(sx, 1.75, 0.8, 0, f), C.frame)
    geo.box(0.08, 0.82, 0.92, place(sx + Math.sign(sx) * 0.02, 1.75, 0.8, 0, f), C.glass)
  }

  // Jardim: arbustos ao lado da porta, flores, e às vezes uma árvore no fundo.
  geo.sphere(0.95, [1, 0.75, 0.9], place(-2.2, 0.35, -1.95, 0, f), C.hedgeLot)
  geo.sphere(0.95, [1, 0.75, 0.9], place(2.2, 0.35, -1.95, 0, f), C.hedgeLot)
  const fp = rotY(-2.6, -4.6, lot.rotationY)
  flowerPatch(ctx, lot.position.x + fp.x, lot.position.z + fp.z, v)
  if (v % 3 === 1) {
    const tp = rotY(2.8, 4.3, lot.rotationY)
    tree(ctx, lot.position.x + tp.x, lot.position.z + tp.z, 0.85)
  }

  // Cercas vivas baixas: laterais e fundo. A frente fica aberta para a rua.
  geo.box(0.3, 0.7, 8.6, place(-4.35, 0.35, 1.4, 0, f), C.hedgeLot)
  geo.box(0.3, 0.7, 8.6, place(4.35, 0.35, 1.4, 0, f), C.hedgeLot)
  geo.box(9, 0.7, 0.3, place(0, 0.35, 5.85, 0, f), C.hedgeLot)

  // Placa com o número do lote, de frente para a rua.
  geo.box(0.14, 1.2, 0.14, place(2.5, 0.6, -5.35, 0, f), C.woodDark)
  geo.box(1.05, 0.62, 0.08, place(2.5, 1.38, -5.35, 0, f), C.board)
  signs.quad(0.95, 0.52, numberCell(lot.number), place(2.5, 1.38, -5.4, 0, f))

  boxes.push(lotBox(lot, 0, 0.8, 2.7, 2.4, 4.6))
  boxes.push(lotBox(lot, -4.35, 1.4, 0.15, 4.3, 0.7))
  boxes.push(lotBox(lot, 4.35, 1.4, 0.15, 4.3, 0.7))
  boxes.push(lotBox(lot, 0, 5.85, 4.5, 0.15, 0.7))
  boxes.push(lotBox(lot, 2.5, -5.35, 0.12, 0.12, 2))

  const ip = rotY(0.8, -3.4, lot.rotationY)
  return {
    kind: "house",
    id: h.id,
    x: lot.position.x + ip.x,
    z: lot.position.z + ip.z,
    // Alcança a calçada em frente ao lote; os pontos vizinhos ficam a 9 m.
    radius: 3.6,
    lot,
    house: h,
  }
}

function streets(ctx: Ctx) {
  const { geo } = ctx
  const len = 2 * (RING + ROAD_HALF)
  // Anel: norte/sul cobrem os cantos, leste/oeste completam.
  slab(geo, 0, RING, len, 6, 0.03, C.road)
  slab(geo, 0, -RING, len, 6, 0.03, C.road)
  slab(geo, RING, 0, 6, len - 12, 0.03, C.road)
  slab(geo, -RING, 0, 6, len - 12, 0.03, C.road)
  // Rua de saída para o Centro, que segue além do portão.
  slab(geo, (RING + ROAD_HALF + 70) / 2, EXIT_Z, 70 - (RING + ROAD_HALF), 6, 0.03, C.road)

  // Faixas tracejadas no eixo.
  for (let t = -20; t <= 20; t += 3.2) {
    geo.box(1.4, 0.012, 0.16, place(t, 0.036, RING), C.roadLine)
    geo.box(1.4, 0.012, 0.16, place(t, 0.036, -RING), C.roadLine)
    geo.box(0.16, 0.012, 1.4, place(RING, 0.036, t), C.roadLine)
    geo.box(0.16, 0.012, 1.4, place(-RING, 0.036, t), C.roadLine)
  }
  for (let t = 33; t <= 68; t += 3.2) geo.box(1.4, 0.012, 0.16, place(t, 0.036, EXIT_Z), C.roadLine)

  // Calçadas de dentro (21–23) e de fora (29–31).
  const inner = INNER_WALK + 1
  slab(geo, 0, inner, 2 * (INNER_WALK + 2), 2, 0.08, C.walk)
  slab(geo, 0, -inner, 2 * (INNER_WALK + 2), 2, 0.08, C.walk)
  slab(geo, inner, 0, 2, 2 * INNER_WALK, 0.08, C.walk)
  slab(geo, -inner, 0, 2, 2 * INNER_WALK, 0.08, C.walk)
  const outer = OUTER_WALK - 1
  // Norte: segue pela rua de saída até o portão.
  slab(geo, (GATE_X - OUTER_WALK) / 2, outer, GATE_X + OUTER_WALK, 2, 0.08, C.walk)
  slab(geo, 0, -outer, 2 * OUTER_WALK, 2, 0.08, C.walk)
  slab(geo, -outer, 0, 2, 2 * (OUTER_WALK - 2), 0.08, C.walk)
  // Leste: interrompida pela rua de saída, que vira calçada ao sul dela.
  slab(geo, outer, (-(OUTER_WALK - 2) + (RING - ROAD_HALF)) / 2, 2, RING - ROAD_HALF + (OUTER_WALK - 2), 0.08, C.walk)
  slab(geo, (RING + ROAD_HALF + GATE_X) / 2, RING - ROAD_HALF - 1, GATE_X - (RING + ROAD_HALF), 2, 0.08, C.walk)
}

function plaza(ctx: Ctx, spawn: { x: number; z: number }) {
  const { geo } = ctx
  slab(geo, 0, 0, 2 * INNER_WALK, 2 * INNER_WALK, 0.015, C.lawn)
  slab(geo, 0, 0, 19, 19, 0.05, C.plazaEdge)
  slab(geo, 0, 0, 17.6, 17.6, 0.06, C.plaza)
  // Caminhos da praça até a calçada nas quatro direções.
  const mid = (9.5 + INNER_WALK) / 2
  const span = INNER_WALK - 9.5
  slab(geo, 0, mid, 3, span, 0.055, C.path)
  slab(geo, 0, -mid, 3, span, 0.055, C.path)
  slab(geo, mid, 0, span, 3, 0.055, C.path)
  slab(geo, -mid, 0, span, 3, 0.055, C.path)

  // Canteiro central com árvore.
  geo.cylinder(4.2, 0.55, place(0, 0.275, 0), C.stone, 12)
  geo.cylinder(3.7, 0.08, place(0, 0.57, 0), C.lotLawn, 12)
  tree(ctx, 0, 0, 1.25, false)
  ctx.boxes.push({ x: 0, z: 0, hx: 2.1, hz: 2.1, rot: Math.PI / 4, h: 1.2 })
  ctx.boxes.push({ x: 0, z: 0, hx: 2.1, hz: 2.1, rot: 0, h: 1.2 })
  for (const [fx, fz] of [[1.2, 0.6], [-1, -0.9], [-0.6, 1.2]]) flowerPatch(ctx, fx, fz, 3)

  // Bancos virados para o canteiro, nas diagonais (os eixos são passagem).
  for (const [x, z] of [[4.6, 4.6], [-4.6, 4.6], [4.6, -4.6], [-4.6, -4.6]]) {
    bench(ctx, x, z, Math.atan2(x, z))
  }
  for (const sx of [-8.2, 8.2]) for (const sz of [-8.2, 8.2]) lamp(ctx, sx, sz)
  for (const sx of [-22, 22]) for (const sz of [-22, 22]) lamp(ctx, sx, sz)

  // Árvores e flores no gramado de dentro, longe dos caminhos.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      tree(ctx, 14 * sx, 14 * sz, 1)
      tree(ctx, 16.5 * sx, 5 * sz, 0.9)
      tree(ctx, 5 * sx, 16.5 * sz, 0.9)
      flowerPatch(ctx, 11 * sx, 11 * sz, 1 + sx + sz)
    }
  }

  // Ponto de chegada: disco amarelo no caminho sul.
  geo.cylinder(2.6, 0.06, place(spawn.x, 0.06, spawn.z), C.spawn, 16)
  geo.cylinder(1.6, 0.07, place(spawn.x, 0.065, spawn.z), C.plaza, 16)
}

function boundary(ctx: Ctx) {
  const { geo, boxes } = ctx
  const hedge = (x: number, z: number, w: number, d: number) => {
    geo.box(w, 1.5, d, place(x, 0.75, z), C.hedge)
    boxes.push({ x, z, hx: w / 2, hz: d / 2, rot: 0, h: 1.5 })
  }
  const L = 2 * HEDGE + 1
  hedge(0, HEDGE, L, 1)
  hedge(0, -HEDGE, L, 1)
  hedge(-HEDGE, 0, 1, L)
  // Leste: aberta só onde passa a rua de saída (z 21–31), e lá fica o portão.
  const gapLo = RING - ROAD_HALF - 2
  const gapHi = RING + ROAD_HALF + 2
  hedge(HEDGE, (-HEDGE - 0.5 + gapLo) / 2, 1, gapLo + HEDGE + 0.5)
  hedge(HEDGE, (gapHi + HEDGE + 0.5) / 2, 1, HEDGE + 0.5 - gapHi)

  // Portão do Centro da cidade: arco com o letreiro e barreira fechada.
  for (const z of [gapLo + 0.5, gapHi - 0.5]) {
    geo.box(0.9, 4.4, 0.9, place(GATE_X, 2.2, z), C.woodDark)
    boxes.push({ x: GATE_X, z, hx: 0.45, hz: 0.45, rot: 0, h: 4.4 })
  }
  geo.box(0.6, 0.6, gapHi - gapLo + 0.6, place(GATE_X, 4.55, EXIT_Z), C.woodDark)
  geo.box(0.16, 1.05, 7.2, place(GATE_X - 0.25, 3.55, EXIT_Z), C.board)
  ctx.signs.quad(7, 0.9, uvRect(0, WIDE_Y, ATLAS_W, WIDE_H), place(GATE_X - 0.35, 3.55, EXIT_Z, Math.PI / 2))
  const span = gapHi - gapLo - 1
  const n = 7
  for (let k = 0; k < n; k++) {
    const z = gapLo + 0.5 + span * ((k + 0.5) / n)
    geo.box(0.25, 0.5, span / n, place(GATE_X + 1, 0.85, z), k % 2 ? C.barrierB : C.barrierA)
  }
  for (const z of [gapLo + 1, gapHi - 1]) geo.box(0.2, 0.9, 0.2, place(GATE_X + 1, 0.45, z), C.metal)
  boxes.push({ x: GATE_X + 1, z: EXIT_Z, hx: 0.6, hz: span / 2 + 0.5, rot: 0, h: 1.2 })
}

function outskirts(ctx: Ctx) {
  // Cantos entre as quadras e o lado de fora da cerca: só árvores, para dar
  // profundidade sem abrir caminho falso.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      if (sx === 1 && sz === 1) continue
      tree(ctx, 36 * sx, 36 * sz, 1.1)
      tree(ctx, 42 * sx, 39 * sz, 0.95)
      tree(ctx, 38.5 * sx, 43 * sz, 0.9)
    }
  }
  tree(ctx, 36, 38, 1.1)
  tree(ctx, 42, 42, 0.95)
  const out: [number, number, number][] = [
    [-55, 30, 1.3], [-58, -12, 1.4], [-52, -44, 1.2], [-20, -56, 1.4], [18, -55, 1.3],
    [50, -52, 1.2], [57, -15, 1.4], [57, 10, 1.2], [56, 40, 1.3], [30, 57, 1.4],
    [-10, 58, 1.3], [-45, 54, 1.2], [62, 33, 1.1], [64, 19, 1.2],
  ]
  for (const [x, z, s] of out) tree(ctx, x, z, s, false)
}

export interface BuiltWorld {
  meshes: Mesh[]
  boxes: Box2[]
  /** Obstáculos da câmera: os do personagem mais as copas. */
  viewBoxes: Box2[]
  interactables: Interactable[]
  dispose: () => void
}

export function buildWorld(scene: Scene, nb: Neighborhood, exitLabel: string): BuiltWorld {
  const worldMat = new StandardMaterial("mm-world", scene)
  worldMat.diffuseColor = new Color3(1, 1, 1)
  worldMat.specularColor = new Color3(0, 0, 0)
  // Peças simples, algumas faces internas: sem descarte de face traseira o
  // telhado não depende da ordem dos vértices.
  worldMat.backFaceCulling = false

  const atlas = new DynamicTexture("mm-atlas", { width: ATLAS_W, height: ATLAS_H }, scene, true)
  drawAtlas(atlas, exitLabel)
  const signMat = new StandardMaterial("mm-signs", scene)
  signMat.diffuseTexture = atlas
  signMat.specularColor = new Color3(0, 0, 0)
  signMat.emissiveColor = new Color3(0.35, 0.35, 0.35)
  signMat.backFaceCulling = false

  const ctx: Ctx = { geo: new GeoBuilder(), signs: new GeoBuilder(), boxes: [], viewOnly: [] }

  // Chão: de fora (até o horizonte com a névoa) e de dentro da cerca.
  slab(ctx.geo, 0, 0, 220, 220, 0.002, C.grassOut)
  slab(ctx.geo, 0, 0, 2 * HEDGE, 2 * HEDGE, 0.008, C.grass)
  streets(ctx)
  plaza(ctx, nb.spawn)
  boundary(ctx)
  outskirts(ctx)

  const housesById = new Map(nb.houses.map((h) => [h.id, h]))
  const interactables: Interactable[] = []
  for (const lot of nb.lots) {
    const h = housesById.get(lot.houseId)
    if (h) interactables.push(house(ctx, lot, h))
  }
  interactables.push({
    kind: "exit",
    id: nb.exit.id,
    x: nb.exit.x,
    z: nb.exit.z,
    radius: 3.6,
    label: nb.exit.label,
  })

  const world = ctx.geo.build("mm-world", scene, worldMat)
  const signs = ctx.signs.build("mm-signs", scene, signMat)
  worldMat.freeze()
  signMat.freeze()

  return {
    meshes: [world, signs],
    boxes: ctx.boxes,
    viewBoxes: [...ctx.boxes, ...ctx.viewOnly],
    interactables,
    dispose: () => {
      world.dispose()
      signs.dispose()
      worldMat.dispose()
      signMat.dispose()
      atlas.dispose()
    },
  }
}
