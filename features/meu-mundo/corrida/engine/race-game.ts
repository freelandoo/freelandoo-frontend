// features/meu-mundo/corrida/engine/race-game.ts — CORRIDA ANTIGRAVIDADE (mm3d-39): a cena.
//
// Cena própria (como o Paint): motor Babylon, céu de NOITE com neblina roxa
// (mm3d-41), a pista suspensa sobre a cidade (track-view), as naves com fogo
// (car-view) e a câmera de perseguição, que abre o ângulo com a velocidade e
// treme no turbo. Sem sombras (pedido do Alex): só luz ambiente + lua. No
// celular desenha a 30 quadros por segundo (`frameCapMs`).
//
// A regra é sim/race.ts em passos de 1/120 s; o desenho interpola entre os
// dois últimos passos. Em grupo (mm3d-39b, `net`): a nave deste aparelho é
// simulada aqui; as outras (pessoas e computador) chegam da sala a 20 Hz e
// andam suaves (extrapoladas pelo relógio da sala, corrigidas aos poucos);
// a cápsula é pedida à sala; quem encerra e dá o resultado é a sala. Teclado: setas/WASD, Espaço ou Shift = turbo. Celular:
// o joystick (frente acelera, trás freia, lados viram — acelera sozinho) e
// o botão de turbo.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { buildTrack, BAIA, type Track } from "../sim/track"
import { Race, TUNING, CAR_COLORS, SHIPS, DEFAULT_SHIP, carPose, type CarInput, type CarPose, type RaceEvent, type RaceSeat, type RemoteCar } from "../sim/race"
import { buildTrackView, NIGHT_HORIZON } from "./track-view"
import { CarFleet, HOVER } from "./car-view"
import { RaceAudio } from "./audio"
import type { CorridaNet, CorridaNetStatus, CorridaStart } from "./net"

export type RaceMode = "race" | "time" | "multi"

export interface RaceStanding {
  id: number
  name: string
  color: string
  me: boolean
  /** Pessoa (no grupo); o computador aparece marcado. */
  human: boolean
  /** Saiu no meio (grupo). */
  gone: boolean
  /** Tempo total (null = não terminou). */
  time: number | null
  best: number | null
}

export interface RaceHud {
  phase: "countdown" | "race" | "end"
  /** s até o "vai" (só na contagem). */
  countdown: number
  lap: number
  laps: number
  place: number
  total: number
  time: number
  lapTime: number
  best: number | null
  /** km/h. */
  speed: number
  charges: number
  boost: boolean
  air: boolean
  down: boolean
  finished: boolean
  /** Minimapa: naves (x, z normalizados 0–1), a minha primeiro. */
  dots: { x: number; z: number; color: string; me: boolean }[]
  results: RaceStanding[] | null
  /** Em grupo: a conexão com a sala (null = sozinho). */
  net: CorridaNetStatus | null
}

export type RaceNotice =
  | { kind: "go" }
  | { kind: "pad" }
  | { kind: "turbo" }
  | { kind: "orb"; charges: number }
  | { kind: "fell" }
  | { kind: "lap"; lap: number; time: number; best: boolean; last: boolean }
  | { kind: "finish"; place: number; time: number }
  | { kind: "wall" }

export interface RaceGameOptions {
  canvas: HTMLCanvasElement
  mode: RaceMode
  playerName: string
  /** Nave escolhida na garagem (mm3d-49). */
  ship?: string
  /** Celular: a nave acelera sozinha (puxar o joystick para trás freia). */
  touch?: boolean
  /** Em grupo: a sala e a largada que ela mandou. */
  net?: { net: CorridaNet; start: CorridaStart }
  maxPixelRatio?: number
  onReady?: () => void
  onHud?: (h: RaceHud) => void
  onNotice?: (n: RaceNotice) => void
  onError?: (reason: "context-lost") => void
}

export interface RaceGameHandle {
  setJoystick: (x: number, y: number) => void
  turbo: () => void
  setMuted: (m: boolean) => void
  /** Desenho do circuito para o minimapa (pontos normalizados 0–1). */
  minimap: () => { x: number; z: number }[]
  dispose: () => void
}

/** Sozinho: eu com a nave da garagem e os rivais com as outras (em ordem sorteada). */
function soloSeats(opts: RaceGameOptions): RaceSeat[] {
  const mine = opts.ship ?? DEFAULT_SHIP
  const others = SHIPS.map((s) => s.id).filter((id) => id !== mine)
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[others[i], others[j]] = [others[j], others[i]]
  }
  const me: RaceSeat = { name: opts.playerName, kind: "local", ship: mine }
  if (opts.mode !== "race") return [me]
  return [me, ...Array.from({ length: 5 }, (_, i): RaceSeat => ({ name: "", kind: "bot", ship: others[i % others.length] }))]
}

let trackCache: Track | null = null
export function corridaTrack(): Track {
  if (!trackCache) trackCache = buildTrack(BAIA)
  return trackCache
}

export function createRaceGame(opts: RaceGameOptions): RaceGameHandle {
  const { canvas } = opts
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  const governor = new ResolutionGovernor(engine, quality, Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  // mm3d-41: noite. A neblina é a cor do horizonte do céu (track-view).
  const haze = new Color3(...NIGHT_HORIZON)
  scene.clearColor = new Color4(haze.r, haze.g, haze.b, 1)
  scene.ambientColor = new Color3(0.3, 0.3, 0.3)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = haze
  scene.fogStart = low ? 160 : 260
  scene.fogEnd = low ? 650 : 1100
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  // o passo das partículas é dado pelo jogo (dt real), não pelo ritmo do navegador
  scene.useConstantAnimationDeltaTime = true
  const hemi = new HemisphericLight("corrida-hemi", new Vector3(0.2, 1, -0.15), scene)
  hemi.intensity = 0.6
  hemi.diffuse = new Color3(0.62, 0.68, 1)
  hemi.groundColor = new Color3(0.32, 0.16, 0.4)
  const moon = new DirectionalLight("corrida-moon", new Vector3(-0.5, -1, 0.4), scene)
  moon.intensity = 0.45
  moon.diffuse = new Color3(0.65, 0.75, 1)

  const track = corridaTrack()
  const mp = opts.net ?? null
  const race = mp
    ? new Race({
        track,
        seats: mp.start.seats.map((s, i) => ({ name: s.name, kind: i === mp.start.me ? "local" : "remote", ship: s.ship })),
        me: mp.start.me,
        autoEnd: false,
      })
    : new Race({ track, seats: soloSeats(opts), seed: (Date.now() & 0xffff) | 1 })
  /** A nave deste aparelho. */
  const me = race.me
  const humans = mp ? mp.start.seats.map((s) => s.human) : race.cars.map((c) => c.kind === "local")
  const view = buildTrackView(scene, track, low)
  const fleet = new CarFleet(
    scene,
    race.cars.map((c) => c.color),
    race.cars.map((c) => c.ship),
    (i) => i === me || !low,
    (i) => i === me,
    !low,
  )
  const audio = new RaceAudio()
  audio.resume()

  const cam = new FreeCamera("corrida-cam", new Vector3(0, 40, -20), scene)
  cam.inputs.clear()
  cam.minZ = 0.3
  cam.maxZ = 4000
  cam.fov = 0.95
  scene.activeCamera = cam

  // ── controles ──────────────────────────────────────────────────────────────
  const keys = new Set<string>()
  let joyX = 0
  let joyY = 0
  let joyOn = false
  let turboPending = false
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const k = e.code
    if (!/^(Arrow|Key[WASD]$|Space$|Shift)/.test(k)) return
    e.preventDefault()
    if (down) {
      if ((k === "Space" || k.startsWith("Shift")) && !keys.has(k)) turboPending = true
      keys.add(k)
    } else keys.delete(k)
  }
  const kd = (e: KeyboardEvent) => onKey(e, true)
  const ku = (e: KeyboardEvent) => onKey(e, false)
  const blur = () => keys.clear()
  window.addEventListener("keydown", kd)
  window.addEventListener("keyup", ku)
  window.addEventListener("blur", blur)
  const readInput = (): CarInput => {
    const left = keys.has("ArrowLeft") || keys.has("KeyA")
    const right = keys.has("ArrowRight") || keys.has("KeyD")
    const up = keys.has("ArrowUp") || keys.has("KeyW")
    const down = keys.has("ArrowDown") || keys.has("KeyS")
    let steer = (right ? 1 : 0) - (left ? 1 : 0)
    // celular: acelera sozinho (o joystick só vira e freia)
    let throttle = up || (opts.touch && !down) ? 1 : 0
    let brake = down ? 1 : 0
    if (joyOn || (!up && !down && !left && !right && Math.hypot(joyX, joyY) > 0.05)) {
      // joystick: acelera sozinho; puxar para trás freia
      steer = Math.abs(joyX) > 0.08 ? Math.sign(joyX) * Math.min(1, (Math.abs(joyX) - 0.08) / 0.8) : 0
      throttle = joyY < -0.35 ? 0 : 1
      brake = joyY < -0.35 ? Math.min(1, (-joyY - 0.35) / 0.5) : 0
    }
    const turbo = turboPending
    turboPending = false
    return { steer, throttle, brake, turbo }
  }

  // ── laço ───────────────────────────────────────────────────────────────────
  const n = race.cars.length
  const prev: CarPose[] = race.cars.map((c) => carPose(race, c, {} as CarPose))
  const cur: CarPose[] = race.cars.map((c) => carPose(race, c, {} as CarPose))
  const draw: CarPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 }
  const events: RaceEvent[] = []
  let acc = 0
  let hudAt = 0
  let camYaw = race.player.yaw
  let camY = race.player.Y + 3
  const camPos = new Vector3()
  const camTarget = new Vector3()
  let shake = 0
  let lastBeep = 99
  let readyFired = false
  let finishedSeen = false
  const orbState = new Map<number, boolean>()
  const b = track.bounds
  const span = Math.max(b.x1 - b.x0, b.z1 - b.z0)
  const norm = (x: number, z: number) => ({ x: (x - b.x0) / span + (span - (b.x1 - b.x0)) / span / 2, z: 1 - ((z - b.z0) / span + (span - (b.z1 - b.z0)) / span / 2) })

  const notice = (nn: RaceNotice) => opts.onNotice?.(nn)
  const handle = (e: RaceEvent) => {
    const mine = (id: number) => id === me
    switch (e.type) {
      case "go":
        audio.beep(1180, 0.35, 0.22)
        notice({ kind: "go" })
        break
      case "pad":
        if (mine(e.car)) {
          audio.boost()
          shake = 0.35
          notice({ kind: "pad" })
        }
        break
      case "turbo":
        if (mine(e.car)) {
          audio.boost()
          shake = 0.45
          notice({ kind: "turbo" })
        }
        break
      case "orb":
        if (mine(e.car)) {
          mp?.net.claimOrb(e.orb)
          audio.pickup()
          notice({ kind: "orb", charges: race.player.charges })
        }
        break
      case "land":
        if (mine(e.car)) audio.land(e.hard)
        break
      case "fell":
        if (mine(e.car)) {
          audio.fall()
          notice({ kind: "fell" })
        }
        break
      case "wall":
        if (mine(e.car)) {
          audio.hit()
          notice({ kind: "wall" })
        }
        break
      case "bump":
        if (mine(e.a) || mine(e.b)) audio.hit()
        break
      case "lap":
        if (mine(e.car)) notice({ kind: "lap", lap: e.lap, time: e.time, best: e.best, last: e.lap >= race.laps })
        break
      case "finish":
        if (mine(e.car)) notice({ kind: "finish", place: e.place, time: e.time })
        break
      default:
        break
    }
  }

  const results = (): RaceStanding[] => {
    // em grupo, o resultado que vale é o da sala
    const rows = mp?.net.result
    if (rows)
      return rows.map((r) => ({ id: r.car, name: r.name, color: CAR_COLORS[r.car % CAR_COLORS.length], me: r.car === me, human: r.human, gone: r.gone, time: r.time, best: r.best }))
    return race.standings().map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      me: c.id === me,
      human: !!humans[c.id],
      gone: c.gone,
      time: c.finished,
      best: c.laps.length ? Math.min(...c.laps) : null,
    }))
  }

  const pushHud = () => {
    const p = race.player
    const lap = race.lapOf(p)
    opts.onHud?.({
      phase: race.phase,
      countdown: Math.max(0, -race.time),
      lap,
      laps: race.laps,
      place: race.placeOf(p),
      total: n,
      time: Math.max(0, p.finished ?? race.time),
      lapTime: Math.max(0, (p.finished ?? race.time) - p.lapStart),
      best: race.bestLap,
      speed: Math.round(p.v * 3.6),
      charges: p.charges,
      boost: p.boost > 0,
      air: p.air,
      down: p.down > 0,
      finished: p.finished !== null,
      dots: race.cars.map((c, i) => {
        const m = norm(cur[i].x, cur[i].z)
        return { x: m.x, z: m.z, color: c.color, me: i === me }
      }),
      results: race.phase === "end" || p.finished !== null ? results() : null,
      net: mp ? mp.net.status : null,
    })
  }

  // ── grupo: a sala ────────────────────────────────────────────────────────
  /** Desenho das naves que vêm da rede (suavizado). */
  const smooth: (RemoteCar | null)[] = race.cars.map(() => null)
  let poseClock = 0
  const syncNet = (dt: number) => {
    if (!mp) return
    const net = mp.net
    // relógio: o da sala (corrige devagar; salto grande, na hora)
    const st = net.serverTime()
    if (st !== null && race.phase !== "end") {
      const diff = st - race.time
      if (Math.abs(diff) > 0.3) race.time = st
      else race.time += diff * Math.min(1, dt * 2)
    }
    // as outras naves: extrapoladas pelo relógio da sala e alcançadas aos poucos
    const now = st ?? race.time
    for (let i = 0; i < race.cars.length; i++) {
      if (i === me) continue
      const sm = net.cars[i]
      if (!sm) continue
      if (sm.gone) {
        if (!race.cars[i].gone) race.markGone(i)
        continue
      }
      const age = Math.max(0, Math.min(0.35, now - sm.t))
      const target: RemoteCar = { ...sm, dist: sm.dist + sm.v * age, Y: sm.Y + (sm.air ? sm.vy * age : 0) }
      let r = smooth[i]
      if (!r || Math.abs(target.dist - r.dist) > 30 || sm.down) r = smooth[i] = { ...target }
      else {
        const k = Math.min(1, dt * 6)
        r.dist += r.v * dt
        r.dist += (target.dist - r.dist) * k
        r.u += (target.u - r.u) * k
        r.Y += (target.Y - r.Y) * Math.min(1, dt * 10)
        r.yaw += wrapPi(target.yaw - r.yaw) * k
        r.v = target.v
        r.vy = target.vy
        r.air = target.air
        r.boost = target.boost
        r.down = target.down
        r.steer = target.steer
        r.throttle = target.throttle
      }
      race.applyRemote(i, r, events)
    }
    // cápsulas que a sala já deu; turbo negado (outro chegou antes)
    for (const [id, left] of net.orbs) if (!race.orbOut.has(id)) race.orbOut.set(id, left)
    const denied = net.takeDenied().length
    if (denied) race.player.charges = Math.max(0, race.player.charges - denied)
    // a minha nave para a sala, a 20 Hz
    poseClock -= dt
    if (race.phase === "race" && poseClock <= 0) {
      poseClock = 0.05
      net.sendPose(race.remoteOf(race.player))
    }
    // fim: quem decide é a sala
    if (net.result && race.phase !== "end") race.end(events)
  }

  const frame = (frameMs: number) => {
    const dt = Math.min(0.1, frameMs / 1000)
    syncNet(dt)
    for (const e of events) handle(e)
    events.length = 0
    if (race.phase !== "end") {
      acc += dt
      while (acc >= TUNING.step) {
        acc -= TUNING.step
        for (let i = 0; i < n; i++) {
          const t = prev[i]
          prev[i] = cur[i]
          cur[i] = t
        }
        race.step(readInput(), events)
        for (let i = 0; i < n; i++) carPose(race, race.cars[i], cur[i])
        for (const e of events) handle(e)
        events.length = 0
      }
    }
    // contagem: bipes nos segundos
    if (race.phase === "countdown") {
      const s = Math.ceil(-race.time)
      if (s !== lastBeep && s <= 3 && s >= 1) {
        audio.beep(620, 0.16, 0.18)
        lastBeep = s
      }
    }
    const f = race.phase === "end" ? 1 : acc / TUNING.step
    for (let i = 0; i < n; i++) {
      const a = prev[i]
      const c = cur[i]
      // pulo de volta (caiu e voltou): sem interpolar
      const jump = Math.hypot(c.x - a.x, c.z - a.z) > 30
      const k = jump ? 1 : f
      draw.x = a.x + (c.x - a.x) * k
      draw.y = a.y + (c.y - a.y) * k
      draw.z = a.z + (c.z - a.z) * k
      draw.yaw = a.yaw + wrapPi(c.yaw - a.yaw) * k
      draw.pitch = a.pitch + (c.pitch - a.pitch) * k
      draw.roll = a.roll + (c.roll - a.roll) * k
      const car = race.cars[i]
      fleet.place(i, draw, { throttle: car.throttleNow, speed: Math.min(1, Math.max(0, car.v / TUNING.boostMax)), boost: car.boost > 0, air: car.air, down: car.down > 0 || car.gone }, dt)
      if (i === me) placeCamera(draw, dt)
    }
    fleet.flush(dt)
    for (const o of track.orbs) {
      const on = !race.orbOut.has(o.id)
      if (orbState.get(o.id) !== on) {
        orbState.set(o.id, on)
        view.setOrb(o.id, on)
      }
    }
    view.tick(dt)
    const p = race.player
    audio.engine(p.v, p.boost > 0, p.air, race.phase !== "countdown" && p.down <= 0)
    hudAt -= dt
    const finishedNow = p.finished !== null
    if (hudAt <= 0 || finishedNow !== finishedSeen) {
      hudAt = 0.1
      finishedSeen = finishedNow
      pushHud()
    }
    governor.tick(frameMs)
  }

  const placeCamera = (pose: CarPose, dt: number) => {
    const p = race.player
    const v = p.v
    const lag = p.down > 0 ? 0 : 1
    camYaw += wrapPi(pose.yaw - camYaw) * Math.min(1, dt * (p.air ? 3 : 5.5)) * lag
    const back = 7.4 + Math.min(1, v / TUNING.boostMax) * 2.2
    const up = 2.5 + (p.air ? 1.2 : 0)
    const wantY = pose.y + HOVER + up
    camY += (wantY - camY) * Math.min(1, dt * (p.air ? 3.5 : 8))
    if (shake > 0) shake = Math.max(0, shake - dt)
    const jit = (p.boost > 0 ? 0.05 : 0) + shake * 0.25
    camPos.set(
      pose.x - Math.sin(camYaw) * back + (Math.random() - 0.5) * jit,
      camY + (Math.random() - 0.5) * jit,
      pose.z - Math.cos(camYaw) * back,
    )
    camTarget.set(pose.x + Math.sin(camYaw) * 9, pose.y + HOVER + 0.9, pose.z + Math.cos(camYaw) * 9)
    cam.position.copyFrom(camPos)
    cam.setTarget(camTarget)
    const wantFov = 0.92 + Math.min(1, v / TUNING.boostMax) * 0.26 + (p.boost > 0 ? 0.08 : 0)
    cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 3)
  }

  // primeira pose e câmera antes do primeiro quadro
  placeCamera(cur[me], 1)
  void fleet.ready.then(() => {
    if (disposed || readyFired) return
    readyFired = true
    opts.onReady?.()
    pushHud()
  })

  const lost = engine.onContextLostObservable.add(() => opts.onError?.("context-lost"))
  // celular: 30 quadros por segundo (o que mais esquenta é desenhar sem teto)
  const capMs = frameCapMs()
  let lastFrame = performance.now()
  engine.runRenderLoop(() => {
    if (disposed) return
    const now = performance.now()
    // folga de 3 ms: tela de 60 Hz entrega 16,7 ms; dois toques = 33,3 ms
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
  w.__corrida = () => {
    const p = race.player
    return { phase: race.phase, time: race.time, dist: p.dist, s: ((p.dist % track.length) + track.length) % track.length, u: p.u, v: p.v, Y: p.Y, air: p.air, down: p.down, lap: race.lapOf(p), place: race.placeOf(p), charges: p.charges, gaps: track.gaps, orbs: track.orbs }
  }
  w.__corridaTp = (s: number, v: number) => {
    const p = race.player
    p.dist = s
    p.u = 0
    p.v = v
    p.air = false
    p.Y = track.y[Math.floor(s / 2) % track.n]
    p.yaw = track.yaw[Math.floor(s / 2) % track.n]
  }

  return {
    setJoystick(x, y) {
      joyX = x
      joyY = y
      joyOn = Math.hypot(x, y) > 0.05
    },
    turbo() {
      turboPending = true
    },
    setMuted(m) {
      audio.setMuted(m)
    },
    minimap() {
      const out: { x: number; z: number }[] = []
      for (let i = 0; i < track.n; i += 4) out.push(norm(track.x[i], track.z[i]))
      return out
    },
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
      window.removeEventListener("blur", blur)
      ro.disconnect()
      for (const k of ["__corrida", "__corridaTp"]) delete w[k]
      engine.onContextLostObservable.remove(lost)
      engine.stopRenderLoop()
      mp?.net.dispose()
      audio.dispose()
      fleet.dispose()
      view.dispose()
      cam.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
}

function wrapPi(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}
