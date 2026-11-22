// features/meu-mundo/engine/cena-codigo/pecas/floresta-vermelha.ts — PEÇAS da FLORESTA VERMELHA DE VARKOS
// (o 7º Domínio, o Leão da Guerra; skill meu-mundo-cenario-codigo, peça por peça na vitrine).
//
// FICHA
// O que é:   floresta de outono num campo de guerra antigo: copas vermelhas, laranja e ouro sobre chão PRETO
//            (cinza de queimada), rios de lava como os de Kragor, estandartes de guerra rasgados e armas
//            cravadas no chão. Luz do fim de tarde, quente; o neon vermelho da Gincana marca a trilha.
// Paleta:    chão carvão 0,06–0,12 · casca carvão 0,14–0,22 com fenda em brasa · copa RUBRA (dominante ~60%),
//            LARANJA (~25%) e OURO (~15%, o acento) · pano vermelho-sangue · ouro velho do emblema · brasa.
// Fora:      bicho e figura esculpida (o leão é só o emblema chapado no pano); folhas caindo = efeito do
//            ambiente (`ambiente-fx`), não malha.
//
// PARTES (ordem de construção — §2)
// 1. arvoreRubra  — 9–14 m — ~700 tri perto — grande: tronco + 3 galhos + copa larga; médio: cachos de folhas;
//                   pequeno: folhas facetadas soltas, raízes, fenda de brasa no pé.        (rodadas na vitrine)
// 2. folhico      — mancha de folhas no chão preto (o chão "pega" a cor da copa de cima).
// 3. estandarte   — 4–6 m — mastro preto, travessa, pano vermelho rasgado em tiras, emblema dourado, ponta.
// 4. armaCravada  — espada / lança / machado enterrados tortos, com o montinho de terra preta no pé.
// 5. tocoQueimado — toco carvão com a brasa no corte (o campo de batalha que pegou fogo).
//
// Contrato: (c, x, z, …, lod). `seed` varia a forma. Todas entram no bloco do PÉ (área ±80 m, `geoEm`).

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { blob, face, mix, mul, rnd, tube, type Foliage } from "../kit-natureza"

// ── paleta ──
export const CHAO: RGB = [0.075, 0.065, 0.07] // cinza de queimada (preto puxado a vinho)
export const CHAO_CL: RGB = [0.15, 0.12, 0.12]
export const CHAO_ESC: RGB = [0.04, 0.035, 0.04]
export const CASCA: RGB = [0.32, 0.24, 0.22] // tronco carvão (lado que pega a luz)
export const CASCA_S: RGB = [0.13, 0.1, 0.1]
export const BRASA: RGB = [1, 0.32, 0.06]
export const BRASA_CL: RGB = [1, 0.74, 0.3]
export const SANGUE: RGB = [0.62, 0.05, 0.06] // pano dos estandartes
export const SANGUE_CL: RGB = [0.86, 0.14, 0.1]
export const SANGUE_ESC: RGB = [0.3, 0.02, 0.04]
export const OURO_VELHO: RGB = [0.84, 0.58, 0.2]
export const FERRO: RGB = [0.16, 0.15, 0.17]
export const FERRO_CL: RGB = [0.52, 0.5, 0.52]
// as três copas: rubra domina, laranja acompanha, ouro é o acento
export const RUBRA: Foliage = { dark: [0.42, 0.04, 0.05], mid: [0.8, 0.1, 0.07], hi: [1, 0.34, 0.16] }
export const LARANJA: Foliage = { dark: [0.56, 0.16, 0.03], mid: [0.94, 0.38, 0.06], hi: [1, 0.64, 0.22] }
export const OURO: Foliage = { dark: [0.6, 0.34, 0.04], mid: [0.98, 0.66, 0.12], hi: [1, 0.9, 0.42] }
export const FOLHAS = [RUBRA, LARANJA, OURO] as const

type G = ReturnType<Cena["geo"]>

/** Área jogável (±80 m): a chave do bloco nunca sai dela (a geometria fica onde está). */
const LIM = 79.5
const dentro = (v: number) => Math.max(-LIM, Math.min(LIM, v))
const geoEm = (c: Cena, x: number, z: number) => c.geo(dentro(x), dentro(z))
const luzEm = (c: Cena, x: number, z: number) => c.glow(dentro(x), dentro(z))

/** Copa sorteada pela semente: 60% rubra, 25% laranja, 15% ouro. */
export const copaDe = (seed: number): Foliage => {
  const t = rnd(seed, 77)
  return t < 0.6 ? RUBRA : t < 0.85 ? LARANJA : OURO
}

/** Casca por faceta: alterna luz e sombra (facetado) e escurece no pé (contato). */
const casca = (k: number, y: number, h: number): RGB => mul(k % 2 ? CASCA : mix(CASCA, CASCA_S, 0.6), 0.7 + 0.3 * Math.min(1, y / (h * 0.3)))

/** Folha facetada: losango de 2 triângulos virado para fora do centro `ctr`. */
function folha(g: G, p: V3, ctr: V3, s: number, f: Foliage, seed: number) {
  const nx = p[0] - ctr[0], ny = p[1] - ctr[1], nz = p[2] - ctr[2]
  const L = Math.hypot(nx, ny, nz) || 1
  const n: V3 = [nx / L, ny / L, nz / L]
  const ref: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let a: V3 = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]]
  const la = Math.hypot(...a)
  a = [a[0] / la, a[1] / la, a[2] / la]
  const b: V3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]]
  const rot = rnd(seed, 1) * Math.PI
  const ca = Math.cos(rot), sa = Math.sin(rot)
  const u: V3 = [a[0] * ca + b[0] * sa, a[1] * ca + b[1] * sa, a[2] * ca + b[2] * sa]
  const v: V3 = [b[0] * ca - a[0] * sa, b[1] * ca - a[1] * sa, b[2] * ca - a[2] * sa]
  const P = (du: number, dv: number, dn = 0): V3 => [p[0] + u[0] * du * s + v[0] * dv * s + n[0] * dn * s, p[1] + u[1] * du * s + v[1] * dv * s + n[1] * dn * s, p[2] + u[2] * du * s + v[2] * dv * s + n[2] * dn * s]
  const up = Math.max(0, n[1]) * 0.5 + 0.5
  const t = up * 0.7 + rnd(seed, 2) * 0.4
  const cor = t < 0.4 ? mix(f.dark, f.mid, 0.5) : t < 0.78 ? f.mid : f.hi
  face(g, [P(-1, 0), P(0, 0.62, 0.25), P(0, -0.62, 0.25)], mix(cor, f.dark, 0.25), n)
  face(g, [P(1, 0), P(0, -0.62, 0.25), P(0, 0.62, 0.25)], cor, n)
}

/** Cacho de copa: bolha (o miolo escuro tampa os buracos) com casca de folhas facetadas. */
function cacho(g: G, ctr: V3, r: V3, f: Foliage, seed: number, lod: number, dens = 1) {
  blob(g, ctr, [r[0] * 0.9, r[1] * 0.9, r[2] * 0.9], f, seed)
  if (lod) return
  const n = Math.round((8 + (r[0] + r[1] + r[2]) * 4) * dens)
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n
    const yy = 1 - 2 * t, rr = Math.sqrt(1 - yy * yy), th = k * 2.39996 + rnd(seed, k)
    const p: V3 = [ctr[0] + Math.cos(th) * rr * r[0], ctr[1] + yy * r[1] * (yy < -0.3 ? 0.7 : 1), ctr[2] + Math.sin(th) * rr * r[2]]
    folha(g, p, ctr, Math.min(r[0], r[1]) * (0.42 + rnd(seed, k, 2) * 0.2), f, seed * 97 + k)
  }
}

/**
 * 1. ÁRVORE RUBRA (o bordo de outono da floresta de Varkos): tronco carvão alto e um pouco torto, pé em cone com
 * 4 raízes, FENDA DE BRASA subindo do pé (a árvore que sobreviveu ao fogo); a ~45% abre em 3 galhos que sobem
 * em leque, cada um com um CACHO de copa e um cacho menor na ponta; um cacho no alto do meio fecha a copa.
 * A copa é mais alta que a da Lua (forma de bordo: oval de pé). `perto` = junto do caminho (folhas soltas).
 */
export function arvoreRubra(c: Cena, x: number, z: number, h = 11, seed = 1, lod = 0, folhas: Foliage = copaDe(seed), perto = true) {
  const eco = lod > 0 || !perto
  const g = geoEm(c, x, z)
  const k = h / 11
  const r = (q: number) => rnd(seed, q)
  const lados = lod ? 4 : eco ? 5 : 6
  const la = r(1) * 6.28, lean = (0.3 + r(2) * 0.6) * k
  const dx = Math.cos(la) * lean, dz = Math.sin(la) * lean
  const p1: V3 = [x + dx * 0.3, h * 0.2, z + dz * 0.3]
  const fork: V3 = [x + dx, h * 0.45, z + dz]
  tube(g, [x, 0, z], p1, 0.9 * k, 0.6 * k, lados, (j) => casca(j, 0, h), false)
  tube(g, [p1[0], p1[1] - 0.3 * k, p1[2]], fork, 0.64 * k, 0.46 * k, lados, (j) => casca(j, h * 0.3, h), false)
  // raízes: descem do tronco abrindo
  const nr = lod ? 3 : 4
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2 + r(3) * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    tube(g, [x + ca * 0.3 * k, 1.3 * k, z + sa * 0.3 * k], [x + ca * 1.5 * k, 0, z + sa * 1.5 * k], 0.38 * k, 0.12 * k, 4, (j) => casca(j + i, 0.3, h), false)
  }
  // fenda de brasa no pé (lado sorteado): duas lascas acesas que sobem pela casca
  if (!eco) {
    const L = luzEm(c, x, z)
    const fa = r(6) * 6.28, fx = Math.cos(fa), fz = Math.sin(fa)
    for (let i = 0; i < 2; i++) {
      const y0 = 0.15 + i * 0.9 * k, y1 = y0 + (0.9 + r(7 + i) * 0.5) * k
      const rr = (0.92 - i * 0.12) * k + 0.04
      const ox = -fz * (i ? 0.12 : -0.08), oz = fx * (i ? 0.12 : -0.08)
      const a0: V3 = [x + fx * rr + ox, y0, z + fz * rr + oz], a1: V3 = [x + fx * (rr - 0.18 * k) + ox * 0.5, y1, z + fz * (rr - 0.18 * k) + oz * 0.5]
      const w = 0.11 * k
      face(L, [[a0[0] - fz * w, a0[1], a0[2] + fx * w], [a0[0] + fz * w, a0[1], a0[2] - fx * w], [a1[0], a1[1], a1[2]]], [BRASA, BRASA, BRASA_CL], [fx, 0, fz])
    }
  }
  // galhos em leque, cada um com o seu cacho
  const nb = lod ? 2 : 3
  const a0 = r(4) * 6.28
  for (let i = 0; i < nb; i++) {
    const a = a0 + (i / nb) * Math.PI * 2 + (r(5 + i) - 0.5) * 0.6
    const ca = Math.cos(a), sa = Math.sin(a)
    const R = h * (0.2 + r(10 + i) * 0.07)
    const tip: V3 = [fork[0] + ca * R, h * (0.66 + r(14 + i) * 0.06), fork[2] + sa * R]
    tube(g, fork, tip, 0.34 * k, 0.12 * k, eco ? 4 : 5, (j) => casca(j + i, h, h), false)
    const cy = tip[1] + h * 0.06
    cacho(g, [tip[0], cy, tip[2]], [h * 0.2, h * 0.17, h * 0.2], folhas, seed + i * 7, lod)
    if (lod) continue
    // cacho menor na ponta de fora e outro mais baixo (a copa desce pelas beiras)
    cacho(g, [tip[0] + ca * h * 0.13, cy - h * 0.1, tip[2] + sa * h * 0.13], [h * 0.12, h * 0.1, h * 0.12], folhas, seed + 30 + i, lod, eco ? 0.5 : 1)
  }
  cacho(g, [fork[0], h * 0.86, fork[2]], [h * 0.21, h * 0.16, h * 0.21], folhas, seed + 90, lod)
  if (!eco) {
    tube(g, fork, [fork[0], h * 0.8, fork[2]], 0.3 * k, 0.1 * k, 4, (j) => casca(j, h, h), false)
    // folhas soltas caídas em volta do pé (o chão pega a cor da copa)
    folhico(c, x + dx, z + dz, h * 0.32, seed + 5, folhas, 0)
  }
  c.block(x, z, 0.7 * k, 0.7 * k, h)
}

/**
 * 2. FOLHIÇO: mancha de folhas caídas no chão preto (raio `r`): losangos chatos a 1–3 cm do chão, cada um
 * num tom da copa, mais densos no miolo. `lod` 1 = metade.
 */
export function folhico(c: Cena, x: number, z: number, r: number, seed: number, f: Foliage = copaDe(seed), lod = 0) {
  const g = geoEm(c, x, z)
  const n = Math.round(r * r * (lod ? 0.8 : 1.7))
  for (let k = 0; k < n; k++) {
    const d = Math.sqrt(rnd(seed, k, 1)) * r * (0.4 + 0.6 * rnd(seed, k, 5)), a = rnd(seed, k, 2) * 6.28
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d
    const s = 0.24 + rnd(seed, k, 3) * 0.2, ro = rnd(seed, k, 4) * 6.28
    const ux = Math.cos(ro) * s, uz = Math.sin(ro) * s
    const y = 0.015 + rnd(seed, k, 6) * 0.02
    const t = rnd(seed, k, 7)
    const cor = mul(t < 0.35 ? f.dark : t < 0.8 ? f.mid : f.hi, 0.82 + 0.18 * (1 - d / r))
    face(g, [[px - ux, y, pz - uz], [px - uz * 0.55, y + 0.01, pz + ux * 0.55], [px + ux, y, pz + uz]], cor, [0, 1, 0])
    face(g, [[px - ux, y, pz - uz], [px + ux, y, pz + uz], [px + uz * 0.55, y + 0.01, pz - ux * 0.55]], mix(cor, f.dark, 0.3), [0, 1, 0])
  }
}

/**
 * 3. ESTANDARTE DE GUERRA: mastro preto de 4 lados com anéis de ferro, travessa no alto, PANO vermelho que
 * desce em 4 TIRAS rasgadas (cada uma de comprimento e ponta diferentes, levemente torcidas pelo vento) com a
 * barra dourada em cima e o EMBLEMA do leão (losango de ouro com a juba em 6 pontas) no meio; ponta de lança
 * no topo e uma BRASA presa no pé (o braseiro que o guarda). `ang` = para onde o pano olha.
 */
export function estandarte(c: Cena, x: number, z: number, h = 5, ang = 0, seed = 1, lod = 0) {
  const g = geoEm(c, x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang) // frente do pano
  const ux = Math.cos(ang), uz = -Math.sin(ang) // ao longo da travessa
  const lados = lod ? 4 : 6
  tube(g, [x, 0, z], [x, h, z], 0.09, 0.07, lados, (j) => (j % 2 ? FERRO : mul(FERRO, 0.6)), false)
  if (!lod) for (const y of [0.5, h * 0.55, h - 0.25]) tube(g, [x, y - 0.06, z], [x, y + 0.06, z], 0.12, 0.12, 6, (j) => (j % 2 ? FERRO_CL : FERRO), false)
  // ponta de lança
  const pt: V3 = [x, h + 0.7, z]
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + ang
    const b = ((k + 1) / 4) * Math.PI * 2 + ang
    face(g, [[x + Math.cos(a) * 0.14, h, z + Math.sin(a) * 0.14], [x + Math.cos(b) * 0.14, h, z + Math.sin(b) * 0.14], pt], k % 2 ? FERRO_CL : mul(FERRO_CL, 0.6), [Math.cos((a + b) / 2), 0.3, Math.sin((a + b) / 2)])
  }
  // travessa
  const W = 1.5 + rnd(seed, 1) * 0.3
  const ty = h - 0.35
  tube(g, [x - ux * W * 0.55, ty, z - uz * W * 0.55], [x + ux * W * 0.55, ty, z + uz * W * 0.55], 0.05, 0.05, 4, () => FERRO, true)
  // pano: barra de ouro + 4 tiras rasgadas (2 lados, frente e verso)
  const off = 0.13
  const panoTopo = ty - 0.05
  const barra = 0.18
  const quad = (a: V3, b: V3, cc: V3, d: V3, ca: RGB, cb: RGB) => {
    face(g, [a, b, cc], [ca, ca, cb], [fx, 0, fz])
    face(g, [a, cc, d], [ca, cb, cb], [fx, 0, fz])
    face(g, [a, cc, b], [mul(ca, 0.6), mul(cb, 0.55), mul(ca, 0.6)], [-fx, 0, -fz])
    face(g, [a, d, cc], [mul(ca, 0.6), mul(cb, 0.55), mul(cb, 0.55)], [-fx, 0, -fz])
  }
  const at = (u: number, y: number, n: number): V3 => [x + ux * u + fx * (off + n), y, z + uz * u + fz * (off + n)]
  quad(at(-W / 2, panoTopo, 0), at(W / 2, panoTopo, 0), at(W / 2, panoTopo - barra, 0), at(-W / 2, panoTopo - barra, 0), OURO_VELHO, mul(OURO_VELHO, 0.75))
  const tiras = lod ? 2 : 4
  const Ltot = h * (0.5 + rnd(seed, 2) * 0.12)
  for (let t = 0; t < tiras; t++) {
    const u0 = -W / 2 + (t / tiras) * W, u1 = -W / 2 + ((t + 1) / tiras) * W - (lod ? 0 : 0.02)
    const L = Ltot * (0.7 + rnd(seed, t, 3) * 0.3)
    const segs = lod ? 1 : 3
    let yA = panoTopo - barra
    for (let s = 0; s < segs; s++) {
      const yB = panoTopo - barra - (L * (s + 1)) / segs
      const nA = Math.sin(s * 1.3 + t + seed) * 0.08 * s, nB = Math.sin((s + 1) * 1.3 + t + seed) * 0.08 * (s + 1)
      const sh = (s + 1) / segs
      const cA = mix(SANGUE_CL, SANGUE, s / segs), cB = mix(SANGUE_CL, SANGUE_ESC, sh * 0.8)
      if (s < segs - 1) quad(at(u0, yA, nA), at(u1, yA, nA), at(u1, yB, nB), at(u0, yB, nB), cA, cB)
      else {
        // ponta rasgada: dois dentes de comprimento diferente
        const um = (u0 + u1) / 2, d1 = (0.15 + rnd(seed, t, 4) * 0.35), d2 = (0.1 + rnd(seed, t, 5) * 0.3)
        quad(at(u0, yA, nA), at(um, yA, nA), at(um, yB + 0.1, nB), at(u0, yB - d1, nB), cA, cB)
        quad(at(um, yA, nA), at(u1, yA, nA), at(u1, yB - d2, nB), at(um, yB + 0.1, nB), cA, cB)
      }
      yA = yB
    }
  }
  // emblema do leão: losango de ouro + juba de 6 pontas, colado no pano (2 cm à frente)
  if (!lod) {
    const ey = panoTopo - barra - Ltot * 0.32, er = W * 0.2
    const E = (u: number, y: number): V3 => at(u, y, 0.02)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6, b = ((k + 0.5) / 6) * Math.PI * 2 + Math.PI / 6, cc = ((k + 1) / 6) * Math.PI * 2 + Math.PI / 6
      face(g, [E(Math.cos(a) * er, ey + Math.sin(a) * er), E(Math.cos(b) * er * 1.45, ey + Math.sin(b) * er * 1.45), E(Math.cos(cc) * er, ey + Math.sin(cc) * er)], mul(OURO_VELHO, 0.85), [fx, 0, fz])
    }
    face(g, [E(0, ey + er), E(-er * 0.8, ey), E(0, ey - er)], OURO_VELHO, [fx, 0, fz])
    face(g, [E(0, ey + er), E(0, ey - er), E(er * 0.8, ey)], mul(OURO_VELHO, 1.15), [fx, 0, fz])
    // olhos do leão (2 furos escuros) — dá a cara
    const o = er * 0.22
    for (const s of [-1, 1]) face(g, [E(s * o - 0.05, ey + o * 0.6, ), E(s * o + 0.05, ey + o * 0.6), E(s * o, ey + o * 0.1)], SANGUE_ESC, [fx, 0.0001, fz])
  }
  // montinho de terra preta no pé + brasa (luz)
  const L = luzEm(c, x, z)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, b = ((k + 1) / 6) * Math.PI * 2
    face(g, [[x + Math.cos(a) * 0.55, 0, z + Math.sin(a) * 0.55], [x + Math.cos(b) * 0.55, 0, z + Math.sin(b) * 0.55], [x, 0.22, z]], k % 2 ? CHAO_CL : CHAO, [Math.cos(a), 0.6, Math.sin(a)])
  }
  if (!lod) for (let k = 0; k < 3; k++) {
    const a = rnd(seed, k, 9) * 6.28, d = 0.3 + rnd(seed, k, 10) * 0.15
    const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d
    face(L, [[bx - 0.06, 0.13, bz], [bx + 0.06, 0.13, bz], [bx, 0.17, bz + 0.05]], [BRASA, BRASA, BRASA_CL], [0, 1, 0])
  }
  c.block(x, z, 0.2, 0.2, h)
}

/**
 * 4. ARMA CRAVADA: espada (0), lança (1) ou machado (2) enterrados tortos, com o montinho de terra no pé.
 * ~60–90 tri. Não bloqueia (é pequena e fica na beira).
 */
export function armaCravada(c: Cena, x: number, z: number, ang = 0, seed = 1, lod = 0, tipo = Math.floor(rnd(seed, 1) * 3)) {
  const g = geoEm(c, x, z)
  const inc = 0.18 + rnd(seed, 2) * 0.3, ia = rnd(seed, 3) * 6.28
  const ix = Math.sin(inc) * Math.cos(ia), iz = Math.sin(inc) * Math.sin(ia), iy = Math.cos(inc)
  const along = (d: number): V3 => [x + ix * d, iy * d, z + iz * d]
  const sx = Math.cos(ang), sz = Math.sin(ang) // lado da lâmina
  const L = tipo === 1 ? 2.6 : tipo === 2 ? 1.3 : 1.25
  if (tipo === 1) {
    // lança: haste comprida + ponta + flâmula vermelha curta
    tube(g, along(-0.2), along(L), 0.035, 0.03, lod ? 3 : 5, (j) => (j % 2 ? mul(CASCA, 1.4) : CASCA), false)
    const p0 = along(L), p1 = along(L + 0.45)
    face(g, [[p0[0] - sx * 0.09, p0[1], p0[2] - sz * 0.09], [p0[0] + sx * 0.09, p0[1], p0[2] + sz * 0.09], p1], FERRO_CL, [sz, 0, -sx])
    face(g, [[p0[0] + sx * 0.09, p0[1], p0[2] + sz * 0.09], [p0[0] - sx * 0.09, p0[1], p0[2] - sz * 0.09], p1], mul(FERRO_CL, 0.6), [-sz, 0, sx])
    if (!lod) {
      const f0 = along(L - 0.1), f1 = along(L - 0.5)
      face(g, [f0, f1, [f0[0] + sz * 0.5, f0[1] - 0.18, f0[2] - sx * 0.5]], SANGUE_CL, [sx, 0, sz])
      face(g, [f0, [f0[0] + sz * 0.5, f0[1] - 0.18, f0[2] - sx * 0.5], f1], SANGUE_ESC, [-sx, 0, -sz])
    }
  } else if (tipo === 2) {
    // machado: cabo + lâmina em meia-lua de um lado
    tube(g, along(-0.15), along(L), 0.04, 0.035, lod ? 3 : 5, (j) => (j % 2 ? mul(CASCA, 1.4) : CASCA), false)
    const h0 = along(L - 0.15), h1 = along(L - 0.5)
    const out = 0.55
    const m: V3 = [(h0[0] + h1[0]) / 2 + sx * out, (h0[1] + h1[1]) / 2, (h0[2] + h1[2]) / 2 + sz * out]
    for (const s of [1, -1]) {
      const n: V3 = [-sz * s, 0, sx * s]
      face(g, [h0, [m[0], m[1] + 0.22, m[2]], m], s > 0 ? FERRO_CL : FERRO, n)
      face(g, [h0, m, h1], s > 0 ? mul(FERRO_CL, 0.8) : FERRO, n)
      face(g, [h1, m, [m[0], m[1] - 0.22, m[2]]], s > 0 ? FERRO_CL : FERRO, n)
    }
  } else {
    // espada: lâmina chata com o fio claro, guarda de ouro, punho e pomo
    const b0 = along(-0.25), b1 = along(L * 0.72), w = 0.06
    const n: V3 = [-sz, 0, sx]
    for (const s of [1, -1]) {
      const nn: V3 = [n[0] * s, 0, n[2] * s]
      face(g, [[b0[0] - sx * w, b0[1], b0[2] - sz * w], [b1[0] - sx * w, b1[1], b1[2] - sz * w], [b1[0], b1[1], b1[2]]], s > 0 ? mul(FERRO_CL, 0.75) : FERRO, nn)
      face(g, [[b0[0] - sx * w, b0[1], b0[2] - sz * w], [b1[0], b1[1], b1[2]], [b0[0], b0[1], b0[2]]], s > 0 ? mul(FERRO_CL, 0.75) : FERRO, nn)
      face(g, [[b0[0], b0[1], b0[2]], [b1[0], b1[1], b1[2]], [b1[0] + sx * w, b1[1], b1[2] + sz * w]], s > 0 ? FERRO_CL : FERRO, nn)
      face(g, [[b0[0], b0[1], b0[2]], [b1[0] + sx * w, b1[1], b1[2] + sz * w], [b0[0] + sx * w, b0[1], b0[2] + sz * w]], s > 0 ? FERRO_CL : FERRO, nn)
    }
    const gd = along(L * 0.72)
    tube(g, [gd[0] - sx * 0.22, gd[1], gd[2] - sz * 0.22], [gd[0] + sx * 0.22, gd[1], gd[2] + sz * 0.22], 0.04, 0.04, 4, (j) => (j % 2 ? OURO_VELHO : mul(OURO_VELHO, 0.6)), true)
    tube(g, gd, along(L), 0.03, 0.03, 4, () => SANGUE_ESC, false)
    const pm = along(L + 0.04)
    blob(g, pm, [0.06, 0.06, 0.06], { dark: mul(OURO_VELHO, 0.5), mid: OURO_VELHO, hi: [1, 0.86, 0.5] }, seed)
  }
  // montinho de terra preta (contato)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2, b = ((k + 1) / 5) * Math.PI * 2
    face(g, [[x + Math.cos(a) * 0.3, 0, z + Math.sin(a) * 0.3], [x + Math.cos(b) * 0.3, 0, z + Math.sin(b) * 0.3], [x, 0.1, z]], k % 2 ? CHAO_CL : CHAO_ESC, [Math.cos(a), 0.7, Math.sin(a)])
  }
}

/** 5. TOCO QUEIMADO: toco carvão em 6 gomos com o corte em brasa (anel aceso) e 2 lascas. */
export function tocoQueimado(c: Cena, x: number, z: number, s = 1, seed = 1, lod = 0) {
  const g = geoEm(c, x, z)
  const h = (0.6 + rnd(seed, 1) * 0.5) * s, r = 0.42 * s
  tube(g, [x, 0, z], [x, h, z], r, r * 0.85, lod ? 5 : 7, (j) => casca(j, h * 2, h), false)
  // tampa: carvão por fora, anel de brasa, miolo escuro
  const n = lod ? 5 : 7
  const L = luzEm(c, x, z)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, b = ((k + 1) / n) * Math.PI * 2
    const P = (q: number, rr: number): V3 => [x + Math.cos(q) * rr, h + 0.005, z + Math.sin(q) * rr]
    face(g, [P(a, r * 0.85), P(b, r * 0.85), [x, h, z]], CASCA_S, [0, 1, 0])
    if (!lod) {
      face(L, [P(a, r * 0.7), P(b, r * 0.7), P(b, r * 0.45)], [BRASA, BRASA, BRASA_CL], [0, 1, 0])
      face(L, [P(a, r * 0.7), P(b, r * 0.45), P(a, r * 0.45)], [BRASA, BRASA_CL, BRASA_CL], [0, 1, 0])
    }
  }
  if (!lod) for (let k = 0; k < 2; k++) {
    const a = rnd(seed, k, 3) * 6.28
    const p0: V3 = [x + Math.cos(a) * r * 0.8, h, z + Math.sin(a) * r * 0.8]
    face(g, [[p0[0] - 0.08, h - 0.1, p0[2]], [p0[0] + 0.08, h - 0.1, p0[2]], [p0[0], h + 0.35 * s, p0[2]]], CASCA, [Math.cos(a), 0, Math.sin(a)])
  }
  c.block(x, z, r, r, h)
}

/**
 * RECOLORE o que `desenha` acabou de pôr na cena (corpo e luz de todos os blocos e do fundo): guarda quantos
 * vértices cada Geo tinha antes e passa `corpo`/`luz` só nos novos. É como as peças do Vulcão (lajes) e o
 * castelo da Aeryn vestem o preto e vermelho de Varkos sem cópia do arquivo.
 */
export function recolorir(c: Cena, desenha: () => void, corpo: (r: number, g: number, b: number, porta: boolean) => RGB, luz?: (r: number, g: number, b: number) => RGB) {
  const antes = new Map<object, number>()
  const todos = () => [...c.cells.values(), ...c.glows.values(), c.fundo, c.horizonte, c.horizonteLuz, c.portaGeo, c.portaLuz]
  for (const g of todos()) antes.set(g, g.c.length)
  desenha()
  const luzes = new Set<object>([...c.glows.values(), c.horizonteLuz, c.portaLuz])
  for (const g of todos()) {
    const f = luzes.has(g) ? luz : corpo
    if (!f) continue
    for (let i = antes.get(g) ?? 0; i < g.c.length; i += 4) {
      const n = f(g.c[i], g.c[i + 1], g.c[i + 2], g === c.portaGeo)
      g.c[i] = n[0]
      g.c[i + 1] = n[1]
      g.c[i + 2] = n[2]
    }
  }
}
