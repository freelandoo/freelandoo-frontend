// features/meu-mundo/engine/interior.ts
//
// Desenha o interior de uma casa (mm3d-09) a partir da definição que veio do
// SERVIDOR (src/utils/meuMundoInteriors.js): cômodos, paredes já recortadas
// pelas portas, janelas, lajes com o vão da escada, escadas e móveis. O
// cliente não guarda medida própria — colisão e assentos são os do payload,
// os mesmos que a sala da casa usa.
//
// Mesmas regras do bairro: tudo de um andar entra em UMA malha com cor por
// vértice (um material para a casa inteira), sem textura, sem sombra, sem
// reflexo. Os móveis são peças simples montadas aqui por tipo — as MESMAS
// para os nove níveis; o que muda de um nível para outro é quantas e onde.
//
// Andares acima do personagem ficam escondidos (corte de "casa de bonecas"):
// a câmera vê o cômodo por cima, e não há teto para atravessar.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import { GeoBuilder, type RGB } from "./geometry"
import type { FloorMat, InteriorDef, InteriorFurniture } from "../types"

const C = {
  wood: [0.86, 0.71, 0.5],
  woodDark: [0.55, 0.37, 0.24],
  tile: [0.86, 0.9, 0.92],
  carpet: [0.8, 0.72, 0.84],
  stone: [0.86, 0.83, 0.78],
  outdoor: [0.78, 0.76, 0.72],
  wall: [0.97, 0.93, 0.85],
  wallBath: [0.86, 0.93, 0.95],
  base: [0.74, 0.66, 0.56],
  frame: [0.97, 0.96, 0.92],
  glass: [0.63, 0.83, 0.95],
  rail: [0.97, 0.96, 0.92],
  fabricA: [0.42, 0.55, 0.7],
  fabricB: [0.76, 0.42, 0.36],
  fabricC: [0.48, 0.62, 0.45],
  cushion: [0.93, 0.88, 0.76],
  white: [0.97, 0.97, 0.96],
  steel: [0.72, 0.74, 0.77],
  dark: [0.2, 0.21, 0.24],
  black: [0.12, 0.12, 0.14],
  leaf: [0.38, 0.64, 0.34],
  pot: [0.74, 0.45, 0.32],
  lampShade: [1, 0.93, 0.7],
  rugA: [0.83, 0.62, 0.5],
  rugB: [0.6, 0.66, 0.78],
  door: [0.48, 0.3, 0.2],
  knob: [0.92, 0.75, 0.3],
  step: [0.78, 0.6, 0.42],
  // Hospital (mm3d-26).
  teal: [0.13, 0.62, 0.64],
  mint: [0.74, 0.89, 0.85],
  sheet: [0.7, 0.84, 0.93],
  ivBag: [0.82, 0.92, 0.97],
  pulse: [0.32, 0.92, 0.52],
  // Centro por dentro (mm3d-37).
  rubber: [0.27, 0.28, 0.31],
  red: [0.78, 0.2, 0.18],
  yellow: [0.98, 0.76, 0.16],
  green: [0.22, 0.56, 0.32],
  navy: [0.16, 0.23, 0.42],
  gold: [0.86, 0.69, 0.3],
  board: [0.17, 0.3, 0.24],
  chalk: [0.92, 0.94, 0.9],
  brick: [0.62, 0.32, 0.22],
  fire: [1, 0.55, 0.15],
  bag: [0.55, 0.12, 0.12],
  iron: [0.35, 0.36, 0.4],
  candle: [0.99, 0.96, 0.86],
  flame: [1, 0.8, 0.3],
  mattress: [0.62, 0.62, 0.58],
} satisfies Record<string, RGB>

const MAT: Record<FloorMat, RGB> = { wood: C.wood, tile: C.tile, carpet: C.carpet, stone: C.stone, rubber: C.rubber }

/**
 * Tema de cores de um prédio do centro (mm3d-37): parede, a cor da casa
 * (estofados, balcões, placas) e uma segunda. Casas e hospital: sem tema.
 */
interface Theme {
  wall: RGB
  accent: RGB
  second: RGB
}
const THEMES: Record<string, Theme> = {
  pizzaria: { wall: [0.97, 0.9, 0.78], accent: C.red, second: C.green },
  hamburgueria: { wall: [0.98, 0.93, 0.84], accent: C.red, second: C.yellow },
  supermercado: { wall: [0.95, 0.96, 0.95], accent: C.green, second: C.yellow },
  universidade: { wall: [0.93, 0.91, 0.86], accent: C.navy, second: C.gold },
  biblioteca: { wall: [0.9, 0.84, 0.72], accent: [0.42, 0.18, 0.16], second: C.gold },
  escola: { wall: [0.95, 0.93, 0.8], accent: [0.3, 0.55, 0.78], second: C.yellow },
  academia: { wall: [0.36, 0.37, 0.4], accent: C.yellow, second: C.red },
  igreja: { wall: [0.92, 0.88, 0.8], accent: [0.45, 0.25, 0.5], second: C.gold },
  delegacia: { wall: [0.82, 0.86, 0.9], accent: C.navy, second: C.gold },
}
const NO_THEME: Theme = { wall: C.wall, accent: C.fabricB, second: C.fabricA }
/** Cores das lombadas e dos produtos de cena (só desenho). */
const STOCK: RGB[] = [C.red, C.yellow, C.green, [0.3, 0.55, 0.85], [0.95, 0.55, 0.2], C.white, [0.6, 0.35, 0.65]]
/** Cilindro deitado ao longo do X local do móvel. */
const ALONG_X = Matrix.RotationZ(Math.PI / 2)
const FABRICS: RGB[] = [C.fabricA, C.fabricB, C.fabricC]

/** Quadro de um móvel: giro em Y (graus) e posição, com a altura do andar. */
function frame(x: number, y: number, z: number, deg: number): Matrix {
  return Matrix.RotationY((deg * Math.PI) / 180).multiply(Matrix.Translation(x, y, z))
}

/** Caixa em coordenadas locais do móvel: centro (lx, lz), do chão ly0 até ly0+h. */
function B(g: GeoBuilder, f: Matrix, lx: number, ly0: number, lz: number, w: number, h: number, d: number, c: RGB) {
  g.box(w, h, d, Matrix.Translation(lx, ly0 + h / 2, lz).multiply(f), c)
}

function legs(g: GeoBuilder, f: Matrix, w: number, d: number, h: number, c: RGB, t = 0.06) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - t), 0, sz * (d / 2 - t), t, h, t, c)
}

function furniture(g: GeoBuilder, it: InteriorFurniture, y: number, seatTop: number, n: number, sizes: Record<string, { w: number; d: number; h: number }>, th: Theme) {
  const base = sizes[it.t] ?? { w: 0.5, d: 0.5, h: 0.5 }
  const w = it.w ?? base.w
  const d = it.d ?? base.d
  const h = it.h ?? base.h
  const f = frame(it.x, y, it.z, it.r)
  const fab = FABRICS[n % FABRICS.length]
  switch (it.t) {
    case "sofa2":
    case "sofa3":
    case "armchair": {
      const arm = 0.14
      B(g, f, 0, 0, 0, w, seatTop - 0.1, d, C.woodDark)
      B(g, f, 0, seatTop - 0.1, -0.05, w - 2 * arm, 0.1, d - 0.2, C.cushion)
      B(g, f, 0, seatTop - 0.1, d / 2 - 0.1, w, h - seatTop + 0.1, 0.2, fab)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - arm / 2), seatTop - 0.1, 0, arm, 0.32, d, fab)
      break
    }
    case "chair":
      legs(g, f, w * 0.9, d * 0.9, seatTop - 0.05, C.woodDark, 0.05)
      B(g, f, 0, seatTop - 0.05, 0, w, 0.05, d, C.wood)
      B(g, f, 0, seatTop, d / 2 - 0.03, w, h - seatTop, 0.06, C.wood)
      break
    case "table2":
    case "table4":
    case "table6":
    case "desk":
      legs(g, f, w, d, h - 0.05, C.woodDark)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.wood)
      if (it.t === "desk") B(g, f, w / 2 - 0.25, h - 0.3, 0, 0.42, 0.25, d - 0.06, C.woodDark)
      break
    case "coffee":
      legs(g, f, w, d, h - 0.05, C.woodDark, 0.05)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.woodDark)
      break
    case "tv":
      B(g, f, 0, 0, 0, w, h, d, C.woodDark)
      B(g, f, 0, h, d / 2 - 0.08, w * 0.9, 0.62, 0.05, C.black)
      break
    case "bed1":
    case "bed2":
      B(g, f, 0, 0, 0, w, 0.32, d, C.woodDark)
      B(g, f, 0, 0.32, 0, w - 0.06, 0.16, d - 0.06, C.white)
      B(g, f, 0, 0.47, -0.25, w - 0.04, 0.05, d * 0.62, fab)
      B(g, f, 0, 0.48, d / 2 - 0.28, w * 0.7, 0.1, 0.32, C.cushion)
      B(g, f, 0, 0, d / 2 - 0.04, w, 0.95, 0.08, C.woodDark)
      break
    case "nightstand":
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, h, 0, 0.16, 0.25, 0.16, C.lampShade)
      break
    case "wardrobe":
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, 0.05, -d / 2 - 0.005, 0.02, h - 0.1, 0.01, C.woodDark)
      for (const sx of [-0.08, 0.08]) B(g, f, sx, h / 2, -d / 2 - 0.02, 0.04, 0.12, 0.03, C.knob)
      break
    case "shelf":
      B(g, f, 0, 0, d / 2 - 0.03, w, h, 0.06, C.woodDark)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.03), 0, 0, 0.06, h, d, C.woodDark)
      for (let k = 0; k < 4; k++) {
        B(g, f, 0, 0.05 + k * (h / 4), 0, w - 0.1, 0.04, d - 0.04, C.wood)
        B(g, f, -w / 4 + (k % 2) * 0.2, 0.09 + k * (h / 4), 0, 0.3, 0.24, d - 0.12, FABRICS[(n + k) % 3])
      }
      break
    case "counter":
    case "island":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.white)
      B(g, f, 0, h - 0.05, 0, w + 0.02, 0.05, d + 0.02, C.dark)
      break
    case "stove":
      B(g, f, 0, 0, 0, w, h - 0.03, d, C.steel)
      B(g, f, 0, h - 0.03, 0, w, 0.03, d, C.black)
      break
    case "fridge":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, w / 2 - 0.08, h * 0.45, -d / 2 - 0.02, 0.04, 0.5, 0.04, C.steel)
      B(g, f, 0, h * 0.62, -d / 2 - 0.005, w - 0.04, 0.02, 0.01, C.steel)
      break
    case "toilet":
      B(g, f, 0, 0, -0.08, w * 0.85, 0.42, d * 0.7, C.white)
      B(g, f, 0, 0, d / 2 - 0.1, w, h, 0.2, C.white)
      break
    case "basin":
      B(g, f, 0, 0, 0.05, 0.18, h - 0.15, 0.18, C.white)
      B(g, f, 0, h - 0.15, 0, w, 0.15, d, C.white)
      B(g, f, 0, h + 0.25, d / 2 - 0.02, w * 0.8, 0.5, 0.03, C.glass)
      break
    case "shower":
      B(g, f, 0, 0, 0, w, 0.08, d, C.white)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.02), 0.08, sz * (d / 2 - 0.02), 0.04, h - 0.08, 0.04, C.steel)
      B(g, f, 0, 0.08, -d / 2 + 0.01, w - 0.04, h * 0.85, 0.02, C.glass)
      B(g, f, 0, h - 0.1, d / 2 - 0.15, 0.2, 0.04, 0.2, C.steel)
      break
    case "bathtub":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, 0, h - 0.04, 0, w - 0.16, 0.05, d - 0.16, C.glass)
      break
    case "washer":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, 0, h * 0.45, -d / 2 - 0.01, 0.34, 0.34, 0.02, C.dark)
      break
    case "plant":
      g.cylinder(0.36, 0.38, Matrix.Translation(0, 0.19, 0).multiply(f), C.pot, 8)
      g.sphere(0.62, [1, 1.15, 1], Matrix.Translation(0, 0.72, 0).multiply(f), C.leaf)
      g.sphere(0.4, [1, 1, 1], Matrix.Translation(0.12, 0.98, -0.05).multiply(f), C.leaf)
      break
    case "lamp":
      g.cylinder(0.05, h - 0.3, Matrix.Translation(0, (h - 0.3) / 2, 0).multiply(f), C.steel, 6)
      g.cylinder(0.34, 0.3, Matrix.Translation(0, h - 0.15, 0).multiply(f), C.lampShade, 8)
      break
    case "piano":
      B(g, f, 0, 0, 0.05, w, h, d - 0.1, C.black)
      B(g, f, 0, 0.7, -d / 2 + 0.08, w - 0.1, 0.05, 0.18, C.white)
      B(g, f, 0, 0.75, -d / 2 + 0.08, w - 0.1, 0.02, 0.06, C.black)
      break
    case "rug":
      B(g, f, 0, 0.005, 0, w, 0.015, d, th === NO_THEME ? (n % 2 ? C.rugA : C.rugB) : th.accent)
      break
    // ── Hospital (mm3d-26) ──
    case "hbed":
      // Estrutura de aço, colchão no mesmo nível da cama (a pose de deitar serve igual).
      legs(g, f, w - 0.06, d - 0.06, 0.3, C.steel, 0.05)
      B(g, f, 0, 0.26, 0, w, 0.06, d, C.steel)
      B(g, f, 0, 0.32, 0, w - 0.06, 0.15, d - 0.06, C.white)
      B(g, f, 0, 0.47, -0.22, w - 0.04, 0.04, d * 0.6, C.sheet)
      B(g, f, 0, 0.47, d / 2 - 0.28, w * 0.7, 0.1, 0.32, C.white)
      B(g, f, 0, 0.26, d / 2 - 0.03, w, 0.72, 0.05, C.teal)
      B(g, f, 0, 0.26, -d / 2 + 0.03, w, 0.42, 0.05, C.teal)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 + 0.01), 0.52, 0.2, 0.03, 0.05, d * 0.45, C.steel)
      break
    case "ivpole":
      for (const a of [0, 90]) B(g, frame(it.x, y, it.z, it.r + a), 0, 0, 0, w * 0.9, 0.04, 0.05, C.steel)
      g.cylinder(0.035, h, Matrix.Translation(0, h / 2, 0).multiply(f), C.steel, 6)
      B(g, f, 0, h - 0.06, 0, 0.36, 0.03, 0.03, C.steel)
      B(g, f, 0.14, h - 0.36, 0, 0.13, 0.26, 0.06, C.ivBag)
      B(g, f, 0.14, 0.9, 0, 0.012, h - 1.28, 0.012, C.ivBag)
      break
    case "monitor":
      g.cylinder(0.28, 0.04, Matrix.Translation(0, 0.02, 0).multiply(f), C.steel, 8)
      g.cylinder(0.04, h - 0.4, Matrix.Translation(0, (h - 0.4) / 2, 0).multiply(f), C.steel, 6)
      B(g, f, 0, h - 0.42, 0, w, 0.4, 0.14, C.dark)
      B(g, f, 0, h - 0.38, -0.075, w - 0.08, 0.32, 0.01, C.black)
      B(g, f, 0, h - 0.23, -0.082, w - 0.16, 0.025, 0.01, C.pulse)
      B(g, f, 0.04, h - 0.27, -0.083, 0.03, 0.12, 0.01, C.pulse)
      break
    case "screen":
      // Biombo: armação de aço e cortina verde-clara.
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.02), 0, 0, 0.04, h, 0.04, C.steel)
      B(g, f, 0, h - 0.04, 0, w, 0.04, 0.04, C.steel)
      B(g, f, 0, 0.25, 0, w - 0.08, h - 0.32, 0.02, C.mint)
      break
    case "reception":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.white)
      // Hospital: verde-azulado; prédio do centro: a cor da casa (mm3d-37).
      B(g, f, 0, 0.1, -d / 2 - 0.005, w - 0.1, h - 0.3, 0.01, th === NO_THEME ? C.teal : th.accent)
      B(g, f, 0, h - 0.05, 0, w + 0.06, 0.05, d + 0.06, C.dark)
      break
    case "cabinet":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 4), h * 0.45, -d / 2 - 0.005, w / 2 - 0.06, h * 0.5, 0.01, C.glass)
      B(g, f, 0, h - 0.02, 0, w + 0.02, 0.03, d + 0.02, C.teal)
      break
    // ── Centro por dentro (mm3d-37) ── academia
    case "treadmill":
      B(g, f, 0, 0, 0.1, w, 0.18, d - 0.2, C.dark)
      B(g, f, 0, 0.18, 0.1, w - 0.2, 0.02, d - 0.35, C.black)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.05), 0.18, -d / 2 + 0.2, 0.06, h - 0.3, 0.06, C.steel)
      B(g, f, 0, h - 0.32, -d / 2 + 0.2, w, 0.3, 0.16, C.dark)
      B(g, f, 0, h - 0.24, -d / 2 + 0.11, w * 0.6, 0.14, 0.01, th.accent)
      break
    case "squat_rack":
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06), 0.08, h, 0.08, C.iron)
      for (const sz of [-1, 1]) B(g, f, 0, h - 0.06, sz * (d / 2 - 0.06), w, 0.06, 0.08, C.iron)
      B(g, f, 0, 0, 0, w, 0.04, d, C.rubber)
      // Barra no meio, onde quem agacha fica, com as anilhas.
      g.cylinder(0.035, w + 0.5, ALONG_X.multiply(Matrix.Translation(0, 1.45, 0)).multiply(f), C.steel, 6)
      for (const sx of [-1, 1]) g.cylinder(0.42, 0.08, ALONG_X.multiply(Matrix.Translation(sx * (w / 2 + 0.12), 1.45, 0)).multiply(f), C.black, 10)
      break
    case "punching_bag":
      B(g, f, 0, h - 0.06, 0, 0.08, 0.06, 0.08, C.iron)
      g.cylinder(0.015, 0.3, Matrix.Translation(0, h - 0.2, 0).multiply(f), C.steel, 4)
      g.cylinder(w * 0.75, 1.15, Matrix.Translation(0, h - 0.92, 0).multiply(f), C.bag, 10)
      break
    case "plyo_box":
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, h - 0.02, 0, w + 0.01, 0.02, d + 0.01, th.accent)
      break
    case "gym_mat":
      B(g, f, 0, 0.005, 0, w, 0.025, d, th.second)
      break
    case "kettlebells":
      B(g, f, 0, 0, 0, w, 0.06, d, C.rubber)
      for (let k = 0; k < 4; k++) {
        const kx = -w / 2 + 0.16 + k * ((w - 0.32) / 3)
        g.sphere(0.18 + k * 0.02, [1, 1, 1], Matrix.Translation(kx, 0.16, 0).multiply(f), C.black)
        B(g, f, kx, 0.26 + k * 0.02, 0, 0.12, 0.04, 0.03, C.black)
      }
      break
    case "dumbbell_rack":
      B(g, f, 0, 0, 0, w, 0.06, d, C.iron)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.05), 0, 0, 0.06, h, d, C.iron)
      for (const ly of [0.45, 0.85]) {
        B(g, f, 0, ly - 0.08, 0, w - 0.1, 0.03, d - 0.1, C.iron)
        for (let k = 0; k < 6; k++) B(g, f, -w / 2 + 0.22 + k * ((w - 0.44) / 5), ly - 0.05, 0, 0.12, 0.12, 0.3, C.black)
      }
      break
    case "weight_bench":
      legs(g, f, w, d - 0.2, 0.42, C.iron, 0.05)
      B(g, f, 0, 0.4, 0, w, 0.1, d, C.black)
      break
    case "mirror":
      B(g, f, 0, 0.3, 0, w, h - 0.3, d, C.steel)
      B(g, f, 0, 0.34, -0.005, w - 0.08, h - 0.38, d, C.glass)
      break
    case "lockers":
      B(g, f, 0, 0, 0, w, h, d, th.accent)
      for (let k = 0; k < 3; k++) B(g, f, -w / 2 + w / 6 + (k * w) / 3, 0.08, -d / 2 - 0.005, w / 3 - 0.06, h - 0.16, 0.01, C.steel)
      break
    // ── escola, universidade e biblioteca ──
    case "blackboard":
      B(g, f, 0, 0.75, 0, w, h - 0.75, d, C.woodDark)
      B(g, f, 0, 0.82, -0.01, w - 0.12, h - 0.89, d, C.board)
      // Giz no quadro (riscos).
      for (let k = 0; k < 3; k++) B(g, f, -w / 4 + k * 0.4, 1.4 + k * 0.18, -d / 2 - 0.006, 0.9 - k * 0.2, 0.03, 0.005, C.chalk)
      B(g, f, 0, 0.78, -d / 2 - 0.04, w - 0.2, 0.03, 0.08, C.woodDark)
      break
    case "lectern":
      B(g, f, 0, 0, 0, w * 0.6, 0.06, d * 0.8, C.woodDark)
      B(g, f, 0, 0.06, 0, 0.18, h - 0.2, 0.18, C.woodDark)
      B(g, f, 0, h - 0.16, 0, w, 0.12, d, C.wood)
      break
    case "bookcase":
      B(g, f, 0, 0, d / 2 - 0.03, w, h, 0.06, C.woodDark)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.03), 0, 0, 0.06, h, d, C.woodDark)
      for (let k = 0; k < 5; k++) {
        const ly = 0.04 + k * (h / 5)
        B(g, f, 0, ly, 0, w - 0.1, 0.04, d - 0.04, C.wood)
        // Lombadas: larguras e alturas variadas.
        let bx = -w / 2 + 0.1
        let j = 0
        while (bx < w / 2 - 0.25) {
          const bw = 0.1 + ((n + k + j) % 3) * 0.05
          const bh = 0.24 + ((n + j * 2 + k) % 4) * 0.04
          B(g, f, bx + bw / 2, ly + 0.04, 0, bw - 0.01, bh, d - 0.12, STOCK[(n + k * 3 + j) % STOCK.length])
          bx += bw
          j++
        }
      }
      break
    // ── igreja ──
    case "pew":
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.04), 0, 0, 0.08, h, d, C.woodDark)
      B(g, f, 0, seatTop - 0.06, -0.04, w - 0.08, 0.06, d - 0.12, C.wood)
      B(g, f, 0, seatTop, d / 2 - 0.05, w - 0.08, h - seatTop, 0.06, C.wood)
      B(g, f, 0, 0.12, d / 2 + 0.02, w - 0.2, 0.06, 0.12, C.woodDark)
      break
    case "altar":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, 0, h - 0.05, 0, w + 0.1, 0.05, d + 0.1, C.wood)
      B(g, f, 0, 0.2, -d / 2 - 0.005, w * 0.5, h - 0.4, 0.01, th.second)
      break
    case "cross":
      B(g, f, 0, 0.6, 0, 0.16, h - 0.6, d, th.second)
      B(g, f, 0, h - 0.65, 0, w, 0.16, d, th.second)
      break
    case "candles":
      g.cylinder(0.05, h - 0.25, Matrix.Translation(0, (h - 0.25) / 2, 0).multiply(f), C.gold, 6)
      g.cylinder(0.28, 0.04, Matrix.Translation(0, 0.02, 0).multiply(f), C.gold, 8)
      B(g, f, 0, h - 0.27, 0, 0.32, 0.03, 0.04, C.gold)
      for (const sx of [-0.12, 0, 0.12]) {
        g.cylinder(0.05, 0.22, Matrix.Translation(sx, h - 0.14, 0).multiply(f), C.candle, 6)
        g.sphere(0.05, [1, 1.6, 1], Matrix.Translation(sx, h + 0.01, 0).multiply(f), C.flame)
      }
      break
    // ── pizzaria e hamburgueria ──
    case "order_counter":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.woodDark)
      B(g, f, 0, 0.1, -d / 2 - 0.005, w - 0.1, h - 0.3, 0.01, th.accent)
      B(g, f, 0, h - 0.05, 0, w + 0.06, 0.05, d + 0.06, C.dark)
      // Caixa registradora.
      B(g, f, -w / 2 + 0.45, h, 0.05, 0.4, 0.18, 0.3, C.dark)
      B(g, f, -w / 2 + 0.45, h + 0.18, 0.15, 0.32, 0.18, 0.04, C.black)
      break
    case "pizza_oven":
      B(g, f, 0, 0, 0, w, 0.9, d, C.brick)
      g.sphere(w * 0.95, [1, 0.62, d / w], Matrix.Translation(0, 0.9, 0).multiply(f), C.brick)
      B(g, f, 0, 0.92, -d / 2 + 0.02, 0.55, 0.34, 0.05, C.black)
      B(g, f, 0, 0.95, -d / 2 + 0.06, 0.4, 0.16, 0.02, C.fire)
      g.cylinder(0.24, 0.7, Matrix.Translation(0, h - 0.2, d / 4).multiply(f), C.iron, 6)
      break
    case "menu_board":
      B(g, f, 0, 1.2, 0, w, h - 1.2, d, C.woodDark)
      B(g, f, 0, 1.26, -0.01, w - 0.1, h - 1.32, d, C.black)
      for (let k = 0; k < 4; k++) {
        B(g, f, -w / 6, 1.42 + k * 0.22, -d / 2 - 0.006, w * 0.45, 0.05, 0.005, C.chalk)
        B(g, f, w / 3, 1.42 + k * 0.22, -d / 2 - 0.006, w * 0.12, 0.05, 0.005, th.second)
      }
      B(g, f, 0, h - 0.24, -d / 2 - 0.006, w * 0.6, 0.12, 0.005, th.accent)
      break
    case "booth":
      B(g, f, 0, 0, 0, w, seatTop - 0.08, d, C.woodDark)
      B(g, f, 0, seatTop - 0.08, -0.05, w, 0.1, d - 0.15, th.accent)
      B(g, f, 0, seatTop - 0.08, d / 2 - 0.1, w, h - seatTop + 0.08, 0.2, th.accent)
      B(g, f, 0, h - 0.04, d / 2 - 0.1, w + 0.02, 0.05, 0.22, C.woodDark)
      break
    case "soda_machine":
      B(g, f, 0, 0, 0, w, h, d, th.accent)
      B(g, f, 0, 0.9, -d / 2 - 0.005, w - 0.12, 0.7, 0.01, C.dark)
      for (const sx of [-0.22, 0, 0.22]) B(g, f, sx, 1.0, -d / 2 - 0.03, 0.12, 0.08, 0.05, C.steel)
      B(g, f, 0, 0.75, -d / 2 - 0.04, w - 0.2, 0.04, 0.12, C.steel)
      break
    case "fryer":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.steel)
      B(g, f, 0, h - 0.05, 0, w - 0.08, 0.05, d - 0.08, C.yellow)
      break
    case "stool":
      g.cylinder(0.06, seatTop - 0.06, Matrix.Translation(0, (seatTop - 0.06) / 2, 0).multiply(f), C.steel, 6)
      g.cylinder(w, 0.06, Matrix.Translation(0, seatTop - 0.03, 0).multiply(f), th.accent, 10)
      break
    // ── supermercado (prateleiras de cena: pedido do Alex, nada para pegar) ──
    case "gondola":
      B(g, f, 0, 0, 0, w, 0.12, d, C.dark)
      B(g, f, 0, 0, 0, w, h, 0.06, C.steel)
      for (let k = 0; k < 4; k++) {
        const ly = 0.12 + k * 0.4
        for (const sz of [-1, 1]) {
          B(g, f, 0, ly, sz * (d / 4 + 0.02), w - 0.04, 0.03, d / 2 - 0.06, C.white)
          for (let j = 0; j < 8; j++)
            B(g, f, -w / 2 + 0.22 + j * ((w - 0.44) / 7), ly + 0.03, sz * (d / 4 + 0.02), 0.26, 0.2 + ((j + k) % 3) * 0.05, d / 2 - 0.14, STOCK[(n + j + k * 2) % STOCK.length])
        }
      }
      B(g, f, 0, h, 0, w, 0.06, d, th.accent)
      break
    case "fridge_case":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      for (let k = 0; k < 4; k++)
        for (let j = 0; j < 6; j++) B(g, f, -w / 2 + 0.3 + j * ((w - 0.6) / 5), 0.2 + k * 0.42, -0.05, 0.18, 0.26, d * 0.55, STOCK[(n + j * 2 + k) % STOCK.length])
      B(g, f, 0, 0.12, -d / 2 - 0.005, w - 0.1, h - 0.36, 0.01, C.glass)
      B(g, f, 0, h - 0.24, -d / 2 - 0.01, w, 0.2, 0.02, th.accent)
      break
    case "fruit_stand":
      legs(g, f, w, d, 0.6, C.woodDark, 0.06)
      B(g, f, 0, 0.6, 0, w, 0.1, d, C.wood)
      for (let j = 0; j < 6; j++)
        for (let k = 0; k < 3; k++)
          g.sphere(0.14, [1, 0.9, 1], Matrix.Translation(-w / 2 + 0.18 + j * ((w - 0.36) / 5), 0.78, -d / 2 + 0.2 + k * ((d - 0.4) / 2)).multiply(f), [C.red, C.yellow, C.green, C.fire][(j + n) % 4])
      break
    case "checkout":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.white)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.dark)
      B(g, f, -w / 4, h, 0, w / 2 - 0.1, 0.02, d - 0.2, C.black)
      B(g, f, w / 2 - 0.3, h, 0.1, 0.36, 0.2, 0.3, C.dark)
      g.cylinder(0.04, 1.1, Matrix.Translation(w / 2 - 0.1, h + 0.55, d / 2 - 0.1).multiply(f), C.steel, 6)
      B(g, f, w / 2 - 0.1, h + 1.1, d / 2 - 0.1, 0.34, 0.22, 0.06, th.accent)
      break
    case "poster":
      B(g, f, 0, 0.9, 0, w, h, d, C.white)
      B(g, f, 0, 0.98, -0.01, w - 0.16, h * 0.55, d, n % 2 ? th.second : th.accent)
      for (let k = 0; k < 3; k++) B(g, f, 0, 0.98 + h * 0.6 + k * 0.1, -0.01, w * (0.7 - k * 0.15), 0.04, d, C.dark)
      break
    // ── delegacia ──
    case "bars":
      B(g, f, 0, 0, 0, w, 0.08, d, C.iron)
      B(g, f, 0, h - 0.08, 0, w, 0.08, d, C.iron)
      B(g, f, 0, 1.1, 0, w, 0.05, d, C.iron)
      for (let k = 0; k <= Math.floor(w / 0.16); k++) g.cylinder(0.05, h, Matrix.Translation(-w / 2 + k * 0.16, h / 2, 0).multiply(f), C.iron, 5)
      break
    case "cot":
      legs(g, f, w, d, 0.3, C.iron, 0.05)
      B(g, f, 0, 0.3, 0, w, 0.04, d, C.iron)
      B(g, f, 0, 0.34, 0, w - 0.06, 0.12, d - 0.06, C.mattress)
      B(g, f, 0, 0.46, d / 2 - 0.25, w * 0.7, 0.07, 0.3, C.white)
      break
    case "flag":
      g.cylinder(0.05, h, Matrix.Translation(0, h / 2, 0).multiply(f), C.gold, 6)
      g.cylinder(0.3, 0.06, Matrix.Translation(0, 0.03, 0).multiply(f), C.dark, 8)
      B(g, f, 0.4, h - 0.65, 0, 0.75, 0.5, 0.02, C.green)
      B(g, f, 0.4, h - 0.5, -0.012, 0.42, 0.2, 0.01, C.yellow)
      break
    default:
      B(g, f, 0, 0, 0, w, h, d, C.wood)
  }
}

export interface BuiltInterior {
  floors: Mesh[]
  /** Mostra só os andares até o do personagem (corte da casa de bonecas). */
  showUpTo: (floor: number) => void
  dispose: () => void
}

function stairSteps(g: GeoBuilder, def: InteriorDef, si: number) {
  const st = def.stairs[si]
  const y0 = def.floors[st.from].y
  const rise = def.floors[st.to].y - y0
  const alongZ = st.dir === "+z" || st.dir === "-z"
  const len = alongZ ? st.z1 - st.z0 : st.x1 - st.x0
  const width = alongZ ? st.x1 - st.x0 : st.z1 - st.z0
  const n = Math.max(8, Math.round(rise / 0.19))
  const run = len / n
  for (let k = 0; k < n; k++) {
    const top = y0 + (rise * (k + 1)) / n
    // Posição ao longo da subida (do pé para o alto).
    const a = run * (k + 0.5)
    let cx: number
    let cz: number
    if (st.dir === "+z") [cx, cz] = [(st.x0 + st.x1) / 2, st.z0 + a]
    else if (st.dir === "-z") [cx, cz] = [(st.x0 + st.x1) / 2, st.z1 - a]
    else if (st.dir === "+x") [cx, cz] = [st.x0 + a, (st.z0 + st.z1) / 2]
    else [cx, cz] = [st.x1 - a, (st.z0 + st.z1) / 2]
    const h = top - y0
    const [w, d] = alongZ ? [width, run] : [run, width]
    g.box(w, h, d, Matrix.Translation(cx, y0 + h / 2, cz), k % 2 ? C.step : C.wood)
  }
}

export function buildInterior(scene: Scene, def: InteriorDef): BuiltInterior {
  const th = (def.theme && THEMES[def.theme]) || NO_THEME
  const mat = new StandardMaterial("mm-interior", scene)
  mat.diffuseColor = new Color3(1, 1, 1)
  mat.specularColor = new Color3(0, 0, 0)
  mat.backFaceCulling = false
  const meshes: Mesh[] = []
  let n = 0
  def.floors.forEach((fl, fi) => {
    const g = new GeoBuilder()
    const y = fl.y
    // Piso: no térreo uma placa por cômodo; acima, a laje (sem o vão da escada).
    if (fi === 0) {
      for (const r of fl.rooms) g.box(r.x1 - r.x0, 0.06, r.z1 - r.z0, Matrix.Translation((r.x0 + r.x1) / 2, y - 0.03, (r.z0 + r.z1) / 2), r.outdoor ? C.outdoor : MAT[r.mat])
    } else {
      for (const s of fl.slabs ?? []) g.box(s.x1 - s.x0, 0.14, s.z1 - s.z0, Matrix.Translation((s.x0 + s.x1) / 2, y - 0.07, (s.z0 + s.z1) / 2), MAT[s.mat] ?? C.wood)
      for (const r of fl.rooms) if (r.outdoor) g.box(r.x1 - r.x0, 0.15, r.z1 - r.z0, Matrix.Translation((r.x0 + r.x1) / 2, y - 0.07, (r.z0 + r.z1) / 2), C.outdoor)
    }
    const bathIds = new Set(fl.rooms.filter((r) => r.mat === "tile").map((r) => r.id))
    for (const w of fl.walls) {
      const rail = w.kind === "rail"
      const inBath = fl.rooms.some(
        (r) => bathIds.has(r.id) && w.x >= r.x0 - 0.2 && w.x <= r.x1 + 0.2 && w.z >= r.z0 - 0.2 && w.z <= r.z1 + 0.2 && w.kind !== "int",
      )
      const color = rail ? C.rail : inBath && !def.theme ? C.wallBath : th.wall
      if (rail) {
        g.box(w.hx * 2, 0.08, w.hz * 2, Matrix.Translation(w.x, y + w.h - 0.04, w.z), C.rail)
        g.box(w.hx * 2 * 0.98, 0.1, w.hz * 2 * 0.98, Matrix.Translation(w.x, y + 0.05, w.z), C.rail)
        const len = Math.max(w.hx, w.hz) * 2
        const k = Math.max(2, Math.floor(len / 0.45))
        for (let i = 0; i <= k; i++) {
          const t = -len / 2 + (len * i) / k
          const [px, pz] = w.hx > w.hz ? [w.x + t, w.z] : [w.x, w.z + t]
          g.box(0.06, w.h, 0.06, Matrix.Translation(px, y + w.h / 2, pz), C.rail)
        }
        continue
      }
      g.box(w.hx * 2, w.h, w.hz * 2, Matrix.Translation(w.x, y + w.h / 2, w.z), color)
      // Rodapé.
      g.box(w.hx * 2 + 0.02, 0.1, w.hz * 2 + 0.02, Matrix.Translation(w.x, y + 0.05, w.z), C.base)
    }
    for (const win of fl.windows) {
      const out = win.inward * 0.09
      const [fw, fd] = win.axis === "x" ? [1.15, 0.03] : [0.03, 1.15]
      const [gw, gd] = win.axis === "x" ? [0.95, 0.04] : [0.04, 0.95]
      const px = win.axis === "z" ? win.x + out : win.x
      const pz = win.axis === "x" ? win.z + out : win.z
      g.box(fw, 1.05, fd, Matrix.Translation(px, y + 1.5, pz), C.frame)
      g.box(gw, 0.85, gd, Matrix.Translation(px + (win.axis === "z" ? win.inward * 0.01 : 0), y + 1.5, pz + (win.axis === "x" ? win.inward * 0.01 : 0)), C.glass)
    }
    if (fi === 0) {
      // Porta da rua (fechada: sair é pela ação "Sair").
      const d = def.door
      g.box(d.w - 0.08, 2.05, 0.06, Matrix.Translation(d.x, y + 1.03, d.z + 0.04), C.door)
      g.box(0.08, 0.08, 0.05, Matrix.Translation(d.x + d.w / 2 - 0.22, y + 1.0, d.z + 0.1), C.knob)
    }
    def.stairs.forEach((st, si) => {
      if (st.from === fi) stairSteps(g, def, si)
    })
    for (const it of fl.furniture) furniture(g, it, y, def.seatTop, n++, def.furnitureTypes, th)
    const mesh = g.build(`mm-interior-f${fi}`, scene, mat)
    meshes.push(mesh)
  })
  mat.freeze()
  let shown = -1
  return {
    floors: meshes,
    showUpTo(floor) {
      if (floor === shown) return
      shown = floor
      meshes.forEach((m, i) => m.setEnabled(i <= floor))
    },
    dispose() {
      for (const m of meshes) m.dispose()
      mat.dispose()
    },
  }
}
