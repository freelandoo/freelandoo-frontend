// features/meu-mundo/engine/cena-codigo/neon-dominio.ts — BALIZAS NEON dos Domínios (2026-11-22).
//
// Pedido do Alex: trazer para os Domínios o que deu certo no Rolê Noturno e na Gincana. As luzes do
// chão ficam no jogo (`dominio/engine/domain-floor-lights.ts`); aqui é a peça em pé: a BALIZA acesa
// (o pilarete de neon da beira da pista do Rolê e o marco de checkpoint da Gincana), em pares de
// portão ao longo da trilha e em roda na arena do chefe, com forma e cor de cada Domínio:
//   floresta = pedra lilás com cristal de lua; canion = arenito com cristal ciano;
//   gelo = rocha azul com ponta de gelo; fabrica = ferro e latão com lâmpada âmbar;
//   vulcao = basalto com a fenda em brasa; orbital = mármore com anel rosa e topo ciano.
// Corpo no bloco (cor por vértice) e a luz no `glow` do bloco: continua 1 chamada por bloco.

import { type Geo, type RGB, type V3 } from "./kit"
import { blocked, type Cena } from "./kit-cena"
import type { Planta } from "./dominio"

export type TemaNeon = "floresta" | "canion" | "gelo" | "fabrica" | "vulcao" | "orbital" | "vermelha"

interface EstiloBaliza {
  n: number
  corpo: RGB
  corpoEsc: RGB
  base: RGB
  luz: RGB
  luzCl: RGB
  topo: "cristal" | "lampada" | "brasa"
  h: number
  r: number
}

const ESTILO: Record<TemaNeon, EstiloBaliza> = {
  floresta: { n: 6, corpo: [0.66, 0.62, 0.8], corpoEsc: [0.42, 0.38, 0.56], base: [0.46, 0.6, 0.3], luz: [0.5, 0.86, 1], luzCl: [0.86, 0.97, 1], topo: "cristal", h: 1.25, r: 0.2 },
  canion: { n: 6, corpo: [0.86, 0.42, 0.33], corpoEsc: [0.56, 0.22, 0.2], base: [0.95, 0.84, 0.7], luz: [0.36, 0.92, 1], luzCl: [0.86, 1, 1], topo: "cristal", h: 1.3, r: 0.22 },
  gelo: { n: 6, corpo: [0.4, 0.5, 0.8], corpoEsc: [0.2, 0.26, 0.5], base: [0.92, 0.96, 1], luz: [0.45, 0.88, 1], luzCl: [0.9, 0.98, 1], topo: "cristal", h: 1.3, r: 0.2 },
  fabrica: { n: 8, corpo: [0.36, 0.33, 0.42], corpoEsc: [0.2, 0.18, 0.25], base: [0.94, 0.62, 0.22], luz: [1, 0.72, 0.2], luzCl: [1, 0.95, 0.6], topo: "lampada", h: 1.2, r: 0.19 },
  vulcao: { n: 6, corpo: [0.32, 0.27, 0.31], corpoEsc: [0.18, 0.15, 0.18], base: [0.42, 0.4, 0.46], luz: [1, 0.4, 0.06], luzCl: [1, 0.84, 0.36], topo: "brasa", h: 1.2, r: 0.23 },
  orbital: { n: 6, corpo: [0.97, 0.95, 0.92], corpoEsc: [0.74, 0.76, 0.84], base: [0.96, 0.76, 0.36], luz: [1, 0.44, 0.82], luzCl: [0.6, 0.95, 1], topo: "lampada", h: 1.3, r: 0.18 },
  // Floresta Vermelha: obelisco preto com a fenda de neon vermelho e a brasa dourada no topo
  vermelha: { n: 4, corpo: [0.09, 0.07, 0.08], corpoEsc: [0.04, 0.03, 0.035], base: [0.2, 0.06, 0.05], luz: [1, 0.1, 0.08], luzCl: [1, 0.7, 0.3], topo: "brasa", h: 1.35, r: 0.2 },
}

const SUN: V3 = [0.48, 0, 0.3]
const sombra = (nx: number, nz: number) => 0.74 + 0.26 * Math.max(0, nx * SUN[0] + nz * SUN[2]) / Math.hypot(SUN[0], SUN[2])
const mulc = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

/** Prisma de `n` lados de y0 (raio r0) a y1 (raio r1), com tampa em cima. `luz` = sem sombra (vai no glow). */
function prisma(g: Geo, x: number, z: number, y0: number, y1: number, r0: number, r1: number, n: number, cor: RGB, corBaixo: RGB, luz = false, rot = 0, tampa = true) {
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2
    const k0 = luz ? 1 : sombra(Math.cos(am), Math.sin(am))
    const top = mulc(cor, k0), bot = mulc(corBaixo, k0)
    // anti-horário visto de fora: normal para fora
    g.quad([x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0], [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0], [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1], [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1], [bot, bot, top, top])
  }
  if (tampa && r1 > 0.001) {
    const c = mulc(cor, luz ? 1 : 1.08)
    for (let k = 0; k < n; k++) {
      const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2
      g.quad([x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1], [x, y1, z], [x, y1, z], c)
    }
  }
}

/** Ponta em pirâmide (cristal) de y0 a y0 + h. */
function ponta(g: Geo, x: number, z: number, y0: number, r: number, h: number, n: number, cor: RGB, corPe: RGB, rot = 0) {
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2
    g.quad([x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], [x, y0 + h, z], [x, y0 + h, z], [corPe, corPe, cor, cor])
  }
}

/** Uma baliza neon no chão em (x, z). `s` = escala (1 = 1,2–1,3 m; arena usa maior). */
export function baliza(c: Cena, x: number, z: number, tema: TemaNeon, s = 1, seed = 0, lod = 0) {
  const E = ESTILO[tema]
  const g = c.geo(x, z), G = c.glow(x, z)
  const n = lod ? Math.min(E.n, 6) : E.n
  const r = E.r * s, h = E.h * s, rot = seed * 0.37
  // pé (degrau largo) e corpo afinando
  prisma(g, x, z, 0, 0.16 * s, r * 1.55, r * 1.45, n, E.base, mulc(E.base, 0.7), false, rot)
  prisma(g, x, z, 0.16 * s, h, r, r * 0.86, n, E.corpo, E.corpoEsc, false, rot)
  // faixa de neon (2–3 cm à frente do corpo): uma no Rolê, duas na arena (s > 1)
  const fx = (y: number, t: number) => {
    const rr = r * (1 - (0.14 * (y - 0.16 * s)) / (h - 0.16 * s)) + 0.025
    prisma(G, x, z, y, y + t, rr, rr - 0.004, n, E.luz, E.luz, true, rot, false)
  }
  fx(h * 0.62, 0.11 * s)
  if (s > 1.05) fx(h * 0.34, 0.07 * s)
  const top = r * 0.86
  if (E.topo === "cristal") {
    // cristal de luz sobre o corpo (a ponta da lua / do cânion / do gelo)
    prisma(G, x, z, h, h + 0.12 * s, top * 0.7, top * 0.78, n, E.luz, E.luz, true, rot + 0.3, false)
    ponta(G, x, z, h + 0.12 * s, top * 0.78, 0.42 * s, n, E.luzCl, E.luz, rot + 0.3)
  } else if (E.topo === "lampada") {
    // lâmpada (prisma aceso) com chapéu do corpo
    prisma(G, x, z, h, h + 0.2 * s, top + 0.01, top + 0.01, n, E.luzCl, E.luz, true, rot, false)
    prisma(g, x, z, h + 0.2 * s, h + 0.27 * s, top * 1.25, top * 1.05, n, E.base, mulc(E.base, 0.75), false, rot)
  } else {
    // brasa: a boca da baliza acesa, com borda de ferro
    prisma(g, x, z, h, h + 0.08 * s, top * 1.18, top * 1.12, n, E.base, mulc(E.base, 0.7), false, rot, false)
    prisma(G, x, z, h - 0.02, h + 0.05 * s, top * 0.95, top * 0.95, n, E.luzCl, E.luz, true, rot)
  }
}

/** Distância de (x, z) ao ponto do jogo mais perto entre `nomes`. */
const longe = (c: Cena, x: number, z: number, nomes: string[]) => Math.min(...nomes.map((n) => (c.pontos[n] ? Math.hypot(c.pontos[n].x - x, c.pontos[n].z - z) : Infinity)))

/**
 * Balizas em pares (portão de luz) ao longo do caminho principal, a cada `passo` m, a `meia` + 1 m do
 * meio da trilha. Pula clareira, arena, portais, castelo, relevo e o que já tem caixa. Chame logo
 * depois de `planta` (e dos portais): as balizas reservam o lugar, e o resto da cena desvia.
 */
export function balizasDoCaminho(c: Cena, P: Planta, tema: TemaNeon, lod: number, o: { passo?: number; meia?: number } = {}) {
  const passo = o.passo ?? 20
  const d = (o.meia ?? 2.4) + 1
  let total = 0
  for (let k = 0; k < P.path.length - 1; k++) total += Math.hypot(P.path[k + 1][0] - P.path[k][0], P.path[k + 1][1] - P.path[k][1])
  let n = 0
  for (let s = passo * 0.6; s < total - 6; s += passo) {
    const p = P.at(s / total)
    for (const lado of [-1, 1]) {
      const x = p.x - p.dz * d * lado, z = p.z + p.dx * d * lado
      if (P.beira(x, z) < 3 || P.aberto(x, z) > 0.02 || P.dWalk(x, z) < d - 0.4) continue
      if (longe(c, x, z, ["entrada", "saida"]) < 9) continue
      const K = P.castelo
      if (K && Math.abs(x - K.x) < K.w / 2 + 4 && Math.abs(z - K.z) < K.d / 2 + 4) continue
      if (blocked(c, x, z, 0.7) || Math.abs(c.height(x, z)) > 0.25) continue
      baliza(c, x, z, tema, 1, n++, lod)
      c.block(x, z, 0.26, 0.26, 1.4)
      P.reserva(x, z, 1.1)
    }
  }
}

/** Roda de balizas maiores em volta da arena do chefe (o fim de fase da Gincana). */
export function balizasDaArena(c: Cena, P: Planta, tema: TemaNeon, lod: number, n = 8) {
  const A = P.arena
  const R = A.r + 1.6
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.PI / n
    const x = A.x + Math.sin(a) * R, z = A.z + Math.cos(a) * R
    if (P.beira(x, z) < 3 || P.dWalk(x, z) < 3.4) continue
    const K = P.castelo
    if (K && Math.abs(x - K.x) < K.w / 2 + 1 && Math.abs(z - K.z) < K.d / 2 + 1) continue
    if (blocked(c, x, z, 0.8) || Math.abs(c.height(x, z)) > 0.25) continue
    baliza(c, x, z, tema, 1.35, k + 11, lod)
    c.block(x, z, 0.32, 0.32, 1.8)
    P.reserva(x, z, 1.3)
  }
}
