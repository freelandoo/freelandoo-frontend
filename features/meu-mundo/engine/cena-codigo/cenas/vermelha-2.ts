// FLORESTA VERMELHA DE VARKOS · cena 2 (setores 4–7, chefe no 7) — "o vale das brasas".
// O fundo da floresta, onde o fogo da guerra ainda corre por baixo: RIO DE LAVA pela borda oeste com um braço
// que desce entre os bosques, FISSURAS acesas na trilha, o ACAMPAMENTO caído do exército de Varkos (roda de
// estandartes em volta de cada clareira, braseiros, armas em feixe) e os bosques mais fechados que na cena 1.
// Mesma ficha de ambiente da cena 1 (tema-vermelha.ts); aqui mais lava e mais bandeira, menos chão aberto.

import { type RGB } from "../kit"
import { Cena, distPath, ground, scatter, type XZ } from "../kit-cena"
import { mix, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import * as T from "./tema-vermelha"
import { balizasDaArena, balizasDoCaminho } from "../neon-dominio"

export const meta = {
  ceu: T.CEU,
  nevoa: T.NEVOA,
  area: AREA,
  luz: T.LUZ,
  triBloco: T.TRI_BLOCO,
  astro: { dir: [0.5, 0.1, 1] as RGB, r: 0.07, cor: [1, 0.62, 0.32] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [4, 5, 6, 7],
}

const CAMINHO: XZ[] = [[-56, -73], [-52, -48], [-26, -40], [4, -48], [34, -38], [50, -14], [40, 8], [12, 2], [-16, 12], [-26, 34], [-8, 50], [20, 44], [44, 54], [52, 66], [56, 73]]
const LAVA: XZ[] = [[-77, -78], [-72, -40], [-75, -6], [-70, 30], [-74, 60], [-70, 78]]
const BRACO: XZ[] = [[-72, -6], [-60, -12], [-52, -4], [-46, 6], [-48, 18]]

export function montar(lod = 0): Cena {
  const c = new Cena("vermelha-2", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [4, 5, 6, 7], boss: 7, tZonas: [0.15, 0.37, 0.57], tArena: 0.84 })
  balizasDoCaminho(c, P, "vermelha", lod, { meia: 2.35 })
  const lava = (x: number, z: number) => Math.min(distPath(x, z, LAVA), distPath(x, z, BRACO))
  const ok = T.okDe(c, P, (x, z) => lava(x, z) > 6)

  aoLongoDaBorda(16, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || lava(x, z) < 8) return
    if (k % 2 === 0) T.paredao(c, { x, z, rx: 6 + (k % 4), rz: 5 + (k % 3), h: 9 + (k % 5) * 2, seed: k + 40, lod })
    else T.colunas(c, x, z, 3, 8, k + 40, lod)
  })
  T.fundoFloresta(c, 17)
  T.fundoVulcao(c, 9, [40, 175], T.NEVOA)

  const color = T.corDoChao(P, (x, z, col) => {
    const d = lava(x, z)
    col = mix(col, [0.05, 0.03, 0.03], smooth(6, 3.5, d))
    return mix(col, [0.5, 0.14, 0.04], smooth(5, 3, d) * 0.45)
  })
  const height = (x: number, z: number) => -0.5 * smooth(5, 2.5, lava(x, z))
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => T.CHAO_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  T.rioLava(c, LAVA, 7)
  T.rioLava(c, BRACO, 4.5)
  // o fogo por baixo: fissuras acesas na trilha
  T.fissuras(c, P.at, 26, 5)

  // o ACAMPAMENTO caído: estandartes em roda em volta de cada clareira (pano para dentro) e um braseiro
  for (const z0 of P.clareiras) {
    const n = 5
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + z0.setor * 0.7, R = z0.r + 2.2
      const x = z0.x + Math.cos(a) * R, z = z0.z + Math.sin(a) * R
      if (!ok(x, z, 0.3)) continue
      if (k % 2) T.braseiro(c, x, z, 1.1, lod)
      else T.estandarte(c, x, z, 4.6 + (k % 3) * 0.5, Math.atan2(z0.x - x, z0.z - z), z0.setor * 10 + k, lod)
    }
  }
  T.beiraDeGuerra(c, P, ok, lod, 23, 18)
  T.bosques(c, P, ok, lod, 37, 1.1)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 9, 35, (x, z, r) => {
    if (!ok(x, z, 1) || r(1) > 0.16) return
    T.pedraEsc(c, x, z, 0.8 + r(2) * 1.4, r(3) * 99)
  })
  T.lajesPretas(c, -H, -H, H, H, 1.9, 42, (x, z) => P.dWalk(x, z) < 4.2 || P.aberto(x, z) > 0.6, lod)
  balizasDaArena(c, P, "vermelha", lod)
  return c
}
