// features/meu-mundo/data.ts — adaptador de dados do bairro.
//
// Desde o mm3d-02 o bairro é PERSISTENTE: a resposta traz o bairro do usuário
// (residência alocada ou recuperada no servidor) e a reserva da sala online.
// Quem decide quem pode ver é o SERVIDOR (auth + papel Administrator): 401 e
// 403 voltam como estado, e a tela não carrega o motor 3D sem resposta válida.

import { serverErrorText } from "./server-errors"
import type { BuildingsState } from "./buildings"
import { meuMundoCheckoutCoupon } from "@/lib/share-coupon"
import type {
  CenterPayload,
  HospitalInfo,
  HousePayload,
  InboxCounts,
  InteriorDef,
  InventoryResult,
  JetpackSession,
  LifeFull,
  LifeSummary,
  MailTab,
  MMMail,
  MMNotice,
  MultiplayerSession,
  PaintSession,
  CorridaSession,
  NoturnoSession,
  GincanaSession,
  NeighborhoodPayload,
  NoticeFilter,
  PlayerProfile,
  PolenProduct,
  ScenePayload,
  ShopCatalog,
  VisitState,
  Wallets,
  CharactersResult,
  CharacterCertificate,
} from "./types"
import type { Clan, Sex } from "./classes"
import type { BodyId, PracticeAttr } from "./types"
import type { BossId, FightTemper, GearBonus, GodId, MobKind } from "./laminas/sim/fight"
import type { FightFrames } from "./laminas/sim/replay"

export type NeighborhoodResult =
  | { ok: true; payload: ScenePayload }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "network" | "needs_clan" }

export async function fetchAdminNeighborhood(
  token: string,
  signal: AbortSignal,
): Promise<NeighborhoodResult> {
  let res: Response
  try {
    res = await fetch("/api/meu-mundo/admin/neighborhood", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    })
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err
    return { ok: false, reason: "network" }
  }
  if (res.status === 401) return { ok: false, reason: "unauthenticated" }
  if (res.status === 403) return { ok: false, reason: "forbidden" }
  // mm3d-58: sem classe o servidor não entrega o bairro — a escolha abre antes.
  if (res.status === 409) {
    const e = (await res.json().catch(() => null)) as { code?: string } | null
    if (e?.code === "needs_clan") return { ok: false, reason: "needs_clan" }
  }
  if (!res.ok) return { ok: false, reason: "network" }

  const body = (await res.json().catch(() => null)) as ScenePayload | null
  return isValidScene(body) ? { ok: true, payload: body } : { ok: false, reason: "invalid" }
}

/** Confere a forma de qualquer ambiente (rua ou interior). */
export function isValidScene(body: unknown): body is ScenePayload {
  const b = body as ScenePayload | null
  if (b && (b as HousePayload).scene === "house") return isValidHouse(b as HousePayload)
  if (b && (b as CenterPayload).scene === "center") return isValidCenter(b as CenterPayload)
  return isValidPayload(b as NeighborhoodPayload | null)
}

function isValidCenter(b: CenterPayload): boolean {
  const c = b?.center
  return (
    !!c &&
    Array.isArray(c.places) &&
    c.places.length > 0 &&
    c.places.every((p) => typeof p.id === "string" && !!p.rect && !!p.interact && !!p.origin) &&
    Array.isArray(c.obstacles) &&
    !!c.arrival &&
    !!c.portal &&
    !!c.plaza &&
    !!b.me &&
    typeof b.sceneKey === "string"
  )
}

function isValidHouse(b: HousePayload): boolean {
  const d = b?.interior
  return (
    !!d &&
    Array.isArray(d.floors) &&
    d.floors.length > 0 &&
    d.floors.every((f) => Array.isArray(f.boxes) && Array.isArray(f.rooms) && !!f.bounds) &&
    Array.isArray(d.seats) &&
    !!d.entry &&
    !!d.exit &&
    !!b.house &&
    !!b.me
  )
}

/**
 * Reserva nova para (re)conectar. O servidor revalida login, papel e
 * residência. null = sem acesso (não insistir); lança em falha de rede.
 */
export async function fetchSession(token: string): Promise<(MultiplayerSession & { sceneKey?: string }) | null> {
  const res = await fetch("/api/meu-mundo/admin/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (res.status === 401 || res.status === 403 || res.status === 409) return null
  if (!res.ok) throw new Error(`session ${res.status}`)
  const body = (await res.json().catch(() => null)) as { multiplayer?: MultiplayerSession; sceneKey?: string } | null
  if (!body?.multiplayer?.reservation) throw new Error("session inválida")
  return { ...body.multiplayer, sceneKey: body.sceneKey }
}

// ═══ mm3d-09: casa e visitas ════════════════════════════════════════════════
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; code?: string }

async function call<T>(token: string, method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(`/api/meu-mundo/admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })
  } catch {
    return { ok: false, status: 0, error: "network" }
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null
  if (!res.ok || !data) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`), code: data?.code }
  return { ok: true, data }
}

// ═══ mm3d-58: classes ════════════════════════════════════════════════════════
export interface ClanState {
  clan: Clan | null
  sex: Sex | null
  changedAt: string | null
  changes: number
  artifacts: number
  cooldownDays: number
}
export const fetchClan = (token: string) => call<ClanState>(token, "GET", "/clan")
/** Escolha da classe (uma vez). O servidor já muda a casa para um bairro da classe. */
export const postClanChoose = (token: string, clan: Clan, sex: Sex) => call<ClanState>(token, "POST", "/clan", { clan, sex })
/** Troca pelo artefato (consumido). Depois o jogo recarrega (casa nova). */
export const postClanChange = (token: string, clan: Clan) => call<ClanState>(token, "POST", "/clan/change", { clan })

/** Entrar na casa do lote (o servidor confere posição, propriedade e convite). */
export const postHouseEnter = (token: string, lot: number) => call<ScenePayload>(token, "POST", "/house/enter", { lot })
/** Sair pela porta: devolve a rua do bairro da casa. */
export const postHouseExit = (token: string) => call<ScenePayload>(token, "POST", "/house/exit", {})
/** Ir ao centro (mm3d-17): da rua do bairro, a pé ou com o veículo. O servidor reserva a sala. */
export const postCenterEnter = (token: string) => call<ScenePayload>(token, "POST", "/center/enter", {})
/** Voltar para casa: o servidor decide o bairro (o da residência). */
export const postCenterLeave = (token: string) => call<ScenePayload>(token, "POST", "/center/leave", {})
/** Jetpack (mm3d-63): lugar numa sala do centro (perto da porta); `solo` = sala só sua, larga na hora; `phase` = a fase (mm3d-75). */
export const postJetpackJoin = (token: string, solo: boolean, body: string, phase?: string) =>
  call<JetpackSession>(token, "POST", "/center/jetpack", { solo, body, ...(phase ? { phase } : {}) })
/** Paint (mm3d-35): lugar numa sala do centro (perto da porta), no modo pedido. */
export const postPaintJoin = (token: string, mode: string, roomId?: string | null, map?: string) =>
  call<PaintSession>(token, "POST", "/center/paint", { mode, ...(roomId ? { roomId } : {}), ...(map ? { map } : {}) })
/** Corrida em grupo (mm3d-39b): a sala espera até 1 minuto e completa 6 naves com o computador. */
export const postCorridaJoin = (token: string, ship?: string, track?: string) =>
  call<CorridaSession>(token, "POST", "/center/corrida", { ...(ship ? { ship } : {}), ...(track ? { track } : {}) })
/** Rolê Noturno em grupo (mm3d-42): espera até 1 minuto; todos na mesma rua. */
export const postNoturnoJoin = (token: string, ride: string, body: string, phase?: string) => call<NoturnoSession>(token, "POST", "/center/noturno", { ride, body, phase })
/** Gincana em grupo (mm3d-47): espera até 1 minuto; o computador completa as 8 vagas. */
export const postGincanaJoin = (token: string, body: string) => call<GincanaSession>(token, "POST", "/center/gincana", { body })
export const getVisits = (token: string) => call<VisitState>(token, "GET", "/visits")
export const getInviteCandidates = (token: string) =>
  call<{ candidates: { name: string; available: boolean; reason: string | null }[] }>(token, "GET", "/visits/candidates")
export const postInvite = (token: string, name: string) => call<{ visit: VisitState }>(token, "POST", "/visits", { name })
export const postAccept = (token: string, id: string) =>
  call<{ stay: boolean; scene?: ScenePayload; visits?: VisitState }>(token, "POST", `/visits/${encodeURIComponent(id)}/accept`, {})
export const postDecline = (token: string, id: string) => call<{ ok: true }>(token, "POST", `/visits/${encodeURIComponent(id)}/decline`, {})
export const postCancel = (token: string, id: string) => call<{ ok: true }>(token, "POST", `/visits/${encodeURIComponent(id)}/cancel`, {})
export const postEndVisit = (token: string, id: string) =>
  call<{ ok: true; scene?: ScenePayload | null; visits?: VisitState }>(token, "POST", `/visits/${encodeURIComponent(id)}/end`, {})

// ═══ mm3d-13: vida do hóspede (tela de STATUS) ═══════════════════════════════
/** Hóspede + carteira + diário + linha do tempo + catálogo (a tela de STATUS). */
export const getLife = (token: string) => call<LifeFull>(token, "GET", "/life")

// ═══ mm3d-59: luta conferida pelo servidor, recibos e XP de aventura ═══════
export type FightOrigin = "laminas" | "boxe" | "mob" | "tutorial" | "domain" | "god"
export interface FightTicket {
  ticket: string
  origin: FightOrigin
  setup: {
    kind: MobKind
    level: number
    seed: number
    stats: { strength: number; speed: number; intelligence: number; dexterity: number }
    style: "mage" | null
    /** "hammer" = golpes do Brutamontes (só desenho; a regra é a do corpo a corpo). */
    /** "bow" = flechas de luz (só desenho; a regra é a do tiro da maga). */
    kit?: "hammer" | "bow" | "gun" | null
    /** Bônus do equipamento (com teto); o Boxe é de luvas: null. */
    gear: Partial<GearBonus> | null
    /** Nível de aventura de quem joga (vida/defesa/ataque crescem com ele). */
    hero?: number
    peer?: number | null
    tier?: "arena" | "street" | "domain" | null
    /** Lore v2 D1: o setor do Domínio (o servidor escolhe monstro e nível por ele). */
    domain?: DomainId | null
    sector?: number | null
    /** Lore v2 D4: o deus chefão do setor 10 (luta em fases; a regra lê daqui). */
    boss?: BossId | null
    /** Lore v2 N4: o deus solto (a regra dá a ele 2× a ficha de quem enfrenta). */
    god?: GodId | null
    /** Trilha E16: consumível de preparo gasto nesta luta (soma depois do teto do equipamento). */
    prep?: { key: keyof GearBonus; v: number; item?: string } | null
    body?: string | null
    appearance?: { weaponId: string | null; level: number; shieldId?: string | null; cosmetic: string | null; awakened?: string | null }
    /** mm3d-72: personalidade e afeto (probabilidades da luta). */
    temper?: FightTemper | null
    affection?: number | null
  }
  expiresAt: string
}
export interface LevelDelta {
  xp: number
  total: number
  from: number
  to: number
  into: number
  need: number
  unlocks: string[]
}
/** O recibo de uma concessão (o eventId é a identidade da celebração). */
export interface Receipt {
  eventId: string
  source: string
  actionKey: string
  rules: string
  activeMs: number
  result: Record<string, unknown> & { win?: boolean; abandoned?: boolean; kind?: string }
  deltas: {
    xp?: LevelDelta
    /** F2 (lore v2): XP do TREINADOR (a conta) que este recibo concedeu. */
    trainer?: TrainerDelta
    attrs?: Partial<Record<PracticeAttr, number>>
    vitals?: Partial<Record<"energy" | "stress" | "satiety" | "mood" | "health", number>>
    coins?: number
  }
  /** E3: fragmento traz `progress` (quanto tem / quanto pede o item `of`). */
  items: { id: string; qty: number; rarity?: string; progress?: { of: string; have: number; need: number } }[]
  at: string
}
/** F2 (lore v2): o nível do TREINADOR é da conta (não zera ao trocar de personagem). */
export interface TrainerLevel {
  level: number
  into: number
  need: number
  total: number
}
export type TrainerDelta = Omit<LevelDelta, "unlocks">
export interface AdventureState {
  adventure: { level: number; into: number; need: number; total: number; unlocks: Record<string, string[]>; rules: string }
  trainer?: TrainerLevel
  receipts: Receipt[]
}
/** Os dois níveis para as telas (aventura = personagem; treinador = conta). */
export const advXpOf = (a: AdventureState) => ({
  level: a.adventure.level,
  into: a.adventure.into,
  need: a.adventure.need,
  trainer: a.trainer ? { level: a.trainer.level, into: a.trainer.into, need: a.trainer.need } : null,
})
/** A sala avisou que o treinador ganhou XP (cuidar/treinar): `detail` = TrainerDelta. */
export const TRAINER_CHANGED = "mm:trainer-changed"
export const startFight = (
  token: string,
  body: { origin: FightOrigin; kind?: MobKind; level?: number; mobId?: number; domain?: DomainId; sector?: number; god?: GodId; where?: "street" | "domain" },
) =>
  call<{ fight: FightTicket; abandoned: Receipt[] }>(token, "POST", "/fight/start", body)
/** Trilha E16: gasta 1 consumível de preparo e grava no ticket aberto (devolve o ticket novo). */
export const fightPrep = (token: string, ticket: string, item: string) => call<{ fight: FightTicket }>(token, "POST", "/fight/prep", { ticket, item })
export const finishFight = (token: string, ticket: string, frames: FightFrames) =>
  call<{ receipt: Receipt; replay: boolean }>(token, "POST", "/fight/finish", { ticket, frames })
/** Sonda de queda (crash-probe.ts): o que sobrou no aparelho da luta que não terminou. */
export const postClientReport = (token: string, body: Record<string, unknown>) => call<{ ok: true }>(token, "POST", "/client-report", body)
export const getAdventure = (token: string) => call<AdventureState>(token, "GET", "/adventure")

// ═══ B8 (mig 375): Lâminas = Hall — cadeiras e desafio pela vaga ═══════════
export interface HallPerson {
  id: string
  name: string
  isMe: boolean
  power: number
  body: BodyId | null
  /** já desafiei nas últimas 24 h */
  cooldown: boolean
  /** foto do perfil da Freelandoo (Hall da Fama: toque abre o card do perfil) */
  photo?: string | null
}
/** Uma posição do top 10 da Arena (Hall da Fama): `seated` false = vaga preenchida pelo Poder. */
export interface HallRank {
  pos: number
  seated: boolean
  person: (HallPerson & { defenses: number }) | null
}
export interface HallBoard {
  seats: number
  /** do 1º ao 10º (pódio 1–3, lista 4–10) */
  top: HallRank[]
  hall: (HallPerson & { seat: number; since: string; defenses: number })[]
  contenders: (HallPerson & { position: number })[]
  me: { seat: number | null; power: number; left: number; perDay: number }
  history: { id: string; role: "challenger" | "defender"; other: string; status: "open" | "won" | "lost"; seatWon: number | null; defenderSeat: number | null; at: string }[]
}
export const getHallBoard = (token: string) => call<HallBoard>(token, "GET", "/hall/board")
export const postHallChallenge = (token: string, defender: string) =>
  call<{ fight: FightTicket; challenge: { defender: string; defenderSeat: number | null; targetSeat: number | null; peer: number; myPower: number; defenderPower: number } }>(token, "POST", "/hall/challenge", { defender })

// ═══ mm3d-59 slice 3: equipamento (Armeiro, mochila, forja) ════════════════
/** Trilha E1: + offhand, relic, fragment, rune, consumable, currency (o back já aceita; itens chegam nas fatias seguintes). */
export type GearCategory =
  | "weapon" | "shield" | "armor" | "accessory" | "material" | "recipe" | "quest" | "cosmetic"
  | "offhand" | "relic" | "fragment" | "rune" | "consumable" | "currency"
export type GearRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"
/** Trilha E6 (A4): os 8 slots. O servidor ainda aceita os nomes de antes (shield/armor/acc1/acc2) no equip. */
export type GearSlot = "weapon" | "offhand" | "helm" | "chest" | "gloves" | "boots" | "amulet" | "relic"
export interface GearItem {
  id: string
  category: GearCategory
  /** E6: o slot da peça (null = não se equipa). */
  slot?: GearSlot | null
  /** E6 (A5): ocupa as duas mãos (pesadas, arcos, armas de fogo): tira o offhand. */
  twoHanded?: boolean
  /** E7: as duas chaves da peça (principal, secundária); o `bonus` é o da régua na cópia +0. */
  keys?: (keyof GearBonus)[]
  /** E7: conjunto da peça. */
  set?: string
  /** Aba do balcão de armas do Arsenal: espadas (mm3d-66) ou Hammers (mm3d-67). */
  shop?: "shields" | "weapons" | "hammers" | "bows" | "guns" | null
  name: string
  rarity: GearRarity
  /** Trilha E1: 1…6 pela raridade (Mítica = 6). */
  tier?: number
  price: number | null
  level: number
  clan: Clan | null
  bonus: Partial<GearBonus> | null
  family: string | null
  stack: boolean
  sell: number
  description?: string
  source?: string[]
  uses?: string[]
  component?: boolean
  assemblyParts?: string[]
  use?: string
  cosmeticEffect?: string
  /** E8: deus ou Domínio de origem (aurion, noctis, floresta…). */
  domain?: string
  /** E8: arma de linha (fabricada por fragmentos, não se vende). */
  line?: boolean
  /** E8: fragmento — junta `need` para fabricar `of` (de conjunto: `set`); sobra vira `powder` de Pó de Refino cada. */
  fragment?: { of: string; need: number; powder: number; set?: string }
  /** E8: onde o fragmento cai (região, chefão, tabela de saque) — para o Índice. */
  origin?: { region: string; boss: string | null; table: string; kind: "boss" | "activity" | "sector" }
  /** E11: entra numa transmutação (3 → 1 do mesmo tier). */
  transmutable?: boolean
  /** E16: consumível de preparo — a chave e quanto soma na luta. */
  prep?: { key: keyof GearBonus; v: number }
  /** E13: runa — a chave da régua que ela soma e o grau (1…5). */
  rune?: { kind: string; key: keyof GearBonus; grade: number }
  /** E13: engastes da peça +0 (pela raridade; a Ascensão soma 1). */
  sockets?: number
}
export interface GearRecipe {
  id: string
  out: string
  needs: Record<string, number>
  coins: number
  recipe: string | null
  level: number
  kind?: "part" | "assembly" | "conversion" | "equipment" | "fragment" | "prep"
  qty?: number
}
/** Trilha E9 (forge-v2): o próximo passo garantido de uma cópia, como o servidor calcula. */
export interface UpgradeView {
  rulesVersion: string
  from: number
  to: number
  coins: number
  needs: Record<string, number>
  /** Passo que pede a peça ascendida (+11 em diante). */
  ascension: boolean
  /** Por que não dá agora ("ascend" = falta a Ascensão); null = pode. */
  blocked: "ascend" | null
  bonusBefore: Partial<GearBonus>
  bonusAfter: Partial<GearBonus>
}
/** Trilha E10: o próximo grau (I…V) de uma cópia — Pó de Refino e Catalisador, nunca Esmeralda. */
export interface GradeView {
  from: number
  to: number
  coins: number
  needs: Record<string, number>
  bonusBefore: Partial<GearBonus>
  bonusAfter: Partial<GearBonus>
}
/** E15: encanto — custo do sorteio (ou o motivo), a chave secundária de agora e o sorteio esperando escolha. */
export interface EnchantView extends StepView { current: keyof GearBonus | null; offer: { key: keyof GearBonus; bonus: Partial<GearBonus> }[] | null }
/** E14/E15: custo de um passo da cópia (`needs`) ou o motivo de ainda não dar (`error` = código do servidor). */
export interface StepView { needs?: Record<string, number>; coins?: number; error?: string }
export interface RefinementProposal {
  id: string
  item: string
  fromLevel: number
  candidateLevel: number
  status: "pending" | "accepted" | "discarded" | "expired"
  expiresAt: string
  cost: { coins: number; needs: Record<string, number> }
  odds: { up: number; same: number; down: number }
  beforeBonus: Partial<GearBonus>
  candidateBonus: Partial<GearBonus>
}
export interface GearCatalog {
  slots: GearSlot[]
  cap: GearBonus
  /** E9: aprimoramento garantido +0…`max`; do `ascendFrom` em diante só ascendida. */
  upgrade: { max: number; ascendFrom: number; stone: string; rulesVersion: string }
  /** E11: desmontar devolve `share` da receita; raro ou acima (`confirmTier`) pede confirmação; transmutar `transmuteIn` → 1. */
  salvage?: { share: number; confirmTier: number; transmuteIn: number; transmuteCoins: number }
  /** E17: loja de troca (fichas → itens); `event` = oferta da loja de evento (E19). */
  exchange?: { offers: ExchangeOffer[]; tokensPerMatch: number }
  /** E13: engastes por raridade, fusão `fuseIn` → 1 e o valor de cada grau por chave. */
  runes?: { sockets: Record<GearRarity, number>; maxSockets: number; fuseIn: number; grades: number; kinds: Record<string, keyof GearBonus>; value: Partial<Record<keyof GearBonus, number[]>> }
  items: GearItem[]
  recipes: GearRecipe[]
  /** E7: conjuntos de 4 peças; `steps` = { nº de peças: fração da fatia do conjunto }. */
  sets?: GearSet[]
}
/** E17: uma oferta da loja de troca. */
export interface ExchangeOffer { id: string; token: string; cost: number; gives: Record<string, number>; event?: string }
export interface GearSet {
  id: string
  name: string
  domain: string
  keys: (keyof GearBonus)[]
  pieces: string[]
  steps: Record<string, number>
}
export interface GearBag {
  /** Veste um guerreiro (vampiro, Aurion, Morkhan, Zéphyra): só ele usa as espadas da loja. */
  warrior?: boolean
  /** Veste Soldado de Pedra, Marú ou Kragor: só ele usa as armas da aba Hammers. */
  hammer?: boolean
  /** Veste Íris ou Aeryn: só ela usa os arcos. */
  archer?: boolean
  /** Veste Ciborgue ou Noctis: só ele usa as armas de fogo. */
  gunner?: boolean
  clan: Clan | null
  level: number
  coins: number
  /** Pilha + equipamento. Equipamento (E2): qty = nº de cópias; level/version da cópia REPRESENTANTE (`instance`). */
  owned: Record<string, { qty: number; level: number; version?: number; refineFailures?: number; instance?: string }>
  equipped: Partial<Record<GearSlot, string>>
  /** Trilha E2 (mig 446): cada equipamento é uma cópia com o seu `plus`. */
  instances?: GearInstance[]
  /** Cópia em cada slot do personagem vivo. */
  equippedInstances?: Partial<Record<GearSlot, string>>
  /** O que empilha (materiais, missão, projetos): quantidade. */
  stacks?: Record<string, number>
  /** E9: a bancada de cada cópia (próximo passo garantido). */
  /** E9/E10/E11: próximo passo garantido, próximo grau e o que a desmontagem devolve. */
  forge?: Record<string, { upgrade: UpgradeView | null; grade?: GradeView | null; salvage?: Record<string, number> | null; ascend?: StepView; awaken?: StepView & { bonus?: Partial<GearBonus> }; enchant?: EnchantView }>
  bonus: GearBonus
  /** E7: bônus de cada slot vestido pela régua (plus e grau da cópia). */
  pieces?: Partial<Record<GearSlot, Partial<GearBonus>>>
  pendingProposals?: RefinementProposal[]
  learnedRecipes?: string[]
  unlockedEmotes?: string[]
  activeCosmetic?: string | null
}
export interface GearInstance {
  id: string
  item: string
  plus: number
  grade: number
  /** E9: ascendida (libera +11…+15). */
  ascended?: boolean
  /** E14: desperta (passiva ligada; a arma acende na luta). */
  awakened?: boolean
  /** E15: chave secundária encantada (null = a do catálogo). */
  enchant?: keyof GearBonus | null
  locked: boolean
  /** Personagem que segura a cópia (vivo ou na cápsula); null = solta na mochila. */
  equippedBy: string | null
  equippedSlot: GearSlot | null
  /** Equipada pelo personagem vivo. */
  equippedHere: boolean
  /** E13: runas engastadas (ids, na ordem) e quantos engastes a cópia tem. */
  sockets?: string[]
  socketsMax?: number
  /** E13: versão da cópia (o servidor recusa engaste pedido sobre uma versão velha). */
  version?: number
}
export type GearOut = { receipt?: Receipt; replay?: boolean; bag: GearBag; proposal?: RefinementProposal }
export const getGear = (token: string) => call<{ gear: GearCatalog; bag: GearBag }>(token, "GET", "/gear")

// ═══ B5 (mig 365): inventário de monstros (Arena e rua) ═════════════════════
/** Os tipos de monstro da luta (F1: `cavaleiro` = Soldado de Pedra/Cavaleiro Dourado; `stone` = Golem de Pedra). */
export type TrophyKind = "cavaleiro" | "stone" | "wolf" | "ciborgue" | "garras" | "brute"
export interface MonsterTrophy {
  kind: TrophyKind
  wins: number
  losses: number
  /** Maior nível já vencido (0 = nunca venceu). */
  bestLevel: number
  firstWinAt: string | null
  lastAt: string | null
}
export const getMonsters = (token: string) => call<{ monsters: MonsterTrophy[] }>(token, "GET", "/monsters")

// ═══ B7: aba Ranking (Poder, Nível, Freelandoo) ═════════════════════════════
export type RankingTab = "poder" | "nivel" | "freelandoo"
/** Parcelas do Poder (o servidor calcula): os 5 atributos, o HP máx do nível e o equipamento. */
export type PoderParts = Partial<Record<"strength" | "speed" | "dexterity" | "intelligence" | "accuracy" | "hp" | "gear", number>>
export interface RankingRow {
  position: number
  /** Poder, nível de aventura ou pontos da Freelandoo, conforme a aba. */
  value: number
  name: string
  username: string | null
  avatar: string | null
  /** Corpo que o jogo desenha (retrato); null na aba Freelandoo. */
  body: BodyId | null
  idUser?: string
  idProfile?: string
  parts?: PoderParts
  xp?: number
}
export interface RankingResult {
  tab: RankingTab
  scope: "br"
  top: RankingRow[]
  me: RankingRow | null
}
/** A8: código de afiliado + % do Meu Mundo para o botão Compartilhar. */
export type ShareLink = { code: string; percent: number; enabled: boolean }
export const getShareLink = (token: string) => call<ShareLink>(token, "GET", "/share")

export const getRanking = (token: string, tab: RankingTab) => call<RankingResult>(token, "GET", `/ranking/${tab}`)
// ═══ lore v2 N1: o placar SEMANAL de cada jogável (o néctar da N2 sai da posição nele) ═══
export const WEEKLY_GAMES = ["jetpack", "noturno", "corrida", "gincana", "paint", "laminas", "boxe", "hall", "poder"] as const
export type WeeklyGame = (typeof WEEKLY_GAMES)[number]
export interface WeeklyRankingRow extends RankingRow {
  /** partidas (ou vitórias) que contaram na semana */
  plays?: number
  /** N2: néctar que a posição vale (mL; o servidor calcula) */
  ml?: number
}
export interface WeeklyRanking {
  tab: "semana"
  game: WeeklyGame
  /** best = melhor marca da semana; sum = soma de vitórias; live = o Poder de agora */
  kind: "best" | "sum" | "live"
  /** desc = maior é melhor; asc = menor é melhor (tempo) */
  dir: "asc" | "desc"
  unit: "pts" | "ms" | "wins"
  /** domingo da semana (AAAA-MM-DD, Brasília) */
  week: string
  current: boolean
  /** quando a semana fecha (sábado 23:59 de Brasília) */
  endsAt: string
  scope: "br"
  games: WeeklyGame[]
  top: WeeklyRankingRow[]
  me: WeeklyRankingRow | null
}
export const getWeeklyRanking = (token: string, game: WeeklyGame, week?: string) =>
  call<WeeklyRanking>(token, "GET", `/ranking/semana/${game}${week ? `?week=${encodeURIComponent(week)}` : ""}`)
// ═══ lore v2 N2: o néctar da semana (litros pela posição; a carteira é da conta) ═══
export interface NectarWallet {
  /** néctar para entregar na estátua (mL) */
  pendingMl: number
  /** tudo o que a conta já ganhou (mL) */
  earnedMl: number
  /** quanto vale cada posição; a última (`outside`) é "fora do top 10, pontuou" */
  table: { position: number; outside: boolean; ml: number }[]
  week: string
  closesAt: string
  /** o que a semana passada rendeu, por jogo */
  last: { week: string; closed: boolean; ml: number; awards: { game: WeeklyGame; position: number; value: number; ml: number; pactMl?: number }[] }
  /** D4: os pactos de pé (os dois povos) e o bônus com a semana inteira (0,5 = +50%). */
  pacts?: DomainPact[]
  pactBonus?: number
}
export const getNectarWallet = (token: string) => call<NectarWallet>(token, "GET", "/nectar")
// ═══ lore v2 N3: domingo na estátua (entrega, corrida Raposas × Vampiros, meta no admin) ═══
export type StatueClan = "raposa" | "vampiro"
export interface StatueSide {
  god: "aurion" | "morkhan"
  /** mL entregues neste domingo */
  deliveredMl: number
  /** meta do domingo (mL; D4: ajusta-se aos jogadores ativos) */
  goalMl: number
  active: number
  donors: number
  /** 0 dormindo · 1 racha · 2 pedaços soltos · 3 olhos acesos · 4 cheia */
  stage: number
  fullAt: string | null
}
export interface StatueRace {
  /** o domingo da corrida (AAAA-MM-DD) */
  week: string
  /** hoje é domingo em Brasília (a estátua recebe) */
  sunday: boolean
  /** quando abre o próximo domingo */
  opensAt: string
  /** quando este domingo termina */
  endsAt: string
  race: Record<StatueClan, StatueSide>
  me: { clan: StatueClan | null; god: "aurion" | "morkhan" | null; pendingMl: number; deliveredMl: number; atStatue: boolean }
  /** D4: os pactos de pé. */
  pacts?: DomainPact[]
}
export interface StatueDelivery extends StatueRace {
  delivery: { id: number; ml: number; at: string; clan: StatueClan; place: string }
  replay: boolean
  filled?: boolean
}
export const getStatueRace = (token: string) => call<StatueRace>(token, "GET", "/estatua")

// ═══ Lore v2 N4: o deus solto ═══════════════════════════════════════════════
/** Uma caçada (estátua cheia no domingo → o deus daquele povo caça a raça oposta). */
export interface GodHunt {
  id: number
  god: GodId
  /** O povo que encheu a estátua (o do deus). */
  clan: Clan
  /** A raça que ele caça. */
  prey: Clan
  looseAt: string
}
export interface GodState {
  loose: (GodHunt & { huntsMe: boolean })[]
  upcoming: GodHunt[]
  fallen: { god: GodId; clan: Clan; defeatedAt: string; winner: string | null }[]
  me: { clan: Clan | null }
  peer: number
}
/** Aviso do socket `mm:god` (todo mundo): soltou ou caiu. */
export type GodWire = ({ e: "loose" } & GodHunt) | { e: "down"; god: GodId; name: string }
export const getGods = (token: string) => call<GodState>(token, "GET", "/deus")
export const releaseGod = (token: string, clan: Clan) => call<{ hunt: GodHunt; fresh: boolean }>(token, "POST", "/deus/soltar", { clan })
export const deliverNectar = (token: string, key: string) => call<StatueDelivery>(token, "POST", "/estatua/entregar", { key })
export interface StatueConfig {
  baseL: number
  perActiveL: number
  updatedAt: string | null
  week: string
  race: Record<StatueClan, StatueSide>
}
export const getStatueConfig = (token: string) => call<StatueConfig>(token, "GET", "/estatua/config")
export const saveStatueConfig = (token: string, baseL: number, perActiveL: number) => call<StatueConfig>(token, "POST", "/estatua/config", { baseL, perActiveL })
export const buyGear = (token: string, item: string, key: string) => call<GearOut>(token, "POST", "/gear/buy", { item, key })
/** E2: `instance` escolhe a cópia; sem ela, o servidor usa a representante. */
export const equipGear = (token: string, slot: GearSlot, item: string | null, instance?: string | null) =>
  call<{ bag: GearBag }>(token, "POST", "/gear/equip", instance ? { slot, item, instance } : { slot, item })
export const forgeGear = (token: string, recipe: string, key: string) => call<GearOut>(token, "POST", "/gear/forge", { recipe, key })
/** E9: aprimoramento garantido da cópia (`instance`; sem ela, a representante do item). */
export const upgradeGear = (token: string, item: string, key: string, instance?: string | null) =>
  call<GearOut>(token, "POST", "/gear/upgrade", instance ? { item, instance, key } : { item, key })
/** E11: desmontar a cópia (raro ou acima pede `confirm`). */
export const salvageGear = (token: string, item: string, instance: string, key: string, confirm = false) =>
  call<GearOut>(token, "POST", "/gear/salvage", { item, instance, key, confirm })
/** E11: 3 × `qty` de `from` → `qty` de `to` (mesmo tier). */
export const transmuteGear = (token: string, from: string, to: string, qty: number, key: string) =>
  call<GearOut>(token, "POST", "/gear/transmute", { from, to, qty, key })
/** E11: trava/destrava a cópia (não desmonta nem recicla). */
export const lockGear = (token: string, instance: string, locked: boolean) => call<GearOut>(token, "POST", "/gear/lock", { instance, locked })
/** E10: refinamento I–V da cópia. */
export const gradeGear = (token: string, item: string, key: string, instance?: string | null) =>
  call<GearOut>(token, "POST", "/gear/grade", instance ? { item, instance, key } : { item, key })
/** E14: Ascensão da cópia no +10 (Selos de Domínio). */
export const ascendGear = (token: string, instance: string, key: string, version?: number) =>
  call<GearOut>(token, "POST", "/gear/ascend", { instance, key, ...(version != null ? { version } : {}) })
/** E14: Despertar da cópia ascendida (Essências + Selos). */
export const awakenGear = (token: string, instance: string, key: string, version?: number) =>
  call<GearOut>(token, "POST", "/gear/awaken", { instance, key, ...(version != null ? { version } : {}) })
/** E15: sortear o encanto da cópia (paga Pó de Refino e Cristal Bruto). */
export const enchantGear = (token: string, instance: string, key: string, version?: number) =>
  call<GearOut>(token, "POST", "/gear/enchant", { instance, key, ...(version != null ? { version } : {}) })
/** E15: escolher uma opção do sorteio (`choice`) ou manter a atual (`null`); não cobra de novo. */
export const resolveEnchant = (token: string, instance: string, choice: string | null, key: string) =>
  call<GearOut>(token, "POST", "/gear/enchant/resolve", { instance, choice, key })
/** E13: engastar a runa `rune` na cópia (`version` = a que a tela viu). */
export const socketRune = (token: string, instance: string, rune: string, key: string, version?: number) =>
  call<GearOut>(token, "POST", "/gear/socket", { instance, rune, key, ...(version != null ? { version } : {}) })
/** E13: tirar a runa do engaste `index` (volta inteira para a mochila). */
export const unsocketRune = (token: string, instance: string, index: number, key: string, version?: number) =>
  call<GearOut>(token, "POST", "/gear/unsocket", { instance, index, key, ...(version != null ? { version } : {}) })
/** E13: fundir `qty` vezes 3 runas de grau N numa de grau N+1. */
export const fuseRunes = (token: string, rune: string, qty: number, key: string) => call<GearOut>(token, "POST", "/gear/rune/fuse", { rune, qty, key })
/** E18: coleção — todo item (o oculto não descoberto vem sem id) e os baús. */
export interface Collection {
  total: number
  found: number
  items: { id: string | null; category: GearCategory; rarity: GearRarity; found: boolean; at?: string | null; hidden?: boolean; name?: string }[]
  chests: { id: string; where: "bairro" | "centro"; places: string[]; opened: boolean; openedAt: string | null }[]
}
export const getCollection = (token: string) => call<Collection>(token, "GET", "/gear/collection")
/** E18: abrir um baú (no lugar dele; uma vez por conta). */
export const openChest = (token: string, chest: string, key: string) => call<GearOut>(token, "POST", "/gear/chest/open", { chest, key })
/** E17: loja de troca — `qty` vezes a oferta (fichas → itens). */
export const exchangeGear = (token: string, offer: string, qty: number, key: string) => call<GearOut>(token, "POST", "/gear/exchange", { offer, qty, key })
/** E8: fragmento que sobra vira Pó de Refino (o servidor diz quanto). */
export const convertFragments = (token: string, item: string, qty: number, key: string) => call<GearOut>(token, "POST", "/gear/fragment/convert", { item, qty, key })
export const applyGearItem = (token: string, item: string, key: string) => call<GearOut>(token, "POST", "/gear/use", { item, key })
// ═══ lore v2 F3: missões = os 10 capítulos (abrem pelo nível do treinador) ═══
export interface QuestStepView {
  key: string
  where: string
  xp: number
  /** "× N" (vencer 3 lobos…) */
  count: number
  state: "done" | "current" | "locked"
}
export interface QuestView {
  /** "cap1" … "cap10" */
  id: string
  chapter: number
  minTrainerLevel: number
  step: number
  total: number
  done: boolean
  next: string | null
  /** capítulo esperando o nível do treinador */
  locked: { level: number; trainer: number } | null
  current:
    | (QuestStepView & { check: string; index: number; ready: boolean; have: number; need: number; grant?: string; waiting: boolean })
    | null
  steps: QuestStepView[]
}
export interface QuestChapterItem {
  id: string
  chapter: number
  minTrainerLevel: number
  state: "done" | "current" | "locked"
}
export interface QuestState {
  quest: QuestView
  chapters: QuestChapterItem[]
  trainer: number
  clan: "raposa" | "vampiro" | null
}
export const getQuest = (token: string) => call<QuestState>(token, "GET", "/quest")
export const advanceQuest = (token: string, action: "ack" | "visit_armory" = "ack") =>
  call<QuestState & { receipt?: Receipt; replay?: boolean }>(token, "POST", "/quest/advance", { action })
/**
 * O aparelho conta que abriu uma tela que é objetivo (a certidão) ou uma conversa
 * (lore v2 F4: "talk" + npc); o servidor confere o lugar pela última visita e grava.
 */
export const markQuest = (token: string, mark: "certificate" | "talk", npc?: string) =>
  call<{ ok: true; npc?: string }>(token, "POST", "/quest/mark", npc ? { mark, npc } : { mark })
/** Lore v2 F4: algo pode ter cumprido o passo da missão (a conversa fechou, a sala gravou visita). */
export const QUEST_CHANGED = "mm:quest-changed"

// ═══ lore v2 F5: o Arquivo e os vídeos ═══════════════════════════════════════
/** Uma entrada do Arquivo (o texto mora no i18n: arq_<id>_title|body). */
export interface ArchiveEntry {
  id: string
  chapter: number
  unlocked: boolean
  unlockedAt: string | null
  readAt: string | null
  /** C3: lugares onde o texto está (o livro do Ninho); a 1ª leitura só vale lá */
  at?: string[] | null
}
/** O que o admin subiu para um capítulo/personagem (null = ainda não). */
export interface LoreVideo {
  video: string | null
  poster: string | null
  at?: string
}
export interface LoreVideos {
  chapter: Record<string, LoreVideo>
  character: Record<string, LoreVideo>
}
export interface ArchiveState {
  entries: ArchiveEntry[]
  videos: LoreVideos
}
export const getArchive = (token: string) => call<ArchiveState>(token, "GET", "/archive")
/** Abriu o texto: o servidor grava a primeira leitura (é o que archive:<id> confere). */
export const readArchive = (token: string, id: string) => call<ArchiveState>(token, "POST", "/archive/read", { id })
/** Pedido para abrir o STATUS na página do Arquivo (o botão da missão). */
export const OPEN_ARCHIVE = "mm:open-archive"

// ═══ lore v2 F6: prédios por nível do treinador ══════════════════════════════
export const getBuildings = (token: string) => call<BuildingsState>(token, "GET", "/buildings")

// ═══ Lore v2 D1 (mig 444): os Domínios — o servidor manda tudo pronto ═══════
export type DomainId = "floresta" | "canion" | "gelo" | "fabrica" | "vulcao" | "orbital"
/** D2: quem o monstro do setor É (lore) e o corpo que o desenha (skin que existe). */
export interface DomainFoe {
  id: string
  body: BodyId | null
  /** Luta com os golpes e a arma do tipo (espada, arma de fogo); sem = de mão, como o Hall. */
  rig: boolean
  /** false = corpo de placeholder até a arte do Alex. */
  art: boolean
}
export interface DomainSector {
  n: number
  /** Domínios v2: a cena (1–3) onde o setor fica. */
  scene?: number
  kind: MobKind
  /** D2: a criatura da lore (null = Domínio ainda sem fatia própria). */
  foe?: DomainFoe | null
  /** D4: o deus chefão com fases (só o setor 10 de um Domínio com a fatia). */
  boss?: BossId | null
  level: number
  /** Poder recomendado do setor. */
  power: number
  stage: "entrada" | "fundo" | "palacio"
  open: boolean
  cleared: boolean
  /** E12: a tabela de saque do setor (por vitória), consultável antes de lutar. */
  loot?: DomainSectorLoot | null
}
/** E12: uma linha da tabela do setor (nome em pt de reserva; a tela traduz por `gear_<id>`). */
export interface DomainLootRow {
  id: string
  name: string
  rarity: string
  qty: [number, number]
  /** Chance (0–1) das linhas de sorteio. */
  p?: number
}
export interface DomainSectorLoot {
  table: string
  sure: DomainLootRow[]
  chance: DomainLootRow[]
  /** Bônus da primeira vitória (mig 449). */
  first: DomainLootRow[]
  /** A primeira vitória deste setor já foi paga para a conta. */
  firstDone: boolean
}
export interface DomainInfo {
  id: DomainId
  god: string
  kit: string
  /** Nível do treinador que abre. */
  need: number
  open: boolean
  /** Por que está fechado: falta o nível ("trainer") ou atravessar o anterior ("crossing"). */
  lock: { code: "trainer"; level: number } | { code: "crossing"; from: DomainId } | null
  /** Maior setor vencido (0–10). */
  best: number
  crossed: boolean
  /** D2: lugares da cena (Pedraverde, ao lado de um setor). */
  places?: { id: string; sector: number; spots?: string[] }[]
  /** O trecho de passagem para o próximo (depois do setor 10). */
  passage: { to: DomainId; open: boolean } | null
  sectors: DomainSector[]
  /** Domínios v2 (DV1): as 3 cenas de mundo aberto (servidor antigo: ausente). */
  scenes?: DomainScene[]
}
/** Domínios v2: uma cena do mundo aberto — faixa de setores, chefe (cena 3: guardião + deus) e a passagem para a próxima. */
export interface DomainScene {
  n: number
  /** Arquivo da cena no aparelho (`engine/cena-codigo/cenas`): `<domínio>-<n>`. */
  name: string
  sectors: number[]
  boss: number
  god: number | null
  open: boolean
  cleared: boolean
  passage: { to: number; open: boolean } | null
}
export interface DomainsState {
  trainer: number
  bypass: boolean
  /** Poder do personagem vivo (B7). */
  power: number
  sectors: number
  domains: DomainInfo[]
  /** D4: os pactos de pé. */
  pacts?: DomainPact[]
}
/**
 * D4 (mig 445): o pacto do deus vencido — 7 dias de néctar extra no jogável do deus para o
 * POVO de quem venceu o chefão do setor 10.
 */
export interface DomainPact {
  domain: DomainId
  god: string
  game: WeeklyGame
  clan: StatueClan
  startsAt: string
  endsAt: string
  /** No recibo da vitória: true = este pacto nasceu agora; false = o povo já tinha um de pé. */
  fresh?: boolean
}
/** O progresso que a luta do setor devolve no recibo (`receipt.domain`). */
export interface DomainAdvance {
  domain: DomainId
  sector: number
  best: number
  crossed: boolean
  opened: number | null
  crossedNow: boolean
}
export const getDomains = (token: string) => call<DomainsState>(token, "GET", "/domains")
export const enterDomain = (token: string, domain: DomainId, scene?: number) =>
  call<{ trainer: number; bypass: boolean; power: number; domain: DomainInfo; scene?: DomainScene }>(token, "POST", "/domains/enter", scene ? { domain, scene } : { domain })
/** Lore v2 C5: chegou a um lugar da cena (Pedraverde) ou a um ponto dele (o Golem). O servidor confere e grava a visita. */
export const reachDomainPlace = (token: string, domain: DomainId, place: string, spot?: string | null) =>
  call<{ domain: DomainId; place: string; spot: string | null; recorded: boolean; armed: boolean }>(token, "POST", "/domains/place", { domain, place, spot: spot ?? null })
/** Entrega a missão de prédio (o servidor confere o objetivo). */
export const deliverBuildingMission = (token: string, id: string) =>
  call<BuildingsState & { receipt?: Receipt; replay?: boolean }>(token, "POST", "/buildings/mission", { id })
export const recycleGear = (token: string, item: string, qty: number, key: string, instance?: string | null) =>
  call<GearOut>(token, "POST", "/gear/recycle", instance ? { item, qty, key, instance } : { item, qty, key })
/** Hospital do centro (mm3d-26): planta por dentro, leito do usuário, régua da alta e a vida agora. */
export const getHospital = (token: string) => call<HospitalInfo>(token, "GET", "/hospital")
/** Interior de um prédio do centro (mm3d-37): a planta, buscada ao entrar. */
export const getCenterInterior = (token: string, id: string) =>
  call<{ id: string; interior: InteriorDef }>(token, "GET", `/center/interiors/${encodeURIComponent(id)}`)
/** Estudar/treinar/trabalhar por `hours` (1–72) ou parar (`idle`). Treino e estudo só no prédio (`place`, mm3d-37b). Deitar/dormir é pela cama, na casa. */
export const postLifeActivity = (token: string, activity: string, hours?: number, place?: string, station?: string) =>
  call<LifeSummary>(token, "POST", "/life/activity", { activity, hours, place, ...(station ? { station } : {}) })
/** Comer/tomar um item do catálogo (cobra as moedas do jogo). */
export const postLifeConsume = (token: string, item: string) => call<LifeSummary>(token, "POST", "/life/consume", { item })
/** Vendedor do centro (mm3d-37e): catálogo, casa (nível) e cor do carro. */
export const getShop = (token: string) => call<ShopCatalog>(token, "GET", "/shop")
export const postShopHouse = (token: string, level: number) => call<LifeSummary & { house: { level: number; price: number } }>(token, "POST", "/shop/house", { level })
export const postShopPaint = (token: string, paint: string) =>
  call<LifeSummary & { paint: { id: string; bought: boolean; price: number } }>(token, "POST", "/shop/paint", { paint })
/** Pedido no balcão da pizzaria/hamburgueria (mm3d-37c): come na hora, lá dentro. */
export const postLifeOrder = (token: string, place: string, item: string) => call<LifeSummary>(token, "POST", "/life/order", { place, item })
/** Mercado → geladeira (mig 301): compra e guarda; comer é na geladeira da casa. Só no supermercado (mm3d-37c). */
export const postLifeBuy = (token: string, item: string, qty = 1) => call<LifeSummary>(token, "POST", "/life/buy", { item, qty })
/** Depois da morte: o próximo hóspede chega. */
export const postLifeNewcomer = (token: string) => call<LifeSummary>(token, "POST", "/life/newcomer", {})
/** mm3d-72: o apelido que a pessoa escolhe para si e o que ela dá ao hóspede. */
export const postLifeNickname = (token: string, nickname: string) => call<LifeSummary>(token, "POST", "/life/nickname", { nickname })
export const postLifePetName = (token: string, name: string) => call<LifeSummary>(token, "POST", "/life/pet-name", { name })

// ═══ B3 (mig 340): personagens — o ativo e a cápsula, trocar, fundir, certificado ═══
// (o vestuário de skins da mm3d-16 saiu: as skins viraram espécies de personagem)
export const getCharacters = (token: string) => call<CharactersResult>(token, "GET", "/characters")
/**
 * O personagem ativo mudou (troca pela cápsula ou mistura): o nível de aventura é POR
 * personagem (mig 435), então o HUD e o STATUS releem o nível quando ouvem isto.
 */
export const CHARACTER_CHANGED = "mm:character-changed"
async function changedActive<T>(p: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  const r = await p
  if (r.ok && typeof window !== "undefined") window.dispatchEvent(new Event(CHARACTER_CHANGED))
  return r
}
/** Guarda o ativo na cápsula (congelado) e tira este de lá. */
export const postCharacterUse = (token: string, id: string) =>
  changedActive(call<CharactersResult>(token, "POST", `/characters/${encodeURIComponent(id)}/use`, {}))
/** Funde dois adultos vivos: os pais viram histórico e nasce o filho da espécie escolhida. */
/** 09/11: a MISTURA do laboratório (resultado fixo) — `a` é o primeiro; o outro é um personagem (`b`) ou uma genética (`gene`); `species` = a escolhida. */
export const postCharacterFuse = (token: string, a: string, other: { b: string } | { gene: string }, species: string) =>
  changedActive(call<CharactersResult>(token, "POST", "/characters/fuse", { a, ...other, species }))

/** 09/11: compra a genética de uma espécie (fica guardada até a mistura). */
export const postCharacterGenetics = (token: string, species: string, key: string, sex?: "m" | "f") =>
  call<CharactersResult>(token, "POST", "/characters/genetics", { species, key, ...(sex ? { sex } : {}) })
/** TESTE (só admin joga hoje): ganha um personagem da espécie na cápsula. */
export const postCharacterTestGrant = (token: string, species: string, sex?: "m" | "f") =>
  call<CharactersResult>(token, "POST", "/characters/test-grant", { species, ...(sex ? { sex } : {}) })
// ═══ B12 (mig 410): Laboratório de Criogenia — embrião e acelerador ═══
/** Compra o embrião da espécie (entra na cápsula com 1 m). `key` = chave do pedido (clique duplo não compra 2×). */
export const postCharacterEmbryo = (token: string, species: string, key: string, sex?: "m" | "f") =>
  call<CharactersResult & { granted?: string[]; repeat?: boolean; paid?: number }>(token, "POST", "/characters/embryo", { species, key, ...(sex ? { sex } : {}) })
/** Acelerador: leva o personagem (ativo ou na cápsula) aos 15 anos. */
export const postCharacterAccelerate = (token: string, id: string) =>
  call<CharactersResult>(token, "POST", `/characters/${encodeURIComponent(id)}/accelerate`, {})
/** Certificado público (sem login) pelo código da página. */
export async function fetchCertificate(code: string): Promise<CharacterCertificate | null> {
  try {
    const res = await fetch(`/api/meu-mundo/public/certificado/${encodeURIComponent(code)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { certificate?: CharacterCertificate }
    return data.certificate ?? null
  } catch {
    return null
  }
}

// ═══ mm3d-30: sino, correio interno, presentes, itens e Poléns ══════════════
export const getNoticeSummary = (token: string) =>
  call<{ counts: InboxCounts; fresh: MMNotice[] }>(token, "GET", "/notices/summary")
export const getNotices = (token: string, filter: NoticeFilter, before?: string | null) =>
  call<{ items: MMNotice[]; more: boolean; counts: InboxCounts }>(
    token,
    "GET",
    `/notices?filter=${filter}${before ? `&before=${encodeURIComponent(before)}` : ""}`,
  )
/** Marca como lidas: `ids` ou todas. Sair da tela não marca nada. */
export const postNoticesRead = (token: string, ids: string[] | "all") =>
  call<{ updated: number; counts: InboxCounts }>(token, "POST", "/notices/read", ids === "all" ? { all: true } : { ids })
export const getMail = (token: string, tab: MailTab, before?: string | null) =>
  call<{ items: MMMail[]; more: boolean; counts: InboxCounts }>(
    token,
    "GET",
    `/mail?tab=${tab}${before ? `&before=${encodeURIComponent(before)}` : ""}`,
  )
/** Abrir uma carta (marca ela e a notificação dela como lidas). */
export const getMailItem = (token: string, id: string) =>
  call<{ mail: MMMail; counts: InboxCounts }>(token, "GET", `/mail/${encodeURIComponent(id)}`)
export const postMailReadAll = (token: string) => call<{ counts: InboxCounts }>(token, "POST", "/mail/read-all", {})
/** Resgatar um presente: o servidor entrega uma vez; repetir devolve o resultado gravado. */
export const postMailClaim = (token: string, id: string) =>
  call<LifeSummary & { claim: NonNullable<MMMail["claimResult"]> & { mailId: string; replay: boolean } }>(
    token,
    "POST",
    `/mail/${encodeURIComponent(id)}/claim`,
    {},
  )
export const getMailPrefs = (token: string) => call<{ prefs: { promos: boolean } }>(token, "GET", "/mail/prefs")
export const postMailPrefs = (token: string, promos: boolean) =>
  call<{ prefs: { promos: boolean } }>(token, "POST", "/mail/prefs", { promos })
/** Aba Itens: o inventário real (geladeira, vestuário, veículos, casa). */
export const getInventory = (token: string) => call<InventoryResult>(token, "GET", "/inventory")
/** Moedas do jogo + Poléns da Freelandoo, cada um da sua fonte. */
export const getWallets = (token: string) => call<{ wallet: Wallets }>(token, "GET", "/wallets")
/** Situação de uma compra de Poléns que voltou do checkout (quem credita é o webhook). */
export const getPolensPurchase = (token: string, session: string) =>
  call<{ purchase: { status: "pending" | "paid" | "failed" | "expired" | "refunded"; polens: number } }>(
    token,
    "GET",
    `/polens/purchase/${encodeURIComponent(session)}`,
  )

// ═══ mm3d-31: card de perfil de outro jogador ═══════════════════════════════
/** Quem está por trás do boneco tocado — só se ele está na MESMA sala agora. */
export const getPlayerProfile = (token: string, session: string) =>
  session.startsWith("hall:")
    ? // Hall da Fama (2026-11-08): o card de quem está no top 10 da Arena, pela conta
      call<{ player: PlayerProfile }>(token, "GET", `/hall/player/${encodeURIComponent(session.slice(5))}`)
    : call<{ player: PlayerProfile }>(token, "GET", `/players/${encodeURIComponent(session)}`)

/**
 * Seguir/deixar de seguir pelo /entity-follows que o site já usa (o mesmo do
 * FollowButton), com o perfil-conta de quem joga como ator. Devolve a
 * contagem real do alvo depois da mudança.
 */
export async function postFollow(
  token: string,
  actorProfileId: string,
  targetProfileId: string,
  follow: boolean,
): Promise<ApiResult<{ isFollowing: boolean; followers: number | null }>> {
  try {
    const res = await fetch("/api/entity-follows", {
      method: follow ? "POST" : "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ actor_type: "profile", actor_id: actorProfileId, target_type: "profile", target_id: targetProfileId }),
      cache: "no-store",
    })
    const data = (await res.json().catch(() => null)) as { is_following?: boolean; counts?: { followers_count?: number }; error?: string } | null
    if (!res.ok || !data) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`) }
    const n = Number(data.counts?.followers_count)
    return { ok: true, data: { isFollowing: typeof data.is_following === "boolean" ? data.is_following : follow, followers: Number.isFinite(n) ? n : null } }
  } catch {
    return { ok: false, status: 0, error: "network" }
  }
}

/** Pacotes da Loja de Polén (o mesmo catálogo da /loja-polens). */
export async function getPolenProducts(): Promise<ApiResult<{ products: PolenProduct[] }>> {
  try {
    const res = await fetch("/api/polens/products", { cache: "no-store" })
    const data = (await res.json().catch(() => null)) as { products?: PolenProduct[]; error?: string } | null
    if (!res.ok || !data) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`) }
    return { ok: true, data: { products: data.products ?? [] } }
  } catch {
    return { ok: false, status: 0, error: "network" }
  }
}

/**
 * Abre o checkout OFICIAL de Poléns (Mercado Pago, o mesmo da /loja-polens)
 * com volta para o jogo. O crédito só acontece pelo webhook, no servidor.
 */
export async function postPolenCheckout(token: string, productId: string): Promise<ApiResult<{ checkout_url: string; session_id: string }>> {
  try {
    const res = await fetch(`/api/polens/products/${encodeURIComponent(productId)}/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      // A8: o cupom do link de quem convidou vai junto (só atribui a comissão).
      body: JSON.stringify({ return_to: "meu-mundo", coupon_code: meuMundoCheckoutCoupon() ?? undefined }),
      cache: "no-store",
    })
    const data = (await res.json().catch(() => null)) as { checkout_url?: string; session_id?: string; error?: string } | null
    if (!res.ok || !data?.checkout_url) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`) }
    return { ok: true, data: { checkout_url: data.checkout_url, session_id: data.session_id ?? "" } }
  } catch {
    return { ok: false, status: 0, error: "network" }
  }
}

/**
 * Conversas da Freelandoo (o chat que já existe, /mensagens): a aba
 * Mensagens da caixa do jogo só lista e abre lá — não guarda cópia.
 */
export interface ConversationRow {
  id: string
  title: string
  avatar: string | null
  preview: string | null
  at: string | null
  unread: number
}

export async function getConversations(token: string): Promise<ApiResult<{ items: ConversationRow[] }>> {
  try {
    // O /conversations exige o ator (perfil-conta de quem joga); sem ele volta 400.
    const actor = await getAccountProfileId(token)
    if (!actor) return { ok: false, status: 0, error: "actor" }
    const res = await fetch(`/api/conversations?limit=20&actor_type=profile&actor_id=${encodeURIComponent(actor)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    type Raw = {
      id_conversation: string
      name: string | null
      cover_url: string | null
      last_message_preview: string | null
      last_message_at: string | null
      unread_count: number
      other_entity: { display_name?: string | null; username?: string | null; avatar_url?: string | null } | null
    }
    const data = (await res.json().catch(() => null)) as { items?: Raw[]; error?: string } | null
    if (!res.ok || !data) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`) }
    return {
      ok: true,
      data: {
        items: (data.items ?? []).map((r) => ({
          id: String(r.id_conversation),
          title: r.name || r.other_entity?.display_name || (r.other_entity?.username ? `@${r.other_entity.username}` : "—"),
          avatar: r.cover_url || r.other_entity?.avatar_url || null,
          preview: r.last_message_preview,
          at: r.last_message_at,
          unread: Number(r.unread_count) || 0,
        })),
      },
    }
  } catch {
    return { ok: false, status: 0, error: "network" }
  }
}

// ═══ mm3d-32: chat (Global do jogo + conversa 1:1 da Freelandoo) ═══════════
export type ChatLine = {
  id: string
  text: string
  at: string | null
  name: string
  avatar: string | null
  profileId: string | null
  session: string | null
  mine: boolean
}

/** Histórico do Global, mais nova primeiro (a página pode vir curta: o filtro de bloqueio é no servidor). */
export const getChatGlobal = (token: string, before?: string | null) =>
  call<{ items: ChatLine[]; next_before: string | null; has_more: boolean }>(
    token,
    "GET",
    `/chat/global${before ? `?before=${encodeURIComponent(before)}` : ""}`,
  )
/** Recusa da moderação volta como `{ error, code }` (block / mute_temp / review). */
export const postChatGlobal = (token: string, text: string) => call<{ line: ChatLine }>(token, "POST", "/chat/global", { text })
export const postChatReport = (token: string, id: string, reason_category = "other") =>
  call<{ ok?: boolean }>(token, "POST", `/chat/global/${encodeURIComponent(id)}/report`, { reason_category })
/** Acha/cria a conversa 1:1 (pela sessão do boneco na minha sala ou pelo perfil-conta). */
export const postChatDirect = (token: string, who: { session?: string; profileId?: string }) =>
  call<{ conversation: { id_conversation: string } }>(token, "POST", "/chat/direct", who)

/**
 * Perfil-conta de quem joga (o "ator" das conversas): vem do /users/me
 * (`account_profile.id_profile`). Guardado por token — uma ida só por sessão.
 */
let accountActor: { token: string; id: Promise<string | null> } | null = null
export function getAccountProfileId(token: string): Promise<string | null> {
  if (accountActor?.token === token) return accountActor.id
  const id = fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((me: { account_profile?: { id_profile?: string | null } | null } | null) => me?.account_profile?.id_profile ?? null)
    .catch(() => null)
  const entry = { token, id }
  accountActor = entry
  // Falha não fica guardada: a próxima chamada tenta de novo.
  void id.then((v) => {
    if (!v && accountActor === entry) accountActor = null
  })
  return id
}

/**
 * Mensagem da thread 1:1 no formato das linhas do chat (merge/pendente iguais
 * aos do Global). `kind`: o que mostrar quando não há texto — áudio
 * (tb_message.kind 'audio', mig 080), apagada (`deleted_at`) ou outra mídia.
 */
export type DmKind = "text" | "audio" | "media" | "deleted"
export type DmMessage = { id: string; text: string; at: string | null; mine: boolean; kind?: DmKind; pending?: boolean; clientId?: string }
type RawDm = { id_message: string; body: string | null; created_at: string; sender_entity_id: string; kind?: string; deleted_at?: string | null }
export const mapDm = (m: RawDm, actorId: string): DmMessage => {
  const body = m.deleted_at ? "" : (m.body ?? "").trim()
  const kind: DmKind = m.deleted_at ? "deleted" : m.kind === "audio" ? "audio" : body ? "text" : "media"
  return { id: String(m.id_message), text: body, at: m.created_at, mine: String(m.sender_entity_id) === String(actorId), kind }
}

/** Thread 1:1: as mesmas rotas do /mensagens (o histórico é um só). A lista vem DESC. */
export async function getDirectMessages(token: string, id: string, actorId: string): Promise<ApiResult<{ items: DmMessage[] }>> {
  const qs = `limit=50&actor_type=profile&actor_id=${encodeURIComponent(actorId)}`
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/messages?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null)
  if (!res) return { ok: false, status: 0, error: "network" }
  const data = (await res.json().catch(() => null)) as { items?: RawDm[]; error?: string } | null
  if (!res.ok || !data) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`) }
  return { ok: true, data: { items: (data.items || []).map((m) => mapDm(m, actorId)).reverse() } }
}
/** `client_message_id` (UUID): repetir não duplica (mig 283). */
export async function postDirectMessage(token: string, id: string, actorId: string, body: string, clientId: string): Promise<ApiResult<{ message: DmMessage }>> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ body, actor_id: actorId, actor_type: "profile", client_message_id: clientId }),
  }).catch(() => null)
  if (!res) return { ok: false, status: 0, error: "network" }
  const data = (await res.json().catch(() => null)) as { message?: RawDm; error?: string } | null
  if (!res.ok || !data?.message) return { ok: false, status: res.status, error: serverErrorText(data?.error || `http ${res.status}`) }
  return { ok: true, data: { message: { ...mapDm(data.message, actorId), mine: true } } }
}
export const postDirectRead = (token: string, id: string, actorId: string) =>
  fetch(`/api/conversations/${encodeURIComponent(id)}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ actor_id: actorId, actor_type: "profile" }),
  }).catch(() => null)

/** Mercado com `key`: produto exclusivo de Poléns exige; a mesma chave não cobra duas vezes. */
export const postLifeBuyKeyed = (token: string, item: string, qty: number, key: string) =>
  call<LifeSummary>(token, "POST", "/life/buy", { item, qty, key })

// Conferência mínima da forma: dado torto aqui vira cena quebrada lá na frente,
// e é melhor dizer "não carregou" do que desenhar um bairro pela metade.
function isValidPayload(body: NeighborhoodPayload | null): body is NeighborhoodPayload {
  const n = body?.neighborhood
  if (!n || n.layout !== "ring-20" || !Array.isArray(n.lots) || !Array.isArray(n.houses)) return false
  if (!n.spawn || !n.exit || !Array.isArray(n.obstacles) || !body?.me) return false
  const houseIds = new Set(n.houses.map((h) => h.id))
  return n.lots.every(
    (l) =>
      typeof l.id === "string" &&
      Number.isFinite(l.position?.x) &&
      Number.isFinite(l.position?.z) &&
      Number.isFinite(l.rotationY) &&
      houseIds.has(l.houseId),
  )
}

export type HouseLevelResult =
  | { ok: true; house: number; level: number; rev: number }
  | { ok: false; status: number; error: string; code?: string }

/**
 * Troca o nível da PRÓPRIA casa (seletor de teste). Manda só o número: o
 * servidor confere sessão, papel, residência e se o nível existe no catálogo.
 */
export async function postHouseLevel(token: string, level: number): Promise<HouseLevelResult> {
  let res: Response
  try {
    res = await fetch("/api/meu-mundo/admin/house/level", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
      cache: "no-store",
    })
  } catch {
    return { ok: false, status: 0, error: "network" }
  }
  const body = (await res.json().catch(() => null)) as { house?: number; level?: number; rev?: number; error?: string; code?: string } | null
  if (!res.ok || !body || typeof body.level !== "number" || typeof body.rev !== "number") {
    return { ok: false, status: res.status, error: serverErrorText(body?.error || `http ${res.status}`), code: body?.code }
  }
  return { ok: true, house: Number(body.house), level: body.level, rev: body.rev }
}
