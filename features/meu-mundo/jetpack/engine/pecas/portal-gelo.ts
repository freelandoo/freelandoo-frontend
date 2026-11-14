// Portado da vitrine (MEU MUNDO 3D/pipeline/pecas-codigo/pecas/portal-gelo.ts) para o Jetpack em código (14/11):
// o aro dos anéis (contrato: plano XY, frente −z, furo de raio 1 livre, gira em z). Paleta por fase.
// Portal de gelo SEM NEVE (Opus com a skill `meu-mundo-cenario-codigo`, 2026-11-11). Ref: ref/portal-gelo.png
//
// FICHA
// O que é:        portal-anel de metal com um anel aceso laranja por dentro e quatro caixas grandes nos pontos cardeais.
// Silhueta:       anel grosso; quebrada pelas 4 caixas (topo e base largas, laterais com farol saltado) e pelas
//                 4 braçadeiras diagonais; a base é a maior (apoio), a lateral direita tem um bloco extra atrás.
// Simetria:       em volta de z, 8 posições (4 caixas a 0/90/180/270°, 4 braçadeiras a 45°+90°k); NÃO perfeita:
//                 topo e base = respiro "II"; esquerda e direita = farol; base maior; bloco extra só à direita.
// Massas grandes: tubo (r 1,0–1,5; ~1/3,6 do diâmetro total), caixa do topo (~1/5 do diâmetro de largura),
//                 caixa da base (~1/4), 2 caixas de farol (~1/5), 4 braçadeiras (~1/12).
// Médios:         anel aceso na quina de dentro da frente (canaleta), chapa elevada no meio de cada trecho,
//                 placa da frente das caixas, grade dupla "II" acesa, faixas de perigo nas braçadeiras,
//                 casulo do farol, pés da base.
// Pequenos:       parafusos nos cantos das placas e nas braçadeiras, anel de latão dos faróis, cruz do farol,
//                 emendas das chapas, 2 luzes-piloto ciano no bloco extra.
// Paleta:         metal azul-ardósia (NAVY_DK/NAVY/PLATE/SHELL), quina azul clara (EDGE), fundo DEEP;
//                 acesos: laranja → amarelo (G_RED/G_OR/G_HOT) e lente G_CORE/G_AMB; acentos: amarelo de
//                 perigo, latão, ciano pequeno.
// Material:       metal frio.
// Fora:           a neve e os pingentes de gelo (orgânico, pedido do Alex); o chão de neve sob a base.
// Medidas:        contrato do aro do Jetpack: plano XY, frente −z, furo de raio 1 livre, gira em z; tubo até
//                 r 1,5; caixas até ~1,85 (base ~2,0); profundidade ~0,8.
// Inventado:      as costas (a imagem só mostra a frente em 3/4): costas escuras e lisas, caixas fechadas.
//
// PLANO (triângulos)
// | tubo, 8 trechos × 16 arestas × 12 seg × 2           | sweep          | ~3.100 |
// | canaleta acesa 8 × 4 × 12 × 2 + grade 8 × 6 × 6     | sweep + pbox   | ~1.050 |
// | chapa elevada + cintas + emendas                    | sweep + pbox   | ~1.300 |
// | 4 caixas (corpo, placa, testa, aletas)              | pbox chanfrado | ~  700 |
// | 2 respiros "II" (fundo, rasgos, grade)              | pbox + quad    | ~  250 |
// | 2 faróis (casulo 20 seg + lente 20 seg + cruz)      | sweep + pbox   | ~  800 |
// | 4 braçadeiras + faixas de perigo                    | pbox + quad    | ~  300 |
// | base: pés, bloco extra, luzes-piloto                | pbox + quad    | ~  200 |
// | ~44 parafusos × 20                                  | bolt           | ~  900 |
// | total                                               |                | ~8.600 (≤ 12 mil) |

import { Geo, sweep, pbox, pp, pt, bolt, step01, TAU } from "../../../engine/cena-codigo/kit"
import { PAL_METAL, type PalPortal } from "./portal-pal"
import type { Peca } from "./peca"


const ZF = -0.25
const ZB = 0.25
const Q = Math.PI / 2
/** Meia-abertura (rad) que cada massa cobre no aro (as pontas dos trechos ficam dentro dela). */
const HALF = { caixa: 0.27, base: 0.33, braca: 0.1 }

type Kind = "respiro" | "base" | "farol" | "farolX"
/** As 4 caixas: direita (farol + bloco extra), topo (respiro), esquerda (farol), base (respiro grande). */
const CAIXAS: [number, Kind][] = [
  [0, "farolX"],
  [Q, "respiro"],
  [2 * Q, "farol"],
  [3 * Q, "base"],
]

export function portalGelo(P: PalPortal = PAL_METAL): Peca {
  const { NAVY, NAVY_DK, PLATE, SHELL, EDGE, DEEP, STEEL, BRASS, HAZ_Y, HAZ_K, G_RED, G_OR, G_HOT, G_CORE, G_AMB, CYAN } = P
  const B = new Geo()
  const G = new Geo()

  // ── 1) o tubo: 8 trechos entre caixas e braçadeiras ──
  const masses: [number, number][] = [] // [ângulo, meia-abertura]
  for (const [a, k] of CAIXAS) masses.push([a, k === "base" ? HALF.base : HALF.caixa])
  for (let k = 0; k < 4; k++) masses.push([Q / 2 + k * Q, HALF.braca])
  masses.sort((x, y) => x[0] - y[0])
  for (let k = 0; k < masses.length; k++) {
    const [ma, mh] = masses[k]
    const [na, nh] = masses[(k + 1) % masses.length]
    const a0 = ma + mh * 0.8
    const a1 = (k + 1 === masses.length ? na + TAU : na) - nh * 0.8
    const A = (t: number) => a0 + (a1 - a0) * t
    const seg = 12
    const ao = (t: number) => 0.5 + 0.5 * step01(0, 0.2, Math.min(t, 1 - t))
    sweep(
      B,
      [
        pt(1.0, ZB - 0.05, NAVY_DK), // parede de dentro
        pt(1.0, ZF + 0.04, EDGE, 1), // chanfro do lábio
        pt(1.03, ZF, PLATE), // lábio
        pt(1.046, ZF, NAVY_DK), // desce na canaleta
        pt(1.052, ZF + 0.06, DEEP), // fundo (o anel aceso fica aqui)
        pt(1.188, ZF + 0.06, NAVY_DK), // sobe
        pt(1.195, ZF, EDGE, 1),
        pt(1.215, ZF - 0.02, PLATE), // frente
        pt(1.38, ZF - 0.02, EDGE, 1),
        pt(1.42, ZF + 0.02, NAVY), // ombro em 3 facetas
        pt(1.475, ZF + 0.09, NAVY),
        pt(1.5, ZF + 0.18, NAVY_DK),
        pt(1.5, ZB - 0.08, NAVY_DK), // parede de fora
        pt(1.46, ZB, DEEP),
        pt(1.04, ZB, NAVY_DK), // costas
        pt(1.0, ZB - 0.05, NAVY_DK),
      ],
      { a0, a1, seg, shade: ao },
    )
    // anel aceso na canaleta (gradiente borda → meio), pulsando devagar ao longo do trecho
    sweep(G, [pt(1.053, ZF + 0.052, G_RED), pt(1.085, ZF + 0.052, G_OR), pt(1.12, ZF + 0.052, G_HOT), pt(1.155, ZF + 0.052, G_OR), pt(1.187, ZF + 0.052, G_RED)], {
      a0, a1, seg, smooth: true, shade: (t) => 0.85 + 0.15 * Math.sin(t * Math.PI * 3) ** 2,
    })
    // grade escura rala sobre o anel (o contraste é que faz parecer aceso)
    const bars = 3
    for (let j = 1; j < bars; j++) pbox(B, A(j / bars), 1.05, 1.19, 0.01, 0.01, ZF + 0.005, ZF + 0.052, NAVY, DEEP, { back: false, ends: false })
    // chapa elevada no meio do trecho (segunda camada) + cintas nas pontas com parafuso
    const t0 = 0.16, t1 = 0.84
    sweep(B, [pt(1.23, ZF - 0.02, EDGE, 1), pt(1.245, ZF - 0.045, SHELL), pt(1.345, ZF - 0.045, SHELL), pt(1.365, ZF - 0.02, PLATE)], {
      a0: A(t0), a1: A(t1), seg: 10, shade: (t) => 0.75 + 0.25 * step01(0, 0.12, Math.min(t, 1 - t)),
    })
    for (const t of [t0, t1]) {
      pbox(B, A(t), 1.22, 1.378, 0.02, 0.02, ZF - 0.058, ZF - 0.015, STEEL, NAVY)
      bolt(B, A(t), 1.3, 0, ZF - 0.058, 0.013)
    }
    // emenda da chapa (só nos trechos longos)
    if (a1 - a0 > 0.4) pbox(B, A(0.5), 1.245, 1.345, 0.006, 0.006, ZF - 0.049, ZF - 0.04, DEEP, DEEP, { back: false })
  }

  // ── 2) as braçadeiras diagonais com faixa de perigo ──
  for (let k = 0; k < 4; k++) {
    const a = Q / 2 + k * Q
    pbox(B, a, 1.0, 1.58, 0.11, 0.135, -0.31, 0.29, STEEL, NAVY_DK, { bevel: 0.03 })
    // faixas inclinadas amarelo/preto na frente
    // (6 listras de ~5 cm, inclinadas 5 cm; a faixa cabe na frente da braçadeira)
    const n = 6, r0 = 1.1, r1 = 1.44, z = -0.313
    const sk = k % 2 ? -0.05 : 0.05 // alterna o sentido das listras (não parecer carimbo)
    for (let j = 0; j < n; j++) {
      const lo = r0 + Math.max(0, -sk), hi = r1 - Math.max(0, sk)
      const ra = lo + ((hi - lo) * j) / n, rb = lo + ((hi - lo) * (j + 1)) / n
      B.quad(pp(a, ra, -0.085, z), pp(a, ra + sk, 0.085, z), pp(a, rb + sk, 0.085, z), pp(a, rb, -0.085, z), j % 2 ? HAZ_K : HAZ_Y, 0.5)
    }
    bolt(B, a, 1.05, 0, -0.31, 0.016)
    bolt(B, a, 1.52, 0, -0.31, 0.016)
  }

  // ── 3) as quatro caixas ──
  for (const [a, kind] of CAIXAS) {
    const big = kind === "base"
    const h0 = big ? 0.34 : 0.28, h1 = big ? 0.44 : 0.36
    const r1 = big ? 1.92 : 1.8
    const zf = -0.36, zb = 0.34
    pbox(B, a, 1.0, r1, h0, h1, zf, zb, PLATE, NAVY_DK, { bevel: 0.05 })
    // testa por fora (casca) e aletas laterais
    pbox(B, a, r1 - 0.06, r1 + 0.06, h1 - 0.04, h1 - 0.04, -0.3, 0.28, SHELL, NAVY, { bevel: 0.02 })
    for (const s of [-1, 1]) pbox(B, a, 1.18, r1 - 0.2, 0.014, 0.014, -0.27, 0.24, STEEL, NAVY, { uc: s * (h0 + (h1 - h0) * 0.45 + 0.012) })

    if (kind === "respiro" || kind === "base") {
      // placa da frente em degrau, com o respiro "II"
      const pr0 = 1.12, pr1 = r1 - 0.1, ph0 = h0 - 0.06, ph1 = h1 - 0.08
      pbox(B, a, pr0, pr1, ph0, ph1, zf - 0.045, zf + 0.01, SHELL, EDGE, { bevel: 0.025 })
      const vr0 = 1.24, vr1 = pr1 - 0.12, zv = zf - 0.045
      pbox(B, a, vr0, vr1, 0.15, 0.17, zv - 0.004, zv + 0.02, DEEP, NAVY_DK, { back: false }) // rebaixo
      for (const u of [-0.075, 0.075]) {
        const P = (r: number, du: number) => pp(a, r, u + du, zv - 0.008)
        const rm = (vr0 + vr1) / 2
        G.quad(P(vr0 + 0.03, -0.028), P(vr0 + 0.03, 0.028), P(rm, 0.028), P(rm, -0.028), [G_RED, G_RED, G_HOT, G_HOT])
        G.quad(P(rm, -0.028), P(rm, 0.028), P(vr1 - 0.03, 0.028), P(vr1 - 0.03, -0.028), [G_HOT, G_HOT, G_RED, G_RED])
      }
      // moldura do "II": barra do meio e duas travessas
      pbox(B, a, vr0, vr1, 0.016, 0.016, zv - 0.03, zv - 0.004, STEEL, NAVY_DK, { back: false })
      for (const r of [vr0 + (vr1 - vr0) * 0.33, vr0 + (vr1 - vr0) * 0.66]) pbox(B, a, r - 0.008, r + 0.008, 0.14, 0.15, zv - 0.024, zv - 0.004, STEEL, NAVY_DK, { back: false })
      for (const [r, u] of [[pr0 + 0.06, ph0 - 0.05], [pr0 + 0.06, -(ph0 - 0.05)], [pr1 - 0.06, ph1 - 0.06], [pr1 - 0.06, -(ph1 - 0.06)]]) bolt(B, a, r, u, zf - 0.045, 0.02)
      if (big) {
        // pés da base: dois blocos largos por fora, com parafuso
        for (const s of [-1, 1]) {
          pbox(B, a, 1.62, 2.02, 0.11, 0.13, -0.4, 0.38, PLATE, NAVY_DK, { uc: s * 0.5, bevel: 0.04 })
          bolt(B, a, 1.9, s * 0.5, -0.4, 0.02)
        }
      }
    } else {
      // placa da frente em degrau (como nos respiros) e friso escuro em volta do farol
      const zp = zf - 0.045
      pbox(B, a, 1.12, r1 - 0.1, h0 - 0.06, h1 - 0.08, zp, zf + 0.01, SHELL, EDGE, { bevel: 0.025 })
      // farol: casulo chanfrado com anel de latão, lente em domo e cruz de proteção
      const rc = 1.4, z0 = zp
      const [cx, cy] = pp(a, rc, 0, 0)
      sweep(B, [pt(0.13, z0 - 0.03, DEEP), pt(0.14, z0 - 0.085, BRASS, 0.5), pt(0.175, z0 - 0.085, EDGE, 1), pt(0.215, z0 - 0.05, SHELL), pt(0.215, z0 + 0.01, SHELL)], { seg: 22, cx, cy })
      sweep(G, [pt(0, z0 - 0.07, G_CORE), pt(0.05, z0 - 0.068, G_CORE), pt(0.1, z0 - 0.056, G_HOT), pt(0.13, z0 - 0.03, G_AMB)], { seg: 22, cx, cy, smooth: true })
      pbox(B, a, rc - 0.008, rc + 0.008, 0.14, 0.14, z0 - 0.1, z0 - 0.075, STEEL, NAVY_DK)
      pbox(B, a, rc - 0.14, rc + 0.14, 0.008, 0.008, z0 - 0.1, z0 - 0.075, STEEL, NAVY_DK)
      for (const [r, u] of [[1.18, 0.17], [1.18, -0.17], [1.64, 0.22], [1.64, -0.22]]) bolt(B, a, r, u, zp, 0.02)
      // aba de baixo da placa com 3 frisos (quebra a chapa)
      for (const r of [1.62, 1.655, 1.69]) pbox(B, a, r - 0.006, r + 0.006, 0.12, 0.12, zp - 0.012, zp, DEEP, DEEP, { back: false, ends: false })
      if (kind === "farolX") {
        // bloco extra atrás do farol da direita, com duas luzes-piloto
        pbox(B, a, 1.74, 2.02, 0.17, 0.17, -0.12, 0.32, PLATE, NAVY_DK, { bevel: 0.035 })
        pbox(B, a, 1.8, 1.96, 0.12, 0.12, -0.15, -0.115, DEEP, NAVY_DK, { back: false })
        for (const [u, c] of [[-0.05, CYAN], [0.05, [0.1, 0.3, 0.36] as const]] as const) G.quad(pp(a, 1.85, u - 0.025, -0.153), pp(a, 1.85, u + 0.025, -0.153), pp(a, 1.91, u + 0.025, -0.153), pp(a, 1.91, u - 0.025, -0.153), c)
      }
    }
  }

  // desgaste um pouco mais forte que o padrão: as caixas têm poucos vértices e o ruído sumia nelas
  return { body: B, glow: G }
}
