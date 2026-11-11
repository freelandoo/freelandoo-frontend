// Tema do CÂNION DAS TEMPESTADES (Zéphyra) — as 3 cenas usam estas peças. Refs do Alex (11/11,
// trocam a fatia-outono): `pipeline/pecas-codigo/ref/dominios/canion-{1,2,3}.png` e `castelo-zephyra.png`.
//
// FICHA DO AMBIENTE
// Clima:       cena 1 = dia claro de outono; cenas 2–3 = tempestade (céu azul-chumbo, raios ciano).
//              Arenito vermelho em faixas com faixa creme fina, árvores amarelas e laranja, cristais
//              ciano acesos; saturado e quente embaixo, frio em cima.
// Camadas:     (1) chão: capim verde-amarelado + trilha de terra clara (cena 3: lajes creme);
//              (2) relevo: mesas e torres de arenito em andares, arco natural (1), trilhos esculpidos
//              da Pista do Céu (2); (3) água: rio azul-claro (1); (4) vegetação: bosques de outono,
//              arbustos amarelos, capim-dos-pampas; (5) objetos: blocos vermelhos soltos, cristais,
//              torres-moinho em ruína (3), pedestais acesos (3); (6) fundo: mesas e torres na névoa.
// Proporções:  personagem 1,7 m; árvore 4–7 m; mesa 8–22 m; trilha 4,2 m; rio 8 m.
// Cobertura:   ~45% capim, 25% rocha, 12% copa, 10% trilha, 5% água (1), 3% cristais.
// Fora:        personagens, interface.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { block, bush, face, mesa, mix, mul, rnd, strata, tree, tube, tuft, type Foliage, type MesaOut } from "../kit-natureza"

export const CEU_DIA: RGB = [0.5, 0.7, 0.95]
export const NEVOA_DIA: RGB = [0.72, 0.8, 0.92]
export const CEU_TEMP: RGB = [0.2, 0.25, 0.4]
export const NEVOA_TEMP: RGB = [0.36, 0.4, 0.52]
export const LUZ_TEMP = { hemi: 0.95, sol: 0.42, ceu: [0.72, 0.8, 1] as RGB, chao: [0.42, 0.34, 0.36] as RGB, solCor: [0.9, 0.92, 1] as RGB }

export const CAPIM: RGB = [0.5, 0.62, 0.22]
export const CAPIM_SECO: RGB = [0.72, 0.68, 0.28]
export const CAPIM_ESC: RGB = [0.32, 0.46, 0.16]
export const TERRA: RGB = [0.82, 0.68, 0.5]
export const TERRA_VERM: RGB = [0.64, 0.32, 0.2]
export const AREIA: RGB = [0.84, 0.74, 0.54]
export const LAJE: RGB = [0.86, 0.8, 0.7]
export const LAJE_ESC: RGB = [0.66, 0.58, 0.5]
export const VERM: RGB = [0.7, 0.24, 0.16]
export const VERM_ESC: RGB = [0.5, 0.16, 0.12]
export const LARANJA: RGB = [0.8, 0.38, 0.18]
export const CREME: RGB = [0.94, 0.78, 0.6]
export const CIANO: RGB = [0.45, 0.98, 1]
export const CIANO_CL: RGB = [0.85, 1, 1]
export const AGUA_FUNDA: RGB = [0.22, 0.52, 0.78]
export const AGUA_RASA: RGB = [0.46, 0.76, 0.9]
export const ESPUMA: RGB = [0.9, 0.96, 1]
export const FOLHA_AM: Foliage = { dark: [0.62, 0.38, 0.05], mid: [0.94, 0.68, 0.1], hi: [1, 0.88, 0.32] }
export const FOLHA_LA: Foliage = { dark: [0.52, 0.16, 0.04], mid: [0.88, 0.38, 0.08], hi: [1, 0.58, 0.18] }
export const ARBUSTO_AM: Foliage = { dark: [0.5, 0.36, 0.06], mid: [0.86, 0.66, 0.12], hi: [1, 0.86, 0.3] }
export const ARBUSTO_V: Foliage = { dark: [0.26, 0.34, 0.1], mid: [0.5, 0.56, 0.16], hi: [0.72, 0.72, 0.28] }

/** Arenito: vermelho grosso, creme FINO, laranja, vermelho escuro (a assinatura). */
export const ARENITO = strata([[VERM, 1.7], [CREME, 0.3], [LARANJA, 1.1], [VERM_ESC, 0.9], [VERM, 1.5], [CREME, 0.24], [LARANJA, 1.3], [VERM_ESC, 0.8]], 40, 1)

/** Mesa de arenito com colisão (oval) — devolve a mesa. */
export function mesaCanion(c: Cena, o: { x: number; z: number; rx: number; rz: number; h: number; seed: number; lod: number; y0?: number; solid?: boolean; flare?: number }) {
  const m = mesa(c.geo(o.x, o.z), { x: o.x, z: o.z, rx: o.rx, rz: o.rz, h: o.h, strata: ARENITO, seed: o.seed, lod: o.lod, y0: o.y0, flare: o.flare, grass: CAPIM_SECO, seg: o.lod ? 9 : 13 })
  if (o.solid !== false) c.blockOval(o.x, o.z, o.rx * 1.08, o.rz * 1.08, o.h + (o.y0 ?? 0))
  return m
}

/** Maciço = mesa grande + segunda menor cruzando + andar de cima (nunca uma oval sozinha). */
export function macico(c: Cena, x: number, z: number, s: number, seed: number, lod: number): MesaOut[] {
  const a = mesaCanion(c, { x, z, rx: 8 * s, rz: 6.5 * s, h: 9 * s, seed, lod })
  const b = mesaCanion(c, { x: x + 5 * s, z: z + 4 * s, rx: 4.5 * s, rz: 4 * s, h: 6 * s, seed: seed + 1, lod })
  mesaCanion(c, { x: x - 1.5 * s, z: z - 0.5 * s, rx: 4.6 * s, rz: 3.6 * s, h: 5 * s, y0: a.topY, seed: seed + 2, lod, solid: false, flare: 0.05 })
  return [a, b]
}

/** Torre fina de arenito (as agulhas do fundo e da tempestade). */
export function agulha(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  let y = 0
  let w = h * 0.22
  for (let k = 0; k < 3; k++) {
    const hh = h * [0.45, 0.33, 0.22][k]
    block(g, x + (rnd(seed, k) - 0.5) * w * 0.2, z + (rnd(seed, k, 2) - 0.5) * w * 0.2, y - 0.05, y + hh, w, w * 0.85, { strata: ARENITO, seed: seed + k, rot: rnd(seed, k, 3) * 3, taper: 0.82, tilt: 0.04, top: CAPIM_SECO })
    y += hh
    w *= 0.72
  }
  c.block(x, z, h * 0.11, h * 0.1, h)
  void lod
}

/** Bloco vermelho solto (o "perto" das vistas). */
export function blocoVerm(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  const h = s * (0.7 + rnd(seed, 1) * 0.5)
  block(c.geo(x, z), x, z, -0.05, h, s * (1.4 + rnd(seed, 2) * 0.6), s * (1.1 + rnd(seed, 3) * 0.5), { strata: ARENITO, seed, rot: rnd(seed, 4) * 3, taper: 0.86, tilt: 0.06, bevel: 0.1, top: mix(VERM, CREME, 0.25) })
  if (solid && s > 0.6) c.block(x, z, s * 0.8, s * 0.65, h, rnd(seed, 4) * 3)
}

/** Árvore de outono (amarela ~60% / laranja). */
export function arvoreOutono(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  tree(c.geo(x, z), [x, 0, z], { h, r: h * (0.3 + 0.08 * rnd(seed, 3)), leaf: rnd(seed, 1) < 0.6 ? FOLHA_AM : FOLHA_LA, bark: [0.5, 0.36, 0.24], seed, lod })
  c.block(x, z, 0.3, 0.3, 3)
}

export function arbusto(c: Cena, x: number, z: number, r: number, seed: number, lod: number) {
  bush(c.geo(x, z), [x, 0, z], r, rnd(seed, 2) < 0.65 ? ARBUSTO_AM : ARBUSTO_V, seed, lod)
}

/** Capim-dos-pampas: tufo alto claro (só perto). */
export function pampa(c: Cena, x: number, z: number, h: number, seed: number) {
  tuft(c.geo(x, z), [x, 0, z], 6, h, seed, CAPIM_ESC, [0.98, 0.92, 0.72])
}

/** Cristal ciano aceso: 3–5 prismas inclinados saindo de um pé de pedra (vai no `glow`). */
export function cristal(c: Cena, x: number, z: number, s: number, seed: number, lod: number) {
  const G = c.glow(x, z)
  const n = lod ? 2 : 3 + Math.floor(rnd(seed, 1) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2
    const tilt = k ? 0.35 + rnd(seed, k, 3) * 0.35 : 0.08
    const h = s * (k ? 0.55 + rnd(seed, k, 4) * 0.4 : 1)
    const r = s * 0.16 * (k ? 0.7 : 1)
    const bx = x + Math.cos(a) * r * (k ? 1.3 : 0), bz = z + Math.sin(a) * r * (k ? 1.3 : 0)
    const tip: V3 = [bx + Math.cos(a) * h * tilt, h, bz + Math.sin(a) * h * tilt]
    const sh: V3 = [bx + Math.cos(a) * h * tilt * 0.8, h * 0.78, bz + Math.sin(a) * h * tilt * 0.8]
    const m = 5
    for (let j = 0; j < m; j++) {
      const t0 = (j / m) * Math.PI * 2, t1 = ((j + 1) / m) * Math.PI * 2
      const p0: V3 = [bx + Math.cos(t0) * r, -0.05, bz + Math.sin(t0) * r], p1: V3 = [bx + Math.cos(t1) * r, -0.05, bz + Math.sin(t1) * r]
      const q0: V3 = [sh[0] + Math.cos(t0) * r, sh[1], sh[2] + Math.sin(t0) * r], q1: V3 = [sh[0] + Math.cos(t1) * r, sh[1], sh[2] + Math.sin(t1) * r]
      const N: V3 = [Math.cos((t0 + t1) / 2), 0.2, Math.sin((t0 + t1) / 2)]
      face(G, [p0, p1, q1, q0], [mul(CIANO, 0.55), mul(CIANO, 0.55), CIANO, CIANO], N)
      face(G, [q0, q1, tip], [CIANO, CIANO, CIANO_CL], [N[0], 0.7, N[2]])
    }
  }
  if (s > 0.9) c.block(x, z, s * 0.3, s * 0.3, s)
}

/** Raio ciano no céu (zigue-zague em fita, aceso): de `y0` para baixo até `y1`. */
export function raio(c: Cena, x: number, z: number, y0: number, y1: number, seed: number) {
  const G = c.glow(x, z)
  let px = x, py = y0, pz = z
  const n = 7
  for (let k = 0; k < n; k++) {
    const nx = x + (rnd(seed, k, 1) - 0.5) * 6, ny = y0 - ((y0 - y1) * (k + 1)) / n, nz = z + (rnd(seed, k, 2) - 0.5) * 3
    const w = 0.35 * (1 - k / n) + 0.08
    for (const s of [1, -1]) face(G, [[px - w, py, pz], [px + w, py, pz], [nx + w * 0.7, ny, nz], [nx - w * 0.7, ny, nz]], [CIANO_CL, CIANO_CL, CIANO, CIANO], [0, 0, s])
    // galho
    if (k === 2 || k === 4) {
      const bx = nx + (rnd(seed, k, 5) - 0.5) * 8, by = ny - 4
      for (const s of [1, -1]) face(G, [[nx - 0.12, ny, nz], [nx + 0.12, ny, nz], [bx, by, nz]], [CIANO_CL, CIANO_CL, CIANO], [0, 0, s])
    }
    px = nx; py = ny; pz = nz
  }
}

/**
 * Trilho da PISTA DO CÉU: calha de pedra esculpida (fundo + bordas) seguindo uma curva no alto,
 * apoiada em pilares de arenito, com o filete ciano aceso nas bordas. Sem colisão em cima (fica
 * no alto); os pilares têm caixa e ficam fora do caminho (quem chama confere).
 */
export function trilhoCeu(c: Cena, pts: V3[], lod: number, pilar: (x: number, z: number) => boolean) {
  const W = 2.4
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1]
    const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1
    const sx = -dz / L, sz = dx / L
    const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2
    const g = c.geo(mx, mz)
    const P = (p: V3, u: number, dy: number): V3 => [p[0] + sx * u, p[1] + dy, p[2] + sz * u]
    // fundo (por cima e por baixo) e as duas bordas
    face(g, [P(a, -W, 0), P(b, -W, 0), P(b, W, 0), P(a, W, 0)], mix(CREME, VERM, 0.3), [0, 1, 0])
    face(g, [P(a, -W, -0.7), P(a, W, -0.7), P(b, W, -0.7), P(b, -W, -0.7)], VERM_ESC, [0, -1, 0])
    for (const s of [-1, 1]) {
      face(g, [P(a, s * W, -0.7), P(b, s * W, -0.7), P(b, s * W, 0.9), P(a, s * W, 0.9)], VERM, [sx * s, 0, sz * s])
      face(g, [P(a, s * (W - 0.4), 0), P(b, s * (W - 0.4), 0), P(b, s * (W - 0.4), 0.9), P(a, s * (W - 0.4), 0.9)], LARANJA, [-sx * s, 0, -sz * s])
      face(g, [P(a, s * W, 0.9), P(b, s * W, 0.9), P(b, s * (W - 0.4), 0.9), P(a, s * (W - 0.4), 0.9)], CREME, [0, 1, 0])
    }
    if (!lod) {
      const G = c.glow(mx, mz)
      for (const s of [-1, 1]) face(G, [P(a, s * (W - 0.42), 0.55), P(b, s * (W - 0.42), 0.55), P(b, s * (W - 0.42), 0.7), P(a, s * (W - 0.42), 0.7)], CIANO, [-sx * s, 0, -sz * s])
    }
    if (k % 2 === 0 && pilar(a[0], a[2])) {
      tube(c.geo(a[0], a[2]), [a[0], -0.1, a[2]], [a[0], a[1] - 0.6, a[2]], 1.1, 0.8, lod ? 5 : 6, (j) => (j % 2 ? VERM : LARANJA), false)
      c.block(a[0], a[2], 1, 1, a[1])
    }
  }
}

/** Torre-moinho em ruína (cena 3): torre de pedra clara + pás de pano. */
export function moinho(c: Cena, x: number, z: number, h: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const pedra: RGB = [0.86, 0.82, 0.74], pedraE: RGB = [0.64, 0.6, 0.54]
  tube(g, [x, -0.1, z], [x, h, z], h * 0.2, h * 0.15, lod ? 5 : 7, (k) => (k % 2 ? pedra : pedraE), false)
  // topo quebrado (ameias tortas)
  if (!lod) for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + seed
    caixa(g, { x: x + Math.cos(a) * h * 0.14, z: z + Math.sin(a) * h * 0.14, y0: h, y1: h + 0.6 + rnd(seed, k) * 0.8, w: 0.7, d: 0.5, rot: -a, side: pedra, top: pedraE })
  }
  // pás: cruz de 4 braços de madeira com pano, na frente (ang)
  const fx = Math.sin(ang), fz = Math.cos(ang)
  const hub: V3 = [x + fx * h * 0.2, h * 0.78, z + fz * h * 0.2]
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  const madeira: RGB = [0.46, 0.32, 0.2], pano: RGB = [0.92, 0.86, 0.74]
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2 + 0.3
    const ux = sx * Math.cos(t), uy = Math.sin(t), uz = sz * Math.cos(t)
    const L = h * 0.55
    const end: V3 = [hub[0] + ux * L, hub[1] + uy * L, hub[2] + uz * L]
    tube(g, hub, end, 0.09, 0.07, 4, () => madeira, false)
    if (!lod) {
      const vx = sx * Math.cos(t + Math.PI / 2) * 0.9, vy = Math.sin(t + Math.PI / 2) * 0.9, vz = sz * Math.cos(t + Math.PI / 2) * 0.9
      const a: V3 = [hub[0] + ux * L * 0.25, hub[1] + uy * L * 0.25, hub[2] + uz * L * 0.25]
      for (const s of [1, -1]) face(g, [a, end, [end[0] + vx, end[1] + vy, end[2] + vz], [a[0] + vx, a[1] + vy, a[2] + vz]], pano, [fx * s, 0, fz * s])
    }
  }
  c.block(x, z, h * 0.18, h * 0.18, h)
}

/** Pedestal de pedra clara com cristal aceso em cima (marca a estrada da cena 3). */
export function pedestal(c: Cena, x: number, z: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 0.35, w: 1.5, d: 1.5, side: LAJE_ESC, top: LAJE })
  caixa(g, { x, z, y0: 0.35, y1: 1.35, w: 1, d: 1, side: LAJE, top: CREME })
  c.block(x, z, 0.75, 0.75, 1.4)
  const G = c.glow(x, z)
  const s = 0.9
  const n = lod ? 4 : 6
  const top: V3 = [x, 1.35 + s * 1.4, z], bot: V3 = [x, 1.4, z]
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + seed, b = ((k + 1) / n) * Math.PI * 2 + seed
    const pa: V3 = [x + Math.cos(a) * s * 0.35, 1.35 + s * 0.45, z + Math.sin(a) * s * 0.35], pb: V3 = [x + Math.cos(b) * s * 0.35, 1.35 + s * 0.45, z + Math.sin(b) * s * 0.35]
    face(G, [pa, pb, top], [CIANO, CIANO, CIANO_CL], [Math.cos((a + b) / 2), 0.4, Math.sin((a + b) / 2)])
    face(G, [pb, pa, bot], [CIANO, CIANO, mul(CIANO, 0.6)], [Math.cos((a + b) / 2), -0.4, Math.sin((a + b) / 2)])
  }
}

/** Arco natural de arenito por cima do caminho: dois pilares (com caixa) e a ponte de pedra em cima. */
export function arcoNatural(c: Cena, x: number, z: number, ang: number, vao: number, h: number, lod: number) {
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  for (const s of [-1, 1]) {
    const px = x + sx * (vao / 2 + 2.6) * s, pz = z + sz * (vao / 2 + 2.6) * s
    mesaCanion(c, { x: px, z: pz, rx: 3.2, rz: 3.6, h, seed: 70 + s, lod })
  }
  // a ponte: blocos em arco, sem colisão (é alta)
  const n = lod ? 5 : 9
  for (let k = 0; k <= n; k++) {
    const t = k / n
    const u = (t - 0.5) * (vao + 5.2)
    const y = h - 1.2 + Math.sin(t * Math.PI) * 2.2
    const bx = x + sx * u, bz = z + sz * u
    block(c.geo(x, z), bx, bz, y - 2.2, y + 0.6, (vao + 5) / n + 1.2, 4.2, { strata: ARENITO, seed: 300 + k, rot: -ang + Math.PI / 2, taper: 1, tilt: 0.02, top: CAPIM_SECO })
  }
}

/** Pano de fundo do cânion: mesas e agulhas grandes na névoa, fora da área. */
export function fundoCanion(c: Cena, seed: number) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rnd(seed, k) * 0.25
    const d = 110 + rnd(seed, k, 2) * 50
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const rx = 14 + rnd(seed, k, 3) * 16, h = 16 + rnd(seed, k, 4) * 22
    mesa(c.fundo, { x, z, rx, rz: rx * (0.6 + rnd(seed, k, 5) * 0.5), h, strata: ARENITO, seed: seed + k, lod: 1, grass: CAPIM_SECO, seg: 7 })
    if (k % 2 === 0) mesa(c.fundo, { x: x + rx * 0.2, z, rx: rx * 0.5, rz: rx * 0.4, h: h * 0.5, y0: h, strata: ARENITO, seed: seed + k + 50, lod: 1, flare: 0.05, grass: CAPIM_SECO, seg: 7 })
  }
}
