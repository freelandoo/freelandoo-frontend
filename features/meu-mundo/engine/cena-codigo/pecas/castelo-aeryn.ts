// features/meu-mundo/engine/cena-codigo/pecas/castelo-aeryn.ts — a FORTALEZA DE BRONZE de Aeryn pela CÓPIA
// MINUCIOSA da ref `ref/dominios/castelo-aeryn.png` (inventário `MEU MUNDO 3D/pipeline/pecas-codigo/copia/
// inventario/castelo-aeryn.json`). Régua: o vão da porta (700–870 px) = 5 m → ~34 px/m; chão da porta = y 840 px.
//
// FICHA
// O que é:        fortaleza de pedra-ardósia toda armada em VIGAS DE BRONZE rebitadas, sobre um morro de rocha,
//                 com a ÁGUIA de asas abertas no alto da menagem.
// Silhueta:       a menagem afunilada no meio com a águia (cabeça a 24 m, asas de 21 m), torres de cúpula
//                 pontuda em dois andares dos lados, chaminés com fumaça, o portal largo embaixo.
// Simetria:       espelhada em u.
// Massas grandes: menagem (10,5 → 5 m de largura, coroa a 19,5 m), portal (7,6 m, frontão a 10,5), torres do
//                 2º andar (crown 14,5), torres de canto (9,4), muralha (7 m), morro (2,5 m).
// Médios:         a porta de madeira em arco com o VÃO aceso no meio e as tiras de bronze em V, o frontão em
//                 chevron com a cabeça de águia, pilones de bronze com cúpula, lanternas-coluna, braseiros,
//                 estandartes com a águia, pontes em arco, chaminés com cotovelo.
// Pequenos:       rebites em toda viga, ameias com tampa de bronze, frestas acesas, pináculos de bronze.
// Paleta:         ardósia (0,3/0,28/0,36; luz 0,44/0,42/0,52), bronze-cobre (0,86/0,5/0,24; quina 1/0,72/0,42),
//                 madeira da porta 0,62/0,32/0,18, pano 0,6/0,12/0,12, vidro âmbar aceso.
// Fora:           a ESCADARIA (o chão de andar é plano: virou a praça com os braseiros nos mesmos lugares); a
//                 PORTA fica desenhada fechada, mas é atravessável (o jogador entra no pátio do deus por ela).
// Medidas:        contrato `dominio.ts` (CasteloPlanta): frente para −z, porta = vão de 5 m, pátio aberto,
//                 menagem no fundo do pátio com o arco aceso da travessia.
// Inventado:      lados e fundo (a ref só mostra a frente).

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { arco, bloq, chamineFarol, cotovelo, cx, estandarte, lampadaHex, poli, rebite, tronco, AMB, AMB_CL, AMB_ESC } from "./fabrica"
import type { CasteloPlanta } from "../dominio"

// ── paleta (recortes do inventário; o bronze do castelo puxa para o COBRE) ──
export const ARD: RGB = [0.34, 0.31, 0.42] // ardósia ao sol
export const ARD_ESC: RGB = [0.22, 0.2, 0.28]
export const ARD_CL: RGB = [0.5, 0.47, 0.58]
export const BRZ: RGB = [0.88, 0.52, 0.25]
export const BRZ_CL: RGB = [1, 0.74, 0.44]
export const BRZ_ESC: RGB = [0.56, 0.3, 0.14]
export const PORTA: RGB = [0.64, 0.33, 0.18]
export const PORTA_ESC: RGB = [0.42, 0.2, 0.11]
export const ROCHA: RGB = [0.36, 0.33, 0.42]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>
type UV = [number, number]

/** VIGA de bronze entre dois pontos (seção quadrada `e`), faces claro/escuro, rebites a cada ~0,8 m na face `n`. */
function viga(g: G, a: V3, b: V3, e: number, lod: number, n?: V3) {
  tube(g, a, b, e * 1.08, e * 1.08, 4, (k) => (k % 2 ? BRZ : k === 0 ? BRZ_CL : mix(BRZ, BRZ_ESC, 0.35)), false)
  if (lod || !n) return
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const m = Math.max(1, Math.floor(L / 0.8))
  for (let k = 0; k < m; k++) {
    const t = (k + 0.5) / m
    rebite(g, [a[0] + (b[0] - a[0]) * t + n[0] * e * 0.5, a[1] + (b[1] - a[1]) * t + n[1] * e * 0.5, a[2] + (b[2] - a[2]) * t + n[2] * e * 0.5], n, e * 0.16, BRZ_CL)
  }
}
/** Viga no quadro: de (u0, y0) a (u1, y1) no plano v. */
const vigaQ = (g: G, Q: Q, u0: number, y0: number, u1: number, y1: number, v: number, e: number, lod: number) => viga(g, Q.P(u0, v, y0), Q.P(u1, v, y1), e, lod, Q.N(0, 1))

/** Moldura de vigas num contorno (u, y) no plano v (fechada ou não). */
function moldura(g: G, Q: Q, pts: UV[], v: number, e: number, lod: number, fechado = true) {
  const n = fechado ? pts.length : pts.length - 1
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length]
    vigaQ(g, Q, a[0], a[1], b[0], b[1], v, e, lod)
  }
}

/** Ameias com tampa de bronze num trecho de u0 a u1 (plano v, alto y). */
function ameias(g: G, Q: Q, u0: number, u1: number, v: number, y: number, d: number, lod: number) {
  const L = Math.abs(u1 - u0)
  cx(g, Q, (u0 + u1) / 2, v, L, d, y - 0.3, y, BRZ, BRZ_CL)
  if (lod) return
  const n = Math.max(1, Math.round(L / 1.1))
  const p = (u1 - u0) / n
  for (let k = 0; k < n; k++) {
    const u = u0 + p * (k + 0.5)
    cx(g, Q, u, v, Math.abs(p) * 0.55, d, y, y + 0.6, ARD, BRZ_CL)
  }
}

/** Cúpula pontuda de bronze (pirâmide de 8 faces em 2 andares + pináculo), sobre (u, v) a y, raio r. */
function cupula(g: G, Q: Q, u: number, v: number, y: number, r: number, lod: number) {
  const p = Q.P(u, v, 0)
  const n = lod ? 4 : 8
  tube(g, [p[0], y, p[2]], [p[0], y + r * 0.5, p[2]], r * 1.05, r * 0.72, n, (k) => (k % 2 ? BRZ : BRZ_CL), false)
  tube(g, [p[0], y + r * 0.5, p[2]], [p[0], y + r * 0.62, p[2]], r * 0.8, r * 0.8, n, () => BRZ_ESC, false)
  tube(g, [p[0], y + r * 0.62, p[2]], [p[0], y + r * 1.15, p[2]], r * 0.6, r * 0.2, n, (k) => (k % 2 ? BRZ : BRZ_CL), false)
  tube(g, [p[0], y + r * 1.15, p[2]], [p[0], y + r * 1.9, p[2]], r * 0.22, 0.02, lod ? 4 : 6, (k) => (k % 2 ? BRZ_CL : BRZ), true)
}

/**
 * TORRE (as de canto e as do 2º andar): corpo de ardósia com as QUINAS de viga de bronze, faixas de bronze,
 * frestas acesas, coroa com ameias, a cúpula pontuda e (opcional) o estandarte da águia na frente.
 */
export function torreBronze(c: Cena, x: number, z: number, ang: number, o: { w: number; y0?: number; h: number; band?: boolean }, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const { w, h } = o
  const y0 = o.y0 ?? 0, hw = w / 2
  tronco(g, Q, 0, 0, y0, h - 0.6, w * 1.08, w * 1.08, w, w, ARD_ESC, undefined, ARD)
  // quinas de viga
  for (const [su, sv] of [[-1, 1], [1, 1]] as const) viga(g, Q.P(su * (hw + 0.02), sv * (hw + 0.02), y0), Q.P(su * (hw - 0.02), sv * (hw - 0.02), h - 0.6), 0.32, lod, Q.N(0, 1))
  for (const yy of [y0 + 1.2, (y0 + h) / 2]) cx(g, Q, 0, 0, w + 0.24, w + 0.24, yy, yy + 0.3, BRZ, BRZ_CL)
  // frestas acesas (2 na frente, em alturas diferentes)
  if (!lod)
    for (const [u, yy] of [[-hw * 0.4, y0 + (h - y0) * 0.38], [hw * 0.4, y0 + (h - y0) * 0.62]] as const) {
      poli(GL, Q, [[u - 0.15, yy], [u + 0.15, yy], [u + 0.15, yy + 1.1], [u, yy + 1.35], [u - 0.15, yy + 1.1]], hw + 0.04, [AMB_ESC, AMB_ESC, AMB, AMB_CL, AMB])
      vigaQ(g, Q, u - 0.28, yy - 0.12, u + 0.28, yy - 0.12, hw + 0.06, 0.12, lod)
    }
  // coroa: cornija larga + ameias nos 4 lados
  cx(g, Q, 0, 0, w + 0.8, w + 0.8, h - 0.6, h, BRZ, BRZ_CL)
  for (const sv of [1, -1]) ameias(g, Q, -hw - 0.3, hw + 0.3, sv * (hw + 0.25), h + 0.3, 0.3, lod)
  if (!lod) for (const su of [-1, 1]) for (let k = 0; k < 3; k++) cx(g, Q, su * (hw + 0.25), -hw + (k + 0.5) * (w / 3), 0.3, 0.45, h, h + 0.6, ARD, BRZ_CL)
  // tambor da cúpula e a cúpula
  tronco(g, Q, 0, 0, h, h + 0.9, w * 0.7, w * 0.7, w * 0.62, w * 0.62, ARD, BRZ, ARD_CL)
  cupula(g, Q, 0, 0, h + 0.9, w * 0.48, lod)
  if (o.band) estandarte(g, GL, Q, 0, hw + 0.08, h - 1.3, w * 0.55, Math.min(4.2, (h - y0) * 0.45), "aguia")
  bloq(c, Q, 0, 0, w * 1.08, w * 1.08, h)
}

/**
 * PORTAL DE AERYN (o centro da frente): guarita de ardósia de 7,6 m com a MOLDURA de vigas em arco, a PORTA de
 * madeira dupla (tábuas, tiras de bronze em V, puxadores) com o VÃO ACESO no meio, o FRONTÃO em chevron de vigas
 * grossas com a CABEÇA DE ÁGUIA de bronze e os olhos acesos; dos lados, os PILONES de bronze com cúpula e, na
 * frente deles, os BRASEIROS. Frente em v = 0. A porta não tem colisão (o vão é a entrada do pátio).
 */
export function portalAeryn(c: Cena, x: number, z: number, ang: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const hw = 3.8, H = 9.2, D = 4
  const seg = lod ? 4 : 10
  // corpo: dois pilares de ardósia que atravessam a muralha e o lintel em cima (o vão fica livre)
  for (const s of [-1, 1]) cx(g, Q, s * (hw - 0.65), -D / 2 + 0.8, 1.3, D, 0, H, ARD_ESC, ARD_CL, ARD)
  cx(g, Q, 0, -D / 2 + 0.8, 2 * hw, D, 7.2, H, ARD_ESC, ARD_CL, ARD)
  // a porta: arco redondo, folhas de tábua, tiras em V, vão aceso
  const dHw = 2.5, dYb = 4.3
  const ar = arco(0, 0, dYb, dHw, seg)
  poli(g, Q, arco(0, 0, dYb, dHw + 1.15, seg), 0.74, BRZ)
  poli(g, Q, arco(0, 0, dYb, dHw + 0.5, seg), 0.78, BRZ_ESC)
  // placas de bronze que revestem a guarita dos dois lados da porta (até o beiral) com rebites
  for (const sd of [-1, 1]) {
    poli(g, Q, [[sd * (dHw + 1.15), 0], [sd * hw, 0], [sd * hw, 7.2], [sd * (dHw + 1.15), 7.2]], 0.72, sd < 0 ? BRZ : mix(BRZ, BRZ_ESC, 0.25))
    if (!lod) for (let k = 0; k < 5; k++) rebite(g, Q.P(sd * (hw - 0.25), 0.74, 0.8 + k * 1.5), Q.N(0, 1), 0.08, BRZ_CL)
  }
  poli(g, Q, ar, 0.82, PORTA)
  if (!lod) {
    // tábuas (faixas verticais escuras) e as tiras de bronze em V invertido em cada folha
    for (let k = 1; k < 6; k++) {
      const u = -dHw + (2 * dHw * k) / 6
      if (Math.abs(u) < 0.2) continue
      const yt = dYb + Math.sqrt(Math.max(0, dHw * dHw - u * u))
      cx(g, Q, u, 0.86, 0.06, 0.04, 0.1, yt - 0.1, PORTA_ESC)
    }
    for (const s of [-1, 1])
      for (const yy of [1.3, 3.6]) {
        vigaQ(g, Q, s * 0.25, yy + 1.1, s * (dHw - 0.35), yy - 0.2, 0.9, 0.14, lod)
        vigaQ(g, Q, s * (dHw - 0.35), yy - 0.2, s * (dHw - 0.35), yy + 1.4, 0.9, 0.12, lod)
      }
    // puxadores (aros) e o losango aceso de cada folha
    for (const s of [-1, 1]) {
      tube(g, Q.P(s * 0.6, 0.92, 2.6), Q.P(s * 0.6, 1.02, 2.6), 0.18, 0.18, 8, () => BRZ_CL, true)
      poli(GL, Q, [[s * 0.6, 3.4], [s * 0.75, 3.75], [s * 0.6, 4.1], [s * 0.45, 3.75]], 0.92, AMB_CL)
      // os V acesos (as frestas da madeira que deixam a luz passar)
      poli(GL, Q, [[s * 0.9, 4.6], [s * 1.05, 4.6], [s * 1.9, 1.6], [s * 1.75, 1.6]], 0.88, [AMB, AMB, AMB_ESC, AMB_ESC])
    }
  }
  // o VÃO aceso entre as folhas (do chão ao topo do arco)
  poli(GL, Q, [[-0.18, 0], [0.18, 0], [0.18, dYb + dHw - 0.1], [-0.18, dYb + dHw - 0.1]], 0.9, [AMB_CL, AMB_CL, AMB, AMB])
  // moldura de vigas em volta do arco (os gomos) e as duas colunas de viga
  const am = arco(0, 0, dYb, dHw + 0.35, seg).slice(2)
  for (let k = 0; k < am.length - 1; k++) vigaQ(g, Q, am[k][0], am[k][1], am[k + 1][0], am[k + 1][1], 0.95, 0.42, lod)
  for (const s of [-1, 1]) vigaQ(g, Q, s * (dHw + 0.35), 0, s * (dHw + 0.35), dYb, 0.95, 0.42, lod)
  // FRONTÃO em chevron: duas vigas grossas do beiral (u ±hw, y 7,4) ao cume (0, 10,4), e a segunda por dentro
  for (const s of [-1, 1]) {
    viga(g, Q.P(s * (hw + 0.4), 1.1, 7.2), Q.P(0, 1.1, 10.4), 0.75, lod, Q.N(0, 1))
    viga(g, Q.P(s * (hw - 0.6), 1.05, 7.4), Q.P(0, 1.05, 9.3), 0.4, lod, Q.N(0, 1))
  }
  poli(g, Q, [[-hw, 7.2], [hw, 7.2], [0, 10.2]], 0.7, ARD)
  vigaQ(g, Q, -hw - 0.3, 7.15, hw + 0.3, 7.15, 1.05, 0.5, lod)
  // a CABEÇA DE ÁGUIA do frontão (plaqueta em losango de bronze, bico para baixo, olhos acesos)
  const ey = 8.1
  poli(g, Q, [[0, ey + 1.1], [0.95, ey + 0.4], [0.7, ey - 0.6], [0, ey - 1.1], [-0.7, ey - 0.6], [-0.95, ey + 0.4]], 1.3, BRZ)
  poli(g, Q, [[0, ey + 0.8], [0.6, ey + 0.3], [0, ey - 0.2], [-0.6, ey + 0.3]], 1.35, BRZ_CL)
  poli(g, Q, [[-0.22, ey - 0.15], [0.22, ey - 0.15], [0, ey - 1]], 1.36, mix(BRZ_CL, [1, 0.9, 0.6], 0.4))
  if (!lod) for (const s of [-1, 1]) poli(GL, Q, [[s * 0.3, ey + 0.2], [s * 0.48, ey + 0.28], [s * 0.3, ey + 0.38]], 1.37, AMB_CL)
  // PILONES de bronze dos lados (u ±6,3) com a cúpula e a fresta acesa; BRASEIROS na frente
  for (const s of [-1, 1]) {
    const u = s * 6.3, w = 2.6
    tronco(g, Q, u, -0.4, 0, 9.4, w * 1.15, w * 1.15, w, w, ARD_ESC, undefined, mix(BRZ, BRZ_ESC, 0.3))
    if (!lod) poli(g, Q, [[u - w * 0.32, 1], [u + w * 0.32, 1], [u + w * 0.3, 8.6], [u - w * 0.3, 8.6]], 0.85, ARD_ESC)
    for (const su of [-1, 1]) viga(g, Q.P(u + su * w * 0.5, 0.95, 0), Q.P(u + su * w * 0.5, 0.95, 9.4), 0.36, lod, Q.N(0, 1))
    cx(g, Q, u, -0.4, w + 0.5, w + 0.5, 9.4, 9.8, BRZ, BRZ_CL)
    cupula(g, Q, u, -0.4, 9.8, 1.05, lod)
    if (!lod) {
      for (const su of [-1, 1]) cupula(g, Q, u + su * (w * 0.5 + 0.1), 0.8, 9.8, 0.3, lod)
      poli(GL, Q, [[u - 0.14, 4.2], [u + 0.14, 4.2], [u + 0.14, 6.6], [u, 6.9], [u - 0.14, 6.6]], 0.92, [AMB_ESC, AMB_ESC, AMB, AMB_CL, AMB])
    }
    bloq(c, Q, u, -0.4, w * 1.15, w * 1.15, 9.8)
    braseiro(c, Q.P(u, 3.4, 0)[0], Q.P(u, 3.4, 0)[2], ang, lod, 1.4)
  }
  for (const s of [-1, 1]) bloq(c, Q, s * (hw - 0.65), -D / 2 + 0.8, 1.3, D, H)
}

/** BRASEIRO (ref: na frente dos pilones): pedestal de ardósia com quinas de viga, a bacia de bronze e o fogo em chamas. */
export function braseiro(c: Cena, x: number, z: number, ang: number, lod = 0, esc = 1) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  tronco(g, Q, 0, 0, 0, 0.3, 1.5, 1.5, 1.35, 1.35, ARD_ESC, ARD)
  tronco(g, Q, 0, 0, 0.3, 1.5, 1.1, 1.1, 0.95, 0.95, ARD, undefined, ARD_CL)
  if (!lod) for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) viga(g, Q.P(su * 0.55, sv * 0.55, 0.3), Q.P(su * 0.48, sv * 0.48, 1.5), 0.16, lod)
  cx(g, Q, 0, 0, 1.3, 1.3, 1.5, 1.7, BRZ, BRZ_CL)
  // bacia (tronco invertido de 8 lados) e as chamas (cones acesos amarelo→laranja)
  const p = Q.P(0, 0, 0)
  tube(g, [p[0], 1.7, p[2]], [p[0], 2.2, p[2]], 0.45, 0.8, lod ? 6 : 8, (k) => (k % 2 ? BRZ : BRZ_CL), false)
  face(GL, Array.from({ length: 8 }, (_, k): V3 => [p[0] + Math.cos((k / 8) * Math.PI * 2) * 0.75, 2.15, p[2] + Math.sin((k / 8) * Math.PI * 2) * 0.75]), AMB_ESC, [0, 1, 0])
  const n = lod ? 2 : 5
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.4, d = k ? 0.38 : 0
    const bx = p[0] + Math.cos(a) * d, bz = p[2] + Math.sin(a) * d, h = k ? 0.75 + rnd(k, 7) * 0.4 : 1.35
    tube(GL, [bx, 2.1, bz], [bx, 2.1 + h * esc, bz], (k ? 0.26 : 0.38) * esc, 0.02, 5, (j) => (j % 2 ? AMB : AMB_CL), true)
  }
  c.block(x, z, 0.75, 0.75, 2)
}

/**
 * LANTERNA-COLUNA da muralha (ref: as duas grandes de cada lado): pedestal de ardósia, a lanterna hexagonal
 * GRANDE acesa entre dois aros de bronze, a tampa em cúpula e, atrás, a chaminé com fumaça.
 */
function lanternaColuna(c: Cena, x: number, z: number, lod: number) {
  const Q = quadro(x, z, 0)
  const g = c.geo(x, z)
  tronco(g, Q, 0, 0, 0, 2.3, 2.2, 2.2, 1.9, 1.9, ARD_ESC, BRZ, ARD)
  lampadaHex(c, x, 2.7, z, 1, 2.2, lod, BRZ)
  tube(g, [x, 2.7 + 2.2 * 1.16, z], [x, 2.7 + 2.2 * 1.16 + 1.1, z], 1.25, 0.25, 8, (k) => (k % 2 ? BRZ : BRZ_CL), true)
  c.block(x, z, 1.1, 1.1, 6)
}

/** ROCHA do morro (ardósia roxa, faces planas, quina clara) e a VIGA-ESCORA de bronze inclinada encostada nela. */
function rochaM(g: G, x: number, z: number, s: number, seed: number, lod: number, h0?: number) {
  const n = lod ? 5 : 6
  const h = h0 ?? s * (0.7 + rnd(seed, 2) * 0.5)
  const base: V3[] = [], top: V3[] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (rnd(seed, k, 3) - 0.5) * 0.5) / n) * Math.PI * 2
    const R = s * (0.85 + rnd(seed, k, 4) * 0.3)
    base.push([x + Math.cos(a) * R, 0, z + Math.sin(a) * R])
    top.push([x + Math.cos(a) * R * 0.55, h * (0.8 + rnd(seed, k, 5) * 0.25), z + Math.sin(a) * R * 0.55])
  }
  const ct: V3 = [x, h, z]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mz = (base[k][2] + base[j][2]) / 2 - z, mx = (base[k][0] + base[j][0]) / 2 - x
    const cor = mz < -s * 0.3 ? mix(ROCHA, ARD_CL, 0.25) : mx < 0 ? ROCHA : mul(ROCHA, 0.75)
    face(g, [base[k], base[j], top[j], top[k]], [mul(cor, 0.7), mul(cor, 0.7), cor, cor], [mx, 0.2, mz])
    face(g, [top[k], top[j], ct], mix(cor, ARD_CL, 0.3), [mx * 0.4, 1, mz * 0.4])
  }
}

/**
 * A ÁGUIA (o marco da ref): pescoço que sai da coroa da menagem, CABEÇA facetada com a crista de penas, o BICO
 * curvo e o olho aceso, e as DUAS ASAS abertas — cada uma em 5 PENAS de tábua de bronze rebitadas que se abrem
 * em leque do ombro (u ±2,8; y 18,5) até a ponta (a de cima com 10 m a 31°). Quadro da menagem; plano v.
 */
export function aguia(g: G, GL: G, Q: Q, v: number, lod: number) {
  // pescoço e peito (tronco de 6 lados que afina)
  const base = Q.P(0, v, 18.6), topo = Q.P(0, v, 21.6)
  tube(g, base, topo, 1.8, 1.25, 6, (k) => (k % 2 ? BRZ : BRZ_ESC), false)
  if (!lod)
    for (let k = 0; k < 4; k++) {
      const yy = 19 + k * 0.7
      for (const s of [-1, 1]) poli(g, Q, [[s * 0.2, yy], [s * 1.5, yy + 0.25], [s * 1.2, yy - 0.55], [s * 0.1, yy - 0.75]], v + 1.55 - k * 0.12, k % 2 ? BRZ : BRZ_CL)
    }
  // cabeça: bloco facetado (o rosto olha para +u, de perfil, como na ref) com a crista atrás
  const hy = 22.4, kh = 1.4
  const H: V3[] = [Q.P(-1.1 * kh, v, hy - 1 * kh), Q.P(0.6 * kh, v + 0.8, hy - 1.1 * kh), Q.P(1.2 * kh, v, hy - 0.3 * kh), Q.P(0.8 * kh, v, hy + 1.1 * kh), Q.P(-0.6 * kh, v, hy + 1.2 * kh), Q.P(-1.4 * kh, v, hy + 0.2 * kh), Q.P(0.6 * kh, v - 0.8, hy - 1.1 * kh)]
  const ctF = Q.P(0, v + 1.05 * kh, hy), ctB = Q.P(0, v - 1.05 * kh, hy)
  for (let k = 0; k < 6; k++) {
    const a = H[k], b = H[(k + 1) % 6]
    face(g, [a, b, ctF], k % 2 ? BRZ_CL : BRZ, Q.N(0, 1, (a[1] + b[1]) / 2 - hy))
    face(g, [a, b, ctB], BRZ_ESC, Q.N(0, -1, (a[1] + b[1]) / 2 - hy))
  }
  // crista (3 penas para trás) e o bico curvo (dois gomos que descem na ponta)
  if (!lod) for (let k = 0; k < 3; k++) poli(g, Q, [[-1 + k * 0.2, hy + 0.9 - k * 0.6], [-2.2 - k * 0.2, hy + 1.1 - k * 0.7], [-0.9 + k * 0.2, hy + 0.3 - k * 0.6]], v + 0.2, k % 2 ? BRZ : BRZ_CL)
  tube(g, Q.P(1.4, v, hy + 0.15), Q.P(3, v, hy - 0.15), 0.6, 0.4, 5, (k) => (k % 2 ? BRZ_CL : [1, 0.82, 0.5]), false)
  tube(g, Q.P(3, v, hy - 0.15), Q.P(3.4, v, hy - 1.05), 0.4, 0.04, 5, () => BRZ_CL, true)
  poli(GL, Q, [[0.5, hy + 0.5], [1.05, hy + 0.7], [0.55, hy + 0.9]], v + 1.35, AMB_CL)
  // as asas: 5 penas por lado (comprimento, ângulo acima da horizontal, largura) + a pena de cobertura do ombro
  const penas: [number, number, number][] = [[10, 31, 2.2], [8.4, 16, 2.1], [6.8, 1, 2], [5.2, -13, 1.8], [3.8, -27, 1.6]]
  for (const s of [-1, 1]) {
    const ou = s * 2.8, oy = 18.5
    penas.forEach(([L, deg, w], k) => {
      const a = (deg * Math.PI) / 180
      const du = s * Math.cos(a), dy = Math.sin(a)
      const pu = -dy * s, py = Math.cos(a) * s // perpendicular no plano (para "cima" da pena)
      const vv = v - 0.3 + k * 0.28 // as de baixo ficam por cima (na frente)
      const P = (t: number, o: number): V3 => Q.P(ou + du * L * t + pu * o * s, vv, oy + dy * L * t + py * o * s)
      // tábua com ponta: base larga, a ponta afinando, borda de cima clara
      const hw = w / 2
      const pts: V3[] = [P(0, -hw), P(0.82, -hw * 0.8), P(1, 0), P(0.82, hw * 0.8), P(0, hw)]
      face(g, pts, [BRZ, BRZ, BRZ_CL, BRZ_CL, BRZ_CL], Q.N(0, 1))
      face(g, pts, BRZ_ESC, Q.N(0, -1))
      if (!lod) {
        // espessura (borda de baixo escura) e a fileira de rebites no meio da pena
        const e = 0.18
        const A = P(0, -hw), B = P(0.82, -hw * 0.8)
        face(g, [A, B, [B[0], B[1] - e, B[2]], [A[0], A[1] - e, A[2]]], BRZ_ESC, [0, -1, 0])
        for (let q = 1; q < 6; q++) rebite(g, Q.P(ou + du * L * (q / 6.5), vv + 0.04, oy + dy * L * (q / 6.5)), Q.N(0, 1), 0.07, BRZ_CL)
        // a lista escura entre as tábuas (o veio da pena)
        const m0 = P(0.05, 0), m1 = P(0.86, 0)
        tube(g, [m0[0], m0[1], m0[2]], [m1[0], m1[1], m1[2]], 0.05, 0.05, 4, () => BRZ_ESC, false)
      }
    })
    // pena de cobertura do ombro (curta e alta)
    poli(g, Q, [[ou, oy + 0.6], [ou + s * 0.4, oy + 1.6], [ou - s * 1.2, oy + 4.6], [ou - s * 1.4, oy + 3.4]], v + 0.9, BRZ_CL)
  }
}

/**
 * MENAGEM DE AERYN: corpo baixo de 21 m que fecha o fundo do pátio (o ARCO DA TRAVESSIA aceso no meio), o corpo
 * alto AFUNILADO (10,5 → 6 m) armado em vigas, com a JANELA ALTA acesa dentro da moldura ogival de vigas, os
 * estandartes da águia, a coroa com ameias, os pináculos de bronze e a ÁGUIA em cima. (x, z) = meio da frente.
 */
export function menagemAeryn(c: Cena, x: number, z: number, ang: number, o: { w?: number; d: number }, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const W = o.w ?? 21, D = o.d
  const yT = 10
  cx(g, Q, 0, -D / 2, W, D, 0, yT, ARD_ESC, ARD, ARD)
  bloq(c, Q, 0, -D / 2, W, D, yT)
  // o arco da travessia (aceso) com a moldura de vigas
  const ar = arco(0, 0, 3.6, 2, lod ? 4 : 8)
  poli(GL, Q, ar, 0.03, ar.map(([, y]): RGB => (y < 2 ? AMB_CL : AMB)))
  moldura(g, Q, arco(0, 0, 3.6, 2.35, lod ? 4 : 8).slice(1), 0.12, 0.38, lod, false)
  // vigas do corpo baixo (pilares e travessas) e a cornija com ameias
  for (const u of [-W / 2 + 0.3, -6, -3.2, 3.2, 6, W / 2 - 0.3]) vigaQ(g, Q, u, 0, u, yT, 0.2, 0.42, lod)
  vigaQ(g, Q, -W / 2, yT - 0.4, W / 2, yT - 0.4, 0.25, 0.5, lod)
  for (const s of [-1, 1]) if (!lod) for (const u of [4.6, 8.2]) poli(GL, Q, [[s * u - 0.18, 4], [s * u + 0.18, 4], [s * u + 0.18, 6.2], [s * u, 6.5], [s * u - 0.18, 6.2]], 0.05, [AMB_ESC, AMB_ESC, AMB, AMB_CL, AMB])
  ameias(g, Q, -W / 2, W / 2, 0.1, yT + 0.3, 0.4, lod)
  // corpo alto afunilado (tronco), recuado
  const vb = -2.2, db = Math.min(9, D - 3)
  const y1 = 19.5
  tronco(g, Q, 0, vb - db / 2, yT, y1 - 0.5, 10.5, db, 6, db * 0.7, ARD_ESC, undefined, ARD)
  // vigas das quinas (inclinadas, seguindo o afunilado) e as travessas
  for (const s of [-1, 1]) {
    viga(g, Q.P(s * 5.25, vb + 0.05, yT), Q.P(s * 3, vb - (db - db * 0.7) / 2 + 0.05, y1 - 0.5), 0.6, lod, Q.N(0, 1))
    viga(g, Q.P(s * 2.6, vb + 0.1, yT), Q.P(s * 1.55, vb - (db - db * 0.7) / 4 + 0.1, y1 - 0.5), 0.36, lod, Q.N(0, 1))
  }
  const fz = (y: number) => vb - ((db - db * 0.7) / 2) * ((y - yT) / (y1 - 0.5 - yT)) + 0.12 // a frente inclinada
  const hwAt = (y: number) => 5.25 - 2.25 * ((y - yT) / (y1 - 0.5 - yT))
  for (const yy of [12.4, 15.6]) vigaQ(g, Q, -hwAt(yy), yy, hwAt(yy), yy, fz(yy), 0.4, lod)
  // a JANELA ALTA acesa (fenda larga) na moldura ogival de vigas, e o chevron embaixo
  const wy0 = 13, wy1 = 18
  poli(GL, Q, [[-0.85, wy0], [0.85, wy0], [0.85, wy1 - 0.9], [0, wy1], [-0.85, wy1 - 0.9]], fz(15.5) + 0.12, [AMB_ESC, AMB_ESC, AMB_CL, AMB_CL, AMB_CL])
  moldura(g, Q, [[-1.25, wy0 - 0.3], [-1.25, wy1 - 1], [0, wy1 + 0.6], [1.25, wy1 - 1], [1.25, wy0 - 0.3]], fz(15.5) + 0.2, 0.36, lod, false)
  for (const s of [-1, 1]) vigaQ(g, Q, s * 3.4, 11.2, 0, 12.6, fz(12) + 0.25, 0.5, lod)
  // estandartes da águia (u ±4,7) e as frestas acesas dos lados da janela
  for (const s of [-1, 1]) estandarte(g, GL, Q, s * 3.7, fz(16) + 0.2, 16.2, 1.25, 3.8, "aguia")
  // coroa: cornija + ameias e os pináculos (cúpulas finas) em volta
  cx(g, Q, 0, vb - db / 2, 6.9, db * 0.78, y1 - 0.5, y1, BRZ, BRZ_CL)
  ameias(g, Q, -3.45, 3.45, vb - db * 0.11 + 0.2, y1 + 0.3, 0.35, lod)
  if (!lod) {
    for (const s of [-1, 1]) {
      cupula(g, Q, s * 3.2, vb - db * 0.12, y1 + 0.3, 0.35, lod)
      cupula(g, Q, s * 5.4, vb + 0.2, yT + 0.6, 0.45, lod)
      cupula(g, Q, s * 7.8, -0.2, yT + 0.6, 0.38, lod)
    }
  }
  aguia(g, GL, Q, vb - db / 2 + 1.2, lod)
  // pináculos de trás (silhueta de trás não lisa)
  if (!lod) for (const s of [-1, 1]) cupula(g, Q, s * (W / 2 - 1), -D + 1, yT + 0.6, 0.5, lod)
}

/**
 * ALA (s = −1 esquerda / +1 direita): o MORRO de rocha com as VIGAS-ESCORA de bronze inclinadas, a TORRE DE CANTO
 * (u ±18) com o estandarte, a muralha da frente com ameias até o pilone, a LANTERNA-COLUNA com a chaminé, a TORRE
 * DO 2º ANDAR (crown 14,5) junto da menagem com a PONTE em arco e a chaminé de cotovelo.
 */
function alaAeryn(c: Cena, Q: Q, s: number, vMen: number, lod: number) {
  const P0 = Q.P(s * 15, -2, 0)
  const g = c.geo(P0[0], P0[2]), GL = c.glow(P0[0], P0[2])
  const yR = 2.4
  // morro (rochas baixas) e a tampa
  const rochas: [number, number, number][] = [[11.2, 5.2, 2.6], [14, 6.2, 3], [17, 5.8, 3], [19.8, 5.2, 3], [22.4, 3, 2.8], [23.6, -0.8, 2.6], [23.2, -4.8, 2.6], [13.5, 1.6, 3], [17, 1.6, 3], [20.4, 0.4, 3]]
  for (const [u, v, r] of lod ? rochas.filter((_, k) => k % 2 === 0) : rochas) {
    const p = Q.P(s * u, v, 0)
    rochaM(c.geo(p[0], p[2]), p[0], p[2], r, Math.round(u * 13 + v * 7 + (s > 0 ? 300 : 0)), lod, v > 3.5 ? undefined : yR + 0.1)
  }
  face(g, [Q.P(s * 10.8, 3, yR), Q.P(s * 22.6, 2.4, yR), Q.P(s * 22.6, vMen - 2, yR), Q.P(s * 10.8, vMen - 2, yR)], mul(ARD, 0.8), [0, 1, 0])
  // escoras de bronze inclinadas (do chão na frente até o alto do morro/muralha)
  if (!lod)
    for (const u of [10.8, 13.4, 16.2, 19, 21.6]) {
      const a = Q.P(s * u, 6.4, 0), b = Q.P(s * (u + s * 0.0), 1.6, yR + 3.2)
      viga(g, a, b, 0.55, lod, [0, 0.5, -0.5])
      cx(g, Q, s * u, 6.5, 0.9, 0.7, 0, 0.35, BRZ_ESC, BRZ)
    }
  // muralha da frente da ala (do pilone até a torre de canto), a 7 m
  const vW = -1.2
  cx(g, Q, s * 12.3, vW, 9, 2.2, yR, 7, ARD_ESC, undefined, ARD)
  for (const u of [8.6, 12.3, 15.8]) vigaQ(g, Q, s * u, yR, s * u, 7, vW + 1.15, 0.36, lod)
  vigaQ(g, Q, s * 7.8, 6.6, s * 16.8, 6.6, vW + 1.15, 0.4, lod)
  ameias(g, Q, s * 7.8, s * 16.8, vW + 0.9, 7.3, 0.35, lod)
  if (!lod) {
    // portinha em arco escura na base da muralha (a ref tem uma em cada ala)
    poli(g, Q, arco(s * 14.4, yR, yR + 1.6, 0.9, 6), vW + 1.12, ARD_ESC)
    moldura(g, Q, arco(s * 14.4, yR, yR + 1.6, 1.1, 6).slice(1), vW + 1.18, 0.22, lod, false)
  }
  bloq(c, Q, s * 12.3, vW, 9, 2.2, 7)
  // torre de canto (com estandarte) e a lanterna-coluna com a chaminé
  const T = Q.P(s * 18.2, -1, 0)
  torreBronze(c, T[0], T[2], Math.atan2(Q.fx, Q.fz), { w: 3.8, y0: 0, h: 9.4, band: true }, lod)
  const L = Q.P(s * 10.9, 1.4, 0)
  lanternaColuna(c, L[0], L[2], lod)
  const Ch = Q.P(s * 10.9, -1.4, 0)
  chamineFarol(c, Ch[0], Ch[2], 10, 0.75, lod, true)
  // torre do 2º andar junto da menagem, a ponte em arco e a chaminé de cotovelo
  const vT = vMen + 1.6
  const T2 = Q.P(s * 12.2, vT, 0)
  torreBronze(c, T2[0], T2[2], Math.atan2(Q.fx, Q.fz), { w: 3.6, y0: 0, h: 14.5 }, lod)
  {
    const um = s * 9.15, hwB = 1.25
    const pm = Q.P(um, vT, 0)
    const gp = c.geo(pm[0], pm[2])
    cx(gp, Q, um, vT, 2 * hwB + 0.2, 1.6, 11, 11.8, ARD, BRZ_CL, ARD)
    const ac = arco(um, 9, 9.6, hwB - 0.2, 5).slice(2)
    for (const dv of [0.81, -0.81]) {
      const h2 = Math.ceil(ac.length / 2)
      poli(gp, Q, [[um - hwB, 11], [um - hwB, 9], ...ac.slice(h2).reverse()], vT + dv, ARD_ESC, dv < 0)
      poli(gp, Q, [[um + hwB, 11], ...ac.slice(0, h2), [um + hwB, 9]], vT + dv, ARD_ESC, dv < 0)
    }
    ameias(gp, Q, um - hwB, um + hwB, vT + 0.65, 12.1, 0.3, lod)
  }
  const C2 = Q.P(s * 15.6, vT - 1.5, 0)
  chamineFarol(c, C2[0], C2[2], 15.5, 0.8, lod, true)
  if (!lod) {
    const m = Q.P(s * 15.6, vT + 0.6, 9), b = Q.P(s * 14.2, vT + 0.6, 9)
    cotovelo(c, Q.P(s * 15.6, vT - 1.5, 11), b, m, 0.42, lod)
  }
  bloq(c, Q, s * 16.5, 1.5, 12, 8, yR + 0.5)
  bloq(c, Q, s * 16.5, (vMen - 2 - 2.5) / 2, 12, -(vMen - 2) - 2.5, yR + 0.5)
}

/**
 * O CASTELO INTEIRO sobre a pegada `K` da planta (contrato `dominio.ts`; frente para −z). Devolve o arco da
 * travessia e o topo da águia.
 */
export function casteloAeryn(c: Cena, K: CasteloPlanta, lod = 0) {
  const ang = Math.PI
  const x0 = K.porta.x, zf = K.porta.z - 1.5
  const Q = quadro(x0, zf, ang)
  const vMen = -(K.patio.z1 - zf)
  const fundo = K.z + K.d / 2 - K.patio.z1
  const patioHw = (K.patio.x1 - K.patio.x0) / 2
  const gW = c.geo(x0, zf)
  // muralha da frente entre o portal e o pilone (curta) — o resto é das alas
  for (const s of [-1, 1]) {
    cx(gW, Q, s * 4.4, -1.5, 1.4, 3, 0, 7.4, ARD_ESC, undefined, ARD)
    bloq(c, Q, s * 4.4, -1.5, 1.4, 3, 7.4)
  }
  portalAeryn(c, Q.P(0, 0, 0)[0], Q.P(0, 0, 0)[2], ang, lod)
  // laterais do pátio
  for (const s of [-1, 1]) {
    const L = -vMen - 3.3, vm = -3.2 - L / 2
    const pm = Q.P(s * (patioHw + 1.5), vm, 0)
    const gg = c.geo(pm[0], pm[2])
    cx(gg, Q, s * (patioHw + 1.5), vm, 2.4, L, 0, 8.5, ARD_ESC, ARD)
    if (!lod) for (let k = 0; k < Math.floor(L / 4); k++) vigaQ(gg, Q, s * (patioHw + 1.5), 0, s * (patioHw + 1.5), 8.5, vm + L / 2 - 2 - k * 4, 0.3, lod)
    bloq(c, Q, s * (patioHw + 1.5), vm, 2.4, L, 8.5)
  }
  const pM = Q.P(0, vMen, 0)
  menagemAeryn(c, pM[0], pM[2], ang, { w: patioHw * 2 + 4, d: Math.max(10, fundo) }, lod)
  for (const s of [-1, 1]) alaAeryn(c, Q, s, vMen, lod)
  return { arco: Q.P(0, vMen, 3), aguia: Q.P(0, vMen - 6, 24) }
}
