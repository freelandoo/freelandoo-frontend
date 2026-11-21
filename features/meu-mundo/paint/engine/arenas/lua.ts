// features/meu-mundo/paint/engine/arenas/lua.ts — PAINT (2026-11-21): o desenho da SERRARIA DA LUA (Noctis).
//
// FICHA
// O que é:   a mata de troncos de prata de Noctis, de noite, debaixo da lua parada: tocos gigantes cortados pela
//            serra flutuando na névoa, escada de toras deitadas, cogumelos de chapéu aceso presos ao TRONCO DE
//            PRATA do meio, a tora caída do norte e o toco do alto (portais) cortado rente, brilhando de lua.
// Silhueta:  tronco de prata vertical com raízes abertas; chapéus de cogumelo em leque em volta; no fundo, a
//            muralha de troncos altos e a lua grande com halo.
// Massas:    tronco r 3,2 × 16 m; toco da base r 10; cogumelos r 2,8; troncos do fundo d 4–8 × 60–90 m.
// Paleta:    casca 0,09–0,52 marrom em sulcos; madeira de corte 0,66/0,54/0,4 com anéis; prata 0,7/0,74/0,82 com
//            runa azul acesa; chapéu roxo 0,58/0,34/0,86 com pintas claras; acento: âmbar das lanternas e o rosa
//            dos cogumelos do fundo (10%).
// Fora:      a serra que corta de verdade (gira, mas não colide).
// Inventado: os cabos de cogumelo que vão até o tronco (seguram os chapéus no ar) e os vaga-lumes.
//
// PARTES (ordem do plano)
// 1. chão de madeira de corte (`tileTex("wood")`) + cor por tag (toco claro, chapéu roxo, prata no topo)
// 2. embaixo: a névoa (o comum, `mist`)
// 3. casco: TUDO daqui — toco (casca em sulcos, raízes que pendem), tora deitada (degrau, tora caída), pilha de
//    toras, cogumelo (chapéu, lamelas, cabo até o tronco)
// 4. o tronco de prata (prop `silvertrunk`) com runas acesas e as raízes do pé (`silverroots`)
// 5. tags: serraria (deck de tábua em estacas, poste com a serra circular que gira)
// 6. base: lanternas (props `lantern`), pilha de lenha, machado no cepo
// 7. topo: o toco do alto ligado ao tronco, borda de prata acesa
// 8. fundo: troncos altos (`tallTrunk`/`farTrunk` da Gincana) em anéis, cogumelos-luminária, a lua, vaga-lumes
//
// Andamento (21/11, fotos no harness C:/wt/ph):
// 3 toras pretas (a pintura lia o ponto já deitado) → casca pelo ponto do cilindro (2ª); raízes finas e
// retas = pernas de aranha → grossas em 3 lances (2ª); anéis da textura repetindo → `rings()` por toco,
// claro largo e escuro fino (3ª). 4–8 ok na 1ª; troncos do fundo 34 → 26 (triângulos).

import { Constants } from "@babylonjs/core/Engines/constants"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SoftGeo, at } from "../../../gincana/engine/shapes"
import { farTrunk, shroomLamp, tallTrunk } from "../../../gincana/engine/backdrop-floresta"
import type { RGB } from "../../../engine/geometry"
import type { Island, PaintProp } from "../../sim/map"
import { edgesOf } from "../arena-kit"
import type { ArenaCtx, ArenaDress } from "./types"
import { around, bgGrow, bgGrowMesh, bgMark, jit, meshes, mixc, mulc, placed, rings, rnd, tagOf, tileTex, v3, type Poly } from "./kit"

const BARK: RGB = [0.29, 0.18, 0.12]
const BARK_HI: RGB = [0.52, 0.33, 0.21]
const BARK_DK: RGB = [0.09, 0.055, 0.045]
const CUT: RGB = [0.72, 0.56, 0.38]
const CUT_DK: RGB = [0.5, 0.36, 0.22]
const MOSS: RGB = [0.18, 0.42, 0.2]
const SILVER: RGB = [0.7, 0.74, 0.82]
const SILVER_DK: RGB = [0.36, 0.38, 0.48]
const RUNE: RGB = [0.6, 0.82, 1]
const CAP: RGB = [0.58, 0.34, 0.86]
const CAP_DK: RGB = [0.3, 0.16, 0.46]
const GILL: RGB = [0.86, 0.78, 0.9]
const AMBER: RGB = [1, 0.74, 0.36]

/** Casca em sulcos: crista clara, sulco quase preto, pelo índice do vértice. */
const barkAt = (seed: number) => (i: number): RGB => {
  const g = Math.sin(i * 1.9 + seed)
  return g > 0.5 ? BARK_HI : g < -0.4 ? BARK_DK : jit(BARK, i + seed, 0.1)
}

/** Parte 3 — toco: borda de corte clara, casca em sulcos, musgo no alto, raízes que pendem embaixo. */
function stump(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island, silver = false) {
  const O = ctx.outlineOf(isl, 0.9)
  const y = isl.y
  const H = Math.min(9, 2.4 + isl.r * 0.8)
  const bark = silver ? (i: number): RGB => (Math.sin(i * 1.9) > 0.4 ? SILVER : jit(SILVER_DK, i, 0.1)) : barkAt(isl.id)
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: silver ? [0.86, 0.9, 1] : CUT },
    { y: y - 0.1, k: 1.04, c: silver ? SILVER : CUT_DK },
    { y: y - 0.25, k: 1.06, c: bark },
    { y: y - 0.9, k: 1.07, c: (i) => (rnd(i * 3 + isl.id) > 0.82 ? mulc(MOSS, 0.8) : bark(i)) },
    { y: y - H * 0.6, k: 1.1, c: bark, j: 0.03 },
    { y: y - H, k: 1.22, c: bark, j: 0.06 },
    { y: y - H - 0.6, k: 0.9, c: mulc(BARK_DK, 1.2), j: 0.08 },
    { y: y - H - 2.4, k: 0.3, c: BARK_DK, j: 0.15 },
  ], isl.id)
  // o corte: anéis de crescimento centrados no toco (a textura do chão é só o veio)
  rings(poly, O, isl.x, isl.z, y, silver ? [0.9, 0.92, 1] : CUT, silver ? SILVER : CUT_DK, isl.id)
  // raízes que saem do pé e pendem na névoa
  // (raízes grossas que abrem e voltam para dentro, em 3 lances; finas e retas pareciam pernas de aranha)
  // (ilha do enchimento 4×: só duas raízes)
  const n = isl.fill ? 2 : Math.max(3, Math.round(isl.r * 0.7))
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(isl.id * 7 + k) * 0.5
    const r0 = isl.r * 1.0
    const rr = 0.4 + isl.r * 0.09
    const p0 = v3(isl.x + Math.sin(a) * r0 * 0.9, y - H * 0.55, isl.z + Math.cos(a) * r0 * 0.9)
    const p1 = v3(isl.x + Math.sin(a) * r0 * 1.32, y - H - 0.4, isl.z + Math.cos(a) * r0 * 1.32)
    const p2 = v3(isl.x + Math.sin(a + 0.15) * r0 * 1.18, y - H - 2.6, isl.z + Math.cos(a + 0.15) * r0 * 1.18)
    const p3 = v3(isl.x + Math.sin(a + 0.3) * r0 * 0.8, y - H - 4.4 - rnd(k + isl.id) * 2, isl.z + Math.cos(a + 0.3) * r0 * 0.8)
    lit.tube(p0, p1, rr, BARK, 7)
    lit.tube(p1, p2, rr * 0.8, mixc(BARK, BARK_DK, 0.4), 6)
    lit.tube(p2, p3, rr * 0.5, BARK_DK, 5)
    lit.sphere(rr * 2, at(p1.x, p1.y, p1.z), BARK, 6)
  }
}

/** Parte 3 — tora deitada ao longo de `ux,uz`: casca em sulcos, pontas de corte com anéis. */
function logAlong(lit: SoftGeo, cx: number, cy: number, cz: number, ux: number, uz: number, len: number, d: number, seed: number) {
  const a = v3(cx - (ux * len) / 2, cy, cz - (uz * len) / 2)
  const b = v3(cx + (ux * len) / 2, cy, cz + (uz * len) / 2)
  lit.tube(a, b, d / 2, (x, _y, z) => {
    // a pintura recebe o ponto do cilindro antes de deitar (eixo y): o sulco anda em volta
    const g = Math.sin(Math.atan2(z, x) * 7 + seed)
    return g > 0.55 ? BARK_HI : g < -0.45 ? BARK_DK : BARK
  }, 12)
  const rot = Math.atan2(ux, uz)
  for (const [e, s] of [[a, -1], [b, 1]] as const) {
    const rings: [number, RGB][] = [[0.94, CUT], [0.66, CUT_DK], [0.5, CUT], [0.18, CUT_DK]]
    rings.forEach(([k, c], q) => lit.cylinder(d * k, 0.04, at(e.x + ux * s * (0.02 + q * 0.012), e.y, e.z + uz * s * (0.02 + q * 0.012), rot, Math.PI / 2), c, 12))
  }
}

/** Parte 3 — a tora da peça retangular: o lado comprido é o comprimento; tora de diâmetro = largura. */
function logPiece(lit: SoftGeo, isl: Island, across: boolean) {
  const E = edgesOf(isl)
  let L = E[0]
  for (const e of E) if (e.len > L.len) L = e
  let W = 0
  const ux = (L.bx - L.ax) / L.len
  const uz = (L.bz - L.az) / L.len
  for (const e of E) if (e !== L && Math.abs((e.bx - e.ax) * ux + (e.bz - e.az) * uz) < 0.1) W = Math.max(W, e.len)
  if (!across) {
    logAlong(lit, isl.x, isl.y - W / 2, isl.z, ux, uz, L.len + 0.6, W * 1.02, isl.id)
    return
  }
  // degrau da escada: duas toras de lado a lado na largura, deitadas de través
  const n = Math.max(2, Math.round(L.len / 2.4))
  const d = L.len / n
  for (let k = 0; k < n; k++) {
    const t = -L.len / 2 + (k + 0.5) * d
    logAlong(lit, isl.x + ux * t, isl.y - d / 2, isl.z + uz * t, -uz, ux, W + 0.5, d * 1.02, isl.id * 3 + k)
  }
}

/** Parte 3 — pilha de toras (a peça `logpile`): pirâmide de toras ao longo do lado comprido. */
function pile(lit: SoftGeo, isl: Island) {
  const E = edgesOf(isl)
  let L = E[0]
  for (const e of E) if (e.len > L.len) L = e
  const ux = (L.bx - L.ax) / L.len
  const uz = (L.bz - L.az) / L.len
  const rows = 3
  const d = 1.3
  for (let r = 0; r < rows; r++) {
    const n = 3 + r
    for (let k = 0; k < n; k++) {
      const t = (k - (n - 1) / 2) * d
      logAlong(lit, isl.x - uz * t, isl.y - d / 2 - r * d * 0.86, isl.z + ux * t, ux, uz, L.len + 0.4 - r * 0.3, d, isl.id * 7 + r * 5 + k)
    }
  }
}

/** Parte 3 — cogumelo: chapéu (a borda do chão), lamelas, pintas acesas e o cabo (até o tronco, se houver). */
function shroom(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, glow: SoftGeo, isl: Island, trunk: PaintProp | undefined) {
  const O = ctx.outlineOf(isl, 0.7)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: CAP },
    { y: y - 0.35, k: 1.1, c: CAP },
    { y: y - 0.8, k: 1.14, c: CAP_DK },
    { y: y - 0.9, k: 1.0, c: GILL },
    { y: y - 1.1, k: 0.35, c: mulc(GILL, 0.7) },
  ], isl.id)
  // pintas claras acesas na beira do chapéu (fora do pé de quem pisa)
  const np = isl.fill ? 4 : 7
  for (let k = 0; k < np; k++) {
    const a = (k / np) * Math.PI * 2 + rnd(isl.id + k)
    glow.sphere(0.36, at(isl.x + Math.sin(a) * isl.r * 1.08, y - 0.4, isl.z + Math.cos(a) * isl.r * 1.08), [1, 0.92, 1], 5, 1, 0.5, 1)
  }
  // o cabo: do meio do chapéu para baixo e, perto do tronco, curva até ele
  const top = v3(isl.x, y - 1, isl.z)
  let foot = v3(isl.x, y - 6, isl.z)
  if (trunk) {
    const dx = trunk.x - isl.x
    const dz = trunk.z - isl.z
    const d = Math.hypot(dx, dz)
    if (d < 16) foot = v3(trunk.x - (dx / d) * trunk.s * 0.9, Math.max(trunk.y + 1, y - 5), trunk.z - (dz / d) * trunk.s * 0.9)
  }
  const mid = v3((top.x + foot.x) / 2, Math.min(top.y, foot.y) - 0.2 + (top.y - foot.y) * 0.35, (top.z + foot.z) / 2)
  lit.tube(top, mid, isl.r * 0.26, [0.9, 0.86, 0.78], 8)
  lit.tube(mid, foot, isl.r * 0.2, [0.76, 0.72, 0.66], 8)
  lit.torus(isl.r * 0.62, 0.08, at(top.x, top.y - 0.6, top.z), [0.84, 0.78, 0.7], 10)
}

/** Parte 4 — tronco de prata: casca prateada em sulcos, runas acesas subindo, nós. */
function silverTrunk(lit: SoftGeo, glow: SoftGeo, p: PaintProp, topY: number) {
  const d = p.s * 2.06
  const y0 = p.y - 1
  const h = topY - y0
  lit.cylinder(d, h, at(p.x, y0 + h / 2, p.z), (x, y, z) => {
    const g = Math.sin(Math.atan2(z, x) * 9 + Math.sin(y * 0.3) * 1.2)
    return g > 0.5 ? [0.86, 0.9, 0.98] : g < -0.5 ? SILVER_DK : SILVER
  }, 24, d * 0.96)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.4
    for (let q = 0; q < 4; q++) {
      const yy = p.y + 2 + q * 3.6 + (k % 2) * 1.6
      if (yy > topY - 1) continue
      glow.box(0.14, 1.2, 0.06, at(p.x + Math.sin(a) * (d / 2 + 0.01), yy, p.z + Math.cos(a) * (d / 2 + 0.01), a, 0, q % 2 ? 0.4 : -0.4), q % 2 ? RUNE : [0.86, 0.94, 1])
    }
  }
  for (let k = 0; k < 4; k++) {
    const a = rnd(k * 9) * Math.PI * 2
    lit.sphere(1.1, at(p.x + Math.sin(a) * d * 0.48, p.y + 3 + k * 3.4, p.z + Math.cos(a) * d * 0.48), SILVER_DK, 6, 1, 1.3, 0.6)
  }
}

/** Parte 4 — raízes de prata (o chão do pé do tronco): borda de raiz e raízes grossas que descem. */
function silverRoots(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: SILVER },
    { y: y - 0.3, k: 1.04, c: SILVER_DK },
    { y: y - 2.2, k: 0.9, c: (i) => (i % 2 ? SILVER_DK : mixc(SILVER_DK, BARK_DK, 0.5)), j: 0.08 },
    { y: y - 5, k: 0.5, c: mixc(SILVER_DK, BARK_DK, 0.6), j: 0.12 },
    { y: y - 8, k: 0.12, c: BARK_DK },
  ], isl.id)
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.2
    const r = isl.r
    lit.tube(v3(isl.x + Math.sin(a) * r * 0.5, y - 0.2, isl.z + Math.cos(a) * r * 0.5), v3(isl.x + Math.sin(a) * r * 1.08, y - 2, isl.z + Math.cos(a) * r * 1.08), 0.55, SILVER_DK, 6)
    lit.tube(v3(isl.x + Math.sin(a) * r * 1.08, y - 2, isl.z + Math.cos(a) * r * 1.08), v3(isl.x + Math.sin(a + 0.15) * r * 0.9, y - 7 - rnd(k) * 3, isl.z + Math.cos(a + 0.15) * r * 0.9), 0.35, mixc(SILVER_DK, BARK_DK, 0.5), 5)
  }
}

/** Parte 5 — serraria: deck de tábuas sobre estacas, o poste com a serra circular (malha que gira). */
function sawmill(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island, saws: Mesh[]) {
  const O = ctx.outlineOf(isl, 1)
  const y = isl.y
  poly.stack(O, isl.x, isl.z, [
    { y, k: 1, c: CUT_DK },
    { y: y - 0.4, k: 1.02, c: BARK },
    { y: y - 0.5, k: 0.96, c: BARK_DK },
  ], isl.id)
  for (const [x, z] of O.filter((_, i) => i % Math.max(1, Math.floor(O.length / 4)) === 0)) lit.cylinder(0.5, 6, at(isl.x + (x - isl.x) * 0.9, y - 3.4, isl.z + (z - isl.z) * 0.9), BARK, 6, 0.35)
  const post = ctx.map.props.find((p) => p.tag === "sawpost" && Math.abs(p.y - y) < 0.5 && Math.hypot(p.x - isl.x, p.z - isl.z) < isl.r * 2)
  if (!post) return
  lit.cylinder(post.s * 2, post.h, at(post.x, post.y + post.h / 2, post.z), BARK, 8)
  lit.box(post.s * 2.6, 0.4, 2.6, at(post.x, post.y + post.h - 0.2, post.z), BARK_DK)
  const g = new SoftGeo()
  g.cylinder(2.6, 0.06, Matrix.RotationX(Math.PI / 2), (x, y) => (Math.hypot(x, y) > 1.1 ? [0.82, 0.84, 0.9] : [0.5, 0.52, 0.58]), 28)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    g.box(0.24, 0.24, 0.06, at(Math.sin(a) * 1.34, Math.cos(a) * 1.34, 0, 0, 0, -a + 0.5), [0.9, 0.92, 0.96])
  }
  g.cylinder(0.5, 0.2, Matrix.RotationX(Math.PI / 2), [0.3, 0.3, 0.34], 10)
  const m = g.build(`paint-lua-saw-${isl.id}`, ctx.scene, ctx.solidMat, false)
  const out = Math.atan2(post.x - isl.x, post.z - isl.z)
  m.position.set(post.x, post.y + post.h + 1.1, post.z)
  m.rotation.y = out + Math.PI / 2
  ctx.add(m)
  saws.push(m)
}

/** Parte 6 — lanterna de poste (props `lantern`). */
function lantern(lit: SoftGeo, glow: SoftGeo, p: PaintProp) {
  lit.cylinder(p.s * 1.4, p.h, at(p.x, p.y + p.h / 2, p.z), BARK, 6)
  lit.box(1.2, 0.18, 0.18, at(p.x, p.y + p.h - 0.2, p.z), BARK_DK)
  lit.box(0.08, 0.5, 0.08, at(p.x + 0.5, p.y + p.h - 0.55, p.z), [0.2, 0.2, 0.22])
  glow.box(0.42, 0.56, 0.42, at(p.x + 0.5, p.y + p.h - 1.05, p.z), AMBER)
  lit.cylinder(0.7, 0.3, at(p.x + 0.5, p.y + p.h - 0.7, p.z), [0.16, 0.16, 0.18], 4, 0.2)
}

export const LUA_DRESS: ArenaDress = {
  topTex: (scene) => tileTex(scene, "wood"),
  under: () => "none",
  colors: (isl) => {
    const t = tagOf(isl)
    if (t === "shroom") return { top: CAP, rim: mixc(CAP, [1, 1, 1], 0.3) }
    if (t === "moonstump" || t === "silverroots") return { top: [0.86, 0.88, 0.96], rim: SILVER }
    if (t === "sawmill") return { top: [0.62, 0.46, 0.3], rim: BARK }
    return { top: [0.8, 0.64, 0.46], rim: CUT_DK }
  },
  frame: { band: BARK, corbel: BARK_DK },
  gate: { stone: [0.78, 0.8, 0.9], tech: false },
  prop: (p) => p.tag === "silvertrunk" || p.tag === "lantern" || p.tag === "sawpost",
  build(ctx) {
    const { lit, glow, poly, done } = meshes(ctx, "lua")
    const trunk = ctx.map.props.find((p) => p.tag === "silvertrunk")
    const top = ctx.map.islands.find((i) => tagOf(i) === "moonstump")
    const saws: Mesh[] = []
    if (trunk) silverTrunk(lit, glow, trunk, top ? top.y - 2.6 : trunk.y + trunk.h)
    for (const p of ctx.map.props) if (p.tag === "lantern") lantern(lit, glow, p)
    for (const isl of ctx.map.islands) {
      const t = tagOf(isl)
      if (t === "stump") stump(ctx, poly, lit, isl)
      else if (t === "logstair") logPiece(lit, isl, true)
      else if (t === "log") logPiece(lit, isl, false)
      else if (t === "logpile") pile(lit, isl)
      else if (t === "shroom") shroom(ctx, poly, lit, glow, isl, trunk)
      else if (t === "silverroots") silverRoots(ctx, poly, lit, isl)
      else if (t === "sawmill") sawmill(ctx, poly, lit, isl, saws)
    }
    // 7. o toco do alto: cortado rente, borda de prata, ligado ao tronco
    if (top && trunk) {
      const O = ctx.outlineOf(top, 0.8)
      const kc = (trunk.s * 1.03) / top.r
      poly.stack(O, top.x, top.z, [
        { y: top.y, k: 1, c: [0.92, 0.94, 1] },
        { y: top.y - 0.12, k: 1.04, c: SILVER },
        { y: top.y - 0.7, k: 1.06, c: (i) => (Math.sin(i * 1.9) > 0.4 ? SILVER : SILVER_DK) },
        { y: top.y - 1.6, k: 0.9, c: SILVER_DK },
        { y: top.y - 2.8, k: kc, c: SILVER },
      ], top.id)
      glow.torus(top.r * 2 + 0.2, 0.1, at(top.x, top.y - 0.06, top.z), RUNE, 40)
      rings(poly, O, top.x, top.z, top.y, [0.9, 0.92, 1], [0.66, 0.7, 0.8], top.id)
    }
    // 8. fundo: troncos altos em anel (sem o norte), troncos azulados longe, cogumelos-luminária, a lua
    const bg = bgMark([lit, glow])
    const skipN = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.2
    const n = Math.min(1, ctx.n)
    const G = [lit, glow]
    for (const s of around(Math.round(22 * n), 70, 100, 31, skipN)) placed(G, Matrix.Translation(0, -30, 0), () => tallTrunk(lit, glow, s.x, s.z, 100 + rnd(s.i) * 30, 5 + rnd(s.i * 3) * 3, s.i))
    for (const s of around(Math.round(26 * n), 120, 190, 32, skipN)) farTrunk(lit, s.x, s.z, 120 + rnd(s.i) * 40, 6 + rnd(s.i * 3) * 4, s.i + 100, 0.45 + rnd(s.i * 5) * 0.4, -34)
    for (const s of around(Math.round(10 * n), 55, 85, 33, skipN)) {
      const y0 = -10 + rnd(s.i * 7) * 14
      shroomLamp(lit, glow, s.x, s.z, 2 + rnd(s.i) * 3, s.i, y0)
    }
    // a lua parada de Noctis: disco aceso, crateras, halo transparente
    const mg = new SoftGeo()
    mg.cylinder(46, 0.5, Matrix.RotationX(Math.PI / 2), (x, y) => (Math.sin(x * 0.4) * Math.cos(y * 0.35) > 0.6 ? [0.8, 0.84, 0.94] : [0.95, 0.97, 1]), 40)
    const moon = mg.build("paint-lua-moon", ctx.scene, ctx.glowMat, false)
    moon.position.set(-60, 120, -230)
    moon.lookAt(moon.position.scale(2))
    moon.applyFog = false
    ctx.add(moon)
    const hg = new SoftGeo()
    hg.cylinder(110, 0.2, Matrix.RotationX(Math.PI / 2), [0.6, 0.72, 1], 40)
    const halo = hg.build("paint-lua-halo", ctx.scene, ctx.own(new StandardMaterial("paint-lua-halo", ctx.scene)), false)
    const hm = halo.material as StandardMaterial
    hm.disableLighting = true
    hm.emissiveColor = new Color3(1, 1, 1)
    hm.alphaMode = Constants.ALPHA_ADD
    hm.alpha = 0.12
    hm.fogEnabled = false
    halo.position.set(-60.6, 120.6, -231.6)
    halo.lookAt(halo.position.scale(2))
    ctx.add(halo)
    // vaga-lumes: pontinhos âmbar que sobem e descem (malha que se mexe inteira)
    const fg = new SoftGeo()
    for (let k = 0; k < Math.round(60 * n); k++) {
      const a = rnd(k * 3 + 700) * Math.PI * 2
      const d = 6 + rnd(k * 5 + 701) * 50
      fg.sphere(0.18, at(Math.sin(a) * d, rnd(k * 7 + 702) * 24, Math.cos(a) * d), k % 5 ? AMBER : [0.6, 1, 0.6], 4)
    }
    const flies = fg.build("paint-lua-flies", ctx.scene, ctx.glowMat, false)
    ctx.add(flies)
    for (const m of [moon, halo, flies]) bgGrowMesh(m)
    bgGrow([lit, glow], bg)
    done()
    return {
      tick(_dt, clock) {
        for (const s of saws) s.rotation.z = -clock * 6
        flies.position.y = Math.sin(clock * 0.5) * 0.8
        flies.rotation.y = clock * 0.02
        hm.alpha = 0.1 + Math.sin(clock * 0.4) * 0.03
      },
    }
  },
}
