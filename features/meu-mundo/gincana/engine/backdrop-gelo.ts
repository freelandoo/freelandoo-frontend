// features/meu-mundo/gincana/engine/backdrop-gelo.ts — o fundo das 4 fases do Mar de Gelo pela MINIATURA de cada
// uma (20/11, metade C). Só desenho, longe de quem corre; nas malhas `lit`/`glow` que já existem. Chamado por
// `ice()` de backdrops.ts.
//
// FICHA — Mar de Gelo (miniaturas gelo/portoes/estaleiro/aros.webp + ref-v3/gelo.jpg)
// O que é:        noite polar sobre um mar azul-escuro: penhascos de gelo facetados dos dois lados, icebergs
//                 tabulares, banquisas redondas boiando, colunas de cristal perto da prova e a aurora.
// Silhueta:       penhasco = feixe de prismas de gelo de alturas diferentes (topo serrilhado) com neve no alto;
//                 iceberg = mesa de gelo de lados facetados; banquisa = disco baixo com tampa branca.
// Paleta:         azul-fundo 0,06/0,2/0,44 → ciano 0,36/0,68/0,92 → gelo claro 0,78/0,93/1 → neve 0,94/0,98/1 ·
//                 acento âmbar só nas lâmpadas.
// Fora:           o reflexo espelhado do mar (a textura do fluido já brilha).
//
// PARTES (ordem)
// 1. penhasco de gelo (uma função, aprovado de perto) — prismas em 2 lances (fundo→ciano→claro), neve no topo,
//    sombra de contato azul-escura no pé, lascas claras na quina
// 2. fileiras de penhascos dos dois lados (perto e ao longe), até o fim do percurso
// 3. iceberg tabular — 4. banquisas redondas — 5. colunas de cristal perto da prova

import type { SoftGeo, RGB } from "./shapes"
import { at, mix } from "./shapes"
import { Z0, Z1, rnd } from "./backdrop-base"

const DEEP: RGB = [0.1, 0.28, 0.56]
const CYAN: RGB = [0.48, 0.8, 0.98]
const PALE: RGB = [0.86, 0.97, 1]
const SNOW: RGB = [0.94, 0.98, 1]

/**
 * Penhasco de gelo: um feixe de prismas (5–6 lados) ao longo de \`w\` (eixo u), com alturas sorteadas em volta de
 * \`h\` (o topo fica serrilhado) e fundura \`d\`. Cada prisma em 2 lances: o de baixo do azul-fundo ao ciano, o de
 * cima do ciano ao gelo claro; um chapéu de neve no alto e o pé escuro na água. \`face\` = para onde olha (rad).
 */
export function glacierCliff(lit: SoftGeo, glow: SoftGeo, x: number, z: number, w: number, h: number, d: number, face: number, seed: number) {
  const c = Math.cos(face)
  const s = Math.sin(face)
  const P = (u: number, y: number, v: number, yaw = 0) => at(x + u * c - v * s, y, z - u * s - v * c, face + yaw)
  const n = Math.max(4, Math.round(w / 4))
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * 2 - 1
    const u = t * (w / 2) + (rnd(i, seed) - 0.5) * 2
    const v = (rnd(i, seed + 1) - 0.5) * d * 0.5
    // perfil de montanha: alto no meio, caindo para as pontas; prismas largos e sobrepostos (massa, não colunas)
    const ph = h * (1 - 0.55 * t * t) * (0.75 + rnd(i, seed + 2) * 0.35)
    const pd = (w / n) * (1.7 + rnd(i, seed + 3) * 0.6)
    const sides = 5 + (i % 2)
    const yaw = rnd(i, seed + 4) * 3
    const lo = ph * 0.45
    // lance de baixo (fundo → ciano), de cima (ciano → claro), afinando
    lit.cylinder(pd, lo, P(u, lo / 2 - 1, v, yaw), (_x, y) => mix(DEEP, CYAN, Math.max(0, y / lo + 0.5)), sides, pd * 0.94)
    lit.cylinder(pd * 0.94, ph - lo, P(u, lo - 1 + (ph - lo) / 2, v, yaw), (_x, y) => mix(CYAN, PALE, Math.max(0, y / (ph - lo) + 0.5)), sides, pd * 0.72)
    // neve no topo: tampa baixa um tico mais larga, com a beira azulada
    lit.cylinder(pd * 0.8, 0.9, P(u, ph - 1 + 0.35, v, yaw), (_x, y) => (y > 0 ? SNOW : PALE), sides, pd * 0.62)
    // fenda acesa (o brilho de dentro do gelo), um prisma em cada três, na frente
    if (i % 3 === 1) glow.box(0.16, ph * 0.42, 0.1, P(u + (rnd(i, seed + 5) - 0.5) * pd * 0.4, ph * 0.42, v - pd * 0.47), (_x, y) => mix([0.3, 0.75, 1], [0.75, 0.97, 1], y / (ph * 0.42) + 0.5))
    // lasca de gelo claro encostada (uma em cada duas)
    if (i % 2 === 0) lit.cylinder(pd * 0.35, ph * 0.5, P(u + pd * 0.35, ph * 0.25 - 1, v - pd * 0.35, yaw + 1), (_x, y) => mix(CYAN, SNOW, Math.max(0, y / (ph * 0.5) + 0.5)), 4, pd * 0.08)
  }
  // pé escuro na água (sombra de contato)
  lit.box(w * 0.9, 0.6, d * 0.7, P(0, -0.2, 0), [0.04, 0.12, 0.28])
}

/**
 * Poste de aço da fila dos tubos (miniatura do Mar de Gelo): fuste quadrado azul-aço escuro saindo do mar, com
 * colares claros, pé com gelo grudado, a caixa da lâmpada âmbar acesa (gradiente) sob um chapéu e a gaiola.
 */
export function icePost(lit: SoftGeo, glow: SoftGeo, x: number, z: number, top: number) {
  const ST: RGB = [0.1, 0.13, 0.22]
  const ST_L: RGB = [0.36, 0.44, 0.58]
  const h = top + 1
  lit.box(0.9, h, 0.9, at(x, top - h / 2, z), (_x, y) => mix(ST, [0.16, 0.22, 0.36], Math.max(0, y / h + 0.5)))
  for (const y of [top * 0.3, top * 0.62, top - 0.3]) lit.box(1.1, 0.22, 1.1, at(x, y, z), ST_L)
  lit.cylinder(1.8, 1.4, at(x, 0.2, z, 0.4), (_x, y) => (y > 0.3 ? SNOW : PALE), 6, 1.1)
  lit.box(1.2, 0.18, 1.2, at(x, top + 0.05, z), ST)
  glow.box(0.72, 1, 0.72, at(x, top + 0.65, z), (_x, y) => mix([1, 0.5, 0.14], [1, 0.86, 0.46], y + 0.5))
  for (const c of [-0.38, 0.38]) for (const e of [-0.38, 0.38]) lit.box(0.08, 1.05, 0.08, at(x + c, top + 0.65, z + e), ST)
  lit.cylinder(1.4, 0.35, at(x, top + 1.3, z), ST, 4, 0.5)
}

export function iceSea(lit: SoftGeo, glow: SoftGeo, n: number, phase: string) {
  // gelo: postes de aço com lâmpada âmbar dos dois lados da fila de tubos
  if (phase === "gelo") for (let z = 10; z < Z1 - 70; z += 14) for (const s of [-1, 1]) icePost(lit, glow, s * 8.6, z + (s > 0 ? 7 : 0), 13)
  // 2. penhascos dos dois lados: uma fila perto (x ≈ 46–60, 14–30 m) e uma ao longe mais alta (x ≈ 110–150,
  // 30–60 m), com vãos de mar entre os blocos; frente virada para a prova
  for (const s of [-1, 1]) {
    for (const [x0, xv, h0, hv, step, k0] of [[46, 14, 14, 16, 46, 0], [110, 40, 30, 30, 70, 100]] as [number, number, number, number, number, number][]) {
      if (k0 && n < 1 && s > 0) continue
      for (let z = Z0 - 30 + (s > 0 ? step / 2 : 0), i = 0; z < Z1 + 60; z += step * (0.8 + rnd(i, k0 + s + 7) * 0.5), i++) {
        const k = i * 2 + (s > 0 ? 1 : 0) + k0
        const w = step * (0.45 + rnd(k, 1) * 0.35)
        glacierCliff(lit, glow, s * (x0 + rnd(k, 2) * xv), z, w, h0 + rnd(k, 3) * hv, 10 + rnd(k, 4) * 10, s > 0 ? Math.PI / 2 : -Math.PI / 2, k)
      }
    }
  }
}

/**
 * Pórtico da largada e da chegada do Mar de Gelo (miniaturas 20/11): duas colunas de cristal — prisma sextavado
 * de gelo (fundo → claro), núcleo aceso em faixa, colar e chapéu de aço escuro com a lâmpada âmbar — e a trave de
 * aço com o filete ciano aceso por baixo. Mesma medida do arco de antes (x ±7,6; 8 m de altura).
 */
export function iceArch(lit: SoftGeo, glow: SoftGeo, z: number, y: number) {
  const STEEL: RGB = [0.14, 0.16, 0.22]
  const STEEL_L: RGB = [0.42, 0.48, 0.58]
  for (const s of [-1, 1]) {
    const x = s * 7.8
    lit.cylinder(2.6, 1, at(x, y + 0.5, z), (_x, yy) => (yy > 0.3 ? STEEL_L : STEEL), 6)
    // o cristal brilha por dentro (malha acesa): fundo azul embaixo → gelo claro em cima, e as arestas escuras
    glow.cylinder(2.2, 6.4, at(x, y + 4.2, z, 0.3), (_x, yy) => mix([0.12, 0.42, 0.78], [0.72, 0.94, 1], (yy / 6.4 + 0.5) ** 0.8), 6, 2.0)
    for (let k = 0; k < 6; k++) {
      const a = 0.3 + (k / 6) * Math.PI * 2
      lit.box(0.08, 6.3, 0.08, at(x + Math.sin(a) * 1.06, y + 4.2, z + Math.cos(a) * 1.06), [0.2, 0.42, 0.66])
    }
    lit.cylinder(2.5, 0.9, at(x, y + 7.8, z), (_x, yy) => (yy > 0.2 ? STEEL_L : STEEL), 6)
    lit.cylinder(1.2, 0.5, at(x, y + 8.5, z), STEEL, 8)
    glow.cylinder(0.9, 0.5, at(x, y + 9, z), [1, 0.7, 0.3], 8)
    lit.cylinder(1.3, 0.25, at(x, y + 9.35, z), STEEL, 8, 0.6)
  }
  lit.box(16.6, 0.8, 1.1, at(0, y + 7.9, z), (_x, yy) => (yy > 0.2 ? STEEL_L : STEEL))
  glow.box(14.4, 0.16, 0.9, at(0, y + 7.45, z), [0.6, 0.93, 1])
}
