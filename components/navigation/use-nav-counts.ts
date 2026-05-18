"use client"

import { useEffect, useState } from "react"
import { getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"

const POLL_MS = 10 * 60 * 1000
const MIN_CACHE_MS = 60 * 1000

interface NavCountsResponse {
  conversations?: {
    total?: number
    by_actor?: Array<{ actor_id: string; unread_count: number }>
  }
  serviceRequests?: {
    has_new?: boolean
    unread_chats?: number
  }
  notifications?: {
    unread_count?: number
  }
}

export interface NavCounts {
  conversationUnread: number
  conversationByActor: Record<string, number>
  serviceUnread: number
  serviceHasNew: boolean
  notificationUnread: number
  updatedAt: number
  loading: boolean
}

const emptyCounts: NavCounts = {
  conversationUnread: 0,
  conversationByActor: {},
  serviceUnread: 0,
  serviceHasNew: false,
  notificationUnread: 0,
  updatedAt: 0,
  loading: false,
}

let cache: NavCounts = emptyCounts
let inFlight: Promise<void> | null = null
let listenersStarted = false
const subscribers = new Set<(counts: NavCounts) => void>()

function emit() {
  for (const subscriber of subscribers) subscriber(cache)
}

function shouldSkipRefresh(force: boolean) {
  if (force) return false
  if (typeof document !== "undefined" && document.hidden) return true
  return Date.now() - cache.updatedAt < MIN_CACHE_MS
}

function resetCounts() {
  cache = emptyCounts
  emit()
}

export async function refreshNavCounts(force = false) {
  if (shouldSkipRefresh(force)) return
  const token = getToken()
  if (!token) {
    resetCounts()
    return
  }
  if (inFlight) return inFlight

  cache = { ...cache, loading: true }
  emit()
  inFlight = fetch("/api/me/nav-counts", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return
      const data = (await response.json()) as NavCountsResponse
      const byActor: Record<string, number> = {}
      for (const item of data.conversations?.by_actor || []) {
        byActor[item.actor_id] = Number(item.unread_count) || 0
      }
      const serviceUnread = Number(data.serviceRequests?.unread_chats) || 0
      cache = {
        conversationUnread: Number(data.conversations?.total) || 0,
        conversationByActor: byActor,
        serviceUnread,
        serviceHasNew: !!data.serviceRequests?.has_new || serviceUnread > 0,
        notificationUnread: Number(data.notifications?.unread_count) || 0,
        updatedAt: Date.now(),
        loading: false,
      }
    })
    .catch(() => {
      cache = { ...cache, loading: false }
    })
    .finally(() => {
      inFlight = null
      emit()
    })

  return inFlight
}

function startListeners() {
  if (listenersStarted || typeof window === "undefined") return
  listenersStarted = true

  setInterval(() => {
    void refreshNavCounts()
  }, POLL_MS)

  window.addEventListener("focus", () => {
    void refreshNavCounts()
  })
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refreshNavCounts()
  })
  window.addEventListener("auth:changed", () => {
    cache = emptyCounts
    void refreshNavCounts(true)
  })
  window.addEventListener("storage", () => {
    cache = emptyCounts
    void refreshNavCounts(true)
  })
  window.addEventListener("mensagens:unread-changed", () => {
    void refreshNavCounts(true)
  })
  window.addEventListener("notifications:unread-changed", () => {
    void refreshNavCounts(true)
  })

  // Realtime: backend empurra "nav-counts:changed" sempre que algo relevante
  // muda (nova mensagem, nova notificação). Refrescamos imediato em vez de
  // esperar o próximo poll.
  onRealtime("nav-counts:changed", () => {
    void refreshNavCounts(true)
  })
  onRealtime("notification:new", () => {
    void refreshNavCounts(true)
  })
}

export function useNavCounts() {
  const [counts, setCounts] = useState(cache)

  useEffect(() => {
    startListeners()
    subscribers.add(setCounts)
    void refreshNavCounts()
    return () => {
      subscribers.delete(setCounts)
    }
  }, [])

  return {
    ...counts,
    refresh: refreshNavCounts,
  }
}
