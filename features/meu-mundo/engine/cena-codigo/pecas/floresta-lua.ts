// features/meu-mundo/engine/cena-codigo/pecas/floresta-lua.ts — PEÇAS COPIADAS da FLORESTA DA LUA (Noctis)
// pela cópia minuciosa (skill meu-mundo-cenario-codigo, `copia.md`). Inventário:
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/floresta-lua.json` (recortes, contagem, medidas).
// Construídas aos poucos, uma por vez, cada uma com âncoras e rodadas pela folha (luz de luar do jogo).
//
// Contrato: (c, x, z, …, lod). Peças redondas (árvore, rochedo) não têm frente; `seed` varia a forma.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { blob, mix, mul, rnd, tube, type Foliage } from "../kit-natureza"

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
