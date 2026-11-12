// features/meu-mundo/engine/cena-codigo/pecas/castelo-noctis.ts — o CASTELO DA LUA de Noctis pela CÓPIA
// MINUCIOSA da ref `ref/dominios/castelo-noctis.png` (inventário `MEU MUNDO 3D/pipeline/pecas-codigo/copia/
// inventario/castelo-noctis.json`). Régua: o vão da porta (860–955 px) ≈ 3,6 m → ~27 px/m; chão da porta = y 790 px.
//
// FICHA
// O que é:        castelo gótico de ardósia AZUL-MARINHO com cantaria cinza-lilás clara, janelas lanceta acesas em
//                 lavanda, telhados pontudos azuis com remate de cristal, sobre um morro de rochas azuladas.
// Silhueta:       ASSIMÉTRICA (vista em 3/4): a TORRE DA LUA à direita do portal (coroa com o HALO de cristais
//                 pendurados e a LUA CRESCENTE de prata a ~25 m), a torre alta da esquerda (22 m), as duas
//                 TORRES-LANTERNA de canto (mirante aceso + agulha), a ponte em arco à esquerda e a rampa em arcada
//                 à direita.
// Massas grandes: portal (6,6 m, arco a 9,8 m) com a empena da janela alta (17 m), torre da lua (7 m × 18 m + coroa),
//                 torre alta (5 m × 15 m + flecha), torres-lanterna (6 m, 14–16 m), morro de rocha.
// Médios:         estandartes azuis com a lua branca, pedestais com o losango de cristal, a estrela de cristal sobre a
//                 porta, balaustradas, ameias de cantaria clara.
// Pequenos:       remates de cristal (losango com pontas), pingentes nas correntes, frisos claros.
// Paleta:         ardósia 0,22/0,26/0,54 (sombra 0,13/0,15/0,34), cantaria 0,8/0,82/0,94, telhado 0,2/0,28/0,7
//                 (face clara 0,36/0,46/0,86), lavanda acesa 0,86/0,76/1 → branca 1/0,96/1, prata 0,86/0,88/0,98.
// Fora:           a ESCADARIA (chão de andar plano: vira praça); a porta é atravessável.
// Medidas:        contrato `dominio.ts`: frente para −z, porta no meio da frente, pátio aberto (18 m), menagem
//                 (inventada) no fundo do pátio com o arco aceso da travessia.
// Inventado:      lados e fundo; o lado direito do morro.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { lanceta, prisma, vitral } from "./castelo-iris"
import { bloq, cx, poli, tronco } from "./fabrica"
import type { CasteloPlanta } from "../dominio"

// sob o luar azul do jogo: ardósia escura e cantaria quase branca (a ref vive do contraste entre as duas)
export const ARD: RGB = [0.32, 0.38, 0.76]
export const ARD_CL: RGB = [0.44, 0.52, 0.94]
export const ARD_ESC: RGB = [0.13, 0.16, 0.36]
export const CANT: RGB = [1.36, 1.36, 1.42] // cantaria clara (albedo alto, como a Marú: o luar puxa para azul-marinho)
export const CANT_ESC: RGB = [0.98, 0.99, 1.12]
export const TELHA: RGB = [0.24, 0.34, 0.86]
export const TELHA_CL: RGB = [0.48, 0.62, 1.12]
export const LAV: RGB = [0.82, 0.7, 1]
export const LAV_CL: RGB = [1, 0.96, 1]
export const LAV_ESC: RGB = [0.56, 0.42, 0.96]
export const PRATA: RGB = [0.9, 0.92, 1]
export const ROCHA: RGB = [0.4, 0.47, 0.82]
const CRIST: RGB[] = [[0.86, 0.9, 1], [0.6, 0.66, 1], [1, 1, 1], [0.72, 0.6, 1]]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>
type UV = [number, number]

/** Remate de cristal: losango alongado (bipirâmide de 4 faces) com as pontinhas laterais, aceso. */
function remate(GL: G, p: V3, s: number) {
  prisma(GL, [p[0], p[1] - 0.01, p[2]], [p[0], p[1] + 0.01, p[2]], s * 0.32, s * 0.9, 4, CRIST, 0.5)
  prisma(GL, [p[0], p[1] + 0.01, p[2]], [p[0], p[1] - 0.01, p[2]], s * 0.32, s * 0.55, 4, CRIST.slice(1), 0.5)
}
/** Janela lanceta acesa em lavanda com moldura de cantaria e o montante. */
function janela(g: G, GL: G, Q: Q, u: number, v: number, y0: number, hw: number, h: number, lod: number, seed: number) {
  const yb = y0 + h * 0.68, hp = h * 0.32, seg = lod ? 3 : 5
  poli(g, Q, lanceta(u, y0 - 0.25, yb, hw + 0.3, hp + 0.4, seg), v, CANT)
  vitral(GL, Q, lanceta(u, y0, yb, hw, hp, seg), [u, y0 + h * 0.5], v + 0.04, (y) => mix(LAV, LAV_CL, Math.min(1, Math.max(0, (y - y0) / h)) * 0.8), lod, seed)
  if (!lod) {
    cx(g, Q, u, v + 0.08, 0.1, 0.06, y0, yb + hp * 0.5, CANT_ESC)
    for (const s of [-1, 1]) tube(g, Q.P(u, v + 0.08, yb), Q.P(u + s * hw * 0.7, v + 0.08, yb + hp * 0.55), 0.05, 0.05, 4, () => CANT_ESC, false)
  }
}
/** Telhado pontudo de `n` faces (azul, faces alternando claro/escuro) com remate de cristal. */
function telhado(g: G, GL: G, Q: Q, u: number, v: number, y: number, r: number, h: number, n: number, lod: number, sRem = 0.6) {
  const p = Q.P(u, v, 0)
  tube(g, [p[0], y, p[2]], [p[0], y + h, p[2]], r, 0.04, lod ? 4 : n, (k) => (k % 2 ? TELHA : TELHA_CL), true)
  tube(g, [p[0], y - 0.1, p[2]], [p[0], y + 0.15, p[2]], r * 1.06, r * 1.04, lod ? 4 : n, () => CANT, false)
  remate(GL, [p[0], y + h + sRem * 0.5, p[2]], sRem)
}
/** Ameias de cantaria (merlões claros) num trecho reto do quadro. */
function ameias(g: G, Q: Q, u0: number, u1: number, v: number, y: number, lod: number) {
  const L = Math.abs(u1 - u0)
  cx(g, Q, (u0 + u1) / 2, v, L, 0.5, y - 0.3, y, CANT, CANT)
  if (lod) return
  const n = Math.max(1, Math.round(L / 1))
  for (let k = 0; k < n; k++) cx(g, Q, u0 + ((u1 - u0) * (k + 0.5)) / n, v, (L / n) * 0.55, 0.5, y, y + 0.55, CANT, CANT)
}

/**
 * TORRE (as de corpo quadrado-chanfrado da ref): corpo de ardósia com as QUINAS de cantaria, frisos claros, janelas
 * acesas, cornija de cantaria com mísulas, e em cima o telhado pontudo ou (`lanterna`) o MIRANTE aceso de 6 arcos
 * com colunas claras e o telhado por cima.
 */
function torre(c: Cena, Q: Q, u: number, v: number, o: { w: number; h: number; topo: number; lanterna?: boolean; janelas?: number; y0?: number; seed?: number }, lod: number) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  const { w, h } = o
  const hw = w / 2, y0 = o.y0 ?? 0, seed = o.seed ?? 1
  tronco(g, Q, u, v, y0, h, w * 1.12, w * 1.12, w, w, ARD, undefined, ARD_CL)
  for (const su of [-1, 1]) cx(g, Q, u + su * (hw - 0.2), v + hw - 0.15, 0.62, 0.5, y0, h, CANT_ESC, CANT)
  cx(g, Q, u, v, w * 1.2, w * 1.2, y0, y0 + 0.9, CANT_ESC, CANT) // soco claro
  if (!lod) for (const yy of [y0 + (h - y0) * 0.45, y0 + (h - y0) * 0.78]) cx(g, Q, u, v, w + 0.25, w + 0.25, yy, yy + 0.3, CANT, CANT)
  const nj = o.janelas ?? 1
  for (let q = 0; q < nj; q++) janela(g, GL, Q, u, v + hw + 0.02, y0 + 1.6 + q * ((h - y0 - 2) / nj), w * 0.17, Math.min(3.6, (h - y0 - 2.4) / nj - 0.4), lod, seed * 10 + q)
  // cornija com mísulas
  tronco(g, Q, u, v, h - 0.2, h + 0.5, w, w, w + 0.9, w + 0.9, CANT, CANT)
  if (o.lanterna) {
    // mirante aceso: miolo lavanda e 6 colunas claras com arcos, laje e o telhado
    const r = w * 0.48, n = 6, hl = 2.8
    const pp = Q.P(u, v, 0)
    tube(GL, [pp[0], h + 0.5, pp[2]], [pp[0], h + 0.5 + hl, pp[2]], r * 0.82, r * 0.82, 6, (k) => (k % 2 ? LAV : LAV_CL), false)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.PI / 6
      tube(g, Q.P(u + Math.cos(a) * r, v + Math.sin(a) * r, h + 0.5), Q.P(u + Math.cos(a) * r, v + Math.sin(a) * r, h + 0.5 + hl), 0.2, 0.2, 5, () => CANT, false)
    }
    tube(g, [pp[0], h + 0.5 + hl, pp[2]], [pp[0], h + 1.1 + hl, pp[2]], r * 1.25, r * 1.25, 6, () => CANT, false)
    telhado(g, GL, Q, u, v, h + 1.1 + hl, r * 1.3, o.topo - h - 1.1 - hl - 0.6, 6, lod, 0.7)
  } else {
    if (!lod) for (const sv of [1, -1]) ameias(g, Q, u - hw - 0.3, u + hw + 0.3, v + sv * (hw + 0.2), h + 0.8, lod)
    telhado(g, GL, Q, u, v, h + 0.5, w * 0.62, o.topo - h - 1.1, 6, lod, 0.6)
  }
  bloq(c, Q, u, v, w * 1.12, w * 1.12, h)
}

/**
 * TORRE DA LUA (à direita do portal): corpo alto com as janelas lanceta altas acesas e o friso claro, a coroa com o
 * HALO (anel de cantaria preso por braços, com os PINGENTES de cristal pendurados em correntes), as agulhas da
 * coroa, a flecha e a LUA CRESCENTE de prata com o pingente de estrela.
 */
function torreLua(c: Cena, Q: Q, u: number, v: number, lod: number) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  const w = 7, hw = w / 2, H = 17.6
  tronco(g, Q, u, v, 0, H, w * 1.08, w * 1.08, w * 0.9, w * 0.9, ARD, undefined, ARD_CL)
  for (const su of [-1, 1]) cx(g, Q, u + su * (hw - 0.4), v + hw - 0.35, 0.8, 0.6, 0, H, CANT_ESC, CANT)
  cx(g, Q, u, v, w * 1.16, w * 1.16, 0, 1, CANT_ESC, CANT)
  if (!lod) for (const su of [-1, 1]) for (const yy of [H - 3.2, H - 6.4]) telhado(g, GL, Q, u + su * (hw + 0.5), v + hw - 0.2, yy, 0.38, 2.4, 4, lod, 0.4)
  for (const yy of [8.6, 11.2]) cx(g, Q, u, v, w + 0.4, w + 0.4, yy, yy + 0.4, CANT, CANT)
  for (const du of [-1.3, 1.3]) janela(g, GL, Q, u + du, v + hw * 0.92 + 0.05, 11.8, 0.62, 4.6, lod, 40 + du)
  janela(g, GL, Q, u, v + hw + 0.05, 3.4, 0.7, 4.2, lod, 44)
  // coroa
  tronco(g, Q, u, v, H, H + 0.6, w * 0.9, w * 0.9, w + 0.5, w + 0.5, CANT, CANT)
  tronco(g, Q, u, v, H + 0.6, H + 3.6, w * 0.6, w * 0.6, w * 0.5, w * 0.5, ARD, CANT, ARD_CL)
  if (!lod) for (const [su, sv] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) telhado(g, GL, Q, u + su * (hw + 0.1), v + sv * (hw + 0.1), H + 0.6, 0.45, 3, 4, lod, 0.45)
  // o halo e os pingentes
  const hy = H + 2.6, hr = w * 1.08, n = lod ? 8 : 16
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
    tube(g, Q.P(u + Math.cos(a0) * hr, v + Math.sin(a0) * hr, hy), Q.P(u + Math.cos(a1) * hr, v + Math.sin(a1) * hr, hy), 0.16, 0.16, 4, (j) => (j % 2 ? CANT : PRATA), false)
  }
  for (let k = 0; k < (lod ? 2 : 4); k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    tube(g, Q.P(u + Math.cos(a) * w * 0.3, v + Math.sin(a) * w * 0.3, hy), Q.P(u + Math.cos(a) * hr, v + Math.sin(a) * hr, hy), 0.12, 0.12, 4, () => CANT, false)
  }
  if (!lod)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3
      const top = Q.P(u + Math.cos(a) * hr, v + Math.sin(a) * hr, hy)
      const L = 1.4 + (k % 2) * 0.8
      tube(g, top, [top[0], top[1] - L, top[2]], 0.03, 0.03, 3, () => PRATA, false)
      remate(GL, [top[0], top[1] - L - 0.45, top[2]], 0.55)
      remate(GL, [top[0], top[1] + 0.5, top[2]], 0.4)
    }
  // flecha e a lua crescente
  telhado(g, GL, Q, u, v, H + 3.6, w * 0.32, 3.4, 6, lod, 0.5)
  // a LUA: arco de 240° aberto para a direita (as pontas em cima e embaixo à direita), grosso no meio, fino nas
  // pontas; frente e verso em prata e a borda de fora em faixas
  const cy = H + 9.6, R = 4.2, Wm = 1.7
  const seg = lod ? 8 : 18
  const Pp = (ang: number, r: number, vv: number): V3 => Q.P(u + Math.cos(ang) * r, v + vv, cy + Math.sin(ang) * r)
  const A0 = Math.PI / 3, A1 = (Math.PI * 5) / 3
  for (let k = 0; k < seg; k++) {
    const t0 = k / seg, t1 = (k + 1) / seg
    const a0 = A0 + (A1 - A0) * t0, a1 = A0 + (A1 - A0) * t1
    const r0 = R - Wm * Math.sin(Math.PI * t0), r1 = R - Wm * Math.sin(Math.PI * t1)
    for (const sv of [0.35, -0.35]) face(g, [Pp(a0, R, sv), Pp(a1, R, sv), Pp(a1, r1, sv), Pp(a0, r0, sv)], sv > 0 ? (k % 2 ? PRATA : mix(PRATA, CANT_ESC, 0.25)) : CANT_ESC, Q.N(0, sv > 0 ? 1 : -1))
    face(g, [Pp(a0, R, 0.35), Pp(a1, R, 0.35), Pp(a1, R, -0.35), Pp(a0, R, -0.35)], mix(PRATA, CANT_ESC, 0.15), Q.N(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)))
    face(g, [Pp(a0, r0, 0.35), Pp(a1, r1, 0.35), Pp(a1, r1, -0.35), Pp(a0, r0, -0.35)], CANT_ESC, Q.N(-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)))
  }
  const borda = (ang: number, r: number, cx0: number, cy0: number, vv: number): V3 => Q.P(u + cx0 + Math.cos(ang) * r, v + vv, cy0 + Math.sin(ang) * r)
  // o pingente de estrela pendurado na ponta de cima da lua
  if (!lod) {
    const tp = borda(Math.PI * 0.36, R * 0.92, 0, cy, 0)
    tube(g, tp, [tp[0], tp[1] - 2, tp[2]], 0.03, 0.03, 3, () => PRATA, false)
    remate(GL, [tp[0], tp[1] - 2.6, tp[2]], 0.75)
  }
  bloq(c, Q, u, v, w * 1.08, w * 1.08, H)
}

/**
 * PORTAL (o centro da frente): a EMPENA alta de ardósia com o telhado azul e a JANELA LANCETA acesa, a moldura em
 * arco ogival larga de cantaria, a PORTA acesa (lavanda com o rendilhado em Y), a ESTRELA de cristal sobre o arco,
 * as pilastras com os pedestais e os estandartes azuis com a lua branca dos lados.
 */
function portal(c: Cena, Q: Q, lod: number) {
  const p0 = Q.P(0, 0, 0)
  const g = c.geo(p0[0], p0[2]), GL = c.glow(p0[0], p0[2])
  const hw = 3.6, D = 4, seg = lod ? 4 : 8
  // corpo: pilares de cantaria + empena de ardósia com o telhado de 2 águas
  for (const s of [-1, 1]) {
    cx(g, Q, s * (hw - 0.6), -D / 2 + 0.6, 1.2, D, 0, 10, CANT_ESC, CANT, CANT)
    bloq(c, Q, s * (hw - 0.6), -D / 2 + 0.6, 1.2, D, 10)
  }
  cx(g, Q, 0, -D / 2, 2 * hw + 0.4, D, 9.4, 12, ARD, undefined, ARD_CL)
  poli(g, Q, [[-hw - 0.2, 12], [hw + 0.2, 12], [0, 16.6]], 0.05, ARD_CL)
  for (const s of [-1, 1]) face(g, [Q.P(s * (hw + 0.7), 0.4, 11.7), Q.P(0, 0.4, 17), Q.P(0, -D, 17), Q.P(s * (hw + 0.7), -D, 11.7)], s < 0 ? TELHA_CL : TELHA, Q.N(s * 0.7, 0, 0.7))
  for (const s of [-1, 1]) tube(g, Q.P(s * (hw + 0.8), 0.45, 11.6), Q.P(0, 0.45, 17.1), 0.24, 0.24, 4, () => CANT, false)
  remate(GL, Q.P(0, 0.3, 17.9), 0.8)
  janela(g, GL, Q, 0, 0.1, 11.4, 0.9, 4.6, lod, 61)
  // moldura em arco (2 anéis de cantaria) e a porta
  const yb = 6, hp = 3.8
  poli(g, Q, lanceta(0, 0, yb, hw - 0.2, hp + 0.3, seg), 0.42, CANT)
  poli(g, Q, lanceta(0, 0, yb, hw - 0.9, hp - 0.4, seg), 0.48, CANT_ESC)
  const dp = lanceta(0, 0, yb - 0.6, hw - 1.6, hp - 1.2, seg)
  vitral(GL, Q, dp, [0, 3.4], 0.54, (y) => mix(LAV, LAV_CL, Math.min(1, y / 8)), lod, 62)
  if (!lod) {
    cx(g, Q, 0, 0.6, 0.14, 0.06, 0, yb + 1.2, CANT)
    for (const s of [-1, 1]) {
      tube(g, Q.P(0, 0.62, yb - 1), Q.P(s * 1.2, 0.62, yb + 0.8), 0.06, 0.06, 4, () => CANT, false)
      cx(g, Q, s * 1, 0.6, 0.1, 0.06, 0, yb - 0.6, CANT)
    }
    cx(g, Q, 0, 0.6, 2 * (hw - 1.6), 0.06, 2.6, 2.75, CANT)
  }
  // o feixe de pináculos da ref (sobre os pilares do portal e as paredes dos estandartes)
  for (const s of [-1, 1]) {
    cx(g, Q, s * (hw + 0.4), 0.1, 0.9, 0.9, 9.4, 12.6, CANT_ESC, CANT, CANT)
    telhado(g, GL, Q, s * (hw + 0.4), 0.1, 12.6, 0.6, 3.2, 4, lod, 0.5)
    if (!lod) {
      cx(g, Q, s * (hw + 3.6), -0.2, 0.7, 0.7, 9, 10.6, CANT_ESC, CANT, CANT)
      telhado(g, GL, Q, s * (hw + 3.6), -0.2, 10.6, 0.5, 2.6, 4, lod, 0.45)
      telhado(g, GL, Q, s * (hw + 1.6), -1.6, 9.4, 0.55, 3.6, 4, lod, 0.45)
    }
  }
  // a estrela de cristal sobre o arco
  remate(GL, Q.P(0, 0.7, 8.6), 1.2)
  // pilastras com pedestal de cristal e os estandartes
  for (const s of [-1, 1]) {
    cx(g, Q, s * (hw + 0.6), 0.2, 1.4, 1.4, 0, 2.4, CANT, CANT, CANT)
    remate(GL, Q.P(s * (hw + 0.6), 0.2, 3.4), 0.9)
    const u = s * (hw + 2.4), yT = 7.2, w = 1.4, H = 4.4
    poli(GL, Q, [[u - w / 2, yT], [u + w / 2, yT], [u + w / 2, yT - H * 0.82], [u, yT - H], [u - w / 2, yT - H * 0.82]], 0.32, [[0.14, 0.2, 0.62], [0.14, 0.2, 0.62], [0.12, 0.16, 0.5], [0.1, 0.14, 0.44], [0.12, 0.16, 0.5]])
    for (const ss of [-1, 1]) poli(g, Q, [[u + ss * w / 2, yT], [u + ss * (w / 2 + 0.08), yT], [u + ss * (w / 2 + 0.08), yT - H * 0.82], [u + ss * w / 2, yT - H * 0.82]], 0.33, CANT)
    // lua branca do estandarte (crescente de 6 gomos)
    const mc: UV = [u, yT - H * 0.42]
    for (let k = 0; k < 6; k++) {
      const a0 = Math.PI * 0.6 + (k / 6) * Math.PI * 1.2, a1 = Math.PI * 0.6 + ((k + 1) / 6) * Math.PI * 1.2
      poli(GL, Q, [[mc[0] + Math.cos(a0) * 0.42, mc[1] + Math.sin(a0) * 0.42], [mc[0] + Math.cos(a1) * 0.42, mc[1] + Math.sin(a1) * 0.42], [mc[0] + 0.12 + Math.cos(a1) * 0.28, mc[1] + Math.sin(a1) * 0.28], [mc[0] + 0.12 + Math.cos(a0) * 0.28, mc[1] + Math.sin(a0) * 0.28]], 0.34, LAV_CL)
    }
    tube(g, Q.P(u - w / 2 - 0.2, 0.36, yT + 0.08), Q.P(u + w / 2 + 0.2, 0.36, yT + 0.08), 0.07, 0.07, 4, () => CANT, false)
    // parede atrás do estandarte (liga o portal às torres)
    cx(g, Q, u, -1.2, 2.6, 2.4, 0, 9, ARD, CANT, ARD_CL)
    cx(g, Q, u, -0.05, 2.9, 0.2, 8.4, 9.1, CANT, CANT, CANT)
    cx(g, Q, u, -0.05, 2.9, 0.2, 0, 0.9, CANT_ESC, CANT, CANT)
    bloq(c, Q, u, -1.2, 2.6, 2.4, 9)
  }
}

/** PONTE EM ARCO (esquerda) ou RAMPA EM ARCADA (direita): tabuleiro de cantaria com balaustrada sobre arcos ogivais abertos de ardósia. */
function ponte(c: Cena, Q: Q, u0: number, u1: number, v: number, y0: number, y1: number, lod: number) {
  const um = (u0 + u1) / 2
  const pm = Q.P(um, v, 0)
  const g = c.geo(pm[0], pm[2])
  const L = Math.abs(u1 - u0), n = Math.max(1, Math.round(L / 4.5)), passo = (u1 - u0) / n
  const yAt = (u: number) => y0 + (y1 - y0) * ((u - u0) / (u1 - u0))
  for (let k = 0; k <= n; k++) {
    const u = u0 + passo * k
    cx(g, Q, u, v, 0.9, 1.8, 0, yAt(u), ARD, CANT, ARD_CL)
  }
  for (let k = 0; k < n; k++) {
    const ua = u0 + passo * k, ub = ua + passo, uc = (ua + ub) / 2
    const ya = Math.min(yAt(ua), yAt(ub))
    const hwA = Math.abs(passo) / 2 - 0.45, yAr = Math.max(1.5, ya - hwA * 1.6)
    const ar = lanceta(uc, yAr, yAr, hwA, hwA * 1.1, lod ? 2 : 4).slice(2)
    const segN = lod ? 2 : 4
    const dir = ar.slice(0, segN + 1), esq = ar.slice(segN + 1), ponta = dir[dir.length - 1]
    const uL = Math.min(ua, ub) + 0.45, uR = Math.max(ua, ub) - 0.45
    for (const dv of [0.91, -0.91]) {
      poli(g, Q, [[uL, yAt(uL)], ...esq.slice().reverse(), ponta, [uc, yAt(uc)]], v + dv, ARD, dv < 0)
      poli(g, Q, [[uR, yAt(uR)], [uc, yAt(uc)], ponta, ...dir.slice(0, -1).reverse()], v + dv, ARD, dv < 0)
    }
  }
  // tabuleiro inclinado e a balaustrada
  const A = (u: number, dv: number, dy: number): V3 => Q.P(u, v + dv, yAt(u) + dy)
  face(g, [A(u0, 1.1, 0.4), A(u1, 1.1, 0.4), A(u1, -1.1, 0.4), A(u0, -1.1, 0.4)], CANT, [0, 1, 0])
  face(g, [A(u0, 1.1, -0.2), A(u1, 1.1, -0.2), A(u1, 1.1, 0.4), A(u0, 1.1, 0.4)], CANT_ESC, Q.N(0, 1))
  if (!lod) {
    const m = Math.round(L / 0.6)
    for (let k = 0; k <= m; k++) {
      const u = u0 + ((u1 - u0) * k) / m
      tube(g, A(u, 1, 0.4), A(u, 1, 1.2), 0.07, 0.07, 4, () => CANT, false)
    }
    tube(g, A(u0, 1, 1.25), A(u1, 1, 1.25), 0.12, 0.12, 4, () => CANT, false)
  }
  bloq(c, Q, um, v, L, 1.8, Math.max(y0, y1))
}

/** ROCHA do morro (ardósia azul facetada, a face da frente clara). */
function rochaM(c: Cena, Q: Q, u: number, v: number, s: number, h: number, seed: number, lod: number) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2])
  const n = lod ? 5 : 6
  const base: V3[] = [], top: V3[] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (rnd(seed, k) - 0.5) * 0.5) / n) * Math.PI * 2
    const R = s * (0.85 + rnd(seed, k, 2) * 0.3)
    base.push(Q.P(u + Math.cos(a) * R, v + Math.sin(a) * R, -0.1))
    top.push(Q.P(u + Math.cos(a) * R * 0.55, v + Math.sin(a) * R * 0.55, h * (0.8 + rnd(seed, k, 3) * 0.3)))
  }
  const ct = Q.P(u, v, h)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (base[k][0] + base[j][0]) / 2 - p[0], mz = (base[k][2] + base[j][2]) / 2 - p[2]
    const fr = -mz > Math.abs(mx) * 0.4
    const cc = fr ? mix(ROCHA, CANT, 0.25) : mx < 0 ? ROCHA : mul(ROCHA, 0.72)
    face(g, [base[k], base[j], top[j], top[k]], [mul(cc, 0.78), mul(cc, 0.78), cc, cc], [mx, 0.1, mz])
    face(g, [top[k], top[j], ct], mix(cc, CANT, 0.3), [mx * 0.4, 1, mz * 0.4])
  }
}

/** O CASTELO INTEIRO sobre a `CasteloPlanta` (frente para −z). */
export function casteloNoctis(c: Cena, K: CasteloPlanta, lod = 0) {
  const ang = Math.PI
  const x0 = K.porta.x, zf = K.porta.z - 1.5
  const Q = quadro(x0, zf, ang)
  const vMen = -(K.patio.z1 - zf)
  const fundo = K.z + K.d / 2 - K.patio.z1
  const patioHw = (K.patio.x1 - K.patio.x0) / 2
  portal(c, Q, lod)
  // torres (a ref: a torre da lua à DIREITA de quem olha, a alta à esquerda, as lanternas nos cantos)
  torreLua(c, Q, 8.4, -4.2, lod)
  torre(c, Q, -10.8, -2.6, { w: 4.8, h: 15, topo: 22, janelas: 2, seed: 3 }, lod)
  torre(c, Q, -6.4, -1.4, { w: 2.2, h: 12.6, topo: 18.4, seed: 4 }, lod)
  torre(c, Q, 13.6, -1.2, { w: 2.2, h: 11.4, topo: 16.2, seed: 5 }, lod)
  torre(c, Q, -22.4, 0.4, { w: 5.4, h: 10.4, topo: 19.6, lanterna: true, janelas: 1, y0: 0, seed: 6 }, lod)
  torre(c, Q, 17.6, 0.4, { w: 4.6, h: 9.2, topo: 17.4, lanterna: true, janelas: 1, seed: 7 }, lod)
  // ponte em arco da torre-lanterna esquerda à torre alta, e a rampa em arcada da direita
  ponte(c, Q, -19.6, -13.4, 0.2, 7.2, 8.2, lod)
  ponte(c, Q, 20, 27, 0.6, 6.4, 3.2, lod)
  // muralha baixa com balaustrada ligando as torres na frente (o terraço da ref)
  {
    const g = c.geo(Q.P(-15, -0.6, 0)[0], Q.P(-15, -0.6, 0)[2])
    for (const [a, b] of [[-19.6, -13.2], [10.8, 15.2]] as const) {
      cx(g, Q, (a + b) / 2, -0.8, Math.abs(b - a), 2, 0, 3.4, ARD, CANT, ARD_CL)
      ameias(g, Q, a, b, 0.1, 3.7, lod)
      bloq(c, Q, (a + b) / 2, -0.8, Math.abs(b - a), 2, 3.4)
    }
  }
  // laterais do pátio e a menagem do fundo (inventada: o arco aceso da travessia)
  for (const s of [-1, 1]) {
    const L = -vMen - 6.6, vm = -6.6 - L / 2
    const pm = Q.P(s * (patioHw + 1.5), vm, 0)
    const gg = c.geo(pm[0], pm[2])
    cx(gg, Q, s * (patioHw + 1.5), vm, 2.4, L, 0, 8.4, ARD, CANT, ARD_CL)
    // a face de fora (a que se vê de longe): contrafortes de cantaria, janelas acesas, friso e ameias
    const GLL = c.glow(pm[0], pm[2]), uo = s * (patioHw + 2.75)
    const nb = Math.max(2, Math.round(L / 5))
    for (let k = 0; k <= nb; k++) {
      const vv = -6.6 - (L * k) / nb
      cx(gg, Q, uo + s * 0.3, vv, 0.6, 0.9, 0, 8.6, CANT_ESC, CANT, CANT)
      if (k < nb && !lod) {
        const vw = vv - L / nb / 2, pw = Q.P(uo + s * 0.04, vw, 0)
        const Qs = quadro(pw[0], pw[2], Math.PI - (s * Math.PI) / 2)
        janela(gg, GLL, Qs, 0, 0, 2.6, 0.55, 3.6, lod, 90 + k + (s > 0 ? 20 : 0))
      }
    }
    cx(gg, Q, s * (patioHw + 1.5), vm, 2.8, L, 7.8, 8.2, CANT, CANT)
    if (!lod) for (let k = 0; k < Math.round(L / 1.1); k++) cx(gg, Q, uo - s * 0.15, -6.6 - (k + 0.5) * 1.1, 0.4, 0.6, 8.4, 9.1, CANT, CANT)
    bloq(c, Q, s * (patioHw + 1.5), vm, 2.4, L, 8.4)
  }
  {
    const W = patioHw * 2 + 4, D = Math.max(8, fundo)
    const pm = Q.P(0, vMen - D / 2, 0)
    const g = c.geo(pm[0], pm[2]), GL = c.glow(pm[0], pm[2])
    cx(g, Q, 0, vMen - D / 2, W, D, 0, 11, ARD, CANT, ARD_CL)
    janela(g, GL, Q, 0, vMen + 0.03, 0, 2, 7.4, lod, 81)
    for (const s of [-1, 1]) janela(g, GL, Q, s * 6, vMen + 0.03, 3, 0.6, 4, lod, 82 + s)
    ameias(g, Q, -W / 2, W / 2, vMen + 0.1, 11.3, lod)
    bloq(c, Q, 0, vMen - D / 2, W, D, 11)
    for (const s of [-1, 1]) telhado(g, GL, Q, s * (W / 2 - 1), vMen - 1, 11, 1.2, 4, 6, lod)
    // frisos e quinas claras do bloco, e os torreões dos cantos de trás (telhado pontudo como as torres da frente)
    cx(g, Q, 0, vMen - D / 2, W + 0.3, D + 0.3, 0, 0.9, CANT_ESC, CANT)
    cx(g, Q, 0, vMen - D / 2, W + 0.3, D + 0.3, 6.2, 6.5, CANT, CANT)
    for (const s of [-1, 1]) {
      const ut = s * (W / 2), vt = vMen - D
      torre(c, Q, ut, vt, { w: 3.6, h: 13, topo: 19.5, janelas: 2, seed: 70 + s }, lod)
      if (!lod) {
        const pw = Q.P(s * (W / 2 + 0.04), vMen - D / 2, 0)
        const Qs = quadro(pw[0], pw[2], Math.PI - (s * Math.PI) / 2)
        for (const dv of [-D / 4, D / 4]) janela(g, GL, Qs, dv, 0, 3, 0.7, 4.2, lod, 76 + s + dv)
      }
    }
  }
  // o morro de rocha na frente dos cantos e embaixo das torres (a ref: o castelo assenta na rocha)
  const rochas: [number, number, number, number][] = [[-25.5, 3.4, 4.6, 4.4], [-20.5, 5.2, 3.8, 3], [-16, 4.4, 3.2, 2.4], [-28.5, -1, 3.8, 3.8], [-12.6, 4, 2.6, 1.8], [21.4, 4.2, 3.6, 3], [25.4, 2.6, 3.2, 2.6], [14.8, 4, 2.8, 2], [-8.2, 3.8, 2, 1.4], [11.4, 4.2, 2.2, 1.6], [-23, 7.4, 2.6, 1.6], [19, 7.2, 2.4, 1.4], [-17.5, 9.4, 3, 1.4], [-11.5, 8.6, 2.6, 1.1], [15.5, 9.6, 3, 1.3], [10.5, 8.8, 2.4, 1], [-28, 6.8, 3.2, 2.2], [26, 6.4, 3, 2]]
  rochas.forEach(([u, v, s, h], k) => {
    rochaM(c, Q, u, v, s, h, 40 + k, lod)
    bloq(c, Q, u, v, s * 1.5, s * 1.5, h)
  })
  // pedestais com o losango de cristal ladeando a praça (onde a escadaria da ref tem os seus)
  for (const s of [-1, 1]) {
    const p = Q.P(s * 5.6, 3.6, 0)
    const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
    tronco(g, Q, s * 5.6, 3.6, 0, 0.4, 1.7, 1.7, 1.5, 1.5, CANT_ESC, CANT)
    cx(g, Q, s * 5.6, 3.6, 1.2, 1.2, 0.4, 2.2, CANT, CANT, CANT)
    remate(GL, [p[0], 3.2, p[2]], 1.1)
    bloq(c, Q, s * 5.6, 3.6, 1.7, 1.7, 2.2)
  }
  // as balaustradas que ladeiam a escadaria da ref (descem abrindo da porta até a praça), com pedestal e cristal na ponta
  if (!lod)
    for (const s of [-1, 1]) {
      const a = Q.P(s * 4.4, 0.8, 0), b = Q.P(s * 6.6, 9.4, 0)
      const g = c.geo((a[0] + b[0]) / 2, (a[2] + b[2]) / 2), GL = c.glow(b[0], b[2])
      const m = 14
      for (let k = 0; k <= m; k++) {
        const t = k / m, u = s * (4.4 + 2.2 * t), v = 0.8 + 8.6 * t, y = 1.6 - 1.1 * t
        tube(g, Q.P(u, v, 0), Q.P(u, v, y), 0.09, 0.09, 4, () => CANT, false)
      }
      tube(g, Q.P(s * 4.4, 0.8, 1.7), Q.P(s * 6.6, 9.4, 0.6), 0.16, 0.16, 4, () => CANT, false)
      tube(g, Q.P(s * 4.4, 0.8, 0.05), Q.P(s * 6.6, 9.4, 0.05), 0.22, 0.22, 4, () => CANT_ESC, false)
      cx(g, Q, s * 6.8, 9.8, 1, 1, 0, 1.4, CANT, CANT, CANT)
      remate(GL, Q.P(s * 6.8, 9.8, 2.1), 0.8)
    }
  // a praça: faixas de laje claras (os degraus da ref, planos)
  {
    const p = Q.P(0, 3, 0)
    const g = c.geo(p[0], p[2])
    for (let k = 0; k < 7; k++) {
      const v0 = 0.6 + k * 0.85, w = 3.4 + k * 0.3
      face(g, [Q.P(-w, v0, 0.03), Q.P(w, v0, 0.03), Q.P(w, v0 + 0.85, 0.03), Q.P(-w, v0 + 0.85, 0.03)], k % 2 ? mix(ARD_CL, CANT, 0.35) : mix(ARD, CANT, 0.3), [0, 1, 0])
    }
  }
  return { arco: Q.P(0, vMen, 3), lua: Q.P(8.4, -4.2, 26.8) }
}
