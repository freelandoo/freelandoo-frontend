// Cenário em código no aparelho (sem GLB): monta a cena pelo arquivo TS e vira malhas.
// Uma malha por bloco de 32 m + o pano de fundo, um material de cor por vértice (1 chamada por bloco).
// Kit: `kit.ts` (Geo, ruído, desgaste), `kit-cena.ts` (Cena, chão, rio, colisão, pontos e zonas),
// `kit-natureza.ts` (mesa, árvore, pedra), `kit-cidade.ts` (torre, rua). Skill `meu-mundo-cenario-codigo`.
import type { Scene } from "@babylonjs/core/scene"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
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

/**
 * O astro da cena (lua/sol): disco aceso que acompanha a câmera, sem névoa, atrás de tudo.
 * Usado pelo jogo e pela vitrine (fonte única). Devolve o `dispose`.
 */
export function astroDaCena(scene: Scene, meta: CenaMeta): () => void {
  const a = meta.astro
  if (!a) return () => {}
  const disc = CreateDisc("cena-astro", { radius: 1, tessellation: 28 }, scene)
  const halo = CreateDisc("cena-astro-halo", { radius: 1.6, tessellation: 28 }, scene)
  const mat = new StandardMaterial("cena-astro", scene)
  mat.disableLighting = true
  mat.emissiveColor = new Color3(a.cor[0], a.cor[1], a.cor[2])
  mat.fogEnabled = false
  const hm = new StandardMaterial("cena-astro-halo", scene)
  hm.disableLighting = true
  hm.emissiveColor = new Color3(a.cor[0], a.cor[1], a.cor[2])
  hm.alpha = 0.16
  hm.fogEnabled = false
  disc.material = mat
  halo.material = hm
  const l = Math.hypot(a.dir[0], a.dir[1], a.dir[2]) || 1
  const D = 280
  const off = new Vector3((a.dir[0] / l) * D, (a.dir[1] / l) * D, (a.dir[2] / l) * D)
  const size = Math.tan(a.r) * D
  for (const m of [disc, halo]) {
    m.scaling.setAll(size)
    m.billboardMode = 7
    m.isPickable = false
    m.applyFog = false
    m.infiniteDistance = true
    m.position.copyFrom(off)
  }
  halo.renderingGroupId = 0
  return () => {
    disc.dispose()
    halo.dispose()
    mat.dispose()
    hm.dispose()
  }
}
