// features/meu-mundo/engine/steampunk/center.ts
//
// O DESENHO do Centro da cidade em steampunk (mm3d-53). Mesma planta de
// sempre (freelandoo-backend/src/utils/meuMundoCenter.js) — praça de 34 m,
// anel de 6 m com curvas, avenida até o portal "Bairros", estacionamentos,
// cerca em volta —, com o kit do bairro (kit.ts) por cima:
//
//   chão     areia amarelada (pedido do Alex nos bairros) fora das quadras
//   calçadão lajes de pedra bege até a linha das fachadas
//   rua      placas de ferro, frisos de latão, guia de ferro, bueiros e grelhas
//   praça    lajes com a rosa dos ventos de latão, caminhos de paralelepípedo,
//            floreiras de pedra com aro de ferro e medalhão de engrenagem,
//            bancos de ferro fundido, postes (quatro com relógio), canteiros
//   pedestal o de Morkhan: degraus de pedra escura, cintas de bronze, quatro
//            engrenagens que giram, manômetros, canos de latão, filete âmbar
//            aceso, lanternas nas quinas e saídas de vapor
//   cerca    embasamento de pedra com gradil e pilares de tijolo, arbustos
//   portal   torres de tijolo, viga treliçada, letreiro, engrenagem que gira
//   fundo    silhuetas de fábrica além da cerca (steamSkyline do bairro)
//
// COLISÃO: no Centro a lista que vale é SEMPRE a do servidor (center-world.ts
// usa `c.obstacles`); o que as peças do kit empurram em `ctx.boxes` é
// descartado. Nada aqui acrescenta parede: todo ornamento novo é rente ao chão
// ou fica dentro de uma caixa que o servidor já tem (monumento, floreira,
// poste, pilar do portal, cerca).

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { frameOf, place, type GeoBuilder, type RGB } from "../geometry"
import type { CenterLayout, CenterPlace, StatueDef } from "../../types"
import { SP, mix } from "./palette"
import { facing, xf } from "./geo"
import { boundaryWall, gauge, grate, lightPool, manhole, postLantern, steamBench, steamLamp, steamTree, valveWheel, type SteamCtx } from "./kit"

export type CenterCtx = SteamCtx & {
  signs: GeoBuilder
  c: CenterLayout
}

const GROUND_OUT: RGB = [0.88, 0.82, 0.72]
const GROUND_IN: RGB = [0.95, 0.9, 0.78]
const WALK: RGB = [0.96, 0.89, 0.77]
const PAVE: RGB = [0.98, 0.93, 0.83]
const ROAD: RGB = [0.6, 0.6, 0.62]
const LOT: RGB = [0.52, 0.52, 0.55]
const COBBLE: RGB = [0.82, 0.74, 0.64]
const COBBLE_DARK: RGB = [0.56, 0.52, 0.48]

/** Placa de chão num acumulador qualquer (caixa fina do y = 0 até `top`). */
function slab(g: GeoBuilder, cx: number, cz: number, w: number, d: number, top: number, color: RGB) {
  g.box(w, top, d, place(cx, top / 2, cz), color)
}

/** Disco/anel deitado no chão. */
function flat(x: number, y: number, z: number): Matrix {
  return Matrix.Scaling(1, 0.12, 1).multiply(place(x, y, z))
}

/** Faixa curva: anel de raio r0..r1 em volta de (cx, cz), de a0 a a1 (rad), em caixas. */
function arc(g: GeoBuilder, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, top: number, color: RGB, n = 10, y0 = 0) {
  const da = (a1 - a0) / n
  const rm = (r0 + r1) / 2
  const len = 2 * r1 * Math.tan(da / 2) + 0.06
  for (let i = 0; i < n; i++) {
    const a = a0 + da * (i + 0.5)
    g.box(len, top - y0, r1 - r0, place(cx + Math.cos(a) * rm, (top + y0) / 2, cz + Math.sin(a) * rm, Math.PI / 2 - a), color)
  }
}

// ── Chão e ruas ──────────────────────────────────────────────────────────────

export function centerGround(ctx: CenterCtx) {
  const { c, soil, pavers } = ctx
  const ground = 2 * (c.limit + 60)
  slab(soil, 0, 0, ground, ground, 0.002, GROUND_OUT)
  slab(soil, 0, 0, 2 * c.dims.bound, 2 * c.dims.bound, 0.008, GROUND_IN)
  // Calçadão: tudo até a linha das fachadas é laje (a pista vai por cima).
  slab(pavers, 0, 0, 2 * c.dims.front, 2 * c.dims.front, 0.05, WALK)
}

export function centerStreets(ctx: CenterCtx) {
  const { c, road, pavers, props } = ctx
  const d = c.dims
  const k = d.ring - d.cornerR // centro das curvas
  const W = 2 * d.roadHalf
  const top = 0.065
  slab(road, 0, d.ring, 2 * k, W, top, ROAD)
  slab(road, 0, -d.ring, 2 * k, W, top, ROAD)
  slab(road, d.ring, 0, W, 2 * k, top, ROAD)
  slab(road, -d.ring, 0, W, 2 * k, top, ROAD)
  const corners: [number, number, number][] = [
    [k, k, 0],
    [-k, k, Math.PI / 2],
    [-k, -k, Math.PI],
    [k, -k, (3 * Math.PI) / 2],
  ]
  for (const [cx, cz, a0] of corners) {
    arc(road, cx, cz, d.cornerR - d.roadHalf, d.cornerR + d.roadHalf, a0, a0 + Math.PI / 2, top, ROAD)
    arc(pavers, cx, cz, d.cornerR + d.roadHalf, d.cornerR + d.roadHalf + d.sidewalk, a0, a0 + Math.PI / 2, 0.075, WALK)
    // Guias de ferro nas duas bordas da curva.
    for (const r of [d.cornerR - d.roadHalf, d.cornerR + d.roadHalf]) arc(props, cx, cz, r - 0.07, r + 0.07, a0, a0 + Math.PI / 2, 0.11, SP.ironWarm, 12)
  }
  // Calçadas retas de fora do anel e as guias de ferro das retas.
  const ow = d.ringOut + d.sidewalk / 2
  slab(pavers, 0, ow, 2 * k, d.sidewalk, 0.075, WALK)
  slab(pavers, 0, -ow, 2 * k, d.sidewalk, 0.075, WALK)
  slab(pavers, ow, 0, d.sidewalk, 2 * k, 0.075, WALK)
  slab(pavers, -ow, 0, d.sidewalk, 2 * k, 0.075, WALK)
  for (const r of [d.ringIn, d.ringOut]) {
    for (const s of [-1, 1]) {
      props.box(2 * k, 0.11, 0.14, place(0, 0.055, s * r), SP.ironWarm)
      props.box(0.14, 0.11, 2 * k, place(s * r, 0.055, 0), SP.ironWarm)
      props.box(2 * k, 0.02, 0.14, place(0, 0.115, s * r), SP.steel)
      props.box(0.14, 0.02, 2 * k, place(s * r, 0.115, 0), SP.steel)
    }
  }
  // Tracejado bege envelhecido no eixo, frisos de latão junto das guias.
  for (let t = -k + 1.5; t <= k - 1.5; t += 3.2) {
    if (Math.abs(t) < 3.5) continue // travessias
    for (const s of [-1, 1]) {
      props.box(1.4, 0.012, 0.14, place(t, 0.072, s * d.ring), SP.roadLine)
      props.box(0.14, 0.012, 1.4, place(s * d.ring, 0.072, t), SP.roadLine)
    }
  }
  for (const s of [-1, 1]) {
    for (const off of [-(d.roadHalf - 0.24), d.roadHalf - 0.24]) {
      props.box(2 * k, 0.008, 0.07, place(0, 0.07, s * d.ring + off), SP.brassDark)
      props.box(0.07, 0.008, 2 * k, place(s * d.ring + off, 0.07, 0), SP.brassDark)
    }
  }
  // Bueiros com engrenagem e grelhas junto da guia.
  for (const t of [-8, 8]) {
    for (const s of [-1, 1]) {
      manhole(ctx, t, top, s * d.ring + (t > 0 ? 1.5 : -1.5))
      manhole(ctx, s * d.ring + (t > 0 ? -1.5 : 1.5), top, t)
      grate(ctx, t + 3.5, top, s * (d.ringIn + 0.3), 0)
      grate(ctx, s * (d.ringIn + 0.3), top, t - 3.5, Math.PI / 2)
    }
  }
  // Avenida oeste até o portal, com calçadas e guias dos dois lados.
  const av = d.avenue
  const avLen = av.x0 - av.x1
  slab(road, (av.x0 + av.x1) / 2, av.z, avLen + 0.5, W, top, ROAD)
  const outLen = -d.front - av.x1
  for (const s of [-1, 1]) {
    slab(pavers, (-d.front + av.x1) / 2, av.z + s * (av.half + d.sidewalk / 2), outLen, d.sidewalk, 0.075, WALK)
    props.box(avLen, 0.11, 0.14, place((av.x0 + av.x1) / 2, 0.055, av.z + s * av.half), SP.ironWarm)
    props.box(avLen, 0.008, 0.07, place((av.x0 + av.x1) / 2, 0.07, av.z + s * (av.half - 0.24)), SP.brassDark)
  }
  for (let t = av.x0 - 3; t >= av.x1 + 3; t -= 3.2) props.box(1.4, 0.012, 0.14, place(t, 0.072, av.z), SP.roadLine)
  manhole(ctx, -40, top, av.z + 1.4)
  manhole(ctx, -52, top, av.z - 1.4)
  // Faixas de pedestre: listras creme com moldura de latão (bem visíveis).
  for (const cw of c.crosswalks) {
    for (let i = -2; i <= 2; i++) {
      if (cw.axis === "z") props.box(0.55, 0.014, W - 0.7, place(cw.x + i * 1.05, 0.074, cw.z), SP.board)
      else props.box(W - 0.7, 0.014, 0.55, place(cw.x, 0.074, cw.z + i * 1.05), SP.board)
    }
    for (const s of [-1, 1]) {
      if (cw.axis === "z") props.box(0.06, 0.012, W - 0.5, place(cw.x + s * 2.95, 0.073, cw.z), SP.brass)
      else props.box(W - 0.5, 0.012, 0.06, place(cw.x, 0.073, cw.z + s * 2.95), SP.brass)
    }
  }
  // Estacionamentos: placas de ferro e linhas creme das vagas (2,6 × 5 m).
  for (const lot of c.parking) {
    const [x0, x1, z0, z1] = lot.rect
    slab(road, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0.06, LOT)
    for (const s of lot.slots) {
      for (const side of [-1.3, 1.3]) props.box(0.12, 0.012, 4.6, place(s.x + side, 0.068, s.z), SP.roadLine)
      // Batente de roda de ferro com friso de latão no fundo da vaga.
      const bx = s.x - Math.sin(s.facing) * 2.1
      const bz = s.z - Math.cos(s.facing) * 2.1
      props.box(1.6, 0.1, 0.2, place(bx, 0.11, bz, s.facing), SP.iron)
      props.box(1.4, 0.02, 0.06, place(bx, 0.17, bz, s.facing), SP.brass)
    }
  }
  const sup = c.parking.find((p) => p.id === "estacionamento-supermercado")
  if (sup) slab(road, sup.rect[0] - 2.5, sup.rect[2] + 3, 6, 6, 0.06, LOT)
  // Chão girado do hospital: pátio de lajes, pista de ferro, calçada, faixa de latão.
  for (const g of c.grounds ?? []) {
    const m = (top2: number) => place(0, top2 / 2, 0, 0, frameOf(g.x, g.z, g.rot))
    if (g.kind === "pave") pavers.box(g.w, 0.058, g.d, m(0.058), PAVE)
    else if (g.kind === "asphalt") road.box(g.w, 0.08, g.d, m(0.08), ROAD)
    else if (g.kind === "walk") pavers.box(g.w, 0.07, g.d, m(0.07), WALK)
    else props.box(g.w, 0.083, g.d, m(0.083), SP.brass)
  }
}

// ── Praça ────────────────────────────────────────────────────────────────────

export function centerPlaza(ctx: CenterCtx) {
  const { c, pavers, cobble, props } = ctx
  const P = c.plaza
  const H = P.half
  slab(cobble, 0, 0, 2 * (H + 1), 2 * (H + 1), 0.06, COBBLE_DARK)
  slab(pavers, 0, 0, 2 * H, 2 * H, 0.065, PAVE)
  // Rosa dos ventos de latão e ferro em volta do pedestal, e anéis de mosaico.
  props.ring(23.5, 0.18, flat(0, 0.066, 0), SP.brassDark, 48)
  props.ring(20.2, 0.12, flat(0, 0.066, 0), SP.iron, 44)
  props.ring(12.4, 0.14, flat(0, 0.066, 0), SP.brass, 36)
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2
    const long = k % 4 === 0
    const mid = k % 2 === 0
    const r0 = 6.4
    const r1 = long ? 11.6 : mid ? 10.4 : 8.6
    const rm = (r0 + r1) / 2
    props.box(long ? 0.16 : 0.08, 0.006, r1 - r0, place(Math.sin(a) * rm, 0.068, Math.cos(a) * rm, a), long ? SP.brass : mid ? SP.bronze : SP.iron)
  }
  // Tampas industriais redondas nas diagonais (rente ao chão).
  for (const [x, z] of [[8.6, 8.6], [-8.6, 8.6], [8.6, -8.6], [-8.6, -8.6]]) {
    props.cylinder(1.5, 0.012, place(x, 0.072, z), SP.ironWarm, 16)
    props.ring(1.42, 0.06, Matrix.Scaling(1, 0.3, 1).multiply(place(x, 0.076, z)), SP.brass, 16, 3)
    props.gear(0.42, 0.012, 10, place(x, 0.078, z), SP.bronze, SP.brassDark)
  }
  // Caminhos de paralelepípedo em cruz até as travessias, com bordas de ferro.
  const mid = (11.9 + H) / 2
  const span = H - 11.9
  for (const s of [-1, 1]) {
    slab(cobble, 0, s * mid, 3.2, span, 0.07, COBBLE)
    slab(cobble, s * mid, 0, span, 3.2, 0.07, COBBLE)
    for (const e of [-1.65, 1.65]) {
      props.box(0.1, 0.08, span, place(e, 0.04, s * mid), SP.iron)
      props.box(span, 0.08, 0.1, place(s * mid, 0.04, e), SP.iron)
    }
  }
  for (const s of P.statues ?? []) centerPedestal(ctx, s)
  // Floreiras (fecham a praça para o carro): pedra, aro de ferro, capa de latão, arbustos.
  for (const p of P.planters) {
    const f = frameOf(p.x, p.z, p.rot)
    const h = c.dims.planter.h
    const L = 2 * Math.max(p.hx, p.hz)
    const alongX = p.hx >= p.hz
    const w = 2 * p.hx
    const dd = 2 * p.hz
    props.box(w, h - 0.12, dd, place(0, (h - 0.12) / 2, 0, 0, f), SP.stoneDark)
    props.box(w + 0.06, 0.08, dd + 0.06, place(0, h - 0.08, 0, 0, f), SP.iron)
    props.box(w + 0.1, 0.04, dd + 0.1, place(0, h - 0.02, 0, 0, f), SP.brassDark)
    props.with("flat", () => {
      props.box(w - 0.16, 0.04, dd - 0.16, place(0, h + 0.01, 0, 0, f), mix(SP.earth, SP.iron, 0.3))
      // Arbustos alongados (poucas esferas esticadas): o volume de antes com um terço dos triângulos.
      const n = Math.max(1, Math.round(L / 2.1))
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n - 0.5
        const lx = alongX ? t * w : 0
        const lz = alongX ? 0 : t * dd
        const stretch: [number, number, number] = alongX ? [1.9, 0.62, 0.95] : [0.95, 0.62, 1.9]
        props.sphere(0.9, stretch, place(lx, h + 0.24, lz, 0, f), i % 2 ? SP.hedge : SP.leafDeep, 3)
      }
    })
    // Medalhão de engrenagem no meio da floreira longa, virado para a rua.
    if (L > 6) {
      const out = alongX ? (p.z > 0 ? 1 : -1) : p.x > 0 ? 1 : -1
      const ox = alongX ? 0 : out * (p.hx + 0.02)
      const oz = alongX ? out * (p.hz + 0.02) : 0
      const ry = alongX ? (out > 0 ? Math.PI : 0) : out > 0 ? -Math.PI / 2 : Math.PI / 2
      const fm = place(ox, 0, oz, 0, f).asArray()
      props.gear(0.22, 0.04, 10, facing(fm[12], (h - 0.1) / 2 + 0.02, fm[14], undefined, ry), SP.brass, SP.bronze)
    }
  }
  for (const [x, z, rot] of P.benches) steamBench(ctx, x, z, rot)
  P.lamps.forEach(([x, z], i) => steamLamp(ctx, x, z, { clock: i < 4 }))
  for (const [x, z, s] of P.trees) steamTree(ctx, x, z, s, true, "round")
  P.flowers.forEach(([x, z], i) => flowerBed(ctx, x, z, i))
}

const BLOOM: RGB[] = [
  [0.72, 0.28, 0.24],
  [0.9, 0.66, 0.24],
  [0.88, 0.84, 0.74],
  [0.52, 0.38, 0.55],
]

/** Canteiro de flores rente ao chão, com aro de ferro (sem colisão, como o antigo). */
function flowerBed(ctx: CenterCtx, x: number, z: number, seed: number) {
  const { props } = ctx
  props.ring(1.9, 0.08, Matrix.Scaling(1, 0.6, 1).multiply(place(x, 0.1, z)), SP.iron, 14, 4)
  props.with("flat", () => {
    props.cylinder(1.8, 0.04, place(x, 0.085, z), mix(SP.earth, SP.iron, 0.25), 14)
    props.sphere(0.7, [1, 0.6, 1], place(x, 0.22, z), SP.hedge, 4)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + seed
      props.sphere(0.22, [1, 0.8, 1], place(x + Math.cos(a) * 0.6, 0.2, z + Math.sin(a) * 0.6), BLOOM[(seed + i) % BLOOM.length], 3)
    }
  })
}

/**
 * Pedestal de Morkhan (só a base: a estátua é o modelo de sempre, em cima).
 * Três degraus em octógono de pedra escura, cintas de bronze, filete âmbar
 * aceso no rodapé, quatro engrenagens grandes que giram nas faces cardeais,
 * manômetro e volante nas diagonais, anel de cano de latão, lanternas nas
 * quinas do tampo e quatro saídas de vapor. Dentro do raio de sempre (a
 * colisão é a do servidor).
 */
export function centerPedestal(ctx: CenterCtx, s: StatueDef) {
  const { props, glow } = ctx
  const b = s.base
  if (b.kind !== "pedestal") return
  const d = 2 * b.r
  const P = (y: number, ry = Math.PI / 8) => place(s.x, y, s.z, ry)
  const body = b.h - 0.62
  props.cylinder(d * 1.06, 0.3, P(0.15), SP.stoneDark, 8)
  props.cylinder(d * 1.07, 0.05, P(0.32), SP.brassDark, 8)
  props.cylinder(d * 0.99, 0.12, P(0.4), SP.stone, 8)
  glow.with("flat", () => glow.cylinder(d * 0.995, 0.04, P(0.48), SP.amber, 8))
  props.cylinder(d * 0.92, body, P(0.5 + body / 2), mix(SP.stoneDark, SP.iron, 0.35), 8)
  props.cylinder(d * 0.95, 0.12, P(b.h - 0.18), SP.bronze, 8)
  props.cylinder(d * 0.98, 0.12, P(b.h - 0.06), SP.stoneLight, 8)
  props.ring(d * 0.94, 0.08, P(0.95, 0), SP.brass, 32)
  const R = (d * 0.92) / 2
  const apo = R * Math.cos(Math.PI / 8)
  for (let k = 0; k < 8; k++) {
    const phi = (k * Math.PI) / 4
    const ox = Math.cos(phi)
    const oz = Math.sin(phi)
    const ry = Math.atan2(-ox, -oz)
    const y = 0.5 + body / 2 + 0.04
    if (k % 2 === 0) {
      // Engrenagem grande com placa de ferro e parafusos de latão.
      props.cylinder(1.25, 0.05, facing(s.x + ox * (apo + 0.02), y, s.z + oz * (apo + 0.02), undefined, ry), SP.ironHi, 16)
      ctx.gears.push({ m: facing(s.x + ox * (apo + 0.08), y, s.z + oz * (apo + 0.08), undefined, ry), r: 0.5, thick: 0.08, speed: k % 4 ? 0.3 : -0.3 })
      for (const side of [-1, 1]) {
        const px = s.x + ox * (apo + 0.04) + Math.cos(phi + Math.PI / 2) * side * 0.95
        const pz = s.z + oz * (apo + 0.04) + Math.sin(phi + Math.PI / 2) * side * 0.95
        props.cylinder(0.12, 0.06, facing(px, y, pz, undefined, ry), SP.brass, 6)
      }
    } else {
      // Painel de manutenção: manômetro, volante e cano que sobe ao tampo.
      const f = place(s.x + ox * (apo + 0.02), 0, s.z + oz * (apo + 0.02), ry + Math.PI)
      props.box(1.1, 0.7, 0.05, place(0, y, 0, 0, f), SP.iron)
      gauge(ctx, -0.22, y + 0.08, -0.04, f, 1.2)
      valveWheel(ctx, 0.28, y - 0.05, -0.05, f, 0.8)
      props.pipe([[0.28, y + 0.25, -0.1], [0.28, b.h - 0.3, -0.1]], 0.05, SP.copper, SP.brass, f)
    }
  }
  // Lanternas nas quinas do tampo e saídas de vapor de cobre entre elas.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2
    postLantern(ctx, s.x + Math.cos(a) * (R - 0.35), b.h, s.z + Math.sin(a) * (R - 0.35), 0.85)
    const v = (k * Math.PI) / 2
    const vx = s.x + Math.cos(v) * (R - 0.4)
    const vz = s.z + Math.sin(v) * (R - 0.4)
    props.cylinder(0.22, 0.4, place(vx, b.h + 0.2, vz), SP.copper, 8)
    props.cylinder(0.3, 0.06, place(vx, b.h + 0.41, vz), SP.brass, 8)
    ctx.vents.push([vx, b.h + 0.46, vz])
  }
  lightPool(ctx, s.x, s.z, d * 0.85, 0.075)
}

// ── Cerca, portal e arredores ────────────────────────────────────────────────

export function centerBoundary(ctx: CenterCtx) {
  const { c, props } = ctx
  const B = c.dims.bound
  const L = 2 * B + 1
  const wall = (x: number, z: number, w: number, d: number) => boundaryWall(ctx, x, z, w, d)
  wall(0, B, L, 1)
  wall(0, -B, L, 1)
  wall(B, 0, 1, L)
  wall(-B, (B + 6) / 2 + 0.25, 1, B - 6 + 0.5)
  wall(-B, -(B + 6) / 2 - 0.25, 1, B - 6 + 0.5)
  // Arbustos do lado de fora do gradil (vegetação + grade).
  props.with("flat", () => {
    for (let t = -B + 3; t <= B - 3; t += 5.5) {
      const r = 1.0 + ((Math.round(t * 7) % 3) + 3) * 0.08
      const s: [number, number, number] = [1.7, 0.75, 1.7]
      props.sphere(2 * r, s, place(t, 0.55, B + 1.6), SP.hedge, 3)
      props.sphere(2 * r, s, place(t + 2.2, 0.55, -B - 1.6), SP.leafDeep, 3)
      props.sphere(2 * r, s, place(B + 1.6, 0.55, t + 1.1), SP.hedge, 3)
      if (Math.abs(t) > 8) props.sphere(2 * r, s, place(-B - 1.6, 0.55, t), SP.leafDeep, 3)
    }
  })
  // Portão de ferro fechado atrás do portal (a volta é pelo portal).
  for (const z of [-6, 6]) {
    props.box(0.9, 2.6, 0.9, place(-B, 1.3, z), SP.brick)
    props.box(1.05, 0.12, 1.05, place(-B, 2.66, z), SP.stoneLight)
    postLantern(ctx, -B, 2.72, z, 0.75)
  }
  props.box(0.14, 0.08, 11.2, place(-B, 2.1, 0), SP.iron)
  props.box(0.14, 0.08, 11.2, place(-B, 0.5, 0), SP.iron)
  for (let i = 0; i < 28; i++) props.panel(0.045, 1.9, place(-B, 1.3, -5.4 + i * 0.4, Math.PI / 2), SP.iron)
  props.ring(1.6, 0.06, xf(-B, 1.3, 0, 0, undefined, 0, Math.PI / 2), SP.brass, 18)
  props.gear(0.55, 0.06, 10, xf(-B - 0.05, 1.3, 0, 0, undefined, 0, Math.PI / 2), SP.brassDark, SP.bronze)
  for (const [x, z] of c.streetLamps) steamLamp(ctx, x, z)
  for (const [x, z, s] of c.streetTrees) steamTree(ctx, x, z, s)
  for (const [x, z, s] of [[-72, 30, 1.3], [-70, -60, 1.2], [30, -73, 1.3], [74, 10, 1.4], [30, 74, 1.4], [-30, 73, 1.3]] as const) {
    steamTree(ctx, x, z, s, false, undefined, false)
  }
}

/** Portal "Bairros": torres de tijolo, viga treliçada, letreiro virado para o centro e engrenagem. */
export function centerPortal(ctx: CenterCtx, uv: [number, number, number, number], boardH: number) {
  const { c, props } = ctx
  const x = c.dims.portalX - 1
  for (const z of [-5.6, 5.6]) {
    props.box(1.3, 0.5, 1.3, place(x, 0.25, z), SP.stoneDark)
    props.box(1.0, 5.4, 1.0, place(x, 3.2, z), SP.brick)
    for (const y of [1.6, 3.2, 4.8]) props.box(1.08, 0.12, 1.08, place(x, y, z), SP.iron)
    props.box(1.2, 0.18, 1.2, place(x, 5.95, z), SP.stoneLight)
    props.with("flat", () => props.sphere(0.8, [1, 0.8, 1], place(x, 6.2, z), SP.copper, 8))
    postLantern(ctx, x, 6.45, z, 0.9)
  }
  for (const y of [6.0, 6.75]) props.box(0.34, 0.18, 12.2, place(x, y, 0), SP.iron)
  for (let k = 0; k < 12; k++) {
    const z0 = -5.1 + (10.2 * k) / 12
    const z1 = -5.1 + (10.2 * (k + 1)) / 12
    props.tube([x, k % 2 ? 6.08 : 6.66, z0], [x, k % 2 ? 6.66 : 6.08, z1], 0.045, SP.ironHi, 5)
  }
  props.box(0.18, 1.2, 8.4, place(x + 0.3, 4.9, 0), SP.brassDark)
  props.box(0.2, 1.05, 8.1, place(x + 0.32, 4.9, 0), SP.iron)
  ctx.signs.quad(7.8, boardH, uv, place(x + 0.45, 4.9, 0, -Math.PI / 2))
  // Engrenagem grande que gira no alto e duas pequenas fixas.
  ctx.gears.push({ m: xf(x, 7.9, 0, 0, undefined, 0, Math.PI / 2), r: 1.05, thick: 0.14, speed: -0.35 })
  props.box(0.22, 1.0, 0.22, place(x, 7.25, 0), SP.iron)
  for (const z of [-1.4, 1.4]) props.gear(0.5, 0.1, 10, xf(x, 7.45, z, 0, undefined, 0, Math.PI / 2), SP.bronze, SP.brassDark)
}

/** Na frente de cada prédio: laje, capacho de latão e a moldura do letreiro. */
export function centerFronts(ctx: CenterCtx, cellUV: (i: number) => [number, number, number, number], boardY: number, boardH: number, boardWidth: (p: CenterPlace) => number) {
  const { c, pavers, props, signs } = ctx
  c.places.forEach((p, i) => {
    const f = frameOf(p.origin.x, p.origin.z, p.rotationY)
    pavers.box(p.model.width + 2, 0.055, 3.2, place(0, 0.0275, -1.6, 0, f), PAVE)
    props.box(Math.max(1.8, p.door.width + 0.7), 0.03, 1.5, place(p.model.doorX, 0.066, -0.8, 0, f), SP.iron)
    props.box(Math.max(1.6, p.door.width + 0.5), 0.035, 1.3, place(p.model.doorX, 0.07, -0.8, 0, f), SP.brass)
    const bw = boardWidth(p)
    // Moldura de bronze, fundo grafite, filete de latão e rosetas nas pontas.
    props.box(bw + 0.36, boardH + 0.34, 0.12, place(p.model.doorX, boardY, -0.08, 0, f), SP.bronze)
    props.box(bw + 0.16, boardH + 0.14, 0.14, place(p.model.doorX, boardY, -0.1, 0, f), SP.iron)
    for (const s of [-1, 1]) props.cylinder(0.16, 0.05, facing(p.model.doorX + s * (bw / 2 + 0.05), boardY, -0.17, f), SP.brass, 6)
    signs.quad(bw, boardH, cellUV(i), place(p.model.doorX, boardY, -0.19, 0, f))
  })
}
