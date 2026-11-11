// CIDADE ORBITAL · cena 2 (setores 4–7, chefe no 7) — "escadas sem chão, ilhas flutuantes".
// Ref: ref/dominios/orbital-2.png. Marcos: as ILHAS FLUTUANTES no alto com prédios e cachoeiras
// acesas caindo, as escadas de mármore que sobem para o nada, a praça branca com friso de ouro e os
// canteiros de cristal. O chão de andar continua plano (o motor não tem ladeira): as ilhas e as
// escadas são cenário.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as O from "./tema-orbital"

export const meta = {
  ceu: [0.5, 0.74, 1] as RGB,
  nevoa: [0.86, 0.92, 1] as RGB,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [0.5, 0.75, 0.9] as RGB, r: 0.05, cor: [1, 1, 0.92] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [4, -48], [30, -38], [52, -16], [44, 8], [16, 12], [-12, 4], [-42, 14], [-50, 38], [-28, 54], [0, 48], [18, 62], [-2, 68], [-12, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.36, 0.57], tArena: 0.84 })
  aoLongoDaBorda(18, 8, (x, z, a, k) => {
    if (P.dWalk(x, z) < 14) return
    O.predio(c, x, z, 13, 10, 8 + (k % 3) * 3, a, 200 + k, lod)
  })
  O.ruaDePredios(c, P.at, P.livre, lod, 51, 0.07, 6)
  // ilhas flutuantes no alto, espalhadas (não colidem)
  scatter(-H + 10, -H + 10, H - 10, H - 10, 22, 7, (x, z, r) => {
    if (r(1) > 0.55) return
    O.ilha(c, x, 14 + r(2) * 14, z, 3.5 + r(3) * 4, r(4) * 99, lod)
  })
  // escadas sem chão viradas para o caminho
  for (const [t, s] of [[0.1, 1], [0.3, -1], [0.48, 1], [0.66, -1], [0.92, 1]] as const) {
    const p = P.at(t)
    const x = p.x + p.dz * 8 * s, z = p.z - p.dx * 8 * s
    const ang = Math.atan2(x - p.x, z - p.z)
    const ex = x + Math.sin(ang) * 11, ez = z + Math.cos(ang) * 11, mx = (x + ex) / 2, mz = (z + ez) / 2
    if (P.livre(x, z, 2) && P.livre(ex, ez, 2) && P.livre(mx, mz, 2) && !blocked(c, mx, mz, 6)) O.escadaSemChao(c, x, z, ang, 12, lod)
  }
  for (const [dx, dz] of [[P.arena.r + 6, 4], [-(P.arena.r + 6), 4], [0, -(P.arena.r + 6)], [0, P.arena.r + 6]] as const) {
    const x = P.arena.x + dx, z = P.arena.z + dz
    if (P.livre(x, z, 4.5) && !blocked(c, x, z, 4.5)) {
      O.torreCristal(c, x, z, 30, 9, lod)
      break
    }
  }
  O.fundoOrbital(c, 8)

  const color = (x: number, z: number): RGB => {
    let col = mix(O.MARMORE, O.MARMORE_S, noise(Math.floor(x / 3), 4, Math.floor(z / 3)) * 0.5)
    col = mix(col, O.MARMORE, P.aberto(x, z) * 0.3)
    col = trilha(col, x, z, P, mix(O.MARMORE, O.CIANO, 0.18), 2.2, O.OURO)
    return mul(col, 0.96 + 0.06 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => [0.9, 0.94, 1], fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  for (let t = 0.04; t < 0.97; t += 0.05) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 4.3 * s, z = p.z - p.dx * 4.3 * s
      if (!ok(x, z, 0) || Math.round(t * 100 + s) % 3 === 0) continue
      O.canteiro(c, x, z, 2.2, 1.4, -Math.atan2(p.dx, p.dz), t * 70 + s, lod)
    }
  }
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 32, (x, z, r) => {
    if (!ok(x, z, 0.5) || r(1) > 0.12) return
    if (r(2) < 0.5) O.arvore(c, x, z, 4 + r(3) * 2, r(4) * 99, lod)
    else O.obelisco(c, x, z, 4 + r(3) * 2.5, r(4) * 99, lod)
  })
  return c
}
