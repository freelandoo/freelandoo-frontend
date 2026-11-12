// CIDADE ORBITAL · cena 1 (setores 1–3, chefe no 3) — a AVENIDA da ref `orbital-1.png` (ficha em
// tema-orbital.ts), refeita em 11/11 com as PEÇAS COPIADAS (`pecas/orbital.ts`) pela `avenida()`: rua de
// 12 m em trechos retos, lojas de mármore com toldo listrado e vitrine acesa dos dois lados, canteiros de
// cristal e árvores na calçada, faixas de pedestre. As clareiras dos setores e a arena viram praças.
// Marcos: a TORRE DE CRISTAL com anéis de ouro na quadra do meio (vista por cima das lojas de todo lugar)
// e os arcos brancos na entrada e na saída (o da saída enquadra o horizonte azulado).

import { type RGB } from "../kit"
import { Cena, blocked, ground, scatter, type XZ } from "../kit-cena"
import { mix } from "../kit-natureza"
import { AREA, H, planta } from "../dominio"
import * as O from "./tema-orbital"
import * as C from "../pecas/orbital"
import { avenida, chaoAvenida, horizonte, quadras } from "./avenida-orbital"

export const meta = {
  ceu: O.CEU,
  nevoa: O.NEVOA,
  area: AREA,
  luz: O.LUZ,
  astro: { dir: [0.4, 0.7, 0.6] as RGB, r: 0.05, cor: [1, 1, 0.92] as RGB },
  pontos: ["entrada", "saida", "chefe"],
  setores: [1, 2, 3],
}

// trechos RETOS (a avenida precisa): sobe, vira à direita, sobe, volta à esquerda, sai pelo alto
const CAMINHO: XZ[] = [[-50, -73], [-50, -20], [30, -20], [30, 40], [-20, 40], [-20, 73]]

export function montar(lod = 0): Cena {
  const c = new Cena("orbital-1", lod, 32, -16)
  const P = planta(c, { path: CAMINHO, setores: [1, 2, 3], boss: 3, tZonas: [0.24, 0.5], tArena: 0.8 })
  // marcos: arcos na entrada e na saída (vão = a avenida) e a torre de cristal na quadra do meio
  C.portalArco(c, -50, -70, 0, 12, lod)
  C.portalArco(c, -20, 70, Math.PI, 12, lod)
  C.torreCristalAneis(c, -12, 10, 44, 7, lod)
  horizonte(c, -20, 100, 0, 3)
  C.torreCristalAneis(c, 45, 120, 70, 9, 1, true)
  avenida(c, P, lod, 41, { faixas: [0.08, 0.32, 0.62, 0.92] })
  // miolo das quadras e borda: prédios altos de mármore (cidade densa, sem laje vazia)
  quadras(c, P, lod, 77)
  O.fundoOrbital(c, 3)

  const color = (x: number, z: number): RGB => {
    let col = chaoAvenida(P, x, z)
    col = mix(col, O.MARMORE, P.aberto(x, z) * 0.35)
    return col
  }
  ground(c, { x0: -H, z0: -H, x1: H, z1: H, step: lod ? 4 : 2, color })
  ground(c, { x0: -200, z0: -200, x1: 200, z1: 200, step: 40, color: () => O.MARMORE_S, fundo: true, y: -0.05, hole: [-H, -H, H, H] })

  const ok = (x: number, z: number, pad: number) => P.livre(x, z, pad) && !blocked(c, x, z, pad + 0.6)
  // praças (clareiras): obelisco de cristal e canteiros em volta
  for (const cl of P.clareiras) {
    const x = cl.x + cl.r + 2.5, z = cl.z
    if (ok(x, z, 0.5)) O.obelisco(c, x, z, 5.5, cl.setor, lod)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3, r = cl.r + 4
      const px = cl.x + Math.cos(a) * r, pz = cl.z + Math.sin(a) * r
      if (ok(px, pz, 1)) C.canteiroCristal(c, px, pz, a + Math.PI / 2, { seed: k + cl.setor * 7 }, lod)
    }
  }
  // miolo das quadras (sobra entre lojas e borda): árvores redondas esparsas
  scatter(-H + 4, -H + 4, H - 4, H - 4, 7, 31, (x, z, r) => {
    if (!ok(x, z, 1) || r(1) > 0.12) return
    C.arvoreRedonda(c, x, z, 5 + r(3) * 1.5, r(4) * 99, lod)
  })
  return c
}
