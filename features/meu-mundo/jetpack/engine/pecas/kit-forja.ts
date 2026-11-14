// features/meu-mundo/jetpack/engine/pecas/kit-forja.ts — FORJA VULCÂNICA em código (troca o tema `temas/forja/v2`).
//
// FICHA (cenário, pela referência "Voo pelo coração da forja vulcânica" e pelo Domínio do Vulcão de Kragor)
// Clima:     coração de uma forja dentro do vulcão: basalto quase preto, ferro rebitado, tudo iluminado de baixo
//            pela lava; céu vermelho-escuro.
// Camadas:   passarela de grade e rio de lava (já em código, forge-env) → blocos de ferro na beira com bigorna,
//            carrinho, cadinho e chaminé → fornalhas e prensas nas paredes → caldeirões pendurados → pórticos
//            de ferro sobre o caminho → pontes ao longe e rochas no rio.
// Paleta:    basalto 0,17/0,12/0,12 → pedra lilás-escura do Domínio; ferro 0,22–0,66 (quina clara); madeira
//            laranja; luz: brasa 1/0,42/0,06 → amarelo 1/0,84/0,36 (~15%, sempre com escuro em volta).
// Peças:     reaproveitadas do Domínio (`pecas/vulcao.ts`: forjaArco, bigorna, vagonete, rocha); novas aqui:
//            prensa, ponte, pórtico, caldeirão, cadinho, chaminé, rocha de lava, engrenagem em brasa.
// Fora:      a ESTÁTUA do ferreiro (escultura: continua no Tripo, regra da skill).
// Medidas:   as do tema antigo (forja-tema2.json, medidas pela caixa no jogo): 1 m de altura, origem e largura
//            iguais (`encaixa`). O PÓRTICO deixa |x| ≤ 0,2 livre até y 0,55 (28 m, pé 0,5 m abaixo da passarela).

import { TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { face, mix, rnd } from "../../../engine/cena-codigo/kit-natureza"
import { forjaArco, bigorna, vagonete, rocha, FERRO, FERRO_CL, FERRO_ESC, PEDRA, PEDRA_ESC, BRASA, BRASA_CL, BRASA_ESC, OURO } from "../../../engine/cena-codigo/pecas/vulcao"
import { caixa, cil, bolha, GALAO, GALAO_LUZ, galaoVoo, vigaVoo, cantoVoo, engrenagemVoo, type PalObst, type PalViga } from "./comuns"
import { KitCodigo, daCena, encaixa, novaPeca, type Peca } from "./peca"

const BASALTO: RGB = [0.17, 0.12, 0.12]
const BASALTO_CL: RGB = [0.36, 0.26, 0.24]
const TIJOLO: RGB = [0.4, 0.16, 0.1]
const TIJOLO_ESC: RGB = [0.22, 0.09, 0.07]

/**
 * O ferro e a pedra do Domínio são claros (a luz do Vulcão é fraca e vermelha); a Forja do Jetpack é iluminada
 * de baixo pela lava, forte: o corpo vai para o ferro de fuligem quase preto (a quina continua mais clara) e a
 * madeira para o tom queimado. A brasa (luz) fica.
 */
function fuligem(p: Peca): Peca {
  const c = p.body.c
  for (let i = 0; i < c.length; i += 4) {
    c[i] *= 0.42
    c[i + 1] *= 0.34
    c[i + 2] *= 0.33
  }
  return p
}

/** FORNALHA (a forja do Domínio): fiadas de pedra, boca em arco acesa, chaminé, estandartes. Boca para +z. */
function fornalha(lod: number): Peca {
  const p = daCena(lod, (c) => forjaArco(c, 0, 0, 0, lod))
  return encaixa(p, { x: [-0.605, 0.603], y: [0, 0.998], z: [-0.637, 0.635] })
}

/**
 * PRENSA de forja: base de ferro, duas colunas rebitadas, a travessa com o cilindro, o MARTELO descendo sobre o
 * bloco em brasa na mesa. Caixa ±0,42 × 1 × ±0,51.
 */
function prensa(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  caixa(B, [0, 0.06, 0], [0.84, 0.12, 0.9], FERRO_ESC, { top: FERRO, wear: 1 })
  caixa(B, [0, 0.2, 0], [0.5, 0.16, 0.56], FERRO, { top: FERRO_CL, wear: 1 })
  for (const sx of [-1, 1]) {
    caixa(B, [sx * 0.34, 0.5, 0], [0.12, 0.88, 0.2], FERRO, { top: FERRO_CL, wear: 1, frente: mix(FERRO, FERRO_CL, 0.2) })
    if (!lod) for (let k = 0; k < 4; k++) cil(B, [sx * 0.34, 0.2 + k * 0.18, -0.1], [sx * 0.34, 0.2 + k * 0.18, -0.12], 0.015, 0.015, 5, FERRO_CL)
  }
  caixa(B, [0, 0.9, 0], [0.84, 0.16, 0.26], FERRO_ESC, { top: FERRO, wear: 1 })
  cil(B, [0, 0.82, 0], [0, 0.6, 0], 0.08, 0.08, lod ? 6 : 10, FERRO_CL, { tampa: null })
  caixa(B, [0, 0.55, 0], [0.4, 0.1, 0.4], FERRO_ESC, { top: FERRO, wear: 1 })
  // o bloco em brasa na mesa (amarelo no miolo) e o brilho na mesa
  caixa(p.glow, [0, 0.31, 0], [0.26, 0.06, 0.2], BRASA_CL)
  caixa(p.glow, [0, 0.285, 0], [0.3, 0.012, 0.24], BRASA)
  return encaixa(p, { x: [-0.419, 0.423], y: [0.001, 1.001], z: [-0.512, 0.512] })
}

/** PONTE de ferro ao longo de z: arco de treliça embaixo, tabuleiro de grade, guarda-corpo e lanternas. */
function ponte(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  caixa(B, [0, 0.3, 0], [0.34, 0.04, 1], FERRO_ESC, { top: FERRO, wear: 1, fundo: true })
  const n = lod ? 6 : 10
  for (const sx of [-1, 1]) {
    // guarda-corpo
    caixa(B, [sx * 0.16, 0.39, 0], [0.02, 0.02, 1], FERRO, { top: FERRO_CL })
    for (let k = 0; k <= n; k++) caixa(B, [sx * 0.16, 0.35, -0.5 + k / n], [0.015, 0.08, 0.015], FERRO)
    // o arco embaixo (gomos)
    let prev: V3 | null = null
    for (let k = 0; k <= n; k++) {
      const t = k / n, z = -0.5 + t
      const P: V3 = [sx * 0.14, 0.02 + Math.sin(t * Math.PI) * 0.26, z]
      if (prev) cil(B, prev, P, 0.018, 0.018, 4, FERRO_ESC, { tampa: null })
      if (k % 2 === 0) cil(B, P, [sx * 0.14, 0.29, z], 0.01, 0.01, 4, FERRO, { tampa: null })
      prev = P
    }
  }
  // lanternas nas pontas
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) cil(p.glow, [sx * 0.16, 0.4, sz * 0.48], [sx * 0.16, 0.396 - 0.03, sz * 0.48], 0.012, 0.012, 5, BRASA_CL)
  return encaixa(p, { x: [-0.178, 0.176], y: [0, 0.396], z: [-0.501, 0.501] })
}

/**
 * PÓRTICO de ferro sobre a passarela (frente −z): dois pilares rebitados com mão-francesa, a viga alta com a faixa
 * em brasa e o letreiro; o vão |x| ≤ 0,2 fica livre até 0,6 (a regra pede 0,55). Caixa ±0,5 × 0,885 × ±0,15.
 */
function portico(lod: number): Peca {
  const p = novaPeca()
  const B = p.body, G = p.glow
  const D = 0.28
  for (const sx of [-1, 1]) {
    const x = sx * 0.36
    caixa(B, [x, 0.03, 0], [0.26, 0.06, D + 0.02], FERRO_ESC, { top: FERRO, wear: 1 })
    caixa(B, [x, 0.4, 0], [0.18, 0.74, D], FERRO, { top: FERRO_CL, wear: 1, frente: mix(FERRO, FERRO_CL, 0.15) })
    // a chapa de frente com a faixa acesa e os rebites
    G.quad([x - 0.012, 0.1, -D / 2 - 0.006], [x + 0.012, 0.1, -D / 2 - 0.006], [x + 0.012, 0.66, -D / 2 - 0.006], [x - 0.012, 0.66, -D / 2 - 0.006], BRASA)
    if (!lod) for (let k = 0; k < 5; k++) for (const dx of [-0.07, 0.07]) cil(B, [x + dx, 0.12 + k * 0.13, -D / 2], [x + dx, 0.12 + k * 0.13, -D / 2 - 0.012], 0.012, 0.012, 5, FERRO_CL)
    // mão-francesa até a viga (fica em |x| ≥ 0,22, acima de 0,6)
    cil(B, [x - sx * 0.09, 0.62, 0], [x - sx * 0.14, 0.75, 0], 0.03, 0.03, 4, FERRO_ESC)
  }
  caixa(B, [0, 0.8, 0], [1, 0.14, D], FERRO_ESC, { top: FERRO_CL, wear: 1, frente: FERRO })
  caixa(B, [0, 0.87, 0], [0.6, 0.03, D * 0.8], FERRO, { top: FERRO_CL })
  // a faixa de brasa na viga e o letreiro de ouro
  G.quad([-0.46, 0.745, -D / 2 - 0.008], [0.46, 0.745, -D / 2 - 0.008], [0.46, 0.765, -D / 2 - 0.008], [-0.46, 0.765, -D / 2 - 0.008], BRASA)
  caixa(B, [0, 0.81, -D / 2 - 0.01], [0.22, 0.07, 0.01], OURO, { top: OURO })
  return encaixa(p, { x: [-0.499, 0.499], y: [0, 0.885], z: [-0.153, 0.151] })
}

/** CALDEIRÃO pendurado: três correntes do gancho (y 0) até a borda, o caldeirão de ferro e o metal em brasa por cima. */
function caldeirao(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  const n = lod ? 8 : 12, R = 0.42
  // o pote: 3 anéis (boca, barriga, fundo)
  cil(B, [0, -0.62, 0], [0, -0.42, 0], R * 0.96, R, n, FERRO, { colB: FERRO_CL, tampa: null })
  cil(B, [0, -0.86, 0], [0, -0.62, 0], R * 0.6, R * 0.96, n, FERRO_ESC, { colB: FERRO, tampa: null })
  cil(B, [0, -1, 0], [0, -0.86, 0], R * 0.3, R * 0.6, n, FERRO_ESC, { tampa: null, base: true })
  cil(B, [0, -0.44, 0], [0, -0.4, 0], R * 1.05, R * 1.05, n, FERRO_CL, { tampa: null })
  // o metal em brasa e a escorrida pela borda
  cil(p.glow, [0, -0.45, 0], [0, -0.44, 0], R * 0.92, R * 0.92, n, BRASA, { tampa: BRASA_CL })
  if (!lod) cil(p.glow, [R * 0.98, -0.43, 0], [R * 1.0, -0.66, 0], 0.03, 0.015, 4, BRASA, { tampa: null })
  // correntes (elos alternados) do gancho até a borda
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU
    const end: V3 = [Math.cos(a) * R, -0.4, Math.sin(a) * R]
    const m = lod ? 3 : 6
    for (let j = 0; j < m; j++) {
      const t0 = j / m, t1 = (j + 1) / m
      cil(B, [end[0] * t0, -0.4 * t0, end[2] * t0], [end[0] * t1, -0.4 * t1, end[2] * t1], j % 2 ? 0.012 : 0.018, j % 2 ? 0.012 : 0.018, 4, FERRO_ESC, { tampa: null })
    }
  }
  cil(B, [0, -0.04, 0], [0, 0, 0], 0.04, 0.04, 6, FERRO)
  return encaixa(p, { x: [-0.428, 0.431], y: [-0.998, 0.002], z: [-0.437, 0.436] }, "cima")
}

/** CADINHO: o caldeirão de bico inclinado num suporte de ferro, despejando metal em brasa numa forma. Caixa ±0,52 × 1 × ±0,34. */
function cadinho(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  // suporte: dois pés em A e o eixo
  for (const sz of [-1, 1]) {
    cil(B, [-0.3, 0, sz * 0.26], [-0.08, 0.62, sz * 0.26], 0.03, 0.025, 4, FERRO_ESC)
    cil(B, [0.14, 0, sz * 0.26], [-0.08, 0.62, sz * 0.26], 0.03, 0.025, 4, FERRO_ESC)
  }
  cil(B, [-0.08, 0.62, -0.3], [-0.08, 0.62, 0.3], 0.025, 0.025, 5, FERRO)
  // o pote inclinado (cone) com bico para +x
  const n = lod ? 8 : 12
  cil(B, [-0.2, 0.42, 0], [0.12, 0.82, 0], 0.13, 0.22, n, FERRO, { colB: FERRO_CL, tampa: null, base: true })
  cil(p.glow, [0.11, 0.81, 0], [0.12, 0.82, 0], 0.2, 0.2, n, BRASA, { tampa: BRASA_CL })
  // o jorro e a forma no chão
  cil(p.glow, [0.3, 0.84, 0], [0.4, 0.14, 0], 0.035, 0.05, 6, BRASA_CL, { tampa: null })
  caixa(B, [0.38, 0.06, 0], [0.26, 0.12, 0.3], FERRO_ESC, { top: FERRO, wear: 1 })
  caixa(p.glow, [0.38, 0.122, 0], [0.2, 0.01, 0.24], BRASA)
  if (!lod) cil(B, [0.12, 0.82, 0], [0.32, 0.86, 0], 0.03, 0.02, 4, FERRO_CL)
  return encaixa(p, { x: [-0.523, 0.521], y: [0, 1], z: [-0.342, 0.342] })
}

/** CHAMINÉ de tijolo sobre a base de pedra (comprida em z): fiadas alternadas, cinta de ferro, a boca em brasa e a fuligem. */
function chamine(lod: number): Peca {
  const p = novaPeca()
  const B = p.body
  caixa(B, [0, 0.1, 0], [0.56, 0.2, 1.2], PEDRA_ESC, { top: PEDRA, wear: 1 })
  // a fornalhinha da base com a boca acesa na frente (−z)
  caixa(B, [0, 0.3, -0.25], [0.46, 0.2, 0.5], TIJOLO, { top: TIJOLO_ESC, wear: 1 })
  face(p.glow, [[-0.12, 0.22, -0.502], [0.12, 0.22, -0.502], [0.1, 0.35, -0.502], [-0.1, 0.35, -0.502]], [BRASA_ESC, BRASA_ESC, BRASA_CL, BRASA_CL], [0, 0, -1])
  // a torre em fiadas
  const nf = lod ? 3 : 7
  for (let k = 0; k < nf; k++) {
    const y0 = 0.2 + (k / nf) * 0.76, y1 = 0.2 + ((k + 1) / nf) * 0.76
    const w = 0.34 - k * 0.012
    caixa(B, [0, (y0 + y1) / 2, 0.25], [w, y1 - y0 - 0.008, w], k % 2 ? TIJOLO : mix(TIJOLO, TIJOLO_ESC, 0.5), { top: TIJOLO_ESC })
  }
  caixa(B, [0, 0.6, 0.25], [0.36, 0.03, 0.36], FERRO, { top: FERRO_CL })
  caixa(B, [0, 0.98, 0.25], [0.3, 0.04, 0.3], FERRO_ESC, { top: [0.06, 0.04, 0.04] })
  caixa(p.glow, [0, 0.955, 0.25], [0.22, 0.01, 0.22], BRASA)
  return encaixa(p, { x: [-0.294, 0.295], y: [0.002, 1.001], z: [-0.612, 0.615] })
}

/** ROCHA DE LAVA (comprida em z): basalto com a crosta e as rachaduras em brasa, poça acesa no pé. */
function rochaLava(lod: number): Peca {
  const p = novaPeca()
  const tom = (n: V3, y: number, k: number): RGB => (n[1] > 0.5 ? mix(BASALTO_CL, BASALTO, rnd(k, 3)) : mix(BASALTO, [0.08, 0.05, 0.05], 0.5 + 0.5 * rnd(k, 4)))
  bolha(p.body, [0, 0.45, 0], [0.38, 0.45, 0.85], lod ? 1 : 2, 21, 0.22, tom, 0.75)
  bolha(p.body, [0.05, 0.25, 0.55], [0.3, 0.25, 0.32], 1, 23, 0.25, tom, 0.75)
  for (const sx of [-1, 1]) for (let k = 0; k < (lod ? 2 : 4); k++) {
    const z = -0.6 + k * 0.38, y = 0.2 + rnd(k, sx) * 0.4
    // a rachadura na lateral (plano x): vai de baixo para cima, torta
    const x = sx * 0.37
    p.glow.quad([x, y, z], [x, y, z + 0.04], [x, y + 0.2, z + 0.1], [x, y + 0.2, z + 0.06], k % 2 ? BRASA : BRASA_CL)
  }
  cil(p.glow, [0, 0, 0], [0, 0.01, 0], 0.45, 0.45, lod ? 8 : 12, BRASA, { tampa: mix(BRASA, BRASA_CL, 0.4) })
  return encaixa(p, { x: [-0.385, 0.386], y: [0.005, 1.003], z: [-0.91, 0.907] })
}

/** ROCHA basáltica do Domínio (no rio de lava). Centro na origem. */
function rochaRio(lod: number): Peca {
  const p = daCena(lod, (c) => rocha(c, 0, 0, 3, 5, lod, false))
  return encaixa(p, { x: [-0.587, 0.588], y: [-0.501, 0.503], z: [-0.608, 0.61] }, "meio")
}

/** BIGORNA do Domínio (chifre, placa de ouro, base de pedra), comprida em z. */
function bigornaP(lod: number): Peca {
  const p = daCena(lod, (c) => bigorna(c, 0, 0, Math.PI / 2, lod))
  return encaixa(p, { x: [-0.436, 0.434], y: [0.003, 0.999], z: [-0.778, 0.763] })
}

/** CARRINHO (vagonete do Domínio com o minério aceso), comprido em z. */
function carrinho(lod: number): Peca {
  const p = daCena(lod, (c) => vagonete(c, 0, 0, 0, lod))
  return encaixa(p, { x: [-0.382, 0.397], y: [0.001, 1.004], z: [-0.582, 0.582] })
}

const PAL: PalObst = {
  pedra: [[0.08, 0.05, 0.05], BASALTO, BASALTO_CL],
  capa: null,
  racha: BRASA,
  gema: [BRASA_ESC, BRASA, BRASA_CL],
  gemaLuz: BRASA_CL,
  galao: GALAO,
  galaoLuz: GALAO_LUZ,
}
const VIGA: PalViga = { corpo: [0.16, 0.13, 0.13], quina: [0.32, 0.27, 0.25], fundo: [0.07, 0.05, 0.05], faixa: [0.9, 0.5, 0.08], luz: BRASA }

export type ForjaPeca = "fornalha" | "prensa" | "rocha" | "ponte" | "portico" | "caldeirao" | "cadinho" | "chamine" | "rocha-lava" | "bigorna" | "carrinho" | "engrenagem-voo" | "galao" | "borda" | "canto"

export function kitForja(low: boolean) {
  const lod = low ? 1 : 0
  return new KitCodigo<ForjaPeca>(
    "forja",
    // ferro de forja: fuligem e ferrugem
    { weather: { grime: 1.1, rustAmt: 0.6, rust: [0.3, 0.12, 0.06], bare: [0.5, 0.4, 0.36] }, spec: [0.35, 0.28, 0.22], power: 24, self: [0.06, 0.03, 0.02] },
    {
      fornalha: () => fuligem(fornalha(lod)),
      prensa: () => fuligem(prensa(lod)),
      rocha: () => fuligem(rochaRio(lod)),
      ponte: () => fuligem(ponte(lod)),
      portico: () => fuligem(portico(lod)),
      caldeirao: () => fuligem(caldeirao(lod)),
      cadinho: () => fuligem(cadinho(lod)),
      chamine: () => fuligem(chamine(lod)),
      "rocha-lava": () => fuligem(rochaLava(lod)),
      bigorna: () => fuligem(bigornaP(lod)),
      carrinho: () => fuligem(carrinho(lod)),
      // a engrenagem em brasa dos obstáculos (pé dos dentes no raio 1, miolo aceso)
      "engrenagem-voo": () => engrenagemVoo([0.4, 0.1, 0.05], [0.08, 0.03, 0.02], BRASA_CL),
      galao: () => galaoVoo(PAL),
      borda: () => vigaVoo(VIGA, "metal"),
      canto: () => cantoVoo(VIGA, "metal"),
    },
  )
}

