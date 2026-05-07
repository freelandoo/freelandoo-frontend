"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { EntityFollowType, FollowActor, FollowCounts } from "@/lib/types/entity-follow"

interface FollowButtonProps {
  targetType: EntityFollowType
  targetId: string
  className?: string
  compact?: boolean
  onChanged?: (next: { isFollowing: boolean; counts?: FollowCounts }) => void
}

function actorKey(actor: Pick<FollowActor, "type" | "id">) {
  return `${actor.type}:${actor.id}`
}

function actorLabel(actor: FollowActor) {
  const kind = actor.type === "clan" ? "Clan" : "Perfil"
  return `${kind}: ${actor.display_name || "Sem nome"}`
}

export function FollowButton({
  targetType,
  targetId,
  className,
  compact = false,
  onChanged,
}: FollowButtonProps) {
  const router = useRouter()
  const [actors, setActors] = useState<FollowActor[]>([])
  const [selectedKey, setSelectedKey] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)
  const [loadingActors, setLoadingActors] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [pending, setPending] = useState(false)
  const [hoveringActive, setHoveringActive] = useState(false)
  const [error, setError] = useState("")

  const selectedActor = useMemo(
    () => actors.find((actor) => actorKey(actor) === selectedKey) || null,
    [actors, selectedKey]
  )

  useEffect(() => {
    let cancelled = false
    async function loadActors() {
      const token = getToken()
      if (!token) {
        setActors([])
        setLoadingActors(false)
        return
      }

      setLoadingActors(true)
      try {
        const res = await fetch("/api/entity-follows/actors", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("actors")
        const data = await res.json()
        const list: FollowActor[] = Array.isArray(data.actors) ? data.actors : []
        if (cancelled) return
        setActors(list)
        const firstUsable =
          list.find((actor) => !(actor.type === targetType && actor.id === targetId)) ||
          list[0]
        setSelectedKey(firstUsable ? actorKey(firstUsable) : "")
      } catch {
        if (!cancelled) setActors([])
      } finally {
        if (!cancelled) setLoadingActors(false)
      }
    }
    loadActors()
    return () => {
      cancelled = true
    }
  }, [targetId, targetType])

  useEffect(() => {
    let cancelled = false
    async function loadStatus() {
      const token = getToken()
      if (!token || !selectedActor) {
        setIsFollowing(false)
        return
      }

      setLoadingStatus(true)
      try {
        const qs = new URLSearchParams({
          actor_type: selectedActor.type,
          actor_id: selectedActor.id,
          target_type: targetType,
          target_id: targetId,
        })
        const res = await fetch(`/api/entity-follows/status?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("status")
        const data = await res.json()
        if (!cancelled) setIsFollowing(!!data.is_following)
      } catch {
        if (!cancelled) setIsFollowing(false)
      } finally {
        if (!cancelled) setLoadingStatus(false)
      }
    }
    loadStatus()
    return () => {
      cancelled = true
    }
  }, [selectedActor, targetId, targetType])

  async function handleToggle() {
    const token = getToken()
    if (!token) {
      const next =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/"
      router.push(`/login?next=${encodeURIComponent(next)}`)
      return
    }

    if (!selectedActor || pending || loadingActors || loadingStatus) {
      setError("Não foi possível atualizar agora.")
      return
    }

    if (selectedActor.type === targetType && selectedActor.id === targetId) {
      setError("A entidade não pode acompanhar ela mesma.")
      return
    }

    const previous = isFollowing
    const next = !previous
    setError("")
    setIsFollowing(next)
    setPending(true)

    try {
      const res = await fetch("/api/entity-follows", {
        method: previous ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actor_type: selectedActor.type,
          actor_id: selectedActor.id,
          target_type: targetType,
          target_id: targetId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "follow")
      const finalState =
        typeof data.is_following === "boolean" ? data.is_following : next
      setIsFollowing(finalState)
      onChanged?.({ isFollowing: finalState, counts: data.counts })
    } catch {
      setIsFollowing(previous)
      setError("Não foi possível atualizar agora.")
    } finally {
      setPending(false)
    }
  }

  const busy = pending || loadingActors || loadingStatus
  const label = isFollowing
    ? hoveringActive
      ? "Deixar de acompanhar"
      : "Acompanhando"
    : "Acompanhar"

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", compact && "w-full")}>
      <div className={cn("flex items-center gap-2", compact && "w-full")}>
        {actors.length > 1 && (
          <select
            value={selectedKey}
            onChange={(event) => {
              setError("")
              setSelectedKey(event.target.value)
            }}
            className={cn(
              "h-9 max-w-[180px] rounded-md border border-border bg-background px-2 text-xs font-medium outline-none transition-colors hover:bg-muted",
              compact && "h-8 max-w-[130px]"
            )}
            aria-label="Acompanhar como"
          >
            {actors.map((actor) => (
              <option key={actorKey(actor)} value={actorKey(actor)}>
                {actorLabel(actor)}
              </option>
            ))}
          </select>
        )}

        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant={isFollowing ? "outline" : "default"}
          onClick={handleToggle}
          onMouseEnter={() => setHoveringActive(true)}
          onMouseLeave={() => setHoveringActive(false)}
          disabled={busy}
          className={cn(
            "font-semibold transition-all",
            compact ? "min-w-[118px] flex-1" : "min-w-[142px]",
            isFollowing &&
              "border-white/15 bg-white/[0.03] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200",
            className
          )}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {label}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
