// features/meu-mundo/paint/engine/paint-map-art.ts — PAINT (mm3d-76): o DESENHO de cada mapa.
//
// A regra de cada mapa (ilhas, gatinhos, portal) mora em sim/maps.ts; aqui só o
// que não muda o jogo: nome, ambiente, dificuldade, texto e destaques do
// cartão, a miniatura (public/meu-mundo/paint/v1/mapas/<id>.webp, a partir das
// imagens de referência do Alex em Downloads/fases paint) e a PALETA do tema
// que a cena usa (engine/arena-view.ts): céu, neblina, luzes, chão, rocha,
// detalhes e brilho. A Cidade Suspensa segue com o desenho dela (world-view.ts).

import type { RGB } from "../../engine/geometry"
import { PAINT_MAPS, type PaintMapId } from "../sim/maps"

export interface PaintTheme {
  /** Céu: topo, horizonte (e a cor do fundo/neblina). */
  skyTop: RGB
  skyLow: RGB
  fog: RGB
  fogStart: number
  fogEnd: number
  /** Luz de cima (hemisférica), do chão e do sol. */
  hemi: RGB
  ground: RGB
  hemiK: number
  sun: RGB
  sunK: number
  /** Chão das ilhas (miolo e borda), rocha embaixo em camadas, detalhe e brilho. */
  top: RGB
  rim: RGB
  strata: RGB[]
  trim: RGB
  accent: RGB
  glow: RGB
  glow2: RGB
  /** Embaixo de tudo: nuvens (cor) ou um mar de lava. */
  floor: "clouds" | "mist" | "lava"
  floorColor: RGB
  /** Desenho da textura do chão (canvas). */
  tile: "garden" | "plate" | "moss" | "rune" | "basalt"
  /** Portal: aro e redemoinho. */
  portalRing: RGB
  portalSwirl: RGB
}

export interface PaintMapArt {
  id: PaintMapId
  name: string
  nameKey: string
  biome: string
  biomeKey: string
  /** 1 fácil · 2 média · 3 difícil. */
  difficulty: 1 | 2 | 3
  desc: string
  descKey: string
  /** Destaques (chave + texto). */
  highlights: [string, string][]
  /** Melhor para (texto curto). */
  players: string
  playersKey: string
  thumb: string
  accent: string
  bg: [string, string]
  theme: PaintTheme | null
}

const T = (k: string) => `paintMap${k}`

const ART: Record<PaintMapId, Omit<PaintMapArt, "id">> = {
  cidade: {
    name: "Cidade Suspensa",
    nameKey: T("CidadeName"),
    biome: "Ilhas steampunk sobre as nuvens",
    biomeKey: T("CidadeBiome"),
    difficulty: 1,
    desc: "O mapa de sempre: duas torres em espiral, a coluna disputada no meio e o portal no topo de cada torre.",
    descKey: T("CidadeDesc"),
    highlights: [
      [T("CidadeH1"), "Torres em espiral"],
      [T("CidadeH2"), "Coluna disputada no meio"],
      [T("CidadeH3"), "Dia e noite de Brasília"],
    ],
    players: "Todos os modos",
    playersKey: T("PlayersAll"),
    thumb: "/meu-mundo/paint/v1/mapas/cidade.webp",
    accent: "#E8B44A",
    bg: ["#f4e2bf", "#9cc2dd"],
    theme: null,
  },
  jardim: {
    name: "Jardim Espiral",
    nameKey: T("JardimName"),
    biome: "Ruínas floridas acima das nuvens",
    biomeKey: T("JardimBiome"),
    difficulty: 1,
    desc: "Terraços em meia-lua, ruínas brancas e a grande espiral do meio que leva ao templo dos portais.",
    descKey: T("JardimDesc"),
    highlights: [
      [T("JardimH1"), "Meia-lua de terraços"],
      [T("JardimH2"), "Espiral de plataformas no meio"],
      [T("JardimH3"), "Corredor de ruínas para fechar com o muro"],
    ],
    players: "Ótimo para treinar e 1 × 1",
    playersKey: T("JardimPlayers"),
    thumb: "/meu-mundo/paint/v1/mapas/jardim.webp",
    accent: "#B98CFF",
    bg: ["#cfe8ff", "#7fb4e8"],
    theme: {
      skyTop: [0.26, 0.55, 0.95],
      skyLow: [0.72, 0.87, 1],
      fog: [0.76, 0.88, 0.99],
      fogStart: 90,
      fogEnd: 260,
      hemi: [1, 0.99, 0.96],
      ground: [0.88, 0.86, 0.8],
      hemiK: 0.9,
      sun: [1, 0.94, 0.8],
      sunK: 0.9,
      top: [0.97, 0.93, 0.84],
      rim: [0.46, 0.7, 0.3],
      strata: [
        [0.9, 0.87, 0.8],
        [0.74, 0.72, 0.68],
        [0.84, 0.8, 0.72],
        [0.6, 0.58, 0.56],
        [0.7, 0.66, 0.6],
        [0.46, 0.46, 0.48],
      ],
      trim: [0.88, 0.72, 0.32],
      accent: [0.64, 0.44, 0.88],
      glow: [0.35, 0.8, 1],
      glow2: [1, 0.86, 0.5],
      floor: "clouds",
      floorColor: [1, 1, 1],
      tile: "garden",
      portalRing: [0.9, 0.74, 0.34],
      portalSwirl: [0.55, 0.75, 1],
    },
  },
  fabrica: {
    name: "Fábrica Suspensa",
    nameKey: T("FabricaName"),
    biome: "Máquina colossal no vazio",
    biomeKey: T("FabricaBiome"),
    difficulty: 2,
    desc: "Andaimes de chapas empilhadas, esteiras estreitas e a engrenagem gigante do alto com o anel dos portais.",
    descKey: T("FabricaDesc"),
    highlights: [
      [T("FabricaH1"), "Andaime em zigue-zague"],
      [T("FabricaH2"), "Esteira estreita e exposta"],
      [T("FabricaH3"), "Pátio da engrenagem no meio"],
    ],
    players: "Ótimo para 2 × 2",
    playersKey: T("FabricaPlayers"),
    thumb: "/meu-mundo/paint/v1/mapas/fabrica.webp",
    accent: "#F5C21B",
    bg: ["#dfe7ee", "#7e95ad"],
    theme: {
      skyTop: [0.24, 0.5, 0.92],
      skyLow: [0.7, 0.84, 0.98],
      fog: [0.72, 0.83, 0.95],
      fogStart: 70,
      fogEnd: 240,
      hemi: [0.98, 0.98, 1],
      ground: [0.7, 0.62, 0.52],
      hemiK: 0.85,
      sun: [1, 0.96, 0.9],
      sunK: 0.95,
      top: [0.42, 0.43, 0.46],
      rim: [0.96, 0.76, 0.1],
      strata: [
        [0.36, 0.37, 0.4],
        [0.5, 0.36, 0.26],
        [0.3, 0.31, 0.34],
        [0.44, 0.3, 0.22],
        [0.26, 0.27, 0.3],
        [0.2, 0.2, 0.23],
      ],
      trim: [0.95, 0.75, 0.1],
      accent: [0.1, 0.1, 0.11],
      glow: [1, 0.6, 0.14],
      glow2: [0.2, 0.9, 1],
      floor: "clouds",
      floorColor: [0.97, 0.98, 1],
      tile: "plate",
      portalRing: [0.3, 0.32, 0.36],
      portalSwirl: [0.65, 0.5, 1],
    },
  },
  floresta: {
    name: "Floresta de Cristal",
    nameKey: T("FlorestaName"),
    biome: "Floresta mágica suspensa",
    biomeKey: T("FlorestaBiome"),
    difficulty: 2,
    desc: "A árvore colossal no meio, folhas gigantes subindo em volta do tronco, cristais acesos e a copa com os portais.",
    descKey: T("FlorestaDesc"),
    highlights: [
      [T("FlorestaH1"), "Árvore gigante com vários andares"],
      [T("FlorestaH2"), "Folhas para subir de cama elástica"],
      [T("FlorestaH3"), "Ilhotas de cristal e cogumelo"],
    ],
    players: "Todos os modos",
    playersKey: T("PlayersAll"),
    thumb: "/meu-mundo/paint/v1/mapas/floresta.webp",
    accent: "#43E0C8",
    bg: ["#5c4b9a", "#1d2a4a"],
    theme: {
      skyTop: [0.26, 0.56, 0.95],
      skyLow: [0.76, 0.9, 1],
      fog: [0.78, 0.9, 0.98],
      fogStart: 65,
      fogEnd: 230,
      hemi: [1, 0.98, 0.9],
      ground: [0.62, 0.82, 0.66],
      hemiK: 0.9,
      sun: [1, 0.93, 0.78],
      sunK: 0.85,
      top: [0.42, 0.7, 0.28],
      rim: [0.34, 0.56, 0.24],
      strata: [
        [0.56, 0.5, 0.42],
        [0.44, 0.4, 0.34],
        [0.5, 0.46, 0.4],
        [0.36, 0.33, 0.3],
        [0.42, 0.38, 0.34],
        [0.3, 0.28, 0.27],
      ],
      trim: [0.4, 0.3, 0.22],
      accent: [0.86, 0.42, 0.9],
      glow: [0.3, 0.95, 0.9],
      glow2: [0.95, 0.4, 0.95],
      floor: "clouds",
      floorColor: [1, 1, 1],
      tile: "moss",
      portalRing: [0.6, 0.86, 0.9],
      portalSwirl: [0.7, 0.5, 1],
    },
  },
  templo: {
    name: "Templo da Tempestade",
    nameKey: T("TemploName"),
    biome: "Ruínas dentro da tempestade",
    biomeKey: T("TemploBiome"),
    difficulty: 3,
    desc: "Base triangular, escadarias partidas, abismos grandes e os fragmentos da torre até o anel de colunas.",
    descKey: T("TemploDesc"),
    highlights: [
      [T("TemploH1"), "Escadaria partida"],
      [T("TemploH2"), "Terraços triangulares e abismos"],
      [T("TemploH3"), "Relâmpagos e o anel de colunas"],
    ],
    players: "Ótimo para 3 × 3",
    playersKey: T("TemploPlayers"),
    thumb: "/meu-mundo/paint/v1/mapas/templo.webp",
    accent: "#7FA8FF",
    bg: ["#3b3b70", "#151630"],
    theme: {
      skyTop: [0.2, 0.1, 0.38],
      skyLow: [0.58, 0.42, 0.82],
      fog: [0.44, 0.32, 0.66],
      fogStart: 70,
      fogEnd: 210,
      hemi: [0.9, 0.8, 1],
      ground: [0.5, 0.38, 0.7],
      hemiK: 0.95,
      sun: [1, 0.88, 0.96],
      sunK: 0.8,
      top: [0.72, 0.64, 0.82],
      rim: [0.42, 0.34, 0.56],
      strata: [
        [0.42, 0.34, 0.56],
        [0.3, 0.23, 0.44],
        [0.36, 0.28, 0.5],
        [0.22, 0.17, 0.34],
        [0.28, 0.22, 0.4],
        [0.16, 0.13, 0.26],
      ],
      trim: [0.96, 0.76, 0.28],
      accent: [0.48, 0.24, 0.8],
      glow: [0.72, 0.5, 1],
      glow2: [1, 0.8, 0.35],
      floor: "clouds",
      floorColor: [0.6, 0.46, 0.8],
      tile: "rune",
      portalRing: [0.85, 0.68, 0.3],
      portalSwirl: [0.65, 0.45, 1],
    },
  },
  forja: {
    name: "Forja Vulcânica",
    nameKey: T("ForjaName"),
    biome: "Forja sobre um mar de lava",
    biomeKey: T("ForjaBiome"),
    difficulty: 3,
    desc: "Basalto preto, chapas de metal sobre a lava e a fornalha gigante do meio, com plataformas subindo em volta dela.",
    descKey: T("ForjaDesc"),
    highlights: [
      [T("ForjaH1"), "Fornalha com plataformas em volta"],
      [T("ForjaH2"), "Rochas de basalto irregulares"],
      [T("ForjaH3"), "Mar de lava lá embaixo"],
    ],
    players: "Ótimo para 2 × 2 e 3 × 3",
    playersKey: T("ForjaPlayers"),
    thumb: "/meu-mundo/paint/v1/mapas/forja.webp",
    accent: "#FF6A1F",
    bg: ["#5a1f14", "#1a0c0c"],
    theme: {
      skyTop: [0.28, 0.1, 0.16],
      skyLow: [0.95, 0.46, 0.22],
      fog: [0.62, 0.28, 0.16],
      fogStart: 50,
      fogEnd: 200,
      hemi: [1, 0.86, 0.76],
      ground: [0.9, 0.44, 0.2],
      hemiK: 0.85,
      sun: [1, 0.72, 0.5],
      sunK: 0.8,
      top: [0.26, 0.24, 0.25],
      rim: [0.18, 0.17, 0.18],
      strata: [
        [0.22, 0.2, 0.2],
        [0.32, 0.18, 0.14],
        [0.18, 0.16, 0.17],
        [0.28, 0.14, 0.1],
        [0.14, 0.13, 0.14],
        [0.1, 0.09, 0.1],
      ],
      trim: [0.95, 0.72, 0.12],
      accent: [0.34, 0.35, 0.38],
      glow: [1, 0.48, 0.12],
      glow2: [0.3, 0.9, 1],
      floor: "lava",
      floorColor: [1, 0.42, 0.08],
      tile: "basalt",
      portalRing: [0.4, 0.4, 0.44],
      portalSwirl: [1, 0.7, 0.35],
    },
  },
}

/** Os cartões, na ordem do catálogo. */
export function paintMapArts(): PaintMapArt[] {
  return PAINT_MAPS.map((m) => ({ id: m.id, ...ART[m.id] }))
}

export function paintMapArt(id: string): PaintMapArt {
  const m = PAINT_MAPS.find((x) => x.id === id) ?? PAINT_MAPS[0]
  return { id: m.id, ...ART[m.id] }
}
