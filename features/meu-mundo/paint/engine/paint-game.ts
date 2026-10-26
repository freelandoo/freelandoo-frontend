// features/meu-mundo/paint/engine/paint-game.ts — PAINT (mm3d-35): a cena.
//
// Cena própria (como o hospital): motor Babylon, céu claro e névoa, o mundo
// das ilhas, a tinta, gatinhos e cápsulas, o avatar de quem joga com a arma,
// a câmera de mira e os controles. A PARTIDA vem de uma porta (port.ts):
// treino no aparelho ou sala multiplayer — a cena é a mesma.
//
// O movimento é deste aparelho (sim/body.ts em passos de 1/60 s, desenho
// interpolado). Os tiros saem da arma em direção ao ponto que a mira acerta;
// o que eles viram (tinta, dano, respingo) volta pelos acontecimentos.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Character } from "../../engine/player"
import { AvatarLibrary } from "../../engine/avatars"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, resolveQuality } from "../../engine/quality"
import type { BodyId } from "../../types"
import { PAINT_COLORS, TUNING, type PaintColor } from "../sim/tuning"
import { newBody, stepBody, knockBody, liftOnto, type BodyMove, type PaintBody } from "../sim/body"
import { rayBody, supportAt, supportIndex } from "../sim/collide"
import { muzzleOf } from "../sim/paint"
import type { MatchEvent, MatchResult, PaintPose } from "../sim/match"
import type { Solid } from "../sim/map"
import { buildPaintWorld } from "./world-view"
import { PaintView } from "./paint-view"
import { PickupsView } from "./pickups-view"
import { CatHerd } from "./cat-herd"
import { AimCamera } from "./aim-camera"
import { PaintGun } from "./gun"
import { attachPaintInput, clearPaintInput, createPaintInput, createReticle, paintMoveAxis, paintWantsRun, type PaintInput } from "./paint-input"
import type { PaintPort, RemoteSample } from "./port"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"

/** O que a interface mostra (atualizado ~10×/s e a cada acontecimento). */
export interface PaintHud {
  phase: "countdown" | "play" | "end"
  /** s até o "vai" (contagem) ou até o fim (partida). */
  countdown: number
  timeLeft: number
  hp: number
  ammo: [number, number, number]
  color: PaintColor
  firing: PaintColor | null
  myTeam: number
  teams: number
  teamCats: [number, number]
  myCats: number
  portalOpen: boolean
  inBoss: boolean
  bossHp: number
  dmg: number
  /** s de nocaute que faltam (0 = de pé). */
  ko: number
  result: MatchResult | null
}

/** Avisos para a interface (texto, som, vibração). */
export type PaintNotice =
  | { kind: "cat"; mine: boolean; team: number }
  | { kind: "capsule"; c: PaintColor }
  | { kind: "empty"; c: PaintColor }
  | { kind: "hurt"; how: "harm" | "punch" }
  | { kind: "hitOther" }
  | { kind: "ko" }
  | { kind: "portal"; team: number; mine: boolean }
  | { kind: "boss"; dmg: number }
  | { kind: "enterBoss" }
  | { kind: "fell" }
  /** Roubo de gatinhos no nocaute (ganhei ou perdi `n`). */
  | { kind: "steal"; gained: boolean; n: number }
  | { kind: "end" }

export interface PaintGameOptions {
  canvas: HTMLCanvasElement
  port: PaintPort
  body: BodyId
  /** Celular (sem trava de mouse; botões na tela). */
  touch: boolean
  maxPixelRatio?: number
  onReady?: () => void
  onHud?: (h: PaintHud) => void
  onNotice?: (n: PaintNotice) => void
  onError?: (reason: "context-lost") => void
}

export interface PaintGameHandle {
  input: PaintInput
  setJoystick: (x: number, y: number) => void
  /** Botão de cor do celular: apertado = atira essa cor. */
  setFiring: (c: PaintColor | null) => void
  selectColor: (c: PaintColor) => void
  jump: () => void
  punch: () => void
  setBlocked: (blocked: boolean) => void
  dispose: () => void
}

const STEP = TUNING.step
/** Depois de atirar, o corpo continua virado para a mira por este tempo (s). */
const AIM_HOLD = 0.9

export function createPaintGame(opts: PaintGameOptions): PaintGameHandle {
  const { canvas, port } = opts
  const engine = new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const lowEnd = quality.tier === "low"
  const governor = new ResolutionGovernor(engine, quality, Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 1.5))

  const scene = new Scene(engine)
  const sky = new Color4(0.9, 0.93, 0.96, 1)
  scene.clearColor = sky
  scene.ambientColor = new Color3(0.3, 0.3, 0.3)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(sky.r, sky.g, sky.b)
  scene.fogStart = lowEnd ? 55 : 75
  scene.fogEnd = lowEnd ? 170 : 230
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("paint-hemi", new Vector3(0.15, 1, -0.1), scene)
  hemi.intensity = 0.78
  hemi.diffuse = new Color3(1, 0.99, 0.97)
  hemi.groundColor = new Color3(0.78, 0.72, 0.64)
  const sun = new DirectionalLight("paint-sun", new Vector3(-0.45, -1, 0.35), scene)
  sun.intensity = 0.85
  sun.diffuse = new Color3(1, 0.96, 0.9)

  const state = port.state
  const map = state.map
  // Câmera colide com a PEDRA DESENHADA (mais funda que a colisão do corpo),
  // senão ela entra embaixo das ilhas; a tinta entra por cima.
  const camRock: Solid[] = map.islands.map((i) => ({ k: 0, x: i.x, z: i.z, y0: i.y - i.depth * 0.8, y1: i.y, r: i.r * 0.92 }))
  let camSolids: Solid[] = camRock
  let camFrom: Solid[] | null = null
  const world = buildPaintWorld(scene, map, lowEnd)
  const paint = new PaintView(scene, lowEnd)
  const pickups = new PickupsView(scene, map.capsules)
  // Gatinhos leves (mm3d-35g): no mapa e em fila atrás de quem pegou.
  const herd = new CatHerd(scene, map.cats)
  // O que já estava no mundo ao entrar (rede: gatinhos pegos, cápsulas fora, tinta).
  for (const id of state.catsTaken.keys()) herd.take(id, true)
  for (const id of state.capsuleBack.keys()) pickups.setCapsule(id, false)
  for (const b of state.blobs.values()) paint.add(b.id, b.blob)
  state.portalOpen.forEach((open, t) => world.setPortalOpen(t, open))

  const lib = new AvatarLibrary(scene, false, false, 24, true)
  const fallbackMat = new StandardMaterial("paint-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("paint-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.2
  const mats = { fallback: fallbackMat, shadow: shadowMat }
  const char = new Character(scene, lib, mats, opts.body, null, true)
  const gun = new PaintGun(scene)
  // Ao lado do peito, apontando para a frente (a pose de mira com a mão vem com as animações do Paint).
  gun.root.parent = char.holder
  gun.root.position.set(0.3, 1.12, 0.32)

  const me = state.players.get(port.me)!
  const body: PaintBody = newBody(me.pose.x, me.pose.y, me.pose.z, me.pose.facing)
  let epoch = me.epoch
  let prev = { x: body.x, y: body.y, z: body.z }
  let move: BodyMove = 0
  let visualFacing = body.facing
  let aimHold = 0
  let acc = 0
  let shotSeq = 0
  const nextFire: [number, number, number] = [0, 0, 0]
  let emptyAt = -10
  let clock = 0
  let lunge = 0
  /** Para onde o corpo fica virado enquanto mira (o último tiro). */
  let aimYaw = 0
  /** Velocidade de saída do último pulo (a fase do voo da animação). */
  let launchV: number = TUNING.jumpV
  let wasGround = true
  let reticleColor = -1
  let shotAt = -10
  /** Nocaute visto (o renascimento depois dele não é "caiu"). */
  let knocked = false

  const cam = new AimCamera(scene)
  scene.activeCamera = cam.camera
  cam.snap(body.facing)

  const input = createPaintInput()
  // A mira do PC (o cursor vira a mira): desenhada por cima do canvas, colada no mouse.
  const reticle = canvas.parentElement ? createReticle(canvas.parentElement) : null
  const detachInput = attachPaintInput(canvas, input, reticle)

  const posePacket = (): PaintPose => ({ x: body.x, y: body.y, z: body.z, facing: body.facing, ground: body.ground, gy: body.gy, e: epoch })

  // ── acontecimentos ─────────────────────────────────────────────────────────
  const notice = (n: PaintNotice) => opts.onNotice?.(n)
  const handle = (e: MatchEvent) => {
    switch (e.type) {
      case "blob":
        if (e.q && paint.has(-e.q)) {
          // a prevista virou a da sala (sem nascer de novo)
          paint.rename(-e.q, e.id, e.blob)
        } else {
          paint.add(e.id, e.blob)
          if (e.owner === port.me) liftOnto(body, e.blob.x, e.blob.z, e.blob.r, e.blob.y1)
        }
        break
      case "unblob":
        paint.remove(e.id)
        break
      case "shot":
        if (e.slot !== port.me) {
          paint.bolt(e.o, e.to, e.c)
          const r = remotes.get(e.slot)
          if (r) {
            r.shotAt = clock
            r.gun.setColor(e.c)
          }
        }
        break
      case "splat":
        paint.splat(e.point, e.normal)
        break
      case "steal":
        if (e.to === port.me) notice({ kind: "steal", gained: true, n: e.n })
        else if (e.from === port.me) notice({ kind: "steal", gained: false, n: e.n })
        break
      case "hit":
        if (e.how === "harm") bleed(e.slot, false)
        if (e.slot === port.me) {
          knockBody(body, e.kx, e.ky, e.kz)
          notice({ kind: "hurt", how: e.how })
        } else if (e.by === port.me) notice({ kind: "hitOther" })
        break
      case "ko":
        bleed(e.slot, true)
        if (e.slot === port.me) {
          knocked = true
          notice({ kind: "ko" })
        }
        break
      case "respawn":
        if (e.slot === port.me) {
          const fell = !knocked && !e.inBoss
          knocked = false
          Object.assign(body, newBody(e.x, e.y, e.z, e.facing))
          prev = { x: body.x, y: body.y, z: body.z }
          epoch = e.e
          cam.snap(e.facing)
          visualFacing = e.facing
          if (e.inBoss && me.inBoss) notice({ kind: "enterBoss" })
          else if (fell) notice({ kind: "fell" })
        }
        break
      case "fix":
        if (e.slot === port.me) {
          body.x = e.pose.x
          body.y = e.pose.y
          body.z = e.pose.z
          body.vx = body.vy = body.vz = 0
          prev = { x: body.x, y: body.y, z: body.z }
        }
        break
      case "cat":
        herd.take(e.id)
        notice({ kind: "cat", mine: e.slot === port.me, team: e.team })
        break
      case "capsule":
        pickups.setCapsule(e.id, false)
        if (e.slot === port.me) notice({ kind: "capsule", c: e.c })
        break
      case "capsuleBack":
        pickups.setCapsule(e.id, true)
        break
      case "portal":
        world.setPortalOpen(e.team, true)
        notice({ kind: "portal", team: e.team, mine: e.team === me.team })
        break
      case "boss":
        if (e.slot === port.me) notice({ kind: "boss", dmg: e.dmg })
        world.setBossAlive(e.hp > 0)
        break
      case "punch":
        if (e.slot !== port.me) remotes.get(e.slot)?.char.punch()
        break
      case "deny":
        if (e.slot === port.me && port.predicts) paint.remove(-e.q, true)
        break
      case "end":
        notice({ kind: "end" })
        break
    }
  }

  /** Sangue em quem levou o vermelho (eu ou outro jogador). */
  const bleed = (slot: number, big: boolean) => {
    const p = slot === port.me ? { x: body.x, y: body.y, z: body.z } : state.players.get(slot)?.pose
    if (!p) return
    const ground = supportAt(state.solids(), p.x, p.z, p.y + 0.1)
    paint.blood({ x: p.x, y: p.y + 1.15, z: p.z }, ground, big)
  }

  // ── tiro e soco ────────────────────────────────────────────────────────────
  const bodiesRay = (o: { x: number; y: number; z: number }, d: { x: number; y: number; z: number }, maxT: number) => {
    let best: number | null = null
    for (const p of state.players.values()) {
      if (p.slot === port.me || p.ko || p.inBoss !== me.inBoss) continue
      const t = rayBody(o, d, p.pose, TUNING.hitR, TUNING.bodyH, best ?? maxT)
      if (t !== null) best = t
    }
    if (me.inBoss && state.bossAlive()) {
      const b = state.bossBody()
      const t = rayBody(o, d, b, b.r, b.h, best ?? maxT)
      if (t !== null) best = t
    }
    return best
  }

  const tryFire = (c: PaintColor) => {
    if (state.phase !== "play" || me.ko) return
    if (clock < nextFire[c]) return
    if (me.ammo[c] < TUNING.cost[c]) {
      if (clock - emptyAt > 0.8) {
        emptyAt = clock
        notice({ kind: "empty", c })
      }
      return
    }
    nextFire[c] = clock + 1 / TUNING.fireRate[c]
    // a mira é o ponto da tela (cursor/dedo); o corpo vira para ele antes de atirar
    const at = cam.aimPointAt(input.aimX, input.aimY, state.solids(), bodiesRay)
    const dxz = Math.hypot(at.x - body.x, at.z - body.z)
    aimYaw = dxz > 0.4 ? Math.atan2(at.x - body.x, at.z - body.z) : cam.yaw
    body.facing = aimYaw
    aimHold = AIM_HOLD
    shotAt = clock
    port.pose(posePacket())
    const o = muzzleOf(body, body.facing)
    const dir = { x: at.x - o.x, y: at.y - o.y, z: at.z - o.z }
    if (Math.hypot(dir.x, dir.y, dir.z) < 0.05) return
    shotSeq++
    paint.bolt(o, at, c)
    gun.fired()
    port.fire(c, o, dir, shotSeq)
  }

  const doPunch = () => {
    if (state.phase !== "play" || me.ko) return
    aimYaw = cam.yaw
    body.facing = aimYaw
    aimHold = AIM_HOLD
    lunge = 1
    char.punch()
    port.pose(posePacket())
    port.punch()
  }

  // Marcador da mira no mundo (PC): onde o tiro bate, na cor escolhida.
  const aimMarkMat = new StandardMaterial("paint-aim-mark", scene)
  aimMarkMat.disableLighting = true
  aimMarkMat.alpha = 0.85
  const aimMark = CreateSphere("paint-aim-mark", { diameter: 0.22, segments: 8 }, scene)
  aimMark.material = aimMarkMat
  aimMark.isPickable = false
  aimMark.renderingGroupId = 1
  aimMark.setEnabled(false)

  /** A arma entre as mãos (o cabo na direita, o cano para a esquerda). */
  const holdGun = (c: Character, g: PaintGun, facing: number) => {
    const rh = c.bonePosition("mixamorig:RightHand")
    const lh = c.bonePosition("mixamorig:LeftHand")
    if (!rh || !lh) return g.unmount(c.holder)
    g.mount(rh, lh, new Vector3(Math.sin(facing), 0, Math.cos(facing)))
  }

  // ── outros jogadores (rede) ─────────────────────────────────────────────────
  const ringMats = [new Color3(0.9, 0.75, 0.44), new Color3(0.88, 0.16, 0.29)].map((c, i) => {
    const m = new StandardMaterial(`paint-team-ring-${i}`, scene)
    m.emissiveColor = c
    m.diffuseColor = c
    m.disableLighting = true
    return m
  })
  interface Remote {
    char: Character
    gun: PaintGun
    ring: Mesh
    x: number
    z: number
    speed: number
    vx: number
    vz: number
    shotAt: number
    y: number
    vy: number
    air: boolean
    v0: number
  }
  const remotes = new Map<number, Remote>()
  const DELAY = 120
  const sampleAt = (list: RemoteSample[] | undefined, now: number) => {
    if (!list || !list.length) return null
    const t = now - DELAY
    let i = list.length - 1
    while (i > 0 && list[i - 1].t > t) i--
    const b = list[i]
    const a = list[i - 1]
    if (!a || t >= b.t) return b
    const k = Math.max(0, Math.min(1, (t - a.t) / Math.max(1, b.t - a.t)))
    let df = b.f - a.f
    df = Math.atan2(Math.sin(df), Math.cos(df))
    return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, f: a.f + df * k, g: b.g }
  }
  const tickRemotes = (dt: number, solids: Solid[]) => {
    const now = performance.now()
    for (const p of state.players.values()) {
      if (p.slot === port.me) continue
      let r = remotes.get(p.slot)
      if (!r) {
        const info = port.info(p.slot)
        if (!info) continue
        const c = new Character(scene, lib, mats, info.body, info.name, false)
        const g = new PaintGun(scene)
        g.root.parent = c.holder
        g.root.position.set(0.3, 1.12, 0.32)
        const ring = CreateTorus(`paint-ring-${p.slot}`, { diameter: 1.05, thickness: 0.06, tessellation: 24 }, scene)
        ring.parent = c.holder
        ring.position.y = 0.06
        ring.isPickable = false
        ring.material = ringMats[p.team === me.team ? 0 : 1]
        r = { char: c, gun: g, ring, x: p.pose.x, z: p.pose.z, speed: 0, vx: 0, vz: 0, shotAt: -10, y: p.pose.y, vy: 0, air: false, v0: 7 }
        remotes.set(p.slot, r)
      }
      const s = sampleAt(port.samples?.get(p.slot), now) ?? { x: p.pose.x, y: p.pose.y, z: p.pose.z, f: p.pose.facing, g: p.pose.ground }
      const seen = p.online && p.inBoss === me.inBoss && (!p.ko || Math.floor(clock * 8) % 2 === 0)
      r.char.holder.setEnabled(seen)
      if (!seen) continue
      const kk = 1 - Math.exp(-10 * dt)
      const ivx = (s.x - r.x) / Math.max(dt, 1e-3)
      const ivz = (s.z - r.z) / Math.max(dt, 1e-3)
      r.vx += (Math.max(-12, Math.min(12, ivx)) - r.vx) * kk
      r.vz += (Math.max(-12, Math.min(12, ivz)) - r.vz) * kk
      r.speed = Math.hypot(r.vx, r.vz)
      r.x = s.x
      r.z = s.z
      r.char.place(s.x, s.z, s.f, s.y, supportAt(solids, s.x, s.z, s.y + 0.05))
      // pulo dos outros: saiu do chão = 1º pulo; no ar voltou a subir = 2º
      const vy = (s.y - r.y) / Math.max(dt, 1e-3)
      if (!s.g && !r.air) {
        r.char.jump(0)
        // saiu do chão de cima de uma cama elástica: ela afunda na tela de quem vê
        const pi = supportIndex(solids, s.x, s.z, s.y + 0.6)
        const pad = pi >= 0 ? solids[pi] : null
        if (pad && pad.k === 0 && pad.c === 2 && pad.b !== undefined && vy > 9) paint.squash(pad.b)
      }
      else if (!s.g && r.air && r.vy < 0 && vy > 3) r.char.jump(2)
      if (!s.g && !r.air) r.v0 = Math.max(4, vy)
      else if (!s.g && r.air && r.vy < 0 && vy > 3) r.v0 = Math.max(4, vy)
      r.air = !s.g
      r.vy += (vy - r.vy) * 0.5
      r.y = s.y
      if (!s.g) r.char.setAirPhase((r.v0 - r.vy) / (2 * r.v0))
      r.char.setAir(!s.g)
      const fx = Math.sin(s.f)
      const fz = Math.cos(s.f)
      r.char.setPaintMove(r.vx * fx + r.vz * fz, r.vx * fz - r.vz * fx, clock - r.shotAt < 0.35)
      r.char.animate(dt, !s.g ? 0 : r.speed > 5.5 ? 2 : r.speed > 0.35 ? 1 : 0, r.speed)
      holdGun(r.char, r.gun, s.f)
      r.gun.tick(dt, 0.25)
      herd.follow(p.slot, dt, s.x, s.y, s.z, s.g, p.ko || !p.online ? 0 : p.cats, s.f)
    }
    for (const [slot, r] of remotes) {
      if (state.players.has(slot)) continue
      r.char.dispose()
      r.gun.dispose()
      r.ring.dispose()
      herd.drop(slot)
      remotes.delete(slot)
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  let hudAt = 0
  const hud = (): PaintHud => ({
    phase: state.phase,
    countdown: Math.max(0, -state.time),
    timeLeft: Math.max(0, TUNING.matchTime - Math.max(0, state.time)),
    hp: me.hp,
    ammo: [me.ammo[0], me.ammo[1], me.ammo[2]],
    color: input.color,
    firing: input.firing ? input.color : null,
    myTeam: me.team,
    teams: port.mode === "solo" ? 1 : 2,
    teamCats: [state.teamCats[0], state.teamCats[1]],
    myCats: me.cats,
    portalOpen: state.portalOpen[me.team],
    inBoss: me.inBoss,
    bossHp: state.bossHp,
    dmg: me.dmg,
    ko: me.ko ? Math.max(0, me.ko - state.time) : 0,
    result: state.result,
  })

  // ── laço ───────────────────────────────────────────────────────────────────
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1)
    clock += dt
    if (!input.blocked && (input.lookDX || input.lookDY)) {
      cam.look(input.lookDX, input.lookDY, opts.touch ? 0.0042 : 0.0034)
    }
    // cursor na borda da tela: a câmera gira para aquele lado (PC)
    if (!input.blocked && input.edge) cam.look(input.edge * 1100 * dt, 0, 0.0024)
    input.lookDX = 0
    input.lookDY = 0

    const canMove = state.phase === "play" && !me.ko && !input.blocked
    const axis = canMove ? paintMoveAxis(input) : { x: 0, y: 0 }
    const f = { x: Math.sin(cam.yaw), z: Math.cos(cam.yaw) }
    const r = cam.right()
    const intent = {
      mx: r.x * axis.x + f.x * axis.y,
      mz: r.z * axis.x + f.z * axis.y,
      run: paintWantsRun(input),
      jump: false,
    }
    let jump = canMove && input.jumpQueued
    input.jumpQueued = false
    acc += dt
    let n = 0
    const solids = state.solids()
    while (acc >= STEP && n < 8) {
      acc -= STEP
      n++
      prev = { x: body.x, y: body.y, z: body.z }
      const facingBefore = body.facing
      const jumpsBefore = body.jumps
      move = stepBody(body, { ...intent, jump }, solids)
      if (body.bounce !== null) {
        // cama elástica: a bolha afunda e o corpo sai no pulo
        paint.squash(body.bounce)
        char.jump(0)
        launchV = body.vy
      } else if (body.jumps > jumpsBefore) {
        launchV = body.vy
        const fx = Math.sin(body.facing)
        const fz = Math.cos(body.facing)
        const side = Math.abs(body.vx * fz - body.vz * fx)
        const fwd = Math.abs(body.vx * fx + body.vz * fz)
        // 1º pulo deixa jumps = 1; o pulo no ar deixa jumps = maxJumps
        char.jump(body.jumps >= TUNING.maxJumps ? 2 : side > 1.2 && side > fwd * 1.2 ? 1 : 0)
      }
      jump = false
      if (aimHold > 0) body.facing = facingBefore
      // saiu do chão sem pular (andou para fora da borda): pose de queda
      if (wasGround && !body.ground && body.bounce === null && body.jumps === jumpsBefore) {
        char.jump(0)
        launchV = TUNING.jumpV
      }
      wasGround = body.ground
    }
    if (!body.ground) char.setAirPhase((launchV - body.vy) / (2 * Math.max(1, launchV)))
    if (n === 8) acc = 0
    if (aimHold > 0) {
      aimHold -= dt
      body.facing = aimYaw
    }

    // PC (mm3d-35c): a mira segue o cursor o tempo todo, atirando ou não — o
    // corpo vira para onde ele aponta e o marcador mostra onde o tiro bate.
    if (input.mouseAim && canMove && input.aimX !== null) {
      const at = cam.aimPointAt(input.aimX, input.aimY, solids, bodiesRay)
      if (Math.hypot(at.x - body.x, at.z - body.z) > 0.4) {
        aimYaw = Math.atan2(at.x - body.x, at.z - body.z)
        aimHold = Math.max(aimHold, 0.15)
        body.facing = aimYaw
      }
      aimMark.position.set(at.x, at.y, at.z)
      aimMark.setEnabled(true)
    } else aimMark.setEnabled(false)
    aimMarkMat.emissiveColor = Color3.FromHexString(PAINT_COLORS[input.color])
    if (reticleColor !== input.color) {
      reticleColor = input.color
      reticle?.setColor(PAINT_COLORS[input.color])
    }

    // tiro (segurando o mouse / o dedo parado, ou um toque rápido) e soco
    if (gun.current !== input.color) gun.setColor(input.color)
    if (canMove && (input.firing || input.tapQueued)) tryFire(input.color)
    input.tapQueued = false
    if (input.punchQueued) {
      input.punchQueued = false
      if (canMove) doPunch()
    }

    port.pose(posePacket())
    for (const e of port.tick(dt)) handle(e)

    // desenho (interpolado entre os dois últimos passos)
    const a = Math.min(1, acc / STEP)
    const x = prev.x + (body.x - prev.x) * a
    const y = prev.y + (body.y - prev.y) * a
    const z = prev.z + (body.z - prev.z) * a
    let d = body.facing - visualFacing
    d = Math.atan2(Math.sin(d), Math.cos(d))
    visualFacing += d * (1 - Math.exp(-(aimHold > 0 ? 22 : 12) * dt))
    lunge = Math.max(0, lunge - dt * 5)
    const lx = Math.sin(visualFacing) * Math.sin(lunge * Math.PI) * 0.25
    const lz = Math.cos(visualFacing) * Math.sin(lunge * Math.PI) * 0.25
    const ground = supportAt(solids, x, z, y + 0.05)
    char.place(x + lx, z + lz, visualFacing, y, ground)
    const hs = Math.hypot(body.vx, body.vz)
    char.setAir(move === 5 && !me.ko)
    {
      const fx = Math.sin(visualFacing)
      const fz = Math.cos(visualFacing)
      char.setPaintMove(body.vx * fx + body.vz * fz, body.vx * fz - body.vz * fx, clock - shotAt < 0.35)
    }
    char.animate(dt, me.ko ? 0 : move === 5 ? 0 : move, hs)
    char.holder.setEnabled(!me.ko || Math.floor(clock * 8) % 2 === 0)
    holdGun(char, gun, visualFacing)
    gun.tick(dt, aimHold > 0 ? cam.pitch * 0.85 : 0.25)

    if (camFrom !== solids) {
      camFrom = solids
      camSolids = camRock.concat(solids.slice(map.solids.length))
    }
    cam.update(dt, x, y, z, camSolids)
    if (port.samples) tickRemotes(dt, solids)
    world.tick(dt)
    paint.tick(dt)
    pickups.tick(dt)
    herd.follow(port.me, dt, x, y, z, body.ground, me.ko ? 0 : me.cats, visualFacing)
    herd.tick(dt, cam.camera)
    governor.tick(engine.getDeltaTime())

    hudAt -= dt
    if (hudAt <= 0) {
      hudAt = 0.1
      opts.onHud?.(hud())
    }
  })

  scene.executeWhenReady(() => {
    if (!disposed) {
      opts.onReady?.()
      opts.onHud?.(hud())
    }
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

  // conferência (harness)
  const w = window as unknown as Record<string, unknown>
  w.__paint = () => ({
    x: body.x,
    y: body.y,
    z: body.z,
    ground: body.ground,
    facing: body.facing,
    yaw: cam.yaw,
    pitch: cam.pitch,
    blobs: paint.count,
    blobIds: paint.ids(),
    color: input.color,
    firing: input.firing,
    aim: [input.aimX, input.aimY],
    hp: me.hp,
    ammo: [...me.ammo],
    cats: me.cats,
    teamCats: [...state.teamCats],
    phase: state.phase,
    time: state.time,
    inBoss: me.inBoss,
    fps: engine.getFps(),
  })
  w.__paintTp = (x: number, y: number, z: number, facing = 0) => {
    Object.assign(body, newBody(x, y, z, facing))
    me.pose = { ...me.pose, x, y, z, facing, gy: y }
    prev = { x, y, z }
    cam.snap(facing)
  }
  w.__paintLook = (yaw: number, pitch: number) => {
    cam.yaw = yaw
    cam.pitch = pitch
  }
  w.__paintState = () => state
  w.__paintFire = (c: PaintColor | null) => {
    input.firing = c !== null
    if (c !== null) input.color = c
  }
  w.__paintAim = (x: number | null, y: number | null) => {
    input.aimX = x
    input.aimY = y
  }

  return {
    input,
    setJoystick(x, y) {
      input.joyX = x
      input.joyY = y
    },
    setFiring(c) {
      input.firing = c !== null
      if (c !== null) input.color = c
    },
    selectColor(c) {
      input.color = c
    },
    jump() {
      input.jumpQueued = true
    },
    punch() {
      input.punchQueued = true
    },
    setBlocked(blocked) {
      input.blocked = blocked
      clearPaintInput(input)
    },
    dispose() {
      if (disposed) return
      disposed = true
      engine.stopRenderLoop()
      detachInput()
      reticle?.dispose()
      ro.disconnect()
      engine.onContextLostObservable.remove(lost)
      for (const k of ["__paint", "__paintTp", "__paintLook", "__paintState", "__paintFire", "__paintAim"]) delete w[k]
      gun.dispose()
      char.dispose()
      for (const r of remotes.values()) {
        r.char.dispose()
        r.gun.dispose()
        r.ring.dispose()
      }
      for (const m of ringMats) m.dispose()
      aimMark.dispose()
      aimMarkMat.dispose()
      lib.dispose()
      pickups.dispose()
      herd.dispose()
      paint.dispose()
      world.dispose()
      cam.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      scene.dispose()
      engine.dispose()
      port.dispose()
      unlive()
    },
  }
}
