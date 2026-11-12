// FLORESTA DA LUA · cena 2 (setores 4–7, chefe no 7) — "clareiras e Pedraverde (o Golem sentado)".
// Ref: pipeline/pecas-codigo/ref/dominios/floresta-2.png (ficha em tema-floresta.ts).
// Marcos: o riacho azul na borda leste, PEDRAVERDE (anel de menires com runas verdes e o trono de
// pedra onde o Golem senta, no fim do desvio — setor 6, capítulo 8), cogumelos acesos gigantes nas
// clareiras e o portal de árvores gêmeas na saída.
// Mapa (1 letra = 16 m): S entrada (sul), E saída (norte), 4/5/6 clareiras, C arena, P Pedraverde, ~ riacho
//   R T T . C . E T ~ R
//   T . . . . . . . ~ T
//   R . . 6 . . P P ~ R
//   T . 5 . . . . . ~ T
//   R . . . . 4 . . ~ R
//   T T R . S T T R ~ T

import { noise, type RGB } from "../kit"
import { Cena, distPath, ground, river, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as F from "./tema-floresta"
import { portal } from "./floresta-1"
import * as LP from "../pecas/floresta-lua"

export const meta = {
  ceu: F.CEU,
  nevoa: F.NEVOA,
  area: AREA,
  luz: F.LUZ,
  astro: { ...F.LUA, dir: [-0.35, 0.4, 1] as RGB },
  pontos: ["entrada", "saida", "chefe", "pedraverde", "golem"],
  triBloco: F.TRI_BLOCO,
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [2, -54], [-20, -40], [-46, -30], [-52, -8], [-32, 4], [-4, 0], [20, -6], [30, 12], [14, 30], [-16, 34], [-34, 50], [-16, 64], [8, 62], [22, 73]]
const DESVIO: XZ[] = [[30, 12], [37, 22]]
const RIACHO: XZ[] = [[58, -77], [51, -50], [59, -20], [53, 10], [61, 40], [56, 77]]
const RIACHO_W = 6
const PEDRA = { x: 40, z: 29, r: 8 }

export function montar(lod = 0): Cena {
  const c = new Cena("floresta-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, desvios: [DESVIO], setores: [4, 5, 6, 7], boss: 7, tZonas: [0.13, 0.33, 0.55], tArena: 0.84 })
  F.minucia((x, z) => P.dWalk(x, z) < 13) // a minúcia completa só onde o jogador passa perto
  P.reserva(PEDRA.x, PEDRA.z, PEDRA.r + 1)
  // Pedraverde: o lugar do setor 6 (o servidor confere o setor) e o trono do Golem, de frente para quem chega
  c.ponto("pedraverde", PEDRA.x - 1.5, PEDRA.z - 2.5, 0)
  const golem = { x: PEDRA.x + 2.6, z: PEDRA.z + 3 }
  c.ponto("golem", golem.x - 1.2, golem.z - 1.4, Math.atan2(DESVIO[1][0] - golem.x, DESVIO[1][1] - golem.z))

  portal(c, CAMINHO[0], CAMINHO[1], lod, false)
  portal(c, CAMINHO[CAMINHO.length - 1], CAMINHO[CAMINHO.length - 2], lod, false)

  const dRio = (x: number, z: number) => distPath(x, z, RIACHO)
  const cliffs: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(14, 6, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 9 || dRio(x, z) < RIACHO_W / 2 + 4) return
    if (k % 3 === 1) cliffs.push(F.paredao(c, x, z, 7 + noise(x, 1, z) * 4, 6 + noise(z, 2, x) * 4, 7 + noise(x * 0.3, 3, z * 0.3) * 9, k + 40, lod))
    else F.arvoreLua(c, x, z, 18 + noise(x * 0.2, 4, z * 0.2) * 8, k * 5.1 + 3, lod)
  })
  F.fundoFloresta(c, 8)

  const grove = (x: number, z: number) => noise(x * 0.05 + 9, 2.7, z * 0.05)
  const cliffIn = (x: number, z: number) => cliffs.some((m) => m.inside(x, z, 1.15))
  const height = (x: number, z: number) => -0.7 * smooth(RIACHO_W / 2 + 2.2, RIACHO_W / 2 - 0.5, dRio(x, z))
  const color = (x: number, z: number): RGB => {
    let col = mix(F.GRAMA, F.GRAMA_CL, smooth(0.35, 0.72, noise(x * 0.09, 5.4, z * 0.09)))
    col = mix(col, F.GRAMA_ESC, smooth(0.5, 0.75, grove(x, z)) * 0.7)
    col = mix(col, F.GRAMA_CL, P.aberto(x, z) * 0.45)
    // Pedraverde: chão de musgo claro com lajes
    const dp = Math.hypot(x - PEDRA.x, z - PEDRA.z)
    col = mix(col, mix(F.MUSGO, F.LAJE, smooth(0.4, 0.6, noise(x * 0.6, 3, z * 0.6))), smooth(PEDRA.r + 1, PEDRA.r - 1.5, dp) * 0.75)
    if (cliffIn(x, z)) col = mix(col, F.TERRA_ESC, 0.5)
    col = trilha(col, x, z, P, mix(F.LAJE_ESC, F.GRAMA_ESC, 0.35), 2.5, F.GRAMA_ESC) // junta escura sob as lajes soltas (como na cena 3)
    col = mix(col, F.TERRA_ESC, smooth(RIACHO_W / 2 + 3, RIACHO_W / 2 + 0.6, dRio(x, z)) * 0.8)
    return mul(col, 0.94 + 0.12 * noise(x * 0.8, 2.2, z * 0.8))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mix(F.GRAMA_ESC, F.GRAMA, noise(x * 0.02, 1, z * 0.02) * 0.6), fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  river(c, RIACHO, RIACHO_W, { y: -0.45, deep: F.AGUA_FUNDA, shallow: F.AGUA_RASA, foam: F.ESPUMA })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !cliffIn(x, z) && dRio(x, z) > RIACHO_W / 2 + 1.2 + pad
  // ── Pedraverde: anel de menires com runas (aberto para o desvio) e o trono do Golem ──
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI * 0.95 + (k / 8) * Math.PI * 1.6 + Math.PI * 0.62
    const x = PEDRA.x + Math.cos(a) * PEDRA.r, z = PEDRA.z + Math.sin(a) * PEDRA.r
    if (P.dWalk(x, z) < 3) continue
    F.menir(c, x, z, 3.2 + (k % 3) * 0.9, Math.atan2(PEDRA.x - x, PEDRA.z - z), 200 + k, lod)
  }
  trono(c, golem.x, golem.z, Math.atan2(DESVIO[1][0] - golem.x, DESVIO[1][1] - golem.z), lod)

  // ── vegetação (igual à cena 1, outra semente; cogumelos acesos nas clareiras) ──
  scatter(-H + 8, -H + 8, H - 8, H - 8, 12.5, 12, (x, z, r) => {
    if (!ok(x, z, 2.5) || grove(x, z) < 0.45) return
    F.arvoreLua(c, x, z, 14 + r(1) * 8, r(2) * 99, lod, r(3) < 0.7 ? F.COPA : F.COPA2)
  })
  scatter(-H + 6, -H + 6, H - 6, H - 6, 9, 22, (x, z, r) => {
    const gv = grove(x, z)
    if (!ok(x, z, 1) || gv < 0.3 || gv > 0.5 || r(1) < 0.35) return
    F.arvoreMedia(c, x, z, 5.5 + r(2) * 2.5, r(3) * 99, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 32, (x, z, r) => {
    if (!ok(x, z, 0.4)) return
    const nearPath = P.dWalk(x, z) < 8
    if (r(1) > (nearPath ? 0.3 : 0.12)) return
    F.rochedo(c, x, z, (nearPath ? 1.1 : 0.8) + r(2) * 2, r(3) * 99)
  })
  // cogumelos gigantes acesos em volta de cada clareira e da arena
  for (const cl of [...P.clareiras, { x: P.arena.x, z: P.arena.z, r: P.arena.r, setor: 7 }]) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + cl.setor
      const x = cl.x + Math.cos(a) * (cl.r + 3.2), z = cl.z + Math.sin(a) * (cl.r + 3.2)
      if (!ok(x, z, 0.2)) continue
      F.cogumelo(c, x, z, k % 2 ? 2.6 : 1.4, cl.setor * 10 + k, lod)
    }
  }
  // troncos caídos ao longo do riacho
  for (let k = 0; k < 5; k++) {
    const z = -60 + k * 28, x = 44 + (k % 2) * 3
    if (ok(x, z, 1)) F.troncoCaido(c, x, z, 6, 0.4 + k, k, lod)
  }
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.4, 42, (x, z, r) => {
    if (!ok(x, z, 0.2)) return
    if (r(1) > (P.dWalk(x, z) < 6 || P.aberto(x, z) > 0.05 ? 0.28 : 0.08)) return
    F.moita(c, x, z, 0.5 + r(2) * 0.6, r(3) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 2.6, 44, (x, z, r) => {
    if (P.dWalk(x, z) < 2.7 || cliffIn(x, z) || dRio(x, z) < RIACHO_W / 2 + 0.8 || P.beira(x, z) < 2 || Math.hypot(x - PEDRA.x, z - PEDRA.z) < PEDRA.r - 1) return
    const want = P.dWalk(x, z) < 5 ? 0.1 : dRio(x, z) < RIACHO_W / 2 + 5 ? 0.18 : 0.02
    if (r(1) > want) return
    F.buque(c, x, z, 0.42 + r(2) * 0.3, r(3) * 99)
  })
  if (!lod)
    scatter(-H + 3, -H + 3, H - 3, H - 3, 2.8, 52, (x, z, r) => {
      if (P.dWalk(x, z) < 2.6 || cliffIn(x, z) || dRio(x, z) < RIACHO_W / 2 + 0.6) return
      if (r(1) > (P.dWalk(x, z) < 5 ? 0.55 : 0.18)) return
      F.capim(c, x, z, 0.35 + r(2) * 0.35, r(3) * 99)
    })
  // o caminho de LAJES soltas da cena 3 (geometria 3 cm acima: a junta é o chão aparecendo), no desvio também;
  // fora das clareiras e do anel de Pedraverde (que tem o chão de lajes dele)
  const pula = (x: number, z: number) => P.aberto(x, z) > 0.4 || Math.hypot(x - PEDRA.x, z - PEDRA.z) < PEDRA.r + 1
  LP.lajesCaminho(c, CAMINHO, 2.2, 21, lod, pula)
  LP.lajesCaminho(c, DESVIO, 2.2, 22, lod, pula)
  return c
}

/** O trono de pedra do Golem: assento, encosto e braços, com runa acesa no encosto. */
function trono(c: Cena, x: number, z: number, ang: number, lod: number) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang)
  const back = (d: number): [number, number] => [x - fx * d, z - fz * d]
  // o assento fica atrás do ponto do Golem (ele senta de frente para o desvio)
  const [sx, sz] = back(0.4)
  F.rochedo(c, sx, sz, 1.1, 901, false)
  const [bx, bz] = back(1.9)
  F.menir(c, bx, bz, 4.6, ang, 902, lod)
  void g
  c.block(sx, sz, 1.2, 1.2, 1.2, ang)
}
