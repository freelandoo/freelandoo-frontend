"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ClipboardList, MessageCircle, Users } from "lucide-react"
import { getToken } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const POLL_MS = 30_000

interface UnreadResponse {
  total?: number
  by_actor?: Array<{ actor_id: string; unread_count: number }>
}

interface ServiceBadgeResponse {
  unread_chats?: number
  mural_count?: number
  chat_unread?: number
}

interface ActorItem {
  id: string
  type: "profile" | "clan"
  display_name: string | null
  avatar_url: string | null
  username: string | null
  sub_profile_slug: string | null
}

interface ActorsResponse {
  actors?: ActorItem[]
}

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?"
}

export default function MessagesNavLink({ className = "" }: { className?: string }) {
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [authed, setAuthed] = useState<boolean>(false)
  const [actors, setActors] = useState<ActorItem[]>([])
  const [actorUnread, setActorUnread] = useState<Record<string, number>>({})
  const [serviceUnread, setServiceUnread] = useState(0)

  useEffect(() => {
    const sync = () => setAuthed(!!getToken())
    sync()
    window.addEventListener("auth:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("auth:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  useEffect(() => {
    if (!authed) {
      // reset defensivo quando o usuário desloga sem unmount.
       
      setUnread(0)
      return
    }
    let cancelled = false

    const fetchUnread = async () => {
      const token = getToken()
      if (!token) return
      try {
        const [convRes, serviceRes, actorsRes] = await Promise.all([
          fetch("/api/conversations/unread-count", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/service-requests/badge/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/entity-follows/actors", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ])
        const convData = convRes.ok ? ((await convRes.json()) as UnreadResponse) : { total: 0, by_actor: [] }
        const serviceData = serviceRes.ok ? ((await serviceRes.json()) as ServiceBadgeResponse) : { unread_chats: 0 }
        const actorsData = actorsRes.ok ? ((await actorsRes.json()) as ActorsResponse) : { actors: [] }
        const actorList = Array.isArray(actorsData.actors) ? actorsData.actors : []
        const convByActor = new Map(
          (convData.by_actor || []).map((item) => [item.actor_id, Number(item.unread_count) || 0])
        )
        const serviceByActorEntries = await Promise.all(
          actorList.map(async (actor) => {
            try {
              const res = await fetch(`/api/service-requests/badge?id_profile=${encodeURIComponent(actor.id)}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
              })
              if (!res.ok) return [actor.id, 0] as const
              const data = (await res.json()) as ServiceBadgeResponse
              return [actor.id, (Number(data.mural_count) || 0) + (Number(data.chat_unread) || 0)] as const
            } catch {
              return [actor.id, 0] as const
            }
          })
        )
        const byActor: Record<string, number> = {}
        for (const actor of actorList) {
          byActor[actor.id] =
            (convByActor.get(actor.id) || 0) +
            (serviceByActorEntries.find(([id]) => id === actor.id)?.[1] || 0)
        }
        const osUnread = Number(serviceData.unread_chats) || 0
        if (!cancelled) {
          setActors(actorList)
          setActorUnread(byActor)
          setServiceUnread(osUnread)
          setUnread((Number(convData.total) || 0) + osUnread)
        }
      } catch {
        // silencioso
      }
    }

    fetchUnread()
    const t = setInterval(fetchUnread, POLL_MS)
    const onChanged = () => fetchUnread()
    window.addEventListener("mensagens:unread-changed", onChanged)

    return () => {
      cancelled = true
      clearInterval(t)
      window.removeEventListener("mensagens:unread-changed", onChanged)
    }
  }, [authed])

  if (!authed) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Mensagens"
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white ${className}`}
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-black">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Mensagens</DropdownMenuLabel>
        {serviceUnread > 0 && (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push("/mensagens?tab=os")}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="flex-1">Minhas solicitações</span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {serviceUnread > 99 ? "99+" : serviceUnread}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {actors.length === 0 ? (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => router.push("/mensagens")}
          >
            <MessageCircle className="h-4 w-4" />
            Abrir mensagens
          </DropdownMenuItem>
        ) : (
          actors.map((actor) => {
            const count = actorUnread[actor.id] || 0
            return (
              <DropdownMenuItem
                key={actor.id}
                className="cursor-pointer gap-3"
                onSelect={() => router.push(`/mensagens?actor=${encodeURIComponent(actor.id)}`)}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={actor.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{initials(actor.display_name)}</AvatarFallback>
                  </Avatar>
                  {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-popover" />
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{actor.display_name || "Subperfil"}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {actor.type === "clan" ? "Clan" : actor.username ? `@${actor.username}` : "Subperfil"}
                  </span>
                </span>
                {actor.type === "clan" ? <Users className="h-4 w-4 text-muted-foreground" /> : null}
                {count > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
