"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FollowEntity } from "@/lib/types/entity-follow"
import { entityHref, entityInitials, entityMeta, entityTypeLabel } from "./entity-follow-utils"
import { FollowButton } from "./follow-button"

interface EntityFollowListItemProps {
  entity: FollowEntity
}

export function EntityFollowListItem({ entity }: EntityFollowListItemProps) {
  const href = entityHref(entity)
  const meta = entityMeta(entity)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
      <Avatar className="h-11 w-11 shrink-0 border border-border">
        {entity.avatar_url ? (
          <AvatarImage src={entity.avatar_url} alt={entity.display_name || ""} />
        ) : null}
        <AvatarFallback className="text-xs font-semibold">
          {entityInitials(entity.display_name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">
            {entity.display_name || "Sem nome"}
          </p>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {entityTypeLabel(entity.type)}
          </Badge>
        </div>
        {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <FollowButton targetType={entity.type} targetId={entity.id} compact />
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href={href}>
            Ver
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <Button asChild size="icon-sm" variant="outline" className="shrink-0 sm:hidden">
        <Link href={href} aria-label="Ver">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}
