// features/meu-mundo/gincana/engine/gincana-game.ts — GINCANA (mm3d-47): a cena.
//
// Cena própria (como o Paint e o Rolê): motor Babylon, céu claro, mar e a
// prova (course-view.ts). A REGRA é sim/race.ts: no treino este aparelho roda
// o meu corpo e os 7 computadores; em grupo roda só o meu corpo (no relógio da
// sala) e desenha os outros pelo que a sala repassa, um pouco no passado.
//
// Câmera atrás de quem joga (arrastar gira; solta e ela volta devagar para a
// frente da prova). Teclado: WASD/setas andam, Espaço pula, Shift/E mergulha,
// F/Ctrl (segurando) agarra. Celular: joystick + PULAR, MERGULHAR e AGARRAR
// na tela (a interface chama jump/dive/setGrab).
//
// Gincana 2.0 (2026-11-16): a prova é de uma FASE (a do menu no treino; a da
// sala em grupo) e fecha quando a vaga dos classificados enche — quem não
// chegou até lá está eliminado.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Frustum } from "@babylonjs/core/Maths/math.frustum"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { buildLogos } from "../../corrida/engine/logos"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { Character } from "../../engine/player"
import { AvatarLibrary } from "../../engine/avatars"
import { lerpAngle } from "../../engine/motion"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { BODY_IDS, type BodyId } from "../../types"
import { GINCANA, memState, memTarget, riseAt, sectionAt, type GincanaMode } from "../sim/course"
import { ANIM, MODE, groundUnder, runnerAnim, type RunEvent, type RunIntent } from "../sim/body"
import { GincanaRace } from "../sim/race"
import { CourseView } from "./course-view"
import { themeOf } from "./phase-themes"
import { GincanaAudio } from "./audio"
import type { GincanaNet, GincanaSeat, GincanaStart, RunnerSample } from "./net"
import { GAME_MUSIC, sceneSound } from "../../engine/audio"

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
  /** Gincana 3: ficou fora da prova; pontos (coleta/zona). */
  out: boolean
  pts: number
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
  /** 0–1 do turbo do logo da Freelandoo (0 = sem). */
  boost: number
  /** Classificam os primeiros `quota`; `qualified` já chegaram. */
  quota: number
  qualified: number
  /** Agarrando alguém / sendo agarrado agora. */
  grabbing: boolean
  held: boolean
  /** Gincana 3: tipo da prova, quantos ainda estão nela, meus pontos e quanto falta (m) para o perigo que sobe me pegar (Infinity = sem perigo). */
  mode: GincanaMode
  alive: number
  pts: number
  riseGap: number
  /** Relógio da Praça: rodada, fase (1 decore, 2 esconde, 3 chama, 4 cai, 5 volta), o símbolo chamado (−1 = ainda não) e quanto falta. */
  mem: { r: number; ph: number; sym: number; left: number } | null
  /** Fábrica em andares: andar (1…), quantos de engrenagens, quantas já tenho neste andar e quantas faltam para o pula-pula. */
  floor: { f: number; of: number; have: number; need: number } | null
}

export type GincanaNotice =
  | { kind: "go" }
  | { kind: "hit"; by: string }
  | { kind: "splash" }
  | { kind: "cp"; cp: number }
  | { kind: "logo" }
  | { kind: "hoop" }
  | { kind: "finish"; place: number; time: number }
  | { kind: "timeout" }
  | { kind: "door"; open: boolean }
  | { kind: "grab" }
  | { kind: "held" }
  | { kind: "climb" }
  | { kind: "eliminated" }
  | { kind: "out" }
  | { kind: "gem"; v: number }
  | { kind: "rise" }

export interface GincanaResult {
  place: number
  total: number
  /** s da chegada (−1 = o tempo acabou antes). */
  time: number
  /** Chegou dentro da vaga (ou ficou em pé / pontos na vaga, pelo tipo da prova). */
  qualified: boolean
  /** Gincana 3: ficou fora da prova; meus pontos. */
  out: boolean
  pts: number
}

export interface GincanaGameOptions {
  canvas: HTMLCanvasElement
  body: BodyId
  look?: string
  name?: string
  /** Em grupo (sem isto, treino com 7 computadores). */
  mp?: { net: GincanaNet; start: GincanaStart }
  /** Fase do treino (em grupo vale a da sala). */
  phase?: string
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
  /** AGARRAR segurado (true) ou solto. */
  setGrab: (on: boolean) => void
  setMuted: (m: boolean) => void
  dispose: () => void
}

const SEATS = 8
/** Corpos dos computadores do treino (variam; as cores vêm da semente). */
const BOT_BODIES: BodyId[] = ["sergio", "ekaterina", "sergio", "ekaterina", "sergio", "ekaterina", "sergio", "ekaterina"]
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

/** Andar da Fábrica para a tela: engrenagens contadas desde a entrada no andar. */
function floorHud(F: readonly { goal: number }[], cp: number, pts: number) {
  const k = Math.min(cp, F.length - 1)
  const prev = k > 0 ? F[k - 1].goal : 0
  const of = F.length - 1
  const need = k < of ? F[k].goal - prev : 0
  return { f: k + 1, of, have: Math.max(0, Math.min(need, pts - prev)), need }
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
  // céu, neblina e luzes seguem o relógio de Brasília (CourseView, como na cidade)
  scene.ambientColor = new Color3(0.35, 0.35, 0.35)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogStart = low ? 130 : 190
  scene.fogEnd = low ? 400 : 640
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  new HemisphericLight("mm-hemi", new Vector3(0.2, 1, -0.2), scene)
  new DirectionalLight("mm-sun", new Vector3(-0.45, -1, 0.55), scene)

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
        const look = ""
        const body = BOT_BODIES[slot % BOT_BODIES.length]
        return { slot, name: opts.botNames?.[(slot - 1 + seed) % (opts.botNames.length || 1)] ?? `CPU ${slot}`, body, look, bot: true }
      })
  const race = new GincanaRace(
    seed,
    seatDefs.map((s) => ({ slot: s.slot, ctl: s.slot === me ? "local" : mp ? "remote" : "bot" })),
    mp ? mp.start.countdown : GINCANA.countdown,
    mp ? (mp.start.phase ?? "cidade") : (opts.phase ?? "cidade"),
  )
  const C = race.course
  const theme = themeOf(C.id)

  const course = new CourseView(scene, seed, low, C, theme)
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
    const body = (BODY_IDS as string[]).includes(s.body) ? (s.body as BodyId) : "sergio"
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
  // áudio S2: a música do gincana e o fundo da fase
  const musicSnd = sceneSound()
  musicSnd.set(GAME_MUSIC.gincana, null)

  // logos da Freelandoo (mm3d-47b): turbo com brilho; aura dourada em quem pegou
  const logos = buildLogos(scene, C.logos.map((L, id) => ({ id, at: new Vector3(L.x, L.y, L.z) })), low, 0.55)
  const auraMat = new StandardMaterial("gincana-aura", scene)
  auraMat.diffuseColor = new Color3(0, 0, 0)
  auraMat.specularColor = new Color3(0, 0, 0)
  auraMat.emissiveColor = new Color3(0.95, 0.55, 0.08)
  auraMat.alpha = 0.35
  auraMat.alphaMode = 1 // somando: brilha
  auraMat.disableLighting = true
  auraMat.backFaceCulling = false
  const aura = CreateSphere("gincana-aura", { diameter: 1.5, segments: 12 }, scene)
  aura.material = auraMat
  aura.isPickable = false
  aura.setEnabled(false)
  const baseFov = cam.fov

  // ── controle ───────────────────────────────────────────────────────────────
  const keys = new Set<string>()
  let joyX = 0
  let joyY = 0
  let jumpQ = false
  let diveQ = false
  let grabHeld = false
  let yaw = 0
  // Cânion (20/11, pedido do Alex): câmera mais alta — o perigo é o chão (pedra que acende e cai)
  const highCam = C.id === "canion"
  // 20/11 (pedido do Alex, Praça do Relógio: "a câmera tem que ficar mais distante"): de longe e do alto, o tabuleiro inteiro
  const farCam = !!C.memory
  let pitch = farCam ? 0.62 : highCam ? 0.6 : 0.36
  let dragAt = -99
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const k = e.key.toLowerCase()
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "shift", "e", "f", "control"].includes(k)) e.preventDefault()
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
    const grab = grabHeld || keys.has("f") || keys.has("control")
    return { mx: fx * iy + fz * ix, mz: fz * iy - fx * ix, jump: jumpQ, dive: diveQ, grab } as RunIntent
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
  /**
   * Relógio da prova que GUARDA a sobra de cada quadro (mm3d-47c). Antes o alvo
   * era "tempo da física + dt": a sobra se perdia e, em tela de 90/120/144 Hz
   * (quadro menor que o passo de 1/60 s), a física quase não andava — lento e
   * aos trancos. Em grupo ele anda com o quadro e só puxa de leve para o
   * relógio da sala (sem saltos que fazem a tela tremer).
   */
  let simClock = race.t
  // câmera suavizada (posição e para onde olha), a altura mais devagar: o pulo não sacode a tela
  const camAt = new Vector3(0, 0, 0)
  const camLook = new Vector3(0, 0, 0)
  let camReady = false
  let freeCam: [Vector3, Vector3] | null = null

  // placar pela MESMA regra da sala (Gincana 3: corrida, sobrevivência, coleta e zona)
  const board = (): BoardRow[] =>
    race.standings().map((r) => {
      const s = seats.get(r.slot)!
      return { slot: r.slot, name: s.name, me: r.slot === me, bot: s.bot, fin: r.fin, progress: Math.max(0, Math.min(1, (r.dist + 4) / (C.finishZ + 4))), out: r.out >= 0, pts: r.pts }
    })
  const memHud = (M: NonNullable<typeof C.memory>, tt: number) => {
    const st = memState(M, tt)
    return { r: st.r, ph: st.ph, sym: st.ph === 3 || st.ph === 4 ? memTarget(race.world.seed, st.r) : -1, left: st.left }
  }
  const hud = (): GincanaHud => {
    const rows = board()
    const t = race.t
    return {
      phase: t < 0 ? "countdown" : ended ? "end" : "run",
      countdown: Math.max(0, -t),
      time: Math.max(0, t),
      timeLeft: Math.max(0, race.limit() - Math.max(0, t)),
      place: rows.findIndex((r) => r.me) + 1,
      total: rows.length,
      section: sectionAt(C, mine.z),
      finished: mine.fin >= 0,
      myTime: mine.fin,
      board: rows,
      boost: mine.boost / GINCANA.boostT,
      quota: race.quota,
      qualified: Math.min(race.quota, race.order.length),
      grabbing: mine.grab >= 0,
      held: mine.held > 0,
      mode: C.mode,
      alive: race.alive(),
      pts: Math.round(mine.pts * 10) / 10,
      riseGap: C.rise && mine.out < 0 && mine.fin < 0 ? mine.y - riseAt(C, Math.max(0, t)) : Infinity,
      mem: C.memory ? memHud(C.memory, Math.max(0, t)) : null,
      floor: C.floors ? floorHud(C.floors, mine.cp, mine.pts) : null,
    }
  }

  let wasHeld = false
  let riseWarned = false
  const onEvents = () => {
    for (const e of events) {
      if (e.type === "tile") continue
      if (e.type === "splash") splashAt(e.x, e.z)
      if (e.type === "hoop") course.hoopFlash(e.i, race.t)
      if (e.type === "door") {
        if (e.slot === me) {
          if (e.open) audio.logo()
          else audio.hit()
          opts.onNotice?.({ kind: "door", open: e.open })
        }
        continue
      }
      if (e.slot !== me) continue
      switch (e.type) {
        case "bounce":
          audio.jump()
          break
        case "climb":
          audio.jump()
          opts.onNotice?.({ kind: "climb" })
          break
        case "grab":
          audio.dive()
          opts.onNotice?.({ kind: "grab" })
          break
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
        case "logo":
          audio.logo()
          opts.onNotice?.({ kind: "logo" })
          break
        case "hoop":
          audio.logo()
          opts.onNotice?.({ kind: "hoop" })
          break
        case "out":
          opts.onNotice?.({ kind: "out" })
          break
        case "gem":
          audio.logo()
          opts.onNotice?.({ kind: "gem", v: e.v })
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
        return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, f: lerpAngle(a.f, b.f, k), a: k < 0.5 ? a.a : b.a, cp: b.cp, fin: b.fin, g: k < 0.5 ? a.g : b.g }
      }
    }
    return list[list.length - 1]
  }

  const finishGame = () => {
    if (ended) return
    ended = true
    const rows = board()
    const place = rows.findIndex((r) => r.me) + 1
    const mineRow = race.standings().find((r) => r.slot === me)
    opts.onEnd?.({ place, total: rows.length, time: mine.fin, qualified: !!mineRow?.q, out: mine.out >= 0, pts: Math.round(mine.pts * 10) / 10 })
  }

  const frame = (ms: number) => {
    const dt = Math.min(0.1, ms / 1000)
    clock += dt
    // tempo da prova: o da sala em grupo, o do aparelho no treino
    simClock += dt
    if (mp) {
      const st = mp.net.serverTime() ?? -mp.start.countdown + (performance.now() / 1000 - mpStartedAt)
      const err = st - simClock
      if (Math.abs(err) > 0.5) simClock = st
      else simClock += err * Math.min(1, dt * 1.5)
    }
    // nunca para trás (a física não volta) e nunca mais de 0,2 s na frente
    simClock = Math.max(race.t, Math.min(race.t + 0.2, simClock))
    const target = simClock
    const wasCount = race.t < 0
    // o toque só é gasto quando um passo de física roda (quadro rápido pode não ter passo)
    if (race.advance(target, intent(), events, 12) > 0) {
      jumpQ = false
      diveQ = false
    }
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
        if (s) race.setRemote(slot, { x: s.x, y: s.y, z: s.z, f: s.f, a: s.a, cp: s.cp, fin: s.fin, g: s.g })
      }
      poseAt -= dt
      if (poseAt <= 0 && race.t >= 0) {
        poseAt = POSE_EVERY
        mp.net.sendPose({ x: mine.x, y: mine.y, z: mine.z, f: mine.facing, a: runnerAnim(mine), cp: mine.cp, fin: mine.fin, g: mine.grab })
      }
    }
    // fui agarrado agora
    const heldNow = mine.held > 0
    if (heldNow && !wasHeld) opts.onNotice?.({ kind: "held" })
    wasHeld = heldNow
    // o perigo que sobe chegou perto (a 2,5 m do pé): um aviso por subida
    if (C.rise && mine.out < 0 && mine.fin < 0 && race.t > 0) {
      const near = mine.y - riseAt(C, race.t) < 2.5 && mine.mode !== MODE.WATER
      if (near && !riseWarned) opts.onNotice?.({ kind: "rise" })
      riseWarned = near
    }
    // fim para mim: cheguei, fiquei fora, a vaga encheu, o tempo da fase acabou ou a prova (sobrevivência/coleta/zona) acabou
    if (!ended && (mine.fin >= 0 || mine.out >= 0 || race.t >= race.limit() || race.closed() || (C.mode !== "race" && race.over()))) {
      if (mine.fin < 0 && mine.out < 0 && C.mode === "race") opts.onNotice?.({ kind: race.closed() ? "eliminated" : "timeout" })
      finishGame()
    }

    // ── desenho ──
    course.update(race.t, clock, race.world)
    // entre dois passos da física: a fração que sobrou do tempo (sem isso o corpo
    // anda aos trancos quando o quadro não bate com os 60 passos por segundo)
    const alpha = Math.max(0, Math.min(1, (target - race.t) / GINCANA.step))
    const planes = Frustum.GetPlanes(scene.getTransformMatrix())
    for (const b of race.runners) {
      const s = seats.get(b.slot)!
      const remote = mp && b.slot !== me
      if (remote) {
        const k = Math.min(1, dt * 30)
        if (Math.hypot(b.x - s.vx, b.z - s.vz) > 3 || Math.abs(b.y - s.vy) > 3) {
          s.vx = b.x
          s.vy = b.y
          s.vz = b.z
        } else {
          s.vx += (b.x - s.vx) * k
          s.vy += (b.y - s.vy) * k
          s.vz += (b.z - s.vz) * k
        }
      } else if (Math.hypot(b.x - b.px, b.z - b.pz) > 3) {
        s.vx = b.x
        s.vy = b.y
        s.vz = b.z
      } else {
        s.vx = b.px + (b.x - b.px) * alpha
        s.vy = b.py + (b.y - b.py) * alpha
        s.vz = b.pz + (b.z - b.pz) * alpha
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
      // os outros: longe some/fica leve e fora da tela não anima (como no centro)
      if (b.slot !== me) s.char.applyDistance(Math.hypot(s.vx - cam.position.x, s.vz - cam.position.z), planes, profile)
      s.char.animate(dt, 0, speed)
    }
    // logos da Freelandoo: os que eu já peguei somem até voltar
    for (let i = 0; i < C.logos.length; i++) logos.setOn(i, race.t - mine.took[i] >= GINCANA.logoBack)
    logos.tick(clock)
    // turbo: aura dourada pulsando em volta de mim
    const me4 = seats.get(me)!
    aura.setEnabled(mine.boost > 0)
    if (mine.boost > 0) {
      // a bola acompanha a altura do corpo (1,8 m = o tamanho de base)
      const tall = seats.get(me)!.char.height
      const auraK = tall / 1.8
      aura.position.set(me4.vx, me4.vy + tall / 2, me4.vz)
      const pulse = 1 + Math.sin(clock * 18) * 0.08
      aura.scaling.set(1.05 * pulse * auraK, 1.35 * pulse * auraK, 1.05 * pulse * auraK)
      auraMat.alpha = 0.08 + Math.min(1, mine.boost) * 0.1
    }
    cam.fov += ((mine.boost > 0 ? baseFov + 0.12 : baseFov) - cam.fov) * Math.min(1, dt * 6)
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
    const dist = (touch ? 7.4 : 6.6) + (farCam ? 6 : highCam ? 1.6 : 0)
    // suavização que não depende da taxa de quadros (exponencial)
    const kXZ = 1 - Math.exp(-dt * 14)
    const kY = 1 - Math.exp(-dt * 5)
    // na água a câmera não desce junto (com o pântano subindo, fica acima dele)
    const footY = Math.max(me3.vy, mine.mode === MODE.WATER ? Math.max(DECK_CAM - 2, riseAt(C, Math.max(0, race.t)) + 3) : -99)
    if (!camReady) {
      camAt.set(me3.vx, footY, me3.vz)
      camReady = true
    }
    camAt.x += (me3.vx - camAt.x) * kXZ
    camAt.z += (me3.vz - camAt.z) * kXZ
    camAt.y += (footY - camAt.y) * kY
    const ty = camAt.y + 1.5
    const want = new Vector3(camAt.x - Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, camAt.z - Math.cos(yaw) * Math.cos(pitch) * dist)
    cam.position.copyFrom(want)
    camLook.set(camAt.x + Math.sin(yaw) * 2, ty + 0.2, camAt.z + Math.cos(yaw) * 2)
    cam.setTarget(camLook)
    if (freeCam) {
      cam.position.copyFrom(freeCam[0])
      cam.setTarget(freeCam[1])
    }

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
  w.__gincanaWorld = () => race.world
  w.__gincana = () => ({ t: race.t, x: mine.x, y: mine.y, z: mine.z, mode: mine.mode, cp: mine.cp, fin: mine.fin, ground: mine.ground, yaw, pitch, place: hud().place, fps: engine.getFps() })
  w.__gincanaRace = race
  w.__gincanaTp = (x: number, y: number, z: number, cp?: number) => {
    Object.assign(mine, { x, y, z, vx: 0, vy: 0, vz: 0, ground: false, mode: MODE.RUN, timer: 0 })
    if (cp !== undefined) mine.cp = cp
  }
  // câmera livre para fotografar o cenário de perto (harness); null devolve a câmera ao boneco
  w.__gincanaCam = (x: number | null, y = 0, z = 0, tx = 0, ty = 0, tz = 0) => {
    freeCam = x === null ? null : [new Vector3(x, y, z), new Vector3(tx, ty, tz)]
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
    setGrab(on) {
      grabHeld = on
      if (on) audio.resume()
    },
    setMuted(m) {
      audio.setMuted(m)
    },
    dispose() {
      if (disposed) return
      disposed = true
      musicSnd.dispose()
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
      for (const k of ["__gincana", "__gincanaRace", "__gincanaTp", "__gincanaLook", "__gincanaCam"]) delete w[k]
      for (const s of seats.values()) s.char.dispose()
      for (const s of splashes) s.mesh.dispose()
      logos.dispose()
      aura.dispose()
      auraMat.dispose()
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
