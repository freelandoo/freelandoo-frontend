// Açougue — fachada do prédio `hamburgueria` do centro (Opus com a skill `meu-mundo-cenario-codigo`,
// 2026-11-15). Ref: ref/acougue.png (clima e paleta: a arte do cardápio da Raposa; a fachada sai do
// prompt "Pequeno açougue steampunk de dois andares, tijolo e madeira clara, vitrine com peças de carne
// de caça penduradas em ganchos de ferro, toldo listrado âmbar e creme, chaminé de cobre").
//
// FICHA
// O que é:        sobrado de caçador: térreo de tijolo com vitrine de madeira clara (carnes nos
//                 ganchos), andar de cima em enxaimel (vigas claras sobre reboco creme), empena alta.
// Silhueta:       caixa de 12,4 × 6 m e empena BEM inclinada até 8,6 m (o contraste com o Banco de
//                 Sangue, vizinho, de empena baixa); quebram: toldo listrado de ponta a ponta, chaminé
//                 de cobre alta, lampiões, beiral fundo, jardineiras.
// Simetria:       espelhada no eixo da porta, menos a chaminé (direita) e a lenha (esquerda).
// Massas grandes: térreo de tijolo (0–3 m), faixa do letreiro (3–4 m), andar de enxaimel (4–6 m),
//                 empena + telhado de telha (6–8,6 m), chaminé (até 10 m).
// Médios:         2 vitrines largas, porta de madeira com visor, toldo de 12 listras, 2 janelas com
//                 venezianas, vigas em X na empena, medalhão das duas facas.
// Pequenos:       carnes (pernil, costela, linguiça) nos ganchos, tábua e cutelo no balcão, cravos
//                 de ferro nas vigas, lampiões de cobre, jardineiras com ervas, pilha de lenha.
// Paleta:         tijolo laranja-telha (3 tons), madeira clara mel, viga escura de nogueira, reboco
//                 creme, toldo âmbar × creme, cobre; luz: âmbar quente nas vitrines e janelas.
// Material:       tijolo, madeira, reboco (pouco brilho), cobre nas quinas.
// Fora:           texto e letreiro (o jogo pendura a placa na faixa de 3,5 m); fumaça da chaminé
//                 (o jogo tem vapor por prédio).
// Medidas:        contrato do centro: origem no meio da fachada, fachada em z = 0 virada para −z,
//                 12,4 m de largura, 11,4 de fundo, beiral 6 m, cumeeira 8,6 m, porta de 1,8 m no
//                 meio. Faixa do letreiro LISA de x −3,8 a 3,8, y 3,05–3,95.
// Inventado:      lados e fundos: tijolo embaixo, enxaimel em cima, janelas escuras, lenha na lateral.
//
// PLANO (triângulos)
// tijolo ~2.000 · enxaimel (painéis + vigas) ~900 · vitrines + carnes ~1.600 · toldo ~400 ·
// janelas e venezianas ~500 · telhado ~900 · chaminé, lampiões, lenha ~1.200 → ~7,5 mil (12 mil).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Geo, finish, type RGB, type V3 } from "../kit"
import { face, mix, mul, rnd, setSun, tube } from "../kit-natureza"
import { anel, arco, direita, empena, esquerda, frente, fundos, janelaReta, lampiao, relevo, ret, retV, telhado, tijolos, toldo, type Plano, type Tijolo } from "./loja-kit"

export const meta = { luz: "neutra", maxTri: 12000 }

const W = 12.4, D = 11.4, H = 6, R = 8.6
const X0 = -W / 2, X1 = W / 2

// ── paleta ──
const TIJ: Tijolo = { a: [0.5, 0.2, 0.1], b: [0.42, 0.16, 0.08], c: [0.58, 0.28, 0.14], junta: [0.16, 0.1, 0.07] }
const MADEIRA: RGB = [0.7, 0.48, 0.25]
const MADEIRA_HI: RGB = [0.82, 0.62, 0.36]
const VIGA: RGB = [0.3, 0.18, 0.09]
const REBOCO: RGB = [0.86, 0.72, 0.5]
const COBRE: RGB = [0.62, 0.32, 0.14]
const FERRO: RGB = [0.1, 0.09, 0.08]
const PEDRA: RGB = [0.42, 0.36, 0.3]
const AMBAR: RGB = [0.85, 0.48, 0.1]
const CREME: RGB = [0.9, 0.82, 0.62]
const TELHA_A: RGB = [0.42, 0.2, 0.1]
const TELHA_B: RGB = [0.5, 0.26, 0.13]
// carne (corpo iluminado, não acesa)
const CARNE: RGB = [0.5, 0.1, 0.07]
const CARNE_HI: RGB = [0.72, 0.24, 0.14]
const GORDURA: RGB = [0.9, 0.78, 0.6]
const DEFUMADO: RGB = [0.36, 0.14, 0.07]
// luz
const LUZ_LO: RGB = [0.42, 0.2, 0.05]
const LUZ_HI: RGB = [1, 0.72, 0.36]
const JANELA_LO: RGB = [0.6, 0.3, 0.08]
const JANELA_HI: RGB = [1, 0.82, 0.5]
const LAMPIAO = { core: [1, 0.95, 0.75] as RGB, edge: [1, 0.62, 0.22] as RGB }

/** Peça pendurada: polígono com gordura na borda de cima e o osso saindo (pernil) ou retângulo de costela. */
function carne(B: Geo, F: Plano, uc: number, top: number, kind: number, s: number) {
  const z = 0.03
  if (kind === 0) {
    // pernil: gota invertida, osso no alto
    const h = 0.62 * s, w = 0.36 * s
    const pts: [number, number][] = [[uc - w * 0.18, top - 0.08], [uc + w * 0.18, top - 0.08], [uc + w * 0.5, top - h * 0.45], [uc + w * 0.42, top - h * 0.82], [uc, top - h], [uc - w * 0.42, top - h * 0.82], [uc - w * 0.5, top - h * 0.45]]
    face(B, pts.map(([u, y]) => F.P(u, y, z)), pts.map(([, y]) => mix(CARNE, CARNE_HI, (y - (top - h)) / h)), F.n)
    face(B, [F.P(uc - w * 0.3, top - h * 0.3, z + 0.004), F.P(uc + w * 0.36, top - h * 0.36, z + 0.004), F.P(uc + w * 0.3, top - h * 0.5, z + 0.004), F.P(uc - w * 0.34, top - h * 0.44, z + 0.004)], GORDURA, F.n)
    relevo(B, F, uc - 0.035, uc + 0.035, top - 0.1, top + 0.02, z, z + 0.04, GORDURA, { wear: 0.4 })
  } else if (kind === 1) {
    // costela: placa com 4 ossos claros
    const h = 0.5 * s, w = 0.42 * s
    retV(B, F, uc - w / 2, uc + w / 2, top - h, top - 0.06, z, CARNE, CARNE_HI)
    for (let k = 0; k < 4; k++) {
      const u = uc - w / 2 + (w * (k + 0.5)) / 4
      relevo(B, F, u - 0.018, u + 0.018, top - h - 0.04, top - 0.04, z, z + 0.025, GORDURA, { wear: 0.3 })
    }
  } else {
    // réstia de linguiça: gomos em zigue-zague
    for (let k = 0; k < 5; k++) {
      const y = top - 0.08 - k * 0.12 * s, u = uc + (k % 2 ? 0.05 : -0.05)
      tube(B, F.P(u, y, z + 0.03), F.P(u, y - 0.11 * s, z + 0.03), 0.045 * s, 0.045 * s, 6, (q) => (q % 2 ? DEFUMADO : mul(DEFUMADO, 1.4)))
    }
  }
  // gancho de ferro
  tube(B, F.P(uc, top, z + 0.03), F.P(uc, top + 0.2, z + 0.03), 0.01, 0.01, 4, () => FERRO, false)
}

function vitrine(B: Geo, G: Geo, u0: number, u1: number, seed: number) {
  const F = frente()
  const y0 = 0.7, y1 = 2.6
  retV(G, F, u0, u1, y0, y1, 0.004, LUZ_LO, LUZ_HI)
  // trilho de ferro e as carnes
  tube(B, [u0 + 0.05, 2.18, -0.03], [u1 - 0.05, 2.18, -0.03], 0.025, 0.025, 6, () => FERRO)
  const n = Math.round((u1 - u0) / 0.55)
  for (let i = 0; i < n; i++) {
    const uc = u0 + ((u1 - u0) * (i + 0.5)) / n
    const kind = (i + seed) % 3
    carne(B, F, uc, 1.98 - 0.05 * ((i * 5 + seed) % 2), kind, 0.95 + 0.15 * rnd(i, seed))
  }
  // balcão: tábua com cutelo e um pedaço de queijo/gordura
  relevo(B, F, u0, u1, 0.95, 1.05, 0.004, 0.12, MADEIRA_HI, { wear: 1 })
  const uc = (u0 + u1) / 2 + (seed % 2 ? 0.4 : -0.4)
  relevo(B, F, uc - 0.32, uc + 0.32, 1.05, 1.1, 0.02, 0.1, MADEIRA, { wear: 1 })
  face(B, [F.P(uc - 0.05, 1.1, 0.06), F.P(uc + 0.22, 1.1, 0.06), F.P(uc + 0.24, 1.26, 0.06), F.P(uc - 0.03, 1.28, 0.06)], [0.62, 0.64, 0.68], F.n, 1)
  relevo(B, F, uc - 0.2, uc - 0.04, 1.14, 1.18, 0.05, 0.08, VIGA)
  // mureta de tijolo embaixo + moldura de madeira clara
  relevo(B, F, u0 - 0.1, u1 + 0.1, 0.5, 0.7, 0, 0.12, MADEIRA, { hi: MADEIRA_HI, wear: 1 })
  relevo(B, F, u0 - 0.1, u0, 0.7, 2.6, 0, 0.1, MADEIRA, { hi: MADEIRA_HI })
  relevo(B, F, u1, u1 + 0.1, 0.7, 2.6, 0, 0.1, MADEIRA, { hi: MADEIRA_HI })
  relevo(B, F, u0 - 0.1, u1 + 0.1, 2.6, 2.72, 0, 0.12, MADEIRA, { hi: MADEIRA_HI, wear: 1 })
  // montantes finos da vitrine (3 vidros)
  for (const t of [1 / 3, 2 / 3]) {
    const u = u0 + (u1 - u0) * t
    relevo(B, F, u - 0.03, u + 0.03, 0.7, 2.6, 0.004, 0.06, MADEIRA, { hi: MADEIRA_HI, wear: 0.5 })
  }
}

/** Painel de enxaimel: reboco creme + moldura de vigas; `x` = vigas em X; `diag` = uma diagonal. */
function enxaimel(B: Geo, pl: Plano, u0: number, u1: number, y0: number, y1: number, tipo: "liso" | "x" | "diag", seed: number) {
  retV(B, pl, u0, u1, y0, y1, 0.0, mul(REBOCO, 0.85 + 0.1 * rnd(u0, seed)), REBOCO)
  const t = 0.16
  if (tipo === "x" || tipo === "diag") {
    const dirs: [number, number, number, number][] = tipo === "x" ? [[u0, y0, u1, y1], [u0, y1, u1, y0]] : [[u0, y0, u1, y1]]
    for (const [a, b, c, d] of dirs) {
      const len = Math.hypot(c - a, d - b), nx = (-(d - b) / len) * t * 0.5, ny = ((c - a) / len) * t * 0.5
      face(B, [pl.P(a + nx, b + ny, 0.03), pl.P(c + nx, d + ny, 0.03), pl.P(c - nx, d - ny, 0.03), pl.P(a - nx, b - ny, 0.03)], [VIGA, mul(VIGA, 1.2), mul(VIGA, 1.2), VIGA], pl.n, 0.6)
    }
  }
}

/** A fachada inteira em `B` (corpo) e `G` (luz acesa), no quadro do contrato (origem no meio da fachada). */
export function fachadaAcougue(B: Geo, G: Geo) {
  const F = frente()

  // ── corpo: tijolo embaixo, enxaimel em cima, nos quatro lados ──
  const lados: [Plano, number, number][] = [[esquerda(X0), 0, D], [direita(X1), 0, D], [fundos(D), X0, X1]]
  lados.forEach(([pl, u0, u1], k) => {
    tijolos(B, pl, u0, u1, 0, 3.6, TIJ, 20 + k, 1.0, 0.36, 0.6)
    const n = Math.round((u1 - u0) / 1.9)
    for (let i = 0; i < n; i++) {
      const a = u0 + ((u1 - u0) * i) / n, b = u0 + ((u1 - u0) * (i + 1)) / n
      enxaimel(B, pl, a, b, 3.75, H, i % 3 === 1 ? "x" : "liso", k * 7 + i)
      relevo(B, pl, a - 0.08, a + 0.08, 3.6, H, 0.0, 0.06, VIGA, { hi: mul(VIGA, 1.5) })
    }
    relevo(B, pl, u0, u1, 3.6, 3.76, 0, 0.1, VIGA, { hi: mul(VIGA, 1.5), wear: 1 })
    relevo(B, pl, u0, u1, H - 0.1, H + 0.06, 0, 0.12, VIGA, { hi: mul(VIGA, 1.5), wear: 1 })
    for (const u of [u0 + (u1 - u0) * 0.3, u0 + (u1 - u0) * 0.72]) janelaReta(B, null, pl, u, 0.9, 4.3, 5.4, { moldura: VIGA, caixilho: VIGA, lo: [0.06, 0.05, 0.05], hi: [0.2, 0.2, 0.22], z0: 0.04 })
  })

  // ── andar de cima (frente): enxaimel, 2 janelas acesas com venezianas e jardineiras ──
  const paineis: [number, number, "liso" | "x" | "diag"][] = [[-6.2, -4.6, "x"], [-4.6, -2.0, "diag"], [-2.0, 2.0, "liso"], [2.0, 4.6, "liso"], [4.6, 6.2, "x"]]
  paineis.forEach(([a, b, t], i) => enxaimel(B, F, a, b, 4.16, H - 0.1, t, i))
  for (const u of [-6.2, -4.6, -2.0, 2.0, 4.6, 6.04]) {
    relevo(B, F, u, u + 0.16, 4.16, H - 0.1, 0, 0.08, VIGA, { hi: mul(VIGA, 1.6) })
    for (const y of [4.4, 5.6]) relevo(B, F, u + 0.05, u + 0.11, y, y + 0.06, 0.08, 0.11, FERRO, { wear: 1 })
  }
  for (const uc of [-3.3, 3.3]) {
    janelaReta(B, G, F, uc, 1.3, 4.45, 5.6, { moldura: MADEIRA, caixilho: VIGA, lo: JANELA_LO, hi: JANELA_HI, peitoril: MADEIRA_HI, z0: 0.04 })
    for (const s of [-1, 1]) {
      // veneziana aberta (de lado, encostada na parede)
      const a = uc + s * 0.8, b = uc + s * 1.38
      relevo(B, F, Math.min(a, b), Math.max(a, b), 4.4, 5.72, 0.04, 0.1, mix(MADEIRA, AMBAR, 0.3), { hi: MADEIRA_HI })
      for (let k = 0; k < 7; k++) {
        const y = 4.52 + k * 0.17
        relevo(B, F, Math.min(a, b) + 0.06, Math.max(a, b) - 0.06, y, y + 0.05, 0.1, 0.13, mul(MADEIRA, 0.75), { wear: 0.4 })
      }
    }
    // jardineira com ervas
    relevo(B, F, uc - 0.75, uc + 0.75, 4.08, 4.32, 0.05, 0.4, COBRE, { hi: mul(COBRE, 1.4), wear: 1 })
    for (let k = 0; k < 7; k++) {
      const u = uc - 0.62 + k * 0.205
      const p = F.P(u, 4.32, 0.22)
      for (let f = 0; f < 3; f++) {
        const a = rnd(k, f, uc) * Math.PI * 2, r = 0.12
        const tip: V3 = [p[0] + Math.cos(a) * r * 0.6, p[1] + 0.22 + 0.1 * rnd(f, k), p[2] + Math.sin(a) * r * 0.4]
        tube(B, p, tip, 0.04, 0.006, 3, (q) => (q % 2 ? [0.2, 0.36, 0.1] : [0.34, 0.52, 0.16]), false)
      }
    }
  }
  relevo(B, F, X0 - 0.12, X1 + 0.12, H - 0.12, H + 0.08, 0, 0.3, VIGA, { hi: mul(VIGA, 1.6), wear: 1 })

  // ── empena alta em enxaimel + medalhão das facas + telhado de telha ──
  empena(B, X0 - 0.1, X1 + 0.1, H + 0.08, R, -0.02, REBOCO, VIGA)
  empena(B, X0 - 0.1, X1 + 0.1, H + 0.08, R, D, mul(REBOCO, 0.85), VIGA, [0, 0, 1])
  // vigas da empena: pendural no meio, duas escoras
  const viga = (a: [number, number], b: [number, number], t = 0.16) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (-(b[1] - a[1]) / len) * t * 0.5, ny = ((b[0] - a[0]) / len) * t * 0.5
    face(B, [F.P(a[0] + nx, a[1] + ny, 0.05), F.P(b[0] + nx, b[1] + ny, 0.05), F.P(b[0] - nx, b[1] - ny, 0.05), F.P(a[0] - nx, a[1] - ny, 0.05)], [VIGA, mul(VIGA, 1.25), mul(VIGA, 1.25), VIGA], F.n, 0.6)
  }
  viga([0, H + 0.1], [0, 6.75])
  viga([0, 7.65], [0, R - 0.2])
  viga([-4.4, H + 0.1], [-0.6, 7.3])
  viga([4.4, H + 0.1], [0.6, 7.3])
  viga([-2.4, H + 0.1], [-2.4, H + 0.95])
  viga([2.4, H + 0.1], [2.4, H + 0.95])
  anel(B, F, 0, 7.2, 0.4, 0.56, 0.08, COBRE, 0, Math.PI * 2, 16)
  arco(G, F, 0, 7.2, 0.4, 0.06, [[1, 0.9, 0.6], ...Array.from({ length: 17 }, () => [0.9, 0.46, 0.1] as RGB)], 0, Math.PI * 2, 16)
  // duas facas cruzadas na frente do disco aceso
  for (const s of [-1, 1]) {
    const c = Math.cos(s * 0.75), sn = Math.sin(s * 0.75)
    const P = (along: number, side: number) => F.P(along * sn + side * c, 7.2 + along * c - side * sn, 0.1)
    face(B, [P(-0.34, -0.035), P(-0.34, 0.035), P(-0.12, 0.035), P(-0.12, -0.035)], VIGA, F.n)
    face(B, [P(-0.12, -0.05), P(-0.12, 0.06), P(0.34, 0.03), P(0.36, -0.05)], [0.55, 0.57, 0.62], F.n, 1)
  }
  telhado(B, X0 - 0.12, X1 + 0.12, H + 0.08, R, -0.02, D, { a: TELHA_A, b: TELHA_B, cume: COBRE }, 13, 0.55)
  // chaminé de cobre alta (direita) com cintas e chapéu
  tube(B, [3.6, 6.6, 6.5], [3.6, R + 1.5, 6.5], 0.36, 0.3, 10, (k) => (k % 2 ? COBRE : mul(COBRE, 1.3)))
  for (const y of [7.4, 8.4, 9.4]) tube(B, [3.6, y, 6.5], [3.6, y + 0.1, 6.5], 0.38, 0.36, 10, () => mul(COBRE, 0.65))
  tube(B, [3.6, R + 1.5, 6.5], [3.6, R + 1.9, 6.5], 0.5, 0.1, 10, (k) => (k % 2 ? COBRE : mul(COBRE, 1.4)))

  // ── faixa do letreiro (reservada) ──
  relevo(B, F, X0, X1, 3.0, 4.0, 0, 0.06, VIGA, { hi: mul(VIGA, 1.5) })
  ret(B, F, -3.8, 3.8, 3.05, 3.95, 0.065, [mul(VIGA, 0.75), mul(VIGA, 0.75), VIGA, VIGA])
  for (const [u0, u1, y0, y1] of [[-3.9, 3.9, 3.95, 4.0], [-3.9, 3.9, 3.0, 3.05], [-3.9, -3.8, 3.0, 4.0], [3.8, 3.9, 3.0, 4.0]]) relevo(B, F, u0, u1, y0, y1, 0.06, 0.1, COBRE, { wear: 1 })
  relevo(B, F, X0 - 0.08, X1 + 0.08, 4.0, 4.16, 0, 0.26, MADEIRA, { hi: MADEIRA_HI, wear: 1 })

  // ── térreo: tijolo, embasamento de pedra, 2 vitrines largas, porta de madeira ──
  // tijolo só entre os vãos (o vidro e a porta ficam no plano da parede, sem tijolo por cima)
  for (const [a, b] of [[X0, -5.7], [-1.5, -1.08], [1.08, 1.5], [5.7, X1]]) tijolos(B, F, a, b, 0.5, 3.0, TIJ, 5 + a, 0.6, 0.22, 1)
  for (const [a, b] of [[-5.7, -1.5], [1.5, 5.7], [-1.08, 1.08]]) tijolos(B, F, a, b, a === -1.08 ? 2.86 : 2.72, 3.0, TIJ, 9 + a, 0.6, 0.14, 1)
  relevo(B, F, X0, X1, 0, 0.5, 0.016, 0.14, PEDRA, { wear: 1 })
  for (const pl of [esquerda(X0), direita(X1)]) relevo(B, pl, 0, D, 0, 0.5, 0.016, 0.12, PEDRA)
  vitrine(B, G, -5.6, -1.6, 1)
  vitrine(B, G, 1.6, 5.6, 2)
  // porta: madeira clara de uma folha, visor aceso, batente e bandeira
  ret(B, F, -0.95, 0.95, 0.15, 2.7, 0.018, [0.05, 0.03, 0.02])
  relevo(B, F, -0.88, 0.88, 0.15, 2.62, 0.016, 0.06, MADEIRA, { hi: MADEIRA_HI })
  for (const [y0, y1] of [[0.35, 1.05], [1.15, 1.6]]) relevo(B, F, -0.7, 0.7, y0, y1, 0.06, 0.09, mul(MADEIRA, 1.15))
  retV(G, F, -0.6, 0.6, 1.75, 2.45, 0.065, JANELA_LO, JANELA_HI)
  relevo(B, F, -0.02, 0.02, 1.75, 2.45, 0.07, 0.09, VIGA)
  relevo(B, F, -0.6, 0.6, 2.08, 2.12, 0.07, 0.09, VIGA)
  relevo(B, F, 0.55, 0.7, 1.15, 1.3, 0.09, 0.15, COBRE, { wear: 1 })
  relevo(B, F, -1.08, -0.92, 0.15, 2.82, 0.016, 0.16, MADEIRA_HI, { wear: 1 })
  relevo(B, F, 0.92, 1.08, 0.15, 2.82, 0.016, 0.16, MADEIRA_HI, { wear: 1 })
  relevo(B, F, -1.08, 1.08, 2.7, 2.86, 0.016, 0.18, MADEIRA_HI, { wear: 1 })
  relevo(B, F, -1.25, 1.25, 0, 0.15, 0, 0.5, mul(PEDRA, 1.2), { wear: 1 })

  // ── toldo listrado âmbar × creme, de ponta a ponta (aberto sobre a porta) ──
  toldo(B, -5.9, -1.15, 2.84, 1.15, 0.42, 8, (i) => (i % 2 ? CREME : AMBAR), COBRE)
  toldo(B, 1.15, 5.9, 2.84, 1.15, 0.42, 8, (i) => (i % 2 ? CREME : AMBAR), COBRE)

  // ── lampiões de cobre ──
  for (const u of [-1.3, 1.3]) lampiao(B, G, F, u, 2.35, COBRE, LAMPIAO)
  for (const u of [-6.0, 6.0]) lampiao(B, G, F, u, 3.5, COBRE, LAMPIAO, 0.8)

  // ── pilha de lenha encostada no lado esquerdo, na frente ──
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 5 - (r % 2); k++) {
      const z = 0.5 + k * 0.26 + (r % 2) * 0.13, y = 0.13 + r * 0.22
      tube(B, [X0 - 0.05, y, z], [X0 - 0.95, y, z], 0.11, 0.11, 6, (q) => (q === 0 ? MADEIRA_HI : mul(DEFUMADO, 1.3 + 0.3 * rnd(r, k))))
    }
}

/** Material e desgaste (o mesmo na vitrine e no jogo). */
export const ACABAMENTO = {
  spec: [0.06, 0.05, 0.04],
  power: 10,
  self: [0.05, 0.03, 0.02],
  weather: { rust: [0.2, 0.12, 0.08], bare: [0.88, 0.78, 0.62], grime: 0.7, rustAmt: 0.5 },
} as const

/** Vitrine: só luz de céu, então o sol vai pintado mais forte nas facetas. */
export function build(scene: Scene): Mesh {
  setSun([-0.55, 0.7, -0.45], 2)
  const B = new Geo()
  const G = new Geo()
  fachadaAcougue(B, G)
  return finish(scene, "acougue", B, G, ACABAMENTO)
}
