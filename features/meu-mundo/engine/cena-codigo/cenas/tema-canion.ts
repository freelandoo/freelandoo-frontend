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
import * as P from "../pecas/canion"

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

/** Maciço = PENHASCO copiado (colunas de faces planas, faixas creme, tampa de capim) + um menor cruzando. */
export function macico(c: Cena, x: number, z: number, s: number, seed: number, lod: number): MesaOut[] {
  const a = P.penhasco(c, x, z, 8 * s, 6.5 * s, 9 * s, seed, lod, true)
  const b = P.penhasco(c, x + 5 * s, z + 4 * s, 4.5 * s, 4 * s, 6 * s, seed + 1, lod, false)
  // blocos caídos no pé (a ref sempre tem rocha solta junto do paredão)
  if (!lod) for (let k = 0; k < 3; k++) {
    const an = rnd(seed, k, 40) * Math.PI * 2
    P.rochaVermelha(c, x + Math.cos(an) * 8.6 * s, z + Math.sin(an) * 7 * s, 1.2 + rnd(seed, k, 41) * 1.2, an, seed * 7 + k, lod, false)
  }
  return [a, b]
}

/** Agulha de arenito copiada (3 blocos de colunas que afinam). */
export function agulha(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  P.agulhaBlocos(c, x, z, h, seed, lod, c.name !== "canion-1" && rnd(seed, 3) < 0.5)
}

/** Rocha vermelha copiada (laje de faces planas com o chanfro claro). */
export function blocoVerm(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  P.rochaVermelha(c, x, z, s, rnd(seed, 4) * 3, seed, c.lod, solid)
}

/** Árvore de outono copiada: redonda (a maioria), bétula de tronco branco (1 em 8), torta de vento (cenas 2–3). */
export function arvoreOutono(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  const r = rnd(seed, 6)
  const tipo = c.name !== "canion-1" && r < 0.45 ? "vento" : r > 0.88 ? "betula" : "redonda"
  P.arvore(c, x, z, tipo === "betula" ? h * 1.5 : h, seed, lod, tipo)
}

export function arbusto(c: Cena, x: number, z: number, r: number, seed: number, lod: number) {
  P.arbustoAmarelo(c, x, z, r * 1.3, seed, lod, rnd(seed, 2) < 0.7 ? P.AMARELO : P.OCRE)
}

/** Capim-dos-pampas copiado (lâminas + plumas creme). */
export function pampa(c: Cena, x: number, z: number, h: number, seed: number) {
  P.pampa(c, x, z, h * 1.6, seed, c.lod)
}

/** Cristal ciano aceso (peça copiada). */
export function cristal(c: Cena, x: number, z: number, s: number, seed: number, lod: number) {
  P.cristalCiano(c, x, z, s, seed, lod)
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

/** Moinho em ruína copiado. */
export function moinho(c: Cena, x: number, z: number, h: number, ang: number, seed: number, lod: number) {
  P.moinhoRuina(c, x, z, h, ang, seed, lod)
}

/** Pedestal de cristal copiado (a fila da estrada da cena 3). */
export function pedestal(c: Cena, x: number, z: number, seed: number, lod: number) {
  P.pedestalCristal(c, x, z, rnd(seed, 1) * 0.3, lod)
}

/** Arco natural copiado, por cima do caminho. */
export function arcoNatural(c: Cena, x: number, z: number, ang: number, vao: number, h: number, lod: number) {
  P.arcoNatural(c, x, z, ang, vao, h, lod)
}

/** Teto de triângulos das cenas do Cânion: fidelidade acima do orçamento de celular (o Alex, 11/11). */
export const TRI_BLOCO = { perto: 16000, longe: 6000, fundo: 6000 }

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
