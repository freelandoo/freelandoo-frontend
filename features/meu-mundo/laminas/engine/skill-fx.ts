// features/meu-mundo/laminas/engine/skill-fx.ts — efeitos das HABILIDADES da luta (2026-11-03).
//
// Pedido do Alex ("combate mobile RPG premium"): Corte Mágico (lâmina de luz
// curva laranja/dourada que voa à frente), Investida Relâmpago (rastro azul
// do corpo e do chão, faíscas elétricas, clarão no fim), Escudo de Luz
// (cúpula dourada/violeta com hexágonos, borda acesa, anéis orbitando,
// onda no ponto atingido, desfaz em partículas) e o PODER MÁXIMO em fases
// (anéis que se fecham, núcleo branco crescendo, onda de choque no chão).
//
// A regra é sim/fight.ts — aqui só o desenho. Tudo nasce uma vez e é
// reaproveitado (nada é criado no meio da luta); o perfil fraco usa menos
// partículas. As fitas e clarões vêm do kit engine/vfx.ts.

import type { Scene } from "@babylonjs/core/scene"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Constants } from "@babylonjs/core/Engines/constants"
import type { Vfx, VfxColor, Trail } from "../../engine/vfx"

/** Cores de cada habilidade. */
export const SKILL_COLORS = {
  slash: { main: new Color3(1, 0.55, 0.1), edge: new Color3(1, 0.88, 0.45) },
  dash: { main: new Color3(0.25, 0.65, 1), edge: new Color3(0.8, 0.95, 1) },
  shield: { main: new Color3(1, 0.82, 0.38), edge: new Color3(0.72, 0.45, 1) },
  ult: { main: new Color3(1, 0.62, 0.12), edge: new Color3(1, 0.95, 0.7) },
} satisfies Record<string, VfxColor>

/** Cores das habilidades: cada personagem traz as suas (abilities/signatures). */
export type SkillPalette = Record<"slash" | "dash" | "shield" | "ult", VfxColor>

export interface SkillFx {
  wave: (id: number, at: Vector3, facing: number) => void
  moveWave: (id: number, at: Vector3) => void
  endWave: (id: number, at: Vector3) => void
  /** Investida: liga/desliga o rastro (a cena chama a cada quadro). */
  dash: (on: boolean, at: Vector3) => void
  dashEnd: (at: Vector3) => void
  shieldOn: (at: Vector3) => void
  shieldHit: (at: Vector3) => void
  shieldOff: () => void
  /** Poder máximo: começa a carga (fireAt s até soltar). */
  ultCharge: (at: Vector3, fireAt: number) => void
  ultFire: (at: Vector3, radius: number) => void
  /** `hero` = pés de quem joga (a cúpula e a carga acompanham). */
  update: (dt: number, hero: Vector3) => void
  dispose: () => void
}

function tex(scene: Scene, name: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const t = new DynamicTexture(name, { width: w, height: h }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.clearRect(0, 0, w, h)
  draw(g)
  t.hasAlpha = true
  t.update()
  return t
}

/** Meia-lua (lâmina de luz): convexa para +z, no chão; 4 aros = borda, miolo branco, borda, fora. */
function crescentMesh(scene: Scene, name: string): Mesh {
  const N = 28
  const span = 1.25 // rad de cada lado
  const rings = [
    { r: 0.62, a: 0, hot: 0 },
    { r: 0.86, a: 0.85, hot: 0.6 },
    { r: 0.97, a: 1, hot: 1 },
    { r: 1.1, a: 0, hot: 0.2 },
  ]
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const a = -span + 2 * span * u
    // as pontas afinam e somem
    const taper = Math.sin(Math.PI * u)
    for (const r of rings) {
      const rr = 1 - (1 - r.r) * taper
      pos.push(Math.sin(a) * rr, 0, Math.cos(a) * rr - 0.7)
      const k = r.a * Math.pow(taper, 0.7)
      // laranja nas bordas, branco-amarelado no miolo
      col.push(1, 0.55 + 0.42 * r.hot, 0.12 + 0.75 * r.hot, k)
    }
  }
  const R = rings.length
  for (let i = 0; i < N; i++)
    for (let j = 0; j < R - 1; j++) {
      const a = i * R + j
      const b = (i + 1) * R + j
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const m = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.colors = col
  vd.indices = idx
  vd.applyToMesh(m)
  m.hasVertexAlpha = true
  m.isPickable = false
  return m
}

/**
 * `heroH()` = altura de agora de quem joga (m): a cúpula, os anéis e a carga do
 * poder crescem com ela (jovem 1,7, adulto 2,7, deuses 3,2, Brutamontes 4 —
 * pedido do Alex: "nos adultos está na cintura").
 */
export function createSkillFx(scene: Scene, low: boolean, vfx: Vfx, bodyTrail: () => [Vector3, Vector3] | null, heroH: () => number = () => 1.8, C: SkillPalette = SKILL_COLORS): SkillFx {
  const owned: { dispose: () => void }[] = []
  const glowAdd = (m: Mesh) => vfx.addGlow(m)
  const addMat = (name: string) => {
    const m = new StandardMaterial(name, scene)
    m.disableLighting = true
    m.diffuseColor = new Color3(0, 0, 0)
    m.specularColor = new Color3(0, 0, 0)
    m.emissiveColor = new Color3(1, 1, 1)
    m.backFaceCulling = false
    m.alphaMode = Constants.ALPHA_ADD
    m.disableDepthWrite = true
    owned.push(m)
    return m
  }
  const sparkTex = tex(scene, "sk-spark", 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, "rgba(255,255,255,1)")
    gr.addColorStop(0.3, "rgba(255,255,255,0.6)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
  })
  const boltTex = tex(scene, "sk-bolt", 64, 64, (g) => {
    // faísca elétrica: um zigue-zague fino aceso
    g.strokeStyle = "rgba(255,255,255,1)"
    g.shadowColor = "rgba(255,255,255,1)"
    g.shadowBlur = 6
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(8, 32)
    for (let x = 16; x <= 56; x += 8) g.lineTo(x, 32 + (x % 16 === 0 ? -12 : 12))
    g.stroke()
  })
  const ringTex = tex(scene, "sk-ring", 256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 80, 128, 128, 128)
    gr.addColorStop(0, "rgba(255,255,255,0)")
    gr.addColorStop(0.7, "rgba(255,255,255,1)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 256, 256)
  })
  const hexTex = tex(scene, "sk-hex", 256, 256, (g) => {
    // hexágonos discretos + brilho geral baixo (a borda acende pelo fresnel)
    g.fillStyle = "rgba(255,255,255,0.05)"
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = "rgba(255,255,255,0.55)"
    g.lineWidth = 2
    const s = 32
    const h = s * Math.sqrt(3)
    for (let row = -1; row < 256 / h + 1; row++)
      for (let c = -1; c < 256 / (s * 1.5) + 1; c++) {
        const cx = c * s * 1.5
        const cy = row * h + (c % 2 ? h / 2 : 0)
        g.beginPath()
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * Math.PI * 2
          const x = cx + Math.cos(a) * s * 0.92
          const y = cy + Math.sin(a) * s * 0.92
          if (k === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
        g.stroke()
      }
  })
  owned.push(sparkTex, boltTex, ringTex, hexTex)

  const ps = (name: string, cap: number, t: DynamicTexture, c: VfxColor) => {
    const p = new ParticleSystem(name, low ? Math.ceil(cap / 3) : cap, scene)
    p.particleTexture = t
    p.emitRate = 0
    p.manualEmitCount = 0
    p.blendMode = ParticleSystem.BLENDMODE_ADD
    p.updateSpeed = 1 / 60
    p.emitter = Vector3.Zero()
    p.color1 = new Color4(c.main.r, c.main.g, c.main.b, 1)
    p.color2 = new Color4(c.edge.r, c.edge.g, c.edge.b, 1)
    p.colorDead = new Color4(c.main.r, c.main.g, c.main.b, 0)
    p.start()
    owned.push(p)
    return p
  }
  const k = low ? 0.4 : 1

  // ── CORTE MÁGICO ─────────────────────────────────────────────────────────
  const waveMat = addMat("sk-wave-mat")
  type W = { id: number; mesh: Mesh; halo: Mesh; on: boolean; t: number; fade: number; sparks: ParticleSystem }
  const waves: W[] = []
  for (let i = 0; i < 2; i++) {
    const mesh = crescentMesh(scene, `sk-wave-${i}`)
    mesh.material = waveMat
    mesh.setEnabled(false)
    const halo = crescentMesh(scene, `sk-wave-halo-${i}`)
    halo.material = waveMat
    halo.setEnabled(false)
    glowAdd(mesh)
    const sparks = ps(`sk-wave-sparks-${i}`, 160, sparkTex, C.slash)
    sparks.minSize = 0.05
    sparks.maxSize = 0.16
    sparks.minLifeTime = 0.25
    sparks.maxLifeTime = 0.55
    sparks.minEmitPower = 0.5
    sparks.maxEmitPower = 2.2
    sparks.gravity = new Vector3(0, -1.5, 0)
    sparks.createSphereEmitter(0.9, 1)
    owned.push(mesh, halo)
    waves.push({ id: -1, mesh, halo, on: false, t: 0, fade: 1, sparks })
  }
  const SLASH_W = 1.7

  // ── INVESTIDA ────────────────────────────────────────────────────────────
  let dashOn = false
  const dashBody: Trail = vfx.trail(() => (dashOn ? bodyTrail() : null), C.dash)
  const dashFeet = { at: new Vector3(), prev: new Vector3(), dir: new Vector3(1, 0, 0) }
  const dashGround: Trail = vfx.trail(() => {
    if (!dashOn) return null
    const s = dashFeet.dir.scale(0.4)
    return [dashFeet.at.add(s).addInPlaceFromFloats(0, 0.05, 0), dashFeet.at.subtract(s).addInPlaceFromFloats(0, 0.05, 0)]
  }, C.dash)
  const bolts = ps("sk-bolts", 120, boltTex, C.dash)
  bolts.minSize = 0.15
  bolts.maxSize = 0.4
  bolts.minLifeTime = 0.1
  bolts.maxLifeTime = 0.22
  bolts.minEmitPower = 0.5
  bolts.maxEmitPower = 2
  bolts.minAngularSpeed = -8
  bolts.maxAngularSpeed = 8
  bolts.createCylinderEmitter(0.45, 1.6, 0.2, 0)

  // ── ESCUDO DE LUZ ────────────────────────────────────────────────────────
  const dome = CreateSphere("sk-dome", { diameter: 2.8, segments: low ? 16 : 28, slice: 0.55 }, scene)
  dome.isPickable = false
  const domeMat = new StandardMaterial("sk-dome-mat", scene)
  domeMat.disableLighting = true
  domeMat.diffuseColor = new Color3(0, 0, 0)
  domeMat.specularColor = new Color3(0, 0, 0)
  domeMat.emissiveTexture = hexTex
  hexTex.uScale = 5
  hexTex.vScale = 3
  domeMat.emissiveColor = C.shield.main.clone()
  domeMat.opacityTexture = hexTex
  domeMat.alphaMode = Constants.ALPHA_ADD
  domeMat.disableDepthWrite = true
  domeMat.backFaceCulling = false
  // borda acesa (violeta → dourado no meio)
  domeMat.emissiveFresnelParameters = Object.assign(new FresnelParameters(), { leftColor: C.shield.edge.clone(), rightColor: C.shield.main.scale(0.2), bias: 0.05, power: 2.6 })
  domeMat.opacityFresnelParameters = Object.assign(new FresnelParameters(), { leftColor: new Color3(0.9, 0.9, 0.9), rightColor: new Color3(0.05, 0.05, 0.05), bias: 0.02, power: 2.4 })
  dome.material = domeMat
  dome.setEnabled(false)
  owned.push(dome, domeMat)
  const orbitMat = addMat("sk-orbit-mat")
  orbitMat.emissiveColor = C.shield.main
  const orbits = [0, 1].map((i) => {
    const t = CreateTorus(`sk-orbit-${i}`, { diameter: 3, thickness: 0.035, tessellation: low ? 32 : 64 }, scene)
    t.material = orbitMat
    t.isPickable = false
    t.setEnabled(false)
    glowAdd(t)
    owned.push(t)
    return t
  })
  const motes = ps("sk-motes", 140, sparkTex, C.shield)
  motes.minSize = 0.05
  motes.maxSize = 0.13
  motes.minLifeTime = 0.8
  motes.maxLifeTime = 1.5
  motes.minEmitPower = 0.2
  motes.maxEmitPower = 0.6
  motes.gravity = new Vector3(0, 1.2, 0)
  motes.createCylinderEmitter(1.3, 0.1, 0.1, 0)
  const shield = { on: false, t: 0, off: 1, pulse: 0 }
  /** Escala da cúpula: o alto dela (1,5 m no tamanho 1) passa ~25% da cabeça. */
  const domeK = () => Math.max(1, (heroH() * 1.25) / 1.5)
  /** Largura (raio da base, m): cresce bem menos que a altura — nos grandes a cúpula fica alta e estreita, sem tomar a tela. */
  const domeW = () => Math.max(1.35, 0.95 + 0.3 * heroH())

  // ── PODER MÁXIMO ─────────────────────────────────────────────────────────
  const ultMat = addMat("sk-ult-mat")
  ultMat.emissiveColor = C.ult.main
  const ultRings = [0, 1, 2].map((i) => {
    const t = CreateTorus(`sk-ult-ring-${i}`, { diameter: 2, thickness: 0.05, tessellation: low ? 32 : 64 }, scene)
    t.material = ultMat
    t.isPickable = false
    t.setEnabled(false)
    glowAdd(t)
    owned.push(t)
    return t
  })
  const coreMat = addMat("sk-core-mat")
  coreMat.opacityTexture = sparkTex
  coreMat.emissiveColor = new Color3(1, 0.95, 0.8)
  const core = CreatePlane("sk-ult-core", { size: 1 }, scene)
  core.billboardMode = Mesh.BILLBOARDMODE_ALL
  core.material = coreMat
  core.isPickable = false
  core.setEnabled(false)
  glowAdd(core)
  owned.push(core)
  const feed = ps("sk-ult-feed", 220, sparkTex, C.ult)
  feed.minSize = 0.05
  feed.maxSize = 0.14
  feed.minLifeTime = 0.3
  feed.maxLifeTime = 0.5
  feed.minEmitPower = -6
  feed.maxEmitPower = -4
  feed.createSphereEmitter(2.6, 0)
  const shockMat = addMat("sk-shock-mat")
  shockMat.opacityTexture = ringTex
  shockMat.emissiveColor = C.ult.main
  const shock = CreateGround("sk-shock", { width: 2, height: 2 }, scene)
  shock.material = shockMat
  shock.isPickable = false
  shock.setEnabled(false)
  owned.push(shock)
  const embers = ps("sk-embers", 260, sparkTex, C.ult)
  embers.minSize = 0.08
  embers.maxSize = 0.18
  embers.minLifeTime = 0.5
  embers.maxLifeTime = 1.2
  embers.minEmitPower = 4
  embers.maxEmitPower = 10
  embers.gravity = new Vector3(0, -3, 0)
  embers.createHemisphericEmitter(0.6, 0)
  const ult = { on: false, t: 0, fireAt: 1, shockT: 1, shockR: 5, at: new Vector3() }

  return {
    wave(id, at, facing) {
      const w = waves.find((x) => !x.on) ?? waves[0]
      w.id = id
      w.on = true
      w.t = 0
      w.fade = 1
      for (const m of [w.mesh, w.halo]) {
        m.position.copyFrom(at)
        m.rotation.set(0, facing, 0.22)
        m.setEnabled(true)
      }
      w.mesh.scaling.set(SLASH_W * 0.5, 1, SLASH_W * 0.5)
      w.halo.scaling.set(SLASH_W * 0.75, 1, SLASH_W * 0.75)
      w.halo.visibility = 0.35
      w.sparks.emitter = at.clone()
      w.sparks.emitRate = 160 * k
    },
    moveWave(id, at) {
      const w = waves.find((x) => x.on && x.id === id)
      if (!w) return
      w.mesh.position.copyFrom(at)
      w.halo.position.copyFrom(at)
      w.sparks.emitter = at.clone()
    },
    endWave(id, at) {
      const w = waves.find((x) => x.on && x.id === id)
      if (!w) return
      w.on = false
      w.sparks.emitRate = 0
      w.sparks.emitter = at.clone()
      w.sparks.manualEmitCount = Math.round(40 * k)
      vfx.impact(at, C.slash, true, 1.2)
    },
    dash(on, at) {
      if (on) {
        dashFeet.prev.copyFrom(dashFeet.at)
        dashFeet.at.copyFrom(at)
        const d = dashFeet.at.subtract(dashFeet.prev)
        if (d.lengthSquared() > 1e-6) dashFeet.dir.set(-d.z, 0, d.x).normalize()
        bolts.emitter = at.clone()
        bolts.emitRate = 160 * k
      } else bolts.emitRate = 0
      if (on && !dashOn) {
        dashFeet.prev.copyFrom(at)
        vfx.dust(at, 8)
      }
      dashOn = on
      dashBody.active = on
      dashGround.active = on
    },
    dashEnd(at) {
      vfx.impact(at.add(new Vector3(0, 1, 0)), C.dash, true, 1.3)
      vfx.dust(at, 10)
      bolts.emitter = at.add(new Vector3(0, 0.8, 0))
      bolts.manualEmitCount = Math.round(30 * k)
    },
    shieldOn(at) {
      shield.on = true
      shield.t = 0
      shield.off = 0
      shield.pulse = 1
      dome.position.copyFrom(at)
      dome.setEnabled(true)
      for (const o of orbits) o.setEnabled(true)
      motes.createCylinderEmitter(domeW() * 0.9, 0.1, 0.1, 0)
      motes.emitRate = 70 * k
      vfx.ground(at, C.shield, domeW() * 1.05, 0.9, false, !low)
    },
    shieldHit(at) {
      shield.pulse = 1
      vfx.impact(at, C.shield, true, 1.1)
    },
    shieldOff() {
      if (!shield.on) return
      shield.on = false
      shield.off = 0.001
      motes.emitRate = 0
      motes.emitter = dome.position.add(new Vector3(0, 0.6 * heroH(), 0))
      motes.manualEmitCount = Math.round(70 * k)
    },
    ultCharge(at, fireAt) {
      ult.on = true
      ult.t = 0
      ult.fireAt = fireAt
      ult.at.copyFrom(at)
      for (const r of ultRings) r.setEnabled(true)
      core.setEnabled(true)
      feed.emitRate = 0
    },
    ultFire(at, radius) {
      ult.on = false
      for (const r of ultRings) r.setEnabled(false)
      core.setEnabled(false)
      feed.emitRate = 0
      ult.shockT = 0
      ult.shockR = radius
      shock.position.set(at.x, 0.06, at.z)
      shock.setEnabled(true)
      embers.emitter = new Vector3(at.x, 0.4, at.z)
      embers.manualEmitCount = Math.round(140 * k)
    },
    update(dt, hero) {
      // lâmina: cresce na saída, brilha, apaga no fim
      for (const w of waves) {
        if (w.on) {
          w.t += dt
          const g = Math.min(1, w.t / 0.08)
          w.mesh.visibility = g
          w.halo.visibility = 0.35 * g
          w.halo.rotation.z = 0.22 + Math.sin(w.t * 30) * 0.03
        } else if (w.mesh.isEnabled()) {
          w.fade -= dt / 0.18
          w.mesh.visibility = Math.max(0, w.fade)
          w.halo.visibility = Math.max(0, w.fade) * 0.35
          w.mesh.scaling.x *= 1 + dt * 2
          if (w.fade <= 0) {
            w.mesh.setEnabled(false)
            w.halo.setEnabled(false)
          }
        }
      }
      // cúpula: abre rápido, gira os hexágonos, pulsa no golpe, desfaz no fim
      if (shield.on || (shield.off > 0 && shield.off < 1)) {
        shield.t += dt
        if (!shield.on) shield.off = Math.min(1, shield.off + dt / 0.35)
        const open = 1 - Math.pow(1 - Math.min(1, shield.t / 0.25), 3)
        const fade = shield.on ? 1 : 1 - shield.off
        shield.pulse = Math.max(0, shield.pulse - dt * 3)
        const dk = domeK()
        const wk = domeW() / 1.4
        const s = (0.4 + 0.6 * open) * (1 + 0.1 * shield.pulse) * (shield.on ? 1 : 1 + 0.25 * shield.off)
        dome.position.copyFrom(hero)
        dome.scaling.set(s * wk, s * dk * 1.08, s * wk)
        dome.rotation.y += dt * 0.35
        dome.visibility = (0.32 + 0.45 * shield.pulse) * fade
        hexTex.vOffset += dt * 0.08
        domeMat.emissiveColor.copyFrom(C.shield.main).scaleInPlace(0.24 + 0.6 * shield.pulse)
        orbits.forEach((o, i) => {
          o.position.set(hero.x, hero.y + (0.6 + i * 0.75) * dk, hero.z)
          o.rotation.set(0.35 * (i ? -1 : 1) + Math.sin(shield.t * 1.6 + i) * 0.12, shield.t * (i ? -1.6 : 1.2), 0.25)
          o.scaling.setAll(s * wk * (0.98 - i * 0.12))
          o.visibility = fade
        })
        motes.emitter = hero.clone()
        if (shield.off >= 1) {
          dome.setEnabled(false)
          for (const o of orbits) o.setEnabled(false)
          shield.off = 1
        }
      }
      // poder: anéis se fecham, o núcleo cresce, energia converge
      if (ult.on) {
        ult.t += dt
        const u = Math.min(1, ult.t / ult.fireAt)
        const hk = Math.max(1, heroH() / 1.8)
        ultRings.forEach((r, i) => {
          const phase = Math.min(1, Math.max(0, u * 1.3 - i * 0.15))
          const rad = (3.4 * (1 - phase) + 0.5) * hk
          r.position.set(hero.x, (0.4 + i * 0.55 + phase * 0.5) * hk, hero.z)
          r.scaling.setAll(rad)
          r.rotation.set(0.2 * Math.sin(ult.t * 3 + i), ult.t * (2 + i), 0.15 * i)
          r.visibility = Math.min(1, ult.t / 0.2) * (0.5 + 0.5 * phase)
        })
        const c = (0.25 + 1.0 * u * u) * hk
        core.position.set(hero.x, 0.7 * heroH(), hero.z)
        core.scaling.setAll(c * (1 + Math.sin(ult.t * 40) * 0.06 * u))
        core.visibility = 0.35 + 0.45 * u
        feed.emitter = new Vector3(hero.x, 0.7 * heroH(), hero.z)
        feed.emitRate = u > 0.25 ? 150 * k * u : 0
      }
      // onda de choque no chão
      if (ult.shockT < 1) {
        ult.shockT = Math.min(1, ult.shockT + dt / 0.6)
        const e = 1 - Math.pow(1 - ult.shockT, 3)
        shock.scaling.set(ult.shockR * 1.3 * e + 0.5, 1, ult.shockR * 1.3 * e + 0.5)
        shock.visibility = 1 - ult.shockT
        if (ult.shockT >= 1) shock.setEnabled(false)
      }
    },
    dispose() {
      for (const o of owned) o.dispose()
    },
  }
}
