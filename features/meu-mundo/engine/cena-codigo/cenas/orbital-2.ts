// CIDADE ORBITAL · cena 2 (setores 4–7, chefe no 7) — "escadas sem chão, ilhas flutuantes".
// Ref: ref/dominios/orbital-2.png. Marcos: as ILHAS FLUTUANTES no alto com prédios e cachoeiras
// acesas caindo, as escadas de mármore que sobem para o nada, a praça branca com friso de ouro e os
// canteiros de cristal. O chão de andar continua plano (o motor não tem ladeira): as ilhas e as
// escadas são cenário. 11/11: a rua virou a AVENIDA da ref 1 (`avenida()` com as peças copiadas) em
// trechos retos; as escadas sobem das praças e as ilhas pairam sobre as quadras.

import { type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix } from "../kit-natureza"
import { AREA, H, planta } from "../dominio"
import * as O from "./tema-orbital"
import * as C from "../pecas/orbital"
import { avenida, chaoAvenida, horizonte, quadras } from "./avenida-orbital"

export const meta = {
  ceu: [0.5, 0.74, 1] as RGB,
  nevoa: [0.86, 0.92, 1] as RGB,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [0.5, 0.75, 0.9] as RGB, r: 0.05, cor: [1, 1, 0.92] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

// trechos RETOS (a avenida precisa)
const CAMINHO: XZ[] = [[0, -73], [0, -32], [50, -32], [50, 16], [-44, 16], [-44, 56], [10, 56], [10, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.36, 0.57], tArena: 0.84 })
  C.portalArco(c, 0, -70, 0, 12, lod)
  C.portalArco(c, 10, 70, Math.PI, 12, lod)
  horizonte(c, 10, 100, 0, 8)
  avenida(c, P, lod, 51, { faixas: [0.1, 0.4, 0.7] })
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
      C.torreCristalAneis(c, x, z, 30, 9, lod)
      break
    }
  }
  quadras(c, P, lod, 88)
  O.fundoOrbital(c, 8)

  const color = (x: number, z: number): RGB => mix(chaoAvenida(P, x, z), O.MARMORE, P.aberto(x, z) * 0.35)
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => [0.9, 0.94, 1], fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 32, (x, z, r) => {
    if (!ok(x, z, 1) || r(1) > 0.12) return
    if (r(2) < 0.6) C.arvoreRedonda(c, x, z, 5 + r(3) * 1.5, r(4) * 99, lod)
    else O.obelisco(c, x, z, 4 + r(3) * 2.5, r(4) * 99, lod)
  })
  return c
}
