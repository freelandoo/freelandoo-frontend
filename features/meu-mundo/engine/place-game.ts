// features/meu-mundo/engine/place-game.ts
//
// O INTERIOR de um prédio do centro: o hospital (mm3d-26) e, desde o mm3d-37,
// todos os outros (pizzaria, hamburgueria, supermercado, universidade,
// biblioteca, escola, academia, igreja, delegacia). Cena própria, desenhada
// com as MESMAS peças do interior das casas (interior.ts) a partir da planta
// que veio do servidor, e o MESMO andar (interior-motion).
//
// Sem sala multiplayer aqui dentro: o andar é previsto e decidido no próprio
// aparelho (paredes e móveis são os do payload, sem atalho). O que vale
// moeda ou atributo (treinar, estudar, rezar, comprar) é pedido à vida no
// servidor pela tela (place-view) — esta cena só diz ONDE a pessoa está.
// Enquanto ela está aberta, o centro fica suspenso (center-view).
//
// Modos:
//  - "visit": entra pela porta, anda, senta, deita, usa os pontos de uso; a
//    porta devolve ao centro.
//  - "patient": INTERNADO (hospital). Abre deitado no leito e não levanta — a
//    alta é da vida (o servidor), não do botão.
//  - "prisoner": PRESO (delegacia, mm3d-37f). Abre deitado na cama da cela;
//    levanta e anda, mas a grade fecha a cela.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildInterior } from "./interior"
import { Character } from "./player"
import { AvatarLibrary, type PlacePose } from "./avatars"
import { FollowCamera, INDOOR_CAMERA } from "./camera"
import { MOTION, lerpAngle, type Intent, type MoveState } from "./motion"
import { stepInterior, type InteriorBody } from "./interior-motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "./input"
import type { Box2 } from "./collision"
import { liveGamesBump } from "./game"
import { ResolutionGovernor, resolveQuality } from "./quality"
import type { BodyId, InteriorBed, InteriorDef, InteriorNpc, InteriorSeat, InteriorSpot, Interactable, PlaceUse } from "../types"

export type PlaceMode = "visit" | "patient" | "prisoner"
/** Nome antigo (mm3d-26). */
export type HospitalMode = PlaceMode

/** Onde a pessoa está agora: de pé, sentada (com o uso do assento) ou num ponto de uso. */
export type PlaceState =
  | { kind: "free" }
  | { kind: "seat"; seat: InteriorSeat }
  | { kind: "bed"; bed: InteriorBed }
  | { kind: "spot"; spot: InteriorSpot }

export interface PlaceGameOptions {
  canvas: HTMLCanvasElement
  interior: InteriorDef
  body: BodyId
  /** Cores do personagem (mm3d-36). */
  look?: string
  mode: PlaceMode
  /** Leito do internado / cama do preso (id da planta). */
  bed?: string
  maxPixelRatio?: number
  onReady?: () => void
  onNearbyChange?: (item: Interactable | null) => void
  /** A porta: sair para o centro (só no modo "visit"). */
  onExit?: () => void
  /** Mudou onde a pessoa está (sentou, deitou, chegou num ponto de uso, levantou). */
  onState?: (state: PlaceState) => void
  onError?: (reason: "context-lost") => void
}

export interface PlaceGameHandle {
  input: InputState
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  interact: () => void
  /** Levantar do leito, da cadeira ou sair do ponto de uso (internado não levanta). */
  stand: () => void
  /**
   * A atividade começou (o movimento do aparelho em laço) ou parou (null).
   * `at`: onde fazer (a reza ajoelha em frente ao banco, mm3d-37d).
   */
  setPose: (pose: PlacePose | null, at?: { x: number; z: number; facing: number }) => void
  recenter: () => void
  dispose: () => void
}
export type HospitalGameHandle = PlaceGameHandle

/** Luz e fundo de cada prédio (casas não passam por aqui). mm3d-55: tudo um pouco mais quente (lampião). */
const LIGHT: Record<string, { clear: [number, number, number]; ground: [number, number, number]; hemi: number }> = {
  hospital: { clear: [0.17, 0.16, 0.14], ground: [0.64, 0.6, 0.54], hemi: 1.05 },
  academia: { clear: [0.11, 0.09, 0.08], ground: [0.52, 0.46, 0.4], hemi: 1.05 },
  igreja: { clear: [0.14, 0.11, 0.09], ground: [0.66, 0.56, 0.46], hemi: 1.0 },
  delegacia: { clear: [0.13, 0.13, 0.14], ground: [0.6, 0.56, 0.52], hemi: 1.05 },
}
const WARM = { clear: [0.17, 0.13, 0.1] as [number, number, number], ground: [0.68, 0.6, 0.5] as [number, number, number], hemi: 1.05 }

/** Corpo e cores de cada NPC (código `look` de avatar-colors: camiseta/calça/pele/cabelo). */
const NPC_LOOK: Record<string, { body: BodyId; look: string }> = {
  vendedor: { body: "normal", look: "4220" },
  caixa: { body: "female", look: "6151" },
  pizzaiolo: { body: "fat", look: "1132" },
  atendente: { body: "normal", look: "0453" },
  secretaria: { body: "female", look: "4062" },
  professor: { body: "normal", look: "4316" },
  professora: { body: "female", look: "7230" },
  bibliotecaria: { body: "female", look: "3546" },
  recepcionista: { body: "female", look: "9013" },
  personal: { body: "strong", look: "2224" },
  padre: { body: "normal", look: "2207" },
  delegado: { body: "strong", look: "4210" },
  policial: { body: "normal", look: "4251" },
}

export function createPlaceGame(opts: PlaceGameOptions): PlaceGameHandle {
  const { canvas, interior: def } = opts
  const speeds = { walk: MOTION.WALK_SPEED, run: MOTION.RUN_SPEED }
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const governor = new ResolutionGovernor(engine, resolveQuality(), Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  const light = (def.theme && LIGHT[def.theme]) || (def.theme ? WARM : LIGHT.hospital)
  scene.clearColor = new Color4(light.clear[0], light.clear[1], light.clear[2], 1)
  scene.ambientColor = new Color3(0.22, 0.24, 0.25)
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("mm-place-hemi", new Vector3(0.2, 1, 0.1), scene)
  hemi.intensity = light.hemi
  hemi.diffuse = new Color3(1, 0.93, 0.82)
  hemi.groundColor = new Color3(light.ground[0], light.ground[1], light.ground[2])
  const key = new DirectionalLight("mm-place-key", new Vector3(-0.4, -1, 0.3), scene)
  key.intensity = 0.35

  const interior = buildInterior(scene, def, resolveQuality().tier)
  // Academia e igreja baixam também os clipes de treino e de reza (mm3d-37b).
  const withPlace = (def.spots ?? []).some((s) => !!s.anim) || def.seats.some((s) => s.use === "pray")
  const lib = new AvatarLibrary(scene, true, false, 24, false, withPlace)
  const fallbackMat = new StandardMaterial("mm-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("mm-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const mats = { fallback: fallbackMat, shadow: shadowMat }
  const char = new Character(scene, lib, mats, opts.body, null, true, opts.look ?? "")

  // NPCs (mm3d-37): parados no lugar, sentados ou em pé.
  const npcs: { char: Character; npc: InteriorNpc }[] = (def.npcs ?? []).map((n) => {
    const who = NPC_LOOK[n.role] ?? { body: "normal" as BodyId, look: "0032" }
    const c = new Character(scene, lib, mats, who.body, null, false, who.look)
    c.place(n.x, n.z, n.facing, def.floors[n.floor]?.y ?? 0)
    return { char: c, npc: n }
  })

  const beds = def.beds ?? []
  const spots = def.spots ?? []
  const locked = opts.mode === "patient"
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
  let state: PlaceState = { kind: "free" }
  const setState = (s: PlaceState) => {
    state = s
    opts.onState?.(s)
  }
  const settle = (p: { x: number; z: number; facing: number; floor: number }) => {
    Object.assign(body, { x: p.x, z: p.z, vx: 0, vz: 0, facing: p.facing, floor: p.floor })
    body.y = def.floors[p.floor].y
    visualFacing = p.facing
  }

  const lieOn = (b: InteriorBed) => {
    settle(b)
    setState({ kind: "bed", bed: b })
  }
  const getUp = () => {
    if (state.kind === "free" || locked) return
    char.setPose(null)
    const from = state.kind === "seat" ? state.seat.stand : state.kind === "bed" ? state.bed.stand : null
    if (from) Object.assign(body, { x: from.x, z: from.z, vx: 0, vz: 0 })
    setState({ kind: "free" })
    stepInterior(body, { x: 0, z: 0, run: false }, 0, def, speeds)
  }

  if (opts.mode !== "visit") {
    // Internado: leito da enfermaria (z depois da recepção); preso: a cama da cela.
    const pool = opts.mode === "patient" ? beds.filter((b) => b.z > 6) : beds
    const b = beds.find((x) => x.id === opts.bed) ?? pool[0] ?? beds[0]
    if (b) lieOn(b)
  }
  char.place(body.x, body.z, body.facing, body.y)

  const follow = new FollowCamera(scene, INDOOR_CAMERA)
  scene.activeCamera = follow.camera
  // Deitado: a câmera olha a cama de lado, um pouco de cima.
  // (o TS estreita `state` para "free" — quem deitou foi lieOn, logo acima)
  follow.snapBehind(body.x, body.z, (state as PlaceState).kind === "bed" ? body.facing + Math.PI * 0.75 : body.facing)
  follow.snapHeight(body.y)
  const viewBoxes = () => def.floors[body.floor].boxes as Box2[]
  follow.update(1, body.x, body.z, viewBoxes(), body.y)
  interior.showUpTo(body.floor)

  const input = createInputState()
  const detachInput = attachInput(canvas, input)

  let nearby: Interactable | null = null
  const door: Interactable = { kind: "door", id: "door", x: def.exit.x, z: def.exit.z, radius: def.exit.radius }
  const findNearby = (): Interactable | null => {
    if (locked || state.kind !== "free") return null
    let best: Interactable | null = null
    let bestD = Infinity
    const consider = (it: Interactable, d: number) => {
      if (d <= it.radius && d < bestD) {
        best = it
        bestD = d
      }
    }
    if (opts.mode === "visit") consider(door, Math.hypot(door.x - body.x, door.z - body.z))
    for (const s of def.seats) consider({ kind: "seat", id: s.id, x: s.x, z: s.z, radius: 1.25, seat: s }, Math.hypot(s.x - body.x, s.z - body.z))
    for (const b of beds) consider({ kind: "bed", id: b.id, x: b.x, z: b.z, radius: 1.6, bed: b }, Math.hypot(b.x - body.x, b.z - body.z))
    // Ponto de uso: perto do ponto OU do móvel (o balcão é comprido).
    for (const sp of spots) {
      const d = Math.min(Math.hypot(sp.x - body.x, sp.z - body.z), Math.hypot(sp.center.x - body.x, sp.center.z - body.z) - 0.4)
      consider({ kind: "spot", id: sp.id, x: sp.x, z: sp.z, radius: 1.3, spot: sp }, Math.max(0, d))
    }
    return best
  }
  const interactWith = (it: Interactable) => {
    if (it.kind === "door") opts.onExit?.()
    else if (it.kind === "bed") lieOn(it.bed)
    else if (it.kind === "seat") {
      settle(it.seat)
      setState({ kind: "seat", seat: it.seat })
    } else if (it.kind === "spot") {
      settle(it.spot)
      setState({ kind: "spot", spot: it.spot })
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
    if (state.kind !== "free") {
      // Andar = levantar / sair do ponto (como na casa). Internado fica: a alta é da vida.
      if ((intent.x || intent.z) && !locked) getUp()
      move = state.kind === "seat" ? 3 : state.kind === "bed" ? 4 : 0
      body.vx = 0
      body.vz = 0
    }
    if (state.kind === "free") move = stepInterior(body, intent, dt, def, speeds)
    visualFacing = lerpAngle(visualFacing, body.facing, 1 - Math.exp(-12 * dt))
    char.place(body.x, body.z, visualFacing, body.y)
    char.animate(dt, move, Math.hypot(body.vx, body.vz))
    for (const n of npcs) n.char.animate(dt, n.npc.pose === "sit" ? 3 : 0, 0)
    follow.update(dt, body.x, body.z, viewBoxes(), body.y)
    governor.tick(engine.getDeltaTime())

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (state.kind !== "free") getUp()
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

  return {
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
      if (state.kind !== "free") getUp()
      else if (nearby && !input.blocked) interactWith(nearby)
    },
    stand: getUp,
    setPose(pose, at) {
      if (at) settle({ ...at, floor: body.floor })
      char.setPose(pose)
    },
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
      for (const n of npcs) n.char.dispose()
      lib.dispose()
      interior.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
}

/** Nome antigo (mm3d-26). */
export const createHospitalGame = createPlaceGame
