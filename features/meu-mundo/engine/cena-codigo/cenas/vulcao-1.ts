// VULCÃO DE KRAGOR · cena 1 (setores 1–3, chefe no 3) — "minas". Ref: ref/dominios/vulcao-1.png.
// Marcos: as bocas de mina com escoras de madeira nos paredões de basalto, os trilhos com vagonetes
// de minério aceso, cristais laranja, cerca de madeira na beira do caminho e o vulcão em erupção ao
// fundo (norte), sempre à vista.

import { noise, type RGB } from "../kit"
import { Cena, blocked, distPath, ground, scatter, type XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as V from "./tema-vulcao"
import { caixote, lampiao } from "./tema-fabrica"

export const meta = {
  ceu: V.CEU,
  nevoa: V.NEVOA,
  area: AREA,
  luz: V.LUZ,
  astro: { dir: [-0.6, 0.12, 1] as RGB, r: 0.06, cor: [1, 0.7, 0.4] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[-56, -73], [-52, -48], [-24, -42], [6, -50], [36, -38], [48, -14], [28, -2], [-4, -6], [-36, 4], [-50, 28], [-36, 50], [-8, 54], [22, 48], [46, 58], [56, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("vulcao-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [1, 2, 3], boss: 3, tZonas: [0.24, 0.5], tArena: 0.8 })
  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  // bocas de mina viradas para o caminho (a 9 m dele)
  for (const [t, s] of [[0.1, 1], [0.34, -1], [0.6, 1], [0.7, -1], [0.92, 1]] as const) {
    const p = P.at(t)
    const x = p.x + p.dz * 9 * s, z = p.z - p.dx * 9 * s
    if (P.livre(x, z, 4)) {
      V.bocaMina(c, x, z, Math.atan2(p.x - x, p.z - z), lod)
      P.reserva(x, z, 6)
    }
  }
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15) return
    if (k % 3) paredes.push(V.paredao(c, { x, z, rx: 7 + noise(x, 1, z) * 4, rz: 6 + noise(z, 2, x) * 3, h: 9 + noise(x * 0.3, 3, z * 0.3) * 10, seed: k, lod }))
    else V.colunas(c, x, z, 3, 8, k, lod)
  })
  V.fundoVulcao(c, 4)

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    let col = mix(V.PEDRA, V.PEDRA_ESC, smooth(0.4, 0.75, noise(x * 0.08, 1.2, z * 0.08)))
    col = mix(col, mix(V.PEDRA, V.LAVA_ESC, 0.25), smooth(0.7, 0.85, noise(x * 0.15, 4, z * 0.15)) * 0.5)
    if (inParede(x, z, 1.3)) col = mix(col, V.BASALTO, 0.6)
    col = mix(col, V.PEDRA_CL, P.aberto(x, z) * 0.3)
    // caminho de lajes cinza-claras
    const gx = ((x % 1.8) + 1.8) % 1.8, gz = ((z % 1.8) + 1.8) % 1.8
    const j = Math.min(gx, 1.8 - gx, gz, 1.8 - gz)
    const laje = mix(V.PEDRA_ESC, mix(V.PEDRA_CL, [0.58, 0.54, 0.54], noise(Math.floor(x / 1.8), 2, Math.floor(z / 1.8))), smooth(0.03, 0.1, j))
    col = trilha(col, x, z, P, laje, 2.2, V.PEDRA_ESC)
    return mul(col, 0.95 + 0.1 * noise(x * 0.9, 2.2, z * 0.9))
  }
  const LAVA: XZ[] = [[74, -76], [70, -40], [74, -6], [69, 30], [74, 70]]
  const height = (x: number, z: number) => -0.5 * smooth(5, 2.5, distPath(x, z, LAVA))
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => V.PEDRA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  // rio de lava distante, na borda leste (atrás de um parapeito de pedra)
  V.rioLava(c, LAVA, 6)

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z) && !blocked(c, x, z, pad + 0.6) && x < 64
  // cerca de madeira e lanternas na beira do caminho
  for (let t = 0.03; t < 0.97; t += 0.035) {
    const p = P.at(t)
    const s = Math.round(t * 57) % 2 ? 1 : -1
    const x = p.x + p.dz * 3.6 * s, z = p.z - p.dx * 3.6 * s
    if (!ok(x, z, -2)) continue
    if (Math.round(t * 100) % 3 === 0) lampiao(c, x, z, 2.6, lod)
    else {
      const g = c.geo(x, z)
      caixa(g, { x, z, y0: 0, y1: 1.2, w: 0.25, d: 0.25, side: V.MADEIRA, top: V.MADEIRA_ESC })
      caixa(g, { x, z, y0: 0.8, y1: 1, w: 2.4, d: 0.14, rot: -Math.atan2(p.dx, p.dz) + Math.PI / 2, side: V.MADEIRA, top: V.MADEIRA })
      c.block(x, z, 0.2, 0.2, 1.2)
    }
  }
  // vagonetes, caixotes e cristais
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 31, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > (P.dWalk(x, z) < 8 ? 0.5 : 0.1)) return
    if (r(2) < 0.35) V.vagonete(c, x, z, r(3) * 3, lod)
    else if (r(2) < 0.6) caixote(c, x, z, 1.2, r(3) * 3)
    else V.pedraEsc(c, x, z, 0.8 + r(4) * 1.6, r(5) * 99)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4.6, 32, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (inParede(x, z, 1.45) ? 0.45 : P.dWalk(x, z) < 6 ? 0.12 : 0.03)) return
    V.cristalFogo(c, x, z, 0.7 + r(2) * 1.2, r(3) * 99, lod)
  })
  scatter(-H + 8, -H + 8, H - 8, H - 8, 9, 33, (x, z, r) => {
    if (!ok(x, z, 4) || r(1) > 0.4) return
    V.colunas(c, x, z, 2.2, 5 + r(2) * 3, r(3) * 99, lod)
  })
  return c
}
