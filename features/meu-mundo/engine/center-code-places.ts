// features/meu-mundo/engine/center-code-places.ts — prédios do centro feitos EM CÓDIGO (skill
// `meu-mundo-cenario-codigo`), no lugar do GLB do local. Hoje: Banco de Sangue (`pizzaria`) e
// Açougue (`hamburgueria`), 15/11 — fachadas em `cena-codigo/pecas/`, folhas na vitrine
// (MEU MUNDO 3D/pipeline/pecas-codigo/shots/<nome>/folha.png).
//
// Contrato igual ao do GLB: origem no meio da fachada, fachada em z = 0 virada para −z, prédio para +z.
// A colisão e a entrada continuam as do servidor; aqui é só o visual (1 malha, corpo + luz acesa).

import type { Scene } from "@babylonjs/core/scene"
import type { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Geo, finish, type RGB } from "./cena-codigo/kit"
import { setSun } from "./cena-codigo/kit-natureza"
import { ACABAMENTO as ACAB_BANCO, fachadaBancoDeSangue } from "./cena-codigo/pecas/banco-de-sangue"
import { ACABAMENTO as ACAB_ACOUGUE, fachadaAcougue } from "./cena-codigo/pecas/acougue"

interface LojaCodigo {
  fachada: (B: Geo, G: Geo) => void
  acabamento: typeof ACAB_BANCO | typeof ACAB_ACOUGUE
  /** Vapor saindo da chaminé (quadro do prédio). */
  vents: [number, number, number][]
}

const LOJAS: Record<string, LojaCodigo> = {
  pizzaria: { fachada: fachadaBancoDeSangue, acabamento: ACAB_BANCO, vents: [[3.4, 9.75, 7.5]] },
  hamburgueria: { fachada: fachadaAcougue, acabamento: ACAB_ACOUGUE, vents: [[3.6, 10.55, 6.5]] },
}

/** Luz própria do corpo: a mesma ideia do `bodyMat` dos GLB do centro (fachada contra o sol não fica barro). */
const SELF: RGB = [0.14, 0.13, 0.13]

export const isCodePlace = (id: string) => id in LOJAS

/** Monta o prédio já no lugar (`placement` = origem → mundo). `null` se o local não é em código. */
export function buildCodePlace(scene: Scene, id: string, placement: Matrix): { mesh: Mesh; vents: [number, number, number][] } | null {
  const loja = LOJAS[id]
  if (!loja) return null
  // o centro tem sol de verdade: a pintura das facetas fica na força normal (a vitrine usa 2)
  setSun([0.55, 1, 0.35], 1)
  const B = new Geo()
  const G = new Geo()
  loja.fachada(B, G)
  const mesh = finish(scene, `mm-center-code-${id}`, B, G, { ...loja.acabamento, self: SELF })
  mesh.bakeTransformIntoVertices(placement)
  mesh.isPickable = false
  mesh.refreshBoundingInfo()
  mesh.freezeWorldMatrix()
  return { mesh, vents: loja.vents }
}
