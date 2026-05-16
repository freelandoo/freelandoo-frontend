"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2, Crown } from "lucide-react"
import { MACHINES } from "@/components/home/machines/tokens"
import { MachineTop10Crown } from "@/components/profile/machine-top10-crown"
import { buildProfileUrl } from "@/lib/slug"
import { cn } from "@/lib/utils"

interface ProfileStatus {
  id_status: string
  desc_status: string
}

interface RedeSocial {
  url: string
  social_id: string
  follower_range: string
  social_media_type: string
}

interface Creator {
  id_profile: string
  display_name: string
  bio: string
  avatar_url: string | null
  estado: string
  municipio: string
  category: string
  profession_slug?: string | null
  sub_profile_slug?: string | null
  id_user: string
  username?: string | null
  user_nome: string
  user_avatar: string
  profile_statuses?: ProfileStatus[]
  redes_sociais?: RedeSocial[]
  machine_slug?: string | null
  is_clan?: boolean
  members_count?: number | null
  is_premium?: boolean
}

interface FreelancerTileProps {
  creator: Creator
  featured?: boolean
}

function getMachineColors(slug: string | null | undefined) {
  if (!slug) return null
  const m = MACHINES.find((x) => x.id === slug)
  return m?.colors ?? null
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Card 9:16 edge-to-edge para a grid de /search.
 * Sem bordas, sem margens externas — encosta no vizinho.
 */
export function FreelancerTile({ creator, featured = false }: FreelancerTileProps) {
  const router = useRouter()
  const isPremium = featured || !!creator.is_premium
  const colors = getMachineColors(creator.machine_slug)
  const accent = colors?.accent || "#fbbf24"

  const handleClick = () => {
    if (creator.is_clan) {
      router.push(`/clans/${creator.id_profile}`)
      return
    }
    if (creator.username && creator.profession_slug) {
      router.push(
        buildProfileUrl({
          profession_slug: creator.profession_slug,
          municipio: creator.municipio,
          handle: creator.username,
          sub_profile_slug: creator.sub_profile_slug ?? null,
        })
      )
      return
    }
    router.push(`/freelancer/${creator.id_profile}`)
  }

  const image = creator.avatar_url || creator.user_avatar
  const name = creator.display_name || creator.user_nome

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative block aspect-[9/16] w-full overflow-hidden bg-zinc-900 text-left transition-transform duration-300 active:scale-[0.98]",
      )}
      data-machine={creator.machine_slug || undefined}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(160deg, ${colors?.from || "#1a1a1a"}55, #0a0a0a)` }}
        >
          <span className="text-5xl font-bold text-white/80">{initials(name)}</span>
        </div>
      )}

      {isPremium && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: `inset 0 0 0 2px ${accent}aa, inset 0 0 80px -20px ${accent}77`,
            }}
          />
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-900 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.6)]">
            <Crown className="h-2.5 w-2.5 fill-zinc-900" />
            Premium
          </span>
        </>
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/55 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-1 p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="line-clamp-1 text-sm font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]">
            {name}
          </h3>
          <MachineTop10Crown
            profileId={creator.id_profile}
            accentColor={accent}
            iconClassName="h-3.5 w-3.5"
          />
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
        </div>
        <p
          className="line-clamp-1 text-[11px] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
          style={{ color: accent }}
        >
          {creator.is_clan
            ? `Clan${creator.members_count ? ` · ${creator.members_count}` : ""}`
            : creator.category}
        </p>
        <p className="line-clamp-1 text-[10px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {creator.municipio}{creator.estado ? `, ${creator.estado}` : ""}
        </p>
      </div>
    </button>
  )
}
