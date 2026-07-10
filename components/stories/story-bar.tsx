"use client"

import { useEffect, useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

// Bees v2 (2026-07-10): a faixa agrupa por USUÁRIO — 1 tile por user acompanhado
// com bee vivo, foto do user. O subperfil que postou aparece dentro do player.
export interface StoryBarEntry {
  id_user: string
  has_unviewed: boolean
  active_count: number
  last_posted_at: string | null
  user: {
    id_user: string
    username: string | null
    name: string | null
    avatar_url: string | null
  }
}

interface StoryBarProps {
  /** Cor padrão do anel metálico de não-visto */
  defaultAccent?: string
  onOpenUser: (entry: StoryBarEntry, all: StoryBarEntry[]) => void
  onCreate?: () => void
  /** Mostrar primeiro slot com a foto do próprio user (postar / ver meus bees) */
  showCreateSlot?: boolean
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

// Mesmo gradiente do anel neon do headcard do /account (identidade do bee).
const BEE_RING_GRADIENT =
  "conic-gradient(from 0deg, #ff2d95, #ff7ac8 55deg, #fff0fa 80deg, #ff7ac8 105deg, #ff2d95 160deg, #c4007a 250deg, #ff2d95 360deg)"

/**
 * Faixa horizontal de bees (stories) agrupada por user. Square avatars com
 * borda metálica quando há bee não-visto, transparente quando visto.
 * O 1º tile é o próprio viewer: foto do user + anel neon rosa quando ele tem
 * bees vivos (clique vê os próprios bees; o badge "+" sempre abre o composer).
 */
export function StoryBar({ defaultAccent = "#fbbf24", onOpenUser, onCreate, showCreateSlot }: StoryBarProps) {
  const t = useTranslations("Stories")
  const [entries, setEntries] = useState<StoryBarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<{ id_user: string; name: string | null; username: string | null; avatar: string | null } | null>(null)
  const [myBeeCount, setMyBeeCount] = useState(0)

  const load = async () => {
    const token = getToken()
    if (!token) {
      setEntries([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/stories/feed`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) {
        setEntries([])
        return
      }
      const data = await res.json()
      setEntries(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [])

  // Foto do user logado + bees vivos dele (anel neon do tile próprio).
  useEffect(() => {
    if (!showCreateSlot) return
    const token = getToken()
    if (!token) return
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id_user?: string; nome?: string | null; username?: string | null; avatar?: string | null } | null) => {
        if (data?.id_user) {
          setMe({ id_user: data.id_user, name: data.nome ?? null, username: data.username ?? null, avatar: data.avatar ?? null })
        }
      })
      .catch(() => {})
    fetch("/api/me/stories", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: Array<{ kind?: string }> } | null) => {
        if (data && Array.isArray(data.items)) {
          setMyBeeCount(data.items.filter((s) => s.kind === "bee").length)
        }
      })
      .catch(() => {})
  }, [showCreateSlot])

  if (!showCreateSlot && entries.length === 0 && !loading) return null

  const meEntry: StoryBarEntry | null =
    me && myBeeCount > 0
      ? {
          id_user: me.id_user,
          has_unviewed: false,
          active_count: myBeeCount,
          last_posted_at: null,
          user: { id_user: me.id_user, username: me.username, name: me.name, avatar_url: me.avatar },
        }
      : null

  return (
    <div className="relative w-full" data-tour="feed-stories-rest">
      <div className="flex gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showCreateSlot && (
          <MeTile
            label={meEntry ? t("yourBees", "Seus bees") : t("postButton", "Postar")}
            avatarUrl={me?.avatar || null}
            name={me?.name || me?.username || null}
            hasBees={!!meEntry}
            accent={defaultAccent}
            onOpen={() => {
              if (meEntry) onOpenUser(meEntry, [meEntry])
              else onCreate?.()
            }}
            onCreate={onCreate}
          />
        )}
        {loading && entries.length === 0 && (
          <div className="flex h-16 items-center px-2 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {entries.map((entry) => (
          <StoryTile
            key={entry.id_user}
            label={entry.user.name || entry.user.username || "User"}
            avatarUrl={entry.user.avatar_url}
            hasUnviewed={entry.has_unviewed}
            accent={defaultAccent}
            onClick={() => onOpenUser(entry, entries)}
          />
        ))}
      </div>
    </div>
  )
}

interface StoryTileProps {
  label: string
  avatarUrl?: string | null
  hasUnviewed?: boolean
  accent: string
  onClick?: () => void
}

function StoryTile({ label, avatarUrl, hasUnviewed, accent, onClick }: StoryTileProps) {
  const t = useTranslations("Stories")
  const showMetallic = !!hasUnviewed
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
      aria-label={t("storyOf", "Story de {label}").replace("{label}", label)}
    >
      <div
        className="relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-[14px] p-[2px] transition-transform duration-200 group-active:scale-95"
        style={
          showMetallic
            ? {
                background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 50%, #ffffff) 50%, ${accent} 100%)`,
                boxShadow: `0 0 18px -4px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.35)`,
              }
            : {
                background: "transparent",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
              }
        }
      >
        <Avatar className="h-full w-full rounded-[12px]">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={label} className="rounded-[12px] object-cover" />
          ) : null}
          <AvatarFallback className="rounded-[12px] bg-zinc-900 text-xs font-semibold text-white/80">
            {initials(label)}
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="line-clamp-1 max-w-[68px] text-center text-[10px] font-medium text-white/75">
        {label}
      </span>
    </button>
  )
}

/** Tile do próprio viewer: foto do user; anel neon rosa girando quando ele tem
 *  bees vivos (clique abre os próprios bees). O badge "+" sempre cria um novo. */
function MeTile({
  label,
  avatarUrl,
  name,
  hasBees,
  accent,
  onOpen,
  onCreate,
}: {
  label: string
  avatarUrl: string | null
  name: string | null
  hasBees: boolean
  accent: string
  onOpen: () => void
  onCreate?: () => void
}) {
  const t = useTranslations("Stories")
  return (
    <div className="relative flex w-[68px] shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={hasBees ? t("yourBees", "Seus bees") : t("createStoryAria", "Criar story")}
        className="group relative flex h-[68px] w-[68px] items-center justify-center transition-transform duration-200 active:scale-95"
      >
        {hasBees && (
          <div className="pointer-events-none absolute -inset-[3px] overflow-hidden rounded-[16px]">
            <motion.div
              className="absolute -inset-[120%]"
              style={{ background: BEE_RING_GRADIENT }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
            />
          </div>
        )}
        <div
          className="relative h-full w-full overflow-hidden rounded-[14px] p-[2px]"
          style={
            hasBees
              ? { background: "transparent" }
              : { boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)" }
          }
        >
          <Avatar className="h-full w-full rounded-[12px] bg-zinc-900">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={name || label} className="rounded-[12px] object-cover" />
            ) : null}
            <AvatarFallback className="rounded-[12px] bg-zinc-900 text-xs font-semibold text-white/80">
              {name ? initials(name) : <Plus className="h-6 w-6" style={{ color: accent }} />}
            </AvatarFallback>
          </Avatar>
        </div>
      </button>
      {/* Badge "+": sempre cria bee novo, mesmo já tendo bees vivos. */}
      <button
        type="button"
        onClick={onCreate}
        aria-label={t("createStoryAria", "Criar story")}
        className="absolute -bottom-0.5 right-0 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-black/80 text-black"
        style={{ background: accent, transform: "translateY(-18px)" }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="line-clamp-1 max-w-[68px] text-center text-[10px] font-medium text-white/75">
        {label}
      </span>
    </div>
  )
}
