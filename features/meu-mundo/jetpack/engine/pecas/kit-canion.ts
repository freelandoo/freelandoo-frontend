// features/meu-mundo/jetpack/engine/pecas/kit-canion.ts — CÂNION FLUTUANTE em código (troca o tema `temas/canion/v2`).
//
// FICHA (cenário, pela referência "Aventura Jetpack no Cânion Flutuante" e pelo Domínio do Cânion)
// Clima:     desfiladeiro de arenito vermelho-alaranjado ao sol, sobre o mar de nuvens; madeira, corda e pano.
// Camadas:   mar de nuvens (já em código) → paredões em colunas com faixas creme e tampa de capim → vila,
//            pontes e andaimes (já em código) → moinho, torre de vigia e cactos no alto → pedras soltas e
//            ilhas flutuantes ao longe → o grande arco natural cruzando por cima.
// Paleta:    arenito 0,82/0,37/0,30 (sombra 0,56/0,22/0,20, sol 0,94/0,54/0,44); faixas creme; capim lima;
//            madeira 0,50/0,32/0,20; acentos: lanterna âmbar, cristal ciano (~10%).
// Peças:     reaproveitadas do Domínio (`pecas/canion.ts`: penhasco, arcoNatural, moinhoRuina, arcoRuina,
//            arvore, cristalCiano); novas aqui: pedra com raízes, cacto, ponte de cordas, torre de vigia, ilha.
// Fora:      nada (não há bicho no Cânion do Jetpack).
// Medidas:   as do tema antigo (canion2.json, medidas pela caixa no jogo): 1 m de altura, origem e largura
//            iguais (`encaixa`); o ARCO mantém o vão do meio acima de 0,31 da largura (a caixa do voo passa).

import { TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { mix, mul, rnd } from "../../../engine/cena-codigo/kit-natureza"
import { penhasco, arcoNatural, moinhoRuina, arcoRuina, arvore, VERM, VERM_CL, VERM_ESC, CREME, CREME_ESC, CAPIM, CAPIM_ESC, MADEIRA, MADEIRA_ESC, AMARELO } from "../../../engine/cena-codigo/pecas/canion"
import { caixa, cil, bolha, GALAO, GALAO_LUZ, rochaVoo, galaoVoo, vigaVoo, cantoVoo, type PalObst, type PalViga } from "./comuns"
import { KitCodigo, daCena, encaixa, junta, moved, novaPeca, type Peca } from "./peca"
import { Matrix } from "@babylonjs/core/Maths/math.vector"

const CORDA: RGB = [0.78, 0.66, 0.46]
const LANTERNA: RGB = [1, 0.74, 0.32]
const CACTO: RGB = [0.24, 0.5, 0.24]
const CACTO_CL: RGB = [0.42, 0.68, 0.32]
const CACTO_ESC: RGB = [0.12, 0.3, 0.16]
const FLOR: RGB = [1, 0.42, 0.55]
const BANDEIRA: RGB = [0.78, 0.14, 0.12]

/** Tom da pedra pela face: sombra embaixo/de costas, sol em cima. */
const arenito = (n: V3, y: number, k: number, topo: number, capa: RGB | null = CAPIM): RGB => {
  if (capa && n[1] > 0.55 && y > topo) return rnd(k, 3) > 0.5 ? capa : CAPIM_ESC
  const t = 0.5 + 0.5 * n[1] - 0.2 * n[2] + (rnd(k, 5) - 0.5) * 0.35
  const faixa = Math.abs(((y * 7) % 1) - 0.5) < 0.08
  const b = t < 0.45 ? mix(VERM_ESC, VERM, t / 0.45) : mix(VERM, VERM_CL, (t - 0.45) / 0.55)
  return faixa ? mix(b, CREME, 0.55) : b
}

/**
 * O arenito do Domínio é rosado sob a luz do Domínio; a do Jetpack (sol + hemisférica forte) lava para o salmão.
 * Puxa a pedra para o laranja-telha da referência do Jetpack e o capim para o seco (tampa grande vista de cima).
 */
function telha(p: Peca): Peca {
  const c = p.body.c
  for (let i = 0; i < c.length; i += 4) {
    const r = c[i], g = c[i + 1], b = c[i + 2]
    if (g > r * 0.9) {
      const k = (r + g + b) / 3
      c[i] = 0.5 + k * 0.25
      c[i + 1] = 0.42 + k * 0.2
      c[i + 2] = 0.16 + k * 0.05
    } else {
      c[i] = r * 0.9
      c[i + 1] = g * 0.74
      c[i + 2] = b * 0.55
    }
  }
  return p
}

/** PAREDÃO: penhasco do Domínio em colunas (faixas creme, tampa de capim). Caixa 0,56 × 1 × 0,45, origem embaixo. */
function paredao(lod: number): Peca {
  // sempre com as faixas creme (o lod do Domínio tira; aqui a peça é o paredão inteiro do corredor)
  const p = telha(daCena(0, (c) => penhasco(c, 0, 0, 4.8, 3.9, 19.4, 11, 0, false, false)))
  // o detalhe pequeno da tampa: dois cactinhos (a cor do cacto fica: entra depois da `telha`)
  miniCacto(p, [1.6, 19.6, -1.2], 2.2)
  if (!lod) miniCacto(p, [-1.9, 19.6, 1.1], 1.5)
  return encaixa(p, { x: [-0.279, 0.279], y: [0, 0.996], z: [-0.225, 0.227] })
}

/** MOINHO em ruína (torre de pedra creme, pás de pano) no degrau da encosta. As pás no plano y–z (como o modelo antigo), viradas para −x. */
function moinho(lod: number): Peca {
  const p = daCena(lod, (c) => moinhoRuina(c, 0, 0, 6, -Math.PI / 2, 5, lod))
  return encaixa(p, { x: [-0.272, 0.259], y: [0, 0.989], z: [-0.326, 0.335] })
}

/** ARCO natural cruzando o corredor (pernas em blocos, lintel com faixa creme e capim). Vão ao longo de x. */
function arco(lod: number): Peca {
  const p = telha(daCena(lod, (c) => arcoNatural(c, 0, 0, 0, 10, 10.4, lod)))
  return encaixa(p, { x: [-0.5, 0.5], y: [0.001, 0.644], z: [-0.29, 0.29] })
}

/** ROCHA solta no ar (abismo): bloco de arenito amassado, sem capim. Caixa ±1,05 × ±1,33 × ±1,09, centro na origem. */
function rochaSolta(): Peca {
  const p = novaPeca()
  bolha(p.body, [0, 0, 0], [1, 1.2, 1], 2, 17, 0.28, (n, y, k) => arenito(n, y, k, 9, null), 0.7)
  bolha(p.body, [0.35, -0.55, 0.2], [0.55, 0.6, 0.5], 1, 23, 0.3, (n, y, k) => arenito(n, y, k, 9, null), 0.7)
  return encaixa(p, { x: [-1.049, 1.05], y: [-1.334, 1.321], z: [-1.093, 1.095] }, "meio")
}

/** Raízes penduradas: fios finos da base para baixo, tortos. */
function raizes(p: Peca, y0: number, r: number, n: number, L: number, seed: number) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rnd(k, seed) * 0.8
    const rr = r * (0.3 + 0.6 * rnd(k, seed, 2))
    let x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = y0
    const len = L * (0.5 + 0.5 * rnd(k, seed, 3))
    for (let j = 0; j < 3; j++) {
      const nx = x + (rnd(j, k, seed) - 0.5) * 0.08, nz = z + (rnd(j, k, seed + 1) - 0.5) * 0.08, ny = y - len / 3
      cil(p.body, [x, y, z], [nx, ny, nz], 0.022 * (1 - j * 0.25), 0.016 * (1 - j * 0.25), 4, mix(MADEIRA_ESC, MADEIRA, j * 0.3), { tampa: null })
      x = nx
      z = nz
      y = ny
    }
  }
}

/** PEDRA COM RAÍZES (flutua): o bloco de arenito, a tampa de capim com um arbusto e as raízes penduradas. Origem embaixo. */
function pedraRaizes(lod: number): Peca {
  const p = novaPeca()
  bolha(p.body, [0, 0.62, 0], [0.42, 0.3, 0.38], lod ? 1 : 2, 31, 0.22, (n, y, k) => arenito(n, y, k, 0.78), 0.7)
  // a tampa: capim e um arbusto amarelo
  bolha(p.body, [0, 0.86, 0], [0.4, 0.07, 0.36], 1, 7, 0.2, (n) => (n[1] > 0.2 ? CAPIM : CAPIM_ESC), 0.6)
  bolha(p.body, [0.1, 0.93, -0.05], [0.13, 0.08, 0.12], 1, 3, 0.25, (n) => (n[1] > 0.3 ? AMARELO.hi : AMARELO.dark), 0.6)
  raizes(p, 0.42, 0.28, lod ? 5 : 9, 0.42, 4)
  return encaixa(p, { x: [-0.368, 0.364], y: [0.003, 0.99], z: [-0.319, 0.32] })
}

/** Cactinho barato (~50 triângulos): tronco e um braço, de 5 lados. `h` = altura em metros. */
function miniCacto(p: Peca, b: V3, h: number) {
  const r = h * 0.09
  cil(p.body, [b[0], b[1] - 0.2, b[2]], [b[0], b[1] + h, b[2]], r, r * 0.7, 5, CACTO, { colB: CACTO_CL, tampa: CACTO_CL })
  cil(p.body, [b[0], b[1] + h * 0.4, b[2]], [b[0] + h * 0.25, b[1] + h * 0.45, b[2]], r * 0.7, r * 0.7, 5, CACTO, { tampa: null })
  cil(p.body, [b[0] + h * 0.25, b[1] + h * 0.42, b[2]], [b[0] + h * 0.25, b[1] + h * 0.72, b[2]], r * 0.7, r * 0.5, 5, CACTO, { colB: CACTO_CL, tampa: CACTO_CL })
}

/** CACTO saguaro: tronco em gomos (costelas claras e escuras), dois braços com cotovelo, flores e o monte de areia. */
function cacto(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  const n = lod ? 6 : 8
  const gomos = (a: V3, b: V3, r: number) => {
    cil(B, a, b, r, r, n, CACTO, { colB: CACTO_CL, tampa: null })
    if (!lod) for (let k = 0; k < n; k += 2) {
      const t = (k / n) * TAU
      const o: V3 = [Math.cos(t) * r * 1.02, 0, Math.sin(t) * r * 1.02]
      cil(B, [a[0] + o[0], a[1], a[2] + o[2]], [b[0] + o[0], b[1], b[2] + o[2]], r * 0.12, r * 0.12, 3, CACTO_ESC, { tampa: null })
    }
  }
  gomos([0, 0, 0], [0, 0.86, 0], 0.11)
  cil(B, [0, 0.86, 0], [0, 0.93, 0], 0.11, 0.06, n, CACTO_CL, { tampa: CACTO_CL })
  // braços: sai de lado, dobra e sobe
  for (const [sx, y0, h] of [[1, 0.36, 0.34], [-1, 0.5, 0.26]] as const) {
    cil(B, [0, y0, 0], [sx * 0.2, y0 + 0.04, 0], 0.07, 0.07, n, CACTO, { tampa: null })
    gomos([sx * 0.2, y0, 0], [sx * 0.2, y0 + h, 0], 0.07)
    cil(B, [sx * 0.2, y0 + h, 0], [sx * 0.2, y0 + h + 0.05, 0], 0.07, 0.035, n, CACTO_CL, { tampa: CACTO_CL })
    p.glow.quad([sx * 0.2 - 0.03, y0 + h + 0.055, -0.03], [sx * 0.2 + 0.03, y0 + h + 0.055, -0.03], [sx * 0.2 + 0.03, y0 + h + 0.055, 0.03], [sx * 0.2 - 0.03, y0 + h + 0.055, 0.03], mul(FLOR, 0.8))
  }
  for (let k = 0; k < 3; k++) caixa(B, [(k - 1) * 0.03, 0.95, (k % 2) * 0.03 - 0.015], [0.035, 0.03, 0.035], FLOR, { top: mix(FLOR, [1, 1, 1], 0.4) })
  // o pé: monte de areia e pedrinhas
  bolha(B, [0, 0, 0], [0.33, 0.08, 0.33], 1, 9, 0.3, (nn) => (nn[1] > 0.3 ? CREME : CREME_ESC), 0.5)
  if (!lod) for (let k = 0; k < 3; k++) caixa(B, [Math.cos(k * 2.1) * 0.25, 0.04, Math.sin(k * 2.1) * 0.25], [0.08, 0.06, 0.07], VERM, { top: VERM_CL, ry: k, wear: 1 })
  return encaixa(p, { x: [-0.372, 0.37], y: [0.001, 1.002], z: [-0.374, 0.374] })
}

/** PONTE DE CORDAS entre duas pedras flutuantes: tábuas em barriga, corrimão de corda, postes e lanternas. Ao longo de x. */
function ponte(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  // as duas pedras (pilares) com a tampa de capim
  for (const [sx, h, sd] of [[-1, 0.62, 41], [1, 0.7, 43]] as const) {
    const cx = sx * 0.66
    bolha(B, [cx, h * 0.55, 0], [0.24, h * 0.5, 0.36], lod ? 1 : 2, sd, 0.2, (n, y, k) => arenito(n, y, k, h * 0.95), 0.7)
    raizes(p, h * 0.15, 0.18, lod ? 3 : 5, 0.18, sd)
    // postes da ponta
    for (const sz of [-1, 1]) {
      cil(B, [cx - sx * 0.12, h * 1.02, sz * 0.12], [cx - sx * 0.12, h * 1.02 + 0.16, sz * 0.12], 0.016, 0.014, 5, MADEIRA_ESC)
      if (!lod) cil(p.glow, [cx - sx * 0.12, h * 1.02 + 0.16, sz * 0.12], [cx - sx * 0.12, h * 1.02 + 0.2, sz * 0.12], 0.022, 0.022, 6, LANTERNA)
    }
  }
  // tábuas: de x −0,54 (y 0,64) a 0,54 (y 0,72), barriga de 0,1
  const n = lod ? 10 : 18
  const yAt = (u: number) => 0.64 + 0.08 * u - Math.sin(u * Math.PI) * 0.1
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, x = -0.54 + u * 1.08
    caixa(B, [x, yAt(u), 0], [1.08 / n - 0.008, 0.012, 0.15], k % 2 ? MADEIRA : mix(MADEIRA, MADEIRA_ESC, 0.4), { top: k % 3 ? MADEIRA : mix(MADEIRA, CREME, 0.25), wear: 1 })
  }
  // o corrimão de corda, dos postes
  const m = 8
  for (const sz of [-1, 1]) for (let k = 0; k < m; k++) {
    const u0 = k / m, u1 = (k + 1) / m
    cil(B, [-0.54 + u0 * 1.08, yAt(u0) + 0.13, sz * 0.09], [-0.54 + u1 * 1.08, yAt(u1) + 0.13, sz * 0.09], 0.006, 0.006, 4, CORDA, { tampa: null })
    if (!lod && k) cil(B, [-0.54 + u0 * 1.08, yAt(u0), sz * 0.08], [-0.54 + u0 * 1.08, yAt(u0) + 0.13, sz * 0.09], 0.004, 0.004, 3, CORDA, { tampa: null })
  }
  return encaixa(p, { x: [-0.908, 0.915], y: [-0.009, 0.999], z: [-0.714, 0.725] })
}

/** TORRE DE VIGIA de madeira: 4 pernas abertas com mãos-francesas, o posto com corrimão, telhado de 4 águas, lanterna e bandeira. */
function torreVigia(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  const top = 0.62
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) cil(B, [x * 0.26, 0, z * 0.24], [x * 0.17, top, z * 0.16], 0.025, 0.02, 5, MADEIRA_ESC, { colB: MADEIRA })
  // travas em X (duas alturas, em dois lados opostos)
  if (!lod) for (const y of [0.12, 0.36]) for (const sz of [-1, 1]) {
    const k = 1 - (y / top) * 0.35
    cil(B, [-0.25 * k, y, sz * 0.23 * k], [0.25 * k * 0.92, y + 0.2, sz * 0.23 * k * 0.92], 0.01, 0.01, 4, MADEIRA, { tampa: null })
    cil(B, [0.25 * k, y, sz * 0.23 * k], [-0.25 * k * 0.92, y + 0.2, sz * 0.23 * k * 0.92], 0.01, 0.01, 4, MADEIRA, { tampa: null })
  }
  // o posto: assoalho, parapeito de tábuas e os pilaretes
  caixa(B, [0, top, 0], [0.48, 0.04, 0.46], MADEIRA, { top: mix(MADEIRA, CREME, 0.2), wear: 1, fundo: true })
  for (const sz of [-1, 1]) caixa(B, [0, top + 0.07, sz * 0.22], [0.46, 0.1, 0.02], MADEIRA_ESC, { top: MADEIRA })
  caixa(B, [0.22, top + 0.07, 0], [0.02, 0.1, 0.42], MADEIRA_ESC, { top: MADEIRA })
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) caixa(B, [x * 0.21, top + 0.13, z * 0.2], [0.03, 0.26, 0.03], MADEIRA_ESC)
  // telhado de 4 águas (pano vermelho desbotado sobre caibros)
  const y0 = top + 0.26, a = 0.29
  const cume: V3 = [0, 0.96, 0]
  const cantos: V3[] = [[-a, y0, -a], [a, y0, -a], [a, y0, a], [-a, y0, a]]
  for (let k = 0; k < 4; k++) {
    const c0 = cantos[k], c1 = cantos[(k + 1) % 4]
    B.quad(c0, c1, cume, cume, k % 2 ? mix(BANDEIRA, CREME, 0.25) : BANDEIRA, 0.6)
    B.quad(c1, c0, cume, cume, mul(BANDEIRA, 0.5))
  }
  // lanterna pendurada e a bandeirola no cume
  cil(p.glow, [0, top + 0.13, 0], [0, top + 0.2, 0], 0.035, 0.035, 6, LANTERNA)
  cil(B, [0, 0.96, 0], [0, 0.99, 0], 0.006, 0.006, 4, MADEIRA_ESC, { tampa: null })
  return encaixa(p, { x: [-0.339, 0.346], y: [0.001, 0.988], z: [-0.328, 0.31] })
}

/** ILHA FLUTUANTE ao longe: o cone de arenito invertido com raízes, a tampa de capim, uma ruína em arco e uma árvore. Centro na origem. */
function ilha(lod: number): Peca {
  const p = novaPeca()
  // cone de pedra: 3 anéis de bolhas descendo e afinando
  bolha(p.body, [0, -0.02, 0], [1, 0.22, 0.92], lod ? 1 : 2, 51, 0.18, (n, y, k) => arenito(n, y, k, 0.12), 0.75)
  bolha(p.body, [0.05, -0.32, 0], [0.62, 0.3, 0.58], 1, 53, 0.25, (n, y, k) => arenito(n, y, k, 9, null), 0.7)
  bolha(p.body, [-0.04, -0.62, 0.02], [0.28, 0.24, 0.26], 1, 57, 0.3, (n, y, k) => arenito(n, y, k, 9, null), 0.7)
  raizes(p, -0.2, 0.55, lod ? 6 : 12, 0.5, 8)
  const enfeite = daCena(lod, (c) => {
    arcoRuina(c, -2, 0.5, 0.3, lod)
    arvore(c, 3.2, -1, 6, 21, lod)
  })
  // o enfeite foi desenhado em metros (arco de ~4,4 m de altura): leva para a escala da ilha (raio 1 ≈ 9 m)
  const top = moved(enfeite, Matrix.Scaling(0.11, 0.11, 0.11).multiply(Matrix.Translation(0, 0.17, 0)))
  return encaixa(junta(p, top), { x: [-0.394, 0.392], y: [-0.505, 0.493], z: [-0.353, 0.354] }, "meio")
}

const PAL: PalObst = {
  pedra: [[0.36, 0.12, 0.07], [0.7, 0.3, 0.15], [0.9, 0.52, 0.3]],
  capa: null,
  racha: [1, 0.62, 0.22],
  gema: [[0.16, 0.6, 0.86], [0.4, 0.95, 1], [0.86, 1, 1]],
  gemaLuz: [0.86, 1, 1],
  galao: GALAO,
  galaoLuz: GALAO_LUZ,
}
const VIGA: PalViga = { corpo: VERM, quina: mix(CREME, VERM_CL, 0.3), fundo: VERM_ESC, faixa: null, luz: null }

export type CanionPeca = "paredao" | "moinho" | "arco" | "rocha" | "pedra-raizes" | "cacto" | "ponte" | "torre-vigia" | "ilha" | "rocha-voo" | "galao" | "borda" | "canto"

export function kitCanion(low: boolean) {
  const lod = low ? 1 : 0
  return new KitCodigo<CanionPeca>(
    "canion",
    // natureza: sem ferrugem; o "desgaste" é poeira creme nas quinas
    { weather: { grime: 0.45, rustAmt: 0, bare: [0.98, 0.9, 0.78] }, spec: [0.05, 0.04, 0.03], power: 8, self: [0.05, 0.035, 0.03] },
    {
      paredao: () => paredao(lod),
      moinho: () => moinho(lod),
      arco: () => arco(lod),
      rocha: () => telha(rochaSolta()),
      "pedra-raizes": () => telha(pedraRaizes(lod)),
      cacto: () => cacto(lod),
      ponte: () => telha(ponte(lod)),
      "torre-vigia": () => torreVigia(lod),
      ilha: () => telha(ilha(lod)),
      "rocha-voo": () => rochaVoo(PAL, 13),
      galao: () => galaoVoo(PAL),
      borda: () => vigaVoo(VIGA, "pedra"),
      canto: () => cantoVoo(VIGA, "pedra"),
    },
  )
}

