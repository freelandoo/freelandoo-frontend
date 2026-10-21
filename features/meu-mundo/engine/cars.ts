// features/meu-mundo/engine/cars.ts
//
// Veículos do bairro: por casa com titular, o carro (na rua) e — desde o
// mm3d-14 — uma bicicleta, um skate e um par de patins espalhados na calçada.
// Quem diz onde cada um está e quem usa é a SALA (state.cars); aqui só se
// DESENHA — nenhuma física roda aqui (o seu veículo é previsto em game.ts com
// vehicle.ts; os dos outros são interpolados).
//
// mm3d-12: superesportivo modelado no Blender (MEU MUNDO 3D/pipeline/
// build_supercar.py), rodas separadas com pivô no centro:
//   car → body ; susp_* → steer_* (só dianteiras) → spin_* → wheel_*
// mm3d-14 (pipeline/build_bike.py, build_skateboard.py, build_skates.py):
//   bike   → frame ; steer (garfo + guidão + spin_f) ; spin_r ; crank
//   board  → deck ; truck_f/truck_r (inclinam na curva) → spin_{fl,fr,rl,rr}
//   skates → skate_l/skate_r (seguem os pés de quem usa) → spin_{l,r}_*
// Convenção (json dos modelos): giro no eixo X local, rolar para a frente =
// ângulo POSITIVO; esterçar para a DIREITA = ângulo NEGATIVO em Y local. Os
// nós animados guardam a rotação de repouso (o steer da bike é inclinado como
// a caixa de direção) e a animação é composta sobre ela.
//
// Rodas: ângulo ACUMULADO (rad) com ω = velocidade longitudinal / raio — não
// depende do FPS e inverte sozinho na ré. A velocidade lateral do drift NÃO
// entra no rolamento. Com freio de mão e traseira escorregando, as traseiras
// travam (param de girar).
// Carroceria do carro: balança (arfagem/rolagem) por uma mola amortecida
// movida pela aceleração local — as rodas ficam no chão, que é o contato.
//
// Cada arquivo é baixado UMA vez; cada veículo é uma cópia (instâncias da
// mesma geometria e do mesmo material).

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
import { lerpAngle, CAR, RIDE_KINDS, type RideKind } from "./motion"
import { VEHICLE, KINDS } from "./vehicle"
import type { Box2 } from "./collision"
import type { CarState } from "./net"

export const CAR_ASSET_VERSION = "v2"
/** Modelo e raio da roda de cada modalidade (os json dos modelos). */
const MODELS: Record<RideKind, { url: string; wheelR: number }> = {
  car: { url: `/meu-mundo/veiculos/${CAR_ASSET_VERSION}/supercar.glb`, wheelR: VEHICLE.WHEEL_RADIUS },
  bike: { url: "/meu-mundo/veiculos/v3/bike.glb", wheelR: 0.31 },
  skate: { url: "/meu-mundo/veiculos/v3/skateboard.glb", wheelR: 0.0754 },
  skates: { url: "/meu-mundo/veiculos/v3/skates.glb", wheelR: 0.05 },
}
/** Altura da sola dos patins (build_skates.py): quem usa sobe isto. */
export const SKATES_SOLE = 0.118
const SPIN_SIGN = 1
const STEER_SIGN = -1
const WHEEL_KEYS = ["fl", "fr", "rl", "rr"] as const
const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)
const AXIS_Z = new Vector3(0, 0, 1)

const kindOf = (c: { kind?: string }): RideKind => (c.kind && c.kind in MODELS ? (c.kind as RideKind) : "car")

/** Pose do veículo que você usa (vem da previsão local, já interpolada). */
export interface CarPose {
  x: number
  z: number
  /** Altura do chão (dentro de casa); na rua, 0. */
  y?: number
  facing: number
  sp: number
  st: number
  hb: number
  sl: number
  ax: number
  ay: number
}

/** Nó animado: a animação é composta sobre a rotação de repouso. */
interface Joint {
  node: TransformNode
  rest: Quaternion
  q: Quaternion
}

interface Wheel extends Joint {
  steer: Joint | null
  front: boolean
}

interface CarView {
  kind: RideKind
  holder: TransformNode
  tilt: TransformNode
  entries: InstantiatedEntries | null
  wheels: Wheel[]
  /** bike: garfo e guidão; pedivela. skate: os dois trucks. */
  steer: Joint | null
  crank: Joint | null
  trucks: Joint[]
  /** patins: as duas botas e onde ficam paradas. */
  boots: { node: TransformNode; rest: Vector3 }[]
  crankAngle: number
  x: number
  y: number
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

export type FleetEntry = CarState & { kind: RideKind }

function joint(node: TransformNode): Joint {
  const rest = node.rotationQuaternion?.clone() ?? Quaternion.FromEulerAngles(node.rotation.x, node.rotation.y, node.rotation.z)
  node.rotationQuaternion = rest.clone()
  return { node, rest, q: new Quaternion() }
}

/** rest × giro(eixo local, ângulo). */
function turn(j: Joint, axis: Vector3, angle: number) {
  Quaternion.RotationAxisToRef(axis, angle, j.q)
  j.rest.multiplyToRef(j.q, j.node.rotationQuaternion!)
}

export class CarFleet {
  private readonly containers = new Map<RideKind, Promise<AssetContainer>>()
  private material: StandardMaterial | null = null
  private readonly views = new Map<string, CarView>()
  private disposed = false
  /** Última posição conhecida de cada veículo (chave = id; colisão e interação). */
  readonly latest = new Map<string, FleetEntry>()

  constructor(private readonly scene: Scene) {
    ensureLoaders()
  }

  private load(kind: RideKind) {
    let p = this.containers.get(kind)
    if (!p) {
      p = LoadAssetContainerAsync(MODELS[kind].url, this.scene).then((c) => {
        // Instâncias usam o material da malha-FONTE: ele vai aqui, uma vez.
        for (const m of c.meshes) {
          if (m.getTotalVertices() <= 0) continue
          m.material = this.mat()
          ;(m as Mesh).useVertexColors = true
          m.hasVertexAlpha = false
        }
        return c
      })
      p.catch(() => this.containers.delete(kind))
      this.containers.set(kind, p)
    }
    return p
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
    const kind = kindOf(c)
    const holder = new TransformNode(`mm-car-${key}`, this.scene)
    // Pivô do balanço (só o carro balança) na altura do eixo das rodas.
    const tilt = new TransformNode(`mm-car-tilt-${key}`, this.scene)
    tilt.parent = holder
    tilt.position.y = kind === "car" ? VEHICLE.WHEEL_RADIUS : 0
    const view: CarView = {
      kind,
      holder,
      tilt,
      entries: null,
      wheels: [],
      steer: null,
      crank: null,
      trucks: [],
      boots: [],
      crankAngle: 0,
      x: c.x,
      y: c.y ?? 0,
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
    void this.load(kind)
      .then((container) => {
        if (this.disposed || this.views.get(key) !== view) return
        const entries = container.instantiateModelsToScene((n) => `${n}-${key}`, false, { doNotInstantiate: false })
        const root = entries.rootNodes[0] as TransformNode
        root.parent = holder
        for (const m of root.getChildMeshes(false) as AbstractMesh[]) m.isPickable = false
        const nodes = root.getChildTransformNodes(false)
        const find = (name: string) => nodes.find((n) => n.name.startsWith(`${name}-`)) ?? null
        const wheel = (name: string, front: boolean, steerName: string | null) => {
          const spin = find(name)
          if (!spin) return
          const st = steerName ? find(steerName) : null
          view.wheels.push({ ...joint(spin), steer: st ? joint(st) : null, front })
        }
        if (kind === "car") {
          // A carroceria passa a pender do pivô de balanço (rodas ficam no chão).
          const body = (root.getChildMeshes(false) as AbstractMesh[]).find((m) => m.name.startsWith("body-")) ?? null
          if (body) body.setParent(tilt)
          for (const k of WHEEL_KEYS) wheel(`spin_${k}`, k[0] === "f", k[0] === "f" ? `steer_${k}` : null)
        } else if (kind === "bike") {
          const st = find("steer")
          view.steer = st ? joint(st) : null
          const cr = find("crank")
          view.crank = cr ? joint(cr) : null
          wheel("spin_f", true, null)
          wheel("spin_r", false, null)
        } else if (kind === "skate") {
          for (const t of ["truck_f", "truck_r"]) {
            const n = find(t)
            if (n) view.trucks.push(joint(n))
          }
          for (const k of WHEEL_KEYS) wheel(`spin_${k}`, k[0] === "f", null)
        } else {
          for (const side of ["l", "r"]) {
            const b = find(`skate_${side}`)
            if (b) view.boots.push({ node: b, rest: b.position.clone() })
            for (const k of WHEEL_KEYS) wheel(`spin_${side}_${k}`, k[0] === "f", null)
          }
        }
        view.entries = entries
      })
      .catch(() => {})
    return view
  }

  private place(v: CarView) {
    v.holder.position.set(v.x, v.y, v.z)
    v.holder.rotation.y = v.facing
  }

  /** Rodas, direção, pedivela, trucks e o balanço do carro (todo quadro). */
  private animate(v: CarView, dt: number) {
    const r = MODELS[v.kind].wheelR
    v.rollF += (v.sp / r) * dt
    // Freio de mão com a traseira escorregando: as traseiras travam.
    const lock = v.kind === "car" ? Math.min(1, v.hb * (0.4 + v.sl)) : 0
    v.rollR += ((v.sp * (1 - lock)) / r) * dt
    for (const w of v.wheels) {
      turn(w, AXIS_X, SPIN_SIGN * (w.front ? v.rollF : v.rollR))
      if (w.steer) turn(w.steer, AXIS_Y, STEER_SIGN * v.st)
    }
    if (v.steer) turn(v.steer, AXIS_Y, STEER_SIGN * v.st)
    if (v.crank) turn(v.crank, AXIS_X, SPIN_SIGN * v.crankAngle)
    // Skate: os trucks inclinam com a curva (no eixo longitudinal).
    for (let i = 0; i < v.trucks.length; i++) turn(v.trucks[i], AXIS_Z, (i === 0 ? 1 : -1) * v.st * 0.35)
    if (v.kind !== "car") return
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
   * Atualiza a partir da sala. `mine` = id do veículo que você usa (0 = a
   * pé) e `pose` = o seu veículo previsto, que ele segue sem atraso.
   */
  sync(cars: Map<string, CarState> | null, dt: number, mine: number, pose: CarPose | null) {
    const seen = new Set<string>()
    cars?.forEach((c, key) => {
      seen.add(key)
      this.latest.set(key, { lot: c.lot, kind: kindOf(c), x: c.x, z: c.z, facing: c.facing, driver: c.driver })
      let v = this.views.get(key)
      if (!v) {
        v = this.create(key, c)
        this.views.set(key, v)
      }
      if (mine && key === String(mine) && pose) {
        v.x = v.tx = pose.x
        v.y = pose.y ?? 0
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
        v.y += ((c.y ?? 0) - v.y) * (1 - Math.exp(-10 * dt))
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
      // Sem ninguém em cima: a pedivela e os patins voltam ao repouso.
      if (!c.driver) {
        v.crankAngle = 0
        this.setFeet(key, null)
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

  /** Pose desenhada de um veículo (quem está montado acompanha sem atraso). */
  poseOf(key: string) {
    const v = this.views.get(key)
    return v ? { x: v.x, y: v.y, z: v.z, facing: v.facing, sp: v.sp, kind: v.kind } : null
  }

  /** Pedivela da bike (rad), dada pela pedalada de quem pedala. */
  setCrank(key: string, angle: number) {
    const v = this.views.get(key)
    if (v) v.crankAngle = angle
  }

  /**
   * Patins nos pés: pontos no MUNDO, no chão sob cada tênis [esquerdo,
   * direito]; null devolve as botas ao lugar de repouso.
   */
  setFeet(key: string, feet: (Vector3 | null)[] | null) {
    const v = this.views.get(key)
    if (!v || !v.boots.length) return
    for (let i = 0; i < v.boots.length; i++) {
      const b = v.boots[i]
      const p = feet?.[i]
      if (p) b.node.setAbsolutePosition(p)
      else b.node.position.copyFrom(b.rest)
    }
  }

  /** Caixas dos veículos que bloqueiam você (menos o seu e os que não bloqueiam parados). */
  boxes(mine: number): Box2[] {
    const out: Box2[] = []
    for (const [key, c] of this.latest) {
      if (mine && key === String(mine)) continue
      if (!c.driver && !RIDE_KINDS[c.kind].parkedBlocks) continue
      const k = KINDS[c.kind] as { HX?: number; HZ?: number }
      out.push({ x: c.x, z: c.z, hx: k.HX ?? CAR.HX, hz: k.HZ ?? CAR.HZ, rot: c.facing, h: c.kind === "car" ? 1.3 : 1.0 })
    }
    return out
  }

  private drop(v: CarView) {
    v.entries?.dispose()
    v.tilt.dispose()
    v.holder.dispose()
  }

  /** Conferência (window.__mmStreet): rodas e balanço de cada veículo desenhado. */
  debug() {
    const out: Record<string, { kind: RideKind; rollF: number; rollR: number; st: number; sp: number; pitch: number; roll: number; wheels: number; crank: number; driver: string; x: number; z: number }> = {}
    for (const [k, v] of this.views)
      out[k] = { kind: v.kind, rollF: v.rollF, rollR: v.rollR, st: v.st, sp: v.sp, pitch: v.pitch, roll: v.roll, wheels: v.wheels.length, crank: v.crankAngle, driver: this.latest.get(k)?.driver ?? "", x: v.x, z: v.z }
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
    for (const p of this.containers.values()) p.then((c) => c.dispose()).catch(() => {})
    this.material?.dispose()
  }
}
