"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  BarChart2,
  CalendarDays,
  Cog,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ícones de marca usados como brand badges
  Instagram,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Settings,
  Trophy,
  Users,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ícones de marca usados como brand badges
  Youtube,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FollowButton } from "@/components/entity-follow"
import { EntityFollowModal } from "@/components/entity-follow/entity-follow-modal"
import { AvatarRatingStar } from "@/components/profile/avatar-rating-star"
import { cn } from "@/lib/utils"

type EntityType = "profile" | "clan"

interface ProfileSocialLink {
  id_profile_social_media?: string
  desc_social_media_type?: string
  icon?: string
  profile_url: string
  is_active?: boolean
}

interface ProfileLike {
  display_name?: string | null
  avatar_url?: string | null
  user_avatar?: string | null
  bio?: string | null
  machine_name?: string | null
  desc_category?: string | null
  estado?: string | null
  municipio?: string | null
  is_paid?: boolean
  is_visible?: boolean
  is_active?: boolean
  social_media?: ProfileSocialLink[] | null
  members_count?: number | null
  username?: string | null
}

interface FollowCounts {
  followers_count: number
  following_count: number
  followers_label: string
  following_label: string
}

interface ProfileHeadCardProps {
  profile: ProfileLike
  profileId: string
  entityType: EntityType
  isClan: boolean
  isOwnProfile: boolean
  portfolioCount: number
  followRefreshKey?: number
  onFollowChanged?: () => void
  ownerActions?: {
    onEdit?: () => void
    editHref?: string
    onShowEngagement?: () => void
    onShowRanking?: () => void
    onShowMural?: () => void
    muralBadge?: { has_new?: boolean; chat_unread?: number }
    agendaHref?: string
    onShowMembers?: () => void
    clansHref?: string
    manageHref?: string
  }
  visitorActions?: {
    onShowRanking?: () => void
    onShowMembers?: () => void
    onScheduleScroll?: () => void
  }
  className?: string
}

function getInitials(name?: string | null): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function defaultCounts(entityType: EntityType): FollowCounts {
  return {
    followers_count: 0,
    following_count: 0,
    followers_label:
      entityType === "clan" ? "acompanham este clan" : "acompanham este perfil",
    following_label: "acompanhados",
  }
}

function getSocialIcon(icon?: string) {
  switch ((icon || "").toLowerCase()) {
    case "instagram":
      return <Instagram className="h-3.5 w-3.5" />
    case "youtube":
      return <Youtube className="h-3.5 w-3.5" />
    case "whatsapp":
      return <Phone className="h-3.5 w-3.5" />
    default:
      return <span className="block h-2 w-2 rounded-full bg-current" aria-hidden />
  }
}

export function ProfileHeadCard({
  profile,
  profileId,
  entityType,
  isClan,
  isOwnProfile,
  portfolioCount,
  followRefreshKey = 0,
  onFollowChanged,
  ownerActions,
  visitorActions,
  className,
}: ProfileHeadCardProps) {
  const [counts, setCounts] = useState<FollowCounts>(() => defaultCounts(entityType))
  const [openMode, setOpenMode] = useState<"followers" | "following" | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const qs = new URLSearchParams({ entity_type: entityType, entity_id: profileId })
        const res = await fetch(`/api/entity-follows/counts?${qs}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setCounts({ ...defaultCounts(entityType), ...data })
        }
      } catch {
        // silencioso
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileId, entityType, followRefreshKey])

  const isPublished = !!(profile.is_paid && profile.is_visible && profile.is_active)
  const statusBadge = useMemo(() => {
    if (!isOwnProfile) return null
    if (isPublished)
      return { label: "ativo", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" }
    if (profile.is_paid && !profile.is_visible)
      return { label: "rascunho", className: "border-white/15 bg-white/[0.04] text-white/60" }
    return { label: "não publicado", className: "border-amber-400/25 bg-amber-400/10 text-amber-300" }
  }, [isOwnProfile, isPublished, profile.is_paid, profile.is_visible])

  const socials = (profile.social_media || []).filter((s) => s.is_active !== false)
  const location = [profile.municipio, profile.estado].filter(Boolean).join(", ")
  const subtitle = [profile.desc_category, location].filter(Boolean).join(" · ")
  const avatarSrc = profile.avatar_url || profile.user_avatar || undefined

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-[2rem] border border-white/[0.07]",
          "bg-gradient-to-b from-white/[0.04] to-white/[0.01]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(255,255,255,0.02)]",
          "p-6 md:p-8",
          className
        )}
      >
        {/* TOP ROW */}
        <header className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar
              className={cn(
                "h-14 w-14 rounded-2xl ring-1 ring-primary/30",
                isClan && "bg-primary/[0.08]"
              )}
            >
              {avatarSrc && (
                <AvatarImage
                  src={avatarSrc}
                  alt={profile.display_name || "Perfil"}
                  className="rounded-2xl object-cover"
                />
              )}
              <AvatarFallback
                className="rounded-2xl text-base font-semibold text-primary"
                style={{ background: "linear-gradient(135deg, rgba(242,196,9,0.18), rgba(242,196,9,0.04))" }}
              >
                {isClan ? <Users className="h-5 w-5" /> : getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <AvatarRatingStar profileId={profileId} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold leading-tight text-white md:text-xl">
                  {profile.display_name || "Sem nome"}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[12px] text-white/55">{subtitle}</p>
                )}
              </div>
              {statusBadge && (
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    statusBadge.className
                  )}
                >
                  {statusBadge.label}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* TAGS */}
        {(profile.machine_name || profile.desc_category || location) && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {profile.machine_name && (
              <span className="rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary">
                {profile.machine_name}
              </span>
            )}
            {profile.desc_category && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70">
                {profile.desc_category}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
            {isClan && typeof profile.members_count === "number" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                <Users className="h-3 w-3" />
                {profile.members_count} {profile.members_count === 1 ? "perfil" : "perfis"}
              </span>
            )}
          </div>
        )}

        {/* BIO */}
        {profile.bio && (
          <p className="mt-5 max-w-2xl whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/70">
            {profile.bio}
          </p>
        )}

        {/* SOCIAL LINKS */}
        {socials.length > 0 && (
          <ul className="mt-5 flex flex-wrap items-center gap-2">
            {socials.map((s, i) => (
              <li key={s.id_profile_social_media || `${s.profile_url}-${i}`}>
                <a
                  href={s.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.desc_social_media_type || "Rede social"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  {getSocialIcon(s.icon)}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* METRICS */}
        <dl className="mt-7 grid grid-cols-3 divide-x divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-4 text-left">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              Posts
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-white">
              {portfolioCount}
            </dd>
          </div>
          <button
            type="button"
            onClick={() => setOpenMode("followers")}
            className="px-4 py-4 text-left transition hover:bg-white/[0.03]"
            aria-label="Ver quem acompanha"
          >
            <dt className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              Acompanham
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-white">
              {counts.followers_count}
            </dd>
          </button>
          <button
            type="button"
            onClick={() => setOpenMode("following")}
            className="px-4 py-4 text-left transition hover:bg-white/[0.03]"
            aria-label="Ver acompanhados"
          >
            <dt className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              Acompanhando
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-white">
              {counts.following_count}
            </dd>
          </button>
        </dl>

        {/* PRIMARY ACTIONS */}
        <div className="mt-5 flex items-center gap-2">
          {isOwnProfile ? (
            <Link
              href={ownerActions?.editHref || "#"}
              onClick={ownerActions?.onEdit}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 28px -16px rgba(242,196,9,0.5)" }}
            >
              <Settings className="h-4 w-4" />
              {isClan ? "Editar clan" : "Editar perfil"}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={visitorActions?.onScheduleScroll}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 28px -16px rgba(242,196,9,0.5)" }}
              >
                Agendar
              </button>
              <FollowButton
                targetType={entityType}
                targetId={profileId}
                onChanged={onFollowChanged}
                className="!h-11"
              />
            </>
          )}
          <Link
            href={
              isOwnProfile
                ? "/mensagens"
                : `/mensagens?with=${encodeURIComponent(profileId)}`
            }
            aria-label="Mensagens"
            title={isOwnProfile ? "Minhas mensagens" : "Enviar mensagem"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {/* SECONDARY TOOLBAR */}
      {isOwnProfile && ownerActions && (
        <nav className="mt-3 flex flex-wrap items-center gap-2">
          {!isClan && ownerActions.clansHref && (
            <ToolbarLink href={ownerActions.clansHref} icon={Users} label="Clans" />
          )}
          {isClan && ownerActions.onShowMembers && (
            <ToolbarButton onClick={ownerActions.onShowMembers} icon={Users} label="Membros" />
          )}
          {isClan && ownerActions.manageHref && (
            <ToolbarLink href={ownerActions.manageHref} icon={Cog} label="Gerenciar" />
          )}
          {ownerActions.onShowEngagement && (
            <ToolbarButton
              onClick={ownerActions.onShowEngagement}
              icon={BarChart2}
              label="Engajamento"
            />
          )}
          {ownerActions.onShowRanking && (
            <ToolbarButton onClick={ownerActions.onShowRanking} icon={Trophy} label="Ranking" />
          )}
          {ownerActions.onShowMural && (
            <ToolbarButton
              onClick={ownerActions.onShowMural}
              icon={Megaphone}
              label="Mural"
              badge={
                !!(
                  ownerActions.muralBadge?.has_new ||
                  (ownerActions.muralBadge?.chat_unread || 0) > 0
                )
              }
            />
          )}
          {ownerActions.agendaHref && (
            <ToolbarLink href={ownerActions.agendaHref} icon={CalendarDays} label="Agenda" />
          )}
        </nav>
      )}

      {!isOwnProfile && visitorActions && (
        <nav className="mt-3 flex flex-wrap items-center gap-2">
          {isClan && visitorActions.onShowMembers && (
            <ToolbarButton onClick={visitorActions.onShowMembers} icon={Users} label="Ver membros" />
          )}
          {visitorActions.onShowRanking && (
            <ToolbarButton onClick={visitorActions.onShowRanking} icon={Trophy} label="Ranking" />
          )}
        </nav>
      )}

      <EntityFollowModal
        open={openMode === "followers"}
        onOpenChange={(open) => setOpenMode(open ? "followers" : null)}
        entityType={entityType}
        entityId={profileId}
        mode="followers"
      />
      <EntityFollowModal
        open={openMode === "following"}
        onOpenChange={(open) => setOpenMode(open ? "following" : null)}
        entityType={entityType}
        entityId={profileId}
        mode="following"
      />
    </>
  )
}

function ToolbarButton({
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  onClick: () => void
  icon: typeof Users
  label: string
  badge?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-950" />
      )}
    </button>
  )
}

function ToolbarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Users
  label: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}

export { getInitials }
