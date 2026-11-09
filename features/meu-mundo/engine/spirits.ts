// features/meu-mundo/engine/spirits.ts — ESPÍRITOS DE LUZ do poder (2026-11-01).
//
// Pedido do Alex: no poder sai "um lobo — só uma cabeça grande com uma juba
// pequena no pescoço" e nos vampiros "um morcego todo grandão". Os dois são
// feitos de luz: brilham pelas bordas (fresnel), translúcidos, sem sombra.
//  - Lobo: o lobo da Arena (lobo-m65.glb) tocando a mordida, cortado logo
//    atrás do osso Head_0 por um plano de recorte que só vale para ele
//    (liga antes de desenhar, desliga depois) — fica a cabeça e um pedaço
//    da juba. Avança à frente de quem soltou o poder.
//  - Morcego: montado aqui (corpo, orelhas e duas asas recortadas que batem),
//    ~10 m de envergadura, sobe e voa para a frente.
import type { Scene } from "@babylonjs/core/scene"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Plane } from "@babylonjs/core/Maths/math.plane"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { Constants } from "@babylonjs/core/Engines/constants"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import "@babylonjs/loaders/glTF"
import { configureCodecs } from "./codecs"

const WOLF_URL = "/meu-mundo/laminas/lobo-m65.glb"
/** O lobo chega com o focinho para o lado (mesmo giro da monster-view). */
const WOLF_TURN = -Math.PI / 2

function ghostMat(scene: Scene, name: string, color: Color3) {
  const m = new StandardMaterial(name, scene)
  m.disableLighting = true
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  m.emissiveColor = color
  m.alpha = 0.55
  m.alphaMode = Constants.ALPHA_ADD
  m.disableDepthWrite = true
  m.backFaceCulling = false
  // bordas acesas (como o leão de luz da referência), miolo translúcido
  m.emissiveFresnelParameters = new FresnelParameters({ leftColor: Color3.White(), rightColor: color, bias: 0.15, power: 2.2 })
  m.opacityFresnelParameters = new FresnelParameters({ leftColor: Color3.White(), rightColor: new Color3(0.25, 0.25, 0.25), bias: 0.1, power: 1.8 })
  return m
}

/** Asa recortada (membrana com a borda de baixo em arcos), no plano XZ, raiz em x = 0. */
function wingMesh(scene: Scene, name: string, side: number) {
  const span = 2.7
  const pts: [number, number][] = [
    [0, 0.35],
    [span * 0.35, 0.75],
    [span * 0.7, 0.95],
    [span, 0.7],
    [span * 0.92, 0.2],
    [span * 0.75, -0.35],
    [span * 0.62, -0.05],
    [span * 0.48, -0.55],
    [span * 0.34, -0.15],
    [span * 0.2, -0.6],
    [0, -0.25],
  ]
  const positions: number[] = [0, 0, 0]
  for (const [x, z] of pts) positions.push(x * side, 0, z)
  const indices: number[] = []
  for (let i = 1; i < pts.length; i++) indices.push(0, i, i + 1 > pts.length ? 1 : i + 1)
  const m = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = positions
  vd.indices = indices.filter((v) => v <= pts.length)
  const normals: number[] = []
  VertexData.ComputeNormals(positions, vd.indices, normals)
  vd.normals = normals
  vd.applyToMesh(m)
  return m
}

interface Live {
  kind: "wolf" | "bat"
  root: TransformNode
  meshes: AbstractMesh[]
  mats: StandardMaterial[]
  t: number
  life: number
  from: Vector3
  dir: Vector3
  wings?: [TransformNode, TransformNode]
  anim?: AnimationGroup
  clip?: Plane
  /** Lobo: o osso do pescoço guia a cabeça (a raiz do modelo fica lá atrás). */
  neck?: TransformNode
  base: number
  dispose: () => void
}

export class Spirits {
  private wolfC: Promise<AssetContainer> | null = null
  private readonly live: Live[] = []
  private readonly sceneClip: { prev: Plane | null; on: boolean } = { prev: null, on: false }
  private disposed = false
  /** Rede de segurança: o recorte do lobo NUNCA passa do fim do quadro (2026-11-02). */
  private readonly endObs

  constructor(
    private readonly scene: Scene,
    private readonly glow: (m: AbstractMesh) => void,
  ) {
    this.endObs = scene.onAfterRenderObservable.add(() => this.releaseClip())
  }

  /** Devolve o plano de recorte da cena. O Mesh.render pode sair cedo (efeito ainda
   *  compilando) DEPOIS do onBeforeRender e sem chamar o onAfterRender: o recorte
   *  ficava preso na cena e apagava a metade da arena do jogador (bug do Alex). */
  private releaseClip() {
    if (!this.sceneClip.on) return
    this.sceneClip.on = false
    this.scene.clipPlane = this.sceneClip.prev ?? (null as unknown as Plane)
  }

  private wolfContainer() {
    configureCodecs()
    this.wolfC ??= LoadAssetContainerAsync(WOLF_URL, this.scene)
    return this.wolfC
  }

  /** Carrega antes (o lobo é um GLB de 1 MB): chamar quando a luta abre. */
  preload() {
    void this.wolfContainer().catch(() => {})
  }

  /** Cabeça de lobo de luz que avança de `at` na direção `yaw`. */
  wolf(at: Vector3, yaw: number, color: Color3) {
    void this.wolfContainer()
      .then(async (c) => {
        if (this.disposed) return
        const e = c.instantiateModelsToScene((n) => `spirit-wolf-${n}`, false, { doNotInstantiate: true })
        const root = new TransformNode("spirit-wolf", this.scene)
        const turn = new TransformNode("spirit-wolf-turn", this.scene)
        turn.parent = root
        turn.rotation.y = WOLF_TURN
        for (const n of e.rootNodes) n.parent = turn
        const mat = ghostMat(this.scene, "spirit-wolf-mat", color)
        const meshes = root.getChildMeshes(false)
        for (const m of meshes) {
          m.material = mat
          m.isPickable = false
          m.alwaysSelectAsActiveMesh = true
          this.glow(m)
        }
        const anim = e.animationGroups.find((g) => g.name.endsWith("Bite")) ?? e.animationGroups[0]
        for (const g of e.animationGroups) if (g !== anim) g.stop()
        anim?.start(true, 0.9)
        const neck = root.getChildTransformNodes(false).find((n) => n.name.endsWith("Head_0"))
        const muzzle = root.getChildTransformNodes(false).find((n) => n.name.endsWith("Head_3"))
        const dir = new Vector3(Math.sin(yaw), 0, Math.cos(yaw))
        root.rotation.y = yaw
        root.scaling.setAll(0.01)
        const l: Live = {
          kind: "wolf",
          root,
          meshes,
          mats: [mat],
          t: 0,
          life: 1.25,
          from: at.clone(),
          dir,
          anim,
          neck,
          base: 4.6,
          dispose: () => {
            this.releaseClip()
            for (const g of e.animationGroups) g.dispose()
            e.dispose()
            root.dispose()
            mat.dispose()
          },
        }
        // recorte: só a cabeça e um pedaço da juba (atrás do Head_0) aparecem
        for (const m of meshes as Mesh[]) {
          if (!m.onBeforeRenderObservable) continue
          m.onBeforeRenderObservable.add(() => {
            if (!neck || !muzzle) return
            neck.computeWorldMatrix(true)
            muzzle.computeWorldMatrix(true)
            const p0 = neck.getAbsolutePosition()
            const fwd = muzzle.getAbsolutePosition().subtract(p0)
            const len = fwd.length()
            if (len < 1e-4) return
            fwd.scaleInPlace(1 / len)
            const keepFrom = p0.subtract(fwd.scale(len * 0.55))
            if (!this.sceneClip.on) this.sceneClip.prev = this.scene.clipPlane ?? null
            this.sceneClip.on = true
            // recorta o lado de TRÁS (normal para trás: dot(n, p) + d > 0 some)
            this.scene.clipPlane = new Plane(-fwd.x, -fwd.y, -fwd.z, Vector3.Dot(fwd, keepFrom))
          })
          m.onAfterRenderObservable.add(() => this.releaseClip())
        }
        // compila o material JÁ com o recorte: sem isso o 1º quadro sai cedo do render
        root.setEnabled(false)
        await Promise.all(meshes.map((m) => mat.forceCompilationAsync(m, { clipPlane: true }).catch(() => {})))
        if (this.disposed) {
          l.dispose()
          return
        }
        root.setEnabled(true)
        this.live.push(l)
      })
      .catch(() => {})
  }

  /** Morcego de luz grandão que sobe e voa de `at` na direção `yaw`. */
  bat(at: Vector3, yaw: number, color: Color3) {
    const root = new TransformNode("spirit-bat", this.scene)
    const mat = ghostMat(this.scene, "spirit-bat-mat", color)
    const body = CreateSphere("spirit-bat-body", { diameter: 1, segments: 10 }, this.scene)
    body.scaling.set(0.55, 0.5, 1.05)
    const head = CreateSphere("spirit-bat-head", { diameter: 0.62, segments: 8 }, this.scene)
    head.position.set(0, 0.1, 0.62)
    const ears: Mesh[] = []
    for (const s of [-1, 1]) {
      const ear = wingMesh(this.scene, `spirit-bat-ear-${s}`, s)
      ear.scaling.set(0.13, 1, 0.4)
      ear.rotation.x = -Math.PI / 2.2
      ear.position.set(0.08 * s, 0.3, 0.62)
      ears.push(ear)
    }
    const wings: TransformNode[] = []
    const parts: AbstractMesh[] = [body, head, ...ears]
    for (const s of [-1, 1]) {
      const pivot = new TransformNode(`spirit-bat-pivot-${s}`, this.scene)
      pivot.parent = root
      pivot.position.set(0.22 * s, 0.05, 0.05)
      const w = wingMesh(this.scene, `spirit-bat-wing-${s}`, s)
      w.parent = pivot
      parts.push(w)
      wings.push(pivot)
    }
    for (const m of [body, head, ...ears]) m.parent = root
    for (const m of parts) {
      m.material = mat
      m.isPickable = false
      this.glow(m)
    }
    root.rotation.y = yaw
    // inclinado para a frente: as asas abertas ficam de frente para a câmera (atrás e acima)
    root.rotation.x = 0.85
    root.scaling.setAll(0.01)
    this.live.push({
      kind: "bat",
      root,
      meshes: parts,
      mats: [mat],
      t: 0,
      life: 1.7,
      from: at.clone(),
      dir: new Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
      wings: [wings[0], wings[1]],
      base: 3.6,
      dispose: () => {
        root.dispose()
        mat.dispose()
      },
    })
  }

  update(dt: number) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]
      l.t += dt
      const u = Math.min(1, l.t / l.life)
      // nasce rápido, avança, some no fim
      const grow = 1 - Math.pow(1 - Math.min(1, l.t / 0.25), 3)
      const fade = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3
      l.root.scaling.setAll(l.base * Math.max(0.01, grow))
      for (const m of l.mats) m.alpha = 0.55 * fade
      if (l.kind === "wolf") {
        // a CABEÇA (pescoço) nasce 1 m à frente de quem soltou, a ~2 m do chão, e avança 6 m
        const go = 1 + 6 * (1 - Math.pow(1 - u, 2))
        const want = l.from.add(l.dir.scale(go))
        want.y = 1.9
        if (l.neck) {
          l.root.computeWorldMatrix(true)
          l.neck.computeWorldMatrix(true)
          l.root.position.addInPlace(want.subtract(l.neck.getAbsolutePosition()))
        } else l.root.position.copyFrom(want)
      } else {
        const go = 8 * u
        l.root.position.copyFrom(l.from.add(l.dir.scale(go)))
        l.root.position.y = 1.5 + 0.9 * u
        const flap = Math.sin(l.t * 11) * 0.8
        if (l.wings) {
          l.wings[0].rotation.z = flap
          l.wings[1].rotation.z = -flap
        }
      }
      if (u >= 1) {
        l.dispose()
        this.live.splice(i, 1)
      }
    }
  }

  dispose() {
    this.disposed = true
    this.scene.onAfterRenderObservable.remove(this.endObs)
    this.releaseClip()
    for (const l of this.live) l.dispose()
    this.live.length = 0
    void this.wolfC?.then((c) => c.dispose()).catch(() => {})
  }
}
