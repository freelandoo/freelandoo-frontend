// FLORESTA DA LUA · cena 1 (setores 1–3, chefe no 3) — "a borda da mata de troncos de prata".
// Ref: pipeline/pecas-codigo/ref/dominios/floresta-1.png (ficha do ambiente em tema-floresta.ts).
// Marcos: o arco de pedras da lua na entrada (volta à praça), o rochedo-trono do chefe na arena,
// a lagoa acesa no fim do desvio e o portal das árvores gêmeas na saída.
// Mapa (1 letra = 16 m; S = entrada, E = saída, 1/2 = clareiras, C = arena, L = lagoa):
//   R R T T T R T T R E
//   T . . C . . . T . R
//   R T . . . 2 . . . T
//   T . . . . . . L L R
//   R . 1 . . . . . . T
//   T . . . . . . . . R
//   R S T T R T T R T T

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as F from "./tema-floresta"
import * as LP from "../pecas/floresta-lua"

export const meta = {
  ceu: F.CEU,
  nevoa: F.NEVOA,
  area: AREA,
  luz: F.LUZ,
  astro: F.LUA,
  pontos: ["entrada", "saida", "chefe"],
  triBloco: F.TRI_BLOCO,
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[-56, -73], [-54, -54], [-40, -38], [-14, -34], [14, -40], [40, -30], [50, -8], [34, 8], [6, 6], [-22, 12], [-46, 24], [-50, 44], [-34, 58], [-6, 56], [22, 60], [46, 62], [58, 73]]
const DESVIO: XZ[] = [[34, 8], [50, 22], [56, 36]]

export function montar(lod = 0): Cena {
  const c = new Cena("floresta-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, desvios: [DESVIO], setores: [1, 2, 3], boss: 3, tZonas: [0.2, 0.47], tArena: 0.8 })
  F.minucia((x, z) => P.dWalk(x, z) < 13) // a minúcia completa só onde o jogador passa perto
  const lagoa = { x: 58, z: 44, r: 6 }
  P.reserva(lagoa.x, lagoa.z, lagoa.r + 2)

  // ── portais: entrada (arco de pedras da lua) e saída (árvores gêmeas) ──
  portal(c, CAMINHO[0], CAMINHO[1], lod, true)
  portal(c, CAMINHO[CAMINHO.length - 1], CAMINHO[CAMINHO.length - 2], lod, false)

  // ── borda: paredões de rocha e árvores colossais alternados ──
  const cliffs: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(14, 6, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 9) return
    if (k % 3 === 0) {
      const m = F.paredao(c, x, z, 7 + noise(x, 1, z) * 4, 6 + noise(z, 2, x) * 4, 8 + noise(x * 0.3, 3, z * 0.3) * 8, k, lod)
      cliffs.push(m)
    } else F.arvoreLua(c, x, z, 18 + noise(x * 0.2, 4, z * 0.2) * 8, k * 7.3, lod)
  })
  F.fundoFloresta(c, 3)

  // ── marcos da ref 1: o PLATÔ com as três árvores (visto da trilha, no fim de uma reta) e o ARCO DE
  // PEDRAS no fundo; procura um lugar livre perto do caminho (14–30 m) para cada um ──
  const marco = (w: number, d: number, dMin: number, dMax: number, seed: number) => {
    for (let k = 0; k < 400; k++) {
      const t = 0.1 + (k % 40) / 50, p = P.at(t)
      const s = k % 2 ? 1 : -1, off = dMin + ((k * 7) % 11) / 10 * (dMax - dMin)
      const x = p.x + p.dz * off * s, z = p.z - p.dx * off * s
      const ang = Math.atan2(p.x - x, p.z - z)
      let ok = P.beira(x, z) > Math.max(w, d) / 2 + 4
      for (const [u, v] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        if (!ok) break
        const px = x + Math.cos(ang) * u * (w / 2) + Math.sin(ang) * v * (d / 2), pz = z - Math.sin(ang) * u * (w / 2) + Math.cos(ang) * v * (d / 2)
        if (!P.livre(px, pz, 1.5) || blocked(c, px, pz, 1)) ok = false
      }
      if (ok) return { x, z, ang, seed }
    }
    return null
  }
  const mt = marco(18, 12, 16, 26, 7)
  if (mt) F.trioPlato(c, mt.x, mt.z, -mt.ang + Math.PI, 7, lod)
  const ma = marco(11, 7, 18, 30, 3)
  if (ma) F.arcoPedras(c, ma.x, ma.z, ma.ang, 3, lod)

  // ── chão ──
  const grove = (x: number, z: number) => noise(x * 0.045 + 2, 1.7, z * 0.045)
  const color = (x: number, z: number): RGB => {
    let col = mix(F.GRAMA, F.GRAMA_CL, smooth(0.35, 0.72, noise(x * 0.09, 0.4, z * 0.09)))
    col = mix(col, F.GRAMA_ESC, smooth(0.5, 0.75, grove(x, z)) * 0.75)
    col = mix(col, F.GRAMA_CL, P.aberto(x, z) * 0.45)
    if (cliffs.some((m) => m.inside(x, z, 1.25))) col = mix(col, F.TERRA_ESC, 0.55)
    // trilha de TERRA (refs 1 e 2): rosada, com manchas e a beira mais escura; lajes só na cena 3
    col = trilha(col, x, z, P, mix(F.TRILHA, F.TRILHA_ESC, smooth(0.45, 0.8, noise(x * 0.16, 7.1, z * 0.16)) * 0.55), 2.6, F.TRILHA_ESC)
    const dl = Math.hypot(x - lagoa.x, z - lagoa.z)
    col = mix(col, F.FLOR, smooth(lagoa.r + 1.2, lagoa.r + 0.3, dl) * 0.25)
    return mul(col, 0.94 + 0.12 * noise(x * 0.8, 2.2, z * 0.8))
  }
  const height = (x: number, z: number) => -0.6 * smooth(lagoa.r + 0.5, lagoa.r - 1.5, Math.hypot(x - lagoa.x, z - lagoa.z))
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: (x, z) => mix(F.GRAMA_ESC, F.GRAMA, noise(x * 0.02, 1, z * 0.02) * 0.6), fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  // a lagoa: espelho escuro com brilho na margem
  lagoaAcesa(c, lagoa.x, lagoa.z, lagoa.r, lod)

  const cliffIn = (x: number, z: number) => cliffs.some((m) => m.inside(x, z, 1.15))
  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !cliffIn(x, z)

  // ── árvores colossais em bosques; médias na borda dos bosques ──
  scatter(-H + 8, -H + 8, H - 8, H - 8, 13.5, 11, (x, z, r) => {
    if (!ok(x, z, 2.5) || grove(x, z) < 0.46) return
    F.arvoreLua(c, x, z, 14 + r(1) * 8, r(2) * 99, lod, r(3) < 0.75 ? F.COPA : F.COPA2)
  })
  scatter(-H + 6, -H + 6, H - 6, H - 6, 9, 21, (x, z, r) => {
    const gv = grove(x, z)
    if (!ok(x, z, 1) || gv < 0.32 || gv > 0.5 || r(1) < 0.35) return
    F.arvoreMedia(c, x, z, 5.5 + r(2) * 2.5, r(3) * 99, lod, r(4) < 0.6 ? F.COPA2 : F.COPA)
  })
  // ── rochedos: perto do caminho (o "perto" de cada vista) e em grupos ──
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 31, (x, z, r) => {
    if (!ok(x, z, 0.4)) return
    const nearPath = P.dWalk(x, z) < 8
    if (r(1) > (nearPath ? 0.32 : 0.12)) return
    F.rochedo(c, x, z, (nearPath ? 1.1 : 0.8) + r(2) * (nearPath ? 1.4 : 2.4), r(3) * 99)
  })
  // ── arena do chefe: anel de rochedos altos e menires (o cenário sobe em volta) ──
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3
    const x = P.arena.x + Math.cos(a) * (P.arena.r + 3), z = P.arena.z + Math.sin(a) * (P.arena.r + 3)
    if (P.dWalk(x, z) < 3.4) continue
    if (k % 2) F.menir(c, x, z, 3.5 + (k % 3), a + Math.PI, k, lod)
    else F.rochedo(c, x, z, 1.6 + (k % 3) * 0.5, 50 + k)
  }
  // ── arbustos e flores acesas: beira do caminho, das clareiras e da lagoa ──
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.4, 41, (x, z, r) => {
    if (!P.livre(x, z, 0.2) || cliffIn(x, z)) return
    const edge = P.dWalk(x, z) < 6 || P.aberto(x, z) > 0.05
    if (r(1) > (edge ? 0.3 : 0.08)) return
    F.moita(c, x, z, 0.5 + r(2) * 0.6, r(3) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 2.6, 43, (x, z, r) => {
    if (P.dWalk(x, z) < 2.7 || cliffIn(x, z) || P.beira(x, z) < 2) return
    const dl = Math.hypot(x - lagoa.x, z - lagoa.z)
    if (dl < lagoa.r + 0.6) return
    const want = P.dWalk(x, z) < 5 ? 0.2 : dl < lagoa.r + 6 ? 0.3 : P.aberto(x, z) > 0.2 ? 0.05 : 0.015
    if (r(1) > want) return
    F.buque(c, x, z, 0.42 + r(2) * 0.3, r(3) * 99)
  })
  if (!lod)
    scatter(-H + 3, -H + 3, H - 3, H - 3, 2.8, 51, (x, z, r) => {
      if (P.dWalk(x, z) < 2.6 || cliffIn(x, z) || Math.hypot(x - lagoa.x, z - lagoa.z) < lagoa.r + 0.5) return
      if (r(1) > (P.dWalk(x, z) < 5 ? 0.6 : 0.2)) return
      F.capim(c, x, z, 0.35 + r(2) * 0.35, r(3) * 99)
    })
  // troncos caídos (um em cada clareira, na beira) — só fora da zona do bando
  for (const cl of P.clareiras) {
    const a = Math.atan2(cl.z, cl.x) + 1.2
    const x = cl.x + Math.cos(a) * (cl.r + 3), z = cl.z + Math.sin(a) * (cl.r + 3)
    if (P.livre(x, z, 1.5) && !cliffIn(x, z)) F.troncoCaido(c, x, z, 5, a, cl.setor, lod)
  }
  // a árvore colossal da lagoa (o fim do desvio)
  F.arvoreLua(c, lagoa.x + 8, lagoa.z + 9, 24, 777, lod)
  // o caminho de LAJES soltas da cena 3 (geometria 3 cm acima: a junta é o chão aparecendo), no desvio também
  // (polimento 14/11: sem lajes nas cenas 1 e 2 — a ref é trilha de terra)
  return c
}

/** Portal de dois menires altos e um crescente aceso por cima; a passagem fica no vão. */
export function portal(c: Cena, p: XZ, q: XZ, lod: number, lua: boolean) {
  const ang = Math.atan2(q[0] - p[0], q[1] - p[1])
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  const w = 4.4
  for (const s of [-1, 1]) {
    const x = p[0] + sx * w * s, z = p[1] + sz * w * s
    if (lua) F.menir(c, x, z, 6.5, ang, 90 + s, lod)
    else F.arvoreLua(c, x + sx * 2 * s, z + sz * 2 * s, 20, 300 + s, lod, F.COPA2)
  }
  if (!lua) return
  // crescente aceso entre os menires (no glow, sem colisão: o vão é livre)
  const G = c.glow(p[0], p[1])
  const n = 9
  for (let k = 0; k < n; k++) {
    const a0 = Math.PI * (0.12 + (0.76 * k) / n), a1 = Math.PI * (0.12 + (0.76 * (k + 1)) / n)
    const P0 = (a: number, r: number): [number, number, number] => [p[0] + sx * Math.cos(a) * r, 5.4 + Math.sin(a) * r * 0.9, p[1] + sz * Math.cos(a) * r]
    const A = P0(a0, 3.6), B = P0(a1, 3.6), C = P0(a1, 3.0 + 0.3 * Math.sin(a1)), D = P0(a0, 3.0 + 0.3 * Math.sin(a0))
    // as duas faces (quem chega e quem volta veem o crescente)
    G.quad(A, B, C, D, [0.86, 0.88, 1])
    G.quad(D, C, B, A, [0.86, 0.88, 1])
  }
}

/** Lagoa: disco escuro com anel claro na margem (abaixo do chão). */
export function lagoaAcesa(c: Cena, x: number, z: number, r: number, lod: number) {
  const g = c.geo(x, z)
  const n = lod ? 10 : 16
  const mid = g.v([x, -0.42, z], [0, 1, 0], F.AGUA_FUNDA)
  const ring: number[] = []
  const rim: number[] = []
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    ring.push(g.v([x + Math.cos(a) * r * 0.75, -0.42, z + Math.sin(a) * r * 0.75], [0, 1, 0], F.AGUA_RASA))
    rim.push(g.v([x + Math.cos(a) * (r + 0.3), -0.42, z + Math.sin(a) * (r + 0.3)], [0, 1, 0], F.ESPUMA))
  }
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    g.i.push(mid, ring[j], ring[k], ring[k], ring[j], rim[j], ring[k], rim[j], rim[k])
    g.i.push(mid, ring[k], ring[j], ring[k], rim[j], ring[j], ring[k], rim[k], rim[j])
  }
  c.blockOval(x, z, r, r, 1)
}
