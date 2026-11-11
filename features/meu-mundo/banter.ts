// features/meu-mundo/banter.ts — o personagem REAGE ao que está em volta, pela personalidade.
//
// Pedido do Alex (2026-11-10): "os nossos personagens reagem a tudo ao seu
// redor, conhecem até quem está perto; se é um Deus: olha que Deus de merda;
// olha aquele brutamontes chifrudo". Falas humanas e informais; só o bondoso é
// mais formal; o psicopata xinga e é sarcástico.
//
// Só apresentação: nada aqui muda regra, prêmio ou luta. O motor (engine/game.ts)
// e as telas avisam O QUE aconteceu (`emitBanter`); a casca do jogo escolhe a
// fala pela personalidade e mostra como card do personagem (não vai ao sino).
// Texto: ui/inbox/banter-text.json ([pt, en, es]; scripts/i18n-meu-mundo-falas-merge.js).

import type { Temper } from "./soul"
import type { CenterPlaceId } from "./types"
import TEXT from "./ui/inbox/banter-text.json"

const PT: Record<string, string[]> = TEXT
type Tr = (key: string, fallback: string) => string
type Emotion = "happy" | "sad" | "loving" | "angry" | "tired" | "sick"

export const MOB_TOPICS = ["mob_brute", "mob_wolf", "mob_stone", "mob_ciborgue", "mob_garras", "mob_cavaleiro"] as const
export const PLACE_TOPICS = [
  "place_food",
  "place_market",
  "place_study",
  "place_gym",
  "place_forge",
  "place_lab",
  "place_game",
  "place_arena",
  "place_church",
  "place_police",
  "place_hospital",
] as const
export const BANTER_TOPICS = ["see_god", "see_monster_skin", "see_rival", "see_kin", "see_crowd", ...MOB_TOPICS, "fight_win", "fight_lose", ...PLACE_TOPICS] as const
export type BanterTopic = (typeof BANTER_TOPICS)[number]

export interface BanterEvent {
  topic: BanterTopic
  /** Nome que entra na fala ({god}): o deus ou o monstro que ele viu. */
  god?: string
  /** Quem/qual foi visto: o mesmo alvo não rende duas falas seguidas. */
  target?: string
}

const SHORT: Record<Temper, string> = { psicopata: "psy", covarde: "cow", comilao: "glu", bondoso: "kind", competitivo: "comp" }
export const TEMPERS = Object.keys(SHORT) as Temper[]

/** Prédio do centro → assunto da fala. */
export const PLACE_TOPIC: Record<CenterPlaceId, (typeof PLACE_TOPICS)[number]> = {
  pizzaria: "place_food",
  hamburgueria: "place_food",
  supermercado: "place_market",
  universidade: "place_study",
  biblioteca: "place_study",
  escola: "place_study",
  academia: "place_gym",
  forja: "place_forge",
  arsenal: "place_forge",
  criolab: "place_lab",
  jetpack: "place_game",
  paint: "place_game",
  corrida: "place_game",
  noturno: "place_game",
  gincana: "place_game",
  boxe: "place_arena",
  laminas: "place_arena",
  igreja: "place_church",
  delegacia: "place_police",
  hospital: "place_hospital",
}
export const placeTopic = (id: string): BanterTopic | null => (Object.prototype.hasOwnProperty.call(PLACE_TOPIC, id) ? PLACE_TOPIC[id as CenterPlaceId] : null)

/** As chaves de fala de um assunto para uma personalidade (`bt_<assunto>_<p>_<n>`). */
export function banterKeys(topic: BanterTopic, temper: Temper): string[] {
  const prefix = `bt_${topic}_${SHORT[temper]}_`
  return Object.keys(PT).filter((k) => k.startsWith(prefix))
}

/** O rosto que acompanha a fala (só as 6 emoções do jogo). */
export function banterEmotion(topic: BanterTopic, temper: Temper): Emotion {
  const mob = topic.startsWith("mob_")
  switch (temper) {
    case "psicopata":
      return topic === "fight_win" ? "happy" : "angry"
    case "covarde":
      if (topic === "fight_win" || topic === "see_kin" || topic === "place_church" || topic === "place_study" || topic === "place_food") return "happy"
      return "sad"
    case "comilao":
      if (topic === "fight_lose" || topic === "place_hospital" || topic === "mob_stone" || topic === "mob_wolf") return "sad"
      return "happy"
    case "bondoso":
      if (topic === "fight_lose" || mob) return "sad"
      if (topic === "see_kin" || topic === "see_god" || topic === "place_church" || topic === "place_lab") return "loving"
      return "happy"
    case "competitivo":
      return topic === "fight_lose" || topic === "see_rival" ? "angry" : "happy"
  }
}

/** Uma fala para o que aconteceu (sorteio por `roll` 0–1, para dar para testar). */
export function banterLine(temper: Temper, e: BanterEvent, t: Tr, roll = Math.random()): { title: string; emotion: Emotion } | null {
  const keys = banterKeys(e.topic, temper)
  if (!keys.length) return null
  const key = keys[Math.min(keys.length - 1, Math.floor(roll * keys.length))]
  const title = t(key, PT[key]?.[0] ?? key).replaceAll("{god}", e.god ?? "")
  return { title, emotion: banterEmotion(e.topic, temper) }
}

/** A frase de uma necessidade na voz da personalidade (null = a frase padrão). */
export function needVoice(need: string, temper: Temper | null | undefined, t: Tr): string | null {
  if (!temper) return null
  const key = `need_${need}_${SHORT[temper]}`
  return PT[key] ? t(key, PT[key][0]) : null
}

/** A resposta do personagem a uma conversa de NPC / a um capítulo (sufixo da chave). */
export const temperSuffix = (temper: Temper) => SHORT[temper]

// ── quando ele fala (para não virar matraca) ────────────────────────────────
/** Entre duas reações quaisquer. */
export const BANTER_GAP_MS = 25_000
/** O mesmo assunto de novo. */
export const BANTER_TOPIC_MS = 3 * 60_000
/** O mesmo alvo (aquele jogador, aquele monstro, aquele prédio) de novo. */
export const BANTER_TARGET_MS = 10 * 60_000
/** Fim de luta fala sempre (é a reação que a pessoa espera). */
const ALWAYS = new Set<BanterTopic>(["fight_win", "fight_lose"])

export interface BanterMemory {
  last: number
  topics: Partial<Record<BanterTopic, number>>
  targets: Record<string, number>
}
export const emptyBanterMemory = (): BanterMemory => ({ last: -Infinity, topics: {}, targets: {} })

/** Pode falar agora? Se pode, já anota na memória. */
export function banterGate(m: BanterMemory, e: BanterEvent, now: number): boolean {
  if (!ALWAYS.has(e.topic)) {
    if (now - m.last < BANTER_GAP_MS) return false
    if (now - (m.topics[e.topic] ?? -Infinity) < BANTER_TOPIC_MS) return false
    if (e.target && now - (m.targets[e.target] ?? -Infinity) < BANTER_TARGET_MS) return false
  }
  m.last = now
  m.topics[e.topic] = now
  if (e.target) {
    m.targets[e.target] = now
    const keys = Object.keys(m.targets)
    if (keys.length > 80) for (const k of keys.slice(0, keys.length - 80)) delete m.targets[k]
  }
  return true
}

// ── o aviso (motor e telas → casca do jogo) ─────────────────────────────────
/** Recebe os candidatos em ordem de interesse; fala o primeiro que a memória deixar. */
type Listener = (events: BanterEvent[]) => void
const listeners = new Set<Listener>()
export function emitBanter(...events: BanterEvent[]) {
  if (events.length) for (const l of listeners) l(events)
}
export function onBanter(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

// ── o que ele VÊ (o motor chama a cada ~1,5 s; puro, para dar para testar) ──
export interface SeenPlayer {
  sid: string
  body: string
  /** distância em metros */
  d: number
}
export interface SeenMob {
  id: number
  kind: string
  d: number
}
export const SIGHT = { player: 9, mob: 16, crowd: 5 } as const

const clanOf = (body: string): "raposa" | "vampiro" | null => (body.startsWith("raposa") ? "raposa" : body.startsWith("vampir") ? "vampiro" : null)

/**
 * O que vale um comentário agora, do mais chamativo ao menos: monstro, deus,
 * jogador com corpo de monstro, multidão, povo rival, o próprio povo.
 * `names` traduz o id do corpo no nome que entra na fala.
 */
export function sightEvents(myBody: string, players: SeenPlayer[], mobs: SeenMob[], gods: readonly string[], monsters: readonly string[], names: Record<string, string>): BanterEvent[] {
  const out: BanterEvent[] = []
  const mob = mobs.filter((m) => m.d <= SIGHT.mob).sort((a, b) => a.d - b.d)[0]
  if (mob && (MOB_TOPICS as readonly string[]).includes(`mob_${mob.kind}`)) out.push({ topic: `mob_${mob.kind}` as BanterTopic, target: `mob:${mob.id}` })
  const near = players.filter((p) => p.d <= SIGHT.player).sort((a, b) => a.d - b.d)
  const god = near.find((p) => gods.includes(p.body))
  if (god) out.push({ topic: "see_god", god: names[god.body] ?? god.body, target: `p:${god.sid}` })
  const monster = near.find((p) => monsters.includes(p.body))
  if (monster) out.push({ topic: "see_monster_skin", god: names[monster.body] ?? monster.body, target: `p:${monster.sid}` })
  if (near.length >= SIGHT.crowd) out.push({ topic: "see_crowd" })
  const mine = clanOf(myBody)
  if (mine) {
    const rival = near.find((p) => clanOf(p.body) && clanOf(p.body) !== mine)
    if (rival) out.push({ topic: "see_rival", target: `p:${rival.sid}` })
    const kin = near.find((p) => clanOf(p.body) === mine)
    if (kin) out.push({ topic: "see_kin", target: `p:${kin.sid}` })
  }
  return out
}
