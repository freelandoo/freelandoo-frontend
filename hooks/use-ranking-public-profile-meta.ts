"use client"

import { useEffect, useState } from "react"

/** Subconjunto do JSON de `/api/ranking/public/profile/:id` usado na UI do perfil. */
export type RankingPublicProfileMeta = {
  avg_rating?: number | string | null
  ratings_count?: number | null
  position_machine?: number | string | null
}

const inflight = new Map<string, Promise<RankingPublicProfileMeta | null>>()

function loadRankingPublicProfileMeta(
  profileId: string
): Promise<RankingPublicProfileMeta | null> {
  const existing = inflight.get(profileId)
  if (existing) return existing

  const p = fetch(`/api/ranking/public/profile/${profileId}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .finally(() => {
      inflight.delete(profileId)
    })

  inflight.set(profileId, p)
  return p
}

type HookResult = {
  /** `undefined` = ainda carregando ou `profileId` mudou; objeto (possivelmente vazio) = resposta tratada */
  data: RankingPublicProfileMeta | undefined
}

/** Meta pública de ranking + avaliação; deduplica requests paralelos ao mesmo `profileId`. */
export function useRankingPublicProfileMeta(profileId: string): HookResult {
  const [state, setState] = useState<{
    profileId: string
    meta: RankingPublicProfileMeta
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadRankingPublicProfileMeta(profileId).then((raw) => {
      if (cancelled) return
      setState({
        profileId,
        meta: raw && typeof raw === "object" ? raw : {},
      })
    })
    return () => {
      cancelled = true
    }
  }, [profileId])

  const data =
    state !== null && state.profileId === profileId ? state.meta : undefined

  return { data }
}
