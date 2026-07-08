"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Bookmark, Heart, Send, MessageCircle, MessageSquare, Link2, Check, Sparkles, Flag, Music, Volume2, VolumeX, Users, Trash2, ArrowUpRight, Dumbbell } from "lucide-react"
import type { FeedFilters, FeedPost, FeedSocialLink } from "@/lib/types/portfolio-feed"
import { TrackAudio } from "@/components/media/track-audio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PostMedia } from "./post-media"
import { SocialLinksSheet } from "./social-links-sheet"
import { useImpressionObserver } from "./use-impression-observer"
import { sendFeedEvent } from "@/lib/feed-events"
import { getToken } from "@/lib/auth"
import { MachineTop10Crown } from "@/components/profile/machine-top10-crown"
import { cn } from "@/lib/utils"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"
import { ReportPostDialog } from "./report-post-dialog"
import { MarkdownText } from "@/components/ui/markdown-text"
import { useTranslations } from "@/components/i18n/I18nProvider"

function timeAgo(iso: string | null, t: (key: string, fallback?: string) => string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (diff < 60) return t("timeNow", "agora")
  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return t("timeMinutes", "{n} min").replace("{n}", String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("timeHours", "{n} h").replace("{n}", String(hours))
  const days = Math.floor(hours / 24)
  if (days < 7) return t("timeDays", "{n} d").replace("{n}", String(days))
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return t("timeWeeks", "{n} sem").replace("{n}", String(weeks))
  const months = Math.floor(days / 30)
  if (months < 12) return t("timeMonths", "{n} m").replace("{n}", String(months))
  const years = Math.floor(days / 365)
  return t("timeYears", "{n} a").replace("{n}", String(years))
}

interface PortfolioPostCardProps {
  post: FeedPost
  filters: FeedFilters
  onLikeChange?: (postId: string, liked: boolean, likes_count: number | null) => void
  onOpenComments?: (postId: string) => void
  commentsCount?: number
  /** Um post por ecrã: mídia cresce e o cartão preenche a altura do snap */
  paged?: boolean
  /** Quando definido, o botão compartilhar usa esta URL (ex.: link rastreado da comunidade). */
  shareUrlOverride?: string
  /** Esconde o botão "Acessar comunidade" (ex.: dentro da própria página da comunidade). */
  hideCommunityLink?: boolean
  /** Recado: chamado ao apagar; quando ausente, o botão de apagar não aparece. */
  onDeleteRecado?: (recadoId: number) => void
  /** Recado: se o viewer pode apagar este recado (autor ou líder). */
  canDeleteRecado?: boolean
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

/** Adesivo de "fita washi" amarela translúcida com coração vermelho, colado
 *  por cima do like depois de curtir. Decorativo (pointer-events-none). */
function LikeTapeSticker() {
  return (
    <span
      aria-hidden
      className="fl-like-tape pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
    >
      <span className="relative block h-[26px] w-[42px] -rotate-[7deg] bg-[#F4D53B]/55 shadow-[1.5px_2.5px_4px_rgba(0,0,0,0.4)]">
        {/* brilho da fita */}
        <span className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/15" />
        {/* bordas "rasgadas"/coladas da fita */}
        <span className="absolute inset-y-0 left-0 w-1.5 bg-white/25" />
        <span className="absolute inset-y-0 right-0 w-1.5 bg-white/15" />
        {/* coração vermelho */}
        <Heart className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-[6deg] fill-[#E11D48] text-[#E11D48] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" />
      </span>
    </span>
  )
}

export function PortfolioPostCard({ post, filters, onLikeChange, onOpenComments, commentsCount, paged, shareUrlOverride, hideCommunityLink, onDeleteRecado, canDeleteRecado }: PortfolioPostCardProps) {
  const t = useTranslations("Post")
  const router = useRouter()
  const impressionRef = useImpressionObserver(post.post_id, filters)
  const machineColor = post.machine?.color_accent || "#fbbf24"
  const machineGlow = post.machine?.color_glow || null

  const [liked, setLiked] = useState(post.viewer_has_liked)
  const [bookmarked, setBookmarked] = useState(!!post.viewer_has_bookmarked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [likePending, setLikePending] = useState(false)
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [audioInView, setAudioInView] = useState(false)
  const [audioMuted, setAudioMuted] = useState(true)
  const hasMusic = !!post.audio?.audio_url

  const submitReport = async ({ reason_category, reason }: { reason_category: string; reason: string }) => {
    const token = getToken()
    if (!token) throw new Error(t("mustLoginToReport", "Faça login para denunciar"))
    const res = await fetch(`/api/portfolio/items/${post.post_id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason_category, reason: reason || null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || t("reportFailureError", "Falha {status}").replace("{status}", String(res.status)))
    }
  }
  const { coupon: shareCoupon } = useShareCoupon()
  const primaryUrl = post.project_url || post.public_profile_url
  const primaryLabel =
    post.source_type === "course"
      ? t("viewCourse", "Ver curso")
      : post.project_url
        ? t("openLink", "Abrir link")
        : t("viewProfile", "Ver perfil")
  const retentionSequenceRef = useRef(0)

  useEffect(() => {
    const node = impressionRef.current
    if (!node || !post.post_id || typeof IntersectionObserver === "undefined") return

    let visible = false
    let pendingSeconds = 0

    const flush = () => {
      const seconds = Math.floor(pendingSeconds)
      if (seconds <= 0) return
      pendingSeconds -= seconds
      retentionSequenceRef.current += 1
      sendFeedEvent({
        post_id: post.post_id,
        event_type: "content_retention",
        filters,
        metadata: {
          seconds_delta: seconds,
          sequence: retentionSequenceRef.current,
        },
      })
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting && entry.intersectionRatio >= 0.5
        if (!visible) flush()
      },
      { threshold: [0, 0.5, 1] }
    )
    observer.observe(node)

    const interval = window.setInterval(() => {
      if (visible && document.visibilityState === "visible") {
        pendingSeconds += 5
        if (pendingSeconds >= 10) flush()
      }
    }, 5000)

    const onVisibility = () => {
      if (document.visibilityState !== "visible") flush()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
      observer.disconnect()
      flush()
    }
  }, [filters, impressionRef, post.post_id])

  // Música anexada: só toca quando o card está realmente em cena (>=60% visível).
  useEffect(() => {
    if (!hasMusic) return
    const node = impressionRef.current
    if (!node || typeof IntersectionObserver === "undefined") return
    const obs = new IntersectionObserver(
      ([entry]) => setAudioInView(!!entry?.isIntersecting && entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [hasMusic, impressionRef])

  const handleLike = async () => {
    const token = getToken()
    if (!token) {
      const next = encodeURIComponent("/feed")
      router.push(`/login?next=${next}`)
      return
    }
    if (likePending) return

    const wasLiked = liked
    const optimisticLiked = !wasLiked
    const optimisticCount = Math.max(0, likesCount + (optimisticLiked ? 1 : -1))
    setLiked(optimisticLiked)
    setLikesCount(optimisticCount)
    setLikePending(true)

    try {
      const res = await fetch("/api/ranking/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_portfolio_item: post.post_id,
          id_profile: post.profile_id,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const finalLiked = !!data.liked
      const finalCount =
        typeof data.likes_count === "number" ? data.likes_count : optimisticCount
      setLiked(finalLiked)
      setLikesCount(finalCount)
      onLikeChange?.(post.post_id, finalLiked, finalCount)
      sendFeedEvent({
        post_id: post.post_id,
        event_type: finalLiked ? "like" : "unlike",
        filters,
      })
    } catch {
      setLiked(wasLiked)
      setLikesCount(post.likes_count)
    } finally {
      setLikePending(false)
    }
  }

  const handleShare = async () => {
    const baseUrl =
      shareUrlOverride ||
      (primaryUrl
        ? new URL(
            primaryUrl,
            typeof window !== "undefined" ? window.location.origin : "https://freelandoo.com"
          ).toString()
        : null) || (typeof window !== "undefined" ? window.location.href : "")
    const url = shareCoupon?.code ? buildShareUrlWithCoupon(baseUrl, shareCoupon.code) : baseUrl

    const shareData: ShareData = {
      title: post.profile_name || "Freelandoo",
      text: post.title || post.caption || "",
      url,
    }

    let shared = false
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData)
        shared = true
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        shared = true
      }
    } catch {
      // Cancelado ou bloqueado — não trackear.
    }

    if (shared) {
      sendFeedEvent({
        post_id: post.post_id,
        event_type: "share",
        filters,
      })
    }
  }

  const handleProfileClick = () => {
    sendFeedEvent({
      post_id: post.post_id,
      event_type: "profile_click",
      filters,
    })
  }

  const handleWhatsappClick = () => {
    sendFeedEvent({
      post_id: post.post_id,
      event_type: "whatsapp_click",
      filters,
    })
  }

  const handleSocialClick = (link: FeedSocialLink) => {
    sendFeedEvent({
      post_id: post.post_id,
      event_type: "social_click",
      filters,
      metadata: { type: link.type },
    })
  }

  const handleBookmark = async () => {
    const token = getToken()
    if (!token) {
      const next = encodeURIComponent("/feed")
      router.push(`/login?next=${next}`)
      return
    }
    if (bookmarkPending) return

    const previous = bookmarked
    setBookmarked(!previous)
    setBookmarkPending(true)
    try {
      const res = await fetch("/api/me/bookmarks/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id: post.post_id }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBookmarked(!!data.bookmarked)
    } catch {
      setBookmarked(previous)
    } finally {
      setBookmarkPending(false)
    }
  }

  const musicPill = hasMusic ? (
    <button
      type="button"
      onClick={() => setAudioMuted((m) => !m)}
      aria-label={audioMuted ? t("unmuteMusic", "Ativar música") : t("muteMusic", "Silenciar música")}
      className="inline-flex max-w-full items-center gap-1.5 border border-[#F5F1E8]/15 bg-[#0b0804] px-2.5 py-1 text-[11px] font-semibold text-[#F5F1E8] transition hover:bg-[#1D1810]"
    >
      <Music className="h-3 w-3 shrink-0 text-[#F2B705]" />
      <span className="truncate">
        {post.audio?.title || t("musicLabel", "Música")}
        {post.audio?.artist ? ` · ${post.audio.artist}` : ""}
      </span>
      {audioMuted ? <VolumeX className="h-3 w-3 shrink-0" /> : <Volume2 className="h-3 w-3 shrink-0 text-[#F2B705]" />}
    </button>
  ) : null

  const showCommunityLink = !!post.community && !hideCommunityLink
  // Chip "Acessar comunidade" (estilo tabloide do /feed) no final do header.
  const communityChipFeed = showCommunityLink ? (
    <Link
      href={`/comunidades/${post.community!.id_profile}`}
      onClick={(e) => e.stopPropagation()}
      title={t("accessCommunity", "Acessar comunidade")}
      className="inline-flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#0B0B0D] transition hover:-translate-y-0.5"
    >
      <Users className="h-3 w-3" />
      <span className="hidden sm:inline">{t("accessCommunity", "Acessar comunidade")}</span>
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  ) : null
  // Chip da comunidade na pele escura/rounded do modo paged (bees).
  const communityChipPaged = showCommunityLink ? (
    <Link
      href={`/comunidades/${post.community!.id_profile}`}
      onClick={(e) => e.stopPropagation()}
      title={t("accessCommunity", "Acessar comunidade")}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{ color: machineColor, background: `${machineColor}14`, border: `1px solid ${machineColor}33` }}
    >
      <Users className="h-3 w-3" />
      <span className="hidden sm:inline">{t("accessCommunity", "Acessar comunidade")}</span>
    </Link>
  ) : null

  // Academia à qual o post está ligado (mig 181) — chip "Acessar academia".
  const showAcademyLink = !!post.academy && !!post.academy.slug
  const academyChipFeed = showAcademyLink ? (
    <Link
      href={`/academias/${post.academy!.slug}`}
      onClick={(e) => e.stopPropagation()}
      title={t("accessAcademy", "Acessar academia")}
      className="inline-flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#0B0B0D] transition hover:-translate-y-0.5"
    >
      <Dumbbell className="h-3 w-3" />
      <span className="hidden sm:inline">{t("accessAcademy", "Acessar academia")}</span>
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  ) : null
  const academyChipPaged = showAcademyLink ? (
    <Link
      href={`/academias/${post.academy!.slug}`}
      onClick={(e) => e.stopPropagation()}
      title={t("accessAcademy", "Acessar academia")}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{ color: machineColor, background: `${machineColor}14`, border: `1px solid ${machineColor}33` }}
    >
      <Dumbbell className="h-3 w-3" />
      <span className="hidden sm:inline">{t("accessAcademy", "Acessar academia")}</span>
    </Link>
  ) : null

  // ── Recado: nota só-texto exclusiva do feed da comunidade (sem mídia). ──────
  if (post.is_recado) {
    return (
      <article
        ref={impressionRef}
        className={cn(
          "group/post box-border w-full max-w-full overflow-hidden text-[#F5F1E8]",
          paged
            ? "flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-zinc-950/80"
            : "border-b border-[#F5F1E8]/10 bg-[#15120E]"
        )}
        data-post-id={post.post_id}
      >
        {/* Header */}
        <div className="flex w-full min-w-0 items-center gap-2.5 border-b border-[#F5F1E8]/10 bg-[#15120E] px-3 py-2.5">
          <Link href={post.public_profile_url || "#"} onClick={handleProfileClick} className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className="relative shrink-0 -rotate-2 overflow-hidden border-2 border-[#0B0B0D]"
              style={{ outline: "2px solid #F2B705", outlineOffset: "1px" }}
            >
              <Avatar className="h-9 w-9 rounded-none">
                {post.avatar_url ? <AvatarImage src={post.avatar_url} alt={post.profile_name || ""} className="object-cover" /> : null}
                <AvatarFallback className="rounded-none bg-[#1D1810] text-xs font-bold text-[#F2B705]">{initials(post.profile_name)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <span className="fl-display block truncate text-base leading-none text-[#F5F1E8]">
                {post.profile_name || post.username || t("profileLabel", "Perfil")}
              </span>
              <p className="truncate text-[11px] font-semibold text-[#9A938A]">
                {post.published_at && timeAgo(post.published_at, t)}
                {post.published_at && (post.city || post.state) && <span> · </span>}
                {post.city && <span>{post.city}</span>}
                {post.city && post.state && <span>/</span>}
                {post.state && <span>{post.state}</span>}
              </p>
            </div>
          </Link>
          <span className="inline-flex shrink-0 -rotate-1 items-center gap-1 border border-[#0B0B0D] bg-[#F2B705] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]">
            <MessageSquare className="h-3 w-3" /> {t("recadoLabel", "Recado")}
          </span>
          {communityChipFeed}
          {academyChipFeed}
        </div>

        {/* Corpo: texto do recado */}
        <div className="bg-[#15120E] px-4 py-4">
          <div className="border-l-2 border-[#F2B705]/40 pl-3">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#F5F1E8]">{post.caption}</p>
          </div>
          {canDeleteRecado && onDeleteRecado && typeof post.recado_id === "number" && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onDeleteRecado(post.recado_id as number)}
                className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A] transition hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("deleteRecado", "Apagar")}
              </button>
            </div>
          )}
        </div>
      </article>
    )
  }

  // Edge-to-edge Instagram-style quando não é paged (bees vertical).
  return (
    <article
      ref={impressionRef}
      className={cn(
        "group/post box-border w-full max-w-full",
        paged
          ? "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur transition-all duration-300 hover:border-white/15"
          : "overflow-hidden border-b border-[#F5F1E8]/10 bg-[#15120E] text-[#F5F1E8]"
      )}
      data-post-id={post.post_id}
    >
      {hasMusic && (
        <TrackAudio
          src={post.audio!.audio_url}
          startMs={post.audio!.start_ms}
          active={audioInView}
          muted={audioMuted}
        />
      )}

      {/* Header */}
      {paged ? (
        <div className="flex w-full min-w-0 shrink-0 items-center gap-3 px-4 py-2">
          <Link
            href={post.public_profile_url || "#"}
            onClick={handleProfileClick}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: machineColor }}
              title={post.machine?.name || ""}
            />
            <Avatar
              className="h-10 w-10 shrink-0 ring-1 transition"
              style={{ "--tw-ring-color": `${machineColor}38` } as React.CSSProperties}
            >
              {post.avatar_url ? (
                <AvatarImage src={post.avatar_url} alt={post.profile_name || ""} />
              ) : null}
              <AvatarFallback className="bg-white/5 text-xs text-white/70">
                {initials(post.profile_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-white">
                  {post.profile_name || post.username || t("profileLabel", "Perfil")}
                </span>
                <MachineTop10Crown profileId={post.profile_id} accentColor={machineColor} iconClassName="h-4 w-4" />
                {post.is_clan && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] uppercase tracking-wide"
                    style={{ borderColor: `${machineColor}55`, color: machineColor }}
                  >
                    Clan
                  </Badge>
                )}
              </div>
              <p className="truncate text-[11px] text-white/50">
                {post.profession?.name && (
                  <>
                    <span>{post.profession.name}</span>
                    {(post.city || post.state) && <span> · </span>}
                  </>
                )}
                {post.city && <span>{post.city}</span>}
                {post.city && post.state && <span>/</span>}
                {post.state && <span>{post.state}</span>}
              </p>
            </div>
          </Link>

          {post.machine?.name && (
            <span
              className="min-w-0 max-w-[38%] shrink truncate rounded-full px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider sm:max-w-[45%]"
              style={{
                color: machineColor,
                background: `${machineColor}14`,
                border: `1px solid ${machineColor}33`,
              }}
              title={post.machine.name}
            >
              {post.machine.name.replace(/^Enxame de\s+/i, "")}
            </span>
          )}
          {communityChipPaged}
          {academyChipPaged}
        </div>
      ) : (
        <div className="flex w-full min-w-0 shrink-0 items-center gap-2.5 border-b border-[#F5F1E8]/10 bg-[#15120E] px-3 py-2.5">
          <Link
            href={post.public_profile_url || "#"}
            onClick={handleProfileClick}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rotate-45 border-2 border-[#F5F1E8]/25"
              style={{ backgroundColor: machineColor }}
              title={post.machine?.name || ""}
            />
            <div
              className="relative shrink-0 -rotate-2 overflow-hidden border-2 border-[#0B0B0D]"
              style={{ outline: "2px solid #F2B705", outlineOffset: "1px" }}
            >
              <Avatar className="h-10 w-10 rounded-none">
                {post.avatar_url ? (
                  <AvatarImage src={post.avatar_url} alt={post.profile_name || ""} className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-none bg-[#1D1810] text-xs font-bold text-[#F2B705]">
                  {initials(post.profile_name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="fl-display truncate text-lg leading-none text-[#F5F1E8]">
                  {post.profile_name || post.username || t("profileLabel", "Perfil")}
                </span>
                <MachineTop10Crown profileId={post.profile_id} accentColor="#F2B705" iconClassName="h-4 w-4" />
                {post.is_clan && (
                  <span className="-rotate-2 border border-[#0B0B0D] bg-[#F2B705] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]">
                    Clan
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] font-semibold text-[#9A938A]">
                {post.published_at && (
                  <>
                    <span>{timeAgo(post.published_at, t)}</span>
                    {(post.city || post.state) && <span> · </span>}
                  </>
                )}
                {post.city && <span>{post.city}</span>}
                {post.city && post.state && <span>/</span>}
                {post.state && <span>{post.state}</span>}
              </p>
            </div>
          </Link>

          {post.machine?.name && (
            <span
              className="hidden min-w-0 max-w-[38%] shrink truncate border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-1 text-center text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] sm:block sm:max-w-[45%]"
              title={post.machine.name}
            >
              {post.machine.name.replace(/^Enxame de\s+/i, "")}
            </span>
          )}
          {communityChipFeed}
          {academyChipFeed}
        </div>
      )}

      {paged ? (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col">
            <PostMedia
              media={post.media}
              glow={null}
              fillContainer
              reserveBottomOverlay
            />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-44 bg-gradient-to-t from-black via-black/70 to-transparent"
          />

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-[2] box-border min-w-0 max-w-full p-4 pr-[4.5rem] pt-2",
              post.media.length > 1 && "pb-14"
            )}
          >
            {(post.title || post.caption) && (
              <div className="pointer-events-none">
                {post.title && (
                  <h3 className="text-balance text-lg font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                    {post.title}
                  </h3>
                )}
                {post.caption && (
                  <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)]">
                    {post.caption}
                  </p>
                )}
              </div>
            )}

            {musicPill && <div className="pointer-events-auto mt-3">{musicPill}</div>}

            {(post.whatsapp_url || (post.social_links && post.social_links.length > 0)) && (
              <div className="pointer-events-auto mt-3 flex flex-wrap gap-2">
                {post.whatsapp_url && (
                  <a
                    href={post.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleWhatsappClick}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-3 py-1.5 text-xs font-medium text-emerald-100 ring-1 ring-emerald-400/30 backdrop-blur-sm transition hover:bg-emerald-500/35"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
                {post.social_links && post.social_links.length > 0 && (
                  <SocialLinksSheet
                    links={post.social_links}
                    onLinkClick={handleSocialClick}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/25"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {post.social_links.length === 1
                        ? t("socialNetworksOne", "{n} rede").replace("{n}", String(post.social_links.length))
                        : t("socialNetworksMany", "{n} redes").replace("{n}", String(post.social_links.length))}
                      </button>
                    }
                  />
                )}
              </div>
            )}
          </div>

          <div className="absolute bottom-28 right-2 z-[3] flex max-w-[3.5rem] flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={liked ? t("unlikeButton", "Descurtir") : t("likeButton", "Curtir")}
                onClick={handleLike}
                disabled={likePending}
                className={cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95 disabled:opacity-60",
                  liked && "text-yellow-400 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]"
                )}
              >
                <Heart
                  className={cn(
                    "h-7 w-7 transition-transform duration-200",
                    liked ? "fill-current scale-110" : ""
                  )}
                />
                {liked && <LikeTapeSticker />}
              </button>
              <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {likesCount.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={t("commentsButton", "Comentários")}
                onClick={() => onOpenComments?.(post.post_id)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95"
              >
                <MessageSquare className="h-6 w-6" />
              </button>
              {!!(commentsCount && commentsCount > 0) && (
                <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {commentsCount.toLocaleString("pt-BR")}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={t("shareButton", "Compartilhar")}
                onClick={handleShare}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95"
              >
                {copied ? (
                  <Check className="h-6 w-6 text-emerald-400" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={bookmarked ? t("removeFromSaved", "Remover dos salvos") : t("saveForLater", "Salvar para depois")}
                onClick={handleBookmark}
                disabled={bookmarkPending}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95 disabled:opacity-60",
                  bookmarked && "text-yellow-400 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]"
                )}
              >
                <Bookmark className={cn("h-6 w-6", bookmarked && "fill-current")} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={t("reportPostButton", "Denunciar publicação")}
                onClick={() => setReportOpen(true)}
                data-tour="bees-report"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white/75 shadow ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 hover:text-amber-300 active:scale-95"
              >
                <Flag className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-[#0b0804]">
            <PostMedia
              media={post.media}
              glow={null}
              aspect={post.feed_kind === "bees" ? "9:16" : "4:5"}
            />
          </div>

          {/* FOOTER tabloide (escuro) */}
          <div className="border-t border-[#F5F1E8]/10 bg-[#15120E]">
            {/* Ações: like, comentar, compartilhar, salvar, denunciar */}
            <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
              <button
                type="button"
                aria-label={liked ? t("unlikeButton", "Descurtir") : t("likeButton", "Curtir")}
                onClick={handleLike}
                disabled={likePending}
                className={cn(
                  "relative rounded-full p-1.5 transition-all duration-200 hover:bg-[#F5F1E8]/10 active:scale-90 disabled:opacity-60",
                  liked ? "text-[#F2B705]" : "text-[#F5F1E8]"
                )}
              >
                <Heart
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    liked && "fill-current scale-110"
                  )}
                  strokeWidth={2}
                />
                {liked && <LikeTapeSticker />}
              </button>
              <button
                type="button"
                aria-label={t("commentsButton", "Comentários")}
                onClick={() => onOpenComments?.(post.post_id)}
                className="rounded-full p-1.5 text-[#F5F1E8] transition hover:bg-[#F5F1E8]/10 active:scale-90"
              >
                <MessageSquare className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label={t("shareButton", "Compartilhar")}
                onClick={handleShare}
                className="rounded-full p-1.5 text-[#F5F1E8] transition hover:bg-[#F5F1E8]/10 active:scale-90"
              >
                {copied ? (
                  <Check className="h-6 w-6 text-emerald-400 animate-in zoom-in-50 duration-200" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
              <button
                type="button"
                aria-label={bookmarked ? t("removeFromSaved", "Remover dos salvos") : t("saveForLater", "Salvar para depois")}
                onClick={handleBookmark}
                disabled={bookmarkPending}
                className={cn(
                  "ml-auto rounded-full p-1.5 transition hover:bg-[#F5F1E8]/10 active:scale-90 disabled:opacity-60",
                  bookmarked ? "text-[#F2B705]" : "text-[#F5F1E8]"
                )}
              >
                <Bookmark className={cn("h-6 w-6", bookmarked && "fill-current")} />
              </button>
              <button
                type="button"
                aria-label={t("reportPostButton", "Denunciar publicação")}
                onClick={() => setReportOpen(true)}
                data-tour="feed-report"
                className="rounded-full p-1.5 text-[#9A938A] transition hover:bg-[#F5F1E8]/10 hover:text-[#F2B705] active:scale-90"
              >
                <Flag className="h-5 w-5" />
              </button>
            </div>

            {/* Contador de curtidas */}
            <div className="flex items-baseline gap-1.5 px-3 pt-1.5">
              <span className="fl-display text-xl leading-none text-[#F5F1E8]">
                {likesCount.toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                {likesCount === 1 ? t("likesLabelOne", "curtida") : t("likesLabelMany", "curtidas")}
              </span>
            </div>

            {/* Descrição com "mais"/"menos" — máximo 3000 chars no backend */}
            {(post.title || post.caption) && (
              <div className="shrink-0 px-3 pt-1 text-[14px] leading-snug text-[#F5F1E8]">
                {post.title && (
                  <span className="mr-1.5 font-bold">
                    {post.profile_name || post.username || t("profileLabel", "Perfil")}
                  </span>
                )}
                <PostCaption
                  title={post.title}
                  caption={post.caption}
                  profileLabel={post.profile_name || post.username || t("profileLabel", "Perfil")}
                  onExpand={() =>
                    sendFeedEvent({
                      post_id: post.post_id,
                      event_type: "view_more_caption",
                      filters,
                    })
                  }
                />
              </div>
            )}

            {/* WhatsApp + links sociais — botões de borda dura */}
            {(post.whatsapp_url || (post.social_links && post.social_links.length > 0)) && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-2.5">
                {post.whatsapp_url && (
                  <a
                    href={post.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleWhatsappClick}
                    className="inline-flex items-center gap-1.5 border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </a>
                )}
                {post.social_links && post.social_links.length > 0 && (
                  <SocialLinksSheet
                    links={post.social_links}
                    onLinkClick={handleSocialClick}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 border border-[#F5F1E8]/25 bg-transparent px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#F5F1E8] transition-colors hover:border-[#F5F1E8] hover:bg-[#F5F1E8]/5"
                      >
                        <Link2 className="h-3 w-3" />
                        {post.social_links.length === 1
                          ? t("socialNetworksOne", "{n} rede").replace("{n}", String(post.social_links.length))
                          : t("socialNetworksMany", "{n} redes").replace("{n}", String(post.social_links.length))}
                      </button>
                    }
                  />
                )}
              </div>
            )}

            {musicPill && <div className="px-3 pt-2.5">{musicPill}</div>}

            {/* Ver comentários */}
            {!!(commentsCount && commentsCount > 0) && (
              <button
                type="button"
                onClick={() => onOpenComments?.(post.post_id)}
                className="px-3 pt-2 text-left text-[12px] font-semibold text-[#9A938A] transition hover:text-[#F5F1E8]"
              >
                {commentsCount === 1
                  ? t("viewCommentsOne", "Ver {n} comentário").replace("{n}", "1")
                  : t("viewCommentsMany", "Ver os {n} comentários").replace("{n}", commentsCount.toLocaleString("pt-BR"))}
              </button>
            )}

            {/* Rodapé — selo Bee / assinatura tabloide */}
            <div className="mt-2 flex items-center justify-between border-t border-[#F5F1E8]/10 px-3 py-2">
              {post.feed_kind === "bees" ? (
                <span className="inline-flex -rotate-1 items-center gap-1 border border-[#0B0B0D] bg-[#F2B705] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]">
                  <Sparkles className="h-3 w-3" /> {t("beeLabel", "Bee")}
                </span>
              ) : (
                <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#F5F1E8]/30">
                  freelandoo
                </span>
              )}
              {post.machine?.name && (
                <span className="fl-marker max-w-[55%] truncate text-base leading-none text-[#E0A500]">
                  {post.machine.name.replace(/^Enxame de\s+/i, "")}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <ReportPostDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSubmit={submitReport}
      />
    </article>
  )
}

interface PostCaptionProps {
  title: string | null
  caption: string | null
  profileLabel: string
  onExpand?: () => void
}

function PostCaption({ title, caption, profileLabel, onExpand }: PostCaptionProps) {
  const t = useTranslations("Post")
  const [expanded, setExpanded] = useState(false)
  const parts: string[] = []
  if (title) parts.push(title)
  if (caption) parts.push(caption)
  const text = parts.join("\n\n")
  if (!text) return null

  // Trecho prévio: ~140 chars (uma linha + meia em mobile)
  const PREVIEW = 140
  const needsToggle = text.length > PREVIEW
  const visible = expanded || !needsToggle ? text : text.slice(0, PREVIEW).trimEnd()

  return (
    <div className="text-[#C9C2B6]">
      {!title && (
        <span className="mr-1.5 font-bold text-[#F5F1E8]">{profileLabel}</span>
      )}
      <MarkdownText className="inline [&_p]:inline">{visible}</MarkdownText>
      {needsToggle && !expanded && (
        <>
          {"… "}
          <button
            type="button"
            onClick={() => {
              setExpanded(true)
              onExpand?.()
            }}
            className="font-semibold text-[#9A938A] transition hover:text-[#F5F1E8]"
          >
            {t("expandButton", "mais")}
          </button>
        </>
      )}
      {needsToggle && expanded && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="font-semibold text-[#9A938A] transition hover:text-[#F5F1E8]"
          >
            {t("collapseButton", "menos")}
          </button>
        </>
      )}
    </div>
  )
}
