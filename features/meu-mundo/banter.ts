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
/** Em volta, fora dos prédios: NPC, casa (a dele e a dos outros), geladeira, carro. */
export const LIFE_TOPICS = ["see_npc", "house_mine", "house_other", "fridge", "ride_car", "ride_crash"] as const
/**
 * Dentro dos minijogos e da luta (prefixo `mg_`): quem fala é o balão do
 * minijogo (ui/inbox/minigame-banter.tsx), não o card da rua. Aqui o personagem
 * comenta o JEITO de quem joga: bateu, caiu, tá parado, tá ruim de controle.
 */
export const MINIGAME_TOPICS = ["mg_start", "mg_crash", "mg_fall", "mg_careful", "mg_good", "mg_boost", "mg_fuel", "mg_hurt", "mg_cat", "mg_bad", "mg_idle", "mg_win", "mg_lose"] as const
export const BANTER_TOPICS = ["see_god", "see_monster_skin", "see_rival", "see_kin", "see_crowd", ...MOB_TOPICS, "fight_win", "fight_lose", ...PLACE_TOPICS, ...LIFE_TOPICS, ...MINIGAME_TOPICS] as const
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
  const is = (...list: BanterTopic[]) => list.includes(topic)
  /** Deu ruim: bateu, caiu, apanhou, perdeu, acabou o combustível. */
  const bad = is("fight_lose", "mg_lose", "mg_crash", "mg_fall", "mg_hurt", "mg_fuel", "ride_crash")
  switch (temper) {
    case "psicopata":
      // regra do Alex: o psicopata tem cara de raiva quase sempre; só ri quando ganha
      return is("fight_win", "mg_win") ? "happy" : "angry"
    case "covarde":
      if (is("fight_win", "see_kin", "place_church", "place_study", "place_food", "mg_win", "mg_good", "house_mine", "fridge", "see_npc", "mg_cat")) return "happy"
      return "sad"
    case "comilao":
      if (bad || is("place_hospital", "mob_stone", "mob_wolf", "mg_bad")) return "sad"
      return "happy"
    case "bondoso":
      if (bad || mob) return "sad"
      if (is("see_kin", "see_god", "place_church", "place_lab", "house_mine", "see_npc", "mg_cat")) return "loving"
      return "happy"
    case "competitivo":
      return bad || is("see_rival", "mg_bad", "mg_idle", "mg_careful") ? "angry" : "happy"
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
/** Fim de luta e de partida falam sempre (é a reação que a pessoa espera). */
const ALWAYS = new Set<BanterTopic>(["fight_win", "fight_lose", "mg_win", "mg_lose"])

/** O ritmo de quem fala: `gap` entre duas falas, `topic` para repetir o assunto, `target` o alvo. */
export interface BanterPace {
  gap: number
  topic: number
  target: number
  /** Assuntos com espera própria (a bronca não pode virar ladainha). */
  slow?: Partial<Record<BanterTopic, number>>
}
export const WORLD_PACE: BanterPace = { gap: BANTER_GAP_MS, topic: BANTER_TOPIC_MS, target: BANTER_TARGET_MS }
/** Minijogo é rápido: ele fala mais, mas a bronca ("ruim de controle", "olha pra tela") demora a voltar. */
export const MINIGAME_PACE: BanterPace = { gap: 7_000, topic: 30_000, target: 30_000, slow: { mg_bad: 75_000, mg_idle: 60_000, mg_start: 0 } }
export const isMinigameTopic = (topic: BanterTopic) => topic.startsWith("mg_")

export interface BanterMemory {
  last: number
  topics: Partial<Record<BanterTopic, number>>
  targets: Record<string, number>
}
export const emptyBanterMemory = (): BanterMemory => ({ last: -Infinity, topics: {}, targets: {} })

/** Pode falar agora? Se pode, já anota na memória. */
export function banterGate(m: BanterMemory, e: BanterEvent, now: number, pace: BanterPace = WORLD_PACE): boolean {
  if (!ALWAYS.has(e.topic)) {
    if (now - m.last < pace.gap) return false
    if (now - (m.topics[e.topic] ?? -Infinity) < (pace.slow?.[e.topic] ?? pace.topic)) return false
    if (e.target && now - (m.targets[e.target] ?? -Infinity) < pace.target) return false
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

// ── dentro dos minijogos: o que a partida avisou → o assunto da fala ────────
export type MinigameId = "corrida" | "noturno" | "jetpack" | "gincana" | "paint" | "luta"
/** O aviso do minijogo, só com o que interessa aqui (cada jogo tem o seu tipo completo). */
export interface MinigameNotice {
  kind: string
  place?: number
  best?: boolean
  mine?: boolean
  on?: boolean
}

const placeTopicOf = (place: number | undefined): BanterTopic | null => (place === 1 ? "mg_win" : place !== undefined && place >= 3 ? "mg_lose" : null)

/** Puro: o assunto de um aviso (null = ele não comenta). */
export function minigameTopic(game: MinigameId, n: MinigameNotice): BanterTopic | null {
  if (n.kind === "go") return "mg_start"
  switch (game) {
    case "corrida":
      if (n.kind === "wall") return "mg_crash"
      if (n.kind === "fell") return "mg_fall"
      if (n.kind === "pad" || n.kind === "turbo") return "mg_boost"
      if (n.kind === "lap") return n.best ? "mg_good" : null
      if (n.kind === "finish") return placeTopicOf(n.place)
      return null
    case "noturno":
      if (n.kind === "stumble") return "mg_crash"
      if (n.kind === "trick") return "mg_good"
      if (n.kind === "power" || n.kind === "smash") return "mg_boost"
      return null
    case "jetpack":
      if (n.kind === "low" || n.kind === "empty") return "mg_fuel"
      if (n.kind === "can") return "mg_good"
      return null
    case "gincana":
      if (n.kind === "hit") return "mg_crash"
      if (n.kind === "splash") return "mg_fall"
      if (n.kind === "cp") return "mg_good"
      if (n.kind === "logo") return "mg_boost"
      if (n.kind === "finish") return placeTopicOf(n.place)
      if (n.kind === "timeout") return "mg_lose"
      return null
    case "paint":
      if (n.kind === "hurt") return "mg_hurt"
      if (n.kind === "fell") return "mg_fall"
      if (n.kind === "cat") return n.mine ? "mg_cat" : null
      if (n.kind === "ko") return "mg_good"
      if (n.kind === "out") return "mg_lose"
      if (n.kind === "morkhan") return n.on && n.mine ? "mg_careful" : null
      return null
    case "luta":
      if (n.kind === "low") return "mg_hurt"
      if (n.kind === "danger") return "mg_careful"
      return null
  }
}

/** Erros seguidos que viram bronca: BAD.n em BAD.ms = "nossa, você é ruim de controle". */
export const BAD = { n: 3, ms: 25_000 } as const
const MISTAKES = new Set<BanterTopic>(["mg_crash", "mg_fall", "mg_hurt"])
export interface PlayWatch {
  mistakes: number[]
}
export const emptyPlayWatch = (): PlayWatch => ({ mistakes: [] })

/** Puro: os candidatos de um aviso, com a bronca na frente quando os erros se acumulam. */
export function minigameEvents(watch: PlayWatch, game: MinigameId, n: MinigameNotice, now: number): BanterEvent[] {
  const topic = minigameTopic(game, n)
  if (!topic) return []
  if (topic === "mg_start") watch.mistakes = []
  if (!MISTAKES.has(topic)) return [{ topic }]
  watch.mistakes = [...watch.mistakes.filter((at) => now - at < BAD.ms), now]
  return watch.mistakes.length >= BAD.n ? [{ topic: "mg_bad" }, { topic }] : [{ topic }]
}

const playWatch = emptyPlayWatch()
/** As telas dos minijogos chamam no `onNotice` (uma linha por jogo). */
export function emitMinigame(game: MinigameId, n: MinigameNotice, now = Date.now()) {
  emitBanter(...minigameEvents(playWatch, game, n, now))
}

/** Parado há IDLE_MS com a partida rodando = "olha pra tela, para de conversar aí". */
export const IDLE_MS = 9_000

// ── o rosto de quem fala (a Corrida não recebe o corpo: a casca do jogo avisa) ──
let face: string | null = null
export function setBanterBody(body: string | null) {
  face = body
}
export const banterBody = () => face

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
