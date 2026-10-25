// features/meu-mundo/skins.ts — vestuário do personagem (mm3d-16).
//
// CONDIÇÃO (magro, normal, gordo, forte) é o corpo do personagem PADRÃO e
// sai da vida — não é skin, não se compra. SKIN é outro visual inteiro,
// comprado com as moedas do jogo. Os ids e o preço valem no backend
// (src/utils/meuMundoSkins.js, com teste de espelho); aqui mora só o que o
// cliente desenha: corpo, palco de fundo e cor do holograma.

import type { BodyId } from "./types"

export type SkinId = "standard" | "sergio" | "feminina" | "ekaterina"

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
]

export const skinArt = (id: string | null | undefined) => SKINS.find((s) => s.id === id) ?? null
