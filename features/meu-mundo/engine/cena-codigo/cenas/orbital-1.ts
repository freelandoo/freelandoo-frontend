// CIDADE ORBITAL · cena 1 (setores 1–3, chefe no 3) — "cidade de vidro colorido" (refs novas: mármore
// branco, ouro e cristal). Ref: ref/dominios/orbital-1.png (ficha em tema-orbital.ts). Marcos: a rua
// de prédios brancos com toldos listrados e vitrines acesas, a faixa de pedestre, os canteiros com
// flores de cristal, a TORRE DE CRISTAL com anéis de ouro no fim da rua e o arco branco da saída.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { faixa } from "../kit-cidade"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as O from "./tema-orbital"

export const meta = {
  ceu: O.CEU,
  nevoa: O.NEVOA,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [0.4, 0.7, 0.6] as RGB, r: 0.05, cor: [1, 1, 0.92] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[-56, -73], [-54, -46], [-26, -40], [4, -48], [34, -36], [46, -10], [24, 0], [-8, -4], [-38, 6], [-50, 30], [-36, 52], [-8, 54], [22, 48], [46, 58], [56, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [1, 2, 3], boss: 3, tZonas: [0.24, 0.5], tArena: 0.8 })
  // arcos nas duas pontas e torres de cristal (marcos)
  for (const [p, q] of [[CAMINHO[0], CAMINHO[1]], [CAMINHO[CAMINHO.length - 1], CAMINHO[CAMINHO.length - 2]]] as const) O.arco(c, p[0], p[1], Math.atan2(q[0] - p[0], q[1] - p[1]), 5.6, 6, lod)
  for (const [x, z, h] of [[12, 30, 34], [-20, -14, 26], [62, -56, 30]] as const) if (P.livre(x, z, 8)) O.torreCristal(c, x, z, h, x + z, lod)
  aoLongoDaBorda(16, 8, (x, z, a, k) => {
    if (P.dWalk(x, z) < 14) return
    O.predio(c, x, z, 14, 11, 10 + (k % 3) * 3, a, 300 + k, lod)
  })
  O.ruaDePredios(c, P.at, P.livre, lod, 41)
  O.fundoOrbital(c, 3)

  const color = (x: number, z: number): RGB => {
    let col = mix(O.MARMORE, O.MARMORE_S, noise(Math.floor(x / 2.4), 1, Math.floor(z / 2.4)) * 0.6)
    col = mix(col, O.MARMORE, P.aberto(x, z) * 0.3)
    col = trilha(col, x, z, P, mix(O.MARMORE, [0.86, 0.86, 0.92], 0.5), 2.2, O.MARMORE_S)
    return mul(col, 0.96 + 0.06 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => O.MARMORE_S, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  // faixas de pedestre atravessando o caminho
  for (const t of [0.12, 0.36, 0.62, 0.9]) {
    const p = P.at(t)
    faixa(c.geo(p.x, p.z), p.x - 2.2, p.z - 2.2, p.x + 2.2, p.z + 2.2, Math.abs(p.dx) > Math.abs(p.dz))
  }
  // canteiros e árvores na beira; obeliscos nas clareiras
  for (let t = 0.04; t < 0.97; t += 0.045) {
    const p = P.at(t)
    const s = Math.round(t * 41) % 2 ? 1 : -1
    const x = p.x + p.dz * 4.2 * s, z = p.z - p.dx * 4.2 * s
    if (!ok(x, z, 0)) continue
    if (Math.round(t * 100) % 3 === 0) O.arvore(c, x, z, 4.5, t * 99, lod)
    else O.canteiro(c, x, z, 2.4, 1.3, -Math.atan2(p.dx, p.dz), t * 77, lod)
  }
  for (const cl of P.clareiras) {
    const x = cl.x + cl.r + 2.5, z = cl.z
    if (ok(x, z, 0.5)) O.obelisco(c, x, z, 5.5, cl.setor, lod)
  }
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 31, (x, z, r) => {
    if (!ok(x, z, 0.5) || r(1) > 0.1) return
    if (r(2) < 0.5) O.arvore(c, x, z, 4 + r(3) * 2, r(4) * 99, lod)
    else O.obelisco(c, x, z, 4 + r(3) * 2.5, r(4) * 99, lod)
  })
  return c
}
