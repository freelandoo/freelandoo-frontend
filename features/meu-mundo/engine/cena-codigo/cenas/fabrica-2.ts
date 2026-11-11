// FÁBRICA DE BRONZE · cena 2 (setores 4–7, chefe no 7) — "engrenagens gigantes e chaminés", de dia.
// Ref: ref/dominios/fabrica-2.png. Marcos: as ENGRENAGENS GIGANTES nas fachadas, os fornos acesos na
// beira do caminho, as passarelas de ferro no alto atravessando a rua e as chaminés fumegando.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import * as F from "./tema-fabrica"

export const meta = {
  ceu: [0.5, 0.7, 0.94] as RGB,
  nevoa: [0.74, 0.78, 0.86] as RGB,
  area: AREA,
  luz: { hemi: 0.85, sol: 0.6, chao: [0.5, 0.44, 0.46] as RGB, solCor: [1, 0.94, 0.85] as RGB },
  astro: { dir: [0.4, 0.8, 0.5] as RGB, r: 0.05, cor: [1, 0.98, 0.9] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [4, -48], [30, -38], [52, -16], [44, 8], [16, 12], [-12, 4], [-42, 14], [-50, 38], [-28, 54], [0, 48], [18, 62], [-2, 68], [-12, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("fabrica-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.36, 0.57], tArena: 0.84 })
  aoLongoDaBorda(18, 8, (x, z, a, k) => {
    if (P.dWalk(x, z) < 14) return
    F.galpao(c, x, z, 16, 12, 11 + (k % 3) * 3, a, 700 + k, lod, true)
    // engrenagem gigante na fachada de um galpão sim, outro não
    if (k % 2 === 0) F.engrenagem(c, x + Math.sin(a) * 6.4, 7.5 + (k % 3), z + Math.cos(a) * 6.4, 4.5 + (k % 3), a, lod)
  })
  F.ruaDeGalpoes(c, P.at, P.livre, lod, 21, 0.055)
  F.fundoFabrica(c, 7)

  const color = (x: number, z: number): RGB => {
    const gx = ((x % 2) + 2) % 2, gz = ((z % 2) + 2) % 2
    const j = Math.min(gx, 2 - gx, gz, 2 - gz)
    let col = mix(F.CHAPA_ESC, mix(F.CHAPA, F.CHAPA_CL, noise(Math.floor(x / 2), 5, Math.floor(z / 2))), smooth(0.04, 0.12, j))
    col = mix(col, mul(col, 0.75), smooth(0.55, 0.8, noise(x * 0.06, 6, z * 0.06)) * 0.5)
    col = mix(col, F.CHAPA_CL, P.aberto(x, z) * 0.25)
    const d = P.dWalk(x, z)
    col = mix(col, mix(F.CHAPA_CL, [0.72, 0.66, 0.66], 0.4), smooth(2.4, 2.0, d))
    return col
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => F.CHAPA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  F.faixasCaminho(c, CAMINHO)
  // passarelas de ferro no alto atravessando o caminho (pilares fora dele)
  for (let t = 0.1; t < 0.95; t += 0.14) {
    const p = P.at(t)
    const sx = p.dz, sz = -p.dx
    const g = c.geo(p.x, p.z)
    caixa(g, { x: p.x, z: p.z, y0: 7, y1: 7.6, w: 18, d: 2.4, rot: -Math.atan2(sx, sz) + Math.PI / 2, side: F.FERRO, top: F.CHAPA_ESC })
    caixa(g, { x: p.x, z: p.z, y0: 7.6, y1: 8.6, w: 18, d: 0.15, rot: -Math.atan2(sx, sz) + Math.PI / 2, side: F.BRONZE, top: F.BRONZE })
    for (const s of [-1, 1]) {
      const x = p.x + sx * 8.5 * s, z = p.z + sz * 8.5 * s
      if (blocked(c, x, z, 0.1)) continue
      caixa(c.geo(x, z), { x, z, y0: 0, y1: 7, w: 0.7, d: 0.7, side: F.FERRO, top: F.FERRO })
      c.block(x, z, 0.4, 0.4, 7)
    }
  }
  // fornos acesos na beira do caminho
  for (let t = 0.06; t < 0.96; t += 0.09) {
    const p = P.at(t)
    const s = Math.round(t * 30) % 2 ? 1 : -1
    const x = p.x + p.dz * 6 * s, z = p.z - p.dx * 6 * s
    const ang = Math.atan2(p.x - x, p.z - z)
    if (F.cabe(P.livre, x, z, 3.4, 3, ang) && !blocked(c, x, z, 2.2)) F.forno(c, x, z, 1.6, ang, lod)
  }
  scatter(-H + 4, -H + 4, H - 4, H - 4, 4, 32, (x, z, r) => {
    if (!ok(x, z, 0.3) || r(1) > (P.dWalk(x, z) < 7 ? 0.45 : 0.1)) return
    if (r(2) < 0.55) F.barril(c, x, z, 0.9 + r(3) * 0.3, lod)
    else F.caixote(c, x, z, 1.2, r(4) * 3)
  })
  // engrenagem gigante em pé atrás da arena
  F.engrenagem(c, P.arena.x, 7, P.arena.z + P.arena.r + 3, 6, Math.PI, lod, 0.9)
  c.block(P.arena.x, P.arena.z + P.arena.r + 3, 6, 0.6, 13)
  return c
}
