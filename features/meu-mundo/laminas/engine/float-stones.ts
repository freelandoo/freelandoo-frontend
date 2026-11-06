// features/meu-mundo/laminas/engine/float-stones.ts — as pedras do Golem de Pedra (2026-11-06).
//
// Regra do Alex: a arma do Golem são duas pedras flutuando atrás dos ombros, acima deles, na
// altura da cabeça, do tamanho da mão dele. No golpe máximo as duas se juntam na frente do
// peito e soltam o raio. É só desenho: quem decide acerto e dano é sim/fight.ts.
import type { Scene } from "@babylonjs/core/scene"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { ensureLoaders } from "../../engine/avatars"
import type { Character } from "../../engine/player"
import { shineWeapon } from "../../engine/weapon-shine"

const URL = "/meu-mundo/armas/v2/pedra-golem-m71.glb"
const B = "mixamorig:"

const loads = new WeakMap<Scene, Promise<AssetContainer>>()
function stoneFile(scene: Scene) {
  let p = loads.get(scene)
  if (!p) {
    ensureLoaders()
    p = LoadAssetContainerAsync(URL, scene)
    loads.set(scene, p)
  }
  return p
}

export class FloatStones {
  private readonly nodes: TransformNode[] = []
  private readonly entries: InstantiatedEntries[] = []
  private size = 0
  private t = Math.random() * 6
  private joined = 0
  private gone = false
  /** 0 = atrás dos ombros, 1 = juntas na frente. */
  join = 0
  private readonly muzzles = [new Vector3(), new Vector3()]
  private readonly center = new Vector3()

  constructor(
    scene: Scene,
    private readonly char: Character,
    addGlow?: (m: AbstractMesh) => void,
  ) {
    stoneFile(scene)
      .then((c) => {
        if (this.gone) return
        for (let i = 0; i < 2; i++) {
          const e = c.instantiateModelsToScene((n) => `${n}-pedra-${i}`, false, { doNotInstantiate: true })
          const node = new TransformNode(`mm-pedra-${i}`, scene)
          for (const r of e.rootNodes) {
            r.parent = node
            shineWeapon(r as TransformNode, addGlow)
            for (const m of (r as TransformNode).getChildMeshes(false)) {
              m.isPickable = false
              if (m.material instanceof PBRMaterial) m.material.metallic = 0.25
            }
          }
          node.setEnabled(false)
          this.nodes.push(node)
          this.entries.push(e)
        }
      })
      .catch(() => {})
  }

  /** Do tamanho da mão (do pulso à ponta do indicador), medido no corpo. */
  private measure() {
    const wrist = this.char.bonePosition(`${B}RightHand`)
    const tip = this.char.bonePosition(`${B}RightHandIndex4`)
    if (!wrist || !tip) return 0
    // o osso é mais curto que a mão de pedra da malha: o punho fechado mede ~24% do corpo
    return Math.max(Vector3.Distance(wrist, tip) * 1.15, this.char.height * 0.24)
  }

  update(dt: number, facing: number, x: number, z: number) {
    if (this.nodes.length < 2) return
    const head = this.char.bonePosition(`${B}Head`)
    const left = this.char.bonePosition(`${B}LeftArm`)
    const right = this.char.bonePosition(`${B}RightArm`)
    if (!head || !left || !right) return
    if (!this.size) {
      this.size = this.measure()
      if (!this.size) return
      for (const n of this.nodes) {
        n.scaling.setAll(this.size)
        n.setEnabled(true)
      }
    }
    this.t += dt
    this.joined += (this.join - this.joined) * Math.min(1, dt * 7)
    const fx = Math.sin(facing)
    const fz = Math.cos(facing)
    const H = this.char.height
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1
      const bob = Math.sin(this.t * 1.7 + i * 2.1) * H * 0.012
      // atrás do ombro de cada lado, um pouco para fora, na altura da cabeça
      const shoulder = i ? right : left
      const away = (i ? 1 : -1) * ((shoulder.x - x) * fz - (shoulder.z - z) * fx >= 0 ? 1 : -1) * s
      const restX = shoulder.x + fz * away * H * 0.04 - fx * H * 0.12
      const restZ = shoulder.z - fx * away * H * 0.04 - fz * H * 0.12
      const restY = head.y + H * 0.03 + bob
      // juntas, encostadas, na frente do peito
      const gap = this.size * 0.3
      const frontX = x + fx * H * 0.17 + fz * s * gap
      const frontZ = z + fz * H * 0.17 - fx * s * gap
      const frontY = head.y - H * 0.04
      const k = this.joined
      const n = this.nodes[i]
      n.position.set(restX + (frontX - restX) * k, restY + (frontY - restY) * k, restZ + (frontZ - restZ) * k)
      n.rotation.y = facing + Math.sin(this.t * 0.9 + i) * 0.14 * (1 - k)
      n.rotation.z = Math.sin(this.t * 1.3 + i * 1.7) * 0.06 * (1 - k)
      this.muzzles[i].set(n.position.x + fx * this.size * 0.2, n.position.y, n.position.z + fz * this.size * 0.2)
    }
    this.center.copyFrom(this.muzzles[0]).addInPlace(this.muzzles[1]).scaleInPlace(0.5)
  }

  /** De onde sai o raio de cada pedra. */
  get mouths(): readonly Vector3[] {
    return this.muzzles
  }

  /** O meio das duas (o raio do golpe máximo). */
  get mid(): Vector3 {
    return this.center
  }

  get ready() {
    return this.size > 0
  }

  setVisible(v: boolean) {
    if (this.size) for (const n of this.nodes) n.setEnabled(v)
  }

  dispose() {
    this.gone = true
    for (const e of this.entries) e.dispose()
    for (const n of this.nodes) n.dispose()
  }
}
