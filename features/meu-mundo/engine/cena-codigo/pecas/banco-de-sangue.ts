// Banco de Sangue — fachada do prédio `pizzaria` do centro (Opus com a skill `meu-mundo-cenario-codigo`,
// 2026-11-15). Ref: ref/banco-de-sangue.png (clima e paleta: a arte do cardápio do Vampiro; a fachada
// sai do prompt "Pequeno prédio vitoriano steampunk de dois andares, tijolo escuro e ferro preto,
// vitrine com bolsas de sangue de vidro iluminadas em vermelho, toldo vinho, lamparinas de prata").
//
// FICHA
// O que é:        sobrado vitoriano de esquina-de-praça, loja embaixo (vitrine de bolsas de sangue
//                 acesas), moradia em cima, empena virada para a rua.
// Silhueta:       caixa de 12,4 × 6,5 m com empena até 8,2 m; quebram o contorno: cornija saliente,
//                 toldos que saltam 1,2 m, lampiões, cano de vapor na quina, crista de ferro e chaminé.
// Simetria:       espelhada no eixo da porta (o cano e a chaminé quebram de propósito).
// Massas grandes: térreo de ferro (0–3 m), faixa do letreiro (3–4 m), andar de tijolo (4–6,5 m),
//                 empena + telhado (6,5–8,2 m), corpo de tijolo até os fundos (11,4 m).
// Médios:         4 vitrines entre 6 pilastras, 2 toldos vinho, 3 janelas em arco, cornija com dentes,
//                 medalhão da gota na empena, porta de duas folhas com bandeira acesa.
// Pequenos:       bolsas penduradas no trilho (3 por vitrine), frascos na prateleira, válvulas de latão,
//                 4 lampiões de prata, dentes da cornija, fechos das janelas, braçadeiras do cano.
// Paleta:         ferro quase preto azulado, tijolo vinho-escuro (3 tons), junta preta, prata fria,
//                 vinho do toldo; luz: vermelho (vitrine), âmbar-rosado (janelas e lampiões); 10% latão.
// Material:       tijolo + ferro (pouco brilho), prata nas quinas.
// Fora:           texto e letreiro (o jogo pendura a placa com o nome na faixa de 3,5 m); fumaça.
// Medidas:        contrato do centro: origem no meio da fachada, fachada em z = 0 virada para −z,
//                 12,4 m de largura (terreno 13 − 0,6), 11,4 de fundo, beiral 6,5 m, cumeeira 8,2 m,
//                 porta de 1,8 m no meio. Faixa do letreiro LISA de x −3,8 a 3,8, y 3,05–3,95.
// Inventado:      lados e fundos (a referência é só a frente): tijolo com janelas escuras e cano.
//
// PLANO (triângulos)
// tijolo frente+lados ~2.600 · térreo (pilastras, vitrines, bolsas, porta) ~2.400 · toldos ~300 ·
// janelas em arco 3 × ~150 · cornijas e dentes ~800 · telhado ~700 · lampiões 4 × ~200 · resto ~600
// → ~9 mil (orçamento 12 mil, 1 chamada).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Geo, finish, type RGB } from "../kit"
import { face, mul, setSun, tube } from "../kit-natureza"
import { anel, arco, direita, empena, esquerda, frente, fundos, janelaArco, janelaReta, lampiao, relevo, ret, retV, telhado, tijolos, toldo, type Tijolo } from "./loja-kit"

export const meta = { luz: "neutra", maxTri: 12000 }

const W = 12.4, D = 11.4, H = 6.5, R = 8.2
const X0 = -W / 2, X1 = W / 2

// ── paleta ──
const FERRO: RGB = [0.07, 0.07, 0.09]
const FERRO_HI: RGB = [0.2, 0.2, 0.24]
const PRATA: RGB = [0.5, 0.52, 0.56]
const LATAO: RGB = [0.55, 0.38, 0.15]
const PEDRA: RGB = [0.2, 0.17, 0.17]
const MADEIRA: RGB = [0.16, 0.06, 0.06]
const VINHO: RGB = [0.38, 0.05, 0.08]
const VINHO_DK: RGB = [0.24, 0.03, 0.05]
const ARDOSIA: RGB = [0.12, 0.12, 0.16]
const ARDOSIA_B: RGB = [0.16, 0.15, 0.2]
const TIJ: Tijolo = { a: [0.27, 0.09, 0.08], b: [0.21, 0.07, 0.07], c: [0.33, 0.14, 0.11], junta: [0.05, 0.04, 0.04] }
const TIJ_LADO: Tijolo = { a: [0.24, 0.08, 0.07], b: [0.19, 0.06, 0.06], c: [0.28, 0.12, 0.1], junta: [0.05, 0.04, 0.04] }
// luz
const SANGUE_LO: RGB = [0.1, 0.0, 0.01]
const SANGUE_HI: RGB = [0.5, 0.05, 0.06]
const BOLSA: RGB = [1, 0.26, 0.18]
const BOLSA_DK: RGB = [0.55, 0.02, 0.04]
const JANELA_LO: RGB = [0.55, 0.14, 0.1]
const JANELA_HI: RGB = [1, 0.62, 0.4]
const LAMPIAO = { core: [1, 0.92, 0.78] as RGB, edge: [1, 0.48, 0.32] as RGB }

/** Vitrine: luz vermelha ao fundo, trilho de prata com 3 bolsas penduradas, prateleira de frascos. */
function vitrine(B: Geo, G: Geo, u0: number, u1: number, seed: number) {
  const F = frente()
  const y0 = 0.62, y1 = 2.62
  retV(G, F, u0, u1, y0, y1, 0.004, SANGUE_LO, SANGUE_HI)
  // trilho e bolsas
  tube(B, [u0 + 0.05, 2.22, -0.03], [u1 - 0.05, 2.22, -0.03], 0.025, 0.025, 6, (k) => (k % 2 ? PRATA : mul(PRATA, 1.3)))
  const n = 3
  for (let i = 0; i < n; i++) {
    const uc = u0 + ((u1 - u0) * (i + 0.5)) / n
    const hw = 0.2 + 0.02 * ((i + seed) % 2), top = 2.02 - 0.06 * ((i + seed) % 2), bot = top - 0.6
    // gancho e alça
    relevo(B, F, uc - 0.012, uc + 0.012, top, 2.22, 0.004, 0.02, PRATA, { wear: 1 })
    // bolsa: octógono de vidro, miolo claro em cima (o líquido brilha), escuro embaixo
    const c = 0.07
    const pts: [number, number][] = [[uc - hw + c, bot], [uc + hw - c, bot], [uc + hw, bot + c], [uc + hw, top - c], [uc + hw - c, top], [uc - hw + c, top], [uc - hw, top - c], [uc - hw, bot + c]]
    const cor = (y: number): RGB => (y > top - 0.15 ? mul(BOLSA, 0.75) : y < bot + 0.1 ? BOLSA_DK : BOLSA)
    const face3 = pts.map(([u, y]) => F.P(u, y, 0.014))
    // aro escuro de couro em volta do vidro (separa a bolsa do fundo aceso)
    const ar = (k: number) => F.P(pts[k][0] + (pts[k][0] - uc) * 0.12, pts[k][1] + (pts[k][1] - (top + bot) / 2) * 0.08, 0.01)
    face(B, pts.map((_, k) => ar(k)), [0.12, 0.02, 0.03], [0, 0, -1])
    // vidro com o líquido: claro em cima, escuro no fundo; reflexo branco-rosado na quina de cima
    face(G, face3, pts.map(([, y]) => cor(y)), [0, 0, -1])
    face(G, [F.P(uc - hw + 0.06, top - 0.3, 0.018), F.P(uc - hw + 0.11, top - 0.3, 0.018), F.P(uc - hw + 0.11, top - 0.08, 0.018), F.P(uc - hw + 0.06, top - 0.1, 0.018)], [1, 0.75, 0.68], [0, 0, -1])
    // rótulo apagado (faixa escura sem letra) e válvula de latão embaixo
    ret(B, F, uc - hw * 0.6, uc + hw * 0.6, bot + 0.22, bot + 0.34, 0.02, mul(VINHO_DK, 0.6))
    relevo(B, F, uc - 0.04, uc + 0.04, bot - 0.12, bot, 0.006, 0.05, LATAO, { wear: 1 })
    tube(B, F.P(uc, bot - 0.12, 0.03), F.P(uc, bot - 0.32, 0.03), 0.012, 0.012, 4, () => mul(PRATA, 0.8))
  }
  // prateleira com frascos acesos
  relevo(B, F, u0, u1, 0.9, 0.96, 0.004, 0.07, FERRO_HI, { wear: 1 })
  const m = Math.max(4, Math.round((u1 - u0) / 0.26))
  for (let k = 0; k < m; k++) {
    const uc = u0 + ((u1 - u0) * (k + 0.5)) / m
    const h = 0.18 + 0.08 * ((k * 7 + seed) % 3) / 2
    retV(G, F, uc - 0.045, uc + 0.045, 0.96, 0.96 + h, 0.012, BOLSA_DK, BOLSA)
    ret(B, F, uc - 0.03, uc + 0.03, 0.96 + h, 1.0 + h, 0.016, PRATA, 1)
  }
  // mureta de ferro com grade embaixo da vitrine
  relevo(B, F, u0, u1, 0.42, 0.62, 0, 0.1, FERRO, { wear: 0.8 })
}

/** A fachada inteira em `B` (corpo) e `G` (luz acesa), no quadro do contrato (origem no meio da fachada). */
export function fachadaBancoDeSangue(B: Geo, G: Geo) {
  const F = frente()

  // ── corpo: tijolo nos lados, fundos lisos em placas ──
  tijolos(B, esquerda(X0), 0, D, 0, H, TIJ_LADO, 11, 1.1, 0.4, 0.6)
  tijolos(B, direita(X1), 0, D, 0, H, TIJ_LADO, 12, 1.1, 0.4, 0.6)
  const FD = fundos(D)
  tijolos(B, FD, X0, X1, 0, H, TIJ_LADO, 13, 1.2, 0.44, 0.6)
  // janelas escuras dos lados (vidro com reflexo frio) e o cano de vapor do lado direito
  for (const [pl, us] of [[esquerda(X0), [3.2, 7.6]], [direita(X1), [3.8, 8.2]]] as const) {
    for (const u of us) {
      janelaReta(B, null, pl, u, 1.1, 4.5, 5.9, { moldura: mul(PEDRA, 1.4), caixilho: FERRO, lo: [0.04, 0.04, 0.06], hi: [0.16, 0.18, 0.24] })
      janelaReta(B, null, pl, u, 1.1, 1.0, 2.4, { moldura: mul(PEDRA, 1.4), caixilho: FERRO, lo: [0.04, 0.04, 0.06], hi: [0.14, 0.15, 0.2] })
    }
  }

  // ── andar de cima (frente): tijolo, 3 janelas em arco, sacada de ferro na do meio ──
  tijolos(B, F, X0, X1, 4.0, H, TIJ, 3)
  for (const uc of [-4, 0, 4]) janelaArco(B, G, F, uc, 1.3, 4.45, 6.05, { moldura: PEDRA, caixilho: FERRO, peitoril: mul(PEDRA, 1.2), lo: JANELA_LO, hi: JANELA_HI, fundo: [0.03, 0.01, 0.01] })
  relevo(B, F, -1.1, 1.1, 4.2, 4.3, 0, 0.55, FERRO_HI, { wear: 1 })
  for (let k = 0; k <= 8; k++) {
    const u = -1.05 + (2.1 * k) / 8
    tube(B, F.P(u, 4.3, 0.5), F.P(u, 4.85, 0.5), 0.014, 0.014, 4, () => FERRO, false)
  }
  tube(B, F.P(-1.08, 4.86, 0.5), F.P(1.08, 4.86, 0.5), 0.03, 0.03, 6, (k) => (k % 2 ? PRATA : FERRO_HI))

  // ── cornija de cima com dentes ──
  relevo(B, F, X0 - 0.15, X1 + 0.15, H - 0.12, H + 0.12, 0, 0.42, FERRO, { hi: FERRO_HI, wear: 1 })
  for (let u = X0 + 0.1; u < X1 - 0.05; u += 0.42) relevo(B, F, u, u + 0.2, H - 0.3, H - 0.12, 0, 0.22, mul(PEDRA, 1.3), { wear: 0.6 })
  for (const pl of [esquerda(X0), direita(X1)]) relevo(B, pl, 0, D, H - 0.12, H + 0.12, 0, 0.3, FERRO, { hi: FERRO_HI })

  // ── empena + medalhão da gota + telhado de ardósia com crista ──
  empena(B, X0, X1, H + 0.12, R, -0.02, mul(TIJ.b, 0.9), FERRO_HI)
  empena(B, X0, X1, H + 0.12, R, D, mul(TIJ.b, 0.8), FERRO_HI, [0, 0, 1])
  anel(B, F, 0, 7.15, 0.42, 0.6, 0.1, PRATA, 0, Math.PI * 2, 16)
  arco(B, F, 0, 7.15, 0.42, 0.05, [0.04, 0.01, 0.02], 0, Math.PI * 2, 16)
  // gota acesa: corpo redondo + bico em cima (miolo claro puxado para o alto-esquerda = brilho)
  arco(G, F, -0.05, 7.04, 0.2, 0.07, [[1, 0.72, 0.62], ...Array.from({ length: 17 }, () => [0.85, 0.06, 0.05] as RGB)], 0, Math.PI * 2, 16)
  face(G, [F.P(-0.17, 7.14, 0.071), F.P(0.17, 7.14, 0.071), F.P(0, 7.46, 0.071)], [[0.85, 0.06, 0.05], [0.85, 0.06, 0.05], [1, 0.35, 0.25]], [0, 0, -1])
  for (const s of [-1, 1]) lampiao(B, G, F, s * 1.15, 7.2, PRATA, LAMPIAO, 0.6)
  telhado(B, X0 - 0.15, X1 + 0.15, H + 0.12, R, -0.02, D, { a: ARDOSIA, b: ARDOSIA_B, cume: FERRO_HI }, 11)
  // crista de ferro e pináculos nas pontas
  for (const z of [-0.45, D + 0.45]) {
    tube(B, [0, R + 0.08, z], [0, R + 0.75, z], 0.05, 0.012, 6, (k) => (k % 2 ? PRATA : FERRO_HI))
    tube(B, [0, R + 0.3, z], [0, R + 0.42, z], 0.09, 0.09, 8, () => PRATA)
  }
  for (let z = 0.6; z < D; z += 0.7) tube(B, [0, R + 0.1, z], [0, R + 0.38, z], 0.018, 0.006, 4, () => FERRO_HI)
  // chaminé de ferro (lado direito, atrás)
  tube(B, [3.4, 6.9, 7.5], [3.4, R + 1.3, 7.5], 0.32, 0.28, 8, (k) => (k % 2 ? FERRO : FERRO_HI))
  tube(B, [3.4, R + 1.3, 7.5], [3.4, R + 1.5, 7.5], 0.4, 0.4, 8, () => PRATA)

  // ── faixa do letreiro (reservada) e cornija do térreo ──
  relevo(B, F, X0, X1, 3.0, 4.0, 0, 0.08, FERRO, { hi: FERRO_HI })
  ret(B, F, -3.8, 3.8, 3.05, 3.95, 0.085, [mul(MADEIRA, 0.7), mul(MADEIRA, 0.7), MADEIRA, MADEIRA])
  for (const [u0, u1, y0, y1] of [[-3.9, 3.9, 3.95, 4.0], [-3.9, 3.9, 3.0, 3.05], [-3.9, -3.8, 3.0, 4.0], [3.8, 3.9, 3.0, 4.0]]) relevo(B, F, u0, u1, y0, y1, 0.08, 0.12, LATAO, { wear: 1 })
  for (const u of [-5.1, 5.1]) {
    // rosetas de prata dos dois lados da faixa
    anel(B, F, u, 3.5, 0.12, 0.26, 0.12, PRATA, 0, Math.PI * 2, 10)
    arco(B, F, u, 3.5, 0.12, 0.1, VINHO, 0, Math.PI * 2, 10)
  }
  relevo(B, F, X0 - 0.1, X1 + 0.1, 4.0, 4.16, 0, 0.32, mul(PEDRA, 1.4), { wear: 1 })

  // ── térreo: fundo de ferro, embasamento de pedra, 6 pilastras, 4 vitrines, porta ──
  ret(B, F, X0, X1, 0, 3.0, 0, FERRO)
  relevo(B, F, X0, X1, 0, 0.42, 0, 0.14, PEDRA, { wear: 1 })
  for (const pl of [esquerda(X0), direita(X1)]) relevo(B, pl, 0, D, 0, 0.42, 0, 0.1, PEDRA)
  const vit: [number, number][] = [[1.32, 3.3], [3.68, 5.72]]
  for (const [a, b] of vit) {
    vitrine(B, G, a, b, 1)
    vitrine(B, G, -b, -a, 2)
  }
  const pil = [-6.2, -3.66, -1.32, 1.0, 3.32, 5.74]
  for (const a of pil) {
    const b = a + (a === -1.32 || a === 1.0 ? 0.32 : 0.46)
    relevo(B, F, a, b, 0.42, 2.78, 0, 0.16, FERRO, { cs: mul(FERRO, 0.8), hi: FERRO_HI, wear: 1 })
    relevo(B, F, a + 0.08, b - 0.08, 0.9, 2.4, 0.16, 0.19, FERRO_HI, { wear: 0.8 })
    relevo(B, F, a - 0.06, b + 0.06, 2.78, 3.0, 0, 0.24, PRATA, { wear: 1 })
    relevo(B, F, a - 0.04, b + 0.04, 0.42, 0.6, 0, 0.21, FERRO_HI, { wear: 1 })
  }
  // porta: duas folhas vinho-escuro com almofadas, visor aceso, bandeira em leque, degrau
  ret(B, F, -0.95, 0.95, 0.15, 2.66, 0.002, [0.02, 0.01, 0.01])
  for (const s of [-1, 1]) {
    const a = s < 0 ? -0.9 : 0.02, b = s < 0 ? -0.02 : 0.9
    relevo(B, F, a, b, 0.15, 2.58, -0.02, 0.02, MADEIRA, { hi: mul(MADEIRA, 1.6) })
    relevo(B, F, a + 0.12, b - 0.12, 0.35, 1.15, 0.02, 0.05, mul(MADEIRA, 1.3))
    retV(G, F, a + 0.12, b - 0.12, 1.4, 2.35, 0.025, JANELA_LO, JANELA_HI)
    relevo(B, F, (a + b) / 2 - 0.02, (a + b) / 2 + 0.02, 1.4, 2.35, 0.03, 0.05, FERRO)
    relevo(B, F, s < 0 ? b - 0.12 : a + 0.06, s < 0 ? b - 0.06 : a + 0.12, 1.1, 1.4, 0.02, 0.07, LATAO, { wear: 1 })
  }
  arco(G, F, 0, 2.62, 0.86, 0.0, [[1, 0.75, 0.55], ...Array.from({ length: 11 }, () => JANELA_LO)], 0, Math.PI, 10)
  for (let k = 1; k < 6; k++) {
    const a = (Math.PI * k) / 6
    tube(B, F.P(0, 2.62, 0.01), F.P(Math.cos(a) * 0.84, 2.62 + Math.sin(a) * 0.84 * 0.45, 0.01), 0.012, 0.012, 4, () => FERRO, false)
  }
  relevo(B, F, -1.05, 1.05, 2.58, 2.66, 0, 0.12, PRATA, { wear: 1 })
  relevo(B, F, -1.2, 1.2, 0, 0.15, 0, 0.5, mul(PEDRA, 1.3), { wear: 1 })

  // ── toldos vinho sobre as vitrines ──
  toldo(B, -5.8, -1.38, 2.84, 1.0, 0.38, 6, (i) => (i % 2 ? VINHO : VINHO_DK), PRATA)
  toldo(B, 1.38, 5.8, 2.84, 1.0, 0.38, 6, (i) => (i % 2 ? VINHO : VINHO_DK), PRATA)

  // ── lampiões de prata: dois na porta, dois nas quinas ──
  for (const u of [-1.16, 1.16]) lampiao(B, G, F, u, 2.3, PRATA, LAMPIAO)
  for (const u of [-6.0, 6.0]) lampiao(B, G, F, u, 4.9, PRATA, LAMPIAO, 0.8)

  // ── cano de vapor de cobre na quina esquerda, com braçadeiras e um registro ──
  const cx = X0 - 0.12, cz = -0.12
  tube(B, [cx, 0.3, cz], [cx, H - 0.15, cz], 0.07, 0.07, 6, (k) => (k % 2 ? LATAO : mul(LATAO, 1.3)))
  for (let y = 0.8; y < H - 0.3; y += 1.1) tube(B, [cx, y, cz], [cx, y + 0.08, cz], 0.1, 0.1, 6, () => FERRO_HI)
  tube(B, [cx - 0.02, 1.6, cz], [cx - 0.02, 1.6, cz - 0.18], 0.03, 0.03, 5, () => LATAO)
  tube(B, [cx - 0.02, 1.6, cz - 0.18], [cx - 0.02, 1.6, cz - 0.22], 0.16, 0.16, 8, (k) => (k % 2 ? VINHO : PRATA))
}

/** Material e desgaste (o mesmo na vitrine e no jogo). */
export const ACABAMENTO = {
  spec: [0.12, 0.12, 0.14],
  power: 18,
  self: [0.04, 0.02, 0.02],
  weather: { rust: [0.08, 0.05, 0.05], bare: [0.62, 0.6, 0.64], grime: 0.8, rustAmt: 0.5 },
} as const

/** Vitrine: só luz de céu, então o sol vai pintado mais forte nas facetas. */
export function build(scene: Scene): Mesh {
  setSun([-0.55, 0.7, -0.45], 2)
  const B = new Geo()
  const G = new Geo()
  fachadaBancoDeSangue(B, G)
  return finish(scene, "banco-de-sangue", B, G, ACABAMENTO)
}
