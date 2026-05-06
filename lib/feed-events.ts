"use client"

import { getToken } from "@/lib/auth"
import type { FeedEventType, FeedFilters } from "@/lib/types/portfolio-feed"

const SESSION_KEY = "feed_session_id"

export function getFeedSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = window.sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    window.sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export interface SendFeedEventInput {
  post_id: string
  event_type: FeedEventType
  filters?: FeedFilters | null
  metadata?: Record<string, unknown>
}

export async function sendFeedEvent(input: SendFeedEventInput): Promise<void> {
  if (typeof window === "undefined") return
  const session_id = getFeedSessionId()
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const filtersPayload = input.filters
    ? {
        machine_id: input.filters.id_machine ?? undefined,
        profession_id: input.filters.id_category ?? undefined,
        city: input.filters.municipio ?? undefined,
        state: input.filters.estado ?? undefined,
      }
    : undefined

  try {
    await fetch("/api/feed/events", {
      method: "POST",
      headers,
      body: JSON.stringify({
        post_id: input.post_id,
        event_type: input.event_type,
        session_id,
        filters: filtersPayload,
        metadata: input.metadata,
      }),
      keepalive: true,
    })
  } catch {
    // Silenciar — eventos não devem quebrar a UI.
  }
}
