// VULCÃO DE KRAGOR · cena 2 (setores 4–7, chefe no 7) — "forjas abandonadas e rios de lava".
// Ref: ref/dominios/vulcao-2.png. Marcos: os RIOS DE LAVA correndo ao lado do caminho, as forjas de
// basalto com a boca acesa e bandeiras vermelhas, as bigornas, as colunas hexagonais e as fissuras
// acesas nas lajes do caminho.

import { noise, type RGB } from "../kit"
import { Cena, blocked, distPath, ground, scatter, type XZ } from "../kit-cena"
import { mix, mul, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta, trilha } from "../dominio"
import * as V from "./tema-vulcao"
import { cabe } from "./tema-fabrica"

export const meta = {
  ceu: [0.56, 0.22, 0.18] as RGB,
  nevoa: [0.5, 0.24, 0.2] as RGB,
  area: AREA,
  luz: V.LUZ,
  triBloco: V.TRI_BLOCO,
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[0, -73], [-4, -48], [-30, -38], [-52, -16], [-44, 8], [-16, 12], [12, 4], [42, 14], [50, 38], [28, 54], [0, 48], [-18, 62], [2, 68], [12, 73]]
const LAVA1: XZ[] = [[24, -77], [20, -50], [30, -26], [20, -12], [-4, -18], [-26, -22]]
const LAVA2: XZ[] = [[-76, 30], [-50, 34], [-24, 30], [0, 30], [22, 28], [30, 40]]

export function montar(lod = 0): Cena {
  const c = new Cena("vulcao-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.37, 0.57], tArena: 0.84 })
  const dLava = (x: number, z: number) => Math.min(distPath(x, z, LAVA1), distPath(x, z, LAVA2))
  const paredes: { inside: (x: number, z: number, k?: number) => boolean }[] = []
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || dLava(x, z) < 6) return
    if (k % 2) paredes.push(V.paredao(c, { x, z, rx: 7 + noise(x, 1, z) * 4, rz: 6 + noise(z, 2, x) * 3, h: 10 + noise(x * 0.3, 3, z * 0.3) * 10, seed: k + 30, lod }))
    else V.colunas(c, x, z, 3.2, 9, k + 30, lod)
  })
  V.fundoVulcao(c, 8, [-60, 235], meta.nevoa)

  const inParede = (x: number, z: number, k = 1.12) => paredes.some((m) => m.inside(x, z, k))
  const height = (x: number, z: number) => -0.5 * smooth(5, 2.5, dLava(x, z))
  const color = (x: number, z: number): RGB => {
    let col = mix(V.PEDRA, V.PEDRA_ESC, smooth(0.4, 0.75, noise(x * 0.08, 5.2, z * 0.08)))
    col = mix(col, V.LAVA_ESC, smooth(6, 3, dLava(x, z)) * 0.55) // a pedra avermelha perto da lava
    if (inParede(x, z, 1.3)) col = mix(col, V.BASALTO, 0.6)
    col = mix(col, V.PEDRA_CL, P.aberto(x, z) * 0.3)
    const gx = ((x % 2.2) + 2.2) % 2.2, gz = ((z % 2.2) + 2.2) % 2.2
    const j = Math.min(gx, 2.2 - gx, gz, 2.2 - gz)
    const laje = mix(V.PEDRA_ESC, mix(V.PEDRA_CL, [0.5, 0.46, 0.48], noise(Math.floor(x / 2.2), 6, Math.floor(z / 2.2))), smooth(0.03, 0.1, j))
    col = trilha(col, x, z, P, laje, 2.2, V.PEDRA_ESC)
    // junta das lajes (o chão do caminho aparece entre elas): lava acesa
    col = mix(col, [1, 0.42, 0.08] as RGB, smooth(4.6, 4.2, P.dWalk(x, z)) * (1 - P.aberto(x, z) * 0.6))
    if (P.dWalk(x, z) < 4.4) return col
    return mul(col, 0.7 + 0.08 * noise(x * 0.9, 2.2, z * 0.9)) // o chão da ref é escuro: a luz vermelha forte o clareava demais
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => V.PEDRA_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  V.rioLava(c, LAVA1, 6)
  V.rioLava(c, LAVA2, 5)
  V.fissuras(c, P.at, lod ? 0 : 60, 7)

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !inParede(x, z) && dLava(x, z) > 4.2 + pad && !blocked(c, x, z, pad + 0.6)
  // forjas viradas para o caminho, com bandeira por cima da boca
  for (let t = 0.05; t < 0.96; t += 0.075) {
    const p = P.at(t)
    const s = Math.round(t * 40) % 2 ? 1 : -1
    const x = p.x + p.dz * 7 * s, z = p.z - p.dx * 7 * s
    const ang = Math.atan2(p.x - x, p.z - z)
    if (!cabe((a, b, pad) => ok(a, b, pad ?? 0), x - Math.sin(ang) * 2, z - Math.cos(ang) * 2, 7.6, 6, ang)) continue
    V.forjaArco(c, x - Math.sin(ang) * 1.5, z - Math.cos(ang) * 1.5, ang, lod)
    // barril e caixote encostados na forja
    const sx = -Math.cos(ang), sz = Math.sin(ang)
    if (ok(x + sx * 4.6, z + sz * 4.6, -1)) V.barril(c, x + sx * 4.6, z + sz * 4.6, 1.1, t * 99, lod)
    if (ok(x - sx * 4.6, z - sz * 4.6, -1)) V.caixote(c, x - sx * 4.6, z - sz * 4.6, 1.1, ang, lod)
    if (ok(x + Math.sin(ang) * 3.4 + Math.cos(ang) * 2, z + Math.cos(ang) * 3.4 - Math.sin(ang) * 2, 0)) V.bigorna(c, x + Math.sin(ang) * 3.4 + Math.cos(ang) * 2, z + Math.cos(ang) * 3.4 - Math.sin(ang) * 2, ang, lod)
  }
  // corredor de rocha e beira cheia (barris, caixotes com minério, cristais), abrindo nas forjas
  V.corredor(c, P.path, ok, lod, 22, (x, z, ang, k) => {
    const q = k % 5
    if (q === 0) V.barril(c, x, z, 1.1, k, lod)
    else if (q === 1 || q === 3) V.cristalFogo(c, x, z, 1 + (k % 3) * 0.3, k, lod)
    else V.caixote(c, x, z, 1.1, ang + k, lod)
  }, (x, z) => blocked(c, x, z, 3), true)
  // LANTERNAS-PEDESTAL dos dois lados do caminho a cada ~11 m (a ref: a fila de pedestais acesos)
  for (let t = 0.04; t < 0.97; t += 0.04) {
    const p = P.at(t)
    for (const s of [-1, 1]) {
      const x = p.x + p.dz * 3.3 * s, z = p.z - p.dx * 3.3 * s
      if (ok(x, z, -2.1)) V.lanternaPedestal(c, x, z, Math.atan2(p.x - x, p.z - z), lod)
    }
  }
  scatter(-H + 8, -H + 8, H - 8, H - 8, 9, 34, (x, z, r) => {
    if (!ok(x, z, 4) || r(1) > 0.5) return
    V.colunas(c, x, z, 2.4, 5 + r(2) * 4, r(3) * 99, lod)
  })
  scatter(-H + 4, -H + 4, H - 4, H - 4, 6, 35, (x, z, r) => {
    if (!ok(x, z, 0.4) || r(1) > (P.dWalk(x, z) < 8 ? 0.5 : 0.12)) return
    V.pedraEsc(c, x, z, 0.8 + r(2) * 1.6, r(3) * 99)
  })
  // piso de LAJES poligonais da ref no caminho (largura 9 m) e nas praças
  V.lajesPoligonais(c, -H, -H, H, H, 1.9, 42, (x, z) => P.dWalk(x, z) < 4.2 || P.aberto(x, z) > 0.6, lod)
  return c
}
