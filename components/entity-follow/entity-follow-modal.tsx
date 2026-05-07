"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EntityFollowType, FollowEntity, FollowListResponse } from "@/lib/types/entity-follow"
import { EntityFollowListItem } from "./entity-follow-list-item"

type FollowListMode = "followers" | "following"

interface EntityFollowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: EntityFollowType
  entityId: string
  mode: FollowListMode
}

function emptyText(mode: FollowListMode, entityType: EntityFollowType) {
  if (mode === "followers") {
    return entityType === "clan"
      ? "Ainda ninguém acompanha este clan."
      : "Ainda ninguém acompanha este perfil."
  }
  return entityType === "clan"
    ? "Este clan ainda não acompanha ninguém."
    : "Este perfil ainda não acompanha ninguém."
}

export function EntityFollowModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  mode,
}: EntityFollowModalProps) {
  const [items, setItems] = useState<FollowEntity[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function loadPage(cursor?: string | null, replace = false) {
    setLoading(true)
    setError("")
    try {
      const qs = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        limit: "20",
      })
      if (cursor) qs.set("cursor", cursor)

      const res = await fetch(`/api/entity-follows/${mode}?${qs}`)
      if (!res.ok) throw new Error("list")
      const data = (await res.json()) as FollowListResponse
      setItems((prev) => (replace ? data.items || [] : [...prev, ...(data.items || [])]))
      setNextCursor(data.next_cursor || null)
      setHasMore(!!data.has_more)
    } catch {
      setError("Não foi possível carregar agora.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setItems([])
    setNextCursor(null)
    setHasMore(false)
    loadPage(null, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityType, entityId, mode])

  const title = mode === "followers" ? "Acompanham" : "Acompanhados"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] overflow-hidden p-0 sm:max-w-[620px]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "followers"
              ? "Entidades profissionais que acompanham esta página."
              : "Entidades profissionais acompanhadas por esta página."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {items.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {emptyText(mode, entityType)}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <EntityFollowListItem key={`${item.type}:${item.id}`} entity={item} />
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          <p className="text-xs text-muted-foreground">
            {items.length > 0 ? `${items.length} carregados` : "Lista"}
          </p>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPage(nextCursor)}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Carregar mais
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
