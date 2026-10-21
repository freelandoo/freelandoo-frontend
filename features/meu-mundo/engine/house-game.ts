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
import { MOTION, lerpAngle, paceSpeeds, type Intent, type MoveState } from "./motion"
import { stepInterior, type InteriorBody } from "./interior-motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "./input"
import type { Box2 } from "./collision"
import { liveGamesBump } from "./game"
import {
  BODY_IDS,
  type BodyId,
  type GameStats,
  type HousePayload,
  type Interactable,
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
}

export interface HouseGameHandle {
  input: InputState
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  interact: () => void
  sit: (seatId: string) => void
  /** Deitar na cama (fica acordado). */
  lie: (bedId: string) => void
  /** Dormir — na cama em que está deitado, ou direto numa cama perto. */
  sleep: (hours?: number, bedId?: string) => void
  /** Levantar (do assento ou da cama — dormindo, acorda). */
  stand: () => void
  recenter: () => void
  reconnect: () => void
  setStatsEnabled: (on: boolean) => void
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
  const ratio = Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5)
  engine.setHardwareScalingLevel(1 / ratio)

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
  const lib = new AvatarLibrary(scene, true)
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
  const beds = def.beds ?? []
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
    net.sendIntent(seated || rest ? { x: 0, z: 0, run: false } : intent, now)
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
      r.char.tired = (p.pace ?? 1) < 1
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
  const findNearby = (): Interactable | null => {
    if (seated || rest) return null
    let best: Interactable | null = null
    let bestD = Infinity
    if (body.floor === def.exit.floor) {
      const d = Math.hypot(door.x - body.x, door.z - body.z)
      if (d <= door.radius) {
        best = door
        bestD = d
      }
    }
    const taken = occupied()
    for (const s of def.seats) {
      if (s.floor !== body.floor || taken.has(s.id)) continue
      const d = Math.hypot(s.x - body.x, s.z - body.z)
      if (d <= 1.25 && d < bestD) {
        best = { kind: "seat", id: s.id, x: s.x, z: s.z, radius: 1.25, seat: s }
        bestD = d
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
    if (seated || rest) {
      // Sentado/deitado: andar = levantar (pedido ao servidor, que leva ao
      // ponto livre). Dormindo, andar acorda.
      if (intent.x || intent.z) handle.stand()
      move = seated ? 3 : rest!.sleeping ? 5 : 4
      body.vx = 0
      body.vz = 0
    } else {
      move = stepInterior(body, intent, dt, def, paceSpeeds(myPace, speeds))
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
    char.place(body.x, body.z, visualFacing, body.y)
    char.tired = myPace < 1
    char.animate(dt, move, Math.hypot(body.vx, body.vz))
    syncNetwork(performance.now(), intent)
    for (const r of remotes.values()) {
      r.update(dt)
      // Outro andar acima do meu: escondido junto com o andar.
      r.char.setVisible((r.floor ?? 0) <= body.floor)
    }
    interior.showUpTo(body.floor)
    follow.update(dt, body.x, body.z, viewBoxes(), body.y)

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (seated || rest) handle.stand()
      else if (nearby && !input.blocked) opts.onInteract?.(nearby)
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
        })
      }
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
    interact() {
      if (seated || rest) handle.stand()
      else if (nearby && !input.blocked) opts.onInteract?.(nearby)
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
