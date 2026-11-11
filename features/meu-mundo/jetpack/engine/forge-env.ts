// features/meu-mundo/jetpack/engine/forge-env.ts — JETPACK 2.0: a FORJA VULCÂNICA.
//
// Referência do Alex ("Voo pelo coração da forja vulcânica"): passarela de
// grade com trilhos laranja acesos sobre um rio de lava, rochas vulcânicas,
// fornalhas despejando lava, prensas com metal em brasa, caldeirões
// pendurados em correntes, pórticos de metal acesos sobre o caminho, o vulcão
// fumegando ao fundo e o céu vermelho-escuro.
//
// Peças do Tripo (build_forja_tripo.py): fornalha, prensa, rocha, ponte,
// pórtico e caldeirão — chegam depois (provide). O PÓRTICO tem o vão ≥ ±0,20
// da largura de baixo até 55% da altura: com 28 m e o pé 0,5 m abaixo da
// passarela, a caixa do voo inteira fica dentro. A regra não muda.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Mesh as BMesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import { place, rng, mix, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL } from "../sim/flight"
import { JetGeo } from "./jet-geo"
import { SEG, SegmentPool, fusedLayers, hash32, weighted, type PoolModule, type PropSpot, type SpinSpot } from "./env-pool"
import type { ForgeAsset, PieceAssets } from "./canyon-assets"
import { skyTexture } from "./canyon-env"

const { W, H } = TUNNEL

export const FORGE_PIECES = ["fornalha", "prensa", "rocha", "ponte", "portico", "caldeirao", "estatua", "cadinho", "chamine", "rocha-lava", "bigorna", "carrinho"] as const
export type ForgePiece = (typeof FORGE_PIECES)[number]
/** Largura em x e fundura (z) das peças novas com 1 m de altura (forja2.json). */
const DIM = { estatua: [0.71, 0.67], cadinho: [1.04, 0.68], chamine: [0.59, 1.23], "rocha-lava": [0.77, 1.82], bigorna: [0.88, 1.55], carrinho: [0.78, 1.16] } as const

const C = {
  grate: [0.16, 0.13, 0.13] as RGB,
  iron: [0.2, 0.17, 0.17] as RGB,
  ironHi: [0.32, 0.27, 0.25] as RGB,
  orange: [1, 0.55, 0.12] as RGB,
  hot: [1, 0.78, 0.35] as RGB,
  lava: [1, 0.42, 0.06] as RGB,
  basalt: [0.17, 0.12, 0.12] as RGB,
  chain: [0.1, 0.09, 0.09] as RGB,
}

type Ctx = { body: JetGeo; glow: JetGeo; spins: SpinSpot[]; props: PropSpot[] }
const prop = (g: Ctx, kind: ForgePiece, x: number, y: number, z: number, s: number, ry = 0) => g.props.push({ kind, x, y, z, sx: s, sy: s, sz: s, ry }) // escala SEMPRE uniforme (mm3d-78d: esticar deforma o modelo e a textura)

/** A passarela de grade (o chão da caixa) com os trilhos laranja acesos e a treliça até a lava. */
function catwalk(g: Ctx) {
  g.body.box(W + 0.8, 0.12, SEG, place(0, -0.36, SEG / 2), C.iron)
  for (let z = 0.25; z < SEG; z += 0.5) g.body.box(W + 0.4, 0.06, 0.08, place(0, -0.03, z), C.grate)
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.5) g.body.box(0.06, 0.08, SEG, place(x, -0.08, SEG / 2), C.grate)
  for (const sx of [-1, 1]) {
    // trilho aceso na beira e o corrimão baixo (fora da caixa)
    g.glow.box(0.16, 0.14, SEG, place(sx * (W / 2 + 0.15), 0.1, SEG / 2), C.orange)
    g.body.box(0.3, 0.45, SEG, place(sx * (W / 2 + 0.3), -0.15, SEG / 2), C.iron)
    for (let z = 1; z < SEG; z += 3) g.body.box(0.1, 1, 0.1, place(sx * (W / 2 + 0.35), 0.5, z), C.ironHi)
    g.glow.box(0.1, 0.08, SEG, place(sx * (W / 2 + 0.35), 1, SEG / 2), C.hot)
  }
  for (let z = 6; z < SEG; z += 12) for (const sx of [-1, 1]) g.body.box(0.6, 7, 0.6, place(sx * (W / 2 - 0.3), -3.8, z), C.iron)
}

/** Rochas vulcânicas no rio de lava (modelo), dos dois lados. */
function rocks(g: Ctx, r: () => number, n: number) {
  for (let i = 0; i < n; i++) {
    const sx = i % 2 ? 1 : -1
    const s = 4 + r() * 6
    prop(g, "rocha", sx * (W / 2 + 2 + s * 0.6 + r() * 14), -6.5 + s * 0.2, r() * SEG, s, r() * 6)
  }
}

/** Fornalha numa ilha de pedra, com a cascata de lava descendo até o rio. */
function furnace(g: Ctx, sx: number, z: number) {
  const x = sx * 15
  g.body.cylinder(14, 6, place(x, -4, z), C.basalt, 9)
  prop(g, "fornalha", x, -1, z, 13, sx > 0 ? -Math.PI / 2 : Math.PI / 2)
  g.glow.box(2.4, 9, 0.6, place(x - sx * 5.5, -3, z), C.lava)
}

/**
 * Peça nova num bloco de ferro, beira de dentro em |x| ≥ edge (a caixa vai até 5). As peças novas chegam
 * de COSTAS: de frente = meia-volta; `side` = olhando para o corredor.
 */
function deck(g: Ctx, kind: keyof typeof DIM, sx: number, edge: number, z: number, s: number, side = false) {
  const [w, d] = DIM[kind]
  const ex = (side ? d : w) * s
  const ez = (side ? w : d) * s
  g.body.box(ex + 0.8, 1.2, ez + 0.8, place(sx * (edge + ex / 2), -0.9, z), C.iron)
  const ry = side ? (sx < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI
  prop(g, kind, sx * (edge + ex / 2), -0.3, z, s, ry)
}

type Mod = (g: Ctx, v: number) => void
const MODULES: { id: string; build: Mod }[] = [
  {
    id: "portico",
    build(g, v) {
      const r = rng(310 + v)
      catwalk(g)
      // o pórtico aceso sobre o caminho: 28 m de vão, pé 0,5 m abaixo da passarela
      prop(g, "portico", 0, -0.5, 12, 28)
      rocks(g, r, 4)
      furnace(g, v ? 1 : -1, 20)
    },
  },
  {
    id: "prensas",
    build(g, v) {
      const r = rng(320 + v)
      catwalk(g)
      for (const sx of [-1, 1]) {
        g.body.box(6, 1.2, 7, place(sx * 10, -1.4, v ? 8 : 16), C.iron)
        prop(g, "prensa", sx * 10, -0.8, v ? 8 : 16, 9, sx > 0 ? -Math.PI / 2 : Math.PI / 2)
      }
      rocks(g, r, 3)
    },
  },
  {
    id: "caldeiroes",
    build(g, v) {
      const r = rng(330 + v)
      catwalk(g)
      // pórtico de vigas com correntes e os caldeirões pendurados fora da caixa
      for (const sx of [-1, 1]) g.body.box(1, 26, 1, place(sx * 12, 7, 12), C.iron)
      g.body.box(26, 1.2, 1.2, place(0, 19.5, 12), C.iron)
      for (const sx of [-1, 1]) {
        g.body.box(0.2, 5, 0.2, place(sx * 7.4, 16.6, 12), C.chain)
        prop(g, "caldeirao", sx * 7.4, 14.2, 12, 4.4)
      }
      rocks(g, r, 3)
      furnace(g, v ? -1 : 1, 4)
    },
  },
  {
    id: "rio",
    build(g, v) {
      const r = rng(340 + v)
      catwalk(g)
      rocks(g, r, 6)
      // passarela lateral (o trecho de ponte do modelo) atravessando a lava
      // 14 m inteira (largura 4,9: beira de dentro em |x| 11,5), topo rente ao chão da caixa
      prop(g, "ponte", (v ? 1 : -1) * 14, -5.5, 12, 14)
    },
  },
  {
    // o ferreiro: a estátua numa ilha de basalto e o cadinho derramando metal do outro lado
    id: "ferreiro",
    build(g, v) {
      const r = rng(350 + v)
      catwalk(g)
      const sx = v ? 1 : -1
      g.body.cylinder(12, 6, place(sx * 14, -4, 10), C.basalt, 9)
      prop(g, "estatua", sx * 14, -1, 10, 11, Math.PI)
      deck(g, "cadinho", -sx, 6.6, 16, 5.5, true)
      g.glow.box(1.2, 0.2, 2.4, place(-sx * (6.6 + 1.9), -0.25, 16), C.lava)
      rocks(g, r, 3)
    },
  },
  {
    // a oficina: bigorna, carrinho de minério, chaminé e rochas de lava ao lado da passarela
    id: "oficina",
    build(g, v) {
      const r = rng(360 + v)
      catwalk(g)
      const sx = v ? -1 : 1
      deck(g, "bigorna", sx, 6.4, 5, 3.2, true)
      deck(g, "carrinho", -sx, 6.4, 9, 2.8, true)
      deck(g, "chamine", sx, 7.5, 17, 7)
      prop(g, "rocha-lava", -sx * (W / 2 + 4 + r() * 6), -2, 19, 4 + r() * 2, r() * 6)
      rocks(g, r, 2)
    },
  },
]
const VARIANTS = 2
const WEIGHTS = [2, 2, 2, 1.5, 1.6, 1.8]

function lavaTexture(scene: Scene, low: boolean) {
  const S = low ? 256 : 512
  const tex = new DynamicTexture("jt-fg-lava", { width: S, height: S }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  c.fillStyle = "#c0300a"
  c.fillRect(0, 0, S, S)
  const r = rng(17)
  for (let i = 0; i < 90; i++) {
    const x = r() * S
    const y = r() * S
    const rad = (0.03 + r() * 0.1) * S
    const gr = c.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, "rgba(255,230,120,0.95)")
    gr.addColorStop(0.5, "rgba(255,140,30,0.6)")
    gr.addColorStop(1, "rgba(200,50,10,0)")
    c.fillStyle = gr
    c.beginPath()
    c.arc(x, y, rad, 0, Math.PI * 2)
    c.fill()
  }
  // crosta escura
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(40,12,8,${0.5 + r() * 0.4})`
    c.beginPath()
    c.ellipse(r() * S, r() * S, 6 + r() * 26, 4 + r() * 14, r() * 3, 0, Math.PI * 2)
    c.fill()
  }
  tex.update()
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  return tex
}

const SKY_FORGE: [number, string][] = [
  [0, "#1a0b14"],
  [0.3, "#3a1424"],
  [0.46, "#7a2a22"],
  [0.52, "#b5481f"],
  [1, "#4a1a12"],
]

export interface ForgeEnv {
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, now: number) => void
  provide: (a: PieceAssets<ForgeAsset>) => void
  dispose: () => void
}

export function buildForgeEnv(scene: Scene, low: boolean, slots: number, seed: number): ForgeEnv {
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  const all: Mesh[] = []
  const mods: PoolModule[] = []
  for (const mod of MODULES) {
    for (let v = 0; v < VARIANTS; v++) {
      const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), spins: [], props: [] }
      g.glow.uv = "flat"
      mod.build(g, v)
      const meshes = fusedLayers(g, mats, `jt-fg-${mod.id}${v}`, scene)
      all.push(...meshes)
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
  const pool = new SegmentPool(scene, "jt-fg", mods, new Map(), slots, pick)

  // o rio de lava (emissivo, correndo) embaixo de tudo
  const lavaTex = lavaTexture(scene, low)
  const lavaMat = new StandardMaterial("jt-fg-lava", scene)
  lavaMat.emissiveTexture = lavaTex
  lavaMat.diffuseColor = new Color3(0, 0, 0)
  lavaMat.specularColor = new Color3(0, 0, 0)
  lavaMat.disableLighting = true
  const RIVER = 360
  const lava = CreateGround("jt-fg-lava", { width: RIVER, height: RIVER, subdivisions: 1 }, scene)
  lava.material = lavaMat
  lava.isPickable = false
  lavaTex.uScale = lavaTex.vScale = RIVER / 30

  // céu e o vulcão ao fundo (fora da névoa, sempre à frente)
  const skyTex = skyTexture(scene, low, SKY_FORGE)
  const skyMat = new StandardMaterial("jt-fg-sky", scene)
  skyMat.emissiveTexture = skyTex
  skyMat.disableLighting = true
  skyMat.backFaceCulling = false
  skyMat.fogEnabled = false
  const sky = CreateSphere("jt-fg-sky", { diameter: 900, segments: 16, sideOrientation: BMesh.BACKSIDE }, scene)
  sky.material = skyMat
  sky.infiniteDistance = true
  sky.isPickable = false
  const volcMat = new StandardMaterial("jt-fg-volcano", scene)
  volcMat.diffuseColor = new Color3(0.12, 0.07, 0.07)
  volcMat.emissiveColor = new Color3(0.12, 0.05, 0.05)
  volcMat.specularColor = new Color3(0, 0, 0)
  volcMat.fogEnabled = false
  const volcano = CreateCylinder("jt-fg-volcano", { height: 120, diameterTop: 40, diameterBottom: 320, tessellation: 9 }, scene)
  volcano.material = volcMat
  volcano.isPickable = false
  const craterMat = new StandardMaterial("jt-fg-crater", scene)
  craterMat.emissiveColor = new Color3(1, 0.45, 0.1)
  craterMat.disableLighting = true
  craterMat.fogEnabled = false
  const crater = CreateCylinder("jt-fg-crater", { height: 3, diameter: 36, tessellation: 9 }, scene)
  crater.material = craterMat
  crater.isPickable = false

  mats.glow.emissiveColor.set(1.15, 1.15, 1.15)
  mats.freeze()
  return {
    mats,
    update(z, now) {
      pool.update(z, now)
      lava.position.set(0, -7, z + RIVER * 0.3)
      lavaTex.vOffset = (z + RIVER * 0.3) / 30 - now * 0.05
      lavaTex.uOffset = Math.sin(now * 0.1) * 0.05
      // o vulcão fica sempre longe, à frente e um pouco de lado
      volcano.position.set(70, 40, z + 420)
      crater.position.set(70, 100, z + 420)
    },
    provide(a) {
      for (const kind of FORGE_PIECES) {
        const m = a.meshes.get(kind)
        if (m) pool.provide(kind, m)
      }
    },
    dispose() {
      pool.dispose()
      for (const m of all) if (!m.isDisposed()) m.dispose()
      for (const m of [lava, sky, volcano, crater]) m.dispose()
      for (const m of [lavaMat, skyMat, volcMat, craterMat]) m.dispose()
      lavaTex.dispose()
      skyTex.dispose()
      mats.dispose()
    },
  }
}

export const FORGE_ACCENT = mix(C.orange, C.lava, 0.5)
