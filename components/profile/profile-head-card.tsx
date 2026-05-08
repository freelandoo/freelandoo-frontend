"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  BarChart2,
  CalendarDays,
  Cog,
  Instagram,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Settings,
  Trophy,
  Users,
  UserRound,
  Youtube,
} from "lucide-react"
import { FollowButton } from "@/components/entity-follow"
import { EntityFollowModal } from "@/components/entity-follow/entity-follow-modal"
import { AvatarRatingStar } from "@/components/profile/avatar-rating-star"
import { cn } from "@/lib/utils"

type XpSummary = {
  xp_total: number
  xp_level: number
  xp_next_level: number
  xp_progress_percent: number
}

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
    case "tiktok":
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.31 0 .6.05.88.14V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 1 0 15.86 15.67v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4c-.35 0-.69-.04-1.04-.1z" />
        </svg>
      )
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
  const [openFollowers, setOpenFollowers] = useState(false)
  const [xpData, setXpData] = useState<XpSummary | null>(null)

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

  useEffect(() => {
    if (isClan) return
    let cancelled = false
    fetch(`/api/subprofiles/${profileId}/xp-summary`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setXpData(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profileId, isClan])

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
          "p-4 md:p-5",
          className
        )}
      >
        {statusBadge && (
          <div className="mb-3 flex justify-end">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                statusBadge.className
              )}
            >
              {statusBadge.label}
            </span>
          </div>
        )}

        {/* TOPO: foto + stats/info lado a lado */}
        <div className="flex items-start gap-4 md:gap-5">
          {/* Foto + estrelas embaixo */}
          <div className="flex shrink-0 flex-col items-center">
            <div
              className="relative h-28 w-28 overflow-hidden rounded-2xl ring-1 ring-primary/25 sm:h-32 sm:w-32 md:h-36 md:w-36"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(242,196,9,0.05), 0 16px 32px -22px rgba(242,196,9,0.28)",
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

          {/* Coluna direita: stats (Posts | Acompanham) + info com icones */}
          <div className="flex min-w-0 flex-1 flex-col">
            <dl className="grid grid-cols-2 divide-x divide-white/[0.06]">
              <div className="flex flex-col items-center justify-center px-2 py-1">
                <dd className="text-xl font-semibold tabular-nums text-white">
                  {portfolioCount}
                </dd>
                <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                  Posts
                </dt>
              </div>
              <button
                type="button"
                onClick={() => setOpenFollowers(true)}
                className="flex flex-col items-center justify-center rounded-xl px-2 py-1 transition hover:bg-white/[0.04]"
                aria-label="Ver quem acompanha"
              >
                <dd className="text-xl font-semibold tabular-nums text-white">
                  {counts.followers_count}
                </dd>
                <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                  Acompanham
                </dt>
              </button>
            </dl>

            {/* Info em linhas: maquina, profissao, cidade */}
            {(profile.machine_name || profile.desc_category || location) && (
              <ul className="mt-4 space-y-2.5">
                {profile.machine_name && (
                  <li className="flex items-center gap-2.5 text-[13px] text-white/85">
                    <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{profile.machine_name}</span>
                  </li>
                )}
                {profile.desc_category && (
                  <li className="flex items-center gap-2.5 text-[13px] text-white/85">
                    {isClan ? (
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <UserRound className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="truncate">{profile.desc_category}</span>
                  </li>
                )}
                {location && (
                  <li className="flex items-center gap-2.5 text-[13px] text-white/85">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{location}</span>
                  </li>
                )}
                {isClan && typeof profile.members_count === "number" && (
                  <li className="flex items-center gap-2.5 text-[13px] text-white/85">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      {profile.members_count}{" "}
                      {profile.members_count === 1 ? "perfil" : "perfis"}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* NOME + BIO */}
        <div className="mt-5">
          <h1 className="text-balance text-xl font-semibold leading-tight tracking-tight text-white md:text-2xl">
            {displayName}
          </h1>
          {profile.bio && (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/70">
              {profile.bio}
            </p>
          )}
        </div>

        {/* XP e Nível — somente para subperfis profissionais */}
        {!isClan && xpData && (
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Nível {xpData.xp_level}
              </span>
              <span className="text-sm font-bold tabular-nums text-primary">
                {xpData.xp_total.toLocaleString("pt-BR")} XP
              </span>
            </div>
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: `${xpData.xp_progress_percent}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
              <span>Próximo nível: {xpData.xp_next_level.toLocaleString("pt-BR")} XP</span>
              <span>{xpData.xp_progress_percent}%</span>
            </div>
          </div>
        )}

        {/* PRIMARY ACTIONS */}
        <div className="mt-4 flex items-center gap-2">
          {isOwnProfile ? (
            <Link
              href={ownerActions?.editHref || "#"}
              onClick={ownerActions?.onEdit}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-[12px] font-bold uppercase tracking-wider text-primary-foreground transition active:scale-[0.98]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 24px -16px rgba(242,196,9,0.5)",
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
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-primary px-4 text-[12px] font-bold uppercase tracking-wider text-primary-foreground transition active:scale-[0.98]"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 24px -16px rgba(242,196,9,0.5)",
                }}
              >
                Agendar
              </button>
              <div className="min-w-0 flex-1">
                <FollowButton
                  targetType={entityType}
                  targetId={profileId}
                  onChanged={onFollowChanged}
                  compact
                  className="!h-9 !w-full !min-w-0 !flex-1 !rounded-full !px-4 !text-[12px] !font-bold !uppercase !tracking-wider"
                />
              </div>
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/85 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
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
          <SocialToolbar socials={socials} />
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
          <SocialToolbar socials={socials} />
        </nav>
      )}

      <EntityFollowModal
        open={openFollowers}
        onOpenChange={setOpenFollowers}
        entityType={entityType}
        entityId={profileId}
        mode="followers"
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

function SocialToolbar({ socials }: { socials: ProfileSocialLink[] }) {
  if (socials.length === 0) return null

  return (
    <>
      {socials.map((social, index) => (
        <a
          key={social.id_profile_social_media || `${social.profile_url}-${index}`}
          href={social.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          title={social.desc_social_media_type || "Rede social"}
          aria-label={social.desc_social_media_type || "Rede social"}
          className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-3 text-white/75 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
        >
          {getSocialIcon(social.icon)}
        </a>
      ))}
    </>
  )
}

export { getInitials }
