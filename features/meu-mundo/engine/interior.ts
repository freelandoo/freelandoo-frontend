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
//
// mm3d-55 — STEAMPUNK: a mesma planta, outro acabamento. Cada face ganha a
// borda escura da textura de acabamento do bairro (chanfro sem geometria);
// piso em tábuas ou ladrilho hidráulico; paredes com lambri de madeira, friso
// de latão e cornija; nas paredes de fora, cano de cobre no alto com
// manômetros e arandelas âmbar; janelas de caixilho de ferro com vidro âmbar;
// móveis em madeira escura, couro, ferro e latão. Lâmpadas, velas, fogo e
// telas acesas numa segunda malha sem luz (brilho). Nada disso colide: a
// colisão é a do payload, como sempre.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import type { RGB } from "./geometry"
import type { QualityTier } from "./quality"
import { SteamGeo } from "./steampunk/geo"
import { createTrimMaterials } from "./steampunk/materials"
import { SP, mix, shade } from "./steampunk/palette"
import type { FloorMat, InteriorDef, InteriorFurniture } from "../types"

/** Paleta steampunk dos interiores (mm3d-55) — os mesmos nomes de sempre, cores do SP. */
const C = {
  wood: mix(SP.woodLight, SP.masonry, 0.22),
  woodDark: SP.woodDark,
  tile: SP.board,
  carpet: [0.46, 0.16, 0.16],
  stone: SP.stoneLight,
  outdoor: SP.stone,
  wall: [0.42, 0.5, 0.42],
  wallBath: [0.36, 0.48, 0.5],
  base: SP.woodDark,
  frame: SP.iron,
  glass: [0.62, 0.48, 0.24],
  rail: SP.brass,
  fabricA: [0.24, 0.32, 0.27],
  fabricB: [0.45, 0.16, 0.14],
  fabricC: [0.42, 0.28, 0.16],
  cushion: [0.78, 0.66, 0.48],
  white: [0.9, 0.86, 0.76],
  steel: SP.brass,
  dark: SP.ironWarm,
  black: SP.iron,
  leaf: SP.leafOlive,
  pot: SP.copper,
  lampShade: SP.lampGlass,
  rugA: [0.5, 0.2, 0.17],
  rugB: [0.22, 0.3, 0.36],
  door: SP.wood,
  knob: SP.brass,
  step: SP.woodLight,
  // Hospital (mm3d-26).
  teal: [0.18, 0.4, 0.38],
  mint: [0.72, 0.76, 0.64],
  sheet: [0.86, 0.84, 0.76],
  ivBag: [0.86, 0.9, 0.84],
  pulse: [0.4, 1, 0.5],
  // Centro por dentro (mm3d-37).
  rubber: [0.24, 0.2, 0.17],
  red: [0.62, 0.15, 0.12],
  yellow: SP.brass,
  green: [0.22, 0.38, 0.24],
  navy: [0.14, 0.2, 0.32],
  gold: SP.brass,
  board: [0.14, 0.2, 0.16],
  chalk: [0.9, 0.88, 0.8],
  brick: SP.brick,
  fire: [1, 0.55, 0.15],
  bag: [0.42, 0.22, 0.12],
  iron: SP.iron,
  candle: [0.96, 0.92, 0.8],
  flame: [1, 0.78, 0.3],
  mattress: [0.6, 0.55, 0.46],
  // mm3d-55: os materiais novos do steampunk.
  brass: SP.brass,
  brassDark: SP.brassDark,
  copper: SP.copper,
  leather: [0.36, 0.2, 0.12],
  porcelain: [0.92, 0.9, 0.84],
} satisfies Record<string, RGB>

/**
 * Tema de cores de um prédio do centro (mm3d-37): parede, a cor da casa
 * (estofados, balcões, placas) e uma segunda. Casas e hospital: sem tema.
 */
interface Theme {
  wall: RGB
  accent: RGB
  second: RGB
}
// mm3d-55: papel de parede vitoriano (a parte de cima; embaixo é lambri), a cor da casa e o metal.
const THEMES: Record<string, Theme> = {
  pizzaria: { wall: [0.62, 0.3, 0.22], accent: C.red, second: [0.3, 0.42, 0.26] },
  hamburgueria: { wall: [0.7, 0.52, 0.3], accent: C.red, second: C.brass },
  supermercado: { wall: [0.6, 0.62, 0.48], accent: [0.28, 0.42, 0.3], second: C.brass },
  universidade: { wall: [0.26, 0.36, 0.38], accent: C.navy, second: C.brass },
  biblioteca: { wall: [0.38, 0.22, 0.18], accent: [0.42, 0.18, 0.16], second: C.brass },
  escola: { wall: [0.68, 0.6, 0.4], accent: [0.22, 0.38, 0.48], second: C.brass },
  academia: { wall: SP.brickDark, accent: C.brass, second: C.red },
  igreja: { wall: [0.74, 0.68, 0.56], accent: [0.36, 0.2, 0.4], second: C.brass },
  delegacia: { wall: [0.3, 0.36, 0.42], accent: C.navy, second: C.brass },
  // Salão do Hall da Fama (mm3d-48): mármore, vermelho dos Jogos Eternos e ouro.
  hall: { wall: [0.84, 0.8, 0.72], accent: [0.56, 0.1, 0.14], second: C.brass },
}
const NO_THEME: Theme = { wall: C.wall, accent: C.fabricB, second: C.fabricA }
/** Casas: o papel de parede muda de casa em casa (a mesma planta não fica igual em todo lote). */
const HOME_WALLS: RGB[] = [[0.42, 0.5, 0.42], [0.52, 0.3, 0.28], [0.34, 0.42, 0.5], [0.66, 0.56, 0.38], [0.48, 0.38, 0.5]]
/** Cores das lombadas e dos produtos de cena (só desenho). */
const STOCK: RGB[] = [C.red, [0.78, 0.6, 0.3], C.green, [0.24, 0.36, 0.5], [0.72, 0.42, 0.2], [0.86, 0.82, 0.7], [0.42, 0.24, 0.34]]
/** Cilindro deitado ao longo do X local do móvel. */
const ALONG_X = Matrix.RotationZ(Math.PI / 2)
const FABRICS: RGB[] = [C.fabricA, C.fabricB, C.fabricC]
/** Salão do Hall da Fama (mm3d-48): a pedra das estátuas e a cor de cada um dos Sete. */
const HERO_STONE: RGB = SP.stoneLight
const HERO_TINT: Record<string, RGB> = {
  aurion: [0.95, 0.75, 0.25],
  kragor: [0.95, 0.45, 0.12],
  zephyra: [0.15, 0.75, 0.95],
  maru: [0.98, 0.5, 0.4],
  iris: [0.85, 0.2, 0.6],
  noctis: [0.35, 0.42, 0.75],
  aeryn: [0.72, 0.47, 0.22],
}

/** Quadro de um móvel: giro em Y (graus) e posição, com a altura do andar. */
function frame(x: number, y: number, z: number, deg: number): Matrix {
  return Matrix.RotationY((deg * Math.PI) / 180).multiply(Matrix.Translation(x, y, z))
}

/** Caixa em coordenadas locais do móvel: centro (lx, lz), do chão ly0 até ly0+h. */
function B(g: SteamGeo, f: Matrix, lx: number, ly0: number, lz: number, w: number, h: number, d: number, c: RGB) {
  g.box(w, h, d, Matrix.Translation(lx, ly0 + h / 2, lz).multiply(f), c)
}

function legs(g: SteamGeo, f: Matrix, w: number, d: number, h: number, c: RGB, t = 0.06) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - t), 0, sz * (d / 2 - t), t, h, t, c)
}

function furniture(g: SteamGeo, gl: SteamGeo, it: InteriorFurniture, y: number, seatTop: number, n: number, sizes: Record<string, { w: number; d: number; h: number }>, th: Theme) {
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
      // Capitonê (botões no encosto) e pés de latão.
      for (let k = 0; k < Math.max(2, Math.round(w / 0.35)); k++) B(g, f, -w / 2 + 0.25 + k * 0.35, seatTop + 0.18, d / 2 - 0.21, 0.04, 0.04, 0.01, C.brassDark)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06), 0.07, 0.06, 0.07, C.brass)
      break
    }
    case "chair":
      legs(g, f, w * 0.9, d * 0.9, seatTop - 0.05, C.woodDark, 0.05)
      B(g, f, 0, seatTop - 0.05, 0, w, 0.05, d, C.leather)
      B(g, f, 0, seatTop, d / 2 - 0.03, w, h - seatTop, 0.06, C.woodDark)
      B(g, f, 0, h - 0.06, d / 2 - 0.03, w + 0.02, 0.05, 0.07, C.brassDark)
      break
    case "table2":
    case "table4":
    case "table6":
    case "desk":
      legs(g, f, w, d, h - 0.05, C.woodDark)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.wood)
      // Friso de latão e cantoneiras no tampo.
      B(g, f, 0, h - 0.075, 0, w + 0.015, 0.025, d + 0.015, C.brassDark)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.04), h - 0.004, sz * (d / 2 - 0.04), 0.08, 0.008, 0.08, C.brass)
      if (it.t === "desk") B(g, f, w / 2 - 0.25, h - 0.3, 0, 0.42, 0.25, d - 0.06, C.woodDark)
      break
    case "coffee":
      legs(g, f, w, d, h - 0.05, C.woodDark, 0.05)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.woodDark)
      break
    case "tv":
      B(g, f, 0, 0, 0, w, h, d, C.woodDark)
      // Televisor de válvula: caixa de madeira, moldura de latão, tela sépia acesa e as antenas.
      B(g, f, 0, h, d / 2 - 0.12, w * 0.9, 0.66, 0.24, C.woodDark)
      B(g, f, -0.1, h + 0.06, d / 2 - 0.25, w * 0.6, 0.52, 0.03, C.brass)
      gl.box(w * 0.54, 0.44, 0.02, Matrix.Translation(-0.1, h + 0.32, d / 2 - 0.27).multiply(f), [0.62, 0.5, 0.32])
      for (const k of [0, 1]) B(g, f, w * 0.33, h + 0.16 + k * 0.2, d / 2 - 0.25, 0.08, 0.08, 0.03, C.brass)
      for (const sx of [-1, 1]) g.tube([0, h + 0.66, d / 2 - 0.12], [sx * 0.22, h + 1.0, d / 2 - 0.12], 0.008, C.brass, 4, f)
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
      B(g, f, 0, h, 0, 0.12, 0.04, 0.12, C.brass)
      g.cylinder(0.025, 0.14, Matrix.Translation(0, h + 0.1, 0).multiply(f), C.brass, 6)
      gl.with("flat", () => gl.sphere(0.13, [1, 1.3, 1], Matrix.Translation(0, h + 0.24, 0).multiply(f), C.lampShade, 6))
      break
    case "wardrobe":
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, 0.05, -d / 2 - 0.005, 0.02, h - 0.1, 0.01, C.woodDark)
      for (const sx of [-0.08, 0.08]) B(g, f, sx, h / 2, -d / 2 - 0.02, 0.04, 0.12, 0.03, C.knob)
      for (const sx of [-1, 1]) for (const ly of [0.25, h - 0.35]) B(g, f, sx * (w / 2 - 0.03), ly, -d / 2 - 0.01, 0.05, 0.12, 0.02, C.brassDark)
      B(g, f, 0, h, 0, w + 0.06, 0.08, d + 0.04, C.woodDark)
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
      // Balcão de madeira com portas almofadadas, tampo de mármore e friso de latão.
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.woodDark)
      {
        const doors = Math.max(1, Math.round(w / 0.6))
        for (let k = 0; k < doors; k++) B(g, f, -w / 2 + (w / doors) * (k + 0.5), 0.12, -d / 2 - 0.005, w / doors - 0.08, h - 0.32, 0.01, C.wood)
      }
      B(g, f, 0, h - 0.07, 0, w + 0.03, 0.03, d + 0.03, C.brassDark)
      B(g, f, 0, h - 0.05, 0, w + 0.02, 0.05, d + 0.02, C.porcelain)
      break
    case "stove":
      // Fogão a lenha: ferro, varão de latão, a portinhola com fogo e o cano subindo.
      B(g, f, 0, 0, 0, w, h - 0.03, d, C.iron)
      B(g, f, 0, h - 0.03, 0, w, 0.03, d, C.dark)
      B(g, f, 0, h - 0.18, -d / 2 - 0.05, w + 0.06, 0.03, 0.03, C.brass)
      B(g, f, 0, 0.3, -d / 2 - 0.004, w * 0.55, 0.32, 0.005, C.brassDark)
      gl.box(w * 0.4, 0.16, 0.01, Matrix.Translation(0, 0.46, -d / 2 - 0.01).multiply(f), C.fire)
      g.cylinder(0.14, 1.1, Matrix.Translation(w * 0.25, h + 0.55, d / 4).multiply(f), C.iron, 8)
      g.cylinder(0.18, 0.05, Matrix.Translation(w * 0.25, h + 0.6, d / 4).multiply(f), C.brass, 8)
      break
    case "fridge":
      // Geladeira de madeira (caixa de gelo) com dobradiças e puxadores de latão.
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, h * 0.62, -d / 2 - 0.005, w - 0.04, 0.03, 0.01, C.woodDark)
      for (const ly of [h * 0.3, h * 0.82]) B(g, f, w / 2 - 0.08, ly, -d / 2 - 0.025, 0.05, 0.18, 0.04, C.brass)
      for (const ly of [0.2, h * 0.55, h * 0.7, h - 0.15]) B(g, f, -w / 2 + 0.04, ly, -d / 2 - 0.01, 0.06, 0.1, 0.02, C.brassDark)
      B(g, f, 0, h, 0, w + 0.04, 0.05, d + 0.04, C.woodDark)
      break
    case "toilet":
      B(g, f, 0, 0, -0.08, w * 0.85, 0.42, d * 0.7, C.porcelain)
      B(g, f, 0, 0.42, -0.08, w * 0.88, 0.04, d * 0.72, C.wood)
      // Caixa de descarga alta, de madeira, com o cano de latão.
      B(g, f, 0, 0, d / 2 - 0.1, w * 0.5, 0.45, 0.2, C.porcelain)
      B(g, f, 0, 1.55, d / 2 - 0.1, w, 0.3, 0.2, C.wood)
      g.tube([0.12, 0.45, d / 2 - 0.1], [0.12, 1.55, d / 2 - 0.1], 0.02, C.brass, 6, f)
      break
    case "basin":
      B(g, f, 0, 0, 0.05, 0.18, h - 0.15, 0.18, C.porcelain)
      B(g, f, 0, h - 0.15, 0, w, 0.15, d, C.porcelain)
      B(g, f, 0, h, d / 2 - 0.06, 0.05, 0.18, 0.05, C.brass)
      B(g, f, 0, h + 0.22, d / 2 - 0.02, w * 0.86, 0.58, 0.03, C.brass)
      B(g, f, 0, h + 0.25, d / 2 - 0.04, w * 0.76, 0.5, 0.02, [0.7, 0.72, 0.68])
      break
    case "shower":
      B(g, f, 0, 0, 0, w, 0.08, d, C.white)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.02), 0.08, sz * (d / 2 - 0.02), 0.04, h - 0.08, 0.04, C.steel)
      B(g, f, 0, 0.08, -d / 2 + 0.01, w - 0.04, h * 0.85, 0.02, [0.62, 0.68, 0.64])
      B(g, f, 0, h - 0.1, d / 2 - 0.15, 0.2, 0.04, 0.2, C.steel)
      break
    case "bathtub":
      // Banheira de pés (garras de latão).
      B(g, f, 0, 0.12, 0, w, h - 0.12, d, C.porcelain)
      B(g, f, 0, h - 0.03, 0, w + 0.04, 0.04, d + 0.04, C.brassDark)
      B(g, f, 0, h - 0.04, 0, w - 0.16, 0.05, d - 0.16, [0.5, 0.6, 0.6])
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.1), 0.1, 0.14, 0.1, C.brass)
      break
    case "washer":
      // Lavadeira de cobre com a escotilha de latão e a manivela.
      B(g, f, 0, 0, 0, w, h, d, C.copper)
      B(g, f, 0, h * 0.45 - 0.18, -d / 2 - 0.01, 0.36, 0.36, 0.02, C.brass)
      B(g, f, 0, h * 0.45 - 0.13, -d / 2 - 0.02, 0.26, 0.26, 0.02, C.dark)
      B(g, f, w / 2 + 0.03, h * 0.7, 0, 0.04, 0.04, 0.24, C.iron)
      break
    case "plant":
      g.cylinder(0.36, 0.38, Matrix.Translation(0, 0.19, 0).multiply(f), C.pot, 8)
      g.sphere(0.62, [1, 1.15, 1], Matrix.Translation(0, 0.72, 0).multiply(f), C.leaf)
      g.sphere(0.4, [1, 1, 1], Matrix.Translation(0.12, 0.98, -0.05).multiply(f), C.leaf)
      break
    case "lamp":
      // Luminária de pé de latão com a cúpula âmbar acesa.
      g.cylinder(0.3, 0.05, Matrix.Translation(0, 0.025, 0).multiply(f), C.brassDark, 8)
      g.cylinder(0.05, h - 0.3, Matrix.Translation(0, (h - 0.3) / 2, 0).multiply(f), C.steel, 6)
      gl.with("flat", () => gl.cylinder(0.34, 0.3, Matrix.Translation(0, h - 0.15, 0).multiply(f), C.lampShade, 8))
      g.ring(0.36, 0.025, Matrix.Translation(0, h - 0.3, 0).multiply(f), C.brass, 10, 3)
      break
    case "piano":
      B(g, f, 0, 0, 0.05, w, h, d - 0.1, [0.13, 0.09, 0.07])
      B(g, f, 0, 0.7, -d / 2 + 0.08, w - 0.1, 0.05, 0.18, C.porcelain)
      B(g, f, 0, 0.75, -d / 2 + 0.08, w - 0.1, 0.02, 0.06, [0.13, 0.09, 0.07])
      for (const sx of [-0.3, 0.3]) gl.box(0.06, 0.1, 0.06, Matrix.Translation(sx, h + 0.06, 0.1).multiply(f), C.flame)
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
      // Cabeceira e pezeira de ferro com varões de latão.
      for (const [lz, hh] of [[d / 2 - 0.03, 0.72], [-d / 2 + 0.03, 0.42]] as const) {
        B(g, f, 0, 0.26 + hh - 0.05, lz, w, 0.05, 0.05, C.brass)
        for (let k = 0; k < 6; k++) B(g, f, -w / 2 + 0.05 + k * ((w - 0.1) / 5), 0.26, lz, 0.03, hh, 0.03, k % 5 ? C.iron : C.brass)
      }
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
      gl.box(w - 0.16, 0.025, 0.01, Matrix.Translation(0, h - 0.2175, -0.082).multiply(f), C.pulse)
      gl.box(0.03, 0.12, 0.01, Matrix.Translation(0.04, h - 0.21, -0.083).multiply(f), C.pulse)
      B(g, f, 0, h - 0.44, 0, w + 0.04, 0.03, 0.16, C.brass)
      break
    case "screen":
      // Biombo: armação de aço e cortina verde-clara.
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.02), 0, 0, 0.04, h, 0.04, C.steel)
      B(g, f, 0, h - 0.04, 0, w, 0.04, 0.04, C.steel)
      B(g, f, 0, 0.25, 0, w - 0.08, h - 0.32, 0.02, C.mint)
      break
    case "reception":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.woodDark)
      // Hospital: verde-azulado; prédio do centro: a cor da casa (mm3d-37).
      B(g, f, 0, 0.1, -d / 2 - 0.005, w - 0.1, h - 0.3, 0.01, th === NO_THEME ? C.teal : th.accent)
      B(g, f, 0, h - 0.08, 0, w + 0.08, 0.03, d + 0.08, C.brass)
      B(g, f, 0, h - 0.05, 0, w + 0.06, 0.05, d + 0.06, C.wood)
      break
    case "cabinet":
      B(g, f, 0, 0, 0, w, h, d, C.woodDark)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 4), h * 0.45, -d / 2 - 0.005, w / 2 - 0.06, h * 0.5, 0.01, C.glass)
      B(g, f, 0, h - 0.02, 0, w + 0.02, 0.03, d + 0.02, C.brass)
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
      for (const ly of [h - 0.4, h - 1.44]) g.cylinder(w * 0.78, 0.05, Matrix.Translation(0, ly, 0).multiply(f), C.brassDark, 10)
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
      B(g, f, 0, 0.3, 0, w, h - 0.3, d, C.brass)
      B(g, f, 0, 0.34, -0.005, w - 0.08, h - 0.38, d, [0.66, 0.68, 0.66])
      break
    case "lockers":
      B(g, f, 0, 0, 0, w, h, d, C.iron)
      for (let k = 0; k < 3; k++) {
        const lx = -w / 2 + w / 6 + (k * w) / 3
        B(g, f, lx, 0.08, -d / 2 - 0.005, w / 3 - 0.06, h - 0.16, 0.01, SP.steel)
        B(g, f, lx, h * 0.55, -d / 2 - 0.015, 0.05, 0.12, 0.02, C.brass)
        for (const ly of [0.3, h - 0.3]) B(g, f, lx, ly, -d / 2 - 0.012, w / 3 - 0.12, 0.02, 0.01, C.brassDark)
      }
      break
    // ── escola, universidade e biblioteca ──
    case "blackboard":
      B(g, f, 0, 0.75, 0, w, h - 0.75, d, C.brassDark)
      B(g, f, 0, 0.82, -0.01, w - 0.12, h - 0.89, d, C.board)
      // Relógio de latão em cima do quadro.
      g.cylinder(0.4, 0.06, Matrix.RotationX(-Math.PI / 2).multiply(Matrix.Translation(0, h + 0.28, -0.02)).multiply(f), C.brass, 14)
      gl.cylinder(0.32, 0.02, Matrix.RotationX(-Math.PI / 2).multiply(Matrix.Translation(0, h + 0.28, -0.06)).multiply(f), C.candle, 14)
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
        gl.sphere(0.05, [1, 1.6, 1], Matrix.Translation(sx, h + 0.01, 0).multiply(f), C.flame)
      }
      break
    // ── Salão do Hall da Fama (mm3d-48) ──
    case "hero_statue": {
      // Pedestal de mármore com faixa da cor do herói e a figura de pedra (provisória:
      // troca pelo modelo do herói quando a arte chegar).
      const tint = HERO_TINT[it.hero ?? ""] ?? th.second
      const big = it.hero === "aurion" ? 1.25 : 1
      B(g, f, 0, 0, 0, w, 0.9, d, C.porcelain)
      B(g, f, 0, 0.9, 0, w + 0.08, 0.08, d + 0.08, th.second)
      B(g, f, 0, 0.45, -d / 2 - 0.005, w * 0.7, 0.18, 0.01, tint)
      const st = HERO_STONE
      const s0 = 0.98
      for (const sx of [-0.13, 0.13]) B(g, f, sx * big, s0, 0, 0.2 * big, 0.85 * big, 0.24 * big, st)
      B(g, f, 0, s0 + 0.85 * big, 0, 0.56 * big, 0.75 * big, 0.32 * big, st)
      B(g, f, 0, s0 + 1.12 * big, -0.17 * big, 0.36 * big, 0.3 * big, 0.02, tint)
      g.sphere(0.32 * big, [1, 1.1, 1], Matrix.Translation(0, s0 + 1.78 * big, 0).multiply(f), st)
      for (const sx of [-1, 1]) B(g, f, sx * 0.36 * big, s0 + 0.9 * big, 0, 0.16 * big, 0.7 * big, 0.18 * big, st)
      // a arma do herói, de pé ao lado (lâmina)
      B(g, f, 0.48 * big, s0, -0.05, 0.07, 1.5 * big, 0.03, [0.82, 0.84, 0.88])
      B(g, f, 0.48 * big, s0 + 0.3 * big, -0.05, 0.28, 0.05, 0.06, th.second)
      break
    }
    case "honor_wall": {
      // O Muro dos Herdeiros: mármore com 2 fileiras de nichos e placas douradas.
      B(g, f, 0, 0, 0, w, h, d, [0.92, 0.89, 0.83])
      B(g, f, 0, h - 0.12, 0, w + 0.1, 0.12, d + 0.06, th.second)
      const cols = Math.max(4, Math.floor(w / 1.1))
      for (const row of [0, 1]) {
        for (let k = 0; k < cols; k++) {
          const lx = -w / 2 + (w / cols) * (k + 0.5)
          const ly = 0.45 + row * 1.45
          B(g, f, lx, ly, -d / 2 - 0.005, (w / cols) * 0.7, 1.05, 0.02, [0.55, 0.48, 0.4])
          B(g, f, lx, ly - 0.18, -d / 2 - 0.01, (w / cols) * 0.55, 0.12, 0.02, th.second)
        }
      }
      break
    }
    case "empty_base":
      // A base do Oitavo: pedestal vazio com a faixa vermelha e a inscrição dourada.
      B(g, f, 0, 0, 0, w, h, d, C.porcelain)
      B(g, f, 0, h, 0, w + 0.1, 0.07, d + 0.1, th.second)
      for (const [lx, lz, rw, rd] of [[0, -d / 2 - 0.005, w * 0.8, 0.01], [0, d / 2 + 0.005, w * 0.8, 0.01]] as const) B(g, f, lx, h * 0.4, lz, rw, 0.22, rd, th.accent)
      B(g, f, 0, h * 0.4 + 0.07, -d / 2 - 0.012, w * 0.55, 0.06, 0.01, th.second)
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
      gl.box(0.4, 0.16, 0.02, Matrix.Translation(0, 1.03, -d / 2 + 0.06).multiply(f), C.fire)
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
      // Máquina de refrigerante a vapor: cobre, manômetro e o domo de latão.
      B(g, f, 0, 0, 0, w, h, d, C.copper)
      g.sphere(w * 0.9, [1, 0.45, d / w], Matrix.Translation(0, h, 0).multiply(f), C.brass)
      g.cylinder(0.26, 0.05, Matrix.RotationX(-Math.PI / 2).multiply(Matrix.Translation(0, h - 0.3, -d / 2 - 0.02)).multiply(f), C.brass, 12)
      g.cylinder(0.2, 0.05, Matrix.RotationX(-Math.PI / 2).multiply(Matrix.Translation(0, h - 0.3, -d / 2 - 0.03)).multiply(f), C.porcelain, 12)
      B(g, f, 0, 0.9, -d / 2 - 0.005, w - 0.12, 0.7, 0.01, C.dark)
      for (const sx of [-0.22, 0, 0.22]) B(g, f, sx, 1.0, -d / 2 - 0.03, 0.12, 0.08, 0.05, C.steel)
      B(g, f, 0, 0.75, -d / 2 - 0.04, w - 0.2, 0.04, 0.12, C.steel)
      break
    case "fryer":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.steel)
      B(g, f, 0, h - 0.05, 0, w - 0.08, 0.05, d - 0.08, [0.72, 0.5, 0.16])
      break
    case "stool":
      g.cylinder(0.06, seatTop - 0.06, Matrix.Translation(0, (seatTop - 0.06) / 2, 0).multiply(f), C.iron, 6)
      g.ring(w * 0.7, 0.03, Matrix.Translation(0, seatTop * 0.35, 0).multiply(f), C.brass, 10, 3)
      g.cylinder(w, 0.06, Matrix.Translation(0, seatTop - 0.03, 0).multiply(f), C.leather, 10)
      break
    // ── supermercado (prateleiras de cena: pedido do Alex, nada para pegar) ──
    case "gondola":
      B(g, f, 0, 0, 0, w, 0.12, d, C.dark)
      B(g, f, 0, 0, 0, w, h, 0.06, C.woodDark)
      for (let k = 0; k < 4; k++) {
        const ly = 0.12 + k * 0.4
        for (const sz of [-1, 1]) {
          B(g, f, 0, ly, sz * (d / 4 + 0.02), w - 0.04, 0.03, d / 2 - 0.06, C.wood)
          for (let j = 0; j < 8; j++)
            B(g, f, -w / 2 + 0.22 + j * ((w - 0.44) / 7), ly + 0.03, sz * (d / 4 + 0.02), 0.26, 0.2 + ((j + k) % 3) * 0.05, d / 2 - 0.14, STOCK[(n + j + k * 2) % STOCK.length])
        }
      }
      B(g, f, 0, h, 0, w, 0.06, d, th.accent)
      break
    case "fridge_case":
      B(g, f, 0, 0, 0, w, h, d, C.woodDark)
      for (let k = 0; k < 4; k++)
        for (let j = 0; j < 6; j++) B(g, f, -w / 2 + 0.3 + j * ((w - 0.6) / 5), 0.2 + k * 0.42, -0.05, 0.18, 0.26, d * 0.55, STOCK[(n + j * 2 + k) % STOCK.length])
      B(g, f, 0, 0.12, -d / 2 - 0.005, w - 0.1, h - 0.36, 0.01, [0.42, 0.5, 0.5])
      for (let k = 1; k < 4; k++) B(g, f, -w / 2 + (k * w) / 4, 0.12, -d / 2 - 0.012, 0.04, h - 0.36, 0.01, C.brass)
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
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.woodDark)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.wood)
      B(g, f, -w / 4, h, 0, w / 2 - 0.1, 0.02, d - 0.2, C.leather)
      // Caixa registradora de latão com as teclas.
      B(g, f, w / 2 - 0.3, h, 0.1, 0.36, 0.2, 0.3, C.brass)
      B(g, f, w / 2 - 0.3, h + 0.2, 0.2, 0.3, 0.16, 0.06, C.brassDark)
      g.cylinder(0.04, 1.1, Matrix.Translation(w / 2 - 0.1, h + 0.55, d / 2 - 0.1).multiply(f), C.steel, 6)
      B(g, f, w / 2 - 0.1, h + 1.1, d / 2 - 0.1, 0.34, 0.22, 0.06, th.accent)
      break
    case "poster":
      B(g, f, 0, 0.9, 0, w, h, d, [0.86, 0.8, 0.66])
      B(g, f, 0, 0.98, -0.01, w - 0.16, h * 0.55, d, n % 2 ? th.second : th.accent)
      for (let k = 0; k < 3; k++) B(g, f, 0, 0.98 + h * 0.6 + k * 0.1, -0.01, w * (0.7 - k * 0.15), 0.04, d, C.dark)
      break
    // ── delegacia ──
    case "bars":
      B(g, f, 0, 0, 0, w, 0.08, d, C.iron)
      B(g, f, 0, h - 0.08, 0, w, 0.08, d, C.iron)
      B(g, f, 0, 1.1, 0, w, 0.05, d, C.iron)
      for (let k = 0; k <= Math.floor(w / 0.16); k++) g.cylinder(0.05, h, Matrix.Translation(-w / 2 + k * 0.16, h / 2, 0).multiply(f), C.iron, 5)
      // Rebites de latão nas travessas.
      for (const ly of [0.04, 1.125, h - 0.04]) for (let k = 0; k <= Math.floor(w / 0.32); k++) B(g, f, -w / 2 + k * 0.32, ly - 0.02, -d / 2 - 0.01, 0.04, 0.04, 0.02, C.brassDark)
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
      // A bandeira fica nas cores dela.
      B(g, f, 0.4, h - 0.65, 0, 0.75, 0.5, 0.02, [0.22, 0.56, 0.32])
      B(g, f, 0.4, h - 0.5, -0.012, 0.42, 0.2, 0.01, [0.98, 0.76, 0.16])
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

function stairSteps(g: SteamGeo, def: InteriorDef, si: number) {
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
    g.box(w, h, d, Matrix.Translation(cx, y0 + h / 2, cz), C.woodDark)
    // Focinho do degrau em latão.
    const [nw, nd] = alongZ ? [width, 0.04] : [0.04, width]
    const back = (st.dir === "+z" || st.dir === "+x" ? -1 : 1) * (run / 2 - 0.02)
    g.box(nw, 0.03, nd, Matrix.Translation(cx + (alongZ ? 0 : back), top - 0.015, cz + (alongZ ? back : 0)), C.brassDark)
  }
}

/**
 * Piso de um cômodo em peças: cada peça é uma caixa com UV própria, então a
 * borda escura da textura de acabamento vira o REJUNTE — tábuas corridas na
 * madeira, ladrilho hidráulico (xadrez creme e ferro) no "tile", lajes na
 * pedra, placas na borracha. O carpete é uma peça só com barrado.
 */
function floorPieces(g: SteamGeo, x0: number, z0: number, x1: number, z1: number, y: number, t: number, mat: FloorMat | "outdoor", seed: number) {
  const W = x1 - x0
  const D = z1 - z0
  if (W <= 0 || D <= 0) return
  const at = (cx: number, cz: number) => Matrix.Translation(cx, y - t / 2, cz)
  if (mat === "carpet") {
    g.box(W, t, D, at(x0 + W / 2, z0 + D / 2), C.carpet)
    if (W > 1.2 && D > 1.2) g.box(W - 0.5, 0.008, D - 0.5, at(x0 + W / 2, z0 + D / 2).multiply(Matrix.Translation(0, t / 2 + 0.004, 0)), shade(C.carpet, 1.25))
    return
  }
  // Tamanho da peça: tábua comprida em z; ladrilho e laje quadrados.
  const big = W * D > 120
  const [pw, pd] =
    mat === "wood" ? [0.3, 1.8] : mat === "tile" ? (big ? [0.9, 0.9] : [0.6, 0.6]) : mat === "rubber" ? [1, 1] : big ? [1.6, 1.6] : [1.2, 1.2]
  const nx = Math.max(1, Math.round(W / pw))
  const nz = Math.max(1, Math.round(D / pd))
  const sx = W / nx
  const sz = D / nz
  for (let i = 0; i < nx; i++) {
    // Tábuas desencontradas: cada fileira começa num ponto.
    const off = mat === "wood" ? ((i * 7 + seed) % 3) / 3 : 0
    for (let j = -1; j < nz; j++) {
      let za = z0 + (j + off) * sz
      let zb = za + sz
      za = Math.max(z0, za)
      zb = Math.min(z1, zb)
      if (zb - za < 0.02) continue
      let c: RGB
      if (mat === "tile") c = (i + j) % 2 ? C.tile : mix(C.dark, C.tile, 0.18)
      else if (mat === "wood") c = shade(C.wood, 0.9 + (((i * 13 + j * 7 + seed) % 5) / 5) * 0.2)
      else if (mat === "rubber") c = shade(C.rubber, 0.92 + ((i + j) % 2) * 0.12)
      else if (mat === "outdoor") c = shade(C.outdoor, 0.92 + (((i * 5 + j * 3) % 4) / 4) * 0.14)
      else c = shade(C.stone, 0.9 + (((i * 5 + j * 3 + seed) % 4) / 4) * 0.16)
      g.box(sx, t, zb - za, at(x0 + (i + 0.5) * sx, (za + zb) / 2), c)
    }
  }
}

/** Lado de dentro de uma parede de fora: o lado do meio dos cômodos do andar. */
function inwardOf(w: { x: number; z: number; hx: number; hz: number }, cx: number, cz: number) {
  return w.hx >= w.hz ? { axis: "z" as const, s: Math.sign(cz - w.z) || 1 } : { axis: "x" as const, s: Math.sign(cx - w.x) || 1 }
}

export function buildInterior(scene: Scene, def: InteriorDef, tier: QualityTier = "mid"): BuiltInterior {
  const th = (def.theme && THEMES[def.theme]) || NO_THEME
  // Casa: o papel de parede sai da versão da planta (cada nível com o seu tom).
  const homeWall = def.theme ? null : HOME_WALLS[Math.abs(def.level) % HOME_WALLS.length]
  const upper = homeWall ?? th.wall
  const mats = createTrimMaterials(scene, tier)
  const meshes: Mesh[] = []
  let n = 0
  def.floors.forEach((fl, fi) => {
    const g = new SteamGeo()
    const gl = new SteamGeo()
    gl.uv = "flat"
    const y = fl.y
    // Meio dos cômodos do andar (para saber o lado de dentro das paredes de fora).
    let ax = 0
    let az = 0
    for (const r of fl.rooms) {
      ax += (r.x0 + r.x1) / 2
      az += (r.z0 + r.z1) / 2
    }
    ax /= Math.max(1, fl.rooms.length)
    az /= Math.max(1, fl.rooms.length)
    // Piso: no térreo uma placa por cômodo; acima, a laje (sem o vão da escada).
    if (fi === 0) {
      fl.rooms.forEach((r, ri) => floorPieces(g, r.x0, r.z0, r.x1, r.z1, y, 0.06, r.outdoor ? "outdoor" : r.mat, ri))
    } else {
      for (const s of fl.slabs ?? []) {
        g.box(s.x1 - s.x0, 0.08, s.z1 - s.z0, Matrix.Translation((s.x0 + s.x1) / 2, y - 0.1, (s.z0 + s.z1) / 2), C.woodDark)
        floorPieces(g, s.x0, s.z0, s.x1, s.z1, y, 0.06, s.mat ?? "wood", fi)
      }
      for (const r of fl.rooms) if (r.outdoor) floorPieces(g, r.x0, r.z0, r.x1, r.z1, y, 0.15, "outdoor", fi)
    }
    // Móvel alto encostado: a arandela/manômetro daquele trecho não entra (não atravessa o armário).
    const tall = fl.furniture
      .map((it) => ({ it, s: def.furnitureTypes[it.t] }))
      .filter(({ it, s }) => (it.h ?? s?.h ?? 0) > 1.4)
      .map(({ it, s }) => ({ x: it.x, z: it.z, r: Math.max(it.w ?? s?.w ?? 0.5, it.d ?? s?.d ?? 0.5) / 2 + 0.35 }))
    const blocked = (px: number, pz: number) => tall.some((q) => Math.abs(q.x - px) < q.r && Math.abs(q.z - pz) < q.r)
    const bathIds = new Set(fl.rooms.filter((r) => r.mat === "tile").map((r) => r.id))
    let pipeLen = 0
    for (const w of fl.walls) {
      const rail = w.kind === "rail"
      const inBath = fl.rooms.some(
        (r) => bathIds.has(r.id) && w.x >= r.x0 - 0.2 && w.x <= r.x1 + 0.2 && w.z >= r.z0 - 0.2 && w.z <= r.z1 + 0.2 && w.kind !== "int",
      )
      const color = inBath && !def.theme ? C.wallBath : upper
      if (rail) {
        // Guarda-corpo: corrimão de latão, balaústres de ferro.
        g.box(w.hx * 2, 0.08, w.hz * 2, Matrix.Translation(w.x, y + w.h - 0.04, w.z), C.rail)
        g.box(w.hx * 2 * 0.98, 0.1, w.hz * 2 * 0.98, Matrix.Translation(w.x, y + 0.05, w.z), C.woodDark)
        const len = Math.max(w.hx, w.hz) * 2
        const k = Math.max(2, Math.floor(len / 0.3))
        for (let i = 0; i <= k; i++) {
          const t = -len / 2 + (len * i) / k
          const [px, pz] = w.hx > w.hz ? [w.x + t, w.z] : [w.x, w.z + t]
          g.box(0.04, w.h, 0.04, Matrix.Translation(px, y + w.h / 2, pz), i % 4 ? C.iron : C.brassDark)
        }
        continue
      }
      // Parede: a parte de cima no papel de parede; embaixo, lambri em painéis.
      const WAIN = 0.95
      const alongX = w.hx >= w.hz
      const len = (alongX ? w.hx : w.hz) * 2
      const thick = (alongX ? w.hz : w.hx) * 2
      g.box(w.hx * 2, w.h - WAIN, w.hz * 2, Matrix.Translation(w.x, y + WAIN + (w.h - WAIN) / 2, w.z), color)
      const np = Math.max(1, Math.round(len / 0.9))
      for (let i = 0; i < np; i++) {
        const t = -len / 2 + (len / np) * (i + 0.5)
        const [px, pz] = alongX ? [w.x + t, w.z] : [w.x, w.z + t]
        const [bw, bd] = alongX ? [len / np, thick + 0.04] : [thick + 0.04, len / np]
        g.box(bw, WAIN, bd, Matrix.Translation(px, y + WAIN / 2, pz), i % 2 ? C.woodDark : shade(C.woodDark, 1.12))
      }
      // Friso de latão em cima do lambri, rodapé e a cornija no alto.
      const [rw, rd] = alongX ? [len + 0.01, thick + 0.07] : [thick + 0.07, len + 0.01]
      g.box(rw, 0.05, rd, Matrix.Translation(w.x, y + WAIN + 0.02, w.z), C.brass)
      g.box(rw, 0.12, rd, Matrix.Translation(w.x, y + 0.06, w.z), C.base)
      g.box(rw + (alongX ? 0 : 0.04), 0.12, rd + (alongX ? 0.04 : 0), Matrix.Translation(w.x, y + w.h - 0.06, w.z), shade(C.woodDark, 0.85))
      if (w.kind === "int" || len < 1.6) continue
      // Paredes de fora: cano de cobre no alto, manômetro, arandelas âmbar.
      const io = inwardOf(w, ax, az)
      const inset = thick / 2 + 0.09
      const ox = io.axis === "x" ? io.s * inset : 0
      const oz = io.axis === "z" ? io.s * inset : 0
      const py = y + w.h - 0.3
      const a: [number, number, number] = alongX ? [w.x - len / 2 + 0.1, py, w.z + oz] : [w.x + ox, py, w.z - len / 2 + 0.1]
      const b: [number, number, number] = alongX ? [w.x + len / 2 - 0.1, py, w.z + oz] : [w.x + ox, py, w.z + len / 2 - 0.1]
      g.tube(a, b, 0.045, C.copper, 6)
      for (const p of [a, b]) g.box(0.11, 0.11, 0.11, Matrix.Translation(p[0], p[1], p[2]), C.brassDark)
      const nl = Math.max(1, Math.floor(len / 3.2))
      for (let i = 0; i < nl; i++) {
        const t = -len / 2 + (len / nl) * (i + 0.5)
        const [px, pz] = alongX ? [w.x + t, w.z + oz * 0.9] : [w.x + ox * 0.9, w.z + t]
        // Arandela: suporte de latão e o globo âmbar aceso (gl).
        const [sx, sz] = io.axis === "x" ? [io.s * 0.12, 0] : [0, io.s * 0.12]
        if (blocked(px, pz)) continue
        g.box(io.axis === "x" ? 0.2 : 0.06, 0.06, io.axis === "x" ? 0.06 : 0.2, Matrix.Translation(px - sx / 2, y + 1.85, pz - sz / 2), C.brass)
        gl.sphere(0.17, [1, 1.25, 1], Matrix.Translation(px + sx * 0.3, y + 1.95, pz + sz * 0.3), C.lampShade, 6)
        // Manômetro no cano a cada duas arandelas.
        pipeLen++
        if (pipeLen % 2 === 0) {
          const face = io.axis === "x" ? Matrix.RotationZ(Math.PI / 2) : Matrix.RotationX(Math.PI / 2)
          g.cylinder(0.24, 0.06, face.multiply(Matrix.Translation(px + sx * 0.5, py - 0.2, pz + sz * 0.5)), C.brass, 10)
          gl.cylinder(0.18, 0.02, face.multiply(Matrix.Translation(px + sx * 0.78, py - 0.2, pz + sz * 0.78)), C.candle, 10)
        }
      }
    }
    for (const win of fl.windows) {
      // Caixilho de ferro com cruzeta, peitoril de latão, vidro âmbar (aceso: luz de fora).
      const out = win.inward * 0.09
      const ax_ = win.axis === "x"
      const px = !ax_ ? win.x + out : win.x
      const pz = ax_ ? win.z + out : win.z
      const [fw, fd] = ax_ ? [1.2, 0.05] : [0.05, 1.2]
      g.box(fw, 1.12, fd, Matrix.Translation(px, y + 1.5, pz), C.frame)
      gl.box(ax_ ? 0.98 : 0.02, 0.9, ax_ ? 0.02 : 0.98, Matrix.Translation(px + (!ax_ ? win.inward * 0.03 : 0), y + 1.5, pz + (ax_ ? win.inward * 0.03 : 0)), mix(C.lampShade, C.glass, 0.45))
      g.box(ax_ ? 1.0 : 0.04, 0.04, ax_ ? 0.04 : 1.0, Matrix.Translation(px + (!ax_ ? win.inward * 0.045 : 0), y + 1.5, pz + (ax_ ? win.inward * 0.045 : 0)), C.frame)
      g.box(ax_ ? 0.04 : 0.04, 0.92, ax_ ? 0.04 : 0.04, Matrix.Translation(px + (!ax_ ? win.inward * 0.045 : 0), y + 1.5, pz + (ax_ ? win.inward * 0.045 : 0)), C.frame)
      g.box(ax_ ? 1.3 : 0.16, 0.05, ax_ ? 0.16 : 1.3, Matrix.Translation(px + (!ax_ ? win.inward * 0.06 : 0), y + 0.93, pz + (ax_ ? win.inward * 0.06 : 0)), C.brass)
    }
    if (fi === 0) {
      // Porta da rua (fechada: sair é pela ação "Sair"): madeira almofadada, dobradiças e maçaneta de latão.
      const d = def.door
      g.box(d.w - 0.08, 2.05, 0.06, Matrix.Translation(d.x, y + 1.03, d.z + 0.04), C.door)
      for (const ly of [0.55, 1.45]) g.box(d.w - 0.36, 0.7, 0.02, Matrix.Translation(d.x, y + ly, d.z + 0.08), shade(C.door, 1.18))
      g.box(0.08, 0.08, 0.05, Matrix.Translation(d.x + d.w / 2 - 0.22, y + 1.0, d.z + 0.1), C.knob)
      for (const ly of [0.3, 1.75]) g.box(0.06, 0.14, 0.03, Matrix.Translation(d.x - d.w / 2 + 0.08, y + ly, d.z + 0.09), C.brassDark)
      g.box(d.w + 0.2, 0.14, 0.12, Matrix.Translation(d.x, y + 2.12, d.z + 0.06), C.brassDark)
    }
    def.stairs.forEach((st, si) => {
      if (st.from === fi) stairSteps(g, def, si)
    })
    for (const it of fl.furniture) furniture(g, gl, it, y, def.seatTop, n++, def.furnitureTypes, th)
    const mesh = g.build(`mm-interior-f${fi}`, scene, mats.trim)
    if (gl.vertexCount) {
      const glow = gl.build(`mm-interior-f${fi}-glow`, scene, mats.glow)
      glow.isPickable = false
      glow.parent = mesh
    }
    meshes.push(mesh)
  })
  mats.freeze()
  let shown = -1
  return {
    floors: meshes,
    showUpTo(floor) {
      if (floor === shown) return
      shown = floor
      meshes.forEach((m, i) => m.setEnabled(i <= floor))
    },
    dispose() {
      for (const m of meshes) m.dispose(false, false)
      mats.dispose()
    },
  }
}
