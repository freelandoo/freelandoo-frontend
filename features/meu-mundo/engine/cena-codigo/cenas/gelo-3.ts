// MAR DE GELO · cena 3 (setores 8–10: bando no 8, guardião no 9, MARÚ no 10) — "mar afundado + palácio
// de Marú". Refs: ref/dominios/gelo-3.png e castelo-maru.png. Noite de AURORA (verde e violeta, desenhada
// pelo jogo). Marcos: o PALÁCIO DE PÉROLA copiado (pecas/castelo-maru.ts: cúpula de concha, torres de gomos,
// conchas de pé, ilha de rocha lilás com lagos acesos), o caminho de PLACAS de gelo com fendas ciano
// acesas entre placas maiores do mar, os GALEÕES afundados e adernados, os ARCOS de ruína com concha e os
// corais rosa com neve.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import { casteloMaru } from "../pecas/castelo-maru"
import * as G from "./tema-gelo"

export const meta = {
  ceu: [0.06, 0.1, 0.24] as RGB,
  nevoa: [0.14, 0.22, 0.4] as RGB,
  area: AREA,
  luz: { hemi: 1.1, sol: 0.45, ceu: [0.72, 0.84, 1] as RGB, chao: [0.34, 0.4, 0.6] as RGB, solCor: [0.78, 1, 0.9] as RGB },
  triBloco: G.TRI_BLOCO,
  aurora: true,
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[52, -73], [50, -50], [24, -42], [-6, -48], [-34, -36], [-44, -14], [-22, -2], [0, 6], [0, 24], [0, 44], [0, 56]]

export function montar(lod = 0): Cena {
  const c = new Cena("gelo-3", lod, 32, -16)
  // pegada do PALÁCIO copiado: 64 m com as torres pequenas e a ilha; pátio 18 (o salão do deus)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 64, d: 40, patio: 18 } })
  const K = P.castelo!
  casteloMaru(c, K, lod)
  const noCastelo = (x: number, z: number, pad = 5) => Math.abs(x - K.x) < K.w / 2 + pad && z > K.z - K.d / 2 - pad - 4 && z < K.z + K.d / 2 + pad
  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || noCastelo(x, z)) return
    if (k % 2) G.iceberg(c, x, z, 6 + noise(x, 2, z) * 5, k + 60, lod)
    else paredes.push(G.penhasco(c, { x, z, rx: 7 + noise(x, 1, z) * 3, rz: 6 + noise(z, 2, x) * 3, h: 9 + noise(x * 0.3, 3, z * 0.3) * 8, seed: k + 60, lod }))
  })
  // GALEÕES afundados (proa para cima, adernados) e ARCOS de ruína ao longo do caminho
  for (const [x, z, L, a, ad] of [[-56, 32, 22, 0.9, 0.3], [46, 6, 18, 2.4, -0.28], [-60, -56, 17, 0.3, 0.25], [32, -22, 15, -0.4, 0.35], [-30, 24, 14, 2, -0.3]] as const)
    if (P.livre(x, z, L * 0.5) && !noCastelo(x, z, 8)) G.navio(c, x, z, a, L, { seed: Math.round(x + z), adorna: ad, empina: 0.22, afunda: 2.6, quebrado: L < 16 }, lod)
  for (const [t, s, quebrado] of [[0.12, 1, false], [0.22, -1, true], [0.38, 1, true], [0.5, -1, false], [0.62, 1, false], [0.66, -1, true]] as const) {
    const p = P.at(t)
    const x = p.x + p.dz * 8 * s, z = p.z - p.dx * 8 * s
    if (P.livre(x, z, 2.6) && !noCastelo(x, z, 2)) G.ruinaArco(c, x, z, p.ang + Math.PI / 2, { quebrado, concha: !quebrado, seed: Math.round(t * 40) }, lod)
  }
  G.horizonteGelo(c, { seed: 11, nevoa: meta.nevoa, noite: true, bruma: 0.5, vao: Math.PI / 2 })

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    // o mar congelado é o chão (aceso nas fendas), com neve em manchas
    let col = G.marGelo(x, z)
    col = mix(col, G.NEVE_SOMBRA, smooth(0.66, 0.8, noise(x * 0.05, 9, z * 0.05)) * 0.6)
    if (inParede(x, z, 1.4)) col = mix(col, G.NEVE, 0.6)
    col = mix(col, G.GELO_CL, P.aberto(x, z) * 0.2)
    // o caminho: fendas ACESAS ciano (as placas vão por cima)
    col = trilha(col, x, z, P, [0.3, 0.95, 1], 2.4, [0.2, 0.8, 0.98])
    return mul(col, 0.96 + 0.06 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mul(G.marGelo(x, z), 0.8), fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  // as PLACAS do caminho (largas: a ref tem placas de 5–7 m) e as placas maiores do mar dos dois lados
  G.placasCaminho(c, -H, -H, H, H, 5.2, 61, (x, z) => (P.dWalk(x, z) < 4.4 || P.aberto(x, z) > 0.6) && !noCastelo(x, z, -1), lod)

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z) && !blocked(c, x, z, pad + 0.4) && !noCastelo(x, z, 1)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6.5, 46, (x, z, r) => {
    if (!ok(x, z, 0.6) || r(1) > (P.dWalk(x, z) < 12 ? 0.42 : 0.22)) return
    G.placaGelo(c, x, z, 2.6 + r(2) * 2.6, r(3) * 99, lod, 0.4 + r(4) * 0.35)
  })
  // corais rosa com neve na ponta, cristais e pedestais quebrados
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4, 43, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (noise(x * 0.08, 2, z * 0.08) > 0.55 ? 0.4 : 0.05)) return
    if (r(3) < 0.65) G.coral(c, x, z, 1.6 + r(2) * 1.6, G.CORAL_R, G.CORAL_R_ESC, r(4) * 99, lod, "cand", true)
    else G.coral(c, x, z, 2 + r(2) * 2, G.CORAL_B, G.CORAL_B_ESC, r(4) * 99, lod, "y", true)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4.6, 44, (x, z, r) => {
    if (!ok(x, z, 0.2)) return
    if (r(1) < (P.dWalk(x, z) < 7 ? 0.16 : 0.06)) G.cristalGelo(c, x, z, 1.2 + r(2) * 1.8, r(3) * 99, lod)
    else if (r(1) < (P.dWalk(x, z) < 7 ? 0.2 : 0.07)) G.pedestal(c, x, z, 0.8 + r(2) * 0.4, r(3) * 6, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 45, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > 0.14) return
    G.rochaNeve(c, x, z, 0.9 + r(2) * 1.8, r(3) * 99, lod)
  })
  return c
}
