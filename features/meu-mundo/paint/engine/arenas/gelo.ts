// features/meu-mundo/paint/engine/arenas/gelo.ts — PAINT (2026-11-21): o desenho do FAROL DO MAR DE GELO (Marú).
//
// FICHA
// O que é:   o mar congelado de Marú em fim de tarde frio: banquisas e icebergs flutuando acima do mar de gelo
//            rachado, navios presos no gelo (convés e proa), e no meio o FAROL listrado de vermelho e branco com
//            blocos de gelo presos nas faces subindo até a galeria da lanterna (os portais).
// Silhueta:  farol (cilindro listrado com a lanterna acesa e a galeria), mastro da proa com verga e cordame;
//            no fundo, penhascos de gelo serrilhados, o castelo de gelo e a aurora.
// Massas:    farol r 3,4 × 23 m; banquisas 3–10 m; penhascos 30–60 m de largura.
// Paleta:    gelo azul-fundo 0,1/0,28/0,56 → ciano 0,48/0,8/0,98 → claro 0,86/0,97/1 → neve; casco preto e
//            vermelho-ferrugem; madeira do convés 0,55/0,38/0,25; o acento é o vermelho do farol e o âmbar da luz.
// Fora:      o mar que mexe (aqui o gelo é parado; só os fachos do farol giram e a aurora ondula).
// Inventado: a lanterna entre o topo da torre e a galeria (é ela que segura a galeria).
//
// PARTES (ordem do plano)
// 1. chão de gelo (`tileTex("ice")`) + cor por tag (convés de madeira, bloco de gelo claro, galeria de chapa)
// 2. embaixo: o MAR DE GELO rachado (disco com textura) com canais de água escura
// 3. casco: banquisas e icebergs = rocha comum na paleta do gelo; navios, boia, blocos e galeria = daqui
// 4. o farol (prop `lighthouse`): faixas vermelho/branco, janelas, porta, lanterna acesa, fachos que giram
// 5. tags: convés (casco preto/vermelho preso num bloco de gelo, vigias), proa (mastro com verga e cordame),
//    boia (corpo listrado, gaiola, luz), bloco de gelo (claro, com fendas acesas)
// 6. base: buraco de pesca, barris, poste de luz âmbar (`icePost` da Gincana)
// 7. topo: a galeria com o guarda-corpo vermelho
// 8. fundo: penhascos de gelo em anel, castelo de gelo, navios presos ao longe, aurora
//
// Andamento (21/11, fotos no harness C:/wt/ph):
// 1–5 ok na 1ª. 2 mar: rachadura em estrela repetindo → placas maiores e canais finos (2ª). 4 fachos opacos
// → aditivos e finos (3ª). 6 base: caixote e barris no meio do chão, perto do nascimento → só na meia-lua
// de fora (2ª). 8 aurora: tábuas escuras → faixa aditiva de frente para o centro (4ª).

import { Constants } from "@babylonjs/core/Engines/constants"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SoftGeo, at } from "../../../gincana/engine/shapes"
import { glacierCliff, iceCastle, icePost } from "../../../gincana/engine/backdrop-gelo"
import type { RGB } from "../../../engine/geometry"
import type { Island, PaintProp } from "../../sim/map"
import { edgesOf } from "../arena-kit"
import type { ArenaCtx, ArenaDress } from "./types"
import { around, bgGrow, bgGrowMesh, bgMark, jit, meshes, mixc, mulc, placed, rnd, seaFloor, tagOf, tileTex, v3, type Poly } from "./kit"

const DEEP: RGB = [0.1, 0.28, 0.56]
const CYAN: RGB = [0.48, 0.8, 0.98]
const PALE: RGB = [0.86, 0.97, 1]
const SNOW: RGB = [0.95, 0.98, 1]
const HULL: RGB = [0.1, 0.1, 0.13]
const RUST: RGB = [0.56, 0.16, 0.12]
const DECK: RGB = [0.58, 0.4, 0.26]
const DECK_DK: RGB = [0.3, 0.2, 0.14]
const RED: RGB = [0.82, 0.16, 0.14]
const WHITE: RGB = [0.94, 0.94, 0.92]
const AMBER: RGB = [1, 0.8, 0.42]
const SEA_Y = -16

/** Parte 5 — navio preso: casco preto com a faixa vermelha embaixo, amurada, vigias, preso num bloco de gelo. */
function hull(ctx: ArenaCtx, poly: Poly, isl: Island) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: DECK_DK },
    { y: y - 0.25, k: 1.04, c: RUST },
    { y: y - 0.55, k: 1.04, c: mulc(RUST, 0.7) },
    { y: y - 0.65, k: 1.02, c: HULL },
    { y: y - 1.9, k: 0.98, c: mixc(HULL, [0.2, 0.22, 0.28], 0.5) },
    { y: y - 2.0, k: 0.96, c: RUST },
    { y: y - 3.0, k: 0.82, c: mulc(RUST, 0.75) },
    { y: y - 3.6, k: 0.5, c: mulc(RUST, 0.5) },
  ], isl.id)
  // o gelo que prende o casco: um bloco largo e torto da linha d'água para baixo
  poly.stack(O, isl.x, isl.z, [
    { y: y - 2.3, k: 1.18, c: SNOW, j: 0.08 },
    { y: y - 2.7, k: 1.26, c: PALE, j: 0.1 },
    { y: y - 4.4, k: 1.1, c: CYAN, j: 0.12 },
    { y: y - 7.5, k: 0.55, c: DEEP, j: 0.15 },
    { y: y - 10, k: 0.08, c: mulc(DEEP, 0.6) },
  ], isl.id + 50)
  // vigias acesas no costado (uma a cada ~1,8 m) e a tábua do convés em faixas
  for (const e of edgesOf(isl)) {
    if (e.len < 3) continue
    const n = Math.floor(e.len / 1.8)
    const ang = Math.atan2(e.bx - e.ax, e.bz - e.az) + Math.PI / 2
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n
      const x = e.ax + (e.bx - e.ax) * t + e.nx * 0.03
      const z = e.az + (e.bz - e.az) * t + e.nz * 0.03
      ctx.glow.cylinder(0.34, 0.06, Matrix.RotationX(Math.PI / 2).multiply(Matrix.RotationY(ang)).multiply(Matrix.Translation(x, y - 1.2, z)), AMBER, 8)
    }
  }
}

/** Parte 5 — tábuas do convés por cima do chão (o chão é de gelo; o convés é de madeira). */
function deckBoards(poly: Poly, isl: Island) {
  const E = edgesOf(isl)
  let L = E[0]
  for (const e of E) if (e.len > L.len) L = e
  const ux = (L.bx - L.ax) / L.len
  const uz = (L.bz - L.az) / L.len
  let W = 0
  for (const e of E) if (e !== L && Math.abs((e.bx - e.ax) * ux + (e.bz - e.az) * uz) < 0.1) W = Math.max(W, e.len)
  const rows = Math.round(W / 0.5)
  for (let r = 0; r < rows; r++) {
    const t = -W / 2 + (r + 0.5) * (W / rows)
    const c = jit(DECK, r * 7 + isl.id, 0.1)
    const ox = -uz * t
    const oz = ux * t
    poly.box(isl.x + ox, isl.y - 0.1, isl.z + oz, L.len / 2 - 0.12, 0.115, W / rows / 2 - 0.03, Math.atan2(-uz, ux), mixc(c, [0.85, 0.7, 0.5], 0.15), c, DECK_DK)
  }
}

/** Parte 5 — bloco de gelo claro com fendas acesas por dentro. */
function iceBlock(ctx: ArenaCtx, poly: Poly, glow: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: PALE },
    { y: y - 0.2, k: 1.03, c: SNOW },
    { y: y - 0.5, k: 1.03, c: PALE },
    { y: y - 1.8, k: 1.0, c: CYAN, j: 0.03 },
    { y: y - 2.6, k: 0.86, c: mixc(CYAN, DEEP, 0.5), j: 0.06 },
    { y: y - 3.8, k: 0.36, c: DEEP, j: 0.12 },
  ], isl.id)
  for (let k = 0; k < 3; k++) {
    const a = rnd(isl.id * 7 + k) * Math.PI * 2
    const pt = ctx.edgePoint(isl, a, 0)
    glow.box(0.08, 1.2 + rnd(k + isl.id) * 0.8, 0.04, at(pt.x, y - 1.2, pt.z, a + 1.2, 0, (rnd(k * 3 + isl.id) - 0.5) * 0.8), mixc([0.4, 0.85, 1], [0.85, 1, 1], rnd(k)))
  }
}

/** Parte 5 — boia: corpo listrado embaixo, gaiola e a luz âmbar num canto. */
function buoy(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, glow: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 0.8)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: RED },
    { y: y - 0.3, k: 1.05, c: WHITE },
    { y: y - 1.1, k: 1.0, c: WHITE },
    { y: y - 1.2, k: 0.98, c: RED },
    { y: y - 2.2, k: 0.9, c: RED },
    { y: y - 2.3, k: 0.86, c: WHITE },
    { y: y - 3.3, k: 0.5, c: mulc(RED, 0.6) },
    { y: y - 4.6, k: 0.08, c: HULL },
  ], isl.id)
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2 + Math.PI / 4
    const pt = ctx.edgePoint(isl, a, 0)
    const x = isl.x + (pt.x - isl.x) * 0.85
    const z = isl.z + (pt.z - isl.z) * 0.85
    if (!ctx.clear.free(x, y, z, 0.5)) continue
    lit.box(0.12, 1.6, 0.12, at(x, y + 0.8, z), HULL)
    glow.sphere(0.5, at(x, y + 1.8, z), AMBER, 6)
  }
}

/** Parte 4 — o farol: faixas vermelho/branco, janelas, porta, lanterna acesa (segura a galeria). */
function lighthouse(ctx: ArenaCtx, poly: Poly, glow: SoftGeo, lit: SoftGeo, p: PaintProp, galleryY: number) {
  const R = p.s * 1.02
  const n = 20
  const O: [number, number][] = []
  for (let i = 0; i < n; i++) O.push([p.x + Math.sin((i / n) * Math.PI * 2) * R, p.z + Math.cos((i / n) * Math.PI * 2) * R])
  const top = p.y + p.h
  const band = 3.2
  let k = 0
  for (let y = top; y > p.y - 0.5; y -= band, k++) {
    const c = k % 2 ? RED : WHITE
    const yb = Math.max(p.y - 0.5, y - band)
    poly.stack(O, p.x, p.z, [
      { y, k: 0.985, c: mixc(c, [1, 1, 1], 0.2) },
      { y: y - 0.12, k: 1, c },
      { y: yb + 0.1, k: 1, c: (i) => jit(mulc(c, 0.9), k * 31 + i, 0.04) },
    ], k)
  }
  // colar de pedra no pé, porta e janelinhas acesas em espiral
  poly.stack(O, p.x, p.z, [
    { y: p.y + 1.2, k: 1.08, c: [0.5, 0.52, 0.58] },
    { y: p.y - 0.6, k: 1.12, c: [0.3, 0.32, 0.38] },
  ], 9)
  for (let w = 0; w < 6; w++) {
    const a = w * 2.1 + 0.6
    const y = p.y + 4 + w * 2.6
    if (y > top - 1) break
    const m = Matrix.RotationY(a).multiply(Matrix.Translation(p.x + Math.sin(a) * (R + 0.02), y, p.z + Math.cos(a) * (R + 0.02)))
    glow.box(0.6, 1, 0.06, m, AMBER)
    lit.box(0.8, 0.14, 0.2, at(p.x + Math.sin(a) * (R + 0.05), y - 0.56, p.z + Math.cos(a) * (R + 0.05), a), HULL)
  }
  // a lanterna: do topo da torre até embaixo da galeria — vidro aceso com montantes escuros
  const ly0 = top
  const ly1 = galleryY - 0.5
  glow.cylinder(R * 1.6, ly1 - ly0, at(p.x, (ly0 + ly1) / 2, p.z), (_x, y) => mixc(AMBER, [1, 1, 0.86], y / (ly1 - ly0) + 0.5), 16, R * 1.6)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    lit.box(0.22, ly1 - ly0, 0.22, at(p.x + Math.sin(a) * R * 0.82, (ly0 + ly1) / 2, p.z + Math.cos(a) * R * 0.82, a), HULL)
  }
  lit.cylinder(R * 2.1, 0.5, at(p.x, ly0 - 0.1, p.z), HULL, 20)
  // fachos que giram (cone transparente)
  const beam = new SoftGeo()
  for (const s of [0, Math.PI]) beam.cylinder(0.5, 46, Matrix.Translation(0, 23, 0).multiply(Matrix.RotationX(Math.PI / 2 - 0.06)).multiply(Matrix.RotationY(s)), [1, 0.92, 0.7], 10, 7)
  const bm = beam.build("paint-gelo-beam", ctx.scene, ctx.own(new StandardMaterial("paint-gelo-beam", ctx.scene)), false)
  const mat = bm.material as StandardMaterial
  mat.disableLighting = true
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.alphaMode = Constants.ALPHA_ADD
  mat.alpha = 0.06
  mat.backFaceCulling = false
  bm.position.set(p.x, (ly0 + ly1) / 2, p.z)
  ctx.add(bm)
  return bm
}

/** Parte 7 — galeria: laje de chapa com borda vermelha e guarda-corpo (só onde não tapa portal). */
function gallery(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 1)
  poly.stack(O, isl.x, isl.z, [
    { y: isl.y, k: 1, c: RED },
    { y: isl.y - 0.5, k: 1.02, c: RED },
    { y: isl.y - 0.6, k: 0.96, c: HULL },
    { y: isl.y - 1.2, k: 0.7, c: HULL },
  ], isl.id)
  const n = 26
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const pt = ctx.edgePoint(isl, a, 0)
    const x = isl.x + (pt.x - isl.x) * 0.97
    const z = isl.z + (pt.z - isl.z) * 0.97
    if (!ctx.clear.free(x, isl.y, z, 0.2)) continue
    lit.box(0.1, 1.1, 0.1, at(x, isl.y + 0.55, z), HULL)
    const pt2 = ctx.edgePoint(isl, ((i + 1) / n) * Math.PI * 2, 0)
    const x2 = isl.x + (pt2.x - isl.x) * 0.97
    const z2 = isl.z + (pt2.z - isl.z) * 0.97
    if (ctx.clear.free(x2, isl.y, z2, 0.2)) lit.tube(v3(x, isl.y + 1.1, z), v3(x2, isl.y + 1.1, z2), 0.06, RED, 5)
  }
}

/** Parte 5 — mastro da proa: verga, cordame até as bordas e bandeira de Marú. */
function mast(lit: SoftGeo, glow: SoftGeo, p: PaintProp) {
  const top = p.y + p.h
  lit.cylinder(p.s * 2, p.h + 0.4, at(p.x, p.y + p.h / 2, p.z), (_x, y) => mixc(DECK_DK, DECK, y / p.h + 0.5), 8, p.s * 1.4)
  lit.box(4.6, 0.2, 0.2, at(p.x, top - 1.6, p.z), DECK_DK)
  lit.box(3.2, 0.16, 0.16, at(p.x, top - 3.6, p.z), DECK_DK)
  // vela enrolada na verga e a bandeira
  lit.cylinder(0.4, 4.2, at(p.x, top - 1.35, p.z, 0, 0, Math.PI / 2), [0.86, 0.84, 0.78], 8)
  lit.box(1.4, 0.8, 0.04, at(p.x + 0.72, top - 0.2, p.z), (_x, y) => (y > 0.1 ? [0.2, 0.5, 0.86] : SNOW))
  for (const s of [-1, 1]) {
    lit.tube(v3(p.x + s * 2.3, top - 1.6, p.z), v3(p.x + s * 2.8, p.y + 0.2, p.z + 1.8), 0.03, [0.7, 0.66, 0.56], 3)
    lit.tube(v3(p.x + s * 2.3, top - 1.6, p.z), v3(p.x + s * 2.8, p.y + 0.2, p.z - 1.8), 0.03, [0.7, 0.66, 0.56], 3)
  }
  glow.sphere(0.3, at(p.x, top + 0.3, p.z), AMBER, 6)
}

/** Parte 6 — base: buraco de pesca com a água escura, barris e o poste âmbar. */
function basePostcard(ctx: ArenaCtx, lit: SoftGeo, glow: SoftGeo, isl: Island) {
  const spots: { x: number; z: number }[] = []
  // só na meia-lua de FORA (longe do caminho do meio) e junto da borda: nada disso colide
  const out = Math.atan2(Math.sign(isl.x) || -1, 0)
  for (let t = 0; t < 40 && spots.length < 4; t++) {
    const a = out + (rnd(isl.id * 41 + t) - 0.5) * Math.PI * 0.9
    const d = isl.r * (0.78 + rnd(t * 3 + 1) * 0.1)
    const x = isl.x + Math.sin(a) * d
    const z = isl.z + Math.cos(a) * d
    if (!ctx.clear.free(x, isl.y, z, 1.4)) continue
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3)) continue
    spots.push({ x, z })
  }
  const [hole, barrels, post, crate] = spots
  if (hole) {
    lit.torus(2.2, 0.5, at(hole.x, isl.y + 0.08, hole.z), SNOW, 14)
    glow.cylinder(1.9, 0.02, at(hole.x, isl.y + 0.03, hole.z), [0.08, 0.26, 0.42], 14)
  }
  if (barrels)
    for (let b = 0; b < 3; b++) {
      const x = barrels.x + (b - 1) * 0.75
      lit.cylinder(0.7, 1, at(x, isl.y + 0.5, barrels.z + (b % 2) * 0.4, b), (_x, y) => (Math.abs(y) > 0.4 || Math.abs(y) < 0.06 ? HULL : jit(RUST, b + 3)), 10)
      lit.cylinder(0.72, 0.1, at(x, isl.y + 1.02, barrels.z + (b % 2) * 0.4), SNOW, 10)
    }
  if (post) placed([lit, glow], Matrix.Translation(0, isl.y, 0), () => icePost(lit, glow, post.x, post.z, 3.2))
  if (crate) {
    lit.box(1.2, 1, 1.2, at(crate.x, isl.y + 0.5, crate.z, 0.4), DECK)
    lit.box(1.24, 0.12, 1.24, at(crate.x, isl.y + 1.02, crate.z, 0.4), SNOW)
  }
}

/** Parte 2 — o mar de gelo: placas brancas e azuis com rachaduras e canais de água escura. */
function seaPaint(g: CanvasRenderingContext2D, S: number) {
  g.fillStyle = "rgb(200,228,246)"
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 70; i++) {
    g.fillStyle = i % 4 === 0 ? "rgb(150,196,232)" : i % 3 ? "rgb(226,242,252)" : "rgb(186,216,240)"
    g.beginPath()
    const x = rnd(i * 5 + 1) * S
    const y = rnd(i * 7 + 2) * S
    const r = 12 + rnd(i * 3) * 30
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      const rr = r * (0.7 + rnd(i * 11 + k) * 0.5)
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.fill()
  }
  g.strokeStyle = "rgba(40,90,140,0.7)"
  g.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    let x = rnd(i * 13) * S
    let y = rnd(i * 17) * S
    g.moveTo(x, y)
    for (let k = 0; k < 8; k++) {
      x += (rnd(i * 19 + k) - 0.5) * 70
      y += (rnd(i * 23 + k) - 0.5) * 70
      g.lineTo(x, y)
    }
    g.stroke()
  }
  g.strokeStyle = "rgba(255,255,255,0.8)"
  g.lineWidth = 1
  for (let i = 0; i < 14; i++) {
    g.beginPath()
    const x = rnd(i * 29) * S
    const y = rnd(i * 31) * S
    g.moveTo(x, y)
    g.lineTo(x + (rnd(i) - 0.5) * 40, y + (rnd(i + 1) - 0.5) * 40)
    g.stroke()
  }
}

export const GELO_DRESS: ArenaDress = {
  topTex: (scene) => tileTex(scene, "ice"),
  under: (isl) => {
    const t = tagOf(isl)
    return t === "deck" || t === "bow" || t === "buoy" || t === "iceblock" || t === "gallery" ? "none" : undefined
  },
  colors: (isl) => {
    const t = tagOf(isl)
    if (t === "deck" || t === "bow") return { top: DECK, rim: RUST }
    if (t === "iceblock") return { top: [0.84, 0.95, 1], rim: [0.6, 0.86, 1] }
    if (t === "gallery") return { top: [0.6, 0.62, 0.68], rim: RED, stripes: false }
    if (t === "buoy") return { top: [0.9, 0.3, 0.26], rim: WHITE }
    return { top: [0.92, 0.97, 1], rim: [0.7, 0.88, 0.98] }
  },
  frame: { band: [0.7, 0.86, 0.96], corbel: [0.5, 0.72, 0.9] },
  gate: { stone: [0.8, 0.9, 0.98], tech: false },
  prop: (p) => p.tag === "lighthouse" || p.tag === "mast",
  build(ctx) {
    const { lit, glow, poly, done } = meshes(ctx, "gelo")
    const sea = seaFloor(ctx, "gelo", SEA_Y, 520, 22, seaPaint, [0.95, 0.98, 1], [0.32, 0.38, 0.46])
    const gal = ctx.map.islands.find((i) => tagOf(i) === "gallery")
    let beam: ReturnType<typeof lighthouse> | null = null
    for (const p of ctx.map.props) {
      if (p.tag === "lighthouse") beam = lighthouse(ctx, poly, glow, lit, p, gal ? gal.y : p.y + p.h + 3)
      if (p.tag === "mast") mast(lit, glow, p)
    }
    for (const isl of ctx.map.islands) {
      const t = tagOf(isl)
      if (t === "deck" || t === "bow") {
        hull(ctx, poly, isl)
        deckBoards(poly, isl)
      } else if (t === "iceblock") iceBlock(ctx, poly, glow, isl)
      else if (t === "buoy") buoy(ctx, poly, lit, glow, isl)
      else if (t === "gallery") gallery(ctx, poly, lit, isl)
      if (isl.kind === "base") basePostcard(ctx, lit, glow, isl)
    }
    // 8. fundo — penhascos de gelo em anel (sem o norte, o caminho do Guardião), castelo, navios presos, aurora
    const bg = bgMark([lit, glow])
    const skipN = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.25
    const n = Math.min(1, ctx.n)
    const G = [lit, glow]
    for (const s of around(Math.round(18 * n), 120, 150, 11, skipN))
      placed(G, Matrix.Translation(0, SEA_Y, 0), () => glacierCliff(lit, glow, s.x, s.z, 34 + rnd(s.i * 3) * 18, 30 + rnd(s.i * 5) * 26, 16, s.a + Math.PI, s.i * 7))
    for (const s of around(Math.round(12 * n), 175, 210, 12, skipN))
      placed(G, Matrix.Translation(0, SEA_Y, 0), () => glacierCliff(lit, glow, s.x, s.z, 50 + rnd(s.i * 3) * 20, 50 + rnd(s.i * 5) * 30, 20, s.a + Math.PI, s.i * 9 + 3))
    placed(G, Matrix.RotationY(Math.PI * 0.82).multiply(Matrix.Translation(0, SEA_Y, 0)), () => iceCastle(lit, glow, 0, 160, 1.1))
    // navios presos no gelo ao longe (casco + cabine + chaminé)
    for (const s of around(Math.round(7 * n), 70, 110, 13, skipN)) {
      const yaw = s.a + 1.2
      const L = 14 + rnd(s.i) * 8
      lit.box(L, 4, 4.6, at(s.x, SEA_Y + 1.4, s.z, yaw), (_x, y) => (y < -0.6 ? RUST : HULL))
      lit.box(L * 0.3, 3, 3.6, at(s.x, SEA_Y + 4.8, s.z, yaw), WHITE)
      lit.cylinder(1.2, 3.4, at(s.x + Math.sin(yaw + Math.PI / 2) * 2, SEA_Y + 7, s.z + Math.cos(yaw + Math.PI / 2) * 2), RED, 10)
      lit.cylinder(L * 0.9, 1.2, at(s.x, SEA_Y + 0.2, s.z), SNOW, 9)
      glow.box(L * 0.25, 0.5, 3.7, at(s.x, SEA_Y + 5, s.z, yaw), AMBER)
    }
    // aurora: fitas acesas altas no céu do sul (ondulam no tick)
    const aur = new SoftGeo()
    for (let r = 0; r < 3; r++) {
      const R = 170 + r * 20
      for (let k = 0; k < 26; k++) {
        const a = Math.PI * 0.55 + (k / 26) * Math.PI * 0.9
        const h = 26 + Math.sin(k * 0.7 + r) * 8
        const c: RGB = r === 1 ? [0.5, 1, 0.8] : [0.36, 0.86, 1]
        aur.box(22, h, 0.4, at(Math.sin(a) * R, 70 + r * 6 + h / 2, Math.cos(a) * R, a), (x, y) => mulc(c, Math.max(0, 1 - Math.abs((y / h) * 2 + 0.35)) ** 1.6 * (0.55 + 0.45 * Math.sin(x * 0.3 + k + r))))
      }
    }
    const am = aur.build("paint-gelo-aurora", ctx.scene, ctx.own(new StandardMaterial("paint-gelo-aurora", ctx.scene)), false)
    const amat = am.material as StandardMaterial
    amat.disableLighting = true
    amat.emissiveColor = new Color3(1, 1, 1)
    // somando à luz do céu (o escuro some; antes ficava uma fileira de tábuas escuras)
    amat.alphaMode = Constants.ALPHA_ADD
    amat.alpha = 0.32
    amat.backFaceCulling = false
    amat.fogEnabled = false
    ctx.add(am)
    bgGrowMesh(am, SEA_Y)
    bgGrow([lit, glow], bg, SEA_Y)
    done()
    return {
      tick(dt, clock) {
        sea.tick(dt)
        if (beam) beam.rotation.y = clock * 0.7
        am.rotation.y = Math.sin(clock * 0.05) * 0.04
        amat.alpha = 0.28 + Math.sin(clock * 0.6) * 0.08
      },
    }
  },
}
