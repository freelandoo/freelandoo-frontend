// features/meu-mundo/data.ts — adaptador de dados do bairro.
//
// Desde o mm3d-02 o bairro é PERSISTENTE: a resposta traz o bairro do usuário
// (residência alocada ou recuperada no servidor) e a reserva da sala online.
// Quem decide quem pode ver é o SERVIDOR (auth + papel Administrator): 401 e
// 403 voltam como estado, e a tela não carrega o motor 3D sem resposta válida.

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
  NeighborhoodPayload,
  NoticeFilter,
  PlayerProfile,
  PolenProduct,
  ScenePayload,
  ShopCatalog,
  VisitState,
  Wallets,
  WardrobeResult,
} from "./types"

export type NeighborhoodResult =
  | { ok: true; payload: ScenePayload }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "network" }

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
  if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error || `http ${res.status}`, code: data?.code }
  return { ok: true, data }
}

/** Entrar na casa do lote (o servidor confere posição, propriedade e convite). */
export const postHouseEnter = (token: string, lot: number) => call<ScenePayload>(token, "POST", "/house/enter", { lot })
/** Sair pela porta: devolve a rua do bairro da casa. */
export const postHouseExit = (token: string) => call<ScenePayload>(token, "POST", "/house/exit", {})
/** Ir ao centro (mm3d-17): da rua do bairro, a pé ou com o veículo. O servidor reserva a sala. */
export const postCenterEnter = (token: string) => call<ScenePayload>(token, "POST", "/center/enter", {})
/** Voltar para casa: o servidor decide o bairro (o da residência). */
export const postCenterLeave = (token: string) => call<ScenePayload>(token, "POST", "/center/leave", {})
/** Jetpack em grupo (mm3d-21): lugar na sala do centro (perto da porta). `roomId` = voltar à mesma. */
export const postJetpackJoin = (token: string, roomId?: string | null) =>
  call<JetpackSession>(token, "POST", "/center/jetpack", roomId ? { roomId } : {})
/** Paint (mm3d-35): lugar numa sala do centro (perto da porta), no modo pedido. */
export const postPaintJoin = (token: string, mode: string, roomId?: string | null) =>
  call<PaintSession>(token, "POST", "/center/paint", roomId ? { mode, roomId } : { mode })
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
/** Hospital do centro (mm3d-26): planta por dentro, leito do usuário, régua da alta e a vida agora. */
export const getHospital = (token: string) => call<HospitalInfo>(token, "GET", "/hospital")
/** Interior de um prédio do centro (mm3d-37): a planta, buscada ao entrar. */
export const getCenterInterior = (token: string, id: string) =>
  call<{ id: string; interior: InteriorDef }>(token, "GET", `/center/interiors/${encodeURIComponent(id)}`)
/** Estudar/treinar/trabalhar por `hours` (1–72) ou parar (`idle`). Treino e estudo só no prédio (`place`, mm3d-37b). Deitar/dormir é pela cama, na casa. */
export const postLifeActivity = (token: string, activity: string, hours?: number, place?: string) =>
  call<LifeSummary>(token, "POST", "/life/activity", { activity, hours, place })
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

// ═══ mm3d-16: vestuário (skins compradas com as moedas do jogo) ═════════════
export const getSkins = (token: string) => call<WardrobeResult>(token, "GET", "/skins")
export const postSkinBuy = (token: string, id: string) =>
  call<WardrobeResult>(token, "POST", `/skins/${encodeURIComponent(id)}/buy`, {})
/** Vestir uma skin sua, ou voltar ao padrão ("standard"). */
export const postSkinEquip = (token: string, id: string) =>
  call<WardrobeResult>(token, "POST", `/skins/${encodeURIComponent(id)}/equip`, {})
/** Cores do personagem (mm3d-36): de graça, grava o código look da skin. */
export const postSkinColors = (token: string, id: string, look: string) =>
  call<WardrobeResult>(token, "POST", `/skins/${encodeURIComponent(id)}/colors`, { look })

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
  call<{ player: PlayerProfile }>(token, "GET", `/players/${encodeURIComponent(session)}`)

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
    if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
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
    if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
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
      body: JSON.stringify({ return_to: "meu-mundo" }),
      cache: "no-store",
    })
    const data = (await res.json().catch(() => null)) as { checkout_url?: string; session_id?: string; error?: string } | null
    if (!res.ok || !data?.checkout_url) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
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
    if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
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
  if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
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
  if (!res.ok || !data?.message) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
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
    return { ok: false, status: res.status, error: body?.error || `http ${res.status}`, code: body?.code }
  }
  return { ok: true, house: Number(body.house), level: body.level, rev: body.rev }
}
