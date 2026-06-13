"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Heart, Send, MessageCircle, MessageSquare, Check, ChevronUp, Bookmark, Flag } from "lucide-react"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { sendFeedEvent } from "@/lib/feed-events"
import { queueImpression } from "@/lib/feed-impressions"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"
import { ReportPostDialog } from "@/components/feed/report-post-dialog"
import { BeesVideo } from "./bees-video"
import { TrackAudio } from "@/components/media/track-audio"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface BeesPostProps {
  post: FeedPost
  filters: FeedFilters
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  onActivate: () => void
  onLikeChange?: (postId: string, liked: boolean, likes_count: number | null) => void
  onOpenComments?: (postId: string) => void
  commentsCount?: number
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

const IMPRESSION_THRESHOLD = 0.75
const DWELL_MS = 700

export function BeesPost({
  post,
  filters,
  isActive,
  muted,
  onToggleMute,
  onActivate,
  onLikeChange,
  onOpenComments,
  commentsCount,
}: BeesPostProps) {
  const t = useTranslations("Bees")
  const router = useRouter()
  const sectionRef = useRef<HTMLElement | null>(null)
  const impressionFired = useRef(false)
  const filtersRef = useRef(filters)
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const [liked, setLiked] = useState(post.viewer_has_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [likePending, setLikePending] = useState(false)
  const [bookmarked, setBookmarked] = useState(!!post.viewer_has_bookmarked)
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandCaption, setExpandCaption] = useState(false)
  const { coupon: shareCoupon } = useShareCoupon()

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") return

    let dwellTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_THRESHOLD) {
          onActivate()
          if (!impressionFired.current) {
            if (dwellTimer) return
            dwellTimer = setTimeout(() => {
              dwellTimer = null
              if (impressionFired.current) return
              impressionFired.current = true
              queueImpression(post.post_id, filtersRef.current)
            }, DWELL_MS)
          }
        } else if (dwellTimer) {
          clearTimeout(dwellTimer)
          dwellTimer = null
        }
      },
      { threshold: [0, 0.25, 0.5, IMPRESSION_THRESHOLD, 1] }
    )

    observer.observe(node)
    return () => {
      if (dwellTimer) clearTimeout(dwellTimer)
      observer.disconnect()
    }
  }, [post.post_id, onActivate])

  const handleLike = async () => {
    const token = getToken()
    if (!token) {
      router.push(`/login?next=${encodeURIComponent("/bees")}`)
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
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${post.post_id}`
        : ""
    const url = shareCoupon?.code ? buildShareUrlWithCoupon(baseUrl, shareCoupon.code) : baseUrl

    const shareData: ShareData = {
      title: post.profile_name || "Freelandoo", // marca, não traduz
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
      /* cancelado */
    }

    if (shared) {
      sendFeedEvent({ post_id: post.post_id, event_type: "share", filters })
    }
  }

  const handleBookmark = async () => {
    const token = getToken()
    if (!token) {
      router.push(`/login?next=${encodeURIComponent("/bees")}`)
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

  const submitReport = async ({ reason_category, reason }: { reason_category: string; reason: string }) => {
    const token = getToken()
    if (!token) throw new Error(t("loginToReport", "Faça login para denunciar"))
    const res = await fetch(`/api/portfolio/items/${post.post_id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason_category, reason: reason || null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `Falha ${res.status}`)
    }
  }

  const handleProfileClick = () => {
    sendFeedEvent({ post_id: post.post_id, event_type: "profile_click", filters })
  }

  const handleWhatsappClick = () => {
    sendFeedEvent({ post_id: post.post_id, event_type: "whatsapp_click", filters })
  }

  const video = post.media.find((m) => m.type === "video") || post.media[0]
  const hasVideo = !!video && video.type === "video"
  const hasMusic = !!post.audio?.audio_url

  return (
    <section
      ref={sectionRef}
      data-post-id={post.post_id}
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {/* Vídeo ou fallback */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Em retrato (celular/tablet) o vídeo é full-bleed estilo TikTok/Kwai —
            o object-cover corta o excedente. A moldura 9:16 centralizada só
            vale em paisagem/desktop, onde o cover cortaria demais. */}
        <div
          className="relative h-full w-full landscape:max-w-[min(100vw,calc(100dvh*9/16))]"
        >
          {hasVideo ? (
            <BeesVideo
              url={video.url}
              poster={video.thumbnail_url}
              isActive={isActive}
              muted={muted || hasMusic}
              onToggleMute={onToggleMute}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-white/40">
              {t("noVideo", "Sem vídeo disponível")}
            </div>
          )}

          {/* Música anexada (metadado) — segue o mute do bee. */}
          {hasMusic && (
            <TrackAudio
              src={post.audio!.audio_url}
              startMs={post.audio!.start_ms}
              active={isActive}
              paused={!isActive}
              muted={muted}
            />
          )}

          {/* Gradientes (relativos ao vídeo) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/85 via-black/30 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-black/55 via-black/10 to-transparent"
          />

          {/* Coluna de ações — overlay no mobile, fora do vídeo no desktop */}
          <div
            className={cn(
              "absolute z-20 flex flex-col items-center gap-5",
              // retrato (celular/tablet full-bleed): overlay no canto inferior direito do vídeo
              "bottom-24 right-3",
              // desktop/paisagem: fora do vídeo, grudado na borda direita (em
              // retrato o vídeo é full-bleed — left-full jogaria a coluna pra fora da tela)
              "md:landscape:bottom-12 md:landscape:right-auto md:landscape:left-full md:landscape:ml-3"
            )}
          >
            <ActionButton
              ariaLabel={liked ? t("unlike", "Descurtir") : t("like", "Curtir")}
              onClick={handleLike}
              disabled={likePending}
            >
              <Heart
                className={cn(
                  "h-7 w-7 transition-transform",
                  liked ? "fill-current scale-110 text-yellow-400" : ""
                )}
              />
              <CounterLabel value={likesCount} />
            </ActionButton>

            <ActionButton
              ariaLabel={t("comments", "Comentários")}
              onClick={() => onOpenComments?.(post.post_id)}
            >
              <MessageSquare className="h-7 w-7" />
              <CounterLabel value={commentsCount ?? 0} />
            </ActionButton>

            <ActionButton ariaLabel={t("share", "Compartilhar")} onClick={handleShare}>
              {copied ? (
                <Check className="h-7 w-7 text-emerald-400" />
              ) : (
                <Send className="h-7 w-7" />
              )}
              <CounterLabel value={post.shares_count} />
            </ActionButton>

            <ActionButton
              ariaLabel={bookmarked ? t("removeBookmark", "Remover dos salvos") : t("saveForLater", "Salvar para depois")}
              onClick={handleBookmark}
              disabled={bookmarkPending}
            >
              <Bookmark
                className={cn(
                  "h-7 w-7 transition-transform",
                  bookmarked ? "fill-current scale-110 text-yellow-400" : ""
                )}
              />
            </ActionButton>

            <ActionButton ariaLabel={t("reportPost", "Denunciar publicação")} onClick={() => setReportOpen(true)}>
              <Flag className="h-6 w-6 text-white/75" />
            </ActionButton>

            {post.whatsapp_url && (
              <a
                href={post.whatsapp_url}
                target="_blank"
                rel="noreferrer"
                onClick={handleWhatsappClick}
                aria-label="WhatsApp"
                className="flex flex-col items-center gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/90 transition active:scale-90">
                  <MessageCircle className="h-6 w-6 text-white" />
                </span>
                <span className="text-[10px] font-medium text-white/85">{t("chat", "Chat")}</span>
              </a>
            )}
          </div>

          {/* Bloco inferior — perfil + caption (dentro do vídeo) */}
          {/* pr-16 reserva espaço pra coluna de ações em overlay; só encolhe
              quando ela sai do vídeo (paisagem/desktop). */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pr-16 md:landscape:pr-4">
          <div className="flex items-center gap-2.5">
            <Link
              href={post.public_profile_url || "#"}
              onClick={handleProfileClick}
              className="flex items-center gap-2.5"
            >
              <Avatar className="h-10 w-10 ring-2 ring-white/60">
                {post.avatar_url ? (
                  <AvatarImage src={post.avatar_url} alt={post.profile_name || ""} />
                ) : null}
                <AvatarFallback className="bg-white/15 text-xs text-white">
                  {initials(post.profile_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white drop-shadow-md">
                  @{post.username || t("profileWord", "perfil")}
                </p>
                {(post.profession?.name || post.city) && (
                  <p className="truncate text-[11px] text-white/75">
                    {post.profession?.name}
                    {post.profession?.name && post.city ? " · " : ""}
                    {post.city}
                    {post.city && post.state ? `/${post.state}` : ""}
                  </p>
                )}
              </div>
            </Link>
          </div>

          {(post.title || post.caption) && (
            <div className="mt-3 text-white">
              {post.title && (
                <p className="text-[14px] font-semibold leading-snug drop-shadow-md">
                  {post.title}
                </p>
              )}
              {post.caption && (
                <p
                  className={cn(
                    "mt-1 text-[13px] leading-snug text-white/90 drop-shadow",
                    !expandCaption && "line-clamp-2"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandCaption((v) => !v)
                  }}
                >
                  {post.caption}
                </p>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Hint scroll só no primeiro card e quando ativo */}
      {isActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-1/2 top-3 z-10 translate-x-1/2 animate-bounce text-white/40"
        >
          <ChevronUp className="h-5 w-5 rotate-180" />
        </div>
      )}

      <ReportPostDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSubmit={submitReport}
      />
    </section>
  )
}

function ActionButton({
  ariaLabel,
  onClick,
  disabled,
  children,
}: {
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition active:scale-90 disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function CounterLabel({ value }: { value: number }) {
  if (!value || value <= 0) return null
  const display =
    value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toString()
  return <span className="text-[11px] font-medium text-white/85">{display}</span>
}
