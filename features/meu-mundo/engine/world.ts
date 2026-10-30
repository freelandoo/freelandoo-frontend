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
import { HouseModels } from "./houses"
import { CenterModels } from "./center-models"
import { loadStatues, statueBase } from "./statues"
import type {
  House,
  HouseCatalog,
  HouseLevelDef,
  HouseVisual,
  Interactable,
  Lot,
  LotPlan,
  Neighborhood,
  NeighborhoodDims,
} from "../types"

// ── Medidas ──────────────────────────────────────────────────────────────────
// Vêm do SERVIDOR (payload: `dims` e `lotPlan`, de src/utils/meuMundoLayout.js):
// o cliente não guarda uma segunda cópia. A reserva abaixo é o desenho do
// mm3d-02, usada só se o payload vier de um backend anterior ao mm3d-03.
const LEGACY_DIMS: NeighborhoodDims = (() => {
  const out: NeighborhoodDims = {
    ring: 26,
    roadHalf: 3,
    sidewalk: 2,
    lotFront: 31,
    hedge: 47,
    gateX: 48,
    exitZ: 26,
    exitEnd: 70,
    innerWalk: 21,
    plazaTrees: [],
    plazaFlowers: [],
    cornerTrees: [],
    outerTrees: [
      [-55, 30, 1.3], [-58, -12, 1.4], [-52, -44, 1.2], [-20, -56, 1.4], [18, -55, 1.3],
      [50, -52, 1.2], [57, -15, 1.4], [57, 10, 1.2], [56, 40, 1.3], [30, 57, 1.4],
      [-10, 58, 1.3], [-45, 54, 1.2], [62, 33, 1.1], [64, 19, 1.2],
    ],
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.plazaTrees.push([14 * sx, 14 * sz, 1], [16.5 * sx, 5 * sz, 0.9], [5 * sx, 16.5 * sz, 0.9])
      out.plazaFlowers.push([11 * sx, 11 * sz])
      if (sx === 1 && sz === 1) continue
      out.cornerTrees.push([36 * sx, 36 * sz, 1.1], [42 * sx, 39 * sz, 0.95], [38.5 * sx, 43 * sz, 0.9])
    }
  }
  out.cornerTrees.push([36, 38, 1.1], [42, 42, 0.95])
  return out
})()

const LEGACY_PLAN: LotPlan = {
  width: 9,
  depth: 12,
  setbacks: { front: 0, side: 0, back: 0 },
  houseFront: { x: 0, z: -1.6 },
  access: { x: 0, z: -6 },
  sign: { x: 2.5, z: -5.35 },
  hedge: { thickness: 0.3, height: 0.7, frontGap: 3.1 },
  tree: { x: 2.8, z: 4.3, scale: 0.85 },
  flowers: { x: -2.6, z: -4.6 },
  house: { width: 5.4, depth: 4.8, height: 4.6, pathWidth: 1.3, stepDepth: 0.6, stepWidth: 1.6 },
  buildable: { minX: -4.5, maxX: 4.5, minZ: -6, maxZ: 6 },
}

// ── Paleta ───────────────────────────────────────────────────────────────────
// Exportada: o centro (center-world.ts) usa os mesmos números.
export const C = {
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
  mineBoard: [1, 0.78, 0.18],
  mineMat: [0.95, 0.72, 0.16],
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
// o personagem passa rente a ela, a câmera não pode entrar nela). As peças
// soltas (árvore, banco, poste, flores) servem também ao centro (mm3d-17).
export type PropCtx = {
  geo: GeoBuilder
  boxes: Box2[]
  viewOnly: Box2[]
}
type Ctx = PropCtx & {
  signs: GeoBuilder
  d: NeighborhoodDims
  plan: LotPlan
}

/** Placa de chão: caixa fina do y=0 até `top`. */
export function slab(g: GeoBuilder, cx: number, cz: number, w: number, d: number, top: number, color: RGB) {
  g.box(w, top, d, place(cx, top / 2, cz), color)
}

export function tree(ctx: PropCtx, x: number, z: number, s = 1, collide = true) {
  const { geo } = ctx
  geo.cylinder(0.34 * s, 1.6 * s, place(x, 0.8 * s, z), C.trunk, 6)
  geo.sphere(2.2 * s, [1, 0.85, 1], place(x, 2.15 * s, z), C.leafA)
  geo.sphere(1.6 * s, [1, 0.9, 1], place(x + 0.45 * s, 2.8 * s, z - 0.2 * s), C.leafB)
  geo.sphere(1.3 * s, [1, 0.9, 1], place(x - 0.5 * s, 2.65 * s, z + 0.35 * s), C.leafB)
  if (collide) ctx.boxes.push({ x, z, hx: 0.35 * s, hz: 0.35 * s, rot: 0, h: 3.4 * s })
  ctx.viewOnly.push({ x, z, hx: 1.05 * s, hz: 1.05 * s, rot: 0, h: 3.4 * s })
}

export function bench(ctx: PropCtx, x: number, z: number, rot: number) {
  const { geo } = ctx
  const f = frameOf(x, z, rot)
  geo.box(2, 0.12, 0.55, place(0, 0.45, 0, 0, f), C.wood)
  geo.box(2, 0.45, 0.1, place(0, 0.78, 0.27, 0, f), C.wood)
  for (const sx of [-0.85, 0.85]) geo.box(0.1, 0.45, 0.5, place(sx, 0.22, 0, 0, f), C.metal)
  ctx.boxes.push({ x, z, hx: 1.05, hz: 0.38, rot, h: 1 })
}

export function lamp(ctx: PropCtx, x: number, z: number) {
  const { geo } = ctx
  geo.cylinder(0.16, 3.2, place(x, 1.6, z), C.metal, 6)
  geo.box(0.42, 0.42, 0.42, place(x, 3.35, z), C.bulb)
  geo.box(0.56, 0.08, 0.56, place(x, 3.6, z), C.metal)
  ctx.boxes.push({ x, z, hx: 0.2, hz: 0.2, rot: 0, h: 3.6 })
}

export function flowerPatch(ctx: PropCtx, x: number, z: number, seed: number) {
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

/** Caixas de colisão da casa (catálogo, coordenadas do lote) no mundo. */
function houseBoxesFor(lot: Lot, def: HouseLevelDef): Box2[] {
  return (def.colliders ?? []).map(([lx, lz, hx, hz, h]) => ({ ...lotBox(lot, lx, lz, hx, hz, h), lot: lot.number }))
}

/** Origem do modelo no lote (frente dos degraus), em coordenadas locais. */
function originOf(plan: LotPlan, def: HouseLevelDef) {
  return def.origin ?? { x: plan.houseFront.x, z: plan.houseFront.z - (plan.house.stepDepth - 0.15) }
}

/**
 * A parte FIXA de um lote (não muda com o nível da casa): gramado, cercas,
 * placa, flores e árvore — no jardim da frente ou nas divisas, fora da área
 * edificável. Posicionado a partir do `plan`, o mesmo objeto de onde o
 * servidor tira os colisores. Devolve o ponto de interação da PLACA.
 */
function lotStatic(ctx: Ctx, lot: Lot, h: House): Interactable {
  const { geo, signs, boxes, plan } = ctx
  const f = frameOf(lot.position.x, lot.position.z, lot.rotationY)
  const v = h.variant
  const W = plan.width
  const D = plan.depth

  geo.box(W - 0.4, 0.025, D - 0.4, place(0, 0.0125, 0, 0, f), C.lotLawn)
  const fp = rotY(plan.flowers.x, plan.flowers.z, lot.rotationY)
  flowerPatch(ctx, lot.position.x + fp.x, lot.position.z + fp.z, v)
  if (v % 3 === 1) {
    const tp = rotY(plan.tree.x, plan.tree.z, lot.rotationY)
    tree(ctx, lot.position.x + tp.x, lot.position.z + tp.z, plan.tree.scale)
  }

  // Cercas vivas baixas: laterais e fundo. A frente fica aberta para a rua.
  const t = plan.hedge.thickness
  const hh = plan.hedge.height
  const zStart = -D / 2 + plan.hedge.frontGap
  const zEnd = D / 2 - t
  const sideX = W / 2 - t / 2
  const sideZ = (zStart + zEnd) / 2
  const sideLen = zEnd - zStart
  geo.box(t, hh, sideLen, place(-sideX, hh / 2, sideZ, 0, f), C.hedgeLot)
  geo.box(t, hh, sideLen, place(sideX, hh / 2, sideZ, 0, f), C.hedgeLot)
  geo.box(W, hh, t, place(0, hh / 2, D / 2 - t / 2, 0, f), C.hedgeLot)

  // Placa com o número do lote, de frente para a rua. Casa do jogador:
  // moldura dourada na placa (o tapete dourado vai com a casa, ver lotHouse).
  const sg = plan.sign
  geo.box(0.14, 1.2, 0.14, place(sg.x, 0.6, sg.z, 0, f), C.woodDark)
  geo.box(1.05, 0.62, 0.08, place(sg.x, 1.38, sg.z, 0, f), h.isMine ? C.mineBoard : C.board)
  if (h.isMine) geo.box(1.25, 0.82, 0.06, place(sg.x, 1.38, sg.z + 0.04, 0, f), C.knob)
  signs.quad(0.95, 0.52, numberCell(lot.number), place(sg.x, 1.38, sg.z - 0.05, 0, f))

  // Reserva de colisão (a que vale é a lista do servidor; ver buildWorld).
  boxes.push(lotBox(lot, -sideX, sideZ, t / 2, sideLen / 2, hh))
  boxes.push(lotBox(lot, sideX, sideZ, t / 2, sideLen / 2, hh))
  boxes.push(lotBox(lot, 0, D / 2 - t / 2, W / 2, t / 2, hh))
  boxes.push(lotBox(lot, sg.x, sg.z, 0.12, 0.12, 2))

  const o = rotY(sg.x - 1.3, plan.access.z + 1.2, lot.rotationY)
  return { kind: "house", id: h.id, x: lot.position.x + o.x, z: lot.position.z + o.z, radius: 3.6, lot, house: h }
}

/**
 * A parte que MUDA com o nível: o caminho da calçada até os degraus, o tapete
 * dourado da casa do jogador e — quando é ela que está na tela — a casa 01.
 * Vai para a malha "mm-houses", reconstruída a cada troca (são caixas: barato).
 */
function lotHouse(g: GeoBuilder, plan: LotPlan, lot: Lot, h: House, def: HouseLevelDef) {
  const H = plan.house
  const f = frameOf(lot.position.x, lot.position.z, lot.rotationY)
  const end = def.pathEnd ?? originOf(plan, def)
  const pathLen = end.z - plan.access.z
  g.box(H.pathWidth, 0.05, pathLen, place(end.x, 0.025, plan.access.z + pathLen / 2, 0, f), C.path)
  if (h.isMine) g.box(1.5, 0.03, 0.9, place(end.x, 0.065, end.z - 0.75, 0, f), C.mineMat)
  if (def.kind !== "builtin") return

  const v = h.variant
  const wall = WALLS[v % WALLS.length]
  const roof = ROOFS[Math.floor(v / 3) % ROOFS.length]
  const door = DOORS[v % DOORS.length]
  const hf = plan.houseFront.z // fachada
  const hc = hf + H.depth / 2 // centro da base
  const hx = plan.houseFront.x

  // Casa: base, corpo e telhado. A frente (porta) fica no -Z local.
  g.box(H.width, 0.25, H.depth, place(hx, 0.125, hc, 0, f), C.stone)
  g.box(5, 2.6, 4.4, place(hx, 1.55, hc, 0, f), wall)
  g.prism(5.8, 5.2, 1.7, place(hx, 2.85, hc, 0, f), roof)
  if (v % 2 === 0) g.box(0.6, 1.4, 0.6, place(hx + 1.5, 3.4, hc + 0.9, 0, f), [0.66, 0.41, 0.36])

  // Porta, degrau, maçaneta.
  g.box(1, 1.8, 0.1, place(hx, 1.15, hf + 0.15, 0, f), door)
  g.box(H.stepWidth, 0.12, H.stepDepth, place(hx, 0.06, hf - 0.15, 0, f), C.stone)
  g.box(0.1, 0.1, 0.06, place(hx + 0.32, 1.1, hf + 0.08, 0, f), C.knob)

  // Janelas da frente e dos lados (moldura atrás do vidro).
  for (const sx of [-1.55, 1.55]) {
    g.box(1.15, 1.05, 0.06, place(hx + sx, 1.75, hf + 0.18, 0, f), C.frame)
    g.box(0.92, 0.82, 0.08, place(hx + sx, 1.75, hf + 0.15, 0, f), C.glass)
  }
  for (const sx of [-2.53, 2.53]) {
    g.box(0.06, 1.05, 1.15, place(hx + sx, 1.75, hc, 0, f), C.frame)
    g.box(0.08, 0.82, 0.92, place(hx + sx + Math.sign(sx) * 0.02, 1.75, hc, 0, f), C.glass)
  }
  // Arbustos ao lado da porta: só a casa 01 deixa espaço para eles ali.
  g.sphere(0.95, [1, 0.75, 0.9], place(hx - 2.2, 0.35, hf - 0.35, 0, f), C.hedgeLot)
  g.sphere(0.95, [1, 0.75, 0.9], place(hx + 2.2, 0.35, hf - 0.35, 0, f), C.hedgeLot)
}

function streets(ctx: Ctx) {
  const { geo, d } = ctx
  const R = d.ring
  const RH = d.roadHalf
  const SW = d.sidewalk
  const INNER_WALK = R - RH - SW
  const OUTER_WALK = R + RH + SW
  const len = 2 * (R + RH)
  const road = 2 * RH
  // Anel: norte/sul cobrem os cantos, leste/oeste completam.
  slab(geo, 0, R, len, road, 0.03, C.road)
  slab(geo, 0, -R, len, road, 0.03, C.road)
  slab(geo, R, 0, road, len - 2 * road, 0.03, C.road)
  slab(geo, -R, 0, road, len - 2 * road, 0.03, C.road)
  // Rua de saída para o Centro, que segue além do portão.
  slab(geo, (R + RH + d.exitEnd) / 2, d.exitZ, d.exitEnd - (R + RH), road, 0.03, C.road)

  // Faixas tracejadas no eixo.
  const dash = R - 6
  for (let t = -dash; t <= dash; t += 3.2) {
    geo.box(1.4, 0.012, 0.16, place(t, 0.036, R), C.roadLine)
    geo.box(1.4, 0.012, 0.16, place(t, 0.036, -R), C.roadLine)
    geo.box(0.16, 0.012, 1.4, place(R, 0.036, t), C.roadLine)
    geo.box(0.16, 0.012, 1.4, place(-R, 0.036, t), C.roadLine)
  }
  for (let t = R + 7; t <= d.exitEnd - 2; t += 3.2) geo.box(1.4, 0.012, 0.16, place(t, 0.036, d.exitZ), C.roadLine)

  // Calçadas de dentro e de fora do anel.
  const inner = INNER_WALK + SW / 2
  slab(geo, 0, inner, 2 * (INNER_WALK + SW), SW, 0.08, C.walk)
  slab(geo, 0, -inner, 2 * (INNER_WALK + SW), SW, 0.08, C.walk)
  slab(geo, inner, 0, SW, 2 * INNER_WALK, 0.08, C.walk)
  slab(geo, -inner, 0, SW, 2 * INNER_WALK, 0.08, C.walk)
  const outer = OUTER_WALK - SW / 2
  // Norte: segue pela rua de saída até o portão.
  slab(geo, (d.gateX - OUTER_WALK) / 2, outer, d.gateX + OUTER_WALK, SW, 0.08, C.walk)
  slab(geo, 0, -outer, 2 * OUTER_WALK, SW, 0.08, C.walk)
  slab(geo, -outer, 0, SW, 2 * (OUTER_WALK - SW), 0.08, C.walk)
  // Leste: interrompida pela rua de saída, que vira calçada ao sul dela.
  slab(geo, outer, (-(OUTER_WALK - SW) + (R - RH)) / 2, SW, R - RH + (OUTER_WALK - SW), 0.08, C.walk)
  slab(geo, (R + RH + d.gateX) / 2, R - RH - SW / 2, d.gateX - (R + RH), SW, 0.08, C.walk)
}

function plaza(ctx: Ctx, spawn: { x: number; z: number }) {
  const { geo, d } = ctx
  const INNER_WALK = d.innerWalk
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

  if (d.statues?.length) {
    // mm3d-50: Aurion no meio e os outros deuses em púlpitos (bases aqui; os
    // modelos chegam depois, por loadStatues) e as quatro pracinhas.
    for (const s of d.statues) statueBase(ctx, s)
    for (const [cx, cz] of d.squares ?? []) square(ctx, cx, cz, d.square ?? { r: 5, bed: 1.1, bench: 3.3 })
  } else {
    // Canteiro central com árvore (backend anterior ao mm3d-50).
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
  }
  for (const sx of [-8.2, 8.2]) for (const sz of [-8.2, 8.2]) lamp(ctx, sx, sz)
  const lampAt = INNER_WALK + 1
  for (const sx of [-lampAt, lampAt]) for (const sz of [-lampAt, lampAt]) lamp(ctx, sx, sz)

  // Árvores e flores no gramado de dentro, longe dos caminhos.
  for (const [x, z, s] of d.plazaTrees) tree(ctx, x, z, s)
  for (const [x, z] of d.plazaFlowers) flowerPatch(ctx, x, z, 1 + Math.sign(x) + Math.sign(z))

  // Ponto de chegada: disco amarelo no caminho sul.
  geo.cylinder(2.6, 0.06, place(spawn.x, 0.06, spawn.z), C.spawn, 16)
  geo.cylinder(1.6, 0.07, place(spawn.x, 0.065, spawn.z), C.plaza, 16)
}

/**
 * Pracinha do gramado (mm3d-50): piso redondo com caminho até a praça,
 * canteiro florido no meio, quatro bancos olhando para ele e um poste na borda
 * de fora — as mesmas caixas de squareBenches/squareLamp do servidor.
 */
function square(ctx: Ctx, cx: number, cz: number, sq: { r: number; bed: number; bench: number }) {
  const { geo } = ctx
  // Caminho na diagonal, da quina da praça até a borda da pracinha.
  const from = 8.8 * Math.SQRT2
  const to = Math.hypot(cx, cz) - sq.r + 0.3
  const a = Math.atan2(cx, cz)
  geo.box(2.2, 0.052, to - from, place((Math.sin(a) * (from + to)) / 2, 0.026, (Math.cos(a) * (from + to)) / 2, a), C.path)
  geo.cylinder(2 * sq.r + 0.6, 0.05, place(cx, 0.025, cz), C.plazaEdge, 24)
  geo.cylinder(2 * sq.r, 0.058, place(cx, 0.029, cz), C.plaza, 24)
  geo.cylinder(2 * sq.bed + 0.3, 0.5, place(cx, 0.25, cz, Math.PI / 8), C.stone, 8)
  geo.cylinder(2 * sq.bed, 0.06, place(cx, 0.52, cz, Math.PI / 8), C.lotLawn, 8)
  const seed = 4 + Math.sign(cx) + 2 * Math.sign(cz)
  for (const [fx, fz] of [[0.35, 0.2], [-0.3, -0.3], [-0.2, 0.4]]) flowerPatch(ctx, cx + fx, cz + fz, seed)
  ctx.boxes.push({ x: cx, z: cz, hx: sq.bed * 0.85, hz: sq.bed * 0.85, rot: Math.PI / 4, h: 0.5 })
  for (let i = 0; i < 4; i++) {
    const b = Math.PI / 4 + (i * Math.PI) / 2
    const dx = sq.bench * Math.sin(b)
    const dz = sq.bench * Math.cos(b)
    bench(ctx, cx + dx, cz + dz, Math.atan2(dx, dz))
  }
  lamp(ctx, cx + Math.sign(cx) * (sq.r - 0.5), cz + Math.sign(cz) * (sq.r - 0.5))
}

function boundary(ctx: Ctx) {
  const { geo, boxes, d } = ctx
  const HEDGE = d.hedge
  const GATE_X = d.gateX
  const EXIT_Z = d.exitZ
  const hedge = (x: number, z: number, w: number, d: number) => {
    geo.box(w, 1.5, d, place(x, 0.75, z), C.hedge)
    boxes.push({ x, z, hx: w / 2, hz: d / 2, rot: 0, h: 1.5 })
  }
  const L = 2 * HEDGE + 1
  hedge(0, HEDGE, L, 1)
  hedge(0, -HEDGE, L, 1)
  hedge(-HEDGE, 0, 1, L)
  // Leste: aberta só onde passa a rua de saída (z 21–31), e lá fica o portão.
  const gapLo = d.ring - d.roadHalf - 2
  const gapHi = d.ring + d.roadHalf + 2
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
  for (const [x, z, s] of ctx.d.cornerTrees) tree(ctx, x, z, s)
  for (const [x, z, s] of ctx.d.outerTrees) tree(ctx, x, z, s, false)
}

export interface BuiltWorld {
  meshes: Mesh[]
  /** Colisão do personagem. Mutada NO LUGAR quando o nível de uma casa muda. */
  boxes: Box2[]
  /** Obstáculos da câmera: os do personagem mais as copas (idem). */
  viewBoxes: Box2[]
  interactables: Interactable[]
  catalog: HouseCatalog
  /**
   * Nível CONFIRMADO pelo servidor para a casa do lote. Só vale revisão maior
   * que a atual (a última confirmada vence). Troca colisores e porta na hora;
   * o modelo troca quando terminar de carregar — até lá a casa anterior fica.
   */
  applyLevel: (lot: number, level: number, rev: number) => boolean
  /** Carrega de novo o modelo que falhou (o confirmado não muda). */
  retryVisual: (lot: number) => void
  visual: (lot: number) => HouseVisual | null
  /** Níveis com modelo carregado na GPU (painel técnico). */
  loadedLevels: () => number[]
  dispose: () => void
}

/** Catálogo de reserva para backend anterior ao mm3d-06: só o nível 01. */
function legacyCatalog(): HouseCatalog {
  return {
    assetVersion: "builtin",
    basePath: "/meu-mundo/casas/",
    levels: [{ level: 1, id: "level-01", available: true, kind: "builtin", asset: null, thumb: null }],
  }
}

export function buildWorld(
  scene: Scene,
  nb: Neighborhood,
  exitLabel: string,
  onHouseVisual?: (v: HouseVisual) => void,
): BuiltWorld {
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

  const d = nb.dims ?? LEGACY_DIMS
  const plan = nb.lotPlan ?? LEGACY_PLAN
  const ctx: Ctx = { geo: new GeoBuilder(), signs: new GeoBuilder(), boxes: [], viewOnly: [], d, plan }

  // Chão: de fora (até o horizonte com a névoa) e de dentro da cerca.
  const ground = 2 * ((nb.limit ?? 70) + 60)
  slab(ctx.geo, 0, 0, ground, ground, 0.002, C.grassOut)
  slab(ctx.geo, 0, 0, 2 * d.hedge, 2 * d.hedge, 0.008, C.grass)
  streets(ctx)
  plaza(ctx, nb.spawn)
  boundary(ctx)
  outskirts(ctx)

  // ── Lotes ─────────────────────────────────────────────────────────────────
  const catalog = nb.houseCatalog ?? legacyCatalog()
  const fallback = catalog.levels.find((l) => l.level === 1) ?? legacyCatalog().levels[0]
  const defOf = (level: number) => catalog.levels.find((l) => l.level === level && l.available) ?? fallback

  type Slot = {
    lot: Lot
    house: House
    rev: number
    /** Nível que está NA TELA (pode ficar atrás do confirmado enquanto carrega ou se falhar). */
    shown: number
    token: number
    status: HouseVisual["status"]
    progress?: number
    door: Interactable
  }
  const housesById = new Map(nb.houses.map((h) => [h.id, h]))
  const interactables: Interactable[] = []
  const slots = new Map<number, Slot>()
  for (const lot of nb.lots) {
    const h = housesById.get(lot.houseId)
    if (!h) continue
    h.level = defOf(h.level).level
    interactables.push(lotStatic(ctx, lot, h))
    // Dois pontos de interação por casa: a placa (alcança a calçada) e a
    // porta (na frente dos degraus — nunca atrás da casa). Os vizinhos ficam
    // a 22 m.
    const door: Interactable = { kind: "house", id: h.id, x: 0, z: 0, radius: 3.0, lot, house: h }
    interactables.push(door)
    slots.set(lot.number, { lot, house: h, rev: h.levelRev ?? 0, shown: 1, token: 0, status: "ok", door })
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

  // ── Casas (mudam com o nível) ─────────────────────────────────────────────
  const models = new HouseModels(scene, catalog)
  let housesMesh: Mesh | null = null
  let disposed = false
  const rebuildHouses = () => {
    const g = new GeoBuilder()
    for (const sl of slots.values()) lotHouse(g, plan, sl.lot, sl.house, defOf(sl.shown))
    const next = g.build("mm-houses", scene, worldMat)
    housesMesh?.dispose()
    housesMesh = next
  }
  const placeDoor = (sl: Slot) => {
    const def = defOf(sl.house.level)
    const o = originOf(plan, def)
    const p = rotY((def.door ?? o).x + 0.8, o.z - 1.35, sl.lot.rotationY)
    sl.door.x = sl.lot.position.x + p.x
    sl.door.z = sl.lot.position.z + p.z
  }
  const emit = (sl: Slot) =>
    onHouseVisual?.({ lot: sl.lot.number, confirmed: sl.house.level, shown: sl.shown, status: sl.status, progress: sl.progress })

  /** Troca a casa na tela de uma vez: nunca duas casas sobrepostas. */
  const setShown = (sl: Slot, level: number): boolean => {
    const def = defOf(level)
    const f = frameOf(sl.lot.position.x, sl.lot.position.z, sl.lot.rotationY)
    const o = originOf(plan, def)
    if (!models.show(sl.lot.number, def.kind === "glb" ? def.level : null, place(o.x, 0, o.z, 0, f))) return false
    sl.shown = def.level
    sl.status = "ok"
    sl.progress = undefined
    rebuildHouses()
    emit(sl)
    return true
  }
  const requestVisual = (sl: Slot) => {
    const token = ++sl.token
    const def = defOf(sl.house.level)
    if (def.kind !== "glb") {
      setShown(sl, def.level)
      return
    }
    sl.status = "loading"
    sl.progress = 0
    emit(sl)
    models
      .load(def.level, (p) => {
        if (token !== sl.token || disposed) return
        sl.progress = p
        emit(sl)
      })
      .then(() => {
        if (token !== sl.token || disposed) return
        if (!setShown(sl, def.level)) requestVisual(sl)
      })
      .catch(() => {
        if (token !== sl.token || disposed) return
        // A casa anterior continua na tela; o confirmado segue sendo o novo.
        sl.status = "error"
        sl.progress = undefined
        emit(sl)
      })
  }

  // Colisão: a lista que veio do SERVIDOR é a mesma que a sala usa para
  // validar o movimento (as caixas de cada casa vêm marcadas com o lote). A
  // desenhada aqui só serve de reserva (payload antigo).
  const boxes: Box2[] = nb.obstacles?.length ? [...nb.obstacles] : [...ctx.boxes]
  if (!nb.obstacles?.length) {
    for (const sl of slots.values()) boxes.push(...houseBoxesFor(sl.lot, defOf(sl.house.level)))
  }
  // Em desenvolvimento: confere se o desenho e a colisão do servidor batem
  // (fora as casas, que vêm do catálogo e são conferidas na suíte do backend).
  if (process.env.NODE_ENV !== "production" && nb.obstacles?.length) {
    const key = (b: Box2) => [b.x, b.z, b.hx, b.hz, b.h].map((n) => (Math.round(n * 100) / 100 || 0).toFixed(2)).join("|")
    const server = new Set(nb.obstacles.filter((b) => b.lot === undefined).map(key))
    const drawn = new Set(ctx.boxes.map(key))
    const onlyDrawn = [...drawn].filter((k) => !server.has(k))
    const onlyServer = [...server].filter((k) => !drawn.has(k))
    ;(window as unknown as { __mmLayoutCheck?: unknown }).__mmLayoutCheck = { onlyDrawn, onlyServer }
    if (onlyDrawn.length || onlyServer.length) console.warn("[meu-mundo] desenho × colisão divergem", { onlyDrawn, onlyServer })
  }
  const viewBoxes = [...boxes, ...ctx.viewOnly]
  const replaceLotBoxes = (list: Box2[], lot: number, next: Box2[]) => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].lot === lot) list.splice(i, 1)
    list.push(...next)
  }

  for (const sl of slots.values()) placeDoor(sl)
  rebuildHouses()
  for (const sl of slots.values()) if (sl.house.level !== 1) requestVisual(sl)

  // Estátuas dos deuses (mm3d-50): as bases já estão no buffer do mundo.
  const statueModels = d.statues?.length && nb.statueAssets ? new CenterModels(scene) : null
  if (statueModels) loadStatues(statueModels, d.statues!, nb.statueAssets, () => !disposed)

  return {
    meshes: [world, signs],
    boxes,
    viewBoxes,
    interactables,
    catalog,
    applyLevel(lot, level, rev) {
      const sl = slots.get(lot)
      if (!sl || rev <= sl.rev) return false
      const def = defOf(level)
      sl.rev = rev
      sl.house.levelRev = rev
      if (def.level === sl.house.level) return true
      sl.house.level = def.level
      const next = houseBoxesFor(sl.lot, def)
      replaceLotBoxes(boxes, lot, next)
      replaceLotBoxes(viewBoxes, lot, next)
      placeDoor(sl)
      requestVisual(sl)
      return true
    },
    retryVisual(lot) {
      const sl = slots.get(lot)
      if (sl && sl.shown !== sl.house.level) requestVisual(sl)
    },
    visual(lot) {
      const sl = slots.get(lot)
      return sl ? { lot, confirmed: sl.house.level, shown: sl.shown, status: sl.status, progress: sl.progress } : null
    },
    loadedLevels: () => models.loadedLevels,
    dispose: () => {
      disposed = true
      models.dispose()
      statueModels?.dispose()
      housesMesh?.dispose()
      world.dispose()
      signs.dispose()
      worldMat.dispose()
      signMat.dispose()
      atlas.dispose()
    },
  }
}
