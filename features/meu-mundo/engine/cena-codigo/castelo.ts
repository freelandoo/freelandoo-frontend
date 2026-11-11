// features/meu-mundo/engine/cena-codigo/castelo.ts — o CASTELO do deus (cena 3 de cada Domínio).
//
// Skill `meu-mundo-cenario-codigo` (`pecas.md` §7: peça de pé). Um construtor só, com o ESTILO de
// cada deus (pedra, telhado, janelas acesas, metal, forma das coberturas) e os enfeites próprios
// por cima (lua de Noctis, asas de Zéphyra, conchas de Marú, águia de Aeryn, chifres de Kragor,
// cristais de Íris) feitos no arquivo da cena com as âncoras que esta função devolve.
//
// Contrato de jogo (dominio.ts): a frente olha para −z; o portão é um vão de 5 m no meio da
// muralha da frente; atrás dele, o PÁTIO-SALÃO aberto para o céu (chão plano, onde o deus espera);
// no fundo do pátio, a torre de menagem com o arco aceso da travessia (a `saida`). Toda parede tem
// caixa de colisão; o vão e o pátio ficam livres.

import { type RGB, type V3 } from "./kit"
import type { Cena } from "./kit-cena"
import { caixa } from "./kit-cidade"
import { face, mix, mul, tube } from "./kit-natureza"
import type { CasteloPlanta } from "./dominio"

export interface CasteloEstilo {
  pedra: RGB
  pedraEsc: RGB
  /** Quina/cornija clara. */
  quina: RGB
  telhado: RGB
  telhadoHi: RGB
  /** Luz das janelas e do portão (vai no `glow`). */
  luz: RGB
  /** Metal/ouro dos remates. */
  metal: RGB
  bandeira?: RGB
  /** Forma da cobertura das torres. */
  cobertura: "cone" | "cupula" | "ameia"
  /** Lados das torres (5–8). */
  lados?: number
  /** Escala da altura (1 = muralha 7 m, torres 12–15 m, menagem 20 m). */
  alto?: number
}

export interface CasteloAncoras {
  /** Topo da menagem (centro) e altura dela. */
  menagem: V3
  /** Topo de cada torre (sem a cobertura). */
  torres: V3[]
  /** Centro do arco da travessia (no fundo do pátio). */
  arco: V3
  /** Meia-largura e altura da frente da menagem. */
  menagemW: number
  menagemH: number
}

/** Torre redonda facetada com cobertura. Devolve o topo do corpo. */
export function torre(c: Cena, x: number, z: number, r: number, h: number, e: CasteloEstilo, lod: number, salt = 0): V3 {
  const g = c.geo(x, z)
  const n = lod ? 5 : (e.lados ?? 7)
  tube(g, [x, 0, z], [x, h, z], r * 1.08, r, n, (k) => (k % 2 ? e.pedra : mix(e.pedra, e.pedraEsc, 0.35)), false)
  // cornija clara no alto
  tube(g, [x, h - 0.5, z], [x, h + 0.1, z], r * 1.16, r * 1.18, n, () => e.quina, false)
  if (e.cobertura === "cone") tube(g, [x, h + 0.1, z], [x, h + r * 2.6, z], r * 1.22, 0.04, n, (k) => (k % 2 ? e.telhado : e.telhadoHi), true)
  else if (e.cobertura === "cupula") {
    tube(g, [x, h + 0.1, z], [x, h + r * 0.7, z], r * 1.15, r * 0.85, n, (k) => (k % 2 ? e.telhado : e.telhadoHi), false)
    tube(g, [x, h + r * 0.7, z], [x, h + r * 1.5, z], r * 0.85, 0.05, n, (k) => (k % 2 ? e.telhado : e.telhadoHi), true)
  } else if (!lod)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      caixa(g, { x: x + Math.cos(a) * r * 0.95, z: z + Math.sin(a) * r * 0.95, y0: h + 0.1, y1: h + 1, w: 0.7, d: 0.7, rot: -a, side: e.pedraEsc, top: e.quina })
    }
  // janelas acesas (duas, em alturas diferentes, viradas para fora do centro)
  if (!lod) {
    const G = c.glow(x, z)
    for (const [yy, a] of [[h * 0.45, salt], [h * 0.75, salt + 2.1]] as const) {
      const dx = Math.sin(a), dz = -Math.cos(a)
      const px = x + dx * (r + 0.06), pz = z + dz * (r + 0.06)
      const sx = Math.cos(a) * 0.35, sz = Math.sin(a) * 0.35
      face(G, [[px - sx, yy, pz - sz], [px + sx, yy, pz + sz], [px + sx, yy + 1.2, pz + sz], [px - sx, yy + 1.2, pz - sz]], e.luz, [dx, 0, dz])
    }
  }
  c.block(x, z, r * 0.95, r * 0.95, h)
  return [x, h, z]
}

/** Muralha reta com ameias (lod 0) e caixa de colisão. */
function muralha(c: Cena, x0: number, z0: number, x1: number, z1: number, h: number, esp: number, e: CasteloEstilo, lod: number) {
  const L = Math.hypot(x1 - x0, z1 - z0)
  if (L < 0.5) return
  const rot = Math.atan2(z1 - z0, x1 - x0)
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  // um pedaço por bloco de 32 m (o pé de cada pedaço decide o bloco)
  const n = Math.max(1, Math.ceil(L / 16))
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n
    const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1
    const mx = (ax + bx) / 2, mz = (az + bz) / 2
    const g = c.geo(mx, mz)
    caixa(g, { x: mx, z: mz, y0: 0, y1: h * 0.18, w: L / n + 0.02, d: esp + 0.5, rot: -rot, side: e.pedraEsc, top: e.pedraEsc })
    caixa(g, { x: mx, z: mz, y0: h * 0.18, y1: h, w: L / n, d: esp, rot: -rot, side: e.pedra, top: mul(e.pedra, 1.12) })
    caixa(g, { x: mx, z: mz, y0: h - 0.25, y1: h + 0.05, w: L / n + 0.1, d: esp + 0.3, rot: -rot, side: e.quina, top: e.quina })
    if (!lod) {
      const m = Math.max(2, Math.round(L / n / 1.6))
      for (let k = 0; k < m; k++) {
        const t = (k + 0.5) / m
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t
        for (const s of [-1, 1]) {
          const ox = -Math.sin(rot) * (esp / 2 - 0.25) * s, oz = Math.cos(rot) * (esp / 2 - 0.25) * s
          caixa(g, { x: px + ox, z: pz + oz, y0: h, y1: h + 0.8, w: 0.75, d: 0.45, rot: -rot, side: e.pedra, top: e.quina })
        }
      }
    }
  }
  c.block(cx, cz, L / 2, esp / 2, h, -rot)
}

/**
 * O castelo inteiro sobre a pegada `P` da planta. Devolve as âncoras para os enfeites do deus.
 */
export function castelo(c: Cena, P: CasteloPlanta, e: CasteloEstilo, lod: number): CasteloAncoras {
  const k = e.alto ?? 1
  const hW = 7 * k
  const { patio } = P
  const zF = P.porta.z
  const xL = patio.x0 - 1.5, xR = patio.x1 + 1.5
  const gate = 2.6
  // muralha da frente com o vão do portão
  muralha(c, xL, zF, P.porta.x - gate, zF, hW, 3, e, lod)
  muralha(c, P.porta.x + gate, zF, xR, zF, hW, 3, e, lod)
  // laterais do pátio
  muralha(c, xL, zF, xL, patio.z1 + 1, hW, 3, e, lod)
  muralha(c, xR, zF, xR, patio.z1 + 1, hW, 3, e, lod)
  // o arco do portão: dois pilares altos e a verga (sem colisão em cima: o vão é livre)
  {
    const g = c.geo(P.porta.x, zF - 2)
    for (const s of [-1, 1]) caixa(g, { x: P.porta.x + s * (gate + 0.6), z: zF - 0.2, y0: 0, y1: hW + 2.2, w: 1.4, d: 3.8, side: mix(e.pedra, e.quina, 0.25), top: e.quina })
    caixa(g, { x: P.porta.x, z: zF - 0.2, y0: hW - 0.6, y1: hW + 1.6, w: gate * 2 + 2.6, d: 3.6, side: e.pedra, top: e.quina })
    caixa(g, { x: P.porta.x, z: zF - 2.05, y0: hW + 1.6, y1: hW + 2.6, w: gate * 1.2, d: 0.3, side: e.metal })
    if (!lod) {
      const G = c.glow(P.porta.x, zF - 2)
      // moldura acesa do vão (por dentro do arco, virada para quem chega)
      face(G, [[P.porta.x - gate, hW - 0.65, zF - 2.12], [P.porta.x + gate, hW - 0.65, zF - 2.12], [P.porta.x + gate, hW - 0.35, zF - 2.12], [P.porta.x - gate, hW - 0.35, zF - 2.12]], e.luz, [0, 0, -1])
      for (const s of [-1, 1]) face(G, [[P.porta.x + s * gate, 0.2, zF - 2.12], [P.porta.x + s * (gate - 0.25), 0.2, zF - 2.12], [P.porta.x + s * (gate - 0.25), hW - 0.6, zF - 2.12], [P.porta.x + s * gate, hW - 0.6, zF - 2.12]], e.luz, [0, 0, -1])
    }
  }
  // torres: dois pares na frente (a do canto e a ala), um par no fundo
  const torres: V3[] = []
  const rT = 2.6
  torres.push(torre(c, xL - 0.5, zF - 0.5, rT, 12 * k, e, lod, 0.3))
  torres.push(torre(c, xR + 0.5, zF - 0.5, rT, 12 * k, e, lod, -0.3))
  const wing = Math.max(P.w / 2 - 3, (xR - xL) / 2 + 6)
  for (const s of [-1, 1]) {
    torres.push(torre(c, P.porta.x + s * wing, zF + 2, rT * 0.85, 9.5 * k, e, lod, s))
    muralha(c, P.porta.x + s * ((xR - xL) / 2 + 2.6), zF + 1.2, P.porta.x + s * (wing - 1.6), zF + 1.6, hW * 0.75, 2.2, e, lod)
  }
  // torre de menagem no fundo (a frente dela fecha o pátio; o arco aceso é a travessia)
  const kw = (xR - xL) / 2 + 1.5
  const kz0 = patio.z1 + 1, kz1 = P.z + P.d / 2 - 1
  const kH = 20 * k
  {
    const g = c.geo(P.porta.x, (kz0 + kz1) / 2)
    caixa(g, { x: P.porta.x, z: (kz0 + kz1) / 2, y0: 0, y1: kH * 0.55, w: kw * 2, d: kz1 - kz0, side: e.pedra, top: e.quina })
    caixa(g, { x: P.porta.x, z: (kz0 + kz1) / 2, y0: kH * 0.55 - 0.3, y1: kH * 0.55 + 0.2, w: kw * 2 + 0.4, d: kz1 - kz0 + 0.4, side: e.quina, top: e.quina })
    caixa(g, { x: P.porta.x, z: (kz0 + kz1) / 2 + 0.5, y0: kH * 0.55, y1: kH, w: kw * 1.2, d: (kz1 - kz0) * 0.7, side: mix(e.pedra, e.pedraEsc, 0.2), top: e.quina })
    c.block(P.porta.x, (kz0 + kz1) / 2, kw, (kz1 - kz0) / 2, kH)
    // arco da travessia no meio da frente da menagem (aceso), com pilastras
    const G = c.glow(P.porta.x, (kz0 + kz1) / 2)
    const zf = kz0 - 0.08
    face(G, [[P.porta.x - 2, 0.15, zf], [P.porta.x + 2, 0.15, zf], [P.porta.x + 2, 5.2, zf], [P.porta.x - 2, 5.2, zf]], mul(e.luz, 0.85), [0, 0, -1])
    face(G, [[P.porta.x - 1.2, 5.2, zf], [P.porta.x + 1.2, 5.2, zf], [P.porta.x, 6.4, zf]], e.luz, [0, 0, -1])
    for (const s of [-1, 1]) caixa(g, { x: P.porta.x + s * 2.6, z: kz0 - 0.4, y0: 0, y1: 7, w: 0.9, d: 0.9, side: e.quina, top: e.metal })
    // janelas altas da menagem
    if (!lod)
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue
        const x = P.porta.x + i * kw * 0.36
        face(G, [[x - 0.45, kH * 0.3, zf], [x + 0.45, kH * 0.3, zf], [x + 0.45, kH * 0.3 + 2.4, zf], [x, kH * 0.3 + 2.9, zf], [x - 0.45, kH * 0.3 + 2.4, zf]], e.luz, [0, 0, -1])
      }
  }
  for (const s of [-1, 1]) torres.push(torre(c, P.porta.x + s * (kw + 0.6), kz0 + 1.5, rT * 1.05, 15 * k, e, lod, s * 2))
  // bandeiras na muralha da frente (lod 0)
  if (!lod && e.bandeira) {
    const g = c.geo(P.porta.x, zF - 2)
    for (const s of [-1, 1]) {
      const x = P.porta.x + s * (gate + 3.2)
      face(g, [[x - 0.7, hW - 0.4, zF - 1.62], [x + 0.7, hW - 0.4, zF - 1.62], [x + 0.7, hW - 4.2, zF - 1.62], [x, hW - 4.9, zF - 1.62], [x - 0.7, hW - 4.2, zF - 1.62]], e.bandeira, [0, 0, -1])
      face(g, [[x - 0.2, hW - 1.6, zF - 1.6], [x + 0.2, hW - 1.6, zF - 1.6], [x + 0.2, hW - 2.5, zF - 1.6], [x - 0.2, hW - 2.5, zF - 1.6]], e.metal, [0, 0, -1])
    }
  }
  return { menagem: [P.porta.x, kH, (kz0 + kz1) / 2 + 0.5], torres, arco: [P.porta.x, 3, kz0], menagemW: kw, menagemH: kH }
}
