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
/**
 * Tempestade Ártica v2 (build_gelo_v2.py): as peças vêm em GRUPOS — um GLB com várias peças e UMA
 * textura (o Alex gera até 3 numa imagem do Tripo) — e a versão de longe dentro do mesmo arquivo.
 */
export const ICE_GROUPS = {
  estalactites: ["estalactites"],
  base: ["base"],
  anel: ["anel"],
  portico: ["portico"],
  galao: ["galao"],
  mamute: ["mamute"],
  "gelo-obstaculos": ["bloco2", "rocha", "cristal"],
  "gelo-moldura": ["borda", "canto"],
  "gelo-acampamento": ["iglu", "pinheiro", "farol"],
  "gelo-congelados": ["mamute-gelo", "navio"],
} as const
export type IceAsset = (typeof ICE_GROUPS)[keyof typeof ICE_GROUPS][number]
/** Distância (m) da troca para a versão de longe. */
const ICE_LOD: Partial<Record<IceAsset, number>> = { estalactites: 30, portico: 45, base: 60, bloco2: 40, cristal: 55, iglu: 70, pinheiro: 50, farol: 60, "mamute-gelo": 70, navio: 70, mamute: 60 }
export function loadIceAssets(scene: Scene, isAlive: () => boolean): Promise<PieceAssets<IceAsset>> {
  return loadPieceGroups<IceAsset>(scene, "/meu-mundo/jetpack/gelo2/", ICE_GROUPS, ICE_LOD, isAlive)
}
/** Floresta Bioluminescente v2 (build_floresta_v2.py): grupos, como o Gelo. Toda peça que se repete tem versão de longe. */
export const FOREST_GROUPS = {
  cristais: ["cristais"],
  cogumelo: ["cogumelo"],
  ilha: ["ilha"],
  arvore: ["arvore"],
  planta: ["planta"],
  arco: ["arco"],
  "flo-casa": ["cogumelo-casa", "arvore2"],
  "flo-flores": ["flor", "lanterna"],
  "flo-troncos": ["tronco-caido", "ninho", "tronco-viga"],
  "flo-moldura": ["borda", "canto", "galao"],
} as const
export type ForestAsset = (typeof FOREST_GROUPS)[keyof typeof FOREST_GROUPS][number]
const FOREST_LOD: Partial<Record<ForestAsset, number>> = { cristais: 55, cogumelo: 70, ilha: 50, arvore: 90, planta: 35, arco: 50, "cogumelo-casa": 70, arvore2: 80, flor: 45, lanterna: 40, "tronco-caido": 45, ninho: 45 }
export function loadForestAssets(scene: Scene, isAlive: () => boolean): Promise<PieceAssets<ForestAsset>> {
  return loadPieceGroups<ForestAsset>(scene, "/meu-mundo/jetpack/floresta2/", FOREST_GROUPS, FOREST_LOD, isAlive)
}
/** Forja Vulcânica: peças do Tripo preparadas por build_forja_tripo.py (a rocha tem versão de longe). */
export function loadForgeAssets(scene: Scene, isAlive: () => boolean) {
  return loadPieces(scene, "/meu-mundo/jetpack/forja/", ["fornalha", "prensa", "rocha", "ponte", "portico", "caldeirao"] as const, { rocha: 70 }, isAlive)
}
/** Cidade Orbital v2 (build_orbital_v2.py): grupos, como o Gelo; toda peça com versão de longe. */
export const ORBITAL_GROUPS = {
  torre: ["torre"],
  portico: ["portico"],
  drone: ["drone"],
  painel: ["painel"],
  jardineira: ["jardineira"],
  elevador: ["elevador"],
  "orb-antenas": ["antena", "holo", "torre2"],
  "orb-capsula": ["capsula", "viga2"],
  "orb-moldura": ["borda", "canto", "galao"],
  "orb-ceu": ["satelite", "jardim"],
} as const
export type OrbitalAsset = (typeof ORBITAL_GROUPS)[keyof typeof ORBITAL_GROUPS][number]
const ORBITAL_LOD: Partial<Record<OrbitalAsset, number>> = { torre: 90, portico: 50, drone: 40, painel: 40, jardineira: 45, elevador: 50, antena: 45, holo: 40, torre2: 70, capsula: 50, satelite: 60, jardim: 60 }
export function loadOrbitalAssets(scene: Scene, isAlive: () => boolean): Promise<PieceAssets<OrbitalAsset>> {
  return loadPieceGroups<OrbitalAsset>(scene, "/meu-mundo/jetpack/orbital2/", ORBITAL_GROUPS, ORBITAL_LOD, isAlive)
}
/**
 * Fábrica (Túnel Industrial) v2 (build_industrial_v2.py): grupos, como o Gelo. As peças novas do Tripo
 * (kit_lib, giro −90°) chegam ao Babylon de COSTAS (frente para +z): quem posiciona soma meia-volta.
 */
export const FACTORY_GROUPS = {
  viga: ["viga"],
  cano: ["cano"],
  engrenagem: ["engrenagem"],
  pistao: ["pistao"],
  guindaste: ["guindaste"],
  turbina: ["turbina"],
  "fab-maquinas": ["engrenagem2", "prensa-cabeca"],
  "fab-patio": ["relogio", "empilhadeira", "caldeira", "tanque"],
  "fab-linha": ["esteira", "painel"],
  "fab-moldura": ["galao"],
} as const
export type FactoryAsset = (typeof FACTORY_GROUPS)[keyof typeof FACTORY_GROUPS][number]
const FACTORY_LOD: Partial<Record<FactoryAsset, number>> = { viga: 50, cano: 45, engrenagem: 60, pistao: 45, guindaste: 50, turbina: 80, "prensa-cabeca": 45, relogio: 50, empilhadeira: 40, caldeira: 45, tanque: 45, esteira: 40, painel: 40 }
export function loadFactoryAssets(scene: Scene, isAlive: () => boolean): Promise<PieceAssets<FactoryAsset>> {
  return loadPieceGroups<FactoryAsset>(scene, "/meu-mundo/jetpack/fabrica2/", FACTORY_GROUPS, FACTORY_LOD, isAlive)
}
/** Só a engrenagem nova da fábrica (a Forja usa como obstáculo). */
export function loadFactoryGear(scene: Scene, isAlive: () => boolean): Promise<PieceAssets<"engrenagem2">> {
  return loadPieceGroups(scene, "/meu-mundo/jetpack/fabrica2/", { "fab-maquinas": ["engrenagem2"] as const }, {}, isAlive)
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

/** O material das peças do Tripo: StandardMaterial com a textura difusa (o PBR sem mapa de ambiente sai escuro). */
function pieceMaterial(scene: Scene, name: string, tex: BaseTexture | null) {
  const mat = new StandardMaterial(`jt-piece-${name}`, scene)
  mat.diffuseTexture = tex
  mat.specularColor = new Color3(0.06, 0.05, 0.04)
  // a textura do Tripo já vem pintada com luz: difusa puxada para o frio e um pouco de luz própria
  // para clarear as sombras
  mat.emissiveColor = new Color3(0.13, 0.1, 0.09)
  mat.diffuseColor = new Color3(0.8, 0.84, 0.92)
  return mat
}

/** Solta a malha do nó do glTF e grava a transformação nos vértices (pronta para instanciar). */
function bakePiece(m: Mesh) {
  m.setParent(null)
  m.bakeCurrentTransformIntoVertices()
  m.refreshBoundingInfo()
  m.isPickable = false
}

/**
 * Carrega peças em GRUPOS: cada arquivo `<grupo>.glb` tem um nó por peça (com o nome dela) e, se houver,
 * `<peça>-lod` (a versão de longe, mesma textura). Um material por arquivo, compartilhado pelas peças.
 */
export async function loadPieceGroups<P extends string>(scene: Scene, dir: string, groups: Record<string, readonly P[]>, lodAt: Partial<Record<P, number>>, isAlive: () => boolean): Promise<PieceAssets<P>> {
  ensureLoaders()
  const containers: AssetContainer[] = []
  const meshes = new Map<P, Mesh>()
  const mats: StandardMaterial[] = []
  await Promise.all(
    Object.entries(groups).map(async ([file, names]) => {
      try {
        const c = await LoadAssetContainerAsync(dir + file + ".glb", scene)
        if (!isAlive()) return c.dispose()
        containers.push(c)
        c.addAllToScene()
        const find = (n: string) => {
          const node = c.transformNodes.find((t) => t.name === n) ?? c.meshes.find((m) => m.name === n)
          if (!node) return undefined
          if ((node as Mesh).getTotalVertices?.() > 0) return node as Mesh
          return node.getChildMeshes(false).find((m) => m.getTotalVertices() > 0) as Mesh | undefined
        }
        let mat: StandardMaterial | null = null
        const used = new Set<Mesh>()
        for (const name of names as readonly P[]) {
          const src = find(name)
          if (!src) {
            console.warn("[jetpack] peça ausente no grupo", file, name)
            continue
          }
          if (!mat) {
            const pbr = src.material as PBRMaterial | null
            mat = pieceMaterial(scene, file, pbr?.albedoTexture ?? null)
            mats.push(mat)
          }
          bakePiece(src)
          src.material = mat
          src.position.set(0, -5000, 0)
          src.name = `jt-glb-${name}`
          used.add(src)
          meshes.set(name, src)
          const far = lodAt[name]
          const low = far ? find(`${name}-lod`) : undefined
          if (low && far) {
            bakePiece(low)
            low.material = mat
            used.add(low)
            src.addLODLevel(far, low)
          }
        }
        for (const m of c.meshes) if (!used.has(m as Mesh)) m.setEnabled(false)
        mat?.freeze()
      } catch (err) {
        if (isAlive()) console.warn("[jetpack] grupo não carregou", file, err)
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

