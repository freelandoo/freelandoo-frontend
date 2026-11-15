"use client"

// Cliente das rotas /feed-interativo/* (o rewrite /api/* leva ao backend).
// Chamadas esporádicas (gesto, painel) — nenhuma é periódica (regra 6).

import { getToken } from "@/lib/auth"
import type { FeedPost } from "@/lib/types/portfolio-feed"

export interface FxUser {
  id_user: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export type LinkStatus = "pending" | "active" | "silenced" | "declined" | "revoked" | "blocked"

export interface FxLink {
  id_link: string
  status: LinkStatus
  invited_at: string
  accepted_at: string | null
  user: FxUser
}

export type DropKind = "throw" | "gift" | "capsule"

export interface FxDrop {
  id_drop: string
  kind: DropKind
  created_at: string
  sender: FxUser
  post: FeedPost | null
  payload: {
    chest?: string
    opened?: boolean
    message?: string | null
    scheduled_for?: string | null
    written_at?: string | null
  }
}

export class FxError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function fxApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken()
  if (!token) throw new FxError("login", 401)
  const res = await fetch(`/api/feed-interativo${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error || `HTTP ${res.status}`
    throw new FxError(msg, res.status)
  }
  return data as T
}
