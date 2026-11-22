// FLORESTA VERMELHA DE VARKOS · cena 1 (setores 1–3, chefe no 3) — "a orla do campo de guerra".
// Sem ref do Alex: a ficha veio do pedido (floresta de outono vermelha/laranja/ouro, chão PRETO, lava de Kragor,
// o castelo preto e vermelho na cena 3, o neon da Gincana e do Rolê). Marcos: o RIO DE LAVA que corre pela borda
// leste e corta para dentro num braço, os estandartes de guerra rasgados ao longo da trilha, as armas cravadas
// do campo de batalha antigo e o vulcão de Kragor no horizonte (o Leão marchou de lá).
//
// FICHA DO AMBIENTE
// Clima:      fim de tarde de outono, sol baixo laranja, névoa vinho; copas vivas sobre chão de cinza preta.
// Camadas:    (1) chão: cinza preta em 3 tons + tapete de folhas vinho/ferrugem em ilhas, trilha de cinza clara com
//             lajes de basalto; (2) relevo: paredões de basalto na borda; (3) lava: rio na borda leste + braço;
//             (4) vegetação: bordo rubro (60%), laranja (25%), ouro (15%) em BOSQUES com clareiras entre eles;
//             (5) objetos: estandartes, armas cravadas, tocos em brasa, braseiros; (6) fundo: floresta rubra na
//             névoa e o vulcão.
// Proporções: personagem 1,7 m; árvore 9–14 m (6–8 bonecos); estandarte 4,4–5,6 m; trilha 4,6 m.
// Cobertura:  ~40% bosque, 20% clareiras/arena, 15% trilha, 10% lava e margem, 15% chão aberto com folhiço.
// Fora:       folhas caindo (efeito do ambiente), bichos.

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
  astro: { dir: [-0.6, 0.1, 1] as RGB, r: 0.07, cor: [1, 0.62, 0.32] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

const CAMINHO: XZ[] = [[52, -73], [48, -50], [22, -42], [-8, -48], [-38, -38], [-50, -14], [-30, 0], [0, -4], [30, 6], [40, 30], [16, 46], [-14, 44], [-40, 54], [-50, 66], [-56, 73]]
// rio de lava na borda leste com um braço que entra até perto da clareira do meio (sem cruzar a trilha)
const LAVA: XZ[] = [[76, -78], [71, -46], [74, -18], [70, 14], [73, 44], [69, 78]]
const BRACO: XZ[] = [[71, -18], [62, -12], [56, -20], [52, -18]]

export function montar(lod = 0): Cena {
  const c = new Cena("vermelha-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [1, 2, 3], boss: 3, tZonas: [0.24, 0.5], tArena: 0.82 })
  balizasDoCaminho(c, P, "vermelha", lod, { meia: 2.35 })
  const lava = (x: number, z: number) => Math.min(distPath(x, z, LAVA), distPath(x, z, BRACO))
  const ok = T.okDe(c, P, (x, z) => lava(x, z) > 6)

  // borda: paredões de basalto e colunas, entre eles o bosque fecha
  aoLongoDaBorda(17, 7, (x, z, _a, k) => {
    if (P.dWalk(x, z) < 15 || lava(x, z) < 8) return
    if (k % 3 === 0) T.paredao(c, { x, z, rx: 6 + (k % 4), rz: 5 + (k % 3), h: 8 + (k % 5) * 2, seed: k, lod })
    else if (k % 3 === 1) T.colunas(c, x, z, 3, 7, k, lod)
  })
  T.fundoFloresta(c, 7)
  T.fundoVulcao(c, 4, [-40, 175], T.NEVOA)

  const color = T.corDoChao(P, (x, z, col) => {
    // margem da lava: crosta escura e o brilho do calor no chão
    const d = lava(x, z)
    col = mix(col, [0.05, 0.03, 0.03], smooth(6, 3.5, d))
    return mix(col, [0.5, 0.14, 0.04], smooth(5, 3, d) * 0.45)
  })
  const height = (x: number, z: number) => -0.5 * smooth(5, 2.5, lava(x, z))
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color, height })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => T.CHAO_ESC, fundo: true, y: -0.05, hole: [-H, -H, H, H] })
  T.rioLava(c, LAVA, 7)
  T.rioLava(c, BRACO, 4.5)

  // a beira da trilha: estandartes e armas cravadas
  T.beiraDeGuerra(c, P, ok, lod, 11)
  // braseiros na beira das clareiras (o acampamento do bando)
  for (const z0 of P.clareiras) {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + z0.setor, x = z0.x + Math.cos(a) * (z0.r + 1.5), z = z0.z + Math.sin(a) * (z0.r + 1.5)
      if (ok(x, z, 0.4)) T.braseiro(c, x, z, 1.1, lod)
    }
  }
  // bosques e o miúdo do chão
  T.bosques(c, P, ok, lod, 21)
  // pedras de basalto soltas
  scatter(-H + 4, -H + 4, H - 4, H - 4, 9, 34, (x, z, r) => {
    if (!ok(x, z, 1) || r(1) > 0.18) return
    T.pedraEsc(c, x, z, 0.8 + r(2) * 1.4, r(3) * 99)
  })
  // lajes de basalto na trilha e nas clareiras
  T.lajesPretas(c, -H, -H, H, H, 1.9, 41, (x, z) => P.dWalk(x, z) < 4.2 || P.aberto(x, z) > 0.6, lod)
  balizasDaArena(c, P, "vermelha", lod)
  return c
}
