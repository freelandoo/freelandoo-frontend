// features/meu-mundo/engine/cena-codigo/pecas/castelo-maru.ts — o PALÁCIO DE MARÚ pela CÓPIA MINUCIOSA da ref
// `ref/dominios/castelo-maru.png` (inventário `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/castelo-maru.json`).
// Régua: a porta de vitral (805–905 px) = 4 m → ~25 px/m; chão da porta = y 735 px; gema da cúpula y 8 px (29 m).
//
// FICHA
// O que é:        palácio de PÉROLA e gelo sobre uma ilha de rocha lilás, com lagos de água ciano acesa.
// Silhueta:       pirâmide em 4 alturas: torres pequenas (u ±21, gema a 15–19 m) → torres grandes (u ±14, 25 m)
//                 → torres-agulha do meio (21 m) → a CÚPULA DE CONCHA central (leque de vieira em pé, 29 m) com
//                 a gema no topo. Toda cobertura é concha: leque (a central) ou guarda-chuva de gomos (torres).
// Simetria:       espelhada em u (as torres da direita são um pouco mais baixas, como na ref).
// Massas grandes: frontispício do portal (12 m × 14 m), tambor da cúpula (7 m de diâmetro, 16–21 m), cúpula
//                 de concha (15 m), 4 torres redondas, 2 CONCHAS de pé na frente (8,4 m), a ilha de rocha (64 m).
// Médios:         portal em arco ogival com moldura dupla, gema em losango e a PORTA DE VITRAL ciano em leque;
//                 varandas com balaustrada, galerias de colunas acesas, janelas góticas de vitral; corais
//                 brancos na frente; cristais ciano nas pedras; balaustradas e pedestais de cristal.
// Pequenos:       gemas-losango acesas, pináculos de cristal, balaústres, frisos de pérola, pingos de luz.
// Paleta:         pérola (0,94/0,92/0,97 luz; 0,78/0,8/0,9 meio; 0,6/0,64/0,8 sombra); concha iridescente
//                 (branco → rosa 0,96/0,82/0,92 → lilás 0,84/0,82/1 → ciano 0,78/0,96/1); vitral ciano aceso
//                 (0,2/0,94/0,97 → 0,72/1/1); rocha lilás (0,76/0,72/0,86 → 0,4/0,45/0,62).
// Material:       pedra polida (pérola) + cristal/vitral aceso + água acesa.
// Fora:           a ESCADARIA (o chão de andar é plano: os degraus viraram a PRAÇA de pérola, com as
//                 balaustradas abrindo em leque e os pedestais de cristal nos mesmos lugares); a PORTA é uma
//                 cortina de vitral SEM colisão (o jogador atravessa para o pátio do deus).
// Medidas:        contrato `dominio.ts` (CasteloPlanta): frente para −z (ang = π), porta = vão de 4 m no meio
//                 do frontispício, pátio aberto atrás (18 m), o tambor da cúpula fecha o fundo do pátio com o
//                 arco aceso virado para ele.
// Inventado:      os lados e o fundo (a ref só mostra a frente): muros de pérola com balaustrada e janelas.
//
// A frente olha para −z e fica na CONTRALUZ do sol do jogo: vitral, gemas e água vão no glow; a pérola
// tem albedo alto para não virar cinza na sombra.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { lanceta, prisma, vitral } from "./castelo-iris"
import type { CasteloPlanta } from "../dominio"
import { coral, cristalGelo, CORAL_B, CORAL_B_ESC, leque, PEROLA } from "./gelo"

// albedo acima de 1: a frente fica na contraluz do sol do jogo e a pérola da ref é QUASE BRANCA mesmo assim
export const PER: RGB = [1.24, 1.21, 1.3]
export const PER_MEIO: RGB = [1.06, 1.07, 1.22]
export const PER_SOMBRA: RGB = [0.88, 0.92, 1.14]
export const PER_CL: RGB = [1.3, 1.3, 1.34]
export const CREME: RGB = [1.28, 1.22, 1.14]
export const VIT: RGB = [0.2, 0.92, 0.97]
export const VIT_CL: RGB = [0.75, 1, 1]
export const VIT_ESC: RGB = [0.04, 0.5, 0.7]
export const ROCHA_L: RGB = [1.14, 1.08, 1.3]
export const ROCHA_M: RGB = [1.04, 1.0, 1.28]
export const ROCHA_E: RGB = [0.9, 0.9, 1.22]
export const AGUA: RGB = [0.3, 0.94, 1]
export const AGUA_ESC: RGB = [0.04, 0.58, 0.84]
const GEMA: RGB[] = [[0.3, 0.95, 1], [0.72, 1, 1], [0.08, 0.66, 0.92], [0.46, 0.98, 1]]
const IRIS: RGB[] = [[1.24, 1.2, 1.3], [1.26, 0.86, 1.12], [0.98, 0.9, 1.34], [0.8, 1.14, 1.32], [1.28, 1.0, 1.04], [1.06, 0.94, 1.32]]
/** Ouro-rosé dos remates (a ref tem agulha e colar dourados nas cúpulas). */
const OURO_R: RGB = [1.2, 0.92, 0.6]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>
type UV = [number, number]

const SUN: V3 = (() => { const l = Math.hypot(0.55, 1, 0.35); return [0.55 / l, 1 / l, 0.35 / l] })()
const tomN = (n: V3, a: RGB, b: RGB, c: RGB): RGB => { const d = n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]; return d > 0.5 ? a : d > 0.05 ? b : c }

// ═══════════════ ferramentas do quadro ═══════════════

/** Tronco de 4 lados alinhado ao quadro (base w0×d0 → topo w1×d1), tampa; frente (+v) mais clara. */
function tronco(g: G, Q: Q, u: number, v: number, y0: number, y1: number, w0: number, d0: number, w1: number, d1: number, side: RGB, top?: RGB, frente?: RGB) {
  const c0: V3[] = [Q.P(u - w0 / 2, v + d0 / 2, y0), Q.P(u + w0 / 2, v + d0 / 2, y0), Q.P(u + w0 / 2, v - d0 / 2, y0), Q.P(u - w0 / 2, v - d0 / 2, y0)]
  const c1: V3[] = [Q.P(u - w1 / 2, v + d1 / 2, y1), Q.P(u + w1 / 2, v + d1 / 2, y1), Q.P(u + w1 / 2, v - d1 / 2, y1), Q.P(u - w1 / 2, v - d1 / 2, y1)]
  const ns: V3[] = [Q.N(0, 1), Q.N(1, 0), Q.N(0, -1), Q.N(-1, 0)]
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    const cor = k === 0 ? (frente ?? side) : k === 2 ? mul(side, 0.85) : side
    face(g, [c0[k], c0[j], c1[j], c1[k]], [mul(cor, 0.85), mul(cor, 0.85), cor, cor], ns[k])
  }
  if (top) face(g, c1, top, [0, 1, 0])
}
const cx = (g: G, Q: Q, u: number, v: number, w: number, d: number, y0: number, y1: number, side: RGB, top?: RGB, frente?: RGB) => tronco(g, Q, u, v, y0, y1, w, d, w, d, side, top ?? PER_CL, frente)
function bloq(c: Cena, Q: Q, u: number, v: number, w: number, d: number, h: number) {
  const p = Q.P(u, v, 0)
  c.block(p[0], p[2], w / 2, d / 2, h, Q.rot)
}
/** Polígono (u, y) de pé no plano v, virado para fora (+v). */
function poli(g: G, Q: Q, pts: UV[], v: number, cor: RGB | RGB[], dentro = false) {
  face(g, pts.map(([u, y]) => Q.P(u, v, y)), cor, Q.N(0, dentro ? -1 : 1))
}
/** Moldura em fio (contorno u, y) no plano v. */
function fio(g: G, Q: Q, pts: UV[], v: number, r: number, cor: RGB, fechado = false) {
  const n = fechado ? pts.length : pts.length - 1
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length]
    tube(g, Q.P(a[0], v, a[1]), Q.P(b[0], v, b[1]), r, r, 4, (j) => (j % 2 ? cor : mul(cor, 0.82)), false)
  }
}
/** Faixa (anel) de lanceta: a moldura grossa entre o contorno de fora e o de dentro, em quads. */
function moldura(g: G, Q: Q, fora: UV[], dentro: UV[], v: number, cor: RGB, esc: RGB) {
  const n = Math.min(fora.length, dentro.length)
  for (let k = 0; k < n - 1; k++) {
    face(g, [Q.P(fora[k][0], v, fora[k][1]), Q.P(fora[k + 1][0], v, fora[k + 1][1]), Q.P(dentro[k + 1][0], v, dentro[k + 1][1]), Q.P(dentro[k][0], v, dentro[k][1])], [cor, cor, mix(cor, esc, 0.5), mix(cor, esc, 0.5)], Q.N(0, 1))
  }
}

/** GEMA em losango acesa (bipirâmide alongada). */
export function gema(GL: G, p: V3, s: number, lod: number) {
  const n = lod ? 4 : 6
  const r = s * 0.32, top: V3 = [p[0], p[1] + s, p[2]], bot: V3 = [p[0], p[1] - s * 0.55, p[2]]
  const ring = Array.from({ length: n }, (_, k): V3 => [p[0] + Math.cos((k / n) * Math.PI * 2 + 0.3) * r, p[1], p[2] + Math.sin((k / n) * Math.PI * 2 + 0.3) * r])
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n, a = ((k + 0.5) / n) * Math.PI * 2 + 0.3
    const cc = GEMA[k % GEMA.length]
    face(GL, [ring[k], ring[j], top], [cc, cc, VIT_CL], [Math.cos(a), 0.5, Math.sin(a)])
    face(GL, [ring[k], ring[j], bot], [mul(cc, 0.9), mul(cc, 0.9), VIT_ESC], [Math.cos(a), -0.5, Math.sin(a)])
  }
}
/** Losango aceso NA FACE (plano v): moldura de pérola + 4 facetas. */
function losango(g: G, GL: G, Q: Q, u: number, y: number, h: number, v: number) {
  const w = h * 0.6
  poli(g, Q, [[u, y - h - 0.25], [u + w + 0.22, y], [u, y + h + 0.25], [u - w - 0.22, y]], v, CREME)
  const c0 = Q.P(u, v + 0.12, y)
  const P4: V3[] = [Q.P(u, v + 0.05, y - h), Q.P(u + w, v + 0.05, y), Q.P(u, v + 0.05, y + h), Q.P(u - w, v + 0.05, y)]
  const tons: RGB[] = [VIT_ESC, VIT, VIT_CL, mix(VIT, VIT_CL, 0.4)]
  for (let k = 0; k < 4; k++) face(GL, [P4[k], P4[(k + 1) % 4], c0], [tons[k], tons[(k + 1) % 4], VIT_CL], Q.N(0, 1))
}

/**
 * CÚPULA EM GOMOS (guarda-chuva de concha das torres): 2n azimutes alternando crista e vale, aba que pende
 * em ondas, perfil abaulado, cores de pérola iridescente gomo a gomo; agulha + gema no topo.
 */
export function cupulaGomos(g: G, GL: G, c: V3, r: number, h: number, n: number, lod: number, gemaS = 0.9) {
  const N = (lod ? Math.ceil(n * 0.6) : n) * 2
  const aneis: [number, number, number][] = [[1.16, -0.34, 0.1], [1.02, 0.08, 0.08], [0.8, 0.48, 0.06], [0.42, 0.82, 0.03]]
  const V = aneis.map(([rr, yy, onda]) => Array.from({ length: N }, (_, k): V3 => {
    const a = (k / N) * Math.PI * 2
    const crista = k % 2 === 0
    const R = r * rr * (crista ? 1 : 0.88)
    return [c[0] + Math.cos(a) * R, c[1] + h * yy + (crista ? 0 : -h * onda), c[2] + Math.sin(a) * R]
  }))
  const topo: V3 = [c[0], c[1] + h, c[2]]
  for (let j = 0; j < aneis.length; j++)
    for (let k = 0; k < N; k++) {
      const i = (k + 1) % N
      const gomo = Math.floor(k / 2)
      const cor = IRIS[gomo % IRIS.length]
      const a = ((k + 0.5) / N) * Math.PI * 2
      const nn: V3 = [Math.cos(a), 0.3 + j * 0.35, Math.sin(a)]
      const lum = k % 2 === 0 ? 1 : 0.88
      const A = V[j][k], B = V[j][i]
      const C = j + 1 < aneis.length ? V[j + 1][i] : topo, D = j + 1 < aneis.length ? V[j + 1][k] : topo
      const cc = mul(tomN(nn, cor, cor, mix(cor, PER_SOMBRA, 0.2)), lum)
      if (j + 1 < aneis.length) face(g, [A, B, C, D], [mul(cc, 0.88), mul(cc, 0.88), cc, cc], nn)
      else face(g, [A, B, topo], [cc, cc, mix(cc, PER_CL, 0.4)], nn)
    }
  // por baixo da aba (sombra funda)
  face(g, V[0].slice().reverse(), PER_SOMBRA, [0, -1, 0])
  // agulha e gema
  tube(g, topo, [topo[0], topo[1] + h * 0.35, topo[2]], r * 0.14, r * 0.05, lod ? 4 : 6, (k) => (k % 2 ? OURO_R : mul(OURO_R, 0.85)), false)
  if (!lod) tube(g, [topo[0], topo[1] + h * 0.18, topo[2]], [topo[0], topo[1] + h * 0.24, topo[2]], r * 0.22, r * 0.18, 8, () => OURO_R, false)
  // aba de baixo com o friso dourado (a ref)
  if (!lod) for (let k = 0; k < N; k += 2) {
    const a = V[0][k], b = V[0][(k + 2) % N]
    tube(g, a, b, r * 0.035, r * 0.035, 4, () => OURO_R, false)
  }
  gema(GL, [topo[0], topo[1] + h * 0.35 + gemaS * 0.55, topo[2]], gemaS, lod)
}

/** Balaustrada reta no quadro, de (u0,v0) a (u1,v1) na altura y: corrimão + balaústres. */
function balaustrada(g: G, Q: Q, u0: number, v0: number, u1: number, v1: number, y: number, lod: number, h = 1.0) {
  const L = Math.hypot(u1 - u0, v1 - v0)
  const n = lod ? 0 : Math.max(2, Math.round(L / 0.45))
  for (let k = 0; k <= n; k++) {
    const t = n ? k / n : 0
    const u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t
    tube(g, Q.P(u, v, y), Q.P(u, v, y + h * 0.85), 0.09, 0.07, 4, (j) => (j % 2 ? PER : PER_MEIO), false)
  }
  tube(g, Q.P(u0, v0, y + h * 0.85), Q.P(u1, v1, y + h * 0.85), 0.16, 0.16, 4, (j) => (j % 2 ? PER_CL : PER_MEIO), false)
  tube(g, Q.P(u0, v0, y + 0.08), Q.P(u1, v1, y + 0.08), 0.13, 0.13, 4, () => PER_MEIO, false)
}

/** Anel de balaustrada (varanda redonda) de raio r em volta de (u, v). */
function varandaRedonda(g: G, Q: Q, u: number, v: number, y: number, r: number, lod: number) {
  const n = lod ? 8 : 14
  // laje da varanda (anel) e o friso
  const pt = (k: number, rr: number, yy: number) => { const a = (k / n) * Math.PI * 2; return Q.P(u + Math.cos(a) * rr, v + Math.sin(a) * rr, yy) }
  for (let k = 0; k < n; k++) {
    face(g, [pt(k, r, y), pt(k + 1, r, y), pt(k + 1, r, y - 0.45), pt(k, r, y - 0.45)], CREME, Q.N(Math.cos(((k + 0.5) / n) * Math.PI * 2), Math.sin(((k + 0.5) / n) * Math.PI * 2)))
    face(g, [pt(k, r, y - 0.45), pt(k + 1, r, y - 0.45), pt(k + 1, r * 0.8, y - 0.9), pt(k, r * 0.8, y - 0.9)], PER_MEIO, Q.N(Math.cos(((k + 0.5) / n) * Math.PI * 2), Math.sin(((k + 0.5) / n) * Math.PI * 2), -0.6))
  }
  face(g, Array.from({ length: n }, (_, k) => pt(k, r, y)), PER, [0, 1, 0])
  if (!lod) for (let k = 0; k < n * 2; k++) { const p = pt(k / 2, r - 0.15, y); tube(g, p, [p[0], p[1] + 0.85, p[2]], 0.09, 0.07, 4, (j) => (j % 2 ? PER : PER_MEIO), false) }
  for (let k = 0; k < n; k++) tube(g, pt(k, r - 0.15, y + 0.88), pt(k + 1, r - 0.15, y + 0.88), 0.15, 0.15, 4, (j) => (j % 2 ? PER_CL : PER_MEIO), false)
}

/** Cilindro de pérola de n lados com frente mais clara (tom pelo sol, mas a frente nunca escura). */
function cilindro(g: G, Q: Q, u: number, v: number, y0: number, y1: number, r0: number, r1: number, n: number, cor = PER) {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2
    const nn = Q.N(Math.cos(am), Math.sin(am))
    const frente = Math.sin(am) > 0.3
    const cc = frente ? mix(cor, PER_CL, 0.1) : tomN(nn, cor, PER_MEIO, PER_SOMBRA)
    face(g, [Q.P(u + Math.cos(a0) * r0, v + Math.sin(a0) * r0, y0), Q.P(u + Math.cos(a1) * r0, v + Math.sin(a1) * r0, y0), Q.P(u + Math.cos(a1) * r1, v + Math.sin(a1) * r1, y1), Q.P(u + Math.cos(a0) * r1, v + Math.sin(a0) * r1, y1)], [mul(cc, 0.88), mul(cc, 0.88), cc, cc], nn)
  }
}

/** Janela gótica de vitral ciano no lado (+v) de um cilindro/parede, centro u, de y0, meia largura hw. */
function janelaGotica(g: G, GL: G, Q: Q, u: number, v: number, y0: number, hw: number, h: number, lod: number, seed: number) {
  const seg = lod ? 3 : 5
  const yb = y0 + h * 0.62, hp = h * 0.38
  const fora = lanceta(u, y0 - 0.2, yb, hw + 0.3, hp + 0.35, seg)
  poli(g, Q, fora, v, CREME)
  const dentro = lanceta(u, y0, yb, hw, hp, seg)
  vitral(GL, Q, dentro, [u, y0 + h * 0.45], v + 0.04, (y) => mix(VIT, VIT_CL, Math.max(0, Math.min(1, (y - y0) / h)) * 0.6), lod, seed)
  if (!lod) {
    // montante do meio e o Y do rendilhado
    tube(g, Q.P(u, v + 0.08, y0), Q.P(u, v + 0.08, yb), 0.05, 0.05, 4, () => CREME, false)
    tube(g, Q.P(u, v + 0.08, yb), Q.P(u - hw * 0.6, v + 0.08, yb + hp * 0.6), 0.05, 0.05, 4, () => CREME, false)
    tube(g, Q.P(u, v + 0.08, yb), Q.P(u + hw * 0.6, v + 0.08, yb + hp * 0.6), 0.05, 0.05, 4, () => CREME, false)
  }
}

/**
 * TORRE DE MARÚ (inventário `torre-maru`): corpo redondo de pérola sobre a rocha, friso, janelas góticas de
 * vitral, VARANDA com balaustrada, GALERIA de colunas com o miolo aceso, CÚPULA EM GOMOS com agulha e gema.
 * (u, v) no quadro; y0 = pé (em cima da rocha); hc = altura do corpo até a varanda; r = raio.
 */
export function torreMaru(c: Cena, Q: Q, u: number, v: number, o: { r: number; y0: number; hc: number; hg: number; capR: number; capH: number; janelas?: number; gemaS?: number; seed?: number }, lod = 0) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  const n = lod ? 8 : 12
  const { r, y0, hc, hg } = o
  cilindro(g, Q, u, v, y0 - 0.5, y0 + 0.8, r * 1.18, r * 1.1, n, PER_MEIO)
  cilindro(g, Q, u, v, y0 + 0.8, y0 + hc, r * 1.05, r, n)
  // frisos
  if (!lod) for (const yy of [y0 + 0.8, y0 + hc * 0.5]) cilindro(g, Q, u, v, yy, yy + 0.3, r * 1.08, r * 1.08, n, CREME)
  // janelas góticas (de frente)
  const nj = o.janelas ?? 1
  for (let k = 0; k < nj; k++) {
    const du = nj === 1 ? 0 : (k - (nj - 1) / 2) * r * 0.8
    janelaGotica(g, GL, Q, u + du, v + Math.sqrt(Math.max(0.01, r * r - du * du)) + 0.05, y0 + hc * 0.56, r * 0.26, hc * 0.36, lod, (o.seed ?? 1) + k)
  }
  // arcos abertos embaixo (na ref: 2 arcos azuis na base das torres pequenas) — cego, aceso fraco
  if (!lod && hc > 6) {
    const arc = lanceta(u, y0 + 1, y0 + hc * 0.25, r * 0.4, r * 0.35, 4)
    poli(g, Q, lanceta(u, y0 + 0.8, y0 + hc * 0.25, r * 0.52, r * 0.45, 4), v + r + 0.04, CREME)
    poli(GL, Q, arc, v + r + 0.08, arc.map(([, y]): RGB => (y > y0 + hc * 0.25 ? VIT_CL : VIT)))
  }
  // varanda
  const yv = y0 + hc
  varandaRedonda(g, Q, u, v, yv, r * 1.38, lod)
  // galeria: miolo aceso + colunas
  cilindro(GL, Q, u, v, yv, yv + hg, r * 0.82, r * 0.82, n, VIT)
  const nc = lod ? 4 : 8
  for (let k = 0; k < nc; k++) {
    const a = (k / nc) * Math.PI * 2 + Math.PI / nc
    tube(g, Q.P(u + Math.cos(a) * r * 0.98, v + Math.sin(a) * r * 0.98, yv), Q.P(u + Math.cos(a) * r * 0.98, v + Math.sin(a) * r * 0.98, yv + hg), 0.22, 0.2, 6, (j) => (j % 2 ? PER : PER_CL), false)
  }
  if (!lod) {
    // arcos de lanceta entre as colunas (a frente): vitral
    janelaGotica(g, GL, Q, u, v + r * 0.84, yv + 0.3, r * 0.3, hg * 0.85, lod, (o.seed ?? 1) + 9)
  }
  cilindro(g, Q, u, v, yv + hg, yv + hg + 0.5, r * 1.12, r * 1.12, n, CREME)
  cupulaGomos(g, GL, Q.P(u, v, yv + hg + 0.4), o.capR, o.capH, 7, lod, o.gemaS ?? 0.9)
  bloq(c, Q, u, v, r * 2, r * 2, yv + hg)
}

/** Agulha de pérola (as torres finas do meio): fuste octogonal + capuz cônico de gomos + gema. */
function agulha(c: Cena, Q: Q, u: number, v: number, y0: number, h: number, r: number, lod: number) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  cilindro(g, Q, u, v, y0, y0 + h, r, r * 0.92, lod ? 6 : 8)
  if (!lod) janelaGotica(g, GL, Q, u, v + r * 0.95, y0 + h * 0.45, r * 0.4, h * 0.38, lod, 3)
  cilindro(g, Q, u, v, y0 + h, y0 + h + 0.35, r * 1.3, r * 1.3, lod ? 6 : 8, CREME)
  const ap = Q.P(u, v, y0 + h + r * 3.2)
  const n = lod ? 6 : 8
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
    const cor = IRIS[k % IRIS.length]
    face(g, [Q.P(u + Math.cos(a0) * r * 1.4, v + Math.sin(a0) * r * 1.4, y0 + h + 0.35), Q.P(u + Math.cos(a1) * r * 1.4, v + Math.sin(a1) * r * 1.4, y0 + h + 0.35), ap], [cor, cor, PER_CL], Q.N(Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0.4))
  }
  gema(GL, [ap[0], ap[1] + 0.8, ap[2]], 0.75, lod)
}

/** ROCHA LILÁS facetada da ilha (prisma de 6–7 faces com topo inclinado), com lasca de cristal às vezes. */
function rochaIlha(c: Cena, Q: Q, u: number, v: number, s: number, h: number, seed: number, lod: number) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2])
  const n = lod ? 5 : 7
  const base: V3[] = [], top: V3[] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (rnd(seed, k) - 0.5) * 0.5) / n) * Math.PI * 2
    const R = s * (0.8 + rnd(seed, k, 2) * 0.35)
    base.push(Q.P(u + Math.cos(a) * R, v + Math.sin(a) * R, -0.2))
    top.push(Q.P(u + Math.cos(a) * R * 0.62, v + Math.sin(a) * R * 0.62, h * (0.8 + rnd(seed, k, 3) * 0.3)))
  }
  const ct = Q.P(u + (rnd(seed, 9) - 0.5) * s * 0.3, v, h * 1.05)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const m: V3 = [(base[k][0] + base[j][0]) / 2 - p[0], 0, (base[k][2] + base[j][2]) / 2 - p[2]]
    const ux = base[j][0] - base[k][0], uz = base[j][2] - base[k][2], vx = top[k][0] - base[k][0], vy = top[k][1] - base[k][1], vz = top[k][2] - base[k][2]
    let nn: V3 = [-(uz * vy), uz * vx - ux * vz, ux * vy]
    if (nn[0] * m[0] + nn[2] * m[2] < 0) nn = [-nn[0], -nn[1], -nn[2]]
    const L = Math.hypot(...nn) || 1
    nn = [nn[0] / L, nn[1] / L, nn[2] / L]
    // a ref pinta a rocha CLARA mesmo na sombra (lilás-pastel)
    const cc = tomN(nn, ROCHA_L, ROCHA_M, ROCHA_E)
    face(g, [base[k], base[j], top[j], top[k]], [mul(cc, 0.85), mul(cc, 0.85), cc, cc], m)
    face(g, [top[k], top[j], ct], [mix(cc, ROCHA_L, 0.5), mix(cc, ROCHA_L, 0.5), ROCHA_L], [0, 1, 0])
  }
}

/** LAGO aceso com borda de pérola: polígono (u, v) no chão. */
function lago(c: Cena, Q: Q, pts: UV[], lod: number) {
  const ctr: UV = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  const p0 = Q.P(ctr[0], ctr[1], 0)
  const g = c.geo(p0[0], p0[2]), GL = c.glow(p0[0], p0[2])
  const n = pts.length
  const C = Q.P(ctr[0], ctr[1], 0.12)
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % n]
    face(GL, [C, Q.P(a[0], a[1], 0.1), Q.P(b[0], b[1], 0.1)], [AGUA, AGUA_ESC, AGUA_ESC], [0, 1, 0])
    // borda de pérola: mureta baixa por fora
    const da = [a[0] - ctr[0], a[1] - ctr[1]], db = [b[0] - ctr[0], b[1] - ctr[1]]
    const la = Math.hypot(da[0], da[1]) || 1, lb = Math.hypot(db[0], db[1]) || 1
    const A2: UV = [a[0] + (da[0] / la) * 0.7, a[1] + (da[1] / la) * 0.7], B2: UV = [b[0] + (db[0] / lb) * 0.7, b[1] + (db[1] / lb) * 0.7]
    face(g, [Q.P(a[0], a[1], 0.45), Q.P(b[0], b[1], 0.45), Q.P(B2[0], B2[1], 0.45), Q.P(A2[0], A2[1], 0.45)], CREME, [0, 1, 0])
    face(g, [Q.P(a[0], a[1], 0), Q.P(b[0], b[1], 0), Q.P(b[0], b[1], 0.45), Q.P(a[0], a[1], 0.45)], PER_MEIO, Q.N(-(da[0] + db[0]), -(da[1] + db[1])))
    face(g, [Q.P(A2[0], A2[1], -0.1), Q.P(B2[0], B2[1], -0.1), Q.P(B2[0], B2[1], 0.45), Q.P(A2[0], A2[1], 0.45)], PER, Q.N(da[0] + db[0], da[1] + db[1]))
  }
  void lod
}

/** CONCHA DE PÉ (inventário `conchas-maru`): leque de vieira em pé, aberto para a frente (+v), 13 costelas. */
function conchaPe(c: Cena, Q: Q, u: number, v: number, y: number, r: number, lod: number) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2])
  const o = Q.P(u, v, y)
  // levemente deitada para trás (a ref: o leque olha para a frente e um pouco para cima)
  const t = 0.22
  const e2: V3 = [Q.N(0, -1)[0] * Math.sin(t), Math.cos(t), Q.N(0, -1)[2] * Math.sin(t)]
  const n: V3 = [Q.N(0, 1)[0] * Math.cos(t), Math.sin(t), Q.N(0, 1)[2] * Math.cos(t)]
  leque(g, o, Q.N(1, 0), e2, n, r, 13, lod, 1.0, IRIS, 0.3)
  leque(g, o, Q.N(1, 0), e2, [-n[0], -n[1], -n[2]], r * 0.98, 13, lod, 1.0, IRIS.map((q) => mul(q, 0.9)), 0.18)
  // pé (charneira) e orelhas
  tronco(g, Q, u, v, 0, y + 0.3, r * 0.35, r * 0.3, r * 0.22, r * 0.2, PER_MEIO, PER)
  bloq(c, Q, u, v, r * 1.6, r * 0.6, r)
}

/**
 * PORTAL DE MARÚ (inventário `portal-maru`): frontispício de pérola de 12 m com o ARCO OGIVAL de moldura dupla
 * até 13 m, empena com a GEMA em losango, a PORTA de vitral ciano (lanceta 4 × 7 m) com o LEQUE de vidro
 * aceso em cima, pilastras com pináculos de cristal. A porta é cortina sem colisão.
 */
function portalMaru(c: Cena, Q: Q, lod: number) {
  const g = c.geo(Q.P(0, 0, 0)[0], Q.P(0, 0, 0)[2]), GL = c.glow(Q.P(0, 0, 0)[0], Q.P(0, 0, 0)[2])
  const seg = lod ? 4 : 8
  // corpo do frontispício (dois lados da porta) — a empena por cima
  for (const s of [-1, 1]) {
    cx(g, Q, s * 4.25, -1.6, 4.5, 4.4, 0, 9.6, PER, PER_CL, mix(PER, PER_CL, 0.2))
    bloq(c, Q, s * 4.25, -1.6, 4.5, 4.4, 10)
    // pilastras com capitel e pináculo de cristal
    cx(g, Q, s * 5.6, 0.75, 0.9, 0.5, 0, 10.6, CREME, PER_CL)
    cx(g, Q, s * 5.6, 0.75, 1.2, 0.7, 10.4, 10.9, PER_MEIO, PER_CL)
    const pp = Q.P(s * 5.6, 0.8, 11.5)
    gema(GL, pp, 0.85, lod)
  }
  cx(g, Q, 0, -1.6, 4, 4.4, 9.6, 10.2, PER, PER_CL)
  // empena: triângulo curvo de pérola com a gema
  const emp: UV[] = []
  const nE = lod ? 4 : 8
  for (let k = 0; k <= nE; k++) { const t = k / nE; const uu = -6.4 + 12.8 * t; emp.push([uu, 9.4 + 4.6 * Math.pow(1 - Math.abs(2 * t - 1), 0.8)]) }
  face(g, [Q.P(0, 0.5, 9.4), ...emp.map(([uu, yy]) => Q.P(uu, 0.5, yy))], [PER, ...emp.map(() => mix(PER, PER_MEIO, 0.3))], Q.N(0, 1))
  // telhado da empena (2 águas para trás)
  for (const s of [-1, 1]) {
    const pts: V3[] = [Q.P(0, 0.6, 14.1), Q.P(s * 6.5, 0.6, 9.3), Q.P(s * 6.5, -3.9, 9.3), Q.P(0, -3.9, 14.1)]
    face(g, pts, [PER_CL, PER_MEIO, PER_MEIO, PER_CL], Q.N(s, 0, 1.2))
  }
  if (!lod) fio(g, Q, emp, 0.62, 0.2, CREME)
  losango(g, GL, Q, 0, 12.2, 1.05, 0.6)
  // arco ogival: moldura de fora (lanceta 4,6 × até 12) e a de dentro (3,6), recesso, porta e leque
  const out1 = lanceta(0, 0, 6.6, 4.5, 5.2, seg), in1 = lanceta(0, 0, 6.6, 3.7, 4.4, seg)
  // a moldura é desenhada como faixa: só os arcos (do índice 2 em diante)
  moldura(GL, Q, out1.slice(2), in1.slice(2), 0.9, [0.98, 0.94, 1], [0.84, 0.8, 1])
  for (const s of [-1, 1]) cx(g, Q, s * 4.1, 0.65, 0.8, 0.5, 0, 6.6, PER_CL, CREME)
  const in2 = lanceta(0, 0, 6.6, 3.1, 3.9, seg)
  moldura(GL, Q, in1.slice(2), in2.slice(2), 0.8, [0.92, 0.78, 0.96], [0.72, 0.7, 0.98])
  for (const s of [-1, 1]) cx(g, Q, s * 3.4, 0.55, 0.6, 0.5, 0, 6.6, mix(PER, VIT, 0.1))
  // fundo do recesso: vitral ciano em leque (o vidro em cima da porta)
  poli(GL, Q, in2, 0.63, [VIT, VIT, ...in2.slice(2).map((): RGB => mix(VIT, VIT_CL, 0.35))])
  // o leque de PÉTALAS da ref: 7 pétalas de ponta redonda que se abrem do alto da porta, cada uma em 2 tons
  // (claro no meio, ciano na borda), com o contorno de pérola
  const nL = lod ? 5 : 7
  const cl: V3 = Q.P(0, 0.68, 5.6)
  for (let k = 0; k < nL; k++) {
    const a0 = Math.PI * (0.04 + 0.92 * (k / nL)), a1 = Math.PI * (0.04 + 0.92 * ((k + 1) / nL)), am = (a0 + a1) / 2
    const R = 3.0, RY = 1.45
    const A = Q.P(Math.cos(a0) * R * 0.92, 0.68, 5.6 + Math.sin(a0) * R * RY * 0.92), B = Q.P(Math.cos(a1) * R * 0.92, 0.68, 5.6 + Math.sin(a1) * R * RY * 0.92)
    const T = Q.P(Math.cos(am) * R * 1.05, 0.68, 5.6 + Math.sin(am) * R * RY * 1.05)
    const M = Q.P(Math.cos(am) * R * 0.55, 0.7, 5.6 + Math.sin(am) * R * RY * 0.55)
    face(GL, [cl, A, M], [VIT_CL, VIT, mix(VIT, VIT_CL, 0.6)], Q.N(0, 1))
    face(GL, [cl, M, B], [VIT_CL, mix(VIT, VIT_CL, 0.6), VIT], Q.N(0, 1))
    face(GL, [M, A, T, B], [mix(VIT, VIT_CL, 0.5), mix(VIT, VIT_ESC, 0.3), VIT, mix(VIT, VIT_ESC, 0.3)], Q.N(0, 1))
    if (!lod) {
      fio(g, Q, [[Math.cos(a0) * R * 0.92, 5.6 + Math.sin(a0) * R * RY * 0.92], [Math.cos(am) * R * 1.05, 5.6 + Math.sin(am) * R * RY * 1.05], [Math.cos(a1) * R * 0.92, 5.6 + Math.sin(a1) * R * RY * 0.92]], 0.74, 0.07, PER_CL)
      fio(g, Q, [[0, 5.6], [Math.cos(a1) * R * 0.92, 5.6 + Math.sin(a1) * R * RY * 0.92]], 0.74, 0.05, PER_CL)
    }
  }
  // a PORTA: lanceta de vitral (cortina acesa, sem colisão) com moldura de pérola e rendilhado
  const door = lanceta(0, 0, 4.6, 2.0, 2.6, seg)
  const doorF = lanceta(0, -0.05, 4.6, 2.35, 2.95, seg)
  moldura(g, Q, doorF.slice(2), door.slice(2), 0.82, PER_CL, PER_MEIO)
  for (const s of [-1, 1]) cx(g, Q, s * 2.17, 0.72, 0.36, 0.3, 0, 4.6, PER_CL)
  vitral(GL, Q, door, [0, 2.6], 0.76, (y) => mix(mix(VIT, VIT_CL, 0.35), VIT_CL, Math.min(1, y / 7) * 0.7), lod, 5)
  if (!lod) {
    fio(g, Q, [[0, 0], [0, 7.2]], 0.86, 0.07, CREME)
    fio(g, Q, [[0, 4.4], [-1.4, 6.2]], 0.86, 0.06, CREME)
    fio(g, Q, [[0, 4.4], [1.4, 6.2]], 0.86, 0.06, CREME)
    fio(g, Q, [[-2, 2.6], [2, 2.6]], 0.86, 0.05, CREME)
  }
  // a gema do arco (no topo da moldura de fora)
  gema(GL, Q.P(0, 1.1, 11.6), 0.7, lod)
  return { arcoTopo: 11.8 }
}

/**
 * O PALÁCIO INTEIRO sobre a `CasteloPlanta` (frente para −z). Ordem: muros e pátio → portal → cúpula central
 * (tambor + concha + gema) → torres grandes e pequenas → agulhas → conchas de pé, corais e cristais → a ilha
 * (rochas, lagos) → praça com balaustradas e pedestais de cristal.
 */
export function casteloMaru(c: Cena, K: CasteloPlanta, lod = 0) {
  const ang = Math.PI
  const x0 = K.porta.x, zf = K.porta.z - 1.5
  const Q = quadro(x0, zf, ang)
  const vMen = -(K.patio.z1 - zf) // fundo do pátio (frente do tambor)
  const patioHw = (K.patio.x1 - K.patio.x0) / 2
  // ── portal (frente da muralha, v = 0)
  portalMaru(c, Q, lod)
  // ── muros dos lados do portal até as torres grandes (corpo com janelas e balaustrada no alto)
  for (const s of [-1, 1]) {
    const um = s * 9.6
    const p = Q.P(um, -2.2, 0)
    const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
    cx(g, Q, um, -2.2, 6.6, 4.4, 0, 9, PER_MEIO, PER, PER)
    bloq(c, Q, um, -2.2, 6.6, 4.4, 9)
    if (!lod) for (const du of [-1.7, 1.7]) janelaGotica(g, GL, Q, um + du, 0.02, 2.8, 0.85, 4.6, lod, 20 + du)
    balaustrada(g, Q, um - 3.2, -0.2, um + 3.2, -0.2, 9, lod)
    // ala recuada mais alta (arcos de luz), atrás do muro
    cx(g, Q, s * 10.5, -6, 5, 4, 9, 13.5, PER, PER_CL, PER)
    janelaGotica(g, GL, Q, s * 10.5, -3.98, 9.6, 0.8, 3.2, lod, 30 + s)
    balaustrada(g, Q, s * 8.2, -3.8, s * 12.8, -3.8, 13.5, lod)
  }
  // ── lascas de cristal aceso saindo de trás dos muros (a ref é cheia delas)
  for (const [u, v, y, h] of [[-7.2, -2.6, 9, 3.2], [-12.4, -2.8, 9, 2.4], [7.4, -2.6, 9, 3], [12.2, -2.8, 9, 2.6], [-6.4, -7, 13.5, 2.6], [6.6, -7, 13.5, 2.4], [-3.4, -9, 10.2, 3.6], [3.6, -9, 10.2, 3.4]] as const) {
    const pb = Q.P(u, v, y)
    const GL = c.glow(pb[0], pb[2])
    prisma(GL, pb, [pb[0] + (u > 0 ? 0.3 : -0.3), y + h * 0.6, pb[2]], h * 0.16, h * 0.4, lod ? 4 : 5, GEMA, u, !lod)
    if (!lod) prisma(GL, [pb[0] + 0.6, y, pb[2] + 0.3], [pb[0] + 1.1, y + h * 0.35, pb[2] + 0.3], h * 0.1, h * 0.25, 4, GEMA.slice(1), u + 1)
  }
  // ── laterais do pátio
  for (const s of [-1, 1]) {
    const L = -vMen - 4.2, vm = -3.8 - L / 2
    const pm = Q.P(s * (patioHw + 1.5), vm, 0)
    const gg = c.geo(pm[0], pm[2])
    cx(gg, Q, s * (patioHw + 1.5), vm, 3, L, 0, 9, PER_MEIO, PER, PER)
    bloq(c, Q, s * (patioHw + 1.5), vm, 3, L, 9)
    balaustrada(gg, Q, s * (patioHw + 0.2), vm - L / 2, s * (patioHw + 0.2), vm + L / 2, 9, lod)
    // agulhas sobre o muro (as torres finas do meio: gema a 21 m)
    agulha(c, Q, s * (patioHw + 1.5), vMen + 2.5, 9, 6.4, 1.15, lod)
    // torres "pagode" sobre o muro, perto da frente (gema a 20 m)
    agulha(c, Q, s * (patioHw + 1.2), -6.4, 9, 3.4, 1.5, lod)
  }
  // ── fundo do pátio: muro dos dois lados do tambor (o pátio só abre pela porta)
  for (const s of [-1, 1]) {
    const um = s * (patioHw + 3 + 4.4) / 2, w = patioHw + 3 - 4.4
    const p = Q.P(um, vMen - 1.6, 0)
    const g = c.geo(p[0], p[2])
    cx(g, Q, um, vMen - 1.6, w, 3, 0, 9, PER_MEIO, PER, PER)
    bloq(c, Q, um, vMen - 1.6, w, 3, 9)
    balaustrada(g, Q, um - w / 2, vMen - 0.2, um + w / 2, vMen - 0.2, 9, lod)
  }
  // ── a CÚPULA central: tambor de colunas e janelas, varanda, concha em leque, gema
  {
    const vT = vMen - 4.4, rT = 4
    const p = Q.P(0, vT, 0)
    const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
    cilindro(g, Q, 0, vT, 0, 16, rT * 1.15, rT * 1.05, lod ? 10 : 14, PER)
    // o ARCO aceso virado para o pátio (o salão do deus)
    janelaGotica(g, GL, Q, 0, vT + rT * 1.1 + 0.06, 1.5, 2.2, 9, lod, 41)
    varandaRedonda(g, Q, 0, vT, 16, rT * 1.45, lod)
    cilindro(GL, Q, 0, vT, 16, 21, rT * 0.86, rT * 0.86, lod ? 10 : 14, VIT)
    const nc = lod ? 6 : 10
    for (let k = 0; k < nc; k++) {
      const a = (k / nc) * Math.PI * 2 + Math.PI / nc
      tube(g, Q.P(Math.cos(a) * rT, vT + Math.sin(a) * rT, 16), Q.P(Math.cos(a) * rT, vT + Math.sin(a) * rT, 21), 0.3, 0.26, 6, (j) => (j % 2 ? PER : PER_CL), false)
    }
    for (const du of [-2.2, 0, 2.2]) janelaGotica(g, GL, Q, du, vT + Math.sqrt(rT * rT - du * du) * 0.94 + 0.15, 16.2, 0.85, 4.6, lod, 50 + du)
    // e as duas janelas grandes do corpo do tambor, viradas para fora (a ref: o tambor brilha inteiro)
    for (const du of [-2.4, 2.4]) janelaGotica(g, GL, Q, du, vT + Math.sqrt(rT * rT - du * du) * 1.05 + 0.15, 9.6, 0.9, 5, lod, 60 + du)
    cilindro(g, Q, 0, vT, 21, 21.7, rT * 1.2, rT * 1.25, lod ? 10 : 14, CREME)
    // a concha: leque em pé virado para a frente (costelas acesas por dentro: o miolo ciano da ref)
    const o = Q.P(0, vT + 0.6, 21.2)
    // a vieira da ref é GORDA: duas camadas de lóbulos (a de fora maior e abaulada) quase em meia-cúpula
    leque(g, Q.P(0, vT - 1.2, 21.2), Q.N(1, 0), [0, 1, 0], Q.N(0, -1), 9.2, 15, lod, 1.2, IRIS.map((q) => mul(q, 0.9)), 0.5)
    leque(g, o, Q.N(1, 0), [0, 1, 0], Q.N(0, 1), 9.6, 11, lod, 1.2, IRIS, 1.5)
    leque(g, Q.P(0, vT + 1.4, 21.4), Q.N(1, 0), [0, 1, 0], Q.N(0, 1), 6.2, 9, lod, 1.1, IRIS.slice(1).concat(IRIS.slice(0, 1)), 1.3)
    // o brilho ciano no pé da concha (o miolo aceso)
    const nL = lod ? 4 : 7
    for (let k = 0; k < nL; k++) {
      const a0 = Math.PI * (0.15 + 0.7 * (k / nL)), a1 = Math.PI * (0.15 + 0.7 * ((k + 1) / nL))
      face(GL, [Q.P(0, vT + 2.6, 21.6), Q.P(Math.cos(a0) * 6.4, vT + 2.4, 21.6 + Math.sin(a0) * 6.6), Q.P(Math.cos(a1) * 6.4, vT + 2.4, 21.6 + Math.sin(a1) * 6.6)], [VIT_CL, k % 2 ? VIT : mix(VIT, IRIS[2], 0.4), k % 2 ? VIT : mix(VIT, IRIS[2], 0.4)], Q.N(0, 1))
    }
    losango(g, GL, Q, 0, 19, 0.8, vT + rT * 0.86 + 0.15)
    // gema do topo
    tube(g, Q.P(0, vT + 0.2, 28.4), Q.P(0, vT + 0.2, 29.2), 0.4, 0.2, 6, () => CREME, false)
    gema(GL, Q.P(0, vT + 0.2, 30), 1.2, lod)
    bloq(c, Q, 0, vT, rT * 2.2, rT * 2.2, 22)
  }
  // ── torres grandes (u ±14) e pequenas (u ±21) sobre a rocha
  torreMaru(c, Q, -14.6, -3.2, { r: 3.4, y0: 3.8, hc: 9.8, hg: 3.6, capR: 5, capH: 3.4, janelas: 1, seed: 61 }, lod)
  torreMaru(c, Q, 13.8, -3.2, { r: 3.3, y0: 3.8, hc: 9.4, hg: 3.4, capR: 4.8, capH: 3.2, janelas: 2, seed: 62 }, lod)
  torreMaru(c, Q, -22, -0.6, { r: 2.9, y0: 3.4, hc: 5.6, hg: 2.8, capR: 4.2, capH: 2.6, janelas: 1, gemaS: 0.8, seed: 63 }, lod)
  torreMaru(c, Q, 20.6, -0.8, { r: 2.6, y0: 3.4, hc: 4, hg: 2.6, capR: 3.8, capH: 2.4, janelas: 1, gemaS: 0.7, seed: 64 }, lod)
  // ponte-arcada da torre pequena direita até a grande (a ref: arcos abertos)
  for (const s of [-1, 1]) {
    const um = s * 17.8
    const p = Q.P(um, -1.8, 0)
    const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
    cx(g, Q, um, -1.8, 4.4, 3, 3.6, 8.2, PER, PER_CL, PER)
    poli(GL, Q, lanceta(um, 4, 6.4, 1.2, 1.2, lod ? 3 : 5), -0.28, VIT)
    balaustrada(g, Q, um - 2.2, -0.4, um + 2.2, -0.4, 8.2, lod)
  }
  // ── a ILHA: rochas lilás em volta (pés das torres, laterais), cristais ciano e os lagos acesos
  const rochas: [number, number, number, number][] = [
    [-15, -1, 5.2, 4.2], [-22, 1.5, 4.6, 3.8], [-28, 2.5, 4.2, 3], [-31, -3, 3.6, 2.4], [-9.5, 1.5, 2.6, 1.6],
    [14.2, -1, 5, 4.2], [21, 1.5, 4.4, 3.8], [27, 2.6, 4.2, 3], [30.5, -3, 3.4, 2.2], [9.6, 1.5, 2.6, 1.6],
    [-18, -8, 5, 5], [18, -8, 5, 5], [-25, -8, 4, 3.2], [25, -8, 4, 3.2],
  ]
  rochas.forEach(([u, v, s, h], k) => {
    rochaIlha(c, Q, u, v, s, h, 70 + k, lod)
    bloq(c, Q, u, v, s * 1.3, s * 1.3, h)
  })
  // cristais nas pedras (ciano aceso)
  for (const [u, v, s] of [[-27.5, 4.5, 2.6], [-31.5, 1, 2], [-25, 5.8, 1.6], [26.5, 4.8, 2.6], [31, 1.2, 2.2], [17.5, 4.6, 1.8], [-17.5, 4.5, 1.8], [-8, 3.6, 1.2], [8, 3.6, 1.2]] as const) {
    const p = Q.P(u, v, 0)
    cristalGelo(c, p[0], p[2], s * 1.6, Math.round(u * 3 + v), lod, undefined, false)
  }
  // lagos acesos na frente (dos dois lados da praça)
  for (const s of [-1, 1]) lago(c, Q, [[s * 11, 2.6], [s * 16, 2.2], [s * 21, 3.4], [s * 23.5, 5.2], [s * 20, 6.4], [s * 13, 6], [s * 10.6, 4.6]].map(([u, v]) => [u, v] as UV), lod)
  // conchas de pé dos lados do portal, corais brancos na frente delas
  for (const s of [-1, 1]) {
    conchaPe(c, Q, s * 10.4, 0.6, 0.5, 6.2, lod)
    const pc = Q.P(s * 13.6, 1.4, 0)
    coral(c, pc[0], pc[2], 4.6, CORAL_B, CORAL_B_ESC, 90 + s, lod, "y")
    const pc2 = Q.P(s * 6.6, 1.2, 0)
    coral(c, pc2[0], pc2[2], 2.6, CORAL_B, CORAL_B_ESC, 95 + s, lod, "y")
  }
  // ── a PRAÇA (a escadaria da ref, plana): lajes de pérola + balaustradas em leque + pedestais de cristal
  {
    const p = Q.P(0, 1.5, 0)
    const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
    // faixas de laje (os degraus viram listras claras/escuras no chão)
    for (let k = 0; k < 6; k++) {
      const v0 = 0.6 + k * 0.6, w = 4.2 + k * 0.32
      face(g, [Q.P(-w, v0, 0.04), Q.P(w, v0, 0.04), Q.P(w, v0 + 0.6, 0.04), Q.P(-w, v0 + 0.6, 0.04)], k % 2 ? PER : PER_MEIO, [0, 1, 0])
    }
    for (const s of [-1, 1]) {
      balaustrada(g, Q, s * 4.6, 0.6, s * 6.3, 4.2, 0, lod, 1.1)
      // pedestal com cristal
      cx(g, Q, s * 6.5, 4.6, 1.3, 1.3, 0, 1.9, PER, PER_CL)
      cx(g, Q, s * 6.5, 4.6, 1.6, 1.6, 1.9, 2.2, CREME)
      const pp = Q.P(s * 6.5, 4.6, 2.2)
      prisma(GL, pp, [pp[0], pp[1] + 0.9, pp[2]], 0.38, 0.6, lod ? 4 : 6, GEMA, 0.3, !lod)
      bloq(c, Q, s * 6.5, 4.6, 1.4, 1.4, 2.2)
      // balaustrada da varanda das conchas
      balaustrada(g, Q, s * 6.6, 0.4, s * 9.4, 0.4, 2.6, lod, 0.9)
      cx(g, Q, s * 8, -0.1, 3, 1.2, 0, 2.6, PER_MEIO, PER)
    }
  }
  return { arco: Q.P(0, vMen, 3), gema: Q.P(0, vMen - 4.2, 30) }
}
