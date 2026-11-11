// FLORESTA DA LUA · cena 3 (setores 8–10: bando no 8, guardião no 9, NOCTIS no 10) — "bosque do
// sono + castelo de Noctis". Refs: ref/dominios/floresta-3.png e castelo-noctis.png.
// Marcos: o CASTELO DA LUA SOMBRIA no fim (visível desde a entrada, com a lua crescente no topo),
// o caminho de lajes violeta, as lanternas de cristal penduradas nas árvores e a névoa baixa.
// Castelo: muralha azul-noite com ameias, torres de telhado cônico azul, janelas violeta acesas,
// bandeiras com a lua, menagem com o crescente de prata e a travessia acesa no fundo do pátio.
// Mapa (1 letra = 16 m): S entrada, 8 clareira, G guardião, K castelo (pátio = salão do deus)
//   R T K K K K K T T R
//   T . K K K K K . . T
//   R . . . G . . . . R
//   T . . . | . . . . T
//   R . 8 . | . . . . R
//   T S . . . . . . . T

import { noise, type RGB, type V3 } from "../kit"
import { Cena, ground, scatter, type XZ } from "../kit-cena"
import { blob, face, mesa, mix, mul, smooth, tube } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import { castelo, type CasteloEstilo } from "../castelo"
import * as F from "./tema-floresta"
import { portal } from "./floresta-1"

export const meta = {
  ceu: [0.12, 0.12, 0.36] as RGB,
  nevoa: [0.24, 0.22, 0.5] as RGB,
  area: AREA,
  luz: F.LUZ,
  astro: { ...F.LUA, dir: [0.05, 0.55, 1] as RGB, r: 0.13 },
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[-50, -73], [-48, -50], [-22, -42], [8, -48], [36, -36], [42, -14], [20, -2], [0, 6], [0, 24], [0, 44], [0, 56]]

export const NOCTIS: CasteloEstilo = {
  pedra: [0.24, 0.26, 0.5],
  pedraEsc: [0.14, 0.15, 0.32],
  quina: [0.72, 0.74, 0.9],
  telhado: [0.14, 0.17, 0.44],
  telhadoHi: [0.26, 0.31, 0.62],
  luz: [0.82, 0.72, 1],
  metal: [0.78, 0.8, 0.92],
  bandeira: [0.12, 0.13, 0.36],
  cobertura: "cone",
  lados: 6,
  alto: 1.1,
}

export function montar(lod = 0): Cena {
  const c = new Cena("floresta-3", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.26], castelo: { w: 50, d: 40, patio: 18 } })
  const K = P.castelo!
  portal(c, CAMINHO[0], CAMINHO[1], lod, true)

  // ── o castelo de Noctis + a lua crescente no topo da menagem ──
  const A = castelo(c, K, NOCTIS, lod)
  crescente(c, A.menagem, 5.5, lod)
  for (const t of A.torres) if (!lod) lancaPrata(c, t)

  const cliffs: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(14, 6, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 9 || (Math.abs(x - K.x) < K.w / 2 + 4 && Math.abs(z - K.z) < K.d / 2 + 4)) return
    if (k % 3 === 2) cliffs.push(mesa(c.geo(x, z), { x, z, rx: 7 + noise(x, 1, z) * 4, rz: 6 + noise(z, 2, x) * 4, h: 8 + noise(x * 0.3, 3, z * 0.3) * 9, strata: F.ROCHA, seed: k + 80, lod, grass: F.MUSGO }))
    else F.arvoreLua(c, x, z, 18 + noise(x * 0.2, 4, z * 0.2) * 8, k * 3.3 + 9, lod, F.COPA2)
  })
  F.fundoFloresta(c, 13)

  const grove = (x: number, z: number) => noise(x * 0.05 + 4, 6.1, z * 0.05)
  const cliffIn = (x: number, z: number) => cliffs.some((m) => m.inside(x, z, 1.15))
  const color = (x: number, z: number): RGB => {
    let col = mix(F.GRAMA, F.GRAMA_CL, smooth(0.35, 0.72, noise(x * 0.09, 8.4, z * 0.09)))
    col = mix(col, F.GRAMA_ESC, smooth(0.5, 0.75, grove(x, z)) * 0.7)
    col = mix(col, mix(F.LAJE, F.LAJE_ESC, 0.4), P.aberto(x, z) * 0.7)
    if (cliffIn(x, z)) col = mix(col, F.TERRA_ESC, 0.5)
    // caminho de LAJES violeta: lajes de 1,6 m com junta escura
    const j = Math.min(Math.abs(((x * 0.62 + z * 0.1) % 1.6 + 1.6) % 1.6 - 0.8), Math.abs(((z * 0.62 - x * 0.1) % 1.6 + 1.6) % 1.6 - 0.8))
    const laje = mix(F.LAJE_ESC, mix(F.LAJE, [0.62, 0.58, 0.8], noise(Math.floor(x / 1.6), 1, Math.floor(z / 1.6)) * 0.5), smooth(0.02, 0.1, j))
    col = trilha(col, x, z, P, laje, 2.3, F.GRAMA_ESC)
    return mul(col, 0.94 + 0.12 * noise(x * 0.8, 2.2, z * 0.8))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mix(F.GRAMA_ESC, F.GRAMA, noise(x * 0.02, 1, z * 0.02) * 0.6), fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !cliffIn(x, z)
  // árvores colossais com lanternas de cristal nos galhos (as perto do caminho)
  scatter(-H + 8, -H + 8, H - 8, H - 8, 9, 13, (x, z, r) => {
    if (!ok(x, z, 2.5) || grove(x, z) < 0.44) return
    const h = 14 + r(1) * 8
    F.arvoreLua(c, x, z, h, r(2) * 99, lod, r(3) < 0.5 ? F.COPA : F.COPA2)
    if (!lod && P.dWalk(x, z) < 14) for (let k = 0; k < 2; k++) F.lanterna(c, x + (k ? 2.6 : -2.2), z + (k ? -1.4 : 1.8), h * 0.42 - k * 0.8, 0.5, r(4) * 99 + k)
  })
  scatter(-H + 6, -H + 6, H - 6, H - 6, 6, 23, (x, z, r) => {
    const gv = grove(x, z)
    if (!ok(x, z, 1) || gv < 0.3 || gv > 0.5 || r(1) < 0.4) return
    F.arvoreMedia(c, x, z, 5.5 + r(2) * 2.5, r(3) * 99, lod)
  })
  // postes de pedra com lanterna dos dois lados do caminho de lajes (marcam o caminho até o castelo)
  for (let t = 0.06; t < 0.95; t += 0.065) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 3.6 * s, z = p.z - p.dx * 3.6 * s
      if (!ok(x, z, -2.2)) continue
      tube(c.geo(x, z), [x, 0, z], [x, 1.6, z], 0.22, 0.18, 5, () => F.PEDRA, true)
      c.block(x, z, 0.25, 0.25, 1.6)
      if (!lod) F.lanterna(c, x, z, 1.95, 0.32, t * 100 + s)
    }
  }
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 33, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > (P.dWalk(x, z) < 8 ? 0.26 : 0.1)) return
    F.rochedo(c, x, z, 0.9 + r(2) * 2, r(3) * 99)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.4, 43, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (P.dWalk(x, z) < 6 ? 0.25 : 0.07)) return
    F.moita(c, x, z, 0.5 + r(2) * 0.6, r(3) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 2.6, 45, (x, z, r) => {
    if (!ok(x, z, -0.2) || r(1) > (P.dWalk(x, z) < 5 ? 0.12 : 0.025)) return
    F.buque(c, x, z, 0.42 + r(2) * 0.3, r(3) * 99)
  })
  // névoa baixa: lençóis claros rasos entre as árvores (só perto)
  if (!lod)
    scatter(-H + 6, -H + 6, H - 6, H - 6, 11, 61, (x, z, r) => {
      if (!ok(x, z, 0) || r(1) > 0.35) return
      blob(c.geo(x, z), [x, 0.15, z], [3 + r(2) * 3, 0.35, 2 + r(3) * 2], { dark: [0.42, 0.42, 0.66], mid: [0.52, 0.52, 0.76], hi: [0.6, 0.6, 0.84] }, r(4) * 99)
    })
  if (!lod)
    scatter(-H + 3, -H + 3, H - 3, H - 3, 2.8, 53, (x, z, r) => {
      if (P.dWalk(x, z) < 2.8 || !ok(x, z, -2) || r(1) > (P.dWalk(x, z) < 5 ? 0.5 : 0.16)) return
      F.capim(c, x, z, 0.35 + r(2) * 0.35, r(3) * 99)
    })
  return c
}

/** A lua crescente de prata no topo da menagem (aro claro + miolo aceso). */
function crescente(c: Cena, base: V3, r: number, lod: number) {
  const [x, y0, z] = base
  const g = c.geo(x, z)
  const G = c.glow(x, z)
  tube(g, [x, y0, z], [x, y0 + 4, z], 0.35, 0.2, 5, () => NOCTIS.metal, false)
  const cy = y0 + 4 + r
  const n = lod ? 8 : 14
  for (let k = 0; k < n; k++) {
    const a0 = -Math.PI * 0.7 + (k / n) * Math.PI * 1.4, a1 = -Math.PI * 0.7 + ((k + 1) / n) * Math.PI * 1.4
    const out = (a: number, rr: number): V3 => [x + Math.sin(a) * rr, cy + Math.cos(a) * rr, z]
    const inn = (a: number) => { const w = 0.55 * Math.cos(a * 0.7); return out(a, r * (0.62 + 0.38 * (1 - w))) }
    for (const s of [-0.12, 0.12]) {
      const sh = (p: V3): V3 => [p[0], p[1], p[2] + s]
      face(g, [sh(out(a0, r * 1.06)), sh(out(a1, r * 1.06)), sh(out(a1, r)), sh(out(a0, r))], NOCTIS.metal, [0, 0, Math.sign(s)])
    }
    face(G, [out(a0, r), out(a1, r), inn(a1), inn(a0)], [0.9, 0.86, 1], [0, 0, -1])
  }
}

/** Ponta de prata no alto de cada torre (só perto). */
function lancaPrata(c: Cena, t: V3) {
  tube(c.geo(t[0], t[2]), [t[0], t[1] + 6, t[2]], [t[0], t[1] + 9.5, t[2]], 0.14, 0.02, 4, () => NOCTIS.metal, true)
}
