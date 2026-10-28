// features/meu-mundo/gincana/engine/gincana-game.ts — GINCANA (mm3d-47): a cena.
//
// Cena própria (como o Paint e o Rolê): motor Babylon, céu claro, mar e a
// prova (course-view.ts). A REGRA é sim/race.ts: no treino este aparelho roda
// o meu corpo e os 7 computadores; em grupo roda só o meu corpo (no relógio da
// sala) e desenha os outros pelo que a sala repassa, um pouco no passado.
//
// Câmera atrás de quem joga (arrastar gira; solta e ela volta devagar para a
// frente da prova). Teclado: WASD/setas andam, Espaço pula, Shift/E mergulha.
// Celular: joystick + PULAR e MERGULHAR na tela (a interface chama jump/dive).

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { Character } from "../../engine/player"
import { AvatarLibrary } from "../../engine/avatars"
import { lerpAngle } from "../../engine/motion"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { PALETTE, PARTS, lookCode } from "../../avatar-colors"
import { BODY_IDS, type BodyId } from "../../types"
import { CHECKPOINTS, FINISH_Z, GINCANA, sectionAt } from "../sim/course"
import { ANIM, MODE, groundUnder, runnerAnim, type RunEvent, type RunIntent } from "../sim/body"
import { botRand } from "../sim/bots"
import { GincanaRace } from "../sim/race"
import { CourseView } from "./course-view"
import { GincanaAudio } from "./audio"
import type { GincanaNet, GincanaSeat, GincanaStart, RunnerSample } from "./net"

/** Uma linha do placar ao vivo. */
export interface BoardRow {
  slot: number
  name: string
  me: boolean
  bot: boolean
  /** s da chegada (−1 = correndo). */
  fin: number
  /** 0–1 do caminho. */
  progress: number
}

export interface GincanaHud {
  phase: "countdown" | "run" | "end"
  /** s até o "vai". */
  countdown: number
  /** s de prova. */
  time: number
  timeLeft: number
  place: number
  total: number
  /** Trecho (0 largada … 5 subida, 6 chegada). */
  section: number
  finished: boolean
  myTime: number
  board: BoardRow[]
}

export type GincanaNotice =
  | { kind: "go" }
  | { kind: "hit"; by: string }
  | { kind: "splash" }
  | { kind: "cp"; cp: number }
  | { kind: "finish"; place: number; time: number }
  | { kind: "timeout" }

export interface GincanaResult {
  place: number
  total: number
  /** s da chegada (−1 = o tempo acabou antes). */
  time: number
}

export interface GincanaGameOptions {
  canvas: HTMLCanvasElement
  body: BodyId
  look?: string
  name?: string
  /** Em grupo (sem isto, treino com 7 computadores). */
  mp?: { net: GincanaNet; start: GincanaStart }
  /** Nomes dos computadores do treino (traduzidos fora). */
  botNames?: string[]
  onReady?: () => void
  onHud?: (h: GincanaHud) => void
  onNotice?: (n: GincanaNotice) => void
  onEnd?: (r: GincanaResult) => void
  onError?: (reason: "context-lost") => void
}

export interface GincanaGameHandle {
  setJoystick: (x: number, y: number) => void
  jump: () => void
  dive: () => void
  setMuted: (m: boolean) => void
  dispose: () => void
}

const SEATS = 8
/** Corpos dos computadores do treino (variam; as cores vêm da semente). */
const BOT_BODIES: BodyId[] = ["normal", "female", "slim", "strong", "fat", "female", "normal", "slim"]
const POSE_EVERY = 0.05
/** Os outros são desenhados este tanto no passado (entre duas amostras). */
const REMOTE_DELAY = 0.12

interface Seat extends GincanaSeat {
  char: Character
  /** Posição desenhada (suavizada). */
  vx: number
  vy: number
  vz: number
  vf: number
  /** Último y (fase do pulo de quem vem pela rede). */
  lastY: number
  vyEst: number
}

export function createGincanaGame(opts: GincanaGameOptions): GincanaGameHandle {
  const { canvas, mp } = opts
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false
  const capMs = frameCapMs()
  const profile = touch ? { ...quality, maxRatio: Math.max(quality.maxRatio, low ? 1.5 : 2), minRatio: Math.max(quality.minRatio, 1) } : quality
  const governor = new ResolutionGovernor(engine, profile, Math.min(window.devicePixelRatio || 1, touch ? 2 : 1.5))

  const scene = new Scene(engine)
  const haze = new Color3(1, 0.88, 0.95)
  scene.clearColor = new Color4(haze.r, haze.g, haze.b, 1)
  scene.ambientColor = new Color3(0.35, 0.35, 0.35)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = haze
  scene.fogStart = low ? 110 : 150
  scene.fogEnd = low ? 330 : 460
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("gincana-hemi", new Vector3(0.2, 1, -0.2), scene)
  hemi.intensity = 0.82
  hemi.diffuse = new Color3(1, 0.99, 0.97)
  hemi.groundColor = new Color3(0.62, 0.7, 0.85)
  const sun = new DirectionalLight("gincana-sun", new Vector3(-0.45, -1, 0.55), scene)
  sun.intensity = 0.72
  sun.diffuse = new Color3(1, 0.96, 0.9)

  const cam = new FreeCamera("gincana-cam", new Vector3(0, DECK_CAM, -12), scene)
  cam.minZ = 0.2
  cam.maxZ = 1600
  cam.fov = touch ? 1.0 : 0.9
  cam.inputs.clear()

  // ── quem corre ─────────────────────────────────────────────────────────────
  const seed = mp ? mp.start.seed >>> 0 : (Math.floor(Math.random() * 0x7fffffff) | 1) >>> 0
  const me = mp ? mp.start.me : 0
  const seatDefs: GincanaSeat[] = mp
    ? mp.start.seats
    : Array.from({ length: SEATS }, (_, slot) => {
        if (slot === me) return { slot, name: opts.name ?? "", body: opts.body, look: opts.look ?? "", bot: false }
        const look = lookCode(PARTS.map((part, i) => Math.floor(botRand(seed, slot, 40 + i) * PALETTE[part].length)))
        const body = BOT_BODIES[slot % BOT_BODIES.length]
        return { slot, name: opts.botNames?.[(slot - 1 + seed) % (opts.botNames.length || 1)] ?? `CPU ${slot}`, body, look, bot: true }
      })
  const race = new GincanaRace(
    seed,
    seatDefs.map((s) => ({ slot: s.slot, ctl: s.slot === me ? "local" : mp ? "remote" : "bot" })),
    mp ? mp.start.countdown : GINCANA.countdown,
  )

  const course = new CourseView(scene, seed, low)
  const lib = new AvatarLibrary(scene, false, false, 24, false, false, false, true)
  const fallbackMat = new StandardMaterial("gincana-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("gincana-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.22
  const mats = { fallback: fallbackMat, shadow: shadowMat }
  const seats = new Map<number, Seat>()
  for (const s of seatDefs) {
    const body = (BODY_IDS as string[]).includes(s.body) ? (s.body as BodyId) : "normal"
    const char = new Character(scene, lib, mats, body, s.slot === me ? null : s.name, s.slot === me, s.look)
    const r = race.runner(s.slot)!
    seats.set(s.slot, { ...s, char, vx: r.x, vy: r.y, vz: r.z, vf: r.facing, lastY: r.y, vyEst: 0 })
  }
  const mine = race.runner(me)!

  // respingos na água (anéis que abrem)
  const splashMat = new StandardMaterial("gincana-splash", scene)
  splashMat.diffuseColor = new Color3(1, 1, 1)
  splashMat.emissiveColor = new Color3(0.9, 0.95, 1)
  splashMat.specularColor = new Color3(0, 0, 0)
  const splashes: { mesh: Mesh; age: number }[] = []
  for (let i = 0; i < 6; i++) {
    const m = CreateTorus("gincana-splash-ring", { diameter: 1, thickness: 0.18, tessellation: 24 }, scene)
    m.material = splashMat
    m.isPickable = false
    m.setEnabled(false)
    splashes.push({ mesh: m, age: 9 })
  }
  let splashNext = 0
  const splashAt = (x: number, z: number) => {
    const s = splashes[splashNext++ % splashes.length]
    s.age = 0
    s.mesh.position.set(x, 0.08, z)
    s.mesh.setEnabled(true)
  }

  const audio = new GincanaAudio()

  // ── controle ───────────────────────────────────────────────────────────────
  const keys = new Set<string>()
  let joyX = 0
  let joyY = 0
  let jumpQ = false
  let diveQ = false
  let yaw = 0
  let pitch = 0.36
  let dragAt = -99
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const k = e.key.toLowerCase()
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "shift", "e"].includes(k)) e.preventDefault()
    if (down && !e.repeat) {
      if (k === " ") jumpQ = true
      if (k === "shift" || k === "e") diveQ = true
      audio.resume()
    }
    if (down) keys.add(k)
    else keys.delete(k)
  }
  const kd = (e: KeyboardEvent) => onKey(e, true)
  const ku = (e: KeyboardEvent) => onKey(e, false)
  const blur = () => keys.clear()
  window.addEventListener("keydown", kd)
  window.addEventListener("keyup", ku)
  window.addEventListener("blur", blur)
  // arrastar gira a câmera (mouse: qualquer botão; toque: fora dos botões, que param o evento)
  let drag: { id: number; x: number; y: number } | null = null
  const pd = (e: PointerEvent) => {
    audio.resume()
    if (drag) return
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
    canvas.setPointerCapture?.(e.pointerId)
  }
  const pm = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    const k = touch ? 0.008 : 0.005
    yaw += (e.clientX - drag.x) * k
    pitch = Math.max(0.12, Math.min(0.85, pitch + (e.clientY - drag.y) * k * 0.6))
    drag.x = e.clientX
    drag.y = e.clientY
    dragAt = performance.now() / 1000
  }
  const pu = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) drag = null
  }
  canvas.addEventListener("pointerdown", pd)
  canvas.addEventListener("pointermove", pm)
  canvas.addEventListener("pointerup", pu)
  canvas.addEventListener("pointercancel", pu)
  const noMenu = (e: Event) => e.preventDefault()
  canvas.addEventListener("contextmenu", noMenu)

  const intent = (): RunIntent => {
    let ix = joyX
    let iy = joyY
    if (keys.has("a") || keys.has("arrowleft")) ix -= 1
    if (keys.has("d") || keys.has("arrowright")) ix += 1
    if (keys.has("w") || keys.has("arrowup")) iy += 1
    if (keys.has("s") || keys.has("arrowdown")) iy -= 1
    const m = Math.hypot(ix, iy)
    if (m > 1) {
      ix /= m
      iy /= m
    }
    // relativo à câmera: frente = para onde ela olha
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    const it: RunIntent = { mx: fx * iy + fz * ix, mz: fz * iy - fx * ix, jump: jumpQ, dive: diveQ }
    jumpQ = false
    diveQ = false
    return it
  }

  // ── relógio, eventos, placar ───────────────────────────────────────────────
  const events: RunEvent[] = []
  let clock = 0
  let lastBeep = 99
  let ended = false
  let readyFired = false
  let hudAt = 0
  let poseAt = 0
  const mpStartedAt = performance.now() / 1000

  const board = (): BoardRow[] => {
    const rows = race.runners.map((b) => {
      const s = seats.get(b.slot)!
      const z = b.fin >= 0 ? FINISH_Z : Math.max(CHECKPOINTS[b.cp].z, Math.min(FINISH_Z, b.z))
      return { slot: b.slot, name: s.name, me: b.slot === me, bot: s.bot, fin: b.fin, progress: Math.max(0, Math.min(1, (z + 4) / (FINISH_Z + 4))) }
    })
    rows.sort((a, b) => (a.fin >= 0 && b.fin >= 0 ? a.fin - b.fin : a.fin >= 0 ? -1 : b.fin >= 0 ? 1 : b.progress - a.progress))
    return rows
  }
  const hud = (): GincanaHud => {
    const rows = board()
    const t = race.t
    return {
      phase: t < 0 ? "countdown" : ended ? "end" : "run",
      countdown: Math.max(0, -t),
      time: Math.max(0, t),
      timeLeft: Math.max(0, GINCANA.timeLimit - Math.max(0, t)),
      place: rows.findIndex((r) => r.me) + 1,
      total: rows.length,
      section: sectionAt(mine.z),
      finished: mine.fin >= 0,
      myTime: mine.fin,
      board: rows,
    }
  }

  const onEvents = () => {
    for (const e of events) {
      if (e.type === "tile") continue
      if (e.type === "splash") splashAt(e.x, e.z)
      if (e.slot !== me) continue
      switch (e.type) {
        case "jump":
          audio.jump()
          break
        case "dive":
          audio.dive()
          break
        case "hit":
          audio.hit()
          opts.onNotice?.({ kind: "hit", by: e.by })
          break
        case "splash":
          audio.splash()
          opts.onNotice?.({ kind: "splash" })
          break
        case "cp":
          audio.checkpoint()
          opts.onNotice?.({ kind: "cp", cp: e.cp })
          break
        case "finish": {
          audio.finish()
          const rows = board()
          const place = rows.findIndex((r) => r.me) + 1
          opts.onNotice?.({ kind: "finish", place, time: e.t })
          break
        }
        default:
          break
      }
    }
    events.length = 0
  }

  /** Amostra interpolada de alguém da rede no tempo `t`. */
  const sampleAt = (list: RunnerSample[], t: number): RunnerSample | null => {
    if (!list.length) return null
    if (t <= list[0].t) return list[0]
    for (let i = list.length - 1; i > 0; i--) {
      const a = list[i - 1]
      const b = list[i]
      if (t >= a.t) {
        if (t >= b.t) return b
        const k = (t - a.t) / Math.max(1e-3, b.t - a.t)
        if (Math.hypot(b.x - a.x, b.z - a.z) > 6) return k < 0.5 ? a : b
        return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, f: lerpAngle(a.f, b.f, k), a: k < 0.5 ? a.a : b.a, cp: b.cp, fin: b.fin }
      }
    }
    return list[list.length - 1]
  }

  const finishGame = () => {
    if (ended) return
    ended = true
    const rows = board()
    opts.onEnd?.({ place: rows.findIndex((r) => r.me) + 1, total: rows.length, time: mine.fin })
  }

  const frame = (ms: number) => {
    const dt = Math.min(0.1, ms / 1000)
    clock += dt
    // tempo da prova: o da sala em grupo, o do aparelho no treino
    let target = race.t + dt
    if (mp) {
      const st = mp.net.serverTime()
      target = st ?? -mp.start.countdown + (performance.now() / 1000 - mpStartedAt)
    }
    const wasCount = race.t < 0
    race.advance(target, intent(), events, 12)
    onEvents()
    if (race.t < 0) {
      const c = Math.ceil(-race.t)
      if (c !== lastBeep && c <= 3) {
        lastBeep = c
        audio.beep(false)
      }
    } else if (wasCount) {
      audio.beep(true)
      opts.onNotice?.({ kind: "go" })
    }
    // os outros (rede): pose interpolada no passado, que também pisa nos ladrilhos
    if (mp) {
      const st = mp.net.serverTime()
      const rt = (st ?? race.t) - REMOTE_DELAY
      for (const [slot, list] of mp.net.samples) {
        if (slot === me) continue
        const s = sampleAt(list, rt)
        if (s) race.setRemote(slot, { x: s.x, y: s.y, z: s.z, f: s.f, a: s.a, cp: s.cp, fin: s.fin })
      }
      poseAt -= dt
      if (poseAt <= 0 && race.t >= 0) {
        poseAt = POSE_EVERY
        mp.net.sendPose({ x: mine.x, y: mine.y, z: mine.z, f: mine.facing, a: runnerAnim(mine), cp: mine.cp, fin: mine.fin })
      }
    }
    if (!ended && (mine.fin >= 0 || race.t >= GINCANA.timeLimit)) {
      if (mine.fin < 0) opts.onNotice?.({ kind: "timeout" })
      finishGame()
    }

    // ── desenho ──
    course.update(race.t, clock, race.world.tiles)
    for (const b of race.runners) {
      const s = seats.get(b.slot)!
      const remote = mp && b.slot !== me
      const k = Math.min(1, dt * (remote ? 30 : 28))
      if (Math.hypot(b.x - s.vx, b.z - s.vz) > 3 || Math.abs(b.y - s.vy) > 3) {
        s.vx = b.x
        s.vy = b.y
        s.vz = b.z
      } else {
        s.vx += (b.x - s.vx) * k
        s.vy += (b.y - s.vy) * k
        s.vz += (b.z - s.vz) * k
      }
      const anim = remote ? (seatAnim(b.slot) ?? ANIM.IDLE) : runnerAnim(b)
      const moving = b.mode === MODE.RUN || b.mode === MODE.DONE
      // olha para onde anda; derrubado/mergulhando mantém o rumo
      if (moving || remote) s.vf = lerpAngle(s.vf, b.facing, Math.min(1, dt * 14))
      const vyNow = (s.vy - s.lastY) / Math.max(dt, 1e-3)
      s.vyEst += (vyNow - s.vyEst) * Math.min(1, dt * 12)
      s.lastY = s.vy
      const v0 = Math.max(2, remote ? GINCANA.jumpV : b.launch)
      const vy = remote ? s.vyEst : b.vy
      const phase = Math.max(0, Math.min(1, (v0 - vy) / (2 * v0)))
      const speed = remote ? Math.min(GINCANA.run * 1.4, Math.hypot(b.vx, b.vz) || (anim === ANIM.RUN ? GINCANA.run : 0)) : Math.hypot(b.vx, b.vz)
      s.char.setGincana({ anim, speed, phase })
      const lift = anim === ANIM.DIVE || anim === ANIM.SLIDE ? 0.22 : 0
      const gy = groundUnder(race.world, s.vx, s.vz, s.vy + 0.3).y
      s.char.place(s.vx, s.vz, s.vf, s.vy + lift, gy)
      s.char.animate(dt, 0, speed)
    }
    for (const sp of splashes) {
      if (sp.age > 0.9) continue
      sp.age += dt
      const k = sp.age / 0.9
      sp.mesh.scaling.setAll(1 + k * 4)
      sp.mesh.visibility = 1 - k
      if (sp.age > 0.9) sp.mesh.setEnabled(false)
    }

    // câmera: atrás e acima; sem arrastar há 2 s, volta devagar para a frente da prova
    const now = performance.now() / 1000
    if (now - dragAt > 2 && !drag) yaw = lerpAngle(yaw, 0, Math.min(1, dt * 0.8))
    const me3 = seats.get(me)!
    const dist = touch ? 7.4 : 6.6
    const tx = me3.vx
    const ty = Math.max(me3.vy, mine.mode === MODE.WATER ? DECK_CAM - 2 : -99) + 1.5
    const tz = me3.vz
    const want = new Vector3(tx - Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, tz - Math.cos(yaw) * Math.cos(pitch) * dist)
    cam.position = Vector3.Lerp(cam.position, want, Math.min(1, dt * 10))
    cam.setTarget(new Vector3(tx + Math.sin(yaw) * 2, ty + 0.2, tz + Math.cos(yaw) * 2))

    hudAt -= dt
    if (hudAt <= 0) {
      hudAt = 0.1
      opts.onHud?.(hud())
    }
    governor.tick(ms)
  }

  /** Código de animação da última amostra de alguém da rede. */
  function seatAnim(slot: number): number | null {
    const list = mp?.net.samples.get(slot)
    if (!list?.length) return null
    const st = mp!.net.serverTime()
    const s = sampleAt(list, (st ?? race.t) - REMOTE_DELAY)
    return s ? s.a : null
  }

  scene.executeWhenReady(() => {
    if (disposed || readyFired) return
    readyFired = true
    opts.onReady?.()
    opts.onHud?.(hud())
  })
  const lost = engine.onContextLostObservable.add(() => opts.onError?.("context-lost"))
  let lastFrame = performance.now()
  engine.runRenderLoop(() => {
    if (disposed) return
    const now = performance.now()
    if (capMs && now - lastFrame < capMs - 3) return
    const ms = now - lastFrame
    lastFrame = now
    frame(ms)
    scene.render()
  })
  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)

  // conferência (harness)
  const w = window as unknown as Record<string, unknown>
  w.__gincana = () => ({ t: race.t, x: mine.x, y: mine.y, z: mine.z, mode: mine.mode, cp: mine.cp, fin: mine.fin, ground: mine.ground, yaw, pitch, place: hud().place, fps: engine.getFps() })
  w.__gincanaRace = race
  w.__gincanaTp = (x: number, y: number, z: number, cp?: number) => {
    Object.assign(mine, { x, y, z, vx: 0, vy: 0, vz: 0, ground: false, mode: MODE.RUN, timer: 0 })
    if (cp !== undefined) mine.cp = cp
  }
  w.__gincanaLook = (y: number, p: number) => {
    yaw = y
    pitch = p
    dragAt = performance.now() / 1000 + 3600
  }

  return {
    setJoystick(x, y) {
      joyX = x
      joyY = y
    },
    jump() {
      jumpQ = true
      audio.resume()
    },
    dive() {
      diveQ = true
      audio.resume()
    },
    setMuted(m) {
      audio.setMuted(m)
    },
    dispose() {
      if (disposed) return
      disposed = true
      engine.stopRenderLoop()
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
      window.removeEventListener("blur", blur)
      canvas.removeEventListener("pointerdown", pd)
      canvas.removeEventListener("pointermove", pm)
      canvas.removeEventListener("pointerup", pu)
      canvas.removeEventListener("pointercancel", pu)
      canvas.removeEventListener("contextmenu", noMenu)
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      for (const k of ["__gincana", "__gincanaRace", "__gincanaTp", "__gincanaLook"]) delete w[k]
      for (const s of seats.values()) s.char.dispose()
      for (const s of splashes) s.mesh.dispose()
      splashMat.dispose()
      lib.dispose()
      course.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      audio.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
}

/** Altura padrão da câmera antes do primeiro quadro. */
const DECK_CAM = 6
