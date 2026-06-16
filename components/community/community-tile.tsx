"use client"

// Tile de comunidade na pele VITRINE (mesma linguagem dos cards de Curso/Serviço
// do /search): capa 16:9 + chip de enxame + avatar + rodapé tabloide claro.
// Reusado em: aba "Comunidades" do enxame, /comunidades e a aba do /account.

import Link from "next/link"
import { Users, Trophy, Crown, Shield } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"

export type CommunityTileData = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  banner_url?: string | null
  enxame_name: string | null
  member_count: number
  xp_level: number
  community_theme?: { accent?: string } | null
  role?: "leader" | "vice" | "member" | null
}

// Mesma paleta de accent da página da comunidade (detalhe recolorível).
const ACCENT_HEX: Record<string, string> = {
  gold: "#F2B705", magenta: "#ff1f8e", cyan: "#16c8e8", purple: "#a06bff",
  leaf: "#4fc95a", red: "#ff5a44", orange: "#ff8c2e", gray: "#b8b1a6",
}
function accentOf(c: CommunityTileData): string {
  return ACCENT_HEX[c.community_theme?.accent || "gold"] || ACCENT_HEX.gold
}
function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

export function CommunityTile({ community }: { community: CommunityTileData }) {
  const t = useTranslations("Community")
  const tx = useTaxonomy()
  const accent = accentOf(community)
  const roleLabel =
    community.role === "leader" ? t("roleLeader", "Líder")
      : community.role === "vice" ? t("roleVice", "Vice-líder")
        : community.role ? t("roleMember", "Membro") : null
  const RoleIcon = community.role === "leader" ? Crown : community.role === "vice" ? Shield : null

  return (
    <Link
      href={`/comunidades/${community.id_profile}`}
      className="group relative flex flex-col overflow-hidden bg-zinc-900 transition-transform duration-300 active:scale-[0.98]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}2e, #15120E 70%)` }}>
        {community.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.banner_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {community.enxame_name && (
          <span
            className="absolute left-2 top-2 bg-black/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] backdrop-blur"
            style={{ color: accent }}
          >
            {tx.enxame(null, community.enxame_name)}
          </span>
        )}
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 bg-black/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] backdrop-blur">
          <Trophy className="h-3 w-3" style={{ color: accent }} /> {community.xp_level}
        </span>

        {/* avatar sobreposto */}
        <span
          className="absolute bottom-2 left-2 inline-flex h-11 w-11 items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] text-xs font-bold text-[#F2B705]"
          style={{ outline: `2px solid ${accent}`, outlineOffset: "1px" }}
        >
          {community.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            initials(community.display_name)
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t-2 border-[#0B0B0D] bg-[#F1EDE2] p-3">
        <p className="line-clamp-1 text-[13px] font-bold leading-tight text-[#0B0B0D]">{community.display_name}</p>
        <div className="mt-auto flex items-center justify-between gap-2 text-[10px] font-semibold text-[#6B6457]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {community.member_count} {t("membersCount", "membros")}
          </span>
          {roleLabel && (
            <span className="inline-flex items-center gap-1 font-extrabold uppercase tracking-[0.08em]" style={{ color: "#9a7400" }}>
              {RoleIcon && <RoleIcon className="h-3 w-3" />} {roleLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
