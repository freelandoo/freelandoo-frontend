"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Heart, Share2, ExternalLink, MessageCircle, MessageSquare, Link2, Check } from "lucide-react"
import type { FeedFilters, FeedPost, FeedSocialLink } from "@/lib/types/portfolio-feed"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { PostMedia } from "./post-media"
import { SocialLinksSheet } from "./social-links-sheet"
import { useImpressionObserver } from "./use-impression-observer"
import { sendFeedEvent } from "@/lib/feed-events"
import { getToken } from "@/lib/auth"
import { MachineTop10Crown } from "@/components/profile/machine-top10-crown"
import { cn } from "@/lib/utils"

interface PortfolioPostCardProps {
  post: FeedPost
  filters: FeedFilters
  onLikeChange?: (postId: string, liked: boolean, likes_count: number | null) => void
  onOpenComments?: (postId: string) => void
  commentsCount?: number
  /** Um post por ecrã: mídia cresce e o cartão preenche a altura do snap */
  paged?: boolean
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

export function PortfolioPostCard({ post, filters, onLikeChange, onOpenComments, commentsCount, paged }: PortfolioPostCardProps) {
  const router = useRouter()
  const impressionRef = useImpressionObserver(post.post_id, filters)
  const machineColor = post.machine?.color_accent || "#fbbf24"
  const machineGlow = post.machine?.color_glow || null

  const [liked, setLiked] = useState(post.viewer_has_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [likePending, setLikePending] = useState(false)
  const [copied, setCopied] = useState(false)
  const primaryUrl = post.project_url || post.public_profile_url
  const primaryLabel =
    post.source_type === "course"
      ? "Ver curso"
      : post.project_url
        ? "Abrir link"
        : "Ver perfil"

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
    const url =
      (primaryUrl
        ? new URL(
            primaryUrl,
            typeof window !== "undefined" ? window.location.origin : "https://freelandoo.com"
          ).toString()
        : null) || (typeof window !== "undefined" ? window.location.href : "")

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

  return (
    <article
      ref={impressionRef}
      className={cn(
        "group/post box-border max-w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur transition-all duration-300 hover:border-white/15",
        paged && "flex h-full min-h-0 min-w-0 flex-col"
      )}
      data-post-id={post.post_id}
      style={machineGlow ? { boxShadow: `0 1px 0 0 ${machineGlow}, 0 12px 40px -28px ${machineGlow}` } : undefined}
    >
      {/* Header */}
      <div className={cn("flex w-full min-w-0 shrink-0 items-center gap-3 px-4 py-3", paged && "py-2")}>
        <Link
          href={post.public_profile_url || "#"}
          onClick={handleProfileClick}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
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
                {post.profile_name || post.username || "Perfil"}
              </span>
              <MachineTop10Crown
                profileId={post.profile_id}
                accentColor={machineColor}
                iconClassName="h-4 w-4"
              />
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
            <p className="truncate text-xs text-white/50">
              {post.profession?.name && <span>{post.profession.name}</span>}
              {post.profession?.name && (post.city || post.state) && <span> · </span>}
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
            {post.machine.name.replace(/^Máquina de\s+/i, "")}
          </span>
        )}
      </div>

      {paged ? (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col">
            <PostMedia
              media={post.media}
              glow={machineGlow}
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
                        {post.social_links.length} rede{post.social_links.length !== 1 ? "s" : ""}
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
                aria-label={liked ? "Descurtir" : "Curtir"}
                onClick={handleLike}
                disabled={likePending}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95 disabled:opacity-60"
                style={liked ? { color: machineColor, boxShadow: `0 0 0 1px ${machineColor}55` } : undefined}
              >
                <Heart
                  className={cn(
                    "h-7 w-7 transition-transform duration-200",
                    liked ? "fill-current scale-110" : ""
                  )}
                />
              </button>
              <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {likesCount.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label="Comentários"
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
                aria-label="Compartilhar"
                onClick={handleShare}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95"
              >
                {copied ? (
                  <Check className="h-6 w-6 text-emerald-400" />
                ) : (
                  <Share2 className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <PostMedia media={post.media} glow={machineGlow} />

          <div className="flex shrink-0 items-center gap-1 px-3 pt-3">
            <button
              type="button"
              aria-label={liked ? "Descurtir" : "Curtir"}
              onClick={handleLike}
              disabled={likePending}
              className="rounded-full p-2 text-white/70 transition-all duration-200 hover:bg-white/5 hover:text-white active:scale-90 disabled:opacity-60"
              style={liked ? { color: machineColor } : undefined}
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  liked ? "fill-current scale-110" : ""
                )}
              />
            </button>
            <button
              type="button"
              aria-label="Comentários"
              onClick={() => onOpenComments?.(post.post_id)}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/5 hover:text-white active:scale-90"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Compartilhar"
              onClick={handleShare}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/5 hover:text-white active:scale-90"
            >
              {copied ? (
                <Check className="h-5 w-5 text-emerald-400 animate-in zoom-in-50 duration-200" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
            </button>
            {primaryUrl && (
              <Link
                href={primaryUrl}
                onClick={handleProfileClick}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:text-white active:scale-95"
                style={{
                  border: `1px solid ${machineColor}40`,
                  background: `${machineColor}10`,
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {primaryLabel}
              </Link>
            )}
          </div>

          {(post.whatsapp_url || (post.social_links && post.social_links.length > 0)) && (
            <div className="flex shrink-0 items-center gap-2 px-3 pt-2">
              {post.whatsapp_url && (
                <a
                  href={post.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsappClick}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {post.social_links.length} rede{post.social_links.length !== 1 ? "s" : ""}
                    </button>
                  }
                />
              )}
            </div>
          )}

          {(post.title || post.caption) && (
            <div className="shrink-0 px-4 pb-1 pt-3">
              {post.title && (
                <h3 className="text-[15px] font-semibold leading-tight text-white">{post.title}</h3>
              )}
              {post.caption && (
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-white/65">
                  {post.caption}
                </p>
              )}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5 px-4 pb-4 pt-3 text-[11px] font-medium text-white/40">
            <span>
              {likesCount.toLocaleString("pt-BR")} curtida{likesCount !== 1 ? "s" : ""}
            </span>
            {!!(commentsCount && commentsCount > 0) && (
              <>
                <span aria-hidden>·</span>
                <span>{commentsCount.toLocaleString("pt-BR")} coment.</span>
              </>
            )}
            {post.shares_count > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{post.shares_count.toLocaleString("pt-BR")} compart.</span>
              </>
            )}
          </div>
        </>
      )}
    </article>
  )
}
