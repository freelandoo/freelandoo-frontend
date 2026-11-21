// features/meu-mundo/paint/engine/arenas/usina.ts — PAINT (2026-11-21): o desenho da USINA DAS COMPORTAS (Aeryn).
//
// FICHA
// O que é:   a Fábrica de Bronze virada usina: a represa lá embaixo, a crista da barragem de concreto (a base) que
//            desce até a água com comportas soltando cachoeiras, degraus de concreto em zigue-zague, o CONDUTO
//            forçado de bronze até o meio, tanques de bronze rebitados e a casa das turbinas de pé na represa, com a
//            coroa da turbina (portais) e a roda que gira embaixo dela.
// Silhueta:  a casa das turbinas (prisma sextavado alto, janelas em fiada, chaminés), a coroa com a roda; no
//            fundo, o paredão curvo da barragem grande com vertedouros acesos, morros e torres de linha de força.
// Massas:    casa r 8 × 18 m (da água até y 8); crista r 10,5 descendo 10 m até a água; tanques r 2,8–4.
// Paleta:    concreto 0,52–0,72 cinza quente com manchas de água; bronze 0,8/0,56/0,3 com quina 1/0,8/0,5;
//            ferro 0,14–0,22; água 0,2/0,44/0,5 com espuma branca; acento: o âmbar das janelas e o azul aceso
//            das comportas (10%).
// Fora:      a água que sobe e desce (a represa é parada; só a roda da turbina, as cachoeiras e a água andam).
// Inventado: a roda da turbina à mostra embaixo da coroa e a escada de marinheiro entre os degraus.
//
// PARTES (ordem do plano)
// 1. chão de concreto (`tileTex("concrete")`) + cor por tag (crista, tanque de bronze, conduto de grade listrada)
// 2. embaixo: a REPRESA (água que anda) com espuma ao pé de tudo que toca nela
// 3. casco: TUDO daqui — barragem (crista que desce até a água), bloco de concreto (degrau, vertedouro, pátio,
//    comporta), tanque de bronze, volante
// 4. a casa das turbinas no meio (da água até o chão dela), janelas, chaminés
// 5. tags: conduto (o tubo de bronze com flanges embaixo da passarela), vertedouro (água caindo),
//    transformador (props), volante (roda com raios)
// 6. base: comportas com cachoeira no paredão da crista, guarda-corpo de bronze, transformadores
// 7. topo: a coroa da turbina e a roda que gira embaixo
// 8. fundo: paredão curvo da barragem grande, morros, torres de linha de força, galpões (`warehouse` da Gincana)
//
// Andamento (21/11, fotos no harness C:/wt/ph):
// 1–6 ok na 1ª. 7 o eixo da roda descia até o chão da casa das turbinas (de pé onde se anda, sem colidir)
// → só o toco do eixo (2ª); cano do tanque de 6 m → 3 m (não chega ao chão de baixo). 8 ok na 1ª.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { SoftGeo, at } from "../../../gincana/engine/shapes"
import { warehouse } from "../../../gincana/engine/backdrop-fabrica"
import type { RGB } from "../../../engine/geometry"
import type { Island, PaintProp } from "../../sim/map"
import { deadEdge, edgesOf } from "../arena-kit"
import type { ArenaCtx, ArenaDress } from "./types"
import { around, bgGrow, bgMark, jit, meshes, mixc, placed, rnd, seaFloor, tagOf, tileTex, v3, type Poly } from "./kit"

const CONC: RGB = [0.66, 0.64, 0.6]
const CONC_HI: RGB = [0.8, 0.78, 0.74]
const CONC_DK: RGB = [0.4, 0.39, 0.37]
const WET: RGB = [0.26, 0.3, 0.3]
const BRONZE: RGB = [0.8, 0.56, 0.3]
const BRONZE_HI: RGB = [1, 0.8, 0.5]
const BRONZE_DK: RGB = [0.42, 0.26, 0.14]
const IRON: RGB = [0.16, 0.17, 0.19]
const AMBER: RGB = [1, 0.74, 0.34]
const BLUE: RGB = [0.4, 0.86, 1]
const WATER_Y = -10

/** Parte 3 — bloco de concreto: quina clara, faixa de bronze, manchas de água escorrendo, pé escuro. */
function block(ctx: ArenaCtx, poly: Poly, isl: Island, H: number, toWater = false) {
  const O = ctx.outlineOf(isl, 1.5)
  const y = isl.y
  const bot = toWater ? WATER_Y - 0.5 : y - H
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: CONC_HI },
    { y: y - 0.12, k: 1.02, c: CONC_HI },
    { y: y - 0.3, k: 1.02, c: BRONZE },
    { y: y - 0.55, k: 1.02, c: BRONZE_DK },
    { y: y - 0.6, k: 1.0, c: CONC },
    { y: y - Math.min(3, (y - bot) * 0.4), k: toWater ? 1.08 : 1.0, c: (i) => (rnd(i * 5 + isl.id) > 0.7 ? mixc(CONC, WET, 0.45) : jit(CONC, i + isl.id, 0.05)) },
    { y: bot + 0.6, k: toWater ? 1.3 : 0.98, c: (i) => (rnd(i * 7 + isl.id) > 0.6 ? mixc(CONC_DK, WET, 0.5) : CONC_DK) },
    { y: bot, k: toWater ? 1.32 : 0.9, c: WET },
  ], isl.id)
}

/** Parte 3 — tanque de bronze: tampa, cintas de rebites, corpo que desce, perna de cano. */
function tank(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 0.7)
  const y = isl.y
  const H = 2.6 + isl.r * 1.1
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: BRONZE_HI },
    { y: y - 0.2, k: 1.05, c: BRONZE },
    { y: y - 0.5, k: 1.05, c: BRONZE_DK },
    { y: y - 0.6, k: 1.0, c: BRONZE },
    { y: y - H * 0.5, k: 1.0, c: (i) => jit(BRONZE, i + isl.id, 0.06) },
    { y: y - H * 0.5 - 0.1, k: 1.04, c: BRONZE_DK },
    { y: y - H * 0.5 - 0.4, k: 1.04, c: BRONZE },
    { y: y - H, k: 0.95, c: mixc(BRONZE, BRONZE_DK, 0.6) },
    { y: y - H - 1.2, k: 0.5, c: BRONZE_DK },
  ], isl.id)
  // rebites nas cintas
  const n = Math.round(isl.r * 5)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    for (const yy of [y - 0.35, y - H * 0.5 - 0.25]) lit.sphere(0.16, at(isl.x + Math.sin(a) * isl.r * 1.06, yy, isl.z + Math.cos(a) * isl.r * 1.06), BRONZE_HI, 4)
  }
  // o cano que desce
  lit.cylinder(0.9, 3, at(isl.x, y - H - 2.4, isl.z), IRON, 8)
  lit.torus(1.2, 0.2, at(isl.x, y - H - 1.6, isl.z), BRONZE, 10)
}

/** Parte 5 — conduto forçado: o tubo de bronze com flanges embaixo da passarela (o chão é a grade de cima). */
function penstock(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island) {
  const E = edgesOf(isl)
  let L = E[0]
  for (const e of E) if (e.len > L.len) L = e
  const ux = (L.bx - L.ax) / L.len
  const uz = (L.bz - L.az) / L.len
  let W = 0
  for (const e of E) if (e !== L && Math.abs((e.bx - e.ax) * ux + (e.bz - e.az) * uz) < 0.1) W = Math.max(W, e.len)
  const O = ctx.outlineOf(isl, 1.5)
  poly.stack(O, isl.x, isl.z, [
    { y: isl.y, k: 1, c: IRON },
    { y: isl.y - 0.3, k: 1.0, c: IRON },
  ], isl.id)
  const len = L.len + 6
  const r = W * 0.46
  const a = v3(isl.x - ux * len * 0.5, isl.y - 0.3 - r, isl.z - uz * len * 0.5)
  const b = v3(isl.x + ux * len * 0.5, isl.y - 0.3 - r, isl.z + uz * len * 0.5)
  lit.tube(a, b, r, (x, y) => (y > 0 ? mixc(BRONZE, BRONZE_HI, Math.max(0, x / r) * 0.6) : BRONZE), 18)
  const rot = Math.atan2(ux, uz)
  for (let k = 0; k <= 6; k++) {
    const t = -len / 2 + (k / 6) * len
    lit.cylinder(r * 2.24, 0.3, at(isl.x + ux * t, isl.y - 0.3 - r, isl.z + uz * t, rot, Math.PI / 2), k % 3 === 0 ? BRONZE_HI : BRONZE_DK, 18)
  }
  // apoios em V até lá embaixo
  for (const t of [-len * 0.3, len * 0.3]) {
    const px = isl.x + ux * t
    const pz = isl.z + uz * t
    lit.box(0.7, isl.y - WATER_Y, 0.7, at(px, (isl.y - 0.3 - 2 * r + WATER_Y) / 2, pz, rot), CONC_DK)
  }
}

/** Parte 5 — volante: disco de ferro com aro de bronze e raios por baixo, e o eixo que desce. */
function valve(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 0.7)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: BRONZE_HI },
    { y: y - 0.5, k: 1.04, c: BRONZE },
    { y: y - 0.6, k: 0.92, c: IRON },
    { y: y - 0.9, k: 0.2, c: IRON },
  ], isl.id)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    lit.tube(v3(isl.x, y - 0.8, isl.z), v3(isl.x + Math.sin(a) * isl.r, y - 0.5, isl.z + Math.cos(a) * isl.r), 0.18, BRONZE_DK, 5)
  }
  lit.cylinder(0.8, 8, at(isl.x, y - 4.8, isl.z), IRON, 8)
  lit.box(2.2, 2.2, 2.2, at(isl.x, y - 9, isl.z, 0.4), CONC_DK)
}

/** Parte 5/6 — transformador (props `transformer`): caixa de ferro com aletas, isoladores e luz azul. */
function transformer(lit: SoftGeo, glow: SoftGeo, p: PaintProp) {
  const w = (p.w ?? p.s) * 2
  const d = p.s * 2
  lit.box(w, p.h, d, at(p.x, p.y + p.h / 2, p.z, p.rot), (_x, y) => (y > p.h / 2 - 0.1 ? [0.36, 0.38, 0.42] : [0.2, 0.24, 0.26]))
  for (let k = 0; k < 5; k++) lit.box(0.06, p.h * 0.8, d + 0.3, at(p.x - w * 0.4 + (k * w * 0.8) / 4, p.y + p.h * 0.45, p.z, p.rot), [0.14, 0.16, 0.18])
  for (let k = 0; k < 3; k++) {
    const x = p.x - w * 0.3 + k * w * 0.3
    for (let q = 0; q < 3; q++) lit.cylinder(0.32 - q * 0.04, 0.16, at(x, p.y + p.h + 0.12 + q * 0.2, p.z), [0.7, 0.5, 0.34], 8)
    glow.sphere(0.16, at(x, p.y + p.h + 0.8, p.z), BLUE, 5)
  }
  glow.box(0.3, 0.3, 0.04, at(p.x, p.y + p.h * 0.6, p.z + d / 2 + 0.02, p.rot), [1, 0.7, 0.2])
}

/** Parte 4 — casa das turbinas: do fundo da represa ao chão do meio; janelas âmbar em fiadas, chaminés. */
function turbineHall(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, glow: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 2)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: CONC_HI },
    { y: y - 0.2, k: 1.04, c: BRONZE_HI },
    { y: y - 0.7, k: 1.04, c: BRONZE },
    { y: y - 0.8, k: 1.0, c: CONC },
    { y: WATER_Y + 2, k: 1.0, c: (i) => jit(CONC, i, 0.04) },
    { y: WATER_Y - 0.5, k: 1.06, c: WET },
  ], isl.id)
  // janelas: em cada face, 2 fiadas (a de cima acesa), pilastras entre as faces
  const n = isl.poly ? isl.poly.length / 2 : 6
  for (let i = 0; i < n; i++) {
    const ax = isl.poly![i * 2]
    const az = isl.poly![i * 2 + 1]
    const bx = isl.poly![((i + 1) % n) * 2]
    const bz = isl.poly![((i + 1) % n) * 2 + 1]
    const len = Math.hypot(bx - ax, bz - az)
    let nx = (bz - az) / len
    let nz = -(bx - ax) / len
    if (nx * ((ax + bx) / 2 - isl.x) + nz * ((az + bz) / 2 - isl.z) < 0) {
      nx = -nx
      nz = -nz
    }
    const ang = Math.atan2(nx, nz)
    const cols = 3
    for (let c = 0; c < cols; c++) {
      const t = (c + 0.5) / cols
      const x = ax + (bx - ax) * t + nx * 0.03
      const z = az + (bz - az) * t + nz * 0.03
      for (const [yy, on] of [[y - 3.2, true], [y - 7.6, (i + c) % 3 !== 0]] as const) {
        if (on) glow.box(1.4, 2.8, 0.06, at(x, yy, z, ang), (_x, q) => mixc([1, 0.56, 0.18], AMBER, q / 2.8 + 0.5))
        else lit.box(1.4, 2.8, 0.06, at(x, yy, z, ang), [0.08, 0.09, 0.1])
        lit.box(1.7, 0.2, 0.3, at(x, yy - 1.5, z, ang), CONC_HI)
        lit.box(0.1, 2.8, 0.12, at(x, yy, z, ang), IRON)
      }
    }
    lit.box(0.7, y - WATER_Y, 0.7, at(ax + nx * 0.1, (y + WATER_Y) / 2, az + nz * 0.1, ang), CONC_DK)
    // portão das comportas na água, com a luz azul
    if (i % 2 === 0) {
      const mx = (ax + bx) / 2 + nx * 0.05
      const mz = (az + bz) / 2 + nz * 0.05
      lit.box(len * 0.5, 3.2, 0.3, at(mx, WATER_Y + 1.8, mz, ang), IRON)
      glow.box(len * 0.46, 0.4, 0.06, at(mx + nx * 0.2, WATER_Y + 3.6, mz + nz * 0.2, ang), BLUE)
      ctx.falls.push({ x: mx, z: mz, y: WATER_Y + 3.2, len: 3.4, w: len * 0.4, a: ang })
    }
  }
}

/** Parte 6 — guarda-corpo de bronze nas bordas mortas (onde não se pula). */
function railing(ctx: ArenaCtx, lit: SoftGeo, isl: Island) {
  for (const e of edgesOf(isl)) {
    const mx = (e.ax + e.bx) / 2
    const mz = (e.az + e.bz) / 2
    if (e.len < 2 || !deadEdge(ctx.map, isl, mx, mz, e.nx, e.nz)) continue
    const steps = Math.max(1, Math.round(e.len / 1.6))
    let prev: { x: number; z: number } | null = null
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = e.ax + (e.bx - e.ax) * t - e.nx * 0.2
      const z = e.az + (e.bz - e.az) * t - e.nz * 0.2
      const ok = ctx.clear.free(x, isl.y, z, 0.35)
      if (ok) lit.cylinder(0.1, 1.05, at(x, isl.y + 0.52, z), BRONZE_DK, 6)
      if (ok && prev) lit.tube(v3(prev.x, isl.y + 1.05, prev.z), v3(x, isl.y + 1.05, z), 0.06, BRONZE, 6)
      prev = ok ? { x, z } : null
    }
  }
}

/** Parte 7 — coroa da turbina: borda de bronze, cone até a roda; a roda de pás que gira embaixo. */
function crown(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island, spin: Mesh[]) {
  // o chão de baixo (a casa das turbinas) fica 17 m abaixo: nada daqui desce até ele
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: BRONZE_HI },
    { y: y - 0.3, k: 1.05, c: BRONZE },
    { y: y - 0.9, k: 1.05, c: BRONZE_DK },
    { y: y - 1.0, k: 0.94, c: IRON },
    { y: y - 2.6, k: 0.42, c: IRON },
    { y: y - 3, k: 0.3, c: BRONZE_DK },
  ], isl.id)
  // a roda (Francis): aro, pás curvas, cubo — gira em volta de y
  const g = new SoftGeo()
  const R = isl.r * 0.9
  g.torus(R * 2, 0.3, Matrix.Identity(), BRONZE, 28)
  g.torus(R * 0.9, 0.22, Matrix.Translation(0, -1.2, 0), BRONZE_DK, 20)
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    g.box(0.12, 1.4, R * 0.6, at(Math.sin(a) * R * 0.72, -0.6, Math.cos(a) * R * 0.72, a + 0.5, 0.3), BRONZE_HI)
  }
  g.cylinder(1.4, 2.4, Matrix.Translation(0, -0.6, 0), IRON, 10, 0.8)
  const m = g.build(`paint-usina-runner`, ctx.scene, ctx.solidMat, false)
  m.position.set(isl.x, y - 4.2, isl.z)
  ctx.add(m)
  spin.push(m)
  // (sem eixo até a casa das turbinas: ele ficaria de pé no chão do meio, onde se anda, sem colidir)
  lit.cylinder(0.7, 1.6, at(isl.x, y - 6.2, isl.z), IRON, 10)
}

/** Parte 8 — torre de linha de força: treliça de 4 pernas que afinam, braços, isoladores. */
function pylon(lit: SoftGeo, x: number, y0: number, z: number, h: number, rot: number) {
  const P = (u: number, y: number, v: number) => v3(x + u * Math.cos(rot) + v * Math.sin(rot), y, z - u * Math.sin(rot) + v * Math.cos(rot))
  const leg = (u: number, v: number) => {
    lit.tube(P(u * 3, y0, v * 3), P(u * 0.7, y0 + h, v * 0.7), 0.18, [0.5, 0.52, 0.56], 4)
  }
  leg(-1, -1)
  leg(1, -1)
  leg(1, 1)
  leg(-1, 1)
  for (let k = 1; k < 5; k++) {
    const t = k / 5
    const s = 3 * (1 - t) + 0.7 * t
    const yy = y0 + h * t
    lit.tube(P(-s, yy, -s), P(s, yy, -s), 0.1, [0.42, 0.44, 0.48], 3)
    lit.tube(P(-s, yy, s), P(s, yy, s), 0.1, [0.42, 0.44, 0.48], 3)
  }
  for (const yy of [y0 + h * 0.72, y0 + h * 0.9]) lit.tube(P(-5, yy, 0), P(5, yy, 0), 0.16, [0.5, 0.52, 0.56], 4)
}

/** Parte 2 — a represa: água verde-azulada com reflexos e ondinhas (anda no tick). */
function waterPaint(g: CanvasRenderingContext2D, S: number) {
  g.fillStyle = "rgb(52,112,128)"
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = i % 3 ? "rgba(150,210,220,0.45)" : "rgba(20,60,74,0.5)"
    g.lineWidth = 1.5 + rnd(i) * 2
    g.beginPath()
    const x = rnd(i * 5 + 3) * S
    const y = rnd(i * 7 + 4) * S
    const L = 10 + rnd(i * 3) * 30
    g.moveTo(x, y)
    g.quadraticCurveTo(x + L / 2, y - 4, x + L, y)
    g.stroke()
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle = "rgba(230,250,255,0.6)"
    g.fillRect(rnd(i * 11) * S, rnd(i * 13) * S, 3 + rnd(i) * 5, 1.4)
  }
}

export const USINA_DRESS: ArenaDress = {
  topTex: (scene) => tileTex(scene, "concrete"),
  under: () => "none",
  colors: (isl) => {
    const t = tagOf(isl)
    if (t === "tank" || t === "valve" || t === "turbinecrown") return { top: BRONZE, rim: BRONZE_HI }
    if (t === "penstock") return { top: [0.4, 0.42, 0.44], rim: [0.9, 0.7, 0.2], stripes: true }
    if (t === "crest") return { top: [0.74, 0.72, 0.68], rim: BRONZE }
    return { top: [0.7, 0.68, 0.64], rim: CONC_HI }
  },
  frame: { band: CONC_DK, corbel: CONC },
  gate: { stone: [0.72, 0.7, 0.66], tech: true },
  prop: (p) => p.tag === "transformer",
  build(ctx) {
    const { lit, glow, poly, done } = meshes(ctx, "usina")
    const sea = seaFloor(ctx, "usina", WATER_Y, 520, 40, waterPaint, [0.8, 0.95, 1], [0.12, 0.22, 0.26], 0.012)
    for (const p of ctx.map.props) if (p.tag === "transformer") transformer(lit, glow, p)
    const spin: Mesh[] = []
    for (const isl of ctx.map.islands) {
      const t = tagOf(isl)
      if (t === "crest") {
        // a barragem: a crista desce até a água; comportas com cachoeira na face de fora
        block(ctx, poly, isl, 0, true)
        const ox = Math.sign(isl.x) || -1
        for (const dz of [-5, 0, 5]) {
          const x = isl.x + ox * (isl.r * 1.02 + 0.2 + (isl.y - WATER_Y) * 0.15)
          lit.box(0.4, 3, 3.2, at(x, isl.y - 3, isl.z + dz), IRON)
          glow.box(0.08, 0.3, 3, at(x + ox * 0.22, isl.y - 1.4, isl.z + dz), BLUE)
          ctx.falls.push({ x: x + ox * 0.3, z: isl.z + dz, y: isl.y - 4.4, len: isl.y - 4.4 - WATER_Y, w: 2.6, a: ox > 0 ? Math.PI / 2 : -Math.PI / 2 })
        }
        railing(ctx, lit, isl)
      } else if (t === "damstep" || t === "yard" || t === "sluice") {
        block(ctx, poly, isl, t === "damstep" ? 2.6 : 3.4)
        railing(ctx, lit, isl)
      } else if (t === "spillway") {
        block(ctx, poly, isl, 2.4)
        // a água que escorre pela ponta de fora
        const e = edgesOf(isl).reduce((a, b) => (Math.hypot((b.ax + b.bx) / 2, (b.az + b.bz) / 2) > Math.hypot((a.ax + a.bx) / 2, (a.az + a.bz) / 2) ? b : a))
        const mx = (e.ax + e.bx) / 2
        const mz = (e.az + e.bz) / 2
        ctx.falls.push({ x: mx, z: mz, y: isl.y - 0.6, len: isl.y - 0.6 - WATER_Y, w: Math.min(3, e.len * 0.7), a: Math.atan2(e.nx, e.nz) })
      } else if (t === "tank") tank(ctx, poly, lit, isl)
      else if (t === "penstock") penstock(ctx, poly, lit, isl)
      else if (t === "valve") valve(ctx, poly, lit, isl)
      else if (t === "turbinehall") turbineHall(ctx, poly, lit, glow, isl)
      else if (t === "turbinecrown") crown(ctx, poly, lit, isl, spin)
    }
    // 8. fundo: paredão curvo da barragem grande ao sul, morros, torres de força, galpões
    const bg = bgMark([lit, glow])
    const skipN = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.22
    const n = Math.min(1, ctx.n)
    {
      const R = 150
      const H = 56
      const N = 26
      for (let k = 0; k < N; k++) {
        const a = Math.PI * 0.62 + (k / (N - 1)) * Math.PI * 0.76
        const x = Math.sin(a) * R
        const z = Math.cos(a) * R
        const w = (R * Math.PI * 0.76) / (N - 1) + 0.6
        lit.box(w, H, 10, at(x, WATER_Y + H / 2 - 1, z, a), (_x, y) => (y > H / 2 - 1 ? CONC_HI : y < -H / 2 + 6 ? mixc(CONC_DK, WET, 0.6) : jit(CONC, k, 0.05)))
        lit.box(w + 0.2, 1.2, 11, at(x, WATER_Y + H, z, a), BRONZE)
        if (k % 4 === 1) {
          // vertedouro aceso descendo a face
          glow.box(w * 0.6, H - 4, 0.3, at(x - Math.sin(a) * 5.2, WATER_Y + H / 2 - 2, z - Math.cos(a) * 5.2, a), (_x, y) => mixc([0.5, 0.8, 0.9], [0.95, 1, 1], Math.abs(Math.sin(y * 1.7)) > 0.6 ? 0.8 : 0.2))
          glow.sphere(w * 1.4, at(x - Math.sin(a) * 7, WATER_Y + 0.5, z - Math.cos(a) * 7), [0.92, 0.98, 1], 5, 1, 0.3, 1)
        } else if (k % 4 === 3) {
          lit.box(w * 0.6, 6, 2, at(x - Math.sin(a) * 5.4, WATER_Y + H - 6, z - Math.cos(a) * 5.4, a), IRON)
          glow.box(w * 0.5, 0.5, 0.2, at(x - Math.sin(a) * 6.5, WATER_Y + H - 3, z - Math.cos(a) * 6.5, a), AMBER)
        }
      }
    }
    for (const s of around(Math.round(16 * n), 170, 230, 41, skipN)) {
      const r = 30 + rnd(s.i) * 30
      lit.sphere(r * 2, at(s.x, WATER_Y - r * 0.3, s.z), (_x, y) => (y > r * 0.5 ? [0.36, 0.5, 0.3] : [0.26, 0.38, 0.24]), 8, 1, 0.55, 1)
      if (s.i % 2 === 0) pylon(lit, s.x * 0.92, WATER_Y + r * 0.5, s.z * 0.92, 26, s.a)
    }
    for (const s of around(Math.round(8 * n), 80, 110, 42, (a) => skipN(a) || Math.cos(a) < -0.3)) {
      lit.box(18, 4, 14, at(s.x, WATER_Y + 1, s.z, s.a), CONC_DK)
      // o galpão nasce no nível 0: desce para cima do cais
      placed([lit, glow], Matrix.Translation(0, WATER_Y + 3, 0), () => warehouse(lit, glow, s.x, s.z, 14 + rnd(s.i) * 6, 7 + rnd(s.i * 3) * 4, 8, s.a + Math.PI, s.i))
    }
    bgGrow([lit, glow], bg, WATER_Y)
    done()
    return {
      tick(dt, clock) {
        sea.tick(dt)
        for (const m of spin) m.rotation.y = clock * 1.4
      },
    }
  },
}
