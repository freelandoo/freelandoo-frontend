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
          "p-4 md:p-6",
          className
        )}
      >
        {/* TOPO: foto + stats lado a lado (estilo Instagram) */}
        <div className="flex items-start gap-4 md:gap-6">
          {/* Foto + estrelas embaixo */}
          <div className="flex shrink-0 flex-col items-center">
            <div
              className="relative h-24 w-24 overflow-hidden rounded-3xl ring-1 ring-primary/25 sm:h-28 sm:w-28 md:h-32 md:w-32"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(242,196,9,0.05), 0 18px 36px -22px rgba(242,196,9,0.28)",
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
                  className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(242,196,9,0.22), rgba(242,196,9,0.05))",
                  }}
                >
                  {isClan ? <Users className="h-8 w-8" /> : getInitials(displayName)}
                </div>
              )}
            </div>
            <AvatarRatingStar profileId={profileId} />
          </div>

          {/* Stats + status — ocupa o lado direito */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-end gap-2">
              {statusBadge && (
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    statusBadge.className
                  )}
                >
                  {statusBadge.label}
                </span>
              )}
            </div>

            <dl className="mt-1 grid grid-cols-3 gap-1 text-center sm:gap-3">
              <div className="flex flex-col items-center justify-center px-1 py-1.5">
                <dd className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                  {portfolioCount}
                </dd>
                <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Posts
                </dt>
              </div>
              <button
                type="button"
                onClick={() => setOpenMode("followers")}
                className="flex flex-col items-center justify-center rounded-xl px-1 py-1.5 transition hover:bg-white/[0.04]"
                aria-label="Ver quem acompanha"
              >
                <dd className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                  {counts.followers_count}
                </dd>
                <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Acompanham
                </dt>
              </button>
              <button
                type="button"
                onClick={() => setOpenMode("following")}
                className="flex flex-col items-center justify-center rounded-xl px-1 py-1.5 transition hover:bg-white/[0.04]"
                aria-label="Ver acompanhados"
              >
                <dd className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                  {counts.following_count}
                </dd>
                <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Acompanhando
                </dt>
              </button>
            </dl>
          </div>
        </div>

        {/* IDENTIDADE: nome + profissao + cidade */}
        <div className="mt-5">
          <h1 className="text-balance text-xl font-semibold leading-tight tracking-tight text-white md:text-2xl">
            {displayName}
          </h1>
          {profile.desc_category && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/75">
              {isClan ? (
                <Users className="h-3.5 w-3.5 text-primary/80" />
              ) : (
                <UserRound className="h-3.5 w-3.5 text-primary/80" />
              )}
              {profile.desc_category}
            </p>
          )}
          {location && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/55">
              <MapPin className="h-3.5 w-3.5 text-primary/80" />
              {location}
            </p>
          )}
        </div>

        {/* CHIPS */}
        {(profile.machine_name || profile.desc_category || location) && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {profile.machine_name && (
              <span className="rounded-full border border-primary/30 bg-primary/[0.10] px-2.5 py-0.5 text-[11px] font-medium text-primary">
                {profile.machine_name}
              </span>
            )}
            {profile.desc_category && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/75">
                <Briefcase className="h-2.5 w-2.5" />
                {profile.desc_category}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/75">
                <MapPin className="h-2.5 w-2.5" />
                {location}
              </span>
            )}
            {isClan && typeof profile.members_count === "number" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/75">
                <Users className="h-2.5 w-2.5" />
                {profile.members_count} {profile.members_count === 1 ? "perfil" : "perfis"}
              </span>
            )}
          </div>
        )}

        {/* BIO QUOTE BLOCK */}
        {profile.bio && (
          <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 md:p-5">
            <div className="flex items-start gap-3">
              <Quote
                className="h-4 w-4 shrink-0 -scale-x-100 text-primary/70"
                aria-hidden
              />
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/80">
                {profile.bio}
              </p>
            </div>
          </div>
        )}

        {/* SOCIAL LINKS */}
        {socials.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center gap-1.5">
            {socials.map((s, i) => (
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

        {/* PRIMARY ACTIONS */}
        <div className="mt-5 flex items-center gap-2">
          {isOwnProfile ? (
            <Link
              href={ownerActions?.editHref || "#"}
              onClick={ownerActions?.onEdit}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition active:scale-[0.98]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -16px rgba(242,196,9,0.5)",
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              {isClan ? "Editar clan" : "Editar perfil"}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={visitorActions?.onScheduleScroll}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition active:scale-[0.98]"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -16px rgba(242,196,9,0.5)",
                }}
              >
                Agendar
              </button>
              <FollowButton
                targetType={entityType}
                targetId={profileId}
                onChanged={onFollowChanged}
                className="!h-10"
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
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/85 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
          >
            <MessageCircle className="h-3.5 w-3.5" />
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
      className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-3 w-3" />
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-3 w-3" />
      {label}
    </Link>
  )
}

export { getInitials }
