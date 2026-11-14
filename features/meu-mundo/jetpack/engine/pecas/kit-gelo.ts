// features/meu-mundo/jetpack/engine/pecas/kit-gelo.ts — TEMPESTADE ÁRTICA em código (troca o tema `temas/gelo/v2`).
//
// FICHA (cenário, pela referência "Voo Jetpack na Caverna de Gelo" e pelo Domínio do Mar de Gelo)
// Clima:     caverna glacial azul, neve clara ao sol, luz ciano nos cristais e na tecnologia.
// Camadas:   estrada de gelo (já em código, ice-env) → blocos e montes → cristais acesos → base/acampamento
//            → pórtico tecnológico sobre o caminho → teto com pingentes → aurora (céu já em código).
// Paleta:    neve 0,92/0,96/1 (sol) → 0,52/0,62/0,86 (sombra); gelo ciano 0,36/0,82/0,98; rocha azul-ardósia;
//            metal grafite; acentos laranja (janelas, farol) ~10%.
// Peças:     reaproveitadas do Domínio (`pecas/gelo.ts`: iceberg, cristalGelo, navio, pingente, rochaNeve);
//            novas aqui: pórtico, base, iglu, pinheiro, farol, estalactites.
// Fora:      mamute e mamute congelado (BICHO: continuam no Tripo, regra da skill).
// Medidas:   as do tema antigo (gelo2.json): 1 m de altura, origem e largura iguais (`encaixa`).

import { TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { face, mix, mul, rnd } from "../../../engine/cena-codigo/kit-natureza"
import { cristalGelo, navio, GELO, GELO_CL, GELO_ESC, GELO_FUNDO, NEVE, NEVE_SOMBRA, CIANO } from "../../../engine/cena-codigo/pecas/gelo"
import { caixa, cil, cristal, bolha, GALAO, GALAO_LUZ, rochaVoo, cristalVoo, galaoVoo, vigaVoo, cantoVoo, type PalObst, type PalViga } from "./comuns"
import { KitCodigo, daCena, encaixa, novaPeca, type Peca } from "./peca"

const METAL: RGB = [0.16, 0.18, 0.24]
const METAL_CL: RGB = [0.48, 0.54, 0.66]
const METAL_ESC: RGB = [0.06, 0.07, 0.1]
const LUZ: RGB = [0.45, 0.95, 1]
const LUZ_Q: RGB = [1, 0.72, 0.3]
const PINHO: RGB = [0.1, 0.3, 0.3]
const PINHO_CL: RGB = [0.18, 0.44, 0.4]

/** Pingentes: a laje de gelo do teto (em y 0) e 6–9 pingentes descendo até −1. Caixa x ±0,58, z ±0,66. */
function estalactites(lod: number): Peca {
  const p = novaPeca()
  bolha(p.body, [0, -0.05, 0], [0.4, 0.08, 0.46], 1, 4, 0.25, (n) => (n[1] > 0.3 ? NEVE : n[1] < -0.3 ? GELO_ESC : GELO), 0.6)
  const n = lod ? 7 : 13
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rnd(k, 2) * 0.6, r = 0.08 + 0.4 * rnd(k, 3)
    const L = 0.3 + 0.65 * rnd(k, 4) * (1 - r * 0.8)
    cristal(p.body, [Math.cos(a) * r, -0.08, Math.sin(a) * r * 1.1], [0, -1, 0], 0.07 + 0.06 * rnd(k, 5), L * 0.55, L * 0.45, 5, [GELO_ESC, GELO, GELO_CL], k)
  }
  // o maior, no meio, com o miolo aceso
  cristal(p.glow, [0.02, -0.1, 0.03], [0, -1, 0], 0.13, 0.5, 0.42, 6, [mul(LUZ, 0.55), LUZ, [0.85, 1, 1]], 1)
  return encaixa(p, { x: [-0.58, 0.58], y: [-1, 0], z: [-0.66, 0.66] }, "cima")
}

/** Bloco de gelo da beira: lascas azuis facetadas (fundo escuro → quina clara) e a tampa de neve; um bloco menor encostado. */
function blocoGelo(lod: number): Peca {
  const p = novaPeca()
  const tint = (n: V3, y: number, k: number): RGB => {
    if (n[1] > 0.55 && y > 0.55) return rnd(k, 2) > 0.5 ? NEVE : mix(NEVE, NEVE_SOMBRA, 0.4)
    const t = 0.5 + 0.5 * n[1] + (rnd(k, 5) - 0.5) * 0.4
    return t < 0.45 ? mix(GELO_ESC, GELO, t / 0.45) : mix(GELO, GELO_CL, (t - 0.45) / 0.55)
  }
  bolha(p.body, [0, 0.42, 0], [0.86, 0.5, 0.8], lod ? 1 : 2, 2, 0.22, tint, 0.7)
  bolha(p.body, [0.55, 0.2, 0.45], [0.38, 0.26, 0.36], 1, 8, 0.25, tint, 0.7)
  bolha(p.body, [0, 0.03, 0], [0.95, 0.07, 0.9], 1, 4, 0.2, (n) => (n[1] > 0.3 ? NEVE : NEVE_SOMBRA), 0.6)
  return encaixa(p, { x: [-0.91, 0.91], y: [0, 1], z: [-0.89, 0.88] })
}

/** O pórtico congelado (32 m de vão no jogo): dois pilares de metal com gelo, viga com pingentes, vão livre ±0,2 até y 0,5. */
function portico(lod: number): Peca {
  const p = novaPeca()
  const B = p.body, G = p.glow
  const H = 0.87, d = 0.32
  for (const sx of [-1, 1]) {
    const x = sx * 0.37
    // pilar em 3 andares de chapa (recuando para cima), base larga
    caixa(B, [x, 0.06, 0], [0.24, 0.12, d + 0.04], METAL_ESC, { top: METAL_CL, wear: 1 })
    caixa(B, [x, 0.33, 0], [0.2, 0.42, d], METAL, { top: METAL_CL, wear: 1, frente: mix(METAL, METAL_CL, 0.15) })
    caixa(B, [x, 0.66, 0], [0.17, 0.24, d * 0.9], METAL, { top: METAL_CL, wear: 1 })
    // chapas da frente com filete aceso e janelinhas
    for (let k = 0; k < 4; k++) caixa(B, [x, 0.17 + k * 0.1, -d / 2 - 0.006], [0.15, 0.07, 0.012], mix(METAL, METAL_CL, 0.25), { wear: 1 })
    G.quad([x - 0.012, 0.14, -d / 2 - 0.016], [x + 0.012, 0.14, -d / 2 - 0.016], [x + 0.012, 0.52, -d / 2 - 0.016], [x - 0.012, 0.52, -d / 2 - 0.016], LUZ)
    // a crosta de gelo subindo pelo pilar (do lado de fora: nada entra no vão)
    bolha(B, [x + sx * 0.07, 0.22, 0.02], [0.08, 0.24, d * 0.62], 1, 3 + sx, 0.35, (n) => (n[1] > 0.4 ? NEVE : GELO_CL), 0.5)
    bolha(B, [x + sx * 0.05, 0.02, 0], [0.16, 0.06, d * 0.7], 1, 7 + sx, 0.3, () => NEVE, 0.5)
    // braço inclinado até a viga
    caixa(B, [x - sx * 0.05, 0.74, 0], [0.09, 0.18, d * 0.7], METAL_ESC, { ry: 0 })
  }
  // viga de cima: duas chapas, o letreiro aceso e a neve por cima
  caixa(B, [0, 0.8, 0], [1, 0.1, d], METAL, { top: NEVE, wear: 1, frente: mix(METAL, METAL_CL, 0.2) })
  caixa(B, [0, 0.715, -0.01], [0.62, 0.07, d * 0.9], METAL_ESC, { top: METAL })
  G.quad([-0.24, 0.7, -d / 2 - 0.02], [0.24, 0.7, -d / 2 - 0.02], [0.24, 0.73, -d / 2 - 0.02], [-0.24, 0.73, -d / 2 - 0.02], LUZ)
  for (let k = 0; k < 5; k++) G.quad([-0.3 + k * 0.15 - 0.02, 0.77, -d / 2 - 0.02], [-0.3 + k * 0.15 + 0.02, 0.77, -d / 2 - 0.02], [-0.3 + k * 0.15 + 0.02, 0.83, -d / 2 - 0.02], [-0.3 + k * 0.15 - 0.02, 0.83, -d / 2 - 0.02], k % 2 ? LUZ_Q : LUZ)
  bolha(B, [0, 0.86, 0], [0.5, 0.025, d * 0.55], 1, 11, 0.3, () => NEVE, 0.6)
  // pingentes da viga (param em y 0,6: o vão de baixo continua livre)
  for (let k = 0; k < (lod ? 6 : 12); k++) {
    const x = -0.44 + (k / (lod ? 5 : 11)) * 0.88
    const L = 0.04 + 0.08 * rnd(k, 9)
    cristal(B, [x, 0.68, -0.05 + rnd(k, 8) * 0.1], [0, -1, 0], 0.012, L * 0.5, L * 0.5, 4, [GELO_ESC, GELO, GELO_CL], k)
  }
  return encaixa(p, { x: [-0.5, 0.5], y: [0, H], z: [-0.18, 0.18] }, "baixo")
}

/** Base congelada na encosta: módulo de metal com teto de neve, cúpula, antena, janelas acesas e tanques. Frente para +z. */
function base(lod: number): Peca {
  const p = novaPeca()
  const B = p.body, G = p.glow
  caixa(B, [0, 0.2, 0], [0.9, 0.4, 0.8], METAL, { top: NEVE, wear: 1, frente: mix(METAL, METAL_CL, 0.2) })
  caixa(B, [-0.15, 0.5, 0.05], [0.5, 0.22, 0.55], mix(METAL, METAL_CL, 0.15), { top: NEVE, wear: 1 })
  // janelas acesas na frente (+z)
  for (let k = 0; k < 4; k++) G.quad([-0.36 + k * 0.2 + 0.06, 0.18, 0.402], [-0.36 + k * 0.2, 0.18, 0.402], [-0.36 + k * 0.2, 0.3, 0.402], [-0.36 + k * 0.2 + 0.06, 0.3, 0.402], k % 2 ? LUZ_Q : LUZ)
  G.quad([0.05, 0.52, 0.327], [-0.35, 0.52, 0.327], [-0.35, 0.58, 0.327], [0.05, 0.58, 0.327], LUZ)
  // cúpula de radar e a antena
  bolha(B, [0.25, 0.42, -0.15], [0.17, 0.17, 0.17], lod ? 1 : 2, 3, 0.02, (n) => (n[1] > 0.5 ? NEVE : METAL_CL))
  cil(B, [-0.3, 0.6, -0.1], [-0.3, 0.98, -0.1], 0.02, 0.012, 5, METAL_CL)
  cil(G, [-0.3, 0.97, -0.1], [-0.3, 1.0, -0.1], 0.025, 0.025, 6, [1, 0.3, 0.2])
  // tanques e neve amontoada no pé
  for (const [x, z] of [[0.38, 0.3], [0.38, 0.1]] as const) cil(B, [x, 0, z], [x, 0.22, z], 0.07, 0.07, 8, mix(METAL, [0.7, 0.3, 0.2], 0.5), { tampa: NEVE })
  bolha(B, [0, 0.0, 0], [0.55, 0.08, 0.5], 1, 6, 0.3, (n) => (n[1] > 0.3 ? NEVE : NEVE_SOMBRA), 0.6)
  return encaixa(p, { x: [-0.55, 0.55], y: [0, 1], z: [-0.57, 0.57] })
}

/** Iglu de blocos de neve com a entrada e a luz de dentro. Frente para +z. Caixa ±0,81 × 1. */
function iglu(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 8 : 12, rings = lod ? 3 : 5
  for (let i = 0; i < rings; i++) {
    const a0 = (i / rings) * (Math.PI / 2), a1 = ((i + 1) / rings) * (Math.PI / 2)
    for (let k = 0; k < n; k++) {
      const off = (i % 2) * 0.5
      const t0 = ((k + off) / n) * TAU, t1 = ((k + 1 + off) / n) * TAU
      const P = (t: number, a: number, s = 1): V3 => [Math.cos(t) * Math.cos(a) * s, Math.sin(a) * s * 0.95, Math.sin(t) * Math.cos(a) * s]
      const c = rnd(i, k, 3) > 0.5 ? NEVE : mix(NEVE, NEVE_SOMBRA, 0.35)
      face(p.body, [P(t0 + 0.02, a0 + 0.015), P(t1 - 0.02, a0 + 0.015), P(t1 - 0.02, a1 - 0.015), P(t0 + 0.02, a1 - 0.015)], [mul(c, 0.86), mul(c, 0.86), c, c], P((t0 + t1) / 2, (a0 + a1) / 2), 0.3)
      // junta (o bloco aparece pela sombra entre eles)
      face(p.body, [P(t0, a0, 0.985), P(t1, a0, 0.985), P(t1, a1, 0.985), P(t0, a1, 0.985)], NEVE_SOMBRA, P((t0 + t1) / 2, (a0 + a1) / 2))
    }
  }
  // o túnel da entrada (+z) com a boca escura e a luz quente
  caixa(p.body, [0, 0.24, 0.95], [0.5, 0.48, 0.4], NEVE, { top: NEVE, ao: 0.82 })
  face(p.body, [[-0.17, 0, 1.152], [0.17, 0, 1.152], [0.17, 0.34, 1.152], [-0.17, 0.34, 1.152]], [0.08, 0.1, 0.16], [0, 0, 1])
  face(p.glow, [[-0.12, 0.02, 1.155], [0.12, 0.02, 1.155], [0.12, 0.24, 1.155], [-0.12, 0.24, 1.155]], [mul(LUZ_Q, 0.6), mul(LUZ_Q, 0.6), LUZ_Q, LUZ_Q], [0, 0, 1])
  return encaixa(p, { x: [-0.81, 0.81], y: [0, 1], z: [-0.8, 0.8] })
}

/** Pinheiro nevado: tronco, 4 andares de copa com a neve por cima. Caixa ~0,85 × 1. */
function pinheiro(lod: number): Peca {
  const p = novaPeca()
  cil(p.body, [0, 0, 0], [0, 0.3, 0], 0.05, 0.04, 5, [0.3, 0.2, 0.15])
  const tiers = lod ? 3 : 4
  for (let i = 0; i < tiers; i++) {
    const y0 = 0.14 + i * (0.78 / tiers), r = 0.42 * (1 - i / (tiers + 0.6))
    cil(p.body, [0, y0, 0], [0, y0 + 0.34, 0], r, 0.02, lod ? 6 : 8, PINHO, { colB: PINHO_CL, tampa: null, base: true })
    // a neve: anel claro na metade de cima de cada andar
    cil(p.body, [0, y0 + 0.13, 0], [0, y0 + 0.26, 0], r * 0.64, r * 0.25, lod ? 6 : 8, NEVE_SOMBRA, { colB: NEVE, tampa: null, ao: 1 })
  }
  cil(p.body, [0, 0.92, 0], [0, 1, 0], 0.06, 0.005, 6, NEVE)
  return encaixa(p, { x: [-0.41, 0.44], y: [0, 1], z: [-0.32, 0.45] })
}

/** Farol de expedição: mastro treliçado, a lanterna laranja acesa em cima e a bandeira. Caixa ±0,34 × 1. */
function farol(): Peca {
  const p = novaPeca()
  const B = p.body
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [0.14, 0.14], [-0.14, 0.14]] as const) cil(B, [x * 1.7, 0, z * 1.7], [x * 0.5, 0.78, z * 0.5], 0.018, 0.014, 5, METAL_CL)
  for (const y of [0.22, 0.46, 0.66]) caixa(B, [0, y, 0], [0.4 - y * 0.3, 0.025, 0.4 - y * 0.3], METAL, { wear: 1 })
  caixa(B, [0, 0.8, 0], [0.2, 0.05, 0.2], METAL_ESC, { top: NEVE })
  cil(p.glow, [0, 0.83, 0], [0, 0.95, 0], 0.07, 0.07, 8, LUZ_Q)
  caixa(B, [0, 0.98, 0], [0.18, 0.04, 0.18], METAL_ESC, { top: NEVE })
  for (const [x, z] of [[-0.07, -0.07], [0.07, -0.07], [0.07, 0.07], [-0.07, 0.07]] as const) caixa(B, [x, 0.89, z], [0.016, 0.12, 0.016], METAL_ESC)
  caixa(B, [0.12, 0.66, 0], [0.22, 0.12, 0.012], [0.7, 0.18, 0.14], { ao: 0.8 })
  bolha(B, [0, 0.0, 0], [0.32, 0.05, 0.3], 1, 2, 0.3, () => NEVE, 0.6)
  return encaixa(p, { x: [-0.34, 0.34], y: [0, 1], z: [-0.32, 0.32] })
}

const PAL: PalObst = {
  pedra: [GELO_FUNDO, GELO_ESC, mix(GELO, GELO_CL, 0.5)],
  capa: NEVE,
  racha: null,
  gema: [GELO_ESC, GELO, GELO_CL],
  gemaLuz: [0.75, 1, 1],
  galao: GALAO,
  galaoLuz: GALAO_LUZ,
}
const VIGA: PalViga = { corpo: [0.1, 0.34, 0.62], quina: NEVE, fundo: [0.05, 0.12, 0.24], faixa: null, luz: LUZ }

export type GeloPeca = "estalactites" | "base" | "cristal" | "bloco2" | "portico" | "iglu" | "pinheiro" | "farol" | "navio" | "rocha-voo" | "gema-voo" | "galao" | "borda" | "canto"

export function kitGelo(low: boolean) {
  const lod = low ? 1 : 0
  return new KitCodigo<GeloPeca>(
    "gelo",
    { weather: { grime: 0.35, rustAmt: 0, bare: [0.95, 0.98, 1] }, spec: [0.25, 0.3, 0.38], power: 24, self: [0.04, 0.05, 0.07] },
    {
      estalactites: () => estalactites(lod),
      portico: () => portico(lod),
      base: () => base(lod),
      iglu: () => iglu(lod),
      pinheiro: () => pinheiro(lod),
      farol: () => farol(),
      // Domínio do Mar de Gelo: iceberg (o bloco), o grupo de cristais e o navio quebra-gelo
      bloco2: () => blocoGelo(lod),
      cristal: () => encaixa(daCena(lod, (c) => cristalGelo(c, 0, 0, 2.2, 4, lod, CIANO, false)), { x: [-0.51, 0.51], y: [0, 1], z: [-0.55, 0.55] }),
      // o casco vem com a proa em +x no Domínio; meia-volta em y no pool: proa para quem chega
      navio: () => encaixa(daCena(lod, (c) => navio(c, 0, 0, Math.PI / 2, 22, { adorna: 0.22, empina: 0.18, afunda: 1.6, quebrado: true, seed: 3 }, lod)), { x: [-0.62, 0.62], y: [0, 0.98], z: [-0.53, 0.51] }),
      "rocha-voo": () => rochaVoo(PAL, 9),
      "gema-voo": () => cristalVoo(PAL, 4),
      galao: () => galaoVoo(PAL),
      borda: () => vigaVoo(VIGA, "gelo"),
      canto: () => cantoVoo(VIGA, "gelo"),
    },
  )
}
