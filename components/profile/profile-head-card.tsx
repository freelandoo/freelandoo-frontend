"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart2,
  CalendarDays,
  Cog,
  Instagram,
  MapPin,
  Megaphone,
  MessageCircle,
  Pencil,
  Phone,
  Settings,
  Sparkles,
  Trophy,
  Users,
  UserRound,
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
  manifestation?: {
    banner_url?: string | null
    banner_thumb_url?: string | null
    tag_label?: string | null
    tag_color?: string | null
    tag_icon?: string | null
  } | null
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
  /** Rótulo do botão principal para visitantes (ex.: rolar à secção de serviços). */
  visitorScheduleButtonLabel?: string
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
  visitorScheduleButtonLabel = "Agendar",
  className,
}: ProfileHeadCardProps) {
  const [counts, setCounts] = useState<FollowCounts>(() => defaultCounts(entityType))
  const [openFollowers, setOpenFollowers] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [menuOpen])

  const handleEditClick = () => {
    if (!menuOpen) {
      setMenuOpen(true)
      return
    }
    // segundo click no lápis (com menu aberto): vai pro editar
    setMenuOpen(false)
    if (ownerActions?.onEdit) {
      ownerActions.onEdit()
    } else if (ownerActions?.editHref) {
      router.push(ownerActions.editHref)
    }
  }

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
          "overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          className
        )}
      >
        <div className="relative h-28 bg-zinc-900 md:h-52">
          {profile.manifestation?.banner_url && !isClan ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.manifestation.banner_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </>
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(242,196,9,0.20),transparent_32%),linear-gradient(135deg,rgba(39,39,42,0.95),rgba(9,9,11,0.98))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-transparent" />
          {statusBadge && (
            <div className="absolute right-4 top-4">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur",
                  statusBadge.className
                )}
              >
                {statusBadge.label}
              </span>
            </div>
          )}
          {profile.manifestation?.tag_label && !isClan && (
            <div className="absolute left-4 top-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full border border-primary/35 bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile.manifestation.tag_label}</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 md:px-7 md:pb-5">
          <div className="-mt-10 flex items-start gap-4 md:-mt-14 md:gap-5">
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative flex aspect-[4/5] w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-zinc-950 bg-primary/10 ring-1 ring-white/10 md:w-32">
                {avatarSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary">
                    {isClan ? <Users className="h-8 w-8" /> : getInitials(displayName)}
                  </div>
                )}
              </div>
              <div className="mt-2">
                <AvatarRatingStar profileId={profileId} />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-6 text-left md:pt-7">
              <div className="grid max-w-md grid-cols-2 divide-x divide-white/[0.07] rounded-xl border border-white/[0.07] bg-zinc-950/55">
                <HeadStat label="Posts" value={portfolioCount} compact />
                <button
                  type="button"
                  onClick={() => setOpenFollowers(true)}
                  className="flex items-center justify-start gap-2 px-3 py-3 text-left transition hover:bg-white/[0.04] md:px-3.5"
                  aria-label="Ver quem acompanha"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
                    Acomp.
                  </span>
                  <span className="text-xl font-semibold tabular-nums text-white md:text-2xl">
                    {counts.followers_count}
                  </span>
                </button>
              </div>

              {(profile.machine_name || profile.desc_category || location || (isClan && typeof profile.members_count === "number")) && (
                <div className="mt-2 grid max-w-md grid-cols-2 gap-1.5">
                  {profile.machine_name && (
                    <HeadInfo icon={Megaphone} label="Maquina" value={profile.machine_name} />
                  )}
                  {profile.desc_category && (
                    <HeadInfo
                      icon={isClan ? Users : UserRound}
                      label={isClan ? "Categoria" : "Profissao"}
                      value={profile.desc_category}
                    />
                  )}
                  {location && (
                    <div className="col-span-2">
                      <HeadInfo icon={MapPin} label="Localizacao" value={location} />
                    </div>
                  )}
                  {isClan && typeof profile.members_count === "number" && (
                    <HeadInfo
                      icon={Users}
                      label="Integrantes"
                      value={`${profile.members_count} ${profile.members_count === 1 ? "perfil" : "perfis"}`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/70 md:text-sm">
              {profile.bio}
            </p>
          )}

          {/* FOOTER — lápis amarelo como menu retrátil: 1º click expande, 2º click edita, click fora fecha */}
          <div ref={menuRef} className="mt-3 flex flex-wrap items-center gap-1.5">
            {isOwnProfile && ownerActions ? (
              <>
                <IconAction
                  onClick={handleEditClick}
                  icon={Pencil}
                  label={menuOpen ? (isClan ? "Editar clan" : "Editar perfil") : "Mais ações"}
                  accent
                  ariaExpanded={menuOpen}
                />
                <RetractableIcons open={menuOpen}>
                  <IconAction
                    href={"/mensagens"}
                    icon={MessageCircle}
                    label="Minhas mensagens"
                  />
                  {!isClan && ownerActions.clansHref && (
                    <IconAction
                      href={ownerActions.clansHref}
                      icon={Users}
                      label="Clans"
                    />
                  )}
                  {isClan && ownerActions.onShowMembers && (
                    <IconAction
                      onClick={ownerActions.onShowMembers}
                      icon={Users}
                      label="Membros"
                    />
                  )}
                  {isClan && ownerActions.manageHref && (
                    <IconAction
                      href={ownerActions.manageHref}
                      icon={Cog}
                      label="Gerenciar"
                    />
                  )}
                  {ownerActions.onShowEngagement && (
                    <IconAction
                      onClick={ownerActions.onShowEngagement}
                      icon={BarChart2}
                      label="Engajamento"
                    />
                  )}
                  {ownerActions.onShowRanking && (
                    <IconAction
                      onClick={ownerActions.onShowRanking}
                      icon={Trophy}
                      label="Ranking"
                    />
                  )}
                  {ownerActions.onShowMural && (
                    <IconAction
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
                    <IconAction
                      href={ownerActions.agendaHref}
                      icon={CalendarDays}
                      label="Agenda"
                    />
                  )}
                  <SocialIcons socials={socials} />
                </RetractableIcons>
              </>
            ) : (
              <>
                <FollowButton
                  targetType={entityType}
                  targetId={profileId}
                  onChanged={onFollowChanged}
                  compact
                  className="!h-9 !w-9 !rounded-full !p-0"
                />
                <IconAction
                  href={`/mensagens?with=${encodeURIComponent(profileId)}`}
                  icon={MessageCircle}
                  label="Enviar mensagem"
                />
                {isClan && visitorActions?.onShowMembers && (
                  <IconAction
                    onClick={visitorActions.onShowMembers}
                    icon={Users}
                    label="Ver membros"
                  />
                )}
                {visitorActions?.onShowRanking && (
                  <IconAction
                    onClick={visitorActions.onShowRanking}
                    icon={Trophy}
                    label="Ranking"
                  />
                )}
                <SocialIcons socials={socials} />
              </>
            )}
          </div>

          {isOwnProfile && !profile.is_paid && (
            <Link
              href={`/payment/taxa?profile_id=${encodeURIComponent(profileId)}`}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-emerald-400 active:scale-[0.98]"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 24px -16px rgba(16,185,129,0.6)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ative sua conta
            </Link>
          )}
        </div>
      </article>

      <article
        className={cn(
          "hidden",
          "relative overflow-hidden rounded-[2rem] border border-white/[0.07]",
          "bg-gradient-to-b from-white/[0.04] to-white/[0.01]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(255,255,255,0.02)]",
          "p-4 md:p-5",
          className
        )}
      >
        {profile.manifestation?.banner_url && !isClan && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.manifestation.banner_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-42"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/72 to-zinc-950/48" />
          </>
        )}
        <div className="relative">
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
              <div className="flex items-center justify-center gap-2 px-2 py-1">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                  Posts
                </dt>
                <dd className="text-xl font-semibold tabular-nums text-white">
                  {portfolioCount}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => setOpenFollowers(true)}
                className="flex items-center justify-center gap-2 rounded-xl px-2 py-1 transition hover:bg-white/[0.04]"
                aria-label="Ver quem acompanha"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                  Acomp.
                </dt>
                <dd className="text-xl font-semibold tabular-nums text-white">
                  {counts.followers_count}
                </dd>
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
                {profile.manifestation?.tag_label && !isClan && (
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                      <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
                      <span className="truncate">{profile.manifestation.tag_label}</span>
                    </span>
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

        {/* BIO — nome e XP migraram pro RetractableProfileHeader */}
        {profile.bio && (
          <p className="mt-5 max-w-2xl whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/70">
            {profile.bio}
          </p>
        )}

        {/* FOOTER — todas as ações como ícones (substitui PRIMARY ACTIONS + SECONDARY TOOLBAR) */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {isOwnProfile && ownerActions ? (
            <>
              <IconAction
                href={ownerActions.editHref}
                onClick={ownerActions.onEdit}
                icon={Pencil}
                label={isClan ? "Editar clan" : "Editar perfil"}
                accent
              />
              <IconAction
                href={"/mensagens"}
                icon={MessageCircle}
                label="Minhas mensagens"
              />
              {!isClan && ownerActions.clansHref && (
                <IconAction
                  href={ownerActions.clansHref}
                  icon={Users}
                  label="Clans"
                />
              )}
              {isClan && ownerActions.onShowMembers && (
                <IconAction
                  onClick={ownerActions.onShowMembers}
                  icon={Users}
                  label="Membros"
                />
              )}
              {isClan && ownerActions.manageHref && (
                <IconAction
                  href={ownerActions.manageHref}
                  icon={Cog}
                  label="Gerenciar"
                />
              )}
              {ownerActions.onShowEngagement && (
                <IconAction
                  onClick={ownerActions.onShowEngagement}
                  icon={BarChart2}
                  label="Engajamento"
                />
              )}
              {ownerActions.onShowRanking && (
                <IconAction
                  onClick={ownerActions.onShowRanking}
                  icon={Trophy}
                  label="Ranking"
                />
              )}
              {ownerActions.onShowMural && (
                <IconAction
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
                <IconAction
                  href={ownerActions.agendaHref}
                  icon={CalendarDays}
                  label="Agenda"
                />
              )}
              <SocialIcons socials={socials} />
            </>
          ) : (
            <>
              <FollowButton
                targetType={entityType}
                targetId={profileId}
                onChanged={onFollowChanged}
                compact
                className="!h-9 !w-9 !rounded-full !p-0"
              />
              <IconAction
                href={`/mensagens?with=${encodeURIComponent(profileId)}`}
                icon={MessageCircle}
                label="Enviar mensagem"
              />
              {isClan && visitorActions?.onShowMembers && (
                <IconAction
                  onClick={visitorActions.onShowMembers}
                  icon={Users}
                  label="Ver membros"
                />
              )}
              {visitorActions?.onShowRanking && (
                <IconAction
                  onClick={visitorActions.onShowRanking}
                  icon={Trophy}
                  label="Ranking"
                />
              )}
              <SocialIcons socials={socials} />
            </>
          )}
        </div>

        {/* ACTIVATE ACCOUNT — só p/ próprio perfil ainda não pago */}
        {isOwnProfile && !profile.is_paid && (
          <Link
            href={`/payment/taxa?profile_id=${encodeURIComponent(profileId)}`}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 text-[12px] font-bold uppercase tracking-wider text-white transition hover:bg-emerald-400 active:scale-[0.98]"
            style={{
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 24px -16px rgba(16,185,129,0.6)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ative sua conta
          </Link>
        )}
        </div>
      </article>

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

function HeadStat({
  label,
  value,
  compact,
}: {
  label: string
  value: number | string
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 md:px-3.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
          {label}
        </span>
        <span className="text-xl font-semibold tabular-nums text-white md:text-2xl">
          {value}
        </span>
      </div>
    )
  }
  return (
    <div className="p-4">
      <span className="block text-xs font-medium uppercase tracking-wide text-white/55">
        {label}
      </span>
      <span className="mt-2 block text-2xl font-semibold tabular-nums text-white">
        {value}
      </span>
    </div>
  )
}

function HeadInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/[0.08] text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] font-medium uppercase tracking-wide text-white/40">
          {label}
        </span>
        <span className="block truncate text-xs font-semibold text-white/85 md:text-[13px]">
          {value}
        </span>
      </span>
    </div>
  )
}

function IconAction({
  href,
  onClick,
  icon: Icon,
  label,
  badge,
  accent,
  ariaExpanded,
}: {
  href?: string
  onClick?: () => void
  icon: typeof Users
  label: string
  badge?: boolean
  accent?: boolean
  ariaExpanded?: boolean
}) {
  const baseClass = cn(
    "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
    accent
      ? "border-primary/40 bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_10px_24px_-16px_rgba(242,196,9,0.5)] hover:bg-primary/90"
      : "border-white/12 bg-white/[0.04] text-white/85 hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary",
  )
  const body = (
    <>
      <Icon className="h-3.5 w-3.5" />
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-950" />
      )}
    </>
  )
  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label={label}
        title={label}
        className={baseClass}
      >
        {body}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={ariaExpanded}
      className={baseClass}
    >
      {body}
    </button>
  )
}

/**
 * Wrapper que retrai a fila de ícones a partir do botão amarelo do lápis.
 * Animado por max-width + opacity, sem reflow brusco do header.
 */
function RetractableIcons({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out",
        open
          ? "max-w-[640px] translate-x-0 opacity-100"
          : "pointer-events-none max-w-0 -translate-x-1 opacity-0",
      )}
      aria-hidden={!open}
    >
      {children}
    </div>
  )
}

function SocialIcons({ socials }: { socials: ProfileSocialLink[] }) {
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
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/85 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary"
        >
          {getSocialIcon(social.icon)}
        </a>
      ))}
    </>
  )
}

export { getInitials }
