// features/meu-mundo/jetpack/engine/jetpack-game.ts — JETPACK (mm3d-63): a cena.
//
// Motor Babylon próprio (como o Paint e o Rolê): o túnel (tunnel-view), as
// prensas e os galões (obstacles-view) e o jogador — o AVATAR dele (corpo,
// skin e cores) com o jetpack de latão nas costas (pack-view), inclinado para
// a frente como quem voa, deitando para o lado da curva.
//
// A regra é sim/flight.ts em passos de 1/120 s; o desenho interpola o jogador
// entre os dois últimos passos. Controles: ←/→ (A/D) para os lados; Espaço,
// ↑, W ou o botão do mouse seguram o propulsor. No celular, a tela chama
// `setTouch` com os botões ◀ ▶ e PROPULSOR.
//
// Em grupo (a sala do backend), a semente é da sala: todos voam o MESMO túnel
// e os outros aparecem nele, desenhados um pouco no passado entre duas
// amostras. Aba escondida não pausa quando há sala (o voo dos outros segue);
// escondida por muito tempo = bateu.
//
// FASES (mm3d-75): a fase escolhida (em grupo, a da sala) decide o túnel que a
// semente gera (sim/phases.ts), o cenário (phase-env.ts), a pele dos
// obstáculos e o céu/névoa/luz. O voo é o mesmo em todas.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { PointLight } from "@babylonjs/core/Lights/pointLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { AvatarLibrary } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { BODY_IDS, type BodyId } from "../../types"
import { Flight, TUNING, TUNNEL, WINDOW_KINDS, crusherB, ringAt, speedAt, windowAt, type CrashBy, type FlightEvent, type FlightInput } from "../sim/flight"
import { SEG } from "./tunnel-view"
import { buildObstacles } from "./obstacles-view"
import { buildPhaseEnv, PHASE_LOOK } from "./phase-env"
import { phaseRule, type PhaseId } from "../sim/phases"
import { buildPackKit, PackRig, PILOT_H } from "./pack-view"
import { JetAudio } from "./audio"
import { createPerfProbe } from "./jet-perf"
import { createJetVfx } from "./jet-vfx"
import { buildBoundary } from "./boundary-view"
import { loadCanyonAssets, loadFactoryAssets, loadForestAssets, loadForgeAssets, loadIceAssets, loadOrbitalAssets, loadPieces, type PieceAssets } from "./canyon-assets"
import { FLAG, type JetpackNet, type JetpackSeat, type JetpackStart, type PilotSample } from "./net"

export interface JetHud {
  phase: "countdown" | "run" | "end"
  countdown: number
  score: number
  dist: number
  /** km/h. */
  speed: number
  /** 0–1. */
  fuel: number
  cans: number
  thrust: boolean
  /** Fator de velocidade do personagem (atributo velocidade). */
  k: number
  /** Em grupo: a classificação ao vivo. */
  field: FieldRow[] | null
  /** Jetpack 3.0: altura do meio do corpo entre o chão (0) e o teto (1), e a folga até o limite mais perto (m). */
  alt: number
  gap: number
  /** Próxima passagem (até ~70 m): −1 = bem mais baixa (desça), 1 = bem mais alta (suba), 0 = na altura. */
  cue: -1 | 0 | 1
}

export interface FieldRow {
  slot: number
  name: string
  dist: number
  score: number
  /** 1 = voando, 0 = bateu, 2 = saiu. */
  alive: number
  me: boolean
}

export interface JetResult {
  /** Fase voada (mm3d-75). */
  phase: PhaseId
  score: number
  dist: number
  cans: number
  /** Bateu no quê; "fuel" = o tanque secou e o chão pegou. */
  by: CrashBy | "fuel"
  /** s de voo. */
  time: number
}

export type JetNotice = { kind: "go" } | { kind: "can"; n: number } | { kind: "low" } | { kind: "empty" }

export interface JetGameOptions {
  canvas: HTMLCanvasElement
  body: BodyId
  look?: string
  name?: string
  /** Fase escolhida (mm3d-75); em grupo vale a da sala. */
  phase?: PhaseId
  /** A sala (grupo ou "sozinho" pela sala); sem ela, voo local. */
  mp?: { net: JetpackNet; start: JetpackStart }
  onReady?: () => void
  onHud?: (h: JetHud) => void
  onNotice?: (n: JetNotice) => void
  onEnd?: (r: JetResult) => void
  onError?: (reason: "context-lost") => void
}

export interface JetGameHandle {
  /** Botões do celular. */
  /** `steer`: arrasto do dedo no celular, −1 (esquerda) a 1 (direita); 0 = soltou. */
  setTouch: (t: { left?: boolean; right?: boolean; thrust?: boolean; steer?: number }) => void
  setMuted: (m: boolean) => void
  dispose: () => void
}

const COUNTDOWN = 3
/** O meio do corpo fica a isto acima dos pés (corpo de 1,70 m). */
const MID = 0.86
const INTERP = 0.12
const POSE_EVERY = 0.05
const REMOTE_CUT = 260
const AWAY_MS = 6000
/** Inclinação para a frente no voo (rad). */
const PITCH = 0.3
/**
 * Pose do voo (pedido do Alex, como o astronauta do jetpack antigo): na
 * largada o corpo fica em pé pedalando no ar, como quem vai cair; quando o voo
 * começa de verdade ele DEITA para a frente (~55°, como na arte) e as pernas
 * só balançam. O giro é em volta do meio do corpo (a caixa da regra não muda).
 */
const PITCH_UP = 0.08
const PITCH_FLY = 1.1

const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)

interface Remote {
  seat: JetpackSeat
  char: Character
  pack: PackRig
  fall: number
  vy: number
  y: number
  lastX: number
  roll: number
  legs: LegRig
}

/** Inclina o corpo em volta do MEIO (não dos pés): depois de place(), corrige a posição do invólucro. */
function tiltAroundMiddle(char: Character, pitch: number) {
  char.holder.rotation.x = pitch
  char.holder.position.y += MID * (1 - Math.cos(pitch))
  char.holder.position.z -= MID * Math.sin(pitch)
}

/** Pernas por cima da animação: pedalada (tread 1) ou balanço leve do voo (tread 0). */
interface LegRig {
  char: Character
  tread: number
  t: number
}
const LEG_BONES = ["mixamorig:LeftUpLeg", "mixamorig:RightUpLeg", "mixamorig:LeftLeg", "mixamorig:RightLeg"]
const qTmp = new Quaternion()
function applyLegs(r: LegRig) {
  for (let i = 0; i < 4; i++) {
    const n = r.char.bone(LEG_BONES[i])
    if (!n) continue
    if (!n.rotationQuaternion) n.rotationQuaternion = Quaternion.FromEulerVector(n.rotation)
    const side = i % 2 ? Math.PI : 0
    const ph = r.t * 9 + side
    let a: number
    if (i < 2) {
      // coxa: pedalada grande na largada, balanço curto no voo (deitado, perna um pouco para trás)
      a = r.tread * Math.sin(ph) * 0.65 + (1 - r.tread) * (Math.sin(r.t * 4.5 + side) * 0.1 + 0.22)
    } else {
      // joelho: dobra junto da pedalada; no voo, quase reto
      a = -(r.tread * (0.55 + 0.5 * Math.sin(ph + 1.2)) + (1 - r.tread) * (0.12 + Math.sin(r.t * 4.5 + side + 1) * 0.06))
    }
    n.rotationQuaternion.multiplyInPlace(Quaternion.RotationAxisToRef(Vector3.Right(), a, qTmp))
  }
}

export function createJetpackGame(opts: JetGameOptions): JetGameHandle {
  const { canvas } = opts
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false
  const capMs = frameCapMs()
  const profile = touch ? { ...quality, maxRatio: Math.max(quality.maxRatio, low ? 1.5 : 2), minRatio: Math.max(quality.minRatio, 1) } : quality
  const governor = new ResolutionGovernor(engine, profile, Math.min(window.devicePixelRatio || 1, touch ? 2 : 1.5))

  const mp = opts.mp ?? null
  const level: PhaseId = phaseRule(mp?.start.phase ?? opts.phase).id
  const look = PHASE_LOOK[level]
  const scene = new Scene(engine)
  scene.clearColor = new Color4(look.clear[0], look.clear[1], look.clear[2], 1)
  scene.ambientColor = new Color3(look.ambient[0], look.ambient[1], look.ambient[2])
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(look.fog[0], look.fog[1], look.fog[2])
  const fogEnd = low ? Math.round(look.fogEnd * 0.72) : look.fogEnd
  scene.fogStart = low ? Math.round(look.fogStart * 0.67) : look.fogStart
  scene.fogEnd = fogEnd
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("jt-hemi", new Vector3(0.1, 1, -0.4), scene)
  hemi.intensity = look.hemiK * (touch ? 1.2 : 1)
  hemi.diffuse = new Color3(look.hemi[0], look.hemi[1], look.hemi[2])
  hemi.groundColor = new Color3(look.ground[0], look.ground[1], look.ground[2])
  // luz que anda com o jogador (o túnel acende onde ele passa) e a do fogo
  const lamp = new PointLight("jt-lamp", new Vector3(0, 6, 8), scene)
  lamp.diffuse = new Color3(look.lamp[0], look.lamp[1], look.lamp[2])
  lamp.specular = new Color3(0.2, 0.15, 0.1)
  lamp.range = 34
  lamp.intensity = look.lampK
  // céu aberto (Cânion): a lanterna que anda junto não aparece e custa uma luz por pixel
  if (look.lampK < 0.3) lamp.setEnabled(false)
  const fireLight = new PointLight("jt-fire", new Vector3(0, 3, 0), scene)
  fireLight.diffuse = new Color3(1, 0.5, 0.15)
  fireLight.specular = new Color3(0, 0, 0)
  fireLight.range = 9
  fireLight.intensity = 0

  const seed = mp ? mp.start.seed : ((Date.now() & 0xffffff) | 1) >>> 0
  const tunnel = buildPhaseEnv(scene, level, low, Math.ceil((fogEnd + SEG) / SEG) + 2, seed)
  // Jetpack 3.0: o teto, o chão e as laterais da caixa do voo desenhados (iguais à regra, com a pele da fase)
  const bounds = buildBoundary(scene, level, tunnel.mats.trim)
  const vfx = createJetVfx(scene, quality.tier, level)
  // Cânion: as peças esculpidas (GLB do Tripo) chegam depois e entram no cenário e nos obstáculos
  let canyonAssets: PieceAssets<string> | null = null
  let extraAssets: PieceAssets<string> | null = null
  if (level === "artico") {
    void loadIceAssets(scene, () => !disposed).then((a) => {
      if (disposed) return a.dispose()
      canyonAssets = a
      tunnel.provide?.(a)
      const ring = a.meshes.get("anel")
      if (ring) obstacles.useModel("rim", ring, { zScale: 0.35 })
      // V3 (2026-11-09): rocha, cristal, galão e moldura do Tripo (gelo2.json: medidas com 1 m de altura).
      // rocha: cobre o disco da colisão (raio 1,05 no x–y); estreitada em x e na profundidade
      const rock = a.meshes.get("rocha")
      if (rock) obstacles.useModel("rock", rock, { bake: Matrix.Scaling(2.25 / 2.9, 1, 2.2 / 4.2), upright: true })
      // cristal: 1 m de altura com a base em 0 → centrado e cobrindo o disco (2,1 de altura e de largura)
      const gem = a.meshes.get("cristal")
      if (gem) obstacles.useModel("gem", gem, { bake: Matrix.Translation(0, -0.5, 0).multiply(Matrix.Scaling(2.1 / 1.01, 2.1, 1.8 / 1.53)) })
      const can = a.meshes.get("galao")
      if (can) obstacles.useModel("can", can, { bake: Matrix.Scaling(1.15, 1.15, 1.15) })
      const tile = a.meshes.get("borda")
      const corner = a.meshes.get("canto")
      if (tile && corner) obstacles.useFrameKit(tile, corner, { len: 3.329, arm: 0.475, armLen: 0.821 })
    })
  }
  if (level === "floresta") {
    void loadForestAssets(scene, () => !disposed).then((a) => {
      if (disposed) return a.dispose()
      canyonAssets = a
      // bioluminescência: a própria textura acende (cristais, chapéus e veios claros brilham na névoa)
      for (const [name, m] of a.meshes) {
        const mat = m.material as StandardMaterial | null
        // a moldura/viga de raízes não acende (acesa, a trança vira ruído colorido); o galão tem luz própria
        if (!mat || name === "borda" || name === "canto" || name === "galao") continue
        // fica descongelado: congelado de novo antes de a peça aparecer, o shader guardaria a cor antiga
        mat.unfreeze()
        mat.emissiveTexture = mat.diffuseTexture
        mat.emissiveColor = new Color3(0.42, 0.4, 0.5)
      }
      tunnel.provide?.(a)
      // V3 (2026-11-09): galão e moldura de raízes do Tripo (floresta2.json); a viga é a mesma borda repetida
      const can = a.meshes.get("galao")
      if (can) obstacles.useModel("can", can, { bake: Matrix.Scaling(1.15, 1.15, 1.15) })
      const tile = a.meshes.get("borda")
      const corner = a.meshes.get("canto")
      if (tile && corner) obstacles.useFrameKit(tile, corner, { len: 2.578, arm: 0.437, armLen: 0.785, beam: true })
    })
    // o anel dourado do Cânion também é o da Floresta (furo de raio 1, como a regra)
    void loadPieces(scene, "/meu-mundo/jetpack/canion/", ["anel"] as const, {}, () => !disposed).then((g) => {
      if (disposed) return g.dispose()
      extraAssets = g
      const ring = g.meshes.get("anel")
      if (ring) obstacles.useModel("rim", ring, { zScale: 0.55 })
    })
  }
  if (level === "forja") {
    void loadForgeAssets(scene, () => !disposed).then((a) => {
      if (disposed) return a.dispose()
      canyonAssets = a
      tunnel.provide?.(a)
    })
    // a engrenagem esculpida da Fábrica também serve aqui (obstáculo, raio 1, de frente)
    void loadPieces(scene, "/meu-mundo/jetpack/fabrica/", ["engrenagem"] as const, {}, () => !disposed).then((g) => {
      if (disposed) return g.dispose()
      extraAssets = g
      const gear = g.meshes.get("engrenagem")
      if (gear) obstacles.useModel("gear", gear, { bake: Matrix.RotationY(Math.PI / 2).multiply(Matrix.Scaling(2, 2, 2)) })
    })
  }
  if (level === "orbital") {
    void loadOrbitalAssets(scene, () => !disposed).then((a) => {
      if (disposed) return a.dispose()
      canyonAssets = a
      tunnel.provide?.(a)
    })
  }
  if (level === "industrial") {
    void loadFactoryAssets(scene, () => !disposed).then((a) => {
      if (disposed) return a.dispose()
      canyonAssets = a
      tunnel.provide?.(a)
      // a engrenagem esculpida também vira o obstáculo: de frente para o jogador e com raio 1
      // (o modelo tem 1 m de altura e olha para x)
      const gear = a.meshes.get("engrenagem")
      if (gear) obstacles.useModel("gear", gear, { bake: Matrix.RotationY(Math.PI / 2).multiply(Matrix.Scaling(2, 2, 2)) })
    })
  }
  if (level === "canion") {
    void loadCanyonAssets(scene, () => !disposed).then((a) => {
      if (disposed) return a.dispose()
      canyonAssets = a
      tunnel.provide?.(a)
      const ring = a.meshes.get("anel")
      if (ring) obstacles.useModel("rim", ring, { zScale: 0.55 })
      const rock = a.meshes.get("rocha")
      // só balança (antes do V3 o giro do modelo era ignorado; rolando inteira, o musgo aparecia de lado)
      if (rock) obstacles.useModel("rock", rock, { upright: true })
    })
  }
  const mats = tunnel.mats
  const obstacles = buildObstacles(scene, mats, level)
  const kit = buildPackKit(scene, mats)

  // ── o jogador ──────────────────────────────────────────────────────────────
  const lib = new AvatarLibrary(scene, false, false, 24)
  const fallbackMat = new StandardMaterial("jt-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("jt-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.3
  const char = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, opts.body, null, true, opts.look ?? "")
  char.setHeight(PILOT_H)
  const pack = new PackRig(kit, char.holder, "jt-me")
  const legs: LegRig[] = [{ char, tread: 1, t: 0 }]
  const legObs = scene.onAfterAnimationsObservable.add(() => {
    for (const l of legs) applyLegs(l)
  })

  // a velocidade do voo sai do atributo VELOCIDADE do personagem (a sala manda o fator)
  const myK = mp ? (mp.start.seats.find((q) => q.slot === mp.start.me)?.k ?? 1) : 1
  const flight = new Flight(seed, myK, level)
  const audio = new JetAudio()

  const cam = new FreeCamera("jt-cam", new Vector3(0, 5, -6), scene)
  cam.inputs.clear()
  cam.minZ = 0.15
  cam.maxZ = fogEnd + 40
  cam.fov = 0.95
  scene.activeCamera = cam

  // brilho de pegar o galão (bolhas verdes que crescem e somem)
  const flashMat = new StandardMaterial("jt-flash", scene)
  flashMat.disableLighting = true
  flashMat.emissiveColor = new Color3(0.35, 1, 0.65)
  flashMat.alphaMode = Engine.ALPHA_ADD
  flashMat.disableDepthWrite = true
  flashMat.alpha = 0.7
  const flashes: { mesh: Mesh; t: number }[] = []
  for (let i = 0; i < 4; i++) {
    const m = CreateSphere(`jt-flash-${i}`, { diameter: 1, segments: 8 }, scene)
    m.material = flashMat.clone(`jt-flash-mat-${i}`)
    m.isPickable = false
    m.setEnabled(false)
    flashes.push({ mesh: m, t: 1 })
  }
  let flashNext = 0
  const flash = (x: number, y: number, z: number) => {
    const f = flashes[flashNext++ % flashes.length]
    f.t = 0
    f.mesh.position.set(x, y, z)
    f.mesh.setEnabled(true)
  }

  // ── os outros do grupo ─────────────────────────────────────────────────────
  const remotes: Remote[] = []
  if (mp) {
    for (const seat of mp.start.seats) {
      if (seat.slot === mp.start.me) continue
      const ch = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, isBody(seat.body) ? seat.body : "normal", seat.name || null, false, seat.look ?? "")
      ch.setHeight(PILOT_H)
      remotes.push({ seat, char: ch, pack: new PackRig(kit, ch.holder, `jt-r${seat.slot}`), fall: 0, vy: 0, y: TUNING.startY, lastX: 0, roll: 0, legs: { char: ch, tread: 1, t: Math.random() * 3 } })
      legs.push(remotes[remotes.length - 1].legs)
    }
  }

  // ── controles ──────────────────────────────────────────────────────────────
  const keys = { left: false, right: false, thrust: false }
  const tch = { left: false, right: false, thrust: false, steer: 0 }
  let mouse = false
  const keyOf = (code: string): keyof typeof keys | null =>
    code === "ArrowLeft" || code === "KeyA" ? "left" : code === "ArrowRight" || code === "KeyD" ? "right" : code === "Space" || code === "ArrowUp" || code === "KeyW" ? "thrust" : null
  const onDown = (e: KeyboardEvent) => {
    const k = keyOf(e.code)
    if (!k) return
    e.preventDefault()
    audio.unlock()
    keys[k] = true
  }
  const onUp = (e: KeyboardEvent) => {
    const k = keyOf(e.code)
    if (!k) return
    e.preventDefault()
    keys[k] = false
  }
  const onPd = (e: PointerEvent) => {
    audio.unlock()
    if (e.pointerType === "mouse" && e.button === 0) mouse = true
  }
  const onPu = (e: PointerEvent) => {
    if (e.pointerType === "mouse") mouse = false
  }
  const onBlur = () => {
    keys.left = keys.right = keys.thrust = false
    mouse = false
  }
  window.addEventListener("keydown", onDown)
  window.addEventListener("keyup", onUp)
  canvas.addEventListener("pointerdown", onPd)
  window.addEventListener("pointerup", onPu)
  window.addEventListener("blur", onBlur)
  const input = (): FlightInput => ({
    side: Math.max(-1, Math.min(1, (keys.right || tch.right ? 1 : 0) - (keys.left || tch.left ? 1 : 0) + tch.steer)),
    thrust: keys.thrust || tch.thrust || mouse,
  })

  // ── laço ───────────────────────────────────────────────────────────────────
  let phase: JetHud["phase"] = "countdown"
  let clock = -(mp ? Math.max(0.5, mp.start.countdown) : COUNTDOWN)
  let acc = 0
  let hudAt = 0
  let lastBeep = 99
  let readyFired = false
  let ended = false
  let endAt = 0
  const prev: { x: number; y: number; z: number } = { x: 0, y: TUNING.startY, z: 0 }
  const cur: { x: number; y: number; z: number } = { x: 0, y: TUNING.startY, z: 0 }
  let camX = 0
  let camY = TUNING.startY + 1
  let shake = 0
  let roll = 0
  let pitch = PITCH
  let fallY = 0
  let fallV = 0
  let spin = 0
  let poseAt = 0
  let hiddenAt = 0
  let crashSent = false
  let fieldAt = 0
  let field: FieldRow[] | null = null
  const events: FlightEvent[] = []
  const camTarget = new Vector3()
  const lastB = new Map<number, number>()
  const ringsPassed = new Set<number>()
  let fovKick = 0

  const notice = (n: JetNotice) => opts.onNotice?.(n)
  const handle = (e: FlightEvent) => {
    switch (e.type) {
      case "can": {
        audio.play("can")
        const c = obstacles.canAt(e.id)
        flash(c ? c.x : flight.x, c ? c.y : flight.y, c ? c.z : flight.z + 1)
        vfx.fuel(c ? c.x : flight.x, c ? c.y : flight.y, c ? c.z : flight.z + 1)
        vfx.absorb()
        notice({ kind: "can", n: e.n })
        break
      }
      case "low":
        audio.play("low")
        notice({ kind: "low" })
        break
      case "empty":
        audio.play("empty")
        notice({ kind: "empty" })
        break
      case "crash":
        audio.play("crash")
        vfx.crash(flight.x, flight.y, flight.z)
        shake = 0.8
        phase = "end"
        endAt = performance.now()
        fallY = flight.y
        fallV = Math.max(0, flight.vy) * 0.3 + 2
        sendCrash()
        try {
          navigator.vibrate?.([80, 40, 140])
        } catch {
          /* sem vibração */
        }
        break
    }
  }

  const byOf = (): JetResult["by"] => {
    const b = flight.crashedBy ?? "floor"
    return b === "floor" && flight.fuel <= 0 ? "fuel" : b
  }
  const sendCrash = () => {
    if (!mp || crashSent) return
    crashSent = true
    mp.net.sendCrash({ z: flight.z, x: flight.x, y: flight.y, s: flight.score, c: flight.cans, by: byOf() })
  }

  const buildField = (): FieldRow[] | null => {
    if (!mp || mp.start.solo) return null
    const rows: FieldRow[] = []
    for (const seat of mp.start.seats) {
      if (seat.slot === mp.start.me) {
        rows.push({ slot: seat.slot, name: opts.name || seat.name, dist: Math.floor(flight.z), score: flight.score, alive: flight.alive ? 1 : 0, me: true })
        continue
      }
      const list = mp.net.samples.get(seat.slot)
      const last = list?.[list.length - 1]
      rows.push({ slot: seat.slot, name: seat.name, dist: Math.floor(last?.z ?? 0), score: last?.score ?? 0, alive: last ? last.alive : 1, me: false })
    }
    return rows.sort((a, b) => b.score - a.score || b.dist - a.dist)
  }

  /** Onde abre a próxima passagem (anel ou janela) até 70 m: o sinal de subir/descer do HUD. */
  const cueOf = (): -1 | 0 | 1 => {
    for (const o of flight.course.obstacles) {
      if (o.z < flight.z + 3) continue
      if (o.z > flight.z + 70) break
      let cy: number
      if (o.kind === "ring") cy = ringAt(o, flight.t).y
      else if (WINDOW_KINDS.has(o.kind)) cy = windowAt(o, flight.t).cy
      else continue
      const d = cy - flight.y
      return d < -1.4 ? -1 : d > 1.4 ? 1 : 0
    }
    return 0
  }
  const pushHud = () => {
    opts.onHud?.({
      alt: Math.max(0, Math.min(1, flight.y / TUNNEL.H)),
      gap: Math.min(TUNNEL.H - (flight.y + TUNING.hy), flight.y - TUNING.hy),
      cue: phase === "run" ? cueOf() : 0,
      phase,
      countdown: Math.max(0, -clock),
      score: flight.score,
      dist: Math.floor(flight.z),
      speed: Math.round(flight.v * 3.6),
      fuel: flight.fuel / TUNING.fuelMax,
      cans: flight.cans,
      thrust: flight.thrusting,
      k: flight.k,
      field,
    })
  }

  const sampleAt = (list: PilotSample[], t: number) => {
    const last = list[list.length - 1]
    if (list.length === 1 || t >= last.t) {
      const p = list.length > 1 ? list[list.length - 2] : last
      const v = last.t > p.t ? (last.z - p.z) / (last.t - p.t) : 0
      const ahead = last.alive === 1 ? Math.min(0.4, Math.max(0, t - last.t)) : 0
      return { z: last.z + v * ahead, x: last.x, y: last.y, f: last.f, alive: last.alive }
    }
    let i = list.length - 1
    while (i > 0 && list[i - 1].t > t) i--
    const a = list[Math.max(0, i - 1)]
    const b = list[i]
    const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1
    return { z: a.z + (b.z - a.z) * u, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, f: b.f, alive: b.alive }
  }

  const drawRemotes = (dt: number, now: number, myZ: number) => {
    if (!mp) return
    const st = mp.net.serverTime()
    for (const r of remotes) {
      const list = mp.net.samples.get(r.seat.slot)
      const s = st !== null && list?.length ? sampleAt(list, st - INTERP) : null
      const show = !!s && s.alive !== 2 && Math.abs(s.z - myZ) < REMOTE_CUT
      if (!show || !s) {
        r.char.setVisible(false)
        r.pack.update(dt, now, false, false, false)
        continue
      }
      r.char.setVisible(true)
      if (s.alive === 1) {
        r.fall = 0
        r.y = s.y
        r.roll += (Math.max(-0.4, Math.min(0.4, -(s.x - r.lastX) / Math.max(dt, 1e-3) / TUNING.side) * 0.4) - r.roll) * Math.min(1, dt * 8)
        r.lastX = s.x
        r.char.place(s.x, s.z, 0, s.y - MID, 0)
        // os outros: em pé pedalando na contagem, deitados no voo (como o meu)
        const rf = phase !== "countdown"
        r.legs.t += dt
        r.legs.tread += ((rf ? 0 : 1) - r.legs.tread) * Math.min(1, dt * 3)
        tiltAroundMiddle(r.char, rf ? PITCH_FLY : PITCH_UP)
        r.char.holder.rotation.z = r.roll
        r.pack.update(dt, now, !!(s.f & FLAG.thrust), !!(s.f & FLAG.empty))
      } else {
        // bateu: cai rodando até o chão
        r.fall += dt
        r.vy -= TUNING.gravity * dt
        r.y = Math.max(0.3, r.y + r.vy * dt)
        r.char.place(s.x, s.z, 0, r.y - MID, 0)
        r.char.holder.rotation.x = PITCH + r.fall * 5
        r.pack.update(dt, now, false, true)
      }
      r.char.animate(dt, 0, 0)
    }
  }

  const frame = (ms: number) => {
    const dt = Math.min(0.1, ms / 1000)
    const now = performance.now() / 1000
    const hidden = typeof document !== "undefined" && document.hidden
    if (hidden && !hiddenAt) hiddenAt = performance.now()
    if (!hidden && hiddenAt) {
      if (mp && phase === "run" && performance.now() - hiddenAt > AWAY_MS && flight.alive) {
        flight.alive = false
        flight.crashedBy = "floor"
        handle({ type: "crash", by: "floor" })
      }
      hiddenAt = 0
    }
    const paused = hidden && !mp
    audio.suspend(paused)
    if (!paused) {
      if (phase === "countdown") {
        clock += dt
        const s = Math.ceil(-clock)
        if (s !== lastBeep && s >= 1 && s <= 3) {
          audio.play("beep")
          lastBeep = s
        }
        if (clock >= 0) {
          phase = "run"
          audio.play("go")
          notice({ kind: "go" })
        }
      } else if (phase === "run") {
        acc += dt
        while (acc >= TUNING.step && phase === "run") {
          acc -= TUNING.step
          prev.x = cur.x
          prev.y = cur.y
          prev.z = cur.z
          flight.step(input(), events)
          cur.x = flight.x
          cur.y = flight.y
          cur.z = flight.z
          for (const e of events) handle(e)
          events.length = 0
        }
      }
    }
    const f = phase === "run" ? acc / TUNING.step : 1
    const x = prev.x + (cur.x - prev.x) * f
    let y = prev.y + (cur.y - prev.y) * f
    const z = prev.z + (cur.z - prev.z) * f
    if (phase === "countdown") y = TUNING.startY + Math.sin(now * 2.2) * 0.08

    if (phase !== "end") {
      roll += (-(flight.vx / TUNING.side) * 0.42 - roll) * Math.min(1, dt * 10)
      // em pé pedalando até o voo começar de verdade (contagem e o pairar do começo); depois, deitado
      const flying = phase === "run" && flight.armed
      const wantPitch = flying ? Math.max(0.8, Math.min(1.3, PITCH_FLY - flight.vy * 0.02)) : PITCH_UP
      pitch += (wantPitch - pitch) * Math.min(1, dt * (flying ? 3.2 : 6))
      legs[0].t += dt
      legs[0].tread += ((flying ? 0 : 1) - legs[0].tread) * Math.min(1, dt * 3)
      char.place(x, z, 0, y - MID, 0)
      tiltAroundMiddle(char, pitch)
      char.holder.rotation.z = roll
      pack.update(dt, now, phase === "run" ? flight.thrusting : false, flight.fuel <= 0)
    } else {
      // bateu: o corpo gira e cai até o chão; depois de um instante, o fim
      fallV -= TUNING.gravity * 1.3 * dt
      fallY = Math.max(0.35, fallY + fallV * dt)
      if (fallY <= 0.35) fallV = 0
      spin += dt * (fallY > 0.36 ? 7 : 0)
      char.place(x, z, 0, fallY - MID * 0.4, 0)
      char.holder.rotation.x = pitch + spin
      legs[0].tread = 0
      pack.update(dt, now, false, true)
      if (!ended && performance.now() - endAt > 1300) {
        ended = true
        opts.onEnd?.({ phase: level, score: flight.score, dist: Math.floor(flight.z), cans: flight.cans, by: byOf(), time: flight.t })
        pushHud()
      }
    }
    char.animate(dt, 0, 0)
    drawRemotes(dt, now, z)

    // a luz do fogo e a lanterna que acompanha
    fireLight.position.set(x, y - 0.4, z - 0.6)
    fireLight.intensity += ((phase === "run" && flight.thrusting ? 1.4 : 0.25) * (0.85 + Math.sin(now * 40) * 0.15) - fireLight.intensity) * Math.min(1, dt * 14)
    if (phase === "end") fireLight.intensity *= 0.9
    lamp.position.set(x * 0.5, TUNNEL.H - 1.2, z + 9)

    // prensas que batem por perto: tranco na câmera e pancada
    for (const o of flight.course.obstacles) {
      if (o.z > z + 45) break
      if (o.kind !== "crusher" || o.z + o.d < z - 2) continue
      for (const half of [-1, 1] as const) {
        const key = o.id * 2 + (half > 0 ? 1 : 0)
        const b = crusherB(o, flight.t, half)
        const was = lastB.get(key)
        if (was !== undefined && was > 0.4 && b <= 0.001) {
          const k = Math.max(0, 1 - (o.z - z) / 45)
          shake = Math.max(shake, 0.25 * k)
          if (k > 0.3) audio.play("slam")
        }
        lastB.set(key, b)
      }
    }
    if (lastB.size > 64) lastB.clear()

    // câmera atrás e um pouco acima; tela em pé recua mais
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
    const tall = Math.min(1, Math.max(0, (1 - aspect) / 0.55))
    camX += (x * 0.62 - camX) * Math.min(1, dt * 5)
    const cp = look.cam
    // a câmera fica SEMPRE abaixo do teto (antes chegava a 10,5–11 m, acima do limite de 8 m, e o teto não
    // aparecia nunca); o `maxY` da fase só pode baixar este teto
    const wantY = Math.max(1.3, Math.min(Math.min(cp ? cp.maxY : 99, TUNNEL.H - 0.85), y + 1.15 + tall * 0.3 + (cp?.up ?? 0)))
    camY += (wantY - camY) * Math.min(1, dt * 5)
    if (shake > 0) shake = Math.max(0, shake - dt)
    const jit = shake * 0.32
    const pace = Math.min(1, Math.max(0, (flight.v / flight.k - TUNING.v0) / (TUNING.vMax - TUNING.v0)))
    cam.position.set(camX + (Math.random() - 0.5) * jit, camY + (Math.random() - 0.5) * jit, z - 5.6 - tall * 1.6 - pace * 0.6 - (cp?.back ?? 0))
    camTarget.set(x * 0.82, y + 0.1 - (cp?.down ?? 0), z + (cp?.ahead ?? 14))
    cam.setTarget(camTarget)
    fovKick = Math.max(0, fovKick - dt * 0.12)
    const wantFov = 0.92 + pace * 0.28 + tall * 0.12 + fovKick
    cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 3)

    tunnel.update(z, flight.course.sets, now)
    bounds.update(z, y)
    vfx.update(x, y, z, phase === "run" && flight.thrusting, flight.v)
    // anel atravessado: aro de faíscas e um empurrão no campo de visão (só desenho; não vale ponto)
    if (phase === "run" && flight.alive) {
      for (const o of flight.course.obstacles) {
        if (o.z > z + 2) break
        if (o.kind !== "ring" || ringsPassed.has(o.id)) continue
        if (o.z + o.d / 2 <= z) {
          ringsPassed.add(o.id)
          const rc = ringAt(o, flight.t)
          vfx.ring(rc.x, rc.y, o.z + o.d / 2, rc.r)
          fovKick = 0.07
          audio.play("can")
        }
      }
      if (ringsPassed.size > 64) ringsPassed.clear()
    }
    obstacles.sync(flight, z - 9, z + fogEnd + 12, now)
    vfx.cans(obstacles.canPoints())
    for (const fl of flashes) {
      if (fl.t >= 1) continue
      fl.t = Math.min(1, fl.t + dt * 3.2)
      fl.mesh.scaling.setAll(0.6 + fl.t * 2.2)
      ;(fl.mesh.material as StandardMaterial).alpha = 0.7 * (1 - fl.t)
      if (fl.t >= 1) fl.mesh.setEnabled(false)
    }

    if (mp && phase === "run" && flight.alive) {
      poseAt -= dt
      if (poseAt <= 0) {
        poseAt = POSE_EVERY
        mp.net.sendPose({ z: flight.z, x: flight.x, y: flight.y, f: (flight.thrusting ? FLAG.thrust : 0) | (flight.fuel <= 0 ? FLAG.empty : 0), s: flight.score, c: flight.cans })
      }
    }
    if (mp) {
      fieldAt -= dt
      if (fieldAt <= 0) {
        fieldAt = 0.25
        field = buildField()
      }
    }
    audio.engine(flight.thrusting, pace, phase === "run")
    hudAt -= dt
    if (hudAt <= 0) {
      hudAt = 0.08
      pushHud()
    }
    governor.tick(ms)
  }

  // pronto: o primeiro quadro com o túnel (o avatar chega quando carregar)
  const fire = () => {
    if (disposed || readyFired) return
    readyFired = true
    opts.onReady?.()
    pushHud()
  }
  scene.executeWhenReady(fire)
  setTimeout(fire, 2500)

  const perf = createPerfProbe(scene, engine, canvas.parentElement)
  const lost = engine.onContextLostObservable.add(() => opts.onError?.("context-lost"))
  let lastFrame = performance.now()
  engine.runRenderLoop(() => {
    if (disposed) return
    const t = performance.now()
    if (capMs && t - lastFrame < capMs - 3) return
    const ms = t - lastFrame
    lastFrame = t
    frame(ms)
    scene.render()
  })
  const ro = new ResizeObserver(() => {
    if (!disposed) engine.resize()
  })
  ro.observe(canvas)

  // conferência (harness)
  const w = window as unknown as Record<string, unknown>
  w.__jetpack = () => ({ phase, level, pitch, holderRx: char.holder.rotation.x, armed: flight.armed, z: flight.z, x: flight.x, y: flight.y, v: flight.v, vMax: speedAt(1e9, flight.k), k: flight.k, fuel: flight.fuel, cans: flight.cans, score: flight.score, alive: flight.alive, by: flight.crashedBy, obstacles: flight.course.obstacles.length })
  w.__jetpackFlight = flight
  w.__jetpackScene = scene
  w.__jetPerf = () => perf.sample()

  return {
    setTouch(t) {
      audio.unlock()
      if (t.left !== undefined) tch.left = t.left
      if (t.right !== undefined) tch.right = t.right
      if (t.thrust !== undefined) tch.thrust = t.thrust
      if (t.steer !== undefined) tch.steer = Math.max(-1, Math.min(1, t.steer))
    },
    setMuted(m) {
      audio.setEnabled(!m)
    },
    dispose() {
      if (disposed) return
      disposed = true
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
      canvas.removeEventListener("pointerdown", onPd)
      window.removeEventListener("pointerup", onPu)
      window.removeEventListener("blur", onBlur)
      ro.disconnect()
      delete w.__jetpack
      delete w.__jetpackFlight
      delete w.__jetpackScene
      delete w.__jetPerf
      perf.dispose()
      engine.onContextLostObservable.remove(lost)
      scene.onAfterAnimationsObservable.remove(legObs)
      engine.stopRenderLoop()
      audio.dispose()
      vfx.dispose()
      canyonAssets?.dispose()
      extraAssets?.dispose()
      pack.dispose()
      char.dispose()
      for (const r of remotes) {
        r.pack.dispose()
        r.char.dispose()
      }
      lib.dispose()
      kit.dispose()
      obstacles.dispose()
      tunnel.dispose()
      bounds.dispose()
      for (const fl of flashes) {
        fl.mesh.material?.dispose()
        fl.mesh.dispose()
      }
      flashMat.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      cam.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
}
