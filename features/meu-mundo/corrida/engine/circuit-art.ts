// features/meu-mundo/corrida/engine/circuit-art.ts — CORRIDA (mm3d-74): o que só o DESENHO sabe das pistas.
//
// A regra de cada circuito (peças, cápsulas, vãos, loops) fica em
// sim/circuits.ts, que o servidor também roda. Aqui: nome e textos do cartão
// (chaves de i18n + texto em português), ambiente, dificuldade, etiquetas,
// a miniatura e o tema do cenário (track-env.ts). Pista nova = uma entrada em
// TRACK_DEFS (regra) + uma aqui (arte) + o tema.

import { TRACK_DEFS, DEFAULT_TRACK } from "../sim/circuits"

export type ThemeId = "baia" | "abismo" | "floresta" | "neon" | "tempestade" | "forja"
export type CircuitTag = "loops" | "quedas" | "tunel" | "saltos" | "espiral" | "rapida" | "tecnica" | "dificil"

export interface CircuitArt {
  id: string
  /** Ordem no cardápio. */
  order: number
  /** Aparece no cardápio (para desbloqueio no futuro). */
  active: boolean
  theme: ThemeId
  nameKey: string
  name: string
  subKey: string
  sub: string
  envKey: string
  env: string
  highlightKey: string
  highlight: string
  /** 1 fácil · 2 médio · 3 difícil. */
  difficulty: 1 | 2 | 3
  loops: number
  bigDrop: boolean
  tunnel: boolean
  tags: CircuitTag[]
  /** Miniatura (public/meu-mundo/corrida/pistas/). */
  thumb: string
  /** Cor de destaque do cartão. */
  accent: string
  /** Degradê do cartão quando a miniatura não carrega. */
  bg: [string, string]
}

const THUMBS = "/meu-mundo/corrida/pistas/"

export const CIRCUIT_ART: readonly CircuitArt[] = [
  {
    id: "baia-suspensa",
    order: 0,
    active: true,
    theme: "baia",
    nameKey: "corridaTrackBaia",
    name: "Baía Suspensa",
    subKey: "corridaTrackBaiaSub",
    sub: "O circuito de sempre, sobre a baía à noite.",
    envKey: "corridaEnvBaia",
    env: "Cidade à noite",
    highlightKey: "corridaTrackBaiaHi",
    highlight: "Dois penhascos e o voo grande",
    difficulty: 1,
    loops: 0,
    bigDrop: false,
    tunnel: false,
    tags: ["saltos", "rapida"],
    thumb: THUMBS + "baia-suspensa.webp",
    accent: "#FF9A4D",
    bg: ["#3a1d10", "#0d0a12"],
  },
  {
    id: "abismo-vermelho",
    order: 1,
    active: true,
    theme: "abismo",
    nameKey: "corridaTrackAbismo",
    name: "Abismo Vermelho",
    subKey: "corridaTrackAbismoSub",
    sub: "Pontes de aço entre os penhascos de um cânion.",
    envKey: "corridaEnvAbismo",
    env: "Cânion desértico",
    highlightKey: "corridaTrackAbismoHi",
    highlight: "A grande descida e o salto sobre o vazio",
    difficulty: 2,
    loops: 0,
    bigDrop: true,
    tunnel: true,
    tags: ["quedas", "tunel", "saltos", "rapida"],
    thumb: THUMBS + "abismo-vermelho.webp",
    accent: "#FF6A3D",
    bg: ["#8a3a1c", "#2a1410"],
  },
  {
    id: "floresta-espectral",
    order: 2,
    active: true,
    theme: "floresta",
    nameKey: "corridaTrackFloresta",
    name: "Floresta Espectral",
    subKey: "corridaTrackFlorestaSub",
    sub: "Entre árvores gigantes e cogumelos que brilham.",
    envKey: "corridaEnvFloresta",
    env: "Floresta bioluminescente",
    highlightKey: "corridaTrackFlorestaHi",
    highlight: "O túnel holográfico e a espiral que desce",
    difficulty: 2,
    loops: 0,
    bigDrop: true,
    tunnel: true,
    tags: ["espiral", "tunel", "quedas", "tecnica"],
    thumb: THUMBS + "floresta-espectral.webp",
    accent: "#3DF5C8",
    bg: ["#0f4a44", "#071418"],
  },
  {
    id: "neon-overdrive",
    order: 3,
    active: true,
    theme: "neon",
    nameKey: "corridaTrackNeon",
    name: "Neon Overdrive",
    subKey: "corridaTrackNeonSub",
    sub: "Vias suspensas no meio dos arranha-céus.",
    envKey: "corridaEnvNeon",
    env: "Megacidade futurista",
    highlightKey: "corridaTrackNeonHi",
    highlight: "O loop entre os prédios e a descida até o centro",
    difficulty: 3,
    loops: 1,
    bigDrop: true,
    tunnel: true,
    tags: ["loops", "quedas", "tunel", "rapida"],
    thumb: THUMBS + "neon-overdrive.webp",
    accent: "#FF4FD8",
    bg: ["#2a5fa0", "#120c2a"],
  },
  {
    id: "tempestade-oceanica",
    order: 4,
    active: true,
    theme: "tempestade",
    nameKey: "corridaTrackTempestade",
    name: "Tempestade Oceânica",
    subKey: "corridaTrackTempestadeSub",
    sub: "Plataformas de aço sobre um mar revolto.",
    envKey: "corridaEnvTempestade",
    env: "Oceano em tempestade",
    highlightKey: "corridaTrackTempestadeHi",
    highlight: "A grande curva inclinada sobre as ondas",
    difficulty: 2,
    loops: 0,
    bigDrop: false,
    tunnel: true,
    tags: ["tunel", "saltos", "tecnica"],
    thumb: THUMBS + "tempestade-oceanica.webp",
    accent: "#4FC8FF",
    bg: ["#1d3f52", "#0a0f16"],
  },
  {
    id: "forja-infinita",
    order: 5,
    active: true,
    theme: "forja",
    nameKey: "corridaTrackForja",
    name: "Forja Infinita",
    subKey: "corridaTrackForjaSub",
    sub: "Por dentro de uma máquina colossal.",
    envKey: "corridaEnvForja",
    env: "Megaestrutura industrial",
    highlightKey: "corridaTrackForjaHi",
    highlight: "O loop gigante e o anel monumental",
    difficulty: 3,
    loops: 1,
    bigDrop: true,
    tunnel: true,
    tags: ["loops", "quedas", "tunel", "dificil"],
    thumb: THUMBS + "forja-infinita.webp",
    accent: "#FFB13B",
    bg: ["#5a2a10", "#120c0a"],
  },
]

/** Arte de uma pista (desconhecida = a padrão). */
export function circuitArt(id: string | null | undefined): CircuitArt {
  return CIRCUIT_ART.find((c) => c.id === id) ?? CIRCUIT_ART.find((c) => c.id === DEFAULT_TRACK)!
}

/** As pistas do cardápio, na ordem (só as que têm regra e estão ativas). */
export function menuCircuits(): CircuitArt[] {
  const ids = new Set(TRACK_DEFS.map((d) => d.id))
  return CIRCUIT_ART.filter((c) => c.active && ids.has(c.id)).sort((a, b) => a.order - b.order)
}

export function tagLabel(tag: CircuitTag, t: (k: string, f: string) => string): string {
  return {
    loops: t("corridaTagLoops", "LOOPS"),
    quedas: t("corridaTagDrops", "QUEDAS"),
    tunel: t("corridaTagTunnel", "TÚNEL"),
    saltos: t("corridaTagJumps", "SALTOS"),
    espiral: t("corridaTagSpiral", "ESPIRAL"),
    rapida: t("corridaTagFast", "RÁPIDA"),
    tecnica: t("corridaTagTechnical", "TÉCNICA"),
    dificil: t("corridaTagHard", "DIFÍCIL"),
  }[tag]
}
