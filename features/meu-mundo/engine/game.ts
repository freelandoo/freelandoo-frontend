// features/meu-mundo/engine/game.ts
//
// Ciclo de vida do Meu Mundo 3D: cria o motor, monta o bairro, conecta à sala
// do bairro, roda UM laço de renderização e, ao sair, desmonta tudo que criou.
//
// Esta peça não sabe nada de React nem da Freelandoo: recebe um canvas, o
// payload do bairro e callbacks. É isso que permite levar as regras do jogo
// para um aplicativo depois sem reescrever o mundo.
//
// ═══ O QUE O DESCARTE GARANTE ═══
// Ao sair: a conexão é encerrada (e reconexões pendentes canceladas), o laço
// para, os ouvintes saem (um AbortController só), o observador de tamanho
// desconecta, avatares, animações, texturas, a cena e o motor são descartados
// e nenhum callback é chamado depois disso. `liveGames()` conta quantas
// instâncias estão de pé — entrar e sair várias vezes deixa zero ou um.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera"
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildWorld } from "./world"
import { Character, LocalPlayer, RemotePlayer } from "./player"
import { AvatarLibrary } from "./avatars"
import { FollowCamera } from "./camera"
import { NetClient } from "./net"
import { MOTION, type Intent, type MoveState } from "./motion"
import { attachInput, clearInput, createInputState, moveAxis, wantsRun, type InputState } from "./input"
import {
  BODY_IDS,
  type BodyId,
  type GameStats,
  type HouseVisual,
  type Interactable,
  type MultiplayerSession,
  type NeighborhoodPayload,
  type NetStatus,
} from "../types"

let live = 0
export const liveGames = () => live

/**
 * Conta mais um jogo vivo (bairro OU interior) e devolve a função que o
 * desconta. `window.__mmLiveGames()` confere que trocar de ambiente não
 * acumula motores: o número fica em 0 ou 1.
 */
export function liveGamesBump() {
  live++
  ;(window as unknown as { __mmLiveGames?: () => number }).__mmLiveGames = liveGames
  let done = false
  return () => {
    if (done) return
    done = true
    live--
  }
}
liveGamesBump.count = liveGames

export interface GameOptions {
  canvas: HTMLCanvasElement
  payload: NeighborhoodPayload
  exitLabel: string
  /** Teto da resolução interna (pixels de tela por pixel CSS). */
  maxPixelRatio?: number
  fetchSession: () => Promise<(MultiplayerSession & { sceneKey?: string }) | null>
  onReady?: () => void
  onNearbyChange?: (item: Interactable | null) => void
  onInteract?: (item: Interactable) => void
  onStats?: (stats: GameStats) => void
  onError?: (reason: "context-lost") => void
  onNet?: (status: NetStatus) => void
  /** Jogadores conectados neste bairro (inclui você). */
  onOnline?: (count: number) => void
  onBody?: (body: BodyId) => void
  /** Titulares do bairro (permanentes), atualizado pela sala. */
  onResidents?: (count: number) => void
  /** Casa de um lote: nível confirmado × exibido, carregamento e falha. */
  onHouseVisual?: (v: HouseVisual) => void
  /** Mensagens de visita vindas da sala (convites, fim de visita). */
  onServerMessage?: (type: string, payload: unknown) => void
}

export interface GameHandle {
  input: InputState
  /** Joystick virtual do celular: x = direita, y = frente, módulo até 1. */
  setJoystick: (x: number, y: number) => void
  setRun: (on: boolean) => void
  setBlocked: (blocked: boolean) => void
  setBody: (body: BodyId) => void
  interact: () => void
  /** Recoloca a câmera atrás do personagem (não move o personagem). */
  recenter: () => void
  reconnect: () => void
  /** Nível confirmado pelo servidor (resposta HTTP); a sala confirma de novo. */
  applyHouseLevel: (lot: number, level: number, rev: number) => void
  retryHouse: (lot: number) => void
  houseVisual: (lot: number) => HouseVisual | null
  setStatsEnabled: (on: boolean) => void
  dispose: () => void
}

const SKY = new Color3(0.66, 0.83, 0.95)
const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)

export function createMeuMundoGame(opts: GameOptions): GameHandle {
  const { canvas, payload } = opts
  const nb = payload.neighborhood
  const speeds = {
    walk: payload.motion?.walkSpeed ?? MOTION.WALK_SPEED,
    run: payload.motion?.runSpeed ?? MOTION.RUN_SPEED,
  }
  const limit = nb.limit ?? 70
  const engine = new Engine(
    canvas,
    true,
    { stencil: false, preserveDrawingBuffer: false, powerPreference: "default" },
    false,
  )
  const unlive = liveGamesBump()
  let disposed = false

  const ratio = Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5)
  engine.setHardwareScalingLevel(1 / ratio)

  const scene = new Scene(engine)
  scene.clearColor = new Color4(SKY.r, SKY.g, SKY.b, 1)
  scene.ambientColor = new Color3(0.2, 0.2, 0.22)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = SKY
  scene.fogStart = 70
  scene.fogEnd = 165
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  scene.autoClear = true

  const hemi = new HemisphericLight("mm-hemi", new Vector3(0.25, 1, 0.15), scene)
  hemi.intensity = 0.78
  hemi.groundColor = new Color3(0.5, 0.48, 0.55)
  const sun = new DirectionalLight("mm-sun", new Vector3(-0.55, -1, -0.35), scene)
  sun.intensity = 0.55

  const world = buildWorld(scene, nb, opts.exitLabel, (v) => {
    if (!disposed) opts.onHouseVisual?.(v)
  })
  const lib = new AvatarLibrary(scene)

  const fallbackMat = new StandardMaterial("mm-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("mm-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const mats = { fallback: fallbackMat, shadow: shadowMat }

  const home = payload.me.home
  let myBody: BodyId = isBody(payload.me.body) ? payload.me.body : "normal"
  const local = new LocalPlayer(new Character(scene, lib, mats, myBody, null, true), home.x, home.z, home.rotationY)
  const follow = new FollowCamera(scene)
  scene.activeCamera = follow.camera
  follow.snapBehind(home.x, home.z, home.rotationY)
  follow.update(1, local.x, local.z, world.viewBoxes)

  const input = createInputState()
  const detachInput = attachInput(canvas, input)

  // ── Rede ──────────────────────────────────────────────────────────────────
  const remotes = new Map<string, RemotePlayer>()
  let welcomed = false
  let onlineCount = -1
  let residentCount = nb.residents
  const net = new NetClient({
    onStatus: (s) => {
      if (disposed) return
      opts.onNet?.(s)
      if (s !== "online") for (const [, r] of remotes) r.dispose()
      if (s !== "online") remotes.clear()
    },
    onWelcome: (p) => {
      if (disposed) return
      // Primeira entrada: o servidor decide onde você nasce. Reconexão: só
      // corrige se a diferença for grande (a predição local já está perto).
      const far = Math.hypot(p.x - local.x, p.z - local.z) > 3
      if (!welcomed || far) {
        local.teleport(p.x, p.z, p.facing)
        if (!welcomed) follow.snapBehind(p.x, p.z, p.facing)
      }
      welcomed = true
    },
    onMoved: (p) => {
      if (disposed) return
      local.teleport(p.x, p.z, p.facing)
      follow.snapBehind(p.x, p.z, p.facing)
    },
    fetchSession: opts.fetchSession,
    sceneKey: payload.sceneKey,
    onMessage: (type, p) => {
      if (!disposed) opts.onServerMessage?.(type, p)
    },
  })
  const mp = payload.multiplayer
  if (mp && "reservation" in mp) void net.connect(mp)
  else void net.retry()

  const syncNetwork = (now: number, intent: Intent) => {
    net.sendIntent(intent, now)
    const players = net.players()
    const me = net.sessionId
    if (!players || net.status !== "online") {
      if (onlineCount !== 1) {
        onlineCount = 1
        opts.onOnline?.(1)
      }
      return
    }
    // Nível das casas: a sala é a fonte (revisão maior vence; o mundo ignora
    // o que já aplicou, então ler todo quadro custa 20 comparações).
    net.houses()?.forEach((h, key) => world.applyLevel(Number(key), h.level, h.rev))
    const residents = net.residents()
    if (residents !== null && residents !== residentCount) {
      residentCount = residents
      opts.onResidents?.(residents)
    }
    const seen = new Set<string>()
    players.forEach((p, sid) => {
      if (sid === me) {
        local.setServer(p.x, p.z)
        return
      }
      seen.add(sid)
      let r = remotes.get(sid)
      const body = isBody(p.body) ? p.body : "normal"
      if (!r) {
        r = new RemotePlayer(new Character(scene, lib, mats, body, p.name, false), p.x, p.z, p.facing)
        remotes.set(sid, r)
        // Vizinho que se mudou depois que você entrou: a casa dele deixa de
        // aparecer como disponível (o banco é a fonte; a sala só confirma).
        const h = nb.houses[p.house - 1]
        if (h && !h.isMine && !h.ownerName) h.ownerName = p.name
      } else if (r.char.body !== body) {
        void r.char.setBody(body)
      }
      r.setTarget(p.x, p.z, p.facing, Math.max(0, Math.min(2, p.move)) as MoveState)
    })
    for (const [sid, r] of remotes) {
      if (!seen.has(sid)) {
        r.dispose()
        remotes.delete(sid)
      }
    }
    const count = seen.size + 1
    if (count !== onlineCount) {
      onlineCount = count
      opts.onOnline?.(count)
    }
  }

  // ── Interação ─────────────────────────────────────────────────────────────
  let nearby: Interactable | null = null
  const findNearby = () => {
    let best: Interactable | null = null
    let bestD = Infinity
    for (const it of world.interactables) {
      const d = Math.hypot(it.x - local.x, it.z - local.z)
      if (d <= it.radius && d < bestD) {
        best = it
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
        follow.zoom(input.zoom * 1.1)
        input.zoom = 0
      }
      const axis = moveAxis(input)
      const f = follow.forward()
      // direita = cima × frente (mão esquerda): (f.z, -f.x)
      intent = {
        x: f.x * axis.y + f.z * axis.x,
        z: f.z * axis.y - f.x * axis.x,
        run: wantsRun(input),
      }
      if (Math.hypot(intent.x, intent.z) < 0.05) intent = { x: 0, z: 0, run: intent.run }
    }
    local.update(dt, intent, world.boxes, limit, speeds)
    syncNetwork(performance.now(), intent)
    for (const r of remotes.values()) r.update(dt)
    follow.update(dt, local.x, local.z, world.viewBoxes)

    const next = findNearby()
    if (next?.id !== nearby?.id) {
      nearby = next
      opts.onNearbyChange?.(nearby)
    }
    if (input.interactQueued) {
      input.interactQueued = false
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
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
          liveGames: live,
          x: local.x,
          z: local.z,
          avatars: lib.live,
          houseModels: world.loadedLevels(),
        })
      }
    }
  })

  // Só em desenvolvimento: câmera ortográfica de cima, para conferir o layout
  // com escala real (1 unidade = 1 m). Fora do build de produção.
  if (process.env.NODE_ENV !== "production") {
    const w = window as unknown as { __mmTopView?: (cx: number, cz: number, span: number) => void }
    w.__mmTopView = (cx, cz, span) => {
      const top = new TargetCamera("mm-top", new Vector3(cx, 300, cz - 0.001), scene)
      top.mode = TargetCamera.ORTHOGRAPHIC_CAMERA
      const aspect = engine.getRenderWidth() / engine.getRenderHeight()
      top.orthoTop = span / 2
      top.orthoBottom = -span / 2
      top.orthoLeft = (-span / 2) * aspect
      top.orthoRight = (span / 2) * aspect
      top.minZ = 1
      top.maxZ = 400
      top.setTarget(new Vector3(cx, 0, cz))
      scene.fogMode = Scene.FOGMODE_NONE
      scene.activeCamera = top
    }
  }

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

  const handle: GameHandle = {
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
    setBody(body) {
      if (!isBody(body) || body === myBody) return
      myBody = body
      void local.char.setBody(body)
      net.sendBody(body)
      opts.onBody?.(body)
    },
    interact() {
      if (nearby && !input.blocked) opts.onInteract?.(nearby)
    },
    recenter() {
      follow.snapBehind(local.x, local.z, local.body.facing)
    },
    reconnect() {
      void net.retry()
    },
    applyHouseLevel(lot, level, rev) {
      if (!disposed) world.applyLevel(lot, level, rev)
    },
    retryHouse(lot) {
      if (!disposed) world.retryVisual(lot)
    },
    houseVisual(lot) {
      return world.visual(lot)
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
    dispose() {
      if (disposed) return
      disposed = true
      net.dispose()
      engine.stopRenderLoop()
      detachInput()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      instr?.dispose()
      instr = null
      for (const r of remotes.values()) r.dispose()
      remotes.clear()
      local.dispose()
      lib.dispose()
      world.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
  return handle
}
