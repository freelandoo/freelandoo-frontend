// MAR DE GELO · cena 1 (setores 1–3, chefe no 3) — "costa congelada, navios presos no gelo".
// Ref: ref/dominios/gelo-1.png (ficha em tema-gelo.ts). Marcos: o cemitério de navios no mar
// congelado (leste), a trilha de neve batida marcada por postes com corda e lanterna, os icebergs
// da borda e o navio quebrado de proa para cima perto da arena.

import { noise, type RGB, type V3 } from "../kit"
import { Cena, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as G from "./tema-gelo"

export const meta = {
  ceu: G.CEU,
  nevoa: G.NEVOA,
  area: AREA,
  luz: { hemi: 0.85, sol: 0.6, chao: [0.6, 0.66, 0.8] as RGB },
  astro: { dir: [0.6, 0.6, 0.8] as RGB, r: 0.05, cor: [1, 0.98, 0.9] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[-58, -73], [-54, -52], [-30, -46], [-6, -54], [20, -46], [40, -28], [34, -6], [8, -2], [-20, 6], [-44, 16], [-50, 38], [-34, 56], [-8, 58], [16, 52], [40, 60], [54, 73]]
const DESVIO: XZ[] = [[34, -6], [54, 2], [60, 16]]

export function montar(lod = 0): Cena {
  const c = new Cena("gelo-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, desvios: [DESVIO], setores: [1, 2, 3], boss: 3, tZonas: [0.22, 0.48], tArena: 0.8 })
  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  /** O mar congelado: longe da trilha, mais para o leste e o norte. */
  const mar = (x: number, z: number) => smooth(0.38, 0.55, noise(x * 0.025 + 1, 2.2, z * 0.025) + (x + z) * 0.002) * smooth(6, 12, P.dWalk(x, z))

  // ── navios no gelo (o marco), longe do caminho ──
  // ao lado do caminho (a 13–17 m), do lado do mar: aparecem de perto nas vistas
  for (const [t, s, L, da] of [[0.1, 1, 16, 0.6], [0.3, -1, 15, -0.4], [0.42, 1, 18, 0.9], [0.62, -1, 14, 1.4], [0.74, 1, 17, -0.7], [0.9, -1, 15, 0.3]] as const) {
    const p = P.at(t)
    const x = p.x + p.dz * 16 * s, z = p.z - p.dx * 16 * s
    if (P.livre(x, z, L * 0.45)) G.navio(c, x, z, L, p.ang + da, t * 100, lod)
  }
  // ── borda: paredões de gelo e rochas nevadas ──
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15) return
    if (k % 3) paredes.push(G.paredaoGelo(c, { x, z, rx: 7 + noise(x, 1, z) * 4, rz: 6 + noise(z, 2, x) * 3, h: 7 + noise(x * 0.3, 3, z * 0.3) * 9, seed: k, lod }))
    else G.rochaNeve(c, x, z, 3 + noise(x, 4, z) * 2, k)
  })
  G.fundoGelo(c, 2)

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    let col = mix(G.NEVE, G.NEVE_SOMBRA, smooth(0.5, 0.8, noise(x * 0.08, 0.7, z * 0.08)) * 0.6)
    col = mix(col, G.marGelo(x, z, noise), mar(x, z))
    col = mix(col, G.NEVE_SOMBRA, P.aberto(x, z) * 0.3)
    col = trilha(col, x, z, P, mix(G.NEVE_SOMBRA, [0.7, 0.66, 0.66], 0.4), 2.1, G.NEVE_SOMBRA)
    return mul(col, 0.95 + 0.08 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => G.marGelo(x, z, noise), fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z)
  // postes com corda dos dois lados da trilha (o "perto" de toda vista)
  let last: [V3 | null, V3 | null] = [null, null]
  for (let t = 0.02; t < 0.98; t += 0.022) {
    const p = P.at(t)
    ;[-1, 1].forEach((s, i) => {
      const x = p.x + p.dz * 3.4 * s, z = p.z - p.dx * 3.4 * s
      if (!ok(x, z, -2.3)) {
        last[i] = null
        return
      }
      const top = G.poste(c, x, z, lod)
      const prev = last[i]
      if (prev && !lod && Math.hypot(prev[0] - top[0], prev[2] - top[2]) < 9) G.corda(c, prev, top)
      last[i] = top
    })
  }
  last = [null, null]
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 31, (x, z, r) => {
    if (!ok(x, z, 0.4)) return
    const near = P.dWalk(x, z) < 8
    if (r(1) > (near ? 0.5 : 0.12)) return
    G.rochaNeve(c, x, z, 0.8 + r(2) * (near ? 1.6 : 2.2), r(3) * 99)
  })
  // blocos de gelo (floes) no mar e cristais
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 32, (x, z, r) => {
    if (!ok(x, z, 0.5) || mar(x, z) < 0.5 || r(1) > 0.22) return
    G.paredaoGelo(c, { x, z, rx: 1.4 + r(2) * 2, rz: 1.2 + r(3) * 1.6, h: 0.6 + r(4) * 1.6, seed: r(5) * 99, lod })
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 5, 33, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (P.dWalk(x, z) < 7 ? 0.4 : 0.08)) return
    G.cristalGelo(c, x, z, 0.7 + r(2) * 1.4, r(3) * 99, lod)
  })
  return c
}
