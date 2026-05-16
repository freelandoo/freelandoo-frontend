"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Heart, Share2, MessageCircle, MessageSquare, Link2, Check, Sparkles } from "lucide-react"
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

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (diff < 60) return "agora"
  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} sem`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} m`
  const years = Math.floor(days / 365)
  return `${years} a`
}

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

  // Edge-to-edge Instagram-style quando não é paged (bees vertical).
  return (
    <article
      ref={impressionRef}
      className={cn(
        "group/post box-border w-full max-w-full",
        paged
          ? "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur transition-all duration-300 hover:border-white/15"
          : "bg-black"
      )}
      data-post-id={post.post_id}
      style={paged && machineGlow ? { boxShadow: `0 1px 0 0 ${machineGlow}, 0 12px 40px -28px ${machineGlow}` } : undefined}
    >
      {/* Header */}
      <div className={cn("flex w-full min-w-0 shrink-0 items-center gap-3", paged ? "px-4 py-2" : "px-3 py-2.5")}>
        <Link
          href={post.public_profile_url || "#"}
          onClick={handleProfileClick}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar
            className={cn(
              "shrink-0 ring-1 transition",
              paged ? "h-10 w-10" : "h-8 w-8"
            )}
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
            <p className="truncate text-[11px] text-white/50">
              {!paged && post.published_at && (
                <>
                  <span>{timeAgo(post.published_at)}</span>
                  {(post.city || post.state) && <span> · </span>}
                </>
              )}
              {paged && post.profession?.name && (
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

        {paged && post.machine?.name && (
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
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/55 active:scale-95 disabled:opacity-60",
                  liked && "text-yellow-400 shadow-[0_0_0_1px_rgba(250,204,21,0.35)]"
                )}
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
          <PostMedia
            media={post.media}
            glow={machineGlow}
            aspect={post.feed_kind === "bees" ? "9:16" : "4:5"}
          />

          {/* Ações: like, comentar, compartilhar */}
          <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
            <button
              type="button"
              aria-label={liked ? "Descurtir" : "Curtir"}
              onClick={handleLike}
              disabled={likePending}
              className={cn(
                "rounded-full p-1.5 transition-all duration-200 hover:bg-white/5 active:scale-90 disabled:opacity-60",
                liked ? "text-red-500" : "text-white"
              )}
            >
              <Heart
                className={cn(
                  "h-6 w-6 transition-all duration-300",
                  liked && "fill-current scale-110"
                )}
                strokeWidth={2}
              />
            </button>
            <button
              type="button"
              aria-label="Comentários"
              onClick={() => onOpenComments?.(post.post_id)}
              className="rounded-full p-1.5 text-white/85 transition hover:bg-white/5 hover:text-white active:scale-90"
            >
              <MessageSquare className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Compartilhar"
              onClick={handleShare}
              className="rounded-full p-1.5 text-white/85 transition hover:bg-white/5 hover:text-white active:scale-90"
            >
              {copied ? (
                <Check className="h-6 w-6 text-emerald-400 animate-in zoom-in-50 duration-200" />
              ) : (
                <Share2 className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Contador de curtidas */}
          <div className="px-3 pt-1 text-[13px] font-semibold text-white">
            {likesCount.toLocaleString("pt-BR")} curtida{likesCount !== 1 ? "s" : ""}
          </div>

          {/* Descrição com "mais"/"menos" — máximo 3000 chars no backend */}
          {(post.title || post.caption) && (
            <div className="shrink-0 px-3 pt-1 text-[14px] leading-snug text-white">
              {post.title && (
                <span className="mr-1.5 font-semibold">
                  {post.profile_name || post.username || "Perfil"}
                </span>
              )}
              <PostCaption
                title={post.title}
                caption={post.caption}
                profileLabel={post.profile_name || post.username || "Perfil"}
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

          {/* WhatsApp + links sociais (mantidos do design anterior) */}
          {(post.whatsapp_url || (post.social_links && post.social_links.length > 0)) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 pt-2">
              {post.whatsapp_url && (
                <a
                  href={post.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsappClick}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/25"
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <Link2 className="h-3 w-3" />
                      {post.social_links.length} rede{post.social_links.length !== 1 ? "s" : ""}
                    </button>
                  }
                />
              )}
            </div>
          )}

          {/* Ver comentários */}
          {!!(commentsCount && commentsCount > 0) && (
            <button
              type="button"
              onClick={() => onOpenComments?.(post.post_id)}
              className="px-3 pt-2 text-left text-[13px] text-white/55 transition hover:text-white/80"
            >
              Ver {commentsCount === 1 ? "1 comentário" : `os ${commentsCount.toLocaleString("pt-BR")} comentários`}
            </button>
          )}

          {/* Linha discreta no rodapé (separador antes do próximo post) */}
          <div className="px-3 pb-3 pt-1 text-[10px] uppercase tracking-wider text-white/30">
            {post.feed_kind === "bees" && (
              <span className="inline-flex items-center gap-1 text-amber-300/80">
                <Sparkles className="h-3 w-3" /> Bee
              </span>
            )}
          </div>
        </>
      )}
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
    <span className="whitespace-pre-wrap text-white/85">
      {!title && (
        <span className="mr-1.5 font-semibold text-white">{profileLabel}</span>
      )}
      {visible}
      {needsToggle && !expanded && (
        <>
          {"… "}
          <button
            type="button"
            onClick={() => {
              setExpanded(true)
              onExpand?.()
            }}
            className="text-white/55 transition hover:text-white"
          >
            mais
          </button>
        </>
      )}
      {needsToggle && expanded && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-white/55 transition hover:text-white"
          >
            menos
          </button>
        </>
      )}
    </span>
  )
}
