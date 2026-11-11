// features/meu-mundo/jetpack/engine/factory-env.ts — JETPACK 2.0: o TÚNEL INDUSTRIAL como galpão.
//
// Referência do Alex ("Voo Steampunk pelo Túnel Industrial"): um galpão enorme
// em vez do túnel fechado — passarela de grade com luzes âmbar e corrimão
// amarelo, pistões de vidro acesos, canos de cobre, engrenagens que giram nas
// paredes, vigas de alerta com luz vermelha cruzando por cima, guindastes
// pendurados, a turbina gigante girando no alto, janelas em arco acesas nas
// paredes do fundo e névoa azulada.
//
// As peças esculpidas (viga, cano, engrenagem, pistão, guindaste, turbina e, desde
// 2026-11-09, caldeira, tanque, empilhadeira, relógio, esteira, painel e cabeça de
// prensa) são do Tripo (build_industrial_v2.py) e chegam depois (provide); o resto é
// desenhado aqui. A caixa do voo é a mesma (x ∈ [−5, 5], y ∈ [0, 8]): o chão é
// a passarela, os lados têm o corrimão e os pilares, e o teto as vigas. A
// regra e os obstáculos (prensas, pilões, pistões, engrenagens) não mudam.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import { place, xf, rng, mix, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL } from "../sim/flight"
import { JetGeo } from "./jet-geo"
import { SEG, SegmentPool, hash32, weighted, type PoolModule, type PropSpot, type SpinSpot, fusedLayers } from "./env-pool"
import type { FactoryAsset, PieceAssets } from "./canyon-assets"

type FactoryPiece = "viga" | "cano" | "pistao" | "guindaste" | "engrenagem" | "turbina" | "prensa-cabeca" | "relogio" | "empilhadeira" | "caldeira" | "tanque" | "esteira" | "painel"
const NEW_PIECES = ["prensa-cabeca", "relogio", "empilhadeira", "caldeira", "tanque", "esteira", "painel"] as const
/** Largura em x e fundura (z) das peças novas com 1 m de altura (fabrica-tema2.json; iguais às do fabrica2). */
const DIM = { "prensa-cabeca": [1.22, 0.92], relogio: [0.73, 0.84], empilhadeira: [1.3, 0.97], caldeira: [0.93, 1.16], tanque: [0.79, 0.65], esteira: [1.28, 1.0], painel: [1.07, 0.76] } as const

const { W, H } = TUNNEL

const C = {
  grate: [0.2, 0.19, 0.2] as RGB,
  steel: [0.3, 0.3, 0.33] as RGB,
  steelDark: [0.14, 0.14, 0.16] as RGB,
  rust: [0.42, 0.24, 0.14] as RGB,
  brick: [0.3, 0.22, 0.2] as RGB,
  brickDark: [0.18, 0.14, 0.14] as RGB,
  yellow: [0.95, 0.72, 0.1] as RGB,
  amber: [1, 0.62, 0.18] as RGB,
  fire: [1, 0.45, 0.1] as RGB,
  sky: [0.55, 0.72, 0.9] as RGB,
  chain: [0.12, 0.12, 0.13] as RGB,
}

type Ctx = { body: JetGeo; glow: JetGeo; spins: SpinSpot[]; props: PropSpot[] }
const prop = (g: Ctx, kind: FactoryPiece, x: number, y: number, z: number, s: number, ry = 0) => g.props.push({ kind, x, y, z, sx: s, sy: s, sz: s, ry }) // escala SEMPRE uniforme (mm3d-78d: esticar deforma o modelo e a textura)

/** A passarela (o chão da caixa), o corrimão dos lados e a estrutura embaixo — em todo trecho. */
function catwalk(g: Ctx, r: () => number) {
  // grade: travessas e longarinas (o topo em y = 0)
  g.body.box(W + 0.8, 0.12, SEG, place(0, -0.36, SEG / 2), C.steelDark)
  for (let z = 0.25; z < SEG; z += 0.5) g.body.box(W + 0.4, 0.06, 0.08, place(0, -0.03, z), C.grate)
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.5) g.body.box(0.06, 0.08, SEG, place(x, -0.08, SEG / 2), C.grate)
  for (const sx of [-1, 1]) {
    // luzes âmbar na beira do chão
    for (let z = 1.5; z < SEG; z += 3) g.glow.box(0.5, 0.04, 1.6, place(sx * (W / 2 - 0.35), 0.01, z), C.amber)
    // viga de borda e corrimão amarelo (fora da caixa: |x| = 5,15)
    g.body.box(0.3, 0.4, SEG, place(sx * (W / 2 + 0.2), -0.15, SEG / 2), C.steel)
    for (let z = 1; z < SEG; z += 2) g.body.box(0.07, 1.1, 0.07, place(sx * (W / 2 + 0.15), 0.55, z), C.yellow)
    g.body.box(0.08, 0.08, SEG, place(sx * (W / 2 + 0.15), 1.1, SEG / 2), C.yellow)
    g.body.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.15), 0.55, SEG / 2), C.yellow)
  }
  // os canos de cobre gigantes do primeiro plano, correndo ao lado da passarela (fora da caixa)
  for (const sx of [-1, 1]) {
    const y = sx < 0 ? 1.6 : 4.2
    g.body.tube([sx * 7.4, y, 0], [sx * 7.4, y, SEG], 1.25, [0.72, 0.4, 0.22], 12)
    for (let z = 3; z < SEG; z += 8) {
      g.body.cylinder(3.1, 0.5, xf(sx * 7.4, y, z, 0, undefined, Math.PI / 2), C.steelDark, 12)
      g.glow.box(0.35, 0.5, 0.35, place(sx * 6.1, y + 1.6, z + 2), C.fire)
    }
  }
  // lanternas quentes nos pilares da passarela
  for (let z = 6; z < SEG; z += 12) for (const sx of [-1, 1]) {
    g.body.box(0.3, H + 2, 0.3, place(sx * 5.9, (H + 2) / 2 - 0.5, z), C.steel)
    g.glow.box(0.4, 0.55, 0.4, place(sx * 5.6, H - 0.5, z), [1, 0.35, 0.2])
    g.glow.box(0.4, 0.55, 0.4, place(sx * 5.6, 2.2, z), C.amber)
  }
  // treliça embaixo da passarela e o brilho das fornalhas lá no fundo
  for (let z = 4; z < SEG; z += 8) {
    for (const sx of [-1, 1]) g.body.box(0.4, 14, 0.4, place(sx * (W / 2 - 0.5), -7.4, z), C.steelDark)
    g.body.box(W, 0.35, 0.35, place(0, -3, z), C.steelDark)
  }
  for (let i = 0; i < 3; i++) g.glow.box(3 + r() * 5, 0.1, 3 + r() * 5, place((r() - 0.5) * 30, -18, r() * SEG), mix(C.fire, C.amber, r()))
}

/** As paredes do fundo: tijolo e ferro com janelas em arco acesas, pilares e o teto alto com claraboias. */
function hall(g: Ctx, r: () => number, fire = false) {
  for (const sx of [-1, 1]) {
    const x = sx * 17
    g.body.box(2, 50, SEG, place(x + sx * 1, 5, SEG / 2), r() < 0.5 ? C.brick : C.brickDark)
    for (const z of [6, 18]) {
      // janela em arco acesa (laranja na fornalha, âmbar no resto)
      g.glow.box(0.2, 7, 4, place(x, 8 + r() * 6, z), fire ? C.fire : mix(C.amber, C.sky, 0.25))
      g.body.box(0.4, 0.4, 4.6, place(x - sx * 0.1, 15 + r() * 2, z), C.steelDark)
      for (const dz of [-1.33, 0, 1.33]) g.body.box(0.3, 7, 0.15, place(x - sx * 0.15, 11, z + dz), C.steelDark)
    }
    // pilares de ferro com rebites (de cima a baixo) a cada 12 m
    for (const z of [0.01, 12]) g.body.box(1.2, 50, 1.2, place(sx * 15.5, 5, z), C.steel)
    // passarela lateral alta
    g.body.box(3, 0.3, SEG, place(sx * 13.5, 12, SEG / 2), C.steelDark)
    for (let z = 1; z < SEG; z += 2.4) g.body.box(0.06, 1, 0.06, place(sx * 12.1, 12.6, z), C.yellow)
  }
  // teto: tesouras e claraboias
  for (const z of [6, 18]) g.body.box(36, 0.8, 0.8, place(0, 28, z), C.steelDark)
  g.glow.box(10, 0.1, 6, place(0, 29, SEG / 2), C.sky)
}

/** Um par de pistões de vidro (modelo) num pedestal, de um lado. */
function pistons(g: Ctx, sx: number, z: number, h = 9) {
  g.body.box(3, 1.2, 4, place(sx * 8, -0.8, z), C.steelDark)
  prop(g, "pistao", sx * 7.6, -0.2, z - 1, h)
  prop(g, "pistao", sx * 8.6, -0.2, z + 1.2, h * 0.85)
}

/** Canos de cobre na parede (modelo), em duas alturas. */
function pipes(g: Ctx, sx: number, z: number) {
  prop(g, "cano", sx * 10.5, 3, z, 4.2, sx > 0 ? 0 : Math.PI)
  prop(g, "cano", sx * 11.5, 9, z + 9, 3.4, sx > 0 ? Math.PI : 0)
}

/**
 * Peça nova num pedestal de aço, de frente para o corredor (as peças novas chegam de costas: meia-volta
 * de base; `side` = de lado, olhando para o corredor). Beira de dentro em |x| ≥ edge (a caixa vai até 5).
 */
function deck(g: Ctx, kind: keyof typeof DIM, sx: number, edge: number, z: number, s: number, side = false) {
  const [w, d] = DIM[kind]
  const ex = (side ? d : w) * s
  const ez = (side ? w : d) * s
  g.body.box(ex + 0.8, 1.2, ez + 0.8, place(sx * (edge + ex / 2), -0.8, z), C.steelDark)
  // de frente: meia-volta (a frente vira para −z, para quem chega); de lado: a frente vira para o corredor
  const ry = side ? (sx < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI
  prop(g, kind, sx * (edge + ex / 2), -0.2, z, s, ry)
}

type Mod = (g: Ctx, v: number) => void

const MODULES: { id: string; build: Mod }[] = [
  {
    id: "salao",
    build(g, v) {
      const r = rng(110 + v)
      catwalk(g, r)
      hall(g, r)
      pistons(g, v ? 1 : -1, 8)
      pipes(g, v ? -1 : 1, 4)
      // engrenagem girando na parede (de frente para o corredor)
      g.spins.push({ kind: "engrenagem", x: (v ? -1 : 1) * 13.2, y: 7, z: 17, speed: 0.4, sway: 0, ry: 0, axis: "x", s: 11 })
    },
  },
  {
    id: "vigas",
    build(g, v) {
      const r = rng(120 + v)
      catwalk(g, r)
      hall(g, r)
      // a viga de alerta cruzando por cima (a viga do modelo tem 1 m ao longo de z: giro de 90°)
      for (const sx of [-1, 1]) g.body.box(0.7, H + 4, 0.7, place(sx * 7, (H + 4) / 2 - 1, 10), C.steel)
      // altura ~2 m, espessura ~1,7 m, vão 14,5 m (o modelo tem o vão ao longo de z e 0,42 de altura)
      prop(g, "viga", 0, H + 0.4, 10, 14.5, Math.PI / 2)
      // guindastes pendurados fora da caixa, com a corrente até o teto
      for (const [sx, z] of [
        [-1, 4],
        [1, 18],
      ] as [number, number][]) {
        g.body.box(0.18, 13, 0.18, place(sx * 7.2, 21.5, z), C.chain)
        prop(g, "guindaste", sx * 7.2, 15, z, 6)
      }
      pipes(g, v ? 1 : -1, 2)
    },
  },
  {
    id: "turbina",
    build(g, v) {
      const r = rng(130 + v)
      catwalk(g, r)
      hall(g, r)
      // a turbina gigante girando acima da faixa de voo (a borda de baixo fica a ~10 m)
      // as turbinas gigantes nas paredes, viradas para o corredor e girando (por cima ficavam de costas para a câmera)
      for (const sx of [-1, 1]) g.spins.push({ kind: "turbina", x: sx * 15.6, y: 13, z: 18, speed: 0.5 * sx, sway: 0, ry: 0, axis: "x", s: 18 })
      for (const sx of [-1, 1]) g.spins.push({ kind: "engrenagem", x: sx * 13.4, y: 8, z: 6, speed: 0.35 * sx, sway: 0, ry: 0, axis: "x", s: 9 })
    },
  },
  {
    id: "fornalha",
    build(g, v) {
      const r = rng(140 + v)
      catwalk(g, r)
      hall(g, r, true)
      pistons(g, -1, 6, 10)
      pistons(g, 1, 18, 10)
      pipes(g, v ? 1 : -1, 12)
    },
  },
  {
    // o pátio: caldeira e tanque nos pedestais, a empilhadeira e o relógio da fábrica na parede
    id: "patio",
    build(g, v) {
      const r = rng(150 + v)
      catwalk(g, r)
      hall(g, r)
      const sx = v ? 1 : -1
      deck(g, "caldeira", sx, 6.4, 6, 4.2)
      deck(g, "tanque", -sx, 6.4, 9, 5.4)
      deck(g, "empilhadeira", -sx, 6.6, 19, 3.2, true)
      // o relógio grande pendurado na parede do galpão, virado para o corredor
      prop(g, "relogio", sx * 11.4, 5, 17, 7, sx < 0 ? Math.PI / 2 : -Math.PI / 2)
    },
  },
  {
    // a linha de produção: esteira com caixas, painel de controle e a cabeça de prensa
    id: "linha",
    build(g, v) {
      const r = rng(160 + v)
      catwalk(g, r)
      hall(g, r)
      const sx = v ? -1 : 1
      deck(g, "esteira", sx, 6.4, 7, 3.4, true)
      deck(g, "painel", -sx, 6.4, 6, 3, true)
      deck(g, "prensa-cabeca", sx, 6.6, 18, 4.2)
      pipes(g, -sx, 14)
    },
  },
]
const VARIANTS = 2
const WEIGHTS = [3, 2, 1.5, 2, 1.8, 1.8]

export interface FactoryEnv {
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, now: number) => void
  provide: (a: PieceAssets<FactoryAsset>) => void
  dispose: () => void
}

export function buildFactoryEnv(scene: Scene, low: boolean, slots: number, seed: number): FactoryEnv {
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  const all: Mesh[] = []
  const mods: PoolModule[] = []
  for (const mod of MODULES) {
    for (let v = 0; v < VARIANTS; v++) {
      const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), spins: [], props: [] }
      g.glow.uv = "flat"
      mod.build(g, v)
      const meshes: Mesh[] = fusedLayers(g, mats, `jt-fb-${mod.id}${v}`, scene)
      all.push(...meshes)
      mods.push({ meshes, spins: g.spins, props: g.props })
    }
  }
  const INTRO = [0, 1, 2, 3]
  const base = (s: number) => weighted(hash32(s, seed), WEIGHTS)
  const pick = (s: number) => {
    if (s >= 0 && s < INTRO.length) return INTRO[s] * VARIANTS + (s % VARIANTS)
    let m = base(s)
    if (m === base(s - 1)) m = (m + 1) % MODULES.length
    return m * VARIANTS + (hash32(s, seed ^ 13) % VARIANTS)
  }
  const pool = new SegmentPool(scene, "jt-fb", mods, new Map(), slots, pick)
  mats.glow.emissiveColor.set(1.1, 1.1, 1.1)
  mats.freeze()
  return {
    mats,
    update(z, now) {
      pool.update(z, now)
    },
    provide(a) {
      for (const kind of ["viga", "cano", "pistao", "guindaste", ...NEW_PIECES] as const) {
        const m = a.meshes.get(kind)
        if (m) pool.provide(kind, m)
      }
      for (const kind of ["engrenagem", "turbina"] as const) {
        const m = a.meshes.get(kind)
        if (m) pool.provide(kind, m, true)
      }
    },
    dispose() {
      pool.dispose()
      for (const m of all) if (!m.isDisposed()) m.dispose()
      mats.dispose()
    },
  }
}
