// Tema do MAR DE GELO (Marú) — as 3 cenas usam estas peças. Refs do Alex:
// `pipeline/pecas-codigo/ref/dominios/gelo-{1,2,3}.png` e `castelo-maru.png`.
//
// FICHA DO AMBIENTE
// Clima:       cena 1 = dia claro e frio na costa nevada; cena 2 = caverna de gelo azul com corais
//              brancos e rosa; cena 3 = noite de aurora verde e violeta. Branco-azulado dominante,
//              ciano aceso, acento rosa-coral e madeira dos navios.
// Camadas:     (1) chão: neve batida + mar congelado ciano com rachaduras; (2) relevo: rochas
//              escuras com neve, blocos e paredões de gelo; (3) água: o próprio mar congelado;
//              (4) "vegetação": corais e conchas gigantes (2–3), cristais de gelo; (5) objetos: navios
//              presos no gelo, postes com corda e lanterna (1), arcos de gelo (2), ruínas (3);
//              (6) fundo: montanhas de gelo na névoa.
// Proporções:  personagem 1,7 m; navio 14–20 m; poste 2 m; coral 1,5–4 m; paredão 8–20 m.
// Cobertura:   ~45% neve, 25% gelo do mar, 15% rocha/gelo alto, 8% caminho, 7% corais/cristais.
// Fora:        personagens; a bandeira com o crescente da ref é de outro Domínio (fica sem emblema).

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { block, face, mesa, mix, mul, rnd, strata, tube, type MesaOut } from "../kit-natureza"

export const CEU: RGB = [0.56, 0.76, 0.96]
export const NEVOA: RGB = [0.8, 0.88, 0.97]
export const NEVE: RGB = [0.9, 0.93, 0.98]
export const NEVE_SOMBRA: RGB = [0.68, 0.76, 0.9]
export const GELO: RGB = [0.5, 0.82, 0.92]
export const GELO_ESC: RGB = [0.26, 0.56, 0.74]
export const GELO_CL: RGB = [0.78, 0.95, 1]
export const ROCHA_E: RGB = [0.3, 0.33, 0.42]
export const ROCHA_M: RGB = [0.42, 0.46, 0.56]
export const MADEIRA: RGB = [0.46, 0.3, 0.18]
export const MADEIRA_ESC: RGB = [0.3, 0.19, 0.12]
export const PANO: RGB = [0.88, 0.84, 0.74]
export const CORAL_R: RGB = [0.96, 0.46, 0.52]
export const CORAL_B: RGB = [0.95, 0.94, 0.9]
export const CIANO: RGB = [0.45, 0.95, 1]
export const CIANO_CL: RGB = [0.86, 1, 1]
export const LUZ_LANT: RGB = [1, 0.82, 0.42]

export const ROCHA = strata([[ROCHA_E, 1.4], [ROCHA_M, 0.9], [mix(ROCHA_E, ROCHA_M, 0.5), 1.2]], 30, 5)
export const GELO_ST = strata([[GELO, 1.6], [GELO_CL, 0.5], [mix(GELO, GELO_ESC, 0.5), 1.1], [GELO_CL, 0.3], [GELO_ESC, 0.9]], 40, 7)

/** Chão do mar congelado: ciano com placas e rachaduras claras (para o `color` do ground). */
export function marGelo(x: number, z: number, n: (a: number, b: number, c: number) => number): RGB {
  const cell = n(x * 0.18, 4.4, z * 0.18)
  const crack = Math.abs(n(x * 0.35 + 3, 1.2, z * 0.35) - 0.5) < 0.03
  let col = mix(GELO_ESC, GELO, 0.35 + cell * 0.65)
  if (crack) col = GELO_CL
  return col
}

/** Rocha escura com neve no topo (com caixa). */
export function rochaNeve(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  const h = s * (0.7 + rnd(seed, 1) * 0.6)
  block(c.geo(x, z), x, z, -0.1, h, s * (1.3 + rnd(seed, 2) * 0.6), s * (1.1 + rnd(seed, 3) * 0.5), { strata: ROCHA, seed, rot: rnd(seed, 4) * 3, taper: 0.8, tilt: 0.08, top: NEVE, topHi: [1, 1, 1] })
  if (solid && s > 0.6) c.block(x, z, s * 0.75, s * 0.62, h, rnd(seed, 4) * 3)
}

/** Paredão/iceberg de gelo (mesa em faixas de gelo, platô nevado) com caixa. */
export function paredaoGelo(c: Cena, o: { x: number; z: number; rx: number; rz: number; h: number; seed: number; lod: number; y0?: number; solid?: boolean }): MesaOut {
  const m = mesa(c.geo(o.x, o.z), { x: o.x, z: o.z, rx: o.rx, rz: o.rz, h: o.h, y0: o.y0, strata: GELO_ST, seed: o.seed, lod: o.lod, grass: NEVE, rim: GELO_CL, seg: o.lod ? 9 : 13 })
  if (o.solid !== false) c.blockOval(o.x, o.z, o.rx * 1.08, o.rz * 1.08, o.h + (o.y0 ?? 0))
  return m
}

/** Cristal de gelo aceso (prismas ciano). */
export function cristalGelo(c: Cena, x: number, z: number, s: number, seed: number, lod: number) {
  const G = c.glow(x, z)
  const n = lod ? 2 : 3 + Math.floor(rnd(seed, 1) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2
    const tilt = k ? 0.3 + rnd(seed, k, 3) * 0.4 : 0.06
    const h = s * (k ? 0.5 + rnd(seed, k, 4) * 0.45 : 1)
    const r = s * 0.15
    const bx = x + Math.cos(a) * r * (k ? 1.4 : 0), bz = z + Math.sin(a) * r * (k ? 1.4 : 0)
    const tip: V3 = [bx + Math.cos(a) * h * tilt, h, bz + Math.sin(a) * h * tilt]
    for (let j = 0; j < 4; j++) {
      const t0 = (j / 4) * Math.PI * 2 + a, t1 = ((j + 1) / 4) * Math.PI * 2 + a
      face(G, [[bx + Math.cos(t0) * r, -0.05, bz + Math.sin(t0) * r], [bx + Math.cos(t1) * r, -0.05, bz + Math.sin(t1) * r], tip], [mul(CIANO, 0.6), mul(CIANO, 0.6), CIANO_CL], [Math.cos((t0 + t1) / 2), 0.25, Math.sin((t0 + t1) / 2)])
    }
  }
  if (s > 1) c.block(x, z, s * 0.28, s * 0.28, s)
}

/**
 * NAVIO preso no gelo: casco de madeira inclinado (tábuas em faixas), convés, mastro com verga
 * e pano rasgado. Caixa do tamanho do casco.
 */
export function navio(c: Cena, x: number, z: number, L: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  const tilt = 0.12 + rnd(seed, 1) * 0.12
  const W = L * 0.17, Hh = L * 0.16
  const P = (u: number, v: number, y: number): V3 => [x + fx * u + sx * v, y + v * tilt * 0.6 - 0.6, z + fz * u + sz * v]
  const ring = (u: number, k: number): V3[] => [P(u, -W * k, Hh), P(u, -W * 0.7 * k, Hh * 0.25), P(u, 0, -0.2), P(u, W * 0.7 * k, Hh * 0.25), P(u, W * k, Hh)]
  const n = lod ? 4 : 7
  const us = Array.from({ length: n + 1 }, (_, i) => -L / 2 + (L * i) / n)
  const prof = (u: number) => Math.max(0.05, Math.sin(((u + L / 2) / L) * Math.PI) ** 0.6)
  for (let i = 0; i < n; i++) {
    const a = ring(us[i], prof(us[i])), b = ring(us[i + 1], prof(us[i + 1]))
    for (let j = 0; j < 4; j++) {
      const col = j % 2 ? MADEIRA : MADEIRA_ESC
      face(g, [a[j], b[j], b[j + 1], a[j + 1]], col, j < 2 ? [-sx, -0.3, -sz] : [sx, -0.3, sz])
    }
    // convés
    face(g, [a[0], b[0], b[4], a[4]], mix(MADEIRA, PANO, 0.15), [0, 1, 0])
  }
  // mastro, verga e pano
  const mb = P(L * 0.05, 0, Hh), mt = P(L * 0.05, 0, Hh + L * 0.55)
  tube(g, mb, mt, 0.22, 0.14, lod ? 4 : 5, () => MADEIRA_ESC, true)
  const vy = Hh + L * 0.45
  tube(g, P(L * 0.05, -W * 1.6, vy), P(L * 0.05, W * 1.6, vy), 0.1, 0.1, 4, () => MADEIRA_ESC, false)
  if (!lod)
    for (const s of [1, -1]) {
      const A = P(L * 0.05, -W * 1.5, vy - 0.1), B = P(L * 0.05, W * 1.5, vy - 0.1)
      const C = P(L * 0.05 + 0.4, W * 1.2, vy - L * 0.25), D = P(L * 0.05 + 0.6, -W * 0.3, vy - L * 0.32), E = P(L * 0.05 + 0.4, -W * 1.3, vy - L * 0.22)
      face(g, [A, B, C, D, E], PANO, [fx * s, 0, fz * s])
    }
  c.block(x, z, W * 1.1, L / 2, Hh + 1, ang)
}

/** Poste de madeira com lanterna acesa no alto (cena 1). Devolve o topo para a corda. */
export function poste(c: Cena, x: number, z: number, lod: number): V3 {
  const g = c.geo(x, z)
  tube(g, [x, -0.1, z], [x, 1.7, z], 0.16, 0.14, lod ? 4 : 5, () => MADEIRA, false)
  // tampa de neve
  tube(g, [x, 1.7, z], [x, 1.85, z], 0.2, 0.18, 5, () => NEVE, true)
  if (!lod) {
    const G = c.glow(x, z)
    const y = 1.2
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.78
      const dx = Math.cos(a) * 0.17, dz = Math.sin(a) * 0.17
      face(G, [[x + dx - dz * 0.6, y, z + dz + dx * 0.6], [x + dx + dz * 0.6, y, z + dz - dx * 0.6], [x + dx + dz * 0.6, y + 0.35, z + dz - dx * 0.6], [x + dx - dz * 0.6, y + 0.35, z + dz + dx * 0.6]], LUZ_LANT, [Math.cos(a), 0, Math.sin(a)])
    }
  }
  c.block(x, z, 0.2, 0.2, 1.8)
  return [x, 1.55, z]
}

/** Corda caída entre dois postes. */
export function corda(c: Cena, a: V3, b: V3) {
  const g = c.geo((a[0] + b[0]) / 2, (a[2] + b[2]) / 2)
  const m: V3 = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 0.35, (a[2] + b[2]) / 2]
  tube(g, a, m, 0.04, 0.04, 3, () => MADEIRA_ESC, false)
  tube(g, m, b, 0.04, 0.04, 3, () => MADEIRA_ESC, false)
}

/** Coral ramificado (branco ou rosa): tronco e 3–5 galhos que sobem e se abrem. */
export function coral(c: Cena, x: number, z: number, h: number, cor: RGB, seed: number, lod: number) {
  const g = c.geo(x, z)
  const base: V3 = [x, -0.05, z], mid: V3 = [x, h * 0.4, z]
  tube(g, base, mid, h * 0.08, h * 0.06, 4, () => mul(cor, 0.85), false)
  const n = lod ? 2 : 3 + Math.floor(rnd(seed, 1) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, out = h * (0.25 + rnd(seed, k, 3) * 0.3)
    const tip: V3 = [x + Math.cos(a) * out, h * (0.75 + rnd(seed, k, 4) * 0.3), z + Math.sin(a) * out]
    tube(g, mid, tip, h * 0.05, h * 0.025, 4, () => cor, true)
    if (!lod) {
      const t2: V3 = [tip[0] + Math.cos(a + 1) * h * 0.15, tip[1] + h * 0.15, tip[2] + Math.sin(a + 1) * h * 0.15]
      tube(g, [(mid[0] + tip[0]) / 2, (mid[1] + tip[1]) / 2, (mid[2] + tip[2]) / 2], t2, h * 0.03, h * 0.015, 3, () => cor, true)
    }
  }
  if (h > 1.4) c.block(x, z, h * 0.15, h * 0.15, h)
}

/** Concha gigante em leque (costelas claras e escuras alternadas), em pé, aberta para `ang`. */
export function concha(c: Cena, x: number, z: number, r: number, ang: number, lod: number, cor: RGB = [0.98, 0.9, 0.9]) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  const n = lod ? 5 : 9
  const hinge: V3 = [x, 0.2, z]
  for (let k = 0; k < n; k++) {
    const a0 = Math.PI * (0.08 + (0.84 * k) / n), a1 = Math.PI * (0.08 + (0.84 * (k + 1)) / n)
    const p = (a: number, rr: number, out: number): V3 => [x + sx * Math.cos(a) * rr + fx * out, 0.2 + Math.sin(a) * rr, z + sz * Math.cos(a) * rr + fz * out]
    const col = k % 2 ? cor : mix(cor, CORAL_R, 0.35)
    face(g, [hinge, p(a0, r, r * 0.12), p((a0 + a1) / 2, r * 1.06, r * 0.2), p(a1, r, r * 0.12)], col, [fx, 0.2, fz])
    face(g, [hinge, p(a1, r, r * 0.12), p((a0 + a1) / 2, r * 1.06, r * 0.2), p(a0, r, r * 0.12)], mul(col, 0.8), [-fx, 0.2, -fz])
  }
  c.block(x, z, r * 0.9, r * 0.3, r, -ang + Math.PI / 2)
}

/** Estalactites (pingentes) penduradas a partir de uma altura, num anel de raio `r`. */
export function pingentes(c: Cena, x: number, z: number, y: number, r: number, n: number, seed: number) {
  const g = c.geo(x, z)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k) * Math.PI * 2, d = r * Math.sqrt(rnd(seed, k, 2))
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d
    const L = 1 + rnd(seed, k, 3) * 3
    tube(g, [px, y, pz], [px, y - L, pz], 0.35, 0.02, 4, (j) => (j % 2 ? GELO_CL : GELO), true)
  }
}

/** Arco de gelo por cima do caminho (pilares com caixa, ponte sem colisão) — a "boca da caverna". */
export function arcoGelo(c: Cena, x: number, z: number, ang: number, vao: number, h: number, lod: number) {
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  for (const s of [-1, 1]) paredaoGelo(c, { x: x + sx * (vao / 2 + 2.4) * s, z: z + sz * (vao / 2 + 2.4) * s, rx: 2.8, rz: 3.2, h, seed: 400 + s, lod })
  const n = lod ? 5 : 8
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = (t - 0.5) * (vao + 4.8), y = h - 1 + Math.sin(t * Math.PI) * 2.4
    block(c.geo(x, z), x + sx * u, z + sz * u, y - 2, y + 0.7, (vao + 5) / n + 1.1, 3.6, { strata: GELO_ST, seed: 500 + k, rot: -ang + Math.PI / 2, taper: 1, tilt: 0.02, top: NEVE })
  }
  pingentes(c, x, z, h - 2.4, vao * 0.35, lod ? 0 : 7, Math.round(x * 7 + z))
}

/** Montanhas de gelo do fundo. */
export function fundoGelo(c: Cena, seed: number, cor?: RGB) {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + rnd(seed, k) * 0.3 + 0.4
    const d = 120 + rnd(seed, k, 2) * 40
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const rx = 22 + rnd(seed, k, 3) * 18, h = 22 + rnd(seed, k, 4) * 26
    mesa(c.fundo, { x, z, rx, rz: rx * 0.7, h, strata: GELO_ST, seed: seed + k, lod: 1, grass: cor ?? NEVE, seg: 6 })
    if (k % 2 === 0) mesa(c.fundo, { x: x - rx * 0.15, z, rx: rx * 0.45, rz: rx * 0.4, h: h * 0.6, y0: h, strata: GELO_ST, seed: seed + k + 30, lod: 1, flare: 0.05, grass: cor ?? NEVE, seg: 7 })
  }
}
