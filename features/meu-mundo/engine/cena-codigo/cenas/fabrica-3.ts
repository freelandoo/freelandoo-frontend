// FÁBRICA DE BRONZE · cena 3 (setores 8–10: bando no 8, guardião no 9, AERYN no 10) — "ninho de
// bronze (castelo de Aeryn)". Refs: ref/dominios/fabrica-3.png e castelo-aeryn.png. Ao pôr do sol.
// Marcos: a PRAÇA de chapas com desenho amarelo diante da FORTALEZA DA ÁGUIA DE BRONZE (muralha de
// ferro e cobre, torres com pináculos de bronze, chaminés, bandeiras vermelhas, a águia de asas
// abertas no alto da menagem), os postes-lampião e as cargas empilhadas.

import { noise, type RGB, type V3 } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { face, mix, mul, smooth, tube } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import { casteloAeryn } from "../pecas/castelo-aeryn"
import * as F from "./tema-fabrica"
import * as P2 from "../pecas/fabrica"

export const meta = {
  triBloco: F.TRI_BLOCO,
  ceu: F.CEU_TARDE,
  nevoa: F.NEVOA_TARDE,
  area: AREA,
  luz: F.LUZ_TARDE,
  astro: { dir: [0.5, 0.1, 1] as RGB, r: 0.07, cor: [1, 0.8, 0.5] as RGB },
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[56, -73], [52, -48], [26, -40], [-4, -46], [-34, -34], [-44, -12], [-22, -2], [0, 6], [0, 24], [0, 44], [0, 56]]


export function montar(lod = 0): Cena {
  const c = new Cena("fabrica-3", lod, 32, -16)
  // pegada da FORTALEZA DE BRONZE copiada (pecas/castelo-aeryn.ts): 56 m com as alas no morro; pátio 18
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 56, d: 40, patio: 18 } })
  const K = P.castelo!
  casteloAeryn(c, K, lod)

  aoLongoDaBorda(18, 8, (x, z, a, k) => {
    if (P.dWalk(x, z) < 14 || (Math.abs(x - K.x) < K.w / 2 + 6 && Math.abs(z - K.z) < K.d / 2 + 6)) return
    F.galpao(c, x, z, 16, 12, 10 + (k % 3) * 3, a, 500 + k, lod, k % 2 === 1)
  })
  F.ruaDeGalpoes(c, (t) => P.at(t * 0.72), P.livre, lod, 31, 0.07)
  F.fundoFabrica(c, 12)
  F.horizonteFabrica(c, 12, meta.nevoa)

  const color = (x: number, z: number): RGB => {
    const gx = ((x % 2.5) + 2.5) % 2.5, gz = ((z % 2.5) + 2.5) % 2.5
    const j = Math.min(gx, 2.5 - gx, gz, 2.5 - gz)
    let col = mix(F.CHAPA_ESC, mix(F.CHAPA, F.CHAPA_CL, noise(Math.floor(x / 2.5), 9, Math.floor(z / 2.5))), smooth(0.04, 0.12, j))
    col = mix(col, mul(col, 0.78), smooth(0.55, 0.8, noise(x * 0.06, 8, z * 0.06)) * 0.5)
    // a praça diante do castelo: círculo e raios amarelos
    const dp = Math.hypot(x - P.arena.x, z - P.arena.z)
    const ring = smooth(0.25, 0, Math.abs(dp - P.arena.r * 0.85)) + smooth(0.2, 0, Math.abs(dp - P.arena.r * 0.45))
    col = mix(col, F.AMARELO, Math.min(1, ring) * (dp < P.arena.r + 1 ? 1 : 0))
    const d = P.dWalk(x, z)
    col = mix(col, mix(F.CHAPA_CL, [0.72, 0.66, 0.66], 0.4), smooth(2.6, 2.2, d))
    return col
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => F.CHAPA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  F.faixasCaminho(c, CAMINHO)
  // pilares-lanterna dos dois lados do caminho (a ref 3), ligados por DOIS cabos caídos, com o estandarte da
  // águia pendurado no meio de cada vão e a mureta acesa embaixo
  const ganchos: Record<number, V3 | null> = { [-1]: null, [1]: null }
  let nV = 0
  F.aoLongoDoCaminho(CAMINHO, 8, (x, z, dx, dz) => {
    const nx = dz, nz = -dx
    for (const s of [-1, 1]) {
      const px = x + nx * 4.6 * s, pz = z + nz * 4.6 * s
      if (!ok(px, pz, -0.4)) {
        ganchos[s] = null
        continue
      }
      const g = F.lampiao(c, px, pz, 5, lod)
      const a = ganchos[s]
      if (a && Math.hypot(a[0] - g[0], a[2] - g[2]) < 10) {
        P2.cabo(c, a, g, 1.2, 0.08, lod)
        P2.cabo(c, [a[0], a[1] - 0.4, a[2]], [g[0], g[1] - 0.4, g[2]], 1.4, 0.08, lod)
        const mx = (a[0] + g[0]) / 2, mz = (a[2] + g[2]) / 2
        const angM = Math.atan2(-nx * s, -nz * s)
        if (nV++ % 2 === 0) F.bandeira(c, mx - nx * s * 0.1, g[1] - 1.5, mz - nz * s * 0.1, angM, 0.75)
        if (ok(mx + nx * s * 0.6, mz + nz * s * 0.6, -0.3)) P2.muretaAcesa(c, mx + nx * s * 0.6, mz + nz * s * 0.6, angM, 4.2, lod)
      }
      ganchos[s] = g
    }
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 4, 33, (x, z, r) => {
    if (!ok(x, z, 0.3) || r(1) > (P.dWalk(x, z) < 7 ? 0.3 : 0.06)) return
    if (r(2) < 0.5) F.barril(c, x, z, 0.9 + r(3) * 0.3, lod)
    else {
      F.caixote(c, x, z, 1.2, r(4) * 3)
      if (r(5) < 0.5) F.caixote(c, x, z, 1, r(4) * 3 + 0.4, 1.2, false)
    }
  })
  return c
}

