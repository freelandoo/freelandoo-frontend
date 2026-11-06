// features/meu-mundo/engine/vfx.ts — kit de efeitos de luta (mm3d-58, 2026-11-01).
//
// Referências do Alex (vídeos de 31/10 e prints de 01/11): o ARCO de luz que
// a lâmina deixa no ar, o clarão em estrela com raios no acerto e na vitória,
// faíscas, anel de choque e poeira. Tudo nasce aqui de uma vez e é
// reaproveitado (nada é criado no meio da luta); brilho (GlowLayer) só nos
// efeitos e fora do perfil fraco.
//
//   const vfx = createVfx(scene, low)
//   const trail = vfx.trail(() => [base, ponta] | null)   // a cada quadro
//   vfx.impact(ponto, cor, forte)  vfx.burst(ponto, cor)  vfx.dust(pés)
//   vfx.update(dt) no laço; vfx.dispose() no fim.
import type { Scene } from "@babylonjs/core/scene"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer"
import { PointLight } from "@babylonjs/core/Lights/pointLight"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import "@babylonjs/core/Layers/effectLayerSceneComponent"
import { Constants } from "@babylonjs/core/Engines/constants"

/** Cores de cada classe (arco, clarão, partículas). */
export const VFX_COLORS = {
  vampiro: { main: new Color3(1, 0.16, 0.36), edge: new Color3(0.62, 0.2, 1) },
  raposa: { main: new Color3(1, 0.55, 0.12), edge: new Color3(1, 0.9, 0.35) },
  lamina: { main: new Color3(1, 0.92, 0.7), edge: new Color3(0.55, 0.85, 1) },
  dano: { main: new Color3(1, 0.25, 0.2), edge: new Color3(1, 0.7, 0.3) },
  // 2026-11-02: o Brutamontes é roxo (Alex: "os poderes e brilhos são roxos")
  brutamontes: { main: new Color3(0.66, 0.22, 1), edge: new Color3(0.9, 0.62, 1) },
  // 2026-11-06: todas as luzes do Golem de Pedra são verdes
  golem: { main: new Color3(0.2, 1, 0.3), edge: new Color3(0.72, 1, 0.5) },
} as const
export type VfxColor = { main: Color3; edge: Color3 }

const TRAIL_N = 22

function canvasTex(scene: Scene, name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const t = new DynamicTexture(name, { width: size, height: size }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.clearRect(0, 0, size, size)
  draw(g, size)
  t.hasAlpha = true
  t.update()
  return t
}

/** Estrela de luz: miolo redondo + raios finos (4 longos, 4 curtos). */
function drawStar(g: CanvasRenderingContext2D, s: number, rays: number, long: number) {
  const c = s / 2
  const glow = g.createRadialGradient(c, c, 0, c, c, c * 0.55)
  glow.addColorStop(0, "rgba(255,255,255,1)")
  glow.addColorStop(0.25, "rgba(255,255,255,0.75)")
  glow.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = glow
  g.fillRect(0, 0, s, s)
  g.translate(c, c)
  for (let i = 0; i < rays; i++) {
    const len = (i % 2 === 0 ? long : long * 0.55) * c
    const w = i % 2 === 0 ? s * 0.022 : s * 0.014
    const gr = g.createLinearGradient(0, 0, len, 0)
    gr.addColorStop(0, "rgba(255,255,255,1)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(0, -w)
    g.lineTo(len, 0)
    g.lineTo(0, w)
    g.closePath()
    g.fill()
    g.rotate((Math.PI * 2) / rays)
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
}

export interface Trail {
  /** Liga/desliga a fita (o rastro que já existe some sozinho). */
  active: boolean
  color: VfxColor
}

interface Flash {
  mesh: Mesh
  mat: StandardMaterial
  t: number
  life: number
  size: number
  grow: number
}

/** Pedra do cajado acesa (sempre) e carregando no feitiço. */
export interface Orb {
  /** Onde está a pedra (null = esconde) e a carga 0–1 (cresce e acende). */
  set: (at: Vector3 | null, charge: number) => void
}

export const FIRE: VfxColor = { main: new Color3(1, 0.45, 0.08), edge: new Color3(1, 0.85, 0.3) }

export interface Vfx {
  /** Põe uma malha no brilho dos efeitos (espíritos de luz). */
  addGlow: (m: AbstractMesh) => void
  orb: (color: VfxColor) => Orb
  /** Bola de fogo `id` (maga): nasce, anda com `moveShot`, some com `endShot` (a explosão é impact/burst). */
  shot: (id: number, at: Vector3, heavy: boolean, scale?: number) => void
  moveShot: (id: number, at: Vector3) => void
  endShot: (id: number) => void
  /**
   * Luz que sobe do CHÃO (pedido do Alex): círculo de runas girando em `at`
   * (raio `r`) por `dur` s; `pillar` = coluna de luz e estrelas subindo.
   */
  ground: (at: Vector3, color: VfxColor, r: number, dur: number, pillar?: boolean, ornate?: boolean) => void
  trail: (points: () => [Vector3, Vector3] | null, color: VfxColor) => Trail
  /** `boost` (1 = normal) aumenta clarão e faíscas — golpes de ranque alto e adultos. */
  impact: (at: Vector3, color: VfxColor, heavy?: boolean, boost?: number) => void
  burst: (at: Vector3, color: VfxColor) => void
  dust: (at: Vector3, n?: number) => void
  update: (dt: number) => void
  dispose: () => void
}

export function createVfx(scene: Scene, low: boolean): Vfx {
  const glow = low ? null : new GlowLayer("vfx-glow", scene, { mainTextureSamples: 1, blurKernelSize: 48 })
  if (glow) glow.intensity = 0.5
  const owned: { dispose: () => void }[] = []

  // ── texturas ────────────────────────────────────────────────────────────
  const starTex = canvasTex(scene, "vfx-star", 256, (g, s) => drawStar(g, s, 8, 1))
  const rayTex = canvasTex(scene, "vfx-rays", 512, (g, s) => drawStar(g, s, 16, 1))
  const ringTex = canvasTex(scene, "vfx-ring", 256, (g, s) => {
    const c = s / 2
    const gr = g.createRadialGradient(c, c, c * 0.62, c, c, c)
    gr.addColorStop(0, "rgba(255,255,255,0)")
    gr.addColorStop(0.55, "rgba(255,255,255,0.95)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, s, s)
  })
  const dotTex = canvasTex(scene, "vfx-dot", 64, (g, s) => {
    const c = s / 2
    const gr = g.createRadialGradient(c, c, 0, c, c, c)
    gr.addColorStop(0, "rgba(255,255,255,1)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, s, s)
  })
  const sparkleTex = canvasTex(scene, "vfx-sparkle", 64, (g, s) => drawStar(g, s, 4, 1))
  const smokeTex = canvasTex(scene, "vfx-smoke", 64, (g, s) => {
    const c = s / 2
    const gr = g.createRadialGradient(c, c, 0, c, c, c)
    gr.addColorStop(0, "rgba(255,255,255,0.85)")
    gr.addColorStop(0.6, "rgba(255,255,255,0.35)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, s, s)
  })
  owned.push(starTex, rayTex, ringTex, dotTex, sparkleTex, smokeTex)

  const addMat = (name: string, tex: DynamicTexture, add = true) => {
    // cor = emissiva lisa; a forma (transparência) vem do alfa da textura
    const m = new StandardMaterial(name, scene)
    m.opacityTexture = tex
    m.disableLighting = true
    m.diffuseColor = new Color3(0, 0, 0)
    m.specularColor = new Color3(0, 0, 0)
    m.emissiveColor = new Color3(1, 1, 1)
    m.backFaceCulling = false
    // aditivo só no miolo de luz; o resto em mistura normal (a cor não "lava" em fundo claro)
    m.alphaMode = add ? Constants.ALPHA_ADD : Constants.ALPHA_COMBINE
    m.disableDepthWrite = true
    owned.push(m)
    return m
  }

  // ── clarões (pool) ──────────────────────────────────────────────────────
  const flashes: Flash[] = []
  const makeFlash = (i: number, tex: DynamicTexture, add = true) => {
    const mesh = CreatePlane(`vfx-flash-${i}`, { size: 1 }, scene)
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
    mesh.isPickable = false
    const mat = addMat(`vfx-flash-mat-${i}`, tex, add)
    mesh.material = mat
    mesh.setEnabled(false)
    glow?.addIncludedOnlyMesh(mesh)
    owned.push(mesh)
    const f: Flash = { mesh, mat, t: 1, life: 1, size: 1, grow: 1 }
    flashes.push(f)
    return f
  }
  const pool = { star: [] as Flash[], ring: [] as Flash[], rays: [] as Flash[] }
  for (let i = 0; i < 6; i++) pool.star.push(makeFlash(i, starTex))
  for (let i = 0; i < 4; i++) pool.ring.push(makeFlash(10 + i, ringTex, false))
  for (let i = 0; i < 2; i++) pool.rays.push(makeFlash(20 + i, rayTex))
  const fire = (list: Flash[], at: Vector3, color: Color3, size: number, life: number, grow: number) => {
    const f = list.reduce((a, b) => (b.t / b.life > a.t / a.life ? b : a))
    f.t = 0
    f.life = life
    f.size = size
    f.grow = grow
    f.mat.emissiveColor = color
    f.mesh.position.copyFrom(at)
    f.mesh.setEnabled(true)
  }

  // ── luz que pisca no clarão grande ──────────────────────────────────────
  const light = new PointLight("vfx-light", Vector3.Zero(), scene)
  light.intensity = 0
  light.range = 9
  owned.push(light)
  let lightT = 1

  // ── partículas ──────────────────────────────────────────────────────────
  const ps = (name: string, cap: number, tex: DynamicTexture, add = true) => {
    const p = new ParticleSystem(name, cap, scene)
    p.particleTexture = tex
    p.emitRate = 0
    p.manualEmitCount = 0
    p.blendMode = add ? ParticleSystem.BLENDMODE_ADD : ParticleSystem.BLENDMODE_STANDARD
    p.updateSpeed = 1 / 60
    p.emitter = Vector3.Zero()
    p.start()
    owned.push(p)
    return p
  }
  const sparkles = ps("vfx-sparkles", low ? 60 : 180, sparkleTex)
  sparkles.minSize = 0.06
  sparkles.maxSize = 0.2
  sparkles.minLifeTime = 0.35
  sparkles.maxLifeTime = 0.9
  sparkles.minEmitPower = 1.5
  sparkles.maxEmitPower = 5
  sparkles.gravity = new Vector3(0, -2.5, 0)
  sparkles.direction1 = new Vector3(-1, 0.3, -1)
  sparkles.direction2 = new Vector3(1, 1.6, 1)
  sparkles.minAngularSpeed = -4
  sparkles.maxAngularSpeed = 4
  const rise = ps("vfx-rise", low ? 50 : 140, sparkleTex)
  rise.minSize = 0.08
  rise.maxSize = 0.24
  rise.minLifeTime = 0.8
  rise.maxLifeTime = 1.6
  rise.minEmitPower = 0.6
  rise.maxEmitPower = 2
  rise.gravity = new Vector3(0, 1.6, 0)
  rise.direction1 = new Vector3(-1, 0.2, -1)
  rise.direction2 = new Vector3(1, 1, 1)
  rise.createSphereEmitter(0.6)
  const dustPs = ps("vfx-dust", low ? 24 : 60, smokeTex, false)
  dustPs.minSize = 0.35
  dustPs.maxSize = 0.8
  dustPs.minLifeTime = 0.5
  dustPs.maxLifeTime = 0.9
  dustPs.minEmitPower = 0.6
  dustPs.maxEmitPower = 1.6
  dustPs.gravity = new Vector3(0, 0.4, 0)
  dustPs.direction1 = new Vector3(-1, 0.1, -1)
  dustPs.direction2 = new Vector3(1, 0.5, 1)
  dustPs.color1 = new Color4(0.86, 0.74, 0.56, 0.55)
  dustPs.color2 = new Color4(0.75, 0.64, 0.48, 0.45)
  dustPs.colorDead = new Color4(0.75, 0.64, 0.48, 0)
  dustPs.minScaleX = 1
  dustPs.addSizeGradient(0, 0.5)
  dustPs.addSizeGradient(1, 1.6)
  const tint = (p: ParticleSystem, c: VfxColor) => {
    p.color1 = new Color4(c.main.r, c.main.g, c.main.b, 1)
    p.color2 = new Color4(c.edge.r, c.edge.g, c.edge.b, 1)
    p.colorDead = new Color4(c.edge.r, c.edge.g, c.edge.b, 0)
  }

  // ── círculo de runas + coluna de luz (o brilho que vem do chão) ────────
  const runeTex = canvasTex(scene, "vfx-runes", 512, (g, S) => {
    const c = S / 2
    g.strokeStyle = "rgba(255,255,255,1)"
    g.fillStyle = "rgba(255,255,255,1)"
    g.shadowColor = "rgba(255,255,255,1)"
    g.shadowBlur = 10
    const ring = (r: number, w: number) => {
      g.lineWidth = w
      g.beginPath()
      g.arc(c, c, r, 0, Math.PI * 2)
      g.stroke()
    }
    ring(c * 0.96, 6)
    ring(c * 0.86, 2)
    ring(c * 0.6, 3)
    ring(c * 0.2, 2)
    // estrela de 8 pontas entre os anéis
    for (const off of [0, Math.PI / 8]) {
      g.lineWidth = 3
      g.beginPath()
      for (let i = 0; i <= 4; i++) {
        const a = off + (i * Math.PI * 2 * 3) / 8
        const x = c + Math.cos(a) * c * 0.86
        const y = c + Math.sin(a) * c * 0.86
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    }
    // runas: marcas curtas em volta (traços e pequenos círculos)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const r = c * 0.91
      g.save()
      g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r)
      g.rotate(a + Math.PI / 2)
      g.lineWidth = 3
      g.beginPath()
      if (i % 3 === 0) g.arc(0, 0, 6, 0, Math.PI * 2)
      else {
        g.moveTo(-7, -6)
        g.lineTo(0, 6)
        g.lineTo(7, -6)
      }
      g.stroke()
      g.restore()
    }
    // brilho no meio
    const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.6)
    gr.addColorStop(0, "rgba(255,255,255,0.55)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.shadowBlur = 0
    g.fillStyle = gr
    g.fillRect(0, 0, S, S)
  })
  const beamTex = canvasTex(scene, "vfx-beam", 128, (g, S) => {
    // forte embaixo, some em cima; faixas verticais finas
    const gr = g.createLinearGradient(0, S, 0, 0)
    gr.addColorStop(0, "rgba(255,255,255,0.95)")
    gr.addColorStop(0.35, "rgba(255,255,255,0.45)")
    gr.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, S, S)
    g.globalCompositeOperation = "destination-out"
    for (let x = 0; x < S; x += 16) {
      g.fillStyle = `rgba(0,0,0,${0.25 + 0.5 * ((x * 37) % 7) / 7})`
      g.fillRect(x + 8, 0, 6, S)
    }
  })
  owned.push(runeTex, beamTex)
  type Rune = { disc: Mesh; beam: Mesh; t: number; dur: number; r: number; pillar: boolean; spin: number }
  const runes: Rune[] = []
  for (let i = 0; i < 5; i++) {
    const disc = CreateGround(`vfx-rune-${i}`, { width: 2, height: 2 }, scene)
    const dm = addMat(`vfx-rune-mat-${i}`, runeTex)
    disc.material = dm
    disc.isPickable = false
    disc.setEnabled(false)
    const beam = CreateCylinder(`vfx-beam-${i}`, { height: 1, diameter: 2, tessellation: 32, cap: 0 }, scene)
    const bm = addMat(`vfx-beam-mat-${i}`, beamTex)
    beam.material = bm
    beam.isPickable = false
    beam.setEnabled(false)
    // a coluna NÃO entra no brilho (com ele a tela inteira estourava em branco)
    glow?.addIncludedOnlyMesh(disc)
    owned.push(disc, beam)
    runes.push({ disc, beam, t: 1, dur: 1, r: 1, pillar: false, spin: 1 })
  }
  const groundRise = ps("vfx-ground-rise", low ? 60 : 200, sparkleTex)
  groundRise.minSize = 0.06
  groundRise.maxSize = 0.18
  groundRise.minLifeTime = 0.8
  groundRise.maxLifeTime = 1.6
  groundRise.minEmitPower = 0.3
  groundRise.maxEmitPower = 0.9
  groundRise.gravity = new Vector3(0, 2.2, 0)
  groundRise.direction1 = new Vector3(-0.2, 1, -0.2)
  groundRise.direction2 = new Vector3(0.2, 1, 0.2)
  let riseLeft = 0
  const updateRunes = (dt: number) => {
    for (const u of runes) {
      if (u.t >= u.dur) {
        if (u.disc.isEnabled()) {
          u.disc.setEnabled(false)
          u.beam.setEnabled(false)
        }
        continue
      }
      u.t += dt
      const k = u.t / u.dur
      // abre rápido, fica, apaga no fim
      const open = Math.min(1, u.t / 0.18)
      const fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25
      u.disc.scaling.setAll(u.r * (0.55 + 0.45 * (1 - Math.pow(1 - open, 3))))
      u.disc.rotation.y += dt * 0.9 * u.spin
      u.disc.visibility = fade
      if (u.pillar) {
        const h = 6 * (1 - Math.pow(1 - Math.min(1, u.t / 0.35), 2))
        u.beam.scaling.set(u.r * 0.42, h, u.r * 0.42)
        u.beam.position.y = u.disc.position.y + h / 2
        u.beam.visibility = fade * 0.38
        const tex = (u.beam.material as StandardMaterial).opacityTexture as DynamicTexture
        tex.vOffset -= dt * 0.8
      }
    }
    if (riseLeft > 0) riseLeft -= dt
    else groundRise.emitRate = 0
  }

  // ── pedra do cajado ─────────────────────────────────────────────────────
  const glowPlane = (name: string, tex: DynamicTexture, color: Color3) => {
    const m = CreatePlane(name, { size: 1 }, scene)
    m.billboardMode = Mesh.BILLBOARDMODE_ALL
    m.isPickable = false
    const mat = addMat(`${name}-mat`, tex)
    mat.emissiveColor = color
    m.material = mat
    m.setEnabled(false)
    glow?.addIncludedOnlyMesh(m)
    owned.push(m)
    return m
  }
  const orbs: { core: Mesh; halo: Mesh; at: Vector3 | null; charge: number; t: number; feed: ParticleSystem }[] = []
  const orb = (color: VfxColor): Orb => {
    const i = orbs.length
    const core = glowPlane(`vfx-orb-core-${i}`, dotTex, new Color3(1, 0.95, 0.75))
    const halo = glowPlane(`vfx-orb-halo-${i}`, starTex, color.main)
    // energia sendo puxada para a pedra enquanto carrega
    const feed = ps(`vfx-orb-feed-${i}`, low ? 30 : 90, sparkleTex)
    feed.minSize = 0.04
    feed.maxSize = 0.12
    feed.minLifeTime = 0.25
    feed.maxLifeTime = 0.4
    feed.minEmitPower = -3.2
    feed.maxEmitPower = -2.2
    feed.createSphereEmitter(0.7, 0)
    tint(feed, color)
    const o = { core, halo, at: null as Vector3 | null, charge: 0, t: 0, feed }
    orbs.push(o)
    return {
      set(at, charge) {
        o.at = at ? at.clone() : null
        o.charge = Math.max(0, Math.min(1, charge))
      },
    }
  }
  const updateOrbs = (dt: number) => {
    for (const o of orbs) {
      o.t += dt
      const on = !!o.at
      o.core.setEnabled(on)
      o.halo.setEnabled(on)
      if (!o.at) {
        o.feed.emitRate = 0
        continue
      }
      const pulse = 1 + Math.sin(o.t * 6) * 0.1
      const k = o.charge
      o.core.position.copyFrom(o.at)
      o.halo.position.copyFrom(o.at)
      o.core.scaling.setAll((0.16 + 0.34 * k) * pulse)
      o.halo.scaling.setAll((0.36 + 0.9 * k) * pulse)
      o.halo.rotation.z += dt * (1 + 6 * k)
      o.halo.visibility = 0.6 + 0.4 * k
      o.feed.emitter = o.at.clone()
      o.feed.emitRate = k > 0.05 ? (low ? 40 : 120) * k : 0
    }
  }

  // ── bolas de fogo ───────────────────────────────────────────────────────
  type Ball = { id: number; core: Mesh; halo: Mesh; fire: ParticleSystem; on: boolean }
  const balls: Ball[] = []
  for (let i = 0; i < 4; i++) {
    const core = glowPlane(`vfx-ball-core-${i}`, dotTex, new Color3(1, 0.88, 0.55))
    const halo = glowPlane(`vfx-ball-halo-${i}`, starTex, FIRE.main)
    const fire = ps(`vfx-ball-fire-${i}`, low ? 60 : 200, smokeTex)
    fire.minLifeTime = 0.18
    fire.maxLifeTime = 0.38
    fire.minEmitPower = 0.2
    fire.maxEmitPower = 0.8
    fire.createSphereEmitter(0.12)
    fire.color1 = new Color4(1, 0.75, 0.2, 1)
    fire.color2 = new Color4(1, 0.35, 0.05, 1)
    fire.colorDead = new Color4(0.4, 0.05, 0, 0)
    fire.addSizeGradient(0, 1)
    fire.addSizeGradient(1, 0.3)
    balls.push({ id: -1, core, halo, fire, on: false })
  }
  const ballOf = (id: number) => balls.find((b) => b.on && b.id === id)

  // ── fitas (rastro da arma) ──────────────────────────────────────────────
  const trails: { t: Trail; mesh: Mesh; pts: () => [Vector3, Vector3] | null; hist: [Vector3, Vector3][]; life: number; pos: Float32Array; col: Float32Array }[] = []
  const trailMat = new StandardMaterial("vfx-trail", scene)
  trailMat.disableLighting = true
  trailMat.emissiveColor = new Color3(1, 1, 1)
  trailMat.backFaceCulling = false
  trailMat.alphaMode = Constants.ALPHA_COMBINE
  trailMat.disableDepthWrite = true
  owned.push(trailMat)

  const trail = (points: () => [Vector3, Vector3] | null, color: VfxColor): Trail => {
    const n = TRAIL_N
    const mesh = new Mesh(`vfx-trail-${trails.length}`, scene)
    const pos = new Float32Array(n * 2 * 3)
    const col = new Float32Array(n * 2 * 4)
    const idx: number[] = []
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    const vd = new VertexData()
    vd.positions = pos
    vd.colors = col
    vd.indices = idx
    vd.applyToMesh(mesh, true)
    mesh.hasVertexAlpha = true
    mesh.material = trailMat
    mesh.isPickable = false
    mesh.alwaysSelectAsActiveMesh = true
    mesh.setEnabled(false)
    glow?.addIncludedOnlyMesh(mesh)
    owned.push(mesh)
    const t: Trail = { active: false, color }
    trails.push({ t, mesh, pts: points, hist: [], life: 0, pos, col })
    return t
  }

  const updateTrails = (dt: number) => {
    for (const tr of trails) {
      const p = tr.t.active ? tr.pts() : null
      if (p) {
        tr.life = 1
        tr.hist.unshift([p[0].clone(), p[1].clone()])
      } else {
        tr.life = Math.max(0, tr.life - dt * 5)
        if (tr.hist.length) tr.hist.unshift(tr.hist[0])
      }
      if (tr.hist.length > TRAIL_N) tr.hist.length = TRAIL_N
      if (tr.life <= 0 || tr.hist.length < 2) {
        tr.mesh.setEnabled(false)
        if (tr.life <= 0) tr.hist.length = 0
        continue
      }
      tr.mesh.setEnabled(true)
      const { main, edge } = tr.t.color
      for (let i = 0; i < TRAIL_N; i++) {
        const h = tr.hist[Math.min(i, tr.hist.length - 1)]
        const k = Math.pow(1 - i / (TRAIL_N - 1), 1.6) * tr.life
        for (let e = 0; e < 2; e++) {
          const v = h[e]
          const o = (i * 2 + e) * 3
          tr.pos[o] = v.x
          tr.pos[o + 1] = v.y
          tr.pos[o + 2] = v.z
          // ponta (e = 1) acesa no branco quente; a base some no tom da classe
          // fio (e = 1) na cor da classe com o comecinho quente; a base no tom da borda
          const c = e === 1 ? main : edge
          const hot = e === 1 && i < 3 ? 0.35 * (1 - i / 3) : 0
          const q = (i * 2 + e) * 4
          tr.col[q] = Math.min(1, c.r + hot)
          tr.col[q + 1] = Math.min(1, c.g + hot)
          tr.col[q + 2] = Math.min(1, c.b + hot)
          tr.col[q + 3] = k * (e === 1 ? 0.95 : 0.12)
        }
      }
      tr.mesh.updateVerticesData("position", tr.pos)
      tr.mesh.updateVerticesData("color", tr.col)
    }
  }

  return {
    addGlow: (m) => glow?.addIncludedOnlyMesh(m as Mesh),
    orb,
    ground(at, color, r, dur, pillar = false, ornate = false) {
      // adultos/golpe S: um segundo círculo maior, girando ao contrário (mais desenho no chão)
      if (ornate) {
        const o = runes.reduce((a, b) => (b.t / b.dur > a.t / a.dur ? b : a))
        o.t = 0
        o.dur = dur
        o.r = r * 1.45
        o.pillar = false
        o.spin = -0.6
        o.disc.position.set(at.x, 0.035, at.z)
        ;(o.disc.material as StandardMaterial).emissiveColor = color.edge
        o.disc.setEnabled(true)
        o.beam.setEnabled(false)
      }
      const u = runes.reduce((a, b) => (b.t / b.dur > a.t / a.dur ? b : a))
      u.t = 0
      u.dur = dur
      u.r = r
      u.pillar = pillar
      u.spin = 1
      u.disc.position.set(at.x, 0.04, at.z)
      u.beam.position.set(at.x, 0.04, at.z)
      ;(u.disc.material as StandardMaterial).emissiveColor = color.main
      ;(u.beam.material as StandardMaterial).emissiveColor = color.main
      u.disc.setEnabled(true)
      u.beam.setEnabled(pillar)
      tint(groundRise, color)
      groundRise.emitter = new Vector3(at.x, 0.05, at.z)
      groundRise.createCylinderEmitter(r * 0.9, 0.05, 0, 0)
      groundRise.direction1 = new Vector3(-0.2, 1, -0.2)
      groundRise.emitRate = (low ? 30 : 110) * (pillar ? 1.6 : 0.8)
      riseLeft = dur * 0.8
    },
    shot(id, at, heavy, scale = 1) {
      const b = balls.find((x) => !x.on) ?? balls[0]
      b.id = id
      b.on = true
      const k = (heavy ? 1.7 : 1) * scale
      b.core.scaling.setAll(0.62 * k)
      b.halo.scaling.setAll(1.35 * k)
      b.fire.minSize = 0.26 * k
      b.fire.maxSize = 0.6 * k
      b.fire.emitRate = (low ? 70 : 220) * (heavy ? 1.4 : 1)
      for (const m of [b.core, b.halo]) {
        m.position.copyFrom(at)
        m.setEnabled(true)
      }
      b.fire.emitter = at.clone()
    },
    moveShot(id, at) {
      const b = ballOf(id)
      if (!b) return
      b.core.position.copyFrom(at)
      b.halo.position.copyFrom(at)
      b.fire.emitter = at.clone()
    },
    endShot(id) {
      const b = ballOf(id)
      if (!b) return
      b.on = false
      b.fire.emitRate = 0
      b.core.setEnabled(false)
      b.halo.setEnabled(false)
    },
    trail,
    impact(at, color, heavy = false, boost = 1) {
      fire(pool.star, at, color.main, (heavy ? 1.8 : 1.1) * boost, heavy ? 0.22 : 0.15, 1.6)
      fire(pool.ring, at, color.edge, (heavy ? 2.6 : 1.5) * boost, heavy ? 0.36 : 0.26, 2.4)
      tint(sparkles, color)
      sparkles.emitter = at.clone()
      // todo acerto solta partículas; mais nos golpes fortes
      sparkles.manualEmitCount = Math.round((heavy ? 34 : 18) * boost * (low ? 0.5 : 1))
    },
    burst(at, color) {
      fire(pool.rays, at, color.main, 4.6, 0.6, 1.25)
      fire(pool.star, at, new Color3(1, 1, 1), 2.4, 0.4, 1.8)
      fire(pool.ring, at, color.edge, 3.4, 0.5, 2.8)
      tint(rise, color)
      rise.emitter = at.clone()
      rise.manualEmitCount = low ? 20 : 60
      light.position.copyFrom(at)
      light.diffuse = color.main
      lightT = 0
    },
    dust(at, n = 6) {
      dustPs.emitter = at.clone()
      dustPs.manualEmitCount = low ? Math.ceil(n / 3) : n
    },
    update(dt) {
      updateTrails(dt)
      updateOrbs(dt)
      updateRunes(dt)
      for (const b of balls) if (b.on) b.halo.rotation.z += dt * 8
      for (const f of flashes) {
        if (f.t >= f.life) {
          if (f.mesh.isEnabled()) f.mesh.setEnabled(false)
          continue
        }
        f.t += dt
        const u = Math.min(1, f.t / f.life)
        const s = f.size * (0.35 + (f.grow - 0.35) * (1 - Math.pow(1 - u, 3)) / f.grow)
        f.mesh.scaling.setAll(s)
        f.mesh.visibility = u < 0.15 ? 1 : 1 - (u - 0.15) / 0.85
      }
      if (lightT < 1) {
        lightT = Math.min(1, lightT + dt / 0.45)
        light.intensity = 3.2 * (1 - lightT)
      }
    },
    dispose() {
      glow?.dispose()
      for (const o of owned) o.dispose()
    },
  }
}
