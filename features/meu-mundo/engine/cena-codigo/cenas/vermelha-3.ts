// FLORESTA VERMELHA DE VARKOS · cena 3 (setores 8–10: bando no 8, o PORTA-ESTANDARTE guarda a porta no 9,
// VARKOS no 10) — "a Fortaleza do Leão". A trilha sai do bosque para a PRAÇA DE GUERRA diante da fortaleza preta
// e vermelha (pecas/castelo-varkos.ts), entre dois RIOS DE LAVA que descem dos lados do castelo como fosso;
// alameda de estandartes na reta final, braseiros na praça e o brasão do leão no alto da menagem.

import { type RGB } from "../kit"
import { Cena, distPath, ground, scatter, type XZ } from "../kit-cena"
import { mix, smooth } from "../kit-natureza"
import { AREA, H, aoLongoDaBorda, planta } from "../dominio"
import { casteloVarkos } from "../pecas/castelo-varkos"
import * as T from "./tema-vermelha"
import { balizasDaArena, balizasDoCaminho } from "../neon-dominio"

export const meta = {
  ceu: T.CEU,
  nevoa: T.NEVOA,
  area: AREA,
  luz: T.LUZ,
  triBloco: T.TRI_BLOCO,
  astro: { dir: [0.5, 0.1, 1] as RGB, r: 0.07, cor: [1, 0.62, 0.32] as RGB },
  pontos: ["entrada", "saida", "guardiao", "deus"],
  setores: [8, 9, 10],
}

const CAMINHO: XZ[] = [[-56, -73], [-52, -48], [-26, -40], [4, -46], [34, -34], [44, -12], [22, -2], [0, 6], [0, 24], [0, 44], [0, 56]]
// os dois rios de lava que descem dos lados da fortaleza (fosso) e somem na borda
const LAVA_O: XZ[] = [[-36, 78], [-40, 40], [-52, 20], [-66, 6], [-78, 2]]
const LAVA_L: XZ[] = [[36, 78], [40, 40], [56, 26], [70, 30], [78, 34]]

export function montar(lod = 0): Cena {
  const c = new Cena("vermelha-3", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [8, 9, 10], boss: 9, deus: 10, tZonas: [0.28], castelo: { w: 56, d: 40, patio: 18 } })
  balizasDoCaminho(c, P, "vermelha", lod, { meia: 2.55 })
  const K = P.castelo!
  casteloVarkos(c, K, lod)
  const lava = (x: number, z: number) => Math.min(distPath(x, z, LAVA_O), distPath(x, z, LAVA_L))
  const noCastelo = (x: number, z: number, m = 6) => Math.abs(x - K.x) < K.w / 2 + m && Math.abs(z - K.z) < K.d / 2 + m
  const ok = T.okDe(c, P, (x, z) => lava(x, z) > 6 && !noCastelo(x, z))

  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || lava(x, z) < 8 || noCastelo(x, z, 4)) return
    if (k % 3 === 0) T.paredao(c, { x, z, rx: 6 + (k % 4), rz: 5 + (k % 3), h: 8 + (k % 5) * 2, seed: k + 80, lod })
    else if (k % 3 === 1) T.colunas(c, x, z, 3, 7, k + 80, lod)
  })
  T.fundoFloresta(c, 27)
  T.fundoVulcao(c, 12, [-150, 110], T.NEVOA)

  const color = T.corDoChao(P, (x, z, col) => {
    const d = lava(x, z)
    col = mix(col, [0.05, 0.03, 0.03], smooth(6, 3.5, d))
    col = mix(col, [0.5, 0.14, 0.04], smooth(5, 3, d) * 0.45)
    // a praça de guerra diante do castelo: anel de pedra preta com o círculo vermelho (o fim da Gincana)
    const dp = Math.hypot(x - P.arena.x, z - P.arena.z)
    const ring = smooth(0.3, 0, Math.abs(dp - P.arena.r * 0.85)) + smooth(0.22, 0, Math.abs(dp - P.arena.r * 0.45))
    return mix(col, [0.55, 0.06, 0.05], Math.min(1, ring) * (dp < P.arena.r + 1 ? 1 : 0))
  })
  const height = (x: number, z: number) => -0.5 * smooth(5, 2.5, lava(x, z))
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => T.CHAO_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  T.rioLava(c, LAVA_O, 6.5)
  T.rioLava(c, LAVA_L, 6.5)

  // alameda de estandartes na reta final (x = 0, z de 8 a 40): pares frente a frente, pano para a trilha
  for (let z = 10; z <= 40; z += 7.5) {
    for (const s of [-1, 1]) {
      const x = s * 5.2
      if (ok(x, z, 0.2)) T.estandarte(c, x, z, 5.6, s > 0 ? -Math.PI / 2 : Math.PI / 2, 300 + z * 3 + s, lod)
    }
  }
  // braseiros em volta da praça
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3, R = P.arena.r + 2.5
    const x = P.arena.x + Math.cos(a) * R, z = P.arena.z + Math.sin(a) * R
    if (ok(x, z, 0.3)) T.braseiro(c, x, z, 1.2, lod)
  }
  T.beiraDeGuerra(c, P, ok, lod, 41, 16)
  T.bosques(c, P, ok, lod, 53)
  scatter(-H + 4, -H + 4, H - 4, H - 4, 9, 36, (x, z, r) => {
    if (!ok(x, z, 1) || r(1) > 0.16) return
    T.pedraEsc(c, x, z, 0.8 + r(2) * 1.4, r(3) * 99)
  })
  T.lajesPretas(c, -H, -H, H, H, 1.9, 43, (x, z) => P.dWalk(x, z) < 4.2 || P.aberto(x, z) > 0.6, lod)
  balizasDaArena(c, P, "vermelha", lod)
  return c
}
