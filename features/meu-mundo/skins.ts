// features/meu-mundo/skins.ts — vestuário do personagem (mm3d-16).
//
// CONDIÇÃO (magro, normal, gordo, forte) é o corpo do personagem PADRÃO e
// sai da vida — não é skin, não se compra. SKIN é outro visual inteiro,
// comprado com as moedas do jogo. Os ids e o preço valem no backend
// (src/utils/meuMundoSkins.js, com teste de espelho); aqui mora só o que o
// cliente desenha: corpo, palco de fundo e cor do holograma.

import type { BodyId } from "./types"
import { TALL_BODIES, TALL_NAMES, type TallBody } from "./gods"
import { CLAN_SKINS, type ClanSkinId } from "./classes"

export type SkinId = "standard" | "sergio" | "feminina" | "ekaterina" | TallBody | ClanSkinId | "brutamontes"

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
  /** mm3d-58: skin de teste (só administrador vê). */
  adminOnly?: boolean
}

const BASE = "/meu-mundo/skins/v1"

/** Medidas do palco, em pixels da imagem: pés no topo do pedestal e altura da figura. */
export const STAGE = { w: 1672, h: 941, feetX: 836, feetY: 548, figure: 380 } as const

/** Frase de cada um (lore v2, historia/v2/02-historias.md): os 8 deuses e os 4 monstros. */
const TALL_LINES: Record<TallBody, string> = {
  aurion: "O Titã Solar, rei do Céu. Quer um povo de joelhos.",
  morkhan: "O Senhor do Abaixo. Prometeu a vida eterna e cobrou caro.",
  kragor: "O Minotauro de Basalto. Vendeu armas aos dois lados.",
  zephyra: "A Deusa-Chacal das Tempestades. Carrega as almas e cobra por elas.",
  maru: "O Senhor do Mar. Fica com tudo o que cai.",
  iris: "A Deusa-Camaleão. Toda cor do mundo passa por ela.",
  noctis: "A Onça da Lua, filho de Morkhan. Não tem pressa.",
  aeryn: "A Águia de Bronze. Não nasceu: foi feita.",
  ciborgue: "Era uma Raposa. Segurou a ponte e foi refeito em ferro.",
  cavaleiro: "Capitão da Ordem do Sol. Guarda um deus que não quer acordado.",
  golem: "Uma vila inteira numa muralha só. Cento e oitenta vozes.",
  garras: "A caçadora dos telhados. Não fala desde aquela manhã.",
}

const TALL_HOLO: Record<TallBody, SkinArt["holo"]> = {
  aurion: { color: "#ffb800", accent: "#fff1c2" },
  morkhan: { color: "#8a3bff", accent: "#e2cfff" },
  kragor: { color: "#ff5a1f", accent: "#ffd6c2" },
  zephyra: { color: "#ff2b4a", accent: "#ffd1d8" },
  maru: { color: "#ff6fa3", accent: "#ffe0ec" },
  iris: { color: "#c77dff", accent: "#f1e2ff" },
  noctis: { color: "#2fc2ff", accent: "#cfefff" },
  aeryn: { color: "#d08a3a", accent: "#ffe6c7" },
  ciborgue: { color: "#ff3040", accent: "#ffd0d4" },
  cavaleiro: { color: "#ffb030", accent: "#fff0c8" },
  golem: { color: "#3ddc6a", accent: "#d2ffe0" },
  garras: { color: "#9b30ff", accent: "#ead6ff" },
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
  // mm3d-50: os deuses de Lúmen e (F1) os 4 monstros jogáveis (gods.ts), no palco do Coliseu neon;
  // o holograma tem a cor de cada um.
  ...TALL_BODIES.map((g): SkinArt => ({
    id: g,
    labelKey: `skinGod_${g}`,
    fallback: TALL_NAMES[g],
    taglineKey: `skinGodLine_${g}`,
    taglineFallback: TALL_LINES[g],
    body: g,
    stage: { src: `${BASE}/coliseu.webp`, small: `${BASE}/coliseu-1024.webp` },
    holo: TALL_HOLO[g],
  })),
  // mm3d-58: os personagens das classes como skin de teste (só admin).
  ...CLAN_SKINS.map(
    (c): SkinArt => ({
      id: c.id,
      labelKey: `skinClan_${c.id}`,
      fallback: c.name,
      taglineKey: "skinClanTestLine",
      taglineFallback: "Teste de administrador: personagem das classes.",
      body: c.body,
      stage: { src: `${BASE}/coliseu.webp`, small: `${BASE}/coliseu-1024.webp` },
      holo: c.body.startsWith("raposa") ? { color: "#ff7a1f", accent: "#ffe1c8" } : { color: "#e0213b", accent: "#ffd1d8" },
      adminOnly: true,
    }),
  ),
  // 2026-11-02 (Alex: "deixa ele como skin liberada para os admins"): o Brutamontes,
  // monstro da Arena das Lâminas, 4 m — skin de teste, só administrador.
  {
    id: "brutamontes",
    labelKey: "laminasMobBrute",
    fallback: "Brutamontes",
    taglineKey: "skinBruteLine",
    taglineFallback: "O campeão da Arena das Lâminas. Machado de 3 m.",
    body: "brutamontes",
    stage: { src: `${BASE}/coliseu.webp`, small: `${BASE}/coliseu-1024.webp` },
    holo: { color: "#9b30ff", accent: "#ead6ff" },
    adminOnly: true,
  },
]

export const skinArt = (id: string | null | undefined) => SKINS.find((s) => s.id === id) ?? null
