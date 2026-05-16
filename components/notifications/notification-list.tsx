"use client"

import Link from "next/link"
import { Heart, MessageSquare, UserPlus, Mail } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface NotificationItem {
  id_notification: string
  type: string
  entity_type: string | null
  entity_id: string | null
  id_recipient_profile: string | null
  read_at: string | null
  created_at: string
  payload: Record<string, unknown>
  actor: {
    id_user: string | null
    username: string | null
    id_profile: string | null
    profile_display_name: string | null
    profile_avatar_url: string | null
  } | null
}

interface NotificationListProps {
  items: NotificationItem[]
  onMarkRead?: (id: string) => void
  emptyHint?: string
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "agora"
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}sem`
}

function labelFor(item: NotificationItem) {
  const who = item.actor?.profile_display_name || item.actor?.username || "Alguém"
  switch (item.type) {
    case "like_received": return `${who} curtiu seu portfólio`
    case "comment_received": return `${who} comentou no seu portfólio`
    case "follow_received": return `${who} começou a seguir`
    case "message_received": return `${who} mandou uma mensagem`
    default: return who
  }
}

function iconFor(type: string) {
  switch (type) {
    case "like_received": return <Heart className="h-3.5 w-3.5" />
    case "comment_received": return <MessageSquare className="h-3.5 w-3.5" />
    case "follow_received": return <UserPlus className="h-3.5 w-3.5" />
    case "message_received": return <Mail className="h-3.5 w-3.5" />
    default: return null
  }
}

function hrefFor(item: NotificationItem): string {
  switch (item.type) {
    case "like_received":
    case "comment_received":
      return "/feed"
    case "follow_received":
      return item.actor?.username ? `/account` : "/account"
    case "message_received":
      return "/mensagens"
    default:
      return "/account"
  }
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

export function NotificationList({ items, onMarkRead, emptyHint = "Sem notificações." }: NotificationListProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-white/55">{emptyHint}</div>
    )
  }
  return (
    <ul className="divide-y divide-white/[0.06]">
      {items.map((item) => {
        const isUnread = !item.read_at
        const name = item.actor?.profile_display_name || item.actor?.username || "Alguém"
        return (
          <li key={item.id_notification}>
            <Link
              href={hrefFor(item)}
              onClick={() => isUnread && onMarkRead?.(item.id_notification)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]",
                isUnread && "bg-amber-400/[0.04]"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 ring-1 ring-white/15">
                  {item.actor?.profile_avatar_url && (
                    <AvatarImage src={item.actor.profile_avatar_url} alt={name} />
                  )}
                  <AvatarFallback className="bg-zinc-800 text-xs font-semibold text-white/80">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-zinc-900 ring-2 ring-zinc-950">
                  {iconFor(item.type)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-white/90">{labelFor(item)}</p>
                <p className="mt-0.5 text-[11px] text-white/45">{relativeTime(item.created_at)}</p>
              </div>
              {isUnread && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
