// CIDADE ORBITAL · cena 3 (setores 8–10: bando no 8, guardião no 9, ÍRIS no 10) — "Palácio Prisma".
// Refs: ref/dominios/orbital-3.png e castelo-iris.png. Marcos: a AVENIDA DO ARCO-ÍRIS (faixas de cor
// no chão do caminho), os arcos brancos em fila, os obeliscos de cristal e o PALÁCIO DE CRISTAL
// PRISMÁTICO: mármore branco com frisos de ouro, torres com pontas de cristal rosa/ciano/violeta,
// o grande cristal no alto da menagem com os anéis de ouro, cachoeiras ciano dos lados.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { face, mix, mul, smooth } from "../kit-natureza"
import { AREA, H, planta } from "../dominio"
import { casteloIris } from "../pecas/castelo-iris"
import * as O from "./tema-orbital"
import * as C from "../pecas/orbital"
import { avenida, chaoAvenida, quadras } from "./avenida-orbital"

export const meta = {
  ceu: [0.5, 0.72, 1] as RGB,
  nevoa: [0.88, 0.9, 1] as RGB,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [-0.3, 0.6, 1] as RGB, r: 0.05, cor: [1, 1, 0.92] as RGB },
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

// trechos RETOS (a avenida precisa); o último sobe reto em x = 0 até o palácio
const CAMINHO: XZ[] = [[56, -73], [56, -42], [-40, -42], [-40, -2], [0, -2], [0, 24], [0, 44], [0, 56]]


const ARCO_IRIS: RGB[] = [[1, 0.42, 0.5], [1, 0.7, 0.36], [1, 0.95, 0.5], [0.5, 0.95, 0.6], [0.5, 0.82, 1], [0.7, 0.55, 1]]

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-3", lod, 32, -16)
  // pegada do PALÁCIO PRISMA copiado (pecas/castelo-iris.ts): 50 m com as fontes e os cantos; pátio 18
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 52, d: 40, patio: 18 } })
  const K = P.castelo!
  casteloIris(c, K, lod)
  // arcos brancos em fila sobre a avenida (os copiados, vão = a rua): antes das lojas, que desviam deles
  C.portalArco(c, 56, -70, 0, 12, lod)
  for (const t of [0.06, 0.3, 0.58]) { // longe das esquinas: o pilar de um arco logo após a curva cai no trecho anterior
    const p = P.at(t)
    if (P.aberto(p.x, p.z) > 0.2) continue
    P.reserva(p.x, p.z, 3)
    C.portalArco(c, p.x, p.z, p.ang, 12, lod)
  }
  avenida(c, P, lod, 61, { faixas: [0.2, 0.42, 0.6] })
  quadras(c, P, lod, 99)
  O.fundoOrbital(c, 14)

  const color = (x: number, z: number): RGB => {
    let col = mix(chaoAvenida(P, x, z), O.MARMORE, P.aberto(x, z) * 0.35)
    // avenida do arco-íris: faixas de cor pelo deslocamento lateral ao caminho
    const d = P.dWalk(x, z)
    if (d < 2.6) {
      const band = ARCO_IRIS[Math.min(5, Math.floor((noise(x * 0.02, 1, z * 0.02) * 0.3 + d / 2.6) * 6))]
      col = mix(col, mix(O.MARMORE, band, 0.55), smooth(2.6, 2.2, d))
    }
    return mul(col, 0.96 + 0.06 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => O.MARMORE_S, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  // obeliscos de cristal nas praças e árvores no que sobrou
  for (const cl of P.clareiras) if (ok(cl.x + cl.r + 2.5, cl.z, 0.5)) O.obelisco(c, cl.x + cl.r + 2.5, cl.z, 5.5, cl.setor, lod)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 33, (x, z, r) => {
    if (!ok(x, z, 1) || r(1) > 0.1) return
    C.arvoreRedonda(c, x, z, 5 + r(3) * 1.5, r(4) * 99, lod)
  })
  return c
}
