"use client"

import { sendFeedEvent } from "@/lib/feed-events"
import type { FeedFilters } from "@/lib/types/portfolio-feed"

const REPORTED_KEY = "feed_impressions_reported"
const FLUSH_INTERVAL_MS = 3000
const MAX_QUEUE = 12

interface QueuedImpression {
  post_id: string
  filters: FeedFilters | null
}

let queue: QueuedImpression[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let unloadBound = false

function loadReported(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.sessionStorage.getItem(REPORTED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === "string"))
  } catch {
    return new Set()
  }
}

function saveReported(set: Set<string>) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(REPORTED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignora quotas
  }
}

const reported = loadReported()

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushImpressions()
  }, FLUSH_INTERVAL_MS)
}

function bindUnloadOnce() {
  if (unloadBound || typeof window === "undefined") return
  unloadBound = true
  const flushSync = () => {
    void flushImpressions()
  }
  // visibilitychange é mais confiável que beforeunload em mobile.
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSync()
  })
  window.addEventListener("pagehide", flushSync)
}

export function queueImpression(post_id: string, filters: FeedFilters | null) {
  if (!post_id) return
  if (reported.has(post_id)) return
  reported.add(post_id)
  saveReported(reported)
  queue.push({ post_id, filters })
  bindUnloadOnce()
  if (queue.length >= MAX_QUEUE) {
    void flushImpressions()
  } else {
    scheduleFlush()
  }
}

export async function flushImpressions(): Promise<void> {
  if (queue.length === 0) return
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const batch = queue
  queue = []
  await Promise.allSettled(
    batch.map((item) =>
      sendFeedEvent({
        post_id: item.post_id,
        event_type: "impression",
        filters: item.filters,
      })
    )
  )
}

export function resetImpressionsForTesting() {
  queue = []
  reported.clear()
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(REPORTED_KEY)
  }
}
