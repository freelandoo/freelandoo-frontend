// Portado da vitrine (MEU MUNDO 3D/pipeline/pecas-codigo/pecas/portal-artico.ts) para o Jetpack em código (14/11):
// o aro dos anéis (contrato: plano XY, frente −z, furo de raio 1 livre, gira em z). Paleta por fase.
// Peça-exemplo da skill `meu-mundo-cenario-codigo`: portal do Ártico sem neve (Fable, 2026-11-11),
// copiado de uma referência (ref/portal-artico.png). Ler junto com a skill: cada bloco daqui é
// uma receita de lá.
import { Geo, sweep, pbox, pp, pt, bolt, step01, TAU, type Pt } from "../../../engine/cena-codigo/kit"
import { PAL_METAL, type PalPortal } from "./portal-pal"
import type { Peca } from "./peca"

const HOUS = 8
const ZF = -0.26
const ZB = 0.26

export function portalArtico(P: PalPortal = PAL_METAL): Peca {
  const { NAVY, NAVY_DK, PLATE, SHELL, EDGE, DEEP, STEEL, BRASS, COPPER, HAZ_Y, HAZ_K, G_RED, G_OR, G_HOT, G_CORE, G_AMB, CYAN } = P
  const B = new Geo()
  const G = new Geo()
  const span = TAU / HOUS
  const ao = (t: number) => 0.5 + 0.5 * step01(0, 0.16, Math.min(t, 1 - t))

  // ── os 8 gomos de blindagem ──
  for (let k = 0; k < HOUS; k++) {
    const a0 = k * span + 0.14, a1 = (k + 1) * span - 0.14
    const A = (t: number) => a0 + (a1 - a0) * t
    const seg = 14
    // aro: lábio do vão, faixa de dentro, canaleta, faixa de fora, ombro facetado, costas
    sweep(
      B,
      [
        pt(1.0, ZB - 0.04, NAVY_DK),
        pt(1.0, ZF + 0.06, EDGE, 1),
        pt(1.04, ZF, PLATE),
        pt(1.145, ZF, EDGE, 1),
        pt(1.16, ZF + 0.02, NAVY_DK),
        pt(1.165, ZF + 0.07, DEEP),
        pt(1.375, ZF + 0.07, NAVY_DK),
        pt(1.38, ZF + 0.02, EDGE, 1),
        pt(1.395, ZF, PLATE),
        pt(1.5, ZF, NAVY),
        pt(1.57, ZF + 0.03, NAVY),
        pt(1.61, ZF + 0.09, NAVY_DK),
        pt(1.625, ZF + 0.17, NAVY_DK),
        pt(1.625, ZB - 0.08, NAVY_DK),
        pt(1.57, ZB, DEEP),
        pt(1.05, ZB, NAVY_DK),
        pt(1.0, ZB - 0.04, NAVY_DK),
      ],
      { a0, a1, seg, shade: ao },
    )
    // casca de cima (segunda camada da blindagem), no meio do gomo
    sweep(
      B,
      [
        pt(1.425, ZF - 0.002, EDGE, 1),
        pt(1.44, ZF - 0.028, SHELL),
        pt(1.515, ZF - 0.028, SHELL),
        pt(1.59, ZF + 0.005, SHELL),
        pt(1.635, ZF + 0.075, PLATE),
        pt(1.652, ZF + 0.17, PLATE),
        pt(1.652, ZB - 0.14, EDGE, 1),
        pt(1.625, ZB - 0.12, NAVY_DK),
      ],
      { a0: A(0.13), a1: A(0.87), seg: 10, shade: (t) => 0.75 + 0.25 * step01(0, 0.1, Math.min(t, 1 - t)) },
    )
    // cintas nas pontas da casca + parafusos
    for (const t of [0.13, 0.87]) {
      pbox(B, A(t), 1.42, 1.668, 0.022, 0.022, ZF - 0.042, ZB - 0.1, STEEL, NAVY, {})
      bolt(B, A(t), 1.475, 0, ZF - 0.042, 0.014)
      bolt(B, A(t), 1.56, 0, ZF - 0.042, 0.014)
    }
    // canaleta de energia: vermelho na borda, amarelo no meio, pulsando ao longo do gomo
    sweep(G, [pt(1.167, ZF + 0.062, G_RED), pt(1.215, ZF + 0.062, G_OR), pt(1.27, ZF + 0.062, G_HOT), pt(1.325, ZF + 0.062, G_OR), pt(1.373, ZF + 0.062, G_RED)], {
      a0, a1, seg, smooth: true, shade: (t) => 0.82 + 0.18 * Math.sin(t * Math.PI * 5) ** 2,
    })
    // grade sobre a canaleta + trilho
    for (let j = 0; j < 10; j++) {
      const wide = j === 0 || j === 9 || j === 5
      pbox(B, A((j + 0.5) / 10), 1.165, 1.375, wide ? 0.02 : 0.009, wide ? 0.02 : 0.009, ZF + 0.008, ZF + 0.062, wide ? PLATE : NAVY, DEEP, { back: false, ends: false })
    }
    sweep(B, [pt(1.26, ZF + 0.006, STEEL), pt(1.28, ZF + 0.006, STEEL)], { a0, a1, seg })
    // faixa de dentro: perigo (gomos pares) ou luzes-piloto ciano (ímpares)
    if (k % 2 === 0) {
      const n = 9, t0 = 0.24, t1 = 0.76, sk = 0.035
      for (let j = 0; j < n; j++) {
        const b0 = A(t0 + ((t1 - t0) * j) / n), b1 = A(t0 + ((t1 - t0) * (j + 1)) / n)
        B.quad(pp(b0, 1.052, 0, ZF - 0.003), pp(b1, 1.052, 0, ZF - 0.003), pp(b1 + sk, 1.133, 0, ZF - 0.003), pp(b0 + sk, 1.133, 0, ZF - 0.003), j % 2 ? HAZ_K : HAZ_Y, 0.5)
      }
    } else {
      for (let j = 0; j < 5; j++) {
        const b = A(0.3 + j * 0.1)
        pbox(B, b, 1.07, 1.118, 0.02, 0.02, ZF - 0.008, ZF, DEEP, DEEP, { back: false })
        G.quad(pp(b, 1.078, -0.012, ZF - 0.01), pp(b, 1.078, 0.012, ZF - 0.01), pp(b, 1.11, 0.012, ZF - 0.01), pp(b, 1.11, -0.012, ZF - 0.01), j < 3 ? CYAN : [0.1, 0.3, 0.36])
      }
      bolt(B, A(0.2), 1.093, 0, ZF)
      bolt(B, A(0.8), 1.093, 0, ZF)
    }
    // conduíte de cobre por fora + braçadeiras
    const pipe: Pt[] = []
    for (let j = 0; j <= 5; j++) {
      const th = (j / 5) * TAU
      pipe.push(pt(1.682 + 0.03 * Math.cos(th), -0.04 + 0.03 * Math.sin(th), COPPER, 0.25))
    }
    sweep(B, pipe, { a0: a0 - 0.02, a1: a1 + 0.02, seg, smooth: true })
    for (const t of [0.33, 0.67]) pbox(B, A(t), 1.64, 1.722, 0.018, 0.018, -0.082, 0.002, STEEL, NAVY)
  }

  // ── as 8 caixas (pares: farol gradeado; ímpares: respiro aceso) ──
  const z0 = -0.35
  for (let k = 0; k < HOUS; k++) {
    const a = k * span
    pbox(B, a, 1.0, 1.75, 0.19, 0.26, z0, 0.31, PLATE, NAVY_DK, { bevel: 0.045 })
    // testa (por fora) e aletas laterais
    pbox(B, a, 1.705, 1.795, 0.21, 0.21, -0.29, 0.25, SHELL, NAVY, { bevel: 0.02 })
    for (const s of [-1, 1]) pbox(B, a, 1.2, 1.52, 0.014, 0.014, -0.2, 0.2, STEEL, NAVY, { uc: s * 0.262 })
    for (const [r, u] of [[1.085, 0.115], [1.085, -0.115], [1.665, 0.165], [1.665, -0.165]]) bolt(B, a, r, u, z0)
    if (k % 2 === 0) {
      const [cx, cy] = pp(a, 1.34, 0, 0)
      // aro do farol: rebaixo, anel de latão, chanfro
      sweep(B, [pt(0.1, z0 - 0.028, DEEP), pt(0.108, z0 - 0.066, BRASS, 0.5), pt(0.134, z0 - 0.066, EDGE, 1), pt(0.16, z0 - 0.04, SHELL), pt(0.16, z0 + 0.01, SHELL)], { seg: 20, cx, cy })
      // lente em domo: miolo quase branco → âmbar na borda
      sweep(G, [pt(0, z0 - 0.052, G_CORE), pt(0.038, z0 - 0.05, G_CORE), pt(0.074, z0 - 0.042, G_HOT), pt(0.1, z0 - 0.028, G_AMB)], { seg: 20, cx, cy, smooth: true })
      // grade de proteção em cruz
      pbox(B, a, 1.333, 1.347, 0.165, 0.165, z0 - 0.088, z0 - 0.066, STEEL, NAVY_DK)
      pbox(B, a, 1.175, 1.505, 0.007, 0.007, z0 - 0.088, z0 - 0.066, STEEL, NAVY_DK)
      for (const s of [-1, 1]) pbox(G, a, 1.6, 1.632, 0.02, 0.02, z0 - 0.01, z0, CYAN, CYAN, { uc: s * 0.09, back: false })
    } else {
      // respiro: fundo escuro, 4 rasgos acesos (quente no meio), 3 lâminas atravessadas
      pbox(B, a, 1.15, 1.55, 0.135, 0.15, z0 - 0.012, z0, DEEP, NAVY, { back: false })
      for (let j = 0; j < 4; j++) {
        const u = (j - 1.5) * 0.066, zz = z0 - 0.016
        const P = (r: number, du: number) => pp(a, r, u + du, zz)
        G.quad(P(1.18, -0.019), P(1.18, 0.019), P(1.35, 0.019), P(1.35, -0.019), [G_RED, G_RED, G_HOT, G_HOT])
        G.quad(P(1.35, -0.019), P(1.35, 0.019), P(1.52, 0.019), P(1.52, -0.019), [G_HOT, G_HOT, G_RED, G_RED])
      }
      for (const r of [1.265, 1.35, 1.435]) pbox(B, a, r - 0.007, r + 0.007, 0.138, 0.142, z0 - 0.04, z0 - 0.012, STEEL, NAVY_DK, { back: false })
      pbox(G, a, 1.6, 1.626, 0.06, 0.06, z0 - 0.01, z0, G_OR, G_OR, { back: false })
    }
  }

  // filete aceso na parede do vão
  sweep(G, [pt(1.003, 0.035, G_OR), pt(1.003, -0.035, G_OR)], { seg: 96 })

  return { body: B, glow: G }
}
