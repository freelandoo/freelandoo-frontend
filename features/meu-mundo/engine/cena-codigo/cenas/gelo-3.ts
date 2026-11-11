// MAR DE GELO · cena 3 (setores 8–10: bando no 8, guardião no 9, MARÚ no 10) — "mar afundado + castelo
// de Marú". Refs: ref/dominios/gelo-3.png e castelo-maru.png. Noite de AURORA (verde e violeta,
// desenhada pelo jogo). Marcos: o PALÁCIO DE GELO E PÉROLA no fim (cúpulas de concha cor-de-rosa,
// muralha perolada, conchas gigantes na frente, janelas ciano), os navios afundados no gelo, as
// ruínas de arcos de pedra e o caminho de gelo em placas.

import { noise, type RGB } from "../kit"
import { Cena, ground, scatter, type XZ } from "../kit-cena"
import { block, mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import { castelo, type CasteloEstilo } from "../castelo"
import * as G from "./tema-gelo"

export const meta = {
  ceu: [0.06, 0.1, 0.24] as RGB,
  nevoa: [0.14, 0.22, 0.4] as RGB,
  area: AREA,
  luz: { hemi: 1.05, sol: 0.45, ceu: [0.62, 0.8, 1] as RGB, chao: [0.3, 0.36, 0.55] as RGB, solCor: [0.7, 1, 0.85] as RGB },
  aurora: true,
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[52, -73], [50, -50], [24, -42], [-6, -48], [-34, -36], [-44, -14], [-22, -2], [0, 6], [0, 24], [0, 44], [0, 56]]

export const MARU: CasteloEstilo = {
  pedra: [0.9, 0.88, 0.94],
  pedraEsc: [0.66, 0.7, 0.84],
  quina: [1, 1, 1],
  telhado: [0.94, 0.72, 0.78],
  telhadoHi: [1, 0.88, 0.9],
  luz: [0.5, 0.96, 1],
  metal: [0.82, 0.9, 0.96],
  cobertura: "cupula",
  lados: 7,
  alto: 1.05,
}

export function montar(lod = 0): Cena {
  const c = new Cena("gelo-3", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 50, d: 40, patio: 18 } })
  const K = P.castelo!
  const A = castelo(c, K, MARU, lod)
  // conchas gigantes dos dois lados do portão
  for (const s of [-1, 1]) G.concha(c, K.porta.x + s * 9, K.porta.z - 4.5, 3, Math.PI, lod)
  for (const t of A.torres) G.cristalGelo(c, t[0] + 3.2, t[2] - 2, 2, t[0], lod)

  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || (Math.abs(x - K.x) < K.w / 2 + 5 && Math.abs(z - K.z) < K.d / 2 + 5)) return
    paredes.push(G.paredaoGelo(c, { x, z, rx: 7 + noise(x, 1, z) * 3, rz: 6 + noise(z, 2, x) * 3, h: 9 + noise(x * 0.3, 3, z * 0.3) * 10, seed: k + 60, lod }))
  })
  // navios afundados (proa para cima) e ruínas de arcos de pedra
  for (const [x, z, L, a] of [[-54, 30, 17, 0.9], [44, 8, 15, 2.4], [-58, -54, 14, 0.3], [30, -20, 13, -0.4]] as const) if (P.livre(x, z, L * 0.6)) G.navio(c, x, z, L, a, x + z + 3, lod)
  for (const t of [0.14, 0.38, 0.6]) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 9 * s, z = p.z - p.dx * 9 * s
      if (P.livre(x, z, 2)) ruina(c, x, z, p.ang, t * 31 + s, lod)
    }
  }
  G.fundoGelo(c, 11, [0.7, 0.78, 0.95])

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    let col = G.marGelo(x, z, noise)
    col = mix(col, G.NEVE_SOMBRA, smooth(0.55, 0.75, noise(x * 0.05, 9, z * 0.05)) * 0.6)
    if (inParede(x, z, 1.4)) col = mix(col, G.NEVE, 0.6)
    col = mix(col, G.GELO_CL, P.aberto(x, z) * 0.3)
    col = trilha(col, x, z, P, mix(G.GELO_CL, G.NEVE, 0.4), 2.3, G.GELO)
    return mul(col, 0.95 + 0.08 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mul(G.marGelo(x, z, noise), 0.8), fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z)
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4, 43, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (noise(x * 0.08, 2, z * 0.08) > 0.55 ? 0.4 : 0.05)) return
    G.coral(c, x, z, 1.2 + r(2) * 2.4, r(3) < 0.5 ? G.CORAL_R : G.CORAL_B, r(4) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4.6, 44, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (P.dWalk(x, z) < 6 ? 0.18 : 0.06)) return
    G.cristalGelo(c, x, z, 0.8 + r(2) * 1.6, r(3) * 99, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 45, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > 0.12) return
    G.rochaNeve(c, x, z, 0.8 + r(2) * 1.8, r(3) * 99)
  })
  return c
}

/** Ruína de arco de pedra clara (dois pilares e o arco quebrado), com caixa nos pilares. */
function ruina(c: Cena, x: number, z: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  const pedra = G.ROCHA
  for (const s of [-1, 1]) {
    const px = x + sx * 2.4 * s, pz = z + sz * 2.4 * s
    block(g, px, pz, -0.1, 5.2 - (s > 0 ? 1.2 : 0), 1.1, 1.1, { strata: pedra, seed: seed + s, rot: -ang, taper: 0.95, tilt: 0.03, top: G.NEVE })
    c.block(px, pz, 0.6, 0.6, 5)
  }
  if (!lod) {
    const n = 5
    for (let k = 0; k < n - 1; k++) {
      const t = k / (n - 1)
      const u = (t - 0.5) * 5.2
      const y = 4.6 + Math.sin(t * Math.PI) * 1.2
      block(g, x + sx * u, z + sz * u, y, y + 0.7, 1.4, 1, { strata: pedra, seed: seed + k * 3, rot: -ang + Math.PI / 2, taper: 1, tilt: 0.02, top: G.NEVE })
    }
  }
}
