// features/meu-mundo/boxe/engine/fight-game.ts — ARENA DE BOXE (mm3d-43): a cena.
//
// Pedido do Alex: "você não controla o personagem — calcula tudo e deixa eles
// brigando, e o usuário assiste". A luta já vem calculada pela sala (linha do
// tempo em fight.ts); aqui ela é DESENHADA no relógio da sala:
//  - os dois lutadores são os avatares (corpo, skin e cores de cada um) com as
//    animações de boxe (build_boxe_mocap.py) e luvas vermelha/azul presas às
//    mãos; andam pelo ringue pelas amostras de posição e sempre se encaram;
//  - cada golpe começa ANTES do impacto (o trecho do clipe é esticado para o
//    impacto cair no instante do evento); quem leva bloqueia, esquiva ou
//    sente o golpe; queda = desaba e fica deitado; levantou = Kip Up;
//  - no intervalo cada um anda para o seu canto; no fim, o vencedor comemora
//    e o perdedor fica abatido (ou no chão, no nocaute);
//  - o árbitro anda junto e vai até quem caiu para contar;
//  - câmera de transmissão: de lado para a dupla, chega perto na queda e no
//    nocaute, treme no golpe limpo; suor (e sangue quando a barra está baixa)
//    espirram no golpe; a plateia pula com a emoção.
// A TOALHA corta a luta no instante que a sala avisar (para os dois).

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { SpotLight } from "@babylonjs/core/Lights/spotLight"
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import "@babylonjs/core/Particles/particleSystemComponent"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { liveGamesBump } from "../../engine/game"
import { ResolutionGovernor, frameCapMs, resolveQuality } from "../../engine/quality"
import { AvatarLibrary, type BoxeClip } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { BODY_IDS, type BodyId } from "../../types"
import { CORNERS, EV, PUNCHES, PUNCH_KINDS, RES, countAt, phaseAt, sampleAt, tallyAt, type FightStart, type Phase, type PunchKind } from "./fight"
import { buildArena, BLUE, RED, RING_Y } from "./arena-view"
import { BoxeAudio } from "./audio"
import type { BoxeNet } from "./net"

export interface BoxeHud {
  phase: Phase
  /** 0–100 por canto. */
  blood: [number, number]
  stam: [number, number]
  /** Contagem do árbitro (n 0 = no chão, antes do "1"). */
  count: { who: number; n: number; down: boolean }
  tally: { thrown: number; landed: number; kd: number }[]
  /** A luta acabou na tela (nocaute, sino final ou toalha). */
  over: boolean
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
  dispose: () => void
}

const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b)

/** Trecho do clipe de cada golpe (0–1) e onde cai o impacto dentro dele. */
const PUNCH_CLIP: Record<PunchKind, { clip: BoxeClip; from: number; to: number; impact: number; stretch: number }> = {
  jab: { clip: "BJab", from: 0.08, to: 0.6, impact: 0.3, stretch: 1.25 },
  cross: { clip: "BCross", from: 0.2, to: 0.92, impact: 0.55, stretch: 1.25 },
  hook: { clip: "BHook", from: 0.05, to: 0.62, impact: 0.32, stretch: 1.25 },
  upper: { clip: "BUpper", from: 0.25, to: 0.88, impact: 0.55, stretch: 1.2 },
  combo: { clip: "BCombo", from: 0.05, to: 0.95, impact: 0.2, stretch: 1.15 },
}
/** Corpo do árbitro: camisa branca, calça preta (código look). */
const REF_LOOK = "1230"
/** Raio da câmera (m) de lado para a dupla; em pé no celular, mais longe. */
const CAM_R = 5.4

type Action = { at: number; run: () => void }

export function createFightGame(opts: FightGameOptions): FightGameHandle {
  const { canvas, net, start } = opts
  const f = start.fight
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
  scene.clearColor = new Color4(0.03, 0.03, 0.05, 1)
  scene.ambientColor = new Color3(0.3, 0.3, 0.35)
  scene.fogMode = Scene.FOGMODE_LINEAR
  scene.fogColor = new Color3(0.03, 0.03, 0.05)
  scene.fogStart = 18
  scene.fogEnd = 40
  scene.skipPointerMovePicking = true
  scene.skipPointerDownPicking = true
  scene.skipPointerUpPicking = true
  const hemi = new HemisphericLight("boxe-hemi", new Vector3(0, 1, 0), scene)
  hemi.intensity = touch ? 0.62 : 0.5
  hemi.diffuse = new Color3(0.85, 0.85, 0.95)
  hemi.groundColor = new Color3(0.12, 0.1, 0.14)
  const spot = new SpotLight("boxe-spot", new Vector3(0, 9, 0), new Vector3(0, -1, 0), Math.PI / 3.2, 6, scene)
  spot.intensity = 1.25
  spot.diffuse = new Color3(1, 0.96, 0.88)

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
  for (const ch of fighters) ch.setBoxe("BGuard")
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
    const head = fighters[who].bonePosition("mixamorig:Head") ?? new Vector3(0, RING_Y + 1.6, 0)
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

  // ── a linha do tempo vira ações agendadas ────────────────────────────────
  const actions: Action[] = []
  /** Quem está deitado agora (a queda disparou com o avatar pronto). */
  const lying = [false, false]
  const add = (at: number, run: () => void) => actions.push({ at, run })
  const lastCombo = [-9, -9]
  let hitFlip = [false, false]
  for (const e of f.ev) {
    const [t, who, code] = e
    if (code === EV.PUNCH) {
      const kind = PUNCH_KINDS[e[3]] ?? "jab"
      const res = e[4]
      const dmg = e[5]
      const body = e[6] === 1
      const def = 1 - who
      const pc = PUNCH_CLIP[kind]
      const dur = PUNCHES[kind].dur * pc.stretch
      const lead = ((pc.impact - pc.from) / (pc.to - pc.from)) * dur
      // combo: a animação começa só no 1º soco da sequência
      if (kind !== "combo" || t - lastCombo[who] > 1.7) {
        if (kind === "combo") lastCombo[who] = t
        add(t - lead, () => fighters[who].boxeAct(pc.clip, dur, pc.from, pc.to))
      }
      if (res === RES.BLOCK) {
        add(t - 0.16, () => fighters[def].boxeAct("BBlock", 0.48, 0.1, 0.55))
        add(t, () => audio.block())
      } else if (res === RES.SLIP) {
        add(t - 0.22, () => fighters[def].boxeAct("BSlip", 0.6, 0.28, 0.6))
        add(t, () => audio.whoosh())
      } else if (res === RES.MISS) add(t, () => audio.whoosh())
      else {
        const clean = res === RES.CLEAN
        const power = Math.min(1, dmg / 9)
        add(t, () => {
          if (body) fighters[def].boxeAct("BHitBody", clean ? 0.75 : 0.55, 0, 0.7)
          else {
            hitFlip[def] = !hitFlip[def]
            fighters[def].boxeAct(hitFlip[def] ? "BHitHead" : "BHitHead2", clean ? 0.8 : 0.55)
          }
          audio.punch(power, clean)
          arena.setHype(clean ? 0.9 : 0.35 + power * 0.3)
          const a = posOf(who)
          const d = posOf(def)
          const away = new Vector3(d.x - a.x, 0, d.z - a.z).normalize().scale(1.4)
          burst(def, away, power + (clean ? 0.6 : 0), !body && (clean || bloodAt(def) < 40))
          if (clean) {
            shake = 0.35
            opts.onNotice?.({ kind: "clean", who })
          }
        })
      }
    } else if (code === EV.DOWN) {
      add(t, () => {
        lying[who] = fighters[who].boxeAct("BFall", 1.15, 0, 1, true)
        audio.fall()
        arena.setHype(1)
        shake = 0.5
        focus = { who, until: t + 3.5 }
        opts.onNotice?.({ kind: "down", who, kd: e[3] })
      })
    } else if (code === EV.COUNT) add(t, () => audio.count())
    else if (code === EV.UP) {
      add(t - 1.25, () => {
        lying[who] = false
        fighters[who].boxeAct("BRise", 1.65)
      })
      add(t, () => {
        arena.setHype(0.7)
        opts.onNotice?.({ kind: "up", who })
      })
    } else if (code === EV.KO) {
      add(t, () => {
        focus = { who: 1 - who, until: Infinity }
        opts.onNotice?.({ kind: "ko", who, tko: e[3] === 1 })
        audio.bell(3)
        arena.setHype(1)
      })
      add(t + 1.2, () => fighters[1 - who].setBoxe("BWin"))
    } else if (code === EV.BELL) add(t, () => (audio.bell(1), opts.onNotice?.({ kind: "bell", round: who })))
    else if (code === EV.BREAK) add(t, () => (audio.bell(2), opts.onNotice?.({ kind: "break", round: who })))
    else if (code === EV.END && f.result.method !== "ko" && f.result.method !== "tko") {
      add(t, () => {
        audio.bell(3)
        arena.setHype(0.9)
        opts.onNotice?.({ kind: "end", winner: who })
      })
      add(t + 0.8, () => {
        if (who < 0) fighters.forEach((c) => c.setBoxe("TiredIdle"))
        else {
          fighters[who].setBoxe("BWin")
          fighters[1 - who].setBoxe("InjuredIdle")
          focus = { who, until: Infinity }
        }
      })
    }
  }
  actions.sort((a, b) => a.at - b.at)
  let next = 0
  hitFlip = [false, false]

  // toalha: a luta para no instante que a sala disser (para os dois)
  let cut = f.result.t
  let towelled = false
  const onTowel = (m: { who: number; at: number }) => {
    if (towelled || m.at >= f.result.t) return
    towelled = true
    cut = m.at
    // o que viria depois do corte não acontece
    actions.splice(next, actions.length - next, ...actions.slice(next).filter((a) => a.at <= m.at))
    add(m.at, () => {
      fighters[m.who].boxeClear()
      fighters[m.who].setBoxe("InjuredIdle")
      fighters[1 - m.who].boxeClear()
      fighters[1 - m.who].setBoxe("BWin")
      focus = { who: 1 - m.who, until: Infinity }
      audio.bell(3)
      opts.onNotice?.({ kind: "towel", who: m.who })
    })
    actions.sort((a, b) => a.at - b.at)
  }
  net.listeners.towel.push(onTowel)
  if (net.towel) onTowel(net.towel)

  // ── relógio ──────────────────────────────────────────────────────────────
  const t0 = performance.now() / 1000
  const clock = () => {
    const s = net.serverTime()
    return s ?? performance.now() / 1000 - t0 - start.intro
  }
  const shown = (t: number) => Math.min(t, cut)
  const posOf = (who: number) => drawn[who]
  const bloodAt = (who: number) => sampleAt(f, who, Math.max(0, shown(clock()))).blood
  const drawn: { x: number; z: number; face: number }[] = [0, 1].map((i) => ({ x: CORNERS[i].x, z: CORNERS[i].z, face: 0 }))
  let breakFrom: { x: number; z: number }[] | null = null

  // ── câmera ───────────────────────────────────────────────────────────────
  const cam = new FreeCamera("boxe-cam", new Vector3(0, 4, -9), scene)
  cam.inputs.clear()
  cam.minZ = 0.1
  cam.maxZ = 120
  cam.fov = 0.85
  scene.activeCamera = cam
  let camAng = -Math.PI / 2
  let camSide = 1
  const camPos = new Vector3(0, 4, -9)
  const camLook = new Vector3(0, RING_Y + 1, 0)
  let shake = 0
  let focus: { who: number; until: number } | null = null

  const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

  let lastT = clock()
  let hudAt = 0
  let readyFired = false
  let overFired = false
  let walkSpeed = [0, 0]

  function frame(ms: number) {
    const dt = Math.min(0.1, ms / 1000)
    const tc = clock()
    let t = shown(tc)
    // aba voltou depois de muito tempo: pula as ações velhas sem tocar tudo de uma vez
    if (t - lastT > 1.5) while (next < actions.length && actions[next].at < t - 0.6) next++
    while (next < actions.length && actions[next].at <= t) actions[next++].run()
    lastT = t
    const ph = phaseAt(f, t)
    // posições: amostras na luta; no intervalo, cada um anda para o seu canto
    for (let i = 0; i < 2; i++) {
      const s = sampleAt(f, i, Math.max(0, t))
      let x = s.x
      let z = s.z
      if (ph.kind === "break") {
        if (!breakFrom) breakFrom = drawn.map((d) => ({ x: d.x, z: d.z }))
        const u = Math.min(1, ph.since / 2.4)
        const k = u * u * (3 - 2 * u)
        x = breakFrom[i].x + (CORNERS[i].x - breakFrom[i].x) * k
        z = breakFrom[i].z + (CORNERS[i].z - breakFrom[i].z) * k
      }
      const sp = Math.hypot(x - drawn[i].x, z - drawn[i].z) / Math.max(dt, 1e-3)
      walkSpeed[i] += (sp - walkSpeed[i]) * Math.min(1, dt * 8)
      drawn[i].x = x
      drawn[i].z = z
    }
    if (ph.kind !== "break") breakFrom = null
    for (let i = 0; i < 2; i++) {
      const o = drawn[1 - i]
      const want = Math.atan2(o.x - drawn[i].x, o.z - drawn[i].z)
      drawn[i].face += angDiff(want, drawn[i].face) * Math.min(1, dt * 10)
      fighters[i].place(drawn[i].x, drawn[i].z, drawn[i].face, RING_Y, RING_Y)
      // pose-base: guarda na luta; no intervalo anda até o canto e descansa
      if (ph.kind === "break") fighters[i].setBoxe(ph.since < 2.4 ? "Walk" : "Idle")
      else if (ph.kind === "round" || ph.kind === "intro") {
        if (!towelled) fighters[i].setBoxe("BGuard")
      }
      fighters[i].animate(dt, ph.kind === "break" && ph.since < 2.4 ? 1 : 0, ph.kind === "break" ? Math.min(2.2, walkSpeed[i]) : 0)
    }
    // árbitro: ao lado da dupla; na contagem, perto de quem caiu
    const cnt = countAt(f, t)
    // no chão sem a queda tocada (avatar chegou depois, ou abriu no meio da contagem): deita direto
    const koed = ph.kind === "end" && (f.result.method === "ko" || f.result.method === "tko") && !towelled ? 1 - f.result.winner : -1
    for (let i = 0; i < 2; i++) {
      const should = (cnt.down && cnt.who === i && t < (f.ev.find((e) => e[2] === EV.UP && e[1] === i && e[0] > t)?.[0] ?? Infinity) - 1.25) || koed === i
      if (should && !lying[i] && fighters[i].hasAvatar) lying[i] = fighters[i].boxeAct("BFall", 0.25, 0.85, 1, true)
    }
    const mx = (drawn[0].x + drawn[1].x) / 2
    const mz = (drawn[0].z + drawn[1].z) / 2
    const lx = drawn[1].x - drawn[0].x
    const lz = drawn[1].z - drawn[0].z
    const ll = Math.hypot(lx, lz) || 1
    let rx = mx + (-lz / ll) * 1.7
    let rz = mz + (lx / ll) * 1.7
    if (cnt.down && cnt.who >= 0) {
      rx = drawn[cnt.who].x + (drawn[1 - cnt.who].x - drawn[cnt.who].x) * 0.35 + 0.6
      rz = drawn[cnt.who].z + (drawn[1 - cnt.who].z - drawn[cnt.who].z) * 0.35
    }
    if (ph.kind === "break") {
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

    // câmera de transmissão
    const tall = canvas.clientHeight > canvas.clientWidth * 1.1
    let R = (tall ? CAM_R * 1.45 : CAM_R) + Math.min(1.5, ll * 0.4)
    let H = RING_Y + (tall ? 2.6 : 2.0)
    let tx = mx
    let tz = mz
    let ty = RING_Y + 1.15
    const lineAng = Math.atan2(lx, lz)
    let want = lineAng + (camSide * Math.PI) / 2 + Math.sin(tc * 0.13) * 0.35
    if (ph.kind === "intro") {
      want = -Math.PI / 2 + tc * 0.35
      R = tall ? 11 : 9
      H = RING_Y + 3.4
      tx = tz = 0
    } else if (focus) {
      const w = drawn[focus.who]
      const fx = focus.who
      tx = w.x * 0.7 + drawn[1 - fx].x * 0.3
      tz = w.z * 0.7 + drawn[1 - fx].z * 0.3
      if (t < focus.until) {
        R *= 0.72
        H = RING_Y + 1.5
        ty = RING_Y + 0.8
      } else focus = null
    }
    // escolhe o lado que exige menos giro (sem cruzar a linha de repente)
    const alt = lineAng - (camSide * Math.PI) / 2
    if (Math.abs(angDiff(alt, camAng)) + 0.5 < Math.abs(angDiff(want, camAng))) camSide = -camSide
    camAng += angDiff(want, camAng) * Math.min(1, dt * (ph.kind === "intro" ? 3 : 1.4))
    const wantPos = new Vector3(tx + Math.sin(camAng) * R, H, tz + Math.cos(camAng) * R)
    camPos.addInPlace(wantPos.subtract(camPos).scale(Math.min(1, dt * 2.5)))
    camLook.addInPlace(new Vector3(tx, ty, tz).subtract(camLook).scale(Math.min(1, dt * 4)))
    shake = Math.max(0, shake - dt)
    const sk = shake * shake * 0.25
    cam.position.set(camPos.x + (Math.random() - 0.5) * sk, camPos.y + (Math.random() - 0.5) * sk, camPos.z + (Math.random() - 0.5) * sk)
    cam.setTarget(camLook)
    cam.fov += ((focus && t < (focus.until ?? 0) ? 0.7 : 0.85) - cam.fov) * Math.min(1, dt * 3)

    arena.tick(dt)
    audio.tick(dt)

    const over = tc >= cut + 0.2
    hudAt -= dt
    if (hudAt <= 0 || (over && !overFired)) {
      hudAt = 0.1
      if (over) overFired = true
      const a = sampleAt(f, 0, Math.max(0, t))
      const b = sampleAt(f, 1, Math.max(0, t))
      opts.onHud?.({
        phase: ph,
        blood: [a.blood, b.blood],
        stam: [a.stam, b.stam],
        count: cnt,
        tally: tallyAt(f, t),
        over,
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
  w.__boxe = () => ({ t: clock(), cut, next, actions: actions.length, drawn, ready: readyFired })
  w.__boxeScene = scene

  return {
    setMuted(m) {
      audio.setMuted(m)
    },
    dispose() {
      if (disposed) return
      disposed = true
      clearTimeout(readyTimer)
      const i = net.listeners.towel.indexOf(onTowel)
      if (i >= 0) net.listeners.towel.splice(i, 1)
      ro.disconnect()
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

