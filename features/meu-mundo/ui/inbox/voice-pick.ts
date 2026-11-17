// features/meu-mundo/ui/inbox/voice-pick.ts — as VERSÕES de cada fala e o sorteio sem repetir.
//
// Pedido do Alex (2026-11-17): o personagem falava a mesma coisa todo dia ("Você nem liga pra
// mim, né?"; o aviso de fome sempre igual). Cada fala que era única ganhou 5 versões a mais pela
// personalidade (sarcásticas, humor ácido) em `voice-variants.json` ({ chave: [pt, en, es] };
// i18n em scripts/i18n-mm-falas-versoes-merge.js). Só apresentação: nada aqui mexe em regra.
//
// Nomes: `<chave>_v1…_v5` são as versões de uma fala que já existia; `chHurt_<personalidade>_N`
// e `chLove_<personalidade>_N` são a mágoa e o carinho na voz de cada um.

import TEXT from "./voice-variants.json"

/** As versões novas (o pt é o fallback do `t`). */
export const VOICE_PT: Record<string, string[]> = TEXT

/** A chave e as versões que existem dela (`_v1`…`_v5`). */
export function withVariants(key: string): string[] {
  const out = [key]
  for (let i = 1; i <= 5; i++) if (VOICE_PT[`${key}_v${i}`]) out.push(`${key}_v${i}`)
  return out
}

/** As chaves `prefixo_1`…`prefixo_5` que existem (mágoa/carinho por personalidade). */
export function numbered(prefix: string): string[] {
  const out: string[] = []
  for (let i = 1; i <= 5; i++) if (VOICE_PT[`${prefix}_${i}`]) out.push(`${prefix}_${i}`)
  return out
}

// ── sem repetir: as últimas falas de cada família ficam de fora do sorteio ──────────────
const STORE = "mm_voice_recent_v1"
let recent: Record<string, string[]> | null = null
function load(): Record<string, string[]> {
  if (recent) return recent
  recent = {}
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORE) : null
    if (raw) recent = JSON.parse(raw) as Record<string, string[]>
  } catch {
    recent = {}
  }
  return recent
}
function save() {
  try {
    if (typeof window !== "undefined" && recent) window.localStorage.setItem(STORE, JSON.stringify(recent))
  } catch {
    /* sem armazenamento: o sorteio segue, só não lembra depois de recarregar */
  }
}

/**
 * Escolhe uma das `keys` que não saiu nas últimas vezes daquela família (guarda até metade
 * da lista, no máximo 4: com 6 versões, as 3 últimas não voltam). `roll` 0–1 para testar.
 */
export function pickFresh(family: string, keys: readonly string[], roll = Math.random()): string {
  if (keys.length <= 1) return keys[0]
  const mem = load()
  const last = mem[family] ?? []
  const pool = keys.filter((k) => !last.includes(k))
  const from = pool.length ? pool : keys
  const key = from[Math.min(from.length - 1, Math.floor(roll * from.length))]
  const keep = Math.min(4, Math.floor(keys.length / 2))
  mem[family] = [key, ...last.filter((k) => k !== key)].slice(0, keep)
  save()
  return key
}

/**
 * A mesma escolha enquanto o card está na tela (a tela redesenha muitas vezes) e outra quando
 * ele volta depois de `holdMs`: o aviso de necessidade é lido no render.
 */
const sticky = new Map<string, { key: string; at: number }>()
export function pickSticky(family: string, keys: readonly string[], now = Date.now(), holdMs = 20 * 60_000): string {
  const s = sticky.get(family)
  if (s && now - s.at < holdMs && keys.includes(s.key)) return s.key
  const key = pickFresh(family, keys)
  sticky.set(family, { key, at: now })
  return key
}

/** Para os testes: esquece a memória. */
export function resetVoiceMemory() {
  recent = {}
  sticky.clear()
}
