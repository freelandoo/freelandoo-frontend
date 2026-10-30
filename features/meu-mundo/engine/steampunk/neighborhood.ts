// features/meu-mundo/engine/steampunk/neighborhood.ts
//
// O DESENHO do bairro "ring-20" em steampunk (mm3d-51). Mesma planta de
// sempre — anel de ruas, praça com o Aurion, quatro pracinhas, vinte lotes,
// muro em volta e o portão do Centro —, com as medidas que vêm do servidor
// (`dims` e `lotPlan`). O que muda é o que está em cima delas:
//
//   chão     grama oliva com terra (textura "soil"), canteiros com aro de ferro
//   rua      placas de ferro rebitadas, frisos de latão, guia de ferro, bueiros
//            com engrenagem e grelhas de drenagem (tudo rente: o carro não sente)
//   calçada  lajes de pedra bege com rejunte
//   praça    piso de lajes com rosa dos ventos de latão, borda de paralelepípedo,
//            postes-relógio, pedestal do Aurion com engrenagens e vapor
//   pracinha caldeira de cobre no lugar do canteiro, com volante que gira
//   lotes    cerca de grade em mureta com pilares de tijolo, lanternas,
//            canteiro de ferro, placa com moldura de latão, caixa de correio
//   muro     embasamento de pedra com gradil, pilares e lanternas
//   portão   torres de tijolo, viga treliçada, engrenagem grande que gira
//   fundo    silhuetas de fábrica além do muro (chaminés com vapor, gasômetro,
//            torre do relógio) — só profundidade, fora da área andável
//
// COLISÃO: cada função empurra para `ctx.boxes` exatamente as caixas que o
// desenho antigo empurrava (e que o servidor usa). O world.ts confere isso em
// desenvolvimento.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { frameOf, place, type GeoBuilder, type RGB } from "../geometry"
import { rotY, type Box2 } from "../collision"
import type { House, Lot, LotPlan, NeighborhoodDims, StatueDef } from "../../types"
import { SP, shade, rng } from "./palette"
import { facing, xf } from "./geo"
import {
  boiler,
  boundaryWall,
  grate,
  ironFence,
  manhole,
  planter,
  postLantern,
  steamBench,
  steamLamp,
  steamTree,
  gauge,
  type SteamCtx,
} from "./kit"

export type NbCtx = SteamCtx & {
  signs: GeoBuilder
  d: NeighborhoodDims
  plan: LotPlan
  /** Recorte do atlas de placas para o número do lote. */
  numberUV: (n: number) => [number, number, number, number]
  /** Recorte do letreiro largo do portão. */
  wideUV: [number, number, number, number]
}

// Tintas do chão (multiplicam a textura de areia "soil", média ~0,93/0,83/0,6):
// areia amarelada (pedido do Alex), um pouco mais escura fora do muro.
const GROUND_OUT: RGB = [0.88, 0.82, 0.72]
const GROUND_IN: RGB = [0.95, 0.9, 0.78]
const LAWN: RGB = [1, 0.96, 0.82]
const LOT_LAWN: RGB = [0.99, 0.94, 0.8]
// Tintas da pedra (multiplicam texturas cinza ~0,85).
const WALK: RGB = [0.96, 0.89, 0.77]
const PLAZA: RGB = [0.98, 0.93, 0.83]
// Cinza mais claro na pista (pedido do Alex).
const ROAD: RGB = [0.6, 0.6, 0.62]
const COBBLE: RGB = [0.82, 0.74, 0.64]
const COBBLE_DARK: RGB = [0.56, 0.52, 0.48]

/** Placa de chão num acumulador qualquer (caixa fina do y=0 até `top`). */
function slab(g: GeoBuilder, cx: number, cz: number, w: number, d: number, top: number, color: RGB) {
  g.box(w, top, d, place(cx, top / 2, cz), color)
}

// ── Ruas e calçadas ──────────────────────────────────────────────────────────

export function steamStreets(ctx: NbCtx) {
  const { road, pavers, props, d } = ctx
  const R = d.ring
  const RH = d.roadHalf
  const SW = d.sidewalk
  const INNER_WALK = R - RH - SW
  const OUTER_WALK = R + RH + SW
  const len = 2 * (R + RH)
  const W = 2 * RH
  const top = 0.03
  slab(road, 0, R, len, W, top, ROAD)
  slab(road, 0, -R, len, W, top, ROAD)
  slab(road, R, 0, W, len - 2 * W, top, ROAD)
  slab(road, -R, 0, W, len - 2 * W, top, ROAD)
  slab(road, (R + RH + d.exitEnd) / 2, d.exitZ, d.exitEnd - (R + RH), W, top, ROAD)

  // Faixas tracejadas (bege envelhecido) e frisos de latão perto das bordas.
  const dash = R - 6
  for (let t = -dash; t <= dash; t += 3.2) {
    props.box(1.4, 0.012, 0.14, place(t, 0.036, R), SP.roadLine)
    props.box(1.4, 0.012, 0.14, place(t, 0.036, -R), SP.roadLine)
    props.box(0.14, 0.012, 1.4, place(R, 0.036, t), SP.roadLine)
    props.box(0.14, 0.012, 1.4, place(-R, 0.036, t), SP.roadLine)
  }
  for (let t = R + 7; t <= d.exitEnd - 2; t += 3.2) props.box(1.4, 0.012, 0.14, place(t, 0.036, d.exitZ), SP.roadLine)
  const inLen = 2 * (R - RH)
  for (const s of [-1, 1]) {
    for (const off of [-(RH - 0.22), RH - 0.22]) {
      props.box(inLen, 0.008, 0.07, place(0, 0.034, s * R + off), SP.brassDark)
      props.box(0.07, 0.008, inLen, place(s * R + off, 0.034, 0), SP.brassDark)
    }
  }
  for (const off of [-(RH - 0.22), RH - 0.22]) {
    props.box(d.exitEnd - (R + RH), 0.008, 0.07, place((R + RH + d.exitEnd) / 2, 0.034, d.exitZ + off), SP.brassDark)
  }

  // Bueiros no meio das faixas e grelhas junto da guia.
  for (let t = -R + 8; t <= R - 8; t += 17) {
    const lane = Math.round(t / 17) % 2 ? 1.5 : -1.5
    manhole(ctx, t, 0.03, R + lane)
    manhole(ctx, t + 8, 0.03, -R - lane)
    manhole(ctx, R + lane, 0.03, t + 4)
    manhole(ctx, -R - lane, 0.03, t - 4)
  }
  for (let t = -R + 4; t <= R - 4; t += 13) {
    grate(ctx, t, 0.03, R - RH + 0.3, 0)
    grate(ctx, t + 6, 0.03, -R + RH - 0.3, 0)
    grate(ctx, R - RH + 0.3, 0.03, t + 3, Math.PI / 2)
    grate(ctx, -R + RH - 0.3, 0.03, t - 3, Math.PI / 2)
  }

  // Calçadas de lajes.
  const inner = INNER_WALK + SW / 2
  slab(pavers, 0, inner, 2 * (INNER_WALK + SW), SW, 0.08, WALK)
  slab(pavers, 0, -inner, 2 * (INNER_WALK + SW), SW, 0.08, WALK)
  slab(pavers, inner, 0, SW, 2 * INNER_WALK, 0.08, WALK)
  slab(pavers, -inner, 0, SW, 2 * INNER_WALK, 0.08, WALK)
  const outer = OUTER_WALK - SW / 2
  slab(pavers, (d.gateX - OUTER_WALK) / 2, outer, d.gateX + OUTER_WALK, SW, 0.08, WALK)
  slab(pavers, 0, -outer, 2 * OUTER_WALK, SW, 0.08, WALK)
  slab(pavers, -outer, 0, SW, 2 * (OUTER_WALK - SW), 0.08, WALK)
  slab(pavers, outer, (-(OUTER_WALK - SW) + (R - RH)) / 2, SW, R - RH + (OUTER_WALK - SW), 0.08, WALK)
  slab(pavers, (R + RH + d.gateX) / 2, R - RH - SW / 2, d.gateX - (R + RH), SW, 0.08, WALK)

  // Guia de ferro na beira da calçada que dá para a rua.
  const curb = (cx: number, cz: number, w: number, dd: number) => {
    props.box(w, 0.11, dd, place(cx, 0.055, cz), SP.ironWarm)
    props.box(w, 0.02, dd, place(cx, 0.115, cz), SP.steel)
  }
  const ci = R - RH - 0.07
  curb(0, ci, 2 * ci, 0.14)
  curb(0, -ci, 2 * ci, 0.14)
  curb(ci, 0, 0.14, 2 * ci - 0.28)
  curb(-ci, 0, 0.14, 2 * ci - 0.28)
  const co = R + RH + 0.07
  curb((d.gateX - co) / 2, co, d.gateX + co, 0.14)
  curb(0, -co, 2 * co, 0.14)
  curb(-co, 0, 0.14, 2 * co - 0.28)
  curb(co, (-(co - 0.14) + ci) / 2, 0.14, ci + co - 0.14)
  curb((co + d.gateX) / 2, ci, d.gateX - co, 0.14)
}

// ── Praça ────────────────────────────────────────────────────────────────────

export function steamPlaza(ctx: NbCtx, spawn: { x: number; z: number }) {
  const { soil, pavers, cobble, props, d } = ctx
  const INNER_WALK = d.innerWalk
  slab(soil, 0, 0, 2 * INNER_WALK, 2 * INNER_WALK, 0.015, LAWN)
  slab(cobble, 0, 0, 19, 19, 0.05, COBBLE_DARK)
  slab(pavers, 0, 0, 17.6, 17.6, 0.06, PLAZA)
  // Rosa dos ventos de latão e ferro no piso.
  props.ring(15.6, 0.16, flat(0, 0.061, 0), SP.brassDark, 40)
  props.ring(10.4, 0.12, flat(0, 0.061, 0), SP.iron, 32)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    const long = k % 2 === 0
    const r0 = 5.3
    const r1 = long ? 8.5 : 7.4
    const rm = (r0 + r1) / 2
    props.box(long ? 0.14 : 0.08, 0.006, r1 - r0, place(Math.sin(a) * rm, 0.063, Math.cos(a) * rm, a), long ? SP.brass : SP.iron)
  }
  // Caminhos de paralelepípedo até a calçada, com bordas de ferro.
  const mid = (9.5 + INNER_WALK) / 2
  const span = INNER_WALK - 9.5
  slab(cobble, 0, mid, 3, span, 0.055, COBBLE)
  slab(cobble, 0, -mid, 3, span, 0.055, COBBLE)
  slab(cobble, mid, 0, span, 3, 0.055, COBBLE)
  slab(cobble, -mid, 0, span, 3, 0.055, COBBLE)
  for (const s of [-1, 1]) {
    for (const e of [-1.55, 1.55]) {
      props.box(0.1, 0.07, span, place(e, 0.035, s * mid), SP.iron)
      props.box(span, 0.07, 0.1, place(s * mid, 0.035, e), SP.iron)
    }
  }

  if (d.statues?.length) {
    for (const s of d.statues) pedestal(ctx, s)
    for (const [x, z] of [[4.6, 4.6], [-4.6, 4.6], [4.6, -4.6], [-4.6, -4.6]]) steamBench(ctx, x, z, Math.atan2(x, z))
    for (const [cx, cz] of d.squares ?? []) square(ctx, cx, cz, d.square ?? { r: 5, bed: 1.1, bench: 3.3 })
  } else {
    // Backend anterior ao mm3d-50: o canteiro central (agora uma caldeira grande).
    boiler(ctx, 0, 0, 0, 3.6)
    ctx.boxes.push({ x: 0, z: 0, hx: 2.1, hz: 2.1, rot: Math.PI / 4, h: 1.2 })
    ctx.boxes.push({ x: 0, z: 0, hx: 2.1, hz: 2.1, rot: 0, h: 1.2 })
    for (const [x, z] of [[4.6, 4.6], [-4.6, 4.6], [4.6, -4.6], [-4.6, -4.6]]) steamBench(ctx, x, z, Math.atan2(x, z))
  }
  for (const sx of [-8.2, 8.2]) for (const sz of [-8.2, 8.2]) steamLamp(ctx, sx, sz, { clock: true })
  const lampAt = INNER_WALK + 1
  for (const sx of [-lampAt, lampAt]) for (const sz of [-lampAt, lampAt]) steamLamp(ctx, sx, sz)

  for (const [x, z, s] of d.plazaTrees) steamTree(ctx, x, z, s)
  for (const [x, z] of d.plazaFlowers) planter(ctx, x, z, 1 + Math.round(x + z), Math.atan2(x, z), 1.3, 0.8)

  // Ponto de chegada: disco de latão com a engrenagem.
  props.cylinder(2.6, 0.06, place(spawn.x, 0.06, spawn.z), SP.brassDark, 20)
  props.cylinder(2.2, 0.065, place(spawn.x, 0.062, spawn.z), SP.iron, 20)
  props.gear(0.9, 0.03, 14, place(spawn.x, 0.085, spawn.z), SP.brass, SP.bronze)
}

/** Disco/anel deitado no chão (matriz sem rotação, achatada em Y). */
function flat(x: number, y: number, z: number): Matrix {
  return Matrix.Scaling(1, 0.12, 1).multiply(place(x, y, z))
}

/**
 * Pedestal do Aurion: três degraus octogonais de pedra, cinta de bronze,
 * engrenagens nas faces (as das faces pares giram), anel de cano de latão,
 * lanternas nas quinas do tampo e quatro saídas de vapor. Mesmas caixas do
 * pedestal antigo (statues.ts).
 */
function pedestal(ctx: NbCtx, s: StatueDef) {
  const { props } = ctx
  const b = s.base
  if (b.kind !== "pedestal") return pulpit(ctx, s)
  const d = 2 * b.r
  const P = (y: number, ry = Math.PI / 8) => place(s.x, y, s.z, ry)
  props.cylinder(d * 1.08, 0.34, P(0.17), SP.stoneDark, 8)
  props.cylinder(d * 1.1, 0.05, P(0.36), SP.brassDark, 8)
  props.cylinder(d * 0.92, b.h - 0.52, P(0.34 + (b.h - 0.52) / 2), SP.stone, 8)
  props.cylinder(d * 0.95, 0.14, P(b.h - 0.24), SP.bronze, 8)
  props.cylinder(d * 0.98, 0.2, P(b.h - 0.08), SP.stoneLight, 8)
  props.ring(d * 0.935, 0.09, P(0.68, 0), SP.brass, 24)
  const R = (d * 0.92) / 2
  const apo = R * Math.cos(Math.PI / 8)
  for (let k = 0; k < 8; k++) {
    const phi = (k * Math.PI) / 4
    const ox = Math.cos(phi)
    const oz = Math.sin(phi)
    const ry = Math.atan2(-ox, -oz)
    const y = 0.34 + (b.h - 0.52) / 2 + 0.05
    const m = facing(s.x + ox * (apo + 0.04), y, s.z + oz * (apo + 0.04), undefined, ry)
    if (k % 2 === 0) {
      props.cylinder(0.98, 0.04, facing(s.x + ox * (apo + 0.01), y, s.z + oz * (apo + 0.01), undefined, ry), SP.iron, 16)
      ctx.gears.push({ m, r: 0.4, thick: 0.07, speed: k % 4 ? 0.35 : -0.35 })
    } else {
      props.gear(0.3, 0.06, 10, m, SP.bronze, SP.brassDark)
    }
  }
  // Quinas do tampo: lanternas; faces: saídas de vapor.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2
    postLantern(ctx, s.x + Math.cos(a) * 2.95, b.h + 0.02, s.z + Math.sin(a) * 2.95, 0.75)
    const v = (k * Math.PI) / 2
    const vx = s.x + Math.cos(v) * 3.0
    const vz = s.z + Math.sin(v) * 3.0
    props.cylinder(0.2, 0.36, place(vx, b.h + 0.18, vz), SP.copper, 8)
    props.cylinder(0.28, 0.06, place(vx, b.h + 0.37, vz), SP.brass, 8)
    ctx.vents.push([vx, b.h + 0.42, vz])
  }
  const hx = b.r * 0.93
  ctx.boxes.push({ x: s.x, z: s.z, hx, hz: hx, rot: 0, h: b.h })
  ctx.boxes.push({ x: s.x, z: s.z, hx, hz: hx, rot: Math.PI / 4, h: b.h })
}

/** Púlpito (não usado no bairro hoje; mesmas caixas de statues.ts). */
function pulpit(ctx: NbCtx, s: StatueDef) {
  const b = s.base
  if (b.kind !== "pulpit") return
  const w = 2 * b.r
  ctx.props.box(w + 0.3, 0.18, w + 0.3, place(s.x, 0.09, s.z, s.rot), SP.stoneDark)
  ctx.props.box(w, b.h - 0.32, w, place(s.x, 0.18 + (b.h - 0.32) / 2, s.z, s.rot), SP.stone)
  ctx.props.box(w + 0.18, 0.14, w + 0.18, place(s.x, b.h - 0.07, s.z, s.rot), SP.bronze)
  ctx.boxes.push({ x: s.x, z: s.z, hx: b.r, hz: b.r, rot: s.rot, h: b.h + s.height })
}

/** Pracinha: piso de lajes, borda de paralelepípedo, caldeira no meio, bancos e poste. */
function square(ctx: NbCtx, cx: number, cz: number, sq: { r: number; bed: number; bench: number }) {
  const { cobble, pavers, props } = ctx
  const from = 8.8 * Math.SQRT2
  const to = Math.hypot(cx, cz) - sq.r + 0.3
  const a = Math.atan2(cx, cz)
  cobble.box(2.2, 0.052, to - from, place((Math.sin(a) * (from + to)) / 2, 0.026, (Math.cos(a) * (from + to)) / 2, a), COBBLE)
  cobble.cylinder(2 * sq.r + 0.6, 0.05, place(cx, 0.025, cz), COBBLE_DARK, 24)
  pavers.cylinder(2 * sq.r, 0.058, place(cx, 0.029, cz), PLAZA, 24)
  props.ring(2 * sq.r - 0.4, 0.1, flat(cx, 0.059, cz), SP.brassDark, 24)
  boiler(ctx, cx, cz, Math.atan2(-cx, -cz), 2 * sq.bed)
  ctx.boxes.push({ x: cx, z: cz, hx: sq.bed * 0.85, hz: sq.bed * 0.85, rot: Math.PI / 4, h: 0.5 })
  for (let i = 0; i < 4; i++) {
    const b = Math.PI / 4 + (i * Math.PI) / 2
    const dx = sq.bench * Math.sin(b)
    const dz = sq.bench * Math.cos(b)
    steamBench(ctx, cx + dx, cz + dz, Math.atan2(dx, dz))
  }
  steamLamp(ctx, cx + Math.sign(cx) * (sq.r - 0.5), cz + Math.sign(cz) * (sq.r - 0.5))
}

// ── Muro, portão e fundo ─────────────────────────────────────────────────────

export function steamBoundary(ctx: NbCtx) {
  const { props, boxes, d } = ctx
  const HEDGE = d.hedge
  const GATE_X = d.gateX
  const EXIT_Z = d.exitZ
  const wall = (x: number, z: number, w: number, dd: number) => {
    boundaryWall(ctx, x, z, w, dd)
    boxes.push({ x, z, hx: w / 2, hz: dd / 2, rot: 0, h: 1.5 })
  }
  const L = 2 * HEDGE + 1
  wall(0, HEDGE, L, 1)
  wall(0, -HEDGE, L, 1)
  wall(-HEDGE, 0, 1, L)
  const gapLo = d.ring - d.roadHalf - 2
  const gapHi = d.ring + d.roadHalf + 2
  wall(HEDGE, (-HEDGE - 0.5 + gapLo) / 2, 1, gapLo + HEDGE + 0.5)
  wall(HEDGE, (gapHi + HEDGE + 0.5) / 2, 1, HEDGE + 0.5 - gapHi)

  // Portão do Centro: torres de tijolo, viga treliçada, letreiro, engrenagem.
  for (const z of [gapLo + 0.5, gapHi - 0.5]) {
    props.box(1.2, 0.5, 1.2, place(GATE_X, 0.25, z), SP.stoneDark)
    props.box(0.9, 3.7, 0.9, place(GATE_X, 2.35, z), SP.brick)
    for (const y of [1.2, 2.4, 3.6]) props.box(0.98, 0.1, 0.98, place(GATE_X, y, z), SP.iron)
    props.box(1.1, 0.16, 1.1, place(GATE_X, 4.28, z), SP.stoneLight)
    props.with("flat", () => props.sphere(0.7, [1, 0.8, 1], place(GATE_X, 4.5, z), SP.copper, 8))
    postLantern(ctx, GATE_X, 4.72, z, 0.8)
    boxes.push({ x: GATE_X, z, hx: 0.45, hz: 0.45, rot: 0, h: 4.4 })
  }
  const zA = gapLo + 0.5
  const zB = gapHi - 0.5
  for (const y of [4.42, 5.02]) props.box(0.3, 0.16, zB - zA + 0.9, place(GATE_X, y, EXIT_Z), SP.iron)
  const n = 10
  for (let k = 0; k < n; k++) {
    const z0 = zA + 0.45 + ((zB - zA - 0.9) * k) / n
    const z1 = zA + 0.45 + ((zB - zA - 0.9) * (k + 1)) / n
    props.tube([GATE_X, k % 2 ? 4.5 : 4.94, z0], [GATE_X, k % 2 ? 4.94 : 4.5, z1], 0.04, SP.ironHi, 5)
  }
  props.box(0.16, 1.15, 7.4, place(GATE_X, 3.55, EXIT_Z), SP.brassDark)
  props.box(0.18, 1.0, 7.1, place(GATE_X - 0.02, 3.55, EXIT_Z), SP.iron)
  ctx.signs.quad(7, 0.9, ctx.wideUV, place(GATE_X - 0.35, 3.55, EXIT_Z, Math.PI / 2))
  // Engrenagem grande no topo (gira) e duas pequenas fixas.
  const gm = xf(GATE_X, 5.95, EXIT_Z, 0, undefined, 0, Math.PI / 2)
  ctx.gears.push({ m: gm, r: 0.95, thick: 0.12, speed: 0.4 })
  props.box(0.2, 0.9, 0.2, place(GATE_X, 5.4, EXIT_Z), SP.iron)
  props.gear(0.45, 0.1, 10, xf(GATE_X, 5.55, EXIT_Z - 1.25, 0, undefined, 0, Math.PI / 2), SP.bronze, SP.brassDark)
  props.gear(0.45, 0.1, 10, xf(GATE_X, 5.55, EXIT_Z + 1.25, 0, undefined, 0, Math.PI / 2), SP.bronze, SP.brassDark)
  // Cancela de ferro com faixas de latão.
  const span = gapHi - gapLo - 1
  const k = 7
  for (let i = 0; i < k; i++) {
    const z = gapLo + 0.5 + span * ((i + 0.5) / k)
    props.box(0.22, 0.4, span / k, place(GATE_X + 1, 0.85, z), i % 2 ? SP.brass : SP.iron)
  }
  for (const z of [gapLo + 1, gapHi - 1]) props.box(0.22, 0.9, 0.22, place(GATE_X + 1, 0.45, z), SP.ironHi)
  boxes.push({ x: GATE_X + 1, z: EXIT_Z, hx: 0.6, hz: span / 2 + 0.5, rot: 0, h: 1.2 })
}

export function steamOutskirts(ctx: NbCtx) {
  for (const [x, z, s] of ctx.d.cornerTrees) steamTree(ctx, x, z, s)
  for (const [x, z, s] of ctx.d.outerTrees) steamTree(ctx, x, z, s, false, undefined, false)
}

/**
 * Silhuetas industriais além do muro (fora da área andável, sem colisão):
 * chaminés de fábrica com vapor, gasômetros e uma torre de relógio. Dão a
 * profundidade da "cidade mecânica" — a neblina come o que está longe.
 */
export function steamSkyline(ctx: SteamCtx, hedge: number) {
  const { props } = ctx
  const R0 = hedge + 24
  const rand = rng(9091)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.2
    // Não tampa a rua de saída (leste, z ≈ exitZ).
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.5 && Math.sin(a) > 0.3) continue
    const r = R0 + rand() * 10
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const kind = i % 4
    if (kind === 0 || kind === 2) {
      // Fábrica: galpão de tijolo com telhado em dente de serra e chaminé alta.
      const w = 10 + rand() * 6
      const f = frameOf(x, z, -a + Math.PI / 2)
      props.box(w, 6, 7, place(0, 3, 0, 0, f), shade(SP.brickDark, 0.95))
      for (let k = 0; k < 4; k++) props.prism(w / 4, 7, 1.6, place(-w / 2 + w / 8 + (k * w) / 4, 6, 0, Math.PI / 2, f), SP.slate)
      const h = 16 + rand() * 10
      props.cone(1.3, 2.0, h, place(w / 2 - 1.5, h / 2, 1.5, 0, f), SP.brick, 10)
      for (const y of [h * 0.4, h * 0.75, h - 0.4]) props.cylinder(1.9 - (y / h) * 0.6, 0.35, place(w / 2 - 1.5, y, 1.5, 0, f), SP.iron, 10)
      const top = xf(w / 2 - 1.5, h + 0.2, 1.5, 0, f).asArray()
      ctx.vents.push([top[12], top[13], top[14]])
    } else if (kind === 1) {
      // Gasômetro: cilindro com treliça.
      const dd = 9 + rand() * 4
      props.cylinder(dd, 8, place(x, 4, z), SP.steel, 16)
      props.cylinder(dd + 0.4, 0.4, place(x, 8, z), SP.iron, 16)
      for (let k = 0; k < 8; k++) {
        const b = (k / 8) * Math.PI * 2
        props.box(0.3, 9, 0.3, place(x + Math.cos(b) * (dd / 2 + 0.3), 4.5, z + Math.sin(b) * (dd / 2 + 0.3)), SP.iron)
      }
    } else {
      // Torre do relógio.
      props.box(4, 18, 4, place(x, 9, z), SP.masonryDark)
      props.box(4.6, 0.6, 4.6, place(x, 18.3, z), SP.stoneLight)
      props.cone(0.2, 4.6, 5, place(x, 21.1, z, Math.PI / 4), SP.slate, 4)
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2
        const m = (lx: number, ly: number, lz: number) => place(lx, ly, lz, ry, place(x, 0, z))
        props.with("flat", () => props.cylinder(2.6, 0.2, facing(0, 0, 0).multiply(m(0, 15.5, -2.05)), SP.board, 16))
        props.ring(2.7, 0.2, facing(0, 0, 0).multiply(m(0, 15.5, -2.1)), SP.brass, 16)
      }
    }
  }
}

// ── Lotes ────────────────────────────────────────────────────────────────────

/** Uma caixa de obstáculo no quadro de um lote. */
function lotBox(lot: Lot, lx: number, lz: number, hx: number, hz: number, h: number): Box2 {
  const o = rotY(lx, lz, lot.rotationY)
  return { x: lot.position.x + o.x, z: lot.position.z + o.z, hx, hz, rot: lot.rotationY, h }
}

/**
 * A parte FIXA do lote (não muda com o nível): gramado, cercas de grade,
 * placa, canteiro, árvore, caixa de correio, caixa de serviço. Mesmas caixas
 * de colisão de antes. Devolve o ponto da PLACA (como o world.ts antigo).
 */
export function steamLotStatic(ctx: NbCtx, lot: Lot, h: House) {
  const { soil, signs, boxes, plan, props } = ctx
  const f = frameOf(lot.position.x, lot.position.z, lot.rotationY)
  const v = h.variant
  const W = plan.width
  const D = plan.depth

  soil.box(W - 0.4, 0.025, D - 0.4, place(0, 0.0125, 0, 0, f), LOT_LAWN)
  const fp = plan.flowers
  planter(ctx, ...lotXZ(lot, fp.x, fp.z), v, lot.rotationY, 1.6, 0.9)
  if (v % 3 === 1) {
    const tp = rotY(plan.tree.x, plan.tree.z, lot.rotationY)
    steamTree(ctx, lot.position.x + tp.x, lot.position.z + tp.z, plan.tree.scale)
  }

  // Cercas de grade: laterais e fundo. A frente fica aberta para a rua.
  const t = plan.hedge.thickness
  const hh = plan.hedge.height
  const zStart = -D / 2 + plan.hedge.frontGap
  const zEnd = D / 2 - t
  const sideX = W / 2 - t / 2
  const sideZ = (zStart + zEnd) / 2
  const sideLen = zEnd - zStart
  ironFence(ctx, [-sideX, zStart], [-sideX, zEnd], hh, t, f)
  ironFence(ctx, [sideX, zStart], [sideX, zEnd], hh, t, f)
  ironFence(ctx, [-W / 2, D / 2 - t / 2], [W / 2, D / 2 - t / 2], hh, t, f, { pillarEvery: 5.5 })
  // Lanterna no pilar da frente de cada cerca lateral (dentro da caixa da cerca).
  for (const sx of [-sideX, sideX]) {
    const p = place(sx, 0, zStart, 0, f).asArray()
    postLantern(ctx, p[12], hh + 0.42, p[14], 0.55)
  }
  // Caixa de serviço com manômetro contra a cerca do fundo.
  const bx = (v % 2 ? 1 : -1) * (W / 2 - 3)
  props.box(0.8, 0.75, 0.32, place(bx, 0.375, D / 2 - t - 0.16, 0, f), SP.steel)
  props.box(0.86, 0.06, 0.38, place(bx, 0.78, D / 2 - t - 0.16, 0, f), SP.brassDark)
  gauge(ctx, bx - 0.15, 0.5, D / 2 - t - 0.33, f, 0.8)
  props.pipe([[bx + 0.25, 0.6, D / 2 - t - 0.3], [bx + 0.25, 0.6, D / 2 - t - 0.6], [bx + 0.25, 0.0, D / 2 - t - 0.6]], 0.05, SP.copper, SP.bronze, f)

  // Placa: poste de ferro, moldura de latão, número; caixa de correio no poste.
  const sg = plan.sign
  props.box(0.12, 1.2, 0.12, place(sg.x, 0.6, sg.z, 0, f), SP.iron)
  props.cylinder(0.26, 0.12, place(sg.x, 0.06, sg.z, 0, f), SP.ironHi, 8)
  props.box(1.2, 0.76, 0.06, place(sg.x, 1.38, sg.z + 0.03, 0, f), h.isMine ? SP.brass : SP.brassDark)
  props.box(1.05, 0.62, 0.08, place(sg.x, 1.38, sg.z, 0, f), h.isMine ? SP.mineBoard : SP.board)
  props.gear(0.14, 0.04, 6, facing(sg.x, 1.83, sg.z, f), SP.brass, SP.bronze)
  signs.quad(0.95, 0.52, ctx.numberUV(lot.number), place(sg.x, 1.38, sg.z - 0.05, 0, f))
  props.box(0.36, 0.26, 0.24, place(sg.x - 0.24, 0.95, sg.z + 0.02, 0, f), SP.copper)
  props.box(0.4, 0.04, 0.28, place(sg.x - 0.24, 1.1, sg.z + 0.02, 0, f), SP.copperDark)
  props.box(0.03, 0.18, 0.05, place(sg.x - 0.44, 1.02, sg.z + 0.02, 0, f), SP.brass)

  boxes.push(lotBox(lot, -sideX, sideZ, t / 2, sideLen / 2, hh))
  boxes.push(lotBox(lot, sideX, sideZ, t / 2, sideLen / 2, hh))
  boxes.push(lotBox(lot, 0, D / 2 - t / 2, W / 2, t / 2, hh))
  boxes.push(lotBox(lot, sg.x, sg.z, 0.12, 0.12, 2))
}

function lotXZ(lot: Lot, lx: number, lz: number): [number, number] {
  const p = rotY(lx, lz, lot.rotationY)
  return [lot.position.x + p.x, lot.position.z + p.z]
}

/**
 * Caminho da calçada até os degraus (paralelepípedo com bordas de ferro e
 * balizadores com luz) e o tapete de latão da casa do jogador. Muda com o
 * nível (o fim do caminho é do catálogo).
 */
export function steamLotPath(ctx: NbCtx, lot: Lot, h: House, end: { x: number; z: number }, pathWidth: number) {
  const { cobble, props, glow, plan } = ctx
  const f = frameOf(lot.position.x, lot.position.z, lot.rotationY)
  const pathLen = end.z - plan.access.z
  const cz = plan.access.z + pathLen / 2
  cobble.box(pathWidth, 0.05, pathLen, place(end.x, 0.025, cz, 0, f), COBBLE)
  for (const s of [-1, 1]) props.box(0.08, 0.07, pathLen, place(end.x + s * (pathWidth / 2 + 0.04), 0.035, cz, 0, f), SP.iron)
  // Balizadores baixos dos dois lados, a cada ~2,5 m.
  const n = Math.max(1, Math.floor(pathLen / 2.6))
  for (let i = 0; i < n; i++) {
    const z = plan.access.z + 1.4 + (n > 1 ? (i * (pathLen - 2.4)) / (n - 1) : 0)
    for (const s of [-1, 1]) {
      const x = end.x + s * (pathWidth / 2 + 0.32)
      props.cylinder(0.14, 0.5, place(x, 0.25, z, 0, f), SP.iron, 6)
      glow.with("flat", () => glow.box(0.13, 0.1, 0.13, place(x, 0.54, z, 0, f), SP.lampGlass))
      props.cone(0.04, 0.2, 0.08, place(x, 0.63, z, 0, f), SP.brassDark, 6)
    }
  }
  if (h.isMine) {
    props.box(1.6, 0.03, 1.0, place(end.x, 0.065, end.z - 0.75, 0, f), SP.iron)
    props.box(1.45, 0.035, 0.85, place(end.x, 0.07, end.z - 0.75, 0, f), SP.brass)
  }
}

/** Chão de fora e de dentro do muro. */
export function steamGround(ctx: NbCtx, limit: number) {
  const ground = 2 * (limit + 60)
  slab(ctx.soil, 0, 0, ground, ground, 0.002, GROUND_OUT)
  slab(ctx.soil, 0, 0, 2 * ctx.d.hedge, 2 * ctx.d.hedge, 0.008, GROUND_IN)
}
