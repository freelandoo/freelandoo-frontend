// Cenário em código no aparelho (sem GLB): monta a cena pelo arquivo TS e vira malhas.
// Uma malha por bloco de 32 m + o pano de fundo, um material de cor por vértice (1 chamada por bloco).
// Kit: `kit.ts` (Geo, ruído, desgaste), `kit-cena.ts` (Cena, chão, rio, colisão, pontos e zonas),
// `kit-natureza.ts` (mesa, árvore, pedra), `kit-cidade.ts` (torre, rua). Skill `meu-mundo-cenario-codigo`.
import type { Scene } from "@babylonjs/core/scene"
import { finishCena, type Cena } from "./kit-cena"
import { CENAS, type CenaMeta } from "./cenas"

export { CENAS, type CenaMeta, type CenaModulo } from "./cenas"
export { checkMarcas, checkWalk, blocked, inPoly, type Box2, type XZ, Cena } from "./kit-cena"

export interface CenaMontada {
  cena: Cena
  meta: CenaMeta
  meshes: ReturnType<typeof finishCena>["meshes"]
  dispose: () => void
}

/** Monta a cena registrada `nome` na `scene` (`lod` 0 = perto, 1 = longe). Devolve as malhas e as caixas (`cena.blockers`). */
export function montarCena(scene: Scene, nome: string, lod = 0): CenaMontada {
  const mod = CENAS[nome]
  if (!mod) throw new Error(`cena-codigo: cena não registrada: ${nome}`)
  const cena = mod.montar(lod)
  const { meshes, material, glowMaterial } = finishCena(scene, cena)
  return {
    cena,
    meta: mod.meta,
    meshes,
    dispose: () => {
      // o fuseGlow troca o material do bloco por uma cópia: solta cada material uma vez só
      const mats = new Set([material, glowMaterial])
      for (const m of meshes) {
        if (m.material) mats.add(m.material as typeof material)
        m.dispose(false, false)
      }
      for (const mt of mats) mt.dispose()
    },
  }
}
