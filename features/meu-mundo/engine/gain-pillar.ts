// features/meu-mundo/engine/gain-pillar.ts — o TUBO DE LUZ do ganho (mm3d-60, pedido do Alex).
//
// "Quando ganha os status eu quero brilho, como o tubo do poder na arena
// (Q), mas com bem menos opacidade, e brilhos." É a coluna do vfx.ground da
// luta (cilindro com faixas que sobem, círculo no chão, estrelinhas subindo),
// numa versão própria e LEVE para a rua/centro/casa: sem GlowLayer, uma
// malha de cada, criada só no primeiro ganho e reaproveitada; o laço por
// quadro só existe enquanto o tubo está aceso. Visual local (nada vai à rede).
//
// A cena registra com `setGainFx`; a celebração chama `playGainFx(cor)`.

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
let current: ((hex: string) => void) | null = null
export function setGainFx(fn: (hex: string) => void): () => void {
  current = fn
  return () => {
    if (current === fn) current = null
  }
}
/** Acende o tubo no meu personagem (sem cena aberta, não faz nada). */
export function playGainFx(hex: string) {
  try {
    current?.(hex)
  } catch {
    /* efeito decorativo: nunca derruba a interface */
  }
}

const DUR = 1.9
/** Bem menos que o tubo do poder (0,38). */
const BEAM_ALPHA = 0.15
const RING_ALPHA = 0.32
const HEIGHT = 3
const RADIUS = 0.62

function tex(scene: Scene, name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const t = new DynamicTexture(name, { width: size, height: size }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.clearRect(0, 0, size, size)
  draw(g, size)
  t.hasAlpha = true
  t.update()
  return t
}

export class GainPillar {
  private built: {
    beam: Mesh
    ring: Mesh
    beamMat: StandardMaterial
    ringMat: StandardMaterial
    beamTex: DynamicTexture
    sparks: ParticleSystem
    owned: { dispose: () => void }[]
  } | null = null
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
    const owned: { dispose: () => void }[] = []
    // faixas verticais que sobem: forte embaixo, some em cima (a mesma do poder)
    const beamTex = tex(scene, "mm-gain-beam", 128, (g, S) => {
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
    const ringTex = tex(scene, "mm-gain-ring", 128, (g, S) => {
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
    const starTex = tex(scene, "mm-gain-star", 64, (g, s) => {
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
    owned.push(beamTex, ringTex, starTex)
    const mat = (name: string, t: DynamicTexture) => {
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
    const beam = CreateCylinder("mm-gain-beam", { height: 1, diameter: 2, tessellation: 24, cap: 0 }, scene)
    const beamMat = mat("mm-gain-beam-mat", beamTex)
    beam.material = beamMat
    const ring = CreateGround("mm-gain-ring", { width: 2, height: 2 }, scene)
    const ringMat = mat("mm-gain-ring-mat", ringTex)
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

  play(hex: string) {
    const b = this.build()
    let c: Color3
    try {
      c = Color3.FromHexString(hex.length === 7 ? hex : "#FFD23F")
    } catch {
      c = new Color3(1, 0.82, 0.25)
    }
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
  }
}
