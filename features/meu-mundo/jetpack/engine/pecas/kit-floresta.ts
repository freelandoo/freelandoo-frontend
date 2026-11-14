// features/meu-mundo/jetpack/engine/pecas/kit-floresta.ts — FLORESTA BIOLUMINESCENTE em código (troca o tema `temas/floresta/v2`).
//
// FICHA (cenário, pela referência "Voo Jetpack pelo Cânion Bioluminescente" e pelo Domínio da Floresta da Lua)
// Clima:     cânion de floresta à noite, névoa ciano; rio turquesa embaixo; tudo que é vivo acende.
// Camadas:   rio e encostas (já em código, floresta-env) → degraus de pedra com musgo → plantas de folha larga,
//            cristais violeta e flores acesas na beira → cogumelos gigantes, casa-cogumelo, ninho → árvores
//            colossais ao fundo (copa rosa e copa verde-água) → raízes em arco sobre o caminho → cipós (já em código).
// Paleta:    pedra lavanda/cinza-violeta com musgo lima; troncos lavanda; copa rosa 0,82/0,30/0,68 e verde-água;
//            luz: ciano 0,28/0,86/1 (cogumelos, veios), violeta 0,72/0,4/1 (cristais), âmbar nas janelas (~10%).
// Peças:     reaproveitadas do Domínio (`pecas/floresta-lua.ts`: arvoreLua, rochedoMusgo, florLua,
//            troncoCaidoLua, lanternaCasulo); novas aqui: cogumelo gigante, casa-cogumelo, cristais, planta,
//            arco de raízes, ninho, tronco-viga.
// Fora:      nada (não há bicho na Floresta do Jetpack).
// Medidas:   as do tema antigo (floresta-tema2.json, medidas pela caixa no jogo): 1 m de altura, origem e largura
//            iguais (`encaixa`); o ARCO deixa livre |x| ≤ 0,23 até y 0,28 (a caixa do voo + 6,4 m de cada lado).

import { TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { blob, face, mix, mul, rnd, tube, type Foliage } from "../../../engine/cena-codigo/kit-natureza"
import { arvoreLua, rochedoMusgo, florLua, troncoCaidoLua, lanternaCasulo, COPA, LAVANDA, LAVANDA_S, MUSGO, MUSGO_S, PEDRA, PEDRA_S } from "../../../engine/cena-codigo/pecas/floresta-lua"
import { caixa, cil, bolha, cristal, GALAO, GALAO_LUZ, galaoVoo, vigaVoo, cantoVoo, type PalObst, type PalViga } from "./comuns"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { KitCodigo, daCena, encaixa, junta, moved, novaPeca, type Peca } from "./peca"

const CIANO: RGB = [0.28, 0.86, 1]
const CIANO_CL: RGB = [0.72, 0.98, 1]
const VIOLETA: RGB = [0.62, 0.26, 1]
const VIOLETA_ESC: RGB = [0.34, 0.14, 0.62]
const VIOLETA_CL: RGB = [0.9, 0.74, 1]
const AMBAR: RGB = [1, 0.74, 0.36]
const ROSA: Foliage = { dark: [0.4, 0.12, 0.4], mid: [0.8, 0.3, 0.68], hi: [1, 0.62, 0.88] }
const FOLHA: RGB = [0.1, 0.36, 0.26]
const FOLHA_CL: RGB = [0.26, 0.62, 0.42]
const RAIZ: RGB = [0.36, 0.26, 0.34]
const RAIZ_CL: RGB = [0.62, 0.52, 0.66]

/**
 * As peças do Domínio são claras de propósito (o luar do Domínio puxa para o azul-marinho); a Floresta do Jetpack
 * é um cânion escuro onde só o que é vivo acende. O CORPO vai para o violeta-azulado fundo (pedra, tronco, raiz)
 * e o musgo para o verde-água escuro; a LUZ fica como está.
 */
function noite(p: Peca): Peca {
  const c = p.body.c
  for (let i = 0; i < c.length; i += 4) {
    const r = c[i], g = c[i + 1], b = c[i + 2]
    if (g > r * 1.05 && g > b * 0.9) {
      const k = (r + g + b) / 3
      c[i] = 0.06 + k * 0.1
      c[i + 1] = 0.22 + k * 0.32
      c[i + 2] = 0.2 + k * 0.22
    } else {
      c[i] = r * 0.4
      c[i + 1] = g * 0.34
      c[i + 2] = b * 0.66
    }
  }
  return p
}

/** ÁRVORE COLOSSAL de copa rosa (o fundo da referência). Caixa ±0,64 × 1 × ±0,83. */
function arvore(lod: number): Peca {
  const p = daCena(lod, (c) => arvoreLua(c, 0, 0, 14, 5, lod, ROSA, !lod))
  return encaixa(p, { x: [-0.639, 0.642], y: [0, 0.994], z: [-0.834, 0.832] })
}

/** ÁRVORE média de copa verde-água. Caixa ±0,39 × 1 × ±0,3. */
function arvore2(lod: number): Peca {
  // a copa larga do Domínio estreita (a árvore 2 antiga é alta e fina)
  const p = moved(daCena(lod, (c) => arvoreLua(c, 0, 0, 12, 9, lod, COPA, false)), Matrix.Scaling(0.62, 1, 0.62))
  return encaixa(p, { x: [-0.385, 0.39], y: [0, 1], z: [-0.294, 0.296] })
}

/** Chapéu de cogumelo: aba larga, domo, a borda de baixo escura; o chapéu ACENDE (`cor`) com pintas claras. */
function chapeu(p: Peca, c: V3, R: number, h: number, cor: RGB, n: number, seed: number, pintas: number) {
  const aba: V3[] = [], meio: V3[] = []
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rnd(seed, 1)
    aba.push([c[0] + Math.cos(a) * R, c[1], c[2] + Math.sin(a) * R])
    meio.push([c[0] + Math.cos(a) * R * 0.62, c[1] + h * 0.72, c[2] + Math.sin(a) * R * 0.62])
  }
  const topo: V3 = [c[0], c[1] + h, c[2]]
  const esc = mul(cor, 0.55), cl = mix(cor, [1, 1, 1], 0.45)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n, a = ((k + 0.5) / n) * TAU
    face(p.glow, [aba[k], aba[j], meio[j], meio[k]], [esc, esc, cor, cor], [Math.cos(a), 0.5, Math.sin(a)])
    face(p.glow, [meio[k], meio[j], topo], [cor, cor, cl], [Math.cos(a), 1.5, Math.sin(a)])
    // lamelas embaixo: escuras (o chapéu acende por cima, a sombra fica por baixo)
    face(p.body, [aba[j], aba[k], [c[0], c[1] + h * 0.12, c[2]]], mix(VIOLETA_ESC, [0.1, 0.1, 0.2], 0.4), [0, -1, 0])
  }
  for (let k = 0; k < pintas; k++) {
    const a = rnd(seed, k + 5) * TAU, rr = R * (0.25 + rnd(seed, k + 9) * 0.35), y = c[1] + h * (0.95 - rr / R * 0.5)
    const px = c[0] + Math.cos(a) * rr, pz = c[2] + Math.sin(a) * rr, e = R * 0.07
    face(p.glow, [[px - e, y + 0.004, pz], [px, y + 0.004, pz - e], [px + e, y + 0.004, pz], [px, y + 0.004, pz + e]], [1, 1, 1], [0, 1, 0])
  }
}

/** COGUMELO GIGANTE: pé lavanda torto com anel, chapéu aceso (violeta ou ciano) e dois filhotes. Caixa ±0,47 × 1 × ±0,5. */
function cogumelo(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 7 : 11
  tube(p.body, [0, 0, 0], [0.05, 0.4, 0.02], 0.1, 0.075, lod ? 5 : 7, (k) => (k % 2 ? LAVANDA : LAVANDA_S), false)
  tube(p.body, [0.05, 0.4, 0.02], [0.02, 0.72, 0], 0.075, 0.06, lod ? 5 : 7, (k) => (k % 2 ? LAVANDA : LAVANDA_S), false)
  cil(p.body, [0.04, 0.5, 0.01], [0.04, 0.53, 0.01], 0.11, 0.1, n, LAVANDA_S, { tampa: LAVANDA })
  chapeu(p, [0.02, 0.68, 0], 0.46, 0.3, VIOLETA, n, 3, lod ? 4 : 8)
  if (!lod) {
    tube(p.body, [0.3, 0, 0.25], [0.31, 0.18, 0.25], 0.035, 0.03, 5, () => LAVANDA, false)
    chapeu(p, [0.31, 0.17, 0.25], 0.12, 0.08, CIANO, 7, 11, 2)
    tube(p.body, [-0.28, 0, 0.3], [-0.29, 0.12, 0.3], 0.028, 0.024, 5, () => LAVANDA, false)
    chapeu(p, [-0.29, 0.11, 0.3], 0.09, 0.06, CIANO, 7, 13, 1)
  }
  bolha(p.body, [0, 0, 0], [0.22, 0.05, 0.22], 1, 5, 0.3, (nn) => (nn[1] > 0.3 ? MUSGO : MUSGO_S), 0.6)
  return encaixa(p, { x: [-0.466, 0.469], y: [0, 1.004], z: [-0.5, 0.507] })
}

/** CASA-COGUMELO: o pé é a casa (porta e janelas acesas, escada), o chapéu vermelho-violeta com pintas. Frente para +z. */
function cogumeloCasa(lod: number): Peca {
  const p = novaPeca()
  const B = p.body, G = p.glow
  const n = lod ? 8 : 12
  cil(B, [0, 0, 0], [0, 0.5, 0], 0.26, 0.22, n, mix(LAVANDA, [1, 0.92, 0.82], 0.4), { colB: LAVANDA, tampa: null, base: true })
  // a porta em arco e as janelas redondas (+z)
  face(B, [[-0.07, 0.01, 0.262], [0.07, 0.01, 0.262], [0.07, 0.17, 0.258], [0, 0.22, 0.256], [-0.07, 0.17, 0.258]], [0.2, 0.12, 0.1], [0, 0, 1])
  face(G, [[-0.05, 0.02, 0.265], [0.05, 0.02, 0.265], [0.05, 0.15, 0.262], [0, 0.19, 0.26], [-0.05, 0.15, 0.262]], [mul(AMBAR, 0.6), mul(AMBAR, 0.6), AMBAR, AMBAR, AMBAR], [0, 0, 1])
  for (const [x, y] of [[-0.15, 0.32], [0.14, 0.27]] as const) {
    const pts: V3[] = Array.from({ length: 6 }, (_, k) => [x + Math.cos((k / 6) * TAU) * 0.04, y + Math.sin((k / 6) * TAU) * 0.04, Math.sqrt(Math.max(0, 0.24 * 0.24 - x * x)) + 0.012])
    face(G, pts, AMBAR, [x, 0, 1])
  }
  // escada de pedras e o capacho de musgo
  for (let k = 0; k < 3; k++) caixa(B, [(k - 1) * 0.02, 0.012, 0.3 + k * 0.06], [0.14 - k * 0.02, 0.024, 0.05], PEDRA, { top: mix(PEDRA, MUSGO, 0.3), wear: 1 })
  chapeu(p, [0, 0.46, 0], 0.42, 0.5, [0.86, 0.2, 0.42], n, 7, lod ? 2 : 9)
  // a chaminé torta saindo do chapéu
  if (!lod) cil(B, [0.18, 0.75, -0.05], [0.2, 0.92, -0.06], 0.035, 0.03, 6, [0.4, 0.34, 0.4], { tampa: [0.1, 0.1, 0.12] })
  return encaixa(p, { x: [-0.414, 0.415], y: [0.004, 0.997], z: [-0.382, 0.378] })
}

/** CRISTAIS violeta: o grupo saindo de uma pedra, o maior no meio, todos acesos. Caixa ±0,57 × 1 × ±0,62. */
function cristais(lod: number): Peca {
  const p = novaPeca()
  bolha(p.body, [0, 0.05, 0], [0.5, 0.14, 0.52], 1, 9, 0.3, (n) => (n[1] > 0.4 ? mix(PEDRA, MUSGO, 0.4) : PEDRA_S), 0.6)
  const pal = [VIOLETA_ESC, VIOLETA, VIOLETA_CL] as const
  cristal(p.glow, [0, 0.1, 0], [0.05, 1, 0.02], 0.13, 0.62, 0.22, 6, pal, 1)
  const n = lod ? 4 : 8
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rnd(k, 3) * 0.5, r = 0.18 + 0.2 * rnd(k, 4)
    const L = 0.2 + 0.32 * rnd(k, 5)
    const d: V3 = [Math.cos(a) * (0.35 + rnd(k, 6) * 0.3), 1, Math.sin(a) * (0.35 + rnd(k, 6) * 0.3)]
    cristal(k % 3 ? p.glow : p.body, [Math.cos(a) * r, 0.1, Math.sin(a) * r], d, 0.05 + 0.04 * rnd(k, 7), L, L * 0.4, 5, k % 3 ? pal : [mul(VIOLETA_ESC, 0.7), VIOLETA_ESC, VIOLETA], k)
  }
  return encaixa(p, { x: [-0.568, 0.567], y: [0.005, 1.005], z: [-0.622, 0.615] })
}

/** DEGRAU DE PEDRA com musgo e plantas (a beira do rio). Caixa ±0,51 × 1 × ±0,62, origem embaixo. */
function ilha(lod: number): Peca {
  const p = daCena(lod, (c) => rochedoMusgo(c, 0, 0, 4.4, 4.6, 4, lod, false))
  return encaixa(p, { x: [-0.508, 0.509], y: [0.001, 0.994], z: [-0.618, 0.625] })
}

/** PLANTA DE FOLHA LARGA: 6–9 folhas em leque, dobradas no meio, com o veio aceso. Caixa ±0,41 × 1 × ±0,54. */
function planta(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 5 : 9
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rnd(k, 2) * 0.5
    const up = 1.1 + 0.6 * rnd(k, 3), L = 0.7 + 0.3 * rnd(k, 4), w = 0.2 + 0.08 * rnd(k, 5)
    const ca = Math.cos(a), sa = Math.sin(a)
    const along = (t: number, side: number, lift: number): V3 => {
      const r = t * L * 0.5
      const y = 0.05 + t * L * up - t * t * L * up * 0.3 + lift
      return [ca * r - sa * side, y, sa * r + ca * side]
    }
    const pts: [number, number][] = [[0, 0], [0.3, 0.8], [0.62, 1], [0.86, 0.6], [1, 0]]
    for (let q = 0; q < pts.length - 1; q++) {
      const [t0, s0] = pts[q], [t1, s1] = pts[q + 1]
      for (const sg of [-1, 1]) {
        const A = along(t0, 0, 0.02), B2 = along(t1, 0, 0.02), C = along(t1, sg * s1 * w, 0), D = along(t0, sg * s0 * w, 0)
        face(p.body, [A, B2, C, D], [FOLHA, FOLHA, FOLHA_CL, FOLHA_CL], [0, 1, 0])
        face(p.body, [A, D, C, B2], mul(FOLHA, 0.6), [0, -1, 0])
      }
      tube(p.glow, along(t0, 0, 0.025), along(t1, 0, 0.025), 0.008, 0.006, 3, () => CIANO, false)
    }
  }
  return encaixa(p, { x: [-0.405, 0.407], y: [0.001, 0.994], z: [-0.54, 0.533] })
}

/**
 * ARCO DE RAÍZES sobre o caminho: três raízes trançadas num semicírculo (raio de dentro 0,37 → |x| ≤ 0,23 livre
 * até y 0,28), pés abertos no chão, musgo por cima e gotas de luz penduradas fora do vão. Caixa ±0,5 × 0,6 × ±0,27.
 */
function arco(lod: number): Peca {
  const p = novaPeca()
  const seg = lod ? 10 : 18, R = 0.42
  const fios = lod ? 2 : 3
  for (let f = 0; f < fios; f++) {
    const ph = (f / fios) * TAU
    let prev: V3 | null = null
    for (let k = 0; k <= seg; k++) {
      const t = k / seg, a = Math.PI * t
      const tw = ph + t * 7
      const r = R + Math.cos(tw) * 0.03
      const P: V3 = [-Math.cos(a) * r, Math.sin(a) * r * 1.25, Math.sin(tw) * 0.05]
      if (prev) tube(p.body, prev, P, 0.045 - f * 0.006, 0.045 - f * 0.006, lod ? 4 : 5, (j) => ((j + f) % 3 ? RAIZ : RAIZ_CL), false)
      prev = P
    }
  }
  // os pés abertos (raízes que se espalham no chão)
  for (const sx of [-1, 1]) for (let k = 0; k < (lod ? 2 : 4); k++) {
    const a = (k / 4) * Math.PI - Math.PI / 2 + rnd(k, sx) * 0.4
    tube(p.body, [sx * R, 0.04, 0], [sx * (R + 0.05 + Math.abs(Math.cos(a)) * 0.04), -0.002, Math.sin(a) * 0.22], 0.04, 0.012, 4, () => RAIZ, false)
  }
  // musgo por cima (no alto do arco) e as gotas de luz nas laterais (|x| ≥ 0,3: fora do vão)
  for (let k = 0; k < (lod ? 3 : 6); k++) {
    const a = Math.PI * (0.25 + 0.5 * (k / 5))
    bolha(p.body, [-Math.cos(a) * R, Math.sin(a) * R * 1.25 + 0.04, 0], [0.06, 0.025, 0.07], 1, k, 0.3, (n) => (n[1] > 0.2 ? MUSGO : MUSGO_S), 0.6)
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
    const x = sx * (0.33 + k * 0.05), y = Math.sqrt(R * R - x * x) * 1.25
    cil(p.body, [x, y, 0], [x, y - 0.06, 0], 0.003, 0.003, 3, [0.3, 0.5, 0.3], { tampa: null })
    bolha(p.glow, [x, y - 0.075, 0], [0.012, 0.018, 0.012], 1, k, 0, () => (k ? VIOLETA : CIANO))
  }
  return encaixa(p, { x: [-0.498, 0.495], y: [0.001, 0.6], z: [-0.273, 0.275] })
}

/** FLOR GIGANTE acesa (as flores da lua, ampliadas). Caixa ±0,44 × 1 × ±0,33. */
function flor(lod: number): Peca {
  const p = daCena(lod, (c) => florLua(c, 0, 0, 1.4, 4, lod, 1))
  return encaixa(p, { x: [-0.436, 0.435], y: [0.001, 0.997], z: [-0.328, 0.331] })
}

/** LANTERNA DE VAGA-LUME: poste de raiz curvado com o casulo aceso pendurado. Caixa ±0,36 × 0,98 × ±0,25. */
function lanterna(lod: number): Peca {
  const p = novaPeca()
  tube(p.body, [0, 0, 0], [0.02, 0.55, 0], 0.05, 0.035, lod ? 4 : 6, (k) => (k % 2 ? RAIZ : RAIZ_CL), false)
  tube(p.body, [0.02, 0.55, 0], [0.12, 0.92, 0], 0.035, 0.025, lod ? 4 : 6, (k) => (k % 2 ? RAIZ : RAIZ_CL), false)
  tube(p.body, [0.12, 0.92, 0], [0.3, 0.9, 0], 0.025, 0.015, 4, () => RAIZ, false)
  bolha(p.body, [0, 0, 0], [0.12, 0.04, 0.12], 1, 3, 0.3, (n) => (n[1] > 0.3 ? MUSGO : MUSGO_S), 0.6)
  const cas = daCena(lod, (c) => lanternaCasulo(c, 0.3, 0, 0.62, 0.22, 0.26, 2))
  return encaixa(junta(p, cas), { x: [-0.355, 0.358], y: [0, 0.981], z: [-0.252, 0.249] })
}

/** NINHO na beira: anel de gravetos trançados, as folhas por baixo e três ovos acesos. Caixa ±0,49 × 1 × ±0,41. */
function ninho(lod: number): Peca {
  const p = novaPeca()
  const n = lod ? 8 : 14
  for (let r = 0; r < (lod ? 2 : 4); r++) {
    const y = 0.3 + r * 0.1, R = 0.32 + r * 0.04
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * TAU + r * 0.3, a1 = a0 + (TAU / n) * 1.4
      tube(p.body, [Math.cos(a0) * R, y + rnd(k, r) * 0.04, Math.sin(a0) * R], [Math.cos(a1) * R, y + rnd(k, r + 1) * 0.04, Math.sin(a1) * R], 0.03, 0.025, 4, (j) => ((j + k) % 3 ? RAIZ : RAIZ_CL), false)
    }
  }
  bolha(p.body, [0, 0.3, 0], [0.33, 0.12, 0.33], 1, 4, 0.2, () => mul(RAIZ, 0.7), 0.8)
  // o galho que segura e as folhas embaixo
  tube(p.body, [0, 0, 0], [0, 0.26, 0], 0.07, 0.09, 5, () => RAIZ, false)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.4
    bolha(p.glow, [Math.cos(a) * 0.08, 0.44, Math.sin(a) * 0.08], [0.07, 0.09, 0.07], 1, k, 0.05, (nn) => (nn[1] > 0.2 ? CIANO_CL : CIANO))
  }
  blob(p.body, [0.36, 0.3, -0.1], [0.14, 0.08, 0.12], { dark: FOLHA, mid: FOLHA_CL, hi: [0.4, 0.8, 0.5] }, 3)
  return encaixa(p, { x: [-0.496, 0.491], y: [0.004, 1.003], z: [-0.416, 0.406] })
}

/** TRONCO CAÍDO (do Domínio): ao longo de z. Caixa ±0,52 × 1 × ±0,91. */
function troncoCaido(lod: number): Peca {
  const p = daCena(lod, (c) => troncoCaidoLua(c, 0, 0, 5, 0, 3, lod))
  return encaixa(p, { x: [-0.518, 0.53], y: [0.006, 1.011], z: [-0.906, 0.914] })
}

/** TRONCO-VIGA: o tronco deitado ao longo de x com um galho para cima e o musgo. Caixa x −0,79…0,83, y −0,37…0,62. */
function troncoViga(lod: number): Peca {
  const p = novaPeca()
  tube(p.body, [-0.79, 0, 0], [0.83, 0.05, -0.05], 0.3, 0.24, lod ? 6 : 9, (k) => (k % 3 ? LAVANDA_S : LAVANDA), true)
  tube(p.body, [0.3, 0.2, -0.05], [0.45, 0.6, -0.12], 0.08, 0.04, 5, () => LAVANDA_S, false)
  for (let k = 0; k < (lod ? 3 : 6); k++) bolha(p.body, [-0.6 + k * 0.26, 0.26, -0.02], [0.12, 0.05, 0.14], 1, k, 0.3, (n) => (n[1] > 0.2 ? MUSGO : MUSGO_S), 0.6)
  if (!lod) for (let k = 0; k < 3; k++) tube(p.glow, [-0.5 + k * 0.4, -0.12, -0.28], [-0.48 + k * 0.4, 0.12, -0.3], 0.012, 0.012, 3, () => CIANO, false)
  return encaixa(p, { x: [-0.794, 0.832], y: [-0.368, 0.619], z: [-0.436, 0.276] }, "meio")
}

const PAL: PalObst = {
  pedra: [PEDRA_S, PEDRA, mix(PEDRA, MUSGO, 0.3)],
  capa: MUSGO,
  racha: null,
  gema: [VIOLETA_ESC, VIOLETA, VIOLETA_CL],
  gemaLuz: VIOLETA_CL,
  galao: GALAO,
  galaoLuz: GALAO_LUZ,
}
const VIGA: PalViga = { corpo: RAIZ, quina: RAIZ_CL, fundo: mul(RAIZ, 0.6), faixa: null, luz: CIANO }

export type FlorestaPeca = "cristais" | "cogumelo" | "ilha" | "arvore" | "planta" | "arco" | "cogumelo-casa" | "arvore2" | "flor" | "lanterna" | "tronco-caido" | "ninho" | "tronco-viga" | "galao" | "borda" | "canto"

export function kitFloresta(low: boolean) {
  const lod = low ? 1 : 0
  return new KitCodigo<FlorestaPeca>(
    "floresta",
    { weather: { grime: 0.5, rustAmt: 0.25, rust: [0.2, 0.36, 0.16], bare: [0.86, 0.84, 1] }, spec: [0.08, 0.08, 0.12], power: 10, self: [0.07, 0.06, 0.1] },
    {
      cristais: () => noite(cristais(lod)),
      cogumelo: () => noite(cogumelo(lod)),
      ilha: () => noite(ilha(lod)),
      arvore: () => noite(arvore(lod)),
      planta: () => noite(planta(lod)),
      arco: () => noite(arco(lod)),
      "cogumelo-casa": () => noite(cogumeloCasa(lod)),
      arvore2: () => noite(arvore2(lod)),
      flor: () => noite(flor(lod)),
      lanterna: () => noite(lanterna(lod)),
      "tronco-caido": () => noite(troncoCaido(lod)),
      ninho: () => noite(ninho(lod)),
      "tronco-viga": () => noite(troncoViga(lod)),
      galao: () => galaoVoo(PAL),
      borda: () => vigaVoo(VIGA, "madeira"),
      canto: () => cantoVoo(VIGA, "madeira"),
    },
  )
}
