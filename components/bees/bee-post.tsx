"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Heart,
  Send,
  MessageSquare,
  Check,
  ChevronUp,
  Bookmark,
  Flag,
  MapPin,
  Link as LinkIcon,
  Smile,
} from "lucide-react"
import type { BeeItem, BeeLink } from "@/lib/types/portfolio-feed"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getFeedSessionId } from "@/lib/feed-events"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"
import { ReportPostDialog } from "@/components/feed/report-post-dialog"
import { BeesVideo } from "./bees-video"
import { TrackAudio } from "@/components/media/track-audio"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface BeePostProps {
  bee: BeeItem
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  onActivate: () => void
  onLikeChange?: (idStory: string, liked: boolean, likes_count: number | null) => void
  onOpenComments?: (idStory: string) => void
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
const REACTION_EMOJIS = ["🔥", "😍", "👏", "😂", "😮", "💰"]

/**
 * Card da timeline vertical de bees (stories v2) — anatomia do BeesPost com
 * engajamento apontado pros endpoints /bees/* e overlay de localização/links.
 */
export function BeePost({
  bee,
  isActive,
  muted,
  onToggleMute,
  onActivate,
  onLikeChange,
  onOpenComments,
  commentsCount,
}: BeePostProps) {
  const t = useTranslations("Bees")
  const router = useRouter()
  const sectionRef = useRef<HTMLElement | null>(null)
  const viewFired = useRef(false)

  const [liked, setLiked] = useState(bee.viewer_has_liked)
  const [likesCount, setLikesCount] = useState(bee.likes_count)
  const [likePending, setLikePending] = useState(false)
  const [bookmarked, setBookmarked] = useState(!!bee.viewer_has_bookmarked)
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandCaption, setExpandCaption] = useState(false)
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [reactedWith, setReactedWith] = useState<string | null>(null)
  const { coupon: shareCoupon } = useShareCoupon()

  // Visto + impressão: 1ª permanência de 700ms com ≥75% do card visível marca
  // o bee como visto (borda da StoryBar apaga; impressions_count++ no back).
  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") return

    let dwellTimer: ReturnType<typeof setTimeout> | null = null

    const markViewed = async () => {
      const token = getToken()
      if (!token) return
      try {
        await fetch(`/api/stories/${encodeURIComponent(bee.id_story)}/view`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        /* silencioso */
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_THRESHOLD) {
          onActivate()
          if (!viewFired.current) {
            if (dwellTimer) return
            dwellTimer = setTimeout(() => {
              dwellTimer = null
              if (viewFired.current) return
              viewFired.current = true
              void markViewed()
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
  }, [bee.id_story, onActivate])

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
      const res = await fetch(`/api/bees/${encodeURIComponent(bee.id_story)}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const finalLiked = !!data.liked
      const finalCount =
        typeof data.likes_count === "number" ? data.likes_count : optimisticCount
      setLiked(finalLiked)
      setLikesCount(finalCount)
      onLikeChange?.(bee.id_story, finalLiked, finalCount)
    } catch {
      setLiked(wasLiked)
      setLikesCount(bee.likes_count)
    } finally {
      setLikePending(false)
    }
  }

  const handleShare = async () => {
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/bees?bee=${bee.id_story}`
        : ""
    const url = shareCoupon?.code ? buildShareUrlWithCoupon(baseUrl, shareCoupon.code) : baseUrl

    const shareData: ShareData = {
      title: bee.profile_name || "Freelandoo", // marca, não traduz
      text: bee.caption || "",
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
      const token = getToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`
      fetch(`/api/bees/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id_story: bee.id_story,
          event_type: "share",
          session_id: getFeedSessionId(),
        }),
        keepalive: true,
      }).catch(() => {})
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
      const res = await fetch(`/api/bees/${encodeURIComponent(bee.id_story)}/bookmark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
    const res = await fetch(`/api/bees/${encodeURIComponent(bee.id_story)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason_category, reason: reason || null }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `Falha ${res.status}`)
    }
  }

  // Reação emoji → DM privada pro dono do bee (canal do story clássico).
  const handleReact = async (emoji: string) => {
    const token = getToken()
    if (!token) {
      router.push(`/login?next=${encodeURIComponent("/bees")}`)
      return
    }
    setReactionsOpen(false)
    setReactedWith(emoji)
    setTimeout(() => setReactedWith(null), 1600)
    try {
      await fetch(`/api/stories/${encodeURIComponent(bee.id_story)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      })
    } catch {
      /* silencioso */
    }
  }

  const isImage = bee.media_type === "image"
  const hasMusic = !!bee.audio?.audio_url

  return (
    <section
      ref={sectionRef}
      data-post-id={bee.id_story}
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
    >
      {/* Mídia (vídeo ou foto) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-full landscape:max-w-[min(100vw,calc(100dvh*9/16))]">
          {isImage ? (
            // Story de foto (WebP queimado no cliente) — full-bleed como o vídeo.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bee.video_url}
              alt={bee.caption || ""}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <BeesVideo
              url={bee.video_url}
              poster={bee.thumbnail_url}
              isActive={isActive}
              muted={muted || hasMusic}
              onToggleMute={onToggleMute}
            />
          )}

          {/* Música anexada (metadado) — segue o mute do bee. */}
          {hasMusic && (
            <TrackAudio
              src={bee.audio!.audio_url}
              startMs={bee.audio!.start_ms}
              active={isActive}
              paused={!isActive}
              muted={muted}
            />
          )}

          {/* Gradientes (relativos à mídia) */}
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
              "bottom-24 right-3",
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
              onClick={() => onOpenComments?.(bee.id_story)}
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
              <CounterLabel value={bee.shares_count} />
            </ActionButton>

            {/* Reação emoji → vira DM privada pro autor */}
            <div className="relative">
              {reactionsOpen && (
                <div className="fl-sharp absolute bottom-0 right-full mr-2 flex items-center gap-1 border border-white/20 bg-black/80 px-2 py-1.5 backdrop-blur">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleReact(emoji)
                      }}
                      aria-label={t("reactWith", "Reagir com {emoji}").replace("{emoji}", emoji)}
                      className="text-xl transition active:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <ActionButton
                ariaLabel={t("reactAria", "Reagir com emoji")}
                onClick={() => setReactionsOpen((v) => !v)}
              >
                {reactedWith ? (
                  <span className="text-2xl">{reactedWith}</span>
                ) : (
                  <Smile className="h-7 w-7" />
                )}
              </ActionButton>
            </div>

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
          </div>

          {/* Bloco inferior — perfil + localização/links + caption */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pr-16 md:landscape:pr-4">
            <div className="flex items-center gap-2.5">
              <Link
                href={bee.public_profile_url || "#"}
                className="flex items-center gap-2.5"
              >
                <Avatar className="h-10 w-10 ring-2 ring-white/60">
                  {bee.avatar_url ? (
                    <AvatarImage src={bee.avatar_url} alt={bee.profile_name || ""} />
                  ) : null}
                  <AvatarFallback className="bg-white/15 text-xs text-white">
                    {initials(bee.profile_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white drop-shadow-md">
                    @{bee.username || t("profileWord", "perfil")}
                  </p>
                  {(bee.machine?.name || bee.city) && (
                    <p className="truncate text-[11px] text-white/75">
                      {bee.machine?.name}
                      {bee.machine?.name && bee.city ? " · " : ""}
                      {bee.city}
                      {bee.city && bee.state ? `/${bee.state}` : ""}
                    </p>
                  )}
                </div>
              </Link>
            </div>

            {/* Localização + links estilizados do bee */}
            {(bee.location || bee.links.length > 0) && (
              <div className="fl-sharp mt-2 flex flex-wrap items-center gap-2">
                {bee.location && (
                  <span className="inline-flex items-center gap-1 border border-white/20 bg-black/50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                    <MapPin className="h-3 w-3" /> {bee.location}
                  </span>
                )}
                {bee.links.map((link: BeeLink, i: number) => (
                  <a
                    key={`${link.url}-${i}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={t("linkOpenAria", "Abrir link")}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
                      link.style === "gold" && "bg-[#F2B705] text-[#0B0B0D]",
                      link.style === "paper" && "bg-[#F1EDE2] text-[#0B0B0D]",
                      link.style === "ink" && "border border-white/40 bg-black/60 text-white",
                    )}
                  >
                    <LinkIcon className="h-3 w-3" /> {link.label}
                  </a>
                ))}
              </div>
            )}

            {bee.caption && (
              <div className="mt-3 text-white">
                <p
                  className={cn(
                    "text-[13px] leading-snug text-white/90 drop-shadow",
                    !expandCaption && "line-clamp-2"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandCaption((v) => !v)
                  }}
                >
                  {bee.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hint scroll quando ativo */}
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
