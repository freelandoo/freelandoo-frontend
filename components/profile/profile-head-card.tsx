"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart2,
  CalendarDays,
  Camera,
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
import { getToken } from "@/lib/auth"
import { MarkdownText } from "@/components/ui/markdown-text"
import { FollowButton } from "@/components/entity-follow"
import { EntityFollowModal } from "@/components/entity-follow/entity-follow-modal"
import { AvatarRatingStar } from "@/components/profile/avatar-rating-star"
import { cn } from "@/lib/utils"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"

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
    shareButton?: React.ReactNode
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
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null)
  const [bannerFailed, setBannerFailed] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleClanAvatarSelect = () => {
    if (!isClan || !isOwnProfile || uploadingAvatar) return
    fileInputRef.current?.click()
  }

  const handleClanAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadingAvatar(true)
    try {
      const token = getToken()
      const fd = new FormData()
      fd.append("avatar", file)
      const res = await fetch(`/api/profile/${profileId}/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      })
      if (!res.ok) throw new Error(`upload falhou: ${res.status}`)
      const data = await res.json()
      if (data?.avatar_url) {
        setAvatarOverride(`${data.avatar_url}${data.avatar_url.includes("?") ? "&" : "?"}t=${Date.now()}`)
      }
    } catch (err) {
      console.error("[clan avatar] upload error", err)
      alert("Não foi possível enviar a foto. Tente novamente.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    if (!menuOpen) return
    // pointerdown cobre mouse e touch — necessário p/ mobile fechar ao tocar fora.
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [menuOpen])

  // Engrenagem serve apenas como toggle (hover já abre/fecha; click para mobile).
  const handleSettingsClick = () => setMenuOpen((v) => !v)

  // Item "Editar perfil" dentro do menu retrátil.
  const handleEditClick = () => {
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
      return { label: "ativo", className: "bg-[#16683f] text-[#ECFDF3]" }
    if (profile.is_paid && !profile.is_visible)
      return { label: "rascunho", className: "bg-[#0B0B0D] text-[#F1EDE2]" }
    return { label: "não publicado", className: "bg-[#F2B705] text-[#1A1505]" }
  }, [isOwnProfile, isPublished, profile.is_paid, profile.is_visible])

  const socials = (profile.social_media || []).filter((s) => s.is_active !== false)
  const location = [profile.municipio, profile.estado].filter(Boolean).join(", ")
  const avatarSrc = avatarOverride || profile.avatar_url || profile.user_avatar || undefined
  const displayName = profile.display_name || "Sem nome"
  const canUploadClanAvatar = isClan && isOwnProfile

  return (
    <>
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]",
          className
        )}
      >
        {/* BANNER — imagem da manifestação ou gradiente warm.
            Borda inferior rasgada (papel) revelando o card creme por baixo. */}
        <div className="fl-torn-bottom fl-torn-bottom-shadow relative h-28 bg-[#1d1810] md:h-52">
          {profile.manifestation?.banner_url && !isClan && !bannerFailed ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.manifestation.banner_url}
                alt=""
                onError={() => setBannerFailed(true)}
                className="h-full w-full object-cover"
              />
            </>
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(242,183,5,0.30),transparent_38%),linear-gradient(135deg,#2a2212,#141009)]" />
          )}
          {statusBadge && (
            <div className="absolute right-3 top-3">
              <span
                className={cn(
                  "rounded-full border-2 border-[#0B0B0D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] shadow-[2px_2px_0_0_#0B0B0D]",
                  statusBadge.className
                )}
              >
                {statusBadge.label}
              </span>
            </div>
          )}
          {profile.manifestation?.tag_label && !isClan && (
            <div className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border-2 border-[#0B0B0D] bg-[#0B0B0D] px-3 py-1.5 text-xs font-bold text-[#F2B705] shadow-[2px_2px_0_0_rgba(242,183,5,0.5)]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile.manifestation.tag_label}</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 md:px-7 md:pb-5">
          {/* Bloco principal: avatar (esquerda) + coluna de stats/info (direita).
              items-end no flex garante que a coluna direita só ocupe espaço da
              base do avatar pra baixo, ficando 100% fora da área do banner. */}
          <div className="-mt-10 flex items-end gap-4 md:-mt-14 md:gap-5">
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative flex aspect-[4/5] w-24 -rotate-3 items-center justify-center overflow-hidden rounded-xl border-4 border-[#0B0B0D] bg-[#F2B705]/15 shadow-[6px_6px_0_0_#F2B705] transition-transform duration-300 hover:rotate-0 md:w-32">
                {avatarSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#0B0B0D]">
                    {isClan ? <Users className="h-8 w-8" /> : getInitials(displayName)}
                  </div>
                )}
                {canUploadClanAvatar && (
                  <button
                    type="button"
                    onClick={handleClanAvatarSelect}
                    disabled={uploadingAvatar}
                    aria-label="Mudar foto"
                    title="Mudar foto"
                    className="absolute bottom-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] transition hover:bg-[#F2B705] disabled:opacity-60"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-2">
                <AvatarRatingStar profileId={profileId} />
              </div>
              {canUploadClanAvatar && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleClanAvatarFile}
                />
              )}
            </div>

            {/* Coluna direita do avatar: Posts/Acomp no topo + Enxame/Profissao/Local em coluna. */}
            <div className="min-w-0 flex-1 pb-1 text-left">
              <div className="flex items-baseline gap-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular-nums text-[#0B0B0D] md:text-xl">
                    {portfolioCount}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#0B0B0D]/55">
                    Posts
                  </span>
                </div>
                <span className="text-[#0B0B0D]/20">|</span>
                <button
                  type="button"
                  onClick={() => setOpenFollowers(true)}
                  className="flex items-baseline gap-1.5 transition hover:opacity-70"
                  aria-label="Ver quem acompanha"
                >
                  <span className="text-lg font-bold tabular-nums text-[#0B0B0D] md:text-xl">
                    {counts.followers_count}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#0B0B0D]/55">
                    Acomp.
                  </span>
                </button>
              </div>

              {(profile.machine_name || profile.desc_category || location || (isClan && typeof profile.members_count === "number")) && (
                <div className="mt-2 flex flex-col gap-1">
                  {profile.machine_name && (
                    <HeadInfo icon={Megaphone} value={profile.machine_name} />
                  )}
                  {profile.desc_category && (
                    <HeadInfo
                      icon={isClan ? Users : UserRound}
                      value={profile.desc_category}
                    />
                  )}
                  {location && <HeadInfo icon={MapPin} value={location} />}
                  {isClan && typeof profile.members_count === "number" && (
                    <HeadInfo
                      icon={Users}
                      value={`${profile.members_count} ${profile.members_count === 1 ? "perfil" : "perfis"}`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Nome — display Anton */}
          <h1 className="fl-display mt-4 break-words text-2xl leading-[0.95] text-[#0B0B0D] md:text-3xl">
            {displayName}
          </h1>

          {isOwnProfile && ownerActions?.onShowMural && (
            <div className="mt-3">
              <MuralPill
                onClick={ownerActions.onShowMural}
                hasNew={
                  !!(
                    ownerActions.muralBadge?.has_new ||
                    (ownerActions.muralBadge?.chat_unread || 0) > 0
                  )
                }
              />
            </div>
          )}

          {profile.bio && (
            <MarkdownText className="mt-4 max-w-2xl break-words text-[13px] leading-relaxed text-[#2b2b2e] md:text-sm">
              {profile.bio}
            </MarkdownText>
          )}

          {/* FOOTER — engrenagem: hover no container expande o menu; click vai pro editar. */}
          <div
            ref={menuRef}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
            className="mt-4 flex flex-wrap items-center gap-1.5"
          >
            {isOwnProfile && ownerActions ? (
              <>
                <IconAction
                  onClick={handleSettingsClick}
                  icon={Settings}
                  label={menuOpen ? "Fechar" : "Configurações"}
                  accent
                  ariaExpanded={menuOpen}
                />
                <RetractableIcons open={menuOpen}>
                  <IconAction
                    onClick={handleEditClick}
                    icon={Pencil}
                    label={isClan ? "Editar clan" : "Editar perfil"}
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
                {visitorActions?.shareButton}
              </>
            )}
          </div>

          {isOwnProfile && !profile.is_paid && (
            <Link
              href={`/payment/taxa?profile_id=${encodeURIComponent(profileId)}`}
              className="fl-btn-gold mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-[12px] font-bold uppercase tracking-wider"
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

function HeadInfo({
  icon: Icon,
  value,
}: {
  icon: typeof Users
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[#2b2b2e]">
      <Icon className="h-3 w-3 shrink-0 text-[#E0A500]" />
      <span className="truncate text-[11px] font-medium md:text-xs">{value}</span>
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
    "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D] transition active:scale-[0.96]",
    accent
      ? "bg-[#F2B705] text-[#1A1505] shadow-[2px_2px_0_0_#0B0B0D] hover:bg-[#ffc81f]"
      : "bg-[#F1EDE2] text-[#0B0B0D] hover:bg-[#0B0B0D] hover:text-[#F1EDE2]",
  )
  const body = (
    <>
      <Icon className="h-3.5 w-3.5" />
      {badge && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#F1EDE2]" />
      )}
    </>
  )
  // Mapeia o label do botão para o id da dica de hover. Os ícones da toolbar
  // do headcard são pequenos e sem texto visível — esse é o caso de mais valor
  // para uma dica explicativa.
  const hintMap: Record<string, HintId> = {
    "Configurações": "headcard-settings",
    Fechar: "headcard-settings",
    "Editar perfil": "headcard-edit-profile",
    "Editar clan": "headcard-edit-clan",
    "Minhas mensagens": "headcard-messages",
    "Enviar mensagem": "headcard-visit-message",
    Clans: "headcard-clans",
    Membros: "headcard-members",
    "Ver membros": "headcard-view-members",
    Gerenciar: "headcard-manage",
    Engajamento: "headcard-engagement",
    Ranking: "headcard-ranking",
    Agenda: "headcard-agenda",
  }
  const hintId = hintMap[label]
  const trigger = href ? (
    <Link
      href={href}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={baseClass}
    >
      {body}
    </Link>
  ) : (
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
  if (hintId) {
    return (
      <HoverHint id={hintId} side="top">
        {trigger}
      </HoverHint>
    )
  }
  return trigger
}

/**
 * Wrapper que retrai a fila de ícones a partir do botão dourado da engrenagem.
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
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
        >
          {getSocialIcon(social.icon)}
        </a>
      ))}
    </>
  )
}

function MuralPill({ onClick, hasNew }: { onClick: () => void; hasNew: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-1.5 text-[12px] font-bold text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
      aria-label="Abrir Mural"
    >
      <Megaphone className="h-3.5 w-3.5 text-[#E0A500] group-hover:text-[#F2B705]" />
      <span>Mural</span>
      {hasNew && (
        <span className="ml-0.5 inline-flex h-2 w-2 rounded-full bg-[#F2B705] shadow-[0_0_0_2px_#F1EDE2]" />
      )}
    </button>
  )
}

export { getInitials }
