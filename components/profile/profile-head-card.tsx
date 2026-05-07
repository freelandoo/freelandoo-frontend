"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  BarChart2,
  Briefcase,
  CalendarDays,
  Cog,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ícones de marca
  Instagram,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Quote,
  Settings,
  Trophy,
  Users,
  UserRound,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- ícones de marca
  Youtube,
} from "lucide-react"
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
  const avatarSrc = profile.avatar_url || profile.user_avatar || undefined
  const displayName = profile.display_name || "Sem nome"

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-[2rem] border border-white/[0.07]",
          "bg-gradient-to-b from-white/[0.04] to-white/[0.01]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(255,255,255,0.02)]",
          "p-5 md:p-8",
          className
        )}
      >
        {/* TOP: 2 colunas (foto + info) */}
        <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8 md:items-start">
          {/* COLUNA ESQUERDA: foto grande + estrelas */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-full max-w-[220px] overflow-hidden rounded-[28px] ring-1 ring-primary/25"
              style={{
                aspectRatio: "1 / 1",
                boxShadow:
                  "0 0 0 1px rgba(242,196,9,0.05), 0 28px 48px -28px rgba(242,196,9,0.28)",
              }}
            >
              {avatarSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-4xl font-semibold text-primary"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(242,196,9,0.22), rgba(242,196,9,0.05))",
                  }}
                >
                  {isClan ? <Users className="h-12 w-12" /> : getInitials(displayName)}
                </div>
              )}
            </div>
            <AvatarRatingStar profileId={profileId} />
          </div>

          {/* COLUNA DIREITA: nome + info + chips */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
                  {displayName}
                </h1>
                {profile.desc_category && (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-white/75">
                    {isClan ? (
                      <Users className="h-3.5 w-3.5 text-primary/80" />
                    ) : (
                      <UserRound className="h-3.5 w-3.5 text-primary/80" />
                    )}
                    {profile.desc_category}
                  </p>
                )}
                {location && (
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/55">
                    <MapPin className="h-3.5 w-3.5 text-primary/80" />
                    {location}
                  </p>
                )}
              </div>
              {statusBadge && (
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    statusBadge.className
                  )}
                >
                  {statusBadge.label}
                </span>
              )}
            </div>

            {/* CHIPS */}
            {(profile.machine_name || profile.desc_category || location) && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {profile.machine_name && (
                  <span className="rounded-full border border-primary/30 bg-primary/[0.10] px-3 py-1 text-xs font-medium text-primary">
                    {profile.machine_name}
                  </span>
                )}
                {profile.desc_category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/75">
                    <Briefcase className="h-3 w-3" />
                    {profile.desc_category}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/75">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                {isClan && typeof profile.members_count === "number" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/75">
                    <Users className="h-3 w-3" />
                    {profile.members_count} {profile.members_count === 1 ? "perfil" : "perfis"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BIO QUOTE BLOCK */}
        {profile.bio && (
          <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <Quote
                className="h-5 w-5 shrink-0 -scale-x-100 text-primary/70"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-white/80 md:text-sm">
                  {profile.bio}
                </p>
              </div>
              {socials.length > 0 && (
                <ul className="hidden shrink-0 flex-col gap-1.5 sm:flex">
                  {socials.slice(0, 3).map((s, i) => (
                    <li key={s.id_profile_social_media || `${s.profile_url}-${i}`}>
                      <a
                        href={s.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={s.desc_social_media_type || "Rede social"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 transition hover:border-primary/30 hover:text-primary"
                      >
                        {getSocialIcon(s.icon)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* SOCIAL LINKS (mobile, ou quando nao houver bio) */}
        {socials.length > 0 && (
          <ul
            className={cn(
              "mt-5 flex flex-wrap items-center gap-2",
              profile.bio && "sm:hidden"
            )}
          >
            {socials.map((s, i) => (
              <li key={s.id_profile_social_media || `${s.profile_url}-${i}`}>
                <a
                  href={s.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.desc_social_media_type || "Rede social"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 transition hover:border-primary/30 hover:text-primary"
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
            <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
              Posts
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {portfolioCount}
            </dd>
          </div>
          <button
            type="button"
            onClick={() => setOpenMode("followers")}
            className="px-4 py-4 text-left transition hover:bg-white/[0.03]"
            aria-label="Ver quem acompanha"
          >
            <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
              Acompanham
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {counts.followers_count}
            </dd>
          </button>
          <button
            type="button"
            onClick={() => setOpenMode("following")}
            className="px-4 py-4 text-left transition hover:bg-white/[0.03]"
            aria-label="Ver acompanhados"
          >
            <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
              Acompanhando
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
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
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.22) inset, 0 16px 36px -18px rgba(242,196,9,0.55)",
              }}
            >
              <Settings className="h-4 w-4" />
              {isClan ? "Editar clan" : "Editar perfil"}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={visitorActions?.onScheduleScroll}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.22) inset, 0 16px 36px -18px rgba(242,196,9,0.55)",
                }}
              >
                Agendar
              </button>
              <FollowButton
                targetType={entityType}
                targetId={profileId}
                onChanged={onFollowChanged}
                className="!h-12"
              />
            </>
          )}
          <Link
            href={
              isOwnProfile
                ? "/mensagens"
                : `/mensagens?with=${encodeURIComponent(profileId)}`
            }
            aria-label={isOwnProfile ? "Minhas mensagens" : "Enviar mensagem"}
            title={isOwnProfile ? "Minhas mensagens" : "Enviar mensagem"}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/85 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {/* SECONDARY TOOLBAR */}
      {isOwnProfile && ownerActions && (
        <nav
          aria-label="Ações do perfil"
          className="mt-3 flex flex-wrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
        <nav aria-label="Ações" className="mt-3 flex flex-wrap items-center gap-2">
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
      className="relative inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
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
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}

export { getInitials }
