// features/meu-mundo/engine/cena-codigo/pecas/vulcao.ts — PEÇAS COPIADAS da FORJA (Vulcão de Kragor) pela
// cópia minuciosa (skill meu-mundo-cenario-codigo, `copia.md`). Inventário:
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/vulcao.json` (16 recortes das refs vulcao-1..3).
//
// A linguagem das refs, que toda peça repete: VIGAS GROSSAS de madeira alaranjada (topo mais claro, ponta
// com o veio escuro), CHAPAS DE FERRO com REBITES em toda junta (cantoneira dobrada nos cantos), rocha
// basáltica ESCURA e ANGULOSA com quina clara, e luz quente (vidro âmbar, brasa, lava) sempre com algo
// escuro em volta. Contrato: (c, x, z, ang, …, lod); a FRENTE olha para (sin ang, cos ang).

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { blob, face, LAJE_ESP, lajeEspessa, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { prisma } from "./castelo-iris"

// ── paleta (recortes do inventário, ajustada à luz vermelha do jogo) ──
export const MAD: RGB = [0.78, 0.46, 0.22] // madeira ao sol da lava
export const MAD_CL: RGB = [0.94, 0.62, 0.32] // topo e quina da viga
export const MAD_ESC: RGB = [0.46, 0.24, 0.12] // veio da ponta, fundo
export const FERRO: RGB = [0.42, 0.4, 0.46]
export const FERRO_CL: RGB = [0.66, 0.64, 0.7]
export const FERRO_ESC: RGB = [0.22, 0.2, 0.25]
export const PEDRA: RGB = [0.52, 0.45, 0.5]
export const PEDRA_CL: RGB = [0.74, 0.65, 0.68]
export const PEDRA_ESC: RGB = [0.34, 0.28, 0.33]
export const BRASA: RGB = [1, 0.42, 0.06]
export const BRASA_CL: RGB = [1, 0.84, 0.36]
export const BRASA_ESC: RGB = [0.82, 0.16, 0.04]
export const VIDRO: RGB = [1, 0.72, 0.26]
export const OURO: RGB = [0.96, 0.66, 0.24]
export const BANDEIRA: RGB = [0.74, 0.12, 0.12]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>

/** Caixa no quadro local: centro (u, v), largura w (ao longo de u), fundo d (ao longo de v), de y0 a y1. */
function cx(g: G, q: Q, u: number, v: number, w: number, d: number, y0: number, y1: number, side: RGB, top?: RGB) {
  const p = q.P(u, v, 0)
  caixa(g, { x: p[0], z: p[2], y0, y1, w, d, rot: q.rot, side, top: top ?? mul(side, 1.1) })
}

/** Rebite: cabecinha de 4 lados saindo da face (normal `n`), no ponto p. */
function rebite(g: G, p: V3, n: V3, r = 0.05) {
  tube(g, p, [p[0] + n[0] * r * 0.8, p[1] + n[1] * r * 0.8, p[2] + n[2] * r * 0.8], r, r * 0.5, 4, () => FERRO_CL, false)
}

/**
 * Chapa de ferro com rebites nos 4 cantos, no plano de uma face: centro p, eixos a (largura) e b (altura),
 * normal n (para fora). `w`, `h` em metros. É o detalhe que mais repete nas refs.
 */
function chapa(g: G, p: V3, a: V3, b: V3, n: V3, w: number, h: number, lod: number) {
  const o = 0.025
  const P = (s: number, t: number): V3 => [p[0] + a[0] * s * w / 2 + b[0] * t * h / 2 + n[0] * o, p[1] + a[1] * s * w / 2 + b[1] * t * h / 2 + n[1] * o, p[2] + a[2] * s * w / 2 + b[2] * t * h / 2 + n[2] * o]
  face(g, [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], [FERRO, FERRO, FERRO_CL, FERRO], n)
  if (lod) return
  for (const [s, t] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]] as const) rebite(g, P(s, t), n, Math.min(w, h) * 0.12)
}

/** Viga de madeira entre dois pontos (seção quadrada `e`), faces alternando claro/escuro; com ponta de veio. */
function viga(g: G, a: V3, b: V3, e: number, lod: number) {
  tube(g, a, b, e * 0.72, e * 0.72, 4, (k) => (k % 2 ? MAD : k === 0 ? MAD_CL : mix(MAD, MAD_ESC, 0.35)), false)
  void lod
}

/** RODA de ferro: disco tampado dos dois lados (cilindro sem tampa some de lado), aro claro e cubo. `e` = eixo (espessura). */
function roda(g: G, p: V3, e: V3, r: number, lod: number) {
  const n = lod ? 6 : 10
  const L = Math.hypot(...e) || 1, ax: V3 = [e[0] / L, e[1] / L, e[2] / L]
  const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let u: V3 = [ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]]
  const lu = Math.hypot(...u); u = [u[0] / lu, u[1] / lu, u[2] / lu]
  const w: V3 = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]]
  const anel = (c: V3, rr: number) => Array.from({ length: n }, (_, k): V3 => { const a = (k / n) * Math.PI * 2; return [c[0] + (u[0] * Math.cos(a) + w[0] * Math.sin(a)) * rr, c[1] + (u[1] * Math.cos(a) + w[1] * Math.sin(a)) * rr, c[2] + (u[2] * Math.cos(a) + w[2] * Math.sin(a)) * rr] })
  const q: V3 = [p[0] + e[0], p[1] + e[1], p[2] + e[2]]
  tube(g, p, q, r, r, n, (k) => (k % 2 ? FERRO : FERRO_CL), false)
  for (const [c, sg] of [[q, 1], [p, -1]] as const) {
    const out: V3 = [ax[0] * sg, ax[1] * sg, ax[2] * sg]
    face(g, anel(c, r), FERRO_ESC, out)
    if (!lod) {
      const c2: V3 = [c[0] + out[0] * 0.02, c[1] + out[1] * 0.02, c[2] + out[2] * 0.02]
      face(g, anel(c2, r * 0.82), mix(FERRO_ESC, FERRO, 0.4), out)
      tube(g, c2, [c2[0] + out[0] * 0.07, c2[1] + out[1] * 0.07, c2[2] + out[2] * 0.07], r * 0.28, r * 0.22, 6, () => FERRO_CL, false)
    }
  }
}

/** Lanterna de ferro (gaiola de 4 lados, tampa em pirâmide, argola) com vidro âmbar aceso. y = meio do vidro. */
export function lanterna(c: Cena, x: number, z: number, y: number, s = 1, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const r = 0.2 * s, h = 0.42 * s
  // base e tampa de ferro
  tube(g, [x, y - h / 2 - 0.08 * s, z], [x, y - h / 2, z], r * 1.25, r * 1.25, 4, () => FERRO_ESC, false)
  tube(g, [x, y + h / 2, z], [x, y + h / 2 + 0.06 * s, z], r * 1.3, r * 1.3, 4, () => FERRO_ESC, false)
  tube(g, [x, y + h / 2 + 0.06 * s, z], [x, y + h / 2 + 0.24 * s, z], r * 1.2, 0.02, 4, () => FERRO, false)
  if (!lod) tube(g, [x, y + h / 2 + 0.24 * s, z], [x, y + h / 2 + 0.34 * s, z], 0.04 * s, 0.04 * s, 3, () => FERRO, false)
  // vidro aceso: 4 faces, claro no meio
  for (let k = 0; k < 4; k++) {
    const a0 = (k / 4) * Math.PI * 2 + Math.PI / 4, a1 = ((k + 1) / 4) * Math.PI * 2 + Math.PI / 4
    const p0: V3 = [x + Math.cos(a0) * r, 0, z + Math.sin(a0) * r], p1: V3 = [x + Math.cos(a1) * r, 0, z + Math.sin(a1) * r]
    const n: V3 = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]
    face(GL, [[p0[0], y - h / 2, p0[2]], [p1[0], y - h / 2, p1[2]], [p1[0], y + h / 2, p1[2]], [p0[0], y + h / 2, p0[2]]], [VIDRO, VIDRO, BRASA_CL, BRASA_CL], n)
    // montantes da gaiola (por fora do vidro)
    if (!lod) tube(g, [p0[0] * 1 + n[0] * 0, y - h / 2, p0[2]], [p0[0], y + h / 2, p0[2]], 0.025 * s, 0.025 * s, 3, () => FERRO_ESC, false)
  }
}

// ═══════════════ ROCHA E BASALTO ═══════════════

/**
 * ROCHA BASÁLTICA ANGULOSA (as rochas que cercam a mina e o caminho): prisma de 5–7 faces planas inclinadas
 * cada uma para um lado, topo facetado em 2–3 planos, quina de cima clara; tons quase pretos com a face
 * que pega a luz da lava mais clara e quente. `s` ≈ meia largura.
 */
export function rocha(c: Cena, x: number, z: number, s: number, seed = 1, lod = 0, caixaOn = true) {
  // basalto FACETADO das refs: 3 anéis tortos (pé largo, BARRIGA que salta, OMBRO recuado), topo INCLINADO e
  // fora do eixo, cada triângulo num tom (lado da lava claro-lilás, o oposto quase preto) e quina clara no ombro
  const g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = lod ? 5 : 6 + Math.floor(r(1) * 2)
  const h = s * (0.9 + r(2) * 0.7)
  const sx = (r(3) - 0.5) * s * 0.4, sz = (r(4) - 0.5) * s * 0.4
  const ta = r(5) * 6.28, tilt = 0.14 + r(6) * 0.22
  const a0 = r(7) * 6.28
  const base: V3[] = [], bar: V3[] = [], omb: V3[] = []
  for (let k = 0; k < n; k++) {
    const a = a0 + ((k + (r(10 + k) - 0.5) * 0.6) / n) * Math.PI * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    const R = s * (0.85 + r(20 + k) * 0.35)
    const rb = R * (1.0 + r(50 + k) * 0.16)
    const ro = R * (0.42 + r(30 + k) * 0.26)
    const yb = h * (0.28 + r(60 + k) * 0.24)
    const yo = h * (1 - tilt * (0.5 + 0.5 * Math.cos(a - ta))) * (0.9 + r(40 + k) * 0.1)
    base.push([x + ca * R, 0, z + sa * R])
    bar.push([x + ca * rb + sx * 0.3, yb, z + sa * rb + sz * 0.3])
    omb.push([x + ca * ro + sx, yo, z + sa * ro + sz])
  }
  // tom pelo lado de onde vem a luz da lava (+z/−x) e pela inclinação; ±5% de sorteio por triângulo
  const tom = (mx: number, mz: number, up: number, q: number): RGB => {
    const luz = (-(mx - x) * 0.5 + (mz - z) * 0.6) / s + up
    const b = luz > 0.45 ? mix(mix(PEDRA, PEDRA_CL, 0.55), BRASA, 0.06) : luz > 0.05 ? mul(PEDRA, 0.92) : luz > -0.4 ? mix(PEDRA, PEDRA_ESC, 0.65) : mul(PEDRA_ESC, 0.78)
    return mul(b, 0.95 + r(q) * 0.1)
  }
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (base[k][0] + base[j][0]) / 2, mz = (base[k][2] + base[j][2]) / 2
    const out: V3 = [mx - x, 0.1, mz - z]
    // pé → barriga (olha um pouco para baixo: sombra) com o contato escuro no chão
    const c1 = tom(mx, mz, -0.35, 70 + k), c1b = tom(mx, mz, -0.5, 80 + k)
    face(g, [base[k], base[j], bar[j]], [mul(c1, 0.72), mul(c1, 0.72), c1], out)
    face(g, [base[k], bar[j], bar[k]], [mul(c1b, 0.72), c1b, c1b], out)
    // barriga → ombro: a face grande inclinada que pega a luz
    const c2 = tom(mx, mz, 0.3, 90 + k), c2b = tom(mx, mz, 0.12, 100 + k)
    face(g, [bar[k], bar[j], omb[j]], c2, [out[0], 0.5, out[2]])
    face(g, [bar[k], omb[j], omb[k]], c2b, [out[0], 0.5, out[2]])
  }
  // topo inclinado em leque, centro fora do eixo; a quina do ombro clara
  const cx = omb.reduce((a, p) => a + p[0], 0) / n, cy = omb.reduce((a, p) => a + p[1], 0) / n + h * 0.04, cz = omb.reduce((a, p) => a + p[2], 0) / n
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const t = mul(mix(PEDRA, PEDRA_CL, 0.3 + r(110 + k) * 0.3), 0.95 + r(120 + k) * 0.1)
    face(g, [omb[k], omb[j], [cx, cy, cz]], [mix(t, PEDRA_CL, 0.35), mix(t, PEDRA_CL, 0.35), t], [0, 1, 0])
  }
  if (caixaOn && s > 0.5) c.block(x, z, s * 0.8, s * 0.8, h)
  return h
}

/**
 * COLUNAS HEXAGONAIS DE BASALTO (inventário `pilar-hexagonal`): 4–8 prismas de 6 lados encostados, alturas
 * desencontradas, topo plano com CHANFRO claro, faces em 3 tons, uma rachadura acesa em algumas e brasa
 * na fresta do pé (a lava aparecendo entre as colunas).
 */
export function colunasHex(c: Cena, x: number, z: number, r: number, hMax: number, seed = 1, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const n = lod ? 3 : 5 + Math.floor(rnd(seed, 1) * 4)
  const tons: RGB[] = [mix(PEDRA, PEDRA_CL, 0.35), mul(PEDRA, 0.86), PEDRA_ESC, PEDRA, mul(PEDRA, 0.72), mix(PEDRA, PEDRA_ESC, 0.5)] // basalto escuro (refs): só a quina do topo clara
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, d = k === 0 ? 0 : r * (0.45 + rnd(seed, k, 3) * 0.55)
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d
    // degraus: quem está mais longe do centro é mais baixo (a ref sobe em terraços até a coluna do meio)
    const h = hMax * (k === 0 ? 1 : (0.3 + rnd(seed, k, 4) * 0.6) * (1 - (d / Math.max(r, 0.01)) * 0.3))
    const R = 0.75 + rnd(seed, k, 5) * 0.3
    const rot = rnd(seed, k, 6)
    const ring = (y: number, rr: number) => Array.from({ length: 6 }, (_, j): V3 => [px + Math.cos(rot + (j / 6) * Math.PI * 2) * rr, y, pz + Math.sin(rot + (j / 6) * Math.PI * 2) * rr])
    const r0 = ring(0, R), r1 = ring(h - 0.12, R), r2 = ring(h, R * 0.82)
    for (let j = 0; j < 6; j++) {
      const i = (j + 1) % 6
      const nn: V3 = [Math.cos(rot + ((j + 0.5) / 6) * Math.PI * 2), 0, Math.sin(rot + ((j + 0.5) / 6) * Math.PI * 2)]
      const cor = tons[(j + k) % 6]
      face(g, [r0[j], r0[i], r1[i], r1[j]], [mul(cor, 0.72), mul(cor, 0.72), cor, cor], nn)
      face(g, [r1[j], r1[i], r2[i], r2[j]], mix(cor, PEDRA_CL, 0.6), [nn[0], 1, nn[2]])
      // rachadura acesa (algumas faces): zigue-zague vertical 2 cm à frente
      if (!lod && h > 1.6 && rnd(seed, k, j + 20) < 0.12) {
        const t = 0.3 + rnd(seed, k, j + 30) * 0.4
        const m0: V3 = [r0[j][0] + (r0[i][0] - r0[j][0]) * t + nn[0] * 0.02, 0, r0[j][2] + (r0[i][2] - r0[j][2]) * t + nn[2] * 0.02]
        let yy = 0.1, uu = 0
        for (let q = 0; q < 3; q++) {
          const y2 = yy + h * 0.22, u2 = (rnd(seed, k, q + j * 3) - 0.5) * 0.25
          const tx = r0[i][0] - r0[j][0], tz = r0[i][2] - r0[j][2], tl = Math.hypot(tx, tz)
          const A: V3 = [m0[0] + (tx / tl) * uu, yy, m0[2] + (tz / tl) * uu], B: V3 = [m0[0] + (tx / tl) * u2, y2, m0[2] + (tz / tl) * u2]
          face(GL, [[A[0] - (tx / tl) * 0.04, A[1], A[2] - (tz / tl) * 0.04], [A[0] + (tx / tl) * 0.04, A[1], A[2] + (tz / tl) * 0.04], [B[0] + (tx / tl) * 0.03, B[1], B[2] + (tz / tl) * 0.03], [B[0] - (tx / tl) * 0.03, B[1], B[2] - (tz / tl) * 0.03]], [BRASA, BRASA, BRASA_CL, BRASA_CL], nn)
          yy = y2
          uu = u2
        }
      }
    }
    face(g, r2, mix(PEDRA, PEDRA_CL, 0.35), [0, 1, 0])
  }
  // brasa na fresta do pé (disco aceso baixo, só aparece entre as colunas)
  if (!lod) {
    const m = 8
    for (let j = 0; j < m; j++) {
      const a0 = (j / m) * Math.PI * 2, a1 = ((j + 1) / m) * Math.PI * 2
      face(GL, [[x, 0.04, z], [x + Math.cos(a0) * r * 1.1, 0.04, z + Math.sin(a0) * r * 1.1], [x + Math.cos(a1) * r * 1.1, 0.04, z + Math.sin(a1) * r * 1.1]], [BRASA_CL, BRASA_ESC, BRASA_ESC], [0, 1, 0])
    }
  }
  c.block(x, z, r + 0.6, r + 0.6, hMax)
}

// ═══════════════ CRISTAL ═══════════════

/** CRISTAIS DE FOGO (inventário `cristal-fogo`): tufo de 3–5 prismas de 6 faces facetados, laranja→amarelo, pontas para fora. */
export function cristalFogo(c: Cena, x: number, z: number, s = 1, seed = 1, lod = 0) {
  const GL = c.glow(x, z)
  const n = lod ? 2 : 3 + Math.floor(rnd(seed, 1) * 3)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(seed, k, 2) * 1.2, tilt = k ? 0.28 + rnd(seed, k, 3) * 0.25 : 0.08
    const h = s * (k ? 0.55 + rnd(seed, k, 4) * 0.4 : 1), r = s * (k ? 0.15 : 0.22)
    const bx = x + Math.cos(a) * s * (k ? 0.3 : 0), bz = z + Math.sin(a) * s * (k ? 0.3 : 0)
    const tp: V3 = [bx + Math.cos(a) * h * tilt, h * 0.7, bz + Math.sin(a) * h * tilt]
    // laranja SATURADO com faces amarelas e uma vermelha funda (o facetado da ref), sem lavar de branco
    prisma(GL, [bx, -0.05, bz], tp, r, h * 0.35, lod ? 4 : 6, [[1, 0.45, 0.05], [1, 0.72, 0.16], [0.9, 0.24, 0.04], [1, 0.58, 0.1], [1, 0.84, 0.3], [0.96, 0.36, 0.06]], a, false)
  }
}

// ═══════════════ MADEIRA E FERRO DA MINA ═══════════════

/**
 * CAIXOTE FERRADO (inventário `caixote-ferrado`): tábuas com o X de travamento em cada face, moldura de
 * ripas, CANTONEIRAS de ferro dobradas nas 8 quinas com rebites. `s` = aresta; `y` = altura da base.
 */
export function caixote(c: Cena, x: number, z: number, s = 1.1, rot = 0, y = 0, lod = 0, caixaOn = true) {
  const g = c.geo(x, z)
  const q = quadro(x, z, -rot)
  cx(g, q, 0, 0, s, s, y, y + s, mix(MAD_ESC, MAD, 0.35), mix(MAD_CL, MAD, 0.3))
  if (!lod) {
    const e = s * 0.09
    // nas 4 faces laterais: moldura (4 ripas) + X (2 ripas em diagonal)
    for (let f = 0; f < 4; f++) {
      const ang = (f / 4) * Math.PI * 2
      const nx = Math.sin(ang - rot), nz = Math.cos(ang - rot), tx = -Math.cos(ang - rot), tz = Math.sin(ang - rot)
      const o = s / 2 + 0.015
      const P = (u: number, yy: number): V3 => [x + nx * o + tx * u, y + yy, z + nz * o + tz * u]
      for (const [a, b] of [[P(-s / 2 + e / 2, e / 2), P(s / 2 - e / 2, e / 2)], [P(-s / 2 + e / 2, s - e / 2), P(s / 2 - e / 2, s - e / 2)], [P(-s / 2 + e / 2, e / 2), P(-s / 2 + e / 2, s - e / 2)], [P(s / 2 - e / 2, e / 2), P(s / 2 - e / 2, s - e / 2)], [P(-s / 2 + e, e), P(s / 2 - e, s - e)], [P(s / 2 - e, e), P(-s / 2 + e, s - e)]] as const)
        tube(g, a, b, e * 0.6, e * 0.6, 4, (k) => (k === 0 ? MAD_CL : MAD), false)
      // cantoneiras: as 4 quinas da face (chapinha em L com rebite)
      for (const [u, yy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]] as const) {
        const p = P(u * (s / 2 - e * 0.6), yy ? s - e * 0.6 : e * 0.6)
        chapa(g, [p[0] + nx * 0.03, p[1], p[2] + nz * 0.03], [tx, 0, tz], [0, 1, 0], [nx, 0, nz], e * 2.2, e * 2.2, lod)
      }
    }
  }
  if (caixaOn) c.block(x, z, s / 2, s / 2, y + s, rot)
}

/** BARRIL (inventário `barril`): 10 aduelas abauladas, 3 aros de ferro, tampa com tábuas. */
export function barril(c: Cena, x: number, z: number, h = 1.1, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const r = h * 0.38, n = lod ? 6 : 10
  const prof = [0.86, 1, 0.86]
  const ys = [0, h / 2, h]
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + rnd(seed, 1), a1 = ((k + 1) / n) * Math.PI * 2 + rnd(seed, 1)
    const cor = k % 2 ? MAD : mix(MAD, MAD_ESC, 0.25)
    for (let j = 0; j < 2; j++) {
      const P = (a: number, i: number): V3 => [x + Math.cos(a) * r * prof[i], ys[i], z + Math.sin(a) * r * prof[i]]
      face(g, [P(a0, j), P(a1, j), P(a1, j + 1), P(a0, j + 1)], [cor, cor, mix(cor, MAD_CL, 0.3), mix(cor, MAD_CL, 0.3)], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)])
    }
  }
  face(g, Array.from({ length: n }, (_, k): V3 => [x + Math.cos((k / n) * Math.PI * 2) * r * 0.86, h, z + Math.sin((k / n) * Math.PI * 2) * r * 0.86]), MAD_CL, [0, 1, 0])
  if (!lod)
    for (const [y, pr] of [[h * 0.12, 0.92], [h * 0.5, 1.02], [h * 0.88, 0.92]] as const) tube(g, [x, y - 0.04, z], [x, y + 0.04, z], r * pr + 0.02, r * pr + 0.02, n, () => FERRO, false)
  c.block(x, z, r, r, h)
}

/**
 * POSTE-LANTERNA (inventário `poste-lanterna`): mourão grosso de madeira com cinta de ferro e rebites, BRAÇO
 * no alto com MÃO-FRANCESA em diagonal, lanterna de ferro pendurada por argola. A frente = lado do braço.
 */
export function posteLanterna(c: Cena, x: number, z: number, h = 4, ang = 0, lod = 0) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang)
  const e = 0.3
  cx(g, quadro(x, z, ang), 0, 0, e, e, 0, h, MAD, MAD_CL)
  // braço e mão-francesa
  const L = 1.2
  viga(g, [x - fx * 0.1, h - 0.15, z - fz * 0.1], [x + fx * L, h - 0.15, z + fz * L], 0.22, lod)
  viga(g, [x + fx * 0.05, h - 1.1, z + fz * 0.05], [x + fx * L * 0.55, h - 0.2, z + fz * L * 0.55], 0.14, lod)
  if (!lod) {
    // cinta de ferro com rebites (no pé e no alto)
    for (const y of [0.5, h - 0.45]) tube(g, [x, y - 0.08, z], [x, y + 0.08, z], e * 0.78, e * 0.78, 4, () => FERRO, false)
    chapa(g, [x, h - 0.15, z], [Math.cos(ang), 0, -Math.sin(ang)], [0, 1, 0], [fx, 0, fz], 0.34, 0.34, lod)
    tube(g, [x + fx * (L - 0.15), h - 0.26, z + fz * (L - 0.15)], [x + fx * (L - 0.15), h - 0.55, z + fz * (L - 0.15)], 0.025, 0.025, 3, () => FERRO_ESC, false)
  }
  lanterna(c, x + fx * (L - 0.15), z + fz * (L - 0.15), h - 0.95, 1.2, lod)
  c.block(x, z, e, e, h)
}

/**
 * VAGONETE (inventário `vagonete`): caçamba de tábuas em TRONCO DE PIRÂMIDE (boca maior), cinta de ferro em
 * cima e embaixo com cantoneiras rebitadas, 4 rodas de ferro com cubo, e MINÉRIO aceso em pedras
 * facetadas transbordando. Fica sobre trilho (a cena põe o trilho).
 */
export function vagonete(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const q = quadro(x, z, ang)
  const y0 = 0.42, y1 = 1.25
  const fb = 0.55, ft = 0.7, lb = 0.82, lt = 0.98 // meia largura (u) e meio comprimento (v), base/topo
  const cant = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const
  const B = cant.map(([s, t]) => q.P(s * fb, t * lb, y0)), T = cant.map(([s, t]) => q.P(s * ft, t * lt, y1))
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    const mid = q.P((cant[k][0] + cant[j][0]) * 0.5, (cant[k][1] + cant[j][1]) * 0.5, 0)
    const n: V3 = [mid[0] - x, 0.2, mid[2] - z]
    // tábuas: 3 faixas de tom alternado
    for (let b = 0; b < 3; b++) {
      const t0 = b / 3, t1 = (b + 1) / 3
      const L = (P0: V3, P1: V3, t: number): V3 => [P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t, P0[2] + (P1[2] - P0[2]) * t]
      const cor = b % 2 ? MAD : mix(MAD, MAD_ESC, 0.3)
      face(g, [L(B[k], T[k], t0), L(B[j], T[j], t0), L(B[j], T[j], t1), L(B[k], T[k], t1)], [cor, cor, mix(cor, MAD_CL, 0.2), mix(cor, MAD_CL, 0.2)], n)
    }
  }
  face(g, B, MAD_ESC, [0, -1, 0])
  if (!lod) {
    // cintas de ferro (topo e base) e cantoneiras nas 4 quinas verticais
    for (const [P, yy] of [[T, y1], [B, y0]] as const)
      for (let k = 0; k < 4; k++) {
        const j = (k + 1) % 4
        tube(g, [P[k][0], yy - 0.04, P[k][2]], [P[j][0], yy - 0.04, P[j][2]], 0.06, 0.06, 4, () => FERRO, false)
      }
    for (let k = 0; k < 4; k++) {
      tube(g, B[k], T[k], 0.08, 0.08, 4, () => FERRO, false)
      rebite(g, [(B[k][0] + T[k][0]) / 2, (y0 + y1) / 2, (B[k][2] + T[k][2]) / 2], [B[k][0] - x, 0, B[k][2] - z], 0.06)
    }
    // rodas (4), cubo e eixo
    for (const s of [-1, 1])
      for (const t of [-1, 1]) {
        const p = q.P(s * (fb - 0.02), t * 0.5, 0.34)
        const e: V3 = [Math.cos(ang) * -s * 0.2, 0, Math.sin(ang) * s * 0.2]
        roda(g, p, e, 0.34, lod)
        tube(g, [p[0] + e[0], p[1], p[2] + e[2]], [p[0] + e[0] * 1.6, p[1], p[2] + e[2] * 1.6], 0.09, 0.09, 6, () => FERRO_CL, false)
      }
  }
  // minério: pedras facetadas acesas transbordando (8; 3 longe)
  // minério em MONTE: pedras facetadas (prismas curtos com ponta) empilhadas mais alto no meio
  const nm = lod ? 4 : 18
  for (let k = 0; k < nm; k++) {
    const u = (rnd(k, 3, 1) - 0.5) * ft * 1.6, v = (rnd(k, 3, 2) - 0.5) * lt * 1.7
    const meio = 1 - Math.min(1, Math.hypot(u / ft, v / lt))
    const p = q.P(u, v, 0)
    const s = 0.13 + rnd(k, 3, 3) * 0.1
    const y = y1 - 0.08 + meio * 0.32
    const cor: RGB[] = [[1, 0.5, 0.08], [1, 0.76, 0.2], [0.94, 0.32, 0.05], [1, 0.62, 0.12]]
    prisma(GL, [p[0], y, p[2]], [p[0] + (rnd(k, 3, 4) - 0.5) * 0.1, y + s * 0.9, p[2]], s, s * 0.6, 5, cor, k, false)
  }
  c.block(x, z, ft, lt, y1 + 0.3, -ang)
}

/** TRILHO entre dois pontos: 2 barras de ferro sobre dormentes de madeira a cada 0,7 m. */
export function trilho(c: Cena, a: readonly [number, number], b: readonly [number, number], lod = 0) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = dz, nz = -dx
  const g = c.geo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  for (const s of [-0.55, 0.55]) tube(g, [a[0] + nx * s, 0.12, a[1] + nz * s], [b[0] + nx * s, 0.12, b[1] + nz * s], 0.05, 0.05, 4, () => FERRO_CL, false)
  if (lod) return
  for (let t = 0.3; t < L; t += 0.7) {
    const px = a[0] + dx * t, pz = a[1] + dz * t
    caixa(g, { x: px, z: pz, y0: 0, y1: 0.08, w: 1.6, d: 0.24, rot: -Math.atan2(dx, dz), side: MAD_ESC, top: MAD })
  }
}

/**
 * BOCA DE MINA (inventário `boca-mina`): pórtico de 2 pés de viga grossa + verga, MÃOS-FRANCESAS em diagonal
 * nos cantos, CHAPAS rebitadas em cada junta, lanterna pendurada na verga, túnel escuro com 2 lanternas ao
 * fundo e escoras internas (dá profundidade), rocha basáltica angulosa em volta e trilho saindo.
 */
export function bocaMina(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z)
  const q = quadro(x, z, ang)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = -Math.cos(ang), sz = Math.sin(ang)
  const W = 2, H = 3.8, e = 0.42
  // rocha em volta (5 blocos angulosos) e o "teto" do morro
  for (const [u, v, s, sd] of [[-3.8, -1.6, 2.4, 1], [3.8, -1.4, 2.3, 2], [0, -6.2, 3.6, 3], [-3, -3.4, 2.6, 4], [3.2, -3.6, 2.8, 5], [-1.6, -4.8, 2.2, 6], [1.8, -5, 2.4, 7]] as const) {
    const p = q.P(u, v, 0)
    rocha(c, p[0], p[2], s, sd + Math.floor(x), lod, false)
  }
  c.block(x - fx * 2.4, z - fz * 2.4, 5, 2.2, 6, -ang)
  for (const s of [-1, 1]) c.block(x + sx * s * (W + 1.6), z + sz * s * (W + 1.6), 1.2, 1.4, 5, -ang)
  // túnel: fundo escuro em 3 planos (degradê para o preto) e escoras internas
  const T = (u: number, v: number, y: number): V3 => q.P(u, v, y)
  for (let k = 0; k < 3; k++) {
    const v = -0.2 - k * 1.6, cor = mul([0.16, 0.08, 0.06], 1 - k * 0.3)
    face(g, [T(-W + 0.1, v, 0), T(W - 0.1, v, 0), T(W - 0.1, v, H - 0.2), T(-W + 0.1, v, H - 0.2)], cor, [fx, 0, fz])
  }
  if (!lod) {
    for (const v of [-1.2, -2.6]) {
      for (const s of [-1, 1]) cx(g, q, s * (W - 0.5), v, 0.28, 0.28, 0, H - 0.6, mul(MAD, 0.6))
      cx(g, q, 0, v, 2 * W - 0.8, 0.28, H - 0.8, H - 0.55, mul(MAD, 0.6))
    }
    lanterna(c, T(0, -2.2, 0)[0], T(0, -2.2, 0)[2], 2.4, 0.9, lod)
  }
  // pórtico: pés, verga, mãos-francesas
  for (const s of [-1, 1]) cx(g, q, s * W, 0, e, e, 0, H, MAD, MAD_CL)
  cx(g, q, 0, 0.05, 2 * W + e * 2.2, e + 0.05, H, H + e, MAD, MAD_CL)
  for (const s of [-1, 1]) viga(g, T(s * (W - 0.05), 0.12, H - 1.1), T(s * (W - 1.0), 0.12, H - 0.02), 0.32, lod)
  if (!lod) {
    // chapas rebitadas nas juntas (pé × verga, mão-francesa) e no meio da verga
    const a: V3 = [sx, 0, sz], b: V3 = [0, 1, 0], n: V3 = [fx, 0, fz]
    for (const s of [-1, 1]) {
      chapa(g, T(s * W, e / 2 + 0.03, H + e / 2), a, b, n, 0.62, 0.52, lod)
      chapa(g, T(s * W, e / 2 + 0.03, 0.5), a, b, n, 0.5, 0.36, lod)
      chapa(g, T(s * (W - 0.45), 0.31, H - 0.5), a, b, n, 0.3, 0.3, lod)
    }
    chapa(g, T(0, e / 2 + 0.06, H + e / 2), a, b, n, 0.5, 0.42, lod)
    // lanterna pendurada na verga
    tube(g, T(0.9, 0.25, H), T(0.9, 0.25, H - 0.45), 0.02, 0.02, 3, () => FERRO_ESC, false)
    const lp = T(0.9, 0.25, 0)
    lanterna(c, lp[0], lp[2], H - 0.8, 1, lod)
    // trilho saindo
    const ta = T(0, -3.4, 0), tb = T(0, 6, 0)
    trilho(c, [ta[0], ta[2]], [tb[0], tb[2]], lod)
  }
}

// ═══════════════ FORJA ═══════════════

/**
 * BIGORNA (inventário `bigorna`): corpo de ferro escuro com CHIFRE cônico de um lado e rabo quadrado do outro,
 * cintura estreita, pés largos; PLACA DE OURO com losango na cintura; sobre base de pedra em 2 degraus com
 * cinta de ferro rebitada. ~2,4 m de comprimento.
 */
export function bigorna(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const q = quadro(x, z, ang)
  // base de pedra em degraus + cinta
  cx(g, q, 0, 0, 2.4, 1.6, 0, 0.35, PEDRA_ESC, PEDRA)
  cx(g, q, 0, 0, 2, 1.25, 0.35, 0.7, PEDRA, PEDRA_CL)
  if (!lod) cx(g, q, 0, 0, 2.05, 1.3, 0.48, 0.58, FERRO, FERRO_CL)
  const Fc = mix(FERRO_ESC, FERRO, 0.4)
  // pés (tronco de pirâmide) e cintura
  // pés largos em 2 lóbulos (a ref tem as 4 patas abertas), cintura alta e estreita, mesa grossa
  const Fb = mix(FERRO, FERRO_CL, 0.15)
  // corpo LARGO como na ref: pés quase da largura da mesa, cintura a 70%, pescoço a 60%
  for (const s of [-1, 1]) cx(g, q, s * 0.62, 0, 0.75, 1.1, 0.7, 1.1, Fb, FERRO_CL)
  cx(g, q, 0, 0, 2.0, 0.9, 0.7, 0.92, Fc, FERRO)
  cx(g, q, 0, 0, 1.55, 0.74, 1.1, 1.55, Fb, FERRO_CL)
  cx(g, q, 0, 0, 1.3, 0.62, 1.55, 1.85, Fc, FERRO)
  cx(g, q, -0.1, 0, 2.2, 0.82, 1.85, 2.35, Fb, mix(FERRO_CL, [1, 1, 1], 0.15))
  // chifre: cone LONGO deitado saindo da mesa para +u, levemente caído
  const hb = q.P(0.95, 0, 2.12), ht = q.P(2.2, 0, 2.05)
  tube(g, hb, ht, 0.38, 0.04, lod ? 5 : 8, (k) => (k % 2 ? Fc : FERRO), false)
  tube(g, q.P(0.6, 0, 2.0), hb, 0.3, 0.38, lod ? 5 : 8, () => Fc, false)
  if (lod) { c.block(x, z, 1.3, 0.8, 2.35, -ang); return }
  // rabo com o degrau
  cx(g, q, -1.25, 0, 0.35, 0.66, 2.0, 2.3, Fc, FERRO_CL)
  // placa de ouro com losango (frente, +v) e rebites
  const n: V3 = [Math.sin(ang), 0, Math.cos(ang)], a: V3 = [-Math.cos(ang), 0, Math.sin(ang)]
  const p = q.P(0, 0.33, 1.35)
  face(g, [q.P(-0.36, 0.34, 1.12), q.P(0.36, 0.34, 1.12), q.P(0.36, 0.34, 1.58), q.P(0, 0.34, 1.68), q.P(-0.36, 0.34, 1.58)], OURO, n)
  face(GL, [q.P(0, 0.35, 1.18), q.P(0.14, 0.35, 1.36), q.P(0, 0.35, 1.54), q.P(-0.14, 0.35, 1.36)], [BRASA, BRASA_CL, BRASA_CL, BRASA], n)
  // cinta de ferro com rebites no pé (a da ref)
  cx(g, q, 0, 0, 2.05, 0.94, 0.72, 0.84, FERRO, FERRO_CL)
  for (const s of [-1, 1]) for (const t of [-1, 1]) rebite(g, [p[0] + a[0] * s * 0.24, p[1] + t * 0.13, p[2] + a[2] * s * 0.24], n, 0.035)
  // quina clara da mesa (o brilho do ferro gasto)
  cx(g, q, -0.1, 0.4, 2.1, 0.04, 2.29, 2.35, FERRO_CL, FERRO_CL)
  c.block(x, z, 1.3, 0.8, 2.35, -ang)
}

/**
 * LANTERNA-PEDESTAL (inventário `lanterna-pedestal`): bloco de pedra escura com MOLDURA de ferro rebitada nas
 * quinas, losango de brasa na frente, e a lanterna de ferro com vidro âmbar em cima. Marca o caminho.
 */
export function lanternaPedestal(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const q = quadro(x, z, ang)
  cx(g, q, 0, 0, 1.1, 1.1, 0, 0.18, PEDRA_ESC, PEDRA)
  cx(g, q, 0, 0, 0.86, 0.86, 0.18, 1.3, PEDRA, PEDRA_CL)
  cx(g, q, 0, 0, 1, 1, 1.3, 1.42, MAD, MAD_CL)
  if (!lod) {
    // cantoneiras (4 quinas verticais) e cinta
    for (const s of [-1, 1]) for (const t of [-1, 1]) cx(g, q, s * 0.43, t * 0.43, 0.1, 0.1, 0.18, 1.3, MAD, MAD_CL)
    cx(g, q, 0, 0, 0.9, 0.9, 0.18, 0.3, MAD, MAD_CL)
    for (let f = 0; f < 4; f++) {
      const a = ang + (f / 4) * Math.PI * 2
      const n: V3 = [Math.sin(a), 0, Math.cos(a)], t: V3 = [-Math.cos(a), 0, Math.sin(a)]
      const p: V3 = [x + n[0] * 0.44, 0.78, z + n[2] * 0.44]
      face(GL, [[p[0] - t[0] * 0.0, 0.55, p[2] - t[2] * 0.0], [p[0] + t[0] * 0.14, 0.78, p[2] + t[2] * 0.14], [p[0], 1.01, p[2]], [p[0] - t[0] * 0.14, 0.78, p[2] - t[2] * 0.14]], [BRASA_ESC, BRASA, BRASA_CL, BRASA], n)
      for (const s of [-1, 1]) rebite(g, [p[0] + t[0] * s * 0.38, 1.36, p[2] + t[2] * s * 0.38], n, 0.04)
    }
  }
  lanterna(c, x, z, 1.78, 1.5, lod)
  c.block(x, z, 0.55, 0.55, 2.2, -ang)
}

/**
 * BRASEIRO (inventário `braseiro`): pedestal de pedra escura com FENDA vertical acesa na frente e emblema de
 * ouro, capitel; BACIA de ferro com bordas e as chamas (6 línguas em 2 camadas, amarelo no miolo).
 */
export function braseiro(c: Cena, x: number, z: number, h = 1.1, lod = 0, ang = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const q = quadro(x, z, ang)
  cx(g, q, 0, 0, 0.82, 0.82, 0, 0.16, PEDRA, PEDRA_CL)
  cx(g, q, 0, 0, 0.62, 0.62, 0.16, h, PEDRA_ESC, PEDRA)
  cx(g, q, 0, 0, 0.78, 0.78, h, h + 0.12, PEDRA, PEDRA_CL)
  if (!lod)
    for (let f = 0; f < 4; f++) {
      const a = ang + (f / 4) * Math.PI * 2
      const n: V3 = [Math.sin(a), 0, Math.cos(a)], t: V3 = [-Math.cos(a), 0, Math.sin(a)]
      const p: V3 = [x + n[0] * 0.315, 0, z + n[2] * 0.315]
      face(GL, [[p[0] - t[0] * 0.05, 0.3, p[2] - t[2] * 0.05], [p[0] + t[0] * 0.05, 0.3, p[2] + t[2] * 0.05], [p[0] + t[0] * 0.05, h - 0.18, p[2] + t[2] * 0.05], [p[0] - t[0] * 0.05, h - 0.18, p[2] - t[2] * 0.05]], [BRASA, BRASA, BRASA_CL, BRASA_CL], n)
    }
  // bacia: tronco de cone de ferro com borda
  tube(g, [x, h + 0.12, z], [x, h + 0.42, z], 0.3, 0.55, lod ? 6 : 8, (k) => (k % 2 ? FERRO : FERRO_ESC), false)
  if (!lod) tube(g, [x, h + 0.4, z], [x, h + 0.47, z], 0.58, 0.58, 8, () => FERRO_CL, false)
  // chamas: 2 camadas de línguas (dupla face), miolo amarelo
  const n = lod ? 3 : 6
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.3
    const r = k % 2 ? 0.32 : 0.18, hh = (k % 2 ? 0.75 : 1.05) + rnd(k, x, z) * 0.25
    const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r
    const t: V3 = [-Math.sin(a) * 0.17, 0, Math.cos(a) * 0.17]
    const tip: V3 = [bx + Math.cos(a) * 0.08, h + 0.42 + hh, bz + Math.sin(a) * 0.08]
    for (const s of [1, -1]) face(GL, [[bx - t[0], h + 0.42, bz - t[2]], [bx + t[0], h + 0.42, bz + t[2]], tip], [BRASA_ESC, BRASA, BRASA_CL], [Math.cos(a) * s, 0, Math.sin(a) * s])
  }
  tube(GL, [x, h + 0.4, z], [x, h + 0.9, z], 0.2, 0.02, 5, () => [1, 0.96, 0.7], false)
  c.block(x, z, 0.42, 0.42, h + 0.5, -ang)
}

/**
 * FORJA (inventário `forja-arco`): bloco de pedra em FIADAS (2 tons, juntas escuras), BOCA em arco redondo
 * com aduelas de pedra clara, o fundo da boca ACESO em degradê (brasa → amarelo) com toras em brasa no pé,
 * chaminé atrás com cinta de ferro, 2 ESTANDARTES vermelhos com emblema de ouro, rachaduras acesas.
 * ~7 m de frente; a boca olha para `ang`.
 */
export function forjaArco(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const q = quadro(x, z, ang)
  const W = 7, D = 5, H = 6
  const R = 1.75, yb = 2.1, fundo = 1.4 // a boca tem 1,4 m de fundo
  // corpo atrás da boca; na frente, 2 paredes laterais e o lintel em volta do vão (a boca fica aberta)
  cx(g, q, 0, -fundo - (D - fundo) / 2, W, D - fundo, 0, H, PEDRA, PEDRA_CL)
  for (const s of [-1, 1]) cx(g, q, s * (W / 2 + R + 0.55) / 2, -fundo / 2, W / 2 - R - 0.55, fundo, 0, H, PEDRA, PEDRA_CL)
  cx(g, q, 0, -fundo / 2, 2 * (R + 0.55), fundo, yb + R + 0.4, H, PEDRA, PEDRA_CL)
  // fiadas: faixas de pedra salientes alternando tom na fachada (+v = 0)
  if (!lod)
    for (let k = 0; k < 6; k++) {
      const y0 = k * 1, cor = k % 2 ? PEDRA : mix(PEDRA, PEDRA_ESC, 0.5)
      for (const s of [-1, 1]) cx(g, q, s * 2.65, 0.06, 1.7, 0.12, y0 + 0.04, y0 + 0.96, cor, PEDRA_CL)
    }
  cx(g, q, 0, 0.2, W + 0.4, 0.5, H - 0.4, H, PEDRA_ESC, PEDRA_CL) // cornija
  // boca em arco: aduelas (9) em volta de um semicírculo + ombreiras
  const seg = lod ? 5 : 9
  for (let k = 0; k < seg; k++) {
    const a0 = Math.PI * (k / seg), a1 = Math.PI * ((k + 1) / seg)
    const P = (a: number, r: number, v: number): V3 => q.P(Math.cos(a) * r, v, yb + Math.sin(a) * r)
    const cor = k % 2 ? PEDRA_CL : mix(PEDRA_CL, PEDRA, 0.4)
    face(g, [P(a0, R, 0.25), P(a1, R, 0.25), P(a1, R + 0.55, 0.25), P(a0, R + 0.55, 0.25)], cor, q.N(0, 1))
    face(g, [P(a0, R, 0.25), P(a1, R, 0.25), P(a1, R, -fundo), P(a0, R, -fundo)], mul(PEDRA, 0.55), [0, -1, 0])
    // tímpano entre o arco e o lintel (fecha o vão acima do semicírculo)
    face(g, [P(a0, R + 0.55, 0.02), P(a1, R + 0.55, 0.02), q.P(Math.cos((a0 + a1) / 2) * (R + 0.55), 0.02, yb + R + 0.4)], PEDRA, q.N(0, 1))
  }
  for (const s of [-1, 1]) cx(g, q, s * (R + 0.27), 0.1, 0.55, 0.5, 0, yb, PEDRA_CL, PEDRA_CL)
  // fundo aceso da boca: degradê do pé (amarelo) para o alto (brasa), em leque; laterais da boca acesas
  const vf = -fundo + 0.02
  const fz = (a: number, r: number): V3 => q.P(Math.cos(a) * r, vf, yb + Math.sin(a) * r)
  face(GL, [q.P(-R, vf, 0), q.P(R, vf, 0), q.P(R, vf, yb), q.P(-R, vf, yb)], [BRASA_CL, BRASA_CL, BRASA, BRASA], q.N(0, 1))
  for (let k = 0; k < seg; k++) face(GL, [q.P(0, vf, yb), fz(Math.PI * (k / seg), R), fz(Math.PI * ((k + 1) / seg), R)], [BRASA, BRASA_ESC, BRASA_ESC], q.N(0, 1))
  for (const s of [-1, 1]) face(GL, [q.P(s * R, vf, 0), q.P(s * R, 0.2, 0), q.P(s * R, 0.2, yb), q.P(s * R, vf, yb)], [BRASA, mul(BRASA_ESC, 0.7), mul(BRASA_ESC, 0.6), BRASA_ESC], q.N(-s, 0))
  // tijolos refratários do fundo (linhas escuras sobre o fundo aceso), 3 fiadas
  if (!lod) for (let k = 1; k < 4; k++) face(g, [q.P(-R, vf + 0.02, k * 0.55), q.P(R, vf + 0.02, k * 0.55), q.P(R, vf + 0.02, k * 0.55 + 0.06), q.P(-R, vf + 0.02, k * 0.55 + 0.06)], mul(BRASA_ESC, 0.5), q.N(0, 1))
  if (!lod) {
    // toras em brasa e chamas no pé da boca
    for (let k = 0; k < 3; k++) tube(GL, q.P(-0.9 + k * 0.6, -0.9, 0.15), q.P(-0.5 + k * 0.6, -0.5, 0.25), 0.16, 0.14, 5, (j) => (j % 2 ? BRASA : BRASA_CL), false)
    for (let k = 0; k < 5; k++) {
      const u = -1.1 + k * 0.55, hh = 0.9 + rnd(k, x, 7) * 0.7
      for (const s of [1, -1]) face(GL, [q.P(u - 0.25, -0.7, 0.3), q.P(u + 0.25, -0.7, 0.3), q.P(u + 0.05, -0.7, 0.3 + hh)], [BRASA, BRASA_CL, [1, 0.96, 0.7]], q.N(0, s))
    }
    // estandartes (2): haste de ferro, pano vermelho com ponta em V, emblema de ouro (engrenagem simples)
    for (const s of [-1, 1]) {
      const u = s * 2.65
      cx(g, q, u, 0.2, 1.4, 0.08, 5.2, 5.3, FERRO, FERRO_CL)
      face(g, [q.P(u - 0.6, 0.22, 5.2), q.P(u + 0.6, 0.22, 5.2), q.P(u + 0.6, 0.22, 2.4), q.P(u, 0.22, 1.9), q.P(u - 0.6, 0.22, 2.4)], [BANDEIRA, BANDEIRA, mul(BANDEIRA, 0.8), mul(BANDEIRA, 0.7), mul(BANDEIRA, 0.8)], q.N(0, 1))
      for (const t of [-1, 1]) cx(g, q, u + t * 0.52, 0.24, 0.06, 0.02, 2.4, 5.2, OURO, OURO)
      const ec = q.P(u, 0.25, 3.9)
      const m = 8
      for (let k = 0; k < m; k++) {
        const a0 = (k / m) * Math.PI * 2, a1 = ((k + 1) / m) * Math.PI * 2, r0 = k % 2 ? 0.34 : 0.26
        const A = q.P(u + Math.cos(a0) * r0, 0.25, 3.9 + Math.sin(a0) * r0), B = q.P(u + Math.cos(a1) * 0.3, 0.25, 3.9 + Math.sin(a1) * 0.3)
        face(g, [ec, A, B], OURO, q.N(0, 1))
      }
    }
    // rachaduras acesas na pedra (3, em zigue-zague)
    for (let k = 0; k < 3; k++) {
      let u = -3 + k * 2.8 + rnd(k, x, 3), y = 4.2 + rnd(k, x, 4)
      for (let j = 0; j < 3; j++) {
        const u2 = u + (rnd(k, j, 5) - 0.5) * 0.7, y2 = y - 0.5
        face(GL, [q.P(u - 0.04, 0.03, y), q.P(u + 0.04, 0.03, y), q.P(u2 + 0.03, 0.03, y2), q.P(u2 - 0.03, 0.03, y2)], [BRASA, BRASA, BRASA_CL, BRASA_CL], q.N(0, 1))
        u = u2
        y = y2
      }
    }
  }
  // chaminé atrás, com cinta de ferro e brasa na boca
  const ch = q.P(1.8, -D + 1.1, 0)
  caixa(g, { x: ch[0], z: ch[2], y0: H, y1: H + 3.2, w: 1.4, d: 1.4, rot: q.rot, side: PEDRA_ESC, top: PEDRA })
  if (!lod) caixa(g, { x: ch[0], z: ch[2], y0: H + 2.4, y1: H + 2.6, w: 1.5, d: 1.5, rot: q.rot, side: FERRO, top: FERRO })
  face(GL, [[ch[0] - 0.55, H + 3.22, ch[2] - 0.55], [ch[0] + 0.55, H + 3.22, ch[2] - 0.55], [ch[0] + 0.55, H + 3.22, ch[2] + 0.55], [ch[0] - 0.55, H + 3.22, ch[2] + 0.55]], BRASA, [0, 1, 0])
  const fc = q.P(0, -D / 2, 0)
  c.block(fc[0], fc[2], W / 2, D / 2, H, -ang)
}

/**
 * MARTELO GIGANTE (inventário `martelo-gigante`): pedestal de pedra em 3 degraus, CABO grosso de madeira com
 * cintas de ferro e luva de ouro, CABEÇA de pedra hexagonal facetada (os dois lados em ponta truncada) com
 * cinta de ouro e emblema, inclinada; 2 CORRENTES de elos (anéis alternados) do cabo até argolas no chão.
 */
export function marteloGigante(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const q = quadro(x, z, ang)
  cx(g, q, 0, 0, 4, 4, 0, 0.5, PEDRA_ESC, PEDRA)
  cx(g, q, 0, 0, 3.1, 3.1, 0.5, 1, PEDRA, PEDRA_CL)
  cx(g, q, 0, 0, 2.2, 2.2, 1, 1.5, PEDRA, PEDRA_CL)
  if (!lod) for (const s of [-1, 1]) face(GL, [q.P(s * 0.6 - 0.05, 1.11, 0.55), q.P(s * 0.6 + 0.05, 1.11, 0.55), q.P(s * 0.6 + 0.05, 1.11, 0.95), q.P(s * 0.6 - 0.05, 1.11, 0.95)], BRASA, q.N(0, 1))
  // cabo inclinado
  const base: V3 = q.P(0, 0, 1.5), topo: V3 = q.P(0.9, -0.4, 6.4)
  tube(g, base, topo, 0.34, 0.3, lod ? 4 : 6, (k) => (k % 2 ? MAD : MAD_CL), false)
  if (!lod)
    for (const t of [0.15, 0.55, 0.85]) {
      const p: V3 = [base[0] + (topo[0] - base[0]) * t, base[1] + (topo[1] - base[1]) * t, base[2] + (topo[2] - base[2]) * t]
      const p2: V3 = [p[0] + (topo[0] - base[0]) * 0.04, p[1] + (topo[1] - base[1]) * 0.04, p[2] + (topo[2] - base[2]) * 0.04]
      tube(g, p, p2, 0.4, 0.4, 6, () => (t === 0.85 ? OURO : FERRO), false)
    }
  // cabeça: prisma de 6 lados deitado (eixo ao longo de u), pontas truncadas
  const hc = topo
  const ax: V3 = [-Math.cos(ang) * Math.cos(0.3), Math.sin(0.3), Math.sin(ang) * Math.cos(0.3)]
  const L = 1.7, R = 1.1
  const A: V3 = [hc[0] - ax[0] * L, hc[1] - ax[1] * L, hc[2] - ax[2] * L], B: V3 = [hc[0] + ax[0] * L, hc[1] + ax[1] * L, hc[2] + ax[2] * L]
  const lados = lod ? 4 : 6
  tube(g, A, B, R, R, lados, (k) => (k % 3 === 0 ? PEDRA_CL : k % 2 ? PEDRA : mix(PEDRA, PEDRA_CL, 0.5)), false)
  for (const [P, s] of [[A, -1], [B, 1]] as const) tube(g, P, [P[0] + ax[0] * s * 0.45, P[1] + ax[1] * s * 0.45, P[2] + ax[2] * s * 0.45], R, R * 0.6, lados, (k) => (k % 2 ? PEDRA_CL : PEDRA), false)
  if (!lod) {
    // cinta de ouro no meio da cabeça e emblema (estrela de 8 pontas) na face de frente
    tube(g, [hc[0] - ax[0] * 0.25, hc[1] - ax[1] * 0.25, hc[2] - ax[2] * 0.25], [hc[0] + ax[0] * 0.25, hc[1] + ax[1] * 0.25, hc[2] + ax[2] * 0.25], R + 0.05, R + 0.05, lados, () => OURO, false)
    const n: V3 = [Math.sin(ang), 0, Math.cos(ang)]
    for (const s of [-1, 1]) {
      const ec: V3 = [hc[0] + ax[0] * s * 1.05 + n[0] * (R + 0.04), hc[1] + ax[1] * s * 1.05, hc[2] + ax[2] * s * 1.05 + n[2] * (R + 0.04)]
      const t: V3 = [ax[0], ax[1], ax[2]], up: V3 = [0, 1, 0]
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2, r0 = k % 2 ? 0.45 : 0.18
        const P0: V3 = [ec[0] + (t[0] * Math.cos(a0) + up[0] * Math.sin(a0)) * r0, ec[1] + (t[1] * Math.cos(a0) + up[1] * Math.sin(a0)) * r0, ec[2] + (t[2] * Math.cos(a0) + up[2] * Math.sin(a0)) * r0]
        const P1: V3 = [ec[0] + (t[0] * Math.cos(a1) + up[0] * Math.sin(a1)) * 0.2, ec[1] + (t[1] * Math.cos(a1) + up[1] * Math.sin(a1)) * 0.2, ec[2] + (t[2] * Math.cos(a1) + up[2] * Math.sin(a1)) * 0.2]
        face(g, [ec, P0, P1], OURO, n)
      }
    }
    // correntes: elos alternados (anéis de 6 lados) do cabo até argolas no pedestal
    const preso: V3 = [base[0] + (topo[0] - base[0]) * 0.6, base[1] + (topo[1] - base[1]) * 0.6, base[2] + (topo[2] - base[2]) * 0.6]
    for (const s of [-1, 1]) {
      const fim = q.P(s * 2.1, 0.6 * s, 0.55)
      const L2 = Math.hypot(fim[0] - preso[0], fim[1] - preso[1], fim[2] - preso[2]), m = Math.floor(L2 / 0.42)
      for (let k = 0; k < m; k++) {
        const t0 = k / m, t1 = (k + 1) / m, sag = Math.sin(t0 * Math.PI) * 0.6
        const P0: V3 = [preso[0] + (fim[0] - preso[0]) * t0, preso[1] + (fim[1] - preso[1]) * t0 - sag, preso[2] + (fim[2] - preso[2]) * t0]
        const P1: V3 = [preso[0] + (fim[0] - preso[0]) * t1, preso[1] + (fim[1] - preso[1]) * t1 - Math.sin(t1 * Math.PI) * 0.6, preso[2] + (fim[2] - preso[2]) * t1]
        tube(g, P0, P1, k % 2 ? 0.18 : 0.1, k % 2 ? 0.18 : 0.1, k % 2 ? 4 : 3, () => (k % 2 ? FERRO : FERRO_ESC), false)
      }
      tube(g, [fim[0], 0.5, fim[2]], [fim[0], 0.75, fim[2]], 0.2, 0.2, 6, () => FERRO_CL, false)
    }
  }
  c.block(x, z, 2, 2, 7, -ang)
}

/** SUPORTE DE LANÇAS (inventário `rack-lancas`): cavalete de madeira (2 X + travessas) com 5 lanças de ponta de ferro em pé. */
export function rackLancas(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z)
  const q = quadro(x, z, ang)
  for (const s of [-1, 1]) {
    viga(g, q.P(s * 1.1, -0.35, 0), q.P(s * 1.1, 0.35, 1.3), 0.14, lod)
    viga(g, q.P(s * 1.1, 0.35, 0), q.P(s * 1.1, -0.35, 1.3), 0.14, lod)
  }
  viga(g, q.P(-1.25, 0, 1.0), q.P(1.25, 0, 1.0), 0.14, lod)
  viga(g, q.P(-1.25, 0.1, 0.35), q.P(1.25, 0.1, 0.35), 0.12, lod)
  const n = lod ? 3 : 5
  for (let k = 0; k < n; k++) {
    const u = -0.9 + (k / (n - 1)) * 1.8, inc = (rnd(k, x, 1) - 0.5) * 0.15
    const p0 = q.P(u, 0.1, 0), p1 = q.P(u + inc, -0.05, 2.3)
    tube(g, p0, p1, 0.05, 0.045, 4, () => MAD_ESC, false)
    tube(g, p1, [p1[0], 2.75, p1[2]], 0.1, 0.01, 4, (j) => (j % 2 ? FERRO_CL : [0.86, 0.86, 0.9]), false)
    if (!lod) tube(g, [p1[0], 2.28, p1[2]], [p1[0], 2.36, p1[2]], 0.08, 0.08, 4, () => FERRO, false)
  }
  c.block(x, z, 1.3, 0.5, 2.6, -ang)
}

/** CERCA DE MOURÕES (inventário `cerca-madeira`): mourões grossos com cinta de ferro e topo chanfrado, 2 travessas, de a até b. */
export function cerca(c: Cena, a: readonly [number, number], b: readonly [number, number], lod = 0) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L
  const n = Math.max(1, Math.round(L / 2.4))
  const g = c.geo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  const rot = -Math.atan2(dx, dz)
  for (let k = 0; k <= n; k++) {
    const px = a[0] + dx * L * (k / n), pz = a[1] + dz * L * (k / n)
    caixa(g, { x: px, z: pz, y0: 0, y1: 1.4, w: 0.36, d: 0.36, rot, side: MAD, top: MAD_CL })
    tube(g, [px, 1.4, pz], [px, 1.58, pz], 0.25, 0.08, 4, () => MAD_CL, false)
    if (!lod) caixa(g, { x: px, z: pz, y0: 1.1, y1: 1.22, w: 0.4, d: 0.4, rot, side: FERRO, top: FERRO_CL })
  }
  for (const y of [0.55, 1.05]) caixa(g, { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, y0: y, y1: y + 0.16, w: 0.12, d: L, rot, side: mix(MAD, MAD_ESC, 0.2), top: MAD_CL })
  c.block((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.3, L / 2, 1.5, rot)
}

/**
 * GUINDASTE (inventário `guindaste`): torre de 2 pés de viga com X de travamento em 2 andares, braço no alto
 * com mão-francesa, RODA DE ROLDANA (aro + 6 raios + cubo) e corrente com GANCHO de ferro.
 */
export function guindaste(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z)
  const q = quadro(x, z, ang)
  const H = 8
  for (const s of [-1, 1]) cx(g, q, s * 1.2, 0, 0.36, 0.36, 0, H, MAD, MAD_CL)
  for (const y of [2.6, 5.4]) cx(g, q, 0, 0, 2.8, 0.3, y, y + 0.3, MAD, MAD_CL)
  if (!lod)
    for (const [y0, y1] of [[0.2, 2.6], [2.9, 5.4]] as const) {
      viga(g, q.P(-1.1, 0.05, y0), q.P(1.1, 0.05, y1), 0.18, lod)
      viga(g, q.P(1.1, 0.05, y0), q.P(-1.1, 0.05, y1), 0.18, lod)
    }
  // braço e mão-francesa
  cx(g, q, 0, 1.4, 0.34, 3.6, H - 0.35, H, MAD, MAD_CL)
  viga(g, q.P(0, 0.1, H - 2), q.P(0, 1.8, H - 0.35), 0.2, lod)
  // roldana na ponta
  const rc = q.P(0, 2.7, H - 0.9)
  const m = lod ? 6 : 12
  const ax: V3 = [-Math.cos(ang), 0, Math.sin(ang)]
  for (let k = 0; k < m; k++) {
    const a0 = (k / m) * Math.PI * 2, a1 = ((k + 1) / m) * Math.PI * 2
    const P = (a: number, r: number): V3 => [rc[0] + Math.sin(ang) * Math.cos(a) * r, rc[1] + Math.sin(a) * r, rc[2] + Math.cos(ang) * Math.cos(a) * r]
    tube(g, P(a0, 0.6), P(a1, 0.6), 0.07, 0.07, 4, () => MAD_ESC, false)
    if (!lod && k % 2 === 0) tube(g, rc, P(a0, 0.56), 0.04, 0.04, 3, () => MAD, false)
  }
  tube(g, [rc[0] - ax[0] * 0.15, rc[1], rc[2] - ax[2] * 0.15], [rc[0] + ax[0] * 0.15, rc[1], rc[2] + ax[2] * 0.15], 0.12, 0.12, 6, () => FERRO, false)
  // corrente e gancho
  const pc = q.P(0, 3.3, H - 0.9)
  tube(g, pc, [pc[0], H - 3.4, pc[2]], 0.04, 0.04, 3, () => FERRO_ESC, false)
  const yG = H - 3.4
  tube(g, [pc[0], yG, pc[2]], [pc[0], yG - 0.35, pc[2]], 0.09, 0.09, 4, () => OURO, false)
  tube(g, [pc[0], yG - 0.35, pc[2]], [pc[0] + 0.2, yG - 0.6, pc[2]], 0.07, 0.06, 4, () => OURO, false)
  tube(g, [pc[0] + 0.2, yG - 0.6, pc[2]], [pc[0] + 0.32, yG - 0.4, pc[2]], 0.06, 0.03, 4, () => OURO, false)
  c.block(x, z, 1.5, 0.5, H, -ang)
}

/**
 * PISO DE LAJES POLIGONAIS (refs vulcao-1..3): lajes de 5–7 lados irregulares numa grade hexagonal de
 * `passo` m, com 2 cm de espessura (lateral escura); a JUNTA é o chão aparecendo — a cena pinta o chão do caminho de lava
 * (refs 2 e 3: a lava acesa nas rachaduras) ou de pedra escura (ref 1). Tom por laje sorteado, quina de
 * cima clara. Só onde `dentro(x, z)`. Só topo + 1 aresta clara: ~5 triângulos por laje.
 */
export function lajesPoligonais(c: Cena, x0: number, z0: number, x1: number, z1: number, passo: number, seed: number, dentro: (x: number, z: number) => boolean, lod = 0) {
  const tons: RGB[] = [[0.42, 0.37, 0.46], [0.37, 0.32, 0.41], [0.47, 0.41, 0.5], [0.33, 0.28, 0.36]] // lilás-ardósia (refs)
  const dy = passo * Math.sqrt(3) / 2
  let lin = 0
  for (let z = z0; z < z1; z += dy, lin++) {
    for (let x = x0 + (lin % 2 ? passo / 2 : 0); x < x1; x += passo) {
      const r = (q: number) => rnd(seed, Math.round(x * 10) + Math.round(z * 7), q)
      const cx = x + (r(1) - 0.5) * passo * 0.08, cz = z + (r(2) - 0.5) * passo * 0.08
      if (!dentro(cx, cz)) continue
      const n = lod ? 5 : 5 + Math.floor(r(3) * 3)
      const R = passo * 0.6 // raio de quem fecha a grade hexagonal (passo/√3 ≈ 0,577): junta FINA como na ref
      const pts: V3[] = []
      for (let k = 0; k < n; k++) {
        const a = ((k + (r(4 + k) - 0.5) * 0.25) / n) * Math.PI * 2 + (n === 6 ? Math.PI / 6 : r(12) * 6)
        const rr = R * (0.9 + r(20 + k) * 0.08)
        pts.push([cx + Math.cos(a) * rr, LAJE_ESP, cz + Math.sin(a) * rr])
      }
      const cor = tons[Math.floor(r(40) * 4)]
      const g = c.geo(cx, cz)
      lajeEspessa(g, pts, pts.map((_, k) => (k === 0 || k === 1 ? mix(cor, PEDRA_CL, 0.15) : cor)), mul(cor, 0.6), !!lod)
    }
  }
}

// ═══════════════ O VULCÃO (pano de fundo) ═══════════════

/**
 * O VULCÃO DAS REFS (inventário `vulcao-grande`; a ref vulcao-1 é a mais clara): cone de LAJES grandes e planas
 * (anéis de 16 setores com ravinas e arestas alternadas, perfil côncavo — íngreme no alto), BOCA achatada
 * com a borda dentada e o fundo aceso, RIOS DE LAVA que descem pelas ravinas do lado que olha o jogador e se
 * dividem em Y, dois OMBROS mais baixos dos lados e a COLUNA DE FUMAÇA: bolhas laranja acesas embaixo, escuras e
 * largas em cima. Vai no `horizonte` da cena (sem névoa): a bruma é pintada aqui (`bruma` 0–1 para a cor
 * `nevoa`). (x, z) = centro; `ang` = para onde olha o lado dos rios (o jogador); R = raio do pé; H = altura.
 */
export function vulcaoGrande(c: Cena, x: number, z: number, ang: number, o: { R?: number; H?: number; seed?: number; nevoa: RGB; bruma?: number; ombros?: boolean }, lod = 0) {
  const g = c.horizonte, GL = c.horizonteLuz
  const R = o.R ?? 80, H = o.H ?? 72, seed = o.seed ?? 3, br = o.bruma ?? 0.3
  const nev = o.nevoa
  const hz = (col: RGB, k = 1): RGB => mix(col, nev, br * k)
  // basalto lilás das refs (a luz vermelha do jogo come o azul: albedo puxado para o azul)
  const LUZ: RGB = [0.6, 0.53, 0.92], MEIO: RGB = [0.38, 0.31, 0.6], SOMBRA: RGB = [0.19, 0.14, 0.32]
  const fx = Math.sin(ang), fz = Math.cos(ang)
  const N = lod ? 10 : 16
  const anelT = lod ? [0, 0.45, 0.8, 1] : [0, 0.22, 0.45, 0.66, 0.84, 1]
  const cr = R * 0.2 // raio da boca
  const raio = (t: number) => cr + (R - cr) * (1 - t) ** 1.45
  // grade de vértices (anel j, setor k) com tremor; setor par = aresta (sai), ímpar = ravina (entra)
  const V: V3[][] = anelT.map((t, j) =>
    Array.from({ length: N }, (_, k): V3 => {
      const a = ((k + (rnd(seed, k, j + 1) - 0.5) * (j === anelT.length - 1 ? 0.2 : 0.45)) / N) * Math.PI * 2
      const ridge = j > 0 && j < anelT.length - 1 ? (k % 2 ? 0.93 : 1.07) : 1
      const rr = raio(t) * ridge * (0.92 + rnd(seed, k, j + 20) * 0.16)
      const yy = j === anelT.length - 1 ? H * (0.97 + rnd(seed, k, 40) * 0.06) : H * t + (j ? (rnd(seed, k, j + 30) - 0.5) * H * 0.04 : -2)
      return [x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr]
    }),
  )
  const corFace = (A: V3, B: V3, C: V3, k: number, j: number): RGB => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const mx = (A[0] + B[0] + C[0]) / 3 - x, mz = (A[2] + B[2] + C[2]) / 3 - z
    if (nx * mx + nz * mz < 0) {
      nx = -nx
      ny = -ny
      nz = -nz
    }
    const L = Math.hypot(nx, ny, nz) || 1
    // luz das refs: de cima e da direita de quem olha (as facetas viradas para lá ficam claras)
    const luz = (nx * (-fz * 0.7 + fx * 0.2) + ny * 0.55 + nz * (fx * 0.7 + fz * 0.2)) / L
    const base = luz > 0.45 ? LUZ : luz > 0.1 ? MEIO : SOMBRA
    // perto do pé, mais escuro (sombra de contato e a bruma subindo do vale)
    return hz(mul(base, 0.8 + 0.2 * (j / (anelT.length - 1)) + (rnd(seed, k, j + 60) - 0.5) * 0.1))
  }
  for (let j = 0; j < anelT.length - 1; j++)
    for (let k = 0; k < N; k++) {
      const i = (k + 1) % N
      const A = V[j][k], B = V[j][i], C = V[j + 1][i], D = V[j + 1][k]
      const m: V3 = [(A[0] + C[0]) / 2 - x, 0.4, (A[2] + C[2]) / 2 - z]
      // cada quadrado em 2 triângulos de tom próprio (a laje facetada)
      face(g, [A, B, C], corFace(A, B, C, k, j), m)
      face(g, [A, C, D], corFace(A, C, D, k + 50, j), m)
    }
  // a boca: borda de dentro (desce até 93% da altura) e o fundo aceso
  const top = V[anelT.length - 1]
  const fundo = top.map((p): V3 => [x + (p[0] - x) * 0.78, H * 0.93, z + (p[2] - z) * 0.78])
  for (let k = 0; k < N; k++) {
    const i = (k + 1) % N
    face(g, [top[k], top[i], fundo[i], fundo[k]], hz(mul(SOMBRA, 0.8)), [x - top[k][0], 0.5, z - top[k][2]])
  }
  face(GL, [[x, H * 0.95, z], ...fundo], hz([1, 0.62, 0.18], 0.4), [0, 1, 0])
  // ── RIOS DE LAVA: do lado que olha o jogador, pelas ravinas (setores ímpares), dividindo em Y
  const lava = (pts0: V3[], w0: number, w1: number, sd = 0) => {
    // serpenteia: 2 pontos no meio de cada trecho, com desvio para os lados (a lava da ref procura as dobras)
    const pts: V3[] = [pts0[0]]
    for (let q = 0; q < pts0.length - 1; q++) {
      const a = pts0[q], b = pts0[q + 1]
      const dx = b[0] - a[0], dz = b[2] - a[2], dl = Math.hypot(dx, dz) || 1
      for (const t of lod ? [] : [0.33, 0.66]) {
        const d = (rnd(seed, sd * 7 + q, t * 9) - 0.5) * dl * 0.35
        pts.push([a[0] + dx * t - (dz / dl) * d, a[1] + (b[1] - a[1]) * t, a[2] + dz * t + (dx / dl) * d])
      }
      pts.push(b)
    }
    for (let q = 0; q < pts.length - 1; q++) {
      const a = pts[q], b = pts[q + 1]
      const t0 = q / (pts.length - 1), t1 = (q + 1) / (pts.length - 1)
      const wa = w0 + (w1 - w0) * t0, wb = w0 + (w1 - w0) * t1
      // lado (perpendicular à descida, no chão) e um pouco para fora da encosta
      const dx = b[0] - a[0], dz = b[2] - a[2], dl = Math.hypot(dx, dz) || 1
      const sx = -dz / dl, sz = dx / dl
      const ol = Math.hypot(a[0] - x, a[2] - z) || 1
      const ox = (a[0] - x) / ol, oz = (a[2] - z) / ol
      const off = 2.4
      const P = (p: V3, w: number, s: number): V3 => [p[0] + sx * w * s + ox * off, p[1] + 0.3, p[2] + sz * w * s + oz * off]
      const faixas: [number, number, RGB][] = lod ? [[-1, 1, [1, 0.5, 0.12]]] : [[-1, -0.35, [0.95, 0.24, 0.06]], [-0.35, 0.35, [1, 0.78, 0.26]], [0.35, 1, [1, 0.42, 0.08]]]
      for (const [s0, s1, col] of faixas) face(GL, [P(a, wa, s0), P(a, wa, s1), P(b, wb, s1), P(b, wb, s0)], hz(col, 0.35), [ox, 0.5, oz])
    }
  }
  const frente = Math.atan2(fz, fx) // ângulo (no plano x-z) do lado que olha o jogador
  const setorDe = (a: number) => ((Math.round((a / (Math.PI * 2)) * N) % N) + N) % N
  const rios = lod ? [-0.25, 0.35] : [-0.75, -0.3, 0.12, 0.5, 0.95]
  rios.forEach((da, q) => {
    let k = setorDe(frente + da)
    if (k % 2 === 0) k = (k + 1) % N // ravina
    const desce = Math.min(anelT.length - 1, 2 + (q % 3)) // até que anel o rio vai (de cima para baixo)
    const caminho: V3[] = []
    for (let j = anelT.length - 1; j >= anelT.length - 1 - desce; j--) caminho.push(V[j][k])
    lava(caminho, 2.2, 3.4, q)
    // braço do Y: sai no meio e vai para a ravina vizinha, dois anéis abaixo
    if (!lod && caminho.length > 2) {
      const m = Math.floor(caminho.length / 2)
      const jm = anelT.length - 1 - m
      const k2 = (k + (q % 2 ? 2 : N - 2)) % N
      const ramo: V3[] = [caminho[m]]
      for (let j = jm - 1; j >= Math.max(0, jm - 2); j--) ramo.push(V[j][k2])
      if (ramo.length > 1) lava(ramo, 1.6, 2.4, q + 20)
      // filetes finos (as veias acesas que riscam as lajes na ref)
      for (let f = 0; f < 2; f++) {
        const jf = Math.min(anelT.length - 2, 1 + Math.floor(rnd(seed, q, f + 40) * (anelT.length - 2)))
        const kf = (k + (f ? 1 : N - 1)) % N
        lava([V[jf + 1][k], V[jf][kf]], 0.7, 1, q * 5 + f + 40)
      }
    }
  })
  // ── OMBROS (dois picos mais baixos dos lados; recuados)
  if (o.ombros !== false)
    for (const [s, kR, kH, kB] of [[-1, 0.55, 0.62, 0.15], [1, 0.48, 0.5, 0.35]] as const) {
      const ox = x + -fz * s * R * 0.72 - fx * R * kB, oz = z + fx * s * R * 0.72 - fz * R * kB
      const n = lod ? 6 : 9, rr = R * kR, hh = H * kH
      const ring0 = Array.from({ length: n }, (_, k): V3 => {
        const a = (k / n) * Math.PI * 2 + rnd(seed, k, 70 + s)
        const r = rr * (0.85 + rnd(seed, k, 71 + s) * 0.3)
        return [ox + Math.cos(a) * r, -2, oz + Math.sin(a) * r]
      })
      const ring1 = ring0.map((p, k): V3 => [ox + (p[0] - ox) * 0.42, hh * (0.62 + rnd(seed, k, 72 + s) * 0.12), oz + (p[2] - oz) * 0.42])
      const tip: V3 = [ox + (rnd(seed, 73 + s) - 0.5) * rr * 0.2, hh, oz]
      for (let k = 0; k < n; k++) {
        const i = (k + 1) % n
        const m: V3 = [ring0[k][0] - ox, 0.3, ring0[k][2] - oz]
        face(g, [ring0[k], ring0[i], ring1[i]], corFace(ring0[k], ring0[i], ring1[i], k + 80, 1), m)
        face(g, [ring0[k], ring1[i], ring1[k]], corFace(ring0[k], ring1[i], ring1[k], k + 90, 1), m)
        face(g, [ring1[k], ring1[i], tip], corFace(ring1[k], ring1[i], tip, k + 100, 3), [m[0], 1, m[2]])
      }
    }
  // ── COLUNA DE FUMAÇA (a nuvem da ref): cachos de bolhas. Embaixo, saindo da boca, ACESA (amarelo no miolo →
  // laranja → vermelho); no meio a barriga laranja; em cima cinza-roxo largo (nunca preto), abrindo para o lado.
  const nB = lod ? 8 : 40
  for (let k = 0; k < nB; k++) {
    const t = k / (nB - 1)
    const lado = (rnd(seed, k, 90) - 0.5) * 2, fundo2 = (rnd(seed, k, 92) - 0.5) * 2
    const larg = R * (0.08 + t * 0.62)
    const r = R * (0.06 + t * 0.12) * (0.75 + rnd(seed, k, 91) * 0.5)
    const cxp = x - fz * lado * larg, cyp = H * (1.0 + t * 0.95) + (rnd(seed, k, 93) - 0.5) * R * 0.08
    const czp = z + fx * lado * larg + fz * fundo2 * larg * 0.6
    if (t < 0.3) {
      // o fogo da boca: acende de baixo (dark = o tom de BAIXO na bolha)
      const q = t / 0.3
      blob(GL, [cxp, cyp, czp], [r, r * 0.8, r], { dark: hz(mix([1, 0.92, 0.5], [1, 0.6, 0.15], q), 0.2), mid: hz(mix([1, 0.7, 0.2], [1, 0.42, 0.1], q), 0.2), hi: hz(mix([1, 0.5, 0.12], [0.85, 0.22, 0.08], q), 0.2) }, seed * 31 + k)
    } else {
      const q = (t - 0.3) / 0.7
      // fumaça SEM luz da cena (vista de baixo ficaria preta): o sombreado já vai na cor
      const esc = mix([0.36, 0.24, 0.28], [0.27, 0.22, 0.28], q), cl = mix([0.66, 0.44, 0.42], [0.5, 0.44, 0.52], q)
      blob(GL, [cxp, cyp, czp], [r, r * 0.75, r], { dark: hz(esc, 0.45), mid: hz(mix(esc, cl, 0.5), 0.45), hi: hz(cl, 0.45) }, seed * 31 + k)
      // barriga alaranjada (a luz da boca) nos cachos de baixo
      if (q < 0.45 && !lod) blob(GL, [cxp, cyp - r * 0.5, czp], [r * 0.75, r * 0.35, r * 0.75], { dark: hz([1, 0.5, 0.14], 0.3), mid: hz([0.95, 0.34, 0.1], 0.3), hi: hz([0.7, 0.2, 0.1], 0.3) }, seed * 17 + k)
    }
  }
}
