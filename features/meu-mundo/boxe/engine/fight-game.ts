// features/meu-mundo/boxe/engine/fight-game.ts — ARENA DE BOXE (mm3d-44): a cena, AO VIVO.
//
// mm3d-44 (pedido do Alex): a pessoa CONTROLA o lutador — joystick/WASD anda,
// ATACAR (J, espaço, clique) solta um combo SORTEADO dos pedaços da tabela da
// sala, ESQUIVAR (K, Shift) abaixa. Quem decide golpe, dano e queda é a sala
// (Match no servidor); aqui:
//  - o MEU lutador anda no aparelho (mm3d-45: a posição é dele, como no Paint;
//    a sala só limita a velocidade e devolve se recusar): direita = para cima
//    do outro, esquerda = recua, cima/baixo = de lado (relativo à LINHA entre
//    os dois, não à câmera); passadas na guarda pela direção (build_boxe_steps);
//    o combo e a esquiva tocam no toque (o id do combo volta no estado — combo
//    recusado é solto); o empurrão de um golpe levado é aplicado aqui;
//  - o OUTRO (pessoa ou computador) é desenhado 0,1 s no passado, entre dois
//    estados; a ação dele (combo, esquiva, reação, queda, levantar) toca a
//    partir do instante que a sala marcou, cortando o que já passou;
//  - eventos (pancada, bloqueio, esquiva, queda, contagem, sinos) no mesmo
//    relógio do outro (os MEUS golpes, assim que chegam): som, suor/sangue,
//    câmera tremendo, plateia, avisos; cada golpe que entra mostra o DANO
//    saltando da cabeça e dá um TRANCO em quem leva (cabeça e tronco jogados
//    para trás por cima da animação — mm3d-45);
//  - câmera de transmissão de lado para a dupla, comigo sempre à ESQUERDA
//    (o joystick é relativo a ela); árbitro anda junto e vai a quem caiu.
// Animações: a pasta "boxe" do Alex (build_boxe_mocap.py, conjunto -m44).

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { SpotLight } from "@babylonjs/core/Lights/spotLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import "@babylonjs/core/Particles/particleSystemComponent"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { AvatarLibrary, type BoxeBase, type BoxeClip } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { BODY_IDS, type BodyId } from "../../types"
import { ACT, EV, PH, RES, comboDur, fighterAt, randomCombo, type ClipPart, type FightStart, type FighterAt, type Snap } from "./fight"
import { buildArena, BLUE, RED, RING_Y } from "./arena-view"
import { BoxeAudio } from "./audio"
import type { BoxeNet } from "./net"

export type PhaseKind = "intro" | "round" | "break" | "count" | "end"

export interface BoxeHud {
  phase: { kind: PhaseKind; round: number; left: number }
  /** 0–100 por canto. */
  blood: [number, number]
  stam: [number, number]
  /** Contagem do árbitro (n 0 = no chão, antes do "1"). */
  count: { who: number; n: number; down: boolean }
  tally: { thrown: number; landed: number; kd: number }[]
  /** A luta acabou na tela (nocaute, sino final ou toalha). */
  over: boolean
  /** Dá para atacar agora (o botão acende). */
  canAct: boolean
}

export type BoxeNotice =
  | { kind: "bell"; round: number }
  | { kind: "break"; round: number }
  | { kind: "clean"; who: number }
  | { kind: "down"; who: number; kd: number }
  | { kind: "up"; who: number }
  | { kind: "ko"; who: number; tko: boolean }
  | { kind: "end"; winner: number }
  | { kind: "towel"; who: number }

export interface FightGameOptions {
  canvas: HTMLCanvasElement
  net: BoxeNet
  start: FightStart
  maxPixelRatio?: number
  onReady?: () => void
  onHud?: (h: BoxeHud) => void
  onNotice?: (n: BoxeNotice) => void
  onError?: (reason: "context-lost") => void
}

export interface FightGameHandle {
  setMuted: (m: boolean) => void
  /** Joystick da tela: x = direita, y = para longe da câmera (−1…1). */
  setJoystick: (x: number, y: number) => void
  attack: () => void
  dodge: () => void
  dispose: () => void
}

const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)

/** Corpo do árbitro: camisa branca, calça preta (código look). */
const REF_LOOK = "1230"
/** Raio da câmera (m) de lado para a dupla; em pé no celular, mais longe. */
const CAM_R = 4.9
/** O outro é desenhado este tempo no passado (entre dois estados). */
const INTERP = 0.1
/** Joystick vai para a sala a cada… (s; e logo quando muda). */
const SEND_EVERY = 0.07
/** Combo pedido e não visto no estado depois de rtt + isto: recusado. */
const CONFIRM_S = 0.45
/** Distância que o combo procura (avança), como na sala. */
const RANGE = 0.95
/** Queda e levantar (s). */
const FALL_DUR = 1.2
/** Sentido do tranco (conferido no harness: a cabeça vai para LONGE de quem bateu). */
const FLINCH_SIGN = -1

const PH_KIND: Record<number, PhaseKind> = { [PH.INTRO]: "intro", [PH.ROUND]: "round", [PH.BREAK]: "break", [PH.COUNT]: "count", [PH.END]: "end" }

/** Um trecho de clipe para tocar a partir de `at` (no relógio de quem toca). */
type Plan = { at: number; clip: BoxeClip; from: number; to: number; dur: number; hold?: boolean }

export function createFightGame(opts: FightGameOptions): FightGameHandle {
  const { canvas, net, start } = opts
  const T = start.table
  const me = start.me
  const op = 1 - me
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, powerPreference: "high-performance" }, false)
  const unlive = liveGamesBump()
  let disposed = false
  const quality = resolveQuality()
  const low = quality.tier === "low"
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false
  const capMs = frameCapMs()
  const profile = touch ? { ...quality, maxRatio: Math.max(quality.maxRatio, low ? 1.5 : 2), minRatio: Math.max(quality.minRatio, 1) } : quality
  const governor = new ResolutionGovernor(engine, profile, Math.min(window.devicePixelRatio || 1, touch ? 2 : (opts.maxPixelRatio ?? 1.5)))

  const scene = new Scene(engine)
  // mm3d-55: ginásio vitoriano à luz de lampião.
  scene.clearColor = new Color4(0.05, 0.035, 0.03, 1)
  scene.ambientColor = new Color3(0.3, 0.3, 0.35)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(0.05, 0.035, 0.03)
  scene.fogStart = 20
  scene.fogEnd = 46
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("boxe-hemi", new Vector3(0, 1, 0), scene)
  hemi.intensity = touch ? 0.62 : 0.5
  hemi.diffuse = new Color3(1, 0.88, 0.74)
  hemi.groundColor = new Color3(0.16, 0.11, 0.08)
  const spot = new SpotLight("boxe-spot", new Vector3(0, 9, 0), new Vector3(0, -1, 0), Math.PI / 3.2, 6, scene)
  spot.intensity = 1.25
  spot.diffuse = new Color3(1, 0.9, 0.74)

  const arena = buildArena(scene, low)
  const audio = new BoxeAudio()
  audio.resume()

  // ── lutadores, luvas e árbitro ───────────────────────────────────────────
  const lib = new AvatarLibrary(scene, false, false, 30, false, false, true)
  const fallbackMat = new StandardMaterial("boxe-character", scene)
  fallbackMat.diffuseColor = new Color3(1, 1, 1)
  fallbackMat.specularColor = new Color3(0.08, 0.08, 0.08)
  const shadowMat = new StandardMaterial("boxe-shadow", scene)
  shadowMat.diffuseColor = new Color3(0, 0, 0)
  shadowMat.specularColor = new Color3(0, 0, 0)
  shadowMat.disableLighting = true
  shadowMat.alpha = 0.35
  const fighters = start.corners.map((c) => new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, isBody(c.body) ? c.body : "normal", null, false, c.look ?? ""))
  for (const ch of fighters) ch.setBoxe("BWarm")
  const ref = new Character(scene, lib, { fallback: fallbackMat, shadow: shadowMat }, "normal", null, false, REF_LOOK)
  const gloveMats = [RED, BLUE].map((c, i) => {
    const m = new StandardMaterial(`boxe-glove-${i}`, scene)
    m.diffuseColor = c
    m.emissiveColor = c.scale(0.18)
    m.specularColor = new Color3(0.35, 0.35, 0.35)
    m.specularPower = 24
    return m
  })
  const gloves: Mesh[][] = fighters.map((_, i) =>
    [0, 1].map((h) => {
      const g = CreateSphere(`boxe-glove-${i}-${h}`, { diameter: 0.24, segments: 8 }, scene)
      g.scaling.set(0.95, 0.85, 1.25)
      g.material = gloveMats[i]
      g.isPickable = false
      return g
    }),
  )
  const HANDS = [
    ["mixamorig:LeftHand", "mixamorig:LeftForeArm"],
    ["mixamorig:RightHand", "mixamorig:RightForeArm"],
  ] as const
  scene.onBeforeRenderObservable.add(() => {
    fighters.forEach((ch, i) => {
      HANDS.forEach(([hand, fore], h) => {
        const g = gloves[i][h]
        const p = ch.bonePosition(hand)
        const e = ch.bonePosition(fore)
        if (!p || !e) {
          g.isVisible = false
          return
        }
        const dir = p.subtract(e)
        const len = dir.length() || 1
        dir.scaleInPlace(1 / len)
        g.isVisible = true
        g.position.copyFrom(p.add(dir.scale(0.07)))
        g.lookAt(p.add(dir))
      })
    })
  })

  // ── efeitos: suor e sangue no golpe ──────────────────────────────────────
  const dotTex = new DynamicTexture("boxe-dot", { width: 32, height: 32 }, scene, false)
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
    ps.minSize = 0.03
    ps.maxSize = 0.07
    ps.minLifeTime = 0.25
    ps.maxLifeTime = 0.55
    ps.gravity = new Vector3(0, -7, 0)
    ps.minEmitPower = 1.4
    ps.maxEmitPower = 3.4
    ps.emitRate = 0
    ps.manualEmitCount = 0
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    ps.updateSpeed = 1 / 60
    ps.emitter = new Vector3(0, 2, 0)
    ps.start()
    return ps
  }
  const sweat = spray("boxe-sweat", new Color4(0.85, 0.92, 1, 0.9), new Color4(0.6, 0.75, 1, 0.6), low ? 60 : 160)
  const blood = spray("boxe-blood", new Color4(0.75, 0.04, 0.06, 1), new Color4(0.45, 0.02, 0.04, 0.9), low ? 30 : 80)
  const burst = (who: number, away: Vector3, power: number, red: boolean) => {
    const head = fighters[who].bonePosition("mixamorig:Head") ?? new Vector3(drawn[who].x, RING_Y + 1.6, drawn[who].z)
    for (const [ps, n] of [
      [sweat, Math.round(10 + power * 30)],
      [blood, red ? Math.round(4 + power * 12) : 0],
    ] as const) {
      if (!n) continue
      ps.emitter = head.clone()
      ps.direction1 = away.add(new Vector3(-0.4, 0.5, -0.4))
      ps.direction2 = away.add(new Vector3(0.4, 1.0, 0.4))
      ps.manualEmitCount = n
    }
  }

  // ── relógio e estados da sala ────────────────────────────────────────────
  const t0 = performance.now() / 1000
  const firstT = start.snap.t
  /** Hora da sala agora (sem pacote ainda: pela largada). */
  const now = () => net.serverTime() ?? firstT + (performance.now() / 1000 - t0)
  const snaps: Snap[] = [start.snap]
  const pendingEv: number[][] = []
  let last: Snap = start.snap
  const onSnap = (s: Snap) => {
    if (s.t <= last.t - 1e-6) return
    last = s
    snaps.push(s)
    if (snaps.length > 40) snaps.shift()
    for (const e of s.ev) {
      // o meu golpe: o impacto aparece assim que a sala responde (o soco já tocou aqui)
      if (e[1] === EV.PUNCH && e[2] === me) fire(e)
      else pendingEv.push(e)
    }
    observe(s)
  }
  /** Lutador `i` no relógio `t` (posição entre dois estados; o resto do mais recente até t). */
  const fighterIn = (i: number, t: number): { at: FighterAt; x: number; z: number } => {
    let a = snaps[0]
    let b = snaps[0]
    for (let k = snaps.length - 1; k >= 0; k--) {
      if (snaps[k].t <= t) {
        a = snaps[k]
        b = snaps[Math.min(snaps.length - 1, k + 1)]
        break
      }
    }
    const fa = fighterAt(a.f[i])
    const fb = fighterAt(b.f[i])
    const span = b.t - a.t
    const u = span > 1e-6 ? Math.max(0, Math.min(1, (t - a.t) / span)) : 0
    return { at: u > 0.5 ? fb : fa, x: fa.x + (fb.x - fa.x) * u, z: fa.z + (fb.z - fa.z) * u }
  }

  // ── o que toca em cada lutador ───────────────────────────────────────────
  const plans: Plan[][] = [[], []]
  const shownSeq = [0, 0]
  const lying = [false, false]
  const clockOf = (i: number) => (i === me ? now() : now() - INTERP)
  const part = (p: ClipPart, at: number, rate = 1, extra: Partial<Plan> = {}): Plan => ({ at, clip: p.clip as BoxeClip, from: p.from, to: p.to, dur: p.dur / Math.max(0.1, rate), ...extra })
  const planCombo = (i: number, pieces: number[], at: number, rate: number) => {
    let off = 0
    plans[i] = pieces.map((p) => {
      const pc = T.pieces[p]
      const out = part(pc, at + off / rate, rate)
      off += pc.dur
      return out
    })
  }
  /** Toca a ação nova de `i` (a sala marcou o início em `a.t0`). */
  const playAct = (i: number, a: FighterAt) => {
    lying[i] = false
    switch (a.act) {
      case ACT.COMBO:
        planCombo(i, a.pieces, a.t0, a.rate)
        break
      case ACT.DODGE:
        plans[i] = [part(T.dodge, a.t0, a.rate)]
        break
      case ACT.BLOCK:
      case ACT.LIGHT:
      case ACT.HEAVY:
      case ACT.STAGGER: {
        const r = T.react[a.act === ACT.BLOCK ? "block" : a.act === ACT.LIGHT ? "light" : a.act === ACT.HEAVY ? "heavy" : "stagger"]
        plans[i] = [{ at: a.t0, clip: r.clip as BoxeClip, from: r.from, to: r.to, dur: r.dur }]
        break
      }
      case ACT.DOWN:
        plans[i] = [{ at: a.t0, clip: "BFall", from: 0, to: 1, dur: FALL_DUR, hold: true }]
        break
      case ACT.RISE:
        plans[i] = [{ at: a.t0, clip: "BRise", from: 0, to: 1, dur: T.riseS }]
        break
      default:
        plans[i] = []
        fighters[i].boxeClear()
    }
  }
  const runPlans = () => {
    for (let i = 0; i < 2; i++) {
      const t = clockOf(i)
      const q = plans[i]
      while (q.length && q[0].at <= t) {
        const p = q.shift()!
        const late = t - p.at
        if (late >= p.dur) {
          // passou (aba voltou, avatar chegou tarde): a queda fica deitada; o resto some
          if (p.hold && fighters[i].hasAvatar) lying[i] = fighters[i].boxeAct(p.clip, 0.2, p.from + (p.to - p.from) * 0.85, p.to, true)
          continue
        }
        const k = late / p.dur
        const ok = fighters[i].boxeAct(p.clip, p.dur - late, p.from + (p.to - p.from) * k, p.to, !!p.hold)
        if (p.hold) lying[i] = ok
      }
    }
  }

  // ── o meu lutador: previsão ──────────────────────────────────────────────
  const mine = { x: start.snap.f[me][0], z: start.snap.f[me][1] }
  /** Empurrão de golpe levado (m/s), aplicado aqui (a posição é do aparelho). */
  const kick = { x: 0, z: 0 }
  /** Ação prevista (tocando antes da sala confirmar). */
  let local: { kind: "combo" | "dodge"; cid: number; at: number; end: number; seen: boolean } | null = null
  let cid = 0
  let queued = false
  const lastMine = () => fighterAt(last.f[me])
  const phaseNow = () => last.ph[0]
  const myBusyUntil = () => {
    const a = lastMine()
    let end = 0
    if (a.act === ACT.COMBO) end = a.t0 + comboDur(T, a.pieces, a.rate)
    else if (a.act === ACT.DODGE) end = a.t0 + T.dodge.dur / Math.max(0.1, a.rate)
    else if (a.act === ACT.BLOCK || a.act === ACT.LIGHT || a.act === ACT.HEAVY || a.act === ACT.STAGGER) {
      const r = T.react[a.act === ACT.BLOCK ? "block" : a.act === ACT.LIGHT ? "light" : a.act === ACT.HEAVY ? "heavy" : "stagger"]
      end = a.t0 + r.dur + (a.act === ACT.STAGGER ? 0.2 : 0)
    } else if (a.act === ACT.DOWN || a.act === ACT.RISE) end = Infinity
    return Math.max(end, local ? local.end : 0)
  }
  const canAct = () => phaseNow() === PH.ROUND && now() >= myBusyUntil() - 0.02 && lastMine().stam >= 6

  const attack = () => {
    if (disposed) return
    audio.resume()
    const cnt = last.cnt
    if (cnt && cnt[0] === me) {
      net.sendInput({ k: 1 })
      return
    }
    if (!canAct()) {
      // apertou no fim do combo: entra logo que acabar
      if (phaseNow() === PH.ROUND && myBusyUntil() - now() < 0.35 && local) queued = true
      return
    }
    const n = 1 + Math.floor(Math.random() * T.maxPieces)
    const pieces = randomCombo(T, n)
    const rate = lastMine().atkRate || 1
    cid = (cid % 1_000_000) + 1
    const at = now()
    local = { kind: "combo", cid, at, end: at + comboDur(T, pieces, rate), seen: false }
    planCombo(me, pieces, at, rate)
    net.sendInput({ a: pieces, c: cid, m: [joy.x, joy.z] })
  }
  const dodge = () => {
    if (disposed || !canAct()) return
    audio.resume()
    const rate = 1 + 0.35 * (start.corners[me].view.defense / 100)
    const at = now()
    local = { kind: "dodge", cid: 0, at, end: at + T.dodge.dur / rate, seen: false }
    plans[me] = [part(T.dodge, at, rate)]
    net.sendInput({ d: 1 })
  }

  /** O estado chegou: confirma/recusa o previsto e corrige a minha posição. */
  const observe = (s: Snap) => {
    const a = fighterAt(s.f[me])
    if (a.seq > shownSeq[me]) {
      const waiting = local && !local.seen
      if (waiting && ((local!.kind === "combo" && a.act === ACT.COMBO && a.cid === local!.cid) || (local!.kind === "dodge" && a.act === ACT.DODGE))) {
        // a sala aceitou o que já está tocando
        local!.seen = true
        shownSeq[me] = a.seq
      } else if (!waiting || a.act >= ACT.LIGHT) {
        // golpe levado, queda, levantar, fim (ou uma ação que não é a prevista)
        shownSeq[me] = a.seq
        local = null
        playAct(me, a)
      }
    }
    if (local && !local.seen && now() - local.at > net.roundTrip + CONFIRM_S) {
      // a sala não aceitou (atordoado, sem fôlego, fim do round): solta
      local = null
      plans[me] = []
      fighters[me].boxeClear()
    }
    // fora do round (intervalo, contagem, chão) quem anda é a sala
    if (s.ph[0] !== PH.ROUND || a.act === ACT.DOWN || a.act === ACT.RISE) {
      mine.x = a.x
      mine.z = a.z
      kick.x = kick.z = 0
      return
    }
    // no round a posição é do aparelho; a sala só fica para trás (meia ida e
    // volta). Longe demais = ela não deixou (encostado, rápido demais): volta.
    const ex = a.x - mine.x
    const ez = a.z - mine.z
    if (Math.hypot(ex, ez) > 0.6) {
      mine.x += ex * 0.5
      mine.z += ez * 0.5
    }
  }

  // ── entrada: teclado e joystick ──────────────────────────────────────────
  const keys = new Set<string>()
  const stick = { x: 0, y: 0 }
  /** Direção no chão (pela câmera). */
  const joy = { x: 0, z: 0 }
  let sentJoy = { x: 0, z: 0 }
  let sentPos = { x: 0, z: 0 }
  let sendAt = 0
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
  }
  window.addEventListener("keydown", kd)
  window.addEventListener("keyup", ku)
  window.addEventListener("blur", blur)
  canvas.addEventListener("pointerdown", click)
  const readJoy = () => {
    let x = stick.x
    let y = stick.y
    if (keys.has("a") || keys.has("arrowleft")) x -= 1
    if (keys.has("d") || keys.has("arrowright")) x += 1
    if (keys.has("w") || keys.has("arrowup")) y += 1
    if (keys.has("s") || keys.has("arrowdown")) y -= 1
    const n = Math.hypot(x, y)
    if (n > 1) (x /= n), (y /= n)
    // relativo à LINHA entre os dois (eu sempre à esquerda da tela): direita =
    // para cima do outro, esquerda = recua; cima = de lado para longe da câmera
    const ox = drawn[op].x - drawn[me].x
    const oz = drawn[op].z - drawn[me].z
    const ol = Math.hypot(ox, oz) || 1
    const ux = ox / ol
    const uz = oz / ol
    // lado "para dentro da tela": perpendicular à linha, do lado oposto à câmera
    let px = -uz
    let pz = ux
    if (px * (camPos.x - drawn[me].x) + pz * (camPos.z - drawn[me].z) > 0) (px = -px), (pz = -pz)
    joy.x = ux * x + px * y
    joy.z = uz * x + pz * y
    if (Math.hypot(joy.x, joy.z) < 0.12) joy.x = joy.z = 0
  }

  // ── câmera ───────────────────────────────────────────────────────────────
  const cam = new FreeCamera("boxe-cam", new Vector3(0, 4, -9), scene)
  cam.inputs.clear()
  cam.minZ = 0.1
  cam.maxZ = 120
  cam.fov = 0.85
  scene.activeCamera = cam
  let camAng = -Math.PI / 2
  const camPos = new Vector3(0, 4, -9)
  const camLook = new Vector3(0, RING_Y + 1, 0)
  let shake = 0
  let focus: { who: number; until: number } | null = null
  const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  // ── dano saltando da cabeça ──────────────────────────────────────────────
  const layer = document.createElement("div")
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1"
  canvas.parentElement?.appendChild(layer)
  const popDamage = (who: number, dmg: number, kind: "hit" | "clean" | "block") => {
    const head = fighters[who].bonePosition("mixamorig:HeadTop_End") ?? fighters[who].bonePosition("mixamorig:Head") ?? new Vector3(drawn[who].x, RING_Y + 1.7, drawn[who].z)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const p = Vector3.Project(head.add(new Vector3(0, 0.15, 0)), Matrix.Identity(), scene.getTransformMatrix(), cam.viewport.toGlobal(w, h))
    if (p.z < 0 || p.z > 1) return
    const el = document.createElement("span")
    el.textContent = String(Math.max(1, Math.round(dmg)))
    const size = kind === "clean" ? 54 : kind === "block" ? 26 : 40
    const color = kind === "clean" ? "#FFD23F" : kind === "block" ? "#C9CED8" : "#FF4FA3"
    el.style.cssText = `position:absolute;left:${p.x + (Math.random() - 0.5) * 30}px;top:${p.y}px;font:italic 900 ${size}px/1 system-ui,sans-serif;color:${color};-webkit-text-stroke:${kind === "block" ? 1.5 : 2.5}px #fff;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,.35);transform:translate(-50%,-50%);will-change:transform,opacity`
    layer.appendChild(el)
    const anim = el.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.4)", opacity: 0 },
        { transform: "translate(-50%,-90%) scale(1.25)", opacity: 1, offset: 0.15 },
        { transform: "translate(-50%,-140%) scale(1)", opacity: 1, offset: 0.6 },
        { transform: "translate(-50%,-220%) scale(0.9)", opacity: 0 },
      ],
      { duration: kind === "clean" ? 1100 : 850, easing: "ease-out" },
    )
    anim.onfinish = () => el.remove()
  }

  // ── tranco: quem leva joga cabeça e tronco para trás, por cima da animação ──
  const flinches: ({ at: number; amp: number; ax: number; az: number } | null)[] = [null, null]
  const flinch = (who: number, from: number, amp: number) => {
    const dx = drawn[who].x - drawn[from].x
    const dz = drawn[who].z - drawn[from].z
    const l = Math.hypot(dx, dz) || 1
    flinches[who] = { at: performance.now() / 1000, amp, ax: dx / l, az: dz / l }
  }
  const FLINCH_BONES: [string, number][] = [
    ["mixamorig:Spine1", 0.35],
    ["mixamorig:Spine2", 0.3],
    ["mixamorig:Neck", 0.35],
    ["mixamorig:Head", 0.6],
  ]
  const tmpQ = new Quaternion()
  const tmpM = new Matrix()
  const afterAnim = scene.onAfterAnimationsObservable.add(() => {
    const t = performance.now() / 1000
    for (let i = 0; i < 2; i++) {
      const f = flinches[i]
      if (!f) continue
      const age = t - f.at
      if (age > 0.6) {
        flinches[i] = null
        continue
      }
      // sobe rápido (60 ms) e volta amortecido
      const env = Math.sin(Math.min(1, age / 0.06) * (Math.PI / 2)) * Math.exp(-Math.max(0, age - 0.06) * 7)
      const ang = f.amp * env * FLINCH_SIGN
      // eixo de mundo: horizontal, perpendicular à direção do golpe (o topo vai para longe)
      const axis = new Vector3(f.az, 0, -f.ax)
      for (const [name, share] of FLINCH_BONES) {
        const n = fighters[i].bone(name) as TransformNode | null
        const parent = n?.parent as TransformNode | null
        if (!n || !parent || !n.rotationQuaternion) continue
        fighters[i].bonePosition(name) // a cadeia de mundo AGORA
        parent.getWorldMatrix().invertToRef(tmpM)
        const local = Vector3.TransformNormal(axis, tmpM).normalize()
        Quaternion.RotationAxisToRef(local, ang * share, tmpQ)
        tmpQ.multiplyToRef(n.rotationQuaternion, n.rotationQuaternion)
      }
    }
  })

  // ── eventos da sala ──────────────────────────────────────────────────────
  let endT = Infinity
  let towelled = false
  const fire = (e: number[]) => {
    const [, code, who] = e
    if (code === EV.PUNCH) {
      const res = e[3]
      const dmg = e[4]
      const def = 1 - who
      if (res >= RES.BLOCK && res !== RES.SLIP) {
        const clean = res === RES.CLEAN
        popDamage(def, dmg, res === RES.BLOCK ? "block" : clean ? "clean" : "hit")
        flinch(def, who, res === RES.BLOCK ? 0.08 : Math.min(0.55, 0.16 + dmg * 0.045) * (clean ? 1.35 : 1))
        if (def === me) {
          // o empurrão do golpe (o mesmo da sala)
          const push = res === RES.BLOCK ? 0.05 : Math.min(0.35, dmg * 0.03)
          const k = (clean && dmg >= 8 ? 1.6 : 1) * push * 6
          const ax = mine.x - drawn[who].x
          const az = mine.z - drawn[who].z
          const al = Math.hypot(ax, az) || 1
          kick.x += (ax / al) * k
          kick.z += (az / al) * k
        }
      }
      if (res === RES.BLOCK) audio.block()
      else if (res === RES.SLIP || res === RES.MISS) audio.whoosh()
      else {
        const clean = res === RES.CLEAN
        const power = Math.min(1, dmg / 9)
        audio.punch(power, clean)
        arena.setHype(clean ? 0.9 : 0.35 + power * 0.3)
        const away = new Vector3(drawn[def].x - drawn[who].x, 0, drawn[def].z - drawn[who].z).normalize().scale(1.4)
        burst(def, away, power + (clean ? 0.6 : 0), clean || fighterAt(last.f[def]).blood < 40)
        if (clean) {
          shake = Math.max(shake, 0.35)
          opts.onNotice?.({ kind: "clean", who })
        } else if (def === me) shake = Math.max(shake, 0.15)
      }
    } else if (code === EV.DOWN) {
      audio.fall()
      arena.setHype(1)
      shake = 0.5
      focus = { who, until: now() + 3.5 }
      opts.onNotice?.({ kind: "down", who, kd: e[3] })
    } else if (code === EV.COUNT) audio.count()
    else if (code === EV.UP) {
      arena.setHype(0.7)
      opts.onNotice?.({ kind: "up", who })
    } else if (code === EV.KO) {
      focus = { who: 1 - who, until: Infinity }
      opts.onNotice?.({ kind: "ko", who, tko: e[3] === 1 })
      audio.bell(3)
      arena.setHype(1)
    } else if (code === EV.BELL) {
      audio.bell(1)
      opts.onNotice?.({ kind: "bell", round: who })
    } else if (code === EV.BREAK) {
      if (who < T.rounds) {
        audio.bell(2)
        opts.onNotice?.({ kind: "break", round: who })
      }
    } else if (code === EV.END) {
      endT = e[0]
      if (!towelled && !focus) {
        audio.bell(3)
        arena.setHype(0.9)
        opts.onNotice?.({ kind: "end", winner: who })
        if (who >= 0) focus = { who, until: Infinity }
      }
    }
  }
  const onTowel = (m: { who: number; at: number }) => {
    if (towelled) return
    towelled = true
    focus = { who: 1 - m.who, until: Infinity }
    audio.bell(3)
    opts.onNotice?.({ kind: "towel", who: m.who })
  }
  net.listeners.towel.push(onTowel)
  if (net.towel) onTowel(net.towel)

  // ── quadro ───────────────────────────────────────────────────────────────
  const drawn: { x: number; z: number; face: number; speed: number; vx: number; vz: number }[] = [0, 1].map((i) => ({ x: start.snap.f[i][0], z: start.snap.f[i][1], face: 0, speed: 0, vx: 0, vz: 0 }))
  // estados que chegaram antes da cena abrir (só agora: usam a cena acima)
  net.listeners.snap.push(onSnap)
  for (const s of net.recent) onSnap(s)

  let hudAt = 0
  let readyFired = false
  let overFired = false

  function frame(ms: number) {
    const dt = Math.min(0.1, ms / 1000)
    const tNow = now()
    const tOp = tNow - INTERP
    // eventos no relógio do outro
    pendingEv.sort((a, b) => a[0] - b[0])
    while (pendingEv.length && pendingEv[0][0] <= tOp + 0.02) fire(pendingEv.shift()!)
    // ações novas do outro: golpe levado na hora (o soco foi meu); o resto no passado dele
    {
      const lo = fighterAt(last.f[op])
      if (lo.seq > shownSeq[op] && lo.act >= ACT.LIGHT && lo.act <= ACT.BLOCK) {
        shownSeq[op] = lo.seq
        playAct(op, { ...lo, t0: Math.min(lo.t0, tOp) })
      }
      const o = fighterIn(op, tOp).at
      if (o.seq > shownSeq[op]) {
        shownSeq[op] = o.seq
        playAct(op, o)
      }
    }
    readJoy()
    const ph = phaseNow()
    const ma = lastMine()
    // fila: apertou no fim do combo
    if (queued && canAct()) {
      queued = false
      attack()
    }
    if (local && tNow > local.end + 0.05) local = null

    // meu lutador: anda pelo joystick no round
    const prev = { x: drawn[me].x, z: drawn[me].z }
    if (ph === PH.ROUND && ma.act !== ACT.DOWN && ma.act !== ACT.RISE) {
      const busy = tNow < myBusyUntil()
      const reacting = ma.act === ACT.LIGHT || ma.act === ACT.HEAVY || ma.act === ACT.STAGGER
      const dodging = local?.kind === "dodge" || ma.act === ACT.DODGE
      const k = reacting && busy ? 0.3 : busy ? (dodging ? 0.35 : 0.2) : 1
      let vx = joy.x * ma.foot * k
      let vz = joy.z * ma.foot * k
      const o = drawn[op]
      const dx = o.x - mine.x
      const dz = o.z - mine.z
      const d = Math.hypot(dx, dz) || 1
      const comboing = (local?.kind === "combo" && tNow < local.end) || (ma.act === ACT.COMBO && busy)
      if (comboing && d > RANGE) (vx += (dx / d) * 0.9), (vz += (dz / d) * 0.9)
      mine.x = Math.max(-T.ring, Math.min(T.ring, mine.x + (vx + kick.x) * dt))
      mine.z = Math.max(-T.ring, Math.min(T.ring, mine.z + (vz + kick.z) * dt))
      const decay = Math.exp(-7 * dt)
      kick.x *= decay
      kick.z *= decay
      const d2 = Math.hypot(o.x - mine.x, o.z - mine.z)
      if (d2 < T.minSep && d2 > 1e-4) {
        const push = T.minSep - d2
        mine.x = Math.max(-T.ring, Math.min(T.ring, mine.x - ((o.x - mine.x) / d2) * push))
        mine.z = Math.max(-T.ring, Math.min(T.ring, mine.z - ((o.z - mine.z) / d2) * push))
      }
      // onde estou vai para a sala (e o joystick, para quem não manda posição)
      sendAt -= dt
      const changed = Math.hypot(joy.x - sentJoy.x, joy.z - sentJoy.z) > 0.15
      const moved = Math.hypot(mine.x - sentPos.x, mine.z - sentPos.z) > 0.01
      if (sendAt <= 0 && (moved || changed || Math.hypot(joy.x, joy.z) > 0)) {
        const r = (v: number) => Math.round(v * 1000) / 1000
        net.sendInput({ p: [r(mine.x), r(mine.z)], m: [r(joy.x), r(joy.z)] })
        sentJoy = { x: joy.x, z: joy.z }
        sentPos = { x: mine.x, z: mine.z }
        sendAt = SEND_EVERY
      }
    } else {
      const s = fighterIn(me, tNow)
      mine.x = s.x
      mine.z = s.z
    }
    drawn[me].x = mine.x
    drawn[me].z = mine.z
    const oo = fighterIn(op, tOp)
    const prevO = { x: drawn[op].x, z: drawn[op].z }
    drawn[op].x = oo.x
    drawn[op].z = oo.z
    for (const [i, p] of [
      [me, prev],
      [op, prevO],
    ] as const) {
      const k = Math.min(1, dt * 8)
      const inv = 1 / Math.max(dt, 1e-3)
      drawn[i].vx += ((drawn[i].x - p.x) * inv - drawn[i].vx) * k
      drawn[i].vz += ((drawn[i].z - p.z) * inv - drawn[i].vz) * k
      drawn[i].speed = Math.hypot(drawn[i].vx, drawn[i].vz)
    }
    runPlans()
    for (let i = 0; i < 2; i++) {
      const o = drawn[1 - i]
      const want = Math.atan2(o.x - drawn[i].x, o.z - drawn[i].z)
      drawn[i].face += angDiff(want, drawn[i].face) * Math.min(1, dt * 12)
      fighters[i].place(drawn[i].x, drawn[i].z, drawn[i].face, RING_Y, RING_Y)
      const a = i === me ? ma : oo.at
      let base: BoxeBase = "BGuard"
      if (ph === PH.INTRO) base = "BWarm"
      else if (ph === PH.BREAK) base = drawn[i].speed > 0.25 ? "Walk" : "Idle"
      else if (ph === PH.END) base = a.act === ACT.WIN && tNow >= a.t0 ? "BWin" : a.act === ACT.LOSE && tNow >= a.t0 ? "InjuredIdle" : "BGuard"
      fighters[i].setBoxe(base)
      // passada da direção (frente/trás/lados no referencial dele)
      const sf = Math.sin(drawn[i].face)
      const cf = Math.cos(drawn[i].face)
      if (base === "BGuard") fighters[i].setBoxeMove(drawn[i].vx * sf + drawn[i].vz * cf, drawn[i].vx * cf - drawn[i].vz * sf)
      else fighters[i].setBoxeMove(0, 0)
      fighters[i].animate(dt, ph === PH.BREAK && drawn[i].speed > 0.25 ? 1 : 0, ph === PH.BREAK ? Math.min(2.2, drawn[i].speed) : drawn[i].speed)
    }

    // árbitro: ao lado da dupla; na contagem, perto de quem caiu
    const cnt = last.cnt
    const mx = (drawn[0].x + drawn[1].x) / 2
    const mz = (drawn[0].z + drawn[1].z) / 2
    const lx = drawn[1].x - drawn[0].x
    const lz = drawn[1].z - drawn[0].z
    const ll = Math.hypot(lx, lz) || 1
    // o árbitro fica do lado de lá (a câmera fica do lado de cá)
    const side = me === 0 ? -1 : 1
    let rx = mx + (lz / ll) * 1.7 * side
    let rz = mz + (-lx / ll) * 1.7 * side
    if (cnt) {
      const w = cnt[0]
      rx = drawn[w].x + (drawn[1 - w].x - drawn[w].x) * 0.35 + 0.6
      rz = drawn[w].z + (drawn[1 - w].z - drawn[w].z) * 0.35
    }
    if (ph === PH.BREAK) {
      rx = 0
      rz = -2.2
    }
    rx = Math.max(-2.8, Math.min(2.8, rx))
    rz = Math.max(-2.8, Math.min(2.8, rz))
    const rp = ref.holder.position
    const rdx = rx - rp.x
    const rdz = rz - rp.z
    const rd = Math.hypot(rdx, rdz)
    const rstep = Math.min(rd, 2.2 * dt)
    const nx = rd > 0.05 ? rp.x + (rdx / rd) * rstep : rp.x
    const nz = rd > 0.05 ? rp.z + (rdz / rd) * rstep : rp.z
    const rface = rd > 0.15 ? Math.atan2(rdx, rdz) : Math.atan2(mx - nx, mz - nz)
    ref.place(nx, nz, ref.holder.rotation.y + angDiff(rface, ref.holder.rotation.y) * Math.min(1, dt * 6), RING_Y, RING_Y)
    ref.animate(dt, rd > 0.15 ? 1 : 0, rd > 0.15 ? 2.2 : 0)

    // câmera de transmissão: de lado, comigo à esquerda da tela
    const tall = canvas.clientHeight > canvas.clientWidth * 1.1
    let R = (tall ? CAM_R * 1.5 : CAM_R) + Math.min(1.5, ll * 0.4)
    let H = RING_Y + (tall ? 2.5 : 1.9)
    let tx = mx
    let tz = mz
    let ty = RING_Y + 1.15
    // perpendicular à linha que deixa o canto `me` à esquerda
    const px = (me === 0 ? lz : -lz) / ll
    const pz = (me === 0 ? -lx : lx) / ll
    let want = Math.atan2(px, pz)
    let turn = 2.4
    if (ph === PH.INTRO) {
      want = -Math.PI / 2 + tNow * 0.35
      R = tall ? 11 : 9
      H = RING_Y + 3.4
      tx = tz = 0
      turn = 3
    } else if (focus) {
      const w = drawn[focus.who]
      tx = w.x * 0.7 + drawn[1 - focus.who].x * 0.3
      tz = w.z * 0.7 + drawn[1 - focus.who].z * 0.3
      if (tNow < focus.until) {
        R *= 0.75
        H = RING_Y + 1.5
        ty = RING_Y + 0.8
      } else focus = null
    }
    const da = angDiff(want, camAng)
    camAng += Math.sign(da) * Math.min(Math.abs(da) * Math.min(1, dt * 3), turn * dt)
    const wantPos = new Vector3(tx + Math.sin(camAng) * R, H, tz + Math.cos(camAng) * R)
    camPos.addInPlace(wantPos.subtract(camPos).scale(Math.min(1, dt * 3)))
    camLook.addInPlace(new Vector3(tx, ty, tz).subtract(camLook).scale(Math.min(1, dt * 5)))
    shake = Math.max(0, shake - dt)
    const sk = shake * shake * 0.25
    cam.position.set(camPos.x + (Math.random() - 0.5) * sk, camPos.y + (Math.random() - 0.5) * sk, camPos.z + (Math.random() - 0.5) * sk)
    cam.setTarget(camLook)
    cam.fov += ((focus && tNow < focus.until ? 0.72 : 0.85) - cam.fov) * Math.min(1, dt * 3)

    arena.tick(dt)
    audio.tick(dt)

    const over = ph === PH.END && tNow >= Math.min(endT, last.t) + 0.3
    hudAt -= dt
    if (hudAt <= 0 || (over && !overFired)) {
      hudAt = 0.1
      if (over) overFired = true
      const a = fighterAt(last.f[0])
      const b = fighterAt(last.f[1])
      opts.onHud?.({
        phase: { kind: PH_KIND[ph] ?? "round", round: last.ph[1], left: last.ph[2] },
        blood: [a.blood, b.blood],
        stam: [a.stam, b.stam],
        count: cnt ? { who: cnt[0], n: cnt[1], down: true } : { who: -1, n: 0, down: false },
        tally: [a, b].map((f) => ({ thrown: f.thrown, landed: f.landed, kd: f.kd })),
        over,
        canAct: canAct(),
      })
    }
    governor.tick(ms)
    if (!readyFired && fighters.every((c) => c.hasAvatar)) {
      readyFired = true
      opts.onReady?.()
    }
  }

  // sem avatar em 6 s (rede ruim): mostra assim mesmo
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
  w.__boxe = () => ({ t: now(), ph: phaseNow(), drawn, mine: { ...mine }, local, canAct: canAct(), ready: readyFired, plans: plans.map((p) => p.length), flinch: (who: number, from: number, amp: number) => flinch(who, from, amp), head: (i: number) => fighters[i].bonePosition("mixamorig:Head") })
  w.__boxeScene = scene

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
      for (const [list, f] of [
        [net.listeners.towel, onTowel],
        [net.listeners.snap, onSnap],
      ] as const) {
        const i = (list as unknown[]).indexOf(f)
        if (i >= 0) list.splice(i, 1)
      }
      if (Math.hypot(sentJoy.x, sentJoy.z) > 0) net.sendInput({ m: [0, 0], p: [mine.x, mine.z] })
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
      window.removeEventListener("blur", blur)
      canvas.removeEventListener("pointerdown", click)
      ro.disconnect()
      scene.onAfterAnimationsObservable.remove(afterAnim)
      layer.remove()
      delete w.__boxe
      delete w.__boxeScene
      engine.onContextLostObservable.remove(lost)
      engine.stopRenderLoop()
      audio.dispose()
      sweat.dispose()
      blood.dispose()
      dotTex.dispose()
      for (const c of fighters) c.dispose()
      ref.dispose()
      for (const g of gloves.flat()) g.dispose()
      for (const m of gloveMats) m.dispose()
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
