// Cliente das Lives — fala com os proxies /api/lives/*.
import { getToken } from "@/lib/auth"
import type { Live, LiveGift, LiveSession, SendGiftResult } from "./types"

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {}
  const token = getToken()
  if (token) h["Authorization"] = `Bearer ${token}`
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: unknown
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `Erro ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export async function fetchActiveLives(): Promise<Live[]> {
  const res = await fetch("/api/lives", { headers: authHeaders(), cache: "no-store" })
  const data = await parse<{ items: Live[] }>(res)
  return data.items || []
}

export async function startLive(input: { id_profile: string; title?: string }): Promise<LiveSession> {
  const res = await fetch("/api/lives", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  })
  return parse<LiveSession>(res)
}

export async function endLive(id_live: string): Promise<void> {
  const res = await fetch(`/api/lives/${encodeURIComponent(id_live)}/end`, {
    method: "POST",
    headers: authHeaders(true),
  })
  await parse<{ ended: boolean }>(res)
}

export async function joinLive(id_live: string): Promise<LiveSession> {
  const res = await fetch(`/api/lives/${encodeURIComponent(id_live)}/join`, {
    method: "POST",
    headers: authHeaders(true),
  })
  return parse<LiveSession>(res)
}

// O transmissor reporta a contagem de espectadores → backend guarda o pico.
export async function reportViewers(id_live: string, count: number): Promise<void> {
  try {
    await fetch(`/api/lives/${encodeURIComponent(id_live)}/viewers`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ count }),
    })
  } catch { /* best-effort, nunca derruba a live */ }
}

export async function fetchGifts(): Promise<LiveGift[]> {
  const res = await fetch("/api/lives/gifts", { headers: authHeaders(), cache: "no-store" })
  const data = await parse<{ gifts: LiveGift[] }>(res)
  return data.gifts || []
}

export async function sendGift(id_live: string, id_live_gift: string): Promise<SendGiftResult> {
  const res = await fetch(`/api/lives/${encodeURIComponent(id_live)}/gift`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ id_live_gift }),
  })
  return parse<SendGiftResult>(res)
}

// Subperfis do usuário (para escolher de qual perfil transmitir).
export interface OwnedProfile {
  id_profile: string
  display_name: string
  avatar_url: string | null
  is_clan: boolean
  is_active: boolean
}

export async function fetchOwnedProfiles(id_user: string): Promise<OwnedProfile[]> {
  const res = await fetch(`/api/profile/user/${encodeURIComponent(id_user)}`, {
    headers: authHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return []
  const data = (await res.json()) as { profiles?: OwnedProfile[] }
  return Array.isArray(data?.profiles) ? data.profiles.filter((p) => p.is_active) : []
}
