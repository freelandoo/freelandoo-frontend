// features/meu-mundo/engine/house-game.ts
//
// O INTERIOR de uma casa (mm3d-09): motor próprio, cena própria, sala própria.
// Quando este jogo existe o bairro NÃO existe — a tela descarta um antes de
// criar o outro (só um ambiente 3D ativo, nada renderizando escondido).
//
// Mesma arquitetura do bairro (game.ts): o cliente manda só intenção; a sala
// da casa simula com a MESMA regra (interior-motion.ts ↔ meuMundoInteriorMotion.js)
// e os MESMOS colisores do payload. Sentar, deitar, dormir e levantar são
// pedidos ao servidor, que confere distância, andar e ocupação do assento ou
// da cama (mm3d-13: deitar e dormir também gravam a VIDA do hóspede — ele
// continua dormindo com o jogo fechado). O ritmo de caminhada (`pace`) vem
// da sala: cansado anda mais devagar e curvado.
//
// mm3d-15: bike, skate e patins entram em casa com a pessoa (o carro, não).
// Ficam guardados onde ela desceu (state.rides, gravado no banco); montado,
// anda com a MESMA regra de andar (a casa é pequena) e a pose da modalidade.
//
// mm3d-28: a GELADEIRA do titular. Perto do ponto em frente à porta aparece
// "Abrir geladeira"; abrir e comer são pedidos à sala (mensagem "fridge", que
// confere dono, andar e distância e grava a vida). A porta que abre é só
// desta tela (fridge-door.ts) e, com ela aberta, o personagem fica parado
// olhando para o móvel. Afastar-se, cair a rede ou reconectar fecha a porta.
// Fôlego de corrida: a sala diz `wd` (sem fôlego) e aqui não se prevê
// corrida enquanto ele estiver ligado (a física é a da sala).

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildInterior } from "./interior"
import { Character, RemotePlayer } from "./player"
import { AvatarLibrary } from "./avatars"
import { FollowCamera, INDOOR_CAMERA } from "./camera"
import { NetClient } from "./net"
import { MOTION, kindOfId, lerpAngle, paceSpeeds, type Intent, type MoveState, type RideKind } from "./motion"
import { CarFleet, type CarPose } from "./cars"
import { placeRider } from "./ride"
import type { CarState } from "./net"
import { stepInterior, type InteriorBody } from "./interior-motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "./input"
import type { Box2 } from "./collision"
import { liveGamesBump } from "./game"
import { ResolutionGovernor, resolveQuality, type QualityChoice } from "./quality"
import { FridgeDoor } from "./fridge-door"
import {
  BODY_IDS,
  type BodyId,
  type GameStats,
  type HousePayload,
  type Interactable,
  type LifeCharacter,
  type LifeItem,
  type MultiplayerSession,
  type NetStatus,
} from "../types"

export interface HouseGameOptions {
  canvas: HTMLCanvasElement
  payload: HousePayload
  maxPixelRatio?: number
  fetchSession: () => Promise<(MultiplayerSession & { sceneKey?: string }) | null>
  onReady?: () => void
  onNearbyChange?: (item: Interactable | null) => void
  onInteract?: (item: Interactable) => void
  onStats?: (stats: GameStats) => void
  onError?: (reason: "context-lost") => void
  onNet?: (status: NetStatus) => void
  onOnline?: (count: number) => void
  onBody?: (body: BodyId) => void
  /** Sentado (id do assento) ou em pé (null), confirmado pelo servidor. */
  onSeat?: (seat: string | null) => void
  /** Pedido de assento recusado (ocupado, longe…). */
  onSeatDenied?: (reason: string) => void
  /** Na cama (deitado ou dormindo) ou fora dela (null), confirmado pelo servidor. */
  onRest?: (rest: { bed: string; sleeping: boolean } | null) => void
  /** Deitar/dormir recusado (longe, ocupada, estimulante, internado…). */
  onRestDenied?: (reason: string) => void
  /** Mensagens de visita vindas da sala. */
  onServerMessage?: (type: string, payload: unknown) => void
  /** Montado (id do veículo) ou a pé (0), confirmado pela sala (mm3d-15). */
  onRiding?: (id: number) => void
  /** Resposta da sala à geladeira (mm3d-28): abrir ou comer. */
  onFridge?: (msg: FridgeReply) => void
  /** A geladeira fechou sem pedido da tela (afastou-se, a rede caiu). */
  onFridgeClosed?: () => void
  /** Sem fôlego (mm3d-28), como a sala diz: só anda até recuperar. */
  onWinded?: (winded: boolean) => void
  /** Usar/descer recusado (longe, ocupado, na escada…). */
  onRideDenied?: (reason: string) => void
}

/** Mensagem "fridge" da sala (src/realtime/meuMundo.js onFridge). */
export interface FridgeReply {
  ok: boolean
  a: "open" | "eat" | ""
  fridge: string
  key?: string
  reason?: string
  stock?: Record<string, number>
  character?: LifeCharacter
  wallet?: { coins: number }
  ate?: { item: string; meal: { id: string; at: number; credit: number; done: boolean; late: boolean } | null } | null
  replay?: boolean
  catalog?: { items: LifeItem[] }
}

export interface HouseGameHandle {
  input: InputState
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  /** Outra tela 3D por cima (hospital, mm3d-26): para de desenhar, a sala continua. */
  setSuspended: (on: boolean) => void
  interact: () => void
  sit: (seatId: string) => void
  /** Deitar na cama (fica acordado). */
  lie: (bedId: string) => void
  /** Dormir — na cama em que está deitado, ou direto numa cama perto. */
  sleep: (hours?: number, bedId?: string) => void
  /** Levantar (do assento ou da cama — dormindo, acorda). */
  stand: () => void
  /** Descer da bike/skate/patins (fica parado onde está). */
  leaveRide: () => void
  /** Geladeira (mm3d-28): pedir para abrir, comer uma unidade (chave idempotente) e fechar. */
  openFridge: (id: string) => void
  eatFridge: (item: string, key: string) => void
  closeFridge: () => void
  recenter: () => void
  reconnect: () => void
  setStatsEnabled: (on: boolean) => void
  /** Qualidade gráfica escolhida na gaveta (mm3d-19). */
  setQuality: (c: QualityChoice) => void
  /** Andar onde o personagem está (painel). */
  floor: () => number
  dispose: () => void
}

interface RemoteHouseState {
  name: string
  body: string
  host: boolean
  x: number
  z: number
  y: number
  floor: number
  facing: number
  move: number
  seat: string
  bed?: string
  pace?: number
  ride?: number
  st?: number
  wd?: boolean
  sk?: boolean
}

/** Veículo guardado na casa (mm3d-15; chave = id do veículo). */
interface HouseRideState {
  kind: string
  x: number
  z: number
  y: number
  floor: number
  facing: number
  rider: string
  sp: number
}

const WALL_COLOR = new Color3(0.93, 0.9, 0.84)
const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)

export function createHouseGame(opts: HouseGameOptions): HouseGameHandle {
  const { canvas, payload } = opts
  const def = payload.interior
  const speeds = {
    walk: payload.motion?.walkSpeed ?? MOTION.WALK_SPEED,
    run: payload.motion?.runSpeed ?? MOTION.RUN_SPEED,
  }
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  // Resolução pelo FPS medido (mm3d-19); a casa é pequena, o resto não muda.
  const governor = new ResolutionGovernor(engine, resolveQuality(), Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.16, 0.15, 0.17, 1)
  scene.ambientColor = new Color3(0.2, 0.2, 0.22)
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("mm-house-hemi", new Vector3(0.2, 1, 0.1), scene)
  hemi.intensity = 0.85
  hemi.groundColor = new Color3(0.55, 0.52, 0.5)
  const key = new DirectionalLight("mm-house-key", new Vector3(-0.4, -1, 0.3), scene)
  key.intensity = 0.4
  void WALL_COLOR

  const interior = buildInterior(scene, def)
  // Sentar e — desde o mm3d-15 — as poses de bike, skate e patins.
  const lib = new AvatarLibrary(scene, true, true)
  const fleet = new CarFleet(scene)
  const fallbackMat = new StandardMaterial("mm-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("mm-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const mats = { fallback: fallbackMat, shadow: shadowMat }

  let myBody: BodyId = isBody(payload.me.body) ? payload.me.body : "normal"
  const char = new Character(scene, lib, mats, myBody, null, true)
  const e = def.entry
  const body: InteriorBody = { x: e.x, z: e.z, vx: 0, vz: 0, facing: e.facing, floor: e.floor, y: def.floors[e.floor].y }
  // Conferência (como __mmLiveGames): onde estou e onde fica a saída.
  const probe = () => ({ x: body.x, z: body.z, floor: body.floor, exit: def.exit })
  ;(window as unknown as { __mmHouse?: typeof probe }).__mmHouse = probe
  let visualFacing = e.facing
  let move: MoveState = 0
  let server: { x: number; z: number; floor: number } | null = null
  let seated: string | null = null
  let pendingSit: string | null = null
  let rest: { bed: string; sleeping: boolean } | null = null
  let pendingBed = false
  let myPace = 1
  // Veículo em que estou montado (0 = a pé) — o que a sala diz.
  let myRide = 0
  const myPose: CarPose = { x: 0, z: 0, y: 0, facing: 0, sp: 0, st: 0, hb: 0, sl: 0, ax: 0, ay: 0 }
  const beds = def.beds ?? []
  // Geladeira (mm3d-28): só o titular abre; a porta aberta é só desta tela.
  const fridges = def.fridges ?? []
  const isOwner = payload.me.role === "owner"
  const fridgeDoor = new FridgeDoor(scene, def)
  let fridgeOpen: string | null = null
  let fridgeAsked: string | null = null
  let winded = false
  char.place(body.x, body.z, body.facing, body.y)

  const follow = new FollowCamera(scene, INDOOR_CAMERA)
  scene.activeCamera = follow.camera
  follow.snapBehind(body.x, body.z, body.facing)
  follow.snapHeight(body.y)
  const viewBoxes = () => def.floors[body.floor].boxes as Box2[]
  follow.update(1, body.x, body.z, viewBoxes(), body.y)
  interior.showUpTo(body.floor)

  const input = createInputState()
  const detachInput = attachInput(canvas, input)

  const teleport = (x: number, z: number, floor: number, facing: number) => {
    Object.assign(body, { x, z, vx: 0, vz: 0, facing, floor })
    stepInterior(body, { x: 0, z: 0, run: false }, 0, def, speeds)
    visualFacing = facing
    server = null
  }

  // ── Rede ────────────────────────────────────────────────────────────────
  const remotes = new Map<string, RemotePlayer & { floor?: number }>()
  let welcomed = false
  let onlineCount = -1
  const net = new NetClient({
    sceneKey: payload.sceneKey,
    onStatus: (s) => {
      if (disposed) return
      opts.onNet?.(s)
      if (s !== "online") {
        for (const [, r] of remotes) r.dispose()
        remotes.clear()
        shutFridge(true)
      }
    },
    onWelcome: (p) => {
      if (disposed) return
      const q = p as { x: number; z: number; facing: number; floor?: number }
      if (!welcomed || Math.hypot(q.x - body.x, q.z - body.z) > 3) {
        teleport(q.x, q.z, q.floor ?? 0, q.facing)
        if (!welcomed) {
          follow.snapBehind(q.x, q.z, q.facing)
          follow.snapHeight(body.y)
        }
      }
      // Reconexão: a sala não guarda assento de quem caiu. A cama, sim (ela
      // é da VIDA): se ele ainda estiver deitado, a sala manda "bed" de novo.
      if (seated) {
        seated = null
        opts.onSeat?.(null)
      }
      if (rest) {
        rest = null
        opts.onRest?.(null)
      }
      shutFridge(true)
      welcomed = true
    },
    onMessage: (type, p) => {
      if (disposed) return
      if (type === "seat") {
        const m = p as { ok: boolean; seat: string; reason?: string }
        if (m.seat !== pendingSit) return
        pendingSit = null
        if (m.ok) {
          const st = def.seats.find((s) => s.id === m.seat)
          if (st) {
            seated = st.id
            Object.assign(body, { x: st.x, z: st.z, vx: 0, vz: 0, facing: st.facing, floor: st.floor })
            body.y = def.floors[st.floor].y
            visualFacing = st.facing
            opts.onSeat?.(st.id)
          }
        } else opts.onSeatDenied?.(m.reason || "seat")
        return
      }
      if (type === "bed") {
        const m = p as { ok: boolean; bed: string; a?: "lie" | "sleep"; reason?: string }
        pendingBed = false
        if (m.ok) {
          const bd = beds.find((b) => b.id === m.bed)
          if (bd) {
            seated = null
            rest = { bed: bd.id, sleeping: m.a === "sleep" }
            Object.assign(body, { x: bd.x, z: bd.z, vx: 0, vz: 0, facing: bd.facing, floor: bd.floor })
            body.y = def.floors[bd.floor].y
            visualFacing = bd.facing
            opts.onRest?.(rest)
          }
        } else opts.onRestDenied?.(m.reason || "bed")
        return
      }
      if (type === "stood") {
        const m = p as { x: number; z: number; floor: number; facing: number }
        const wasResting = !!rest
        seated = null
        rest = null
        teleport(m.x, m.z, m.floor, m.facing)
        opts.onSeat?.(null)
        if (wasResting) opts.onRest?.(null)
        return
      }
      if (type === "ride") {
        const m = p as { ok: boolean; id?: number; x?: number; z?: number; floor?: number; facing?: number; reason?: string }
        if (!m.ok) opts.onRideDenied?.(m.reason || "ride")
        else if (m.id && typeof m.x === "number" && typeof m.z === "number") teleport(m.x, m.z, m.floor ?? body.floor, m.facing ?? body.facing)
        return
      }
      if (type === "fridge") {
        const m = p as FridgeReply
        if (m.a === "open") {
          if (m.fridge !== fridgeAsked) return
          fridgeAsked = null
          const f = fridges.find((x) => x.id === m.fridge)
          if (m.ok && f && !seated && !rest) {
            fridgeOpen = f.id
            fridgeDoor.show(f)
            body.vx = 0
            body.vz = 0
            body.facing = f.facing
          }
        }
        opts.onFridge?.(m)
        return
      }
      if (type === "life") {
        const m = p as { pace?: number }
        if (typeof m.pace === "number") myPace = m.pace
      }
      opts.onServerMessage?.(type, p)
    },
    fetchSession: opts.fetchSession,
  })
  const mp = payload.multiplayer
  if (mp && "reservation" in mp) void net.connect(mp)
  else void net.retry()

  const syncNetwork = (now: number, intent: Intent) => {
    net.sendIntent(seated || rest || fridgeOpen ? { x: 0, z: 0, run: false } : intent, now)
    const st = net.state<{ players?: Map<string, RemoteHouseState> }>()
    const players = st?.players
    const me = net.sessionId
    if (!players || net.status !== "online") {
      if (onlineCount !== 1) {
        onlineCount = 1
        opts.onOnline?.(1)
      }
      return
    }
    const seen = new Set<string>()
    players.forEach((p, sid) => {
      if (sid === me) {
        server = { x: p.x, z: p.z, floor: p.floor }
        // Tipo físico: vem da vida (a sala aplica); ninguém escolhe.
        if (isBody(p.body) && p.body !== myBody) {
          myBody = p.body
          void char.setBody(myBody)
          opts.onBody?.(myBody)
        }
        if (typeof p.pace === "number" && p.pace > 0) myPace = p.pace
        char.unwell = !!p.sk
        if (!!p.wd !== winded) {
          winded = !!p.wd
          opts.onWinded?.(winded)
        }
        const rid = p.ride ?? 0
        if (rid !== myRide) {
          myRide = rid
          opts.onRiding?.(rid)
        }
        return
      }
      seen.add(sid)
      let r = remotes.get(sid)
      const b = isBody(p.body) ? p.body : "normal"
      if (!r) {
        r = new RemotePlayer(new Character(scene, lib, mats, b, p.name, false), p.x, p.z, p.facing)
        remotes.set(sid, r)
      } else if (r.char.body !== b) {
        void r.char.setBody(b)
      }
      r.floor = p.floor
      r.car = p.ride ?? 0
      r.char.tired = (p.pace ?? 1) < 1 || !!p.wd
      r.char.unwell = !!p.sk
      r.setTarget(p.x, p.z, p.facing, Math.max(0, Math.min(5, p.move)) as MoveState, p.y)
    })
    for (const [sid, r] of remotes) {
      if (!seen.has(sid)) {
        r.dispose()
        remotes.delete(sid)
      }
    }
    if (seen.size + 1 !== onlineCount) {
      onlineCount = seen.size + 1
      opts.onOnline?.(onlineCount)
    }
  }

  // ── Interação: a porta (saída), os assentos e as camas livres do andar ───
  const door: Interactable = { kind: "door", id: "exit", x: def.exit.x, z: def.exit.z, radius: def.exit.radius }
  let nearby: Interactable | null = null
  const occupied = () => {
    const out = new Set<string>()
    net.state<{ players?: Map<string, RemoteHouseState> }>()?.players?.forEach((p) => {
      if (p.seat) out.add(p.seat)
      if (p.bed) out.add(p.bed)
    })
    return out
  }
  const exitRide: Interactable = { kind: "car-exit", id: "ride-exit", x: 0, z: 0, radius: 99 }
  const rides = () => net.state<{ rides?: Map<string, HouseRideState> }>()?.rides ?? null
  const findNearby = (): Interactable | null => {
    if (seated || rest || fridgeOpen) return null
    let best: Interactable | null = null
    let bestD = Infinity
    if (body.floor === def.exit.floor) {
      const d = Math.hypot(door.x - body.x, door.z - body.z)
      if (d <= door.radius) {
        best = door
        bestD = d
      }
    }
    // Montado: sair pela porta (ele vai junto) ou descer.
    if (myRide) return best ?? exitRide
    // "Usar" um veículo parado do mesmo andar.
    rides()?.forEach((r, key) => {
      if (r.rider || r.floor !== body.floor) return
      const kind = kindOfId(Number(key))
      if (!kind || kind === "car") return
      const d = Math.hypot(r.x - body.x, r.z - body.z)
      if (d <= 1.25 && d < bestD) {
        best = { kind: "car", id: `ride-${key}`, x: r.x, z: r.z, radius: 1.25, lot: 0, vid: Number(key), vkind: kind }
        bestD = d
      }
    })
    const taken = occupied()
    for (const s of def.seats) {
      if (s.floor !== body.floor || taken.has(s.id)) continue
      const d = Math.hypot(s.x - body.x, s.z - body.z)
      if (d <= 1.25 && d < bestD) {
        best = { kind: "seat", id: s.id, x: s.x, z: s.z, radius: 1.25, seat: s }
        bestD = d
      }
    }
    // Geladeira: só o titular; a sala aceita a até 1,7 m (FRIDGE_REACH).
    if (isOwner) {
      for (const f of fridges) {
        if (f.floor !== body.floor) continue
        const d = Math.hypot(f.x - body.x, f.z - body.z)
        if (d <= 1.5 && d < bestD) {
          best = { kind: "fridge", id: f.id, x: f.x, z: f.z, radius: 1.5, fridge: f }
          bestD = d
        }
      }
    }
    // Cama: o servidor aceita a até 1,9 m do ponto de deitar (BED_REACH).
    for (const b of beds) {
      if (b.floor !== body.floor || taken.has(b.id)) continue
      const d = Math.hypot(b.x - body.x, b.z - body.z)
      if (d <= 1.6 && d < bestD) {
        best = { kind: "bed", id: b.id, x: b.x, z: b.z, radius: 1.6, bed: b }
        bestD = d
      }
    }
    return best
  }

  /** Usar e descer são pedidos à sala; o resto (porta, assento, cama) é da tela. */
  const interactWith = (it: Interactable) => {
    if (it.kind === "car") net.send("ride", { a: "on", id: it.vid })
    else if (it.kind === "car-exit") net.send("ride", { a: "off" })
    else if (it.kind === "fridge") handle.openFridge(it.fridge.id)
    else opts.onInteract?.(it)
  }

  /** Fecha a porta; `notify` = não foi a tela que pediu (ela precisa saber). */
  function shutFridge(notify: boolean) {
    fridgeAsked = null
    if (!fridgeOpen) return
    fridgeOpen = null
    fridgeDoor.hide()
    if (notify) opts.onFridgeClosed?.()
  }

  /** Os veículos guardados para desenhar (os de andares acima do meu, não). */
  const rideCars = () => {
    const out = new Map<string, CarState>()
    rides()?.forEach((r, key) => {
      if (r.floor > body.floor) return
      out.set(key, { lot: 0, kind: r.kind, x: r.x, z: r.z, y: r.y, facing: r.facing, driver: r.rider, sp: r.sp })
    })
    return out
  }

  let instr: SceneInstrumentation | null = null
  let statsTimer = 0

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
    if (fridgeOpen) {
      // Geladeira aberta: parado, olhando para ela (a sala também não anda).
      move = 0
      body.vx = 0
      body.vz = 0
      const f = fridges.find((x) => x.id === fridgeOpen)
      // A sala o levou para longe (escada, correção grande): a porta fecha.
      if (!f || f.floor !== body.floor || Math.hypot(f.x - body.x, f.z - body.z) > 1.8) shutFridge(true)
    } else if (seated || rest) {
      // Sentado/deitado: andar = levantar (pedido ao servidor, que leva ao
      // ponto livre). Dormindo, andar acorda.
      if (intent.x || intent.z) handle.stand()
      move = seated ? 3 : rest!.sleeping ? 5 : 4
      body.vx = 0
      body.vz = 0
    } else {
      move = stepInterior(body, winded && intent.run ? { ...intent, run: false } : intent, dt, def, paceSpeeds(myPace, speeds))
      if (server) {
        const moving = intent.x !== 0 || intent.z !== 0
        const ex = server.x - body.x
        const ez = server.z - body.z
        const err = Math.hypot(ex, ez)
        // Andar diferente do servidor (escada) ou erro grande: vai de vez.
        if (server.floor !== body.floor && !moving) {
          teleport(server.x, server.z, server.floor, body.facing)
        } else if (err > 4) {
          body.x = server.x
          body.z = server.z
        } else if (err > (moving ? speeds.run * 0.6 + 0.6 : 0.02)) {
          const k = 1 - Math.exp(-(moving ? 2.5 : 6) * dt)
          body.x += ex * k
          body.z += ez * k
        }
      }
    }
    visualFacing = lerpAngle(visualFacing, body.facing, 1 - Math.exp(-12 * dt))
    char.tired = myPace < 1 || winded
    const speed = Math.hypot(body.vx, body.vz)
    const myKind = myRide ? kindOfId(myRide) : null
    if (!myKind || myKind === "car") {
      char.place(body.x, body.z, visualFacing, body.y)
      char.animate(dt, move, speed)
    }
    syncNetwork(performance.now(), intent)
    if (myKind && myKind !== "car") Object.assign(myPose, { x: body.x, z: body.z, y: body.y, facing: visualFacing, sp: speed })
    fleet.sync(rideCars(), dt, myRide, myKind && myKind !== "car" ? myPose : null)
    if (myKind && myKind !== "car") placeRider(fleet, char, String(myRide), myKind as RideKind, body.x, body.z, visualFacing, speed, dt, body.y)
    for (const r of remotes.values()) {
      const rk = r.car ? kindOfId(r.car) : null
      const vp = rk && rk !== "car" ? fleet.poseOf(String(r.car)) : null
      if (rk && rk !== "car" && vp) {
        placeRider(fleet, r.char, String(r.car), rk, vp.x, vp.z, vp.facing, vp.sp, dt, vp.y)
        r.x = vp.x
        r.z = vp.z
        r.facing = vp.facing
      } else r.update(dt)
      // Outro andar acima do meu: escondido junto com o andar.
      r.char.setVisible((r.floor ?? 0) <= body.floor)
    }
    interior.showUpTo(body.floor)
    fridgeDoor.tick(dt, body.floor)
    follow.update(dt, body.x, body.z, viewBoxes(), body.y)
    governor.tick(engine.getDeltaTime())

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (seated || rest) handle.stand()
      else if (nearby && !input.blocked) interactWith(nearby)
    }

    if (instr && opts.onStats) {
      statsTimer += dt
      if (statsTimer >= 0.5) {
        statsTimer = 0
        opts.onStats({
          fps: engine.getFps(),
          frameMs: instr.frameTimeCounter.lastSecAverage || null,
          meshes: scene.meshes.length,
          activeMeshes: scene.getActiveMeshes().length,
          materials: scene.materials.length,
          drawCalls: Math.round(instr.drawCallsCounter.lastSecAverage) || null,
          webgl: engine.webGLVersion,
          liveGames: liveGamesBump.count(),
          x: body.x,
          z: body.z,
          avatars: lib.live,
          houseModels: [],
          renderScale: governor.ratio,
        })
      }
    }
  })

  scene.executeWhenReady(() => {
    if (!disposed) opts.onReady?.()
  })
  let suspended = false
  engine.runRenderLoop(() => {
    if (!disposed && !suspended) scene.render()
  })
  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)
  const lost = engine.onContextLostObservable.add(() => {
    if (!disposed) opts.onError?.("context-lost")
  })

  const handle: HouseGameHandle = {
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
    setSuspended(on) {
      suspended = on
      if (on) clearInput(input)
    },
    interact() {
      if (seated || rest) handle.stand()
      else if (nearby && !input.blocked) interactWith(nearby)
    },
    leaveRide() {
      if (myRide) net.send("ride", { a: "off" })
    },
    openFridge(id) {
      if (!isOwner || seated || rest || myRide || fridgeOpen || fridgeAsked) return
      fridgeAsked = id
      net.send("fridge", { a: "open", fridge: id })
      // Sem resposta (rede caiu): libera para tentar de novo.
      setTimeout(() => {
        if (fridgeAsked === id) {
          fridgeAsked = null
          opts.onFridge?.({ ok: false, a: "open", fridge: id, reason: "timeout" })
        }
      }, 4000)
    },
    eatFridge(item, key) {
      if (!fridgeOpen) return
      net.send("fridge", { a: "eat", fridge: fridgeOpen, item, key })
    },
    closeFridge() {
      shutFridge(false)
    },
    sit(seatId) {
      if (seated || pendingSit) return
      pendingSit = seatId
      net.send("sit", { seat: seatId })
      // Sem resposta (rede caiu): libera o pedido para tentar de novo.
      setTimeout(() => {
        if (pendingSit === seatId) pendingSit = null
      }, 3000)
    },
    lie(bedId) {
      if (seated || rest || pendingBed) return
      pendingBed = true
      net.send("bed", { bed: bedId, a: "lie" })
      setTimeout(() => {
        pendingBed = false
      }, 3000)
    },
    sleep(hours = 8, bedId) {
      if (seated || pendingBed || (rest && rest.sleeping)) return
      const target = rest ? rest.bed : bedId
      if (!target) return
      pendingBed = true
      net.send("bed", { bed: target, a: "sleep", hours })
      setTimeout(() => {
        pendingBed = false
      }, 3000)
    },
    stand() {
      if (!seated && !rest) return
      net.send("stand", {})
    },
    recenter() {
      follow.snapBehind(body.x, body.z, body.facing)
    },
    reconnect() {
      void net.retry()
    },
    setQuality(c) {
      governor.setProfile(resolveQuality(c))
    },
    setStatsEnabled(on) {
      if (on && !instr) {
        instr = new SceneInstrumentation(scene)
        instr.captureFrameTime = true
        statsTimer = 1
      } else if (!on && instr) {
        instr.dispose()
        instr = null
      }
    },
    floor: () => body.floor,
    dispose() {
      if (disposed) return
      disposed = true
      const w = window as unknown as { __mmHouse?: typeof probe }
      if (w.__mmHouse === probe) delete w.__mmHouse
      net.dispose()
      engine.stopRenderLoop()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      instr?.dispose()
      instr = null
      for (const r of remotes.values()) r.dispose()
      remotes.clear()
      fleet.dispose()
      fridgeDoor.dispose()
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
