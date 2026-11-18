// features/meu-mundo/gincana/engine/mem-symbols.ts — Gincana 3 (G3-10, Relógio da Praça):
// os 6 símbolos da prova de memória, deitados no plano XZ (frente = +z), cerca de 2 m de lado.
// Forma E cor diferentes (quem não distingue cor ainda distingue a forma). A tela usa as mesmas
// cores em `MEM_SYMBOL_HEX` (ui/mem-symbol.tsx desenha as mesmas formas em SVG).

import { SoftGeo, at, mix, type RGB } from "./shapes"

/** engrenagem, lua, chama, gota, estrela, trevo */
export const MEM_SYMBOL_HEX = ["#F2B705", "#B98CFF", "#FF7A1F", "#FF3B5C", "#5FE3FF", "#5BE37A"] as const
const RGBS: readonly RGB[] = [
  [1, 0.72, 0.08],
  [0.72, 0.52, 1],
  [1, 0.46, 0.1],
  [1, 0.2, 0.32],
  [0.36, 0.88, 1],
  [0.34, 0.9, 0.46],
]

const H = 0.06
const disc = (g: SoftGeo, x: number, z: number, d: number, c: RGB, sides = 14) => g.cylinder(d, H, at(x, 0, z), c, sides)
/** Cone deitado apontando para o ângulo a (0 = +z). */
const spike = (g: SoftGeo, x: number, z: number, a: number, base: number, len: number, c: RGB) =>
  g.cylinder(base, len, at(x + Math.sin(a) * len * 0.5, 0, z + Math.cos(a) * len * 0.5, a, Math.PI / 2, 0), c, 8, 0)

/** Desenha o símbolo s em g (centro na origem; escala k). */
export function memSymbolGeo(g: SoftGeo, s: number, k = 1) {
  const c = RGBS[s]
  const hi = mix(c, [1, 1, 1], 0.45)
  if (s === 0) {
    // engrenagem: aro + 8 dentes + miolo claro
    g.torus(1.25 * k, 0.32 * k, at(0, 0, 0), c, 24)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.roundBox(0.3 * k, H * 2, 0.34 * k, 0.02, at(Math.sin(a) * 0.78 * k, 0, Math.cos(a) * 0.78 * k, a), c, 2)
    }
    disc(g, 0, 0, 0.42 * k, hi, 10)
  } else if (s === 1) {
    // lua crescente: discos ao longo de um arco, grossos no meio
    for (let i = 0; i <= 10; i++) {
      const u = i / 10
      const a = -2.3 + u * 4.6
      const th = Math.sin(u * Math.PI)
      disc(g, Math.sin(a) * 0.62 * k + 0.12 * k, Math.cos(a) * 0.62 * k, (0.16 + 0.42 * th) * k, i === 5 ? hi : c, 12)
    }
  } else if (s === 2) {
    // chama: três línguas para cima (+z) sobre uma base redonda
    disc(g, 0, -0.35 * k, 0.9 * k, c, 16)
    spike(g, 0, -0.2 * k, 0, 0.7 * k, 1.1 * k, c)
    spike(g, -0.3 * k, -0.35 * k, -0.35, 0.45 * k, 0.75 * k, c)
    spike(g, 0.3 * k, -0.35 * k, 0.35, 0.45 * k, 0.75 * k, c)
    disc(g, 0, -0.35 * k, 0.4 * k, hi, 10)
  } else if (s === 3) {
    // gota: bola embaixo, ponta para cima, brilho de lado
    disc(g, 0, -0.25 * k, 1.05 * k, c, 18)
    spike(g, 0, 0.05 * k, 0, 0.82 * k, 0.95 * k, c)
    disc(g, -0.22 * k, -0.35 * k, 0.24 * k, hi, 8)
  } else if (s === 4) {
    // estrela de 5 pontas
    for (let i = 0; i < 5; i++) spike(g, 0, 0, (i / 5) * Math.PI * 2, 0.5 * k, 0.95 * k, c)
    disc(g, 0, 0, 0.62 * k, c, 10)
    disc(g, 0, 0, 0.26 * k, hi, 8)
  } else {
    // trevo de quatro folhas com cabinho
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      disc(g, Math.sin(a) * 0.36 * k, Math.cos(a) * 0.36 * k + 0.1 * k, 0.6 * k, c, 14)
    }
    g.roundBox(0.14 * k, H, 0.6 * k, 0.02, at(0.12 * k, 0, -0.5 * k, 0.4), c, 2)
    disc(g, 0, 0.1 * k, 0.2 * k, hi, 8)
  }
}
