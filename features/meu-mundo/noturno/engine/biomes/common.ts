// features/meu-mundo/noturno/engine/biomes/common.ts — ROLÊ NOTURNO 2.0: peças comuns das fases.
//
// Céu (cúpula com degradê, lua e estrelas), "mar" lá embaixo (nuvens, lava,
// névoa da floresta) que acompanha a câmera, texturas pintadas no canvas
// (piso da pista, chapas, tábuas, vidro) e o carregador das peças do Blender
// (MEU MUNDO 3D/pipeline/noturno/build_rn2.py): cada GLB vira UMA malha de
// corpo (cor por vértice × acabamento do bairro) e UMA de brilho, prontas
// para instâncias.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, type Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../../engine/avatars"
import { createTrimMaterials } from "../../../engine/steampunk/materials"
import type { QualityTier } from "../../../engine/quality"

export type Paint = (c: CanvasRenderingContext2D, w: number, h: number) => void

/** Textura pintada no canvas (sem arquivo). */
export function canvasTexture(scene: Scene, name: string, w: number, h: number, paint: Paint, wrap = true, alpha = false): DynamicTexture {
  const t = new DynamicTexture(name, { width: w, height: h }, scene, true)
  // sem alfa (o padrão da DynamicTexture deixava o material transparente: piso desenhado como vidro)
  t.hasAlpha = alpha
  const c = t.getContext() as unknown as CanvasRenderingContext2D
  paint(c, w, h)
  t.update(true)
  t.wrapU = wrap ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  t.wrapV = wrap ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  t.anisotropicFilteringLevel = 8
  return t
}

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const hex = (h: string) => Color3.FromHexString(h)

/** Material com luz (difusa + especular baixa). */
export function lit(scene: Scene, name: string, opts: { tex?: DynamicTexture | Texture | null; color?: string; emissive?: string; emissiveTex?: DynamicTexture | null; spec?: number; alpha?: number; backFace?: boolean }) {
  const m = new StandardMaterial(name, scene)
  m.diffuseTexture = opts.tex ?? null
  m.diffuseColor = hex(opts.color ?? "#ffffff")
  m.emissiveColor = hex(opts.emissive ?? "#000000")
  if (opts.emissiveTex) {
    // o emissivo SOMA por cima (sem isto o Standard multiplica pela difusa e o que acende some)
    m.emissiveTexture = opts.emissiveTex
    m.useEmissiveAsIllumination = true
  }
  const sp = opts.spec ?? 0.18
  m.specularColor = new Color3(sp, sp, sp)
  m.specularPower = 48
  if (opts.alpha !== undefined && opts.alpha < 1) {
    m.alpha = opts.alpha
    m.transparencyMode = 2
  }
  m.backFaceCulling = opts.backFace ?? true
  return m
}

/** Material aceso (sem luz). */
export function glow(scene: Scene, name: string, color: string, alpha = 1) {
  const m = new StandardMaterial(name, scene)
  m.disableLighting = true
  m.emissiveColor = hex(color)
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  if (alpha < 1) {
    m.alpha = alpha
    m.alphaMode = Constants.ALPHA_ADD
    m.disableDepthWrite = true
  }
  m.backFaceCulling = false
  return m
}

// ── céu ──────────────────────────────────────────────────────────────────────
export interface SkyOpts {
  /** Degradê de baixo (horizonte) para cima. */
  stops: [number, string][]
  stars: number
  moon?: { color: string; size: number; at: [number, number] }
  /** Planeta (Cidade Orbital): cor, tamanho e onde. */
  planet?: { color: string; ring?: string; size: number; at: [number, number] }
  /** Brilho no horizonte (vulcão, cidade). */
  horizon?: { color: string; at: number; spread: number }
}

/** Cúpula do céu (segue a câmera, sem neblina) com degradê, estrelas, lua/planeta pintados. */
export function buildSky(scene: Scene, name: string, o: SkyOpts) {
  const W = 1024
  const H = 512
  const tex = canvasTexture(scene, `${name}-sky`, W, H, (c) => {
    // pintado com o zênite em cima e o horizonte no meio; a esfera é virada na hora (ver mais abaixo)
    const g = c.createLinearGradient(0, H / 2, 0, 0)
    for (const [k, col] of o.stops) g.addColorStop(k, col)
    c.fillStyle = g
    c.fillRect(0, 0, W, H / 2)
    c.fillStyle = o.stops[0][1]
    c.fillRect(0, H / 2, W, H / 2)
    const r = rng(7)
    for (let i = 0; i < o.stars; i++) {
      const y = Math.pow(r(), 1.6) * H * 0.42
      const x = r() * W
      const b = 0.35 + r() * 0.65
      c.fillStyle = `rgba(255,255,255,${b * (1 - y / (H * 0.45))})`
      const s = r() < 0.06 ? 2 : 1
      c.fillRect(x, y, s, s)
    }
    if (o.horizon) {
      const hx = o.horizon.at * W
      const gg = c.createRadialGradient(hx, H / 2, 0, hx, H / 2, o.horizon.spread * W)
      gg.addColorStop(0, o.horizon.color)
      gg.addColorStop(1, "rgba(0,0,0,0)")
      c.fillStyle = gg
      c.fillRect(0, 0, W, H / 2 + 4)
    }
    if (o.planet) {
      const [px, py] = o.planet.at
      const R = o.planet.size
      const cx = px * W
      const cy = py * H
      const pg = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R)
      pg.addColorStop(0, "#cfe9ff")
      pg.addColorStop(0.35, o.planet.color)
      pg.addColorStop(1, "#050818")
      c.fillStyle = pg
      c.beginPath()
      c.arc(cx, cy, R, 0, Math.PI * 2)
      c.fill()
      // continentes e luzes da cidade no lado escuro
      c.save()
      c.beginPath()
      c.arc(cx, cy, R, 0, Math.PI * 2)
      c.clip()
      for (let i = 0; i < 40; i++) {
        c.fillStyle = `rgba(40,110,90,${0.15 + r() * 0.2})`
        c.beginPath()
        c.ellipse(cx + (r() - 0.5) * R * 1.8, cy + (r() - 0.5) * R * 1.6, R * (0.08 + r() * 0.18), R * (0.04 + r() * 0.1), r() * 3, 0, Math.PI * 2)
        c.fill()
      }
      for (let i = 0; i < 160; i++) {
        c.fillStyle = `rgba(255,${190 + r() * 50},120,${0.4 + r() * 0.5})`
        const a = r() * Math.PI * 2
        const d = Math.sqrt(r()) * R * 0.95
        const x = cx + Math.cos(a) * d
        const y = cy + Math.sin(a) * d
        if (x - cx + (y - cy) * 0.4 > R * 0.15) c.fillRect(x, y, 1.4, 1.4)
      }
      c.restore()
      c.strokeStyle = "rgba(140,210,255,0.55)"
      c.lineWidth = 3
      c.beginPath()
      c.arc(cx, cy, R + 1.5, 0, Math.PI * 2)
      c.stroke()
      if (o.planet.ring) {
        c.strokeStyle = o.planet.ring
        c.lineWidth = 5
        c.beginPath()
        c.ellipse(cx, cy, R * 1.7, R * 0.32, -0.25, 0, Math.PI * 2)
        c.stroke()
      }
    }
    if (o.moon) {
      const [mx, my] = o.moon.at
      const cx = mx * W
      const cy = my * H
      const R = o.moon.size
      const halo = c.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 4)
      halo.addColorStop(0, "rgba(255,250,235,0.35)")
      halo.addColorStop(1, "rgba(255,250,235,0)")
      c.fillStyle = halo
      c.fillRect(cx - R * 4, cy - R * 4, R * 8, R * 8)
      const mg = c.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R)
      mg.addColorStop(0, "#fffdf2")
      mg.addColorStop(1, o.moon.color)
      c.fillStyle = mg
      c.beginPath()
      c.arc(cx, cy, R, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = "rgba(170,160,150,0.35)"
      for (const [dx, dy, rr] of [[-0.3, -0.1, 0.22], [0.25, 0.2, 0.16], [0.05, -0.38, 0.12], [-0.1, 0.35, 0.1]]) {
        c.beginPath()
        c.arc(cx + dx * R, cy + dy * R, rr * R, 0, Math.PI * 2)
        c.fill()
      }
    }
  })
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  // a esfera do Babylon põe v = 0 no polo de cima: vira a textura em v
  tex.vScale = -1
  tex.vOffset = 1
  const mat = new StandardMaterial(`${name}-sky`, scene)
  mat.disableLighting = true
  mat.emissiveTexture = tex
  mat.diffuseColor = new Color3(0, 0, 0)
  mat.specularColor = new Color3(0, 0, 0)
  mat.backFaceCulling = false
  mat.fogEnabled = false
  const dome = CreateSphere(`${name}-sky`, { diameter: 2400, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene)
  dome.material = mat
  dome.infiniteDistance = true
  dome.isPickable = false
  dome.applyFog = false
  // o degradê fica na metade de cima: a esfera mapeia v de 0 (topo) a 1 (fundo)
  return {
    mesh: dome,
    dispose() {
      dome.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}

// ── o "mar" lá embaixo (nuvens, lava, névoa) ─────────────────────────────────
export interface SeaOpts {
  y: number
  paint: Paint
  /** Repetição da textura (m). */
  tile: number
  color: string
  emissive: string
  alpha?: number
  /** Velocidade da textura (m/s em u, v). */
  flow?: [number, number]
}

/** Plano enorme que acompanha a câmera (a textura fica presa no mundo e corre devagar). */
export function buildSea(scene: Scene, name: string, o: SeaOpts) {
  const tex = canvasTexture(scene, `${name}-sea`, 512, 512, o.paint)
  const mat = new StandardMaterial(`${name}-sea`, scene)
  mat.diffuseTexture = tex
  mat.diffuseColor = hex(o.color)
  mat.emissiveColor = hex(o.emissive)
  mat.specularColor = new Color3(0, 0, 0)
  if (o.alpha !== undefined) {
    mat.alpha = o.alpha
    mat.transparencyMode = 2
  }
  mat.backFaceCulling = false
  const SIZE = 3600
  const sea = CreateGround(`${name}-sea`, { width: SIZE, height: SIZE, subdivisions: 1 }, scene)
  sea.material = mat
  sea.isPickable = false
  sea.position.y = o.y
  tex.uScale = SIZE / o.tile
  tex.vScale = SIZE / o.tile
  let t = 0
  return {
    mesh: sea,
    update(dt: number, cam: Vector3) {
      t += dt
      sea.position.x = cam.x
      sea.position.z = cam.z
      // a textura fica no lugar do mundo (o plano anda junto com a câmera)
      tex.uOffset = (cam.x / o.tile + (o.flow?.[0] ?? 0) * t / o.tile) % 1
      tex.vOffset = (cam.z / o.tile + (o.flow?.[1] ?? 0) * t / o.tile) % 1
    },
    dispose() {
      sea.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}

/** Nuvens fofas (manchas claras em fundo transparente-ish). */
export function paintClouds(base: string, light: string, dark: string): Paint {
  return (c, w, h) => {
    c.fillStyle = base
    c.fillRect(0, 0, w, h)
    const r = rng(31)
    for (let i = 0; i < 170; i++) {
      const x = r() * w
      const y = r() * h
      const rad = 34 + r() * 110
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad)
        const col = r() < 0.65 ? light : dark
        g.addColorStop(0, col)
        g.addColorStop(1, "rgba(0,0,0,0)")
        c.fillStyle = g
        c.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2)
      }
    }
  }
}

// ── cachoeira / queda de lava (plano com textura que corre) ─────────────────
export function buildFall(scene: Scene, name: string, top: string, bottom: string, streak: string) {
  const tex = canvasTexture(scene, `${name}-fall`, 128, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, top)
    g.addColorStop(1, bottom)
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    const r = rng(5)
    for (let i = 0; i < 90; i++) {
      c.fillStyle = streak
      c.globalAlpha = 0.25 + r() * 0.5
      c.fillRect(r() * w, r() * h, 1 + r() * 3, 18 + r() * 60)
    }
    c.globalAlpha = 1
  })
  const mat = new StandardMaterial(`${name}-fall`, scene)
  mat.disableLighting = true
  mat.emissiveTexture = tex
  mat.diffuseColor = new Color3(0, 0, 0)
  mat.specularColor = new Color3(0, 0, 0)
  mat.backFaceCulling = false
  const plane = CreatePlane(`${name}-fall`, { width: 1, height: 1 }, scene)
  // origem em cima, no meio: escala (largura, altura) e cai para baixo
  plane.bakeTransformIntoVertices(Matrix.Translation(0, -0.5, 0))
  plane.material = mat
  plane.isPickable = false
  let t = 0
  return {
    mesh: plane,
    update(dt: number) {
      t += dt
      tex.vOffset = (t * 0.9) % 1
    },
    dispose() {
      plane.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}

// ── peças do Blender (build_rn2.py) ──────────────────────────────────────────
export interface RnPiece {
  body: Mesh | null
  glow: Mesh | null
}

export interface RnKit {
  /** Material de corpo (cor por vértice × acabamento) e de brilho (compartilhados). */
  body: StandardMaterial
  glow: StandardMaterial
  load(url: string, name: string): Promise<RnPiece>
  dispose(): void
}

/** Carregador das peças do Rolê 2.0 (uma malha de corpo e uma de brilho por arquivo). */
export function rnKit(scene: Scene, tier: QualityTier): RnKit {
  ensureLoaders()
  const trim = createTrimMaterials(scene, tier)
  const body = trim.trim
  body.emissiveColor = new Color3(0.16, 0.15, 0.17)
  const glowMat = trim.glow
  const meshes: Mesh[] = []
  let disposed = false
  return {
    body,
    glow: glowMat,
    async load(url, name) {
      const c = await LoadAssetContainerAsync(url, scene)
      if (disposed) {
        c.dispose()
        return { body: null, glow: null }
      }
      const parts = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
      const groups: Record<"body" | "glow", Mesh[]> = { body: [], glow: [] }
      const isGlow = (m: AbstractMesh) => {
        for (let n: { name: string; parent: unknown } | null = m; n; n = n.parent as { name: string; parent: unknown } | null) if (/glow|lamp/i.test(n.name)) return true
        return false
      }
      for (const m of parts) {
        m.computeWorldMatrix(true)
        const g = isGlow(m)
        m.bakeTransformIntoVertices(m.getWorldMatrix())
        m.parent = null
        m.position.setAll(0)
        m.rotationQuaternion = null
        m.rotation.setAll(0)
        m.scaling.setAll(1)
        groups[g ? "glow" : "body"].push(m)
      }
      for (const m of parts) {
        c.meshes.splice(c.meshes.indexOf(m), 1)
        if (m.geometry) c.geometries.splice(c.geometries.indexOf(m.geometry), 1)
      }
      c.dispose()
      const out: RnPiece = { body: null, glow: null }
      for (const tag of ["body", "glow"] as const) {
        const group = groups[tag]
        if (!group.length) continue
        for (const m of group) {
          if (m.geometry) scene.addGeometry(m.geometry)
          scene.addMesh(m)
        }
        const merged = group.length > 1 ? Mesh.MergeMeshes(group, true, true) : group[0]
        if (!merged) continue
        merged.name = `${name}-${tag}`
        merged.material = tag === "body" ? body : glowMat
        merged.useVertexColors = true
        merged.hasVertexAlpha = false
        merged.isPickable = false
        merged.isVisible = false
        meshes.push(merged)
        out[tag] = merged
      }
      return out
    },
    dispose() {
      disposed = true
      for (const m of meshes) m.dispose()
      trim.dispose()
    },
  }
}
