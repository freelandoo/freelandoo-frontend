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
import * as P2 from "../pecas/fabrica"

export const meta = {
  triBloco: F.TRI_BLOCO,
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
  F.ruaDeGalpoes(c, P.at, P.livre, lod, 11, 0.05, 3.2) // afastada: a esteira e as garras ficam entre a parede e o caminho
  F.fundoFabrica(c, 3)
  F.horizonteFabrica(c, 3, meta.nevoa)

  const color = (x: number, z: number): RGB => {
    // a chapa (junta, rebites) vem da textura de detalhe (CHAO_DETALHE.fabrica); aqui só o tom em manchas largas
    let col = mix(F.CHAPA, F.CHAPA_CL, noise(x * 0.09, 1, z * 0.09) * 0.85)
    col = mix(col, mul(col, 0.75), smooth(0.55, 0.8, noise(x * 0.06, 3, z * 0.06)) * 0.5)
    col = mix(col, F.CHAPA_CL, P.aberto(x, z) * 0.25)
    // faixa amarela na beira do caminho (o caminho é chapa mais clara)
    const d = P.dWalk(x, z)
    col = mix(col, mix(F.CHAPA_CL, [0.6, 0.48, 0.46], 0.4), smooth(2.4, 2.0, d))
    return col
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => F.CHAPA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  F.faixasCaminho(c, CAMINHO)
  // o CORREDOR da ref 1: no lado da esteira (troca a cada trecho), esteiras de 11 m a 5 m do eixo com a garra
  // presa numa coluna atrás; do outro lado, postes-lanterna a 3,8 m, grupos de barris acesos e caixotes,
  // e o tanque-caldeira de vez em quando
  let ultEst = -99, ultTanque = -99, nEst = 0
  F.aoLongoDoCaminho(CAMINHO, 1, (x, z, dx, dz, dist, trecho) => {
    const sE = trecho % 2 ? 1 : -1
    const nx = dz, nz = -dx // normal (lado +1)
    const ang = Math.atan2(dx, dz)
    // esteira (centro 6 m à frente, para caber inteira no trecho)
    if (dist - ultEst > 14) {
      const L = 11
      const ex = x + dx * 6 + nx * 5.2 * sE, ez = z + dz * 6 + nz * 5.2 * sE
      // a borda inteira tem que ficar fora do caminho (nas curvas o trecho seguinte passa perto da ponta)
      let bordaOk = true
      for (let t = -L / 2 - 0.4; t <= L / 2 + 0.4 && bordaOk; t += 1)
        for (const w of [-1.2, 1.2]) if (!P.livre(ex + dx * t + nx * w, ez + dz * t + nz * w, 0.5)) bordaOk = false
      if (bordaOk && F.cabe(P.livre, ex, ez, 2.2, L + 0.6, ang) && !blocked(c, ex, ez, 1.4) && !blocked(c, ex + dx * 5, ez + dz * 5, 1) && !blocked(c, ex - dx * 5, ez - dz * 5, 1)) {
        F.esteira(c, ex, ez, L, ang, dist, lod)
        ultEst = dist
        nEst++
        // a garra: coluna a 7,8 m, viga para o caminho até em cima da esteira
        const gx = ex + dx * 1.5 + nx * 2.2 * sE, gz = ez + dz * 1.5 + nz * 2.2 * sE
        if (nEst % 2 === 1 && ok(gx, gz, 0.3)) P2.garra(c, gx, gz, Math.atan2(-nx * sE, -nz * sE), 2.3, 5.4, 2.3, lod)
      }
    }
    const sO = -sE
    if (Math.round(dist) % 6 === 0) {
      const px = x + nx * 3.8 * sO, pz = z + nz * 3.8 * sO
      if (ok(px, pz, -0.2)) P2.posteLanterna(c, px, pz, 2.3, lod)
    }
    if (Math.round(dist) % 11 === 3) {
      const bx = x + nx * 5.4 * sO, bz = z + nz * 5.4 * sO
      for (let q = 0; q < 3; q++) {
        const qx = bx + dx * (q - 1) * 1.15 + nx * sO * (q % 2) * 0.9, qz = bz + dz * (q - 1) * 1.15 + nz * sO * (q % 2) * 0.9
        if (ok(qx, qz, 0)) F.barril(c, qx, qz, 0.9 + (q % 2) * 0.12, lod)
      }
    }
    if (Math.round(dist) % 13 === 8) {
      const kx = x + nx * 5.6 * sO, kz = z + nz * 5.6 * sO
      if (ok(kx, kz, 0.4)) {
        F.caixote(c, kx, kz, 1.25, ang)
        F.caixote(c, kx, kz, 1, ang + 0.35, 1.25, false)
      }
    }
    if (dist - ultTanque > 34) {
      const tx = x + nx * 8.6 * sO, tz = z + nz * 8.6 * sO
      if (ok(tx, tz, 2.2)) {
        P2.tanqueCaldeira(c, tx, tz, 2, lod)
        ultTanque = dist
      }
    }
  })
  // engrenagens de bronze caídas e mais barris/caixotes soltos (pouco: o corredor já tem a carga)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 4, 31, (x, z, r) => {
    if (!ok(x, z, 0.3) || r(1) > (P.dWalk(x, z) < 7 ? 0.12 : 0.06)) return
    if (r(6) < 0.25) {
      P2.engrenagemDeitada(c, x, z, 0.5 + r(7) * 0.3, r(8) * 6, lod, 0.2 + r(9))
      return
    }
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
