// features/meu-mundo/engine/avatars.ts
//
// Avatares do bairro: os quatro corpos (normal, magro, gordo, forte) e as três
// animações de locomoção (Idle, Walk, SlowRun), produzidos no Blender a partir
// do personagem rigado no Mixamo (pipeline em MEU MUNDO 3D/pipeline).
//
// ═══ O QUE É COMPARTILHADO E O QUE NÃO É ═══
// Compartilhado (seguro): o arquivo de cada corpo é baixado UMA vez (a malha
// de cada jogador reaproveita a geometria do contêiner), o atlas de textura é
// UM só para os quatro corpos e um material só serve todos.
// NÃO compartilhado: cada jogador tem o próprio esqueleto (nós transformados)
// e os próprios AnimationGroups — clonados do arquivo de animação e ligados
// aos ossos DELE pelo nome. Estado mutável de animação nunca é dividido.
//
// ═══ O QUE ESTE ARQUIVO NÃO CARREGA ═══
// Treinos, boxe e lutas ficam como fonte no Blender e NÃO entram aqui: o
// bairro só conhece os arquivos listados em ASSETS. Ambientes futuros
// (academia, coliseu) terão a própria lista.

import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Node } from "@babylonjs/core/node"
import type { Scene } from "@babylonjs/core/scene"
import { ANIM_NATURAL_SPEED, type MoveState } from "./motion"
import type { BodyId } from "../types"

export const AVATAR_ASSET_VERSION = "v2"
const BASE = `/meu-mundo/avatares/${AVATAR_ASSET_VERSION}/`
const ASSETS = {
  texture: "avatar-basecolor-512.jpg",
  bodies: {
    normal: "avatar-normal.glb",
    slim: "avatar-slim.glb",
    fat: "avatar-fat.glb",
    strong: "avatar-strong.glb",
  } satisfies Record<BodyId, string>,
  // Mesmas três animações (mesmos nomes, mesmos ossos, mesmos estados). Gordo
  // e forte têm um ajuste próprio do braço (abertura, rotação e cotovelo,
  // calibrado no Blender) para a mão não atravessar a barriga nem o peito.
  anims: {
    base: "anim-locomotion.glb",
    fat: "anim-locomotion-fat.glb",
    strong: "anim-locomotion-strong.glb",
  },
}
type AnimSet = keyof typeof ASSETS.anims
const ANIM_SET: Record<BodyId, AnimSet> = { normal: "base", slim: "base", fat: "fat", strong: "strong" }
const CLIPS = ["Idle", "Walk", "SlowRun"] as const
type Clip = (typeof CLIPS)[number]

let loadersRegistered = false

/** Registra os carregadores (glTF) uma vez por página. Avatares e casas usam. */
export function ensureLoaders() {
  if (loadersRegistered) return
  registerBuiltInLoaders()
  loadersRegistered = true
}

export class AvatarLibrary {
  readonly material: StandardMaterial
  private readonly texture: Texture
  private readonly bodies = new Map<BodyId, Promise<AssetContainer>>()
  private readonly anims = new Map<AnimSet, Promise<AssetContainer>>()
  private disposed = false
  /** Instâncias vivas (painel técnico e conferência de descarte). */
  live = 0

  constructor(private readonly scene: Scene) {
    ensureLoaders()
    // Atlas único, sem mapas PBR: o próprio basecolor já traz o sombreado do
    // modelo, então o material é simples (difuso + um pouco de emissivo para
    // não escurecer o sombreado que já vem pintado).
    this.texture = new Texture(BASE + ASSETS.texture, scene, false, false)
    const m = new StandardMaterial("mm-avatar", scene)
    m.diffuseTexture = this.texture
    m.emissiveTexture = this.texture
    m.emissiveColor = new Color3(0.42, 0.42, 0.42)
    m.diffuseColor = new Color3(0.72, 0.72, 0.72)
    m.specularColor = new Color3(0, 0, 0)
    this.material = m
  }

  private body(id: BodyId) {
    let p = this.bodies.get(id)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.bodies[id], this.scene)
      p.catch(() => this.bodies.delete(id))
      this.bodies.set(id, p)
    }
    return p
  }

  private animSet(id: BodyId) {
    const key = ANIM_SET[id]
    let p = this.anims.get(key)
    if (!p) {
      p = LoadAssetContainerAsync(BASE + ASSETS.anims[key], this.scene)
      p.catch(() => this.anims.delete(key))
      this.anims.set(key, p)
    }
    return p
  }

  /** Cria um avatar com esqueleto e animações próprios. */
  async create(id: BodyId): Promise<AvatarRig> {
    const [container, anims] = await Promise.all([this.body(id), this.animSet(id)])
    if (this.disposed) throw new Error("disposed")
    const entries = container.instantiateModelsToScene((n) => n, false, { doNotInstantiate: true })
    const root = entries.rootNodes[0] as TransformNode
    const byName = new Map<string, Node>()
    for (const n of root.getDescendants(false)) byName.set(n.name, n)
    const groups = {} as Record<Clip, AnimationGroup>
    for (const clip of CLIPS) {
      const src = anims.animationGroups.find((g) => g.name === clip)
      if (!src) throw new Error(`animação ${clip} ausente`)
      const g = src.clone(`${clip}#${++cloneSeq}`, (old: Node) => byName.get(old.name) ?? null, true)
      groups[clip] = g
    }
    const meshes = root.getChildMeshes(false) as AbstractMesh[]
    for (const mesh of meshes) {
      mesh.material = this.material
      mesh.isPickable = false
      // Bounding com folga: o esqueleto animado sai um pouco da pose T de
      // repouso, e sem isso a malha some na borda da tela.
      mesh.refreshBoundingInfo({ applySkeleton: false })
      mesh.getBoundingInfo().scale(1.25)
    }
    this.live++
    return new AvatarRig(this, id, entries, root, groups, meshes)
  }

  release() {
    this.live--
  }

  dispose() {
    this.disposed = true
    const all = [...this.bodies.values(), ...this.anims.values()]
    for (const p of all) p.then((c) => c.dispose()).catch(() => {})
    this.bodies.clear()
    this.anims.clear()
    this.material.dispose()
    this.texture.dispose()
  }
}

let cloneSeq = 0

/** Um corpo animado. Não sabe de rede nem de colisão: recebe estado e toca. */
export class AvatarRig {
  private weights: Record<Clip, number> = { Idle: 1, Walk: 0, SlowRun: 0 }
  private disposed = false

  constructor(
    private readonly lib: AvatarLibrary,
    readonly body: BodyId,
    private readonly entries: InstantiatedEntries,
    readonly root: TransformNode,
    private readonly groups: Record<Clip, AnimationGroup>,
    readonly meshes: AbstractMesh[],
  ) {
    for (const clip of CLIPS) {
      const g = groups[clip]
      g.weight = this.weights[clip]
      g.start(true, 1)
      if (this.weights[clip] === 0) g.pause()
    }
  }

  setParent(parent: TransformNode) {
    this.root.parent = parent
  }

  setVisible(v: boolean) {
    for (const m of this.meshes) m.isVisible = v
  }

  /**
   * Transição suave entre repouso, caminhada e corrida lenta. A velocidade de
   * reprodução segue a velocidade REAL do deslocamento (reduz o deslize dos
   * pés): a animação anda X m/s a 1×, então a taxa é velocidade ÷ X.
   */
  update(dt: number, move: MoveState, speed: number) {
    if (this.disposed) return
    const target: Record<Clip, number> = {
      Idle: move === 0 ? 1 : 0,
      Walk: move === 1 ? 1 : 0,
      SlowRun: move === 2 ? 1 : 0,
    }
    const k = 1 - Math.exp(-10 * dt)
    let sum = 0
    for (const clip of CLIPS) {
      let w = this.weights[clip] + (target[clip] - this.weights[clip]) * k
      if (Math.abs(w - target[clip]) < 0.01) w = target[clip]
      this.weights[clip] = w
      sum += w
    }
    for (const clip of CLIPS) {
      const g = this.groups[clip]
      const w = sum > 0 ? this.weights[clip] / sum : 0
      g.weight = w
      if (w <= 0 && g.isPlaying) g.pause()
      else if (w > 0 && !g.isPlaying) g.play(true)
    }
    const walkRate = speed > 0.05 ? speed / ANIM_NATURAL_SPEED.walk : 1
    const runRate = speed > 0.05 ? speed / ANIM_NATURAL_SPEED.run : 1
    this.groups.Walk.speedRatio = Math.max(0.5, Math.min(2.2, walkRate))
    this.groups.SlowRun.speedRatio = Math.max(0.6, Math.min(2.2, runRate))
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const clip of CLIPS) this.groups[clip].dispose()
    this.entries.dispose()
    this.lib.release()
  }
}

/** Disco translúcido no chão: a cena não tem sombras dinâmicas. */
export function makeShadow(scene: Scene, mat: StandardMaterial, name: string): Mesh {
  const d = MeshBuilder.CreateDisc(name, { radius: 0.48, tessellation: 18 }, scene)
  d.rotation.x = Math.PI / 2
  d.material = mat
  d.isPickable = false
  return d
}

/** Etiqueta com o nome público acima de outro jogador. */
export function makeNameTag(scene: Scene, text: string, mine: boolean) {
  const W = 256
  const H = 64
  const tex = new DynamicTexture(`mm-tag-${text}`, { width: W, height: H }, scene, false)
  tex.hasAlpha = true
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, W, H)
  ctx.font = "800 30px system-ui, -apple-system, Segoe UI, sans-serif"
  const w = Math.min(W - 8, ctx.measureText(text).width + 28)
  ctx.fillStyle = mine ? "rgba(242,183,5,0.95)" : "rgba(11,11,13,0.78)"
  ctx.fillRect((W - w) / 2, 10, w, 44)
  ctx.fillStyle = mine ? "#0B0B0D" : "#F7F0D9"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, W / 2, 33, W - 30)
  tex.update(true)
  const mat = new StandardMaterial(`mm-tag-mat-${text}`, scene)
  mat.diffuseTexture = tex
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.disableLighting = true
  mat.useAlphaFromDiffuseTexture = true
  mat.backFaceCulling = false
  const plane = MeshBuilder.CreatePlane(`mm-tag-${text}`, { width: 1.6, height: 0.4 }, scene)
  plane.material = mat
  plane.billboardMode = 7
  plane.isPickable = false
  return {
    mesh: plane,
    dispose() {
      plane.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}

export function newHolder(scene: Scene, name: string) {
  return new TransformNode(name, scene)
}
