"use client"

import { useEffect, useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

export type StoryKind = "trampo" | "rest"

export interface StoryBarEntry {
  id_profile: string
  has_unviewed: boolean
  active_count: number
  last_posted_at: string | null
  profile: {
    id_profile: string
    id_user: string
    display_name: string | null
    avatar_url: string | null
    is_clan: boolean
    username: string | null
    sub_profile_slug: string | null
  }
  machine: {
    name: string
    slug: string
    color_from: string | null
    color_to: string | null
    color_ring: string | null
    color_accent: string | null
  } | null
}

interface StoryBarProps {
  kind: StoryKind
  /** Cor padrão se a entry não tiver máquina associada */
  defaultAccent?: string
  onOpenProfile: (entry: StoryBarEntry, all: StoryBarEntry[]) => void
  onCreate?: () => void
  /** Mostrar primeiro slot "+" para criar story (apenas se houver subperfis elegíveis) */
  showCreateSlot?: boolean
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

/**
 * Faixa horizontal de stories. Square avatars com borda metálica na cor
 * da máquina quando há story não-visto, transparente quando não tem.
 */
export function StoryBar({ kind, defaultAccent = "#fbbf24", onOpenProfile, onCreate, showCreateSlot }: StoryBarProps) {
  const t = useTranslations("Stories")
  const [entries, setEntries] = useState<StoryBarEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const token = getToken()
    if (!token) {
      setEntries([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/stories/feed?kind=${kind}`, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  if (!showCreateSlot && entries.length === 0 && !loading) return null

  return (
    <div className="relative w-full">
      <div className="flex gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showCreateSlot && (
          <StoryTile
            label={t("postButton", "Postar")}
            onClick={onCreate}
            accent={defaultAccent}
            createSlot
          />
        )}
        {loading && entries.length === 0 && (
          <div className="flex h-16 items-center px-2 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {entries.map((entry) => {
          const machineAccent = entry.machine?.color_accent || defaultAccent
          const machineFrom = entry.machine?.color_from || machineAccent
          const machineTo = entry.machine?.color_to || machineAccent
          return (
            <StoryTile
              key={entry.id_profile}
              label={entry.profile.display_name || entry.profile.username || "Perfil"}
              avatarUrl={entry.profile.avatar_url}
              hasUnviewed={entry.has_unviewed}
              accent={machineAccent}
              gradientFrom={machineFrom}
              gradientTo={machineTo}
              onClick={() => onOpenProfile(entry, entries)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface StoryTileProps {
  label: string
  avatarUrl?: string | null
  hasUnviewed?: boolean
  accent: string
  gradientFrom?: string
  gradientTo?: string
  onClick?: () => void
  createSlot?: boolean
}

function StoryTile({ label, avatarUrl, hasUnviewed, accent, gradientFrom, gradientTo, onClick, createSlot }: StoryTileProps) {
  const t = useTranslations("Stories")
  const showMetallic = !!hasUnviewed
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5"
      aria-label={createSlot ? t("createStoryAria", "Criar story") : t("storyOf", "Story de {label}").replace("{label}", label)}
    >
      <div
        className={cn(
          "relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-[14px] p-[2px] transition-transform duration-200 group-active:scale-95",
        )}
        style={
          showMetallic
            ? {
                background: `linear-gradient(135deg, ${gradientFrom || accent} 0%, color-mix(in srgb, ${accent} 50%, #ffffff) 50%, ${gradientTo || accent} 100%)`,
                boxShadow: `0 0 18px -4px ${accent}aa, inset 0 1px 0 rgba(255,255,255,0.35)`,
              }
            : {
                background: "transparent",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
              }
        }
      >
        {createSlot ? (
          <div
            className="flex h-full w-full items-center justify-center rounded-[12px] bg-zinc-900"
            style={{ border: `1px dashed ${accent}66` }}
          >
            <Plus className="h-6 w-6" style={{ color: accent }} />
          </div>
        ) : (
          <Avatar className="h-full w-full rounded-[12px]">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={label} className="rounded-[12px] object-cover" />
            ) : null}
            <AvatarFallback className="rounded-[12px] bg-zinc-900 text-xs font-semibold text-white/80">
              {initials(label)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <span className="line-clamp-1 max-w-[68px] text-center text-[10px] font-medium text-white/75">
        {createSlot ? t("postButton", "Postar") : label}
      </span>
    </button>
  )
}
