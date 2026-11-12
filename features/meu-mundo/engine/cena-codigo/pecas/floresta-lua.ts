// features/meu-mundo/engine/cena-codigo/pecas/floresta-lua.ts — PEÇAS COPIADAS da FLORESTA DA LUA (Noctis)
// pela cópia minuciosa (skill meu-mundo-cenario-codigo, `copia.md`). Inventário:
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/floresta-lua.json` (recortes, contagem, medidas).
// Construídas aos poucos, uma por vez, cada uma com âncoras e rodadas pela folha (luz de luar do jogo).
//
// Contrato: (c, x, z, …, lod). Peças redondas (árvore, rochedo) não têm frente; `seed` varia a forma.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { blob, face, mix, mul, rnd, tube, type Foliage } from "../kit-natureza"

// ── paleta (recortes do inventário, ajustada ao luar do jogo) ──
export const LAVANDA: RGB = [0.96, 0.96, 1] // tronco ao luar (lado claro)
export const LAVANDA_S: RGB = [0.7, 0.7, 0.9] // tronco à sombra
// o lado de baixo recebe só o "chão" do luar (violeta escuro): dark bem claro para sair verde-azulado
export const COPA: Foliage = { dark: [0.16, 0.58, 0.66], mid: [0.16, 0.64, 0.7], hi: [0.56, 0.94, 0.94] }
export const COPA_FUNDO: Foliage = { dark: [0.14, 0.42, 0.62], mid: [0.14, 0.5, 0.7], hi: [0.34, 0.7, 0.86] }

/** Cor do tronco por faceta: alterna claro e sombra (o facetado da ref) e escurece no pé (contato). */
const casca = (k: number, y: number, h: number): RGB => mul(k % 2 ? LAVANDA : mix(LAVANDA, LAVANDA_S, 0.55), 0.78 + 0.22 * Math.min(1, y / (h * 0.3)))

/**
 * ÁRVORE DA LUA (inventário `arvore-media`, 12 m): tronco branco-lavanda facetado em 2 trechos tortos,
 * 4 raízes-contraforte que abrem no pé (base ~3,9 m), forquilha logo abaixo da copa com 3–4 galhos em leque
 * (cada um com 2 galhinhos) e a COPA EM GUARDA-CHUVA: largura ≈ altura, 5,5 m de espessura, blocos
 * facetados (miolo grande + anel de 7 + chapéu de 3), claros em cima e azul-petróleo embaixo.
 */
export function arvoreLua(c: Cena, x: number, z: number, h = 12, seed = 1, lod = 0, folhas: Foliage = COPA, perto = true) {
  const eco = lod > 0 || !perto // longe do caminho: mesma silhueta, ~1/3 das peças
  const g = c.geo(x, z)
  const k = h / 12
  const r = (q: number) => rnd(seed, q)
  // tronco em 2 trechos com desvio (torto), raio 0,95 → 0,7
  const dx = (r(1) - 0.5) * 0.8 * k, dz = (r(2) - 0.5) * 0.8 * k
  const meio: V3 = [x + dx, h * 0.27, z + dz]
  const fork: V3 = [x - dx * 0.4, h * 0.5, z - dz * 0.4]
  const lados = lod ? 4 : eco ? 5 : 7
  // pé em CONE (a ref abre muito embaixo) e tronco grosso (~2,2 m)
  tube(g, [x, 0, z], [x + dx * 0.3, h * 0.1, z + dz * 0.3], 1.9 * k, 1.2 * k, lados, (j) => casca(j, 0, h), false)
  tube(g, [x + dx * 0.3, h * 0.1, z + dz * 0.3], meio, 1.2 * k, 1.05 * k, lados, (j) => casca(j, h * 0.15, h), false)
  tube(g, meio, fork, 1.05 * k, 0.78 * k, lados, (j) => casca(j, h, h), false)
  // raízes-contraforte: do tronco (1–1,6 m) até o chão a ~2 m, achatando
  const nr = eco ? 3 : 4
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2 + r(3) * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    // contraforte LARGO: sai alto do tronco (2,4 m) e desce abrindo até 2,5 m do centro
    tube(g, [x + ca * 0.45 * k, 2.4 * k, z + sa * 0.45 * k], [x + ca * 1.5 * k, 0.5 * k, z + sa * 1.5 * k], 0.62 * k, 0.4 * k, 4, (j) => casca(j + i, 1, h), false)
    if (!eco) tube(g, [x + ca * 1.5 * k, 0.5 * k, z + sa * 1.5 * k], [x + ca * 2.5 * k, 0, z + sa * 2.5 * k], 0.4 * k, 0.15 * k, 4, (j) => casca(j + i, 0.2, h), false)
  }
  // galhos em leque da forquilha até o fundo da copa, com 2 galhinhos cada
  const ng = eco ? 3 : 4
  const pontas: V3[] = []
  for (let i = 0; i < ng; i++) {
    const a = (i / ng) * Math.PI * 2 + r(4) * 2
    const L = (2.6 + r(5 + i) * 1.2) * k
    const tip: V3 = [fork[0] + Math.cos(a) * L, h * 0.68, fork[2] + Math.sin(a) * L]
    tube(g, fork, tip, 0.4 * k, 0.18 * k, 5, (j) => casca(j, h, h), false)
    pontas.push(tip)
    if (!eco)
      for (const s of [-1, 1]) {
        const b = a + s * 0.5
        tube(g, tip, [tip[0] + Math.cos(b) * 1.3 * k, h * 0.74, tip[2] + Math.sin(b) * 1.3 * k], 0.14 * k, 0.05 * k, 3, () => LAVANDA, false)
      }
  }
  // COPA em guarda-chuva ALTA (o fundo dela em 0,64 h: os galhos em leque aparecem embaixo): miolo achatado,
  // anel externo de 10 lombos menores, anel do meio de 5 e chapéu de 3 — a ref é feita de muitos lombos
  const yC = h * 0.8
  blob(g, [fork[0], yC, fork[2]], [h * 0.3, h * 0.15, h * 0.3], folhas, seed)
  const anel = (n: number, R0: number, dR: number, s0: number, dy: number, sd: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r(sd) * 2
      const R = h * (R0 + r(sd + 1 + i) * dR)
      const s = h * (s0 + r(sd + 20 + i) * 0.04)
      blob(g, [fork[0] + Math.cos(a) * R, yC + dy * h + (r(sd + 40 + i) - 0.5) * h * 0.04, fork[2] + Math.sin(a) * R], [s, s * 0.7, s], folhas, seed + sd + i)
    }
  }
  anel(lod ? 4 : eco ? 6 : 8, 0.34, 0.06, lod ? 0.16 : eco ? 0.15 : 0.12, -0.04, 50)
  if (!eco) anel(5, 0.3, 0.06, 0.11, -0.11, 300) // lombos baixos pendendo na beira (o fundo bojudo da ref)
  if (!eco) anel(3, 0.18, 0.05, 0.14, 0.06, 120)
  anel(lod ? 0 : eco ? 2 : 3, 0.07, 0.03, 0.13, 0.13, 200)
  c.block(x, z, 1.1 * k, 1.1 * k, h)
  return pontas
}

// ── peças 2–4: rochedo com musgo, flor da lua, tufo prateado ──

// base QUENTE de propósito: o luar do jogo é azul forte e puxa tudo para o azul-marinho
export const PEDRA_CL: RGB = [1, 0.92, 0.95] // face do rochedo que pega o luar
export const PEDRA: RGB = [0.82, 0.74, 0.82]
export const PEDRA_S: RGB = [0.62, 0.55, 0.68]
export const MUSGO: RGB = [0.74, 0.84, 0.3]
export const MUSGO_S: RGB = [0.56, 0.7, 0.2]
export const LUZ_FLOR: RGB = [0.16, 0.82, 0.98]
export const LUZ_FLOR_CL: RGB = [0.62, 0.96, 1]

/**
 * ROCHEDO COM MUSGO (inventário `rochedo-musgo`, ~4 × 2,4 m) — o matacão da ref: corpo de 6 faces planas
 * quase verticais (uma pega o luar, as outras em 2 tons de sombra), TOPO grande e chato quase do tamanho
 * da pedra, inclinado para a frente, com as quinas de cima chanfradas; o MUSGO cobre o topo inteiro e
 * escorre pelas faces numa SAIA de borda serrilhada (~20% da altura, mais longa na frente). Põe a caixa.
 */
export function rochedoMusgo(c: Cena, x: number, z: number, w = 4, h = 2.4, seed = 1, lod = 0, caixa = true) {
  const g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = 6
  const base: [number, number][] = [], quina: [number, number][] = [], topo: [number, number][] = []
  const sx = (r(11) - 0.5) * w * 0.18, sz = (r(12) - 0.5) * w * 0.12 // o topo sai do eixo do pé
  const dh: number[] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (r(13 + k) - 0.5) * 0.55) / n) * Math.PI * 2 + r(3) * 1.2
    const R = (w / 2) * (0.8 + r(4 + k) * 0.32)
    const ca = Math.cos(a), sa = Math.sin(a) * 0.78
    const enc = 0.82 + r(20 + k) * 0.18 // cada face afina diferente (inclinações desiguais)
    base.push([ca * R, sa * R])
    quina.push([ca * R * enc + sx, sa * R * enc + sz])
    topo.push([ca * R * (enc - 0.07) + sx, sa * R * (enc - 0.07) + sz])
    dh.push((r(30 + k) - 0.5) * h * 0.16)
  }
  // topo inclinado: a frente (−z, de onde se olha) mais baixa; um pouco de torção lateral
  const tiltZ = 0.1 + r(1) * 0.08, tiltX = (r(2) - 0.5) * 0.12
  const yQk = (k: number) => h - 0.16 + quina[k][1] * tiltZ + quina[k][0] * tiltX + dh[k]
  const yTk = (k: number) => h + topo[k][1] * tiltZ + topo[k][0] * tiltX + dh[k] * 0.6
  const P = (p: [number, number], y: number): V3 => [x + p[0], y, z + p[1]]
  const tons: RGB[] = [PEDRA_CL, PEDRA, PEDRA_S]
  // a saia de musgo desce mais na frente (−z) e menos atrás
  const saia = (p: [number, number]) => h * (0.12 + 0.12 * Math.max(0, -p[1] / (w / 2)))
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (base[k][0] + base[j][0]) / 2, mz = (base[k][1] + base[j][1]) / 2
    const luz = -mx * 0.6 + mz * 0.4
    const cor = luz > 0.5 ? tons[0] : luz > -0.6 ? tons[1] : tons[2]
    const Qk = P(quina[k], yQk(k)), Qj = P(quina[j], yQk(j))
    // face do corpo (até a quina) e chanfro (quina → topo), o chanfro já de musgo
    face(g, [P(base[k], 0), P(base[j], 0), Qj, Qk], [mul(cor, 0.74), mul(cor, 0.74), cor, cor], [mx, 0.05, mz])
    face(g, [Qk, Qj, P(topo[j], yTk(j)), P(topo[k], yTk(k))], [mix(MUSGO, MUSGO_S, 0.3), mix(MUSGO, MUSGO_S, 0.3), MUSGO, MUSGO], [mx, 0.9, mz])
    // MUSGO escorrendo: faixa clara contínua logo abaixo da quina (0,1–0,2 m) e 2–3 pingos compridos e desiguais
    const out = 1.015
    const at = (t: number, dy: number): V3 => {
      const u = quina[k][0] + (quina[j][0] - quina[k][0]) * t, v = quina[k][1] + (quina[j][1] - quina[k][1]) * t
      const y = yQk(k) + (yQk(j) - yQk(k)) * t
      return [x + u * out, y + dy, z + v * out]
    }
    const frente = Math.max(0, -mz / (w / 2)) // a frente escorre mais
    const fx = 0.12 + frente * 0.1
    face(g, [at(0, 0.01), at(1, 0.01), at(1, -fx * 0.8), at(0, -fx)], mix(MUSGO, MUSGO_S, 0.4), [mx, 0, mz])
    const np = lod ? 1 : 2 + Math.floor(r(40 + k) * 2)
    for (let d = 0; d < np; d++) {
      const t = 0.12 + r(50 + k * 5 + d) * 0.76, wd = 0.07 + r(60 + k * 5 + d) * 0.1
      const L = h * (0.1 + frente * 0.15 + r(70 + k * 5 + d) * 0.15)
      const a0 = at(t - wd, -fx * 0.85), a1 = at(t + wd, -fx * 0.85), tip = at(t + (r(80 + k + d) - 0.5) * 0.04, -fx - L)
      face(g, [a0, a1, tip], mix(MUSGO, MUSGO_S, 0.5), [mx, 0, mz])
    }
  }
  // o TOPO: placa chata de musgo (mais clara), com uma mancha mais escura
  // topo em leque a partir do centro (as quinas estão em alturas diferentes: o topo é facetado, não plano)
  const ct: [number, number] = [topo.reduce((a, p) => a + p[0], 0) / n, topo.reduce((a, p) => a + p[1], 0) / n]
  const yC = topo.reduce((a, _, k) => a + yTk(k), 0) / n + 0.04
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    face(g, [P(ct, yC), P(topo[k], yTk(k) + 0.02), P(topo[j], yTk(j) + 0.02)], k % 2 ? MUSGO : mix(MUSGO, MUSGO_S, 0.2), [0, 1, 0])
  }
  if (caixa) c.block(x, z, w * 0.44, w * 0.36, h)
}

/**
 * FLOR DA LUA (inventário `flor-lua`): lótus ACESA — 6 pétalas de fora abertas (35°) e 3 de dentro em pé,
 * ciano na base → branco na ponta, miolo branco; haste fina, 3 folhas pontudas no chão. Grupo de 1–3.
 */
export function florLua(c: Cena, x: number, z: number, s = 1, seed = 1, lod = 0, grupo = 3) {
  const g = c.geo(x, z), G = c.glow(x, z)
  const r = (q: number) => rnd(seed, q)
  const folha: RGB = [0.1, 0.5, 0.55]
  for (let f = 0; f < (lod ? 1 : grupo); f++) {
    const k = f === 0 ? s : s * (0.6 + r(f) * 0.2)
    const fx = x + (f === 0 ? 0 : Math.cos(r(f + 5) * 6.3) * 0.55 * s), fz = z + (f === 0 ? 0 : Math.sin(r(f + 5) * 6.3) * 0.55 * s)
    const yF = 0.36 * k
    tube(g, [fx, 0, fz], [fx, yF, fz], 0.03 * k, 0.025 * k, 3, () => [0.3, 0.75, 0.8], false)
    const C: V3 = [fx, yF, fz]
    const petala = (a: number, L: number, ang: number, lw: number) => {
      const ca = Math.cos(a), sa = Math.sin(a)
      const tip: V3 = [fx + ca * L * Math.cos(ang), yF + L * Math.sin(ang), fz + sa * L * Math.cos(ang)]
      const mid: V3 = [fx + ca * L * 0.45 * Math.cos(ang), yF + L * 0.45 * Math.sin(ang) + 0.02, fz + sa * L * 0.45 * Math.cos(ang)]
      const l: V3 = [mid[0] - sa * lw, mid[1], mid[2] + ca * lw], rr: V3 = [mid[0] + sa * lw, mid[1], mid[2] - ca * lw]
      for (const sd of [1, -1]) {
        face(G, [C, l, tip], [LUZ_FLOR, mix(LUZ_FLOR, LUZ_FLOR_CL, 0.4), LUZ_FLOR_CL], [0, sd, 0])
        face(G, [C, tip, rr], [LUZ_FLOR, LUZ_FLOR_CL, mix(LUZ_FLOR, LUZ_FLOR_CL, 0.25)], [0, sd, 0])
      }
    }
    const a0 = r(f + 9) * 6.3
    for (let p = 0; p < (lod ? 4 : 6); p++) petala(a0 + (p / 6) * Math.PI * 2, 0.38 * k, 0.42, 0.17 * k)
    if (!lod) for (let p = 0; p < 3; p++) petala(a0 + 0.5 + (p / 3) * Math.PI * 2, 0.32 * k, 1.15, 0.15 * k)
    tube(G, [fx, yF, fz], [fx, yF + 0.16 * k, fz], 0.09 * k, 0.01, 5, () => [1, 1, 1], false)
    if (!lod)
      for (let p = 0; p < 3; p++) {
        const a = a0 + 1 + (p / 3) * Math.PI * 2, L = 0.5 * k
        const tip: V3 = [fx + Math.cos(a) * L, 0.3 * k, fz + Math.sin(a) * L]
        for (const sd of [1, -1]) face(g, [[fx - Math.sin(a) * 0.07, 0.02, fz + Math.cos(a) * 0.07], [fx + Math.sin(a) * 0.07, 0.02, fz - Math.cos(a) * 0.07], tip], [mul(folha, 0.7), mul(folha, 0.7), mix(folha, LUZ_FLOR, 0.4)], [0, sd, 0])
      }
  }
}

/** TUFO PRATEADO (inventário `tufo-prata`): 8 lâminas largas e pontudas em leque, branco-lavanda, base azul. */
export function tufoPrata(c: Cena, x: number, z: number, h = 0.9, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = lod ? 4 : 8
  const base: RGB = [0.82, 0.76, 0.92], ponta: RGB = [1, 0.98, 1] // quente: o luar azula
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r(k) * 0.8
    const L = h * (0.65 + r(k + 10) * 0.45)
    const inc = 0.45 + r(k + 20) * 0.6 // quanto abre para fora (a ponta curva como agave)
    const ca = Math.cos(a), sa = Math.sin(a)
    const w = h * 0.16, b = h * 0.18 // folha larga; a base do tufo abre
    const b0: V3 = [x + ca * b - sa * w, 0, z + sa * b + ca * w], b1: V3 = [x + ca * b + sa * w, 0, z + sa * b - ca * w]
    const mid: V3 = [x + ca * (b + L * inc * 0.25), L * 0.6, z + sa * (b + L * inc * 0.25)]
    const tip: V3 = [x + ca * L * inc, L, z + sa * L * inc]
    for (const sd of [1, -1]) {
      face(g, [b0, b1, mid], [base, base, mix(base, ponta, 0.55)], [ca * sd, 0.3, sa * sd])
      face(g, [mid, b1, tip], [mix(base, ponta, 0.55), base, ponta], [ca * sd, 0.3, sa * sd])
      face(g, [b0, mid, tip], [base, mix(base, ponta, 0.55), ponta], [ca * sd, 0.3, sa * sd])
    }
  }
}

// ── peças 5–10: platô com trio de árvores, arco de pedras, cogumelo, menir com runa, tronco caído,
// lanterna-casulo (refs floresta-1, -2 e -3) ──

/** Levanta `dy` tudo o que `fn` desenhar no bloco de (x, z) (corpo e luz): peça montada em cima de outra. */
export function elevar(c: Cena, x: number, z: number, dy: number, fn: () => void) {
  const g = c.geo(x, z), G = c.glow(x, z)
  const n0 = g.p.length, m0 = G.p.length
  fn()
  for (let i = n0 + 1; i < g.p.length; i += 3) g.p[i] += dy
  for (let i = m0 + 1; i < G.p.length; i += 3) G.p[i] += dy
}

export const GRAMA_TOPO: RGB = [0.18, 0.5, 0.5]
export const CRISTAL_LUA: RGB = [0.4, 0.9, 1]

/** Prisma de pedra irregular de topo chato (o "tijolo" do platô, do arco e do paredão), tampa colorida. */
export function lajeDePedra(c: Cena, x: number, z: number, w: number, d: number, y0: number, y1: number, rot: number, seed: number, tampa: RGB) {
  const g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = 7
  const cs = Math.cos(rot), sn = Math.sin(rot)
  const pts: [number, number][] = []
  for (let k = 0; k < n; k++) {
    const a = ((k + (r(k) - 0.5) * 0.5) / n) * Math.PI * 2
    const R = 0.86 + r(k + 10) * 0.2
    const u = Math.cos(a) * (w / 2) * R, v = Math.sin(a) * (d / 2) * R
    pts.push([x + u * cs - v * sn, z + u * sn + v * cs])
  }
  const tons: RGB[] = [PEDRA_CL, PEDRA, PEDRA_S]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (pts[k][0] + pts[j][0]) / 2 - x, mz = (pts[k][1] + pts[j][1]) / 2 - z
    const luz = -mx * 0.6 + mz * 0.4
    const cor = tons[luz > 0.5 ? 0 : luz > -0.6 ? 1 : 2]
    const t0: V3 = [x + (pts[k][0] - x) * 0.93, y1, z + (pts[k][1] - z) * 0.93], t1: V3 = [x + (pts[j][0] - x) * 0.93, y1, z + (pts[j][1] - z) * 0.93]
    face(g, [[pts[k][0], y0, pts[k][1]], [pts[j][0], y0, pts[j][1]], t1, t0], [mul(cor, 0.75), mul(cor, 0.75), cor, cor], [mx, 0.1, mz])
  }
  face(g, pts.map(([px, pz]): V3 => [x + (px - x) * 0.93, y1 + 0.02, z + (pz - z) * 0.93]), tampa, [0, 1, 0])
}

/**
 * PLATÔ COM O TRIO (inventário `trio-plato`, o marco da cena 1): rocha em 2 degraus (o de baixo 1,1 m,
 * o de cima 2 m) com tampa de grama verde-azulada, três árvores da lua juntas em cima (a do meio 15 m,
 * as dos lados 11–12 m), raízes descendo pela beira e cristais + flores acesas ciano na borda.
 */
export function trioPlato(c: Cena, x: number, z: number, rot = 0, seed = 7, lod = 0) {
  const cs = Math.cos(rot), sn = Math.sin(rot)
  const L = (u: number, v: number): [number, number] => [x + u * cs - v * sn, z + u * sn + v * cs]
  lajeDePedra(c, x, z, 17, 11, 0, 1.1, rot, seed, mix(GRAMA_TOPO, PEDRA, 0.25))
  lajeDePedra(c, ...L(0.4, 0.6), 14, 8.5, 1.1, 2.1, rot + 0.08, seed + 1, GRAMA_TOPO)
  c.block(x, z, 8, 5, 2.1, -rot)
  for (const [u, v, h, sd] of [[-4, 0.6, 11.5, 1], [0.6, 1.2, 15, 2], [4.6, 0.2, 11, 3]] as const) {
    const [px, pz] = L(u, v)
    elevar(c, px, pz, 2.1, () => arvoreLua(c, px, pz, h, seed * 10 + sd, lod))
  }
  if (lod) return
  // cristais e flores acesas na borda do degrau de cima (a frente, −v)
  const G0 = c.glow(x, z)
  for (let k = 0; k < 9; k++) {
    const u = -6 + k * 1.5 + (rnd(seed, k) - 0.5) * 0.6
    const [px, pz] = L(u, -3.6 + (rnd(seed, k, 2) - 0.5) * 0.6)
    if (k % 3 === 1) florLua(c, px, pz, 0.7, seed + k, lod, 2)
    else {
      const hh = 0.6 + rnd(seed, k, 3) * 0.7
      tube(G0, [px, 2.05, pz], [px + (rnd(seed, k, 4) - 0.5) * 0.3, 2.05 + hh, pz], 0.16, 0.02, 5, (j) => (j % 2 ? CRISTAL_LUA : mix(CRISTAL_LUA, [1, 1, 1], 0.5)), false)
    }
  }
}

/**
 * ARCO DE PEDRAS (inventário `arco-pedras`), na minúcia: plinto em 2 degraus de lajes irregulares com grama
 * na beira, duas pedras altas feitas de 5 BLOCOS lascados empilhados em curva (cada bloco um prisma de 6
 * lados com tamanho e giro próprios, juntas visíveis), musgo nos topos, e o HALO de luz azul no vão (miolo
 * claro e bordas que somem no azul), pedrinhas e tufos no pé.
 */
export function arcoPedras(c: Cena, x: number, z: number, ang = 0, seed = 3, lod = 0) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = -Math.cos(ang), sz = Math.sin(ang)
  lajeDePedra(c, x, z, 10.5, 6.2, 0, 0.6, -ang, seed, mix(PEDRA, GRAMA_TOPO, 0.5))
  lajeDePedra(c, x, z, 8.2, 4.8, 0.6, 1.2, -ang + 0.05, seed + 1, PEDRA_CL)
  const blocos = lod ? 2 : 5
  for (const s of [-1, 1]) {
    let px = x + sx * s * 2.7, pz = z + sz * s * 2.7, py = 1.2
    for (let k = 0; k < blocos; k++) {
      const t = (k + 1) / blocos
      const nx = x + sx * s * (2.7 - 1.7 * t * t), nz = z + sz * s * (2.7 - 1.7 * t * t), ny = 1.2 + 5.6 * t
      const r0 = 1.1 - 0.3 * (k / blocos) + rnd(seed, s, k) * 0.12
      // bloco: prisma de 6 lados levemente girado, com folga (a junta) de 6 cm
      const gap = 0.06
      const ax: V3 = [nx - px, ny - py, nz - pz], l = Math.hypot(...ax)
      const A: V3 = [px + (ax[0] / l) * gap, py + (ax[1] / l) * gap, pz + (ax[2] / l) * gap]
      const B: V3 = [nx - (ax[0] / l) * gap, ny - (ax[1] / l) * gap, nz - (ax[2] / l) * gap]
      tube(g, A, B, r0, r0 * 0.94, 6, (j) => (j % 3 === 0 ? PEDRA_S : j % 2 ? PEDRA_CL : PEDRA), false)
      // junta escura (disco um pouco menor entre blocos)
      if (k > 0) tube(g, [px, py - 0.05, pz], [px, py + 0.05, pz], r0 * 0.9, r0 * 0.9, 6, () => mul(PEDRA_S, 0.6), false)
      px = nx; pz = nz; py = ny
    }
    // musgo no topo da pedra (tampa + língua)
    tube(g, [px, py - 0.05, pz], [px, py + 0.12, pz], 0.85, 0.7, 6, () => MUSGO, false)
    c.block(x + sx * s * 2.2, z + sz * s * 2.2, 0.9, 0.9, 6.8, -ang)
  }
  c.block(x, z, 5.2, 3.1, 1.2, -ang)
  // HALO de luz no vão: miolo claro + 2 anéis que escurecem até o azul (dupla face)
  const G = c.glow(x, z)
  const Lp = (u: number, y: number, f: number): V3 => [x + sx * u + fx * f, y, z + sz * u + fz * f]
  const cx = 0, cy = 3.3
  const elipse = (ru: number, ry: number, f: number) => Array.from({ length: 12 }, (_, k): V3 => { const a = (k / 12) * Math.PI * 2; return Lp(cx + Math.cos(a) * ru, cy + Math.sin(a) * ry, f) })
  const nucleo: RGB = [0.82, 0.95, 1], meio: RGB = [0.36, 0.66, 1], borda: RGB = [0.12, 0.2, 0.62]
  for (const sd of [1, -1]) {
    const f = 0.02 * sd
    const e0 = elipse(0.6, 1.4, f), e1 = elipse(1.15, 2.2, f), e2 = elipse(1.6, 2.6, f)
    const C = Lp(cx, cy, f)
    for (let k = 0; k < 12; k++) {
      const j = (k + 1) % 12
      face(G, [C, e0[k], e0[j]], [mix(nucleo, [1, 1, 1], 0.5), nucleo, nucleo], [fx * sd, 0, fz * sd])
      face(G, [e0[k], e1[k], e1[j], e0[j]], [nucleo, meio, meio, nucleo], [fx * sd, 0, fz * sd])
      if (!lod) face(G, [e1[k], e2[k], e2[j], e1[j]], [meio, borda, borda, meio], [fx * sd, 0, fz * sd])
    }
  }
  if (lod) return
  pedrinhas(c, x + fx * 3.6, z + fz * 3.6, 1.6, seed + 2, 5)
  for (const s of [-1, 1]) tufoPrata(c, x + sx * s * 4.6 + fx * 3.3, z + sz * s * 4.6 + fz * 3.3, 0.7, seed + s + 4, lod)
}

/** COGUMELO DA LUA (ref floresta-2): haste grossa clara, chapéu largo aceso ciano com pintas claras; 1 grande + 2 pequenos. */
export function cogumeloLua(c: Cena, x: number, z: number, h = 1.6, seed = 1, lod = 0) {
  const g = c.geo(x, z), G = c.glow(x, z)
  const um = (cx: number, cz: number, hh: number, sd: number) => {
    tube(g, [cx, 0, cz], [cx, hh * 0.78, cz], hh * 0.13, hh * 0.1, lod ? 4 : 6, (k) => (k % 2 ? LAVANDA : mix(LAVANDA, LAVANDA_S, 0.4)), false)
    const R = hh * 0.55, n = lod ? 6 : 9
    const aba: V3[] = [], meio: V3[] = []
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rnd(sd, 1)
      aba.push([cx + Math.cos(a) * R, hh * 0.72, cz + Math.sin(a) * R])
      meio.push([cx + Math.cos(a) * R * 0.6, hh * 0.95, cz + Math.sin(a) * R * 0.6])
    }
    const topo: V3 = [cx, hh * 1.04, cz]
    const CI: RGB = [0.28, 0.86, 1], CL: RGB = [0.7, 0.98, 1]
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n
      const a = ((k + 0.5) / n) * Math.PI * 2
      face(G, [aba[k], aba[j], meio[j], meio[k]], [mul(CI, 0.75), mul(CI, 0.75), CI, CI], [Math.cos(a), 0.5, Math.sin(a)])
      face(G, [meio[k], meio[j], topo], [CI, CI, CL], [Math.cos(a), 1.5, Math.sin(a)])
      // fundo do chapéu (lamelas): mais escuro, virado para baixo
      face(g, [aba[j], aba[k], [cx, hh * 0.76, cz]], [0.3, 0.5, 0.7], [0, -1, 0])
    }
    if (!lod)
      for (let k = 0; k < 3; k++) {
        const a = rnd(sd, k + 5) * Math.PI * 2, rr = R * (0.3 + rnd(sd, k + 9) * 0.35), y = hh * 0.98 - rr * 0.25
        const px = cx + Math.cos(a) * rr, pz = cz + Math.sin(a) * rr, e = hh * 0.06
        face(G, [[px - e, y + 0.02, pz], [px, y + 0.02, pz - e], [px + e, y + 0.02, pz], [px, y + 0.02, pz + e]], [0.92, 1, 1], [0, 1, 0])
      }
  }
  um(x, z, h, seed)
  if (!lod) {
    um(x + 0.8 * h * 0.6, z + 0.3 * h * 0.6, h * 0.5, seed + 1)
    um(x - 0.5 * h * 0.6, z + 0.7 * h * 0.6, h * 0.36, seed + 2)
  }
  if (h > 1.2) c.block(x, z, 0.3 * h * 0.4, 0.3 * h * 0.4, h)
}

/**
 * MENIR COM RUNA (ref floresta-2, o círculo de pedras), na minúcia: laje alta que PENDE para um lado e
 * afina, com a FRENTE em duas faces (uma aresta vertical fora do centro), quinas lascadas (chanfros claros),
 * topo arredondado em 3 facetas coberto de MUSGO que escorre em línguas desiguais; RUNA verde em ramo (Y com
 * brotos) com HALO escuro em volta do traço claro; pedrinhas e um tufo no pé.
 */
export function menirRuna(c: Cena, x: number, z: number, h = 4.5, ang = 0, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = -Math.cos(ang), sz = Math.sin(ang)
  const W = h * 0.3, D = h * 0.17
  const tilt = 0.06 + rnd(seed, 1) * 0.08
  const P = (u: number, v: number, y: number): V3 => [x + sx * (u + tilt * y) + fx * v, y, z + sz * (u + tilt * y) + fz * v]
  // seção em 6 pontos (frente em 2 faces: aresta em u = aF, saliente) — de baixo para cima afina
  const aF = W * (0.15 + rnd(seed, 2) * 0.2)
  const sec = (y: number, k: number): [number, number][] => [[-W * k, -D * k], [W * k, -D * k], [W * k * 1.02, D * k * 0.7], [aF * k, D * k * 1.12], [-W * k * 0.96, D * k * 0.8], [-W * k * 1.02, 0]]
  const ys = [0, h * 0.42, h * 0.78, h * 0.9]
  const ks = [1, 0.93, 0.84, 0.6]
  const rings = ys.map((y, i) => sec(y, ks[i]).map(([u, v]) => P(u, v, y)))
  const tons: RGB[] = [PEDRA_S, PEDRA, PEDRA_CL, mix(PEDRA_CL, [1, 1, 1], 0.2), PEDRA_CL, PEDRA]
  const n = 6
  for (let L = 0; L < 3; L++) {
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n
      const A = rings[L][k], B = rings[L][j], Cc = rings[L + 1][j], Dd = rings[L + 1][k]
      const mx = (A[0] + B[0]) / 2 - x, mz = (A[2] + B[2]) / 2 - z
      const cor = L === 2 ? (k % 2 ? MUSGO : mix(MUSGO, MUSGO_S, 0.35)) : mul(tons[k], L === 0 ? 0.86 : 1)
      face(g, [A, B, Cc, Dd], L === 2 ? cor : [mul(cor, L === 0 ? 0.85 : 1), mul(cor, L === 0 ? 0.85 : 1), cor, cor], [mx, L === 2 ? 1 : 0.04, mz])
    }
  }
  face(g, rings[3], MUSGO, [0, 1, 0])
  c.block(x, z, W, D + 0.1, h, -ang)
  if (lod) return
  // quinas lascadas: 3 lascas claras triangulares nas arestas verticais
  for (let q = 0; q < 3; q++) {
    const k = [1, 3, 5][q], yy = h * (0.15 + rnd(seed, q + 4) * 0.5)
    const [u, v] = sec(yy, 0.97)[k]
    const A = P(u, v, yy), B = P(u, v, yy + 0.35), Cc = P(u * 0.9, v * 0.9 + 0.04, yy + 0.18)
    face(g, [A, B, Cc], mix(PEDRA_CL, [1, 1, 1], 0.35), [P(u, v, 0)[0] - x, 0.2, P(u, v, 0)[2] - z])
  }
  // musgo escorrendo do topo: 4 línguas desiguais por fora das faces
  for (let q = 0; q < 4; q++) {
    const k = Math.floor(rnd(seed, q + 10) * n), t = 0.25 + rnd(seed, q + 14) * 0.5
    const s0 = sec(h * 0.78, 0.86), j = (k + 1) % n
    const u0 = s0[k][0] + (s0[j][0] - s0[k][0]) * t, v0 = s0[k][1] + (s0[j][1] - s0[k][1]) * t
    const Lg = h * (0.08 + rnd(seed, q + 18) * 0.14), w = 0.16 + rnd(seed, q + 22) * 0.12
    const du = (s0[j][0] - s0[k][0]), dv = (s0[j][1] - s0[k][1]), l = Math.hypot(du, dv) || 1
    const ou = (v0 / (Math.hypot(u0, v0) || 1)) * 0, f = 1.04
    void ou
    face(g, [P((u0 - (du / l) * w) * f, (v0 - (dv / l) * w) * f, h * 0.78 + 0.02), P((u0 + (du / l) * w) * f, (v0 + (dv / l) * w) * f, h * 0.78 + 0.02), P(u0 * f, v0 * f, h * 0.78 - Lg)], MUSGO_S, [P(u0, v0, 0)[0] - x, 0, P(u0, v0, 0)[2] - z])
  }
  // RUNA: ramo com halo, na face da frente (a de maior v), 3 cm à frente
  const G = c.glow(x, z)
  // halo = pedra tingida de verde (o glow não escurece: cor escura = brilho fraco)
  const nucleo: RGB = [0.7, 1, 0.62], halo: RGB = [0.2, 0.42, 0.36]
  const vF = (u: number, y: number) => {
    // a frente em 2 faces: v cresce de −W..aF e cai de aF..W (interpola a seção na altura)
    const k = 1 - (1 - 0.93) * (y / (h * 0.42))
    const s1 = sec(y, Math.max(0.84, k))
    const [ua, va] = s1[2], [ub, vb] = s1[3], [uc, vc] = s1[4]
    const v = u >= ub ? vb + ((va - vb) * (u - ub)) / (ua - ub || 1) : vb + ((vc - vb) * (u - ub)) / (uc - ub || 1)
    return v + 0.04
  }
  const T = (u: number, y: number): V3 => P(u, vF(u, y), y)
  const ramo = (u0: number, y0: number, u1: number, y1: number, e: number) => {
    const A = T(u0, y0), B = T(u1, y1)
    const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], l = Math.hypot(dx, dy, dz) || 1
    // lado = perpendicular no plano da face: cruzar direção com a frente
    const lado: V3 = [(dy * fz) / l, (dz * fx - dx * fz) / l, (-dy * fx) / l]
    tracoAceso(G, A, B, lado, e, [fx * 0.01, 0, fz * 0.01], nucleo, halo)
  }
  const e = W * 0.05
  const uR = aF * 0.6
  const yb = h * 0.18, yf = h * 0.45, yt = h * 0.7
  // ramo da ref: tronco que se abre em Y, braço esquerdo com um broto curvo; nada de escada
  ramo(uR, yb, uR + W * 0.02, yf, e)
  ramo(uR + W * 0.02, yf, uR - W * 0.3, yt, e * 0.85)
  ramo(uR + W * 0.02, yf, uR + W * 0.26, yt + h * 0.03, e * 0.85)
  ramo(uR - W * 0.17, (yf + yt) / 2 + h * 0.02, uR - W * 0.4, (yf + yt) / 2 - h * 0.02, e * 0.6)
  // pé: pedrinhas e um tufo
  pedrinhas(c, x, z, W * 1.3, seed + 3, 4)
  tufoPrata(c, x + sx * W * 1.2 + fx * D * 1.4, z + sz * W * 1.2 + fz * D * 1.4, 0.6, seed + 5, lod)
}

/**
 * TRONCO CAÍDO (ref floresta-2), na minúcia: tora grossa lavanda deitada e um pouco torta (2 trechos), casca
 * em SULCOS longitudinais (9 faces alternando claro/sombra), 3 placas de MUSGO irregulares em cima com
 * pingos pelos lados, um TOCO de galho quebrado apontando para cima, ponta cortada com 3 anéis e lascas, e
 * a outra ponta lascada em dentes. Pedrinhas e cogumelinhos acesos no pé.
 */
export function troncoCaidoLua(c: Cena, x: number, z: number, L = 5, ang = 0, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const ex = Math.sin(ang), ez = Math.cos(ang), tx = Math.cos(ang), tz = -Math.sin(ang)
  const r = 0.85 + rnd(seed, 1) * 0.2
  const torto = (rnd(seed, 2) - 0.5) * 0.5
  const a: V3 = [x - ex * L / 2, r * 0.82, z - ez * L / 2]
  const m: V3 = [x + tx * torto, r * 0.86, z + tz * torto]
  const b: V3 = [x + ex * L / 2, r * 0.78, z + ez * L / 2]
  const n = lod ? 5 : 9
  const casca = (k: number): RGB => (k % 3 === 0 ? mix(LAVANDA, LAVANDA_S, 0.65) : k % 2 ? LAVANDA : mix(LAVANDA, LAVANDA_S, 0.3))
  tube(g, a, m, r, r * 0.95, n, casca, false)
  tube(g, m, b, r * 0.95, r * 0.88, n, casca, false)
  c.block(x, z, r, L / 2, r * 1.7, -ang)
  // musgo: placas irregulares em cima (polígono de 6 pontos sobre o dorso) + pingos dos lados
  const dorso = (t: number): V3 => {
    const P = t < 0.5 ? [a, m, t * 2] as const : [m, b, (t - 0.5) * 2] as const
    const [A, B, f] = P
    return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f + r * 1.04, A[2] + (B[2] - A[2]) * f]
  }
  const placas = lod ? 1 : 3
  for (let q = 0; q < placas; q++) {
    const t0 = 0.08 + q * 0.3 + rnd(seed, q + 3) * 0.08, t1 = t0 + 0.18 + rnd(seed, q + 6) * 0.08
    const pts: V3[] = []
    for (let k = 0; k < 6; k++) {
      const t = t0 + ((t1 - t0) * [0, 0.4, 1, 1, 0.6, 0][k])
      const lado = [-1, -1.15, -0.9, 0.95, 1.1, 0.85][k] * r * (0.5 + rnd(seed, q, k) * 0.25)
      const P = dorso(t)
      pts.push([P[0] + tx * lado, P[1] - (lado / r) * (lado / r) * r * 0.5, P[2] + tz * lado])
    }
    face(g, pts, q % 2 ? MUSGO : mix(MUSGO, MUSGO_S, 0.25), [0, 1, 0])
    // capa: o musgo desce pelas laterais da tora até ~1/3 da altura (visto pela câmera baixa)
    for (const [i0, i1, i2, sd] of [[0, 1, 2, -1], [3, 4, 5, 1]] as const) {
      const lo = [pts[i0], pts[i1], pts[i2]].map((p0): V3 => {
        const ax: V3 = [p0[0] - tx * ((p0[0] - x) * tx + (p0[2] - z) * tz), 0, p0[2] - tz * ((p0[0] - x) * tx + (p0[2] - z) * tz)]
        return [ax[0] + tx * sd * r * 1.03, r * 1.05 + rnd(seed, q, i0) * 0.1, ax[2] + tz * sd * r * 1.03]
      })
      face(g, [pts[i0], pts[i1], lo[1], lo[0]], MUSGO_S, [tx * sd, 0.5, tz * sd])
      face(g, [pts[i1], pts[i2], lo[2], lo[1]], MUSGO_S, [tx * sd, 0.5, tz * sd])
    }
    if (!lod)
      for (const sd of [-1, 1]) {
        const P = dorso((t0 + t1) / 2), lado = sd * r * 0.88
        const base: V3 = [P[0] + tx * lado, P[1] - r * 0.4, P[2] + tz * lado]
        const w = 0.18
        face(g, [[base[0] - ex * w, base[1], base[2] - ez * w], [base[0] + ex * w, base[1], base[2] + ez * w], [base[0] + tx * sd * 0.08, base[1] - 0.35 - rnd(seed, q, sd + 5) * 0.3, base[2] + tz * sd * 0.08]], MUSGO_S, [tx * sd, 0, tz * sd])
      }
  }
  if (lod) return
  // toco de galho quebrado para cima (com ponta lascada clara)
  const P = dorso(0.62)
  const topo: V3 = [P[0] + tx * 0.3, P[1] + 0.9, P[2] + tz * 0.3]
  tube(g, [P[0], P[1] - 0.2, P[2]], topo, 0.2, 0.13, 5, casca, false)
  tube(g, topo, [topo[0] + 0.05, topo[1] + 0.25, topo[2]], 0.13, 0.02, 4, () => [1, 0.94, 0.9], false)
  // ponta cortada: disco + 3 anéis + 2 lascas
  const anel = (rr: number, off: number): V3[] => Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2
    return [b[0] + tx * Math.cos(t) * rr + ex * off, b[1] + Math.sin(t) * rr, b[2] + tz * Math.cos(t) * rr + ez * off]
  })
  face(g, anel(r * 0.86, 0.02), [0.98, 0.9, 0.86], [ex, 0, ez])
  face(g, anel(r * 0.66, 0.025), [0.86, 0.74, 0.74], [ex, 0, ez])
  face(g, anel(r * 0.58, 0.03), [0.98, 0.9, 0.86], [ex, 0, ez])
  face(g, anel(r * 0.34, 0.035), [0.86, 0.74, 0.74], [ex, 0, ez])
  face(g, anel(r * 0.26, 0.04), [0.98, 0.9, 0.86], [ex, 0, ez])
  // a outra ponta lascada: 5 dentes de casca
  for (let k = 0; k < 5; k++) {
    const t = (k / 5) * Math.PI * 2 + 0.3
    const base: V3 = [a[0] + tx * Math.cos(t) * r * 0.9, a[1] + Math.sin(t) * r * 0.9, a[2] + tz * Math.cos(t) * r * 0.9]
    face(g, [base, [base[0] + tx * Math.cos(t + 0.5) * 0.35, base[1] + Math.sin(t + 0.5) * 0.35, base[2] + tz * Math.cos(t + 0.5) * 0.35], [base[0] - ex * (0.3 + rnd(seed, k, 9) * 0.3), base[1], base[2] - ez * (0.3 + rnd(seed, k, 9) * 0.3)]], casca(k), [-ex, 0, -ez])
  }
  face(g, Array.from({ length: n }, (_, k): V3 => { const t = (k / n) * Math.PI * 2; return [a[0] + tx * Math.cos(t) * r * 0.8 - ex * 0.02, a[1] + Math.sin(t) * r * 0.8, a[2] + tz * Math.cos(t) * r * 0.8 - ez * 0.02] }), [0.5, 0.42, 0.5], [-ex, 0, -ez])
  // pé: pedrinhas e cogumelinhos acesos
  pedrinhas(c, x + tx * r * 1.5, z + tz * r * 1.5, 0.8, seed + 7, 3)
  for (let k = 0; k < 3; k++) cogumeloLua(c, x + ex * (k - 1) * 1.2 + tx * r * 1.25, z + ez * (k - 1) * 1.2 + tz * r * 1.25, 0.35 + k * 0.08, seed + k, 1)
}

/**
 * LANTERNA-CASULO (ref floresta-3), na minúcia: casulo OVAL gordo (largura ≈ 0,62 da altura) de cristal
 * lavanda em losangos, MIOLO branco aceso que transparece no meio, 4 faixas de CIPÓ claro enroladas em
 * diagonal por fora, amarração no topo (anel + nó) e o fio pendurado com uma laçada.
 */
export function lanternaCasulo(c: Cena, x: number, z: number, y: number, s = 1, fio = 2, seed = 1) {
  const g = c.geo(x, z), G = c.glow(x, z)
  const yTop = y + s * 0.8, yBot = y - s * 0.8
  const n = 8, R = s * 0.5
  const prof = [0.42, 0.88, 1, 0.84, 0.42] // ovo: mais gordo um pouco abaixo do meio
  const anel = (k: number, rr = 1) => {
    const t = (k + 1) / (prof.length + 1)
    const yy = yBot + (yTop - yBot) * t
    return Array.from({ length: n }, (_, j): V3 => {
      const a = ((j + (k % 2) * 0.5) / n) * Math.PI * 2 + rnd(seed, 1)
      return [x + Math.cos(a) * R * prof[k] * rr, yy, z + Math.sin(a) * R * prof[k] * rr]
    })
  }
  const aneis = prof.map((_, k) => anel(k))
  const C1: RGB = [0.86, 0.8, 1], C2: RGB = [0.66, 0.54, 0.96], BR: RGB = [1, 1, 1]
  // tom: claro no meio (o miolo transparece), lilás nas pontas, losangos alternados
  const tom = (k: number, j: number): RGB => {
    const meio = 1 - Math.abs(k - 2) / 2.5
    const base = (k + j) % 2 ? C1 : C2
    return mix(base, BR, meio * 0.7)
  }
  const top: V3 = [x, yTop, z], bot: V3 = [x, yBot, z]
  for (let j = 0; j < n; j++) {
    const jj = (j + 1) % n
    const a = ((j + 0.5) / n) * Math.PI * 2 + rnd(seed, 1)
    face(G, [aneis[0][jj], aneis[0][j], bot], [C2, C2, mul(C2, 0.8)], [Math.cos(a), -0.7, Math.sin(a)])
    face(G, [aneis[prof.length - 1][j], aneis[prof.length - 1][jj], top], [C1, C1, C2], [Math.cos(a), 0.7, Math.sin(a)])
    for (let k = 0; k < prof.length - 1; k++) {
      const A = aneis[k][j], B = aneis[k][jj], Cc = aneis[k + 1][jj], D = aneis[k + 1][j]
      face(G, [A, B, Cc, D], [tom(k, j), tom(k, j), tom(k + 1, j), tom(k + 1, j)], [Math.cos(a), 0, Math.sin(a)])
    }
  }
  // 4 faixas de cipó em diagonal (hélice), um pouco por fora do casulo
  const CIPO: RGB = [0.92, 0.88, 1]
  for (let f = 0; f < 3; f++) {
    let prev: V3 | null = null
    for (let k = 0; k <= prof.length - 1; k++) {
      const t = (k + 1) / (prof.length + 1)
      const a = rnd(seed, 1) + (f / 3) * Math.PI * 2 + k * 0.6
      const P: V3 = [x + Math.cos(a) * R * prof[k] * 1.06, yBot + (yTop - yBot) * t, z + Math.sin(a) * R * prof[k] * 1.06]
      if (prev) tube(g, prev, P, s * 0.035, s * 0.035, 3, () => CIPO, false)
      prev = P
    }
  }
  // amarração no topo: anel e nó, e o fio com uma laçada
  tube(g, [x, yTop - s * 0.05, z], [x, yTop + s * 0.08, z], s * 0.13, s * 0.11, 6, () => LAVANDA_S, false)
  tube(g, [x, yTop + s * 0.08, z], [x + s * 0.06, yTop + s * 0.22, z], s * 0.06, s * 0.03, 4, () => LAVANDA, false)
  tube(g, [x + s * 0.06, yTop + s * 0.22, z], [x - s * 0.08, yTop + s * 0.36, z], 0.02, 0.02, 3, () => LAVANDA_S, false)
  tube(g, [x - s * 0.08, yTop + s * 0.36, z], [x, yTop + fio, z], 0.02, 0.02, 3, () => LAVANDA_S, false)
}

/** Pedrinhas soltas (3–6 prismas baixos lavanda) em volta de (x, z), raio `r`. Detalhe de pé de peça. */
export function pedrinhas(c: Cena, x: number, z: number, r: number, seed: number, n = 4) {
  const g = c.geo(x, z)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k) * Math.PI * 2, d = r * (0.6 + rnd(seed, k, 2) * 0.5)
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, s = 0.12 + rnd(seed, k, 3) * 0.18
    tube(g, [px, 0, pz], [px, s * 0.9, pz], s, s * 0.6, 5, (j) => (j % 2 ? PEDRA : PEDRA_CL), false)
  }
}

/** Faixa luminosa com HALO: traço claro no meio e uma faixa mais larga e mais escura atrás (o brilho da ref). */
function tracoAceso(G: G, A: V3, B: V3, lado: V3, e: number, frente: V3, nucleo: RGB, halo: RGB) {
  const o = (P: V3, k: number, f: number): V3 => [P[0] + lado[0] * k + frente[0] * f, P[1] + lado[1] * k + frente[1] * f, P[2] + lado[2] * k + frente[2] * f]
  face(G, [o(A, -e * 2.6, 0), o(B, -e * 2.6, 0), o(B, e * 2.6, 0), o(A, e * 2.6, 0)], halo, frente)
  face(G, [o(A, -e, 0.012), o(B, -e, 0.012), o(B, e, 0.012), o(A, e, 0.012)], nucleo, frente)
}
type G = ReturnType<Cena["geo"]>

/**
 * PAREDÃO DA BORDA (inventário `rochedo-paredao`): 4–6 matacões grandes encostados e EMPILHADOS em
 * prateleiras (o de cima pousado sobre os de baixo), cada um com tampa de musgo — a ref fecha a borda
 * assim, nunca com uma mesa em listras. Devolve `inside` (pegada) como a `mesa` do kit.
 */
export function paredao(c: Cena, x: number, z: number, rx: number, rz: number, h: number, seed = 1, lod = 0, lim = 78) {
  // o pé de cada matacão fica dentro da área (± lim): fora dela o bloco de 32 m a mais reprova a cena
  const prende = (v: number, w: number) => Math.max(-lim + w / 2, Math.min(lim - w / 2, v))
  const r = (q: number) => rnd(seed, q)
  const pecas: { x: number; z: number; w: number; h: number }[] = []
  const n = lod ? 2 : 5
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r(k) * 0.8
    const d = k === 0 ? 0 : 0.55 + r(k + 10) * 0.25
    const px = x + Math.cos(a) * rx * d, pz = z + Math.sin(a) * rz * d
    const w = (rx + rz) * (k === 0 ? 0.75 : 0.45 + r(k + 20) * 0.2)
    const hh = h * (k === 0 ? 0.62 : 0.35 + r(k + 30) * 0.3)
    const qx = prende(px, w), qz = prende(pz, w)
    rochedoMusgo(c, qx, qz, w, hh, seed * 10 + k, lod)
    pecas.push({ x: qx, z: qz, w, h: hh })
  }
  // prateleira de cima: um matacão menor pousado sobre o maior (fica fora do eixo)
  const top = pecas[0]
  const tx = top.x + (r(40) - 0.5) * top.w * 0.25, tz = top.z + (r(41) - 0.5) * top.w * 0.2
  elevar(c, tx, tz, top.h - 0.15, () => rochedoMusgo(c, tx, tz, top.w * 0.62, h * 0.4, seed * 10 + 9, lod, false))
  c.block(x, z, rx * 0.8, rz * 0.8, h)
  return {
    inside: (qx: number, qz: number, k = 1) => pecas.some((p0) => Math.hypot(qx - p0.x, qz - p0.z) < (p0.w / 2) * k),
  }
}

/**
 * CAMINHO DE LAJES (ref floresta-3): lajes de pedra lavanda SOLTAS, 3 cm acima do chão (a junta é o chão
 * escuro aparecendo entre elas), em fiadas de 0,9–1,2 m com 3–4 lajes de larguras diferentes, cantos
 * cortados e tom sorteado; as da beira menores e tortas, algumas faltando. Só geometria de topo (2–3 tri
 * por laje). Segue a polilinha `path` com meia largura `w`; `pula(x, z)` = onde não pôr (clareira, pátio).
 */
export function lajesCaminho(c: Cena, path: readonly (readonly [number, number])[], w: number, seed: number, lod: number, pula: (x: number, z: number) => boolean = () => false) {
  const LAJE_A: RGB = [0.66, 0.62, 0.86], LAJE_B: RGB = [0.56, 0.52, 0.78], LAJE_C: RGB = [0.74, 0.7, 0.92]
  let fiada = 0
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, az] = path[k], [bx, bz] = path[k + 1]
    const L = Math.hypot(bx - ax, bz - az)
    if (L < 0.5) continue
    const dx = (bx - ax) / L, dz = (bz - az) / L, nx = dz, nz = -dx
    let t = 0
    while (t < L) {
      const prof = 0.9 + rnd(seed, fiada, 1) * 0.35
      const n = lod ? 2 : 3 + (rnd(seed, fiada, 2) < 0.45 ? 1 : 0)
      // larguras da fiada (somam 2w), desencontradas das da fiada anterior
      const pes: number[] = []
      for (let i = 0; i < n; i++) pes.push(0.7 + rnd(seed, fiada, i + 3))
      const soma = pes.reduce((a, b) => a + b, 0)
      let u = -w
      for (let i = 0; i < n; i++) {
        const lw = (pes[i] / soma) * 2 * w
        const borda = i === 0 || i === n - 1
        if (borda && rnd(seed, fiada, i + 9) < 0.18) { u += lw; continue } // laje faltando na beira
        const g0 = 0.07, gu = 0.06 // junta
        const u0 = u + gu, u1 = u + lw - gu, t0 = t + g0, t1 = t + prof - g0
        const torto = borda ? (rnd(seed, fiada, i + 12) - 0.5) * 0.25 : 0
        const P = (uu: number, tt: number): V3 => {
          const tm = Math.min(L, tt)
          return [ax + dx * tm + nx * (uu + torto), 0.03, az + dz * tm + nz * (uu + torto)]
        }
        const mx = ax + dx * (t + prof / 2) + nx * (u + lw / 2), mz = az + dz * (t + prof / 2) + nz * (u + lw / 2)
        if (!pula(mx, mz) && t1 <= L + 0.2) {
          const cor = [LAJE_A, LAJE_B, LAJE_C][Math.floor(rnd(seed, fiada, i + 20) * 3)]
          const cc = 0.12 // canto cortado
          const pts = [P(u0 + cc, t0), P(u1, t0), P(u1, t1 - cc), P(u1 - cc, t1), P(u0, t1), P(u0, t0 + cc)]
          face(c.geo(mx, mz), pts, [cor, cor, mix(cor, [1, 1, 1], 0.1), cor, mul(cor, 0.92), cor], [0, 1, 0])
        }
        u += lw
      }
      t += prof
      fiada++
    }
  }
}
