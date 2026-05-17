"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Heart, Send, MessageCircle, MessageSquare, Check, ChevronUp } from "lucide-react"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { sendFeedEvent } from "@/lib/feed-events"
import { queueImpression } from "@/lib/feed-impressions"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"
import { BeesVideo } from "./bees-video"

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
      /* cancelado */
    }

    if (shared) {
      sendFeedEvent({ post_id: post.post_id, event_type: "share", filters })
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

  return (
    <section
      ref={sectionRef}
      data-post-id={post.post_id}
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {/* Vídeo ou fallback */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative h-full w-full max-w-[min(100vw,calc(100dvh*9/16))]"
        >
          {hasVideo ? (
            <BeesVideo
              url={video.url}
              poster={video.thumbnail_url}
              isActive={isActive}
              muted={muted}
              onToggleMute={onToggleMute}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-white/40">
              Sem vídeo disponível
            </div>
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
              // mobile: overlay no canto inferior direito do vídeo
              "bottom-24 right-3",
              // desktop: fora do vídeo, grudado na borda direita
              "md:bottom-12 md:right-auto md:left-full md:ml-3"
            )}
          >
            <ActionButton
              ariaLabel={liked ? "Descurtir" : "Curtir"}
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
              ariaLabel="Comentários"
              onClick={() => onOpenComments?.(post.post_id)}
            >
              <MessageSquare className="h-7 w-7" />
              <CounterLabel value={commentsCount ?? 0} />
            </ActionButton>

            <ActionButton ariaLabel="Compartilhar" onClick={handleShare}>
              {copied ? (
                <Check className="h-7 w-7 text-emerald-400" />
              ) : (
                <Send className="h-7 w-7" />
              )}
              <CounterLabel value={post.shares_count} />
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
                <span className="text-[10px] font-medium text-white/85">Chat</span>
              </a>
            )}
          </div>

          {/* Bloco inferior — perfil + caption (dentro do vídeo) */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pr-16 md:pr-4">
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
                  @{post.username || "perfil"}
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
