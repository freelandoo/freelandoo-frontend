// features/meu-mundo/jetpack/engine/canyon-assets.ts — JETPACK 2.0: as peças esculpidas do Cânion.
//
// Geradas pelo Alex no Tripo (a partir das imagens pedidas pelos prompts da
// sessão) e preparadas por MEU MUNDO 3D/pipeline/jetpack/build_canion_tripo.py:
// paredão, rocha, moinho, arco, anel e ilha, cada uma com 1,8–5 mil triângulos
// e textura de 512/1024. Medidas (canion.json): paredão/moinho/ilha com 1 m de
// altura e origem embaixo (ilha no centro); arco com 1 m de largura; anel com o
// FURO de raio 1 (o raio da regra escala direto); rocha cobrindo o disco de
// raio 1.
//
// Cada peça vira UMA malha sem transformação (pronta para instanciar), com o
// material trocado por um StandardMaterial com a textura dela: o PBR do Tripo
// sem mapa de ambiente sai escuro, e a cena do jetpack é iluminada por
// hemisférica + sol.

import type { Scene } from "@babylonjs/core/scene"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial"
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { ensureLoaders } from "../../engine/avatars"

export const CANYON_PIECES = ["paredao", "rocha", "moinho", "arco", "anel", "ilha"] as const
export type CanyonPiece = (typeof CANYON_PIECES)[number]

const DIR = "/meu-mundo/jetpack/canion/"
/** Versão de longe (mesma forma e UV, 600–900 triângulos) e a distância da troca (m). */
const LOD: Partial<Record<CanyonPiece, number>> = { paredao: 60, ilha: 120 }

export const FACTORY_PIECES = ["viga", "cano", "engrenagem", "pistao", "guindaste", "turbina"] as const
export type FactoryPiece = (typeof FACTORY_PIECES)[number]
/** Forja Vulcânica: peças do Tripo preparadas por build_forja_tripo.py (a rocha tem versão de longe). */
export function loadForgeAssets(scene: Scene, isAlive: () => boolean) {
  return loadPieces(scene, "/meu-mundo/jetpack/forja/", ["fornalha", "prensa", "rocha", "ponte", "portico", "caldeirao"] as const, { rocha: 70 }, isAlive)
}
/** Cidade Orbital: peças do Tripo preparadas por build_orbital_tripo.py (a torre tem versão de longe). */
export function loadOrbitalAssets(scene: Scene, isAlive: () => boolean) {
  return loadPieces(scene, "/meu-mundo/jetpack/orbital/", ["torre", "portico", "drone", "painel", "jardineira", "elevador"] as const, { torre: 90 }, isAlive)
}
/** Fábrica (Túnel Industrial): peças do Tripo preparadas por build_fabrica_tripo.py. */
export function loadFactoryAssets(scene: Scene, isAlive: () => boolean): Promise<PieceAssets<FactoryPiece>> {
  return loadPieces(scene, "/meu-mundo/jetpack/fabrica/", FACTORY_PIECES, {}, isAlive)
}

export interface PieceAssets<P extends string = string> {
  meshes: Map<P, Mesh>
  dispose: () => void
}
export type CanyonAssets = PieceAssets<CanyonPiece>

/** Carrega as peças do Cânion (as que falharem ficam de fora: o cenário procedural segue). */
export function loadCanyonAssets(scene: Scene, isAlive: () => boolean): Promise<CanyonAssets> {
  return loadPieces(scene, DIR, CANYON_PIECES, LOD, isAlive)
}

/** Carrega peças de uma pasta (uma malha por arquivo), com a versão de longe quando houver. */
export async function loadPieces<P extends string>(scene: Scene, dir: string, names: readonly P[], lodAt: Partial<Record<P, number>>, isAlive: () => boolean): Promise<PieceAssets<P>> {
  ensureLoaders()
  const containers: AssetContainer[] = []
  const meshes = new Map<P, Mesh>()
  const mats: StandardMaterial[] = []
  await Promise.all(
    names.map(async (name) => {
      try {
        const c = await LoadAssetContainerAsync(dir + name + ".glb", scene)
        if (!isAlive()) {
          c.dispose()
          return
        }
        containers.push(c)
        c.addAllToScene()
        const src = c.meshes.find((m) => m.getTotalVertices() > 0) as Mesh | undefined
        if (!src) return
        // solta do nó raiz do glTF e grava a transformação nos vértices (fica pronta para instanciar)
        src.setParent(null)
        src.bakeCurrentTransformIntoVertices()
        src.refreshBoundingInfo()
        const pbr = src.material as PBRMaterial | null
        const tex: BaseTexture | null = pbr?.albedoTexture ?? null
        const mat = new StandardMaterial(`jt-piece-${name}`, scene)
        mat.diffuseTexture = tex
        mat.specularColor = new Color3(0.06, 0.05, 0.04)
        // a textura do Tripo já vem pintada com luz: difusa puxada para o frio (tira o vermelho vivo) e
        // um pouco de luz própria pêssego para clarear as sombras (o tom da referência)
        mat.emissiveColor = new Color3(0.13, 0.1, 0.09)
        mat.diffuseColor = new Color3(0.8, 0.84, 0.92)
        mats.push(mat)
        src.material = mat
        src.isPickable = false
        src.position.set(0, -5000, 0)
        src.name = `jt-glb-${name}`
        for (const m of c.meshes) if (m !== src) m.setEnabled(false)
        meshes.set(name, src)
        mat.freeze()
        const far = lodAt[name]
        if (far) {
          try {
            const lc = await LoadAssetContainerAsync(dir + name + "-lod.glb", scene)
            if (!isAlive()) return lc.dispose()
            containers.push(lc)
            lc.addAllToScene()
            const low = lc.meshes.find((m) => m.getTotalVertices() > 0) as Mesh | undefined
            if (low) {
              low.setParent(null)
              low.bakeCurrentTransformIntoVertices()
              low.refreshBoundingInfo()
              // a mesma textura da versão de perto (o UV é o mesmo): um material só
              low.material?.dispose()
              low.material = mat
              low.isPickable = false
              for (const m of lc.meshes) if (m !== low) m.setEnabled(false)
              src.addLODLevel(far, low)
            }
          } catch (err) {
            if (isAlive()) console.warn("[jetpack] versão de longe não carregou", name, err)
          }
        }
      } catch (err) {
        if (isAlive()) console.warn("[jetpack] peça não carregou", name, err)
      }
    }),
  )
  return {
    meshes,
    dispose() {
      for (const m of meshes.values()) m.dispose()
      for (const m of mats) m.dispose()
      for (const c of containers) c.dispose()
    },
  }
}

/** Medidas das peças normalizadas (iguais a canion.json do pipeline). */
export const PIECE = {
  /** Paredão: largura (x) e profundidade (z) para 1 m de altura. */
  paredao: { w: 0.5623, d: 0.4523 },
  moinho: { w: 0.5403, d: 0.6693 },
  /** Arco: 1 m de largura, 0,645 de altura; o vão no meio da caixa fica acima de 0,31 da largura. */
  arco: { h: 0.645 },
  /** Anel: raio de fora (o furo é 1). */
  anel: { outer: 1.718 },
  ilha: { w: 0.7813, d: 0.7098 },
} as const

