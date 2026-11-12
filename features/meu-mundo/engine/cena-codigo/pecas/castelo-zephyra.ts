// features/meu-mundo/engine/cena-codigo/pecas/castelo-zephyra.ts — a CIDADELA DAS TEMPESTADES de Zéphyra pela
// CÓPIA MINUCIOSA da ref `ref/dominios/castelo-zephyra.png` (inventário `MEU MUNDO 3D/pipeline/pecas-codigo/copia/
// inventario/castelo-zephyra.json`). Régua: o vão da porta (790–910 px) = 5 m → 24 px/m; chão da porta = y 750 px.
//
// FICHA
// O que é:        cidadela gótica de pedra VERMELHA com toda quina, pilastra e cornija em pedra CREME, cristais
//                 ciano acesos nas pontas, as duas ASAS de penas vermelhas e creme abertas atrás das torres.
// Silhueta:       a menagem afunilada no meio com a flecha de cristal (31 m), as torres gêmeas (25 m) com as asas
//                 saindo de trás, os FARÓIS de canto com o mirante de colunas e o raio de cristal, e as arcadas.
// Simetria:       espelhada em u.
// Massas grandes: portal (17,5 m, frontão com a ESTRELA de cristal a 11,7 m), menagem (8,4 → 4 m, 26 m), torres
//                 gêmeas (u ±11,2; 4,6 m), asas (ponta a ±24 m, 27 m), faróis (u ±26,7), arcadas (7 m).
// Médios:         porta em lanceta aceso-ciano com o rendilhado, estandartes bordô com a ponta de lança, pedestais
//                 de cristal, janelas em lanceta acesas, pináculos escuros com remate de ouro.
// Pequenos:       molduras creme, frisos, veios de cristal na rocha da base.
// Paleta:         vermelho 0,8/0,26/0,22 (sombra 0,56/0,16/0,16), creme 0,95/0,86/0,78 (sombra 0,74/0,62/0,58),
//                 ardósia dos pináculos 0,32/0,33/0,4, ouro 0,9/0,66/0,3, ciano aceso.
// Fora:           a ESCADARIA (chão de andar plano: vira praça); a porta é atravessável (o vão é o caminho do pátio).
// Medidas:        contrato `dominio.ts` (CasteloPlanta): frente para −z, porta = vão de 5 m, pátio aberto, menagem no
//                 fundo do pátio com o arco aceso da travessia.
// Inventado:      lados e fundo.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { lanceta } from "./castelo-iris"
import { bloq, cx, poli, tronco } from "./fabrica"
import { CIANO, CIANO_CL, CIANO_ESC, cristalCiano } from "./canion"
import type { CasteloPlanta } from "../dominio"

export const VERM: RGB = [0.8, 0.26, 0.22]
export const VERM_CL: RGB = [0.9, 0.38, 0.32]
export const VERM_ESC: RGB = [0.56, 0.16, 0.16]
export const CREME: RGB = [0.96, 0.87, 0.8]
export const CREME_ESC: RGB = [0.76, 0.64, 0.6]
export const ARDOSIA: RGB = [0.32, 0.33, 0.4]
export const OURO: RGB = [0.92, 0.68, 0.3]
export const PANO: RGB = [0.62, 0.1, 0.14]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>
type UV = [number, number]

/** Pináculo de ardósia (4 faces) com o colar de ouro; `cristal` = a ponta ciano acesa no lugar. */
function pinaculo(g: G, GL: G, Q: Q, u: number, v: number, y: number, r: number, h: number, cristal = false) {
  const p = Q.P(u, v, 0)
  tube(g, [p[0], y, p[2]], [p[0], y + h * 0.1, p[2]], r * 1.15, r * 1.15, 6, (k) => (k % 2 ? OURO : mix(OURO, [1, 0.9, 0.6], 0.4)), false)
  if (cristal) {
    tube(GL, [p[0], y + h * 0.1, p[2]], [p[0], y + h, p[2]], r * 0.95, 0.02, 4, (k) => (k % 2 ? CIANO : k === 0 ? CIANO_CL : CIANO_ESC), true)
  } else tube(g, [p[0], y + h * 0.1, p[2]], [p[0], y + h, p[2]], r, 0.02, 4, (k) => (k % 2 ? ARDOSIA : mix(ARDOSIA, [0.6, 0.62, 0.7], 0.4)), true)
}

/** Janela em lanceta acesa ciano (moldura creme saliente + montante). */
function janela(g: G, GL: G, Q: Q, u: number, v: number, y0: number, hw: number, yb: number, hp: number, lod: number) {
  const seg = lod ? 3 : 5
  poli(g, Q, lanceta(u, y0 - 0.3, yb, hw + 0.35, hp + 0.45, seg), v, CREME)
  const pts = lanceta(u, y0, yb, hw, hp, seg)
  poli(GL, Q, pts, v + 0.04, pts.map(([, y]): RGB => (y > yb ? CIANO_CL : y > (y0 + yb) / 2 ? CIANO : CIANO_ESC)))
  if (!lod) cx(g, Q, u, v + 0.08, 0.1, 0.06, y0, yb + hp * 0.6, CREME_ESC)
}

/** Estandarte bordô com borda de ouro e a PONTA DE LANÇA creme. */
function estandarte(g: G, GL: G, Q: Q, u: number, v: number, yT: number, w: number, h: number) {
  const hw = w / 2
  poli(GL, Q, [[u - hw, yT], [u + hw, yT], [u + hw, yT - h * 0.84], [u, yT - h], [u - hw, yT - h * 0.84]], v, [PANO, PANO, mul(PANO, 0.85), mul(PANO, 0.75), mul(PANO, 0.85)])
  for (const s of [-1, 1]) poli(g, Q, [[u + s * hw, yT], [u + s * (hw - 0.1), yT], [u + s * (hw - 0.1), yT - h * 0.83], [u + s * hw, yT - h * 0.84]], v + 0.02, OURO)
  const my = yT - h * 0.45
  poli(g, Q, [[u, my + h * 0.22], [u + hw * 0.32, my - h * 0.05], [u, my - h * 0.2], [u - hw * 0.32, my - h * 0.05]], v + 0.03, CREME)
  cx(g, Q, u, v + 0.04, 0.08, 0.04, my - h * 0.32, my + h * 0.3, CREME)
  tube(g, Q.P(u - hw - 0.25, v + 0.08, yT + 0.08), Q.P(u + hw + 0.25, v + 0.08, yT + 0.08), 0.07, 0.07, 4, () => OURO, false)
}

/**
 * TORRE GÊMEA (u ±11,2): corpo vermelho com as QUINAS creme e a pilastra do meio, janela alta acesa, cornija creme
 * com mísulas, o tambor de 8 faces, o cone vermelho com o colar de ouro e a PONTA de cristal; os pináculos menores.
 */
function torreGemea(c: Cena, x: number, z: number, ang: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const w = 4.6, hw = w / 2, H = 19.2
  cx(g, Q, 0, 0, w, w, 0, H - 1, VERM, CREME, VERM_CL)
  for (const su of [-1, 1]) {
    cx(g, Q, su * (hw - 0.1), hw - 0.1, 1.1, 0.9, 0, H - 1, CREME, CREME, CREME)
    tronco(g, Q, su * (hw + 0.2), 0, 0, 7, 1.6, w + 0.4, 0.9, w * 0.8, CREME_ESC, CREME, CREME)
  }
  for (const yy of [3.2, 9.6]) cx(g, Q, 0, 0, w + 0.3, w + 0.3, yy, yy + 0.5, CREME, CREME)
  janela(g, GL, Q, 0, hw + 0.02, 13.8, 0.7, 16.2, 0.9, lod)
  janela(g, GL, Q, 0, hw + 0.02, 5.4, 0.55, 7.6, 0.7, lod)
  tronco(g, Q, 0, 0, H - 1, H, w + 0.4, w + 0.4, w + 0.9, w + 0.9, CREME, CREME)
  // tambor e cone
  const p = Q.P(0, 0, 0)
  tube(g, [p[0], H, p[2]], [p[0], H + 1.6, p[2]], hw * 0.85, hw * 0.8, lod ? 6 : 8, (k) => (k % 2 ? VERM : VERM_CL), false)
  tube(g, [p[0], H + 1.6, p[2]], [p[0], H + 2, p[2]], hw * 0.95, hw * 0.95, lod ? 6 : 8, () => OURO, false)
  tube(g, [p[0], H + 2, p[2]], [p[0], H + 4.3, p[2]], hw * 0.9, hw * 0.25, lod ? 6 : 8, (k) => (k % 2 ? VERM : VERM_ESC), false)
  pinaculo(g, GL, Q, 0, 0, H + 4.2, hw * 0.28, 4.4, true)
  if (!lod) for (const [su, sv] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) pinaculo(g, GL, Q, su * (hw + 0.2), sv * (hw + 0.2), H, 0.3, 2.4)
  bloq(c, Q, 0, 0, w, w, H)
}

/**
 * FAROL DE CANTO (u ±26,7, sobre o penhasco): base vermelha em talude com o contraforte creme, o corpo de 8 faces
 * com janelas acesas, a varanda creme com ameias, o MIRANTE de colunas creme com a luz ciano dentro, o teto e o
 * RAIO DE CRISTAL no alto.
 */
function farol(c: Cena, x: number, z: number, ang: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const p = Q.P(0, 0, 0)
  const n = lod ? 6 : 8
  // penhasco da base (rocha vermelha com veios ciano) e o talude
  tube(g, [p[0], -0.1, p[2]], [p[0], 3.4, p[2]], 6.2, 4.4, lod ? 6 : 9, (k) => (k % 3 === 0 ? VERM_CL : k % 3 === 1 ? VERM : VERM_ESC), false)
  if (!lod)
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.7
      const nx = Math.cos(a), nz = Math.sin(a)
      const P = (t: number, d: number): V3 => [p[0] + nx * (6.2 - t * 1.8 + 0.05) + -nz * d, t * 3.4, p[2] + nz * (6.2 - t * 1.8 + 0.05) + nx * d]
      face(GL, [P(0, -0.12), P(0, 0.12), P(0.55, 0.45), P(0.55, 0.25)], [CIANO, CIANO, CIANO_CL, CIANO_CL], [nx, 0.4, nz])
      face(GL, [P(0.55, 0.25), P(0.55, 0.45), P(0.95, 0.2), P(0.95, 0.06)], [CIANO_CL, CIANO_CL, CIANO, CIANO], [nx, 0.4, nz])
    }
  tube(g, [p[0], 3.4, p[2]], [p[0], 6.6, p[2]], 4.2, 3.4, n, (k) => (k % 2 ? VERM : VERM_CL), false)
  tube(g, [p[0], 6.6, p[2]], [p[0], 12.6, p[2]], 3.1, 2.9, n, (k) => (k % 2 ? VERM : VERM_CL), false)
  // contraforte creme na frente (o "dente" da ref)
  tronco(g, Q, 0, 3.3, 0, 7.2, 1.6, 1.4, 0.7, 0.5, CREME, CREME, CREME)
  if (!lod) for (const su of [-1, 1]) janela(g, GL, Q, su * 1.5, 2.85, 8.4, 0.32, 10.2, 0.5, lod)
  // varanda com ameias e o mirante
  tube(g, [p[0], 12.6, p[2]], [p[0], 13.6, p[2]], 3.7, 3.7, n, () => CREME, false)
  tube(g, [p[0], 13.6, p[2]], [p[0], 13.65, p[2]], 3.7, 0.1, n, () => CREME_ESC, false)
  if (!lod)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      tube(g, [p[0] + Math.cos(a) * 3.5, 13.6, p[2] + Math.sin(a) * 3.5], [p[0] + Math.cos(a) * 3.5, 14.3, p[2] + Math.sin(a) * 3.5], 0.42, 0.42, 4, () => CREME, true)
      // colunas do mirante
      tube(g, [p[0] + Math.cos(a + 0.2) * 2.1, 13.6, p[2] + Math.sin(a + 0.2) * 2.1], [p[0] + Math.cos(a + 0.2) * 2.1, 16.8, p[2] + Math.sin(a + 0.2) * 2.1], 0.22, 0.22, 5, () => CREME, false)
    }
  tube(GL, [p[0], 13.6, p[2]], [p[0], 16.6, p[2]], 1.5, 1.2, 6, (k) => (k % 2 ? CIANO : CIANO_CL), false)
  tube(g, [p[0], 16.8, p[2]], [p[0], 17.5, p[2]], 2.6, 2.6, n, () => CREME, false)
  tube(g, [p[0], 17.5, p[2]], [p[0], 18.6, p[2]], 2.2, 0.9, n, (k) => (k % 2 ? VERM : VERM_ESC), false)
  pinaculo(g, GL, Q, 0, 0, 18.4, 0.75, 6.2, true)
  c.block(p[0], p[2], 4.6, 4.6, 14)
}

/**
 * ASA (s = −1 / +1): 7 penas grandes vermelhas em leque (ombro atrás da torre gêmea, ponta a ±24 m e 27 m) e por cima
 * as COBERTEIRAS creme (5 penas curtas); cada pena é uma tábua com ponta e uma dobra (2 tons). Plano v.
 */
function asa(g: G, Q: Q, s: number, v: number, lod: number) {
  const ou = s * 6.5, oy = 14.5
  const penas: [number, number, number][] = [[21.5, 36, 4.2], [20, 27, 4.2], [18, 18, 4], [15.8, 9, 3.8], [13.4, 1, 3.5], [11, -7, 3.2], [8.6, -15, 2.8]]
  const usar = lod ? penas.filter((_, k) => k % 2 === 0) : penas
  usar.forEach(([L, deg, w], k) => {
    const a = (deg * Math.PI) / 180
    const du = s * Math.cos(a), dy = Math.sin(a)
    const pu = -dy * s, py = Math.cos(a)
    const vv = v - k * 0.25
    const P = (t: number, o: number): V3 => Q.P(ou + du * L * t + pu * o * s, vv, oy + dy * L * t + py * o)
    const hw = w / 2
    const cor = k % 2 ? VERM : VERM_CL
    face(g, [P(0, -hw), P(0.8, -hw * 0.8), P(1, 0), P(0, 0)], mul(cor, 0.84), Q.N(0, 1))
    face(g, [P(0, 0), P(1, 0), P(0.8, hw * 0.8), P(0, hw)], cor, Q.N(0, 1))
    face(g, [P(0, -hw), P(0.8, -hw * 0.8), P(1, 0), P(0.8, hw * 0.8), P(0, hw)], VERM_ESC, Q.N(0, -1))
  })
  // coberteiras creme (curtas, por cima, do ombro)
  const cob: [number, number, number][] = [[12, 40, 3.6], [11, 29, 3.4], [9.8, 18, 3.2], [8.2, 7, 3], [6.4, -4, 2.6]]
  for (const [k, [L, deg, w]] of (lod ? cob.slice(0, 2) : cob).entries()) {
    const a = (deg * Math.PI) / 180
    const du = s * Math.cos(a), dy = Math.sin(a), pu = -dy * s, py = Math.cos(a)
    const vv = v + 0.4 + k * 0.05
    const P = (t: number, o: number): V3 => Q.P(ou + du * L * t + pu * o * s, vv, oy + 1 + dy * L * t + py * o)
    const hw = w / 2
    face(g, [P(0, -hw), P(0.82, -hw * 0.85), P(1, 0), P(0.82, hw * 0.85), P(0, hw)], k % 2 ? CREME : mix(CREME, CREME_ESC, 0.4), Q.N(0, 1))
    face(g, [P(0, -hw), P(0.82, -hw * 0.85), P(1, 0), P(0.82, hw * 0.85), P(0, hw)], CREME_ESC, Q.N(0, -1))
  }
}

/**
 * MENAGEM (no fundo do pátio): corpo baixo com o arco aceso da travessia e, em cima, a TORRE AFUNILADA vermelha com
 * as pilastras creme, a janela alta acesa, a coroa de pontas vermelhas e a FLECHA DE CRISTAL (31 m) com o colar.
 * As ASAS saem de trás das torres gêmeas.
 */
function menagem(c: Cena, x: number, z: number, ang: number, W: number, D: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const yT = 9
  cx(g, Q, 0, -D / 2, W, D, 0, yT, VERM, CREME, VERM_CL)
  bloq(c, Q, 0, -D / 2, W, D, yT)
  const arc = lanceta(0, 0, 3.8, 2, 1.8, lod ? 3 : 6)
  poli(g, Q, lanceta(0, -0.2, 3.8, 2.6, 2.4, lod ? 3 : 6), 0.03, CREME)
  poli(GL, Q, arc, 0.08, arc.map(([, y]): RGB => (y > 3.8 ? CIANO_CL : CIANO)))
  for (const s of [-1, 1]) {
    for (const u of [4, W / 2 - 0.4]) cx(g, Q, s * u, 0.2, 0.8, 0.4, 0, yT, CREME)
    janela(g, GL, Q, s * 7, 0.03, 3, 0.5, 5.4, 0.7, lod)
  }
  cx(g, Q, 0, -D / 2, W + 0.4, D + 0.4, yT - 0.5, yT, CREME, CREME)
  // torre afunilada
  const vb = -3, db = Math.min(9, D - 3), y1 = 26
  tronco(g, Q, 0, vb - db / 2, yT, y1, 12, db, 4.4, db * 0.45, VERM, undefined, VERM_CL)
  const hwAt = (y: number) => 6 - 3.8 * ((y - yT) / (y1 - yT))
  const fz = (y: number) => vb - ((db - db * 0.45) / 2) * ((y - yT) / (y1 - yT)) + 0.06
  // pilastras creme inclinadas (as duas do meio e as quinas)
  for (const s of [-1, 1])
    for (const k of [0.32, 0.98]) {
      const a = Q.P(s * 6 * k, fz(yT) + 0.2, yT), b = Q.P(s * 2.2 * k, fz(y1) + 0.2, y1)
      tube(g, a, b, 0.75, 0.45, 4, (j) => (j % 2 ? CREME : CREME_ESC), false)
    }
  for (const yy of [13.4, 20.4]) {
    const hwy = hwAt(yy)
    face(g, [Q.P(-hwy - 0.3, fz(yy) + 0.2, yy), Q.P(hwy + 0.3, fz(yy) + 0.2, yy), Q.P(hwy + 0.3, fz(yy) + 0.2, yy + 0.6), Q.P(-hwy - 0.3, fz(yy) + 0.2, yy + 0.6)], CREME, Q.N(0, 1, 0.2))
  }
  janela(g, GL, Q, 0, fz(16.5) + 0.25, 14.6, 0.95, 17.4, 1.2, lod)
  // coroa: pontas vermelhas e a flecha de cristal com o colar de ouro
  const pT = Q.P(0, vb - db / 2, 0)
  tube(g, [pT[0], y1, pT[2]], [pT[0], y1 + 0.6, pT[2]], 2.4, 2.4, 8, () => CREME, false)
  if (!lod)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3
      const px = pT[0] + Math.cos(a) * 1.9, pz = pT[2] + Math.sin(a) * 1.9
      tube(g, [px, y1 + 0.6, pz], [px, y1 + 2.6 + (k % 2) * 0.8, pz], 0.42, 0.02, 4, (j) => (j % 2 ? VERM : VERM_ESC), true)
    }
  tube(g, [pT[0], y1 + 0.6, pT[2]], [pT[0], y1 + 1.4, pT[2]], 1, 1, 8, (k) => (k % 2 ? OURO : ARDOSIA), false)
  tube(GL, [pT[0], y1 + 1.4, pT[2]], [pT[0], y1 + 5.4, pT[2]], 0.9, 0.02, 4, (k) => (k % 2 ? CIANO : k === 0 ? CIANO_CL : CIANO_ESC), true)
  tube(GL, [pT[0], y1 + 1.4, pT[2]], [pT[0], y1 + 0.4, pT[2]], 0.9, 0.3, 4, () => CIANO_ESC, false)
  if (!lod) for (const s of [-1, 1]) pinaculo(g, GL, Q, s * 3.2, vb - 0.4, yT, 0.42, 4.2)
}

/**
 * PORTAL (o centro da frente): o bloco creme com as pilastras, a moldura em lanceta grossa, a PORTA DE CRISTAL
 * (vitral ciano com o rendilhado escuro), o frontão com a ESTRELA de 4 pontas creme com o cristal no meio, os
 * estandartes e os pináculos. Frente em v = 0; o vão não tem colisão.
 */
function portal(c: Cena, x: number, z: number, ang: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const hw = 4.6, H = 9.4, D = 4
  for (const s of [-1, 1]) {
    cx(g, Q, s * (hw - 0.9), -D / 2 + 0.6, 1.8, D, 0, H, CREME, CREME, CREME)
    cx(g, Q, s * (hw + 1.1), -D / 2 + 0.2, 2.6, D, 0, 11.2, VERM, CREME, VERM_CL)
    cx(g, Q, s * (hw + 2.3), 0.15, 0.6, 0.6, 0, 11.6, CREME, CREME)
    pinaculo(g, GL, Q, s * (hw + 2.3), 0.15, 11.6, 0.3, 2.2)
    pinaculo(g, GL, Q, s * (hw - 0.2), 0.3, H, 0.3, 2)
    estandarte(g, GL, Q, s * 6.2, 0.62, 9.4, 1.8, 6.6)
    bloq(c, Q, s * (hw - 0.9), -D / 2 + 0.6, 1.8, D, H)
    bloq(c, Q, s * (hw + 1.1), -D / 2 + 0.2, 2.6, D, 11.2)
  }
  cx(g, Q, 0, -D / 2 + 0.6, 2 * hw, D, 8.6, H + 0.4, CREME, CREME, CREME)
  // frontão em V e a estrela
  poli(g, Q, [[-hw, H + 0.4], [hw, H + 0.4], [0, H + 4.6]], 0.6, mix(CREME, CREME_ESC, 0.25))
  for (const s of [-1, 1]) tube(g, Q.P(s * (hw + 0.3), 0.8, H + 0.2), Q.P(0, 0.8, H + 4.9), 0.42, 0.42, 4, (k) => (k % 2 ? CREME : CREME_ESC), false)
  const sy = H + 2.2, sr = 2.6
  const est: UV[] = []
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 2
    const r = k % 2 ? sr * 0.32 : k === 0 || k === 4 ? sr * 1.15 : sr
    est.push([Math.cos(a) * r, sy + Math.sin(a) * r])
  }
  for (let k = 0; k < 8; k++) poli(g, Q, [[0, sy], est[k], est[(k + 1) % 8]], 1, k % 2 ? CREME : CREME_ESC)
  const cr: UV[] = [[0, sy + 0.9], [0.65, sy], [0, sy - 0.9], [-0.65, sy]]
  for (let k = 0; k < 4; k++) poli(GL, Q, [[0, sy], cr[k], cr[(k + 1) % 4]], 1.08, [CIANO_CL, k % 2 ? CIANO : CIANO_ESC, CIANO])
  // a porta: moldura em lanceta e o vitral de cristal com o rendilhado
  const dHw = 2.5, dYb = 5.2, dHp = 3
  const seg = lod ? 4 : 8
  poli(g, Q, lanceta(0, 0, dYb, dHw + 0.9, dHp + 1, seg), 0.62, CREME)
  poli(g, Q, lanceta(0, 0, dYb, dHw + 0.4, dHp + 0.45, seg), 0.66, CREME_ESC)
  const dp = lanceta(0, 0, dYb, dHw, dHp, seg)
  poli(GL, Q, dp, 0.7, dp.map(([u, y]): RGB => (y < 2 ? CIANO_ESC : Math.abs(u) < 0.6 ? CIANO_CL : CIANO)))
  if (!lod) {
    const vt = 0.76
    for (const du of [-dHw * 0.5, 0, dHw * 0.5]) cx(g, Q, du, vt, du ? 0.1 : 0.16, 0.06, 0, du ? dYb : dYb + dHp * 0.9, [0.28, 0.32, 0.36])
    for (const s of [-1, 1]) {
      const sub = lanceta(s * dHw * 0.5, dYb - 1.6, dYb - 0.6, dHw * 0.42, 1.1, 4).slice(2)
      for (let k = 0; k < sub.length - 1; k++) tube(g, Q.P(sub[k][0], vt, sub[k][1]), Q.P(sub[k + 1][0], vt, sub[k + 1][1]), 0.05, 0.05, 4, () => [0.28, 0.32, 0.36], false)
    }
    cx(g, Q, 0, vt, 2 * dHw, 0.05, 2.6, 2.75, [0.28, 0.32, 0.36])
  }
  // PEDESTAIS DE CRISTAL na frente (u ±10,2) e os menores (u ±7,6)
  for (const s of [-1, 1]) {
    for (const [u, k] of [[10.2, 1], [7.6, 0.65]] as const) {
      const p = Q.P(s * u, 3.6, 0)
      const gg = c.geo(p[0], p[2])
      tronco(gg, Q, s * u, 3.6, 0, 0.4 * k, 2 * k, 2 * k, 1.8 * k, 1.8 * k, CREME_ESC, CREME)
      cx(gg, Q, s * u, 3.6, 1.4 * k, 1.4 * k, 0.4 * k, 3.4 * k, CREME, CREME, CREME)
      if (!lod) poli(c.glow(p[0], p[2]), Q, [[s * u - 0.15 * k, 0.9 * k], [s * u + 0.15 * k, 0.9 * k], [s * u + 0.15 * k, 2.8 * k], [s * u - 0.15 * k, 2.8 * k]], 3.6 + 0.72 * k, CIANO)
      tronco(gg, Q, s * u, 3.6, 3.4 * k, 3.9 * k, 1.7 * k, 1.7 * k, 1.2 * k, 1.2 * k, CREME, CREME)
      cristalCiano(c, p[0], p[2], 1.4 * k, Math.round(u * 10 + s), lod, 3.9 * k)
      bloq(c, Q, s * u, 3.6, 2 * k, 2 * k, 4 * k)
    }
  }
}

/**
 * ARCADA (de cada lado, do portal ao farol): galeria creme de arcos ogivais ABERTOS sobre pilares, com o
 * corrimão de ouro e o estandarte; atrás, a muralha vermelha baixa.
 */
function arcada(c: Cena, Q: Q, s: number, lod: number) {
  const u0 = s * 13.2, u1 = s * 23.5, v = -1.2
  const pm = Q.P((u0 + u1) / 2, v, 0)
  const g = c.geo(pm[0], pm[2]), GL = c.glow(pm[0], pm[2])
  const H = 7
  const n = 4, passo = (u1 - u0) / n
  for (let k = 0; k <= n; k++) cx(g, Q, u0 + passo * k, v, 0.8, 1.6, 0, H, CREME, CREME, CREME)
  cx(g, Q, (u0 + u1) / 2, v, Math.abs(u1 - u0) + 0.8, 1.6, H - 1.5, H, CREME, CREME_ESC, CREME)
  for (let k = 0; k < n; k++) {
    const uc = u0 + passo * (k + 0.5), hwA = Math.abs(passo) / 2 - 0.4
    const ar = lanceta(uc, 0, H - 3.4, hwA, 1.8, lod ? 2 : 4).slice(2)
    const h2 = Math.ceil(ar.length / 2)
    for (const dv of [0.81, -0.81]) {
      poli(g, Q, [[uc - Math.abs(passo) / 2 + 0.4, H - 1.5], [uc - Math.abs(passo) / 2 + 0.4, H - 3.4], ...ar.slice(h2).reverse()], v + dv, CREME, dv < 0)
      poli(g, Q, [[uc + Math.abs(passo) / 2 - 0.4, H - 1.5], ...ar.slice(0, h2), [uc + Math.abs(passo) / 2 - 0.4, H - 3.4]], v + dv, CREME, dv < 0)
    }
  }
  tube(g, Q.P(u0, v + 0.9, H + 0.2), Q.P(u1, v + 0.9, H + 0.2), 0.1, 0.1, 4, () => OURO, false)
  estandarte(g, GL, Q, s * 17.4, v + 0.86, H - 0.6, 1.3, 4.2)
  // muralha vermelha atrás (fecha o pátio da vista)
  cx(g, Q, (u0 + u1) / 2, v - 3, Math.abs(u1 - u0), 2, 0, H + 1.6, VERM, CREME, VERM_CL)
  bloq(c, Q, (u0 + u1) / 2, v - 1.7, Math.abs(u1 - u0) + 0.8, 4.6, H)
}

/** O CASTELO INTEIRO sobre a pegada `K` (contrato `dominio.ts`; frente para −z). */
export function casteloZephyra(c: Cena, K: CasteloPlanta, lod = 0) {
  const ang = Math.PI
  const x0 = K.porta.x, zf = K.porta.z - 1.5
  const Q = quadro(x0, zf, ang)
  const vMen = -(K.patio.z1 - zf)
  const fundo = K.z + K.d / 2 - K.patio.z1
  const patioHw = (K.patio.x1 - K.patio.x0) / 2
  portal(c, Q.P(0, 0, 0)[0], Q.P(0, 0, 0)[2], ang, lod)
  // laterais do pátio (vermelhas com cornija creme)
  for (const s of [-1, 1]) {
    const L = -vMen - 3.3, vm = -3.2 - L / 2
    const pm = Q.P(s * (patioHw + 1.5), vm, 0)
    const gg = c.geo(pm[0], pm[2])
    cx(gg, Q, s * (patioHw + 1.5), vm, 2.4, L, 0, 9, VERM, CREME, VERM_CL)
    bloq(c, Q, s * (patioHw + 1.5), vm, 2.4, L, 9)
  }
  const pM = Q.P(0, vMen, 0)
  menagem(c, pM[0], pM[2], ang, patioHw * 2 + 4, Math.max(10, fundo), lod)
  // torres gêmeas (na linha da frente da menagem, dos lados) e as asas atrás delas
  for (const s of [-1, 1]) {
    const T = Q.P(s * 11.2, -5, 0)
    torreGemea(c, T[0], T[2], ang, lod)
    const W = Q.P(s * 11.2, -7.5, 0)
    asa(c.geo(W[0], W[2]), Q, s, -7.5, lod)
  }
  // arcadas e faróis
  for (const s of [-1, 1]) {
    arcada(c, Q, s, lod)
    const F = Q.P(s * 26.7, -1, 0)
    farol(c, F[0], F[2], ang, lod)
  }
  // pináculos extras sobre a arcada
  if (!lod)
    for (const s of [-1, 1]) {
      const pp = Q.P(s * 18, -1.2, 0)
      for (const [u, h] of [[15.5, 9], [19.6, 8.6]] as const) pinaculo(c.geo(pp[0], pp[2]), c.glow(pp[0], pp[2]), Q, s * u, -1.2, h, 0.35, 2.4 + rnd(u, s) * 0.6)
    }
}
