// features/meu-mundo/data.ts — adaptador de dados do bairro.
//
// Desde o mm3d-02 o bairro é PERSISTENTE: a resposta traz o bairro do usuário
// (residência alocada ou recuperada no servidor) e a reserva da sala online.
// Quem decide quem pode ver é o SERVIDOR (auth + papel Administrator): 401 e
// 403 voltam como estado, e a tela não carrega o motor 3D sem resposta válida.

import type { CenterPayload, HospitalInfo, HousePayload, JetpackSession, LifeFull, LifeSummary, MultiplayerSession, NeighborhoodPayload, ScenePayload, VisitState, WardrobeResult } from "./types"

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
/** Estudar/treinar/trabalhar por `hours` (1–72) ou parar (`idle`). Deitar/dormir é pela cama, na casa. */
export const postLifeActivity = (token: string, activity: string, hours?: number) =>
  call<LifeSummary>(token, "POST", "/life/activity", { activity, hours })
/** Comer/tomar um item do catálogo (cobra as moedas do jogo). */
export const postLifeConsume = (token: string, item: string) => call<LifeSummary>(token, "POST", "/life/consume", { item })
/** Depois da morte: o próximo hóspede chega. */
export const postLifeNewcomer = (token: string) => call<LifeSummary>(token, "POST", "/life/newcomer", {})

// ═══ mm3d-16: vestuário (skins compradas com as moedas do jogo) ═════════════
export const getSkins = (token: string) => call<WardrobeResult>(token, "GET", "/skins")
export const postSkinBuy = (token: string, id: string) =>
  call<WardrobeResult>(token, "POST", `/skins/${encodeURIComponent(id)}/buy`, {})
/** Vestir uma skin sua, ou voltar ao padrão ("standard"). */
export const postSkinEquip = (token: string, id: string) =>
  call<WardrobeResult>(token, "POST", `/skins/${encodeURIComponent(id)}/equip`, {})

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
