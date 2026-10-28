// features/meu-mundo/noturno/engine/run-game.ts — ROLÊ NOTURNO (mm3d-40): a cena.
//
// No ar da rampa, ←/→ fazem um 360° e ↑ um mortal (mm3d-40d).
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
//
// mm3d-42: em GRUPO (a sala do backend) a rua sai da semente da sala e da
// curva do veículo mais rápido, então todos correm na mesma rua; os outros
// aparecem nela com o avatar e o veículo deles, desenhados um pouco no passado
// entre duas amostras da sala (aba escondida não pausa: o rolê dos outros
// segue). O LOGO da Freelandoo dá 5 s de poder (contorno dourado, faíscas,
// obstáculo explode e empurra). Pós-processamento (fora do celular fraco):
// brilho no neon (bloom), vinheta e, no poder, aberração cromática.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline"
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, resolveQuality } from "../../engine/quality"
import { AvatarLibrary } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { CarFleet, type CarPose } from "../../engine/cars"
import { placeRider } from "../../engine/ride"
import { RIDE_KINDS, type MoveState } from "../../engine/motion"
import type { CarState } from "../../engine/net"
import { BODY_IDS, type BodyId } from "../../types"
import { POWER, Run, TUNING, type RideKind, type RunEvent, type RunInput, type ObstacleKind, type TrickKind } from "../sim/run"
import { buildStreet, NIGHT_FOG } from "./street-view"
import { buildProps } from "./props-view"
import { buildPower } from "./power-view"
import { RunAudio } from "./audio"
import { FLAG, type NoturnoNet, type NoturnoSeat, type NoturnoStart, type RiderSample } from "./net"

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
  /** 0–1: o que resta do poder do logo (0 = sem poder). */
  power: number
  /** Em grupo: a classificação ao vivo (pelos pontos). */
  field: FieldRow[] | null
}

/** Uma linha do placar do grupo. */
export interface FieldRow {
  slot: number
  name: string
  ride: RideKind
  dist: number
  score: number
  /** 1 = correndo, 0 = caiu, 2 = saiu. */
  alive: number
  me: boolean
}

export interface RunResult {
  score: number
  coins: number
  dist: number
  tricks: number
  smashed: number
  by: ObstacleKind | "stumble"
}

export type RunNotice =
  | { kind: "go" }
  | { kind: "trick"; trick: TrickKind; points: number }
  | { kind: "stumble" }
  | { kind: "coins"; n: number }
  | { kind: "launch" }
  | { kind: "power" }
  | { kind: "smash"; points: number }

export interface RunGameOptions {
  canvas: HTMLCanvasElement
  ride: RideKind
  body: BodyId
  look?: string
  /** Nome do jogador (no placar do grupo). */
  name?: string
  /** Em grupo (mm3d-42): a sala e a largada. */
  mp?: { net: NoturnoNet; start: NoturnoStart }
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
/** x de largada (meio): os outros nascem ali até chegar a 1ª amostra. */
const LANE_X0 = 0
const RIDE_KEY = "1"
/** Altura (m) do eixo do mortal acima dos pés: gira em volta do meio do corpo. */
const FLIP_PIVOT = 0.85
/** Os outros do grupo são desenhados este tanto no passado (entre duas amostras). */
const INTERP = 0.12
/** Pose para a sala: a cada tanto (s). */
const POSE_EVERY = 0.05
/** Longe disto (m) o outro some (não dá para ver e custa desenhar). */
const REMOTE_CUT = 320
/** Aba escondida por mais que isto no grupo = saiu do rolê (a sala já marcou). */
const AWAY_MS = 6000

const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)
const isRide = (r: string): r is RideKind => r === "bike" || r === "skate" || r === "skates"

/** Os outros do grupo na rua. */
interface Remote {
  seat: NoturnoSeat
  ride: RideKind
  key: string
  char: Character
  state: CarState
  pose: CarPose
  lean: number
  x: number
  fall: number
}

export function createRunGame(opts: RunGameOptions): RunGameHandle {
  const { canvas } = opts
  // estêncil ligado: o contorno do poder (HighlightLayer) precisa dele
  const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
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
  const power = buildPower(scene, low)

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

  // em grupo: a semente e a curva da rua são da sala (todos na mesma rua)
  const mp = opts.mp ?? null
  const run = mp ? new Run(opts.ride, mp.start.seed, isRide(mp.start.street) ? mp.start.street : "bike") : new Run(opts.ride, (Date.now() & 0xffff) | 1)
  const audio = new RunAudio()
  audio.resume()

  const cam = new FreeCamera("noturno-cam", new Vector3(0, 3.4, -6.5), scene)
  cam.inputs.clear()
  cam.minZ = 0.2
  cam.maxZ = 600
  cam.fov = 0.92
  scene.activeCamera = cam

  // brilho no neon, vinheta e aberração no poder (o celular fraco fica sem pós)
  let fx: DefaultRenderingPipeline | null = null
  if (!low) {
    try {
      fx = new DefaultRenderingPipeline("noturno-fx", true, scene, [cam])
      fx.samples = quality.tier === "high" ? 4 : 1
      fx.bloomEnabled = true
      fx.bloomThreshold = 0.58
      fx.bloomWeight = 0.62
      fx.bloomKernel = quality.tier === "high" ? 64 : 40
      fx.bloomScale = 0.5
      fx.imageProcessingEnabled = true
      fx.imageProcessing.contrast = 1.12
      fx.imageProcessing.exposure = 1.04
      fx.imageProcessing.vignetteEnabled = true
      fx.imageProcessing.vignetteWeight = 2.4
      fx.imageProcessing.vignetteColor = new Color4(0.02, 0, 0.06, 0)
      fx.chromaticAberrationEnabled = quality.tier === "high"
      if (fx.chromaticAberrationEnabled) fx.chromaticAberration.aberrationAmount = 0
      fx.fxaaEnabled = fx.samples < 2
    } catch (err) {
      console.warn("[noturno] pós-processamento indisponível", err)
      fx?.dispose()
      fx = null
    }
  }

  // ── os outros do grupo ─────────────────────────────────────────────────────
  const remotes: Remote[] = []
  const remotePoses = new Map<string, CarPose>()
  if (mp) {
    for (const seat of mp.start.seats) {
      if (seat.slot === mp.start.me) continue
      const ride: RideKind = isRide(seat.ride) ? seat.ride : "skate"
      const key = `r${seat.slot}`
      const ch = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, isBody(seat.body) ? seat.body : "normal", seat.name || null, false, seat.look ?? "")
      const st: CarState = { lot: 0, kind: ride, x: LANE_X0, z: 0, facing: 0, driver: key, y: 0 }
      remotes.push({ seat, ride, key, char: ch, state: st, pose: { x: 0, z: 0, y: 0, facing: 0, sp: 0, st: 0, hb: 0, sl: 0, ax: 0, ay: 0 }, lean: 0, x: 0, fall: 0 })
    }
  }
  const mySeat = mp ? mp.start.seats.find((q) => q.slot === mp.start.me) ?? null : null

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
  // em grupo a contagem é a da sala (3 s a partir da largada)
  let clock = -(mp ? Math.max(0.5, mp.start.countdown) : COUNTDOWN)
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
  let poseAt = 0
  let hiddenAt = 0
  let crashSent = false
  let fieldAt = 0
  let field: FieldRow[] | null = null
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
        audio.land(e.hard)
        if (e.hard) shake = Math.max(shake, 0.2)
        break
      case "trick":
        audio.trick(e.kind === "flip")
        notice({ kind: "trick", trick: e.kind, points: e.points })
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
      case "power": {
        audio.power()
        shake = Math.max(shake, 0.2)
        const p = run.powers.find((k) => k.taken && Math.abs(k.z - run.z) < 2)
        power.take(p ? p.x : run.x, p ? p.y : run.y + 1, p ? p.z : run.z)
        notice({ kind: "power" })
        try {
          navigator.vibrate?.(50)
        } catch {
          /* sem vibração */
        }
        break
      }
      case "powerEnd":
        audio.powerEnd()
        break
      case "smash":
        audio.smash()
        shake = Math.max(shake, 0.45)
        power.blast(e.kind, e.x, e.z, e.len, e.top, e.tint, run.v)
        notice({ kind: "smash", points: POWER.points })
        try {
          navigator.vibrate?.(40)
        } catch {
          /* sem vibração */
        }
        break
      case "crash":
        audio.crash()
        shake = 0.7
        phase = "end"
        sendCrash()
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

  /** Em grupo: o fim deste aparelho vai para a sala (uma vez). */
  const sendCrash = () => {
    if (!mp || crashSent) return
    crashSent = true
    mp.net.sendCrash({ z: run.z, x: run.x, y: run.y, s: run.score, c: run.coinsGot, t: run.tricks, by: run.crashedBy ?? "car" })
  }

  /** Placar do grupo pelos pontos (o meu ao vivo, os outros pela última amostra). */
  const buildField = (): FieldRow[] | null => {
    if (!mp) return null
    const rows: FieldRow[] = []
    for (const seat of mp.start.seats) {
      const ride: RideKind = isRide(seat.ride) ? seat.ride : "skate"
      if (seat.slot === mp.start.me) {
        rows.push({ slot: seat.slot, name: opts.name || seat.name, ride, dist: Math.floor(run.z), score: run.score, alive: run.alive ? 1 : 0, me: true })
        continue
      }
      const list = mp.net.samples.get(seat.slot)
      const last = list?.[list.length - 1]
      rows.push({ slot: seat.slot, name: seat.name, ride, dist: Math.floor(last?.z ?? 0), score: last?.score ?? 0, alive: last ? last.alive : 1, me: false })
    }
    return rows.sort((a, b) => b.score - a.score || b.dist - a.dist)
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
      power: run.powerT > 0 ? run.powerT / POWER.time : 0,
      field,
    })
  }

  const flagsOf = () =>
    (run.grounded ? 0 : FLAG.air) |
    (run.smashing ? FLAG.power : 0) |
    (run.trickKind === "spin" ? FLAG.spin : run.trickKind === "flip" ? FLAG.flip : 0) |
    (run.trickDir > 0 ? FLAG.right : 0)

  /** Onde um outro está agora (no passado de INTERP, entre duas amostras; depois da última, pela velocidade). */
  const sampleAt = (list: RiderSample[], t: number) => {
    const last = list[list.length - 1]
    if (list.length === 1 || t >= last.t) {
      const prev = list.length > 1 ? list[list.length - 2] : last
      const v = last.t > prev.t ? (last.z - prev.z) / (last.t - prev.t) : 0
      const ahead = last.alive === 1 ? Math.min(0.4, Math.max(0, t - last.t)) : 0
      return { z: last.z + v * ahead, x: last.x, y: last.y, f: last.f, k: last.k, v, alive: last.alive }
    }
    let i = list.length - 1
    while (i > 0 && list[i - 1].t > t) i--
    const a = list[Math.max(0, i - 1)]
    const b = list[i]
    const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1
    const v = b.t > a.t ? (b.z - a.z) / (b.t - a.t) : 0
    return { z: a.z + (b.z - a.z) * u, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, f: b.f, k: a.k + (b.k - a.k) * u, v, alive: b.alive }
  }

  /** Os outros na rua: avatar no veículo, manobra pela bandeira, caído pelo vivo = 0. */
  const drawRemotes = (dt: number, myZ: number) => {
    remotePoses.clear()
    if (!mp) return
    const st = mp.net.serverTime()
    for (const r of remotes) {
      const list = mp.net.samples.get(r.seat.slot)
      const s = st !== null && list?.length ? sampleAt(list, st - INTERP) : null
      const show = !!s && s.alive !== 2 && Math.abs(s.z - myZ) < REMOTE_CUT
      if (!show || !s) {
        r.char.setVisible(false)
        rides.delete(r.key)
        continue
      }
      r.char.setVisible(true)
      rides.set(r.key, r.state)
      const want = Math.max(-0.5, Math.min(0.5, (s.x - r.x) / Math.max(dt, 1e-3) / 22))
      r.x = s.x
      r.lean += (want - r.lean) * Math.min(1, dt * 12)
      let facing = r.lean
      let pitch = 0
      if (s.f & (FLAG.spin | FLAG.flip)) {
        const turn = (1 - Math.cos(Math.min(1, s.k) * Math.PI)) * Math.PI
        if (s.f & FLAG.spin) facing += turn * (s.f & FLAG.right ? 1 : -1)
        else pitch = -turn
      }
      const fy = FLIP_PIVOT * (1 - Math.cos(pitch))
      const fz = -FLIP_PIVOT * Math.sin(pitch)
      const px = s.x + fz * Math.sin(facing)
      const pz = s.z + fz * Math.cos(facing)
      Object.assign(r.state, { x: s.x, z: s.z, facing, y: s.y })
      Object.assign(r.pose, { x: px, z: pz, y: s.y + fy, facing, flip: pitch, sp: s.alive === 1 ? s.v : 0, st: -r.lean * 0.6 })
      remotePoses.set(r.key, r.pose)
      if (s.alive === 1) {
        r.fall = 0
        placeRider(fleet, r.char, r.key, r.ride, px, pz, facing, s.v, dt, s.y + fy, pitch)
      } else {
        // caiu: voa por cima do veículo e fica de cara no chão
        r.fall = Math.min(1, r.fall + dt * 2.6)
        r.char.place(s.x, s.z + r.fall * 1.1, 0, s.y + Math.sin(r.fall * Math.PI) * 0.7)
        r.char.holder.rotation.x = r.fall * 1.45
        r.char.animate(dt, RIDE_KINDS[r.ride].move as MoveState, 0)
      }
    }
  }

  /** Malhas que ganham o contorno: o corpo (com esqueleto) e o veículo. */
  const auraMeshes = (ch: Character, key: string): AbstractMesh[] => [
    ...ch.holder.getChildMeshes(false).filter((m) => !!m.skeleton && m.isEnabled()),
    ...fleet.meshesOf(key),
  ]

  const frame = () => {
    const raw = engine.getDeltaTime() / 1000
    const dt = Math.min(0.1, raw)
    const hidden = typeof document !== "undefined" && document.hidden
    // em grupo a aba escondida não pausa (o rolê dos outros segue); escondida por muito tempo = saiu
    if (hidden && !hiddenAt) hiddenAt = performance.now()
    if (!hidden && hiddenAt) {
      if (mp && phase === "run" && performance.now() - hiddenAt > AWAY_MS && run.alive) {
        run.alive = false
        run.crashedBy = "stumble"
        handle({ type: "crash", kind: "stumble" })
      }
      hiddenAt = 0
    }
    const paused = hidden && !mp
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

    // inclinação na troca de faixa e as manobras da rampa (360° no rumo, mortal para trás)
    const want = Math.max(-0.5, Math.min(0.5, (cur.x - prev.x) / TUNING.step / 22))
    lean += (want - lean) * Math.min(1, dt * 12)
    let facing = lean
    let pitch = 0
    if (run.trickKind !== null && phase === "run") {
      const turn = (1 - Math.cos(Math.min(1, run.trickP) * Math.PI)) * Math.PI
      if (run.trickKind === "spin") facing += turn * run.trickDir
      else pitch = -turn
    }
    // o mortal gira em volta do meio do corpo, não dos pés
    const fy = FLIP_PIVOT * (1 - Math.cos(pitch))
    const fz = -FLIP_PIVOT * Math.sin(pitch)
    drawRemotes(dt, z)
    if (phase !== "end") {
      const px = x + fz * Math.sin(facing)
      const pz = z + fz * Math.cos(facing)
      rideState.x = x
      rideState.z = z
      rideState.facing = facing
      rideState.y = y
      pose.x = px
      pose.z = pz
      pose.y = y + fy
      pose.facing = facing
      pose.flip = pitch
      pose.sp = v
      pose.st = -lean * 0.6
      fleet.sync(rides, dt, 1, pose, remotePoses)
      placeRider(fleet, char, RIDE_KEY, opts.ride, px, pz, facing, v, dt, y + fy, pitch)
    } else {
      // bateu: o veículo fica, o boneco voa por cima e cai de cara
      fall = Math.min(1, fall + dt * 2.6)
      char.holder.rotation.x = fall * 1.45
      char.holder.position.y = y + Math.sin(fall * Math.PI) * 0.7
      char.holder.position.z = z + fall * 1.1
      fleet.sync(rides, dt, 1, { ...pose, sp: 0, flip: 0 }, remotePoses)
      char.animate(dt, RIDE_KINDS[opts.ride].move as MoveState, 0)
      if (!ended && fall >= 1) {
        ended = true
        opts.onEnd?.({ score: run.score, coins: run.coinsGot, dist: Math.floor(run.z), tricks: run.tricks, smashed: run.smashed, by: run.crashedBy ?? "car" })
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
    // o empurrão do poder abre mais a lente
    const wantFov = 0.9 + Math.min(1, v / 30) * 0.22 + Math.min(1, Math.max(0, v - 30) / 70) * 0.16 + (run.boost - 1) * 0.3
    // a neblina recua com a velocidade: ~3,6 s de rua à vista
    const fogEnd = Math.min(low ? 300 : 390, Math.max(fogBase.end, v * 3.6))
    scene.fogEnd += (fogEnd - scene.fogEnd) * Math.min(1, dt)
    scene.fogStart = fogBase.start + (scene.fogEnd - fogBase.end) * 0.55
    cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 3)

    street.update(z, cam.position)
    const now = performance.now() / 1000
    props.sync(run, now)
    power.sync(run, now, dt)
    // contorno do poder: o jogador e quem do grupo está com ele
    const auras: { meshes: AbstractMesh[]; at: TransformNode; left: number }[] = []
    if (run.smashing && phase !== "end") auras.push({ meshes: auraMeshes(char, RIDE_KEY), at: char.holder, left: run.powerT > 0 ? run.powerT : 0.6 })
    if (mp) {
      for (const r of remotes) {
        const list = mp.net.samples.get(r.seat.slot)
        const last = list?.[list.length - 1]
        if (last && last.alive === 1 && last.f & FLAG.power && r.char.holder.isEnabled()) auras.push({ meshes: auraMeshes(r.char, r.key), at: r.char.holder, left: 5 })
      }
    }
    power.aura(auras, now)
    if (fx?.chromaticAberrationEnabled) {
      const want = run.smashing && phase !== "end" ? 22 + Math.sin(now * 10) * 6 : Math.max(0, (v - 70) / 60) * 6
      fx.chromaticAberration.aberrationAmount += (want - fx.chromaticAberration.aberrationAmount) * Math.min(1, dt * 6)
    }
    // em grupo: a pose vai para a sala a 20 Hz
    if (mp && phase === "run" && run.alive) {
      poseAt -= dt
      if (poseAt <= 0) {
        poseAt = POSE_EVERY
        mp.net.sendPose({ z: run.z, x: run.x, y: run.y, f: flagsOf(), k: run.trickP, s: run.score, c: run.coinsGot })
      }
    }
    if (mp) {
      fieldAt -= dt
      if (fieldAt <= 0) {
        fieldAt = 0.25
        field = buildField()
      }
    }
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
  w.__noturnoField = () => buildField()

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
      delete w.__noturnoField
      engine.onContextLostObservable.remove(lost)
      engine.stopRenderLoop()
      audio.dispose()
      fx?.dispose()
      char.dispose()
      for (const r of remotes) r.char.dispose()
      fleet.dispose()
      lib.dispose()
      props.dispose()
      power.dispose()
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
