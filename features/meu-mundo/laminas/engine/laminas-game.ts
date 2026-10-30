// features/meu-mundo/laminas/engine/laminas-game.ts — ARENA DAS LÂMINAS (mm3d-48a): a cena.
//
// O jogador com a espada (presa ao osso da mão direita) contra a máquina. A
// regra é sim/fight.ts, em passo fixo de 1/60 s com relógio próprio (a sobra
// do quadro acumula — regra da Gincana mm3d-47c). Aqui:
//  - animações PROVISÓRIAS do boxe (AvatarRig.boxe): gancho = corte, direto =
//    corte de volta, o terceiro golpe = o forte; esquiva, pancada, queda e
//    vitória também. Trocam pelos FBX de espada do Mixamo quando chegarem;
//  - monstros provisórios (monster-view.ts) e o AVISO de cada golpe: o
//    pedaço de chão que vai ser atingido acende vermelho e enche até o golpe;
//  - câmera atrás do jogador, travada no inimigo mais perto; o joystick e o
//    WASD são relativos a ela;
//  - dano saltando (DOM sobre o canvas), faíscas, tranco de câmera, plateia.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { SpotLight } from "@babylonjs/core/Lights/spotLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import "@babylonjs/core/Particles/particleSystemComponent"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { AvatarLibrary, type BoxeBase, type BoxeClip } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { BoxeAudio } from "./audio"
import type { BodyId } from "../../types"
import { COMBO, DT, Fight, MOBS, mobAttack, type FightEvent, type FightSetup, type Input, type MobKind } from "../sim/fight"
import { buildArena } from "./arena-view"
import { buildRing } from "./ring-view"
import { MonsterModel } from "./monster-view"

export interface LaminasHud {
  hp: number
  stam: number
  mobs: { id: number; kind: MobKind; hp: number; hpMax: number }[]
  over: null | { win: boolean }
  /** Algum golpe vindo agora (a tela pisca a dica de esquiva). */
  danger: boolean
}

export interface LaminasGameOptions {
  canvas: HTMLCanvasElement
  body: BodyId
  look?: string
  setup: FightSetup
  /** O lugar: o coliseu (prédio das Lâminas e portal) ou o ringue (prédio do Boxe, mm3d-56). */
  stage?: "arena" | "ring"
  onReady?: () => void
  onHud?: (h: LaminasHud) => void
  onEnd?: (win: boolean) => void
  onError?: (reason: "context-lost") => void
}

export interface LaminasGameHandle {
  setMuted: (m: boolean) => void
  /** Joystick da tela: x = direita, y = para longe da câmera (−1…1). */
  setJoystick: (x: number, y: number) => void
  attack: () => void
  dodge: () => void
  dispose: () => void
}

/** Trecho do clipe do boxe para cada golpe do combo (0–1 do clipe; medidos em build_boxe_mocap). */
const SWING_CLIPS: { clip: BoxeClip; from: number; to: number }[] = [
  { clip: "BBox3", from: 9 / 66, to: 35 / 66 },
  { clip: "BBox1", from: 7 / 64, to: 35 / 64 },
  { clip: "BBox4", from: 9 / 66, to: 37 / 66 },
]
const CAM_DIST = 6.4
const CAM_H = 3.3
const HAND = "mixamorig:RightHand"
/** Giro da espada em relação ao osso da mão (a lâmina sai do lado do polegar). */
const GRIP = Quaternion.RotationYawPitchRoll(0, 0, Math.PI / 2)
const GRIP_OFFSET = new Vector3(0.0, 0.085, 0.03)

export function createLaminasGame(opts: LaminasGameOptions): LaminasGameHandle {
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

  const ring = opts.stage === "ring"
  const scene = new Scene(engine)
  if (ring) {
    // mm3d-56: o ginásio do ringue à luz de lampião (fundo escuro, a lona acesa).
    scene.clearColor = new Color4(0.05, 0.035, 0.03, 1)
    scene.ambientColor = new Color3(0.3, 0.3, 0.35)
    scene.fogColor = new Color3(0.05, 0.035, 0.03)
    scene.fogStart = 30
    scene.fogEnd = 70
  } else {
    // mm3d-55: fim de tarde de fábrica (âmbar com fumaça).
    scene.clearColor = new Color4(0.86, 0.64, 0.44, 1)
    scene.ambientColor = new Color3(0.35, 0.3, 0.28)
    scene.fogColor = new Color3(0.86, 0.64, 0.44)
    scene.fogStart = 34
    scene.fogEnd = 100
  }
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("laminas-hemi", new Vector3(0, 1, 0), scene)
  hemi.intensity = 0.7
  hemi.diffuse = new Color3(1, 0.95, 0.88)
  hemi.groundColor = new Color3(0.35, 0.26, 0.2)
  const sun = new DirectionalLight("laminas-sun", new Vector3(-0.5, -1, 0.35), scene)
  sun.intensity = 0.75
  sun.diffuse = new Color3(1, 0.88, 0.7)
  if (ring) {
    // Sob a treliça: menos luz geral, o facho de cima faz o ringue brilhar.
    hemi.intensity = touch ? 0.72 : 0.62
    hemi.diffuse = new Color3(1, 0.88, 0.74)
    hemi.groundColor = new Color3(0.16, 0.11, 0.08)
    sun.intensity = 0.35
    const spot = new SpotLight("laminas-ring-spot", new Vector3(0, 13, 0), new Vector3(0, -1, 0), Math.PI / 1.45, 1.2, scene)
    spot.intensity = 1.15
    spot.diffuse = new Color3(1, 0.9, 0.74)
  }

  const arena = ring ? buildRing(scene, low) : buildArena(scene, low)
  const audio = new BoxeAudio()
  audio.resume()

  // ── a luta ───────────────────────────────────────────────────────────────
  const fight = new Fight(opts.setup)

  // ── o jogador e a espada ─────────────────────────────────────────────────
  const lib = new AvatarLibrary(scene, false, false, 30, false, false, true)
  const fallbackMat = new StandardMaterial("laminas-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("laminas-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.35
  const hero = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, opts.body, null, true, opts.look ?? "")
  hero.setBoxe("BGuard")

  const swordMats = {
    blade: Object.assign(new StandardMaterial("laminas-blade", scene), { diffuseColor: new Color3(0.86, 0.88, 0.92), specularColor: new Color3(0.9, 0.9, 0.9), specularPower: 64 }),
    gold: Object.assign(new StandardMaterial("laminas-hilt", scene), { diffuseColor: new Color3(0.9, 0.68, 0.22), specularColor: new Color3(0.4, 0.35, 0.2) }),
    grip: Object.assign(new StandardMaterial("laminas-grip", scene), { diffuseColor: new Color3(0.45, 0.12, 0.1), specularColor: new Color3(0.05, 0.05, 0.05) }),
  }
  const sword = new TransformNode("laminas-sword", scene)
  sword.rotationQuaternion = new Quaternion()
  const swordParts: Mesh[] = []
  {
    const blade = CreateBox("laminas-sword-blade", { width: 0.075, height: 0.92, depth: 0.018 }, scene)
    blade.position.y = 0.6
    blade.material = swordMats.blade
    const tip = CreateCylinder("laminas-sword-tip", { height: 0.12, diameterTop: 0, diameterBottom: 0.075, tessellation: 4 }, scene)
    tip.position.y = 1.12
    tip.scaling.z = 0.25
    tip.material = swordMats.blade
    const guard = CreateBox("laminas-sword-guard", { width: 0.3, height: 0.045, depth: 0.06 }, scene)
    guard.position.y = 0.13
    guard.material = swordMats.gold
    const grip = CreateCylinder("laminas-sword-grip", { height: 0.2, diameter: 0.038, tessellation: 8 }, scene)
    grip.position.y = 0.02
    grip.material = swordMats.grip
    const pommel = CreateSphere("laminas-sword-pommel", { diameter: 0.07, segments: 6 }, scene)
    pommel.position.y = -0.09
    pommel.material = swordMats.gold
    for (const m of [blade, tip, guard, grip, pommel]) {
      m.parent = sword
      m.isPickable = false
      swordParts.push(m)
    }
  }
  const tmpS = new Vector3()
  const tmpQ = new Quaternion()
  const tmpP = new Vector3()
  const placeSword = () => {
    const hand = hero.bone(HAND)
    if (!hand) {
      sword.setEnabled(false)
      return
    }
    hero.bonePosition(HAND)
    hand.getWorldMatrix().decompose(tmpS, tmpQ, tmpP)
    sword.setEnabled(true)
    tmpQ.multiplyToRef(GRIP, sword.rotationQuaternion!)
    const off = GRIP_OFFSET.rotateByQuaternionToRef(tmpQ, new Vector3())
    sword.position.copyFrom(tmpP.add(off))
  }

  // ── monstros e avisos no chão ────────────────────────────────────────────
  const warnTex = new DynamicTexture("laminas-warn", { width: 128, height: 128 }, scene, false)
  {
    const g = warnTex.getContext() as CanvasRenderingContext2D
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64)
    gr.addColorStop(0, "rgba(255,40,40,0.55)")
    gr.addColorStop(0.82, "rgba(255,40,40,0.35)")
    gr.addColorStop(0.9, "rgba(255,80,80,0.95)")
    gr.addColorStop(1, "rgba(255,80,80,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
    warnTex.hasAlpha = true
    warnTex.update()
  }
  const warnMat = new StandardMaterial("laminas-warn-mat", scene)
  warnMat.diffuseTexture = warnTex
  warnMat.useAlphaFromDiffuseTexture = true
  warnMat.emissiveColor = new Color3(1, 0.3, 0.3)
  warnMat.disableLighting = true
  warnMat.backFaceCulling = false
  const models = new Map<number, { model: MonsterModel; warn: Mesh; px: number; pz: number; speed: number }>()
  for (const m of fight.mobs) {
    const warn = CreateDisc(`laminas-warn-${m.id}`, { radius: 1, tessellation: 32 }, scene)
    warn.rotation.x = Math.PI / 2
    warn.material = warnMat
    warn.isPickable = false
    warn.setEnabled(false)
    models.set(m.id, { model: new MonsterModel(scene, m.kind), warn, px: m.x, pz: m.z, speed: 0 })
  }

  // ── faíscas ──────────────────────────────────────────────────────────────
  const dotTex = new DynamicTexture("laminas-dot", { width: 32, height: 32 }, scene, false)
  {
    const g = dotTex.getContext() as CanvasRenderingContext2D
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    gr.addColorStop(0, "rgba(255,255,255,1)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 32, 32)
    dotTex.hasAlpha = true
    dotTex.update()
  }
  const spray = (name: string, c1: Color4, c2: Color4, cap: number) => {
    const ps = new ParticleSystem(name, cap, scene)
    ps.particleTexture = dotTex
    ps.color1 = c1
    ps.color2 = c2
    ps.colorDead = new Color4(c2.r, c2.g, c2.b, 0)
    ps.minSize = 0.04
    ps.maxSize = 0.11
    ps.minLifeTime = 0.2
    ps.maxLifeTime = 0.5
    ps.gravity = new Vector3(0, -6, 0)
    ps.minEmitPower = 2
    ps.maxEmitPower = 5
    ps.emitRate = 0
    ps.manualEmitCount = 0
    ps.blendMode = ParticleSystem.BLENDMODE_ADD
    ps.updateSpeed = 1 / 60
    ps.emitter = new Vector3(0, 1, 0)
    ps.direction1 = new Vector3(-1, 0.4, -1)
    ps.direction2 = new Vector3(1, 1.4, 1)
    ps.start()
    return ps
  }
  const sparks = spray("laminas-sparks", new Color4(1, 0.85, 0.4, 1), new Color4(1, 0.5, 0.15, 1), low ? 60 : 160)
  const ichor = spray("laminas-ichor", new Color4(0.75, 0.35, 1, 1), new Color4(0.45, 0.15, 0.8, 1), low ? 40 : 100)
  const burst = (ps: ParticleSystem, at: Vector3, n: number) => {
    ps.emitter = at.clone()
    ps.manualEmitCount = n
  }

  // ── entrada ──────────────────────────────────────────────────────────────
  const keys = new Set<string>()
  const stick = { x: 0, y: 0 }
  let wantAttack = false
  let wantDodge = false
  const attack = () => {
    audio.resume()
    wantAttack = true
  }
  const dodge = () => {
    audio.resume()
    wantDodge = true
  }
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const k = e.key.toLowerCase()
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "j", "k", "shift"].includes(k)) e.preventDefault()
    if (down) {
      if ((k === "j" || k === " ") && !e.repeat) attack()
      else if ((k === "k" || k === "shift") && !e.repeat) dodge()
      keys.add(k)
    } else keys.delete(k)
  }
  const kd = (e: KeyboardEvent) => onKey(e, true)
  const ku = (e: KeyboardEvent) => onKey(e, false)
  const blur = () => keys.clear()
  const click = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button === 0) attack()
    if (e.pointerType === "mouse" && e.button === 2) dodge()
  }
  const noMenu = (e: Event) => e.preventDefault()
  window.addEventListener("keydown", kd)
  window.addEventListener("keyup", ku)
  window.addEventListener("blur", blur)
  canvas.addEventListener("pointerdown", click)
  canvas.addEventListener("contextmenu", noMenu)

  // ── câmera ───────────────────────────────────────────────────────────────
  const cam = new FreeCamera("laminas-cam", new Vector3(0, CAM_H, -5 - CAM_DIST), scene)
  cam.inputs.clear()
  cam.minZ = 0.1
  cam.maxZ = 220
  cam.fov = 0.9
  scene.activeCamera = cam
  let camYaw = 0
  const camPos = cam.position.clone()
  const camLook = new Vector3(0, 1.2, 0)
  let shake = 0
  const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  const readInput = (): Input => {
    let x = stick.x
    let y = stick.y
    if (keys.has("a") || keys.has("arrowleft")) x -= 1
    if (keys.has("d") || keys.has("arrowright")) x += 1
    if (keys.has("w") || keys.has("arrowup")) y += 1
    if (keys.has("s") || keys.has("arrowdown")) y -= 1
    const n = Math.hypot(x, y)
    if (n > 1) {
      x /= n
      y /= n
    }
    // relativo à câmera: frente = (sin yaw, cos yaw), direita = (cos yaw, −sin yaw)
    const fx = Math.sin(camYaw)
    const fz = Math.cos(camYaw)
    const mx = fx * y + fz * x
    const mz = fz * y - fx * x
    const inp: Input = { mx, mz, run: n > 0.85 && !fight.target(), attack: wantAttack, dodge: wantDodge }
    return inp
  }

  // ── dano saltando ────────────────────────────────────────────────────────
  const layer = document.createElement("div")
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1"
  canvas.parentElement?.appendChild(layer)
  const pop = (at: Vector3, text: string, color: string, size: number) => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const p = Vector3.Project(at, Matrix.Identity(), scene.getTransformMatrix(), cam.viewport.toGlobal(w, h))
    if (p.z < 0 || p.z > 1) return
    const el = document.createElement("span")
    el.textContent = text
    el.style.cssText = `position:absolute;left:${p.x + (Math.random() - 0.5) * 30}px;top:${p.y}px;font:italic 900 ${size}px/1 system-ui,sans-serif;color:${color};-webkit-text-stroke:2.5px #fff;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,.35);transform:translate(-50%,-50%);will-change:transform,opacity`
    layer.appendChild(el)
    const anim = el.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.4)", opacity: 0 },
        { transform: "translate(-50%,-90%) scale(1.2)", opacity: 1, offset: 0.15 },
        { transform: "translate(-50%,-140%) scale(1)", opacity: 1, offset: 0.6 },
        { transform: "translate(-50%,-170%) scale(0.9)", opacity: 0 },
      ],
      { duration: 900, easing: "ease-out" },
    )
    anim.onfinish = () => el.remove()
  }

  // ── animação do jogador ──────────────────────────────────────────────────
  let lastState = fight.me.state
  const onEvents = (evs: FightEvent[]) => {
    for (const e of evs) {
      switch (e.t) {
        case "swing": {
          const c = SWING_CLIPS[e.combo]
          hero.boxeAct(c.clip, COMBO[e.combo].dur / fight.me.rate, c.from, c.to)
          audio.whoosh()
          break
        }
        case "dodge":
          hero.boxeAct("BDodge", 0.46, 0, 0.49)
          audio.whoosh()
          break
        case "hit":
          if (e.on === "mob") {
            const at = new Vector3(e.x, e.y + 1.3, e.z)
            burst(sparks, at, e.heavy ? 40 : 22)
            burst(ichor, at, e.heavy ? 18 : 8)
            pop(at.add(new Vector3(0, 0.5, 0)), String(e.dmg), e.heavy ? "#FFD23F" : "#FF4FA3", e.heavy ? 52 : 40)
            audio.punch(e.heavy ? 1 : 0.6, e.heavy)
            shake = Math.max(shake, e.heavy ? 0.18 : 0.08)
            if (e.dead) {
              audio.fall()
              arena.cheer(1)
              audio.excite(0.9)
            } else arena.cheer(0.35)
          } else {
            const at = new Vector3(e.x, 1.4, e.z)
            burst(sparks, at, 14)
            pop(at.add(new Vector3(0, 0.6, 0)), String(e.dmg), "#FF3B3B", 44)
            audio.punch(e.heavy ? 1 : 0.5, false)
            shake = Math.max(shake, e.heavy ? 0.32 : 0.16)
            if (e.dead) hero.boxeAct("BFall", 1.2, 0, 1, true)
            else if (e.heavy) hero.boxeAct("BHit", 0.7, 0, 0.9)
            else hero.boxeAct("BHitLite", 0.32, 0, 0.66)
          }
          break
        case "evade":
          pop(new Vector3(fight.me.x, 2.2, fight.me.z), "✓", "#7CFFB2", 30)
          break
        case "end":
          audio.bell(e.win ? 3 : 1)
          if (e.win) arena.cheer(1)
          opts.onEnd?.(e.win)
          break
      }
    }
  }

  // ── laço ─────────────────────────────────────────────────────────────────
  let simClock = 0
  let ran = 0
  let hudAt = 0
  let readyFired = false
  const frame = (ms: number) => {
    const dt = Math.min(ms / 1000, 0.1)
    simClock += dt
    let steps = 0
    while (ran + DT <= simClock && steps < 8) {
      const inp = readInput()
      wantAttack = false
      wantDodge = false
      fight.step(inp)
      onEvents(fight.events)
      ran += DT
      steps++
    }
    if (steps >= 8) ran = simClock
    arena.update(dt)
    audio.tick(dt)

    // jogador
    const p = fight.me
    hero.place(p.x, p.z, p.facing, 0, 0)
    const sp = Math.hypot(p.vx, p.vz)
    const tgt = fight.target()
    const near = !!tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 9
    let base: BoxeBase | null = "BGuard"
    if (p.state === "win") base = "BWin"
    else if (p.state === "idle" && !near && sp > 0.3) base = null
    hero.setBoxe(base)
    if (base === "BGuard") {
      const sf = Math.sin(p.facing)
      const cf = Math.cos(p.facing)
      hero.setBoxeMove(p.vx * sf + p.vz * cf, p.vx * cf - p.vz * sf)
    } else hero.setBoxeMove(0, 0)
    hero.animate(dt, base === null ? (sp > 4 ? 2 : 1) : 0, sp)
    if (p.state === "idle" && lastState !== "idle" && p.hp > 0) hero.boxeClear()
    lastState = p.state
    placeSword()

    // monstros
    let danger = false
    for (const m of fight.mobs) {
      const v = models.get(m.id)
      if (!v) continue
      const ddt = Math.max(dt, 1e-3)
      v.speed += (Math.hypot(m.x - v.px, m.z - v.pz) / ddt - v.speed) * Math.min(1, dt * 8)
      v.px = m.x
      v.pz = m.z
      const a = mobAttack(m)
      const warn = m.state === "windup" ? Math.min(1, m.t / Math.max(0.05, m.windup)) : 0
      const cur = m.state === "windup" || m.state === "strike" || m.state === "recover" ? MOBS[m.kind].attacks[m.atk] : undefined
      const attack = cur ? { id: cur.id, windup: m.windup, active: cur.active, recover: cur.recover } : undefined
      v.model.update(dt, { x: m.x, y: m.y, z: m.z, facing: m.facing, state: m.state, t: m.t, warn, speed: v.speed, attack })
      // aviso no chão: área = onde vai cair; cone = à frente do monstro
      if (a && m.state === "windup") {
        danger = true
        const reach = a.area ? (a.reach ?? 0) : a.range / 2 + MOBS[m.kind].radius * 0.5
        const r = a.area ? a.area : Math.max(0.9, a.range * 0.65)
        v.warn.setEnabled(true)
        v.warn.position.set(m.x + Math.sin(m.facing) * reach, 0.03, m.z + Math.cos(m.facing) * reach)
        const k = 0.35 + 0.65 * warn
        v.warn.scaling.set(r * k, r * k, 1)
        warnMat.alpha = 0.55 + 0.45 * Math.sin(m.t * 20) * warn
      } else v.warn.setEnabled(false)
    }

    // câmera: atrás do jogador, olhando para o alvo
    if (tgt && p.state !== "win") camYaw += angDiff(Math.atan2(tgt.x - p.x, tgt.z - p.z), camYaw) * Math.min(1, dt * 3.5)
    const wantPos = new Vector3(p.x - Math.sin(camYaw) * CAM_DIST, CAM_H, p.z - Math.cos(camYaw) * CAM_DIST)
    camPos.addInPlace(wantPos.subtract(camPos).scale(Math.min(1, dt * 6)))
    const lookAt = tgt ? new Vector3((p.x * 2 + tgt.x) / 3, 1.2 + tgt.y * 0.3, (p.z * 2 + tgt.z) / 3) : new Vector3(p.x + Math.sin(camYaw) * 3, 1.2, p.z + Math.cos(camYaw) * 3)
    camLook.addInPlace(lookAt.subtract(camLook).scale(Math.min(1, dt * 6)))
    shake = Math.max(0, shake - dt * 1.4)
    const sx = (Math.random() - 0.5) * shake
    const sy = (Math.random() - 0.5) * shake
    cam.position.set(camPos.x + sx, camPos.y + sy, camPos.z)
    cam.setTarget(camLook)

    hudAt -= dt
    if (hudAt <= 0) {
      hudAt = 0.1
      opts.onHud?.({
        hp: p.hp,
        stam: p.stam,
        mobs: fight.mobs.map((m) => ({ id: m.id, kind: m.kind, hp: m.hp, hpMax: m.hpMax })),
        over: fight.over ? { win: fight.over.win } : null,
        danger,
      })
    }
    governor.tick(ms)
    if (!readyFired && hero.hasAvatar) {
      readyFired = true
      opts.onReady?.()
    }
  }

  const readyTimer = setTimeout(() => {
    if (!readyFired && !disposed) {
      readyFired = true
      opts.onReady?.()
    }
  }, 6000)

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
  w.__laminas = () => ({ me: { ...fight.me }, mobs: fight.mobs.map((m) => ({ ...m })), over: fight.over, ready: readyFired, sword: sword.position.clone(), hand: hero.bonePosition(HAND) })
  w.__laminasScene = scene

  return {
    setMuted(m) {
      audio.setMuted(m)
    },
    setJoystick(x, y) {
      stick.x = x
      stick.y = y
    },
    attack,
    dodge,
    dispose() {
      if (disposed) return
      disposed = true
      clearTimeout(readyTimer)
      engine.onContextLostObservable.remove(lost)
      ro.disconnect()
      engine.stopRenderLoop()
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
      window.removeEventListener("blur", blur)
      canvas.removeEventListener("pointerdown", click)
      canvas.removeEventListener("contextmenu", noMenu)
      layer.remove()
      delete w.__laminas
      delete w.__laminasScene
      audio.dispose()
      sparks.dispose()
      ichor.dispose()
      dotTex.dispose()
      for (const v of models.values()) {
        v.model.dispose()
        v.warn.dispose()
      }
      warnMat.dispose()
      warnTex.dispose()
      for (const m of swordParts) m.dispose()
      sword.dispose()
      for (const m of Object.values(swordMats)) m.dispose()
      hero.dispose()
      lib.dispose()
      arena.dispose()
      fallbackMat.dispose()
      shadowMat.dispose()
      cam.dispose()
      scene.dispose()
      engine.dispose()
      unlive()
    },
  }
}
