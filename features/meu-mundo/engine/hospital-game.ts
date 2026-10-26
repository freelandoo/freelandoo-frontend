// features/meu-mundo/engine/hospital-game.ts
//
// O INTERIOR do hospital do centro (mm3d-26). Cena própria, desenhada com as
// MESMAS peças do interior das casas (interior.ts) a partir da planta que veio
// do servidor (src/utils/meuMundoHospital.js), e o MESMO andar (interior-motion).
//
// Diferente da casa, não há sala multiplayer aqui dentro: o hospital é um
// lugar de passagem e de internação, então o andar é previsto e decidido no
// próprio aparelho (as paredes e os leitos são os do payload, sem atalho).
// Enquanto ele está aberto, o centro fica suspenso (center-view).
//
// Dois modos:
//  - "visit": entra pela porta, anda, deita num leito livre ou senta; a porta
//    devolve ao centro.
//  - "patient": INTERNADO (vida do hóspede, status "hospital"). Abre deitado
//    no leito e não levanta — a alta é da vida (o servidor), não do botão.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildInterior } from "./interior"
import { Character } from "./player"
import { AvatarLibrary } from "./avatars"
import { FollowCamera, INDOOR_CAMERA } from "./camera"
import { MOTION, lerpAngle, type Intent, type MoveState } from "./motion"
import { stepInterior, type InteriorBody } from "./interior-motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "./input"
import type { Box2 } from "./collision"
import { liveGamesBump } from "./game"
import { ResolutionGovernor, resolveQuality } from "./quality"
import type { BodyId, InteriorBed, InteriorDef, Interactable } from "../types"

export type HospitalMode = "visit" | "patient"

export interface HospitalGameOptions {
  canvas: HTMLCanvasElement
  interior: InteriorDef
  body: BodyId
  /** Cores do personagem (mm3d-36). */
  look?: string
  mode: HospitalMode
  /** Leito do internado (id da planta); sem ele, o primeiro da enfermaria. */
  bed?: string
  maxPixelRatio?: number
  onReady?: () => void
  onNearbyChange?: (item: Interactable | null) => void
  /** A porta: sair para o centro (só no modo "visit"). */
  onExit?: () => void
  /** Deitado ou sentado (id do leito/assento) ou de pé (null). */
  onRest?: (bed: string | null) => void
  onError?: (reason: "context-lost") => void
}

export interface HospitalGameHandle {
  input: InputState
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  interact: () => void
  /** Levantar do leito ou da cadeira (internado não levanta). */
  stand: () => void
  recenter: () => void
  dispose: () => void
}

export function createHospitalGame(opts: HospitalGameOptions): HospitalGameHandle {
  const { canvas, interior: def } = opts
  const speeds = { walk: MOTION.WALK_SPEED, run: MOTION.RUN_SPEED }
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const governor = new ResolutionGovernor(engine, resolveQuality(), Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  // Hospital: mais claro e frio que a casa.
  scene.clearColor = new Color4(0.2, 0.24, 0.26, 1)
  scene.ambientColor = new Color3(0.22, 0.24, 0.25)
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("mm-hosp-hemi", new Vector3(0.2, 1, 0.1), scene)
  hemi.intensity = 0.95
  hemi.groundColor = new Color3(0.6, 0.62, 0.64)
  const key = new DirectionalLight("mm-hosp-key", new Vector3(-0.4, -1, 0.3), scene)
  key.intensity = 0.35

  const interior = buildInterior(scene, def)
  const lib = new AvatarLibrary(scene, true, true)
  const fallbackMat = new StandardMaterial("mm-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("mm-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const char = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, opts.body, null, true, opts.look ?? "")

  const beds = def.beds ?? []
  const patient = opts.mode === "patient"
  const e = def.entry
  // 1,6 m para dentro da porta: a câmera (atrás e acima) já passa por cima da
  // parede da fachada, em vez de nascer do lado de fora olhando a parede.
  const IN = 1.6
  const body: InteriorBody = {
    x: e.x + Math.sin(e.facing) * IN,
    z: e.z + Math.cos(e.facing) * IN,
    vx: 0,
    vz: 0,
    facing: e.facing,
    floor: e.floor,
    y: def.floors[e.floor].y,
  }
  let visualFacing = e.facing
  let move: MoveState = 0
  let resting: InteriorBed | null = null
  let seated: { x: number; z: number; facing: number; stand: { x: number; z: number } } | null = null

  const lieOn = (b: InteriorBed) => {
    seated = null
    resting = b
    Object.assign(body, { x: b.x, z: b.z, vx: 0, vz: 0, facing: b.facing, floor: b.floor })
    body.y = def.floors[b.floor].y
    visualFacing = b.facing
    opts.onRest?.(b.id)
  }
  const getUp = () => {
    const from = resting ?? seated
    if (!from || patient) return
    resting = null
    seated = null
    Object.assign(body, { x: from.stand.x, z: from.stand.z, vx: 0, vz: 0 })
    stepInterior(body, { x: 0, z: 0, run: false }, 0, def, speeds)
    opts.onRest?.(null)
  }

  if (patient) {
    // Leito da enfermaria (z depois da recepção); sem id válido, o primeiro.
    const ward = beds.filter((b) => b.z > 6)
    const b = beds.find((x) => x.id === opts.bed) ?? ward[0] ?? beds[0]
    if (b) lieOn(b)
  }
  char.place(body.x, body.z, body.facing, body.y)

  const follow = new FollowCamera(scene, INDOOR_CAMERA)
  scene.activeCamera = follow.camera
  // Internado: a câmera olha o leito de lado, um pouco de cima.
  follow.snapBehind(body.x, body.z, patient ? body.facing + Math.PI * 0.75 : body.facing)
  follow.snapHeight(body.y)
  const viewBoxes = () => def.floors[body.floor].boxes as Box2[]
  follow.update(1, body.x, body.z, viewBoxes(), body.y)
  interior.showUpTo(body.floor)

  const input = createInputState()
  const detachInput = attachInput(canvas, input)

  let nearby: Interactable | null = null
  const door: Interactable = { kind: "door", id: "door", x: def.exit.x, z: def.exit.z, radius: def.exit.radius }
  const findNearby = (): Interactable | null => {
    if (patient || resting || seated) return null
    let best: Interactable | null = null
    let bestD = Infinity
    const dd = Math.hypot(door.x - body.x, door.z - body.z)
    if (dd <= door.radius) {
      best = door
      bestD = dd
    }
    for (const s of def.seats) {
      const d = Math.hypot(s.x - body.x, s.z - body.z)
      if (d <= 1.25 && d < bestD) {
        best = { kind: "seat", id: s.id, x: s.x, z: s.z, radius: 1.25, seat: s }
        bestD = d
      }
    }
    for (const b of beds) {
      const d = Math.hypot(b.x - body.x, b.z - body.z)
      if (d <= 1.6 && d < bestD) {
        best = { kind: "bed", id: b.id, x: b.x, z: b.z, radius: 1.6, bed: b }
        bestD = d
      }
    }
    return best
  }
  const interactWith = (it: Interactable) => {
    if (it.kind === "door") opts.onExit?.()
    else if (it.kind === "bed") lieOn(it.bed)
    else if (it.kind === "seat") {
      const s = it.seat
      seated = { x: s.x, z: s.z, facing: s.facing, stand: s.stand }
      Object.assign(body, { x: s.x, z: s.z, vx: 0, vz: 0, facing: s.facing, floor: s.floor })
      visualFacing = s.facing
      opts.onRest?.(s.id)
    }
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    let intent: Intent = { x: 0, z: 0, run: false }
    if (!input.blocked) {
      if (input.camDX || input.camDY) {
        follow.rotate(input.camDX * 0.006, input.camDY * 0.004)
        input.camDX = 0
        input.camDY = 0
      }
      if (input.zoom) {
        follow.zoom(input.zoom * 0.8)
        input.zoom = 0
      }
      const axis = moveAxis(input)
      const f = follow.forward()
      intent = { x: f.x * axis.y + f.z * axis.x, z: f.z * axis.y - f.x * axis.x, run: wantsRun(input) }
      if (Math.hypot(intent.x, intent.z) < 0.05) intent = { x: 0, z: 0, run: intent.run }
    }
    if (resting || seated) {
      // Andar = levantar (como na casa). Internado fica: a alta é da vida.
      if ((intent.x || intent.z) && !patient) getUp()
      move = seated ? 3 : 4
      body.vx = 0
      body.vz = 0
    } else {
      move = stepInterior(body, intent, dt, def, speeds)
    }
    visualFacing = lerpAngle(visualFacing, body.facing, 1 - Math.exp(-12 * dt))
    char.place(body.x, body.z, visualFacing, body.y)
    char.animate(dt, move, Math.hypot(body.vx, body.vz))
    follow.update(dt, body.x, body.z, viewBoxes(), body.y)
    governor.tick(engine.getDeltaTime())

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (resting || seated) getUp()
      else if (nearby && !input.blocked) interactWith(nearby)
    }
  })

  scene.executeWhenReady(() => {
    if (!disposed) opts.onReady?.()
  })
  engine.runRenderLoop(() => {
    if (!disposed) scene.render()
  })
  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)
  const lost = engine.onContextLostObservable.add(() => {
    if (!disposed) opts.onError?.("context-lost")
  })

  const handle: HospitalGameHandle = {
    input,
    setJoystick(x, y) {
      input.joyX = x
      input.joyY = y
    },
    setRun(on) {
      input.runToggle = on
    },
    setBlocked(blocked) {
      input.blocked = blocked
      clearInput(input)
    },
    interact() {
      if (resting || seated) getUp()
      else if (nearby && !input.blocked) interactWith(nearby)
    },
    stand: getUp,
    recenter() {
      follow.snapBehind(body.x, body.z, body.facing)
    },
    dispose() {
      if (disposed) return
      disposed = true
      engine.stopRenderLoop()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      char.dispose()
      lib.dispose()
      interior.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
  return handle
}
