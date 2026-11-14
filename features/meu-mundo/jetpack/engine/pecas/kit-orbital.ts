// features/meu-mundo/jetpack/engine/pecas/kit-orbital.ts — CIDADE ORBITAL em código (troca o tema `temas/orbital/v2`).
//
// FICHA (cenário, pela referência "Corrida Neon Pela Cidade Orbital" e pelo Domínio da Cidade Orbital)
// Clima:     megacidade de dia sobre as nuvens, céu azul-lilás; branco, vidro e luz neon.
// Camadas:   passarela de vidro (já em código, orbital-env) → jardineiras e terraços → pórticos hexagonais
//            sobre o caminho, painéis holográficos, elevadores → torres descendo até as nuvens → drones,
//            satélite e jardim flutuante no céu.
// Paleta:    branco-mármore 0,97/0,95/0,92 e sombra 0,78/0,80/0,86 (70%); grafite 0,16/0,18/0,24 e vidro azul
//            (20%); luz ciano 0,3/0,92/1, magenta 1/0,3/0,85, amarelo 1/0,78/0,25 e ouro (10%); copa rosa.
// Peças:     reaproveitadas do Domínio (`pecas/orbital.ts`: torreCristalAneis, arvoreRedonda); novas aqui: torre,
//            pórtico hexagonal, drone, painel holográfico, jardineira, elevador, antena, holo, cápsula, trilho,
//            satélite, jardim flutuante.
// Fora:      nada (não há bicho na Orbital).
// Medidas:   as do tema antigo (orbital-tema2.json, medidas pela caixa no jogo): 1 m de altura, origem e largura
//            iguais (`encaixa`). O PÓRTICO deixa |x| ≤ 0,18 livre de y 0,26 a 0,54 (a caixa do voo, com 30 m de
//            largura e o pé 7,8 m abaixo da passarela).

import { TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { blob, face, mix, mul, type Foliage } from "../../../engine/cena-codigo/kit-natureza"
import { torreCristalAneis, MARMORE, MARMORE_SOMBRA, OURO } from "../../../engine/cena-codigo/pecas/orbital"
import { caixa, cil, bolha, GALAO, GALAO_LUZ, galaoVoo, vigaVoo, cantoVoo, type PalObst, type PalViga } from "./comuns"
import { KitCodigo, daCena, encaixa, novaPeca, type Peca } from "./peca"

const GRAFITE: RGB = [0.16, 0.18, 0.24]
const GRAFITE_ESC: RGB = [0.07, 0.08, 0.12]
const VIDRO: RGB = [0.2, 0.42, 0.62]
const VIDRO_CL: RGB = [0.46, 0.74, 0.92]
const CIANO: RGB = [0.3, 0.92, 1]
const MAGENTA: RGB = [1, 0.3, 0.85]
const AMARELO: RGB = [1, 0.78, 0.25]
/** Vidro fundo das torres (a referência é azul-escuro e violeta, com luz por dentro). */
const VIDRO_FUNDO: RGB = [0.08, 0.14, 0.36]
const VIDRO_VIOLETA: RGB = [0.2, 0.12, 0.42]
const LARANJA: RGB = [1, 0.55, 0.15]
const ROSA: Foliage = { dark: [0.62, 0.2, 0.46], mid: [0.95, 0.46, 0.72], hi: [1, 0.76, 0.9] }
const TERRA: RGB = [0.3, 0.22, 0.16]

/** Prisma de `n` lados de y0 a y1 (raios ra → rb), com faixas de janela acesas (`janelas` = quantos andares). */
function prisma(p: Peca, cx: number, cz: number, y0: number, y1: number, ra: number, rb: number, n: number, cor: RGB, janelas: number, luz: RGB, rot = 0) {
  cil(p.body, [cx, y0, cz], [cx, y1, cz], ra, rb, n, cor, { colB: mix(cor, [1, 1, 1], 0.12), tampa: mix(cor, MARMORE_SOMBRA, 0.4) })
  for (let k = 0; k < janelas; k++) {
    const t0 = (k + 0.35) / janelas, t1 = (k + 0.6) / janelas
    const ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1
    for (let s = 0; s < n; s++) {
      if ((s + k) % 3 === 2) continue
      const a0 = (s / n) * TAU + rot + 0.12, a1 = ((s + 1) / n) * TAU + rot - 0.12
      const r0 = ra + (rb - ra) * t0 + 0.004, r1 = ra + (rb - ra) * t1 + 0.004
      p.glow.quad([cx + Math.cos(a0) * r0, ya, cz + Math.sin(a0) * r0], [cx + Math.cos(a1) * r0, ya, cz + Math.sin(a1) * r0], [cx + Math.cos(a1) * r1, yb, cz + Math.sin(a1) * r1], [cx + Math.cos(a0) * r1, yb, cz + Math.sin(a0) * r1], luz)
    }
  }
}

/** TORRE da megacidade: 3 corpos que afinam (mármore e vidro), anéis acesos, terraço e a agulha. Caixa ±0,2 × 1. */
function torre(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 6 : 8
  prisma(p, 0, 0, 0, 0.42, 0.2, 0.18, n, VIDRO_FUNDO, lod ? 3 : 6, mix(CIANO, VIDRO_CL, 0.5))
  cil(p.glow, [0, 0.42, 0], [0, 0.435, 0], 0.19, 0.19, n, CIANO, { tampa: null })
  prisma(p, 0, 0, 0.435, 0.72, 0.15, 0.13, n, VIDRO_VIOLETA, lod ? 2 : 5, [0.8, 0.6, 1], 0.4)
  cil(p.body, [0, 0.72, 0], [0, 0.74, 0], 0.17, 0.17, n, MARMORE_SOMBRA, { tampa: MARMORE })
  prisma(p, 0, 0, 0.74, 0.9, 0.1, 0.07, n, VIDRO_FUNDO, lod ? 1 : 3, CIANO)
  cil(p.body, [0, 0.9, 0], [0, 1, 0], 0.012, 0.003, 4, MARMORE)
  cil(p.glow, [0, 0.97, 0], [0, 0.985, 0], 0.01, 0.01, 4, MAGENTA, { tampa: null })
  return encaixa(p, { x: [-0.202, 0.201], y: [0, 1], z: [-0.211, 0.21] })
}

/**
 * PÓRTICO hexagonal (frente −z): moldura de 6 lados em grafite com chapas brancas, a faixa ciano por dentro,
 * luzes amarelas nos vértices e o letreiro magenta no alto. Vão de dentro: (±0,42, 0,4), (±0,2, 0,08/0,71).
 */
function portico(lod: number): Peca {
  const p = novaPeca()
  const B = p.body, G = p.glow
  const fora: [number, number][] = [[-0.5, 0.4], [-0.25, 0], [0.25, 0], [0.5, 0.4], [0.25, 0.79], [-0.25, 0.79]]
  const dentro: [number, number][] = [[-0.41, 0.4], [-0.2, 0.075], [0.2, 0.075], [0.41, 0.4], [0.2, 0.715], [-0.2, 0.715]]
  const D = 0.26
  for (let k = 0; k < 6; k++) {
    const j = (k + 1) % 6
    const [ax, ay] = fora[k], [bx, by] = fora[j], [cx, cy] = dentro[j], [dx, dy] = dentro[k]
    const lado = k % 2 ? GRAFITE : [0.24, 0.28, 0.4] as RGB
    // frente e costas (chapas brancas), a borda de fora (grafite) e a de dentro (grafite escuro)
    face(B, [[ax, ay, -D / 2], [bx, by, -D / 2], [cx, cy, -D / 2], [dx, dy, -D / 2]], lado, [0, 0, -1], 0.6)
    face(B, [[bx, by, D / 2], [ax, ay, D / 2], [dx, dy, D / 2], [cx, cy, D / 2]], MARMORE_SOMBRA, [0, 0, 1])
    const nx = (ay + by) / 2 - 0.4, mxo = (ax + bx) / 2
    face(B, [[ax, ay, D / 2], [bx, by, D / 2], [bx, by, -D / 2], [ax, ay, -D / 2]], MARMORE_SOMBRA, [mxo, nx, 0], 1)
    face(B, [[dx, dy, -D / 2], [cx, cy, -D / 2], [cx, cy, D / 2], [dx, dy, D / 2]], GRAFITE_ESC, [-(dx + cx) / 2, -((dy + cy) / 2 - 0.4), 0])
    // a faixa ciano na quina de dentro, na frente
    const t = 0.012
    G.quad([dx, dy, -D / 2 - t], [cx, cy, -D / 2 - t], [cx + (bx - cx) * 0.18, cy + (by - cy) * 0.18, -D / 2 - t], [dx + (ax - dx) * 0.18, dy + (ay - dy) * 0.18, -D / 2 - t], CIANO)
    // luz laranja no vértice de fora
    if (!lod || k % 2 === 0) caixa(G, [ax, ay, -D / 2 - 0.01], [0.05, 0.05, 0.02], LARANJA)
  }
  // nervuras atrás (profundidade da peça antiga: ±0,275)
  for (const z of [-0.27, 0.27]) for (const k of lod ? [1, 4] : [0, 1, 2, 3, 4, 5]) {
    const [ax, ay] = fora[k], [bx, by] = fora[(k + 1) % 6]
    caixa(B, [(ax + bx) / 2, (ay + by) / 2, z * 0.8], [0.06, 0.06, Math.abs(z) * 0.4], GRAFITE, { wear: 1 })
  }
  // o letreiro no alto, com as duas cores
  caixa(B, [0, 0.79, -0.02], [0.32, 0.06, 0.12], GRAFITE_ESC, { top: MARMORE })
  G.quad([-0.13, 0.775, -0.081], [0.13, 0.775, -0.081], [0.13, 0.805, -0.081], [-0.13, 0.805, -0.081], MAGENTA)
  return encaixa(p, { x: [-0.5, 0.5], y: [0, 0.791], z: [-0.275, 0.275] })
}

/** DRONE (girador): casco branco achatado, o olho ciano na frente (−z), 4 braços com rotores e luz magenta. Centro na origem. */
function drone(lod: number): Peca {
  const p = novaPeca()
  bolha(p.body, [0, 0, 0], [0.42, 0.24, 0.62], lod ? 1 : 2, 3, 0.04, (n) => (n[1] > 0.2 ? MARMORE : n[1] < -0.3 ? GRAFITE : MARMORE_SOMBRA), 0.95)
  bolha(p.glow, [0, 0.02, -0.6], [0.16, 0.1, 0.06], 1, 1, 0, () => CIANO)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    caixa(p.body, [sx * 0.42, 0, sz * 0.55], [0.38, 0.06, 0.08], GRAFITE, { ry: sx * sz * 0.9, wear: 1 })
    cil(p.body, [sx * 0.6, 0.04, sz * 0.78], [sx * 0.6, 0.1, sz * 0.78], 0.14, 0.14, lod ? 6 : 10, GRAFITE_ESC, { tampa: GRAFITE })
    cil(p.glow, [sx * 0.6, 0.1, sz * 0.78], [sx * 0.6, 0.11, sz * 0.78], 0.11, 0.11, lod ? 6 : 10, sz < 0 ? CIANO : MAGENTA, { tampa: null })
  }
  return encaixa(p, { x: [-0.742, 0.741], y: [-0.499, 0.5], z: [-1.005, 1] }, "meio")
}

/** PAINEL HOLOGRÁFICO: moldura grafite no plano y–z (vira para ±x), a tela acesa em faixas ciano/magenta. Centro na origem. */
function painel(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0, 0], [0.1, 0.84, 1.5], GRAFITE, { top: MARMORE, wear: 1, fundo: true })
  caixa(p.body, [0, -0.47, 0], [0.18, 0.08, 0.5], MARMORE, { top: MARMORE })
  const n = lod ? 3 : 6
  for (const sx of [-1, 1]) for (let k = 0; k < n; k++) {
    const y0 = -0.36 + (k / n) * 0.72, y1 = y0 + 0.72 / n - 0.02
    const c = mix(CIANO, MAGENTA, k / (n - 1 || 1))
    face(p.glow, [[sx * 0.052, y0, -0.68], [sx * 0.052, y0, 0.68], [sx * 0.052, y1, 0.68], [sx * 0.052, y1, -0.68]], [mul(c, 0.7), mul(c, 0.7), c, c], [sx, 0, 0])
  }
  return encaixa(p, { x: [-0.295, 0.3], y: [-0.498, 0.499], z: [-0.8, 0.798] }, "meio")
}

/** Copa rosa redonda (3 bolhas) num tronco. */
function arvoreRosa(p: Peca, x: number, y: number, z: number, h: number, seed: number, lod: number) {
  cil(p.body, [x, y, z], [x, y + h * 0.5, z], h * 0.05, h * 0.035, 5, [0.36, 0.24, 0.18])
  blob(p.body, [x, y + h * 0.7, z], [h * 0.34, h * 0.26, h * 0.34], ROSA, seed)
  if (!lod) {
    blob(p.body, [x + h * 0.2, y + h * 0.58, z], [h * 0.2, h * 0.16, h * 0.2], ROSA, seed + 1)
    blob(p.body, [x - h * 0.16, y + h * 0.62, z + h * 0.1], [h * 0.2, h * 0.16, h * 0.2], ROSA, seed + 2)
  }
}

/** JARDINEIRA: caixa de mármore com friso de ouro e faixa ciano, terra, árvore rosa e arbustos. Caixa ±0,44 × 1 × ±0,46. */
function jardineira(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0.12, 0], [0.86, 0.24, 0.9], MARMORE, { top: TERRA, wear: 1, frente: MARMORE_SOMBRA })
  caixa(p.body, [0, 0.245, 0], [0.9, 0.025, 0.94], OURO, { top: OURO })
  p.glow.quad([-0.43, 0.06, -0.451], [0.43, 0.06, -0.451], [0.43, 0.08, -0.451], [-0.43, 0.08, -0.451], CIANO)
  arvoreRosa(p, 0.05, 0.25, 0.02, 0.75, 7, lod)
  if (!lod) for (let k = 0; k < 3; k++) blob(p.body, [-0.28 + k * 0.28, 0.3, (k % 2 ? 0.25 : -0.28)], [0.12, 0.08, 0.12], { dark: [0.2, 0.44, 0.14], mid: [0.4, 0.7, 0.2], hi: [0.7, 0.9, 0.4] }, k)
  return encaixa(p, { x: [-0.436, 0.436], y: [0, 1], z: [-0.458, 0.458] })
}

/** ELEVADOR de vidro: tubo de 8 montantes brancos, vidro azulado, anéis ciano, a cabine acesa no meio. Caixa ±0,21 × 1. */
function elevador(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 6 : 8, R = 0.2
  cil(p.body, [0, 0.02, 0], [0, 0.98, 0], R * 0.94, R * 0.94, n, VIDRO_FUNDO, { colB: VIDRO, tampa: MARMORE_SOMBRA, base: true })
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU
    caixa(p.body, [Math.cos(a) * R, 0.5, Math.sin(a) * R], [0.025, 1, 0.025], MARMORE, { ry: -a })
  }
  for (const y of lod ? [0.02, 0.98] : [0.02, 0.26, 0.5, 0.74, 0.98]) cil(p.glow, [0, y - 0.008, 0], [0, y + 0.008, 0], R * 1.02, R * 1.02, n, CIANO, { tampa: null })
  caixa(p.glow, [0, 0.42, 0], [0.18, 0.16, 0.18], mix(AMARELO, [1, 1, 1], 0.4))
  caixa(p.body, [0, 0.33, 0], [0.22, 0.02, 0.22], GRAFITE)
  return encaixa(p, { x: [-0.214, 0.215], y: [0, 0.999], z: [-0.233, 0.234] })
}

/** ANTENA: base de mármore, mastro treliçado, a parabólica virada para o céu e a luz no topo. */
function antena(lod: number): Peca {
  const p = novaPeca()
  caixa(p.body, [0, 0.06, 0], [0.5, 0.12, 0.5], MARMORE, { top: MARMORE_SOMBRA, wear: 1 })
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) cil(p.body, [x * 0.16, 0.12, z * 0.16], [x * 0.04, 0.7, z * 0.04], 0.012, 0.01, 4, GRAFITE)
  if (!lod) for (const y of [0.3, 0.5]) caixa(p.body, [0, y, 0], [0.3 - y * 0.3, 0.015, 0.3 - y * 0.3], GRAFITE)
  // a parabólica: cone raso inclinado
  const c: V3 = [0.02, 0.74, -0.02], n = lod ? 8 : 14, R = 0.33
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU
    const P = (a: number, r: number, dy: number): V3 => [c[0] + Math.cos(a) * r, c[1] + dy + Math.sin(a) * r * 0.35, c[2] + Math.sin(a) * r * 0.85]
    face(p.body, [P(a0, R, 0.12), P(a1, R, 0.12), P(a1, 0.05, 0), P(a0, 0.05, 0)], k % 2 ? MARMORE : MARMORE_SOMBRA, [0, 1, -0.3])
    face(p.body, [P(a1, R, 0.12), P(a0, R, 0.12), P(a0, 0.05, 0), P(a1, 0.05, 0)], GRAFITE, [0, -1, 0.3])
  }
  cil(p.body, [0.02, 0.74, -0.02], [0.02, 0.96, 0.02], 0.01, 0.008, 4, GRAFITE)
  cil(p.glow, [0.02, 0.96, 0.02], [0.02, 1, 0.02], 0.025, 0.025, 6, MAGENTA)
  return encaixa(p, { x: [-0.333, 0.333], y: [0, 1.004], z: [-0.371, 0.37] })
}

/** HOLO: pedestal com anel de ouro e a esfera holográfica (gomos ciano e magenta) flutuando. */
function holo(lod: number): Peca {
  const p = novaPeca()
  cil(p.body, [0, 0, 0], [0, 0.28, 0], 0.28, 0.2, lod ? 8 : 12, MARMORE, { colB: MARMORE_SOMBRA, tampa: GRAFITE })
  cil(p.body, [0, 0.28, 0], [0, 0.31, 0], 0.22, 0.22, lod ? 8 : 12, OURO, { tampa: GRAFITE_ESC })
  cil(p.glow, [0, 0.31, 0], [0, 0.34, 0], 0.16, 0.16, lod ? 8 : 12, CIANO, { tampa: CIANO })
  bolha(p.glow, [0, 0.66, 0], [0.26, 0.26, 0.26], lod ? 1 : 2, 1, 0, (n, y, k) => (k % 3 ? mix(CIANO, [1, 1, 1], 0.3) : MAGENTA))
  return encaixa(p, { x: [-0.304, 0.318], y: [0.003, 0.999], z: [-0.335, 0.347] })
}

/** TORRE DE CRISTAL do Domínio (base de mármore, agulhas azuis, anéis de ouro). Caixa ±0,27 × 1. */
function torre2(lod: number): Peca {
  const p = daCena(lod, (c) => torreCristalAneis(c, 0, 0, 40, 7, lod))
  return encaixa(p, { x: [-0.272, 0.271], y: [0, 1.004], z: [-0.264, 0.263] })
}

/** CÁPSULA do trilho: o gancho em cima, o casco branco alongado em z com a faixa de janelas acesa. */
function capsula(lod: number): Peca {
  const p = novaPeca()
  bolha(p.body, [0, 0.42, 0], [0.4, 0.36, 0.64], lod ? 1 : 2, 2, 0.02, (n) => (n[1] < -0.4 ? GRAFITE : n[1] > 0.3 ? MARMORE : MARMORE_SOMBRA), 0.97)
  for (const sx of [-1, 1]) for (let k = 0; k < (lod ? 3 : 5); k++) {
    const z0 = -0.4 + k * (0.8 / (lod ? 3 : 5)), z1 = z0 + 0.8 / (lod ? 3 : 5) - 0.03
    face(p.glow, [[sx * 0.385, 0.42, z0], [sx * 0.385, 0.42, z1], [sx * 0.37, 0.54, z1], [sx * 0.37, 0.54, z0]], k % 2 ? CIANO : mix(CIANO, [1, 1, 1], 0.5), [sx, 0.2, 0])
  }
  caixa(p.body, [0, 0.86, 0], [0.08, 0.18, 0.3], GRAFITE, { top: MARMORE, wear: 1 })
  caixa(p.body, [0, 0.97, 0], [0.16, 0.06, 0.5], MARMORE_SOMBRA, { top: MARMORE })
  return encaixa(p, { x: [-0.418, 0.419], y: [-0.005, 1.003], z: [-0.667, 0.666] })
}

/** TRILHO (viga): treliça ao longo de x com o trilho de baixo e as luzes. Caixa x −2,12…2,39, y −0,43…0,56. */
function viga2(lod: number): Peca {
  const p = novaPeca()
  const x0 = -2.12, x1 = 2.39
  caixa(p.body, [(x0 + x1) / 2, 0.5, -0.18], [x1 - x0, 0.1, 0.12], MARMORE, { top: MARMORE, wear: 1 })
  caixa(p.body, [(x0 + x1) / 2, 0.5, 0.3], [x1 - x0, 0.1, 0.12], MARMORE, { top: MARMORE, wear: 1 })
  caixa(p.body, [(x0 + x1) / 2, -0.38, 0.06], [x1 - x0, 0.1, 0.3], GRAFITE, { top: MARMORE_SOMBRA, wear: 1, fundo: true })
  const n = lod ? 4 : 8
  for (let k = 0; k <= n; k++) {
    const x = x0 + 0.1 + (k / n) * (x1 - x0 - 0.2)
    for (const z of [-0.18, 0.3]) cil(p.body, [x, -0.33, 0.06], [x + (k % 2 ? 0.25 : -0.25), 0.45, z], 0.025, 0.025, 4, GRAFITE)
  }
  p.glow.quad([x0, -0.33, -0.092], [x1, -0.33, -0.092], [x1, -0.36, -0.092], [x0, -0.36, -0.092], CIANO)
  return encaixa(p, { x: [-2.122, 2.393], y: [-0.431, 0.564], z: [-0.745, 0.378] }, "meio")
}

/** SATÉLITE: corpo de ouro e branco, duas asas de painel solar ao longo de x, a antena e a luz. Centro na origem. */
function satelite(lod: number): Peca {
  const p = novaPeca()
  cil(p.body, [0, -0.3, 0], [0, 0.3, 0], 0.18, 0.18, lod ? 6 : 10, OURO, { colB: mix(OURO, [1, 1, 1], 0.3), tampa: MARMORE, base: true })
  for (const sx of [-1, 1]) {
    caixa(p.body, [sx * 0.28, 0, 0], [0.2, 0.03, 0.03], GRAFITE)
    caixa(p.body, [sx * 0.62, 0, 0], [0.48, 0.5, 0.02], [0.1, 0.16, 0.36], { top: MARMORE, wear: 1 })
    if (!lod) for (let k = 1; k < 4; k++) caixa(p.body, [sx * (0.38 + k * 0.12), 0, -0.012], [0.008, 0.5, 0.008], VIDRO_CL)
  }
  cil(p.body, [0, 0.3, 0], [0, 0.5, 0], 0.01, 0.01, 4, GRAFITE)
  cil(p.glow, [0, 0.45, 0], [0, 0.5, 0], 0.03, 0.03, 5, MAGENTA)
  return encaixa(p, { x: [-0.863, 0.866], y: [-0.502, 0.501], z: [-0.304, 0.302] }, "meio")
}

/** JARDIM FLUTUANTE: disco de mármore com o anel aceso por baixo, grama, duas árvores rosa e um banco. */
function jardim(lod: number): Peca {
  const p = novaPeca()
  cil(p.body, [0, 0.12, 0], [0, 0.22, 0], 0.5, 0.52, lod ? 10 : 16, MARMORE_SOMBRA, { tampa: [0.36, 0.62, 0.22] })
  cil(p.body, [0, 0, 0], [0, 0.12, 0], 0.2, 0.5, lod ? 10 : 16, GRAFITE, { tampa: null, base: true })
  cil(p.glow, [0, 0.11, 0], [0, 0.13, 0], 0.48, 0.48, lod ? 10 : 16, CIANO, { tampa: null })
  arvoreRosa(p, -0.18, 0.22, 0.1, 0.72, 3, lod)
  arvoreRosa(p, 0.24, 0.22, -0.14, 0.52, 5, lod)
  if (!lod) caixa(p.body, [0.12, 0.25, 0.28], [0.22, 0.05, 0.08], MARMORE, { top: OURO })
  return encaixa(p, { x: [-0.538, 0.547], y: [0.002, 0.993], z: [-0.53, 0.526] })
}

const PAL: PalObst = {
  pedra: [GRAFITE_ESC, GRAFITE, MARMORE_SOMBRA],
  capa: null,
  racha: CIANO,
  gema: [[0.16, 0.4, 0.8], [0.3, 0.72, 1], [0.8, 0.95, 1]],
  gemaLuz: CIANO,
  galao: GALAO,
  galaoLuz: GALAO_LUZ,
}
const VIGA: PalViga = { corpo: MARMORE_SOMBRA, quina: MARMORE, fundo: GRAFITE, faixa: null, luz: CIANO }

export type OrbitalPeca = "torre" | "portico" | "drone" | "painel" | "jardineira" | "elevador" | "antena" | "holo" | "torre2" | "capsula" | "viga2" | "satelite" | "jardim" | "galao" | "borda" | "canto"

export function kitOrbital(low: boolean) {
  const lod = low ? 1 : 0
  return new KitCodigo<OrbitalPeca>(
    "orbital",
    // metal limpo e pintado: pouca sujeira, sem ferrugem, brilho de verniz
    { weather: { grime: 0.25, rustAmt: 0, bare: [0.8, 0.86, 1] }, spec: [0.35, 0.38, 0.45], power: 32, self: [0.06, 0.06, 0.08] },
    {
      torre: () => torre(lod),
      portico: () => portico(lod),
      drone: () => drone(lod),
      painel: () => painel(lod),
      jardineira: () => jardineira(lod),
      elevador: () => elevador(lod),
      antena: () => antena(lod),
      holo: () => holo(lod),
      torre2: () => torre2(lod),
      capsula: () => capsula(lod),
      viga2: () => viga2(lod),
      satelite: () => satelite(lod),
      jardim: () => jardim(lod),
      galao: () => galaoVoo(PAL),
      borda: () => vigaVoo(VIGA, "metal"),
      canto: () => cantoVoo(VIGA, "metal"),
    },
  )
}

