// features/meu-mundo/engine/cena-codigo/pecas/castelo-iris.ts — o PALÁCIO PRISMA da Íris pela CÓPIA
// MINUCIOSA da ref `ref/dominios/castelo-iris.png` (inventário `MEU MUNDO 3D/pipeline/pecas-codigo/copia/
// inventario/castelo-iris.json`, ~30 px/m). Construído AOS POUCOS: uma peça por vez, cada uma com âncoras
// e rodadas pela folha; o castelo inteiro é a montagem delas.
//
// Contrato igual ao de `orbital.ts`: (c, x, z, ang, …, lod); a FRENTE olha para (sin ang, cos ang); u =
// direita de quem olha a frente, v = para fora, y = cima (y = 0 = alto da escadaria).

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul, rnd, tube } from "../kit-natureza"
import { BRANCO, MARMORE, MARMORE_ESC, MARMORE_SOMBRA, OURO, bloco, quadro } from "./orbital"
import type { CasteloPlanta } from "../dominio"

// ── paleta (recortes do inventário: vitral e cristal da ref são SATURADOS; mármore quase branco) ──
export const VIT_AMARELO: RGB = [1, 0.86, 0.42]
export const VIT_CIANO: RGB = [0.42, 0.9, 1]
export const VIT_AZUL: RGB = [0.42, 0.56, 1]
export const VIT_LILAS: RGB = [0.72, 0.52, 1]
export const VIT_ROSA: RGB = [1, 0.5, 0.86]

type G = ReturnType<Cena["geo"]>

/**
 * Contorno de LANCETA (arco ogival alto, a ponta sobe `Hp` acima do arranque): lados retos de y0 até yb e
 * dois arcos que se cruzam na ponta. Pontos (u, y) em volta, começando no pé esquerdo.
 */
export function lanceta(u: number, y0: number, yb: number, hw: number, Hp: number, seg: number): [number, number][] {
  const R = (hw * hw + Hp * Hp) / (2 * hw)
  const aTopo = Math.atan2(Hp, -(R - hw)) // ângulo da ponta visto do centro do arco esquerdo
  const pts: [number, number][] = [[u - hw, y0], [u + hw, y0]]
  // lado direito: centro em (u + hw − R, yb), de 0 até (π − aTopo)
  for (let k = 0; k <= seg; k++) {
    const t = (k / seg) * (Math.PI - aTopo)
    pts.push([u + hw - R + R * Math.cos(t), yb + R * Math.sin(t)])
  }
  // lado esquerdo: centro em (u − hw + R, yb), de aTopo até π
  for (let k = 1; k <= seg; k++) {
    const t = aTopo + (k / seg) * (Math.PI - aTopo)
    pts.push([u - hw + R + R * Math.cos(t), yb + R * Math.sin(t)])
  }
  return pts
}

/** Losango aceso com moldura de ouro (os medalhões da ref), no plano v, centro (u, y), meia-altura h. */
function losango(g: G, GL: G, Q: ReturnType<typeof quadro>, u: number, y: number, h: number, v: number, cor: RGB) {
  const w = h * 0.62
  face(g, [Q.P(u, v, y - h - 0.12), Q.P(u + w + 0.1, v, y), Q.P(u, v, y + h + 0.12), Q.P(u - w - 0.1, v, y)], OURO, Q.N(0, 1))
  // 4 facetas (o cristal facetado: claro em cima à esquerda, fundo embaixo à direita)
  const c0 = Q.P(u, v + 0.06, y)
  const P4: V3[] = [Q.P(u, v + 0.04, y - h), Q.P(u + w, v + 0.04, y), Q.P(u, v + 0.04, y + h), Q.P(u - w, v + 0.04, y)]
  const tons: RGB[] = [mul(cor, 0.8), cor, mix(cor, BRANCO, 0.55), mix(cor, BRANCO, 0.25)]
  for (let k = 0; k < 4; k++) face(GL, [P4[k], P4[(k + 1) % 4], c0], [tons[k], tons[(k + 1) % 4], mix(cor, BRANCO, 0.6)], Q.N(0, 1))
}

/**
 * VITRAL FACETADO (o vidro da ref é feito de cacos de tons diferentes): o contorno, um anel interno a meio
 * caminho do centro (com tremor) e o centro; cada triângulo sorteia o tom (mais claro/mais fundo) em volta
 * da cor do lugar (`cor(y)`). No plano v, sempre à frente da moldura.
 */
export function vitral(GL: G, Q: ReturnType<typeof quadro>, cont: [number, number][], ctr: [number, number], v: number, cor: (y: number) => RGB, lod: number, seed: number) {
  const n = cont.length
  const tom = (k: number, j: number, y: number): RGB => {
    const t = rnd(seed, k, j) - 0.5
    const base = cor(y)
    return t > 0 ? mix(base, BRANCO, t * 0.9) : mul(base, 1 + t * 0.5)
  }
  const C = Q.P(ctr[0], v + 0.01, ctr[1])
  if (lod) {
    for (let k = 0; k < n; k++) {
      const a = cont[k], b = cont[(k + 1) % n]
      face(GL, [Q.P(a[0], v, a[1]), Q.P(b[0], v, b[1]), C], [cor(a[1]), cor(b[1]), mix(cor(ctr[1]), BRANCO, 0.3)], Q.N(0, 1))
    }
    return
  }
  const mid = cont.map(([u, y], k): [number, number] => [u + (ctr[0] - u) * (0.5 + (rnd(seed, k, 9) - 0.5) * 0.15), y + (ctr[1] - y) * (0.5 + (rnd(seed, k, 8) - 0.5) * 0.15)])
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const A = Q.P(cont[k][0], v, cont[k][1]), B = Q.P(cont[j][0], v, cont[j][1])
    const M = Q.P(mid[k][0], v + 0.005, mid[k][1]), N = Q.P(mid[j][0], v + 0.005, mid[j][1])
    face(GL, [A, B, M], tom(k, 1, cont[k][1]), Q.N(0, 1))
    face(GL, [B, N, M], tom(k, 2, mid[k][1]), Q.N(0, 1))
    face(GL, [M, N, C], [tom(k, 3, mid[k][1]), tom(k, 3, mid[j][1]), mix(cor(ctr[1]), BRANCO, 0.45)], Q.N(0, 1))
  }
}

/** Prisma de cristal de `lados` faces com ponta, facetas em cores alternadas (o cristal da ref). */
export function prisma(GL: G, base: V3, topo: V3, r: number, ponta: number, lados: number, cores: RGB[], rot = 0, ricas = false) {
  const dx = topo[0] - base[0], dy = topo[1] - base[1], dz = topo[2] - base[2]
  const L = Math.hypot(dx, dy, dz) || 1
  const ax: V3 = [dx / L, dy / L, dz / L]
  // base ortonormal em volta do eixo
  const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let e1: V3 = [ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]]
  const l1 = Math.hypot(...e1)
  e1 = [e1[0] / l1, e1[1] / l1, e1[2] / l1]
  const e2: V3 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]]
  const ring = (p: V3, rr: number) => Array.from({ length: lados }, (_, k): V3 => {
    const a = rot + (k / lados) * Math.PI * 2
    return [p[0] + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * rr, p[1] + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * rr, p[2] + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * rr]
  })
  const r0 = ring(base, r * 0.92), r1 = ring(topo, r)
  const tip: V3 = [topo[0] + ax[0] * ponta, topo[1] + ax[1] * ponta, topo[2] + ax[2] * ponta]
  for (let k = 0; k < lados; k++) {
    const j = (k + 1) % lados
    const a = (k + 0.5) / lados * Math.PI * 2 + rot
    const n: V3 = [e1[0] * Math.cos(a) + e2[0] * Math.sin(a), e1[1] * Math.cos(a) + e2[1] * Math.sin(a), e1[2] * Math.cos(a) + e2[2] * Math.sin(a)]
    const c = cores[k % cores.length]
    if (ricas) {
      // a face em 2 triângulos de tom diferente + uma faixa clara (o reflexo) no meio da altura
      const mid0: V3 = [(r0[k][0] + r1[k][0]) / 2, (r0[k][1] + r1[k][1]) / 2, (r0[k][2] + r1[k][2]) / 2]
      const mid1: V3 = [(r0[j][0] + r1[j][0]) / 2, (r0[j][1] + r1[j][1]) / 2, (r0[j][2] + r1[j][2]) / 2]
      face(GL, [r0[k], r0[j], mid1], [mul(c, 0.75), mul(c, 0.85), c], n)
      face(GL, [r0[k], mid1, mid0], [mul(c, 0.75), c, mix(c, BRANCO, 0.1)], n)
      face(GL, [mid0, mid1, r1[j]], [mix(c, BRANCO, 0.35), mix(c, BRANCO, 0.2), mix(c, BRANCO, 0.05)], n)
      face(GL, [mid0, r1[j], r1[k]], [mix(c, BRANCO, 0.35), mix(c, BRANCO, 0.05), mul(c, 0.95)], n)
    } else face(GL, [r0[k], r0[j], r1[j], r1[k]], [mul(c, 0.82), mul(c, 0.82), mix(c, BRANCO, 0.15), mix(c, BRANCO, 0.15)], n)
    face(GL, [r1[k], r1[j], tip], [mix(c, BRANCO, 0.2), mix(c, BRANCO, 0.2), mix(c, BRANCO, 0.7)], [n[0] + ax[0], n[1] + ax[1], n[2] + ax[2]])
  }
}

/**
 * PORTAL DA MENAGEM (inventário `portal-menagem`): empena de 8 m (beiral 9,7, cume 14,6) com friso de ouro;
 * a LANCETA de mármore saliente do chão até perto do cume, com moldura de ouro e VITRAL aceso (porta
 * amarelo→ciano embaixo, lilás→azul em cima), 3 montantes, travessa no arranque, rendilhado em Y, 2
 * medalhões em losango; contrafortes com capitel e pináculo de cristal; atrás, o CRISTAL-MESTRE (22,7 m)
 * com 2 lascas. Ocupa ~9 × 6 m; põe a própria caixa.
 */
export function portalMenagem(c: Cena, x: number, z: number, ang: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), GL = c.glow(x, z)
  const W = 8, hw = W / 2, yBeiral = 9.7, yCume = 14.6, prof = 5
  // corpo da empena (o bloco) e o telhado de duas águas
  bloco(g, Q, 0, -prof / 2, W, prof, 0, yBeiral, MARMORE, MARMORE_SOMBRA)
  face(g, [Q.P(-hw, 0, yBeiral), Q.P(hw, 0, yBeiral), Q.P(0, 0, yCume)], MARMORE, Q.N(0, 1))
  for (const s of [-1, 1]) face(g, [Q.P(s * hw, 0, yBeiral), Q.P(0, 0, yCume), Q.P(0, -prof, yCume), Q.P(s * hw, -prof, yBeiral)], MARMORE_SOMBRA, Q.N(s * 0.6, 0, 0.8))
  // friso de ouro nas águas da empena (a linha dourada forte da ref)
  for (const s of [-1, 1]) tube(g, Q.P(s * (hw + 0.15), 0.18, yBeiral - 0.1), Q.P(0, 0.18, yCume + 0.25), 0.2, 0.2, 4, () => OURO, false)
  c.block(x, z, hw + 1.2, prof / 2 + 1, yCume, Q.rot)

  // ── JANELA ALTA (atrás e acima da porta): lanceta lilás→azul com rendilhado em Y e losango no alto ──
  const seg = lod ? 4 : 8
  const jHw = 2.45, jy0 = 6.5, jyb = 10, jHp = 13.3 - jyb
  const poliL = (geo: G, pts: [number, number][], v: number, cor: RGB) => face(geo, pts.map(([pu, py]) => Q.P(pu, v, py)), cor, Q.N(0, 1))
  poliL(g, lanceta(0, jy0, jyb, jHw + 0.55, jHp + 0.75, seg), 0.12, mix(MARMORE, BRANCO, 0.5))
  poliL(g, lanceta(0, jy0, jyb, jHw + 0.2, jHp + 0.28, seg), 0.2, OURO)
  // a janela alta da ref é AZUL e ciano; o lilás só no alto (último terço)
  const corAlto = (py: number): RGB => { const t = Math.min(1, Math.max(0, (py - jy0) / (jyb + jHp - jy0))); return t < 0.65 ? mix(mix(VIT_AZUL, VIT_CIANO, 0.35), VIT_AZUL, t / 0.65) : mix(VIT_AZUL, VIT_LILAS, (t - 0.65) / 0.35) }
  vitral(GL, Q, lanceta(0, jy0, jyb, jHw, jHp, seg), [0, jy0 + (jyb + jHp - jy0) * 0.45], 0.26, corAlto, lod, 3)
  if (!lod) {
    const vt = 0.32
    bloco(g, Q, 0, vt, 0.12, 0.08, jy0, jyb + jHp * 0.9, OURO)
    for (const sg of [-1, 1]) {
      bloco(g, Q, sg * jHw * 0.5, vt, 0.1, 0.08, jy0, jyb, OURO)
      tube(g, Q.P(sg * jHw * 0.5, vt + 0.02, jyb), Q.P(0, vt + 0.02, jyb + jHp * 0.6), 0.06, 0.06, 4, () => OURO, false)
      tube(g, Q.P(sg * jHw, vt + 0.02, jyb), Q.P(sg * jHw * 0.5, vt + 0.02, jyb + jHp * 0.55), 0.05, 0.05, 4, () => OURO, false)
    }
    losango(g, GL, Q, 0, jyb + jHp * 0.62, 0.55, vt + 0.08, VIT_CIANO)
  }

  // ── a PORTA: arco ogival próprio (arranque 4,7, ponta 7,7), arquivolta GROSSA de mármore que avança, moldura
  // de ouro dupla e vitral amarelo→ciano facetado; o losango grande na ponta ──
  const pHw = 2.2, pyb = 4.7, pHp = 7.7 - pyb
  poliL(g, lanceta(0, 0, pyb, pHw + 0.95, pHp + 1.05, seg), 0.75, mix(MARMORE, BRANCO, 0.6))
  if (!lod) {
    // espessura da arquivolta (lados de mármore à sombra) e soleira
    for (const sg of [-1, 1]) bloco(g, Q, sg * (pHw + 0.6), 0.38, 0.7, 0.74, 0, pyb, MARMORE_SOMBRA, MARMORE)
    bloco(g, Q, 0, 0.45, 2 * (pHw + 1), 0.9, 0, 0.14, MARMORE_SOMBRA, MARMORE)
    poliL(g, lanceta(0, 0, pyb, pHw + 0.62, pHp + 0.7, seg), 0.8, OURO)
    poliL(g, lanceta(0, 0, pyb, pHw + 0.45, pHp + 0.5, seg), 0.84, mix(MARMORE, BRANCO, 0.4))
  }
  poliL(g, lanceta(0, 0, pyb, pHw + 0.16, pHp + 0.2, seg), 0.88, OURO)
  // porta: OURO forte embaixo (a luz de dentro), ciano no alto
  const OURO_VIT: RGB = [1, 0.74, 0.22]
  const corPorta = (py: number): RGB => (py < 2.6 ? mix(OURO_VIT, VIT_AMARELO, py / 2.6) : mix(VIT_AMARELO, VIT_CIANO, Math.min(1, (py - 2.6) / 4.2)))
  vitral(GL, Q, lanceta(0, 0, pyb, pHw, pHp, seg), [0, 3.4], 0.93, corPorta, lod, 7)
  if (!lod) {
    const vt = 0.99
    for (const du of [-pHw / 2, 0, pHw / 2]) bloco(g, Q, du, vt, 0.11, 0.08, 0, du ? pyb : pyb + pHp * 0.9, OURO)
    for (const sg of [-1, 1]) tube(g, Q.P(sg * pHw / 2, vt + 0.02, pyb), Q.P(0, vt + 0.02, pyb + pHp * 0.6), 0.06, 0.06, 4, () => OURO, false)
    losango(g, GL, Q, 0, 7.95, 1.0, vt + 0.12, VIT_CIANO)
  }
  // a empena ganha a segunda linha de ouro por dentro (a moldura dupla da ref)
  if (!lod) for (const sg of [-1, 1]) tube(g, Q.P(sg * (hw - 0.55), 0.12, yBeiral + 0.15), Q.P(0, 0.12, yCume - 0.55), 0.09, 0.09, 4, () => OURO, false)

  // contrafortes dos dois lados: pilar em 2 degraus, capitel de ouro, pináculo de cristal
  for (const s of [-1, 1]) {
    const u = s * (hw + 0.1)
    bloco(g, Q, u, 0.2, 1.1, 1.6, 0, 6.5, mix(MARMORE, BRANCO, 0.3), MARMORE)
    bloco(g, Q, u, 0.05, 0.85, 1.2, 6.5, 10.6, mix(MARMORE, BRANCO, 0.3), MARMORE)
    if (!lod) {
      bloco(g, Q, u, 0.2, 1.3, 1.8, 6.3, 6.6, OURO)
      bloco(g, Q, u, 0.05, 1.05, 1.4, 10.4, 10.75, OURO)
    }
    prisma(GL, Q.P(u, 0.05, 10.7), Q.P(u, 0.05, 11.6), 0.4, 1.4, lod ? 4 : 6, [VIT_CIANO, VIT_LILAS, VIT_ROSA])
  }

  // o CRISTAL-MESTRE atrás da empena: prisma de 6 faces, 5 m de largura, ponta em 22,7 m; em volta, o CACHO
  // de lascas da ref (4 por lado, alturas e inclinações diferentes, mais saturadas)
  const cm: RGB[] = [[0.62, 0.42, 1], [1, 0.42, 0.8], [1, 0.8, 0.3], [0.3, 0.84, 1], [0.86, 0.66, 1], [0.38, 0.5, 1]]
  prisma(GL, Q.P(0, -2.6, 8.5), Q.P(0, -2.6, 18.2), 2.5, 4.5, lod ? 4 : 6, cm, 0.26, true)
  const lascas: [number, number, number, number, number][] = [[2.3, 11.5, 16.4, 0.8, 0.9], [3.2, 10.5, 14.2, 0.6, 1.3], [1.6, 13, 18, 0.55, 0.3], [3.9, 10, 12.4, 0.45, 1.6]]
  for (const sg of [-1, 1])
    for (const [du, y0, y1, r, tilt] of lod ? lascas.slice(0, 1) : lascas)
      prisma(GL, Q.P(sg * du, -2.1 - r, y0), Q.P(sg * (du + tilt), -2.1 - r, y1), r, r * 2, 5, sg < 0 ? [VIT_CIANO, VIT_LILAS, VIT_ROSA] : [VIT_ROSA, VIT_AMARELO, VIT_CIANO], du)
  // sombra de contato: rodapé escuro na base da empena
  if (!lod) bloco(g, Q, 0, 0.02, W + 0.1, 0.1, 0, 0.35, MARMORE_ESC)
}

// ═══════════════ AS PEÇAS QUE FALTAVAM (2–9) E A MONTAGEM ═══════════════

type Qd = ReturnType<typeof quadro>
type UV = [number, number]
/** Facetas de cristal da ref: rosa → amarelo → ciano → azul → lilás (o "prisma" da Íris). */
const PRISMA_CORES: RGB[] = [VIT_ROSA, VIT_AMARELO, VIT_CIANO, VIT_AZUL, VIT_LILAS, [1, 0.7, 0.9]]
/** Colisão no quadro: a de engine/collision.ts gira AO CONTRÁRIO do frame do kit (−rot). */
function bloqQ(c: Cena, Q: Qd, u: number, v: number, w: number, d: number, h: number) {
  const p = Q.P(u, v, 0)
  c.block(p[0], p[2], w / 2, d / 2, h, -Q.rot)
}
const poliQ = (g: G, Q: Qd, pts: UV[], v: number, cor: RGB | RGB[], dentro = false) => face(g, pts.map(([u, y]) => Q.P(u, v, y)), cor, Q.N(0, dentro ? -1 : 1))

/** Anel octogonal de mármore entre y0 e y1 (centro u, v), faces alternando luz e meia-sombra; frente clara. */
function oct(g: G, Q: Qd, u: number, v: number, y0: number, y1: number, r0: number, r1: number, cor: RGB = MARMORE, n = 8) {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + Math.PI / n, a1 = ((k + 1) / n) * Math.PI * 2 + Math.PI / n, am = (a0 + a1) / 2
    const frente = Math.sin(am) > 0.2
    const cc = frente ? cor : k % 2 ? mix(cor, MARMORE_SOMBRA, 0.5) : MARMORE_SOMBRA
    face(g, [Q.P(u + Math.cos(a0) * r0, v + Math.sin(a0) * r0, y0), Q.P(u + Math.cos(a1) * r0, v + Math.sin(a1) * r0, y0), Q.P(u + Math.cos(a1) * r1, v + Math.sin(a1) * r1, y1), Q.P(u + Math.cos(a0) * r1, v + Math.sin(a0) * r1, y1)], [mul(cc, 0.92), mul(cc, 0.92), cc, cc], Q.N(Math.cos(am), Math.sin(am)))
  }
}
/** Tampa octogonal. */
function octTampa(g: G, Q: Qd, u: number, v: number, y: number, r: number, cor: RGB, n = 8) {
  face(g, Array.from({ length: n }, (_, k) => Q.P(u + Math.cos((k / n) * Math.PI * 2 + Math.PI / n) * r, v + Math.sin((k / n) * Math.PI * 2 + Math.PI / n) * r, y)), cor, [0, 1, 0])
}
/** Janela lanceta acesa (moldura de mármore + vitral facetado), na face de frente (+v) de raio r de uma torre. */
function janelaL(g: G, GL: G, Q: Qd, u: number, v: number, y0: number, hw: number, h: number, cor: (t: number) => RGB, lod: number, seed: number) {
  const yb = y0 + h * 0.7, hp = h * 0.3, seg = lod ? 3 : 5
  poliQ(g, Q, lanceta(u, y0 - 0.15, yb, hw + 0.22, hp + 0.3, seg), v, mix(MARMORE, BRANCO, 0.5))
  poliQ(g, Q, lanceta(u, y0 - 0.06, yb, hw + 0.09, hp + 0.12, seg), v + 0.02, OURO)
  vitral(GL, Q, lanceta(u, y0, yb, hw, hp, seg), [u, y0 + h * 0.45], v + 0.05, (y) => cor((y - y0) / h), lod, seed)
}
/** Coroa: varanda (anel com friso de ouro e balaústres), pináculos de ouro em volta e o CRISTAL no meio. */
function coroa(g: G, GL: G, Q: Qd, u: number, v: number, y: number, r: number, cr: number, ch: number, lod: number, seed: number) {
  oct(g, Q, u, v, y - 0.5, y, r * 0.9, r * 1.25, MARMORE)
  octTampa(g, Q, u, v, y, r * 1.25, MARMORE)
  oct(g, Q, u, v, y - 0.62, y - 0.48, r * 0.92, r * 0.92, OURO)
  const n = 8
  if (!lod)
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2
      tube(g, Q.P(u + Math.cos(a) * r * 1.18, v + Math.sin(a) * r * 1.18, y), Q.P(u + Math.cos(a) * r * 1.18, v + Math.sin(a) * r * 1.18, y + 0.7), 0.06, 0.06, 4, () => OURO, false)
    }
  oct(g, Q, u, v, y + 0.7, y + 0.82, r * 1.2, r * 1.2, OURO)
  // pináculos de ouro em volta (8) e o tambor do cristal
  for (let k = 0; k < (lod ? 4 : n); k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2
    const p = Q.P(u + Math.cos(a) * r * 1.15, v + Math.sin(a) * r * 1.15, 0)
    tube(g, [p[0], y + 0.82, p[2]], [p[0], y + 1.9, p[2]], 0.13, 0.02, 4, (j) => (j % 2 ? OURO : mix(OURO, BRANCO, 0.4)), true)
  }
  oct(g, Q, u, v, y, y + 1, r * 0.72, r * 0.6, mix(MARMORE, BRANCO, 0.3))
  oct(g, Q, u, v, y + 1, y + 1.2, r * 0.68, r * 0.68, OURO)
  const pc = Q.P(u, v, y + 1.2)
  prisma(GL, pc, [pc[0], pc[1] + ch * 0.68, pc[2]], cr, ch * 0.32, lod ? 4 : 6, PRISMA_CORES.slice(seed % 3).concat(PRISMA_CORES.slice(0, seed % 3)), seed * 0.7, !lod)
  // as lascas em volta do cristal (a ref: um cacho, não uma pedra só)
  if (!lod) for (const s of [-1, 1]) {
    const b = Q.P(u + s * cr * 0.9, v, y + 1.1)
    prisma(GL, b, Q.P(u + s * cr * 1.5, v, y + 1.1 + ch * 0.4), cr * 0.45, ch * 0.2, 5, PRISMA_CORES.slice(2).concat(PRISMA_CORES.slice(0, 2)), seed + s)
  }
}

/**
 * TORRE (inventário `torre-alta`, `torre-media`, `torre-canto`): corpo octogonal de mármore com pilastras de
 * quina claras, 2–3 janelas lanceta acesas em azul/lilás (o vidro da ref degrada para ciano em cima), frisos de
 * ouro, a coroa (varanda + pináculos de ouro + cristal); `estandarte` = o pano lilás-rosa com losango da torre de
 * canto. (u, v) no quadro do castelo; `h` = topo do corpo; `topo` = ponta do cristal.
 */
export function torrePrisma(c: Cena, Q: Qd, u: number, v: number, o: { r: number; h: number; topo: number; janelas?: number; estandarte?: boolean; seed?: number; y0?: number }, lod = 0) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  const { r, h } = o
  const y0 = o.y0 ?? 0, seed = o.seed ?? 1
  oct(g, Q, u, v, y0, y0 + 1, r * 1.22, r * 1.12)
  oct(g, Q, u, v, y0 + 1, h, r * 1.02, r)
  oct(g, Q, u, v, y0 + 0.95, y0 + 1.2, r * 1.14, r * 1.14, OURO)
  if (!lod) for (const yy of [y0 + (h - y0) * 0.5]) oct(g, Q, u, v, yy, yy + 0.22, r * 1.06, r * 1.06, OURO)
  // pilastras de quina (as duas da frente) claras
  if (!lod) for (const s of [-1, 1]) {
    const a = Math.PI / 2 + s * (Math.PI / 4)
    tube(g, Q.P(u + Math.cos(a) * r * 1.02, v + Math.sin(a) * r * 1.02, y0 + 1), Q.P(u + Math.cos(a) * r, v + Math.sin(a) * r, h), 0.16, 0.16, 4, () => mix(MARMORE, BRANCO, 0.5), false)
  }
  // janelas: uma por face da frente (as 2 que olham para fora e a do meio), em 1 ou 2 alturas
  const nj = o.janelas ?? 1
  const azul = (t: number): RGB => (t < 0.6 ? mix(VIT_AZUL, VIT_LILAS, t / 0.6) : mix(VIT_LILAS, VIT_CIANO, (t - 0.6) / 0.4))
  for (let q = 0; q < nj; q++) {
    const yy = y0 + 1.6 + q * ((h - y0 - 2.2) / nj)
    const hj = Math.min(4.2, (h - y0 - 2.4) / nj - 0.6)
    janelaL(g, GL, Q, u, v + r * 0.93 + 0.02, yy, r * 0.32, hj, azul, lod, seed * 10 + q)
    if (!lod) for (const s of [-1, 1]) {
      // as das faces oblíquas: um pouco recuadas e mais estreitas
      janelaL(g, GL, Q, u + s * r * 0.62, v + r * 0.62 + 0.04, yy + 0.3, r * 0.18, hj * 0.82, azul, lod, seed * 10 + q + s * 3)
    }
  }
  if (o.estandarte) {
    // pano lilás-rosa com borda de ouro, ponta em V e o losango de ouro aceso
    const vv = v + r * 1.05, yT = h - 0.6, w = r * 0.9, H = (h - y0) * 0.55
    poliQ(GL, Q, [[u - w / 2, yT], [u + w / 2, yT], [u + w / 2, yT - H * 0.86], [u, yT - H], [u - w / 2, yT - H * 0.86]], vv, [VIT_LILAS, VIT_LILAS, VIT_ROSA, mix(VIT_ROSA, BRANCO, 0.2), VIT_ROSA])
    for (const s of [-1, 1]) poliQ(g, Q, [[u + s * w / 2, yT], [u + s * (w / 2 + 0.1), yT], [u + s * (w / 2 + 0.1), yT - H * 0.86], [u + s * w / 2, yT - H * 0.86]], vv + 0.01, OURO)
    poliQ(GL, Q, [[u, yT - H * 0.62], [u + 0.32, yT - H * 0.44], [u, yT - H * 0.26], [u - 0.32, yT - H * 0.44]], vv + 0.02, VIT_AMARELO)
    tube(g, Q.P(u - w / 2 - 0.2, vv, yT + 0.1), Q.P(u + w / 2 + 0.2, vv, yT + 0.1), 0.07, 0.07, 4, () => OURO, false)
  }
  coroa(g, GL, Q, u, v, h, r, r * 0.46, o.topo - h - 1.2, lod, seed)
  bloqQ(c, Q, u, v, r * 2.3, r * 2.3, h)
}

/**
 * ALA EM ARCADA (inventário `ala-arcada`): dois andares de arcos de mármore ABERTOS (embaixo arcos menores sobre
 * pilares com base; em cima os arcos grandes em ponte, que deixam ver o céu), a balaustrada de ouro no alto e as
 * janelas lanceta acesas na parede de trás. De u0 a u1 (u0 < u1), frente em v.
 */
export function alaArcada(c: Cena, Q: Qd, u0: number, u1: number, v: number, lod = 0) {
  const pm = Q.P((u0 + u1) / 2, v, 0)
  const g = c.geo(pm[0], pm[2]), GL = c.glow(pm[0], pm[2])
  const L = u1 - u0, D = 2.2
  const yA = 5.6, yT = 10.5
  // parede de trás (com as janelas lanceta acesas, que aparecem pelos arcos)
  bloco(g, Q, (u0 + u1) / 2, v - D - 0.6, L, 1.2, 0, yT - 0.6, MARMORE_SOMBRA, MARMORE)
  const nJ = Math.max(1, Math.round(L / 3))
  for (let k = 0; k < nJ; k++) {
    const uj = u0 + (L * (k + 0.5)) / nJ
    janelaL(g, GL, Q, uj, v - D, 1.2, 0.55, 3.4, (t) => mix(VIT_AZUL, VIT_CIANO, t), lod, 70 + k)
  }
  // andar de baixo: pilares e arcos de lanceta (em 2 tímpanos por vão, frente e trás)
  const n1 = Math.max(2, Math.round(L / 2.6)), p1 = L / n1
  for (let k = 0; k <= n1; k++) {
    const u = u0 + p1 * k
    bloco(g, Q, u, v - D / 2, 0.6, D, 0, yA, MARMORE, mix(MARMORE, BRANCO, 0.4))
    bloco(g, Q, u, v - D / 2, 0.85, D + 0.2, 0, 0.45, MARMORE_SOMBRA, MARMORE)
  }
  // tímpano = o que sobra entre o arco e o retângulo do vão, em duas metades; cada metade é um leque a partir do
  // CANTO de cima (que enxerga o arco inteiro) — sem ponto repetido no pé (3 pontos alinhados zeram a normal)
  const tim = (uc: number, hw: number, ya: number, hp: number, yTop: number, vv: number, dentro: boolean) => {
    const seg = lod ? 2 : 4
    const ar = lanceta(uc, ya, ya, hw, hp, seg).slice(2) // lado direito (pé → ponta), depois o esquerdo (ponta → pé)
    const dir = ar.slice(0, seg + 1) // pé direito … ponta
    const esq = ar.slice(seg + 1) // depois da ponta … pé esquerdo
    const ponta = dir[dir.length - 1]
    poliQ(g, Q, [[uc - hw, yTop], ...esq.slice().reverse(), ponta, [uc, yTop]], vv, MARMORE, dentro)
    poliQ(g, Q, [[uc + hw, yTop], [uc, yTop], ponta, ...dir.slice(0, -1).reverse()], vv, MARMORE, dentro)
  }
  for (let k = 0; k < n1; k++) {
    const uc = u0 + p1 * (k + 0.5), hw = p1 / 2 - 0.3
    tim(uc, hw, 3.4, hw * 1.2, yA, v + 0.01, false)
    tim(uc, hw, 3.4, hw * 1.2, yA, v - D - 0.01, true)
  }
  // laje entre os andares com friso de ouro e balaústre
  bloco(g, Q, (u0 + u1) / 2, v - D / 2, L + 0.6, D + 0.4, yA, yA + 0.5, mix(MARMORE, BRANCO, 0.3), MARMORE)
  bloco(g, Q, (u0 + u1) / 2, v + 0.21, L + 0.6, 0.06, yA + 0.08, yA + 0.22, OURO)
  // andar de cima: arcos grandes (2 vãos) em ponte, abertos
  const n2 = Math.max(1, Math.round(L / 5)), p2 = L / n2
  for (let k = 0; k <= n2; k++) bloco(g, Q, u0 + p2 * k, v - D / 2, 0.7, D, yA + 0.5, yT, MARMORE, mix(MARMORE, BRANCO, 0.4))
  for (let k = 0; k < n2; k++) {
    const uc = u0 + p2 * (k + 0.5), hw = p2 / 2 - 0.35
    tim(uc, hw, yA + 2.4, hw * 0.9, yT, v + 0.01, false)
    tim(uc, hw, yA + 2.4, hw * 0.9, yT, v - D - 0.01, true)
  }
  bloco(g, Q, (u0 + u1) / 2, v - D / 2, L + 0.8, D + 0.4, yT, yT + 0.45, mix(MARMORE, BRANCO, 0.3), MARMORE)
  // balaustrada de ouro no alto
  if (!lod) {
    const nb = Math.round(L / 0.5)
    for (let k = 0; k <= nb; k++) tube(g, Q.P(u0 + (L * k) / nb, v + 0.05, yT + 0.45), Q.P(u0 + (L * k) / nb, v + 0.05, yT + 1.15), 0.05, 0.05, 4, () => OURO, false)
    tube(g, Q.P(u0, v + 0.05, yT + 1.15), Q.P(u1, v + 0.05, yT + 1.15), 0.08, 0.08, 4, () => OURO, false)
  }
  bloqQ(c, Q, (u0 + u1) / 2, v - D / 2 - 0.3, L, D + 1.2, yT)
}

/** PEDESTAL DO LOSANGO (inventário `pedestal-losango`): bloco de mármore em 3 andares, friso de ouro, o losango de ouro aceso na frente e o cristal facetado em cima. */
export function pedestalLosango(c: Cena, Q: Qd, u: number, v: number, lod = 0, s = 1) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  bloco(g, Q, u, v, 1.9 * s, 1.9 * s, 0, 0.4 * s, MARMORE_SOMBRA, MARMORE)
  bloco(g, Q, u, v, 1.5 * s, 1.5 * s, 0.4 * s, 2.1 * s, MARMORE, mix(MARMORE, BRANCO, 0.4))
  bloco(g, Q, u, v, 1.62 * s, 1.62 * s, 1.9 * s, 2.15 * s, OURO)
  bloco(g, Q, u, v, 1.8 * s, 1.8 * s, 2.15 * s, 2.6 * s, mix(MARMORE, BRANCO, 0.4), BRANCO)
  // losango de ouro com o miolo aceso
  const vv = v + 0.76 * s, cy = 1.25 * s, hh = 0.5 * s
  poliQ(g, Q, [[u, cy - hh - 0.1], [u + hh * 0.7 + 0.08, cy], [u, cy + hh + 0.1], [u - hh * 0.7 - 0.08, cy]], vv, OURO)
  poliQ(GL, Q, [[u, cy - hh * 0.7], [u + hh * 0.48, cy], [u, cy + hh * 0.7], [u - hh * 0.48, cy]], vv + 0.02, [mix(OURO, VIT_AMARELO, 0.4), VIT_AMARELO, [1, 0.97, 0.8], VIT_AMARELO])
  const pc = Q.P(u, v, 2.6 * s)
  prisma(GL, pc, [pc[0], pc[1] + 1.2 * s, pc[2]], 0.55 * s, 0.9 * s, lod ? 4 : 6, PRISMA_CORES, u, !lod)
  prisma(GL, pc, [pc[0], pc[1] - 0.05, pc[2]], 0.5 * s, 0.4 * s, lod ? 4 : 6, [VIT_LILAS, VIT_AZUL], u)
  bloqQ(c, Q, u, v, 1.9 * s, 1.9 * s, 2.6 * s)
}

/** CANTEIRO DE CRISTAIS (inventário `canteiro-cristal-grande`): caixa de mármore com borda de ouro, flores lilás e um tufo de 5–7 cristais grandes (rosa, amarelo, ciano). */
export function canteiroCristais(c: Cena, Q: Qd, u: number, v: number, w: number, lod = 0, seed = 1) {
  const p = Q.P(u, v, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  const d = w * 0.62
  bloco(g, Q, u, v, w, d, 0, 0.9, MARMORE, mix(MARMORE, BRANCO, 0.3))
  bloco(g, Q, u, v, w + 0.12, d + 0.12, 0.82, 0.98, OURO)
  // terra e flores (tufos lilás e rosa em bolinhas de 4 faces)
  bloco(g, Q, u, v, w - 0.3, d - 0.3, 0.9, 0.95, [0.32, 0.5, 0.26])
  if (!lod) for (let k = 0; k < 14; k++) {
    const fu = u + (rnd(seed, k) - 0.5) * (w - 0.6), fv = v + (rnd(seed, k, 2) - 0.5) * (d - 0.6)
    const fp = Q.P(fu, fv, 1.05)
    tube(g, [fp[0], 0.95, fp[2]], [fp[0], 1.25, fp[2]], 0.2, 0.12, 5, () => (k % 3 ? [0.86, 0.36, 0.9] : [1, 0.5, 0.82]), true)
  }
  // cristais (o maior no meio, os outros inclinados para fora)
  const n = lod ? 3 : 6
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(seed, k, 3), dd = k ? w * 0.22 : 0
    const bu = u + Math.cos(a) * dd, bv = v + Math.sin(a) * dd * 0.6
    const hh = (k ? 1.4 + rnd(seed, k, 4) * 0.8 : 2.8) * (w / 5)
    const base = Q.P(bu, bv, 0.9), tip = Q.P(bu + Math.cos(a) * hh * (k ? 0.35 : 0), bv + Math.sin(a) * hh * (k ? 0.2 : 0), 0.9 + hh)
    prisma(GL, base, tip, (k ? 0.28 : 0.45) * (w / 5), hh * 0.35, lod ? 4 : 6, PRISMA_CORES.slice(k % 4).concat(PRISMA_CORES.slice(0, k % 4)), a, !lod && k === 0)
  }
  bloqQ(c, Q, u, v, w, d, 1)
}

/**
 * FONTE COM CASCATA (inventário `fonte-cascata`): terraço de mármore com espelho d'água ciano aceso, a CASCATA
 * caindo pela frente num rasgo da mureta, o painel de vitral ARCO-ÍRIS na mureta e os losangos de ouro. De u0 a u1.
 */
export function fonteCascata(c: Cena, Q: Qd, u0: number, u1: number, v: number, lod = 0) {
  const pm = Q.P((u0 + u1) / 2, v, 0)
  const g = c.geo(pm[0], pm[2]), GL = c.glow(pm[0], pm[2])
  const L = u1 - u0, D = 4.6, H = 1.8
  bloco(g, Q, (u0 + u1) / 2, v - D / 2, L, D, 0, H, MARMORE, mix(MARMORE, BRANCO, 0.3))
  // espelho d'água
  face(GL, [Q.P(u0 + 0.5, v - 0.5, H + 0.03), Q.P(u1 - 0.5, v - 0.5, H + 0.03), Q.P(u1 - 0.5, v - D + 0.5, H + 0.03), Q.P(u0 + 0.5, v - D + 0.5, H + 0.03)], [VIT_CIANO, mix(VIT_CIANO, BRANCO, 0.4), VIT_CIANO, mix(VIT_CIANO, VIT_AZUL, 0.4)], [0, 1, 0])
  // borda de ouro
  bloco(g, Q, (u0 + u1) / 2, v - 0.25, L, 0.5, H, H + 0.3, mix(MARMORE, BRANCO, 0.4), BRANCO)
  bloco(g, Q, (u0 + u1) / 2, v + 0.02, L, 0.04, H - 0.2, H - 0.05, OURO)
  // a cascata: fita acesa caindo pela frente (do bico da mureta ao chão) com a espuma embaixo
  const uc = u0 + L * 0.3, cw = Math.min(2.6, L * 0.22)
  const n = lod ? 1 : 4
  for (let k = 0; k < n; k++) {
    const a = uc - cw / 2 + (cw * k) / n, b = a + cw / n
    face(GL, [Q.P(a, v + 0.1, H + 0.3), Q.P(b, v + 0.1, H + 0.3), Q.P(b + 0.05, v + 0.45, 0.05), Q.P(a - 0.05, v + 0.45, 0.05)], k % 2 ? [mix(VIT_CIANO, BRANCO, 0.6), mix(VIT_CIANO, BRANCO, 0.6), VIT_CIANO, VIT_CIANO] : [VIT_CIANO, VIT_CIANO, VIT_AZUL, VIT_AZUL], Q.N(0, 1, 0.1))
  }
  face(GL, [Q.P(uc - cw / 2 - 0.4, v + 0.4, 0.04), Q.P(uc + cw / 2 + 0.4, v + 0.4, 0.04), Q.P(uc + cw / 2 + 0.6, v + 1.4, 0.04), Q.P(uc - cw / 2 - 0.6, v + 1.4, 0.04)], [BRANCO, BRANCO, VIT_CIANO, VIT_CIANO], [0, 1, 0])
  // painel de vitral arco-íris na frente da mureta (o resto do comprimento) e os losangos de ouro
  const pu0 = uc + cw / 2 + 0.5, pu1 = u1 - 0.6
  if (pu1 - pu0 > 1) {
    const m = lod ? 2 : 6
    for (let k = 0; k < m; k++) {
      const a = pu0 + ((pu1 - pu0) * k) / m, b = a + (pu1 - pu0) / m
      poliQ(GL, Q, [[a, 0.3], [b, 0.3], [b + 0.3, H - 0.35], [a + 0.3, H - 0.35]], v + 0.02, PRISMA_CORES[k % PRISMA_CORES.length])
      if (!lod) poliQ(g, Q, [[b - 0.03, 0.3], [b + 0.03, 0.3], [b + 0.33, H - 0.35], [b + 0.27, H - 0.35]], v + 0.03, OURO)
    }
  }
  bloqQ(c, Q, (u0 + u1) / 2, v - D / 2, L, D, H)
}

/**
 * MENAGEM DO FUNDO (fecha o fundo do pátio; inventado — a ref só mostra a frente): corpo de mármore com o ARCO
 * da travessia aceso (lanceta grande de vitral), janelas lanceta, friso de ouro e a balaustrada; duas torres finas
 * com cristal nas quinas.
 */
function menagemFundo(c: Cena, Q: Qd, v: number, W: number, D: number, lod: number) {
  const p = Q.P(0, v - D / 2, 0)
  const g = c.geo(p[0], p[2]), GL = c.glow(p[0], p[2])
  const H = 11
  bloco(g, Q, 0, v - D / 2, W, D, 0, H, MARMORE, mix(MARMORE, BRANCO, 0.3))
  bloco(g, Q, 0, v + 0.02, W, 0.06, H - 1, H - 0.8, OURO)
  janelaL(g, GL, Q, 0, v + 0.02, 0, 2.2, 7.8, (t) => (t < 0.4 ? mix(VIT_AMARELO, VIT_CIANO, t / 0.4) : mix(VIT_CIANO, VIT_LILAS, (t - 0.4) / 0.6)), lod, 91)
  for (const s of [-1, 1]) for (const du of [5, 8]) if (du < W / 2 - 0.8) janelaL(g, GL, Q, s * du, v + 0.02, 3, 0.6, 4.2, (t) => mix(VIT_AZUL, VIT_CIANO, t), lod, 92 + du * s)
  bloqQ(c, Q, 0, v - D / 2, W, D, H)
  for (const s of [-1, 1]) torrePrisma(c, Q, s * (W / 2 - 0.4), v - 1.2, { r: 1.4, h: 13, topo: 17.5, seed: 8 + s }, lod)
}

/**
 * O PALÁCIO PRISMA INTEIRO sobre a `CasteloPlanta` (frente para −z). O PORTAL-MENAGEM copiado é a frente (a porta
 * de vitral é atravessável: o jogador entra por ela no pátio); torres altas, segundas, médias e de canto; as alas
 * em arcada; pedestais, canteiros, fontes com cascata e a praça com o tapete (a escadaria da ref, plana).
 */
export function casteloIris(c: Cena, K: CasteloPlanta, lod = 0) {
  const ang = Math.PI
  const x0 = K.porta.x, zf = K.porta.z - 1.5
  const Q = quadro(x0, zf, ang)
  const vMen = -(K.patio.z1 - zf)
  const fundo = K.z + K.d / 2 - K.patio.z1
  const patioHw = (K.patio.x1 - K.patio.x0) / 2
  // o portal copiado: a caixa dele fecharia a porta — troco por duas (os contrafortes), o vão fica livre
  const nB = c.blockers.length
  const p0 = Q.P(0, 0, 0)
  portalMenagem(c, p0[0], p0[2], ang, lod)
  c.blockers.splice(nB)
  for (const s of [-1, 1]) bloqQ(c, Q, s * 3.3, -2.5, 2.4, 5.6, 14)
  // torres
  for (const s of [-1, 1]) {
    torrePrisma(c, Q, s * 4.9, -1.6, { r: 1.5, h: 13.6, topo: 20.5, janelas: 2, seed: 1 + (s > 0 ? 1 : 0) }, lod)
    torrePrisma(c, Q, s * 7.6, -2.6, { r: 1.5, h: 10.8, topo: 16.2, janelas: 2, seed: 3 + (s > 0 ? 1 : 0) }, lod)
    torrePrisma(c, Q, s * 12.6, -2, { r: 1.9, h: 10.2, topo: 15.6, janelas: 2, seed: 5 + (s > 0 ? 1 : 0) }, lod)
    torrePrisma(c, Q, s * 18.9, -0.4, { r: 2.1, h: 7.4, topo: 11.5, janelas: 1, estandarte: true, seed: 7 + (s > 0 ? 1 : 0) }, lod)
    // torrinhas baixas entre a média e o canto (as de cristal pequeno da ref)
    torrePrisma(c, Q, s * 15.6, -2.4, { r: 0.8, h: 7.2, topo: 9.2, seed: 9 + (s > 0 ? 1 : 0) }, lod)
  }
  // alas em arcada (entre a segunda e a média, e entre a média e o canto)
  for (const s of [-1, 1]) {
    const a = s < 0 ? [-11, -9.2] : [9.2, 11]
    alaArcada(c, Q, a[0], a[1], -1.4, lod)
    const b = s < 0 ? [-17.4, -14.2] : [14.2, 17.4]
    alaArcada(c, Q, b[0], b[1], -0.6, lod)
  }
  // laterais do pátio
  for (const s of [-1, 1]) {
    const L = -vMen - 4.5, vm = -4.5 - L / 2
    const pm = Q.P(s * (patioHw + 1.5), vm, 0)
    const gg = c.geo(pm[0], pm[2])
    bloco(gg, Q, s * (patioHw + 1.5), vm, 2.4, L, 0, 9, MARMORE, mix(MARMORE, BRANCO, 0.3))
    bloqQ(c, Q, s * (patioHw + 1.5), vm, 2.4, L, 9)
  }
  menagemFundo(c, Q, vMen, patioHw * 2 + 4, Math.max(8, fundo), lod)
  // a frente: pedestais, canteiros de cristal e as fontes com cascata
  for (const s of [-1, 1]) {
    pedestalLosango(c, Q, s * 6.2, 2.8, lod)
    pedestalLosango(c, Q, s * 9.6, 6.6, lod, 1.15)
    canteiroCristais(c, Q, s * 10.6, 2.6, 5, lod, 11 + (s > 0 ? 1 : 0))
    canteiroCristais(c, Q, s * 23.4, 1.4, 3.6, lod, 13 + (s > 0 ? 1 : 0))
    fonteCascata(c, Q, s < 0 ? -22 : 14.5, s < 0 ? -14.5 : 22, 4.2, lod)
  }
  // a praça (a escadaria da ref): o TAPETE lilás-rosa com a borda de ouro e as faixas dos degraus em mármore
  {
    const p = Q.P(0, 4, 0)
    const g = c.geo(p[0], p[2])
    for (let k = 0; k < 9; k++) {
      const v0 = 0.4 + k * 0.9, w = 4.6 + k * 0.25
      face(g, [Q.P(-w, v0, 0.03), Q.P(w, v0, 0.03), Q.P(w, v0 + 0.9, 0.03), Q.P(-w, v0 + 0.9, 0.03)], k % 2 ? mix(MARMORE, BRANCO, 0.5) : MARMORE, [0, 1, 0])
    }
    face(g, [Q.P(-1.6, 0.4, 0.045), Q.P(1.6, 0.4, 0.045), Q.P(1.6, 8.5, 0.045), Q.P(-1.6, 8.5, 0.045)], [VIT_LILAS, VIT_LILAS, VIT_ROSA, VIT_ROSA], [0, 1, 0])
    for (const s of [-1, 1]) face(g, [Q.P(s * 1.6, 0.4, 0.05), Q.P(s * 1.85, 0.4, 0.05), Q.P(s * 1.85, 8.5, 0.05), Q.P(s * 1.6, 8.5, 0.05)], OURO, [0, 1, 0])
  }
  return { arco: Q.P(0, vMen, 3), cristal: Q.P(0, -2.6, 22.7) }
}
