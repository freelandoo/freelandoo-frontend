// features/meu-mundo/noturno/engine/biomes/code-assets.ts — ROLÊ NOTURNO em código (14/11).
//
// O cenário perto/longe do Rolê usava as peças esculpidas do Tripo do Jetpack da mesma fase
// (`loadCanyonAssets` e irmãos, kits `temas/*/v2`). O Jetpack trocou essas peças por peças em código
// (`jetpack/engine/pecas/kit-*.ts`, skill `meu-mundo-cenario-codigo`) com AS MESMAS MEDIDAS (1 m de
// altura, origem e eixo iguais), então o Rolê só troca a fonte: cada peça vira uma malha do kit e a
// versão de longe (a mesma peça feita no kit leve) vai pendurada como LOD, que é o formato que o
// carregador antigo entregava (`splitLod` a separa). Sem download, sem textura.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { PieceAssets } from "../../../jetpack/engine/canyon-assets"
import type { KitCodigo } from "../../../jetpack/engine/pecas/peca"

/**
 * As peças `escalas` (nome → tamanho típico no Rolê, em metros, para o desgaste bater) do kit `perto`;
 * com `longe`, cada uma leva a versão leve como LOD. Toda peça pedida tem de existir no kit.
 */
export function codeAssets<P extends string>(scene: Scene, perto: KitCodigo<P>, escalas: Partial<Record<P, number>>, longe?: KitCodigo<P>): PieceAssets<P> {
  const meshes = new Map<P, Mesh>()
  const all: Mesh[] = []
  for (const name of Object.keys(escalas) as P[]) {
    const s = escalas[name] ?? 1
    const m = perto.mesh(scene, name, s)
    if (!m) continue
    m.material?.freeze()
    all.push(m)
    if (longe && longe !== perto) {
      const l = longe.mesh(scene, name, s)
      if (l) {
        l.material?.freeze()
        all.push(l)
        m.addLODLevel(1e6, l)
      }
    }
    meshes.set(name, m)
  }
  return {
    meshes,
    dispose() {
      // corpo + luz são um material múltiplo (`fuseGlow`): soltar também os materiais de dentro
      for (const m of all) m.dispose(false, true)
    },
  }
}
