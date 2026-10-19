// features/meu-mundo/data.ts — adaptador de dados do bairro.
//
// Desde o mm3d-02 o bairro é PERSISTENTE: a resposta traz o bairro do usuário
// (residência alocada ou recuperada no servidor) e a reserva da sala online.
// Quem decide quem pode ver é o SERVIDOR (auth + papel Administrator): 401 e
// 403 voltam como estado, e a tela não carrega o motor 3D sem resposta válida.

import type { MultiplayerSession, NeighborhoodPayload } from "./types"

export type NeighborhoodResult =
  | { ok: true; payload: NeighborhoodPayload }
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

  const body = (await res.json().catch(() => null)) as NeighborhoodPayload | null
  return isValidPayload(body) ? { ok: true, payload: body } : { ok: false, reason: "invalid" }
}

/**
 * Reserva nova para (re)conectar. O servidor revalida login, papel e
 * residência. null = sem acesso (não insistir); lança em falha de rede.
 */
export async function fetchSession(token: string): Promise<MultiplayerSession | null> {
  const res = await fetch("/api/meu-mundo/admin/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (res.status === 401 || res.status === 403 || res.status === 409) return null
  if (!res.ok) throw new Error(`session ${res.status}`)
  const body = (await res.json().catch(() => null)) as { multiplayer?: MultiplayerSession } | null
  if (!body?.multiplayer?.reservation) throw new Error("session inválida")
  return body.multiplayer
}

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
  | { ok: false; status: number; error: string }

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
  const body = (await res.json().catch(() => null)) as { house?: number; level?: number; rev?: number; error?: string } | null
  if (!res.ok || !body || typeof body.level !== "number" || typeof body.rev !== "number") {
    return { ok: false, status: res.status, error: body?.error || `http ${res.status}` }
  }
  return { ok: true, house: Number(body.house), level: body.level, rev: body.rev }
}
