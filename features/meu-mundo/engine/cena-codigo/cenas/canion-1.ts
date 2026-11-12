// CÂNION DAS TEMPESTADES · cena 1 (setores 1–3, chefe no 3) — vale de outono entre mesas de arenito.
// Ref: ref/dominios/canion-1.png (ficha em tema-canion.ts). Marcos: o ARCO NATURAL por cima do
// caminho, o rio azul na borda leste com margem de areia, a agulha de três andares atrás da arena
// e o portal de blocos vermelhos na saída.
// Mapa (1 letra = 16 m):
//   M M A . . . . . E ~
//   M . . C . . . . . ~
//   . 2 . . . . . M . ~
//   . . . . . . . . . ~
//   M . . . ^ . 1 . . ~      ^ = arco natural sobre o caminho
//   S . M M . . . . M ~

import { noise, type RGB } from "../kit"
import { Cena, blocked, distPath, ground, river, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as T from "./tema-canion"
import * as F from "./tema-fabrica"
import * as P2 from "../pecas/canion"

export const meta = {
  triBloco: T.TRI_BLOCO,
  ceu: T.CEU_DIA,
  nevoa: T.NEVOA_DIA,
  area: AREA,
  astro: { dir: [-0.5, 0.75, -0.6] as RGB, r: 0.05, cor: [1, 0.97, 0.86] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[-60, -73], [-56, -50], [-30, -44], [-4, -52], [24, -46], [46, -30], [48, -6], [24, 4], [-6, 0], [-34, 8], [-52, 28], [-42, 50], [-14, 56], [14, 52], [40, 58], [54, 73]]
const DESVIO: XZ[] = [[24, 4], [34, 22], [32, 36]]
const RIO: XZ[] = [[76, -70], [64, -42], [67, -10], [60, 20], [69, 48], [76, 70]]
const RIO_W = 8

export function montar(lod = 0): Cena {
  const c = new Cena("canion-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, desvios: [DESVIO], setores: [1, 2, 3], boss: 3, tZonas: [0.33, 0.56], tArena: 0.82 })
  const dRio = (x: number, z: number) => distPath(x, z, RIO)
  const mesas: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  const add = (ms: { inside: (x: number, z: number, k?: number) => boolean }[]) => mesas.push(...ms)

  // ── marcos ──
  const ar = P.at(0.18)
  P.reserva(ar.x, ar.z, 9)
  T.arcoNatural(c, ar.x, ar.z, ar.ang, 6, 11, lod)
  mesas.push({ inside: (x, z, k = 1) => Math.hypot(x - ar.x, z - ar.z) < 7.5 * k && distPath(x, z, CAMINHO) > 3 })
  for (const [i, s] of [[0, -1], [0, 1], [1, -1], [1, 1]] as const) {
    const p = i ? CAMINHO[CAMINHO.length - 1] : CAMINHO[0], q = i ? CAMINHO[CAMINHO.length - 2] : CAMINHO[1]
    const ang = Math.atan2(q[0] - p[0], q[1] - p[1])
    const x = p[0] + Math.cos(ang) * 4.6 * s, z = p[1] - Math.sin(ang) * 4.6 * s
    T.blocoVerm(c, x, z, 1.6, 10 + i * 2 + s)
    T.blocoVerm(c, x + Math.cos(ang) * 1.2 * s, z - Math.sin(ang) * 1.2 * s, 1.1, 20 + i * 2 + s)
  }
  // agulha atrás da arena (o chefe tem cenário alto em volta)
  T.agulha(c, P.arena.x - 14, P.arena.z + 6, 22, 5, lod)

  // ── borda: maciços de arenito e o rio a leste ──
  aoLongoDaBorda(19, 8, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 17 || dRio(x, z) < RIO_W / 2 + 8 || x > 60) return
    add(T.macico(c, x, z, 0.85 + noise(x * 0.1, 1, z * 0.1) * 0.6, k * 3 + 1, lod))
  })
  // maciços no meio (escondem um trecho do outro e dão o "meio" de cada vista)
  for (const [x, z, s] of [[-20, -16, 1.1], [16, -24, 0.8], [-8, 28, 1], [24, 30, 0.7], [-60, -12, 1]] as const)
    if (P.livre(x, z, 9 * s)) add(T.macico(c, x, z, s, Math.round(x + z) + 99, lod))
  T.fundoCanion(c, 4)
  P2.horizonteCanion(c, 4, meta.nevoa, false)

  const inMesa = (x: number, z: number, k = 1.12) => mesas.some((m) => m.inside(x, z, k))
  const height = (x: number, z: number) => -0.75 * smooth(RIO_W / 2 + 2.5, RIO_W / 2 - 0.5, dRio(x, z))
  const color = (x: number, z: number): RGB => {
    let col = mix(T.CAPIM, T.CAPIM_SECO, smooth(0.35, 0.7, noise(x * 0.1 + 5, 0.3, z * 0.1)))
    col = mix(col, T.CAPIM_ESC, smooth(0.62, 0.8, noise(x * 0.23, 7.7, z * 0.23)) * 0.6)
    if (inMesa(x, z, 1.3)) col = mix(col, T.TERRA_VERM, 0.7)
    col = mix(col, T.TERRA, P.aberto(x, z) * 0.35)
    col = trilha(col, x, z, P, T.TERRA, 2.1, T.CAPIM_SECO)
    col = mix(col, T.AREIA, smooth(RIO_W / 2 + 3, RIO_W / 2 + 0.8, dRio(x, z)))
    return mul(col, 0.94 + 0.12 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mul(mix(T.CAPIM, T.CAPIM_SECO, noise(x * 0.03, 1, z * 0.03)), 0.95), fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  river(c, RIO, RIO_W, { y: -0.45, deep: T.AGUA_FUNDA, shallow: T.AGUA_RASA, foam: T.ESPUMA })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inMesa(x, z) && dRio(x, z) > RIO_W / 2 + 1 + pad
  // bosques de outono por máscara (2 espécies + arbustos), blocos vermelhos perto do caminho
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 11, (x, z, r) => {
    if (!ok(x, z, 0.8) || noise(x * 0.07 + 3, 5.5, z * 0.07) < 0.43) return
    T.arvoreOutono(c, x, z, 4 + r(2) * 2.6, r(4) * 99, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 31, (x, z, r) => {
    if (!ok(x, z, 0.4)) return
    const near = P.dWalk(x, z) < 8 || inMesa(x, z, 1.4)
    if (r(1) > (near ? 0.35 : 0.08)) return
    T.blocoVerm(c, x, z, 0.6 + r(2) * 1.4, r(3) * 99)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.4, 23, (x, z, r) => {
    if (!ok(x, z, 0.2)) return
    const near = inMesa(x, z, 1.35) || noise(x * 0.07 + 3, 5.5, z * 0.07) > 0.36 || P.dWalk(x, z) < 5
    if (!near || r(1) < 0.6) return
    T.arbusto(c, x, z, 0.45 + r(2) * 0.5, r(4) * 99, lod)
  })
  if (!lod)
    scatter(-H + 3, -H + 3, H - 3, H - 3, 2.6, 51, (x, z, r) => {
      if (P.dWalk(x, z) < 2.6 || inMesa(x, z, 1.02) || dRio(x, z) < RIO_W / 2 + 0.8) return
      if (r(1) > (P.dWalk(x, z) < 5 ? 0.5 : 0.12)) return
      T.pampa(c, x, z, 0.5 + r(2) * 0.5, r(3) * 99)
    })
  // a BEIRA das refs: rocha vermelha, arbusto amarelo e pampa colados no caminho (2,6–5 m), em grupos
  F.aoLongoDoCaminho(CAMINHO, 1, (x, z, dx, dz, dist) => {
    const nx = dz, nz = -dx, d = Math.round(dist)
    for (const s of [-1, 1]) {
      const q = (d * 7 + (s > 0 ? 3 : 0)) % 17
      if (q === 0) {
        const rx = x + nx * 4.6 * s, rz = z + nz * 4.6 * s
        if (P.livre(rx, rz, 0.9) && !blocked(c, rx, rz, 1)) T.blocoVerm(c, rx, rz, 1.3 + (d % 3) * 0.35, d * 3 + s)
      } else if (q === 5 || q === 11) {
        const bx = x + nx * 3.4 * s, bz = z + nz * 3.4 * s
        if (P.livre(bx, bz, -0.6) && !blocked(c, bx, bz, 0.3)) T.arbusto(c, bx, bz, 0.55, d * 5 + s, lod)
      } else if (q === 8 && !lod) {
        const px = x + nx * 3 * s, pz = z + nz * 3 * s
        if (P.livre(px, pz, -0.9) && !blocked(c, px, pz, 0.2)) T.pampa(c, px, pz, 0.8, d + s)
      } else if (q === 14) {
        const sx2 = x + nx * 3.1 * s, sz2 = z + nz * 3.1 * s
        if (P.livre(sx2, sz2, -0.8) && !blocked(c, sx2, sz2, 0.3)) T.blocoVerm(c, sx2, sz2, 0.45, d * 11 + s, false)
      }
    }
  })
  return c
}
