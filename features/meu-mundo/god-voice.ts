// features/meu-mundo/god-voice.ts — lore v2 C2 (cap. 3, "Néctar"): a VOZ DOS DEUSES.
//
// No fim de uma partida, o deus daquele jogo fala com quem jogou — e só com ele
// (historia/v2/07-falas-e-arquivo.md §4: "uma voz que mais ninguém ouve"). Sem
// áudio: um balão por cima do placar final, por VOICE_MS, no máximo uma vez por
// partida, e só a partir do cap. 3 (antes disso ninguém ouve deus nenhum).
// Só apresentação: nada aqui decide prêmio, néctar ou passo de missão.
// Texto: ui/quest/god-voice-text.json ([pt, en, es]; scripts/i18n-meu-mundo-vozes-merge.js).
// Os caps. 8 (Kragor) e 10 (Noctis) trocam o sorteio por falas próprias: fatias C5/C6.

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
