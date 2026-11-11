// features/meu-mundo/jetpack/engine/floresta-env.ts — JETPACK 2.0: a FLORESTA BIOLUMINESCENTE.
//
// Referência do Alex ("Voo Jetpack pelo Cânion Bioluminescente"): um rio
// turquesa lá embaixo entre degraus de pedra com musgo, cachoeiras dos dois
// lados, cogumelos gigantes roxos e ciano, cristais violeta nas beiras,
// plantas de folha larga em primeiro plano, raízes enormes fazendo arco sobre
// o caminho, cipós e gotas de luz pendurados lá no alto e uma árvore gigante
// de copa rosa ao fundo, tudo numa névoa ciano.
//
// Peças do Tripo (build_floresta_v2.py, em grupos): cristais, cogumelo, ilha (pedra
// com plantas), árvore, planta, arco de raízes e, desde 2026-11-09, cogumelo-casa,
// árvore 2, flor gigante, lanterna de vaga-lume, tronco caído, ninho e tronco —
// chegam depois (provide). Cenário com a beira de dentro em |x| ≥ 6.
// O ARCO tem o vão medido fatia a fatia: com 50 m de largura e o pé 5 m
// abaixo do caminho, sobram ≥ 6,4 m de cada lado da caixa do voo até 9 m de
// altura. A regra não muda.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
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
import { SEG, SegmentPool, hash32, weighted, type PoolModule, type PropSpot, type SpinSpot, fusedLayers } from "./env-pool"
import type { ForestAsset, PieceAssets } from "./canyon-assets"
import { cloudTexture, skyTexture } from "./canyon-env"

const { W, H } = TUNNEL

/** As peças que são CENÁRIO (borda, canto e galão vão para os obstáculos). */
export const FOREST_PIECES = ["cristais", "cogumelo", "ilha", "arvore", "planta", "arco", "cogumelo-casa", "arvore2", "flor", "lanterna", "tronco-caido", "ninho", "tronco-viga"] as const
export type ForestPiece = (typeof FOREST_PIECES)[number]
/** Largura em x das peças novas com 1 m de altura (floresta2.json). */
const WID = { "cogumelo-casa": 0.834, arvore2: 0.773, flor: 0.874, lanterna: 0.728, "tronco-caido": 1.04, ninho: 0.988, "tronco-viga": 1.64 } as const

const C = {
  water: [0.1, 0.58, 0.68] as RGB,
  foam: [0.7, 1, 1] as RGB,
  stone: [0.16, 0.16, 0.3] as RGB,
  moss: [0.3, 0.42, 0.12] as RGB,
  cyan: [0.3, 1, 0.95] as RGB,
  violet: [0.75, 0.35, 1] as RGB,
  vine: [0.22, 0.4, 0.16] as RGB,
  canopy: [0.14, 0.12, 0.3] as RGB,
}

type Ctx = { body: JetGeo; glow: JetGeo; spins: SpinSpot[]; props: PropSpot[] }
/** Nível `low`: metade das plantas, cristais e árvores do fundo (V3, 2026-11-09). */
let lowQ = false
const prop = (g: Ctx, kind: ForestPiece, x: number, y: number, z: number, s: number, ry = 0) => g.props.push({ kind, x, y, z, sx: s, sy: s, sz: s, ry }) // escala SEMPRE uniforme (mm3d-78d: esticar deforma o modelo e a textura)

/** O rio turquesa lá embaixo (fora da caixa), espuma e a beira de pedra com musgo. */
function river(g: Ctx, r: () => number) {
  g.glow.box(40, 0.2, SEG, place(0, -7, SEG / 2), C.water)
  // correnteza: riscos finos e compridos (largos pareciam faixa de estrada)
  for (let i = 0; i < 9; i++) g.glow.box(0.08 + r() * 0.12, 0.04, 3 + r() * 6, place((r() - 0.5) * 16, -6.85, r() * SEG), mix(C.foam, C.water, 0.4))
  for (const sx of [-1, 1]) {
    // a encosta de pedra rente à beira da caixa (desce até o rio), com o musgo por cima e a linha de luz
    g.body.box(3, 7.2, SEG, place(sx * (W / 2 + 1.6), -3.6, SEG / 2), C.stone)
    g.body.box(3.1, 0.25, SEG, place(sx * (W / 2 + 1.6), 0.05, SEG / 2), C.moss)
    g.glow.box(0.08, 0.05, SEG, place(sx * (W / 2 + 0.12), 0.18, SEG / 2), C.cyan)
  }
}

/** Beiras: pedras com plantas (modelo), cristais, plantas de folha larga e cogumelos. */
function banks(g: Ctx, r: () => number, opts: { ledges: number; shrooms: number; crystals: number }) {
  for (const sx of [-1, 1]) {
    // pedras com musgo e plantas: largura 1 por 1,24 de fundo (s = 1); giro só de meia-volta
    for (let i = 0; i < opts.ledges; i++) {
      const s = 5 + r() * 4
      prop(g, "ilha", sx * (6.2 + s * 0.52), -2.6, 3 + (i + r() * 0.5) * (SEG / opts.ledges), s, r() < 0.5 ? 0 : Math.PI)
    }
    // plantas de folha larga na beira (0,8 × 1,08; girada em qualquer ângulo ocupa até 0,68 de raio)
    for (let i = 0; i < (lowQ ? 1 : 2); i++) {
      const s = 2 + r() * 1.6
      prop(g, "planta", sx * (5.4 + s * 0.7), -0.1, r() * SEG, s, r() * 6)
    }
  }
  for (let i = 0; i < (lowQ ? Math.ceil(opts.crystals / 2) : opts.crystals); i++) {
    const sx = i % 2 ? 1 : -1
    const s = 2.2 + r() * 2.4
    // 1,1 × 1,2: girado ocupa até 0,82 de raio
    prop(g, "cristais", sx * (5.6 + s * 0.84 + r() * 3), -0.2, r() * SEG, s, r() * 6)
  }
  for (let i = 0; i < opts.shrooms; i++) {
    const sx = i % 2 ? 1 : -1
    const s = 6 + r() * 9
    // o chapéu (0,93 × 1) girado ocupa até 0,69 de raio
    prop(g, "cogumelo", sx * (6 + s * 0.7 + r() * 6), -1.5, r() * SEG, s, r() * 6)
  }
}

/** Árvores gigantes atrás das beiras (1,27 de largura por 1,66 de fundo para s = 1). */
function trees(g: Ctx, r: () => number, n: number) {
  for (let i = 0; i < (lowQ ? Math.max(1, n - 1) : n); i++) {
    const sx = i % 2 ? 1 : -1
    const s = 20 + r() * 14
    // giro só de meia-volta: girada, a copa comprida entraria na caixa
    prop(g, "arvore", sx * (6.5 + s * 0.64 + r() * 6), -3, r() * SEG, s, r() < 0.5 ? 0 : Math.PI)
  }
}

/** Lá no alto (acima de 9 m): cipós e gotas de luz pendurados e a copa escura. */
function canopy(g: Ctx, r: () => number) {
  for (let i = 0; i < 7; i++) {
    const x = (r() - 0.5) * 22
    const l = 3 + r() * 6
    const y = 22 - l / 2
    const z = r() * SEG
    g.body.box(0.12, l, 0.12, place(x, y, z), C.vine)
    if (y - l / 2 > 9.4) g.glow.sphere(0.32, [0.8, 1.3, 0.8], place(x, y - l / 2 - 0.2, z), r() < 0.6 ? C.cyan : C.violet, 5)
  }
  for (let i = 0; i < 3; i++) g.body.sphere(16 + r() * 10, [1, 0.35, 1], place((r() - 0.5) * 50, 28 + r() * 6, r() * SEG), C.canopy, 6)
}

/** Cachoeira de um lado (fora da caixa): a queda clara e a espuma no rio. */
function waterfall(g: Ctx, r: () => number, sx: number, x: number, w: number) {
  const z = 6 + r() * 12
  g.glow.box(w, 34, 0.5, place(sx * x, 10, z), mix(C.foam, C.water, 0.35))
  g.glow.box(w * 0.4, 34, 0.55, place(sx * x + w * 0.15, 10, z - 0.05), C.foam)
  g.glow.box(w + 3, 0.3, 3, place(sx * x, -6.8, z), C.foam)
}

/** Peça de pé na beira, com a beira de dentro em |x| ≥ edge. */
function stand(g: Ctx, kind: keyof typeof WID, sx: number, edge: number, z: number, s: number, ry = 0, y = 0) {
  // as peças novas do Tripo chegam de costas (frente para +z): meia-volta para olhar quem chega
  prop(g, kind as ForestPiece, sx * (edge + (s * WID[kind]) / 2), y, z, s, ry + Math.PI)
}

type Mod = (g: Ctx, v: number) => void
const MODULES: { id: string; build: Mod }[] = [
  {
    id: "arco",
    build(g, v) {
      const r = rng(610 + v)
      river(g, r)
      // as raízes em arco: 50 m de largura, o pé 5 m abaixo do caminho
      prop(g, "arco", 0, -5, 12, 50)
      banks(g, r, { ledges: 1, shrooms: 1, crystals: 2 })
      canopy(g, r)
    },
  },
  {
    id: "cachoeiras",
    build(g, v) {
      const r = rng(620 + v)
      river(g, r)
      waterfall(g, r, v ? 1 : -1, 13, 4)
      waterfall(g, r, v ? -1 : 1, 22, 6)
      banks(g, r, { ledges: 2, shrooms: 1, crystals: 2 })
      trees(g, r, 2)
      canopy(g, r)
    },
  },
  {
    id: "cogumelos",
    build(g, v) {
      const r = rng(630 + v)
      river(g, r)
      banks(g, r, { ledges: 1, shrooms: 4, crystals: 3 })
      trees(g, r, 1)
      canopy(g, r)
    },
  },
  {
    id: "bosque",
    build(g, v) {
      const r = rng(640 + v)
      river(g, r)
      banks(g, r, { ledges: 2, shrooms: 2, crystals: 2 })
      trees(g, r, 3)
      canopy(g, r)
    },
  },
  {
    // a vila: o cogumelo-casa na beira, lanternas de vaga-lume ao longo do caminho
    id: "vila",
    build(g, v) {
      const r = rng(650 + v)
      river(g, r)
      const sx = v ? 1 : -1
      stand(g, "cogumelo-casa", sx, 7, 12, 9, 0, -0.4)
      for (let i = 0; i < 3; i++) stand(g, "lanterna", i % 2 ? sx : -sx, 6.1, 3 + i * 8, 3.2, i % 2 ? Math.PI : 0)
      banks(g, r, { ledges: 1, shrooms: 1, crystals: 1 })
      canopy(g, r)
    },
  },
  {
    // o jardim: flores gigantes acesas dos dois lados
    id: "jardim",
    build(g, v) {
      const r = rng(660 + v)
      river(g, r)
      for (let i = 0; i < 4; i++) stand(g, "flor", i % 2 ? 1 : -1, 6.2 + r() * 2, 2 + i * 6 + r() * 2, 4 + r() * 3, r() * 6)
      stand(g, "lanterna", v ? -1 : 1, 6.1, 14, 3.4)
      banks(g, r, { ledges: 1, shrooms: 1, crystals: 2 })
      trees(g, r, 1)
      canopy(g, r)
    },
  },
  {
    // o ninho na árvore nova, troncos caídos ao longo da beira
    id: "ninho",
    build(g, v) {
      const r = rng(670 + v)
      river(g, r)
      const sx = v ? -1 : 1
      stand(g, "arvore2", sx, 8, 12, 16)
      stand(g, "ninho", sx, 6.4, 4, 3.6)
      // troncos deitados ao longo do caminho (girados 90°: o comprimento vai para z; em x fica a fundura)
      prop(g, "tronco-caido", -sx * (6.2 + 1.81 * 1.1), 0, 8, 2.2, Math.PI / 2)
      prop(g, "tronco-viga", -sx * (6.2 + 0.71 * 1.2), 0.2, 18, 2.4, Math.PI / 2)
      banks(g, r, { ledges: 1, shrooms: 2, crystals: 1 })
      canopy(g, r)
    },
  },
]
const VARIANTS = 2
const WEIGHTS = [1.5, 2, 2, 2, 1.5, 1.5, 1.4]

const SKY_FOREST: [number, string][] = [
  [0, "#160a36"],
  [0.25, "#2a1c6a"],
  [0.42, "#2a6c94"],
  [0.5, "#7ad8e6"],
  [1, "#9ee6ee"],
]

export interface ForestEnv {
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, now: number) => void
  provide: (a: PieceAssets<ForestAsset>) => void
  dispose: () => void
}

export function buildForestEnv(scene: Scene, low: boolean, slots: number, seed: number): ForestEnv {
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  lowQ = low
  const all: Mesh[] = []
  const mods: PoolModule[] = []
  for (const mod of MODULES) {
    for (let v = 0; v < VARIANTS; v++) {
      const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), spins: [], props: [] }
      g.glow.uv = "flat"
      mod.build(g, v)
      const meshes: Mesh[] = fusedLayers(g, mats, `jt-fl-${mod.id}${v}`, scene)
      all.push(...meshes)
      mods.push({ meshes, spins: g.spins, props: g.props })
    }
  }
  const INTRO = [1, 2, 0, 3]
  const base = (s: number) => weighted(hash32(s, seed), WEIGHTS)
  const pick = (s: number) => {
    if (s >= 0 && s < INTRO.length) return INTRO[s] * VARIANTS + (s % VARIANTS)
    let m = base(s)
    if (m === base(s - 1)) m = (m + 1) % MODULES.length
    return m * VARIANTS + (hash32(s, seed ^ 17) % VARIANTS)
  }
  const pool = new SegmentPool(scene, "jt-fl", mods, new Map(), slots, pick)

  const skyTex = skyTexture(scene, low, SKY_FOREST)
  const skyMat = new StandardMaterial("jt-fl-sky", scene)
  skyMat.emissiveTexture = skyTex
  skyMat.disableLighting = true
  skyMat.backFaceCulling = false
  skyMat.fogEnabled = false
  const sky = CreateSphere("jt-fl-sky", { diameter: 900, segments: 16, sideOrientation: BMesh.BACKSIDE }, scene)
  sky.material = skyMat
  sky.infiniteDistance = true
  sky.isPickable = false
  const sun = new DirectionalLight("jt-fl-sun", new Vector3(-0.2, -0.8, 0.6), scene)
  sun.diffuse = new Color3(0.75, 0.9, 1)
  sun.intensity = 0.55
  // o "chão" da caixa (y = 0): névoa ciano translúcida sobre o rio — encostou nela, caiu
  const veilTex = cloudTexture(scene, low, true)
  veilTex.hasAlpha = true
  veilTex.uScale = 12 / 14
  veilTex.vScale = 300 / 14
  const veilMat = new StandardMaterial("jt-fl-veil", scene)
  veilMat.diffuseTexture = veilTex
  veilMat.useAlphaFromDiffuseTexture = true
  veilMat.emissiveColor = new Color3(0.45, 0.95, 1)
  veilMat.specularColor = new Color3(0, 0, 0)
  veilMat.backFaceCulling = false
  veilMat.disableDepthWrite = true
  const veil = CreateGround("jt-fl-veil", { width: 12, height: 300, subdivisions: 1 }, scene)
  veil.material = veilMat
  veil.isPickable = false
  veil.setEnabled(!low)
  // a árvore gigante de copa rosa lá no fundo (aparece na névoa, anda com o jogador)
  const far: InstancedMesh[] = []

  mats.glow.emissiveColor.set(1.15, 1.15, 1.15)
  mats.freeze()
  return {
    mats,
    update(z, now) {
      pool.update(z, now)
      veil.position.set(0, 0.02, z + 120)
      far.forEach((t, i) => t.position.set(i ? 70 : -40, -8, z + 190 + i * 25))
    },
    provide(a) {
      for (const kind of FOREST_PIECES) {
        const m = a.meshes.get(kind)
        if (m) pool.provide(kind, m)
      }
      const tree = a.meshes.get("arvore")
      if (tree && !far.length) {
        for (let i = 0; i < 2; i++) {
          const t = tree.createInstance(`jt-fl-far${i}`)
          t.scaling.setAll(i ? 70 : 95)
          t.rotation.y = i * 2.1
          t.isPickable = false
          t.alwaysSelectAsActiveMesh = true
          far.push(t)
        }
      }
    },
    dispose() {
      for (const t of far) t.dispose()
      pool.dispose()
      for (const m of all) if (!m.isDisposed()) m.dispose()
      veil.dispose()
      veilMat.dispose()
      veilTex.dispose()
      sky.dispose()
      skyMat.dispose()
      skyTex.dispose()
      sun.dispose()
      mats.dispose()
    },
  }
}
