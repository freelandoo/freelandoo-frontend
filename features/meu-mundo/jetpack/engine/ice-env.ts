// features/meu-mundo/jetpack/engine/ice-env.ts — JETPACK 2.0: a TEMPESTADE ÁRTICA.
//
// Referência do Alex ("Voo Jetpack na Caverna de Gelo"): uma estrada de gelo
// escura com linhas ciano numa caverna glacial — montes de neve, blocos e
// cristais nas laterais, uma base congelada na encosta, pórticos tecnológicos
// cobertos de gelo sobre o caminho, o teto da caverna cheio de estalactites e
// a abertura para o céu com aurora e montanhas.
//
// Peças do Tripo (build_gelo_tripo.py): estalactites, base, anel, cristal,
// bloco e pórtico — chegam depois (provide). O PÓRTICO tem o vão ≥ ±0,17 da
// largura de baixo até 40% da altura: com 32 m e o pé 0,3 m abaixo da
// estrada, a caixa do voo inteira fica dentro. A regra não muda.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Mesh as BMesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import { place, rng, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL } from "../sim/flight"
import { JetGeo } from "./jet-geo"
import { SEG, SegmentPool, hash32, weighted, type PoolModule, type PropSpot, type SpinSpot } from "./env-pool"
import type { PieceAssets } from "./canyon-assets"
import { skyTexture } from "./canyon-env"

const { W, H } = TUNNEL

export const ICE_PIECES = ["estalactites", "base", "anel", "cristal", "bloco", "portico"] as const
export type IcePiece = (typeof ICE_PIECES)[number]

const C = {
  road: [0.3, 0.52, 0.68] as RGB,
  roadHi: [0.45, 0.7, 0.85] as RGB,
  snow: [0.88, 0.94, 1] as RGB,
  ice: [0.55, 0.78, 0.92] as RGB,
  cyan: [0.35, 0.95, 1] as RGB,
  rock: [0.35, 0.42, 0.52] as RGB,
}

type Ctx = { body: JetGeo; glow: JetGeo; spins: SpinSpot[]; props: PropSpot[] }
const prop = (g: Ctx, kind: IcePiece, x: number, y: number, z: number, s: number, ry = 0, sx = s, sz = s) => g.props.push({ kind, x, y, z, sx, sy: s, sz, ry })

/** A estrada de gelo (o chão da caixa) com as linhas ciano e os montes de neve nas beiras. */
function road(g: Ctx, r: () => number) {
  g.body.box(W + 1, 0.4, SEG, place(0, -0.2, SEG / 2), C.road)
  for (let i = 0; i < 6; i++) g.body.box(0.6 + r() * 2, 0.02, 0.6 + r() * 3, place((r() - 0.5) * (W - 1), 0.005, r() * SEG), C.roadHi)
  for (const sx of [-1, 1]) {
    g.glow.box(0.12, 0.03, SEG, place(sx * (W / 2 - 0.5), 0.01, SEG / 2), C.cyan)
    // monte de neve (fora da caixa) e o paredão de gelo baixo
    g.body.sphere(3, [1, 0.5, 1], place(sx * (W / 2 + 1.8), -0.2, 6), C.snow, 6)
    g.body.sphere(3.6, [1, 0.45, 1.3], place(sx * (W / 2 + 2.1), -0.2, 18), C.snow, 6)
  }
  for (let z = 1; z < SEG; z += 4) g.glow.box(0.12, 0.03, 1.6, place(0, 0.01, z), C.cyan)
}

/** O teto da caverna lá no alto com estalactites (modelo); a abertura fica entre os blocos. */
function caveRoof(g: Ctx, r: () => number, open = false) {
  if (!open) g.body.box(60, 3, SEG + 1, place(0, 22, SEG / 2), C.ice)
  for (let i = 0; i < (open ? 2 : 4); i++) {
    const sx = i % 2 ? 1 : -1
    prop(g, "estalactites", sx * (4 + r() * 10), open ? 20 : 20.6, r() * SEG, 7 + r() * 4, r() * 6)
  }
}

/** Laterais: blocos de gelo (modelo) perto e altos atrás, cristais acesos. */
function sides(g: Ctx, r: () => number, crystals: number) {
  for (const sx of [-1, 1]) {
    for (let z = 2; z < SEG; z += 8 + r() * 4) {
      const s = 2.4 + r() * 1.6
      // o bloco tem largura 3,1 por 2,1 de altura (para s = 1): a beira de dentro em |x| ≥ 6
      // giro só de meia-volta: girado, o bloco comprido entraria na caixa
      prop(g, "bloco", sx * (6 + s * 1.6), s * 0.6, z, s, r() < 0.5 ? 0 : Math.PI)
      prop(g, "bloco", sx * (16 + r() * 8), 4 + r() * 6, z + 3, 6 + r() * 4, r() * 6)
    }
  }
  for (let i = 0; i < crystals; i++) {
    const sx = i % 2 ? 1 : -1
    const s = 3.5 + r() * 3
    prop(g, "cristal", sx * (8 + s * 0.6 + r() * 6), -0.3, r() * SEG, s, r() * 6)
  }
}

type Mod = (g: Ctx, v: number) => void
const MODULES: { id: string; build: Mod }[] = [
  {
    id: "portico",
    build(g, v) {
      const r = rng(410 + v)
      road(g, r)
      // o pórtico congelado: 32 m de vão, pé 0,3 m abaixo da estrada
      prop(g, "portico", 0, -0.3, 12, 32, 0, 32, 12)
      sides(g, r, 2)
      caveRoof(g, r)
    },
  },
  {
    id: "base",
    build(g, v) {
      const r = rng(420 + v)
      road(g, r)
      const sx = v ? 1 : -1
      g.body.box(16, 6, 14, place(sx * 19, 1, 12), C.rock)
      prop(g, "base", sx * 18, 4, 12, 11, sx > 0 ? -Math.PI / 2 : Math.PI / 2)
      sides(g, r, 2)
      caveRoof(g, r, true)
    },
  },
  {
    id: "cristais",
    build(g, v) {
      const r = rng(430 + v)
      road(g, r)
      sides(g, r, 6)
      caveRoof(g, r)
    },
  },
  {
    id: "abertura",
    build(g, v) {
      const r = rng(440 + v)
      road(g, r)
      sides(g, r, 3)
      // sem teto: a aurora e as montanhas aparecem
      caveRoof(g, r, true)
    },
  },
]
const VARIANTS = 2
const WEIGHTS = [2, 1.5, 2, 2]

const SKY_AURORA: [number, string][] = [
  [0, "#0a1240"],
  [0.25, "#1a2a6a"],
  [0.4, "#2c6a8a"],
  [0.5, "#9fd2ee"],
  [1, "#c9e2f4"],
]

/** Céu com aurora: o degradê do céu + faixas verdes e roxas por cima. */
function auroraSky(scene: Scene, low: boolean) {
  const tex = skyTexture(scene, low, SKY_AURORA)
  const c = tex.getContext() as CanvasRenderingContext2D
  const Wd = tex.getSize().width
  const Hh = tex.getSize().height
  const r = rng(91)
  for (let k = 0; k < 3; k++) {
    const y0 = Hh * (0.12 + k * 0.07)
    const g = c.createLinearGradient(0, y0 - 40, 0, y0 + 60)
    const col = k === 1 ? "180,90,255" : "80,255,170"
    g.addColorStop(0, `rgba(${col},0)`)
    g.addColorStop(0.5, `rgba(${col},0.55)`)
    g.addColorStop(1, `rgba(${col},0)`)
    c.fillStyle = g
    c.beginPath()
    c.moveTo(0, y0)
    for (let x = 0; x <= Wd; x += 16) c.lineTo(x, y0 + Math.sin(x * 0.01 + k + r()) * 18)
    for (let x = Wd; x >= 0; x -= 16) c.lineTo(x, y0 + 70 + Math.sin(x * 0.012 + k) * 22)
    c.fill()
  }
  tex.update()
  return tex
}

export interface IceEnv {
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, now: number) => void
  provide: (a: PieceAssets<IcePiece>) => void
  dispose: () => void
}

export function buildIceEnv(scene: Scene, low: boolean, slots: number, seed: number): IceEnv {
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  const all: Mesh[] = []
  const mods: PoolModule[] = []
  for (const mod of MODULES) {
    for (let v = 0; v < VARIANTS; v++) {
      const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), spins: [], props: [] }
      g.glow.uv = "flat"
      mod.build(g, v)
      const meshes: Mesh[] = []
      for (const [geo, mat, layer] of [
        [g.body, mats.trim, "body"],
        [g.glow, mats.glow, "glow"],
      ] as const) {
        if (!geo.vertexCount) continue
        const m = geo.build(`jt-ic-${mod.id}${v}-${layer}`, scene, mat, false)
        m.isPickable = false
        meshes.push(m)
        all.push(m)
      }
      mods.push({ meshes, spins: g.spins, props: g.props })
    }
  }
  const INTRO = [0, 2, 1, 3]
  const base = (s: number) => weighted(hash32(s, seed), WEIGHTS)
  const pick = (s: number) => {
    if (s >= 0 && s < INTRO.length) return INTRO[s] * VARIANTS + (s % VARIANTS)
    let m = base(s)
    if (m === base(s - 1)) m = (m + 1) % MODULES.length
    return m * VARIANTS + (hash32(s, seed ^ 13) % VARIANTS)
  }
  const pool = new SegmentPool(scene, "jt-ic", mods, new Map(), slots, pick)

  const skyTex = auroraSky(scene, low)
  const skyMat = new StandardMaterial("jt-ic-sky", scene)
  skyMat.emissiveTexture = skyTex
  skyMat.disableLighting = true
  skyMat.backFaceCulling = false
  skyMat.fogEnabled = false
  const sky = CreateSphere("jt-ic-sky", { diameter: 900, segments: 16, sideOrientation: BMesh.BACKSIDE }, scene)
  sky.material = skyMat
  sky.infiniteDistance = true
  sky.isPickable = false
  // montanhas nevadas ao fundo (fora da névoa, sempre à frente)
  const mtMat = new StandardMaterial("jt-ic-mount", scene)
  mtMat.diffuseColor = new Color3(0.75, 0.85, 0.95)
  mtMat.emissiveColor = new Color3(0.35, 0.42, 0.55)
  mtMat.specularColor = new Color3(0, 0, 0)
  mtMat.fogEnabled = false
  const mg = new JetGeo()
  const mr = rng(77)
  for (let i = 0; i < 7; i++) mg.cone(0, 60 + mr() * 80, 50 + mr() * 70, place(-180 + i * 60 + mr() * 20, 20, mr() * 40), [1, 1, 1], 6)
  const mountains = mg.build("jt-ic-mountains", scene, mtMat, false)
  mountains.isPickable = false
  const sun = new DirectionalLight("jt-ic-sun", new Vector3(0.3, -0.8, 0.5), scene)
  sun.diffuse = new Color3(0.85, 0.92, 1)
  sun.intensity = 0.7

  mats.glow.emissiveColor.set(1.1, 1.1, 1.1)
  mats.freeze()
  return {
    mats,
    update(z, now) {
      pool.update(z, now)
      mountains.position.set(0, -10, z + 360)
    },
    provide(a) {
      for (const kind of ICE_PIECES) {
        if (kind === "anel") continue
        const m = a.meshes.get(kind)
        if (m) pool.provide(kind, m)
      }
    },
    dispose() {
      pool.dispose()
      for (const m of all) if (!m.isDisposed()) m.dispose()
      sky.dispose()
      skyMat.dispose()
      skyTex.dispose()
      mountains.dispose()
      mtMat.dispose()
      sun.dispose()
      mats.dispose()
    },
  }
}
