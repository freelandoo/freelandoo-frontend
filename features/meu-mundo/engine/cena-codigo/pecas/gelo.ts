// features/meu-mundo/engine/cena-codigo/pecas/gelo.ts — PEÇAS COPIADAS do MAR DE GELO (Marú) pela cópia
// minuciosa (skill meu-mundo-cenario-codigo, `copia.md`). Inventário:
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/gelo.json` (24 recortes das refs gelo-1..3).
//
// A linguagem das refs, que toda peça repete: ROCHA azul-ardósia facetada em planos grandes com uma TAMPA DE
// NEVE grossa e arredondada que desce em língua pelas faces; GELO ciano aceso em prismas e placas (claro na
// quina, fundo no pé); MADEIRA marrom-quente com veio escuro e neve em todo topo; PINGENTES em toda beira;
// corais FACETADOS (branco-lilás em Y, rosa em candelabro) e PÉROLA iridescente (concha: rosa → lilás → ciano).
// Contrato: (c, x, z, ang, …, lod); a FRENTE olha para (sin ang, cos ang); quadro local `quadro(x, z, ang)`.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { face, LAJE_ESP, lajeEspessa, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { prisma } from "./castelo-iris"

// ── paleta (recortes do inventário, ajustada à luz do jogo) ──
export const NEVE: RGB = [0.92, 0.96, 1]
export const NEVE_SOMBRA: RGB = [0.66, 0.76, 0.95]
export const NEVE_FUNDO: RGB = [0.52, 0.62, 0.86]
export const ROCHA_SOL: RGB = [0.44, 0.53, 0.8]
export const ROCHA: RGB = [0.34, 0.39, 0.6]
export const ROCHA_ESC: RGB = [0.22, 0.27, 0.46]
export const GELO_CL: RGB = [0.72, 0.92, 1]
export const GELO: RGB = [0.36, 0.82, 0.98]
export const GELO_ESC: RGB = [0.1, 0.56, 0.88]
export const GELO_FUNDO: RGB = [0.06, 0.34, 0.62]
export const MAD: RGB = [0.5, 0.31, 0.2]
export const MAD_CL: RGB = [0.68, 0.45, 0.28]
export const MAD_ESC: RGB = [0.3, 0.18, 0.14]
export const FERRO: RGB = [0.3, 0.3, 0.36]
export const FERRO_CL: RGB = [0.56, 0.58, 0.66]
export const VIDRO: RGB = [1, 0.6, 0.12]
export const VIDRO_CL: RGB = [1, 0.92, 0.5]
export const OURO: RGB = [0.92, 0.7, 0.3]
export const BANDEIRA: RGB = [0.66, 0.16, 0.14]
export const PANO: RGB = [0.88, 0.82, 0.68]
export const PANO_ESC: RGB = [0.66, 0.6, 0.5]
export const CORDA: RGB = [0.8, 0.6, 0.38]
export const CORAL_B: RGB = [1, 0.99, 1]
export const CORAL_B_ESC: RGB = [0.82, 0.8, 0.97]
export const CORAL_R: RGB = [1, 0.5, 0.64]
export const CORAL_R_ESC: RGB = [0.88, 0.34, 0.54]
export const PEROLA: RGB[] = [[0.98, 0.96, 1], [0.96, 0.82, 0.92], [0.84, 0.82, 1], [0.78, 0.96, 1], [0.98, 0.9, 0.94]]
export const CREME: RGB = [0.96, 0.9, 0.82]
export const PEDRA_RU: RGB = [0.76, 0.77, 0.94]
export const PEDRA_RU_ESC: RGB = [0.52, 0.54, 0.76]
export const AZUL_REAL: RGB[] = [[0.1, 0.3, 0.95], [0.2, 0.7, 1], [0.04, 0.14, 0.62], [0.36, 0.86, 1], [0.08, 0.22, 0.8]]
export const CIANO: RGB[] = [[0.16, 0.84, 1], [0.58, 0.92, 1], [0.04, 0.5, 0.88], [0.28, 0.94, 1], [0.08, 0.66, 0.96]]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>

const SUN: V3 = (() => { const l = Math.hypot(0.55, 1, 0.35); return [0.55 / l, 1 / l, 0.35 / l] })()
const normal = (A: V3, B: V3, C: V3, fora: V3): V3 => {
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]
  let n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
  if (n[0] * fora[0] + n[1] * fora[1] + n[2] * fora[2] < 0) n = [-n[0], -n[1], -n[2]]
  const L = Math.hypot(...n) || 1
  return [n[0] / L, n[1] / L, n[2] / L]
}
/** Tom em 3 degraus pelo sol do jogo (a ref pinta assim: face ao sol clara, meio, sombra funda). */
const tom3 = (n: V3, sol: RGB, meio: RGB, esc: RGB): RGB => {
  const d = n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]
  return d > 0.55 ? sol : d > 0.1 ? meio : esc
}
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Caixa no quadro local: centro (u, v), largura w (u), fundo d (v), de y0 a y1. */
function cx(g: G, q: Q, u: number, v: number, w: number, d: number, y0: number, y1: number, side: RGB, top?: RGB) {
  const p = q.P(u, v, 0)
  caixa(g, { x: p[0], z: p[2], y0, y1, w, d, rot: q.rot, side, top: top ?? mul(side, 1.1) })
}

/** PINGENTE de gelo: cone de 4 lados pendurado em p, comprimento L. */
export function pingente(g: G, p: V3, L: number, r = 0.1) {
  tube(g, p, [p[0], p[1] - L, p[2]], r, 0.004, 4, (k) => (k % 2 ? GELO_CL : mix(GELO, GELO_CL, 0.4)), true)
}

// ═══════════════ ROCHA, GELO, CAPIM ═══════════════

/**
 * ROCHA COM NEVE (inventário `rocha-neve`): prisma de 5–7 faces planas inclinadas (azul-ardósia: ao sol médio,
 * na sombra quase preto-azul) e a TAMPA DE NEVE: anel um pouco mais largo que a rocha a 70% da altura, que
 * desce em LÍNGUA em 2 faces, topo arredondado em 2 anéis. `s` ≈ meia largura; devolve a altura.
 */
export function rochaNeve(c: Cena, x: number, z: number, s: number, seed = 1, lod = 0, caixaOn = true, neve = true, capa?: number): number {
  const g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = lod ? 5 : 6 + Math.floor(r(1) * 2)
  const h = s * (0.75 + r(2) * 0.5)
  const sx = (r(3) - 0.5) * s * 0.3, sz = (r(4) - 0.5) * s * 0.3
  const A: number[] = [], R: number[] = []
  for (let k = 0; k < n; k++) {
    A.push(((k + (r(10 + k) - 0.5) * 0.5) / n) * Math.PI * 2)
    R.push(s * (0.85 + r(20 + k) * 0.3))
  }
  const enc = 0.62
  const base = (k: number): V3 => [x + Math.cos(A[k]) * R[k], -0.05, z + Math.sin(A[k]) * R[k]]
  const topo = (k: number, f = 1): V3 => [x + sx + Math.cos(A[k]) * R[k] * enc * f, h * (0.9 + r(40 + k) * 0.18), z + sz + Math.sin(A[k]) * R[k] * enc * f]
  // dois anéis de facetas (pé → barriga a 42% → topo): a rocha da ref é ARREDONDADA, não tronco de pirâmide
  const barriga = (k: number): V3 => [x + sx * 0.4 + Math.cos(A[k] + 0.12) * R[k] * 1.04, h * (0.4 + r(60 + k) * 0.08), z + sz * 0.4 + Math.sin(A[k] + 0.12) * R[k] * 1.04]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    for (const [a, b, cc, d] of [[base(k), base(j), barriga(j), barriga(k)], [barriga(k), barriga(j), topo(j), topo(k)]]) {
      const nn = normal(a, b, cc, [(a[0] + b[0]) / 2 - x, 0, (a[2] + b[2]) / 2 - z])
      const cor = tom3(nn, ROCHA_SOL, ROCHA, ROCHA_ESC)
      face(g, [a, b, cc], [mul(cor, 0.82), mul(cor, 0.82), cor], nn)
      const n2 = normal(a, cc, d, [(a[0] + b[0]) / 2 - x, 0, (a[2] + b[2]) / 2 - z])
      const c2 = tom3(n2, ROCHA_SOL, ROCHA, ROCHA_ESC)
      face(g, [a, cc, d], [mul(c2, 0.82), c2, c2], n2)
    }
  }
  if (!neve) {
    face(g, Array.from({ length: n }, (_, k) => topo(k)), ROCHA_SOL, [0, 1, 0])
    if (caixaOn && s > 0.5) c.block(x, z, s * 0.8, s * 0.8, h)
    return h
  }
  // tampa de neve: anel de baixo (borda que pende) → anel do meio → miolo
  const lingua = [Math.floor(r(50) * n), Math.floor(r(51) * n)]
  const t0 = capa ?? 0.38 + r(52) * 0.18
  const anel0 = Array.from({ length: n }, (_, k): V3 => {
    const p = lerp3(barriga(k), topo(k), t0), dx = p[0] - x - sx * 0.6, dz = p[2] - z - sz * 0.6
    const L = lingua.includes(k) ? 0.55 : 0
    return [p[0] + dx * 0.1, p[1] - L * h * 0.3, p[2] + dz * 0.1]
  })
  const anel1 = Array.from({ length: n }, (_, k): V3 => { const p = topo(k, 1.1); return [p[0], p[1] + s * 0.18, p[2]] })
  const miolo: V3 = [x + sx, h * 1.04 + s * 0.24, z + sz]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const nn = normal(anel0[k], anel0[j], anel1[j], [(anel0[k][0] + anel0[j][0]) / 2 - x, 0.4, (anel0[k][2] + anel0[j][2]) / 2 - z])
    const cor = tom3(nn, NEVE, mix(NEVE, NEVE_SOMBRA, 0.5), NEVE_SOMBRA)
    face(g, [anel0[k], anel0[j], anel1[j], anel1[k]], [mul(cor, 0.92), mul(cor, 0.92), cor, cor], nn)
    face(g, [anel1[k], anel1[j], miolo], [cor, cor, NEVE], [0, 1, 0])
  }
  if (caixaOn && s > 0.5) c.block(x, z, s * 0.8, s * 0.8, h)
  return h + s * 0.24
}

/**
 * CRISTAL DE GELO (inventário `cristal-gelo`): touceira de prismas ciano acesos — 1 alto de 5 faces no meio e
 * 3–4 menores inclinados para fora, facetas alternando ciano claro e azul fundo, ponta quase branca; o pé
 * num montinho de neve. `s` = altura do maior. `cores` troca a família (azul-royal da caverna).
 */
export function cristalGelo(c: Cena, x: number, z: number, s = 1.4, seed = 1, lod = 0, cores: RGB[] = CIANO, caixaOn = true, esguio = false) {
  const GL = c.glow(x, z), g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = lod ? 2 : 4 + Math.floor(r(1) * 2)
  for (let k = 0; k < n; k++) {
    const a = r(10 + k) * Math.PI * 2
    const tilt = k ? 0.25 + r(20 + k) * 0.35 : 0.05
    const hh = s * (k ? 0.36 + r(30 + k) * 0.3 : 1)
    const rr = hh * (esguio ? (k ? 0.14 : 0.16) : k ? 0.22 : 0.42)
    const off = k ? s * 0.42 : 0
    const b: V3 = [x + Math.cos(a) * off, -0.1, z + Math.sin(a) * off]
    const t: V3 = [b[0] + Math.cos(a) * hh * tilt * 0.6, hh * (esguio ? 0.75 : k ? 0.5 : 0.46), b[2] + Math.sin(a) * hh * tilt * 0.6]
    prisma(GL, b, t, rr, hh * (esguio ? 0.25 : k ? 0.5 : 0.62), lod ? 4 : k ? 5 : 6, cores.slice(k % 2).concat(cores.slice(0, k % 2)), r(40 + k) * 6, !lod && k === 0)
  }
  // montinho de neve no pé (5 faces)
  const m = 5, R0 = s * 0.38
  const anel = Array.from({ length: m }, (_, k): V3 => { const a = (k / m) * Math.PI * 2 + r(50); return [x + Math.cos(a) * R0, -0.02, z + Math.sin(a) * R0] })
  const top: V3 = [x, s * 0.1, z]
  for (let k = 0; k < m; k++) face(g, [anel[k], anel[(k + 1) % m], top], [NEVE_SOMBRA, NEVE_SOMBRA, NEVE], [0, 1, 0])
  if (caixaOn && s > 1.1) c.block(x, z, s * 0.22, s * 0.22, s)
}

/** CAPIM CONGELADO (inventário `capim-gelo`): 10–16 lâminas finas pontudas em leque, pé azul e ponta branca. */
export function capimGelo(c: Cena, x: number, z: number, s = 0.7, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const n = lod ? 7 : 18 + Math.floor(rnd(seed, 1) * 8)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, lean = 0.15 + rnd(seed, k, 3) * 0.45
    const h = s * (0.45 + rnd(seed, k, 4) * 0.65), w = s * 0.11
    const bx = x + Math.cos(a) * s * 0.12, bz = z + Math.sin(a) * s * 0.12
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w
    const tip: V3 = [bx + Math.cos(a) * h * lean, h, bz + Math.sin(a) * h * lean]
    const pts: V3[] = [[bx - px, -0.02, bz - pz], [bx + px, -0.02, bz + pz], tip]
    const pe: RGB = rnd(seed, k, 6) > 0.5 ? [0.56, 0.74, 0.96] : [0.68, 0.84, 1]
    const cols: RGB[] = [pe, mix(pe, [1, 1, 1], 0.3), [1, 1, 1]]
    face(g, pts, cols, [Math.cos(a), 0.3, Math.sin(a)])
    face(g, pts, cols.map((q) => mul(q, 0.85)), [-Math.cos(a), 0.3, -Math.sin(a)])
  }
}

/**
 * PLACA DE GELO flutuando (inventário `placa-gelo`): laje poligonal (6–8 cantos) de tampa branco-azulada e
 * borda vertical ciano TRANSLÚCIDA (acesa: clara em cima, funda embaixo). `r` = raio; `h` = espessura acima
 * do mar. Sem caixa (o mar é andável? não: quem chama decide).
 */
export function placaGelo(c: Cena, x: number, z: number, r: number, seed = 1, lod = 0, h = 0.45) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const n = lod ? 5 : 6 + Math.floor(rnd(seed, 1) * 3)
  const pts: V3[] = [], bot: V3[] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (rnd(seed, k, 2) - 0.5) * 0.5) / n) * Math.PI * 2
    const rr = r * (0.75 + rnd(seed, k, 3) * 0.35)
    pts.push([x + Math.cos(a) * rr, h, z + Math.sin(a) * rr])
    bot.push([x + Math.cos(a) * rr * 1.02, -0.3, z + Math.sin(a) * rr * 1.02])
  }
  // tampa: leque a partir do centro (tons sorteados: a tampa da ref tem placas de 2 tons)
  const ctr: V3 = [x, h + 0.02, z]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const t = rnd(seed, k, 5)
    face(g, [ctr, pts[k], pts[j]], [mix(NEVE, GELO_CL, 0.3 + t * 0.3), mix(GELO_CL, GELO, 0.25), mix(GELO_CL, GELO, 0.25)], [0, 1, 0])
    face(GL, [pts[k], pts[j], bot[j], bot[k]], [mix(GELO, GELO_CL, 0.5), mix(GELO, GELO_CL, 0.5), GELO_FUNDO, GELO_FUNDO], [pts[k][0] - x, 0, pts[k][2] - z])
  }
}

/** ICEBERG (inventário `iceberg`): pirâmide torta de facetas grandes com 1–2 picos; tons pelo sol, uma faceta ciano funda. */
export function iceberg(c: Cena, x: number, z: number, s = 4, seed = 1, lod = 0, caixaOn = true) {
  const g = c.geo(x, z)
  const n = lod ? 5 : 6
  const base: V3[] = [], meio: V3[] = []
  const pico: V3 = [x + (rnd(seed, 1) - 0.5) * s * 0.4, s * (0.85 + rnd(seed, 2) * 0.4), z + (rnd(seed, 3) - 0.5) * s * 0.4]
  for (let k = 0; k < n; k++) {
    const a = ((k + (rnd(seed, k, 4) - 0.5) * 0.4) / n) * Math.PI * 2, R = s * (0.6 + rnd(seed, k, 5) * 0.3)
    base.push([x + Math.cos(a) * R, -0.2, z + Math.sin(a) * R])
    meio.push([x + Math.cos(a) * R * 0.55, s * (0.35 + rnd(seed, k, 6) * 0.3), z + Math.sin(a) * R * 0.55])
  }
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const fora: V3 = [base[k][0] + base[j][0] - 2 * x, 0, base[k][2] + base[j][2] - 2 * z]
    const n1 = normal(base[k], base[j], meio[j], fora)
    const fundo = k === Math.floor(rnd(seed, 9) * n)
    face(g, [base[k], base[j], meio[j], meio[k]], fundo ? [GELO_ESC, GELO_ESC, GELO, GELO] : tom3(n1, NEVE, GELO_CL, mix(GELO, GELO_CL, 0.3)), n1)
    const n2 = normal(meio[k], meio[j], pico, add(fora, [0, 1, 0]))
    face(g, [meio[k], meio[j], pico], tom3(n2, NEVE, mix(NEVE, GELO_CL, 0.6), mix(GELO, GELO_CL, 0.5)), n2)
  }
  if (caixaOn) c.block(x, z, s * 0.5, s * 0.5, s)
}

// ═══════════════ MADEIRA: MOURÕES, CORDA, POSTE, TORRE ═══════════════

/** LANTERNA QUADRADA das refs: base e telhado de madeira escura, 4 montantes, vidro âmbar aceso com o LOSANGO claro no meio; neve no telhado. y = pé. */
export function lanternaQuadrada(c: Cena, x: number, z: number, y: number, s = 1, ang = 0, lod = 0, capa = false) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const Q = quadro(x, z, ang)
  const w = 0.42 * s, h = 0.46 * s
  cx(g, Q, 0, 0, w + 0.08 * s, w + 0.08 * s, y, y + 0.08 * s, MAD_ESC)
  cx(g, Q, 0, 0, w + 0.12 * s, w + 0.12 * s, y + 0.08 * s + h, y + 0.16 * s + h, MAD_ESC)
  const yT = y + 0.16 * s + h
  // telhado em pirâmide com neve
  const t = (w + 0.14 * s) / 2
  const cs: V3[] = [Q.P(-t, t, yT), Q.P(t, t, yT), Q.P(t, -t, yT), Q.P(-t, -t, yT)]
  if (capa) capaNeve(g, Q, 0, 0, w + 0.3 * s, yT, 0.22 * s, lod)
  else {
    const ap = Q.P(0, 0, yT + 0.24 * s)
    for (let k = 0; k < 4; k++) face(g, [cs[k], cs[(k + 1) % 4], ap], [MAD_ESC, MAD_ESC, mix(MAD_ESC, NEVE, 0.6)], add(lerp3(cs[k], cs[(k + 1) % 4], 0.5), [-x, 0.5, -z]))
    if (!lod) tube(g, ap, add(ap, [0, 0.14 * s, 0]), 0.05 * s, 0.05 * s, 4, () => FERRO, false)
  }
  // vidro + losango (4 faces)
  const y0 = y + 0.08 * s, y1 = y0 + h, hw = w / 2
  const lados: [number, number, number, number][] = [[0, 1, 1, 0], [1, 0, 0, -1], [0, -1, -1, 0], [-1, 0, 0, 1]]
  for (const [nu, nv, du, dv] of lados) {
    const P = (a: number, yy: number, o = 0) => Q.P(nu * (hw + o) + du * a, nv * (hw + o) + dv * a, yy)
    face(GL, [P(-hw, y0), P(hw, y0), P(hw, y1), P(-hw, y1)], [VIDRO, VIDRO, mix(VIDRO, VIDRO_CL, 0.3), mix(VIDRO, VIDRO_CL, 0.3)], Q.N(nu, nv))
    if (!lod) {
      const ym = (y0 + y1) / 2, dh = h * 0.32, dw = hw * 0.55
      face(GL, [P(0, ym - dh, 0.015), P(dw, ym, 0.015), P(0, ym + dh, 0.015), P(-dw, ym, 0.015)], VIDRO_CL, Q.N(nu, nv))
      // montantes nas quinas
      tube(g, P(-hw, y0, 0.01), P(-hw, y1, 0.01), 0.03 * s, 0.03 * s, 4, () => MAD_ESC, false)
    }
  }
}

/**
 * MOURÃO (inventários `mourao-lanterna`, `mourao-corda`): poste quadrado de madeira com o veio escuro nas
 * faces, CAPA DE NEVE arredondada que sobra dos lados e um parafuso de ferro; com `lanterna`, a lanterna
 * quadrada acesa em cima (o mourão fica mais baixo). Devolve o ponto da corda.
 */
export function mourao(c: Cena, x: number, z: number, h = 1.2, ang = 0, lanterna = false, lod = 0, seed = 1): V3 {
  const g = c.geo(x, z)
  const Q = quadro(x, z, ang + (rnd(seed, 1) - 0.5) * 0.3)
  const w = 0.5
  const hp = lanterna ? h * 0.6 : h
  // corpo: 4 faces com veio (faixa escura vertical no meio de cada face)
  const P = (u: number, v: number, y: number) => Q.P(u, v, y)
  const lados: [number, number, number, number][] = [[0, 1, 1, 0], [1, 0, 0, -1], [0, -1, -1, 0], [-1, 0, 0, 1]]
  for (const [nu, nv, du, dv] of lados) {
    const A = (a: number, yy: number) => P(nu * w / 2 + du * a, nv * w / 2 + dv * a, yy)
    const cor = tom3(Q.N(nu, nv), MAD_CL, MAD, mix(MAD, MAD_ESC, 0.5))
    if (lod) face(g, [A(-w / 2, -0.05), A(w / 2, -0.05), A(w / 2, hp), A(-w / 2, hp)], cor, Q.N(nu, nv))
    else {
      face(g, [A(-w / 2, -0.05), A(-0.04, -0.05), A(-0.04, hp), A(-w / 2, hp)], cor, Q.N(nu, nv))
      face(g, [A(0.04, -0.05), A(w / 2, -0.05), A(w / 2, hp), A(0.04, hp)], mul(cor, 0.94), Q.N(nu, nv))
      face(g, [A(-0.04, -0.05), A(0.04, -0.05), A(0.04, hp), A(-0.04, hp)], mul(cor, 0.62), Q.N(nu, nv))
    }
  }
  if (!lod) tube(g, P(0, w / 2, hp * 0.62), P(0, w / 2 + 0.05, hp * 0.62), 0.06, 0.05, 6, () => FERRO_CL, true)
  if (lanterna) {
    cx(g, Q, 0, 0, w + 0.16, w + 0.16, hp, hp + 0.16, MAD_ESC, MAD)
    lanternaQuadrada(c, x, z, hp + 0.16, 1.15, ang, lod, true)
  } else capaNeve(g, Q, 0, 0, w + 0.14, hp, 0.2, lod)
  c.block(x, z, 0.28, 0.28, h)
  return P(0, 0, hp * 0.66)
}

/** Capa de neve arredondada (almofada de 8 lados) sobre um topo quadrado de lado `w` a altura y. */
function capaNeve(g: G, Q: Q, u: number, v: number, w: number, y: number, h: number, lod: number) {
  const n = lod ? 6 : 8
  const r0 = w * 0.62, r1 = w * 0.5
  const anel0 = Array.from({ length: n }, (_, k): V3 => { const a = (k / n) * Math.PI * 2 + Math.PI / n; return Q.P(u + Math.cos(a) * r0, v + Math.sin(a) * r0, y - h * 0.35) })
  const anel1 = Array.from({ length: n }, (_, k): V3 => { const a = (k / n) * Math.PI * 2 + Math.PI / n; return Q.P(u + Math.cos(a) * r1, v + Math.sin(a) * r1, y + h * 0.6) })
  const top = Q.P(u, v, y + h)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const a = ((k + 0.5) / n) * Math.PI * 2 + Math.PI / n
    const nn = Q.N(Math.cos(a), Math.sin(a), 0.5)
    const cor = tom3(nn, NEVE, mix(NEVE, NEVE_SOMBRA, 0.45), NEVE_SOMBRA)
    face(g, [anel0[k], anel0[j], anel1[j], anel1[k]], cor, nn)
    face(g, [anel1[k], anel1[j], top], [cor, cor, NEVE], [0, 1, 0])
  }
}

/** CORDA trançada caída em catenária entre dois pontos (gomos alternando claro/escuro: o trançado). */
export function corda(c: Cena, a: V3, b: V3, lod = 0, flecha = 0.4) {
  const g = c.geo((a[0] + b[0]) / 2, (a[2] + b[2]) / 2)
  const n = lod ? 3 : Math.max(8, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.3))
  let prev = a
  for (let k = 1; k <= n; k++) {
    const t = k / n
    const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - flecha * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]
    // gomo do trançado: grosso no meio, fino na junta, tons alternados
    tube(g, prev, p, 0.075, 0.1, lod ? 3 : 5, (j) => ((j + k) % 2 ? CORDA : mul(CORDA, 0.7)), false)
    prev = p
  }
}

/**
 * POSTE DA BANDEIRA (inventário `poste-bandeira`): poste grosso de madeira com BRAÇO horizontal, mão-francesa
 * em diagonal, CHAPA de ferro com parafuso na junta, neve em cima do braço e do poste, LANTERNA grande
 * pendurada por argola na ponta do braço e um ESTANDARTE vermelho com borda de ouro e ponta em V numa
 * travessa mais baixa. O braço sai para a direita de quem olha a frente (+u). Aceso no glow: lanterna e pano.
 */
export function posteBandeira(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const Q = quadro(x, z, ang)
  const H = 4.6, W = 0.56, B = 2.3
  cx(g, Q, 0, 0, W, W, -0.1, H, MAD, MAD_CL)
  if (!lod) for (const uu of [-0.12, 0.13]) cx(g, Q, uu, W / 2 + 0.005, 0.06, 0.02, 0.2, H - 0.3, MAD_ESC)
  // braço e mão-francesa
  cx(g, Q, B / 2 + W / 2 - 0.1, 0, B, 0.42, H - 0.95, H - 0.55, MAD, MAD_CL)
  tube(g, Q.P(W / 2, 0, H - 2.1), Q.P(W / 2 + 1.05, 0, H - 0.95), 0.16, 0.16, 4, (k) => (k % 2 ? MAD : MAD_CL), false)
  // chapa de ferro com parafuso na junta
  cx(g, Q, 0.05, W / 2 + 0.02, 0.62, 0.05, H - 1.2, H - 0.45, FERRO, FERRO_CL)
  if (!lod) tube(g, Q.P(0.05, W / 2 + 0.05, H - 0.82), Q.P(0.05, W / 2 + 0.16, H - 0.82), 0.12, 0.1, 6, () => FERRO_CL, true)
  // neve: no topo do poste e em cima do braço
  capaNeve(g, Q, 0, 0, W + 0.2, H, 0.32, lod)
  cx(g, Q, B / 2 + W / 2, 0, B + 0.1, 0.5, H - 0.55, H - 0.4, NEVE, NEVE)
  if (!lod) for (let k = 0; k < 4; k++) pingente(g, Q.P(0.6 + k * 0.5, 0.22, H - 0.95), 0.25 + rnd(k, 3) * 0.35, 0.05)
  // lanterna pendurada (argola + gancho)
  const ul = W / 2 + B - 0.4
  tube(g, Q.P(ul, 0, H - 0.95), Q.P(ul, 0, H - 1.35), 0.04, 0.04, 4, () => FERRO, false)
  const pl = Q.P(ul, 0, 0)
  lanternaQuadrada(c, pl[0], pl[2], H - 2.25, 1.75, ang, lod)
  // travessa do estandarte e o pano (V embaixo), borda de ouro
  cx(g, Q, W / 2 + 0.55, 0, 1.2, 0.14, 2.85, 3.0, MAD_ESC)
  const u0 = W / 2 + 0.12, u1 = W / 2 + 1.0, yT = 2.85, yB = 0.75, v = 0.1
  const um = (u0 + u1) / 2
  face(GL, [Q.P(u0, v, yT), Q.P(u1, v, yT), Q.P(u1, v, yB + 0.5), Q.P(um, v, yB), Q.P(u0, v, yB + 0.5)], [BANDEIRA, BANDEIRA, mul(BANDEIRA, 0.8), mul(BANDEIRA, 0.75), mul(BANDEIRA, 0.8)], Q.N(0, 1))
  face(GL, [Q.P(u0, -v, yT), Q.P(u1, -v, yT), Q.P(u1, -v, yB + 0.5), Q.P(um, -v, yB), Q.P(u0, -v, yB + 0.5)], mul(BANDEIRA, 0.7), Q.N(0, -1))
  if (!lod) {
    // borda de ouro (fio) e o emblema: duas ondas de ouro (o crescente da ref é de outro Domínio)
    const fio = (a: [number, number], b: [number, number]) => tube(g, Q.P(a[0], v + 0.02, a[1]), Q.P(b[0], v + 0.02, b[1]), 0.035, 0.035, 3, () => OURO, false)
    fio([u0 + 0.06, yT - 0.08], [u0 + 0.06, yB + 0.52]); fio([u1 - 0.06, yT - 0.08], [u1 - 0.06, yB + 0.52])
    fio([u0 + 0.06, yB + 0.52], [um, yB + 0.08]); fio([um, yB + 0.08], [u1 - 0.06, yB + 0.52])
    for (const yy of [2.1, 1.65]) {
      fio([u0 + 0.2, yy], [um - 0.12, yy + 0.18]); fio([um - 0.12, yy + 0.18], [um + 0.12, yy - 0.05]); fio([um + 0.12, yy - 0.05], [u1 - 0.2, yy + 0.15])
    }
  }
  c.block(x, z, W / 2 + 0.05, W / 2 + 0.05, H)
}

/**
 * TORRE DE VIGIA (inventário `torre-vigia`): 4 pernas de madeira abrindo para baixo com X em 2 andares,
 * plataforma com guarda-corpo, cabine com 2 JANELAS âmbar acesas na frente (1 em cada lado) e telhado de
 * 4 águas com neve, beiral e pináculo. ~9 m.
 */
export function torreVigia(c: Cena, x: number, z: number, ang = 0, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const Q = quadro(x, z, ang)
  const yP = 5.6, b0 = 1.45, b1 = 1.2
  const perna = (su: number, sv: number, y: number) => { const t = y / yP; const r = b0 + (b1 - b0) * t; return Q.P(su * r, sv * r, y) }
  const cantos: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  for (const [su, sv] of cantos) tube(g, perna(su, sv, -0.1), perna(su, sv, yP + 0.1), 0.24, 0.22, 4, (k) => (k % 2 ? MAD : MAD_CL), false)
  if (!lod)
    for (let k = 0; k < 4; k++) {
      const [a, b] = [cantos[k], cantos[(k + 1) % 4]]
      for (const [y0, y1] of [[0.4, 2.9], [2.9, 5.4]]) {
        tube(g, perna(a[0], a[1], y0), perna(b[0], b[1], y1), 0.08, 0.08, 4, (j) => (j % 2 ? MAD : MAD_ESC), false)
        tube(g, perna(b[0], b[1], y0), perna(a[0], a[1], y1), 0.08, 0.08, 4, (j) => (j % 2 ? MAD : MAD_ESC), false)
      }
      tube(g, perna(a[0], a[1], 2.9), perna(b[0], b[1], 2.9), 0.09, 0.09, 4, () => MAD, false)
    }
  // plataforma e guarda-corpo
  cx(g, Q, 0, 0, 3.0, 3.0, yP, yP + 0.25, MAD, mix(NEVE, MAD_CL, 0.15))
  if (!lod)
    for (const [su, sv] of cantos) {
      tube(g, Q.P(su * 1.42, sv * 1.42, yP + 0.25), Q.P(su * 1.42, sv * 1.42, yP + 1.05), 0.08, 0.08, 4, () => MAD_ESC, false)
    }
  for (let k = 0; k < 4; k++) {
    const [a, b] = [cantos[k], cantos[(k + 1) % 4]]
    tube(g, Q.P(a[0] * 1.42, a[1] * 1.42, yP + 1.0), Q.P(b[0] * 1.42, b[1] * 1.42, yP + 1.0), 0.07, 0.07, 4, () => MAD_CL, false)
  }
  // cabine
  const yC = yP + 0.25, hC = 2.1
  cx(g, Q, 0, 0, 2.5, 2.5, yC, yC + hC, MAD, MAD_CL)
  if (!lod) for (const uu of [-1.2, 0, 1.2]) cx(g, Q, uu, 1.26, 0.12, 0.05, yC, yC + hC, MAD_ESC)
  for (const [nu, nv] of [[0, 1], [1, 0], [-1, 0]] as const) {
    const P = (a: number, y: number) => Q.P(nu * 1.27 + (nv ? a : 0), nv * 1.27 + (nu ? -a * nu : 0), y)
    for (const du of nv ? [-0.55, 0.55] : [0]) face(GL, [P(du - 0.36, yC + 0.7), P(du + 0.36, yC + 0.7), P(du + 0.36, yC + 1.6), P(du - 0.36, yC + 1.6)], [VIDRO, VIDRO, VIDRO_CL, VIDRO_CL], Q.N(nu, nv))
    if (!lod) cx(g, Q, nu * 1.3, nv * 1.3, nv ? 2.0 : 0.1, nu ? 1.0 : 0.1, yC + 0.6, yC + 0.7, MAD_ESC)
  }
  // telhado de 4 águas com neve
  const yT = yC + hC, t = 1.75
  const cs: V3[] = [Q.P(-t, t, yT), Q.P(t, t, yT), Q.P(t, -t, yT), Q.P(-t, -t, yT)]
  const ap = Q.P(0, 0, yT + 1.9)
  for (let k = 0; k < 4; k++) {
    const nn = normal(cs[k], cs[(k + 1) % 4], ap, add(lerp3(cs[k], cs[(k + 1) % 4], 0.5), [-x, 1, -z]))
    face(g, [cs[k], cs[(k + 1) % 4], ap], [tom3(nn, NEVE, mix(NEVE, NEVE_SOMBRA, 0.5), NEVE_SOMBRA), tom3(nn, NEVE, mix(NEVE, NEVE_SOMBRA, 0.5), NEVE_SOMBRA), NEVE], nn)
    if (!lod) face(g, [cs[k], cs[(k + 1) % 4], add(cs[(k + 1) % 4], [0, -0.18, 0]), add(cs[k], [0, -0.18, 0])], MAD_ESC, add(lerp3(cs[k], cs[(k + 1) % 4], 0.5), [-x, 0, -z]))
  }
  tube(g, ap, add(ap, [0, 0.7, 0]), 0.08, 0.02, 4, () => MAD_ESC, true)
  if (!lod) for (let k = 0; k < 6; k++) pingente(g, Q.P(-1.3 + k * 0.52, t - 0.05, yT - 0.18), 0.25 + rnd(k, 7) * 0.4, 0.05)
  c.block(x, z, b0, b0, yT + 1.5, Q.rot)
}

// ═══════════════ O NAVIO ═══════════════

/**
 * NAVIO NAUFRAGADO preso no gelo (inventário `navio`): casco de tábuas em faixas (escura no fundo, FAIXA DE
 * OURO perto da borda), castelo de popa em 2 andares com JANELAS acesas no costado e no espelho, neve no
 * convés e nos telhados, PINGENTES na borda; 3 mastros com vergas, VELAS RASGADAS bege (buracos e barra
 * esfarrapada), ESCADAS de corda até o cesto, gurupés apontando para cima. Inclinado (`adorna` = rolar,
 * `empina` = proa para cima) e afundado `afunda` m no gelo. Proa para (sin ang, cos ang). `L` = casco.
 */
export function navio(c: Cena, x: number, z: number, ang: number, L = 22, o: { adorna?: number; empina?: number; afunda?: number; quebrado?: boolean; seed?: number } = {}, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const seed = o.seed ?? 1
  const ad = o.adorna ?? 0.2, em = o.empina ?? 0.14, af = o.afunda ?? 1.4
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  const W = L * 0.19, H = L * 0.27
  const ce = Math.cos(em), se = Math.sin(em), ca = Math.cos(ad), sa = Math.sin(ad)
  /** local (u ao longo, v através, y cima) → mundo, com empinar, adornar e afundar. */
  const P = (u: number, v: number, y: number): V3 => {
    const u1 = u * ce - y * se, y1 = u * se + y * ce
    const v2 = v * ca - y1 * sa, y2 = v * sa + y1 * ca
    return [x + fx * u1 + sx * v2, y2 - af, z + fz * u1 + sz * v2]
  }
  const N = (nu: number, nv: number, ny: number): V3 => {
    const u1 = nu * ce - ny * se, y1 = nu * se + ny * ce
    const v2 = nv * ca - y1 * sa, y2 = nv * sa + y1 * ca
    return [fx * u1 + sx * v2, y2, fz * u1 + sz * v2]
  }
  const nSt = lod ? 6 : 11
  const meia = (t: number) => (t < 0.42 ? 0.8 + 0.2 * (t / 0.42) : Math.cos(((t - 0.42) / 0.58) * Math.PI / 2) ** 0.75)
  const tosado = (t: number) => H * (1 + 0.22 * Math.max(0, t - 0.55) ** 2 * 4)
  // seção: do convés (bombordo) ao convés (boreste): borda, ouro, ouro-baixo, meio, bojo, quilha
  const secY = [1, 0.86, 0.76, 0.5, 0.16, 0]
  const secV = [1, 1.04, 1.05, 1.02, 0.68, 0]
  const corB: RGB[] = [MAD_CL, OURO, MAD, mix(MAD, MAD_ESC, 0.45), MAD_ESC]
  const ring = (t: number): V3[][] => {
    const u = -L / 2 + L * t, w = W * Math.max(0.02, meia(t)), hT = tosado(t)
    const lado = (s: number) => secY.map((fy, k) => P(u, s * w * secV[k], hT * fy))
    return [lado(1), lado(-1)]
  }
  const st = Array.from({ length: nSt + 1 }, (_, i) => ring(i / nSt))
  for (let i = 0; i < nSt; i++) {
    for (const s of [0, 1]) {
      const a = st[i][s], b = st[i + 1][s]
      for (let k = 0; k < 5; k++) {
        const nn = N(0, s ? -1 : 1, k < 3 ? 0.1 : -0.5)
        const col = mul(corB[k], (i % 2 ? 1 : 0.9) * (k === 1 ? 1 : tom3(nn, [1.12, 1.12, 1.12], [0.95, 0.95, 0.95], [0.78, 0.78, 0.78])[0]))
        face(g, [a[k], b[k], b[k + 1], a[k + 1]], col, nn)
      }
    }
    // convés com neve (às vezes a madeira aparece)
    const neve = rnd(seed, i, 3) > 0.25
    face(g, [st[i][0][0], st[i + 1][0][0], st[i + 1][1][0], st[i][1][0]], neve ? (i % 2 ? NEVE : mix(NEVE, NEVE_SOMBRA, 0.3)) : MAD_CL, N(0, 0, 1))
  }
  // espelho de popa (a ponta de trás) e o bico
  const s0 = st[0]
  for (let k = 0; k < 5; k++) face(g, [s0[0][k], s0[0][k + 1], s0[1][k + 1], s0[1][k]], mul(corB[k], 0.85), N(-1, 0, 0))
  // borda (corrimão) ao longo dos dois lados
  if (!lod)
    for (const s of [0, 1])
      for (let i = 0; i < nSt; i++) tube(g, add(st[i][s][0], [0, 0.12, 0]), add(st[i + 1][s][0], [0, 0.12, 0]), 0.14, 0.14, 4, (k) => (k % 2 ? MAD_ESC : MAD), false)
  // pingentes na borda (dos dois lados)
  if (!lod)
    for (let i = 1; i < nSt; i++)
      for (const s of [0, 1]) for (let k = 0; k < 2; k++) pingente(g, lerp3(st[i][s][1], st[i + 1][s][1], k * 0.5), 0.4 + rnd(seed, i * 3 + k, s) * 1.1, 0.12)
  // ── castelo de popa: 2 andares com janelas acesas ──
  const castelo = (u0: number, u1: number, yb: number, hh: number, enc: number, nj: number) => {
    const t0 = (u0 + L / 2) / L
    const w = W * meia(t0) * enc
    const y0 = tosado(t0) * 0.98 + yb
    const cs = (u: number, v: number, y: number) => P(u, v, y)
    // costados
    for (const s of [1, -1]) {
      face(g, [cs(u0, s * w, y0), cs(u1, s * w, y0), cs(u1, s * w, y0 + hh), cs(u0, s * w, y0 + hh)], [MAD, MAD, MAD_CL, MAD_CL], N(0, s, 0))
      if (!lod) for (let k = 0; k < 3; k++) {
        const uu = u0 + ((k + 0.5) / 3) * (u1 - u0)
        tube(g, cs(uu, s * (w + 0.05), y0), cs(uu, s * (w + 0.05), y0 + hh), 0.07, 0.07, 4, () => MAD_ESC, false)
      }
      for (let k = 0; k < nj; k++) {
        const uu = u0 + ((k + 0.5) / nj) * (u1 - u0), jw = (u1 - u0) / nj * 0.28
        face(GL, [cs(uu - jw, s * (w + 0.06), y0 + hh * 0.3), cs(uu + jw, s * (w + 0.06), y0 + hh * 0.3), cs(uu + jw, s * (w + 0.06), y0 + hh * 0.78), cs(uu - jw, s * (w + 0.06), y0 + hh * 0.78)], [VIDRO, VIDRO, VIDRO_CL, VIDRO_CL], N(0, s, 0))
      }
    }
    // espelho (de trás) e frente
    face(g, [cs(u0, w, y0), cs(u0, -w, y0), cs(u0, -w, y0 + hh), cs(u0, w, y0 + hh)], [MAD, MAD, MAD_CL, MAD_CL], N(-1, 0, 0))
    face(g, [cs(u1, w, y0), cs(u1, -w, y0), cs(u1, -w, y0 + hh), cs(u1, w, y0 + hh)], MAD, N(1, 0, 0))
    for (let k = 0; k < 3; k++) {
      const vv = -w + ((k + 0.5) / 3) * 2 * w, jw = w * 0.2
      face(GL, [cs(u0 - 0.06, vv - jw, y0 + hh * 0.3), cs(u0 - 0.06, vv + jw, y0 + hh * 0.3), cs(u0 - 0.06, vv + jw, y0 + hh * 0.78), cs(u0 - 0.06, vv - jw, y0 + hh * 0.78)], [VIDRO, VIDRO, VIDRO_CL, VIDRO_CL], N(-1, 0, 0))
    }
    // teto com neve e beiral escuro
    const yt = y0 + hh
    face(g, [cs(u0 - 0.3, w + 0.3, yt), cs(u1 + 0.3, w + 0.3, yt), cs(u1 + 0.3, -w - 0.3, yt), cs(u0 - 0.3, -w - 0.3, yt)], MAD_ESC, N(0, 0, -1))
    face(g, [cs(u0 - 0.25, w + 0.25, yt + 0.25), cs(u1 + 0.25, w + 0.25, yt + 0.25), cs(u1 + 0.25, -w - 0.25, yt + 0.25), cs(u0 - 0.25, -w - 0.25, yt + 0.25)], NEVE, N(0, 0, 1))
    for (const s of [1, -1]) face(g, [cs(u0 - 0.3, s * (w + 0.3), yt), cs(u1 + 0.3, s * (w + 0.3), yt), cs(u1 + 0.25, s * (w + 0.25), yt + 0.25), cs(u0 - 0.25, s * (w + 0.25), yt + 0.25)], NEVE_SOMBRA, N(0, s, 0.3))
    if (!lod) for (let k = 0; k < 5; k++) for (const s of [1, -1]) pingente(g, cs(u0 + ((k + 0.5) / 5) * (u1 - u0), s * (w + 0.3), yt), 0.3 + rnd(seed, k, s + 5) * 0.6, 0.08)
    return yt + 0.25
  }
  const u0 = -L / 2 + 0.2
  const y1 = castelo(u0, u0 + L * 0.3, 0, L * 0.12, 1, 4)
  castelo(u0 + 0.3, u0 + L * 0.17, y1 - tosado(0) * 0.98 - 0.05, L * 0.1, 0.85, 3)
  // ── mastros, vergas, velas rasgadas, escadas ──
  const mastros: [number, number][] = [[0.04, 0.82], [0.3, 0.66], [-0.15, 0.55]]
  mastros.forEach(([tu, th], m) => {
    const u = tu * L, t = (u + L / 2) / L, yb = tosado(t)
    let hM = th * L
    if (o.quebrado && m === 0) hM *= 0.55
    const pe = P(u, 0, yb - 0.3), topo = P(u, 0, yb + hM)
    tube(g, pe, topo, 0.32, 0.18, lod ? 4 : 6, (k) => (k % 2 ? MAD : MAD_CL), true)
    // cesto (gávea)
    const yc = yb + hM * 0.72
    if (hM > 6) {
      const r = 0.9
      const cc = Array.from({ length: 6 }, (_, k): V3 => { const a = (k / 6) * Math.PI * 2; return P(u + Math.cos(a) * r, Math.sin(a) * r, yc) })
      face(g, cc, MAD_ESC, N(0, 0, -1))
      face(g, cc.map((p) => add(p, [0, 0.22, 0])), NEVE, N(0, 0, 1))
    }
    const vergas = o.quebrado && m === 0 ? [0.4] : [0.42, 0.8]
    vergas.forEach((fy, j) => {
      const yv = yb + hM * fy, meiaV = W * (j ? 1.25 : 1.75) * (m === 0 ? 1 : 0.82)
      const torto = (rnd(seed, m, j) - 0.5) * 0.5
      const A = P(u, -meiaV, yv - torto), B = P(u, meiaV, yv + torto)
      tube(g, A, B, 0.13, 0.13, 4, (k) => (k % 2 ? MAD_ESC : MAD), false)
      if (!lod) tube(g, add(A, [0, 0.14, 0]), add(B, [0, 0.14, 0]), 0.1, 0.1, 3, () => NEVE, false)
      // vela: pende da verga até a próxima (ou até o convés), barra esfarrapada e buracos
      const queda = (j ? hM * 0.34 : hM * 0.36) * (0.8 + rnd(seed, m, j + 3) * 0.3)
      const nq = lod ? 2 : 5
      const top = Array.from({ length: nq + 1 }, (_, k) => { const tt = k / nq; return { v: -meiaV * 0.92 + 1.84 * meiaV * tt, y: yv - 0.1 + (torto * 2) * (tt - 0.5) } })
      const bot = top.map((p, k) => ({ v: p.v * 0.94, y: p.y - queda * (0.45 + rnd(seed, m * 10 + j, k + 20) * 0.55), bojo: 0.5 + rnd(seed, m, k + 40) * 0.6 }))
      for (let k = 0; k < nq; k++) {
        if (!lod && rnd(seed, m * 10 + j, k + 60) < 0.18) continue // rasgo: some um gomo
        const a = top[k], b = top[k + 1], cc = bot[k + 1], d = bot[k]
        const pts = [P(u + 0.15, a.v, a.y), P(u + 0.15, b.v, b.y), P(u + 0.15 + cc.bojo, cc.v, cc.y), P(u + 0.15 + d.bojo, d.v, d.y)]
        const cor = k % 2 ? PANO : mix(PANO, PANO_ESC, 0.35)
        face(g, pts, [cor, cor, PANO_ESC, PANO_ESC], N(1, 0, 0))
        face(g, pts, mul(cor, 0.82), N(-1, 0, 0))
      }
    })
    // escadas de corda (enfrechates) dos dois lados, até o cesto
    if (!lod && hM > 6)
      for (const s of [1, -1]) {
        const w = W * meia(t) * 1.02
        const a0 = P(u - 0.8, s * w, yb + 0.1), a1 = P(u + 0.8, s * w, yb + 0.1)
        const b0 = P(u - 0.25, s * 0.5, yc), b1 = P(u + 0.25, s * 0.5, yc)
        tube(g, a0, b0, 0.04, 0.04, 3, () => MAD_ESC, false)
        tube(g, a1, b1, 0.04, 0.04, 3, () => MAD_ESC, false)
        const nr = Math.floor((yc - yb) / 0.9)
        for (let k = 1; k < nr; k++) { const tt = k / nr; tube(g, lerp3(a0, b0, tt), lerp3(a1, b1, tt), 0.03, 0.03, 3, () => mul(CORDA, 0.6), false) }
      }
  })
  // gurupés para cima e o estai até o mastro de proa
  const proa = P(L / 2 - 0.2, 0, tosado(1) * 1.02)
  const ponta = P(L / 2 + L * 0.3, 0, tosado(1) + L * 0.2)
  tube(g, proa, ponta, 0.3, 0.12, lod ? 4 : 5, (k) => (k % 2 ? MAD : MAD_CL), true)
  if (!lod) {
    tube(g, ponta, P(0.3 * L, 0, tosado(0.8) + 0.66 * L * 0.95), 0.04, 0.04, 3, () => MAD_ESC, false)
    for (let k = 0; k < 3; k++) pingente(g, lerp3(proa, ponta, 0.3 + k * 0.25), 0.4 + k * 0.3, 0.07)
  }
  // caixas de colisão do casco (3 ao longo)
  for (const tu of [-0.32, 0, 0.3]) {
    const p = P(tu * L, 0, 0)
    c.block(p[0], p[2], L * 0.17, W * 0.95, H + 2, -ang + Math.PI / 2)
  }
}

// ═══════════════ CAVERNA: CORAL, CONCHA, ESPONJA, COLUNA, ARCO ═══════════════

/**
 * CORAL FACETADO (inventários `coral-branco`, `coral-rosa`, `coral-rosa-perto`): galhos de 5 faces (faces
 * alternando claro e lilás/rosa escuro: o facetado da ref) que se dividem 3 vezes. `forma`: "y" = a árvore
 * branca (forquilhas em Y que abrem para cima); "cand" = o candelabro rosa (galhos curtos em ângulo, depois
 * sobem). `neve` põe ponta branca (gelo-3).
 */
export function coral(c: Cena, x: number, z: number, h: number, cor: RGB, esc: RGB, seed = 1, lod = 0, forma: "y" | "cand" = "y", neve = false) {
  const g = c.geo(x, z)
  const prof = lod ? 2 : 3
  const cols = (k: number) => (k === 0 ? mix(cor, [1, 1, 1], 0.12) : k % 2 ? cor : esc)
  let id = 0
  const ramo = (p: V3, d: V3, len: number, r: number, nivel: number) => {
    const e: V3 = add(p, d, len)
    const fim = nivel === 0
    tube(g, p, e, r, r * 0.78, 5, cols, false)
    if (fim) {
      // ponta rombuda (tampa facetada)
      tube(g, e, add(e, d, r * 0.5), r * 0.78, r * 0.4, 5, neve ? () => NEVE : cols, true)
      return
    }
    id++
    const rr = (q: number) => rnd(seed, id, q)
    // eixo perpendicular sorteado
    const ref: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    let px: V3 = [d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]]
    const pl = Math.hypot(...px); px = [px[0] / pl, px[1] / pl, px[2] / pl]
    const qx: V3 = [d[1] * px[2] - d[2] * px[1], d[2] * px[0] - d[0] * px[2], d[0] * px[1] - d[1] * px[0]]
    const giro = rr(1) * Math.PI * 2
    const lado: V3 = [px[0] * Math.cos(giro) + qx[0] * Math.sin(giro), px[1] * Math.cos(giro) + qx[1] * Math.sin(giro), px[2] * Math.cos(giro) + qx[2] * Math.sin(giro)]
    const filhos = rr(2) < 0.3 ? 3 : 2
    for (let k = 0; k < filhos; k++) {
      const s = k === 0 ? 1 : k === 1 ? -1 : 0
      const abre = (forma === "y" ? 0.62 + rr(3 + k) * 0.3 : 1.3) * s
      let nd: V3 = [d[0] * Math.cos(abre) + lado[0] * Math.sin(abre), d[1] * Math.cos(abre) + lado[1] * Math.sin(abre) + (forma === "y" ? 0.25 : 0), d[2] * Math.cos(abre) + lado[2] * Math.sin(abre)]
      const nl = Math.hypot(...nd); nd = [nd[0] / nl, nd[1] / nl, nd[2] / nl]
      if (forma === "cand" && s !== 0) {
        // braço curto quase deitado, depois sobe
        const cot = len * 0.5
        const m = add(e, nd, cot)
        tube(g, e, m, r * 0.7, r * 0.62, 5, cols, false)
        ramo(m, [nd[0] * 0.15, 0.98, nd[2] * 0.15], len * 0.62, r * 0.62, nivel - 1)
      } else ramo(e, s === 0 ? d : nd, len * (0.66 + rr(6 + k) * 0.12), r * 0.7, nivel - 1)
    }
  }
  const troncos = forma === "cand" ? 2 : 1
  for (let t = 0; t < troncos; t++) {
    const a = rnd(seed, t, 90) * Math.PI * 2
    const inc = forma === "cand" ? 0.25 : 0.12
    const d0: V3 = [Math.cos(a) * inc, 1, Math.sin(a) * inc]
    const l = Math.hypot(...d0)
    ramo([x + Math.cos(a) * h * 0.06 * t, -0.1, z + Math.sin(a) * h * 0.06 * t], [d0[0] / l, d0[1] / l, d0[2] / l], h * (forma === "y" ? 0.34 : 0.32), h * (forma === "y" ? 0.1 : 0.075), prof - (t ? 1 : 0))
  }
  if (h > 1.4) c.block(x, z, h * 0.12, h * 0.12, h)
}

/**
 * LEQUE DE CONCHA (vieira): costelas em leque com sulco escuro entre elas, borda ondulada, cores de PÉROLA
 * iridescente girando costela a costela; abaulado (o meio sai pela normal). Base ortonormal: `o` = charneira,
 * `e1` = direita, `e2` = para onde o leque abre, `n` = para fora. Desenha as costas (mais escuras) também.
 */
export function leque(g: G, o: V3, e1: V3, e2: V3, n: V3, r: number, costelas: number, lod: number, aberto = 0.9, cores: RGB[] = PEROLA, bojo = 0.22) {
  const k0 = lod ? Math.ceil(costelas / 2) : costelas
  const a0 = Math.PI * (0.5 - aberto / 2), a1 = Math.PI * (0.5 + aberto / 2)
  const pt = (a: number, rr: number, alto: number): V3 => {
    const dir: V3 = [e1[0] * Math.cos(a) + e2[0] * Math.sin(a), e1[1] * Math.cos(a) + e2[1] * Math.sin(a), e1[2] * Math.cos(a) + e2[2] * Math.sin(a)]
    return [o[0] + dir[0] * rr + n[0] * alto, o[1] + dir[1] * rr + n[1] * alto, o[2] + dir[2] * rr + n[2] * alto]
  }
  const nT: V3 = [-n[0], -n[1], -n[2]]
  for (let k = 0; k < k0; k++) {
    const aA = a0 + ((a1 - a0) * k) / k0, aB = a0 + ((a1 - a0) * (k + 1)) / k0, aM = (aA + aB) / 2
    const cor = cores[k % cores.length], fundo = mul(cor, 0.84)
    const sulA = pt(aA, r * 0.93, 0), sulB = pt(aB, r * 0.93, 0)
    // borda REDONDA da costela (ombros + crista): a vieira da ref tem lóbulos, não pontas
    const sh1 = pt(aA + (aB - aA) * 0.22, r * 0.99, r * bojo * 0.22), sh2 = pt(aA + (aB - aA) * 0.78, r * 0.99, r * bojo * 0.22)
    const crista = pt(aM, r * 1.03, r * bojo * 0.35), cristaM = pt(aM, r * 0.55, r * bojo)
    const sulAM = pt(aA, r * 0.55, r * bojo * 0.6), sulBM = pt(aB, r * 0.55, r * bojo * 0.6)
    // metade de fora (borda) e metade de dentro (até a charneira), dois lados da costela
    face(g, [cristaM, sulAM, sulA, sh1, crista], [cor, fundo, mul(cor, 0.85), mix(cor, [1, 1, 1], 0.2), mix(cor, [1, 1, 1], 0.35)], n)
    face(g, [cristaM, crista, sh2, sulB, sulBM], [mul(cor, 0.94), cor, mul(cor, 0.94), fundo, mul(fundo, 0.95)], n)
    face(g, [o, sulAM, cristaM], [mul(cor, 0.85), fundo, cor], n)
    face(g, [o, cristaM, sulBM], [mul(cor, 0.85), cor, fundo], n)
    // costas
    face(g, [o, sulA, sulB], [mul(cor, 0.7), mix(cor, [1, 1, 1], 0.2), mix(cor, [1, 1, 1], 0.2)], nT)
  }
  if (!lod) {
    // "orelhas" da charneira
    const t = r * 0.18
    for (const s of [-1, 1]) {
      const b = add(o, e1, s * t * 1.6)
      face(g, [add(o, n, 0.02), add(b, n, 0.02), add(add(b, e2, t), n, 0.02), add(add(o, e2, t * 1.4), n, 0.02)], cores[0], n)
    }
  }
}

/**
 * CONCHA GIGANTE deitada e semi-aberta (inventário `concha-gigante`): valva de baixo no chão e a de cima aberta
 * ~35°, 11 costelas, pérola; a boca olha para (sin ang, cos ang). `r` = raio do leque.
 */
export function conchaGigante(c: Cena, x: number, z: number, r = 1.4, ang = 0, lod = 0) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = -Math.cos(ang), sz = Math.sin(ang)
  const o: V3 = [x - fx * r * 0.45, 0.12, z - fz * r * 0.45]
  const e1: V3 = [sx, 0, sz]
  // valva de baixo: abre para a frente, deitada (normal para cima)
  leque(g, o, e1, [fx, 0.05, fz], [0, 1, 0], r, 11, lod, 0.92, PEROLA, 0.08)
  // valva de cima: levantada
  const ab = 1.2
  const e2: V3 = [fx * Math.cos(ab), Math.sin(ab), fz * Math.cos(ab)]
  const n: V3 = [-fx * Math.sin(ab), Math.cos(ab), -fz * Math.sin(ab)]
  const cores2 = PEROLA.slice(2).concat(PEROLA.slice(0, 2))
  leque(g, add(o, [0, 0.05, 0]), e1, e2, n, r * 1.03, 11, lod, 0.92, cores2, 0.26)
  // o lado de DENTRO da valva de cima também tem costelas (é o que se vê de frente)
  leque(g, add(o, [0, 0.05, 0]), e1, e2, [-n[0], -n[1], -n[2]], r * 1.0, 11, lod, 0.92, cores2.map((q) => mix(q, [1, 1, 1], 0.15)), 0.12)
  c.block(x, z, r * 0.8, r * 0.6, r * 0.9, -ang)
}

/** ESPONJAS EM TUBO (inventário `esponja-tubo`): 6–9 tubos hexagonais creme de alturas desencontradas, boca rosa-escura. */
export function esponjaTubo(c: Cena, x: number, z: number, s = 1, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const n = lod ? 3 : 6 + Math.floor(rnd(seed, 1) * 4)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(seed, k, 2), d = k ? s * (0.32 + rnd(seed, k, 3) * 0.2) : 0
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d
    const h = s * (0.3 + rnd(seed, k, 4) * 0.45) * (k ? 0.85 : 1), r = s * (0.2 + rnd(seed, k, 5) * 0.1)
    const inc = 0.12
    const top: V3 = [px + Math.cos(a) * h * inc, h, pz + Math.sin(a) * h * inc]
    tube(g, [px, -0.05, pz], top, r * 0.9, r, 6, (j) => (j % 2 ? CREME : mul(CREME, 0.82)), false)
    const boca = Array.from({ length: 6 }, (_, j): V3 => { const t = (j / 6) * Math.PI * 2; return [top[0] + Math.cos(t) * r * 0.66, top[1] - 0.02, top[2] + Math.sin(t) * r * 0.62] })
    const aro = Array.from({ length: 6 }, (_, j): V3 => { const t = (j / 6) * Math.PI * 2; return [top[0] + Math.cos(t) * r, top[1], top[2] + Math.sin(t) * r] })
    for (let j = 0; j < 6; j++) face(g, [aro[j], aro[(j + 1) % 6], boca[(j + 1) % 6], boca[j]], mix(CREME, [1, 1, 1], 0.3), [0, 1, 0])
    face(g, boca, [0.86, 0.42, 0.56], [0, 1, 0])
  }
}

/**
 * COLUNA DE GELO aceso (inventário `coluna-gelo`): a cascata congelada da caverna — tiras verticais de gelo
 * em facetas (claro no meio, fundo nas bordas), mais larga no pé e na cabeça, cabeça de neve com pingentes.
 * Toda no glow (a ref acende o gelo por dentro). `h` = altura, `r` = raio do pé.
 */
export function colunaGelo(c: Cena, x: number, z: number, h = 10, r = 1.8, seed = 1, lod = 0) {
  const GL = c.glow(x, z), g = c.geo(x, z)
  const n = lod ? 6 : 9
  const anel = [0, 0.25, 0.55, 0.82, 1]
  const raio = [1, 0.78, 0.66, 0.8, 1.05]
  const V = anel.map((t, j) => Array.from({ length: n }, (_, k): V3 => {
    const a = ((k + (rnd(seed, k, j) - 0.5) * 0.4) / n) * Math.PI * 2
    const rr = r * raio[j] * (0.85 + rnd(seed, k, j + 10) * 0.3)
    return [x + Math.cos(a) * rr, h * t, z + Math.sin(a) * rr]
  }))
  for (let j = 0; j < anel.length - 1; j++)
    for (let k = 0; k < n; k++) {
      const i = (k + 1) % n
      const t = rnd(seed, k, j + 30)
      const cor: RGB = t > 0.66 ? [0.42, 0.95, 1] : t > 0.33 ? [0.08, 0.74, 0.92] : [0.02, 0.4, 0.62]
      face(GL, [V[j][k], V[j][i], V[j + 1][i], V[j + 1][k]], [mul(cor, 0.8), mul(cor, 0.8), cor, mix(cor, GELO_CL, 0.2)], [V[j][k][0] - x, 0, V[j][k][2] - z])
    }
  // cabeça de neve
  const topo = V[anel.length - 1]
  const cab = topo.map((p): V3 => [x + (p[0] - x) * 1.12, h + 0.5, z + (p[2] - z) * 1.12])
  for (let k = 0; k < n; k++) {
    const i = (k + 1) % n
    face(g, [topo[k], topo[i], cab[i], cab[k]], NEVE_SOMBRA, [topo[k][0] - x, 0.3, topo[k][2] - z])
  }
  face(g, cab, NEVE, [0, 1, 0])
  if (!lod) for (let k = 0; k < n; k += 2) pingente(g, topo[k], 0.8 + rnd(seed, k, 50) * 1.6, 0.18)
  c.block(x, z, r * 0.8, r * 0.8, h)
}

/** Bloco de rocha facetada de caverna entre dois pontos (seção de 6 lados, tremida), com NEVE no lado de cima. */
function rochaTubo(g: G, a: V3, b: V3, r: number, seed: number, neve: boolean) {
  const n = 6
  const ax: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const L = Math.hypot(...ax) || 1
  const t: V3 = [ax[0] / L, ax[1] / L, ax[2] / L]
  const ref: V3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let u: V3 = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]
  const ul = Math.hypot(...u); u = [u[0] / ul, u[1] / ul, u[2] / ul]
  const w: V3 = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
  const anel = (p: V3, j: number) => Array.from({ length: n }, (_, k): V3 => {
    const th = (k / n) * Math.PI * 2 + 0.3, rr = r * (0.85 + rnd(seed, k, j) * 0.3)
    return [p[0] + (u[0] * Math.cos(th) + w[0] * Math.sin(th)) * rr, p[1] + (u[1] * Math.cos(th) + w[1] * Math.sin(th)) * rr, p[2] + (u[2] * Math.cos(th) + w[2] * Math.sin(th)) * rr]
  })
  const A = anel(a, 1), B = anel(b, 2)
  for (let k = 0; k < n; k++) {
    const i = (k + 1) % n
    const m: V3 = [(A[k][0] + A[i][0]) / 2 - a[0], (A[k][1] + A[i][1]) / 2 - a[1], (A[k][2] + A[i][2]) / 2 - a[2]]
    const nn = normal(A[k], A[i], B[i], m)
    const cima = nn[1] > 0.55
    const cor = neve && cima ? NEVE : tom3(nn, mix(ROCHA_SOL, GELO, 0.4), mix(ROCHA, GELO_ESC, 0.4), mix(ROCHA_ESC, GELO_ESC, 0.3))
    face(g, [A[k], A[i], B[i], B[k]], neve && cima ? [NEVE_SOMBRA, NEVE_SOMBRA, NEVE, NEVE] : [mul(cor, 0.85), mul(cor, 0.85), cor, cor], nn)
  }
  face(g, A, ROCHA_ESC, [-t[0], -t[1], -t[2]])
  face(g, B, ROCHA_ESC, t)
}

/**
 * ARCO DA CAVERNA (inventário `arco-caverna`): arco de rocha azul-escura facetada sobre o caminho (2 pernas de
 * rocha e o arco em 7–9 gomos de rocha tremida), NEVE grossa no lado de cima e PINGENTES por baixo; atrás
 * de cada perna uma lasca de gelo aceso. Vão `vao` (ao longo de u), altura do vão `h`.
 */
export function arcoCaverna(c: Cena, x: number, z: number, ang: number, vao = 9, h = 8, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const Q = quadro(x, z, ang)
  const R = vao / 2 + 1.2, esp = 1.5
  // pernas
  for (const s of [-1, 1]) {
    const p = Q.P(s * R, 0, 0)
    rochaTubo(g, [p[0], -0.3, p[2]], [p[0], h - R * 0.4, p[2]], esp * 1.35, seed + s, false)
    c.block(p[0], p[2], esp, esp * 1.2, h, Q.rot)
    const gp = Q.P(s * (R + 1.2), -1.2, 0)
    colunaGelo(c, gp[0], gp[2], h * 0.75, 1.1, seed + s * 7, lod)
  }
  const n = lod ? 5 : 8
  const yb = h - R * 0.4
  const cent = (t: number): V3 => { const a = Math.PI * (1 - t); return Q.P(Math.cos(a) * R, 0, yb + Math.sin(a) * R * 0.7) }
  for (let k = 0; k < n; k++) {
    const A = cent(k / n), B = cent((k + 1) / n)
    rochaTubo(g, A, B, esp * (1 + rnd(seed, k, 3) * 0.25), seed * 10 + k, true)
    if (!lod) {
      const m = lerp3(A, B, 0.5)
      for (let j = 0; j < 2; j++) {
        const nv = Q.N(0, j ? 0.6 : -0.6)
        pingente(g, [m[0] + nv[0], m[1] - esp * 0.8, m[2] + nv[2]], 0.8 + rnd(seed, k, j + 5) * 2, 0.2)
      }
    }
  }
}

/**
 * BEIRAL COM PINGENTES (inventário `beiral-pingentes`): laje de rocha com tampa de neve na altura `y`, e uma
 * cortina de 6–10 pingentes ciano de tamanhos desencontrados pendurada na beira da frente. Largura `w`.
 */
export function beiralPingentes(c: Cena, x: number, z: number, ang: number, w = 4, y = 5, seed = 1, lod = 0) {
  const g = c.geo(x, z), GL = c.glow(x, z)
  const Q = quadro(x, z, ang)
  cx(g, Q, 0, -0.6, w, 2.4, y - 0.9, y, ROCHA, ROCHA_SOL)
  cx(g, Q, 0, -0.5, w + 0.3, 2.6, y, y + 0.45, NEVE_SOMBRA, NEVE)
  const n = lod ? 3 : 7 + Math.floor(rnd(seed, 1) * 4)
  for (let k = 0; k < n; k++) {
    const u = -w / 2 + ((k + 0.5) / n) * w + (rnd(seed, k, 2) - 0.5) * 0.3
    const L = 0.8 + rnd(seed, k, 3) * (k % 3 === 1 ? 4 : 2)
    const p = Q.P(u, 0.55, y - 0.2)
    tube(GL, p, [p[0], p[1] - L, p[2]], 0.28 + rnd(seed, k, 4) * 0.16, 0.01, 5, (j) => (j % 2 ? GELO_CL : GELO), true)
  }
}

// ═══════════════ RUÍNA, PEDESTAL, PLACAS DO CAMINHO ═══════════════

/**
 * ARCO DE RUÍNA (inventário `ruina-arco`): 2 pilares de pedra cinza-lilás em fiadas (base larga, fuste em
 * blocos desencontrados, capitel), arco de 9 ADUELAS com a chave saliente, NEVE em cima e PINGENTES, e uma
 * CONCHA de pérola esculpida num pilar. `quebrado` = o arco termina no meio. Vão `vao`, altura do pé do arco `h`.
 */
export function ruinaArco(c: Cena, x: number, z: number, ang: number, o: { vao?: number; h?: number; quebrado?: boolean; concha?: boolean; seed?: number } = {}, lod = 0) {
  const g = c.geo(x, z)
  const Q = quadro(x, z, ang)
  const vao = o.vao ?? 3.4, h = o.h ?? 4.2, seed = o.seed ?? 1
  const lw = 1.25, ld = 1.1
  const pedra = (k: number) => (rnd(seed, k, 9) > 0.5 ? PEDRA_RU : mix(PEDRA_RU, PEDRA_RU_ESC, 0.35))
  for (const s of [-1, 1]) {
    const u = s * (vao / 2 + lw / 2)
    cx(g, Q, u, 0, lw + 0.4, ld + 0.4, -0.05, 0.5, PEDRA_RU_ESC, PEDRA_RU)
    const fiadas = lod ? 2 : 5
    for (let k = 0; k < fiadas; k++) {
      const y0 = 0.5 + ((h - 1.1) * k) / fiadas, y1 = 0.5 + ((h - 1.1) * (k + 1)) / fiadas - 0.04
      const d = (rnd(seed, k, s + 3) - 0.5) * 0.08
      cx(g, Q, u + d, 0, lw, ld, y0, y1, pedra(k + s * 10), PEDRA_RU)
    }
    cx(g, Q, u, 0, lw + 0.35, ld + 0.35, h - 0.6, h - 0.25, PEDRA_RU, NEVE)
    cx(g, Q, u, 0, lw + 0.15, ld + 0.15, h - 0.25, h, PEDRA_RU_ESC)
    c.block(Q.P(u, 0, 0)[0], Q.P(u, 0, 0)[2], (lw + 0.4) / 2, (ld + 0.4) / 2, h + 2, Q.rot)
    if (o.concha && s === 1) leque(g, Q.P(u, ld / 2 + 0.06, h * 0.38), Q.N(1, 0), [0, 1, 0], Q.N(0, 1), 0.62, 9, lod, 0.95, PEROLA, 0.3)
  }
  // aduelas
  const R = vao / 2 + lw / 2, na = lod ? 5 : 9
  const kmax = o.quebrado ? Math.ceil(na * 0.55) : na
  for (let k = 0; k < kmax; k++) {
    const a0 = Math.PI * (1 - k / na), a1 = Math.PI * (1 - (k + 1) / na)
    const r0 = R - lw / 2, r1 = R + lw / 2 + (k === Math.floor(na / 2) ? 0.3 : 0)
    const P = (a: number, rr: number, v: number) => Q.P(Math.cos(a) * rr, v, h + Math.sin(a) * rr)
    const cor = pedra(k + 40)
    for (const v of [ld / 2, -ld / 2]) face(g, [P(a0 + 0.02, r0, v), P(a1 - 0.02, r0, v), P(a1 - 0.02, r1, v), P(a0 + 0.02, r1, v)], v > 0 ? cor : mul(cor, 0.8), Q.N(0, Math.sign(v)))
    face(g, [P(a0, r1, ld / 2), P(a1, r1, ld / 2), P(a1, r1, -ld / 2), P(a0, r1, -ld / 2)], NEVE, [0, 1, 0])
    face(g, [P(a0, r0, ld / 2), P(a1, r0, ld / 2), P(a1, r0, -ld / 2), P(a0, r0, -ld / 2)], PEDRA_RU_ESC, [0, -1, 0])
    // neve: almofada por cima
    if (!lod) {
      const am = (a0 + a1) / 2
      face(g, [P(a0, r1, ld / 2 + 0.08), P(a1, r1, ld / 2 + 0.08), P(am, r1 + 0.32, 0), P(a0, r1 + 0.3, 0)], NEVE, [Math.cos(am), Math.sin(am), 0.4])
      if (k % 2 === 0) pingente(g, P(am, r1, ld / 2 + 0.05), 0.4 + rnd(seed, k, 20) * 0.8, 0.08)
    }
  }
  // pedaço caído no chão
  if (o.quebrado) cx(g, Q, vao * 0.4, 1.8, 1.1, 0.9, -0.05, 0.6, PEDRA_RU, NEVE)
}

/** PEDESTAL (inventário `pedestal`): toco de pilar quebrado com neve. */
export function pedestal(c: Cena, x: number, z: number, s = 1, ang = 0, lod = 0) {
  const g = c.geo(x, z)
  const Q = quadro(x, z, ang)
  cx(g, Q, 0, 0, s * 1.15, s * 1.15, -0.05, s * 0.25, PEDRA_RU_ESC, PEDRA_RU)
  cx(g, Q, 0, 0, s, s, s * 0.25, s * 0.8, PEDRA_RU, PEDRA_RU)
  capaNeve(g, Q, 0, 0, s * 1.05, s * 0.8, s * 0.22, lod)
  c.block(x, z, s * 0.6, s * 0.6, s)
}

/**
 * PLACAS DO CAMINHO (inventário `placas-caminho`): grade de PLACAS de gelo grandes (topo plano azul-claro com
 * rachaduras finas) com 2 cm de espessura, separadas por FENDAS: a cena pinta o chão do caminho de ciano aceso e ele
 * aparece entre as placas. Só onde `dentro(x, z)`. Tom por placa sorteado; 1 rachadura fina por placa.
 */
export function placasCaminho(c: Cena, x0: number, z0: number, x1: number, z1: number, passo: number, seed: number, dentro: (x: number, z: number) => boolean, lod = 0, tons: RGB[] = [[0.72, 0.84, 0.98], [0.64, 0.78, 0.97], [0.78, 0.88, 1], [0.6, 0.74, 0.95]]) {
  const dy = (passo * Math.sqrt(3)) / 2
  let lin = 0
  for (let z = z0; z < z1; z += dy, lin++) {
    for (let x = x0 + (lin % 2 ? passo / 2 : 0); x < x1; x += passo) {
      const r = (q: number) => rnd(seed, Math.round(x * 10) + Math.round(z * 7), q)
      const cx0 = x + (r(1) - 0.5) * passo * 0.1, cz0 = z + (r(2) - 0.5) * passo * 0.1
      if (!dentro(cx0, cz0)) continue
      const n = lod ? 5 : 5 + Math.floor(r(3) * 3)
      const R = passo * 0.585
      const pts: V3[] = []
      for (let k = 0; k < n; k++) {
        const a = ((k + (r(4 + k) - 0.5) * 0.3) / n) * Math.PI * 2 + r(12) * 6
        const rr = R * (0.88 + r(20 + k) * 0.1)
        pts.push([cx0 + Math.cos(a) * rr, LAJE_ESP, cz0 + Math.sin(a) * rr])
      }
      const cor = tons[Math.floor(r(40) * tons.length)]
      const g = c.geo(cx0, cz0)
      lajeEspessa(g, pts, pts.map((_, k) => (k === 0 || k === 1 ? mix(cor, [1, 1, 1], 0.4) : cor)), mul(cor, 0.62), !!lod)
      if (!lod && r(41) > 0.35) {
        // rachadura fina: um fio claro atravessando
        const a = r(42) * Math.PI, L = R * 0.7
        const yr = LAJE_ESP + 0.006 // rachadura logo acima do topo
        const p0: V3 = [cx0 - Math.cos(a) * L, yr, cz0 - Math.sin(a) * L], p1: V3 = [cx0 + Math.cos(a) * L * 0.4, yr, cz0 + Math.sin(a) * L * 0.4]
        const nx = -Math.sin(a) * 0.035, nz = Math.cos(a) * 0.035
        face(g, [[p0[0] - nx, yr, p0[2] - nz], [p1[0] - nx, yr, p1[2] - nz], [p1[0] + nx, yr, p1[2] + nz], [p0[0] + nx, yr, p0[2] + nz]], mix(cor, [1, 1, 1], 0.7), [0, 1, 0])
      }
    }
  }
}

// ═══════════════ PENHASCO (a borda das cenas) ═══════════════

/**
 * PENHASCO DE ROCHA COM GELO (inventário `penhasco-gelo`): rochas azul-escuras empilhadas em degraus (1 grande
 * no meio, 4–6 em volta com alturas desencontradas), cada uma com TAMPA DE NEVE e a cortina de pingentes na
 * beira. Devolve `inside` para a cena não plantar nada dentro.
 */
export function penhasco(c: Cena, o: { x: number; z: number; rx: number; rz: number; h: number; seed: number; lod: number; solid?: boolean; lim?: number }) {
  const pecas: { x: number; z: number; s: number }[] = []
  const n = o.lod ? 3 : 6
  const lim = o.lim ?? 78
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(o.seed, k) * 0.7, d = k === 0 ? 0 : 0.5 + rnd(o.seed, k, 2) * 0.35
    const s = (o.rx + o.rz) * (k === 0 ? 0.36 : 0.2 + rnd(o.seed, k, 3) * 0.12)
    const x = Math.max(-lim + s, Math.min(lim - s, o.x + Math.cos(a) * o.rx * d)), z = Math.max(-lim + s, Math.min(lim - s, o.z + Math.sin(a) * o.rz * d))
    const alto = (k === 0 ? o.h : o.h * (0.4 + rnd(o.seed, k, 4) * 0.45)) / s
    const g = c.geo(x, z), n0 = g.p.length
    const hh = rochaNeve(c, x, z, s, Math.floor(o.seed * 13) + k, o.lod, false, true, 0.8)
    // estica em altura (as rochas da borda são altas): escala y dos vértices novos
    const f = Math.max(1, alto / 1.1)
    for (let i = n0 + 1; i < g.p.length; i += 3) g.p[i] *= f
    if (!o.lod && k < 3) {
      const GL = c.glow(x, z)
      for (let j = 0; j < 4; j++) {
        const aa = rnd(o.seed, k, j + 10) * Math.PI * 2
        const p: V3 = [x + Math.cos(aa) * s * 0.85, hh * f * 0.68, z + Math.sin(aa) * s * 0.85]
        tube(GL, p, [p[0], p[1] - 1 - rnd(o.seed, k, j + 20) * 2.5, p[2]], 0.22, 0.01, 4, (q) => (q % 2 ? GELO_CL : GELO), true)
      }
    }
    pecas.push({ x, z, s })
  }
  if (o.solid !== false) c.blockOval(o.x, o.z, o.rx * 1.05, o.rz * 1.05, o.h)
  return { inside: (qx: number, qz: number, k = 1) => pecas.some((q) => Math.hypot(qx - q.x, qz - q.z) < q.s * k) }
}

// ═══════════════ HORIZONTE (sem névoa) ═══════════════

/**
 * MONTANHA DE GELO do horizonte: pico facetado (anéis de 10 setores, arestas e ravinas), branco no alto e
 * azul nas faces de sombra, pé na bruma `nevoa` (mistura `bruma`). Vai em `c.horizonte`.
 */
export function montanhaGelo(c: Cena, x: number, z: number, R: number, H: number, seed: number, nevoa: RGB, bruma = 0.35, noite = false) {
  const g = c.horizonte
  const hz = (col: RGB, k = 1): RGB => mix(noite ? mul(col, 0.62) : col, nevoa, bruma * k)
  const N = 10
  const anelT = [0, 0.35, 0.68, 1]
  const V = anelT.map((t, j) => Array.from({ length: N }, (_, k): V3 => {
    const a = ((k + (rnd(seed, k, j) - 0.5) * 0.5) / N) * Math.PI * 2
    const ridge = j > 0 && j < 3 ? (k % 2 ? 0.86 : 1.12) : 1
    const rr = j === 3 ? R * 0.06 : R * (1 - t) ** 1.2 * ridge * (0.85 + rnd(seed, k, j + 9) * 0.3)
    return [x + Math.cos(a) * rr + (j === 3 ? (rnd(seed, 3) - 0.5) * R * 0.2 : 0), j === 3 ? H : H * t * (0.92 + rnd(seed, k, j + 20) * 0.16), z + Math.sin(a) * rr]
  }))
  for (let j = 0; j < 3; j++)
    for (let k = 0; k < N; k++) {
      const i = (k + 1) % N
      const A = V[j][k], B = V[j][i], C = V[j + 1][i], D = V[j + 1][k]
      const fora: V3 = [(A[0] + B[0]) / 2 - x, 0.3, (A[2] + B[2]) / 2 - z]
      const n1 = normal(A, B, C, fora)
      const alto = j >= 1
      const sol = alto ? NEVE : mix(NEVE, GELO_CL, 0.5), meio = alto ? mix(NEVE, NEVE_SOMBRA, 0.55) : mix(GELO_CL, GELO, 0.4), esc = alto ? NEVE_FUNDO : mix(GELO, GELO_ESC, 0.5)
      const k1 = 1 - (2 - j) * 0.12
      face(g, [A, B, C], hz(mul(tom3(n1, sol, meio, esc), k1), j ? 0.8 : 1), n1)
      const n2 = normal(A, C, D, fora)
      face(g, [A, C, D], hz(mul(tom3(n2, sol, meio, esc), k1), j ? 0.8 : 1), n2)
    }
}

/**
 * AQUEDUTO EM RUÍNA do horizonte (inventário `aqueduto`): fila de pilares quadrados e arcos altos de pedra
 * azulada enevoada, um vão caído; vai em `c.horizonte`. (x, z) = meio; corre ao longo de `ang`.
 */
export function aqueduto(c: Cena, x: number, z: number, ang: number, n: number, vao: number, H: number, nevoa: RGB, bruma = 0.45) {
  const g = c.horizonte
  const Q = quadro(x, z, ang)
  const hz = (col: RGB): RGB => mix(col, nevoa, bruma)
  const pw = vao * 0.38, d = vao * 0.45
  const pedra: RGB = [0.5, 0.6, 0.82], pedraEsc: RGB = [0.34, 0.42, 0.64]
  for (let k = 0; k <= n; k++) {
    const u = (k - n / 2) * vao
    const hk = k === n - 1 ? H * 0.6 : H
    cx(g, Q, u, 0, pw, d, -2, hk, hz(pedraEsc), hz(NEVE))
    cx(g, Q, u, 0, pw * 1.15, d * 1.1, hk - 1.8, hk - 0.6, hz(pedra), hz(NEVE))
    if (k < n - 2) {
      // arco: gomos de meia-volta entre os pilares
      const R = (vao - pw) / 2, um = u + vao / 2, ya = H - R - vao * 0.15
      for (let j = 0; j < 6; j++) {
        const a0 = Math.PI * (1 - j / 6), a1 = Math.PI * (1 - (j + 1) / 6)
        const P = (a: number, rr: number, v: number) => Q.P(um + Math.cos(a) * rr, v, ya + Math.sin(a) * rr)
        face(g, [P(a0, R, d / 2), P(a1, R, d / 2), Q.P(um + Math.cos(a1) * R, d / 2, H), Q.P(um + Math.cos(a0) * R, d / 2, H)], hz(pedra), Q.N(0, 1))
        face(g, [P(a0, R, -d / 2), P(a1, R, -d / 2), Q.P(um + Math.cos(a1) * R, -d / 2, H), Q.P(um + Math.cos(a0) * R, -d / 2, H)], hz(pedraEsc), Q.N(0, -1))
        face(g, [P(a0, R, d / 2), P(a1, R, d / 2), P(a1, R, -d / 2), P(a0, R, -d / 2)], hz(pedraEsc), [0, -1, 0])
      }
      cx(g, Q, um, 0, vao, d * 1.1, H, H + vao * 0.12, hz(pedra), hz(NEVE))
    }
  }
}
