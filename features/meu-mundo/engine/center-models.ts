// features/meu-mundo/engine/center-models.ts
//
// Modelos dos estabelecimentos do Centro (mm3d-17/18): um GLB por local, do
// pipeline MEU MUNDO 3D/pipeline/centro (cor por vértice, sem textura).
//
// Cada arquivo é baixado UMA vez por cena e vira no máximo QUATRO malhas, uma
// por material (mm3d-53, steampunk):
//   body  acabamento: difuso branco × cor do vértice × a textura de acabamento
//         do bairro (se o modelo tem UV); sem UV (estátuas), o material liso
//   wall  alvenaria: a textura de cantaria (UV planar em metros)
//   glow  emblemas (jetpack, pizza, luvas…): emissivo leve + fresnel — o
//         brilho barato, sem luz extra nem mapa de ambiente
//   lamp  vidro aceso e lanternas: o "glow" do bairro (âmbar, sem luz)
// O lugar do prédio é ASSADO nos vértices (é estático): sem matriz por quadro.
//
// Vários jogadores ou várias salas não multiplicam nada aqui: o navegador só
// tem a cena em que está. Trocar de ambiente descarta tudo (dispose).

import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import type { Node } from "@babylonjs/core/node"
import type { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Scene } from "@babylonjs/core/scene"
import { ensureLoaders } from "./avatars"

export interface LoadedPlace {
  meshes: Mesh[]
  triangles: number
}

/** Materiais steampunk do centro (o mundo cria; aqui só se usa). */
export interface CenterSteamMats {
  trim: Material
  wall: Material | null
  lamp: Material
}

type Part = "body" | "wall" | "glow" | "lamp"

/** A parte vem no nome do nó (o gltfpack pode pôr a malha num filho sem nome). */
function partOf(m: Mesh): Part {
  for (let n: Node | null = m; n; n = n.parent) {
    if (/_lamp/i.test(n.name)) return "lamp"
    if (/_wall/i.test(n.name)) return "wall"
    if (/glow/i.test(n.name)) return "glow"
    if (/_body/i.test(n.name)) return "body"
  }
  return "body"
}

export class CenterModels {
  private readonly loaded = new Map<string, LoadedPlace>()
  private readonly bodyMat: StandardMaterial
  private readonly glowMat: StandardMaterial
  private disposed = false

  constructor(
    private readonly scene: Scene,
    private readonly steam: CenterSteamMats | null = null,
  ) {
    ensureLoaders()
    this.bodyMat = new StandardMaterial("mm-center-body", scene)
    this.bodyMat.diffuseColor = new Color3(1, 1, 1)
    this.bodyMat.specularColor = new Color3(0, 0, 0)
    // Um pouco de luz própria: fachada virada contra o sol (oeste/sul) não
    // fica cinza-barro — a cor do vértice multiplica o emissivo, o tom fica.
    this.bodyMat.emissiveColor = new Color3(0.16, 0.16, 0.16)
    this.bodyMat.backFaceCulling = false
    this.glowMat = new StandardMaterial("mm-center-glow", scene)
    this.glowMat.diffuseColor = new Color3(1, 1, 1)
    this.glowMat.specularColor = new Color3(0.25, 0.25, 0.25)
    this.glowMat.specularPower = 24
    this.glowMat.emissiveColor = new Color3(0.18, 0.18, 0.18)
    // Borda clara de quem olha de lado: o "verniz" do logo, sem luz nenhuma.
    const f = new FresnelParameters()
    f.leftColor = new Color3(1, 1, 1)
    f.rightColor = new Color3(0, 0, 0)
    f.bias = 0.15
    f.power = 2.2
    this.glowMat.emissiveFresnelParameters = f
    this.glowMat.backFaceCulling = false
  }

  get count() {
    return this.loaded.size
  }

  get triangles() {
    let n = 0
    for (const p of this.loaded.values()) n += p.triangles
    return n
  }

  /** Baixa o modelo do local e o põe no lugar (`placement` = origem → mundo). */
  async load(id: string, url: string, placement: Matrix): Promise<LoadedPlace> {
    if (this.disposed) throw new Error("disposed")
    const have = this.loaded.get(id)
    if (have) return have
    const c = await LoadAssetContainerAsync(url, this.scene)
    if (this.disposed) {
      c.dispose()
      throw new Error("disposed")
    }
    const parts = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
    if (!parts.length) {
      c.dispose()
      throw new Error(`modelo ${id} vazio`)
    }
    const groups: Record<Part, Mesh[]> = { body: [], wall: [], glow: [], lamp: [] }
    for (const m of parts) {
      // A parte sai do nome do nó PAI: decidir antes de soltar a malha dele.
      groups[partOf(m)].push(m)
      // Assa o transform do arquivo (mão, dequantização) + o lugar no centro.
      m.computeWorldMatrix(true)
      m.bakeTransformIntoVertices(m.getWorldMatrix().multiply(placement))
      m.parent = null
      m.position.setAll(0)
      m.rotationQuaternion = null
      m.rotation.setAll(0)
      m.scaling.setAll(1)
    }
    for (const m of parts) {
      c.meshes.splice(c.meshes.indexOf(m), 1)
      if (m.geometry) c.geometries.splice(c.geometries.indexOf(m.geometry), 1)
    }
    c.dispose() // nó raiz e materiais PBR do arquivo
    const out: Mesh[] = []
    let triangles = 0
    const textured = (g: Mesh[]) => g.length > 0 && g.every((m) => m.isVerticesDataPresent("uv"))
    const st = this.steam
    const plan: [Mesh[], Material, Part][] = [
      [groups.body, st && textured(groups.body) ? st.trim : this.bodyMat, "body"],
      [groups.wall, st?.wall && textured(groups.wall) ? st.wall : this.bodyMat, "wall"],
      [groups.glow, this.glowMat, "glow"],
      [groups.lamp, st ? st.lamp : this.glowMat, "lamp"],
    ]
    for (const [group, mat, tag] of plan) {
      if (!group.length) continue
      for (const m of group) {
        if (m.geometry) this.scene.addGeometry(m.geometry)
        this.scene.addMesh(m)
      }
      const merged = group.length > 1 ? Mesh.MergeMeshes(group as Mesh[], true, true) : group[0]
      if (!merged) continue
      merged.name = `mm-center-${id}-${tag}`
      merged.material = mat
      merged.useVertexColors = true
      // COLOR_0 chega em RGBA (alfa 1): sem isto entraria na fila de transparência.
      merged.hasVertexAlpha = false
      merged.isPickable = false
      // A caixa de recorte do arquivo é a quantizada: refazer com os vértices assados
      // (sem isto a câmera descarta a malha olhando de perto — a parede "some").
      merged.refreshBoundingInfo()
      merged.freezeWorldMatrix()
      merged.doNotSyncBoundingInfo = true
      triangles += merged.getTotalIndices() / 3
      out.push(merged)
    }
    const rec = { meshes: out, triangles }
    this.loaded.set(id, rec)
    return rec
  }

  /**
   * Junta as malhas de todos os modelos já carregados por MATERIAL e por bloco
   * de `cell` metros (mm3d-53b): os 18 prédios viravam ~70 chamadas de desenho
   * (4 malhas cada); juntos são uma por material em cada bloco, e a câmera
   * ainda recorta os blocos de trás. Roda uma vez, quando tudo chegou.
   */
  consolidate(cell = 64) {
    if (this.disposed) return
    const all = [...this.loaded.values()].flatMap((r) => r.meshes)
    const groups = new Map<string, Mesh[]>()
    for (const m of all) {
      const c = m.getBoundingInfo().boundingBox.centerWorld
      const key = `${m.material?.uniqueId ?? 0}|${Math.floor(c.x / cell)}|${Math.floor(c.z / cell)}`
      const g = groups.get(key)
      if (g) g.push(m)
      else groups.set(key, [m])
    }
    const out: Mesh[] = []
    let triangles = 0
    let n = 0
    for (const g of groups.values()) {
      const mat = g[0].material
      const merged = g.length > 1 ? Mesh.MergeMeshes(g, true, true) : g[0]
      if (!merged) {
        out.push(...g)
        continue
      }
      merged.name = `mm-center-merged-${n++}`
      merged.material = mat
      merged.useVertexColors = true
      merged.hasVertexAlpha = false
      merged.isPickable = false
      merged.refreshBoundingInfo()
      merged.freezeWorldMatrix()
      merged.doNotSyncBoundingInfo = true
      triangles += merged.getTotalIndices() / 3
      out.push(merged)
    }
    this.loaded.clear()
    this.loaded.set("merged", { meshes: out, triangles })
  }

  dispose() {
    this.disposed = true
    for (const p of this.loaded.values()) for (const m of p.meshes) m.dispose(false, false)
    this.loaded.clear()
    this.bodyMat.dispose()
    this.glowMat.dispose()
  }
}
