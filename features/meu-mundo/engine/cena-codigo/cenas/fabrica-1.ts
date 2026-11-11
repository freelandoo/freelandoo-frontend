// FÁBRICA DE BRONZE · cena 1 (setores 1–3, chefe no 3) — "pátio de esteiras e vapor", ao pôr do sol.
// Ref: ref/dominios/fabrica-1.png (ficha em tema-fabrica.ts). Marcos: a rua de galpões de tijolo com
// janelas acesas, as esteiras com caixotes, o guindaste-pinça, os canos de cobre por cima e o grande
// portão em arco de tijolo na saída.

import { noise, type RGB, type V3 } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import * as F from "./tema-fabrica"

export const meta = {
  ceu: F.CEU_TARDE,
  nevoa: F.NEVOA_TARDE,
  area: AREA,
  luz: F.LUZ_TARDE,
  astro: { dir: [0, 0.12, 1] as RGB, r: 0.07, cor: [1, 0.82, 0.55] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[-56, -73], [-54, -46], [-24, -40], [8, -48], [38, -36], [48, -10], [26, 0], [-6, -4], [-38, 6], [-50, 30], [-36, 52], [-6, 54], [24, 48], [46, 58], [56, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("fabrica-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [1, 2, 3], boss: 3, tZonas: [0.24, 0.5], tArena: 0.8 })
  // portões em arco de tijolo nas duas pontas
  for (const [p, q] of [[CAMINHO[0], CAMINHO[1]], [CAMINHO[CAMINHO.length - 1], CAMINHO[CAMINHO.length - 2]]] as const) portao(c, p, q, lod)
  aoLongoDaBorda(18, 8, (x, z, a, k) => {
    if (P.dWalk(x, z) < 14) return
    F.galpao(c, x, z, 16, 12, 10 + (k % 3) * 3, a, 900 + k, lod, k % 2 === 0)
  })
  F.ruaDeGalpoes(c, P.at, P.livre, lod, 11)
  F.fundoFabrica(c, 3)

  const color = (x: number, z: number): RGB => {
    // chapas de 2 m com junta escura e rebites (mancha mais clara/escura por chapa)
    const gx = ((x % 2) + 2) % 2, gz = ((z % 2) + 2) % 2
    const j = Math.min(gx, 2 - gx, gz, 2 - gz)
    let col = mix(F.CHAPA_ESC, mix(F.CHAPA, F.CHAPA_CL, noise(Math.floor(x / 2), 1, Math.floor(z / 2))), smooth(0.04, 0.12, j))
    col = mix(col, mul(col, 0.75), smooth(0.55, 0.8, noise(x * 0.06, 3, z * 0.06)) * 0.5)
    col = mix(col, F.CHAPA_CL, P.aberto(x, z) * 0.25)
    // faixa amarela na beira do caminho (o caminho é chapa mais clara)
    const d = P.dWalk(x, z)
    col = mix(col, mix(F.CHAPA_CL, [0.72, 0.66, 0.66], 0.4), smooth(2.4, 2.0, d))
    return col
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => F.CHAPA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  F.faixasCaminho(c, CAMINHO)
  // esteiras com caixotes paralelas ao caminho
  for (let t = 0.08; t < 0.95; t += 0.11) {
    const p = P.at(t)
    const s = Math.round(t * 20) % 2 ? 1 : -1
    const x = p.x + p.dz * 4.6 * s, z = p.z - p.dx * 4.6 * s
    if (F.cabe(P.livre, x, z, 1.8, 8, Math.atan2(p.dx, p.dz)) && !blocked(c, x, z, 4.5)) F.esteira(c, x, z, 8, Math.atan2(p.dx, p.dz), t * 50, lod)
  }
  // barris e pilhas de caixotes perto do caminho; engrenagens caídas
  scatter(-H + 4, -H + 4, H - 4, H - 4, 4, 31, (x, z, r) => {
    if (!ok(x, z, 0.3) || r(1) > (P.dWalk(x, z) < 7 ? 0.45 : 0.1)) return
    if (r(2) < 0.5) F.barril(c, x, z, 0.9 + r(3) * 0.3, lod)
    else {
      F.caixote(c, x, z, 1.2, r(4) * 3)
      if (r(5) < 0.5) F.caixote(c, x, z, 1, r(4) * 3 + 0.4, 1.2, false)
    }
  })
  // canos de cobre correndo no alto, de galpão a galpão, atravessando o caminho
  for (let t = 0.12; t < 0.9; t += 0.16) {
    const p = P.at(t)
    const a: V3 = [p.x + p.dz * 9, 6.5, p.z - p.dx * 9], b: V3 = [p.x - p.dz * 9, 6.5, p.z + p.dx * 9]
    F.cano(c, a, b, 0.4, lod)
    for (const e of [a, b]) if (!blocked(c, e[0], e[2], 0.2) && P.livre(e[0], e[2], -1.6)) {
      F.cano(c, [e[0], 0, e[2]], e, 0.4, lod)
      c.block(e[0], e[2], 0.45, 0.45, 6.5)
    }
  }
  // guindaste-pinça na arena (cenário alto em volta do chefe)
  {
    const p = P.at(0.8)
    const gx = P.arena.x + p.dz * (P.arena.r + 3), gz = P.arena.z - p.dx * (P.arena.r + 3)
    if (P.livre(gx, gz, 1)) guindaste(c, gx, gz, lod)
  }
  return c
}

function portao(c: Cena, p: XZ, q: XZ, lod: number) {
  const ang = Math.atan2(q[0] - p[0], q[1] - p[1])
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  for (const s of [-1, 1]) {
    const x = p[0] + sx * 4.4 * s, z = p[1] + sz * 4.4 * s
    caixa(c.geo(x, z), { x, z, y0: 0, y1: 9, w: 2, d: 2.4, rot: -ang, side: F.TIJOLO, top: F.COBRE })
    c.block(x, z, 1, 1.2, 9, -ang)
  }
  const g = c.geo(p[0], p[1])
  const n = lod ? 4 : 8
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n
    const u = (t - 0.5) * 9.6, y = 8 + Math.sin(t * Math.PI) * 1.8
    caixa(g, { x: p[0] + sx * u, z: p[1] + sz * u, y0: y - 1.2, y1: y + 0.4, w: 9.8 / n + 0.1, d: 2.2, rot: -ang, side: k % 2 ? F.TIJOLO : F.TIJOLO_ESC, top: F.COBRE })
  }
  F.bandeira(c, p[0] + sx * 0.01, 7.6, p[1] + sz * 0.01 - Math.cos(ang) * 1.15, ang + Math.PI)
}

function guindaste(c: Cena, x: number, z: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 12, w: 1.2, d: 1.2, side: F.FERRO, top: F.BRONZE })
  c.block(x, z, 0.8, 0.8, 12)
  caixa(g, { x: x - 4, z, y0: 11.4, y1: 12.2, w: 9, d: 0.8, side: F.AMARELO, top: F.AMARELO })
  F.cano(c, [x - 7.5, 11.4, z], [x - 7.5, 7, z], 0.06, lod, F.FERRO)
  for (const s of [-1, 1]) F.cano(c, [x - 7.5, 7, z], [x - 7.5 + s * 0.9, 5.8, z], 0.12, lod, F.BRONZE)
}
