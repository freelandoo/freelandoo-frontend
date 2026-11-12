// CÂNION DAS TEMPESTADES · cena 3 (setores 8–10: bando no 8, guardião no 9, ZÉPHYRA no 10) — "topo
// das tempestades + castelo de Zéphyra". Refs: ref/dominios/canion-3.png e castelo-zephyra.png.
// Marcos: a ESTRADA DE LAJES creme ladeada de pedestais com cristal, as torres-moinho em ruína,
// as agulhas vermelhas com raios e o CASTELO DA TEMPESTADE CRISTALINA no fim: muralha vermelha e
// creme, torres de telhado vermelho com pontas de cristal ciano, as ASAS brancas e vermelhas na
// menagem e o redemoinho de nuvem por cima.

import { noise, type RGB, type V3 } from "../kit"
import { Cena, ground, scatter, type XZ } from "../kit-cena"
import { face, mix, mul, smooth, tube } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import { casteloZephyra } from "../pecas/castelo-zephyra"
import * as T from "./tema-canion"
import * as F from "./tema-fabrica"
import * as P2 from "../pecas/canion"

export const meta = {
  triBloco: T.TRI_BLOCO,
  ceu: [0.17, 0.2, 0.36] as RGB,
  nevoa: [0.32, 0.34, 0.5] as RGB,
  area: AREA,
  luz: T.LUZ_TEMP,
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[-54, -73], [-52, -48], [-26, -40], [2, -46], [30, -38], [44, -18], [24, -4], [0, 4], [0, 24], [0, 44], [0, 56]]


export function montar(lod = 0): Cena {
  const c = new Cena("canion-3", lod, 32, -16)
  // pegada da CIDADELA copiada (pecas/castelo-zephyra.ts): 62 m com os faróis; pátio 18 (o salão da deusa)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 62, d: 40, patio: 18 } })
  const K = P.castelo!
  casteloZephyra(c, K, lod)
  T.raio(c, K.x - 18, K.z, 60, 24, 3)
  T.raio(c, K.x + 22, K.z - 4, 56, 20, 4)

  const mesas: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(19, 8, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 17 || (Math.abs(x - K.x) < K.w / 2 + 5 && Math.abs(z - K.z) < K.d / 2 + 5)) return
    if (k % 3 === 0) T.agulha(c, x, z, 18 + noise(x * 0.2, 1, z * 0.2) * 16, k, lod)
    else mesas.push(...T.macico(c, x, z, 0.8 + noise(x * 0.1, 1, z * 0.1) * 0.6, k * 3 + 9, lod))
  })
  // torres-moinho em ruína dos dois lados da estrada (o "meio" das vistas)
  for (const [t, s, h] of [[0.12, 1, 9], [0.3, -1, 11], [0.48, 1, 10], [0.64, -1, 12]] as const) {
    const p = P.at(t)
    const x = p.x + p.dz * 11 * s, z = p.z - p.dx * 11 * s
    if (P.livre(x, z, 3)) T.moinho(c, x, z, h, Math.atan2(p.x - x, p.z - z), t * 100, lod)
  }
  T.fundoCanion(c, 15)
  P2.horizonteCanion(c, 15, meta.nevoa, true)

  const inMesa = (x: number, z: number, k = 1.12) => mesas.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    let col = mix(T.CAPIM, T.CAPIM_SECO, smooth(0.35, 0.7, noise(x * 0.1 + 7, 0.3, z * 0.1)))
    col = mix(col, T.TERRA_VERM, smooth(0.62, 0.82, noise(x * 0.07, 3.7, z * 0.07)) * 0.5)
    if (inMesa(x, z, 1.3)) col = mix(col, T.TERRA_VERM, 0.7)
    col = mix(col, T.LAJE_ESC, P.aberto(x, z) * 0.6)
    // estrada de LAJES creme (2 m) com junta escura
    const gx = ((x % 2) + 2) % 2, gz = ((z % 2) + 2) % 2
    const j = Math.min(Math.abs(gx - 1), Math.abs(gz - 1))
    const laje = mix(T.LAJE_ESC, mix(T.LAJE, [0.95, 0.9, 0.8], noise(Math.floor(x / 2), 3, Math.floor(z / 2)) * 0.6), smooth(0.86, 0.95, 1 - j))
    col = trilha(col, x, z, P, laje, 2.6, T.LAJE_ESC)
    return mul(col, 0.95 + 0.1 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mul(mix(T.CAPIM, T.TERRA_VERM, noise(x * 0.03, 1, z * 0.03) * 0.6), 0.85), fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inMesa(x, z)
  // a ESTRADA de lajes creme (ref 3) por cima do chão pintado
  P2.estradaLajes(c, CAMINHO, 5.6, 21, (x, z) => P.dWalk(x, z) < 2.9 && P.aberto(x, z) < 0.5, lod)
  // o CORREDOR: pedestais aos pares a cada 12 m (a 3,9 m), bloquetes de pedra na beira (3,4 m), e logo atrás
  // as rochas vermelhas com cristal e arbustos; um arco em ruína de vez em quando
  let nArco = 0
  F.aoLongoDoCaminho(CAMINHO, 1, (x, z, dx, dz, dist) => {
    const nx = dz, nz = -dx
    const d = Math.round(dist)
    for (const s of [-1, 1]) {
      if (d % 12 === 0) {
        const px = x + nx * 3.9 * s, pz = z + nz * 3.9 * s
        if (ok(px, pz, -1.6)) T.pedestal(c, px, pz, dist + s, lod)
      } else if (d % 2 === 0) {
        const bx = x + nx * 3.6 * s, bz = z + nz * 3.6 * s
        if (ok(bx, bz, -1.8)) P2.bloquete(c, bx, bz, 1.2 + ((d * 7 + s) % 5) * 0.12, Math.atan2(dx, dz), d * 3 + s, lod)
      }
      if (d % 9 === 4) {
        const rx = x + nx * 6.2 * s, rz = z + nz * 6.2 * s
        if (ok(rx, rz, 0.6)) {
          T.blocoVerm(c, rx, rz, 1.4 + ((d + s) % 3) * 0.4, d * 5 + s)
          T.cristal(c, rx - dx * 1.6, rz - dz * 1.6, 1.1 + ((d * 3) % 4) * 0.2, d + s, lod)
        }
      }
      if (d % 7 === 2) {
        const ax2 = x + nx * 5.2 * s, az2 = z + nz * 5.2 * s
        if (ok(ax2, az2, 0.2)) T.arbusto(c, ax2, az2, 0.6, d * 9 + s, lod)
      }
      if (d % 37 === 18 && nArco++ < 3) {
        const ax3 = x + nx * 9 * s, az3 = z + nz * 9 * s
        if (ok(ax3, az3, 2.6)) P2.arcoRuina(c, ax3, az3, Math.atan2(-nx * s, -nz * s), lod)
      }
    }
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 35, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > (P.dWalk(x, z) < 8 ? 0.32 : 0.1)) return
    T.blocoVerm(c, x, z, 0.6 + r(2) * 1.5, r(3) * 99)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 36, (x, z, r) => {
    if (!ok(x, z, 0.3) || r(1) > (inMesa(x, z, 1.4) ? 0.35 : 0.05)) return
    T.cristal(c, x, z, 0.7 + r(2) * 1.2, r(3) * 99, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6.5, 13, (x, z, r) => {
    if (!ok(x, z, 0.8) || noise(x * 0.07 + 1, 5.5, z * 0.07) < 0.56) return
    T.arvoreOutono(c, x, z, 3.6 + r(2) * 2.2, r(4) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.6, 25, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (P.dWalk(x, z) < 6 ? 0.3 : 0.06)) return
    T.arbusto(c, x, z, 0.45 + r(2) * 0.5, r(4) * 99, lod)
  })
  if (!lod)
    scatter(-H + 3, -H + 3, H - 3, H - 3, 2.8, 53, (x, z, r) => {
      if (P.dWalk(x, z) < 3 || inMesa(x, z, 1.02) || r(1) > (P.dWalk(x, z) < 6 ? 0.4 : 0.1)) return
      T.pampa(c, x, z, 0.5 + r(2) * 0.5, r(3) * 99)
    })
  return c
}

/** As asas da menagem: duas asas de penas em degraus (branco por cima, vermelho por baixo). */
