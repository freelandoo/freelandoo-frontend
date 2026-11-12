// MAR DE GELO · cena 2 (setores 4–7, chefe no 7) — "cavernas de coral morto".
// Ref: ref/dominios/gelo-2.png (peças copiadas em pecas/gelo.ts). A caverna é feita de penhascos altos dos
// dois lados, COLUNAS DE GELO aceso e ARCOS de rocha com neve e pingentes por cima do caminho (o motor não
// tem teto: a câmera de terceira pessoa precisa do céu, que aqui é azul-petróleo escuro como o fundo de
// uma gruta). Marcos: os arcos, as CONCHAS gigantes semiabertas, os CORAIS facetados brancos (em Y) e
// rosa (candelabro), as ESPONJAS em tubo, os cristais azul-royal, os BEIRAIS com cortina de pingentes e o
// chão de PLACAS de gelo com fendas acesas.

import { noise, type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as G from "./tema-gelo"

export const meta = {
  ceu: [0.08, 0.22, 0.32] as RGB,
  nevoa: [0.16, 0.4, 0.5] as RGB,
  area: AREA,
  luz: G.LUZ_CAVERNA,
  triBloco: G.TRI_BLOCO,
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [4, -50], [28, -40], [50, -20], [42, 4], [14, 10], [-14, 2], [-40, 12], [-46, 34], [-26, 50], [0, 46], [16, 60], [-4, 66], [-16, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("gelo-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.36, 0.56], tArena: 0.84 })
  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  // ARCOS de rocha por cima do caminho (as bocas das galerias)
  for (const t of [0.035, 0.26, 0.47, 0.7, 0.95]) {
    const p = P.at(t)
    P.reserva(p.x, p.z, 8)
    G.arcoCaverna(c, p.x, p.z, p.ang, 9, 8.5 + ((t * 10) % 2), Math.round(t * 50), lod)
  }
  // paredes da caverna: penhascos na borda e maciços no meio, com colunas de gelo aceso e beirais
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 13) return
    paredes.push(G.penhasco(c, { x, z, rx: 7 + noise(x, 1, z) * 3, rz: 6 + noise(z, 2, x) * 3, h: 13 + noise(x * 0.3, 3, z * 0.3) * 6, seed: k + 20, lod }))
  })
  scatter(-H + 12, -H + 12, H - 12, H - 12, 15, 9, (x, z, r) => {
    if (!P.livre(x, z, 9) || r(1) > 0.45) return
    paredes.push(G.penhasco(c, { x, z, rx: 5 + r(2) * 3, rz: 4 + r(3) * 3, h: 10 + r(4) * 7, seed: r(5) * 99, lod }))
  })
  G.horizonteGelo(c, { seed: 6, nevoa: meta.nevoa, noite: true, bruma: 0.55 })

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    // chão de gelo azul-turquesa em placas, neve nas beiras das paredes; o caminho é aceso nas fendas
    let col = mix([0.3, 0.66, 0.78] as RGB, [0.42, 0.78, 0.88] as RGB, noise(x * 0.1, 3, z * 0.1))
    if (inParede(x, z, 1.5)) col = mix(col, G.NEVE, 0.75)
    else if (noise(x * 0.06, 8, z * 0.06) > 0.6) col = mix(col, G.NEVE, 0.6)
    col = mix(col, G.GELO_CL, P.aberto(x, z) * 0.2)
    col = trilha(col, x, z, P, [0.36, 0.9, 1], 2.4, [0.3, 0.8, 0.95])
    return mul(col, 0.96 + 0.06 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => G.GELO_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  // PLACAS de gelo no caminho e nas clareiras (as fendas são o chão aceso aparecendo)
  G.placasCaminho(c, -H, -H, H, H, 4, 51, (x, z) => P.dWalk(x, z) < 4.2 || P.aberto(x, z) > 0.6, lod, [[0.5, 0.82, 0.92], [0.44, 0.76, 0.9], [0.58, 0.86, 0.95], [0.4, 0.72, 0.86]])

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z) && !blocked(c, x, z, pad + 0.4)
  // COLUNAS DE GELO e BEIRAIS com pingentes coladas nas paredes, viradas para o caminho
  for (let t = 0.06; t < 0.96; t += 0.07) {
    const p = P.at(t)
    const s = Math.round(t * 31) % 2 ? 1 : -1
    const x = p.x + p.dz * 9 * s, z = p.z - p.dx * 9 * s
    if (!ok(x, z, 1.5)) continue
    if (Math.round(t * 100) % 3 === 0) G.beiralPingentes(c, x, z, Math.atan2(p.x - x, p.z - z), 5 + (t * 13) % 2, 5.5, Math.round(t * 70), lod)
    else G.colunaGelo(c, x, z, 9 + ((t * 40) % 4), 1.5 + ((t * 7) % 0.8), Math.round(t * 90), lod)
  }
  // CONCHAS gigantes viradas para o caminho, perto das clareiras e da arena
  for (const cl of [...P.clareiras, { x: P.arena.x, z: P.arena.z, r: P.arena.r, setor: 7 }]) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + cl.setor * 0.7
      const x = cl.x + Math.cos(a) * (cl.r + 3.2), z = cl.z + Math.sin(a) * (cl.r + 3.2)
      if (ok(x, z, 1)) {
        G.conchaGigante(c, x, z, 1.3 + (k % 2) * 0.5, Math.atan2(cl.x - x, cl.z - z), lod)
        if (ok(x + 2.2, z + 0.6, 0.4)) G.esponjaTubo(c, x + 2.2, z + 0.6, 1 + (k % 2) * 0.3, k + cl.setor * 3, lod)
      }
    }
  }
  // CORAIS em grupos (branco em Y 55% / rosa candelabro 45%), esponjas e cristais azul-royal ao pé das paredes
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.4, 41, (x, z, r) => {
    if (!ok(x, z, 0.2)) return
    const grupo = noise(x * 0.09 + 5, 1.5, z * 0.09) > 0.5
    if (r(1) > (grupo ? 0.36 : P.dWalk(x, z) < 6 ? 0.12 : 0.03)) return
    if (r(3) < 0.5) G.coral(c, x, z, 2.4 + r(2) * 3.6, G.CORAL_B, G.CORAL_B_ESC, r(4) * 99, lod, "y")
    else G.coral(c, x, z, 2 + r(2) * 2.4, G.CORAL_R, G.CORAL_R_ESC, r(4) * 99, lod, "cand")
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4.2, 42, (x, z, r) => {
    if (!ok(x, z, 0.2)) return
    const pe = inParede(x, z, 1.5)
    if (r(1) < (pe ? 0.4 : 0.05)) G.cristalGelo(c, x, z, 1.4 + r(2) * 1.4, r(3) * 99, lod, G.AZUL_REAL, true, true)
    else if (r(1) < (pe ? 0.55 : 0.08)) G.esponjaTubo(c, x, z, 0.8 + r(2) * 0.6, r(3) * 99, lod)
    else if (r(1) < (pe ? 0.7 : 0.1)) G.rochaNeve(c, x, z, 0.9 + r(2) * 1.4, r(3) * 99, lod)
  })
  return c
}
