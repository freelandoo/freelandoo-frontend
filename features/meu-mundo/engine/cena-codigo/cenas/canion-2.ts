// CÂNION DAS TEMPESTADES · cena 2 (setores 4–7, chefe no 7) — "a Pista do Céu: trilhos esculpidos na
// rocha, raios ciano". Ref: ref/dominios/canion-2.png. Marcos: os TRILHOS da Pista do Céu correndo no
// alto sobre pilares e por um arco, raios ciano caindo nas agulhas, cristais acesos ao pé das rochas.
// Mapa (1 letra = 16 m): ═ = trilho no alto
//   M ═ ═ ═ C . . E M M
//   M . . . . ═ ═ . . M
//   . 7 . 6 . . . ═ . .
//   . . . . . . 5 ═ . M
//   M . 4 . . . . ═ . M
//   M M . S . M . ═ M M

import { noise, type RGB, type V3 } from "../kit"
import { Cena, distPath, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as T from "./tema-canion"

export const meta = {
  ceu: T.CEU_TEMP,
  nevoa: T.NEVOA_TEMP,
  area: AREA,
  luz: T.LUZ_TEMP,
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [-4, -50], [-30, -40], [-52, -20], [-44, 4], [-16, 10], [12, 2], [36, 12], [44, 34], [24, 50], [-2, 46], [-18, 60], [4, 66], [16, 73]]
/** A Pista do Céu (no alto): vem do leste, atravessa por cima do caminho e some no oeste. */
const TRILHO: V3[] = [[72, 10, -70], [62, 10, -40], [60, 11, -10], [62, 12, 18], [50, 12, 30], [30, 11, 26], [10, 10, 24], [-14, 10, 28], [-36, 11, 34], [-56, 12, 48], [-66, 12, 66]]

export function montar(lod = 0): Cena {
  const c = new Cena("canion-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.16, 0.36, 0.56], tArena: 0.84 })
  const mesas: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  const add = (ms: { inside: (x: number, z: number, k?: number) => boolean }[]) => mesas.push(...ms)
  const pilarOk = (x: number, z: number) => P.livre(x, z, 0.5) && P.beira(x, z) > 2

  T.trilhoCeu(c, TRILHO, lod, pilarOk)
  aoLongoDaBorda(19, 8, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 17) return
    if (k % 4 === 1) T.agulha(c, x, z, 18 + noise(x * 0.2, 1, z * 0.2) * 14, k, lod)
    else add(T.macico(c, x, z, 0.85 + noise(x * 0.1, 1, z * 0.1) * 0.7, k * 3 + 5, lod))
  })
  for (const [x, z, s] of [[-22, -16, 0.9], [20, -26, 1], [6, 30, 0.7], [-60, 22, 0.8], [52, -10, 0.8]] as const)
    if (P.livre(x, z, 9 * s)) add(T.macico(c, x, z, s, Math.round(x * 3 + z) + 7, lod))
  // agulhas com raio caindo (no alto, perto das vistas)
  const agulhas: [number, number, number][] = [[-30, -62, 24], [34, -60, 26], [-62, -40, 22], [58, 52, 28], [-40, 66, 24]]
  agulhas.forEach(([x, z, h], k) => {
    if (!P.livre(x, z, 3)) return
    T.agulha(c, x, z, h, 40 + k, lod)
    T.raio(c, x + 1.5, z, h + 26, h + 1, 60 + k)
    T.cristal(c, x + 3, z - 2, 1.8, 70 + k, lod)
  })
  // raios soltos no céu
  for (const [x, z] of [[-10, 74], [70, -20], [-74, 10]] as const) T.raio(c, x, z, 46, 22, x + z)
  T.fundoCanion(c, 9)

  const inMesa = (x: number, z: number, k = 1.12) => mesas.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    let col = mix(T.CAPIM, T.CAPIM_SECO, smooth(0.35, 0.7, noise(x * 0.1 + 2, 0.3, z * 0.1)))
    col = mix(col, T.CAPIM_ESC, smooth(0.6, 0.8, noise(x * 0.23, 3.7, z * 0.23)) * 0.6)
    if (inMesa(x, z, 1.3)) col = mix(col, T.TERRA_VERM, 0.7)
    col = mix(col, T.TERRA_VERM, smooth(4, 1, distPath(x, z, TRILHO.map((p) => [p[0], p[2]] as XZ))) * 0.35) // sombra/terra embaixo da pista
    col = mix(col, T.TERRA, P.aberto(x, z) * 0.35)
    col = trilha(col, x, z, P, T.TERRA, 2.1, T.CAPIM_SECO)
    return mul(col, 0.94 + 0.12 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mul(mix(T.CAPIM, T.CAPIM_SECO, noise(x * 0.03, 1, z * 0.03)), 0.9), fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inMesa(x, z)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 5.5, 12, (x, z, r) => {
    if (!ok(x, z, 0.8) || noise(x * 0.07 + 8, 5.5, z * 0.07) < 0.5) return
    T.arvoreOutono(c, x, z, 4 + r(2) * 2.6, r(4) * 99, lod)
  })
  // cristais ao pé das rochas e na beira do caminho (o ciano da tempestade)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 33, (x, z, r) => {
    if (!ok(x, z, 0.3)) return
    const foot = inMesa(x, z, 1.4)
    if (r(1) > (foot ? 0.4 : P.dWalk(x, z) < 7 ? 0.14 : 0.03)) return
    T.cristal(c, x, z, 0.7 + r(2) * 1.4, r(3) * 99, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 34, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > (P.dWalk(x, z) < 8 ? 0.3 : 0.08)) return
    T.blocoVerm(c, x, z, 0.6 + r(2) * 1.4, r(3) * 99)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.6, 24, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (P.dWalk(x, z) < 5 || inMesa(x, z, 1.35) ? 0.35 : 0.06)) return
    T.arbusto(c, x, z, 0.45 + r(2) * 0.5, r(4) * 99, lod)
  })
  if (!lod)
    scatter(-H + 3, -H + 3, H - 3, H - 3, 2.6, 52, (x, z, r) => {
      if (P.dWalk(x, z) < 2.6 || inMesa(x, z, 1.02) || r(1) > (P.dWalk(x, z) < 5 ? 0.5 : 0.12)) return
      T.pampa(c, x, z, 0.5 + r(2) * 0.5, r(3) * 99)
    })
  return c
}
