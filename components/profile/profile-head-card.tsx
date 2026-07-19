"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart2,
  BarChart3,
  Bot,
  CalendarDays,
  Camera,
  Cog,
  Database,
  Dumbbell,
  FolderCog,
  Instagram,
  MapPin,
  Megaphone,
  MessageCircle,
  Pencil,
  Settings,
  Sparkles,
  Trophy,
  Users,
  UserRound,
  Wallet,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { MarkdownText } from "@/components/ui/markdown-text"
import { FollowButton } from "@/components/entity-follow"
import { EntityFollowModal } from "@/components/entity-follow/entity-follow-modal"
import { AvatarRatingStar } from "@/components/profile/avatar-rating-star"
import { cn } from "@/lib/utils"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"

const DataConnectionsModal = dynamic(
  () => import("@/components/account/DataConnectionsModal").then((m) => m.DataConnectionsModal),
  { ssr: false },
)
const UserDropside = dynamic(
  () => import("@/components/layout/UserDropside").then((m) => m.UserDropside),
  { ssr: false },
)
const NotificationBell = dynamic(
  () => import("@/components/notifications/notification-bell").then((m) => m.NotificationBell),
  { ssr: false },
)

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
  /** Nível de XP do perfil — chip dourado na fila de badges (paridade com /account). */
  xpLevel?: number | null
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

// Glifo da marca para o sticker social. Instagram usa a câmera (estilo do
// sticker original); as demais usam o logo oficial preenchido — todas herdam
// a cor dourada via `currentColor`.
function getSocialIcon(icon?: string) {
  const cls = "h-[18px] w-[18px]"
  switch ((icon || "").toLowerCase()) {
    case "instagram":
      return <Instagram className={cls} strokeWidth={2.4} />
    case "youtube":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" />
        </svg>
      )
    case "whatsapp":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.477-.945zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      )
    case "tiktok":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.31 0 .6.05.88.14V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 1 0 15.86 15.67v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4c-.35 0-.69-.04-1.04-.1z" />
        </svg>
      )
    case "facebook":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    case "twitter":
    case "x":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case "linkedin":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    case "pinterest":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.747-1.378l-.748 2.853c-.271 1.043-1.002 2.349-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z" />
        </svg>
      )
    case "twitch":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
        </svg>
      )
    default:
      return <Megaphone className={cls} />
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
  xpLevel = null,
  className,
}: ProfileHeadCardProps) {
  const t = useTranslations("Profile")
  const tx = useTaxonomy()
  const [counts, setCounts] = useState<FollowCounts>(() => defaultCounts(entityType))
  const [openFollowers, setOpenFollowers] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null)
  const [bannerFailed, setBannerFailed] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Paridade user≡subperfil: a engrenagem do subperfil carrega as mesmas
  // ferramentas da conta (menu do /account) além dos itens do próprio perfil.
  const [dataConnOpen, setDataConnOpen] = useState(false)
  // Sino + menu lateral da conta no banner (visão do dono) — igual /account.
  const [dropsideOpen, setDropsideOpen] = useState(false)
  const [lsUser, setLsUser] = useState<{
    nome?: string
    email?: string
    is_admin?: boolean
    roles?: { desc_role?: string }[]
  } | null>(null)
  useEffect(() => {
    if (!isOwnProfile) return
    try {
      const raw = localStorage.getItem("user")
      if (raw) setLsUser(JSON.parse(raw))
    } catch {
      /* user do LS corrompido — dropside abre sem cabeçalho personalizado */
    }
  }, [isOwnProfile])
  const handleAccountLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }
  const dataApiOn = useFeature("data_api")
  const atendimentoIaOn = useFeature("atendimento_ia_venda")
  const academiasOn = useFeature("fitness_academias")
  // Preferências pessoais (seção "Funções" do menu lateral).
  const walletFeatOn = useUserFeature("wallet")
  const fitnessFeatOn = useUserFeature("fitness_academias")
  const communitiesFeatOn = useUserFeature("communities")

  const handleAvatarSelect = () => {
    if (!isOwnProfile || uploadingAvatar) return
    fileInputRef.current?.click()
  }

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      alert(t("avatarUploadError", "Não foi possível enviar a foto. Tente novamente."))
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
      return { label: t("statusActive", "ativo"), className: "bg-[#16683f] text-[#ECFDF3]" }
    if (profile.is_paid && !profile.is_visible)
      return { label: t("statusDraftBadge", "rascunho"), className: "bg-[#0B0B0D] text-[#F1EDE2]" }
    return { label: t("statusUnpublished", "não publicado"), className: "bg-[#F2B705] text-[#1A1505]" }
  }, [isOwnProfile, isPublished, profile.is_paid, profile.is_visible, t])

  const socials = (profile.social_media || []).filter((s) => s.is_active !== false)
  const location = [profile.municipio, profile.estado].filter(Boolean).join(", ")
  const avatarSrc = avatarOverride || profile.avatar_url || profile.user_avatar || undefined
  const displayName = profile.display_name || t("noName", "Sem nome")
  const canUploadAvatar = isOwnProfile

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
            // next/image (política F3.S6): banner é o LCP do perfil público e
            // sempre vem do R2. Avatar segue <img> (pode ser blob: de preview).
            <Image
              src={profile.manifestation.banner_url}
              alt=""
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              onError={() => setBannerFailed(true)}
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(242,183,5,0.30),transparent_38%),linear-gradient(135deg,#2a2212,#141009)]" />
          )}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-6rem)] flex-col items-start gap-1.5">
            {profile.manifestation?.tag_label && !isClan && (
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-[#0B0B0D] bg-[#0B0B0D] px-3 py-1.5 text-xs font-bold text-[#F2B705] shadow-[2px_2px_0_0_rgba(242,183,5,0.5)]">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profile.manifestation.tag_label}</span>
              </div>
            )}
            {statusBadge && (
              <span
                className={cn(
                  "rounded-full border-2 border-[#0B0B0D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] shadow-[2px_2px_0_0_#0B0B0D]",
                  statusBadge.className
                )}
              >
                {statusBadge.label}
              </span>
            )}
          </div>
          {/* Sino + menu da conta (visão do dono) — mesmos botões do banner
              do /account: as duas páginas têm a mesma função. */}
          {isOwnProfile && (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={() => setDropsideOpen(true)}
                aria-label={t("openAccountMenu", "Abrir menu da conta")}
                aria-haspopup="dialog"
                aria-expanded={dropsideOpen}
                title={t("openSettings", "Abrir configurações")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705] active:translate-x-px active:translate-y-px"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 md:px-7 md:pb-5">
          {/* Bloco principal: avatar (esquerda) + coluna de stats/info (direita).
              items-end no flex garante que a coluna direita só ocupe espaço da
              base do avatar pra baixo, ficando 100% fora da área do banner. */}
          <div className="-mt-10 flex items-end gap-4 md:-mt-14 md:gap-5">
            <div className="flex shrink-0 flex-col items-center">
              {canUploadAvatar ? (
                <button
                  type="button"
                  onClick={handleAvatarSelect}
                  disabled={uploadingAvatar}
                  aria-label={t("changeAvatar", "Trocar foto de perfil")}
                  title={t("changeAvatar", "Trocar foto de perfil")}
                  className="group relative flex aspect-[4/5] w-24 -rotate-3 items-center justify-center overflow-hidden rounded-xl border-4 border-[#0B0B0D] bg-[#F2B705]/15 shadow-[6px_6px_0_0_#F2B705] transition-transform duration-300 hover:rotate-0 disabled:opacity-70 md:w-32"
                >
                  {avatarSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#0B0B0D]">
                      {isClan ? <Users className="h-8 w-8" /> : getInitials(displayName)}
                    </div>
                  )}
                  <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#0B0B0D]/55 text-[#F1EDE2] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {uploadingAvatar ? t("sending", "Enviando…") : t("change", "Trocar")}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="relative flex aspect-[4/5] w-24 -rotate-3 items-center justify-center overflow-hidden rounded-xl border-4 border-[#0B0B0D] bg-[#F2B705]/15 shadow-[6px_6px_0_0_#F2B705] md:w-32">
                  {avatarSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#0B0B0D]">
                      {isClan ? <Users className="h-8 w-8" /> : getInitials(displayName)}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-2">
                <AvatarRatingStar profileId={profileId} />
              </div>
              {canUploadAvatar && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFile}
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
                    {t("postsLabel", "Posts")}
                  </span>
                </div>
                <span className="text-[#0B0B0D]/20">|</span>
                <button
                  type="button"
                  onClick={() => setOpenFollowers(true)}
                  className="flex items-baseline gap-1.5 transition hover:opacity-70"
                  aria-label={t("seeFollowersAria", "Ver quem acompanha")}
                >
                  <span className="text-lg font-bold tabular-nums text-[#0B0B0D] md:text-xl">
                    {counts.followers_count}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#0B0B0D]/55">
                    {t("followersShort", "Acomp.")}
                  </span>
                </button>
              </div>

              {(profile.machine_name || profile.desc_category || location || (isClan && typeof profile.members_count === "number")) && (
                <div className="mt-2 flex flex-col gap-1">
                  {profile.machine_name && (
                    <HeadInfo icon={Megaphone} value={tx.enxameFull(null, profile.machine_name)} />
                  )}
                  {profile.desc_category && (
                    <HeadInfo
                      icon={isClan ? Users : UserRound}
                      value={tx.profession(profile.desc_category)}
                    />
                  )}
                  {location && <HeadInfo icon={MapPin} value={location} />}
                  {isClan && typeof profile.members_count === "number" && (
                    <HeadInfo
                      icon={Users}
                      value={`${profile.members_count} ${profile.members_count === 1 ? t("profileSingular", "perfil") : t("profilePlural", "perfis")}`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Nome pequeno — o nome grande vive no header retrátil, igual ao
              @username do /account (esqueleto unificado user≡subperfil). */}
          <p className="mt-3 text-sm font-medium text-[#5b554b]">{displayName}</p>

          {profile.bio && (
            <MarkdownText className="mt-4 max-w-2xl break-words text-[13px] leading-relaxed text-[#2b2b2e] md:text-sm">
              {profile.bio}
            </MarkdownText>
          )}

          {/* Fila de chips (mesma do /account): nível + Mural + redes. */}
          {((!isClan && xpLevel !== null) ||
            (isOwnProfile && ownerActions?.onShowMural) ||
            socials.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!isClan && xpLevel !== null && (
                <span
                  title={t("accountLevelHint", "Nível da conta — sobe com o engajamento")}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#1A1505] shadow-[2px_2px_0_0_#0B0B0D]"
                >
                  <Sparkles className="h-3 w-3" />
                  {t("accountLevel", "Nível {level}").replace("{level}", String(xpLevel ?? 0))}
                </span>
              )}
              {isOwnProfile && ownerActions?.onShowMural && (
                <MuralPill
                  onClick={ownerActions.onShowMural}
                  label={t("mural", "Mural")}
                  ariaLabel={t("openMural", "Abrir Mural")}
                  hasNew={
                    !!(
                      ownerActions.muralBadge?.has_new ||
                      (ownerActions.muralBadge?.chat_unread || 0) > 0
                    )
                  }
                />
              )}
              <SocialIcons socials={socials} socialFallback={t("socialNetwork", "Rede social")} />
            </div>
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
                  label={menuOpen ? t("close", "Fechar") : t("settings", "Configurações")}
                  hint="headcard-settings"
                  accent
                  ariaExpanded={menuOpen}
                />
                <RetractableIcons open={menuOpen}>
                  <IconAction
                    onClick={handleEditClick}
                    icon={Pencil}
                    label={isClan ? t("editClan", "Editar clan") : t("editProfile", "Editar perfil")}
                    hint={isClan ? "headcard-edit-clan" : "headcard-edit-profile"}
                  />
                  <IconAction
                    href={"/mensagens"}
                    icon={MessageCircle}
                    label={t("myMessages", "Minhas mensagens")}
                    hint="headcard-messages"
                  />
                  {!isClan && communitiesFeatOn && (
                    <IconAction
                      href="/comunidades"
                      icon={Users}
                      label={t("communities", "Comunidade")}
                      hint="headcard-clans"
                    />
                  )}
                  {isClan && ownerActions.onShowMembers && (
                    <IconAction
                      onClick={ownerActions.onShowMembers}
                      icon={Users}
                      label={t("members", "Membros")}
                      hint="headcard-members"
                    />
                  )}
                  {isClan && ownerActions.manageHref && (
                    <IconAction
                      href={ownerActions.manageHref}
                      icon={Cog}
                      label={t("manage", "Gerenciar")}
                      hint="headcard-manage"
                    />
                  )}
                  {ownerActions.onShowEngagement && (
                    <IconAction
                      onClick={ownerActions.onShowEngagement}
                      icon={BarChart2}
                      label={t("engagement", "Engajamento")}
                      hint="headcard-engagement"
                    />
                  )}
                  {ownerActions.onShowRanking && (
                    <IconAction
                      onClick={ownerActions.onShowRanking}
                      icon={Trophy}
                      label={t("ranking", "Ranking")}
                      hint="headcard-ranking"
                    />
                  )}
                  {ownerActions.agendaHref && (
                    <IconAction
                      href={ownerActions.agendaHref}
                      icon={CalendarDays}
                      label={t("agenda", "Agenda")}
                      hint="headcard-agenda"
                    />
                  )}
                  {/* Ferramentas da conta (paridade user≡subperfil): os mesmos
                      itens do menu de ferramentas do /account. */}
                  {!isClan && (
                    <>
                      <IconAction
                        href="/account/xp"
                        icon={BarChart3}
                        label={t("metrics", "Métricas")}
                      />
                      <IconAction
                        href="/account/gerenciamento"
                        icon={FolderCog}
                        label={t("manage", "Gerenciar")}
                      />
                      {walletFeatOn && (
                        <IconAction
                          href="/wallet"
                          icon={Wallet}
                          label={t("myWallet", "Minha Carteira")}
                        />
                      )}
                      {dataApiOn && (
                        <IconAction
                          onClick={() => setDataConnOpen(true)}
                          icon={Database}
                          label={t("dataApi", "Conexões de Dados")}
                        />
                      )}
                      {atendimentoIaOn && (
                        <IconAction
                          href="/account/atendimento-ia"
                          icon={Bot}
                          label={t("atendimentoIa", "Atendimento IA")}
                        />
                      )}
                      {academiasOn && fitnessFeatOn && (
                        <IconAction
                          href="/fitness"
                          icon={Dumbbell}
                          label={t("fitnessTool", "Fitness")}
                        />
                      )}
                    </>
                  )}
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
                  label={t("sendMessage", "Enviar mensagem")}
                  hint="headcard-visit-message"
                />
                {isClan && visitorActions?.onShowMembers && (
                  <IconAction
                    onClick={visitorActions.onShowMembers}
                    icon={Users}
                    label={t("viewMembers", "Ver membros")}
                    hint="headcard-view-members"
                  />
                )}
                {visitorActions?.onShowRanking && (
                  <IconAction
                    onClick={visitorActions.onShowRanking}
                    icon={Trophy}
                    label={t("ranking", "Ranking")}
                    hint="headcard-ranking"
                  />
                )}
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
              {t("activateAccount", "Ative sua conta")}
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

      {isOwnProfile && dataApiOn && (
        <DataConnectionsModal open={dataConnOpen} onClose={() => setDataConnOpen(false)} />
      )}

      {isOwnProfile && (
        <UserDropside
          open={dropsideOpen}
          onClose={() => setDropsideOpen(false)}
          user={lsUser}
          onLogout={handleAccountLogout}
        />
      )}
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
  hint,
  badge,
  accent,
  ariaExpanded,
}: {
  href?: string
  onClick?: () => void
  icon: typeof Users
  label: string
  /** Id da dica de hover (passado explícito porque o label agora é traduzido). */
  hint?: HintId
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
  // O id da dica chega como prop `hint` — antes era derivado do label PT, que
  // agora é traduzido (o mapa por texto quebraria em en/es).
  const hintId = hint
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
        "flex flex-wrap items-center gap-1.5 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out",
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

// Stickers das redes sociais — estilo tabloide (quadrado arredondado, contorno
// preto grosso, papel creme, glifo dourado e sombra dura). Aparecem ao lado do
// botão Mural no headcard.
function SocialIcons({ socials, socialFallback }: { socials: ProfileSocialLink[]; socialFallback: string }) {
  if (socials.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {socials.map((social, index) => (
        <a
          key={social.id_profile_social_media || `${social.profile_url}-${index}`}
          href={social.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          title={social.desc_social_media_type || socialFallback}
          aria-label={social.desc_social_media_type || socialFallback}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#E0A500] shadow-[2px_2px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:bg-[#0B0B0D] hover:text-[#F2B705] hover:shadow-[3px_3px_0_0_#0B0B0D]"
        >
          {getSocialIcon(social.icon)}
        </a>
      ))}
    </div>
  )
}

export function MuralPill({ onClick, hasNew, label, ariaLabel }: { onClick: () => void; hasNew: boolean; label: string; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-1.5 text-[12px] font-bold text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
      aria-label={ariaLabel}
    >
      <Megaphone className="h-3.5 w-3.5 text-[#E0A500] group-hover:text-[#F2B705]" />
      <span>{label}</span>
      {hasNew && (
        <span className="ml-0.5 inline-flex h-2 w-2 rounded-full bg-[#F2B705] shadow-[0_0_0_2px_#F1EDE2]" />
      )}
    </button>
  )
}

export { getInitials }
