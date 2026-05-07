"use client"

import { useEffect, useState } from "react"
import type { EntityFollowType, FollowCounts } from "@/lib/types/entity-follow"
import { cn } from "@/lib/utils"
import { EntityFollowModal } from "./entity-follow-modal"

interface EntityFollowStatsProps {
  entityType: EntityFollowType
  entityId: string
  className?: string
  refreshKey?: number
}

function defaultCounts(entityType: EntityFollowType): FollowCounts {
  return {
    followers_count: 0,
    following_count: 0,
    followers_label:
      entityType === "clan" ? "acompanham este clan" : "acompanham este perfil",
    following_label: "acompanhados",
  }
}

export function EntityFollowStats({
  entityType,
  entityId,
  className,
  refreshKey = 0,
}: EntityFollowStatsProps) {
  const [counts, setCounts] = useState<FollowCounts>(() => defaultCounts(entityType))
  const [openMode, setOpenMode] = useState<"followers" | "following" | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      try {
        const qs = new URLSearchParams({
          entity_type: entityType,
          entity_id: entityId,
        })
        const res = await fetch(`/api/entity-follows/counts?${qs}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setCounts({
            ...defaultCounts(entityType),
            ...data,
          })
        }
      } catch {
        // silencioso
      }
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [entityId, entityType, refreshKey])

  return (
    <>
      <div className={cn("flex flex-wrap items-center justify-center gap-3 md:justify-start", className)}>
        <button
          type="button"
          onClick={() => setOpenMode("followers")}
          className="rounded-lg border border-border/70 px-3 py-2 text-left transition-colors hover:bg-muted"
        >
          <span className="block text-sm font-bold tabular-nums">
            {counts.followers_count}
          </span>
          <span className="block text-xs text-muted-foreground">
            {counts.followers_label}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpenMode("following")}
          className="rounded-lg border border-border/70 px-3 py-2 text-left transition-colors hover:bg-muted"
        >
          <span className="block text-sm font-bold tabular-nums">
            {counts.following_count}
          </span>
          <span className="block text-xs text-muted-foreground">
            {counts.following_label}
          </span>
        </button>
      </div>

      <EntityFollowModal
        open={openMode === "followers"}
        onOpenChange={(open) => setOpenMode(open ? "followers" : null)}
        entityType={entityType}
        entityId={entityId}
        mode="followers"
      />
      <EntityFollowModal
        open={openMode === "following"}
        onOpenChange={(open) => setOpenMode(open ? "following" : null)}
        entityType={entityType}
        entityId={entityId}
        mode="following"
      />
    </>
  )
}
