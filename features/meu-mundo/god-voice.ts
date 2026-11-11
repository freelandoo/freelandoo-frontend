// features/meu-mundo/god-voice.ts — lore v2 C2 (cap. 3, "Néctar"): a VOZ DOS DEUSES.
//
// No fim de uma partida, o deus daquele jogo fala com quem jogou — e só com ele
// (historia/v2/07-falas-e-arquivo.md §4: "uma voz que mais ninguém ouve"). Sem
// áudio: um balão por cima do placar final, por VOICE_MS, no máximo uma vez por
// partida, e só a partir do cap. 3 (antes disso ninguém ouve deus nenhum).
// Só apresentação: nada aqui decide prêmio, néctar ou passo de missão.
// Texto: ui/quest/god-voice-text.json ([pt, en, es]; scripts/i18n-meu-mundo-vozes-merge.js).
// Os caps. 8 (Kragor, C5: voiceKeyFor) e 10 (Noctis, C6) trocam o sorteio por falas próprias.

/** O deus de cada jogável (Lâminas e Hall não têm deus dono). */
export const VOICE_GODS = {
  maru: "gincana",
  iris: "paint",
  kragor: "boxe",
  aeryn: "jetpack",
  zephyra: "corrida",
  noctis: "noturno",
} as const
export type VoiceGod = keyof typeof VOICE_GODS

/** Quantas falas cada deus tem (`qv_<deus>_1` … `_n`). */
export const VOICE_LINES: Record<VoiceGod, number> = { maru: 3, iris: 3, kragor: 2, aeryn: 2, zephyra: 2, noctis: 2 }

/** Quanto tempo o balão fica na tela (ms). */
export const VOICE_MS = 4_000

/** O capítulo de agora já é o 3 (aberto) ou depois. `chapter` = n do capítulo atual. */
export function voiceOpen(q: { chapter: number; locked: unknown } | null | undefined): boolean {
  if (!q) return false
  return q.chapter > 3 || (q.chapter === 3 && !q.locked)
}

/** A fala sorteada (chave i18n). */
export function voiceKey(god: VoiceGod, rnd: () => number = Math.random): string {
  const n = VOICE_LINES[god]
  return `qv_${god}_${Math.min(n, 1 + Math.floor(rnd() * n))}`
}

export const voiceNameKey = (god: VoiceGod) => `qv_${god}_name`

// ── C3 (cap. 5): BASTOR no topo do Paint ────────────────────────────────────
// Não é voz de placar: quem chega à ilha do Guardião (a sala grava paintTop) ouve
// o deus dos bichos, em cima da luta. No cap. 5 as duas falas do capítulo, em
// sequência; fora dele, a solta (07-falas §6). Só apresentação.
export const BASTOR_NAME_KEY = "qn_bastor_name"

/** As falas de Bastor para quem está neste capítulo (chaves i18n, em ordem). */
export function bastorLines(q: { chapter: number; locked: unknown } | null | undefined): string[] {
  if (q && q.chapter === 5 && !q.locked) return ["qn_bastor_cap5_1", "qn_bastor_cap5_2"]
  return ["qn_bastor_idle_1"]
}

// ── C4 (cap. 6): o ECO da ponte, na Arena das Lâminas ─────────────────────────
// Os adversários da Arena são Ecos (almas presas repetindo a última luta). No passo
// "ecos" do cap. 6, o Eco da luta diz uma das frases da ponte quando a luta começa
// (07-falas §7). Só apresentação: o passo é a vitória conferida pelo servidor.
export const ECO_NAME_KEY = "qn_eco_name"
export const ECO_LINES = ["qn_eco_1", "qn_eco_2", "qn_eco_3"] as const

/** O pedaço do GET /quest que decide quem fala na luta. */
export interface FightQuest {
  id: string
  locked: unknown
  current: { key: string } | null
}
const atStep = (q: FightQuest | null | undefined, chapter: string, step: string) => !!q && q.id === chapter && !q.locked && !!q.current && q.current.key === step

/** A fala do Eco nesta luta (chave i18n) ou null fora do passo. */
export function ecoLine(q: FightQuest | null | undefined, rnd: () => number = Math.random): string | null {
  if (!atStep(q, "cap6", "ecos")) return null
  return ECO_LINES[Math.min(ECO_LINES.length - 1, Math.floor(rnd() * ECO_LINES.length))]
}

// ── C4 (cap. 7): a Dama das Garras não fala; ESCREVE ─────────────────────────
// No passo "telhados", a luta contra ela mostra o que ela risca na parede (as duas
// frases, uma depois da outra) e, se quem joga vence, a terceira, pela classe de quem
// lê: "VOCÊ." para a Raposa, "FORAM ELES." para o Vampiro (07-falas §8).
/** O que ela escreve durante a luta (chaves i18n, em ordem) — vazio fora do passo. */
export function clawWritings(q: FightQuest | null | undefined): string[] {
  return atStep(q, "cap7", "telhados") ? ["qw_garras_1", "qw_garras_2"] : []
}
/** O que ela escreve depois da derrota dela, ou null fora do passo. */
export function clawAfterWin(q: FightQuest | null | undefined, clan: "raposa" | "vampiro" | null): string | null {
  return atStep(q, "cap7", "telhados") ? `qw_garras_3_${clan === "vampiro" ? "vampiro" : "raposa"}` : null
}

// ── C5 (cap. 8, "Pedraverde"): Kragor no Boxe, o Brutamontes e o Golem ─────
// 07-falas §9. Só apresentação: os passos são a vitória conferida e a visita que o
// SERVIDOR grava (visit:golem só sem arma equipada, POST /domains/place).

/** No cap. 8 (aberto), Kragor troca o sorteio de sempre pelas falas do capítulo. */
export function voiceKeyFor(god: VoiceGod, q: { chapter: number; locked: unknown } | null | undefined, rnd: () => number = Math.random): string {
  if (god === "kragor" && q && q.chapter === 8 && !q.locked) return rnd() < 0.5 ? "qv_kragor_cap8_1" : "qv_kragor_cap8_2"
  return voiceKey(god, rnd)
}

/** O Brutamontes, no passo "campeao": um balão quando a luta contra ele começa. */
export const BRUTE_NAME_KEY = "qn_brutamontes_name"
export function bruteLine(q: FightQuest | null | undefined): string | null {
  return atStep(q, "cap8", "campeao") ? "qn_brutamontes_1" : null
}

/** O Golem de Pedra: 180 vozes, balões sobrepostos, e no fim todas juntas ("FECHA."). */
export const GOLEM_NAME_KEY = "qn_golem_name"
export const GOLEM_LINES = ["qn_golem_1", "qn_golem_2", "qn_golem_3", "qn_golem_4"] as const
export const GOLEM_CLOSE = "qn_golem_5"
/** Chegou armado: uma voz só, firme (o passo não conta). */
export const GOLEM_ARMED = "qn_golem_armado"
