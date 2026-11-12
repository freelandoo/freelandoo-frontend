// FÁBRICA DE BRONZE · cena 2 (setores 4–7, chefe no 7) — "engrenagens gigantes e chaminés", de dia.
// Ref: ref/dominios/fabrica-2.png. Marcos: as ENGRENAGENS GIGANTES nas fachadas, os fornos acesos na
// beira do caminho, as passarelas de ferro no alto atravessando a rua e as chaminés fumegando.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import * as F from "./tema-fabrica"
import * as P2 from "../pecas/fabrica"

export const meta = {
  triBloco: F.TRI_BLOCO,
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
  F.ruaDeGalpoes(c, P.at, P.livre, lod, 21, 0.055, 4.2) // afastada: as fornalhas e as engrenagens ficam entre a parede e o caminho
  F.fundoFabrica(c, 7)
  F.horizonteFabrica(c, 7, meta.nevoa)

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
  // passarelas copiadas (guarda-corpo dourado, lampiões, treliça) atravessando o caminho no alto
  for (let t = 0.1; t < 0.95; t += 0.14) {
    const p = P.at(t)
    const sx = p.dz, sz = -p.dx
    const a: [number, number] = [p.x + sx * 9, p.z + sz * 9], b: [number, number] = [p.x - sx * 9, p.z - sz * 9]
    const pil = !blocked(c, a[0], a[1], 0.4) && !blocked(c, b[0], b[1], 0.4) && P.livre(a[0], a[1], 0.2) && P.livre(b[0], b[1], 0.2)
    P2.passarela(c, a, b, 8, lod, pil)
  }
  // lampiões em caixote dos dois lados do caminho (a fila da ref 2) e barris de madeira
  F.aoLongoDoCaminho(CAMINHO, 1, (x, z, dx, dz, dist) => {
    const nx = dz, nz = -dx
    if (Math.round(dist) % 7 === 0)
      for (const s of [-1, 1]) {
        const lx = x + nx * 3.9 * s, lz = z + nz * 3.9 * s
        if (ok(lx, lz, -0.1)) P2.lampiaoCaixote(c, lx, lz, lod)
      }
    if (Math.round(dist) % 12 === 5) {
      const s = Math.round(dist / 12) % 2 ? 1 : -1
      const bx = x + nx * 5.6 * s, bz = z + nz * 5.6 * s
      if (ok(bx, bz, 0.2)) P2.barrilMadeira(c, bx, bz, 1.1, lod)
      if (ok(bx + dx * 1.1, bz + dz * 1.1, 0.2)) F.caixote(c, bx + dx * 1.1, bz + dz * 1.1, 1.1, Math.atan2(dx, dz))
    }
  })
  // FORNALHAS copiadas na beira (frente para o caminho, a 6,6 m) e, atrás de uma a cada duas, a ENGRENAGEM
  // gigante em pé encostada na parede (a ref 2: o salão das engrenagens)
  let ultF = -99, nF = 0
  F.aoLongoDoCaminho(CAMINHO, 1, (x, z, dx, dz, dist, trecho) => {
    if (dist - ultF < 11) return
    const s = trecho % 2 ? 1 : -1
    const nx = dz, nz = -dx
    const fx = x + nx * 6.6 * s, fz = z + nz * 6.6 * s
    const ang = Math.atan2(-nx * s, -nz * s)
    // a pegada (4,6 × 5,2 m, com a torre de trás) inteira fora do caminho e livre
    let livre = true
    for (const du of [-2.4, 0, 2.4]) for (const dv of [-0.6, 2, 4.6]) if (!P.livre(fx + dx * du + nx * s * dv, fz + dz * du + nz * s * dv, 0.4)) livre = false
    if (!livre || blocked(c, fx, fz, 2.4) || blocked(c, fx + nx * s * 3.4, fz + nz * s * 3.4, 1.4)) return
    F.forno(c, fx, fz, 1.6, ang, lod)
    ultF = dist
    if (nF++ % 2 === 0) {
      const gx = fx + nx * s * 6.2 + dx * 1.2, gz = fz + nz * s * 6.2 + dz * 1.2
      if (P.livre(gx, gz, 0.5)) {
        F.engrenagem(c, gx, 4.8, gz, 4.4, ang, lod, 0.8)
        c.block(gx, gz, 0.6, 0.6, 9.4)
      }
    }
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 4, 32, (x, z, r) => {
    if (!ok(x, z, 0.3) || r(1) > (P.dWalk(x, z) < 7 ? 0.15 : 0.08)) return
    if (r(2) < 0.55) F.barril(c, x, z, 0.9 + r(3) * 0.3, lod)
    else F.caixote(c, x, z, 1.2, r(4) * 3)
  })
  // engrenagem gigante em pé atrás da arena
  F.engrenagem(c, P.arena.x, 7, P.arena.z + P.arena.r + 3, 6, Math.PI, lod, 0.9)
  c.block(P.arena.x, P.arena.z + P.arena.r + 3, 6, 0.6, 13)
  return c
}
