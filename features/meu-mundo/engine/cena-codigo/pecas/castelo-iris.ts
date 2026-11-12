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
