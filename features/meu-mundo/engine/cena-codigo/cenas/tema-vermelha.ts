// TEMA da FLORESTA VERMELHA DE VARKOS (o 7º Domínio): luz do fim de tarde de outono, chão PRETO de cinza,
// copas vermelhas/laranja/ouro, rios de lava de Kragor e o neon vermelho da Gincana. As peças próprias moram em
// `pecas/floresta-vermelha.ts`; a lava, o basalto e os braseiros vêm do tema do Vulcão (mesmo kit, sem cópia).

import type { RGB } from "../kit"
import * as VU from "./tema-vulcao"
import { noise } from "../kit"
import { blocked, scatter, type Cena, type XZ } from "../kit-cena"
import { blob, mix, mul, rnd, smooth } from "../kit-natureza"
import { trilha, type Planta } from "../dominio"
import { CHAO, CHAO_CL, CHAO_ESC, FOLHAS, LARANJA as F_LARANJA, RUBRA as F_RUBRA, arvoreRubra, armaCravada, copaDe, estandarte, folhico, recolorir, tocoQueimado } from "../pecas/floresta-vermelha"


export * from "../pecas/floresta-vermelha"

export const CEU: RGB = [0.58, 0.2, 0.14]
export const NEVOA: RGB = [0.44, 0.15, 0.11]
/** Sol baixo e laranja; o "chão" da luz é vinho (o preto do chão não pode virar cinza). */
export const LUZ = { hemi: 0.9, sol: 0.85, ceu: [0.92, 0.7, 0.62] as RGB, chao: [0.5, 0.18, 0.14] as RGB, solCor: [1, 0.64, 0.38] as RGB }
export const TRI_BLOCO = { perto: 18000, longe: 6500, fundo: 6000 }

// do Vulcão: a lava, o basalto e o fogo
export const rioLava = VU.rioLava
export const braseiro = VU.braseiro
export const paredao = VU.paredao
export const colunas = VU.colunas
export const pedraEsc = VU.pedraEsc
export const fissuras = VU.fissuras
export const lajesPoligonais = VU.lajesPoligonais
export const posteLanterna = VU.posteLanterna
export const rackLancas = VU.rackLancas
export const LAVA = VU.LAVA
export const LAVA_CL = VU.LAVA_CL
export const LAVA_ESC = VU.LAVA_ESC
export const BASALTO = VU.BASALTO

// ═══════════════ AJUDANTES DAS 3 CENAS ═══════════════


/**
 * Cor do chão PRETO: cinza de queimada em manchas largas de 3 tons, TAPETE de folhas (vinho e ferrugem) em
 * ilhas sob os bosques, chão mais claro e liso nas clareiras, a trilha de cinza clara com a borda escura.
 */
export function corDoChao(P: Planta, extra?: (x: number, z: number, col: RGB) => RGB) {
  return (x: number, z: number): RGB => {
    let col = mix(CHAO, CHAO_CL, smooth(0.45, 0.8, noise(x * 0.07, 1.3, z * 0.07)))
    col = mix(col, CHAO_ESC, smooth(0.6, 0.85, noise(x * 0.13, 2.1, z * 0.13)) * 0.6)
    // tapete de folhas: ilhas vinho e ferrugem (mais perto dos bosques, longe do caminho)
    const longe = smooth(5, 10, P.dWalk(x, z))
    const ilha = smooth(0.5, 0.72, noise(x * 0.05, 7.7, z * 0.05)) * longe
    const tom = noise(x * 0.3, 3.3, z * 0.3)
    col = mix(col, mix(mul(F_RUBRA.dark, 0.75), mul(F_LARANJA.dark, 0.7), smooth(0.4, 0.7, tom)), ilha * 0.7)
    // clareira: cinza mais clara e lisa (a zona do bando lê de longe)
    col = mix(col, mix(CHAO_CL, [0.22, 0.16, 0.15], 0.5), P.aberto(x, z) * 0.55)
    if (extra) col = extra(x, z, col)
    // trilha de cinza clara batida, com a borda escura (contato)
    col = trilha(col, x, z, P, mix([0.26, 0.2, 0.19], [0.34, 0.27, 0.24], noise(x * 0.4, 5, z * 0.4)), 2.3, CHAO_ESC)
    return col
  }
}

/**
 * BOSQUES de árvores rubras em MANCHAS (princípio 10: agrupado, com clareiras entre os grupos): a densidade sai
 * de um ruído largo; perto do caminho a árvore é a cheia (folhas soltas), longe é a econômica. Entre as árvores:
 * tocos queimados e folhiço. `ok(x, z, pad)` = a regra de plantar da cena.
 */
export function bosques(c: Cena, P: Planta, ok: (x: number, z: number, pad: number) => boolean, lod: number, seed: number, dens = 1) {
  scatter(-78, -78, 78, 78, 5.2, seed, (x, z, r) => {
    const mancha = smooth(0.38, 0.62, noise(x * 0.045, seed * 0.37, z * 0.045))
    if (r(1) > mancha * 0.85 * dens || !ok(x, z, 1.6)) return
    const perto = P.dWalk(x, z) < 16
    arvoreRubra(c, x, z, 9 + r(2) * 5, Math.floor(r(3) * 9999), lod, copaDe(Math.floor(r(4) * 9999)), perto)
  })
  scatter(-78, -78, 78, 78, 7, seed + 1, (x, z, r) => {
    if (!ok(x, z, 0.6) || r(1) > 0.22) return
    if (r(2) < 0.45) tocoQueimado(c, x, z, 0.8 + r(3) * 0.6, Math.floor(r(4) * 999), lod)
    else folhico(c, x, z, 1.6 + r(5) * 1.6, Math.floor(r(6) * 999), FOLHAS[Math.floor(r(7) * 3)], lod)
  })
}

/**
 * BEIRA DE GUERRA ao longo do caminho: um ESTANDARTE a cada ~15 m, lados alternados, a 4,2 m do eixo e com o
 * pano virado para a trilha; armas cravadas em grupinhos de 2–3 entre eles. Respeita `ok`.
 */
export function beiraDeGuerra(c: Cena, P: Planta, ok: (x: number, z: number, pad: number) => boolean, lod: number, seed: number, passo = 15) {
  let k = 0
  for (const path of [P.path]) {
    let acc = passo * 0.4
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1]
      const L = Math.hypot(bx - ax, bz - az)
      const dx = (bx - ax) / L, dz = (bz - az) / L
      for (; acc < L; acc += passo / 2) {
        k++
        const s = k % 4 < 2 ? 1 : -1
        const nx = dz * s, nz = -dx * s
        if (k % 2) {
          const x = ax + dx * acc + nx * 4.2, z = az + dz * acc + nz * 4.2
          if (ok(x, z, 0.3)) estandarte(c, x, z, 4.4 + rnd(seed, k) * 1.2, Math.atan2(-nx, -nz), seed + k, lod)
        } else {
          const n = 2 + Math.floor(rnd(seed, k, 2) * 2)
          for (let j = 0; j < n; j++) {
            const off = 4 + rnd(seed, k, j + 3) * 2.5, adv = (rnd(seed, k, j + 7) - 0.5) * 3
            const x = ax + dx * (acc + adv) + nx * off, z = az + dz * (acc + adv) + nz * off
            if (ok(x, z, 0.1)) armaCravada(c, x, z, rnd(seed, k, j + 11) * 6.28, seed * 31 + k * 5 + j, lod)
          }
        }
      }
      acc -= L
    }
  }
}

/** A FLORESTA lá fora (pano de fundo, na névoa): anel de copas rubras de 1 bolha entre 84 e 104 m. */
export function fundoFloresta(c: Cena, seed: number) {
  for (let k = 0; k < 90; k++) {
    const a = (k / 90) * Math.PI * 2 + rnd(seed, k) * 0.05
    const d = 84 + rnd(seed, k, 2) * 20
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const R = 5 + rnd(seed, k, 3) * 4
    blob(c.fundo, [x, R * 1.4 + 3, z], [R, R * 0.9, R], FOLHAS[rnd(seed, k, 4) < 0.6 ? 0 : rnd(seed, k, 5) < 0.6 ? 1 : 2], seed + k)
  }
}

/** Regra de plantar comum: livre pela planta e sem caixa no lugar. */
export const okDe = (c: Cena, P: Planta, extra: (x: number, z: number) => boolean = () => true) => (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6) && extra(x, z)
export const fundoVulcao = VU.fundoVulcao
export type { XZ }

/** Lajes de basalto da trilha (as do Vulcão) em pedra PRETA puxada a vinho. */
export function lajesPretas(c: Cena, x0: number, z0: number, x1: number, z1: number, passo: number, seed: number, dentro: (x: number, z: number) => boolean, lod = 0) {
  recolorir(c, () => lajesPoligonais(c, x0, z0, x1, z1, passo, seed, dentro, lod), (r, g, b) => [r * 0.42 + 0.03, g * 0.34 + 0.015, b * 0.34 + 0.02])
}
