"use client"

import { useEffect, useRef } from "react"
import { queueImpression } from "@/lib/feed-impressions"
import type { FeedFilters } from "@/lib/types/portfolio-feed"

const VISIBILITY_THRESHOLD = 0.5
const DWELL_MS = 500

/**
 * Observa o elemento referenciado e dispara `queueImpression(post_id)` quando
 * o card permanece com pelo menos 50% visível por 500ms. A dedup global vive
 * em `lib/feed-impressions.ts`, então re-mounts do card não geram duplicatas.
 */
export function useImpressionObserver(post_id: string, filters: FeedFilters) {
  const ref = useRef<HTMLElement | null>(null)
  // Mantém uma referência viva aos filtros para o callback do observer
  // sem reinicializar o observer a cada render.
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    const node = ref.current
    if (!node || !post_id) return
    if (typeof IntersectionObserver === "undefined") return

    let dwellTimer: ReturnType<typeof setTimeout> | null = null
    let fired = false

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
          if (fired || dwellTimer) return
          dwellTimer = setTimeout(() => {
            dwellTimer = null
            if (fired) return
            fired = true
            queueImpression(post_id, filtersRef.current)
            observer.disconnect()
          }, DWELL_MS)
        } else if (dwellTimer) {
          clearTimeout(dwellTimer)
          dwellTimer = null
        }
      },
      { threshold: [0, VISIBILITY_THRESHOLD, 1] }
    )

    observer.observe(node)
    return () => {
      if (dwellTimer) clearTimeout(dwellTimer)
      observer.disconnect()
    }
  }, [post_id])

  return ref
}
