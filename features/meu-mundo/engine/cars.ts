// features/meu-mundo/engine/cars.ts
//
// Carros do bairro: um por casa com titular. Quem diz onde cada carro está e
// quem dirige é a SALA (state.cars); aqui só se DESENHA — nenhuma física roda
// aqui (o seu carro é previsto em game.ts com vehicle.ts; os dos outros são
// interpolados).
//
// mm3d-12: superesportivo modelado no Blender (MEU MUNDO 3D/pipeline/
// build_supercar.py), rodas separadas com pivô no centro:
//   car → body ; susp_* → steer_* (só dianteiras) → spin_* → wheel_*
// Convenção (supercar.json): giro no eixo X local, rolar para a frente =
// ângulo POSITIVO; esterçar para a DIREITA = ângulo NEGATIVO em Y local.
//
// Rodas: ângulo ACUMULADO (rad) com ω = velocidade longitudinal / raio — não
// depende do FPS e inverte sozinho na ré. A velocidade lateral do drift NÃO
// entra no rolamento. Com freio de mão e traseira escorregando, as traseiras
// travam (param de girar).
// Carroceria: balança (arfagem/rolagem) por uma mola amortecida movida pela
// aceleração local — as rodas ficam no chão, que é o contato.
//
// O arquivo é baixado UMA vez; cada carro é uma cópia (instâncias da mesma
// geometria e do mesmo material: 5 desenhos por carro).

import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import { ensureLoaders } from "./avatars"
import { lerpAngle, CAR } from "./motion"
import { VEHICLE } from "./vehicle"
import type { Box2 } from "./collision"
import type { CarState } from "./net"

export const CAR_ASSET_VERSION = "v2"
const BASE = `/meu-mundo/veiculos/${CAR_ASSET_VERSION}/`
const MODEL = "supercar.glb"
const SPIN_SIGN = 1
const STEER_SIGN = -1
const WHEEL_KEYS = ["fl", "fr", "rl", "rr"] as const
const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)

/** Pose do carro que você dirige (vem da previsão local, já interpolada). */
export interface CarPose {
  x: number
  z: number
  facing: number
  sp: number
  st: number
  hb: number
  sl: number
  ax: number
  ay: number
}

interface Wheel {
  spin: TransformNode
  steer: TransformNode | null
  front: boolean
  q: Quaternion
}

interface CarView {
  holder: TransformNode
  tilt: TransformNode
  entries: InstantiatedEntries | null
  wheels: Wheel[]
  x: number
  z: number
  facing: number
  tx: number
  tz: number
  tf: number
  sp: number
  st: number
  hb: number
  sl: number
  ax: number
  ay: number
  /** Ângulo acumulado das rodas (rad): dianteiras e traseiras. */
  rollF: number
  rollR: number
  pitch: number
  pitchV: number
  roll: number
  rollV: number
  lastX: number
  lastZ: number
}

/** Telemetria do seu carro (painel de ajuste do administrador). */
export interface CarTelemetry {
  speed: number
  steer: number
  slip: number
  contacts: number
}

export class CarFleet {
  private container: Promise<AssetContainer> | null = null
  private material: StandardMaterial | null = null
  private readonly views = new Map<string, CarView>()
  private disposed = false
  /** Última posição conhecida de cada carro (para colisão e interação). */
  readonly latest = new Map<string, CarState>()

  constructor(private readonly scene: Scene) {
    ensureLoaders()
  }

  private load() {
    if (!this.container) {
      this.container = LoadAssetContainerAsync(BASE + MODEL, this.scene).then((c) => {
        // Instâncias usam o material da malha-FONTE: ele vai aqui, uma vez.
        for (const m of c.meshes) {
          if (m.getTotalVertices() <= 0) continue
          m.material = this.mat()
          ;(m as Mesh).useVertexColors = true
          m.hasVertexAlpha = false
        }
        return c
      })
      this.container.catch(() => {
        this.container = null
      })
    }
    return this.container
  }

  private mat() {
    if (!this.material) {
      // A cor vem do vértice (COLOR_0). Um brilho leve na lataria.
      const m = new StandardMaterial("mm-car", this.scene)
      m.diffuseColor = new Color3(1, 1, 1)
      m.emissiveColor = new Color3(0.16, 0.16, 0.16)
      m.specularColor = new Color3(0.32, 0.32, 0.32)
      m.specularPower = 40
      this.material = m
    }
    return this.material
  }

  private create(key: string, c: CarState): CarView {
    const holder = new TransformNode(`mm-car-${key}`, this.scene)
    // Pivô do balanço na altura do eixo das rodas.
    const tilt = new TransformNode(`mm-car-tilt-${key}`, this.scene)
    tilt.parent = holder
    tilt.position.y = VEHICLE.WHEEL_RADIUS
    const view: CarView = {
      holder,
      tilt,
      entries: null,
      wheels: [],
      x: c.x,
      z: c.z,
      facing: c.facing,
      tx: c.x,
      tz: c.z,
      tf: c.facing,
      sp: 0,
      st: 0,
      hb: 0,
      sl: 0,
      ax: 0,
      ay: 0,
      rollF: 0,
      rollR: 0,
      pitch: 0,
      pitchV: 0,
      roll: 0,
      rollV: 0,
      lastX: c.x,
      lastZ: c.z,
    }
    this.place(view)
    void this.load()
      .then((container) => {
        if (this.disposed || this.views.get(key) !== view) return
        const entries = container.instantiateModelsToScene((n) => `${n}-${key}`, false, { doNotInstantiate: false })
        const root = entries.rootNodes[0] as TransformNode
        root.parent = holder
        for (const m of root.getChildMeshes(false) as AbstractMesh[]) m.isPickable = false
        const nodes = root.getChildTransformNodes(false)
        const find = (prefix: string) => nodes.find((n) => n.name.startsWith(`${prefix}-`)) ?? null
        // A carroceria passa a pender do pivô de balanço (rodas ficam no chão).
        const body = (root.getChildMeshes(false) as AbstractMesh[]).find((m) => m.name.startsWith("body-")) ?? null
        if (body) body.setParent(tilt)
        for (const k of WHEEL_KEYS) {
          const spin = find(`spin_${k}`)
          if (!spin) continue
          const steer = k[0] === "f" ? find(`steer_${k}`) : null
          spin.rotationQuaternion = Quaternion.Identity()
          if (steer) steer.rotationQuaternion = Quaternion.Identity()
          view.wheels.push({ spin, steer, front: k[0] === "f", q: new Quaternion() })
        }
        view.entries = entries
      })
      .catch(() => {})
    return view
  }

  private place(v: CarView) {
    v.holder.position.set(v.x, 0, v.z)
    v.holder.rotation.y = v.facing
  }

  /** Rodas, esterço e balanço da carroceria (todo quadro, por carro). */
  private animate(v: CarView, dt: number) {
    const r = VEHICLE.WHEEL_RADIUS
    v.rollF += (v.sp / r) * dt
    // Freio de mão com a traseira escorregando: as traseiras travam.
    const lock = Math.min(1, v.hb * (0.4 + v.sl))
    v.rollR += ((v.sp * (1 - lock)) / r) * dt
    for (const w of v.wheels) {
      Quaternion.RotationAxisToRef(AXIS_X, SPIN_SIGN * (w.front ? v.rollF : v.rollR), w.q)
      w.spin.rotationQuaternion!.copyFrom(w.q)
      if (w.steer) Quaternion.RotationAxisToRef(AXIS_Y, STEER_SIGN * v.st, w.steer.rotationQuaternion!)
    }
    // Mola amortecida: acelerar levanta a frente, frear afunda; a curva
    // inclina para fora. Limitado (sem capotar visualmente).
    const targetPitch = Math.max(-0.07, Math.min(0.07, -v.ax * 0.0075))
    const targetRoll = Math.max(-0.07, Math.min(0.07, v.ay * 0.0065))
    const k = 90
    const c = 13
    const h = Math.min(dt, 1 / 30)
    v.pitchV += (k * (targetPitch - v.pitch) - c * v.pitchV) * h
    v.pitch += v.pitchV * h
    v.rollV += (k * (targetRoll - v.roll) - c * v.rollV) * h
    v.roll += v.rollV * h
    v.tilt.rotation.x = v.pitch
    v.tilt.rotation.z = v.roll
  }

  /**
   * Atualiza a partir da sala. `mine` = lote do carro que você dirige (0 = a
   * pé) e `pose` = o seu carro previsto, que ele segue sem atraso.
   */
  sync(cars: Map<string, CarState> | null, dt: number, mine: number, pose: CarPose | null) {
    const seen = new Set<string>()
    cars?.forEach((c, key) => {
      seen.add(key)
      this.latest.set(key, { lot: c.lot, x: c.x, z: c.z, facing: c.facing, driver: c.driver })
      let v = this.views.get(key)
      if (!v) {
        v = this.create(key, c)
        this.views.set(key, v)
      }
      if (mine && c.lot === mine && pose) {
        v.x = v.tx = pose.x
        v.z = v.tz = pose.z
        v.facing = v.tf = pose.facing
        v.sp = pose.sp
        v.st = pose.st
        v.hb = pose.hb
        v.sl = pose.sl
        v.ax = pose.ax
        v.ay = pose.ay
      } else {
        v.tx = c.x
        v.tz = c.z
        v.tf = c.facing
        const err = Math.hypot(v.tx - v.x, v.tz - v.z)
        if (err > 12) {
          v.x = v.tx
          v.z = v.tz
          v.facing = v.tf
        } else {
          const k = 1 - Math.exp(-10 * dt)
          v.x += (v.tx - v.x) * k
          v.z += (v.tz - v.z) * k
          v.facing = lerpAngle(v.facing, v.tf, k)
        }
        // Dos outros: rodas e balanço pelo que a sala manda (sem física aqui).
        const ks = 1 - Math.exp(-12 * dt)
        const sp = c.sp ?? 0
        const prevSp = v.sp
        v.sp += (sp - v.sp) * ks
        v.st += ((c.st ?? 0) - v.st) * ks
        v.hb += ((c.hb ? 1 : 0) - v.hb) * ks
        v.sl += ((c.sl ?? 0) - v.sl) * ks
        if (dt > 0) v.ax += ((v.sp - prevSp) / dt - v.ax) * (1 - Math.exp(-6 * dt))
        // Lateral ≈ u² · tan(esterço) / entre-eixos (curva de raio constante).
        const wb = VEHICLE.CG_FRONT + VEHICLE.CG_REAR
        v.ay += ((v.sp * Math.abs(v.sp) * Math.tan(v.st)) / wb - v.ay) * (1 - Math.exp(-6 * dt))
      }
      this.place(v)
      this.animate(v, dt)
    })
    for (const [key, v] of this.views) {
      if (seen.has(key)) continue
      this.drop(v)
      this.views.delete(key)
      this.latest.delete(key)
    }
  }

  /** Caixas de colisão dos carros que bloqueiam você (todos menos o seu). */
  boxes(mine: number): Box2[] {
    const out: Box2[] = []
    for (const c of this.latest.values()) {
      if (mine && c.lot === mine) continue
      out.push({ x: c.x, z: c.z, hx: CAR.HX, hz: CAR.HZ, rot: c.facing, h: 1.3 })
    }
    return out
  }

  private drop(v: CarView) {
    v.entries?.dispose()
    v.tilt.dispose()
    v.holder.dispose()
  }

  /** Conferência (window.__mmStreet): rodas e balanço de cada carro desenhado. */
  debug() {
    const out: Record<string, { rollF: number; rollR: number; st: number; sp: number; pitch: number; roll: number; wheels: number; driver: string; x: number; z: number }> = {}
    for (const [k, v] of this.views)
      out[k] = { rollF: v.rollF, rollR: v.rollR, st: v.st, sp: v.sp, pitch: v.pitch, roll: v.roll, wheels: v.wheels.length, driver: this.latest.get(k)?.driver ?? "", x: v.x, z: v.z }
    return out
  }

  get count() {
    return this.views.size
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const v of this.views.values()) this.drop(v)
    this.views.clear()
    this.latest.clear()
    this.container?.then((c) => c.dispose()).catch(() => {})
    this.material?.dispose()
  }
}
