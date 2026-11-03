// features/meu-mundo/paint/engine/pickups-view.ts — PAINT (mm3d-35): as cápsulas.
//
// Cápsulas: vidro com a tinta da cor dentro, flutuando e girando; somem ao
// pegar e voltam quando a regra diz. (Os gatinhos moram em cat-herd.ts desde o
// mm3d-35g — leves, por instância, com a fila atrás de quem pegou.)
//
// mm3d-46: a cápsula da cor MURO é o LOGO 3D da Freelandoo girando (o mesmo
// da corrida, menor, com halo e purpurina ao pegar).
//
// mm3d-62 (pedido do Alex: refazer os brilhos ao pegar munição): cada cápsula
// tem um halo aceso no chão na cor dela, respirando; ao pegar sobe um TUBO DE
// LUZ leve (a mesma linguagem do ganho de status), um anel corre pelo chão e
// estrelinhas sobem girando. Tudo de um pool fixo, aditivo, sem GlowLayer.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import { CreateCapsule } from "@babylonjs/core/Meshes/Builders/capsuleBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Constants } from "@babylonjs/core/Engines/constants"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { PAINT, PAINT_COLORS } from "../sim/tuning"
import type { PaintCapsule } from "../sim/map"
import { buildLogos, type LogoView } from "../../corrida/engine/logos"

/** Um "peguei" em andamento (tubo + anel), do pool. */
interface Burst {
  tube: Mesh
  ring: Mesh
  mat: StandardMaterial
  ringMat: StandardMaterial
  t: number
  big: boolean
  y: number
}

const BURST_LIFE = 0.75
/** O preto não brilha: halo e tubo dele em violeta. */
const HARM_GLOW = new Color3(0.75, 0.62, 1)

function glowColor(c: number) {
  return c === PAINT.HARM ? HARM_GLOW : Color3.FromHexString(PAINT_COLORS[c])
}

function canvasTex(scene: Scene, name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const t = new DynamicTexture(name, { width: size, height: size }, scene, true)
  const g = t.getContext() as unknown as CanvasRenderingContext2D
  g.clearRect(0, 0, size, size)
  draw(g, size)
  t.hasAlpha = true
  t.update()
  return t
}

function additive(m: StandardMaterial, tex: DynamicTexture) {
  m.disableLighting = true
  m.backFaceCulling = false
  m.disableDepthWrite = true
  m.alphaMode = Constants.ALPHA_ADD
  m.fogEnabled = false
  m.diffuseTexture = tex
  m.opacityTexture = tex
  m.diffuseColor = new Color3(0, 0, 0)
}

export class PickupsView {
  private readonly caps = new Map<number, { cap: PaintCapsule; glass: InstancedMesh; ink: InstancedMesh; halo: InstancedMesh; on: boolean; phase: number }>()
  private readonly all = new Map<number, PaintCapsule>()
  private readonly glassBase: Mesh
  private readonly glassMat: StandardMaterial
  private readonly inkBases: Mesh[] = []
  private readonly inkMats: StandardMaterial[] = []
  private readonly haloBases: Mesh[] = []
  private readonly haloMats: StandardMaterial[] = []
  private readonly haloTex: DynamicTexture
  private readonly tubeTex: DynamicTexture
  private readonly ringTex: DynamicTexture
  private readonly starTex: DynamicTexture
  private readonly bursts: Burst[] = []
  private readonly stars: ParticleSystem
  private readonly logos: LogoView
  private readonly logoIds = new Set<number>()
  private readonly logoHalos = new Map<number, InstancedMesh>()
  private clock = 0

  constructor(scene: Scene, capsules: readonly PaintCapsule[], lowEnd = false) {
    for (const c of capsules) this.all.set(c.id, c)
    const logoCaps = capsules.filter((c) => c.c === PAINT.WALL)
    for (const c of logoCaps) this.logoIds.add(c.id)
    this.logos = buildLogos(scene, logoCaps.map((c) => ({ id: c.id, at: new Vector3(c.x, c.y + 1.05, c.z) })), lowEnd, 0.42)
    this.glassMat = new StandardMaterial("paint-cap-glass", scene)
    this.glassMat.diffuseColor = new Color3(0.95, 0.97, 1)
    this.glassMat.specularColor = new Color3(1, 1, 1)
    this.glassMat.specularPower = 80
    this.glassMat.alpha = 0.32
    this.glassBase = CreateCapsule("paint-cap-glass", { radius: 0.24, height: 0.86, tessellation: 12, subdivisions: 2 }, scene)
    this.glassBase.material = this.glassMat
    this.glassBase.isPickable = false
    this.glassBase.setEnabled(false)
    for (let c = 0; c < 3; c++) {
      const m = new StandardMaterial(`paint-cap-ink-${c}`, scene)
      const col = Color3.FromHexString(PAINT_COLORS[c])
      m.diffuseColor = col
      m.emissiveColor = col.scale(0.35)
      m.specularColor = new Color3(0.5, 0.5, 0.5)
      this.inkMats.push(m)
      const b = CreateCapsule(`paint-cap-ink-${c}`, { radius: 0.17, height: 0.62, tessellation: 10, subdivisions: 1 }, scene)
      b.material = m
      b.isPickable = false
      b.setEnabled(false)
      this.inkBases.push(b)
    }

    // ── texturas do brilho (desenhadas uma vez) ──
    this.haloTex = canvasTex(scene, "paint-cap-halo", 128, (g, S) => {
      const c = S / 2
      const gr = g.createRadialGradient(c, c, 0, c, c, c)
      gr.addColorStop(0, "rgba(255,255,255,0.9)")
      gr.addColorStop(0.35, "rgba(255,255,255,0.4)")
      gr.addColorStop(0.72, "rgba(255,255,255,0.1)")
      gr.addColorStop(1, "rgba(255,255,255,0)")
      g.fillStyle = gr
      g.fillRect(0, 0, S, S)
      g.strokeStyle = "rgba(255,255,255,0.85)"
      g.lineWidth = S * 0.022
      g.beginPath()
      g.arc(c, c, c * 0.62, 0, Math.PI * 2)
      g.stroke()
    })
    // tubo: forte embaixo, some em cima; faixas verticais (brilho que gira)
    this.tubeTex = canvasTex(scene, "paint-cap-tube", 128, (g, S) => {
      for (let x = 0; x < S; x++) {
        const k = 0.4 + 0.6 * Math.abs(Math.sin((x / S) * Math.PI * 3))
        const v = g.createLinearGradient(0, S, 0, 0)
        v.addColorStop(0, `rgba(255,255,255,${k})`)
        v.addColorStop(0.55, `rgba(255,255,255,${k * 0.35})`)
        v.addColorStop(1, "rgba(255,255,255,0)")
        g.fillStyle = v
        g.fillRect(x, 0, 1, S)
      }
    })
    this.ringTex = canvasTex(scene, "paint-cap-ring", 128, (g, S) => {
      const c = S / 2
      const gr = g.createRadialGradient(c, c, c * 0.5, c, c, c)
      gr.addColorStop(0, "rgba(255,255,255,0)")
      gr.addColorStop(0.72, "rgba(255,255,255,1)")
      gr.addColorStop(1, "rgba(255,255,255,0)")
      g.fillStyle = gr
      g.fillRect(0, 0, S, S)
    })
    this.starTex = canvasTex(scene, "paint-cap-star", 64, (g, S) => {
      const c = S / 2
      const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.4)
      gr.addColorStop(0, "rgba(255,255,255,1)")
      gr.addColorStop(1, "rgba(255,255,255,0)")
      g.fillStyle = gr
      g.fillRect(0, 0, S, S)
      g.fillStyle = "#fff"
      g.translate(c, c)
      for (let i = 0; i < 4; i++) {
        g.beginPath()
        g.moveTo(0, -S * 0.03)
        g.lineTo(c * 0.95, 0)
        g.lineTo(0, S * 0.03)
        g.closePath()
        g.fill()
        g.rotate(Math.PI / 2)
      }
    })

    // halo no chão: uma malha por cor, instância por cápsula
    for (let c = 0; c < 4; c++) {
      const m = new StandardMaterial(`paint-cap-halo-${c}`, scene)
      additive(m, this.haloTex)
      m.emissiveColor = glowColor(c).scale(c === PAINT.WALL ? 0.9 : 0.75)
      this.haloMats.push(m)
      const b = CreateGround(`paint-cap-halo-${c}`, { width: c === PAINT.WALL ? 3.2 : 2.4, height: c === PAINT.WALL ? 3.2 : 2.4 }, scene)
      b.material = m
      b.isPickable = false
      b.setEnabled(false)
      this.haloBases.push(b)
    }
    // pool do "peguei"
    for (let i = 0; i < (lowEnd ? 2 : 4); i++) {
      const mat = new StandardMaterial(`paint-cap-burst-${i}`, scene)
      additive(mat, this.tubeTex)
      const tube = CreateCylinder(`paint-cap-tube-${i}`, { diameterTop: 0.9, diameterBottom: 1.4, height: 1, tessellation: 18, cap: 0 }, scene)
      tube.material = mat
      tube.isPickable = false
      tube.setEnabled(false)
      const ringMat = new StandardMaterial(`paint-cap-ringm-${i}`, scene)
      additive(ringMat, this.ringTex)
      const ring = CreateGround(`paint-cap-ring-${i}`, { width: 1, height: 1 }, scene)
      ring.material = ringMat
      ring.isPickable = false
      ring.setEnabled(false)
      this.bursts.push({ tube, ring, mat, ringMat, t: BURST_LIFE, big: false, y: 0 })
    }
    const st = new ParticleSystem("paint-cap-stars", lowEnd ? 60 : 160, scene)
    st.particleTexture = this.starTex
    st.blendMode = ParticleSystem.BLENDMODE_ADD
    st.emitRate = 0
    st.minLifeTime = 0.55
    st.maxLifeTime = 1
    st.minSize = 0.12
    st.maxSize = 0.34
    st.minEmitPower = 0.5
    st.maxEmitPower = 1.5
    st.createCylinderEmitter(0.65, 0.3, 0.2, 0)
    st.gravity = new Vector3(0, 3.4, 0)
    st.minAngularSpeed = -4
    st.maxAngularSpeed = 4
    st.colorDead = new Color4(1, 1, 1, 0)
    st.updateSpeed = 1 / 60
    st.emitter = new Vector3(0, -999, 0)
    st.start()
    this.stars = st

    for (const cap of capsules) {
      if (cap.c === PAINT.WALL) {
        // o logo já tem o dele; aqui só o halo no chão
        continue
      }
      const glass = this.glassBase.createInstance(`paint-cap-g-${cap.id}`)
      const ink = this.inkBases[cap.c].createInstance(`paint-cap-i-${cap.id}`)
      const halo = this.haloBases[cap.c].createInstance(`paint-cap-h-${cap.id}`)
      glass.isPickable = false
      ink.isPickable = false
      halo.isPickable = false
      halo.position.set(cap.x, cap.y + 0.04, cap.z)
      this.caps.set(cap.id, { cap, glass, ink, halo, on: true, phase: (cap.id * 1.7) % (Math.PI * 2) })
    }
    // halo do logo (sem vidro/tinta)
    for (const cap of logoCaps) {
      const halo = this.haloBases[PAINT.WALL].createInstance(`paint-cap-h-${cap.id}`)
      halo.isPickable = false
      halo.position.set(cap.x, cap.y + 0.04, cap.z)
      this.logoHalos.set(cap.id, halo)
    }
  }


  setCapsule(id: number, on: boolean) {
    if (this.logoIds.has(id)) {
      this.logoHalos.get(id)?.setEnabled(on)
      return this.logos.setOn(id, on)
    }
    const c = this.caps.get(id)
    if (!c || c.on === on) return
    c.on = on
    c.glass.setEnabled(on)
    c.ink.setEnabled(on)
    c.halo.setEnabled(on)
  }

  /**
   * Alguém pegou a cápsula `id`: tubo de luz na cor da tinta, anel correndo
   * pelo chão e estrelinhas subindo. `mine` = fui eu (maior, mais estrelas).
   */
  collect(id: number, mine: boolean) {
    const cap = this.all.get(id)
    if (!cap || !this.bursts.length) return
    const col = glowColor(cap.c)
    const b = this.bursts.reduce((a, x) => (x.t > a.t ? x : a))
    b.t = 0
    b.big = mine
    b.y = cap.y
    b.mat.emissiveColor = col
    b.ringMat.emissiveColor = new Color3(Math.min(1, col.r + 0.25), Math.min(1, col.g + 0.25), Math.min(1, col.b + 0.25))
    b.tube.position.set(cap.x, cap.y, cap.z)
    b.ring.position.set(cap.x, cap.y + 0.06, cap.z)
    b.tube.setEnabled(true)
    b.ring.setEnabled(true)
    const s = this.stars
    s.color1 = new Color4(col.r, col.g, col.b, 1)
    s.color2 = new Color4(Math.min(1, col.r + 0.45), Math.min(1, col.g + 0.45), Math.min(1, col.b + 0.45), 1)
    s.emitter = new Vector3(cap.x, cap.y + 0.25, cap.z)
    s.manualEmitCount = mine ? 36 : 14
  }

  tick(dt: number) {
    this.clock += dt
    this.logos.tick(this.clock)
    // os halos respiram juntos (um valor por cor)
    const pulse = 0.72 + Math.sin(this.clock * 3.1) * 0.22
    for (const m of this.haloMats) m.alpha = pulse
    for (const b of this.bursts) {
      if (b.t >= BURST_LIFE) continue
      b.t += dt
      const u = Math.min(1, b.t / BURST_LIFE)
      if (u >= 1) {
        b.tube.setEnabled(false)
        b.ring.setEnabled(false)
        continue
      }
      // o tubo sobe rápido e afina; o anel corre pelo chão e some
      const ease = 1 - (1 - u) ** 3
      const h = Math.max(0.05, (b.big ? 6 : 4) * ease)
      const w = (b.big ? 1 : 0.8) * (1 - u * 0.55)
      b.tube.scaling.set(w, h, w)
      b.tube.position.y = b.y + h / 2
      b.tube.rotation.y += dt * 4
      b.tube.visibility = u < 0.2 ? 1 : 1 - (u - 0.2) / 0.8
      const r = (b.big ? 4.4 : 3) * ease + 0.5
      b.ring.scaling.set(r, 1, r)
      b.ring.visibility = 1 - u
    }
    for (const c of this.caps.values()) {
      if (!c.on) continue
      const y = c.cap.y + 0.75 + Math.sin(this.clock * 2.2 + c.phase) * 0.12
      const r = this.clock * 1.4 + c.phase
      c.glass.position.set(c.cap.x, y, c.cap.z)
      c.ink.position.set(c.cap.x, y, c.cap.z)
      c.glass.rotation.set(0.35, r, 0)
      c.ink.rotation.set(0.35, r, 0)
      const hs = 1 + Math.sin(this.clock * 2.2 + c.phase) * 0.1
      c.halo.scaling.set(hs, 1, hs)
    }
  }

  dispose() {
    this.logos.dispose()
    for (const c of this.caps.values()) {
      c.glass.dispose()
      c.ink.dispose()
      c.halo.dispose()
    }
    for (const h of this.logoHalos.values()) h.dispose()
    this.glassBase.dispose()
    this.glassMat.dispose()
    for (const b of this.inkBases) b.dispose()
    for (const m of this.inkMats) m.dispose()
    for (const b of this.haloBases) b.dispose()
    for (const m of this.haloMats) m.dispose()
    for (const b of this.bursts) {
      b.tube.dispose()
      b.ring.dispose()
      b.mat.dispose()
      b.ringMat.dispose()
    }
    this.stars.dispose()
    this.haloTex.dispose()
    this.tubeTex.dispose()
    this.ringTex.dispose()
    this.starTex.dispose()
  }
}
