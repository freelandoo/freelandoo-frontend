// MAR DE GELO · cena 1 (setores 1–3, chefe no 3) — "costa congelada, navios presos no gelo".
// Ref: ref/dominios/gelo-1.png (ficha em tema-gelo.ts; peças copiadas em pecas/gelo.ts). Marcos: o
// cemitério de GALEÕES no mar congelado (placas, icebergs, cristais), a trilha de neve batida com a CERCA
// de mourões e corda (lanterna a cada 3) do lado do mar, os POSTES COM BANDEIRA e as TORRES DE VIGIA do
// lado da terra, os penhascos com pingentes e, no horizonte, montanhas de gelo e o AQUEDUTO em ruína.

import { noise, type RGB, type V3 } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as G from "./tema-gelo"

export const meta = {
  ceu: G.CEU,
  nevoa: G.NEVOA,
  area: AREA,
  luz: { hemi: 0.85, sol: 0.6, chao: [0.6, 0.66, 0.8] as RGB },
  triBloco: G.TRI_BLOCO,
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
  /** O lado do mar de cada ponto do caminho (+1 / −1): para onde o mar está mais perto. */
  const ladoMar = (t: number) => {
    const p = P.at(t)
    let a = 0, b = 0
    for (const d of [8, 14, 20]) { a += mar(p.x + p.dz * d, p.z - p.dx * d); b += mar(p.x - p.dz * d, p.z + p.dx * d) }
    return a >= b ? 1 : -1
  }

  // ── GALEÕES presos no gelo (o marco), do lado do mar, a 16–20 m do caminho ──
  for (const [t, L, da, dd] of [[0.1, 22, 0.6, 17], [0.3, 19, -0.4, 16], [0.42, 25, 0.9, 20], [0.62, 18, 1.4, 16], [0.74, 23, -0.7, 19], [0.9, 20, 0.3, 17]] as const) {
    const p = P.at(t), s = ladoMar(t)
    const x = p.x + p.dz * dd * s, z = p.z - p.dx * dd * s
    if (P.livre(x, z, L * 0.45) && Math.abs(x) < 72 && Math.abs(z) < 72) G.navio(c, x, z, p.ang + da, L, { seed: Math.round(t * 100), adorna: 0.12 + ((t * 7) % 0.14), empina: 0.08 + ((t * 5) % 0.1), quebrado: t > 0.6 && t < 0.65 }, lod)
  }
  // ── borda: penhascos com pingentes, icebergs no mar e rochas nevadas ──
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15) return
    if (mar(x, z) > 0.6) G.iceberg(c, x, z, 5 + noise(x, 2, z) * 4, k, lod)
    else if (k % 3) paredes.push(G.penhasco(c, { x, z, rx: 7 + noise(x, 1, z) * 4, rz: 6 + noise(z, 2, x) * 3, h: 8 + noise(x * 0.3, 3, z * 0.3) * 8, seed: k, lod }))
    else G.rochaNeve(c, x, z, 2.6 + noise(x, 4, z) * 1.6, k, lod)
  })
  G.horizonteGelo(c, { seed: 2, nevoa: G.NEVOA, aqueduto: { x: -60, z: 165, ang: 0.15 } })

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    let col = mix(G.NEVE, G.NEVE_SOMBRA, smooth(0.5, 0.8, noise(x * 0.08, 0.7, z * 0.08)) * 0.6)
    col = mix(col, G.marGelo(x, z), mar(x, z))
    col = mix(col, G.NEVE_SOMBRA, P.aberto(x, z) * 0.25)
    // trilha de neve batida (lilás claro com placas mais escuras, como a ref)
    const laje: RGB = noise(Math.floor(x / 2.2), 3.1, Math.floor(z / 2.2)) > 0.62 ? [0.82, 0.84, 0.97] : [0.94, 0.95, 1]
    col = trilha(col, x, z, P, laje, 2.1, G.NEVE_SOMBRA)
    return mul(col, 0.96 + 0.06 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => G.marGelo(x, z), fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z) && !blocked(c, x, z, pad + 0.4)
  // ── a CERCA de mourões e corda do lado do mar (lanterna a cada 3) ──
  let last: V3 | null = null
  let k = 0
  for (let t = 0.012; t < 0.988; t += 0.0075) {
    const p = P.at(t), s = ladoMar(t)
    const x = p.x + p.dz * 3.5 * s, z = p.z - p.dx * 3.5 * s
    if (!ok(x, z, -2.4)) {
      last = null
      continue
    }
    k++
    const topo = G.mourao(c, x, z, k % 3 === 0 ? 1.6 : 1.2, p.ang, k % 3 === 0, lod, k)
    if (last && Math.hypot(last[0] - topo[0], last[2] - topo[2]) < 5.5) G.corda(c, last, topo, lod)
    last = topo
  }
  // ── do lado da terra: POSTES COM BANDEIRA (o braço para o caminho) ──
  for (let t = 0.05; t < 0.95; t += 0.085) {
    const p = P.at(t), s = -ladoMar(t)
    const x = p.x + p.dz * 4.2 * s, z = p.z - p.dx * 4.2 * s
    if (ok(x, z, -1.6)) G.posteBandeira(c, x, z, Math.atan2(p.x - x, p.z - z) + (Math.PI / 2) * s, lod)
  }
  // ── TORRES DE VIGIA do lado da terra, a ~11 m ──
  for (const t of [0.16, 0.52, 0.86]) {
    const p = P.at(t), s = -ladoMar(t)
    const x = p.x + p.dz * 11 * s, z = p.z - p.dx * 11 * s
    if (ok(x, z, 2)) G.torreVigia(c, x, z, Math.atan2(p.x - x, p.z - z), lod)
  }
  // ── o MAR: placas de gelo, icebergs e cristais grandes ──
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 32, (x, z, r) => {
    if (!ok(x, z, 0.5) || mar(x, z) < 0.5 || r(1) > 0.3) return
    if (r(2) < 0.55) G.placaGelo(c, x, z, 2.4 + r(3) * 3, r(4) * 99, lod, 0.35 + r(5) * 0.3)
    else if (r(2) < 0.8) G.iceberg(c, x, z, 2.5 + r(3) * 3, r(4) * 99, lod)
    else G.cristalGelo(c, x, z, 1.8 + r(3) * 1.6, r(4) * 99, lod)
  })
  // ── a beira da trilha: rochas nevadas, capim congelado e cristais (o "perto" de toda vista) ──
  scatter(-H + 4, -H + 4, H - 4, H - 4, 5, 31, (x, z, r) => {
    if (!ok(x, z, 0.4) || mar(x, z) > 0.6) return
    const near = P.dWalk(x, z) < 9
    if (r(1) > (near ? 0.55 : 0.14)) return
    G.rochaNeve(c, x, z, 0.8 + r(2) * (near ? 1.4 : 2.2), r(3) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.2, 33, (x, z, r) => {
    if (!ok(x, z, 0.1)) return
    const near = P.dWalk(x, z) < 7
    if (r(1) < (near ? 0.28 : 0.06)) G.capimGelo(c, x, z, 0.6 + r(2) * 0.5, r(3) * 99, lod)
    else if (r(1) < (near ? 0.38 : 0.09)) G.cristalGelo(c, x, z, 0.8 + r(2) * 1.2, r(3) * 99, lod)
  })
  return c
}
