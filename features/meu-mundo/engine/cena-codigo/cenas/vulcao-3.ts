// VULCÃO DE KRAGOR · cena 3 (setores 8–10: bando no 8, guardião no 9, KRAGOR no 10) — "cratera +
// Castelo de Basalto". Refs: ref/dominios/vulcao-3.png e castelo-kragor.png. Marcos: a FORTALEZA
// INFERNAL (basalto negro, pináculos vermelhos, janelas de fogo, os dois CHIFRES na menagem e quedas
// de lava dos lados), os martelos gigantes acorrentados, os braseiros e os porta-armas na praça.

import { noise, type RGB, type V3 } from "../kit"
import { Cena, blocked, distPath, ground, scatter, type XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { face, mix, mul, smooth, tube } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import { castelo, type CasteloEstilo } from "../castelo"
import * as V from "./tema-vulcao"
import { bandeira } from "./tema-fabrica"

export const meta = {
  ceu: [0.5, 0.18, 0.16] as RGB,
  nevoa: [0.46, 0.2, 0.18] as RGB,
  area: AREA,
  luz: V.LUZ,
  triBloco: V.TRI_BLOCO,
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[-54, -73], [-52, -48], [-24, -40], [6, -46], [34, -34], [44, -12], [22, -2], [0, 6], [0, 24], [0, 44], [0, 56]]

export const KRAGOR: CasteloEstilo = {
  pedra: [0.22, 0.2, 0.24],
  pedraEsc: [0.14, 0.12, 0.16],
  quina: [0.5, 0.3, 0.26],
  telhado: [0.3, 0.1, 0.1],
  telhadoHi: [0.55, 0.14, 0.12],
  luz: [1, 0.48, 0.12],
  metal: [0.85, 0.55, 0.2],
  bandeira: V.BANDEIRA,
  cobertura: "cone",
  lados: 6,
  alto: 1.15,
}

export function montar(lod = 0): Cena {
  const c = new Cena("vulcao-3", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 52, d: 40, patio: 18 } })
  const K = P.castelo!
  const A = castelo(c, K, KRAGOR, lod)
  chifres(c, [A.menagem[0], A.menagem[1], A.arco[2] + 1.5], lod)
  // quedas de lava dos dois lados da fortaleza (no glow, encostadas nas muralhas da ala)
  for (const s of [-1, 1]) {
    const x = K.porta.x + s * (K.w / 2 - 1), z = K.porta.z + 2.6
    const G = c.glow(x, z)
    face(G, [[x - 1.2, 9, z - 1.6], [x + 1.2, 9, z - 1.6], [x + 1.6, 0.05, z - 1.8], [x - 1.6, 0.05, z - 1.8]], [V.LAVA_CL, V.LAVA_CL, V.LAVA, V.LAVA], [0, 0.2, -1])
  }
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || (Math.abs(x - K.x) < K.w / 2 + 5 && Math.abs(z - K.z) < K.d / 2 + 5)) return
    if (k % 3) V.paredao(c, { x, z, rx: 7 + noise(x, 1, z) * 4, rz: 6 + noise(z, 2, x) * 3, h: 10 + noise(x * 0.3, 3, z * 0.3) * 10, seed: k + 60, lod })
    else V.colunas(c, x, z, 3, 10, k + 60, lod)
  })
  V.fundoVulcao(c, 13, [-70, 160])

  const color = (x: number, z: number): RGB => {
    let col = mix(V.PEDRA, V.PEDRA_ESC, smooth(0.4, 0.75, noise(x * 0.08, 7.2, z * 0.08)))
    col = mix(col, V.LAVA_ESC, smooth(0.72, 0.86, noise(x * 0.12, 2, z * 0.12)) * 0.4)
    col = mix(col, V.PEDRA_CL, P.aberto(x, z) * 0.35)
    const gx = ((x % 2.4) + 2.4) % 2.4, gz = ((z % 2.4) + 2.4) % 2.4
    const j = Math.min(gx, 2.4 - gx, gz, 2.4 - gz)
    const laje = mix(V.PEDRA_ESC, mix(V.PEDRA_CL, [0.52, 0.46, 0.46], noise(Math.floor(x / 2.4), 8, Math.floor(z / 2.4))), smooth(0.03, 0.1, j))
    col = trilha(col, x, z, P, laje, 2.4, V.PEDRA_ESC)
    // junta das lajes (o chão do caminho aparece entre elas): lava acesa
    col = mix(col, [1, 0.42, 0.08] as RGB, smooth(4.6, 4.2, P.dWalk(x, z)) * (1 - P.aberto(x, z) * 0.6))
    if (P.dWalk(x, z) < 4.4) return col
    return mul(col, 0.7 + 0.08 * noise(x * 0.9, 2.2, z * 0.9)) // o chão da ref é escuro: a luz vermelha forte o clareava demais
  }
  const LAVA: XZ[] = [[-76, 10], [-56, 16], [-40, 30], [-46, 52], [-30, 76]]
  const height = (x: number, z: number) => -0.5 * smooth(5, 2.5, distPath(x, z, LAVA))
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => V.PEDRA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  V.fissuras(c, P.at, lod ? 0 : 50, 9)
  V.rioLava(c, LAVA, 6)

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  // martelos gigantes acorrentados e braseiros ladeando o caminho
  for (let t = 0.08; t < 0.97; t += 0.12) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 8 * s, z = p.z - p.dx * 8 * s
      if (ok(x, z, 2.4)) V.marteloGigante(c, x, z, p.ang, lod)
    }
  }
  for (let t = 0.04; t < 0.98; t += 0.055) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 3.9 * s, z = p.z - p.dx * 3.9 * s
      if (ok(x, z, -1.9)) V.braseiro(c, x, z, 1, lod)
    }
  }
  // corredor de rocha até o castelo, com suportes de lanças, caixotes e cristais na beira
  V.corredor(c, P.path, ok, lod, 33, (x, z, ang, k) => {
    const q = k % 6
    if (q === 0) V.rackLancas(c, x, z, ang, lod)
    else if (q === 2 || q === 4) V.cristalFogo(c, x, z, 1 + (k % 3) * 0.3, k, lod)
    else V.caixote(c, x, z, 1.1, ang + k, lod)
  }, (x, z) => (P.castelo ? Math.abs(x - P.castelo.x) < P.castelo.w / 2 + 6 && Math.abs(z - P.castelo.z) < P.castelo.d / 2 + 6 : false), true)
  // porta-armas e bandeiras na praça da porta
  for (const s of [-1, 1]) {
    const x = P.arena.x + s * (P.arena.r + 2.5), z = P.arena.z
    if (ok(x, z, 0.5)) V.rackLancas(c, x, z, Math.PI / 2 * s, lod) // o suporte de lanças copiado
    bandeira(c, K.porta.x + s * 5.6, 6.4, K.porta.z - 1.7, Math.PI, 1.1)
  }
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 36, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > (P.dWalk(x, z) < 8 ? 0.5 : 0.12)) return
    V.pedraEsc(c, x, z, 0.8 + r(2) * 1.6, r(3) * 99)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 5, 37, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > 0.06) return
    V.cristalFogo(c, x, z, 0.8 + r(2) * 1.2, r(3) * 99, lod)
  })
  // piso de LAJES poligonais da ref no caminho (largura 9 m) e nas praças
  V.lajesPoligonais(c, -H, -H, H, H, 1.9, 43, (x, z) => P.dWalk(x, z) < 4.2 || P.aberto(x, z) > 0.6, lod)
  return c
}

/** Os dois chifres curvos no alto da menagem (gomos que sobem e se abrem). */
function chifres(c: Cena, m: V3, lod: number) {
  const [x, y, z] = m
  const g = c.geo(x, z)
  const n = lod ? 4 : 7
  for (const s of [-1, 1]) {
    let prev: V3 = [x + s * 3, y - 1, z]
    for (let k = 1; k <= n; k++) {
      const t = k / n
      const p: V3 = [x + s * (3 + Math.sin(t * 1.4) * 7), y - 1 + t * 12, z + Math.sin(t * 2) * 1.5]
      tube(g, prev, p, 1.3 * (1 - (t - 1 / n) * 0.85), 1.3 * (1 - t * 0.85), 6, (j) => (j % 2 ? mix(KRAGOR.pedra, KRAGOR.telhadoHi, t) : mix(KRAGOR.pedraEsc, KRAGOR.telhado, t)), k === n)
      prev = p
    }
  }
}

