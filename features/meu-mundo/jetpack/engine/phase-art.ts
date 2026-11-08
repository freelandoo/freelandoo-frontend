// features/meu-mundo/jetpack/engine/phase-art.ts — JETPACK (mm3d-75): o que só o DESENHO sabe das fases.
//
// A regra de cada fase (quais obstáculos, dificuldade, galões) fica em
// sim/phases.ts. Aqui: nome e textos do cartão (chave de i18n + português),
// ambiente, dificuldade (1–5 estrelas, como na arte do Alex), etiquetas, a
// miniatura, as metas das estrelas de desempenho e as cores do cenário.
// Fase nova = entrada em PHASE_RULES (regra) + aqui (arte) + o cenário em
// phase-env.ts + a pele dos obstáculos em obstacles-view.ts.

import { PHASE_RULES, DEFAULT_PHASE, type PhaseId } from "../sim/phases"

export interface PhaseTag {
  key: string
  label: string
}

export interface PhaseArt {
  id: PhaseId
  /** Número no cartão (01…07). */
  num: string
  order: number
  nameKey: string
  name: string
  envKey: string
  env: string
  subKey: string
  sub: string
  /** Característica principal (a frase com ★). */
  featureKey: string
  feature: string
  /** 1–5 (estrelas de dificuldade do cartão). */
  difficulty: 1 | 2 | 3 | 4 | 5
  tags: PhaseTag[]
  /** Miniatura (public/meu-mundo/jetpack/fases/). */
  thumb: string
  accent: string
  /** Degradê do cartão quando a miniatura não carrega. */
  bg: [string, string]
  /** Metros para 1, 2 e 3 estrelas de desempenho. */
  stars: [number, number, number]
}

const THUMBS = "/meu-mundo/jetpack/fases/"

export const PHASE_ART: readonly PhaseArt[] = [
  {
    id: "industrial",
    num: "01",
    order: 0,
    nameKey: "jetPhaseIndustrial",
    name: "Túnel Industrial",
    envKey: "jetEnvIndustrial",
    env: "Galerias de vapor",
    subKey: "jetPhaseIndustrialSub",
    sub: "O túnel de sempre: prensas, pilões, pistões e engrenagens debaixo da cidade.",
    featureKey: "jetPhaseIndustrialHi",
    feature: "Domine o propulsor",
    difficulty: 2,
    tags: [
      { key: "jetTagClassic", label: "Clássica" },
      { key: "jetTagMachines", label: "Máquinas" },
    ],
    thumb: THUMBS + "industrial.webp",
    accent: "#E8B65B",
    bg: ["#4a2e17", "#120b07"],
    stars: [500, 1500, 3000],
  },
  {
    id: "canion",
    num: "02",
    order: 1,
    nameKey: "jetPhaseCanion",
    name: "Cânion Flutuante",
    envKey: "jetEnvCanion",
    env: "Desfiladeiro ao céu aberto",
    subKey: "jetPhaseCanionSub",
    sub: "Entre penhascos, rochas suspensas e anéis de metal sobre o rio.",
    featureKey: "jetPhaseCanionHi",
    feature: "Os três anéis diante da cachoeira",
    difficulty: 2,
    tags: [
      { key: "jetTagRings", label: "Anéis" },
      { key: "jetTagOpen", label: "Céu aberto" },
    ],
    thumb: THUMBS + "canion.webp",
    accent: "#FF9A3D",
    bg: ["#c0632a", "#3a6fa8"],
    stars: [500, 1500, 3000],
  },
  {
    id: "orbital",
    num: "03",
    order: 2,
    nameKey: "jetPhaseOrbital",
    name: "Cidade Orbital",
    envKey: "jetEnvOrbital",
    env: "Metrópole suspensa",
    subKey: "jetPhaseOrbitalSub",
    sub: "Um corredor de vidro sobre a cidade: portões que deslizam e barreiras de energia.",
    featureKey: "jetPhaseOrbitalHi",
    feature: "A fila de portões tecnológicos",
    difficulty: 3,
    tags: [
      { key: "jetTagUrban", label: "Urbano" },
      { key: "jetTagPrecision", label: "Precisão" },
    ],
    thumb: THUMBS + "orbital.webp",
    accent: "#3FD8FF",
    bg: ["#2a2f7a", "#0a0c24"],
    stars: [400, 1200, 2500],
  },
  {
    id: "floresta",
    num: "04",
    order: 3,
    nameKey: "jetPhaseFloresta",
    name: "Floresta Bioluminescente",
    envKey: "jetEnvFloresta",
    env: "Floresta encantada",
    subKey: "jetPhaseFlorestaSub",
    sub: "Raízes entrelaçadas, troncos suspensos e flores mecânicas que abrem e fecham.",
    featureKey: "jetPhaseFlorestaHi",
    feature: "Por dentro da árvore gigante",
    difficulty: 3,
    tags: [
      { key: "jetTagNature", label: "Natureza" },
      { key: "jetTagVertical", label: "Vertical" },
    ],
    thumb: THUMBS + "floresta.webp",
    accent: "#5CFFB0",
    bg: ["#16514a", "#120a2a"],
    stars: [400, 1200, 2500],
  },
  {
    id: "forja",
    num: "05",
    order: 4,
    nameKey: "jetPhaseForja",
    name: "Forja Vulcânica",
    envKey: "jetEnvForja",
    env: "Fábrica sobre a lava",
    subKey: "jetPhaseForjaSub",
    sub: "Pistões gigantes, engrenagens e placas mecânicas sobre um rio de lava.",
    featureKey: "jetPhaseForjaHi",
    feature: "A fornalha monumental",
    difficulty: 4,
    tags: [
      { key: "jetTagHeat", label: "Calor" },
      { key: "jetTagReflex", label: "Reflexo" },
    ],
    thumb: THUMBS + "forja.webp",
    accent: "#FF5A1F",
    bg: ["#7a1e08", "#1a0806"],
    stars: [300, 1000, 2000],
  },
  {
    id: "artico",
    num: "06",
    order: 5,
    nameKey: "jetPhaseArtico",
    name: "Tempestade Ártica",
    envKey: "jetEnvArtico",
    env: "Túneis glaciais",
    subKey: "jetPhaseArticoSub",
    sub: "Cristais de gelo, comportas congeladas e passagens estreitas.",
    featureKey: "jetPhaseArticoHi",
    feature: "A caverna de gelo e o grande arco",
    difficulty: 4,
    tags: [
      { key: "jetTagIce", label: "Gelo" },
      { key: "jetTagNarrow", label: "Estreito" },
    ],
    thumb: THUMBS + "artico.webp",
    accent: "#9FE8FF",
    bg: ["#5a8fb8", "#0e1a2a"],
    stars: [300, 1000, 2000],
  },
  {
    id: "vacuo",
    num: "07",
    order: 6,
    nameKey: "jetPhaseVacuo",
    name: "Anéis do Vácuo",
    envKey: "jetEnvVacuo",
    env: "Estação espacial",
    subKey: "jetPhaseVacuoSub",
    sub: "Asteroides e anéis em órbita. Em breve.",
    featureKey: "jetPhaseVacuoHi",
    feature: "Em breve",
    difficulty: 5,
    tags: [{ key: "jetTagSoon", label: "Em breve" }],
    thumb: THUMBS + "vacuo.webp",
    accent: "#B07CFF",
    bg: ["#2a1a5a", "#05040e"],
    stars: [300, 1000, 2000],
  },
]

/** Arte de uma fase (desconhecida = a original). */
export function phaseArt(id: string | null | undefined): PhaseArt {
  return PHASE_ART.find((p) => p.id === id) ?? PHASE_ART.find((p) => p.id === DEFAULT_PHASE)!
}

/** Os cartões do seletor, na ordem: as jogáveis e as reservadas (estas aparecem trancadas). */
export function menuPhases(): { art: PhaseArt; enabled: boolean }[] {
  return [...PHASE_ART]
    .sort((a, b) => a.order - b.order)
    .map((art) => ({ art, enabled: PHASE_RULES.some((r) => r.id === art.id && r.enabled) }))
}

/** Estrelas de desempenho (0–3) por distância. */
export function starsFor(id: string, dist: number): number {
  const s = phaseArt(id).stars
  return dist >= s[2] ? 3 : dist >= s[1] ? 2 : dist >= s[0] ? 1 : 0
}
