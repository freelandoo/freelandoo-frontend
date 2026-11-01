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
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
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

export interface Vfx {
  trail: (points: () => [Vector3, Vector3] | null, color: VfxColor) => Trail
  impact: (at: Vector3, color: VfxColor, heavy?: boolean) => void
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
    const m = new StandardMaterial(name, scene)
    m.diffuseTexture = tex
    m.useAlphaFromDiffuseTexture = true
    m.disableLighting = true
    m.emissiveColor = new Color3(0, 0, 0)
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
    f.mat.diffuseColor = color
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
    trail,
    impact(at, color, heavy = false) {
      fire(pool.star, at, color.main, heavy ? 1.8 : 1.1, heavy ? 0.22 : 0.15, 1.6)
      fire(pool.ring, at, color.edge, heavy ? 2.6 : 1.5, heavy ? 0.36 : 0.26, 2.4)
      tint(sparkles, color)
      sparkles.emitter = at.clone()
      sparkles.manualEmitCount = heavy ? 34 : 16
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
