// features/meu-mundo/skins.ts — vestuário do personagem (mm3d-16).
//
// CONDIÇÃO (magro, normal, gordo, forte) é o corpo do personagem PADRÃO e
// sai da vida — não é skin, não se compra. SKIN é outro visual inteiro,
// comprado com as moedas do jogo. Os ids e o preço valem no backend
// (src/utils/meuMundoSkins.js, com teste de espelho); aqui mora só o que o
// cliente desenha: corpo, palco de fundo e cor do holograma.

import type { BodyId } from "./types"
import { GOD_BODIES, GOD_NAMES, type GodBody } from "./gods"

export type SkinId = "standard" | "sergio" | "feminina" | "ekaterina" | GodBody

/** Palco 1672×941 com o pedestal no meio (os dois têm a mesma geometria). */
export interface SkinStage {
  src: string
  small: string
}

export interface SkinArt {
  id: SkinId
  labelKey: string
  fallback: string
  taglineKey: string
  taglineFallback: string
  /** null = o corpo da condição física (só o padrão). */
  body: BodyId | null
  stage: SkinStage
  /** holograma de quem ainda não comprou */
  holo: { color: string; accent: string }
}

const BASE = "/meu-mundo/skins/v1"

/** Medidas do palco, em pixels da imagem: pés no topo do pedestal e altura da figura. */
export const STAGE = { w: 1672, h: 941, feetX: 836, feetY: 548, figure: 380 } as const

/** Frase de cada deus (lore aprovada, mm3d-48). */
const GOD_LINES: Record<GodBody, string> = {
  aurion: "O Titã Solar. Nunca perdeu uma prova.",
  morkhan: "O Sem-Nome. Trapaceou na final e foi riscado da pedra.",
  kragor: "O Minotauro de Basalto. Força que não cede.",
  zephyra: "A Deusa das Tempestades. Ninguém a alcança.",
  maru: "O Tritão das águas fundas.",
  iris: "A Deusa das Cores. Cada golpe, um tom.",
  noctis: "A Onça da Lua. Caça no escuro.",
  aeryn: "A Águia de Bronze. Senhora dos céus.",
}

const GOD_HOLO: Record<GodBody, SkinArt["holo"]> = {
  aurion: { color: "#ffb800", accent: "#fff1c2" },
  morkhan: { color: "#8a3bff", accent: "#e2cfff" },
  kragor: { color: "#ff5a1f", accent: "#ffd6c2" },
  zephyra: { color: "#ff2b4a", accent: "#ffd1d8" },
  maru: { color: "#ff6fa3", accent: "#ffe0ec" },
  iris: { color: "#c77dff", accent: "#f1e2ff" },
  noctis: { color: "#2fc2ff", accent: "#cfefff" },
  aeryn: { color: "#d08a3a", accent: "#ffe6c7" },
}

export const SKINS: SkinArt[] = [
  {
    id: "standard",
    labelKey: "skinStandard",
    fallback: "Personagem padrão",
    taglineKey: "skinStandardLine",
    taglineFallback: "Muda com a vida: magro, normal, gordo ou forte.",
    body: null,
    stage: { src: `${BASE}/palco-meu-mundo.webp`, small: `${BASE}/palco-meu-mundo-1024.webp` },
    holo: { color: "#ff2b3a", accent: "#ffd1d6" },
  },
  {
    id: "sergio",
    labelKey: "skinSergio",
    fallback: "Sergio",
    taglineKey: "skinSergioLine",
    taglineFallback: "O lutador do Coliseu da Casa Views.",
    body: "sergio",
    stage: { src: `${BASE}/coliseu.webp`, small: `${BASE}/coliseu-1024.webp` },
    holo: { color: "#ff2b91", accent: "#ffd1e8" },
  },
  {
    // mm3d-30: a versão feminina da personagem padrão, no mesmo palco dela.
    id: "feminina",
    labelKey: "skinFeminina",
    fallback: "Personagem feminina",
    taglineKey: "skinFemininaLine",
    taglineFallback: "A versão feminina da personagem do Meu Mundo.",
    body: "female",
    stage: { src: `${BASE}/palco-meu-mundo.webp`, small: `${BASE}/palco-meu-mundo-1024.webp` },
    holo: { color: "#ff2b3a", accent: "#ffd1d6" },
  },
  {
    // mm3d-30: no palco do Sergio (o Coliseu neon).
    id: "ekaterina",
    labelKey: "skinEkaterina",
    fallback: "Ekaterina",
    taglineKey: "skinEkaterinaLine",
    taglineFallback: "Jaqueta de couro e olhar de quem manda no Coliseu.",
    body: "ekaterina",
    stage: { src: `${BASE}/coliseu.webp`, small: `${BASE}/coliseu-1024.webp` },
    holo: { color: "#ff2b91", accent: "#ffd1e8" },
  },
  // mm3d-50: os deuses de Lúmen (gods.ts), 2 m, no palco do Coliseu neon;
  // o holograma tem a cor de cada um.
  ...GOD_BODIES.map((g): SkinArt => ({
    id: g,
    labelKey: `skinGod_${g}`,
    fallback: GOD_NAMES[g],
    taglineKey: `skinGodLine_${g}`,
    taglineFallback: GOD_LINES[g],
    body: g,
    stage: { src: `${BASE}/coliseu.webp`, small: `${BASE}/coliseu-1024.webp` },
    holo: GOD_HOLO[g],
  })),
]

export const skinArt = (id: string | null | undefined) => SKINS.find((s) => s.id === id) ?? null
