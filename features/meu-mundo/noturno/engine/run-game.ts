// features/meu-mundo/noturno/engine/run-game.ts — ROLÊ NOTURNO (mm3d-40): a cena.
//
// Cena própria (como a Corrida e o Paint): motor Babylon, a rua de noite
// (street-view), os obstáculos e as moedas (props-view) e o jogador — o
// AVATAR dele (corpo, skin e cores) montado no veículo que escolheu, com as
// mesmas peças da rua do bairro: AvatarLibrary com as poses de bike/skate/
// patins, CarFleet desenhando o veículo e placeRider juntando os dois.
//
// A regra é sim/run.ts em passos de 1/120 s; o desenho interpola o jogador
// entre os dois últimos passos. Teclado: ←/→ (ou A/D) trocam de faixa, ↑/W/
// Espaço pulam, ↓/S descem rápido no ar. Celular: deslizar para os lados,
// para cima (ou tocar) pula, para baixo desce. Aba escondida = pausa.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, resolveQuality } from "../../engine/quality"
import { AvatarLibrary } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { CarFleet, type CarPose } from "../../engine/cars"
import { placeRider } from "../../engine/ride"
import { RIDE_KINDS, type MoveState } from "../../engine/motion"
import type { CarState } from "../../engine/net"
import type { BodyId } from "../../types"
import { Run, TUNING, type RideKind, type RunEvent, type RunInput, type ObstacleKind } from "../sim/run"
import { buildStreet, NIGHT_FOG } from "./street-view"
import { buildProps } from "./props-view"
import { RunAudio } from "./audio"

export interface RunHud {
  phase: "countdown" | "run" | "end"
  countdown: number
  score: number
  coins: number
  dist: number
  /** km/h. */
  speed: number
  /** 0–1: o quanto a velocidade já subiu até a máxima do veículo. */
  pace: number
  /** Tropeçou há pouco (o próximo derruba). */
  wobble: boolean
  air: boolean
}

export interface RunResult {
  score: number
  coins: number
  dist: number
  tricks: number
  by: ObstacleKind | "stumble"
}

export type RunNotice = { kind: "go" } | { kind: "trick"; n: number } | { kind: "stumble" } | { kind: "coins"; n: number } | { kind: "launch" }

export interface RunGameOptions {
  canvas: HTMLCanvasElement
  ride: RideKind
  body: BodyId
  look?: string
  maxPixelRatio?: number
  onReady?: () => void
  onHud?: (h: RunHud) => void
  onNotice?: (n: RunNotice) => void
  onEnd?: (r: RunResult) => void
  onError?: (reason: "context-lost") => void
}

export interface RunGameHandle {
  /** Gesto do celular: lado, pulo, descida. */
  swipe: (dir: "left" | "right" | "up" | "down") => void
  setMuted: (m: boolean) => void
  dispose: () => void
}

const COUNTDOWN = 2.4
const RIDE_KEY = "1"

export function createRunGame(opts: RunGameOptions): RunGameHandle {
  const { canvas } = opts
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  const governor = new ResolutionGovernor(engine, quality, Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  scene.clearColor = NIGHT_FOG.clone()
  scene.ambientColor = new Color3(0.25, 0.25, 0.32)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(NIGHT_FOG.r, NIGHT_FOG.g, NIGHT_FOG.b)
  const fogBase = { start: low ? 55 : 80, end: low ? 150 : 185 }
  scene.fogStart = fogBase.start
  scene.fogEnd = fogBase.end
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("noturno-hemi", new Vector3(0.1, 1, -0.3), scene)
  hemi.intensity = 0.55
  hemi.diffuse = new Color3(0.72, 0.76, 1)
  hemi.groundColor = new Color3(0.24, 0.2, 0.3)
  const moon = new DirectionalLight("noturno-moonlight", new Vector3(0.4, -1, 0.6), scene)
  moon.intensity = 0.45
  moon.diffuse = new Color3(0.75, 0.82, 1)

  const street = buildStreet(scene, low)
  const props = buildProps(scene)

  // ── o jogador: avatar + veículo ────────────────────────────────────────────
  const lib = new AvatarLibrary(scene, false, true, 24)
  const fallbackMat = new StandardMaterial("noturno-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("noturno-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.32
  const char = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, opts.body, null, true, opts.look ?? "")
  const fleet = new CarFleet(scene)
  const rideState: CarState = { lot: 0, kind: opts.ride, x: 0, z: 0, facing: 0, driver: "me", y: 0 }
  const rides = new Map<string, CarState>([[RIDE_KEY, rideState]])
  const pose: CarPose = { x: 0, z: 0, y: 0, facing: 0, sp: 0, st: 0, hb: 0, sl: 0, ax: 0, ay: 0 }

  const run = new Run(opts.ride, (Date.now() & 0xffff) | 1)
  const audio = new RunAudio()
  audio.resume()

  const cam = new FreeCamera("noturno-cam", new Vector3(0, 3.4, -6.5), scene)
  cam.inputs.clear()
  cam.minZ = 0.2
  cam.maxZ = 600
  cam.fov = 0.92
  scene.activeCamera = cam

  // ── controles ──────────────────────────────────────────────────────────────
  const pending: RunInput = { left: false, right: false, jump: false, down: false }
  const onKey = (e: KeyboardEvent) => {
    const k = e.code
    if (e.repeat) {
      if (/^(Arrow|Key[WASD]$|Space$)/.test(k)) e.preventDefault()
      return
    }
    if (k === "ArrowLeft" || k === "KeyA") pending.left = true
    else if (k === "ArrowRight" || k === "KeyD") pending.right = true
    else if (k === "ArrowUp" || k === "KeyW" || k === "Space") pending.jump = true
    else if (k === "ArrowDown" || k === "KeyS") pending.down = true
    else return
    e.preventDefault()
  }
  window.addEventListener("keydown", onKey)
  // deslizar na tela: um gesto por movimento (dá para encadear sem soltar)
  let sx = 0
  let sy = 0
  let st = 0
  let swiping = false
  let fired = false
  const swipe = (dir: "left" | "right" | "up" | "down") => {
    if (dir === "left") pending.left = true
    else if (dir === "right") pending.right = true
    else if (dir === "up") pending.jump = true
    else pending.down = true
  }
  const pd = (e: PointerEvent) => {
    swiping = true
    fired = false
    sx = e.clientX
    sy = e.clientY
    st = performance.now()
  }
  const pm = (e: PointerEvent) => {
    if (!swiping) return
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    const lim = Math.max(26, Math.min(window.innerWidth, window.innerHeight) * 0.05)
    if (Math.hypot(dx, dy) < lim) return
    swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy < 0 ? "up" : "down")
    fired = true
    sx = e.clientX
    sy = e.clientY
  }
  let touchTap = false
  const pu = () => {
    // toque rápido sem arrastar (dedo, não mouse) = pulo
    if (swiping && !fired && performance.now() - st < 260 && touchTap) pending.jump = true
    swiping = false
  }
  const pdTouch = (e: PointerEvent) => {
    touchTap = e.pointerType !== "mouse"
    pd(e)
  }
  canvas.addEventListener("pointerdown", pdTouch)
  window.addEventListener("pointermove", pm)
  window.addEventListener("pointerup", pu)
  window.addEventListener("pointercancel", pu)
  const take = (): RunInput => {
    const i = { ...pending }
    pending.left = pending.right = pending.jump = pending.down = false
    return i
  }

  // ── laço ───────────────────────────────────────────────────────────────────
  let phase: RunHud["phase"] = "countdown"
  let clock = -COUNTDOWN
  let acc = 0
  let hudAt = 0
  let lastBeep = 99
  let readyFired = false
  let ended = false
  const prev = { x: 0, y: 0, z: 0 }
  const cur = { x: 0, y: 0, z: 0 }
  let camX = 0
  let camY = 3.4
  let shake = 0
  let lean = 0
  let fall = 0
  let wobbleT = 0
  let lastCoinsToast = 0
  const events: RunEvent[] = []
  const camTarget = new Vector3()

  const notice = (n: RunNotice) => opts.onNotice?.(n)
  const handle = (e: RunEvent) => {
    switch (e.type) {
      case "coin": {
        audio.coin()
        const c = run.coins.find((k) => k.taken && Math.abs(run.coinZ(k) - run.z) < 1.2)
        props.burst(c ? c.x : run.x, c ? c.y : run.y + 0.9, c ? run.coinZ(c) : run.z)
        const mark = Math.floor(e.n / 50) * 50
        if (mark > lastCoinsToast) {
          lastCoinsToast = mark
          notice({ kind: "coins", n: mark })
        }
        break
      }
      case "jump":
        audio.jump()
        break
      case "launch":
        audio.launch()
        shake = Math.max(shake, 0.15)
        notice({ kind: "launch" })
        break
      case "land":
        audio.land(e.hard, e.trick)
        if (e.hard) shake = Math.max(shake, 0.2)
        if (e.trick) notice({ kind: "trick", n: run.tricks })
        break
      case "lane":
        audio.lane()
        break
      case "stumble":
        audio.stumble()
        shake = 0.35
        wobbleT = TUNING.stumbleWindow
        notice({ kind: "stumble" })
        try {
          navigator.vibrate?.(60)
        } catch {
          /* sem vibração */
        }
        break
      case "crash":
        audio.crash()
        shake = 0.7
        phase = "end"
        try {
          navigator.vibrate?.([80, 40, 140])
        } catch {
          /* sem vibração */
        }
        break
      default:
        break
    }
  }

  const pushHud = () => {
    opts.onHud?.({
      phase,
      countdown: Math.max(0, -clock),
      score: run.score,
      coins: run.coinsGot,
      dist: Math.floor(run.z),
      speed: Math.round(run.v * 3.6),
      pace: Math.min(1, run.z / (TUNING.speedK * 2.5)),
      wobble: wobbleT > 0,
      air: !run.grounded,
    })
  }

  const frame = () => {
    const raw = engine.getDeltaTime() / 1000
    const dt = Math.min(0.1, raw)
    const paused = typeof document !== "undefined" && document.hidden
    if (!paused) {
      if (phase === "countdown") {
        clock += dt
        const s = Math.ceil(-clock)
        if (s !== lastBeep && s >= 1 && s <= 3) {
          audio.beep(620)
          lastBeep = s
        }
        if (clock >= 0) {
          phase = "run"
          audio.beep(1180)
          notice({ kind: "go" })
        }
        take() // nada vale antes do "vai"
      } else if (phase === "run") {
        acc += dt
        while (acc >= TUNING.step && phase === "run") {
          acc -= TUNING.step
          prev.x = cur.x
          prev.y = cur.y
          prev.z = cur.z
          run.step(take(), events)
          cur.x = run.x
          cur.y = run.y
          cur.z = run.z
          for (const e of events) handle(e)
          events.length = 0
        }
      }
    }
    if (wobbleT > 0) wobbleT -= dt
    const f = phase === "run" ? acc / TUNING.step : 1
    const x = prev.x + (cur.x - prev.x) * f
    const y = prev.y + (cur.y - prev.y) * f
    const z = prev.z + (cur.z - prev.z) * f
    const moving = phase === "run"
    const v = moving ? run.v : 0

    // inclinação na troca de faixa e o 360° da rampa
    const want = Math.max(-0.5, Math.min(0.5, (cur.x - prev.x) / TUNING.step / 22))
    lean += (want - lean) * Math.min(1, dt * 12)
    let facing = lean
    if (run.spin !== null) facing += run.spin * Math.PI * 2
    if (phase !== "end") {
      rideState.x = x
      rideState.z = z
      rideState.facing = facing
      rideState.y = y
      pose.x = x
      pose.z = z
      pose.y = y
      pose.facing = facing
      pose.sp = v
      pose.st = -lean * 0.6
      fleet.sync(rides, dt, 1, pose)
      placeRider(fleet, char, RIDE_KEY, opts.ride, x, z, facing, v, dt, y)
    } else {
      // bateu: o veículo fica, o boneco voa por cima e cai de cara
      fall = Math.min(1, fall + dt * 2.6)
      char.holder.rotation.x = fall * 1.45
      char.holder.position.y = y + Math.sin(fall * Math.PI) * 0.7
      char.holder.position.z = z + fall * 1.1
      fleet.sync(rides, dt, 1, { ...pose, sp: 0 })
      char.animate(dt, RIDE_KINDS[opts.ride].move as MoveState, 0)
      if (!ended && fall >= 1) {
        ended = true
        opts.onEnd?.({ score: run.score, coins: run.coinsGot, dist: Math.floor(run.z), tricks: run.tricks, by: run.crashedBy ?? "car" })
        pushHud()
      }
    }

    // câmera atrás e acima, abrindo com a velocidade
    camX += (x * 0.72 - camX) * Math.min(1, dt * 6)
    const wantY = y + (phase === "end" ? 4.6 : 3.3)
    camY += (wantY - camY) * Math.min(1, dt * (wantY < camY ? 7 : 4))
    if (shake > 0) shake = Math.max(0, shake - dt)
    const jit = shake * 0.35
    cam.position.set(camX + (Math.random() - 0.5) * jit, camY + (Math.random() - 0.5) * jit, z - 6.4 - Math.min(1, v / 30) * 0.8 - (phase === "end" ? fall * 1.6 : 0))
    camTarget.set(camX * 0.85, y + 1.05, z + 10)
    cam.setTarget(camTarget)
    const wantFov = 0.9 + Math.min(1, v / 30) * 0.22 + Math.min(1, Math.max(0, v - 30) / 70) * 0.16
    // a neblina recua com a velocidade: ~3,6 s de rua à vista
    const fogEnd = Math.min(low ? 300 : 390, Math.max(fogBase.end, v * 3.6))
    scene.fogEnd += (fogEnd - scene.fogEnd) * Math.min(1, dt)
    scene.fogStart = fogBase.start + (scene.fogEnd - fogBase.end) * 0.55
    cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 3)

    street.update(z, cam.position)
    props.sync(run, performance.now() / 1000)
    audio.roll(v, run.grounded, phase === "run")
    hudAt -= dt
    if (hudAt <= 0) {
      hudAt = 0.1
      pushHud()
    }
    governor.tick(engine.getDeltaTime())
  }

  void props.ready.then(() => {
    if (disposed || readyFired) return
    readyFired = true
    opts.onReady?.()
    pushHud()
  })

  const lost = engine.onContextLostObservable.add(() => opts.onError?.("context-lost"))
  engine.runRenderLoop(() => {
    if (disposed) return
    frame()
    scene.render()
  })
  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)

  // conferência (harness)
  const w = window as unknown as Record<string, unknown>
  w.__noturno = () => ({ phase, z: run.z, x: run.x, y: run.y, lane: run.lane, v: run.v, coins: run.coinsGot, score: run.score, alive: run.alive, grounded: run.grounded, obstacles: run.obstacles.length, crashedBy: run.crashedBy })
  w.__noturnoRun = run
  w.__noturnoScene = scene

  return {
    swipe,
    setMuted(m) {
      audio.setMuted(m)
    },
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener("keydown", onKey)
      canvas.removeEventListener("pointerdown", pdTouch)
      window.removeEventListener("pointermove", pm)
      window.removeEventListener("pointerup", pu)
      window.removeEventListener("pointercancel", pu)
      ro.disconnect()
      delete w.__noturno
      delete w.__noturnoRun
      delete w.__noturnoScene
      engine.onContextLostObservable.remove(lost)
      engine.stopRenderLoop()
      audio.dispose()
      char.dispose()
      fleet.dispose()
      lib.dispose()
      props.dispose()
      street.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      cam.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
}
