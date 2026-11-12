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
export const COPA: Foliage = { dark: [0.06, 0.26, 0.46], mid: [0.1, 0.5, 0.64], hi: [0.5, 0.86, 0.92] }
export const COPA_FUNDO: Foliage = { dark: [0.06, 0.16, 0.4], mid: [0.12, 0.3, 0.6], hi: [0.26, 0.46, 0.78] }

/** Cor do tronco por faceta: alterna claro e sombra (o facetado da ref) e escurece no pé (contato). */
const casca = (k: number, y: number, h: number): RGB => mul(k % 2 ? LAVANDA : mix(LAVANDA, LAVANDA_S, 0.55), 0.78 + 0.22 * Math.min(1, y / (h * 0.3)))

/**
 * ÁRVORE DA LUA (inventário `arvore-media`, 12 m): tronco branco-lavanda facetado em 2 trechos tortos,
 * 4 raízes-contraforte que abrem no pé (base ~3,9 m), forquilha logo abaixo da copa com 3–4 galhos em leque
 * (cada um com 2 galhinhos) e a COPA EM GUARDA-CHUVA: largura ≈ altura, 5,5 m de espessura, blocos
 * facetados (miolo grande + anel de 7 + chapéu de 3), claros em cima e azul-petróleo embaixo.
 */
export function arvoreLua(c: Cena, x: number, z: number, h = 12, seed = 1, lod = 0, folhas: Foliage = COPA) {
  const g = c.geo(x, z)
  const k = h / 12
  const r = (q: number) => rnd(seed, q)
  // tronco em 2 trechos com desvio (torto), raio 0,95 → 0,7
  const dx = (r(1) - 0.5) * 0.8 * k, dz = (r(2) - 0.5) * 0.8 * k
  const meio: V3 = [x + dx, h * 0.27, z + dz]
  const fork: V3 = [x - dx * 0.4, h * 0.5, z - dz * 0.4]
  const lados = lod ? 5 : 7
  // pé em CONE (a ref abre muito embaixo) e tronco grosso (~2,2 m)
  tube(g, [x, 0, z], [x + dx * 0.3, h * 0.1, z + dz * 0.3], 1.9 * k, 1.2 * k, lados, (j) => casca(j, 0, h), false)
  tube(g, [x + dx * 0.3, h * 0.1, z + dz * 0.3], meio, 1.2 * k, 1.05 * k, lados, (j) => casca(j, h * 0.15, h), false)
  tube(g, meio, fork, 1.05 * k, 0.78 * k, lados, (j) => casca(j, h, h), false)
  // raízes-contraforte: do tronco (1–1,6 m) até o chão a ~2 m, achatando
  const nr = lod ? 3 : 4
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2 + r(3) * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    // contraforte LARGO: sai alto do tronco (2,4 m) e desce abrindo até 2,5 m do centro
    tube(g, [x + ca * 0.45 * k, 2.4 * k, z + sa * 0.45 * k], [x + ca * 1.5 * k, 0.5 * k, z + sa * 1.5 * k], 0.62 * k, 0.4 * k, 4, (j) => casca(j + i, 1, h), false)
    tube(g, [x + ca * 1.5 * k, 0.5 * k, z + sa * 1.5 * k], [x + ca * 2.5 * k, 0, z + sa * 2.5 * k], 0.4 * k, 0.15 * k, 4, (j) => casca(j + i, 0.2, h), false)
  }
  // galhos em leque da forquilha até o fundo da copa, com 2 galhinhos cada
  const ng = lod ? 3 : 4
  const pontas: V3[] = []
  for (let i = 0; i < ng; i++) {
    const a = (i / ng) * Math.PI * 2 + r(4) * 2
    const L = (2.6 + r(5 + i) * 1.2) * k
    const tip: V3 = [fork[0] + Math.cos(a) * L, h * 0.68, fork[2] + Math.sin(a) * L]
    tube(g, fork, tip, 0.4 * k, 0.18 * k, 5, (j) => casca(j, h, h), false)
    pontas.push(tip)
    if (!lod)
      for (const s of [-1, 0, 1]) {
        const b = a + s * 0.55
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
  anel(lod ? 5 : 10, 0.34, 0.06, 0.12, -0.04, 50)
  if (!lod) anel(8, 0.3, 0.06, 0.1, -0.11, 300) // lombos baixos pendendo na beira (o fundo bojudo da ref)
  if (!lod) anel(5, 0.18, 0.05, 0.13, 0.06, 120)
  if (!lod) anel(3, 0.07, 0.03, 0.13, 0.13, 200)
  c.block(x, z, 1.1 * k, 1.1 * k, h)
  return pontas
}

// ── peças 2–4: rochedo com musgo, flor da lua, tufo prateado ──

// base QUENTE de propósito: o luar do jogo é azul forte e puxa tudo para o azul-marinho
export const PEDRA_CL: RGB = [1, 0.92, 0.95] // face do rochedo que pega o luar
export const PEDRA: RGB = [0.82, 0.74, 0.82]
export const PEDRA_S: RGB = [0.62, 0.55, 0.68]
export const MUSGO: RGB = [0.66, 0.78, 0.26]
export const MUSGO_S: RGB = [0.56, 0.7, 0.2]
export const LUZ_FLOR: RGB = [0.16, 0.82, 0.98]
export const LUZ_FLOR_CL: RGB = [0.62, 0.96, 1]

/**
 * ROCHEDO COM MUSGO (inventário `rochedo-musgo`, ~4 × 2,4 m): prisma anguloso de 6 lados irregulares, um
 * pouco mais estreito em cima e com o topo inclinado; facetas grandes em 3 tons (a que pega o luar, a do
 * meio e a sombra) e quina de cima clara; TAMPA de musgo grossa (0,22 m) que transborda 6% e escorre em
 * dentes pela beira. Põe a própria caixa.
 */
export function rochedoMusgo(c: Cena, x: number, z: number, w = 4, h = 2.4, seed = 1, lod = 0) {
  const g = c.geo(x, z)
  const r = (q: number) => rnd(seed, q)
  const n = 6
  const base: [number, number][] = [], ombro: [number, number][] = [], topo: [number, number][] = []
  const hO = h * 0.66 // altura do ombro (dali para cima é chanfro coberto de musgo)
  const tiltX = (r(1) - 0.5) * 0.25, tiltZ = (r(2) - 0.5) * 0.25
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r(3) * 1.2
    const R = (w / 2) * (0.92 + r(4 + k) * 0.3) // pé largo: o rochedo da ref é atarracado
    base.push([Math.cos(a) * R, Math.sin(a) * R * 0.8])
    ombro.push([Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.8 * 0.78])
    topo.push([Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.8 * 0.56])
  }
  const yT = (u: number, v: number) => h + u * tiltX + v * tiltZ
  const P = (p: [number, number], y: number): V3 => [x + p[0], y, z + p[1]]
  const tons: RGB[] = [PEDRA_CL, PEDRA, PEDRA_S]
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (base[k][0] + base[j][0]) / 2, mz = (base[k][1] + base[j][1]) / 2
    // tom pela direção: a face virada para o luar (−x, +z) é a clara
    const luz = -mx * 0.6 + mz * 0.4
    const cor = luz > 0.5 ? tons[0] : luz > -0.5 ? tons[1] : tons[2]
    face(g, [P(base[k], 0), P(base[j], 0), P(ombro[j], hO), P(ombro[k], hO)], [mul(cor, 0.78), mul(cor, 0.78), cor, cor], [mx, 0.15, mz])
    // chanfro do ombro ao topo: MUSGO (a ref tem o musgo descendo pela beira arredondada)
    face(g, [P(ombro[k], hO), P(ombro[j], hO), P(topo[j], yT(...topo[j])), P(topo[k], yT(...topo[k]))], [MUSGO_S, MUSGO_S, MUSGO, MUSGO], [mx, 0.8, mz])
  }
  // tampa de musgo: placa grossa que transborda, com dentes escorrendo
  const borda = topo.map(([u, v]): [number, number] => [u * 1.02, v * 1.02])
  const e = 0.12
  face(g, borda.map((p) => P(p, yT(...p) + e)), MUSGO, [0, 1, 0])
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const a = borda[k], b = borda[j]
    const nx = (a[0] + b[0]) / 2, nz = (a[1] + b[1]) / 2
    face(g, [P(a, yT(...a) - 0.05), P(b, yT(...b) - 0.05), P(b, yT(...b) + e), P(a, yT(...a) + e)], MUSGO_S, [nx, 0, nz])
    if (!lod) {
      // 1–2 dentes de musgo escorrendo pela face
      const oa = ombro[k], ob = ombro[j]
      for (let d = 0; d < 2 + Math.floor(r(30 + k) * 2); d++) {
        const t = 0.15 + r(40 + k * 3 + d) * 0.7, L = 0.2 + r(50 + k * 3 + d) * 0.5
        const pu = (oa[0] + (ob[0] - oa[0]) * t) * 1.01, pv = (oa[1] + (ob[1] - oa[1]) * t) * 1.01
        const len = Math.hypot(ob[0] - oa[0], ob[1] - oa[1]) || 1
        const q = 0.16 + r(60 + k + d) * 0.12
        const du = ((ob[0] - oa[0]) * q) / len, dv = ((ob[1] - oa[1]) * q) / len
        face(g, [P([pu - du, pv - dv], hO + 0.02), P([pu + du, pv + dv], hO + 0.02), P([pu, pv], hO - L)], MUSGO_S, [nx, 0, nz])
      }
    }
  }
  c.block(x, z, w * 0.42, w * 0.34, h + e)
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
