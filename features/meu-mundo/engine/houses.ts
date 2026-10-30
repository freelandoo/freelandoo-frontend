// features/meu-mundo/engine/houses.ts
//
// Modelos das casas níveis 02–10 (GLB do pipeline MEU MUNDO 3D/pipeline/casas).
// O nível 01 não passa por aqui: é a geometria que o world.ts sempre desenhou.
// Desde o mm3d-08 os níveis 02–09 são modelados no MESMO estilo dela
// (build_styled.py): caixas com cor por vértice (COLOR_0), sem textura.
//
// ═══ UM MODELO POR NÍVEL, NÃO POR CASA ═══
// Cada nível é baixado UMA vez e vira UMA malha na cena (mais a malha das
// luzes "_glow", desde o mm3d-51: vidro âmbar e lanternas, desenhadas com o
// material de luz do bairro, que acende de noite). As casas que usam
// aquele nível são THIN INSTANCES dela (uma matriz por lote): vinte casas do
// mesmo nível custam uma chamada de desenho, a mesma geometria, o mesmo
// material e a mesma textura. Trocar o nível de uma casa só reescreve as
// matrizes dos dois níveis envolvidos — nada é clonado nem recriado.
//
// ═══ MEMÓRIA ═══
// Política de cache (documentada no REGISTRO): fica carregado todo nível em
// uso por alguma casa do bairro + até MAX_IDLE níveis sem uso (os mais
// recentes, para quem está testando ir e voltar). Além disso, o modelo sai da
// GPU (malha, material e textura). O cache HTTP do navegador não é tocado: o
// nome do arquivo tem hash, então baixar de novo é ler do disco.
//
// ═══ O QUE É FEITO NO CARREGAMENTO ═══
// O transform do glTF (mão direita → esquerda, dequantização do
// KHR_mesh_quantization) é ASSADO nos vértices: a malha fica em coordenadas
// locais do lote (frente no -Z, origem = frente dos degraus), e cada thin
// instance só leva a posição e a rotação do lote. O material do arquivo é
// trocado por um StandardMaterial com os MESMOS ajustes do "mm-world" (difuso
// branco × cor do vértice, sem brilho): a casa nível 02 é iluminada igual à 01
// do lado. Modelo antigo com textura (Tripo) ainda funciona: usa a textura.

import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture"
import type { Material } from "@babylonjs/core/Materials/material"
import type { Node } from "@babylonjs/core/node"
import type { Scene } from "@babylonjs/core/scene"
import { ensureLoaders } from "./avatars"
import type { HouseCatalog } from "../types"

const MAX_IDLE = 2

interface Entry {
  level: number
  promise: Promise<void>
  mesh: Mesh | null
  /** Vidro aceso e lanternas (mm3d-51), com o material de luz do bairro. */
  glow: Mesh | null
  material: StandardMaterial | null
  texture: BaseTexture | null
  lastUsed: number
  failed: boolean
}

export class HouseModels {
  private readonly entries = new Map<number, Entry>()
  /** lote → { nível exibido em GLB, matriz do lote } */
  private readonly lots = new Map<number, { level: number; matrix: Matrix }>()
  private readonly progress = new Map<number, Set<(p: number) => void>>()
  private disposed = false
  private clock = 0

  constructor(
    private readonly scene: Scene,
    private readonly catalog: HouseCatalog,
    /** Textura de acabamento do bairro (mm3d-51): vale para modelo com UV e sem textura própria. */
    private readonly detail: BaseTexture | null = null,
    /** Material de luz do bairro (as malhas "_glow" dos modelos). */
    private readonly glowMaterial: Material | null = null,
  ) {
    ensureLoaders()
  }

  /** Níveis com modelo na GPU agora (painel técnico). */
  get loadedLevels() {
    return [...this.entries.values()].filter((e) => e.mesh).map((e) => e.level)
  }

  private def(level: number) {
    return this.catalog.levels.find((l) => l.level === level)
  }

  /** Garante o modelo do nível na cena. Rejeita se o arquivo não carregar. */
  load(level: number, onProgress?: (p: number) => void): Promise<void> {
    if (this.disposed) return Promise.reject(new Error("disposed"))
    const def = this.def(level)
    if (!def?.available || !def.asset) return Promise.reject(new Error(`nível ${level} sem modelo`))
    let e = this.entries.get(level)
    if (e && e.failed) {
      this.entries.delete(level)
      e = undefined
    }
    if (onProgress) {
      let set = this.progress.get(level)
      if (!set) this.progress.set(level, (set = new Set()))
      set.add(onProgress)
    }
    if (!e) {
      const entry: Entry = { level, promise: Promise.resolve(), mesh: null, glow: null, material: null, texture: null, lastUsed: ++this.clock, failed: false }
      entry.promise = this.fetch(entry, this.catalog.basePath + def.asset).catch((err) => {
        entry.failed = true
        throw err
      })
      this.entries.set(level, entry)
      e = entry
    }
    e.lastUsed = ++this.clock
    const done = () => {
      if (onProgress) this.progress.get(level)?.delete(onProgress)
    }
    return e.promise.then(done, (err) => {
      done()
      throw err
    })
  }

  private async fetch(entry: Entry, url: string) {
    const c = await LoadAssetContainerAsync(url, this.scene, {
      onProgress: (ev) => {
        if (!ev.lengthComputable || !ev.total) return
        const p = ev.loaded / ev.total
        for (const cb of this.progress.get(entry.level) ?? []) cb(p)
      },
    })
    if (this.disposed || this.entries.get(entry.level) !== entry) {
      c.dispose()
      throw new Error("descartado")
    }
    const all = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
    // O nome "_glow" fica no nó do arquivo (o gltfpack põe a malha num nó
    // filho sem nome, o da dequantização): sobe pela hierarquia.
    const isGlow = (m: Mesh) => {
      for (let n: Node | null = m; n; n = n.parent) if (/_glow/.test(n.name)) return true
      return false
    }
    const glows = all.filter(isGlow)
    const geo = all.filter((m) => !glows.includes(m))
    if (geo.length !== 1 || glows.length > 1) {
      c.dispose()
      throw new Error(`modelo do nível ${entry.level} com ${all.length} malhas`)
    }
    const mesh = geo[0]
    const glow = glows[0] ?? null
    const src = mesh.material as unknown as { albedoTexture?: BaseTexture | null; diffuseTexture?: BaseTexture | null } | null
    const texture = src?.albedoTexture ?? src?.diffuseTexture ?? null
    // Assa o transform do arquivo (mão, dequantização) e solta a malha do nó raiz.
    const keep = glow ? [mesh, glow] : [mesh]
    for (const m of keep) {
      m.computeWorldMatrix(true)
      m.bakeTransformIntoVertices(m.getWorldMatrix().clone())
    }
    for (const m of keep) {
      m.parent = null
      m.position.setAll(0)
      m.rotationQuaternion = null
      m.rotation.setAll(0)
      m.scaling.setAll(1)
    }
    // Tira do contêiner o que fica; o resto (nó raiz, material PBR) é descartado.
    const keepGeo = mesh.geometry
    const glowGeo = glow?.geometry ?? null
    for (const m of keep) c.meshes.splice(c.meshes.indexOf(m), 1)
    if (keepGeo) c.geometries.splice(c.geometries.indexOf(keepGeo), 1)
    if (glowGeo) c.geometries.splice(c.geometries.indexOf(glowGeo), 1)
    if (texture) c.textures.splice(c.textures.indexOf(texture as never), 1)
    c.dispose()

    const mat = new StandardMaterial(`mm-house-n${entry.level}`, this.scene)
    mat.specularColor = new Color3(0, 0, 0)
    if (texture) {
      mat.diffuseTexture = texture
      mat.emissiveTexture = texture
      mat.emissiveColor = new Color3(0.3, 0.3, 0.3)
      mat.diffuseColor = new Color3(0.82, 0.82, 0.82)
    } else {
      // Igual às peças do bairro (steampunk/materials.ts "sp-trim"): a cor vem
      // do vértice e, se o modelo tem UV por face, a textura de acabamento põe
      // o chanfro escuro em cada face. A textura é do bairro: não é solta aqui.
      if (this.detail && mesh.isVerticesDataPresent("uv")) mat.diffuseTexture = this.detail
      mat.diffuseColor = new Color3(1, 1, 1)
      mesh.useVertexColors = true
      // COLOR_0 chega em RGBA (alfa sempre 1): sem isto o loader marca a malha
      // como translúcida e ela entraria na fila de transparência.
      mesh.hasVertexAlpha = false
    }
    // Peças simples com faces internas (como a casa 01): sem descarte de face
    // traseira, nada "some" de um ângulo.
    mat.backFaceCulling = false
    if (keepGeo) this.scene.addGeometry(keepGeo)
    if (texture) this.scene.addTexture(texture)
    this.scene.addMesh(mesh)
    mesh.material = mat
    mesh.name = `mm-house-n${entry.level}`
    mesh.isPickable = false
    mesh.doNotSyncBoundingInfo = true
    mesh.setEnabled(false)
    mesh.freezeWorldMatrix()
    entry.mesh = mesh
    entry.material = mat
    if (glow && glowGeo) {
      this.scene.addGeometry(glowGeo)
      this.scene.addMesh(glow)
      glow.material = this.glowMaterial ?? mat
      glow.useVertexColors = true
      glow.hasVertexAlpha = false
      glow.name = `mm-house-n${entry.level}-glow`
      glow.isPickable = false
      glow.doNotSyncBoundingInfo = true
      glow.setEnabled(false)
      glow.freezeWorldMatrix()
      entry.glow = glow
    }
    entry.texture = texture
    this.syncLevel(entry.level)
  }

  /**
   * Mostra o lote com o modelo do nível (null = sem modelo GLB, ou seja,
   * casa 01 desenhada pelo mundo). O nível precisa estar carregado.
   */
  show(lot: number, level: number | null, matrix: Matrix): boolean {
    // Modelo saiu da GPU entre o fim do download e agora: quem chamou pede de novo.
    if (level !== null && !this.entries.get(level)?.mesh) return false
    const prev = this.lots.get(lot)?.level
    if (level === null) this.lots.delete(lot)
    else this.lots.set(lot, { level, matrix })
    if (prev && prev !== level) this.syncLevel(prev)
    if (level !== null) this.syncLevel(level)
    this.evict()
    return true
  }

  private syncLevel(level: number) {
    const e = this.entries.get(level)
    if (!e?.mesh) return
    const mats: Matrix[] = []
    for (const v of this.lots.values()) if (v.level === level) mats.push(v.matrix)
    if (mats.length) e.lastUsed = ++this.clock
    const buf = new Float32Array(Math.max(1, mats.length) * 16)
    mats.forEach((m, i) => m.copyToArray(buf, i * 16))
    for (const m of e.glow ? [e.mesh, e.glow] : [e.mesh]) {
      m.thinInstanceSetBuffer("matrix", buf, 16, true)
      m.thinInstanceCount = mats.length
      m.thinInstanceRefreshBoundingInfo(false)
      m.setEnabled(mats.length > 0)
    }
  }

  private inUse(level: number) {
    for (const v of this.lots.values()) if (v.level === level) return true
    return false
  }

  /** Mantém em uso + MAX_IDLE níveis ociosos mais recentes; o resto sai da GPU. */
  private evict() {
    const idle = [...this.entries.values()]
      .filter((e) => e.mesh && !this.inUse(e.level))
      .sort((a, b) => b.lastUsed - a.lastUsed)
    for (const e of idle.slice(MAX_IDLE)) this.drop(e)
  }

  private drop(e: Entry) {
    this.entries.delete(e.level)
    e.mesh?.dispose(false, false)
    e.glow?.dispose(false, false)
    e.glow = null
    e.material?.dispose()
    e.texture?.dispose()
    e.mesh = null
  }

  dispose() {
    this.disposed = true
    for (const e of [...this.entries.values()]) this.drop(e)
    this.lots.clear()
    this.progress.clear()
  }
}
