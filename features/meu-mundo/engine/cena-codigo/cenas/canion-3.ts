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
import { castelo, type CasteloEstilo } from "../castelo"
import * as T from "./tema-canion"

export const meta = {
  ceu: [0.17, 0.2, 0.36] as RGB,
  nevoa: [0.32, 0.34, 0.5] as RGB,
  area: AREA,
  luz: T.LUZ_TEMP,
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[-54, -73], [-52, -48], [-26, -40], [2, -46], [30, -38], [44, -18], [24, -4], [0, 4], [0, 24], [0, 44], [0, 56]]

export const ZEPHYRA: CasteloEstilo = {
  pedra: [0.7, 0.2, 0.18],
  pedraEsc: [0.48, 0.13, 0.12],
  quina: [0.94, 0.88, 0.8],
  telhado: [0.62, 0.14, 0.14],
  telhadoHi: [0.86, 0.26, 0.22],
  luz: [0.5, 0.98, 1],
  metal: [0.9, 0.84, 0.72],
  bandeira: [0.62, 0.12, 0.14],
  cobertura: "cone",
  lados: 6,
  alto: 1.1,
}

export function montar(lod = 0): Cena {
  const c = new Cena("canion-3", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 52, d: 40, patio: 18 } })
  const K = P.castelo!
  const A = castelo(c, K, ZEPHYRA, lod)
  asas(c, [A.menagem[0], A.menagem[1] - 1, A.arco[2] - 1.2], 10, lod)
  for (const t of A.torres) pontaCristal(c, t, lod)
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
  // pedestais com cristal a cada ~14 m dos dois lados da estrada
  for (let t = 0.05; t < 0.97; t += 0.05) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 4.4 * s, z = p.z - p.dx * 4.4 * s
      if (ok(x, z, -1.6)) T.pedestal(c, x, z, t * 10 + s, lod)
    }
  }
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
function asas(c: Cena, m: V3, L: number, lod: number) {
  const [x, y, z] = m
  const g = c.geo(x, z)
  const n = lod ? 4 : 7
  for (const s of [-1, 1]) {
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1)
      const ax = x + s * (2.5 + t * L * 0.25), ay = y - 3 + t * 2.4
      const tipX = x + s * (3 + L * (0.45 + t * 0.55)), tipY = y + 4 + t * 5 - (1 - t) * 3
      const col = k % 2 ? ZEPHYRA.quina : mix(ZEPHYRA.quina, ZEPHYRA.pedra, 0.65)
      for (const f of [-1, 1]) face(g, [[ax, ay, z + f * 0.1], [tipX, tipY, z + f * 0.1], [tipX - s * 3.4, tipY - 5.5, z + f * 0.1], [ax, ay - 3.2, z + f * 0.1]], col, [0, 0, f])
    }
    tube(g, [x + s * 2, y - 2.6, z], [x + s * (3 + L), y + 9, z], 0.4, 0.15, 4, () => ZEPHYRA.metal, true)
  }
}

/** Ponta de cristal ciano no alto do cone de cada torre. */
function pontaCristal(c: Cena, t: V3, lod: number) {
  const G = c.glow(t[0], t[2])
  const base = t[1] + 6.4, top = base + 3.2
  const n = lod ? 4 : 6
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, b = ((k + 1) / n) * Math.PI * 2
    const pa: V3 = [t[0] + Math.cos(a) * 0.45, base, t[2] + Math.sin(a) * 0.45], pb: V3 = [t[0] + Math.cos(b) * 0.45, base, t[2] + Math.sin(b) * 0.45]
    face(G, [pa, pb, [t[0], top, t[2]]], [T.CIANO, T.CIANO, T.CIANO_CL], [Math.cos((a + b) / 2), 0.3, Math.sin((a + b) / 2)])
  }
}
