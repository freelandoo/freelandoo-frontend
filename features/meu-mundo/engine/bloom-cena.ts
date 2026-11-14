// features/meu-mundo/engine/bloom-cena.ts — bloom SELETIVO do cenário (visual premium §15).
//
// Nunca na imagem inteira: só o que já brilha na malha (lava, cristais, portais, painéis,
// janelas — os vértices marcados com `glowFlag` pelo `fuseGlow`, V3). A GlowLayer do Babylon não
// lê essa marca por vértice (o shader dela só vê a emissiva do material, que no bloco fundido é
// a do acabamento), então cada bloco ganha uma "casca": uma malha filha só com os triângulos do
// brilho, sem luz, com a cor do vértice — a única coisa que a GlowLayer desenha
// (`addIncludedOnlyMesh`; os blocos entram pretos, para tampar o brilho escondido). No passe normal a casca cai exatamente em cima do brilho fundido, com a
// mesma cor (a casca vem um fio à frente, `zOffset`), então a imagem de base não muda.
//
// Liga só onde o perfil manda: `QUALITY[tier].bloom === "margin"` (high). Custo: o passe da camada
// redesenha os blocos (pretos) e as cascas + a camada em meia resolução com 2 desfoques e a mistura.
// A casca é filha do bloco: liga/desliga com o LOD dele e morre com ele.

import { GlowLayer } from "@babylonjs/core/Layers/glowLayer"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer"
import type { Scene } from "@babylonjs/core/scene"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { QualityProfile } from "./quality"

/** O perfil pede o bloom do cenário? (só o "margin" do high) */
export const wantsSceneBloom = (q: QualityProfile) => q.bloom === "margin"

export interface SceneBloomOptions {
  /** Força da camada (padrão 0,55: halo, não neblina de luz). */
  intensity?: number
  /** Raio do desfoque em texels da camada (padrão 32). */
  kernel?: number
}

/** Só os triângulos com os três vértices marcados como brilho. null = o bloco não brilha. */
function shellOf(m: Mesh, mat: StandardMaterial): Mesh | null {
  const flag = m.getVerticesData("glowFlag")
  const pos = m.getVerticesData(VertexBuffer.PositionKind)
  const idx = m.getIndices()
  if (!flag || !pos || !idx) return null
  const col = m.getVerticesData(VertexBuffer.ColorKind)
  const cs = col ? col.length / (pos.length / 3) : 0
  const remap = new Map<number, number>()
  const P: number[] = []
  const C: number[] = []
  const I: number[] = []
  const take = (v: number) => {
    let k = remap.get(v)
    if (k === undefined) {
      k = P.length / 3
      remap.set(v, k)
      P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
      if (col && cs >= 3) C.push(col[v * cs], col[v * cs + 1], col[v * cs + 2], 1)
      else C.push(1, 1, 1, 1)
    }
    return k
  }
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2]
    if (flag[a] > 0.5 && flag[b] > 0.5 && flag[c] > 0.5) I.push(take(a), take(b), take(c))
  }
  if (!I.length) return null
  const s = new Mesh(`${m.name}-bloom`, m.getScene())
  const vd = new VertexData()
  vd.positions = P
  vd.colors = C
  vd.indices = I
  vd.applyToMesh(s, false)
  s.material = mat
  s.useVertexColors = true
  s.isPickable = false
  s.applyFog = m.applyFog
  s.parent = m
  s.freezeWorldMatrix()
  return s
}

export class SceneBloom {
  private layer: GlowLayer | null = null
  private mat: StandardMaterial | null = null
  private shells: Mesh[] = []

  constructor(
    private readonly scene: Scene,
    q: QualityProfile,
    private readonly opts: SceneBloomOptions = {},
  ) {
    if (wantsSceneBloom(q)) this.enable()
  }

  /** O perfil pediu (a camada pode ainda não existir, se nada brilha). */
  get on() {
    return this.wanted
  }

  /** Quantas cascas (blocos com brilho) a camada desenha. */
  get count() {
    return this.shells.length
  }

  private wanted = false

  private enable() {
    this.wanted = true
  }

  /** A camada nasce só quando há o que brilhar (cena sem brilho, como o Cânion, não paga nada). */
  private ensure(): GlowLayer | null {
    if (!this.wanted) return null
    if (this.layer) return this.layer
    const mat = new StandardMaterial("mm-bloom-casca", this.scene)
    mat.disableLighting = true
    mat.emissiveColor = new Color3(1, 1, 1)
    mat.diffuseColor = new Color3(0, 0, 0)
    mat.specularColor = new Color3(0, 0, 0)
    // um fio à frente do bloco: na camada o bloco (preto) não apaga o brilho por empate de fundo
    mat.zOffset = -2
    this.mat = mat
    const g = new GlowLayer("mm-bloom-cena", this.scene, { mainTextureRatio: 0.5, blurKernelSize: this.opts.kernel ?? 32, mainTextureSamples: 1 })
    g.intensity = this.opts.intensity ?? 0.55
    // oclusor sempre preto (placa, vidro ou pele com emissiva não viram halo); quem brilha passa
    // pelo próprio material (`referenceMeshToUseItsOwnMaterial`) e não lê isto
    g.customEmissiveColorSelector = (_m, _s, _mat, out) => out.set(0, 0, 0, 1)
    g.customEmissiveTextureSelector = () => null as never
    this.layer = g
    return g
  }

  /**
   * Rua (bairro/centro): o brilho é malha à parte (`sp-glow`, janelas e lanternas). `isGlow` entra
   * com o próprio material; `isOccluder` entra preta (tampa o brilho atrás da casa). Vale para o
   * que já está na cena e para o que carregar depois (casas e props chegam aos poucos).
   * `activeWhen` (a cada quadro): falso = a camada não desenha (a rua, de dia).
   */
  track(isGlow: (m: AbstractMesh) => boolean, isOccluder: (m: AbstractMesh) => boolean, activeWhen?: () => boolean) {
    const g = this.ensure()
    if (!g) return
    const seen = new WeakSet<AbstractMesh>()
    const take = (m: AbstractMesh) => {
      if (seen.has(m) || m.isDisposed() || !m.material) return
      if ((m as { sourceMesh?: unknown }).sourceMesh) return // a instância vai junto com a fonte
      if (isGlow(m)) {
        g.addIncludedOnlyMesh(m as Mesh)
        g.referenceMeshToUseItsOwnMaterial(m)
      } else if (isOccluder(m)) g.addIncludedOnlyMesh(m as Mesh)
      else return
      seen.add(m)
    }
    for (const m of this.scene.meshes) take(m)
    // malha nova costuma ganhar o material depois de entrar na cena: confere no quadro seguinte
    let pending: AbstractMesh[] = []
    const add = this.scene.onNewMeshAddedObservable.add((m) => pending.push(m))
    const tick = this.scene.onBeforeRenderObservable.add(() => {
      // de dia o brilho é fraco: a camada desliga e não desenha nada
      if (activeWhen) g.isEnabled = activeWhen()
      if (!pending.length) return
      const now = pending
      pending = []
      for (const m of now) if (m.material) take(m)
        else pending.push(m)
      if (pending.length > 500) pending = []
    })
    this.unwatch = () => {
      this.scene.onNewMeshAddedObservable.remove(add)
      this.scene.onBeforeRenderObservable.remove(tick)
    }
  }

  private unwatch: (() => void) | null = null

  /** Cascas dos blocos fundidos (chamar uma vez por malha, depois de montada). */
  add(meshes: readonly Mesh[]) {
    if (!this.wanted) return
    const found: Mesh[] = []
    for (const m of meshes) if (m.getVerticesData("glowFlag")) found.push(m)
    if (!found.length) return
    const g = this.ensure()
    if (!g || !this.mat) return
    for (const m of meshes) {
      // o bloco entra também, preto (emissiva zero): tampa o brilho que está atrás de pedra/parede
      g.addIncludedOnlyMesh(m)
      const s = shellOf(m, this.mat)
      if (!s) continue
      this.shells.push(s)
      g.addIncludedOnlyMesh(s)
      // na camada com o PRÓPRIO material: a cor do vértice (a camada sozinha usaria só a emissiva
      // branca e todo brilho viraria halo branco — conferido no par de fotos)
      g.referenceMeshToUseItsOwnMaterial(s)
    }
  }

  dispose() {
    this.unwatch?.()
    this.unwatch = null
    for (const s of this.shells) if (!s.isDisposed()) s.dispose()
    this.shells = []
    this.layer?.dispose()
    this.layer = null
    this.mat?.dispose()
    this.mat = null
    this.wanted = false
  }
}
