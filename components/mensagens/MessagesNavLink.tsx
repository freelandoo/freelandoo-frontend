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
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useNavCounts } from "@/components/navigation/use-nav-counts"

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
  const t = useTranslations("Messages")
  const router = useRouter()
  const navCounts = useNavCounts()
  const [authed, setAuthed] = useState<boolean>(false)
  const [open, setOpen] = useState(false)
  const [actors, setActors] = useState<ActorItem[]>([])

  const serviceUnread = navCounts.serviceUnread
  const unread = navCounts.conversationUnread + serviceUnread
  // Chat ao vivo (Global/Enxames) é não-lido por escopo, sem contagem precisa →
  // vira bolinha quando não há badge numérico de conversa/O.S.
  const chatHasUnread = navCounts.chatTotal > 0

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
      setActors([])
      return
    }
    if (!open) return

    let cancelled = false
    const fetchActors = async () => {
      const token = getToken()
      if (!token) return
      try {
        const res = await fetch("/api/entity-follows/actors", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const data = res.ok ? ((await res.json()) as ActorsResponse) : { actors: [] }
        if (!cancelled) setActors(Array.isArray(data.actors) ? data.actors : [])
      } catch {
        if (!cancelled) setActors([])
      }
    }

    void fetchActors()
    return () => {
      cancelled = true
    }
  }, [authed, open])

  if (!authed) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("messagesHeaderTitle", "Mensagens")}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white ${className}`}
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-black">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : chatHasUnread ? (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-black" />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("messagesDropdownLabel", "Mensagens")}</DropdownMenuLabel>
        {serviceUnread > 0 && (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push("/mensagens?tab=os")}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="flex-1">{t("myRequestsLabel", "Minhas solicitações")}</span>
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
            {t("openMessagesLabel", "Abrir mensagens")}
          </DropdownMenuItem>
        ) : (
          actors.map((actor) => {
            const count = navCounts.conversationByActor[actor.id] || 0
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
                  <span className="block truncate text-sm">{actor.display_name || t("subprofileLabel", "Subperfil")}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {actor.type === "clan" ? t("clanLabel", "Clan") : actor.username ? `@${actor.username}` : t("subprofileLabel", "Subperfil")}
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
