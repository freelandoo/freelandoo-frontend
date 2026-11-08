// features/meu-mundo/jetpack/engine/canyon-env.ts — JETPACK 2.0: o CÂNION FLUTUANTE.
//
// Referência do Alex ("Aventura Jetpack no Cânion Flutuante"): um desfiladeiro
// de pedra alaranjada sobre um MAR DE NUVENS, ilhas flutuantes com ruínas e
// cachoeiras ao longe, pontes de corda e madeira, uma vila na encosta com
// moinho, bandeiras e lanternas, cactos, rochas soltas no ar e vento.
//
// Como a caixa do voo continua a mesma (x ∈ [−5, 5], y ∈ [0, 8]), cada limite
// tem um motivo no cenário em vez de pórtico:
//  - CHÃO (y = 0): o mar de nuvens — encostou nas nuvens, caiu;
//  - LADOS (x = ±5): os paredões (nunca entram na caixa); onde o lado abre para
//    o abismo, uma corda com bandeirolas e o vento marcam a beira;
//  - TETO (y = 8): duas cordas com lanternas presas de poste em poste, e as
//    pontes e os arcos de pedra que cruzam por cima.
//
// Os trechos (módulos) são escolhidos pela semente conforme a distância
// (env-pool.ts): começo com vila e pontes, meio com cachoeiras e arcos, longe
// com o abismo aberto. Animado: pás dos moinhos, bandeiras, água das
// cachoeiras, nuvens que correm e ilhas que boiam. Nada aqui colide.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import "@babylonjs/core/Meshes/instancedMesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import { place, xf, rng, mix, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL } from "../sim/flight"
import { JetGeo } from "./jet-geo"
import { SEG, SegmentPool, hash32, weighted, type PoolModule, type SpinSpot } from "./env-pool"

const { W, H } = TUNNEL

const C = {
  rock: [0.8, 0.43, 0.24] as RGB,
  rockHi: [0.9, 0.55, 0.32] as RGB,
  rockDark: [0.6, 0.3, 0.17] as RGB,
  rockDeep: [0.45, 0.22, 0.14] as RGB,
  sand: [0.9, 0.68, 0.42] as RGB,
  grass: [0.48, 0.62, 0.22] as RGB,
  grassDark: [0.32, 0.46, 0.16] as RGB,
  cactus: [0.3, 0.55, 0.25] as RGB,
  wood: [0.5, 0.32, 0.17] as RGB,
  woodDark: [0.32, 0.2, 0.11] as RGB,
  rope: [0.72, 0.6, 0.4] as RGB,
  cloth: [0.92, 0.86, 0.72] as RGB,
  banner: [0.75, 0.12, 0.12] as RGB,
  lamp: [1, 0.78, 0.35] as RGB,
  metal: [0.42, 0.44, 0.48] as RGB,
  ruin: [0.86, 0.8, 0.7] as RGB,
  white: [1, 1, 1] as RGB,
}

type Ctx = { body: JetGeo; glow: JetGeo; water: JetGeo; spins: SpinSpot[] }

const S = (x: number, y: number, z: number) => Matrix.Scaling(x, y, z)

/** Bloco de rocha facetado (low-poly) de meia-medida (sx, sy, sz) com o centro em (x, y, z). */
function boulder(g: Ctx, seed: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, c: RGB, ry = 0) {
  // sem giro nos paredões: girado, o bloco esticado entraria na caixa
  g.body.rock(seed, S(sx, sy, sz).multiply(xf(x, y, z, ry)), c)
}

/**
 * Um paredão de um lado (sx = −1 esquerda, 1 direita) de z0 a z1: pilha de
 * blocos facetados cuja face de dentro fica sempre em |x| ≥ 5,35, com
 * camadas, saliências e topo com grama e cactos. `top` = altura do topo.
 */
function cliff(g: Ctx, r: () => number, sx: number, z0: number, z1: number, top: number, inner = W / 2 + 0.35) {
  // a face de dentro de cada bloco fica em |x| ≥ inner: o raio da rocha facetada vai até 1,16× a meia-medida
  let z = z0
  let k = 0
  while (z < z1) {
    const len = 2.4 + r() * 3.2
    const half = Math.min(len, z1 - z) / 2 + 0.5
    const zc = z + half - 0.5
    const h = top + (r() - 0.4) * 3
    // 1) a base: bloco largo que desce até as nuvens, um pouco recuado às vezes
    const in1 = inner + (r() < 0.3 ? r() * 1.6 : 0)
    const w1 = 1.6 + r() * 1.4
    boulder(g, k * 7 + z, sx * (in1 + w1 * 1.16), h * 0.45 - 5, zc, w1, h * 0.55 + 5, half, k % 2 ? C.rock : C.rockDark)
    // 2) o meio: bloco mais estreito e mais alto, recuado (a silhueta quebra em degraus)
    const w2 = 1.2 + r() * 1.2
    const in2 = in1 + w1 * 0.5 + r() * 0.8
    boulder(g, k * 7 + z + 3, sx * (in2 + w2 * 1.16), h * 0.78, zc + (r() - 0.5) * half * 0.6, w2, h * 0.3, half * 0.8, k % 2 ? C.rockHi : C.rock)
    // 3) atrás e mais alto: o paredão de fundo
    const w3 = 2 + r() * 3
    boulder(g, k * 7 + z + 5, sx * (in2 + w2 * 2 + w3 * 1.1), h * 0.9, zc, w3, h * 0.55, half * 1.1, k % 3 ? C.rockDeep : C.rockDark)
    // camada clara entalhada na base (fina) e, no topo do bloco do meio, um tufo de grama pequeno
    if (r() < 0.6) g.body.box(0.6, 0.18, half * 1.6, place(sx * (in1 + 0.35), 1.2 + r() * (h * 0.5), zc), mix(C.sand, C.rockHi, r()))
    const topY = h * 0.78 + h * 0.3 * 1.05
    if (r() < 0.55) g.body.cone(0.45, 0.06, 0.8, place(sx * (in2 + w2 * 1.16), topY + 0.35, zc), C.grass, 5)
    if (r() < 0.3) {
      const cxx = sx * (in2 + w2 * 1.3)
      g.body.cylinder(0.3, 1.5, place(cxx, topY + 0.7, zc), C.cactus, 6)
      g.body.cylinder(0.18, 0.6, xf(cxx + 0.28, topY + 0.85, zc, 0, undefined, 0, -0.9), C.cactus, 5)
    }
    z += len
    k++
  }
}

/** Corda com lanternas na aresta do teto, de poste em poste (marca y = 8 nos dois lados). */
function ceilingRopes(g: Ctx, sides: number[] = [-1, 1]) {
  for (const sx of sides) {
    const x = sx * (W / 2 + 0.15)
    g.body.box(0.05, 0.05, SEG, place(x, H + 0.12, SEG / 2), C.rope)
    for (let z = 6; z < SEG; z += 12) {
      // poste fincado no paredão, braço por cima e lanterna pendurada (acima do teto)
      g.body.box(0.18, 1.4, 0.18, place(sx * (W / 2 + 0.6), H + 0.4, z), C.woodDark)
      g.body.box(0.6, 0.12, 0.12, place(sx * (W / 2 + 0.35), H + 1.05, z), C.woodDark)
      g.body.box(0.22, 0.06, 0.22, place(x, H + 0.66, z), C.woodDark)
      g.glow.box(0.16, 0.24, 0.16, place(x, H + 0.5, z), C.lamp)
    }
  }
}

/** A beira aberta para o abismo: corda baixa com bandeirolas na altura do meio. */
function openEdge(g: Ctx, sx: number) {
  const x = sx * (W / 2 + 0.25)
  for (const y of [H + 0.12, 0.6]) g.body.box(0.05, 0.05, SEG, place(x, y, SEG / 2), C.rope)
  for (let z = 0.4; z < SEG; z += 1.5) g.body.box(0.03, 0.42, 0.36, place(x, H - 0.12, z), z % 3 < 1.5 ? C.banner : C.cloth)
  for (let z = 4; z < SEG; z += 8) {
    // ilhota-poste que segura as cordas
    boulder(g, z, x + sx * 0.9, -0.4, z, 0.9, 0.7, 0.9, C.rockDark)
    g.body.box(0.16, H + 0.6, 0.16, place(x + sx * 0.2, H / 2, z), C.woodDark)
  }
}

/** Ponte de tábuas e cordas cruzando por cima (o deque fica acima do teto). */
function bridge(g: Ctx, z: number, span = 20) {
  const y = H + 0.5
  for (let x = -span / 2; x < span / 2; x += 0.55) g.body.box(0.48, 0.1, 1.6, place(x + 0.27, y + (Math.cos((x / span) * Math.PI) - 1) * -0.25, z), (x * 7) % 2 > 1 ? C.wood : C.woodDark)
  for (const dz of [-0.85, 0.85]) {
    g.body.box(span, 0.06, 0.06, place(0, y + 1.1, z + dz), C.rope)
    for (let x = -span / 2 + 1; x < span / 2; x += 2) g.body.box(0.04, 1.1, 0.04, place(x, y + 0.55, z + dz), C.rope)
  }
  // lanternas penduradas embaixo (acima da caixa)
  for (const x of [-3, 3]) {
    g.body.box(0.04, 0.2, 0.04, place(x, y - 0.12, z), C.rope)
    g.glow.box(0.2, 0.24, 0.2, place(x, y - 0.27, z), C.lamp)
  }
}

/** Arco natural de pedra cruzando por cima: pés nos paredões, o vão acima do teto. */
function arch(g: Ctx, seed: number, z: number) {
  const r = rng(seed)
  for (const sx of [-1, 1]) boulder(g, seed + sx, sx * 8.6, 6, z, 3, 9, 2.6, C.rockDark)
  for (let i = 0; i < 6; i++) {
    const x = -8 + i * 3.2
    const ry = 1.4 + r() * 0.6
    boulder(g, seed + 10 + i, x, H + 0.6 + ry * 1.2 + Math.sin((i / 5) * Math.PI) * 1.2, z + (r() - 0.5), 2.2, ry, 2.2, i % 2 ? C.rock : C.rockHi)
  }
  g.body.box(14, 0.4, 3, place(0, H + 5.6, z), C.grass)
}

/** Cachoeira descendo do paredão para as nuvens, com a espuma embaixo. */
function waterfall(g: Ctx, sx: number, z: number, top: number, w = 3.2) {
  const x = sx * (W / 2 + 1.1)
  g.water.box(0.25, top + 1, w, place(x, (top + 1) / 2 - 0.5, z), C.white)
  for (let i = 0; i < 5; i++) g.glow.sphere(1.2 + (i % 3) * 0.5, [1.4, 0.6, 1], place(x + sx * (1 + (i % 2) * 0.8), 0.15, z - w / 2 + i * (w / 4)), mix(C.white, [0.75, 0.9, 1], 0.4), 5)
}

/** Vila na encosta: plataforma de madeira, cabana, toldo, bandeira, lanternas e o moinho no alto. */
function village(g: Ctx, sx: number, z: number, top: number) {
  const px = sx * (W / 2 + 2.6)
  const py = 3.2
  // plataforma presa ao paredão (a beira de dentro em |x| = 5,4)
  g.body.box(4.4, 0.25, 7, place(px, py, z), C.wood)
  for (const dz of [-3, 0, 3]) g.body.box(0.2, 3.6, 0.2, place(sx * (W / 2 + 0.6), py - 1.8, z + dz), C.woodDark)
  for (let dz = -3.4; dz <= 3.4; dz += 1.1) g.body.box(0.06, 0.7, 0.06, place(sx * (W / 2 + 0.5), py + 0.45, z + dz), C.woodDark)
  g.body.box(0.06, 0.06, 7, place(sx * (W / 2 + 0.5), py + 0.8, z), C.wood)
  // cabana, telhado, toldo e caixotes
  g.body.box(2.4, 2, 2.6, place(px + sx * 0.6, py + 1.1, z + 1.6), C.sand)
  g.body.prism(2.8, 3, 1, xf(px + sx * 0.6, py + 2.1, z + 1.6, Math.PI / 2), C.banner)
  g.body.box(0.5, 1.1, 0.06, place(px - sx * 0.1, py + 0.7, z + 0.28), C.woodDark)
  g.body.box(2.4, 0.06, 2.2, xf(px - sx * 0.2, py + 1.9, z - 1.8, 0, undefined, 0, sx * 0.2), C.cloth)
  for (const [dx, dz] of [
    [0.3, -2.6],
    [-0.4, -2],
  ]) g.body.box(0.7, 0.6, 0.7, place(px + sx * dx, py + 0.42, z + dz), C.wood)
  for (const dz of [-3, 3]) {
    g.body.box(0.12, 1.6, 0.12, place(sx * (W / 2 + 0.7), py + 0.9, z + dz), C.woodDark)
    g.glow.box(0.22, 0.28, 0.22, place(sx * (W / 2 + 0.7), py + 1.8, z + dz), C.lamp)
  }
  // bandeira presa ao paredão (balança)
  g.body.box(0.1, 3, 0.1, place(sx * (W / 2 + 0.9), top - 1, z - 0.5), C.woodDark)
  g.spins.push({ kind: "banner", x: sx * (W / 2 + 0.9), y: top + 0.4, z: z - 0.5, speed: 1.6, sway: 0.18, ry: sx > 0 ? 0 : Math.PI })
  // o moinho no topo do paredão
  const mx = sx * (W / 2 + 4.5)
  const my = top
  g.body.cone(1.4, 2.4, 4.5, place(mx, my + 2.25, z + 4), C.woodDark, 6)
  g.body.box(1.2, 1, 1.4, place(mx, my + 4.9, z + 4), C.wood)
  g.spins.push({ kind: "mill", x: mx - sx * 0.2, y: my + 5, z: z + 3.2, speed: 0.9 * sx, sway: 0, ry: 0 })
}

// ── os módulos ──────────────────────────────────────────────────────────────

type Mod = (g: Ctx, v: number) => void

const MODULES: { id: string; build: Mod }[] = [
  {
    id: "paredao",
    build(g, v) {
      const r = rng(11 + v)
      for (const sx of [-1, 1]) cliff(g, r, sx, 0, SEG, 9 + r() * 4)
      ceilingRopes(g)
    },
  },
  {
    id: "vila",
    build(g, v) {
      const r = rng(23 + v)
      const side = v % 2 ? 1 : -1
      cliff(g, r, side, 0, SEG, 9, W / 2 + 4.9)
      // atrás da plataforma o paredão recua: a vila fica numa reentrância
      cliff(g, r, side, 0, 6, 9)
      cliff(g, r, side, 18, SEG, 9)
      cliff(g, r, -side, 0, SEG, 12 + r() * 4)
      village(g, side, 12, 9)
      ceilingRopes(g)
    },
  },
  {
    id: "ponte",
    build(g, v) {
      const r = rng(37 + v)
      for (const sx of [-1, 1]) cliff(g, r, sx, 0, SEG, 9.5 + r() * 2)
      bridge(g, 12)
      ceilingRopes(g)
    },
  },
  {
    id: "cachoeira",
    build(g, v) {
      const r = rng(41 + v)
      const side = v % 2 ? -1 : 1
      cliff(g, r, side, 0, 9, 16)
      cliff(g, r, side, 15, SEG, 16)
      // a fenda da cachoeira: o paredão recua e a água cai rente a ele
      cliff(g, r, side, 9, 15, 16, W / 2 + 2.4)
      waterfall(g, side, 12, 15)
      cliff(g, r, -side, 0, SEG, 11 + r() * 3)
      ceilingRopes(g)
    },
  },
  {
    id: "arco",
    build(g, v) {
      const r = rng(53 + v)
      for (const sx of [-1, 1]) cliff(g, r, sx, 0, SEG, 8 + r() * 3)
      arch(g, 60 + v, 12)
      ceilingRopes(g)
    },
  },
  {
    id: "abismo",
    build(g, v) {
      const r = rng(67 + v)
      const open = v % 2 ? 1 : -1
      cliff(g, r, -open, 0, SEG, 12 + r() * 6)
      openEdge(g, open)
      ceilingRopes(g, [-open])
      // rochas soltas no ar do lado aberto (fora da caixa)
      for (let i = 0; i < 4; i++) {
        const s = 0.8 + r() * 1.6
        boulder(g, 90 + i + v, open * (8 + r() * 14), -1 + r() * 14, r() * SEG, s, s * 0.8, s, i % 2 ? C.rock : C.rockDark, r() * 3)
      }
    },
  },
]

/** Pesos dos módulos por faixa de distância: [até 700 m, até 2000 m, depois]. */
const WEIGHTS: number[][] = [
  // paredão, vila, ponte, cachoeira, arco, abismo
  [3, 3, 2, 1, 1, 0.5],
  [2, 1, 2, 3, 2, 1.5],
  [1.5, 0.5, 1, 2, 2, 3],
]
const VARIANTS = 2

// ── o que não é trecho: nuvens, ilhas ao longe ──────────────────────────────

function cloudTexture(scene: Scene, low: boolean) {
  const S = low ? 256 : 512
  const tex = new DynamicTexture("jt-clouds", { width: S, height: S }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  const g0 = c.createLinearGradient(0, 0, 0, S)
  g0.addColorStop(0, "#9fbfe0")
  g0.addColorStop(1, "#b9d2ea")
  c.fillStyle = g0
  c.fillRect(0, 0, S, S)
  const r = rng(5)
  for (let i = 0; i < 70; i++) {
    const x = r() * S
    const y = r() * S
    const rad = (0.05 + r() * 0.12) * S
    for (const [dx, dy] of [
      [0, 0],
      [S, 0],
      [-S, 0],
      [0, S],
      [0, -S],
    ]) {
      const gr = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad)
      gr.addColorStop(0, "rgba(255,255,255,1)")
      gr.addColorStop(0.45, "rgba(244,248,255,0.8)")
      gr.addColorStop(0.8, "rgba(200,220,242,0.35)")
      gr.addColorStop(1, "rgba(160,190,225,0)")
      c.fillStyle = gr
      c.beginPath()
      c.arc(x + dx, y + dy, rad, 0, Math.PI * 2)
      c.fill()
    }
  }
  tex.update()
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  return tex
}

function waterTexture(scene: Scene) {
  const tex = new DynamicTexture("jt-water", { width: 64, height: 256 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  c.fillStyle = "#7fcfee"
  c.fillRect(0, 0, 64, 256)
  const r = rng(9)
  for (let i = 0; i < 46; i++) {
    c.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`
    c.fillRect(r() * 64, r() * 256, 2 + r() * 5, 18 + r() * 50)
  }
  tex.update()
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  return tex
}

/** Ilha flutuante (de longe): rocha em cone para baixo, grama, ruínas e uma cachoeira. */
function island(g: Ctx, kind: number) {
  const r = rng(300 + kind)
  g.body.cone(7.5, 1.2, 9, place(0, -4.5, 0), C.rockDark, 7)
  g.body.cone(8.6, 7.6, 1.6, place(0, 0.2, 0), C.rock, 7)
  g.body.cylinder(8.4, 0.5, place(0, 1.1, 0), C.grass, 7)
  if (kind === 0) {
    // ruína de templo: colunas e frontão
    for (const [x, z] of [
      [-1.6, -1],
      [1.6, -1],
      [-1.6, 1.2],
      [1.6, 1.2],
    ]) g.body.cylinder(0.5, 3, place(x, 2.8, z), C.ruin, 6)
    g.body.box(4.2, 0.5, 3, place(0, 4.5, 0.1), C.ruin)
    g.body.prism(4.4, 3.2, 1, place(0, 4.75, 0.1), C.ruin)
  } else {
    // árvore e caixotes
    g.body.cylinder(0.5, 2.4, place(1, 2.4, 0), C.woodDark, 5)
    g.body.sphere(3, [1, 0.8, 1], place(1, 4.2, 0), C.grassDark, 5)
    g.body.box(0.9, 0.8, 0.9, place(-1.6, 1.8, 1), C.wood)
  }
  g.water.box(1.2, 9, 0.15, place(3.2 + r(), -3, 0), C.white)
}

export interface CanyonEnv {
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, now: number) => void
  dispose: () => void
}

export function buildCanyonEnv(scene: Scene, low: boolean, slots: number, seed: number): CanyonEnv {
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  const waterTex = waterTexture(scene)
  const waterMat = new StandardMaterial("jt-water", scene)
  waterMat.diffuseTexture = waterTex
  waterMat.emissiveColor = new Color3(0.55, 0.62, 0.68)
  waterMat.specularColor = new Color3(0, 0, 0)
  waterMat.backFaceCulling = false
  const all: Mesh[] = []

  const buildGeo = (name: string, fn: (g: Ctx) => void): { meshes: Mesh[]; spins: SpinSpot[] } => {
    const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), water: new JetGeo(), spins: [] }
    g.glow.uv = "flat"
    fn(g)
    const meshes: Mesh[] = []
    for (const [geo, mat, layer] of [
      [g.body, mats.trim, "body"],
      [g.glow, mats.glow, "glow"],
      [g.water, waterMat, "water"],
    ] as const) {
      if (!geo.vertexCount) continue
      const m = geo.build(`${name}-${layer}`, scene, mat, false)
      m.isPickable = false
      meshes.push(m)
      all.push(m)
    }
    return { meshes, spins: g.spins }
  }

  // os módulos (cada um em 2 variantes) e os giradores
  const mods: PoolModule[] = []
  for (const mod of MODULES) for (let v = 0; v < VARIANTS; v++) mods.push(buildGeo(`jt-cn-${mod.id}${v}`, (g) => mod.build(g, v)))
  const spinners = new Map<string, Mesh>()
  const mill = buildGeo("jt-cn-mill", (g) => {
    g.body.cylinder(0.5, 0.4, xf(0, 0, 0, 0, undefined, Math.PI / 2), C.woodDark, 8)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2
      g.body.box(0.14, 3.6, 0.1, xf(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0, 0, undefined, 0, a - Math.PI / 2), C.woodDark)
      g.body.box(1.1, 3, 0.04, xf(Math.cos(a) * 1.9 + Math.cos(a + Math.PI / 2) * 0.55, Math.sin(a) * 1.9 + Math.sin(a + Math.PI / 2) * 0.55, -0.05, 0, undefined, 0, a - Math.PI / 2), C.cloth)
    }
  }).meshes[0]
  const banner = buildGeo("jt-cn-banner", (g) => {
    g.body.box(0.06, 0.06, 1.2, place(0, 0, 0), C.woodDark)
    g.body.box(0.04, 2, 1.1, place(0, -1, 0), C.banner)
    g.body.box(0.05, 0.5, 0.5, place(0, -0.9, 0), C.lamp)
  }).meshes[0]
  spinners.set("mill", mill)
  spinners.set("banner", banner)

  // trecho s → módulo (pela semente e pela distância); nunca o mesmo duas vezes seguidas
  const base = (s: number) => {
    const zone = s * SEG < 700 ? 0 : s * SEG < 2000 ? 1 : 2
    const m = weighted(hash32(s, seed), WEIGHTS[zone])
    return m
  }
  const pick = (s: number) => {
    if (s < 3) return 0
    let m = base(s)
    if (m === base(s - 1)) m = (m + 1 + (hash32(s, seed ^ 77) % (MODULES.length - 1))) % MODULES.length
    return m * VARIANTS + (hash32(s, seed ^ 13) % VARIANTS)
  }
  const pool = new SegmentPool(scene, "jt-cn", mods, spinners, slots, pick)

  // o mar de nuvens (o chão) acompanha o jogador; a textura fica presa ao mundo e corre devagar
  const cloudTex = cloudTexture(scene, low)
  const cloudMat = new StandardMaterial("jt-cloud-sea", scene)
  cloudMat.diffuseTexture = cloudTex
  cloudMat.emissiveColor = new Color3(0.55, 0.6, 0.68)
  cloudMat.specularColor = new Color3(0, 0, 0)
  cloudMat.disableLighting = false
  const SEA = 420
  const sea = CreateGround("jt-cloud-sea", { width: SEA, height: SEA, subdivisions: 1 }, scene)
  sea.material = cloudMat
  sea.isPickable = false
  const TILE = 60
  cloudTex.uScale = SEA / TILE
  cloudTex.vScale = SEA / TILE

  // ilhas flutuantes ao longe, em faixa que acompanha o jogador
  const isl = [0, 1].map((k) => buildGeo(`jt-cn-island${k}`, (g) => island(g, k)).meshes)
  const BAND = 520
  const islands: { insts: InstancedMesh[]; x: number; y: number; oz: number; s: number; ph: number }[] = []
  const ir = rng(seed ^ 0x51)
  const ISLANDS = low ? 6 : 10
  for (let i = 0; i < ISLANDS; i++) {
    const kind = i % 2
    const side = i % 4 < 2 ? -1 : 1
    const s = 0.8 + ir() * 1.4
    const insts = isl[kind].map((src) => {
      const inst = src.createInstance(`jt-cn-isl${i}-${src.name}`)
      inst.isPickable = false
      inst.scaling.setAll(s)
      inst.rotation.y = ir() * Math.PI * 2
      return inst
    })
    islands.push({ insts, x: side * (26 + ir() * 50), y: 12 + ir() * 30, oz: (i / ISLANDS) * BAND + ir() * 30, s, ph: ir() * 6 })
  }
  // os moldes das ilhas longe da vista
  for (const list of isl) for (const m of list) m.position.y = -5000

  mats.glow.emissiveColor.set(1.05, 1.05, 1.05)
  mats.freeze()

  return {
    mats,
    update(z, now) {
      pool.update(z, now)
      sea.position.set(0, 0, z + SEA * 0.3)
      cloudTex.uOffset = now * 0.004
      cloudTex.vOffset = (z + SEA * 0.3) / TILE + now * 0.01
      waterTex.vOffset = now * 1.6
      for (const it of islands) {
        const wz = it.oz + BAND * Math.ceil((z - 90 - it.oz) / BAND)
        const y = it.y + Math.sin(now * 0.35 + it.ph) * 0.8
        for (const inst of it.insts) inst.position.set(it.x, y, wz)
      }
    },
    dispose() {
      for (const it of islands) for (const i of it.insts) i.dispose()
      pool.dispose()
      for (const m of all) if (!m.isDisposed()) m.dispose()
      sea.dispose()
      cloudMat.dispose()
      cloudTex.dispose()
      waterMat.dispose()
      waterTex.dispose()
      mats.dispose()
    },
  }
}
