// features/meu-mundo/engine/cena-codigo/pecas/castelo-kragor.ts — a FORTALEZA DE KRAGOR pela CÓPIA MINUCIOSA
// da ref `ref/dominios/castelo-kragor.png` (inventário `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/
// castelo-kragor.json`). Régua: o vão da porta (705–835 px) = 5 m → ~27 px/m; chão da porta = y 745 px.
//
// FICHA
// O que é:        fortaleza infernal de basalto roxo-escuro sobre um morro de rocha com cascatas de lava.
// Silhueta:       pirâmide em 4 andares (alas → muralha → menagem → torre do topo com a flecha vermelha), os
//                 DOIS CHIFRES em crescente saindo de trás da menagem, e dezenas de pináculos em toda coroa.
// Simetria:       espelhada em u (a ref é quase simétrica).
// Massas grandes: menagem (14 m de largura, 17 m), torre do topo (6 m, 21,6 m + flecha até 27), chifres
//                 (5 m de raio de curva, ponta a 27 m), alas no morro (u 11–28), muralha da frente (8,7 m).
// Médios:         portal de empena com a PORTA DE FOGO (lanceta com rendilhado), estandartes vermelhos com
//                 estrela de ouro, torres de coroa (lanterna acesa + pináculos), arcadas abertas, pontes em
//                 arco, varanda com balaustrada e pedestais de cristal.
// Pequenos:       ameias com cristais de fogo, frestas vermelhas, losangos acesos, cachorros (mísulas) com
//                 brasa entre eles, pináculos menores.
// Paleta:         basalto roxo (luz 0,36/0,3/0,38; sombra 0,16/0,13/0,19; quina 0,6/0,52/0,58); chifre
//                 vermelho por dentro (0,78/0,16/0,16); fogo amarelo→laranja→vermelho (aceso); estandarte
//                 0,72/0,1/0,1 com ouro 0,98/0,64/0,2.
// Material:       pedra (facetada, quina clara) + cristal/fogo aceso.
// Fora:           a ESCADARIA (o chão de andar do jogo é plano: os degraus viraram a praça de lajes com as
//                 balaustradas abrindo em leque e os pedestais nos mesmos lugares); a PORTA é uma cortina de
//                 fogo sem colisão (o jogador atravessa para o pátio do deus).
// Medidas:        contrato `dominio.ts` (CasteloPlanta): frente para −z (ang = π), porta = vão de 5 m no
//                 meio da muralha, pátio aberto atrás, menagem fechando o fundo do pátio com o arco aceso.
// Inventado:      os lados e o fundo (a ref só mostra a frente): muralha lisa com ameias e pináculos.
//
// Contrato das peças: (c, x, z, ang, …, lod); quadro local `quadro(x, z, ang)`: u = direita de quem olha a
// frente, v = para fora, y = cima.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"
import { lanceta } from "./castelo-iris"
import type { CasteloPlanta } from "../dominio"

// ── paleta (recortes do inventário; ajustada à luz vermelha do jogo) ──
// a luz do jogo é vermelha (mata o azul): o basalto roxo da ref pede MUITO azul no albedo
export const BAS: RGB = [0.46, 0.36, 0.66] // basalto ao sol
export const BAS_ESC: RGB = [0.27, 0.2, 0.4]
export const BAS_SOMBRA: RGB = [0.15, 0.1, 0.22]
export const BAS_CL: RGB = [0.78, 0.64, 0.9] // quina, tampa, cornija
export const VERM: RGB = [0.72, 0.13, 0.14]
export const VERM_CL: RGB = [0.95, 0.3, 0.24]
export const VERM_ESC: RGB = [0.42, 0.08, 0.1]
export const FOGO_CL: RGB = [1, 0.84, 0.3]
export const FOGO: RGB = [1, 0.56, 0.1]
export const FOGO_ESC: RGB = [0.94, 0.26, 0.06]
export const ESTANDARTE: RGB = [0.74, 0.08, 0.09] // aceso (no GL): a frente fica na contraluz do sol do jogo
export const OURO: RGB = [0.98, 0.64, 0.2]
const CRISTAL: RGB[] = [[1, 0.3, 0.04], [1, 0.56, 0.1], [0.84, 0.1, 0.04], [1, 0.42, 0.06], [1, 0.7, 0.2], [0.9, 0.18, 0.05]]

type G = ReturnType<Cena["geo"]>
type Q = ReturnType<typeof quadro>
type UV = [number, number]

// ═══════════════ ferramentas do quadro ═══════════════

/** Tronco de 4 lados alinhado ao quadro (base w0×d0 → topo w1×d1), tampa no topo; frente mais clara. */
function tronco(g: G, Q: Q, u: number, v: number, y0: number, y1: number, w0: number, d0: number, w1: number, d1: number, side: RGB, top?: RGB, frente?: RGB) {
  const c0: V3[] = [Q.P(u - w0 / 2, v + d0 / 2, y0), Q.P(u + w0 / 2, v + d0 / 2, y0), Q.P(u + w0 / 2, v - d0 / 2, y0), Q.P(u - w0 / 2, v - d0 / 2, y0)]
  const c1: V3[] = [Q.P(u - w1 / 2, v + d1 / 2, y1), Q.P(u + w1 / 2, v + d1 / 2, y1), Q.P(u + w1 / 2, v - d1 / 2, y1), Q.P(u - w1 / 2, v - d1 / 2, y1)]
  const ns: V3[] = [Q.N(0, 1), Q.N(1, 0), Q.N(0, -1), Q.N(-1, 0)]
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    const cor = k === 0 ? (frente ?? side) : k === 2 ? mul(side, 0.8) : side
    face(g, [c0[k], c0[j], c1[j], c1[k]], [mul(cor, 0.75), mul(cor, 0.75), cor, cor], ns[k])
  }
  if (top) face(g, c1, top, [0, 1, 0])
}
/** Caixa no quadro (w ao longo de u, d ao longo de v). */
const cx = (g: G, Q: Q, u: number, v: number, w: number, d: number, y0: number, y1: number, side: RGB, top?: RGB, frente?: RGB) => tronco(g, Q, u, v, y0, y1, w, d, w, d, side, top ?? mix(side, BAS_CL, 0.5), frente)
/** Caixa de colisão no quadro. */
function bloq(c: Cena, Q: Q, u: number, v: number, w: number, d: number, h: number) {
  const p = Q.P(u, v, 0)
  c.block(p[0], p[2], w / 2, d / 2, h, Q.rot)
}
/** Polígono (u, y) de pé no plano v, virado para fora (+v) ou para dentro (−v). */
function poli(g: G, Q: Q, pts: UV[], v: number, cor: RGB | RGB[], dentro = false) {
  face(g, pts.map(([u, y]) => Q.P(u, v, y)), cor, Q.N(0, dentro ? -1 : 1))
}
/** Contorno (u, y) em fio grosso (o rendilhado escuro da porta e das janelas). */
function fio(g: G, Q: Q, pts: UV[], v: number, r: number, cor: RGB, fechado = false) {
  const n = fechado ? pts.length : pts.length - 1
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length]
    tube(g, Q.P(a[0], v, a[1]), Q.P(b[0], v, b[1]), r, r, 4, (j) => (j % 2 ? cor : mul(cor, 0.7)), false)
  }
}

/** PINÁCULO: pirâmide de 4 faces (as da ref são finas e altas), faces alternando luz e sombra; `tom` 0..1 = quanto de vermelho. */
export function pinaculo(g: G, Q: Q, u: number, v: number, y: number, r: number, h: number, tom = 0) {
  const b: V3[] = [Q.P(u, v + r, y), Q.P(u + r, v, y), Q.P(u, v - r, y), Q.P(u - r, v, y)]
  const tip = Q.P(u, v, y + h)
  const claro = mix(mix(BAS, BAS_CL, 0.35), VERM, tom * 0.7), esc = mix(BAS_ESC, VERM_ESC, tom)
  const ns: V3[] = [Q.N(1, 1, 0.3), Q.N(1, -1, 0.3), Q.N(-1, -1, 0.3), Q.N(-1, 1, 0.3)]
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    const cor = k === 0 || k === 3 ? claro : esc
    face(g, [b[k], b[j], tip], [mul(cor, 0.8), mul(cor, 0.8), mix(cor, tom ? VERM_CL : BAS_CL, 0.25)], ns[k])
  }
}

/** CRISTAL DE FOGO das ameias e dos pedestais: bipirâmide de 4–6 faces acesa, centro p. */
export function cristal(GL: G, p: V3, s: number, lod: number, rot = 0.4) {
  const n = lod ? 4 : 6
  const r = s * 0.42, top: V3 = [p[0], p[1] + s * 0.78, p[2]], bot: V3 = [p[0], p[1] - s * 0.48, p[2]]
  const ring = Array.from({ length: n }, (_, k): V3 => [p[0] + Math.cos(rot + (k / n) * Math.PI * 2) * r, p[1], p[2] + Math.sin(rot + (k / n) * Math.PI * 2) * r])
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const a = rot + ((k + 0.5) / n) * Math.PI * 2
    const nx = Math.cos(a), nz = Math.sin(a)
    const c = CRISTAL[k % CRISTAL.length]
    // em cima: claro no centro → cor da faceta na borda; embaixo: a faceta mais funda
    face(GL, [ring[k], ring[j], top], [c, c, mix(c, FOGO_CL, 0.6)], [nx, 0.6, nz])
    face(GL, [ring[k], ring[j], bot], [mul(c, 0.92), mul(c, 0.92), FOGO_ESC], [nx, -0.6, nz])
  }
}

/** Losango aceso com moldura escura (o "olho" de fogo da ref), no plano v, centro (u, y), meia-altura h. */
function losango(g: G, GL: G, Q: Q, u: number, y: number, h: number, v: number) {
  const w = h * 0.6
  poli(g, Q, [[u, y - h - 0.3], [u + w + 0.22, y], [u, y + h + 0.3], [u - w - 0.22, y]], v, BAS_ESC)
  const c0 = Q.P(u, v + 0.08, y)
  const P4: V3[] = [Q.P(u, v + 0.04, y - h), Q.P(u + w, v + 0.04, y), Q.P(u, v + 0.04, y + h), Q.P(u - w, v + 0.04, y)]
  const tons: RGB[] = [VERM_CL, FOGO_ESC, FOGO, FOGO_ESC]
  for (let k = 0; k < 4; k++) face(GL, [P4[k], P4[(k + 1) % 4], c0], [tons[k], tons[(k + 1) % 4], FOGO_CL], Q.N(0, 1))
}

/** Cor do vitral de fogo pela altura relativa t (0 = pé, 1 = ponta): amarelo claro embaixo → laranja → vermelho. */
const fogoEm = (t: number): RGB => (t < 0.3 ? mix(FOGO_CL, FOGO, t / 0.3) : mix(FOGO, FOGO_ESC, Math.min(1, (t - 0.3) / 0.7)))

/**
 * VITRAL DE FOGO (porta e janelas): o contorno, um anel no meio do caminho e o centro, cacos de tom sorteado
 * entre o vermelho e o amarelo em volta da cor da altura — SEM branco (o vitral do kit lava para pastel).
 */
function vitralFogo(GL: G, Q: Q, cont: UV[], ctr: UV, v: number, y0: number, H: number, lod: number, seed: number) {
  const cor = (y: number) => fogoEm((y - y0) / H)
  const tom = (k: number, j: number, y: number): RGB => {
    const t = rnd(seed, k, j) - 0.5
    const b = cor(y)
    return t > 0 ? mix(b, FOGO_CL, t * 0.9) : mix(b, FOGO_ESC, -t * 1.1)
  }
  const n = cont.length
  const C = Q.P(ctr[0], v + 0.01, ctr[1])
  if (lod) {
    for (let k = 0; k < n; k++) {
      const a = cont[k], b = cont[(k + 1) % n]
      face(GL, [Q.P(a[0], v, a[1]), Q.P(b[0], v, b[1]), C], [cor(a[1]), cor(b[1]), cor(ctr[1])], Q.N(0, 1))
    }
    return
  }
  const mid = cont.map(([u, y], k): UV => [u + (ctr[0] - u) * (0.5 + (rnd(seed, k, 9) - 0.5) * 0.2), y + (ctr[1] - y) * (0.5 + (rnd(seed, k, 8) - 0.5) * 0.2)])
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const A = Q.P(cont[k][0], v, cont[k][1]), B = Q.P(cont[j][0], v, cont[j][1])
    const M = Q.P(mid[k][0], v + 0.005, mid[k][1]), N = Q.P(mid[j][0], v + 0.005, mid[j][1])
    face(GL, [A, B, M], tom(k, 1, cont[k][1]), Q.N(0, 1))
    face(GL, [B, N, M], tom(k, 2, mid[k][1]), Q.N(0, 1))
    face(GL, [M, N, C], [tom(k, 3, mid[k][1]), tom(k, 3, mid[j][1]), cor(ctr[1])], Q.N(0, 1))
  }
}

/**
 * JANELA GÓTICA ACESA (as da menagem e da torre do topo): moldura escura saliente, vitral de fogo facetado e
 * o rendilhado (montante no meio, Y no arranque). (u, y0) = pé; hw = meia largura; yb = arranque; hp = ponta.
 */
export function janela(g: G, GL: G, Q: Q, u: number, v: number, y0: number, hw: number, yb: number, hp: number, lod: number, seed = 1) {
  const seg = lod ? 3 : 6
  poli(g, Q, lanceta(u, y0 - 0.25, yb, hw + 0.32, hp + 0.4, seg), v, BAS_ESC)
  const H = yb + hp - y0
  vitralFogo(GL, Q, lanceta(u, y0, yb, hw, hp, seg), [u, y0 + H * 0.4], v + 0.04, y0, H, lod, seed)
  if (lod) return
  const vt = v + 0.09, r = Math.max(0.035, hw * 0.07)
  fio(g, Q, [[u, y0], [u, yb + hp * 0.55]], vt, r, BAS_SOMBRA)
  fio(g, Q, [[u - hw * 0.5, y0], [u - hw * 0.5, yb], [u, yb + hp * 0.55], [u + hw * 0.5, yb], [u + hw * 0.5, y0]], vt, r * 0.8, BAS_SOMBRA)
  fio(g, Q, [[u - hw, yb], [u - hw * 0.5, yb + hp * 0.45]], vt, r * 0.7, BAS_SOMBRA)
  fio(g, Q, [[u + hw, yb], [u + hw * 0.5, yb + hp * 0.45]], vt, r * 0.7, BAS_SOMBRA)
}

/**
 * AMEIAS de um trecho reto (de u0 a u1 no plano v, alto y): merlões de 0,7 m com quina clara e, a cada `cada`
 * merlão, um cristal de fogo pequeno em cima (a ref tem uma chama em quase toda ameia). `d` = espessura.
 */
function ameias(g: G, GL: G, Q: Q, u0: number, u1: number, v: number, y: number, d: number, lod: number, cada = 2, sCr = 0.42) {
  const L = Math.abs(u1 - u0)
  const n = Math.max(1, Math.round(L / 1.15))
  const passo = (u1 - u0) / n
  cx(g, Q, (u0 + u1) / 2, v, L, d, y - 0.35, y, mix(BAS, BAS_CL, 0.25), BAS_CL)
  if (lod) return
  for (let k = 0; k < n; k++) {
    const u = u0 + passo * (k + 0.5)
    cx(g, Q, u, v, Math.abs(passo) * 0.58, d, y, y + 0.75, BAS, BAS_CL)
    if (cada && k % cada === 0) cristal(GL, Q.P(u, v, y + 1.05), sCr, lod, k)
  }
}

/** Faixa de MÍSULAS (cachorros) com brasa entre elas, embaixo da cornija de uma torre: na face v, de u0 a u1, topo y. */
function misulas(g: G, GL: G, Q: Q, u0: number, u1: number, v: number, y: number, lod: number) {
  if (lod) return
  const n = Math.max(2, Math.round(Math.abs(u1 - u0) / 0.6))
  const passo = (u1 - u0) / n
  for (let k = 0; k <= n; k++) {
    const u = u0 + passo * k
    tronco(g, Q, u, v + 0.15, y - 0.75, y, 0.2, 0.05, 0.26, 0.4, BAS_ESC, BAS)
    if (k < n) poli(GL, Q, [[u + passo * 0.25, y - 0.6], [u + passo * 0.75, y - 0.6], [u + passo * 0.75, y - 0.12], [u + passo * 0.25, y - 0.12]], v + 0.03, [FOGO_ESC, FOGO_ESC, FOGO, FOGO])
  }
}

// ═══════════════ PEÇAS ═══════════════

/**
 * TORRE DE COROA (as torres quadradas da ref): base em talude opcional, corpo com cantos claros e frestas
 * acesas, faixa de mísulas com brasa, cornija com ameias e cristais, a LANTERNA (bloco com arcos acesos nos 4
 * lados), 4 pináculos nos cantos e a flecha no meio. y0 = pé (rocha); h = topo do corpo; ponta = da flecha.
 */
export function torreCoroa(c: Cena, x: number, z: number, ang: number, o: { w: number; y0?: number; h: number; ponta: number; talude?: number; seed?: number }, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const { w, h, ponta } = o
  const y0 = o.y0 ?? 0, hw = w / 2
  const seed = o.seed ?? 1
  // talude (a base inclinada que a ref mostra nas torres da frente)
  if (o.talude) tronco(g, Q, 0, 0, y0, y0 + o.talude, w * 1.5, w * 1.5, w, w, BAS_ESC, BAS, mix(BAS, BAS_CL, 0.15))
  cx(g, Q, 0, 0, w, w, y0, h - 0.8, BAS_ESC, undefined, BAS)
  // cantos claros (a quina facetada da ref)
  if (!lod) for (const su of [-1, 1]) cx(g, Q, su * (hw - 0.1), hw - 0.1, 0.36, 0.36, y0 + (o.talude ?? 0), h - 0.8, mix(BAS, BAS_CL, 0.35))
  // frestas acesas (2 na frente, 1 de cada lado)
  if (!lod) {
    const fr = (u: number, y: number) => poli(GL, Q, [[u - 0.14, y], [u + 0.14, y], [u + 0.14, y + 1.1], [u, y + 1.35], [u - 0.14, y + 1.1]], hw + 0.03, [FOGO_ESC, FOGO_ESC, FOGO, FOGO_CL, FOGO])
    const yy = y0 + (o.talude ?? 0) + (h - y0 - (o.talude ?? 0)) * 0.35
    fr(-hw * 0.35, yy + rnd(seed, 1) * 1.2)
    fr(hw * 0.35, yy + 2 + rnd(seed, 2) * 1.2)
  }
  // faixa de mísulas e cornija larga com ameias (4 lados) e cristais
  misulas(g, GL, Q, -hw, hw, hw, h - 0.6, lod)
  cx(g, Q, 0, 0, w + 0.7, w + 0.7, h - 0.8, h, BAS, BAS_CL, mix(BAS, BAS_CL, 0.2))
  const e = 0.35
  ameias(g, GL, Q, -hw - e, hw + e, hw + e - 0.15, h + 0.35, 0.3, lod, 2, 0.38)
  if (!lod) {
    ameias(g, GL, Q, -hw - e, hw + e, -hw - e + 0.15, h + 0.35, 0.3, lod, 0)
    for (const su of [-1, 1]) {
      // laterais: merlões girados (u ↔ v) — feitos como caixas finas
      for (let k = 0; k < 3; k++) cx(g, Q, su * (hw + e - 0.15), -hw + (k + 0.5) * (w / 3), 0.3, 0.42, h, h + 0.75, BAS, BAS_CL)
    }
  }
  // lanterna: bloco central com arcos acesos e chama dentro
  const lw = w * 0.62, lh = Math.min(2.4, (ponta - h) * 0.36)
  cx(g, Q, 0, 0, lw, lw, h, h + lh, BAS_ESC, BAS)
  for (const [nu, nv] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) {
    if (lod && nv !== 1) continue
    const P = (a: number, y: number): V3 => Q.P(nu ? nu * (lw / 2 + 0.03) : a, nv ? nv * (lw / 2 + 0.03) : a, y)
    const ar = lanceta(0, h + 0.12, h + lh * 0.55, lw * 0.36, lh * 0.38, 3)
    face(GL, ar.map(([a, y]) => P(a, y)), ar.map(([, y]) => fogoEm(((y - h) / lh) * 0.9)), Q.N(nu, nv))
    if (!lod) face(GL, [P(-lw * 0.22, h + 0.14), P(lw * 0.22, h + 0.14), P(0, h + lh * 0.62)].map((p) => [p[0] + (nu * Q.sx + nv * Q.fx) * 0.02, p[1], p[2] + (nu * Q.sz + nv * Q.fz) * 0.02] as V3), [FOGO, FOGO, [1, 0.95, 0.6]], Q.N(nu, nv))
  }
  // coroa de pináculos: 4 nos cantos (com cristal na base) e a flecha
  for (const [su, sv] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) pinaculo(g, Q, su * (hw + 0.1), sv * (hw + 0.1), h + 0.7, 0.32, Math.max(1.2, (ponta - h) * 0.4), 0.15)
  pinaculo(g, Q, 0, 0, h + lh, lw * 0.5, ponta - h - lh, 0.3)
  if (!lod) for (const [su, sv] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) pinaculo(g, Q, su * lw * 0.42, sv * lw * 0.42, h + lh, lw * 0.16, (ponta - h - lh) * 0.35, 0.5)
  const tw = (o.talude ? w * 1.5 : w) / 2
  bloq(c, Q, 0, 0, tw * 2, tw * 2, ponta)
}

/**
 * ESTANDARTE (os dois da muralha): pano vermelho com rabo em V, barra de ouro em cima com as pontas, borda
 * de ouro e a ESTRELA de 4 pontas de ouro no meio. (u, yTopo) no plano v.
 */
export function estandarte(g: G, GL: G, Q: Q, u: number, v: number, yT: number, w: number, h: number) {
  const hw = w / 2
  poli(GL, Q, [[u - hw, yT], [u + hw, yT], [u + hw, yT - h * 0.84], [u + hw * 0.45, yT - h * 0.74], [u, yT - h], [u - hw * 0.45, yT - h * 0.74], [u - hw, yT - h * 0.84]].reverse() as UV[], v, [ESTANDARTE, ESTANDARTE, mul(ESTANDARTE, 0.8), mul(ESTANDARTE, 0.85), mul(ESTANDARTE, 0.7), mul(ESTANDARTE, 0.85), mul(ESTANDARTE, 0.8)].reverse() as RGB[])
  // borda de ouro dos dois lados
  for (const s of [-1, 1]) poli(GL, Q, [[u + s * hw, yT], [u + s * (hw - 0.09), yT], [u + s * (hw - 0.09), yT - h * 0.82], [u + s * hw, yT - h * 0.84]], v + 0.01, mul(OURO, 0.9))
  // barra e pontas
  tube(g, Q.P(u - hw - 0.35, v + 0.08, yT + 0.08), Q.P(u + hw + 0.35, v + 0.08, yT + 0.08), 0.07, 0.07, 4, () => OURO, false)
  for (const s of [-1, 1]) tube(g, Q.P(u + s * (hw + 0.3), v + 0.08, yT + 0.08), Q.P(u + s * (hw + 0.5), v + 0.08, yT + 0.08), 0.12, 0.02, 4, () => OURO, true)
  // estrela de 4 pontas (vertical mais longa), centro no terço de cima
  const sy = yT - h * 0.42, a = h * 0.3, b = hw * 0.7, m = hw * 0.2
  poli(GL, Q, [[u, sy], [u - m, sy + m], [u, sy + a], [u + m, sy + m]], v + 0.02, OURO)
  poli(GL, Q, [[u, sy], [u + m, sy + m], [u + b, sy], [u + m, sy - m]], v + 0.02, OURO)
  poli(GL, Q, [[u, sy], [u + m, sy - m], [u, sy - a], [u - m, sy - m]], v + 0.02, mul(OURO, 0.85))
  poli(GL, Q, [[u, sy], [u - m, sy - m], [u - b, sy], [u - m, sy + m]], v + 0.02, mul(OURO, 0.85))
}

/**
 * PORTAL DE KRAGOR (o centro da frente): bloco de 8,4 m com a EMPENA (cume 11,3 m, beiral 6,9) de molduras
 * grossas de pedra clara, a PORTA DE FOGO (lanceta de 5 m de vão, ponta a 8,4 m) com rendilhado escuro — cortina
 * acesa SEM colisão —, losangos acesos nos pilares e pináculos dos dois lados. Frente em v = 0.
 */
export function portalKragor(c: Cena, x: number, z: number, ang: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const hw = 4.2, yB = 6.9, yC = 11.3, prof = 3.6
  const seg = lod ? 4 : 8
  // pilares do portal (os dois lados da porta), à frente da muralha
  for (const s of [-1, 1]) {
    cx(g, Q, s * (hw - 0.85), -1.2, 1.7, prof + 0.6, 0, yB, BAS_ESC, BAS, BAS)
    if (!lod) cx(g, Q, s * (hw - 0.15), 0.6, 0.35, 0.4, 0, yB, mix(BAS, BAS_CL, 0.3))
    losango(g, GL, Q, s * (hw - 0.85), 4.5, 0.38, 0.62)
    pinaculo(g, Q, s * (hw + 0.2), 0.2, yB - 0.2, 0.45, 3.4, 0.1)
  }
  // a empena: tímpano (triângulo + faixa sobre a porta) e as duas molduras inclinadas grossas
  poli(g, Q, [[-hw, yB], [hw, yB], [0, yC]], 0.5, BAS)
  // teto do túnel do portão e o miolo da empena (por trás do tímpano), com o tímpano de trás
  cx(g, Q, 0, -1.25, 2 * hw, 3.5, 8.6, 9.6, BAS_ESC, BAS)
  poli(g, Q, [[-hw, 9.6], [hw, 9.6], [0, yC]], -3, BAS_ESC, true)
  const beam = (s: number) => {
    // viga inclinada de seção 0,9 × 1,2 que avança 0,5 (a moldura clara da empena)
    const a = Q.P(s * (hw + 0.5), 1.05, yB - 0.45), b = Q.P(0, 1.05, yC + 0.55)
    const a2 = Q.P(s * (hw + 0.5), -prof + 0.6, yB - 0.45), b2 = Q.P(0, -prof + 0.6, yC + 0.55)
    const nUp = Q.N(s * 0.7, 0, 0.7)
    face(g, [a, b, b2, a2], [BAS_CL, BAS_CL, mix(BAS, BAS_CL, 0.5), mix(BAS, BAS_CL, 0.5)], nUp)
    const a3 = Q.P(s * (hw - 0.6), 1.05, yB - 0.45), b3 = Q.P(0, 1.05, yC - 0.9)
    face(g, [a, b, b3, a3], mix(BAS, BAS_CL, 0.3), Q.N(0, 1))
    face(g, [a3, b3, Q.P(0, 0.5, yC - 0.9), Q.P(s * (hw - 0.6), 0.5, yB - 0.45)], BAS_ESC, Q.N(-s * 0.6, 0, -0.8))
  }
  beam(-1)
  beam(1)
  // moldura da porta: lanceta escura grande + lanceta clara (a pedra da arquivolta) + o vão
  const dHw = 2.5, dYb = 5.3, dHp = 3.1
  poli(g, Q, lanceta(0, 0, dYb, dHw + 0.75, dHp + 0.85, seg), 0.52, BAS)
  poli(g, Q, lanceta(0, 0, dYb, dHw + 0.42, dHp + 0.48, seg), 0.56, BAS_SOMBRA)
  // a PORTA DE FOGO: vitral facetado (claro embaixo, a chama da ref) + a chama em triângulo amarela no pé
  vitralFogo(GL, Q, lanceta(0, 0, dYb, dHw, dHp, seg), [0, 2.4], 0.6, 0, dYb + dHp, lod, 11)
  if (!lod) {
    // a CHAMA da ref: triângulos amarelos no pé (um grande e dois menores), na frente do vitral
    face(GL, [Q.P(-1.7, 0.64, 0.05), Q.P(1.7, 0.64, 0.05), Q.P(0, 0.64, 2.9)], [FOGO, FOGO, [1, 0.95, 0.6]], Q.N(0, 1))
    for (const s of [-1, 1]) face(GL, [Q.P(s * 0.9, 0.65, 0.05), Q.P(s * 2.3, 0.65, 0.05), Q.P(s * 1.7, 0.65, 2)], [FOGO_CL, FOGO, FOGO_CL], Q.N(0, 1))
    // rendilhado: 3 montantes, 2 sub-lancetas, o Y e o óculo no alto
    const vt = 0.7, r = 0.075
    for (const du of [-dHw * 0.5, 0, dHw * 0.5]) fio(g, Q, [[du, 0], [du, du ? dYb : dYb + 0.6]], vt, r, BAS_SOMBRA)
    fio(g, Q, lanceta(-dHw * 0.5, dYb - 0.6, dYb, dHw * 0.5, 1.5, 4).slice(2), vt, r, BAS_SOMBRA)
    fio(g, Q, lanceta(dHw * 0.5, dYb - 0.6, dYb, dHw * 0.5, 1.5, 4).slice(2), vt, r, BAS_SOMBRA)
    // os arcos que se cruzam no alto (de cada pé da sub-lanceta até o montante do outro lado) e a GOTA
    fio(g, Q, [[-dHw, dYb], [-dHw * 0.55, dYb + 1.7], [0.2, dYb + 2.6]], vt, r * 0.85, BAS_SOMBRA)
    fio(g, Q, [[dHw, dYb], [dHw * 0.55, dYb + 1.7], [-0.2, dYb + 2.6]], vt, r * 0.85, BAS_SOMBRA)
    fio(g, Q, lanceta(0, dYb + 1.15, dYb + 1.6, 0.42, 0.9, 3), vt, r * 0.75, BAS_SOMBRA, true)
    fio(g, Q, [[-dHw, dYb - 1.6], [dHw, dYb - 1.6]], vt, r * 0.8, BAS_SOMBRA)
  }
  // colisão: só os pilares (o vão é livre — a cortina de fogo se atravessa)
  for (const s of [-1, 1]) bloq(c, Q, s * (hw - 0.85), -1.2, 1.7, prof + 0.6, yC)
}

/**
 * CHIFRE (os dois crescentes da ref): tubo de 6 faces que afina até a ponta, seguindo a curva (u, y) no plano
 * v; as faces do lado de DENTRO da curva são vermelhas (claro/escuro), as de fora roxo-escuras.
 */
export function chifre(g: G, GL: G, Q: Q, curva: UV[], v: number, r0: number, lod: number) {
  const n = 6
  const pts = curva
  const m = pts.length
  // centro da curva (para saber o lado de dentro)
  const cu = pts.reduce((s, p) => s + p[0], 0) / m, cy = pts.reduce((s, p) => s + p[1], 0) / m
  const rings: V3[][] = []
  const dirs: [number, number, number][][] = []
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)]
    let tu = b[0] - a[0], ty = b[1] - a[1]
    const L = Math.hypot(tu, ty) || 1
    tu /= L; ty /= L
    // normal no plano (u, y), apontando para DENTRO da curva
    let nu = -ty, ny = tu
    if ((cu - pts[i][0]) * nu + (cy - pts[i][1]) * ny < 0) { nu = -nu; ny = -ny }
    const t = i / (m - 1)
    const r = r0 * (1 - t ** 1.7) * (1 - t * 0.25) + 0.03
    const ring: V3[] = [], dd: [number, number, number][] = []
    for (let k = 0; k < n; k++) {
      const th = (k / n) * Math.PI * 2 - Math.PI / n
      const du = nu * Math.cos(th), dy = ny * Math.cos(th), dv = Math.sin(th)
      ring.push(Q.P(pts[i][0] + du * r, v + dv * r * 0.85, pts[i][1] + dy * r))
      dd.push([Math.cos(th), du, dy])
    }
    rings.push(ring)
    dirs.push(dd)
  }
  for (let i = 0; i < m - 1; i++) {
    const t = i / (m - 1)
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n
      const th = (k / n) * Math.PI * 2 // centro da face k: 0 = dentro, 60° = dentro-frente, 120° = fora-frente, 180° = fora
      const fx = dirs[i][k][1] + dirs[i][j][1], fy = dirs[i][k][2] + dirs[i][j][2]
      const nn = Q.N(fx, Math.sin(th), fy)
      const cores: RGB[] = [mix(VERM, VERM_ESC, 0.3), mix(VERM, VERM_CL, 0.3 + t * 0.5), mix(BAS, BAS_CL, 0.4), BAS, BAS_ESC, VERM_ESC]
      const cor = cores[k]
      const alt = (i + k) % 2 ? cor : mul(cor, 0.88) // facetado em xadrez (a ref é toda em facetas)
      face(g, [rings[i][k], rings[i][j], rings[i + 1][j], rings[i + 1][k]], alt, nn)
    }
  }
  // brilho vermelho aceso na face de dentro do terço do meio (a ref tem o "fogo" por dentro do chifre)
  if (!lod)
    for (let i = Math.floor(m * 0.25); i < Math.floor(m * 0.7); i++) {
      const k = 1, j = 2
      const A = rings[i][k], B = rings[i + 1][k], C = rings[i + 1][j]
      face(GL, [A, B, C], [VERM_CL, mix(VERM_CL, FOGO_ESC, 0.4), VERM], [0, 0, 0].map((_, q) => [A, B, C].reduce((s, p) => s + p[q], 0) / 3 - Q.P(cu, v, cy)[q]) as V3)
    }
}

/**
 * MENAGEM DE KRAGOR: corpo baixo (fecha o fundo do pátio, com o ARCO DA TRAVESSIA aceso), terraço com ameias,
 * corpo alto com as duas janelas góticas e o FRONTÃO com o losango, torres de canto com frestas vermelhas, a
 * TORRE DO TOPO (janela alta, coroa, losango e a FLECHA vermelha) e os dois CHIFRES. (x, z) = meio da frente.
 */
export function menagemKragor(c: Cena, x: number, z: number, ang: number, o: { w?: number; d: number }, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const W = o.w ?? 21, D = o.d
  const yT = 12 // terraço
  // corpo baixo: o meio (15 m) sobe a 12 m; os lados (até W) ficam em 8 m, com ameias
  const Wc = 15, wl = (W - Wc) / 2
  cx(g, Q, 0, -D / 2, Wc, D, 0, yT, BAS_ESC, BAS, BAS)
  bloq(c, Q, 0, -D / 2, W, D, yT)
  for (const s of [-1, 1]) {
    cx(g, Q, s * (Wc + wl) / 2, -D / 2, wl, D, 0, 8, BAS_ESC, BAS, BAS)
    ameias(g, GL, Q, s * Wc / 2, s * W / 2, 0.15, 8.35, 0.35, lod, 2, 0.4)
  }
  // ARCO DA TRAVESSIA (a saída) + janelas baixas
  janela(g, GL, Q, 0, 0.02, 0, 2.1, 4.6, 2.4, lod, 21)
  if (!lod) for (const s of [-1, 1]) janela(g, GL, Q, s * 6.5, 0.02, 4, 0.55, 6.6, 0.8, lod, 22 + s)
  // pilastras do corpo baixo
  for (const s of [-1, 1]) for (const uu of [3.4, Wc / 2 - 0.4]) cx(g, Q, s * uu, 0.2, 1, 0.5, 0, yT - 0.4, mix(BAS, BAS_CL, 0.2))
  // terraço: cornija + ameias com cristais
  cx(g, Q, 0, -D / 2, Wc + 0.6, D + 0.6, yT - 0.5, yT, BAS, BAS_CL, mix(BAS, BAS_CL, 0.25))
  misulas(g, GL, Q, -Wc / 2, Wc / 2, 0.3, yT - 0.5, lod)
  ameias(g, GL, Q, -Wc / 2 - 0.3, Wc / 2 + 0.3, 0.15, yT + 0.35, 0.35, lod, 2, 0.45)
  // corpo alto (recuado 1 m)
  const W2 = 14, v2 = -1, D2 = Math.min(12, D - 2), y2 = 16.9
  cx(g, Q, 0, v2 - D2 / 2, W2, D2, yT, y2 - 0.6, BAS_ESC, BAS, BAS)
  cx(g, Q, 0, v2 - D2 / 2, W2 + 0.5, D2 + 0.5, y2 - 0.6, y2, BAS, BAS_CL, mix(BAS, BAS_CL, 0.25))
  ameias(g, GL, Q, -W2 / 2 - 0.25, W2 / 2 + 0.25, v2 + 0.1, y2 + 0.35, 0.35, lod, 3, 0.4)
  if (!lod)
    for (const s of [-1, 1])
      for (const uu of [2.95, 6.1]) {
        cx(g, Q, s * uu, v2 + 0.2, 0.55, 0.45, yT, y2 - 0.6, mix(BAS, BAS_CL, 0.3))
        tronco(g, Q, s * uu, v2 + 0.2, y2 - 0.6, y2 + 0.3, 0.55, 0.45, 0.2, 0.2, mix(BAS, BAS_CL, 0.3))
      }
  // as DUAS JANELAS góticas grandes (u ±4,6; pé 12,3; ponta 15,5)
  for (const s of [-1, 1]) janela(g, GL, Q, s * 4.6, v2 + 0.02, 12.4, 0.95, 14.3, 1.25, lod, 30 + s)
  // FRONTÃO central: corpo saliente com telhado em V e o losango aceso
  const fw = 2.7, fv = v2 + 1.6
  cx(g, Q, 0, fv - 1.6, fw * 2, 3.2, 8, 13.6, BAS_ESC, undefined, BAS)
  poli(g, Q, [[-fw, 13.6], [fw, 13.6], [0, 16.7]], fv, BAS)
  for (const s of [-1, 1]) {
    const a = Q.P(s * (fw + 0.35), fv + 0.3, 13.3), b = Q.P(0, fv + 0.3, 17.1), b2 = Q.P(0, fv - 3.4, 17.1), a2 = Q.P(s * (fw + 0.35), fv - 3.4, 13.3)
    face(g, [a, b, b2, a2], [BAS_CL, BAS_CL, BAS, BAS], Q.N(s * 0.6, 0, 0.8))
    face(g, [a, b, Q.P(0, fv + 0.3, 16.2), Q.P(s * (fw - 0.6), fv + 0.3, 13.3)], mix(BAS, BAS_CL, 0.6), Q.N(0, 1))
  }
  losango(g, GL, Q, 0, 12.5, 1.5, fv + 0.02)
  // torres de canto do corpo alto (frestas vermelhas, pináculos altos)
  for (const s of [-1, 1]) {
    const u = s * (W2 / 2 + 0.2)
    cx(g, Q, u, v2 - 0.6, 2, 2, 8, 18.6, BAS_ESC, mix(BAS, BAS_CL, 0.3), BAS)
    cx(g, Q, u, v2 - 0.6, 2.4, 2.4, 18.2, 18.7, BAS, BAS_CL)
    if (!lod) {
      poli(GL, Q, [[u - 0.16, 13.8], [u + 0.16, 13.8], [u + 0.16, 16.4], [u, 16.9], [u - 0.16, 16.4]], v2 + 0.43, [VERM, VERM, FOGO_ESC, FOGO, FOGO_ESC])
      for (const du of [-0.75, 0.75]) pinaculo(g, Q, u + du, v2 + 0.3, 18.7, 0.3, 1.6, 0.25)
    }
    pinaculo(g, Q, u, v2 - 0.6, 18.7, 0.75, 2.5, 0.2)
    // pináculos do meio do corpo alto (os que ladeiam a torre do topo)
    if (!lod) for (const du of [2.2, 3.4]) pinaculo(g, Q, s * du, v2 - 0.4, y2 + 0.2, 0.32, 2 + (du > 3 ? 0.6 : 0), 0.3)
  }
  // TORRE DO TOPO
  const tw = 5.9, tv = v2 - 5, yt0 = y2, yt1 = 21.4
  cx(g, Q, 0, tv, tw, 5.2, yt0, yt1 - 0.7, BAS_ESC, undefined, BAS)
  if (!lod) for (const s of [-1, 1]) cx(g, Q, s * (tw / 2 - 0.15), tv + 2.5, 0.4, 0.4, yt0, yt1 - 0.7, mix(BAS, BAS_CL, 0.3))
  janela(g, GL, Q, 0, tv + 2.62, 17.5, 0.95, 19.4, 1.25, lod, 41)
  if (!lod) for (const s of [-1, 1]) poli(GL, Q, [[s * 2.1 - 0.12, 18], [s * 2.1 + 0.12, 18], [s * 2.1 + 0.12, 19.2], [s * 2.1, 19.5], [s * 2.1 - 0.12, 19.2]], tv + 2.63, [VERM, VERM, FOGO_ESC, FOGO, FOGO_ESC])
  misulas(g, GL, Q, -tw / 2, tw / 2, tv + 2.6, yt1 - 0.5, lod)
  cx(g, Q, 0, tv, tw + 0.8, 6, yt1 - 0.7, yt1, BAS, BAS_CL, mix(BAS, BAS_CL, 0.25))
  ameias(g, GL, Q, -tw / 2 - 0.4, tw / 2 + 0.4, tv + 2.85, yt1 + 0.35, 0.3, lod, 2, 0.36)
  // coroa do topo: losango aceso no meio, 4 pináculos, a FLECHA vermelha com facetas acesas
  for (const [su, sv] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) pinaculo(g, Q, su * (tw / 2 + 0.05), tv + sv * 2.7, yt1, 0.45, 3, 0.3)
  cx(g, Q, 0, tv + 0.4, 2.4, 2.4, yt1, yt1 + 1.4, BAS_ESC, BAS)
  losango(g, GL, Q, 0, yt1 + 0.2, 0.8, tv + 1.62)
  pinaculo(g, Q, 0, tv + 0.4, yt1 + 1.3, 1.25, 27.4 - yt1 - 1.3, 0.85)
  if (!lod) {
    // facetas acesas da flecha (vermelho → laranja) na metade de baixo, viradas para a frente
    const b = Q.P(0, tv + 1.68, yt1 + 1.3), l = Q.P(-0.9, tv + 1.3, yt1 + 1.3), r = Q.P(0.9, tv + 1.3, yt1 + 1.3), t = Q.P(0, tv + 0.75, yt1 + 4.4)
    face(GL, [l, b, t], [VERM, FOGO, VERM_CL], Q.N(-0.4, 1, 0.2))
    face(GL, [b, r, t], [FOGO, VERM, VERM_CL], Q.N(0.4, 1, 0.2))
    for (const s of [-1, 1]) pinaculo(g, Q, s * 1.15, tv + 1.4, yt1 + 1.3, 0.35, 2.4, 0.7)
  }
  // os CHIFRES: base atrás do corpo alto (u ±5,9, y 17,2), abrem para fora até u ±9,2 e voltam com a ponta a 27 m
  const curva: UV[] = [[5.6, 16.4], [6.9, 17.6], [8.3, 19.2], [9.1, 20.8], [9.25, 22.2], [8.8, 23.7], [8, 24.9], [7.1, 25.8], [6, 26.55], [4.9, 27]]
  for (const s of [-1, 1]) chifre(g, GL, Q, curva.map(([u, y]) => [s * u, y]), tv - 0.4, 2.2, lod)
  // pináculo nas costas (a silhueta de trás não fica lisa)
  if (!lod) for (const s of [-1, 1]) pinaculo(g, Q, s * (W / 2 - 1), -D + 1, yT + 0.4, 0.5, 2.6, 0.1)
}

/**
 * ARCADA (as muralhas das alas): pilares, arcos ogivais ABERTOS (vê-se o céu) e a faixa de cima com ameias e
 * cristais. De u0 a u1 no plano v (quadro já posto), pé y0, arranque yA, topo yT, espessura e.
 */
function arcada(g: G, GL: G, Q: Q, u0: number, u1: number, v: number, y0: number, yA: number, yT: number, e: number, lod: number) {
  const L = u1 - u0
  const n = Math.max(1, Math.round(Math.abs(L) / 1.55))
  const passo = L / n, pw = 0.45
  const vao = Math.abs(passo) - pw
  const hp = vao * 0.9
  for (let k = 0; k <= n; k++) cx(g, Q, u0 + passo * k, v, pw, e, y0, yA + 0.2, BAS_ESC, undefined, BAS)
  // faixa de cima: do arranque+ponta ao topo
  cx(g, Q, (u0 + u1) / 2, v, Math.abs(L) + pw, e, yA + hp, yT, BAS_ESC, undefined, BAS)
  // tímpanos (o que sobra entre os arcos ogivais e a faixa), frente e trás
  for (let k = 0; k < n; k++) {
    const uc = u0 + passo * (k + 0.5)
    const arc = lanceta(uc, yA, yA, vao / 2, hp, lod ? 2 : 4).slice(2) // só a curva
    for (const dv of [e / 2 + 0.01, -e / 2 - 0.01]) {
      // metade esquerda e direita do tímpano: polígonos (canto, curva…, ponta) — convexos o bastante para o leque
      const esq: UV[] = [[uc - Math.abs(passo) / 2, yA + hp], [uc - Math.abs(passo) / 2, yA], ...arc.slice(Math.ceil(arc.length / 2)).reverse()]
      const dir: UV[] = [[uc + Math.abs(passo) / 2, yA + hp], ...arc.slice(0, Math.ceil(arc.length / 2)), [uc + Math.abs(passo) / 2, yA]]
      poli(g, Q, esq, v + dv, BAS, dv < 0)
      poli(g, Q, dir, v + dv, BAS, dv < 0)
    }
  }
  // ameias com cristais
  ameias(g, GL, Q, u0 - pw / 2, u1 + pw / 2, v + e / 2 - 0.15, yT + 0.35, 0.3, lod, 2, 0.4)
}

/**
 * CASCATA DE LAVA: desce em degraus pela rocha ((u, v, y) de cada ponto, de cima para baixo). Cada trecho em 4
 * faixas no comprimento (borda vermelha → laranja → miolo amarelo → laranja), como os fios da ref; poça no pé.
 */
function cascata(GL: G, Q: Q, pts: [number, number, number][], w: number, lod: number, seed: number) {
  const faixas: [number, number, RGB, RGB][] = lod ? [[-0.5, 0.5, FOGO, FOGO_ESC]] : [[-0.5, -0.3, FOGO_ESC, mix(FOGO_ESC, VERM, 0.4)], [-0.3, -0.05, FOGO, FOGO_ESC], [-0.05, 0.22, FOGO_CL, FOGO], [0.22, 0.5, FOGO, FOGO_ESC]]
  for (let i = 0; i < pts.length - 1; i++) {
    const [ua, va, ya] = pts[i], [ub, vb, yb] = pts[i + 1]
    const wa = w * (1 + i * 0.15), wb = w * (1 + (i + 1) * 0.15)
    const n = Q.N(0, 1, ya > yb + 0.5 ? 0.25 : 1)
    const wob = (rnd(seed, i) - 0.5) * 0.3
    for (const [f0, f1, c0, c1] of faixas) {
      face(GL, [Q.P(ua + wa * f0, va, ya), Q.P(ua + wa * f1, va, ya), Q.P(ub + wb * (f1 + wob), vb, yb), Q.P(ub + wb * (f0 + wob), vb, yb)], [c0, c0, c1, c1], n)
    }
  }
  // poça no pé (leque achatado, borda irregular)
  const [ue, ve] = pts[pts.length - 1]
  const R = w * 2.2, k = lod ? 6 : 12
  const ctr = Q.P(ue, ve + R * 0.5, 0.05)
  for (let j = 0; j < k; j++) {
    const a0 = (j / k) * Math.PI * 2, a1 = ((j + 1) / k) * Math.PI * 2
    const r0 = R * (0.7 + rnd(seed, j, 3) * 0.5), r1 = R * (0.7 + rnd(seed, (j + 1) % k, 3) * 0.5)
    face(GL, [ctr, Q.P(ue + Math.cos(a0) * r0 * 1.5, ve + R * 0.5 + Math.sin(a0) * r0 * 0.7, 0.04), Q.P(ue + Math.cos(a1) * r1 * 1.5, ve + R * 0.5 + Math.sin(a1) * r1 * 0.7, 0.04)], [FOGO_CL, FOGO_ESC, FOGO_ESC], [0, 1, 0])
  }
}

/**
 * ROCHA DO MORRO (a da ref é o mesmo basalto ROXO do castelo, em blocos grandes de faces planas): prisma de
 * 5–7 faces que se inclinam, topo em leque com a quina clara, face da frente mais clara; algumas faces levam
 * uma FENDA de lava acesa. `s` ≈ meia largura; `h` opcional.
 */
function rochaK(g: G, GL: G, x: number, z: number, s: number, seed: number, lod: number, h0?: number) {
  const r = (q: number) => rnd(seed, q)
  const n = lod ? 5 : 6 + Math.floor(r(1) * 2)
  const h = h0 ?? s * (0.9 + r(2) * 0.6)
  const sx = (r(3) - 0.5) * s * 0.5, sz = (r(4) - 0.5) * s * 0.5
  const base: [number, number][] = [], top: [number, number][] = [], yt: number[] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (r(10 + k) - 0.5) * 0.6) / n) * Math.PI * 2
    const R = s * (0.85 + r(20 + k) * 0.35)
    base.push([Math.cos(a) * R, Math.sin(a) * R])
    const enc = 0.4 + r(30 + k) * 0.3
    top.push([Math.cos(a) * R * enc + sx, Math.sin(a) * R * enc + sz])
    yt.push(h * (0.78 + r(40 + k) * 0.3))
  }
  const ct: V3 = [x + sx, h * 1.03, z + sz]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (base[k][0] + base[j][0]) / 2, mz = (base[k][1] + base[j][1]) / 2
    // a frente (−z, quem chega) e a esquerda pegam a luz na ref; o fundo fica quase preto
    const luz = (-mx * 0.45 - mz * 0.7) / s
    const cor = luz > 0.35 ? BAS : luz > -0.3 ? mix(BAS, BAS_ESC, 0.5) : BAS_ESC
    const A: V3 = [x + base[k][0], 0, z + base[k][1]], B: V3 = [x + base[j][0], 0, z + base[j][1]]
    const C: V3 = [x + top[j][0], yt[j], z + top[j][1]], D: V3 = [x + top[k][0], yt[k], z + top[k][1]]
    face(g, [A, B, C, D], [mul(cor, 0.62), mul(cor, 0.62), cor, cor], [mx, 0.15, mz])
    face(g, [D, C, ct], [mix(cor, BAS_CL, 0.25), mix(cor, BAS_CL, 0.25), mix(BAS, BAS_CL, 0.2)], [mx * 0.4, 1, mz * 0.4])
    // fenda de lava (zigue-zague do pé até o meio da face), em ~1 de cada 4 faces
    if (!lod && r(60 + k) < 0.28) {
      const nl = Math.hypot(mx, mz) || 1, nx = (mx / nl) * 0.04, nz = (mz / nl) * 0.04
      const t0 = 0.3 + r(70 + k) * 0.4
      let px = A[0] + (B[0] - A[0]) * t0, pz = A[2] + (B[2] - A[2]) * t0, py = 0.05
      const tx = (B[0] - A[0]) / s, tz = (B[2] - A[2]) / s
      for (let q = 0; q < 3; q++) {
        const dy = h * 0.2, du = (r(80 + k * 3 + q) - 0.5) * 0.9
        const qx = px + tx * du * 0.5 - (mx / nl) * dy * 0.25, qz = pz + tz * du * 0.5 - (mz / nl) * dy * 0.25, qy = py + dy
        const w0 = 0.12 * (1 - q * 0.25), w1 = 0.12 * (1 - (q + 1) * 0.25)
        face(GL, [[px - tx * w0 + nx, py, pz - tz * w0 + nz], [px + tx * w0 + nx, py, pz + tz * w0 + nz], [qx + tx * w1 + nx, qy, qz + tz * w1 + nz], [qx - tx * w1 + nx, qy, qz - tz * w1 + nz]], [FOGO, FOGO, FOGO_ESC, FOGO_ESC], [mx, 0, mz])
        px = qx; pz = qz; py = qy
      }
    }
  }
  return h
}

/** Espinho de rocha (os pontudos da borda do morro): pirâmide de 5 faces inclinada. */
function espinho(g: G, p: V3, r: number, h: number, incl: V3, seed: number) {
  const n = 5
  const tip: V3 = [p[0] + incl[0] * h, p[1] + h, p[2] + incl[2] * h]
  const base = Array.from({ length: n }, (_, k): V3 => {
    const a = (k / n) * Math.PI * 2 + rnd(seed, 1)
    const rr = r * (0.8 + rnd(seed, k, 2) * 0.4)
    return [p[0] + Math.cos(a) * rr, p[1], p[2] + Math.sin(a) * rr]
  })
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (base[k][0] + base[j][0]) / 2 - p[0], mz = (base[k][2] + base[j][2]) / 2 - p[2]
    const cor = mz < 0 ? mix(BAS, BAS_CL, 0.15) : mx < 0 ? BAS : BAS_ESC
    face(g, [base[k], base[j], tip], [mul(cor, 0.7), mul(cor, 0.7), mix(cor, BAS_CL, 0.3)], [mx, 0.25, mz])
  }
}

/**
 * ALA (uma de cada lado, s = −1 esquerda / +1 direita de quem olha): o MORRO de rocha angulosa com as duas
 * CASCATAS de lava e os espinhos da borda; em cima, a torre alta (T1, com a PONTE em arco até a menagem), a
 * torre pequena (T2), a torre de fora (T3) e a ARCADA aberta ligando as três. Quadro do castelo.
 */
function ala(c: Cena, Q: Q, s: number, vMen: number, lod: number) {
  const P0 = Q.P(s * 18, -2, 0)
  const g = c.geo(P0[0], P0[2]), GL = c.glow(P0[0], P0[2])
  const yR = 3.8 // alto do morro
  // ── o morro: fileira da frente (mais baixa, quebrada) e o maciço de trás; tudo rocha facetada
  const rochas: [number, number, number][] = [
    [12.6, 6.2, 2.6], [14.9, 7.6, 3], [17.4, 7, 2.9], [19.8, 7.8, 3.2], [22.4, 6.6, 3.1], [24.9, 4.8, 2.9], [26.8, 2, 2.7], [27.6, -1.8, 2.5],
    [13.6, 3, 3.5], [16.4, 3.4, 3.7], [19.4, 3.5, 3.7], [22.4, 2.8, 3.5], [25, 0, 3.3], [13.5, -2.5, 3.6], [17, -2, 3.8], [20.5, -2.5, 3.8], [24, -3.5, 3.4],
    [13.5, -7, 3.8], [17.5, -7, 3.8], [21.5, -7, 3.8], [25, -7, 3], [14, -11.5, 3.6], [18, -11.5, 3.6], [22, -11.5, 3.4],
  ]
  for (let v = -16; v > vMen - 4; v -= 4.5) for (const u of [14, 18, 22]) rochas.push([u, v, 3.4])
  for (const [u, v, r] of lod ? rochas.filter((_, k) => k % 2 === 0) : rochas) {
    const p = Q.P(s * u, v, 0)
    const sd = Math.round(u * 7 + v * 13 + (s > 0 ? 500 : 0))
    // fileira da frente (v > 4,5): altura livre (o paredão quebrado da ref); atrás: rente ao platô
    const h0 = v > 4.5 ? undefined : v > 0 ? yR + 0.4 + rnd(sd, 5) * 0.8 : yR - 0.2 + rnd(sd, 5) * 0.4
    rochaK(c.geo(p[0], p[2]), c.glow(p[0], p[2]), p[0], p[2], r, sd, lod, h0)
  }
  // tampa do morro (plataforma onde as torres pisam)
  face(g, [Q.P(s * 11.5, 3.5, yR), Q.P(s * 26.5, 2.5, yR), Q.P(s * 26.5, vMen - 3, yR), Q.P(s * 11.5, vMen - 3, yR)], mul(BAS, 0.85), [0, 1, 0])
  // espinhos da borda
  if (!lod)
    for (const [u, v, r, h] of [[27.8, 3.6, 1.1, 5.2], [29.2, 0.4, 0.9, 4.2], [26.3, 6.4, 0.8, 3.2], [29.6, -4, 1, 4.6], [11.8, 8.4, 0.6, 2.2], [24.4, 8.1, 0.7, 2.6]] as const) {
      const p = Q.P(s * u, v, 0)
      espinho(g, p, r, h, Q.N(s * 0.12, 0.05), Math.round(u * 10 + v))
    }
  // ── cascatas de lava (2 por ala, degraus) e a poça
  cascata(GL, Q, [[s * 14.4, 4.2, yR + 1.4], [s * 14.7, 7.4, yR + 0.6], [s * 15.1, 9.2, 2.8], [s * 15.6, 10.2, 1.2], [s * 15.8, 11.2, 0.06]], 1.9, lod, 3 + s)
  cascata(GL, Q, [[s * 19.2, 4.4, yR + 1], [s * 19.4, 7.8, yR + 0.3], [s * 19.8, 9.8, 1.6], [s * 20.1, 11, 0.06]], 1.6, lod, 7 + s)
  // fendas acesas na rocha da frente (filetes de lava que escorrem)
  if (!lod)
    for (const [u, v] of [[12.8, 7.4], [17.5, 8.6], [22.5, 7.9], [25.5, 5.8]] as const) {
      const a = Q.P(s * u, v + 0.6, 1.8), b = Q.P(s * (u + 0.4), v + 1.6, 0.05)
      face(GL, [[a[0] - 0.12, a[1], a[2]], [a[0] + 0.12, a[1], a[2]], [b[0] + 0.25, b[1], b[2]], [b[0] - 0.25, b[1], b[2]]], [FOGO_ESC, FOGO_ESC, FOGO, FOGO], [0, 0.3, -1])
    }
  // ── torres em cima do morro
  const vT1 = vMen + 1.2
  const T1 = Q.P(s * 14.2, vT1, 0), T2 = Q.P(s * 16.2, -1.4, 0), T3 = Q.P(s * 21.4, -2.6, 0)
  torreCoroa(c, T1[0], T1[2], Q.rot * -1, { w: 4, y0: yR, h: 15.3, ponta: 21, seed: 3 + s }, lod)
  torreCoroa(c, T2[0], T2[2], Q.rot * -1, { w: 2.5, y0: yR, h: 8.9, ponta: 12, seed: 5 + s }, lod)
  torreCoroa(c, T3[0], T3[2], Q.rot * -1, { w: 3.7, y0: yR, h: 9, ponta: 13.8, talude: 3, seed: 7 + s }, lod)
  // arcada aberta entre T3 e T1 (passando por T2), na frente do morro
  arcada(g, GL, Q, s * 19.6, s * 17.4, -1.6, yR - 0.4, yR + 2.4, 7.6, 1.4, lod)
  arcada(g, GL, Q, s * 15, s * 11.6, -1.6, yR - 0.4, yR + 2.4, 7.6, 1.4, lod)
  // PONTE em arco de T1 até a torre de canto da menagem (deck a 13 m, arco ogival ABERTO embaixo)
  const uA = s * 12.2, uB = s * 8.2, pv = vT1
  const pm = Q.P(s * 9.9, pv, 0)
  const gp = c.geo(pm[0], pm[2])
  const um = (uA + uB) / 2, hwB = Math.abs(uA - uB) / 2
  cx(gp, Q, um, pv, 2 * hwB, 1.6, 12.4, 13.2, BAS_ESC, BAS_CL, BAS)
  ameias(gp, GL, Q, uA, uB, pv + 0.65, 13.55, 0.3, lod, 0)
  ameias(gp, GL, Q, uA, uB, pv - 0.65, 13.55, 0.3, lod, 0)
  const ac = lanceta(um, 9.2, 9.2, hwB - 0.15, 2.6, lod ? 2 : 4).slice(2)
  const h2 = Math.ceil(ac.length / 2)
  for (const dv of [0.81, -0.81]) {
    poli(gp, Q, [[um - hwB, 12.4], [um - hwB, 9.2], ...ac.slice(h2).reverse()], pv + dv, BAS_ESC, dv < 0)
    poli(gp, Q, [[um + hwB, 12.4], ...ac.slice(0, h2), [um + hwB, 9.2]], pv + dv, BAS_ESC, dv < 0)
    poli(gp, Q, [[um - hwB, 12.4], [um + hwB, 12.4], [um + hwB, 11.8], [um - hwB, 11.8]], pv + dv, BAS, dv < 0)
  }
  // colisão do morro (2 caixas) — o caminho e a praça ficam livres
  bloq(c, Q, s * 19.5, 1.5, 16, 14, yR + 1)
  bloq(c, Q, s * 19.5, (-5 + vMen - 3) / 2, 16, -(vMen - 3) - 5, yR + 1)
}

/**
 * VARANDA DA FRENTE: a mureta baixa com ameias e cristais (de cada lado da porta), as BALAUSTRADAS que abrem
 * em leque e os PEDESTAIS com cristal grande (3 pares, como na ref). Quadro do castelo (v = 0 = frente da muralha).
 */
function varanda(c: Cena, Q: Q, lod: number) {
  const P0 = Q.P(0, 5, 0)
  const g = c.geo(P0[0], P0[2]), GL = c.glow(P0[0], P0[2])
  const ped = (u: number, v: number, s: number) => {
    const p = Q.P(u, v, 0)
    const gg = c.geo(p[0], p[2]), GG = c.glow(p[0], p[2])
    tronco(gg, Q, u, v, 0, 0.35 * s, 1.5 * s, 1.5 * s, 1.35 * s, 1.35 * s, BAS_ESC, BAS)
    cx(gg, Q, u, v, 1.1 * s, 1.1 * s, 0.35 * s, 1.55 * s, BAS_ESC, undefined, BAS)
    if (!lod) poli(gg, Q, [[u - 0.32 * s, 0.6 * s], [u + 0.32 * s, 0.6 * s], [u + 0.32 * s, 1.3 * s], [u - 0.32 * s, 1.3 * s]], v + 0.56 * s, BAS_SOMBRA)
    tronco(gg, Q, u, v, 1.55 * s, 1.8 * s, 1.45 * s, 1.45 * s, 1.3 * s, 1.3 * s, BAS, BAS_CL, mix(BAS, BAS_CL, 0.3))
    cx(gg, Q, u, v, 0.6 * s, 0.6 * s, 1.8 * s, 1.95 * s, BAS_ESC, BAS_CL)
    cristal(GG, Q.P(u, v, 2.75 * s), 1.25 * s, lod, 0.7)
    bloq(c, Q, u, v, 1.5 * s, 1.5 * s, 2)
  }
  const corrimao = (a: UV, b: UV) => {
    // balaustrada: plinto, balaústres e o corrimão largo
    const pa = Q.P(a[0], a[1], 0), pb = Q.P(b[0], b[1], 0)
    tube(g, [pa[0], 0.25, pa[2]], [pb[0], 0.25, pb[2]], 0.38, 0.38, 4, (k) => (k % 2 ? BAS_ESC : BAS), false)
    tube(g, [pa[0], 1.05, pa[2]], [pb[0], 1.05, pb[2]], 0.3, 0.3, 4, (k) => (k === 1 ? BAS_CL : k % 2 ? BAS : mix(BAS, BAS_CL, 0.4)), false)
    if (!lod) {
      const L = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]), n = Math.max(2, Math.round(L / 0.45))
      for (let k = 1; k < n; k++) {
        const t = k / n
        const x = pa[0] + (pb[0] - pa[0]) * t, z = pa[2] + (pb[2] - pa[2]) * t
        tube(g, [x, 0.45, z], [x, 0.85, z], 0.09, 0.09, 4, (j) => (j % 2 ? BAS : BAS_ESC), false)
      }
    }
  }
  // tapete de lajes claras entre as balaustradas (onde a ref tem os degraus): fiadas largas com junta escura
  if (!lod)
    for (let v = 0.7, i = 0; v < 12; v += 1.1, i++) {
      const hw = 3.2 + v * 0.5
      const y = 0.035
      face(g, [Q.P(-hw, v, y), Q.P(hw, v, y), Q.P(hw + 0.5, v + 1, y), Q.P(-hw - 0.5, v + 1, y)], i % 2 ? mix(BAS, BAS_CL, 0.35) : mix(BAS, BAS_CL, 0.25), [0, 1, 0])
      face(g, [Q.P(-hw - 0.42, v + 1, y), Q.P(hw + 0.42, v + 1, y), Q.P(hw + 0.42, v + 1.1, y), Q.P(-hw - 0.42, v + 1.1, y)], BAS_SOMBRA, [0, 1, 0])
    }
  for (const s of [-1, 1]) {
    ped(s * 3.6, 1.2, 0.85)
    ped(s * 7, 5.4, 1)
    ped(s * 10.6, 11, 1.25)
    corrimao([s * 3.6, 1.2], [s * 7, 5.4])
    corrimao([s * 7, 5.4], [s * 10.6, 11])
    // mureta com ameias e cristais (de 6,7 a 12,6), na frente das torres
    cx(g, Q, s * 9.7, 4.2, 5.8, 1.1, 0, 1.6, BAS_ESC, undefined, BAS)
    ameias(g, GL, Q, s * 6.8, s * 12.6, 4.6, 1.95, 0.3, lod, 2, 0.4)
    bloq(c, Q, s * 9.7, 4.2, 5.8, 1.1, 2)
  }
}

/**
 * O CASTELO INTEIRO sobre a pegada `K` da planta (contrato `dominio.ts`; frente para −z). Devolve o centro do
 * arco da travessia e o topo da flecha (para luz/som).
 */
export function casteloKragor(c: Cena, K: CasteloPlanta, lod = 0) {
  const ang = Math.PI
  const x0 = K.porta.x, zf = K.porta.z - 1.5 // frente da muralha
  const Q = quadro(x0, zf, ang)
  const vMen = -(K.patio.z1 - zf) // frente da menagem (fundo do pátio)
  const fundo = K.z + K.d / 2 - K.patio.z1
  const patioHw = (K.patio.x1 - K.patio.x0) / 2
  const gW = c.geo(x0, zf), GW = c.glow(x0, zf)
  // ── muralha da frente (dos lados do portal até as torres) com os estandartes
  for (const s of [-1, 1]) {
    cx(gW, Q, s * 6.25, -1.5, 4.1, 3, 0, 8.1, BAS_ESC, undefined, BAS)
    if (!lod) for (const uu of [4.6, 7.9]) cx(gW, Q, s * uu, 0.1, 0.5, 0.3, 0, 7.6, mix(BAS, BAS_CL, 0.2))
    cx(gW, Q, s * 6.25, -1.5, 4.5, 3.4, 7.6, 8.15, BAS, BAS_CL, mix(BAS, BAS_CL, 0.25))
    ameias(gW, GW, Q, s * 4.3, s * 8.3, 0.0, 8.5, 0.3, lod, 2, 0.42)
    estandarte(gW, GW, Q, s * 6.35, 0.08, 7.9, 1.95, 6.2)
    bloq(c, Q, s * 6.25, -1.5, 4.1, 3, 8.1)
  }
  portalKragor(c, Q.P(0, 0, 0)[0], Q.P(0, 0, 0)[2], ang, lod)
  // torres da frente (com talude)
  for (const s of [-1, 1]) {
    const p = Q.P(s * 9.3, -1.4, 0)
    torreCoroa(c, p[0], p[2], ang, { w: 3.6, h: 11, ponta: 16, talude: 5.2, seed: 11 + s }, lod)
  }
  // laterais do pátio (muralhas lisas com ameias por dentro e por fora)
  for (const s of [-1, 1]) {
    const L = -vMen - 3.3, vm = -3.2 - L / 2
    const pm = Q.P(s * (patioHw + 1.5), vm, 0)
    const gg = c.geo(pm[0], pm[2]), GG = c.glow(pm[0], pm[2])
    cx(gg, Q, s * (patioHw + 1.5), vm, 2.4, L, 0, 9, BAS_ESC, BAS)
    bloq(c, Q, s * (patioHw + 1.5), vm, 2.4, L, 9)
    void GG
  }
  // pátio: lajes escuras com fendas acesas (o salão do deus) — só cor no chão da cena; aqui, braseiros nos cantos
  // menagem no fundo do pátio
  const pM = Q.P(0, vMen, 0)
  menagemKragor(c, pM[0], pM[2], ang, { w: patioHw * 2 + 4, d: Math.max(10, fundo) }, lod)
  // alas no morro e a varanda
  for (const s of [-1, 1]) ala(c, Q, s, vMen, lod)
  varanda(c, Q, lod)
  return { arco: Q.P(0, vMen, 3), flecha: Q.P(0, vMen - 6, 27.4) }
}
