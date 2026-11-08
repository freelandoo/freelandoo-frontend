// features/meu-mundo/jetpack/engine/orbital-env.ts — JETPACK 2.0: a CIDADE ORBITAL.
//
// Referência do Alex ("Corrida Neon Pela Cidade Orbital"): uma passarela de
// vidro suspensa no meio da megacidade de dia — pórticos tecnológicos sobre o
// caminho, corrimão de vidro com bordas ciano e amarelas, jardineiras com
// árvores rosa, elevadores de vidro, painéis holográficos, drones, torres por
// todo lado descendo até as nuvens e o céu claro azul-lilás.
//
// Peças do Tripo (build_orbital_tripo.py): torre, pórtico, drone, painel,
// jardineira, elevador — chegam depois (provide). O PÓRTICO é hexagonal: o vão
// é largo entre 25% e 55% da altura dele; com 30 m de largura e o pé enterrado
// 7,8 m abaixo da passarela, a caixa do voo inteira (±5,35 × 0–8,3 m) fica na
// parte larga. A regra não muda.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Mesh as BMesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import { place, rng, mix, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL } from "../sim/flight"
import { JetGeo } from "./jet-geo"
import { SEG, SegmentPool, hash32, weighted, type PoolModule, type PropSpot, type SpinSpot } from "./env-pool"
import type { PieceAssets } from "./canyon-assets"
import { cloudTexture, skyTexture } from "./canyon-env"

const { W, H } = TUNNEL

export const ORBITAL_PIECES = ["torre", "portico", "drone", "painel", "jardineira", "elevador"] as const
export type OrbitalPiece = (typeof ORBITAL_PIECES)[number]

const C = {
  deck: [0.55, 0.62, 0.75] as RGB,
  frame: [0.42, 0.45, 0.55] as RGB,
  frameDark: [0.2, 0.22, 0.3] as RGB,
  cyan: [0.3, 0.92, 1] as RGB,
  magenta: [1, 0.3, 0.85] as RGB,
  yellow: [1, 0.78, 0.25] as RGB,
  glass: [0.6, 0.85, 1] as RGB,
}

type Ctx = { body: JetGeo; glow: JetGeo; glass: JetGeo; spins: SpinSpot[]; props: PropSpot[] }
const prop = (g: Ctx, kind: OrbitalPiece, x: number, y: number, z: number, s: number, ry = 0) => g.props.push({ kind, x, y, z, sx: s, sy: s, sz: s, ry }) // escala SEMPRE uniforme (mm3d-78d: esticar deforma o modelo e a textura)

/** A passarela de vidro (o chão da caixa) com o corrimão de vidro e as bordas acesas — em todo trecho. */
function skybridge(g: Ctx) {
  g.glass.box(W + 0.6, 0.08, SEG, place(0, -0.04, SEG / 2), C.glass)
  for (const sx of [-1, 1]) {
    // viga lateral, faixas acesas (ciano no chão, amarelo em cima) e o corrimão de vidro (fora da caixa)
    g.body.box(0.5, 0.6, SEG, place(sx * (W / 2 + 0.25), -0.25, SEG / 2), C.frame)
    g.glow.box(0.08, 0.06, SEG, place(sx * (W / 2 - 0.05), 0.02, SEG / 2), C.cyan)
    g.glass.box(0.05, 1.2, SEG, place(sx * (W / 2 + 0.2), 0.6, SEG / 2), C.glass)
    g.glow.box(0.1, 0.08, SEG, place(sx * (W / 2 + 0.2), 1.24, SEG / 2), C.yellow)
    for (let z = 2; z < SEG; z += 4) g.body.box(0.12, 1.3, 0.12, place(sx * (W / 2 + 0.2), 0.6, z), C.frameDark)
  }
  // nervuras do piso de vidro
  for (let z = 0; z < SEG; z += 3) g.body.box(W + 0.4, 0.1, 0.12, place(0, -0.06, z), C.frame)
  // a viga que segura a passarela, embaixo
  g.body.box(2.4, 1.6, SEG, place(0, -1.4, SEG / 2), C.frameDark)
}

/** Uma plataforma lateral (pousada no lado de fora) com uma jardineira e luz amarela na borda. */
function terrace(g: Ctx, sx: number, z: number, w = 5) {
  g.body.box(w, 0.6, 6, place(sx * (W / 2 + 1.2 + w / 2), -0.6, z), C.deck)
  g.glow.box(0.08, 0.1, 6, place(sx * (W / 2 + 1.25), -0.28, z), C.yellow)
  prop(g, "jardineira", sx * (W / 2 + 1.2 + w / 2), -0.3, z, 3.4)
}

/** Torres ao redor, de vários tamanhos, descendo até as nuvens. */
function towers(g: Ctx, r: () => number, n: number) {
  for (let i = 0; i < n; i++) {
    const sx = i % 2 ? 1 : -1
    // 70 a 110 m de altura na proporção do modelo (0,4 de largura por 1 de altura): meia largura até 22 m
    const h = 70 + r() * 40
    prop(g, "torre", sx * (8 + h * 0.21 + r() * 35), -60, r() * SEG, h, r() * 6)
  }
}

type Mod = (g: Ctx, v: number) => void
const MODULES: { id: string; build: Mod }[] = [
  {
    id: "portico",
    build(g, v) {
      const r = rng(210 + v)
      skybridge(g)
      // o pórtico sobre o caminho: 30 m de vão, pé 7,8 m abaixo da passarela (a caixa fica na parte larga)
      prop(g, "portico", 0, -7.8, 12, 30)
      terrace(g, v ? 1 : -1, 4)
      towers(g, r, 3)
    },
  },
  {
    id: "elevadores",
    build(g, v) {
      const r = rng(220 + v)
      skybridge(g)
      // tubos de 12 m na proporção do modelo (5,1 m de largura: beira de dentro em |x| 6,9), dois empilhados
      for (const sx of [-1, 1]) for (const y of [-18, -6]) prop(g, "elevador", sx * 9.5, y, v ? 6 : 16, 12)
      prop(g, "painel", (v ? -1 : 1) * 13, 9, 14, 6, v ? Math.PI / 2 : -Math.PI / 2)
      towers(g, r, 4)
    },
  },
  {
    id: "jardim",
    build(g, v) {
      const r = rng(230 + v)
      skybridge(g)
      terrace(g, -1, 6)
      terrace(g, 1, 18)
      g.spins.push({ kind: "drone", x: (v ? 1 : -1) * 9, y: 11, z: 12, speed: 1.3, sway: 0.12, ry: v ? -0.4 : 0.4, s: 2.4 })
      prop(g, "painel", (v ? 1 : -1) * 12.5, 7, 4, 5, v ? -Math.PI / 2 : Math.PI / 2)
      towers(g, r, 3)
    },
  },
]
const VARIANTS = 2
const WEIGHTS = [2, 2, 2]

export interface OrbitalEnv {
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, now: number) => void
  provide: (a: PieceAssets<OrbitalPiece>) => void
  dispose: () => void
}

const SKY_ORBITAL: [number, string][] = [
  [0, "#3a4fb8"],
  [0.3, "#6a7fe0"],
  [0.47, "#b9b8f2"],
  [0.52, "#e3dcfb"],
  [1, "#d9d6f5"],
]

export function buildOrbitalEnv(scene: Scene, low: boolean, slots: number, seed: number): OrbitalEnv {
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  const glassMat = new StandardMaterial("jt-or-glass", scene)
  glassMat.diffuseColor = new Color3(0.6, 0.85, 1)
  glassMat.emissiveColor = new Color3(0.25, 0.4, 0.55)
  glassMat.specularColor = new Color3(0.6, 0.7, 0.8)
  glassMat.alpha = 0.32
  glassMat.backFaceCulling = false
  glassMat.disableDepthWrite = true
  const all: Mesh[] = []
  const mods: PoolModule[] = []
  for (const mod of MODULES) {
    for (let v = 0; v < VARIANTS; v++) {
      const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), glass: new JetGeo(), spins: [], props: [] }
      g.glow.uv = "flat"
      g.glass.uv = "flat"
      mod.build(g, v)
      const meshes: Mesh[] = []
      for (const [geo, mat, layer] of [
        [g.body, mats.trim, "body"],
        [g.glow, mats.glow, "glow"],
        [g.glass, glassMat, "glass"],
      ] as const) {
        if (!geo.vertexCount) continue
        const m = geo.build(`jt-or-${mod.id}${v}-${layer}`, scene, mat, false)
        m.isPickable = false
        meshes.push(m)
        all.push(m)
      }
      mods.push({ meshes, spins: g.spins, props: g.props })
    }
  }
  const INTRO = [0, 2, 1]
  const base = (s: number) => weighted(hash32(s, seed), WEIGHTS)
  const pick = (s: number) => {
    if (s >= 0 && s < INTRO.length) return INTRO[s] * VARIANTS + (s % VARIANTS)
    let m = base(s)
    if (m === base(s - 1)) m = (m + 1) % MODULES.length
    return m * VARIANTS + (hash32(s, seed ^ 13) % VARIANTS)
  }
  const pool = new SegmentPool(scene, "jt-or", mods, new Map(), slots, pick)

  // céu, nuvens lá embaixo e o sol
  const skyTex = skyTexture(scene, low, SKY_ORBITAL)
  const skyMat = new StandardMaterial("jt-or-sky", scene)
  skyMat.emissiveTexture = skyTex
  skyMat.disableLighting = true
  skyMat.backFaceCulling = false
  skyMat.fogEnabled = false
  const sky = CreateSphere("jt-or-sky", { diameter: 900, segments: 16, sideOrientation: BMesh.BACKSIDE }, scene)
  sky.material = skyMat
  sky.infiniteDistance = true
  sky.isPickable = false
  const cloudTex = cloudTexture(scene, low)
  const cloudMat = new StandardMaterial("jt-or-clouds", scene)
  cloudMat.diffuseTexture = cloudTex
  cloudMat.emissiveColor = new Color3(0.6, 0.6, 0.72)
  cloudMat.specularColor = new Color3(0, 0, 0)
  const SEA = 420
  const sea = CreateGround("jt-or-sea", { width: SEA, height: SEA, subdivisions: 1 }, scene)
  sea.material = cloudMat
  sea.isPickable = false
  cloudTex.uScale = cloudTex.vScale = SEA / 60
  const sun = new DirectionalLight("jt-or-sun", new Vector3(-0.4, -0.75, 0.5), scene)
  sun.diffuse = new Color3(1, 0.97, 0.95)
  sun.specular = new Color3(0.2, 0.2, 0.25)
  sun.intensity = 0.95

  mats.glow.emissiveColor.set(1.1, 1.1, 1.1)
  mats.freeze()
  return {
    mats,
    update(z, now) {
      pool.update(z, now)
      sea.position.set(0, -55, z + SEA * 0.3)
      cloudTex.vOffset = (z + SEA * 0.3) / 60 + now * 0.01
    },
    provide(a) {
      for (const kind of ["torre", "portico", "painel", "jardineira", "elevador"] as const) {
        const m = a.meshes.get(kind)
        if (m) pool.provide(kind, m)
      }
      const d = a.meshes.get("drone")
      if (d) pool.provide("drone", d, true)
    },
    dispose() {
      pool.dispose()
      for (const m of all) if (!m.isDisposed()) m.dispose()
      glassMat.dispose()
      sky.dispose()
      skyMat.dispose()
      skyTex.dispose()
      sea.dispose()
      cloudMat.dispose()
      cloudTex.dispose()
      sun.dispose()
      mats.dispose()
    },
  }
}

/** Cor (para quem precisar do tom da fase). */
export const ORBITAL_ACCENT = mix(C.cyan, C.magenta, 0.5)
