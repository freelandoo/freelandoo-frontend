// features/meu-mundo/jetpack/engine/pecas/obstaculos.ts — os obstáculos da fase com as peças em código.
//
// As peças já saem no quadro final do obstáculo (rocha e cristal centrados, cobrindo o disco de raio 1;
// engrenagem com o pé dos dentes no raio 1; moldura nas medidas de `MOLDURA`): nada de assar escala,
// só o galão (1,15×, como o do Tripo). As malhas-fonte saem da cena depois de copiadas.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { buildObstacles } from "../obstacles-view"
import { MOLDURA } from "./comuns"
import type { KitCodigo } from "./peca"

type Obstacles = ReturnType<typeof buildObstacles>

export function codeObstacles(scene: Scene, obstacles: Obstacles, kit: KitCodigo, o: { beam: boolean }) {
  const src: Mesh[] = []
  const get = (name: string, escala = 2) => {
    const m = kit.has(name) ? kit.mesh(scene, name, escala) : null
    if (m) src.push(m)
    return m
  }
  const rock = get("rocha-voo")
  if (rock) obstacles.useModel("rock", rock, { upright: true })
  const gem = get("gema-voo")
  if (gem) obstacles.useModel("gem", gem)
  const gear = get("engrenagem-voo")
  if (gear) obstacles.useModel("gear", gear)
  const can = get("galao", 1.15)
  if (can) {
    // o galão BRILHA (coleta de longe): a cor do vértice acende o corpo inteiro, a faixa acende mais
    const mat = can.material as StandardMaterial | null
    mat?.emissiveColor.set(0.42, 0.42, 0.42)
    obstacles.useModel("can", can, { bake: Matrix.Scaling(1.15, 1.15, 1.15) })
  }
  const tile = get("borda")
  const corner = get("canto")
  if (tile && corner) obstacles.useFrameKit(tile, corner, { ...MOLDURA, beam: o.beam })
  for (const m of src) m.dispose()
}
