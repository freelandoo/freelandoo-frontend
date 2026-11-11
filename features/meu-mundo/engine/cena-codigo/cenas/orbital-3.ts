// CIDADE ORBITAL · cena 3 (setores 8–10: bando no 8, guardião no 9, ÍRIS no 10) — "Palácio Prisma".
// Refs: ref/dominios/orbital-3.png e castelo-iris.png. Marcos: a AVENIDA DO ARCO-ÍRIS (faixas de cor
// no chão do caminho), os arcos brancos em fila, os obeliscos de cristal e o PALÁCIO DE CRISTAL
// PRISMÁTICO: mármore branco com frisos de ouro, torres com pontas de cristal rosa/ciano/violeta,
// o grande cristal no alto da menagem com os anéis de ouro, cachoeiras ciano dos lados.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { face, mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import { castelo, type CasteloEstilo } from "../castelo"
import * as O from "./tema-orbital"

export const meta = {
  ceu: [0.5, 0.72, 1] as RGB,
  nevoa: [0.88, 0.9, 1] as RGB,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [-0.3, 0.6, 1] as RGB, r: 0.05, cor: [1, 1, 0.92] as RGB },
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[56, -73], [52, -48], [26, -40], [-4, -46], [-34, -34], [-44, -12], [-22, -2], [0, 6], [0, 24], [0, 44], [0, 56]]

export const IRIS: CasteloEstilo = {
  pedra: [0.94, 0.93, 0.96],
  pedraEsc: [0.78, 0.78, 0.88],
  quina: O.OURO,
  telhado: [0.86, 0.8, 1],
  telhadoHi: [1, 0.92, 1],
  luz: [0.9, 0.7, 1],
  metal: O.OURO,
  bandeira: [0.7, 0.5, 1],
  cobertura: "cone",
  lados: 7,
  alto: 1.1,
}

const ARCO_IRIS: RGB[] = [[1, 0.42, 0.5], [1, 0.7, 0.36], [1, 0.95, 0.5], [0.5, 0.95, 0.6], [0.5, 0.82, 1], [0.7, 0.55, 1]]

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-3", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 52, d: 40, patio: 18 } })
  const K = P.castelo!
  const A = castelo(c, K, IRIS, lod)
  // o grande cristal no alto da menagem e pontas de cristal nas torres
  O.cristal(c, A.menagem[0], A.menagem[2], 14, 5, lod, A.menagem[1])
  for (const t of A.torres) O.cristal(c, t[0], t[2], 4.5, t[0] + t[2], lod, t[1] + 6.3)
  // cachoeiras ciano descendo das alas
  for (const s of [-1, 1]) {
    const x = K.porta.x + s * (K.w / 2 - 1), z = K.porta.z + 2.6
    const G = c.glow(x, z)
    face(G, [[x - 1.2, 8, z - 1.6], [x + 1.2, 8, z - 1.6], [x + 1.7, 0.05, z - 1.9], [x - 1.7, 0.05, z - 1.9]], [mix(O.CIANO, O.BRANCO, 0.6), mix(O.CIANO, O.BRANCO, 0.6), O.CIANO, O.CIANO], [0, 0.2, -1])
  }
  aoLongoDaBorda(16, 8, (x, z, a, k) => {
    if (P.dWalk(x, z) < 14 || (Math.abs(x - K.x) < K.w / 2 + 6 && Math.abs(z - K.z) < K.d / 2 + 6)) return
    O.predio(c, x, z, 14, 11, 9 + (k % 3) * 3, a, 100 + k, lod)
  })
  O.ruaDePredios(c, (t) => P.at(t * 0.7), P.livre, lod, 61, 0.07, 7)
  // arcos brancos em fila sobre a avenida e obeliscos dos lados
  for (const t of [0.1, 0.24, 0.4, 0.56, 0.74]) {
    const p = P.at(t)
    P.reserva(p.x, p.z, 3)
    O.arco(c, p.x, p.z, p.ang, 6, 5.5, lod)
  }
  O.fundoOrbital(c, 14)

  const color = (x: number, z: number): RGB => {
    let col = mix(O.MARMORE, O.MARMORE_S, noise(Math.floor(x / 2.4), 7, Math.floor(z / 2.4)) * 0.5)
    col = mix(col, O.MARMORE, P.aberto(x, z) * 0.3)
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
  for (let t = 0.05; t < 0.97; t += 0.06) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 4.6 * s, z = p.z - p.dx * 4.6 * s
      if (!ok(x, z, 0)) continue
      if (Math.round(t * 100) % 2) O.obelisco(c, x, z, 5 + (t * 10) % 2, t * 50 + s, lod)
      else O.canteiro(c, x, z, 2.2, 1.4, -Math.atan2(p.dx, p.dz), t * 60 + s, lod)
    }
  }
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 33, (x, z, r) => {
    if (!ok(x, z, 0.5) || r(1) > 0.1) return
    O.arvore(c, x, z, 4 + r(3) * 2, r(4) * 99, lod)
  })
  return c
}
