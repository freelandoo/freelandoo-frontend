// features/meu-mundo/engine/cena-codigo/pecas/palco-vermelha.ts — os PALCOS DE LUTA da FLORESTA VERMELHA DE
// VARKOS (7º Domínio), com as mesmas peças das cenas abertas (pecas/floresta-vermelha.ts + o fogo do Vulcão).
// Contrato de palcos.ts: o círculo da luta (R0 = 11 m) fica livre; em volta, anéis de peças.
//   entrada = a orla do bosque: árvores rubras em roda, estandartes e armas cravadas no chão preto;
//   fundo   = o acampamento caído: roda de estandartes, braseiros, tocos em brasa e um rio de lava atrás;
//   palácio = o salão do Leão: piso de lajes pretas com o círculo de neon vermelho, estandartes altos e braseiros.

import { noise, type RGB } from "../kit"
import { ground, type Cena } from "../kit-cena"
import { mix, smooth } from "../kit-natureza"
import * as T from "../cenas/tema-vermelha"

export type LugarPalco = "entrada" | "fundo" | "palacio"
const R0 = 11

function anel(n: number, r: number, off: number, seed: number, fn: (x: number, z: number, ang: number, k: number) => void, jit = 1.4) {
  for (let k = 0; k < n; k++) {
    const a = ((k + off) / n) * Math.PI * 2 + (noise(k * 1.7, seed, 0.3) - 0.5) * 0.3
    const rr = r + (noise(k * 2.3, seed, 1.1) - 0.5) * jit
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr
    fn(x, z, Math.atan2(-x, -z), k)
  }
}

export function palcoVermelha(c: Cena, lugar: LugarPalco, lod: number) {
  ground(c, {
    x0: -80, z0: -80, x1: 80, z1: 80, step: c.lod ? 5 : 4,
    color: (x, z): RGB => {
      const d = Math.hypot(x, z)
      let col = mix(T.CHAO, T.CHAO_CL, smooth(0.45, 0.8, noise(x * 0.07, 1.3, z * 0.07)))
      // tapete de folhas fora do círculo
      col = mix(col, mix([0.32, 0.03, 0.04], [0.4, 0.12, 0.03], noise(x * 0.3, 3, z * 0.3)), smooth(R0 + 3, R0 + 10, d) * smooth(0.45, 0.7, noise(x * 0.06, 7, z * 0.06)) * 0.7)
      // o círculo da luta: anel vermelho pintado (a roda da Gincana)
      return mix(col, [0.6, 0.06, 0.05], smooth(0.35, 0, Math.abs(d - R0)))
    },
  })
  const okArv = (x: number, z: number) => Math.hypot(x, z) > R0 + 6
  if (lugar === "entrada") {
    anel(14, R0 + 10, 0.1, 11, (x, z, _a, k) => okArv(x, z) && T.arvoreRubra(c, x, z, 10 + (k % 4), k + 3, lod, T.FOLHAS[k % 5 === 0 ? 2 : k % 3 === 0 ? 1 : 0]), 3)
    anel(10, R0 + 20, 0.55, 13, (x, z, _a, k) => T.arvoreRubra(c, x, z, 11 + (k % 3), k + 40, lod, T.copaDe(k * 7), false), 4)
    anel(6, R0 + 3.5, 0.25, 15, (x, z, a, k) => T.estandarte(c, x, z, 4.8, a, k + 5, lod))
    anel(9, R0 + 4.5, 0.75, 17, (x, z, _a, k) => T.armaCravada(c, x, z, k * 1.3, k + 21, lod))
    anel(8, R0 + 7, 0.4, 19, (x, z, _a, k) => T.folhico(c, x, z, 2.2, k + 9, T.FOLHAS[k % 3], lod))
  } else if (lugar === "fundo") {
    anel(8, R0 + 3, 0.1, 31, (x, z, a, k) => (k % 2 ? T.braseiro(c, x, z, 1.1, lod) : T.estandarte(c, x, z, 5, a, k + 50, lod)))
    anel(7, R0 + 6, 0.6, 33, (x, z, _a, k) => T.tocoQueimado(c, x, z, 1.1, k + 2, lod))
    anel(12, R0 + 12, 0.3, 35, (x, z, _a, k) => T.arvoreRubra(c, x, z, 10 + (k % 4), k + 70, lod, T.copaDe(k * 5)), 4)
    anel(8, R0 + 24, 0.7, 37, (x, z, _a, k) => T.pedraEsc(c, x, z, 3 + noise(k, 2, 1) * 2.5, k))
    // o rio de lava atrás (arco de 120° no fundo)
    const pts: [number, number][] = []
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * 0.33 + (k / 8) * Math.PI * 0.66
      pts.push([Math.cos(a) * (R0 + 18), Math.sin(a) * (R0 + 18)])
    }
    T.rioLava(c, pts, 5)
  } else {
    T.lajesPretas(c, -R0 - 12, -R0 - 12, R0 + 12, R0 + 12, 1.9, 7, (x, z) => Math.hypot(x, z) < R0 + 10.5, lod)
    anel(8, R0 + 4, 0.12, 51, (x, z, a, k) => T.estandarte(c, x, z, 6.2, a, k + 90, lod))
    anel(8, R0 + 2.5, 0.62, 53, (x, z) => T.braseiro(c, x, z, 1.3, lod))
    anel(8, R0 + 14, 0.35, 55, (x, z, _a, k) => T.colunas(c, x, z, 4, 11 + noise(k, 2, 2) * 6, k, lod))
    anel(10, R0 + 22, 0.8, 57, (x, z, _a, k) => T.arvoreRubra(c, x, z, 12 + (k % 3), k + 110, lod, T.copaDe(k * 3), false), 4)
  }
  T.fundoFloresta(c, 5)
  T.fundoVulcao(c, 5, [-40, 175], T.NEVOA)
}
