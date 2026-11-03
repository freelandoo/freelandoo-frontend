// features/meu-mundo/engine/gain-pillar.ts — o TUBO DE LUZ do ganho (mm3d-60, pedido do Alex).
//
// "Quando ganha os status eu quero brilho, como o tubo do poder na arena
// (Q), mas com bem menos opacidade, e brilhos." É a coluna do vfx.ground da
// luta (cilindro com faixas que sobem, círculo no chão, estrelinhas subindo),
// numa versão própria e LEVE para a rua/centro/casa: sem GlowLayer, uma
// malha de cada, criada só no primeiro ganho e reaproveitada; o laço por
// quadro só existe enquanto o tubo está aceso. Visual local (nada vai à rede).
//
// mm3d-60j — SUBIU DE NÍVEL também é aqui (pedido do Alex: nada de tela
// cheia): VÁRIOS tubos finos nas cores dos status que sobem e somem rápido,
// brilhos no chão de todas as cores e partículas brilhosas (LevelBurst,
// criado só no primeiro nível).
//
// A cena registra com `setGainFx(pilar)`; a celebração chama
// `playGainFx(cor)` e `playLevelFx(cores)`.

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Constants } from "@babylonjs/core/Engines/constants"

// ── registro (a cena aberta) ───────────────────────────────────────────────
export interface GainFxTarget {
  play(hex: string): void
  level(colors: string[]): void
}
let current: GainFxTarget | null = null
export function setGainFx(fx: GainFxTarget): () => void {
  current = fx
  return () => {
    if (current === fx) current = null
  }
}
/** Acende o tubo no meu personagem (sem cena aberta, não faz nada). */
export function playGainFx(hex: string) {
  try {
    current?.play(hex)
  } catch {
    /* efeito decorativo: nunca derruba a interface */
  }
}
/** Subiu de nível: o feixe de tubos coloridos no meu personagem. */
export function playLevelFx(colors: string[]) {
  try {
    current?.level(colors)
  } catch {
    /* efeito decorativo */
  }
}

const DUR = 1.9
/** Bem menos que o tubo do poder (0,38). */
const BEAM_ALPHA = 0.15
const RING_ALPHA = 0.32
const HEIGHT = 3
const RADIUS = 0.62

type Owned = { dispose: () => void }[]

function color3(hex: string) {
  try {
    if (/^#[0-9a-f]{6}$/i.test(hex)) return Color3.FromHexString(hex)
  } catch {
    /* cai no dourado */
  }
  return new Color3(1, 0.82, 0.25)
}

function tex(scene: Scene, name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const t = new DynamicTexture(name, { width: size, height: size }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.clearRect(0, 0, size, size)
  draw(g, size)
  t.hasAlpha = true
  t.update()
  return t
}

/** Faixas verticais que sobem: forte embaixo, some em cima (a mesma do poder). */
function beamTexture(scene: Scene, name: string) {
  return tex(scene, name, 128, (g, S) => {
    const gr = g.createLinearGradient(0, S, 0, 0)
    gr.addColorStop(0, "rgba(255,255,255,0.95)")
    gr.addColorStop(0.4, "rgba(255,255,255,0.4)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, S, S)
    g.globalCompositeOperation = "destination-out"
    for (let x = 0; x < S; x += 16) {
      g.fillStyle = `rgba(0,0,0,${0.3 + (0.5 * ((x * 37) % 7)) / 7})`
      g.fillRect(x + 8, 0, 6, S)
    }
  })
}

function ringTexture(scene: Scene) {
  return tex(scene, "mm-gain-ring", 128, (g, S) => {
    const c = S / 2
    const gr = g.createRadialGradient(c, c, c * 0.3, c, c, c)
    gr.addColorStop(0, "rgba(255,255,255,0)")
    gr.addColorStop(0.72, "rgba(255,255,255,0.9)")
    gr.addColorStop(0.8, "rgba(255,255,255,0.25)")
    gr.addColorStop(0.9, "rgba(255,255,255,0.7)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, S, S)
  })
}

/** Mancha de luz no chão (cheia no centro). */
function glowTexture(scene: Scene) {
  return tex(scene, "mm-level-glow", 128, (g, S) => {
    const c = S / 2
    const gr = g.createRadialGradient(c, c, 0, c, c, c)
    gr.addColorStop(0, "rgba(255,255,255,1)")
    gr.addColorStop(0.35, "rgba(255,255,255,0.55)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, S, S)
  })
}

function starTexture(scene: Scene, name: string) {
  return tex(scene, name, 64, (g, s) => {
    const c = s / 2
    const glow = g.createRadialGradient(c, c, 0, c, c, c * 0.5)
    glow.addColorStop(0, "rgba(255,255,255,1)")
    glow.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = glow
    g.fillRect(0, 0, s, s)
    g.translate(c, c)
    for (let i = 0; i < 4; i++) {
      const gr = g.createLinearGradient(0, 0, c, 0)
      gr.addColorStop(0, "rgba(255,255,255,1)")
      gr.addColorStop(1, "rgba(255,255,255,0)")
      g.fillStyle = gr
      g.beginPath()
      g.moveTo(0, -1.6)
      g.lineTo(c, 0)
      g.lineTo(0, 1.6)
      g.closePath()
      g.fill()
      g.rotate(Math.PI / 2)
    }
  })
}

function addMat(scene: Scene, name: string, t: DynamicTexture, owned: Owned) {
  const m = new StandardMaterial(name, scene)
  m.opacityTexture = t
  m.disableLighting = true
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  m.emissiveColor = new Color3(1, 0.85, 0.4)
  m.backFaceCulling = false
  m.alphaMode = Constants.ALPHA_ADD
  m.disableDepthWrite = true
  owned.push(m)
  return m
}

// ── SUBIU DE NÍVEL ─────────────────────────────────────────────────────────
const LV_DUR = 1.8
const LV_BEAMS = 9
const LV_BEAM_ALPHA = 0.42
const LV_GLOW_ALPHA = 0.55
/** Vida de cada tubo (cresce, sobe inteiro e some). */
const LV_BEAM_LIFE = 0.9

interface LvBeam {
  mesh: Mesh
  mat: StandardMaterial
  glow: Mesh
  glowMat: StandardMaterial
  /** deslocamento do pé (m), atraso (s), altura (m), raio (m) */
  dx: number
  dz: number
  delay: number
  h: number
  r: number
}

/** O feixe do nível: tubos finos que sobem e somem rápido + brilhos no chão + partículas. */
class LevelBurst {
  private built: { beams: LvBeam[]; beamTex: DynamicTexture; sparks: ParticleSystem[]; owned: Owned } | null = null
  private t = LV_DUR
  private secondWave = false
  private obs: Observer<Scene> | null = null
  private readonly at = new Vector3()

  constructor(
    private readonly scene: Scene,
    private readonly feet: () => Vector3 | null,
    private readonly low: boolean,
  ) {}

  private build() {
    if (this.built) return this.built
    const scene = this.scene
    const owned: Owned = []
    const beamTex = beamTexture(scene, "mm-lv-beam")
    const glowTex = glowTexture(scene)
    const starTex = starTexture(scene, "mm-lv-star")
    owned.push(beamTex, glowTex, starTex)
    const beams: LvBeam[] = []
    for (let i = 0; i < LV_BEAMS; i++) {
      // em volta do personagem; o do meio é o mais alto e mais grosso
      const a = (i / LV_BEAMS) * Math.PI * 2 + (i % 2) * 0.35
      const d = i === 0 ? 0 : 0.55 + ((i * 37) % 9) / 9
      const mesh = CreateCylinder(`mm-lv-beam-${i}`, { height: 1, diameter: 2, tessellation: 16, cap: 0 }, scene)
      const mat = addMat(scene, `mm-lv-beam-mat-${i}`, beamTex, owned)
      mesh.material = mat
      const glow = CreateGround(`mm-lv-glow-${i}`, { width: 2, height: 2 }, scene)
      const glowMat = addMat(scene, `mm-lv-glow-mat-${i}`, glowTex, owned)
      glow.material = glowMat
      for (const m of [mesh, glow]) {
        m.isPickable = false
        m.setEnabled(false)
        owned.push(m)
      }
      beams.push({
        mesh,
        mat,
        glow,
        glowMat,
        dx: Math.cos(a) * d,
        dz: Math.sin(a) * d,
        delay: i === 0 ? 0 : 0.04 + ((i * 53) % 11) * 0.03,
        h: i === 0 ? 7 : 3.5 + ((i * 29) % 7) * 0.45,
        r: i === 0 ? 0.32 : 0.1 + ((i * 17) % 5) * 0.025,
      })
    }
    // partículas: até 3 sistemas (cada um mistura 2 cores) para ter todas as cores
    const sparks: ParticleSystem[] = []
    for (let i = 0; i < (this.low ? 1 : 3); i++) {
      const p = new ParticleSystem(`mm-lv-sparks-${i}`, this.low ? 60 : 150, scene)
      p.particleTexture = starTex
      p.blendMode = ParticleSystem.BLENDMODE_ADD
      p.updateSpeed = 1 / 60
      p.emitter = this.at
      p.createCylinderEmitter(1.3, 0.2, 0.5, 0.3)
      p.minSize = 0.08
      p.maxSize = 0.3
      p.minLifeTime = 0.6
      p.maxLifeTime = 1.3
      p.minEmitPower = 2.5
      p.maxEmitPower = 6
      p.gravity = new Vector3(0, -2.2, 0)
      p.minAngularSpeed = -4
      p.maxAngularSpeed = 4
      p.emitRate = 0
      sparks.push(p)
      owned.push(p)
    }
    this.built = { beams, beamTex, sparks, owned }
    return this.built
  }

  play(colors: string[]) {
    const b = this.build()
    const list = colors.length ? colors : ["#FFD23F"]
    b.beams.forEach((beam, i) => {
      const c = color3(list[i % list.length])
      beam.mat.emissiveColor = c
      beam.glowMat.emissiveColor = c
      beam.mesh.setEnabled(false)
      beam.glow.setEnabled(false)
    })
    b.sparks.forEach((p, i) => {
      const c1 = color3(list[(i * 2) % list.length])
      const c2 = color3(list[(i * 2 + 1) % list.length])
      p.color1 = new Color4(c1.r, c1.g, c1.b, 1)
      p.color2 = new Color4(c2.r, c2.g, c2.b, 1)
      p.colorDead = new Color4(1, 1, 1, 0)
      if (!p.isStarted()) p.start()
      p.manualEmitCount = this.low ? 40 : 90
    })
    this.t = 0
    this.secondWave = false
    this.place()
    if (!this.obs) this.obs = this.scene.onBeforeRenderObservable.add(() => this.step())
  }

  private place() {
    const p = this.feet()
    if (p) this.at.copyFrom(p)
  }

  private step() {
    const b = this.built
    if (!b) return
    const dt = Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000)
    this.t += dt
    this.place()
    if (this.t >= LV_DUR) {
      for (const beam of b.beams) {
        beam.mesh.setEnabled(false)
        beam.glow.setEnabled(false)
      }
      if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
      this.obs = null
      return
    }
    b.beamTex.vOffset -= dt * 2.2
    // 2ª leva de faíscas no meio do efeito
    if (!this.secondWave && this.t > 0.45) {
      this.secondWave = true
      for (const p of b.sparks) p.manualEmitCount = this.low ? 20 : 50
    }
    for (const beam of b.beams) {
      const lt = this.t - beam.delay
      if (lt <= 0) continue
      const x = this.at.x + beam.dx
      const z = this.at.z + beam.dz
      // tubo: cresce em 0,18 s, depois sobe inteiro e some
      const k = lt / LV_BEAM_LIFE
      if (k >= 1) beam.mesh.setEnabled(false)
      else {
        beam.mesh.setEnabled(true)
        const grow = 1 - Math.pow(1 - Math.min(1, lt / 0.18), 2)
        const h = beam.h * grow
        const lift = k > 0.3 ? Math.pow((k - 0.3) / 0.7, 2) * beam.h * 1.2 : 0
        beam.mesh.scaling.set(beam.r, h, beam.r)
        beam.mesh.position.set(x, this.at.y + 0.03 + lift + h / 2, z)
        beam.mesh.visibility = LV_BEAM_ALPHA * (k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55)
      }
      // brilho no chão: abre rápido e apaga devagar
      const gk = lt / (LV_DUR - beam.delay)
      if (gk >= 1) beam.glow.setEnabled(false)
      else {
        beam.glow.setEnabled(true)
        const open = 1 - Math.pow(1 - Math.min(1, lt / 0.2), 3)
        beam.glow.scaling.setAll((beam.r * 4 + 0.35) * (0.4 + 0.6 * open))
        beam.glow.position.set(x, this.at.y + 0.035, z)
        beam.glow.visibility = LV_GLOW_ALPHA * (gk < 0.4 ? 1 : 1 - (gk - 0.4) / 0.6)
      }
    }
  }

  dispose() {
    if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
    this.obs = null
    for (const o of this.built?.owned ?? []) o.dispose()
    this.built = null
  }
}

// ── o tubo do ganho ────────────────────────────────────────────────────────
export class GainPillar implements GainFxTarget {
  private built: {
    beam: Mesh
    ring: Mesh
    beamMat: StandardMaterial
    ringMat: StandardMaterial
    beamTex: DynamicTexture
    sparks: ParticleSystem
    owned: Owned
  } | null = null
  private lv: LevelBurst | null = null
  private t = DUR
  private obs: Observer<Scene> | null = null
  private readonly at = new Vector3()

  constructor(
    private readonly scene: Scene,
    /** Pés do meu personagem (mundo). */
    private readonly feet: () => Vector3 | null,
    private readonly low: boolean,
  ) {}

  private build() {
    if (this.built) return this.built
    const scene = this.scene
    const owned: Owned = []
    const beamTex = beamTexture(scene, "mm-gain-beam")
    const ringTex = ringTexture(scene)
    const starTex = starTexture(scene, "mm-gain-star")
    owned.push(beamTex, ringTex, starTex)
    const beam = CreateCylinder("mm-gain-beam", { height: 1, diameter: 2, tessellation: 24, cap: 0 }, scene)
    const beamMat = addMat(scene, "mm-gain-beam-mat", beamTex, owned)
    beam.material = beamMat
    const ring = CreateGround("mm-gain-ring", { width: 2, height: 2 }, scene)
    const ringMat = addMat(scene, "mm-gain-ring-mat", ringTex, owned)
    ring.material = ringMat
    for (const m of [beam, ring]) {
      m.isPickable = false
      m.setEnabled(false)
      owned.push(m)
    }
    // brilhos: estrelinhas subindo de dentro do tubo
    const sparks = new ParticleSystem("mm-gain-sparks", this.low ? 30 : 110, scene)
    sparks.particleTexture = starTex
    sparks.blendMode = ParticleSystem.BLENDMODE_ADD
    sparks.updateSpeed = 1 / 60
    sparks.emitter = this.at
    sparks.createCylinderEmitter(RADIUS * 0.8, 0.1, 0.2, 0)
    sparks.minSize = 0.09
    sparks.maxSize = 0.26
    sparks.minLifeTime = 0.7
    sparks.maxLifeTime = 1.4
    sparks.minEmitPower = 0.4
    sparks.maxEmitPower = 1.1
    sparks.gravity = new Vector3(0, 1.6, 0)
    sparks.minAngularSpeed = -3
    sparks.maxAngularSpeed = 3
    sparks.emitRate = 0
    owned.push(sparks)
    this.built = { beam, ring, beamMat, ringMat, beamTex, sparks, owned }
    return this.built
  }

  /** Subiu de nível: o feixe colorido (criado só no 1º nível). */
  level(colors: string[]) {
    if (!this.lv) this.lv = new LevelBurst(this.scene, this.feet, this.low)
    this.lv.play(colors)
  }

  play(hex: string) {
    const b = this.build()
    const c = color3(hex)
    b.beamMat.emissiveColor = c
    b.ringMat.emissiveColor = c
    const c4 = new Color4(c.r, c.g, c.b, 1)
    b.sparks.color1 = new Color4(1, 1, 1, 1)
    b.sparks.color2 = c4
    b.sparks.colorDead = new Color4(c.r, c.g, c.b, 0)
    b.sparks.emitRate = this.low ? 18 : 60
    if (!b.sparks.isStarted()) b.sparks.start()
    b.beam.setEnabled(true)
    b.ring.setEnabled(true)
    this.t = 0
    this.place()
    if (!this.obs) this.obs = this.scene.onBeforeRenderObservable.add(() => this.step())
  }

  private place() {
    const p = this.feet()
    if (p) this.at.copyFrom(p)
  }

  private step() {
    const b = this.built
    if (!b) return
    const dt = Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000)
    this.t += dt
    this.place()
    const k = this.t / DUR
    if (k >= 1) {
      b.beam.setEnabled(false)
      b.ring.setEnabled(false)
      b.sparks.emitRate = 0
      if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
      this.obs = null
      return
    }
    // sobe rápido, fica, apaga no fim (mesma curva do tubo do poder)
    const grow = 1 - Math.pow(1 - Math.min(1, this.t / 0.35), 2)
    const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
    const h = HEIGHT * grow
    b.beam.scaling.set(RADIUS, h, RADIUS)
    b.beam.position.set(this.at.x, this.at.y + 0.03 + h / 2, this.at.z)
    b.beam.visibility = BEAM_ALPHA * fade
    b.beamTex.vOffset -= dt * 0.9
    const open = 1 - Math.pow(1 - Math.min(1, this.t / 0.25), 3)
    b.ring.scaling.setAll(RADIUS * 1.5 * (0.5 + 0.5 * open))
    b.ring.position.set(this.at.x, this.at.y + 0.04, this.at.z)
    b.ring.rotation.y += dt * 1.2
    b.ring.visibility = RING_ALPHA * fade
    if (k > 0.6) b.sparks.emitRate = 0
  }

  dispose() {
    if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
    this.obs = null
    for (const o of this.built?.owned ?? []) o.dispose()
    this.built = null
    this.lv?.dispose()
    this.lv = null
  }
}
