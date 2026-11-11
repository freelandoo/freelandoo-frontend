// MAR DE GELO · cena 2 (setores 4–7, chefe no 7) — "cavernas de coral morto".
// Ref: ref/dominios/gelo-2.png. A caverna é feita de paredões de gelo altos dos dois lados e ARCOS
// de gelo com pingentes por cima do caminho (o motor não tem teto: a câmera de terceira pessoa
// precisa do céu, que aqui é azul-petróleo escuro como o fundo de uma gruta). Marcos: os arcos, as
// conchas gigantes abertas, os corais brancos e rosa e o chão de gelo em placas.

import { noise, type RGB } from "../kit"
import { Cena, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as G from "./tema-gelo"

export const meta = {
  ceu: [0.08, 0.22, 0.32] as RGB,
  nevoa: [0.16, 0.4, 0.5] as RGB,
  area: AREA,
  luz: { hemi: 1.05, sol: 0.4, ceu: [0.62, 0.9, 1] as RGB, chao: [0.3, 0.5, 0.62] as RGB, solCor: [0.7, 0.95, 1] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [4, -50], [28, -40], [50, -20], [42, 4], [14, 10], [-14, 2], [-40, 12], [-46, 34], [-26, 50], [0, 46], [16, 60], [-4, 66], [-16, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("gelo-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.36, 0.56], tArena: 0.84 })
  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  // arcos de gelo por cima do caminho (as bocas das galerias)
  for (const t of [0.035, 0.26, 0.47, 0.7, 0.95]) {
    const p = P.at(t)
    P.reserva(p.x, p.z, 7)
    G.arcoGelo(c, p.x, p.z, p.ang, 7.6, 9 + (t * 10) % 3, lod)
  }
  // paredões altos: borda + maciços no meio (as "paredes" da caverna)
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 13) return
    paredes.push(G.paredaoGelo(c, { x, z, rx: 7 + noise(x, 1, z) * 3, rz: 6 + noise(z, 2, x) * 3, h: 14 + noise(x * 0.3, 3, z * 0.3) * 8, seed: k + 20, lod }))
  })
  scatter(-H + 12, -H + 12, H - 12, H - 12, 15, 9, (x, z, r) => {
    if (!P.livre(x, z, 9) || r(1) > 0.45) return
    paredes.push(G.paredaoGelo(c, { x, z, rx: 5 + r(2) * 3, rz: 4 + r(3) * 3, h: 10 + r(4) * 9, seed: r(5) * 99, lod }))
    G.pingentes(c, x, z, 10, 3, lod ? 0 : 4, r(6) * 99)
  })
  G.fundoGelo(c, 6, G.GELO_CL)

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const color = (x: number, z: number): RGB => {
    // chão de gelo em placas hexagonais (rachaduras claras) com neve nas beiras das paredes
    let col = G.marGelo(x, z, noise)
    if (inParede(x, z, 1.4)) col = mix(col, G.NEVE, 0.7)
    col = mix(col, G.GELO_CL, P.aberto(x, z) * 0.25)
    col = trilha(col, x, z, P, mix(G.NEVE, G.GELO, 0.3), 2.1, G.GELO_CL)
    return mul(col, 0.95 + 0.08 * noise(x * 0.9, 2.2, z * 0.9))
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => G.GELO_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z)
  // conchas gigantes viradas para o caminho, perto das clareiras
  for (const cl of [...P.clareiras, { x: P.arena.x, z: P.arena.z, r: P.arena.r, setor: 7 }]) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + cl.setor * 0.7
      const x = cl.x + Math.cos(a) * (cl.r + 3.5), z = cl.z + Math.sin(a) * (cl.r + 3.5)
      if (ok(x, z, 0.5)) G.concha(c, x, z, 1.8 + (k % 2), Math.atan2(cl.x - x, cl.z - z), lod)
    }
  }
  // corais (branco 55% / rosa 45%) em grupos; cristais de gelo ao pé das paredes
  scatter(-H + 3, -H + 3, H - 3, H - 3, 3.6, 41, (x, z, r) => {
    if (!ok(x, z, 0.2)) return
    const grupo = noise(x * 0.09 + 5, 1.5, z * 0.09) > 0.5
    if (r(1) > (grupo ? 0.32 : P.dWalk(x, z) < 6 ? 0.1 : 0.02)) return
    G.coral(c, x, z, 1.2 + r(2) * 2.6, r(3) < 0.55 ? G.CORAL_B : G.CORAL_R, r(4) * 99, lod)
  })
  scatter(-H + 3, -H + 3, H - 3, H - 3, 4.5, 42, (x, z, r) => {
    if (!ok(x, z, 0.2) || r(1) > (inParede(x, z, 1.5) ? 0.5 : 0.04)) return
    G.cristalGelo(c, x, z, 0.8 + r(2) * 1.6, r(3) * 99, lod)
  })
  return c
}
