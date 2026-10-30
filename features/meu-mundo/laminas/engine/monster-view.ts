// features/meu-mundo/laminas/engine/monster-view.ts — ARENA DAS LÂMINAS (mm3d-48a): os monstros PROVISÓRIOS.
//
// Pedido do Alex (29/10): "cria eles bem simples, depois eu vou te mandar eles
// gerados para você substituir". Cada monstro é um boneco de formas (caixas,
// esferas, cilindros) com os olhos violeta do Sem-Nome, animado por código
// pela pose da regra (aviso = recua e brilha, golpe = avança, pancada =
// treme, morte = afunda). O mesmo boneco aparece na cidade (center-mobs.ts)
// e na arena. Trocar pelo modelo de verdade = outra classe com a mesma API
// (`update` e `dispose`).
//
// 2026-10-29 (Alex): modelos de verdade — Soldado de Pedra = Golem de Pedra
// (níveis 1 e 2), Golem de Sucata = Ciborgue, Harpia = Dama das Garras (os três
// são as skins de 2 m, rigadas com as animações do Sergio: andam e golpeiam com
// os clipes do boxe, como o jogador na arena) e o Lobo = a fera de 4 patas
// (mm3d-54: GLB com esqueleto e clipes próprios — Idle/Walk/Run/Bite/Pounce/
// Dodge/Hit/Die/Howl, pipeline/laminas/build_lobo_anim.py; os golpes tocam o
// trecho do clipe esticado na duração da regra). O Brutamontes segue de formas.

import type { Scene } from "@babylonjs/core/scene"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import type { MobKind, MobState } from "../sim/fight"
import { AvatarLibrary, ensureLoaders } from "../../engine/avatars"
import { Character } from "../../engine/player"
import type { BodyId } from "../../types"

/** Monstros com corpo de gente: a skin rigada e a escala na luta. */
const RIGGED: Partial<Record<MobKind, { body: BodyId; scale: number }>> = {
  soldier: { body: "golem", scale: 1.1 },
  golem: { body: "ciborgue", scale: 1.4 },
  harpy: { body: "garras", scale: 1.05 },
}
/** O lobo (pipeline/laminas/build_lobo_anim.py): chega com o focinho no −X → gira para o +Z. */
const WOLF_URL = "/meu-mundo/laminas/lobo-m54.glb"
const WOLF_TURN = Math.PI / 2
/** O lobo é GRANDE (Alex, 29/10): 4 m de focinho a rabo. */
const WOLF_SCALE = 2
/**
 * Trechos de cada golpe no clipe (s), iguais aos de build_lobo_anim.py: o
 * preparo, o bote/mordida e a volta tocam esticados na duração da regra.
 */
const WOLF_ATTACK: Record<string, { clip: string; len: number; windup: [number, number]; strike: [number, number]; recover: [number, number] }> = {
  bite: { clip: "Bite", len: 1.3, windup: [0, 0.5], strike: [0.5, 0.68], recover: [0.68, 1.3] },
  pounce: { clip: "Pounce", len: 1.85, windup: [0, 0.6], strike: [0.6, 0.95], recover: [0.95, 1.85] },
}
/** Velocidade das patas no chão com o clipe a 1× (m/s, já na escala de 4 m): o clipe acompanha o passo. */
const WOLF_WALK = 1.12
const WOLF_RUN = 8.5

/** Biblioteca de avatares com os clipes do boxe, uma por cena (monstros rigados). */
const libs = new WeakMap<Scene, { lib: AvatarLibrary; fallback: StandardMaterial; shadow: StandardMaterial }>()
function rigKit(scene: Scene) {
  let k = libs.get(scene)
  if (!k) {
    const fallback = new StandardMaterial("mm-mob-fallback", scene)
    fallback.diffuseColor = new Color3(0.5, 0.48, 0.55)
    fallback.specularColor = new Color3(0.05, 0.05, 0.05)
    const shadow = new StandardMaterial("mm-mob-shadow", scene)
    shadow.diffuseColor = new Color3(0, 0, 0)
    shadow.specularColor = new Color3(0, 0, 0)
    shadow.disableLighting = true
    shadow.alpha = 0.35
    k = { lib: new AvatarLibrary(scene, false, false, 30, false, false, true), fallback, shadow }
    scene.onDisposeObservable.addOnce(() => k!.lib.dispose())
    libs.set(scene, k)
  }
  return k
}
const wolves = new WeakMap<Scene, Promise<AssetContainer>>()
function wolfContainer(scene: Scene) {
  let p = wolves.get(scene)
  if (!p) {
    ensureLoaders()
    p = LoadAssetContainerAsync(WOLF_URL, scene)
    wolves.set(scene, p)
  }
  return p
}

/** O que a regra diz do monstro neste quadro. */
export interface MobPose {
  x: number
  y: number
  z: number
  facing: number
  state: MobState
  /** Tempo no estado (s). */
  t: number
  /** 0–1 do aviso (só em windup). */
  warn: number
  /** Andando (m/s), para as pernas. */
  speed: number
  /** Golpe em curso (windup/strike/recover) e a duração de cada fase na regra. */
  attack?: { id: string; windup: number; active: number; recover: number }
}

const VIOLET = new Color3(0.72, 0.3, 1)

type Part = { mesh: Mesh; base: { x: number; y: number; z: number }; sy: number; role: string }

/** Materiais por cor, um por cena (os monstros repetem cores). */
const mats = new WeakMap<Scene, Map<string, StandardMaterial>>()
function mat(scene: Scene, hex: string, glow = 0): StandardMaterial {
  let m = mats.get(scene)
  if (!m) {
    m = new Map()
    mats.set(scene, m)
  }
  const key = `${hex}:${glow}`
  let got = m.get(key)
  if (!got) {
    got = new StandardMaterial(`mm-mob-${key}`, scene)
    const c = Color3.FromHexString(hex)
    got.diffuseColor = c
    got.specularColor = new Color3(0.08, 0.08, 0.08)
    if (glow) {
      got.emissiveColor = c.scale(glow)
      got.disableLighting = glow >= 1
    }
    m.set(key, got)
  }
  return got
}

let seq = 0

export class MonsterModel {
  readonly root: TransformNode
  /** Corpo que inclina e treme (filho do root). */
  private readonly body: TransformNode
  private readonly parts: Part[] = []
  private readonly flash: StandardMaterial
  private walk = 0
  private gone = false
  /** Corpo de gente (skin rigada) no lugar das formas. */
  private char: Character | null = null
  private last: MobState | null = null
  private readonly real: boolean
  /** Lobo rigado: os clipes (nome → grupo) e o que está tocando. */
  private wolf: { anims: Map<string, AnimationGroup>; entries: InstantiatedEntries } | null = null
  private wolfClip = ""
  private dodgeLeft = 0

  constructor(
    private readonly scene: Scene,
    readonly kind: MobKind,
    /** Escala extra (a cidade mostra um pouco maior para ler de longe). */
    scale = 1,
  ) {
    const id = ++seq
    this.root = new TransformNode(`mm-mob-${kind}-${id}`, scene)
    this.body = new TransformNode(`mm-mob-body-${id}`, scene)
    this.body.parent = this.root
    this.root.scaling.setAll(scale)
    // Material próprio que pisca no aviso (o corpo principal de cada um).
    this.flash = new StandardMaterial(`mm-mob-flash-${id}`, scene)
    this.flash.specularColor = new Color3(0.08, 0.08, 0.08)
    const rig = RIGGED[kind]
    this.real = !!rig || kind === "wolf"
    if (rig) {
      const k = rigKit(scene)
      this.char = new Character(scene, k.lib, { fallback: k.fallback, shadow: k.shadow }, rig.body, null, false)
      this.char.holder.scaling.setAll(rig.scale * scale)
      this.char.setBoxe("BGuard")
    } else if (kind === "wolf") {
      wolfContainer(scene)
        .then((c) => {
          if (this.gone) return
          const e = c.instantiateModelsToScene((n) => `${n}-${id}`, false, { doNotInstantiate: true })
          // A raiz do glTF gira por quaternion: a volta fica num nó próprio.
          const turn = new TransformNode(`mm-mob-wolf-turn-${id}`, scene)
          turn.parent = this.body
          turn.rotation.y = WOLF_TURN
          turn.scaling.setAll(WOLF_SCALE)
          for (const n of e.rootNodes) n.parent = turn
          if (e.animationGroups.length) {
            const anims = new Map<string, AnimationGroup>()
            for (const g of e.animationGroups) {
              g.stop()
              // Troca de clipe com mistura curta (sem salto de pose).
              for (const ta of g.targetedAnimations) {
                ta.animation.enableBlending = true
                ta.animation.blendingSpeed = 0.12
              }
              anims.set(g.name.replace(`-${id}`, ""), g)
            }
            this.wolf = { anims, entries: e }
            this.playWolf("Idle", true)
          }
        })
        .catch(() => {
          if (!this.gone) BUILD.wolf(this)
        })
    } else BUILD[kind](this)
  }

  // ── peças ────────────────────────────────────────────────────────────────
  /** Peça no corpo: caixa, esfera ou cilindro, em metros, com papel para a animação. */
  add(shape: "box" | "sphere" | "cyl" | "cone", size: [number, number, number], at: [number, number, number], hex: string, role = "", opts: { glow?: number; main?: boolean; rot?: [number, number, number] } = {}) {
    const name = `mm-mob-part-${this.parts.length}`
    let mesh: Mesh
    if (shape === "box") mesh = CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene)
    else if (shape === "sphere") {
      mesh = CreateSphere(name, { diameter: 1, segments: 10 }, this.scene)
      mesh.scaling.set(size[0], size[1], size[2])
    } else if (shape === "cyl") mesh = CreateCylinder(name, { height: size[1], diameterTop: size[0], diameterBottom: size[2], tessellation: 10 }, this.scene)
    else mesh = CreateCylinder(name, { height: size[1], diameterTop: 0, diameterBottom: size[0], tessellation: 8 }, this.scene)
    mesh.parent = this.body
    mesh.position.set(at[0], at[1], at[2])
    if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2])
    mesh.isPickable = false
    if (opts.main) {
      this.flash.diffuseColor = Color3.FromHexString(hex)
      mesh.material = this.flash
    } else mesh.material = mat(this.scene, hex, opts.glow ?? 0)
    this.parts.push({ mesh, base: { x: at[0], y: at[1], z: at[2] }, sy: mesh.scaling.y, role })
    return mesh
  }

  eyes(y: number, z: number, dx: number, r = 0.07) {
    for (const s of [-1, 1]) this.add("sphere", [r * 2, r * 2, r * 1.2], [s * dx, y, z], "#B84DFF", "eye", { glow: 1 })
  }

  // ── animação ─────────────────────────────────────────────────────────────
  update(dt: number, p: MobPose) {
    if (this.gone) return
    if (this.char) return this.updateRigged(dt, p)
    if (this.wolf) return this.updateWolf(dt, p)
    this.root.position.set(p.x, p.y, p.z)
    this.root.rotation.y = p.facing
    this.walk += dt * Math.min(9, 2 + p.speed * 3.2)
    const sw = Math.sin(this.walk)
    let lean = 0
    let shake = 0
    let rise = 1
    let sink = 0
    const glow = p.state === "windup" ? 0.25 + 0.5 * p.warn * (0.6 + 0.4 * Math.sin(p.t * 30)) : 0
    switch (p.state) {
      case "spawn":
        rise = Math.min(1, Math.max(0.05, p.t / 0.9))
        break
      case "windup":
        lean = -0.28 * Math.min(1, p.warn * 1.4)
        break
      case "strike":
        lean = 0.42
        break
      case "recover":
        lean = 0.2 * Math.max(0, 1 - p.t * 2)
        break
      case "hurt":
        shake = Math.sin(p.t * 60) * 0.06 * Math.max(0, 1 - p.t * 2)
        lean = -0.15
        break
      case "dead":
        sink = Math.min(1, p.t / 1.1)
        lean = -0.5 * sink
        break
    }
    this.body.rotation.x = lean
    this.body.position.x = shake
    this.body.position.y = -sink * 0.6
    // O lobo de verdade não tem pernas soltas: o passo vira um balanço do corpo.
    if (this.real && p.speed > 0.2 && p.state !== "dead") this.body.position.y += Math.abs(sw) * 0.06
    this.body.scaling.set(rise, rise, rise)
    this.flash.emissiveColor = new Color3(glow, glow * 0.15, glow * 0.15)
    const moving = p.speed > 0.2 && (p.state === "chase" || p.state === "circle" || p.state === "fly")
    for (const part of this.parts) {
      const m = part.mesh
      switch (part.role) {
        case "legL":
        case "legR": {
          const s = part.role === "legL" ? 1 : -1
          m.rotation.x = moving ? sw * 0.6 * s : 0
          break
        }
        case "legFL":
        case "legBR":
          m.rotation.x = moving ? sw * 0.7 : 0
          break
        case "legFR":
        case "legBL":
          m.rotation.x = moving ? -sw * 0.7 : 0
          break
        case "armL":
        case "armR": {
          const s = part.role === "armL" ? -1 : 1
          let a = moving ? -sw * 0.4 * s : 0
          if (p.state === "windup") a = -1.6 * Math.min(1, p.warn * 1.5)
          if (p.state === "strike") a = 0.9
          m.rotation.x = a
          break
        }
        case "wingL":
        case "wingR": {
          const s = part.role === "wingL" ? 1 : -1
          const flap = p.state === "strike" ? 0.2 : Math.sin(this.walk * 2.2) * 0.7
          m.rotation.z = s * (0.3 + flap)
          break
        }
        case "tail":
          m.rotation.y = Math.sin(this.walk * 1.3) * 0.5
          break
        case "eye":
          m.scaling.y = part.sy * (p.state === "dead" ? 0.2 : 1)
          break
      }
    }
    if (p.state === "dead" && p.t > 1.6) this.setVisible(false)
  }

  /** Skin rigada: anda pela locomoção e golpeia com os clipes do boxe (a mesma troca do jogador). */
  private updateRigged(dt: number, p: MobPose) {
    const c = this.char!
    c.place(p.x, p.z, p.facing, p.y, 0)
    const heavy = this.kind === "golem"
    if (p.state !== this.last) {
      if (p.state === "windup") c.boxeAct(heavy ? "BBox2" : "BJab", 0.55, 0, 0.42, true)
      else if (p.state === "strike") c.boxeAct(heavy ? "BBox2" : "BJab", 0.32, 0.42, 1)
      else if (p.state === "hurt") c.boxeAct("BHitLite", 0.32, 0, 0.66)
      else if (p.state === "dead") c.boxeAct("BFall", 1.2, 0, 1, true)
      this.last = p.state
    }
    if (p.state === "chase" && p.speed > 0.2) {
      c.setBoxe(null)
      c.animate(dt, p.speed > 3.2 ? 2 : 1, p.speed)
    } else {
      c.setBoxe("BGuard")
      c.animate(dt, 0, 0)
    }
    if (p.state === "dead" && p.t > 1.6) this.setVisible(false)
  }

  /** Toca um clipe do lobo (inteiro ou um trecho em segundos), com a velocidade pedida. */
  private playWolf(name: string, loop: boolean, speed = 1, part?: [number, number], len?: number) {
    const g = this.wolf?.anims.get(name)
    if (!g) return
    const key = `${name}:${part?.join("-") ?? ""}`
    if (key === this.wolfClip) {
      g.speedRatio = speed
      return
    }
    for (const o of this.wolf!.anims.values()) if (o !== g) o.stop()
    this.wolfClip = key
    const span = g.to - g.from
    const from = part && len ? g.from + span * (part[0] / len) : g.from
    const to = part && len ? g.from + span * (part[1] / len) : g.to
    g.start(loop, speed, from, to)
  }

  /** Lobo rigado: a regra diz o estado; o clipe e a velocidade saem dele. */
  private updateWolf(dt: number, p: MobPose) {
    this.root.position.set(p.x, p.y, p.z)
    this.root.rotation.y = p.facing
    // Enquanto o GLB carregava, o caminho das formas mexeu no corpo (no
    // "spawn" ele nasce com escala 0,05): o rigado começa do corpo neutro.
    this.body.scaling.setAll(1)
    this.body.position.setAll(0)
    this.body.rotation.setAll(0)
    const atk = p.attack ? WOLF_ATTACK[p.attack.id] : undefined
    const was = this.last
    this.last = p.state
    switch (p.state) {
      case "spawn":
        this.playWolf("Howl", false)
        break
      case "windup":
      case "strike":
      case "recover": {
        if (!atk) break
        const part = atk[p.state]
        const dur = p.state === "windup" ? p.attack!.windup : p.state === "strike" ? p.attack!.active : p.attack!.recover
        this.playWolf(atk.clip, false, (part[1] - part[0]) / Math.max(0.05, dur), part, atk.len)
        break
      }
      case "hurt":
        this.playWolf("Hit", false)
        break
      case "dead":
        this.playWolf("Die", false)
        if (p.t > 1.8) this.setVisible(false)
        break
      default: {
        // Saindo do golpe para rodear: o pulo de lado (esquiva) antes de andar.
        if (was === "recover" && this.wolf!.anims.has("Dodge")) {
          this.playWolf("Dodge", false)
          this.dodgeLeft = 0.6
        }
        if (this.dodgeLeft > 0) {
          this.dodgeLeft -= dt
          break
        }
        if (p.speed > 2.6) this.playWolf("Run", true, Math.min(1.6, Math.max(0.85, p.speed / WOLF_RUN)))
        else if (p.speed > 0.25) this.playWolf("Walk", true, Math.min(2.2, Math.max(0.6, p.speed / WOLF_WALK)))
        else this.playWolf("Idle", true)
      }
    }
  }

  setVisible(v: boolean) {
    this.root.setEnabled(v)
    this.char?.setVisible(v)
  }

  dispose() {
    this.gone = true
    if (this.wolf) {
      for (const g of this.wolf.anims.values()) g.dispose()
      this.wolf.entries.dispose()
      this.wolf = null
    }
    this.char?.dispose()
    for (const p of this.parts) p.mesh.dispose()
    this.flash.dispose()
    this.body.dispose()
    this.root.dispose()
  }
}

// ── os bonecos de cada tipo (frente = +z) ──────────────────────────────────
// Pernas e braços: cilindros com o pivô no meio — a rotação balança em volta do
// meio, o que basta para um provisório.
const BUILD: Record<MobKind, (m: MonsterModel) => void> = {
  soldier(m) {
    const SAND = "#C9A46A"
    m.add("cyl", [0.42, 0.9, 0.5], [0, 1.25, 0], SAND, "", { main: true })
    m.add("box", [0.62, 0.3, 0.36], [0, 1.62, 0], "#B08A52")
    m.add("sphere", [0.36, 0.4, 0.36], [0, 1.98, 0], SAND)
    m.add("cyl", [0.42, 0.18, 0.44], [0, 2.12, 0], "#9C7A47")
    m.add("box", [0.26, 0.04, 0.04], [0, 1.98, 0.17], "#3A2A18")
    m.add("box", [0.18, 0.14, 0.02], [0, 1.35, 0.25], "#FFD25A", "", { glow: 0.9 })
    for (const s of [-1, 1]) {
      m.add("cyl", [0.18, 0.75, 0.2], [s * 0.15, 0.4, 0], SAND, s < 0 ? "legL" : "legR")
      m.add("cyl", [0.14, 0.7, 0.16], [s * 0.42, 1.3, 0.05], SAND, s < 0 ? "armL" : "armR")
    }
    m.add("box", [0.06, 0.06, 0.9], [0.42, 1.0, 0.45], "#D9DCE2", "armR")
  },
  wolf(m) {
    const RUST = "#8A4B2A"
    m.add("box", [0.5, 0.42, 1.1], [0, 0.72, 0], RUST, "", { main: true })
    m.add("box", [0.4, 0.36, 0.42], [0, 0.95, 0.62], "#7A4026")
    m.add("box", [0.22, 0.18, 0.3], [0, 0.86, 0.94], "#5E3420")
    for (const s of [-1, 1]) m.add("cone", [0.14, 0.2, 0.14], [s * 0.12, 1.2, 0.58], "#5E3420")
    m.eyes(1.0, 0.84, 0.11, 0.05)
    m.add("box", [0.5, 0.1, 0.8], [0, 0.98, -0.05], "#4A4F57")
    m.add("cyl", [0.11, 0.55, 0.13], [-0.18, 0.3, 0.38], RUST, "legFL")
    m.add("cyl", [0.11, 0.55, 0.13], [0.18, 0.3, 0.38], RUST, "legFR")
    m.add("cyl", [0.11, 0.55, 0.13], [-0.18, 0.3, -0.38], RUST, "legBL")
    m.add("cyl", [0.11, 0.55, 0.13], [0.18, 0.3, -0.38], RUST, "legBR")
    m.add("box", [0.1, 0.1, 0.55], [0, 0.85, -0.78], "#5E3420", "tail", { rot: [0.4, 0, 0] })
    m.add("box", [0.06, 0.06, 0.6], [0, 0.95, 0.2], "#B84DFF", "", { glow: 0.8 })
  },
  golem(m) {
    const SCRAP = "#6E7480"
    m.add("box", [1.5, 1.4, 0.95], [0, 2.1, 0], SCRAP, "", { main: true })
    m.add("box", [0.7, 0.5, 0.6], [0, 3.05, 0.1], "#5A5F68")
    m.eyes(3.08, 0.42, 0.14, 0.08)
    m.add("box", [0.5, 0.4, 0.06], [-0.35, 2.3, 0.5], "#B23A2E")
    m.add("box", [0.4, 0.5, 0.06], [0.4, 1.9, 0.5], "#2F6FB0")
    m.add("box", [1.3, 0.12, 0.08], [0, 2.75, 0.49], "#B84DFF", "", { glow: 0.9 })
    for (const s of [-1, 1]) {
      m.add("cyl", [0.42, 1.0, 0.5], [s * 0.45, 0.65, 0], "#4E535B", s < 0 ? "legL" : "legR")
      m.add("cyl", [0.36, 1.2, 0.42], [s * 1.0, 2.1, 0.1], SCRAP, s < 0 ? "armL" : "armR")
      m.add("box", [0.6, 0.6, 0.6], [s * 1.05, 1.3, 0.25], "#3E4249", s < 0 ? "armL" : "armR")
    }
  },
  harpy(m) {
    const SLATE = "#5B6475"
    m.add("sphere", [0.55, 0.9, 0.5], [0, 1.25, 0], SLATE, "", { main: true })
    m.add("sphere", [0.36, 0.38, 0.38], [0, 1.85, 0.08], "#4A5262")
    m.add("cone", [0.14, 0.26, 0.14], [0, 1.82, 0.32], "#D9B24A", "", { rot: [Math.PI / 2, 0, 0] })
    m.eyes(1.9, 0.22, 0.09, 0.05)
    m.add("cone", [0.3, 0.4, 0.2], [0, 2.12, -0.05], "#3C4352")
    for (const s of [-1, 1]) {
      m.add("box", [1.3, 0.05, 0.6], [s * 0.85, 1.45, -0.05], "#434B5A", s < 0 ? "wingL" : "wingR")
      m.add("cyl", [0.1, 0.65, 0.12], [s * 0.14, 0.45, 0], "#D9B24A", s < 0 ? "legL" : "legR")
      m.add("sphere", [0.16, 0.16, 0.16], [s * 0.3, 1.62, 0.02], "#B84DFF", "", { glow: 0.8 })
    }
  },
  brute(m) {
    const SKIN = "#6F8466"
    m.add("sphere", [1.3, 1.6, 1.0], [0, 1.95, 0], SKIN, "", { main: true })
    m.add("sphere", [0.55, 0.55, 0.55], [0, 2.95, 0.15], "#62775A")
    m.eyes(3.0, 0.4, 0.13, 0.06)
    for (const s of [-1, 1]) {
      m.add("cone", [0.14, 0.42, 0.14], [s * 0.24, 3.3, 0.1], "#E8E0C8", "", { rot: [0, 0, -s * 0.5] })
      m.add("cyl", [0.42, 1.0, 0.5], [s * 0.38, 0.6, 0], "#3E3A36", s < 0 ? "legL" : "legR")
      m.add("cyl", [0.36, 1.2, 0.44], [s * 0.85, 1.95, 0.15], SKIN, s < 0 ? "armL" : "armR")
      m.add("cone", [0.3, 0.5, 0.3], [s * 0.55, 2.75, -0.2], "#B84DFF", "", { glow: 0.85 })
    }
    m.add("box", [1.0, 0.25, 0.85], [0, 1.45, 0.05], "#2E2B29")
    m.add("cyl", [0.22, 1.3, 0.16], [0.85, 1.3, 0.75], "#55504A", "armR", { rot: [1.2, 0, 0] })
    m.add("sphere", [0.55, 0.55, 0.55], [0.85, 1.05, 1.35], "#4A4540", "armR")
  },
}
