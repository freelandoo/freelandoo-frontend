"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X, Pause, Play, Music, Heart, MessageSquare, Send, Check, MapPin, Link as LinkIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getToken } from "@/lib/auth"
import { getFeedSessionId } from "@/lib/feed-events"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"
import type { StoryBarEntry } from "./story-bar"
import type { BeeLink, FeedAudio } from "@/lib/types/portfolio-feed"
import { TrackAudio } from "@/components/media/track-audio"
import { CommentsPanel } from "@/components/comments/comments-panel"

export interface StoryItem {
  id_story: string
  id_profile: string
  id_user: string
  // 'bee' (v2); 'trampo'/'rest' são legado que expira em 24h pós-deploy.
  kind: string
  media_type?: "video" | "image"
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number
  width: number | null
  height: number | null
  caption: string | null
  location?: string | null
  links?: BeeLink[]
  likes_count?: number
  comments_count?: number
  created_at: string
  expires_at: string
  audio?: FeedAudio | null
  profile?: {
    id_profile: string
    display_name: string
    avatar_url: string | null
    is_clan: boolean
    machine_name: string | null
    machine_slug: string | null
  }
}

interface StoryPlayerProps {
  entries: StoryBarEntry[]
  initialIndex: number
  onClose: () => void
  /** Chamado quando uma story do perfil é vista, para atualizar borda da StoryBar */
  onProfileViewed?: (id_profile: string) => void
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) {
    const m = Math.max(1, Math.floor(diff / 60_000))
    return `${m}min`
  }
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function StoryPlayer({ entries, initialIndex, onClose, onProfileViewed }: StoryPlayerProps) {
  const t = useTranslations("Stories")
  const [profileIndex, setProfileIndex] = useState(initialIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [stories, setStories] = useState<StoryItem[]>([])
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null)
  // Engajamento do bee no player (like otimista por story + comentários).
  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const activeEntry = entries[profileIndex]
  const activeStory = stories[storyIndex]
  const machineAccent = activeEntry?.machine?.color_accent || "#fbbf24"

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const reportedRef = useRef<Set<string>>(new Set())

  // Carrega stories do perfil ativo quando muda
  useEffect(() => {
    let cancelled = false
    if (!activeEntry) return
    setStories([])
    setStoryIndex(0)
    setLoading(true)

    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetch(`/api/stories/by-profile/${encodeURIComponent(activeEntry.id_profile)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.ok ? r.json() : { items: [], viewed_ids: [] })
      .then((data) => {
        if (cancelled) return
        const items: StoryItem[] = Array.isArray(data?.items) ? data.items : []
        setStories(items)
        setViewedIds(new Set(Array.isArray(data?.viewed_ids) ? data.viewed_ids : []))
        // Estado inicial de like/comentários por bee (liked_ids veio do back).
        const likedSet = new Set(Array.isArray(data?.liked_ids) ? data.liked_ids : [])
        const likes: Record<string, { liked: boolean; count: number }> = {}
        const comments: Record<string, number> = {}
        for (const s of items) {
          likes[s.id_story] = { liked: likedSet.has(s.id_story), count: s.likes_count ?? 0 }
          comments[s.id_story] = s.comments_count ?? 0
        }
        setLikeState(likes)
        setCommentCounts(comments)
        // Começa na primeira não-vista, se houver
        const viewedSet = new Set(Array.isArray(data?.viewed_ids) ? data.viewed_ids : [])
        const firstUnviewed = items.findIndex((s) => !viewedSet.has(s.id_story))
        setStoryIndex(firstUnviewed >= 0 ? firstUnviewed : 0)
      })
      .catch(() => { if (!cancelled) setStories([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [activeEntry])

  const markStoryViewed = useCallback(async (id_story: string) => {
    if (reportedRef.current.has(id_story)) return
    reportedRef.current.add(id_story)
    const token = getToken()
    if (!token) return
    try {
      await fetch(`/api/stories/${encodeURIComponent(id_story)}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      setViewedIds((prev) => {
        const next = new Set(prev)
        next.add(id_story)
        return next
      })
      if (activeEntry) onProfileViewed?.(activeEntry.id_profile)
    } catch { /* silent */ }
  }, [activeEntry, onProfileViewed])

  const goNextStory = useCallback(() => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1)
    } else if (profileIndex < entries.length - 1) {
      setProfileIndex((i) => i + 1)
    } else {
      onClose()
    }
  }, [storyIndex, stories.length, profileIndex, entries.length, onClose])

  const goPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
    } else if (profileIndex > 0) {
      setProfileIndex((i) => i - 1)
    }
  }, [storyIndex, profileIndex])

  // Mark viewed when story plays past ~1s
  useEffect(() => {
    if (!activeStory) return
    const t = setTimeout(() => markStoryViewed(activeStory.id_story), 800)
    return () => clearTimeout(t)
  }, [activeStory, markStoryViewed])

  // Auto-advance when video ends
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onEnded = () => goNextStory()
    video.addEventListener("ended", onEnded)
    return () => video.removeEventListener("ended", onEnded)
  }, [goNextStory, activeStory])

  // Reset pause when story changes
  useEffect(() => {
    setPaused(false)
  }, [activeStory])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") goNextStory()
      else if (e.key === "ArrowLeft") goPrevStory()
      else if (e.key === " ") {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, goNextStory, goPrevStory])

  // Pause/play video based on state
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) v.pause()
    else v.play().catch(() => {})
  }, [paused, activeStory])

  // Swipe handling (touch)
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    const adx = Math.abs(dx)
    const ady = Math.abs(dy)
    if (ady > 80 && ady > adx) {
      onClose()
    } else if (adx > 60 && adx > ady) {
      if (dx < 0) {
        // swipe esquerda → próximo perfil
        if (profileIndex < entries.length - 1) setProfileIndex((i) => i + 1)
      } else {
        if (profileIndex > 0) setProfileIndex((i) => i - 1)
      }
    }
    touchStart.current = null
  }

  const progressKey = useMemo(() => `${profileIndex}|${storyIndex}|${activeStory?.id_story || ""}`, [profileIndex, storyIndex, activeStory?.id_story])

  const sendReaction = async (emoji: string) => {
    if (!activeStory || reactingEmoji) return
    const token = getToken()
    if (!token) return
    setReactingEmoji(emoji)
    try {
      await fetch(`/api/stories/${encodeURIComponent(activeStory.id_story)}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      })
    } catch {
      // Reactions should never interrupt story playback.
    } finally {
      setTimeout(() => setReactingEmoji(null), 450)
    }
  }

  // Curtida do bee — otimista, endpoint /bees/:id/like (mesmo poder da timeline).
  const toggleLike = async () => {
    if (!activeStory) return
    const token = getToken()
    if (!token) return
    const id = activeStory.id_story
    const prev = likeState[id] || { liked: false, count: activeStory.likes_count ?? 0 }
    const optimistic = { liked: !prev.liked, count: Math.max(0, prev.count + (prev.liked ? -1 : 1)) }
    setLikeState((s) => ({ ...s, [id]: optimistic }))
    try {
      const res = await fetch(`/api/bees/${encodeURIComponent(id)}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLikeState((s) => ({
        ...s,
        [id]: {
          liked: !!data.liked,
          count: typeof data.likes_count === "number" ? data.likes_count : optimistic.count,
        },
      }))
    } catch {
      setLikeState((s) => ({ ...s, [id]: prev }))
    }
  }

  // Compartilhar — copia o deep-link da timeline e registra o evento share.
  const shareStory = async () => {
    if (!activeStory) return
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/bees?bee=${activeStory.id_story}`
      : ""
    let shared = false
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Freelandoo", url })
        shared = true
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        shared = true
      }
    } catch { /* cancelado */ }
    if (shared) {
      const token = getToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`
      fetch(`/api/bees/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id_story: activeStory.id_story,
          event_type: "share",
          session_id: getFeedSessionId(),
        }),
        keepalive: true,
      }).catch(() => {})
    }
  }

  const openComments = () => {
    if (!activeStory) return
    setPaused(true)
    setCommentsFor(activeStory.id_story)
  }

  if (!activeEntry) return null

  const activeLike = activeStory
    ? likeState[activeStory.id_story] || { liked: false, count: activeStory.likes_count ?? 0 }
    : { liked: false, count: 0 }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden">
        {loading || !activeStory ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : activeStory.media_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={activeStory.id_story}
            src={activeStory.video_url}
            alt={activeStory.caption || ""}
            className="absolute inset-0 h-full w-full object-cover"
            onClick={() => setPaused((p) => !p)}
          />
        ) : (
          <video
            key={activeStory.id_story}
            ref={videoRef}
            src={activeStory.video_url}
            poster={activeStory.thumbnail_url || undefined}
            autoPlay
            playsInline
            muted={!!activeStory.audio?.audio_url}
            className="absolute inset-0 h-full w-full object-cover"
            onClick={() => setPaused((p) => !p)}
          />
        )}

        {/* Música anexada (metadado) — toca por cima do vídeo mudo. */}
        {activeStory?.audio?.audio_url && (
          <TrackAudio
            key={`audio-${activeStory.id_story}`}
            src={activeStory.audio.audio_url}
            startMs={activeStory.audio.start_ms}
            active={!loading}
            paused={paused}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/35 to-transparent px-3 pt-3 pb-12">
          <div className="flex gap-1">
            {stories.map((s, i) => (
              <div key={s.id_story} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  key={`${progressKey}-${i}`}
                  className={cn(
                    "h-full bg-white",
                    i < storyIndex && "w-full",
                    i === storyIndex && "story-progress-bar",
                    i > storyIndex && "w-0"
                  )}
                  style={
                    i === storyIndex
                      ? { animationDuration: `${activeStory?.duration_seconds || 6}s`, animationPlayState: paused ? "paused" : "running" }
                      : undefined
                  }
                  onAnimationEnd={() => i === storyIndex && goNextStory()}
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-auto mt-3 flex items-center gap-2">
            <Avatar
              className="h-8 w-8 ring-1"
              style={{ ["--tw-ring-color" as never]: `${machineAccent}aa` } as React.CSSProperties}
            >
              {activeEntry.profile.avatar_url && (
                <AvatarImage src={activeEntry.profile.avatar_url} alt={activeEntry.profile.display_name || ""} />
              )}
              <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-white">
                {initials(activeEntry.profile.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{activeEntry.profile.display_name || "Perfil"}</p>
              {activeStory && (
                <p className="text-[11px] text-white/65">{formatRelative(activeStory.created_at)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full bg-black/35 p-1.5 text-white/85 transition hover:bg-black/55"
              aria-label={paused ? t("playButton", "Reproduzir") : t("pauseButton", "Pausar")}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black/35 p-1.5 text-white/85 transition hover:bg-black/55"
              aria-label={t("closeButton", "Fechar")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {(activeStory?.caption || activeStory?.location || (activeStory?.links?.length ?? 0) > 0) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-4 pb-20 pt-12">
            {/* Localização + links estilizados do bee */}
            {(activeStory?.location || (activeStory?.links?.length ?? 0) > 0) && (
              <div className="fl-sharp pointer-events-auto mb-2 flex flex-wrap items-center gap-2">
                {activeStory?.location && (
                  <span className="inline-flex items-center gap-1 border border-white/20 bg-black/50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                    <MapPin className="h-3 w-3" /> {activeStory.location}
                  </span>
                )}
                {(activeStory?.links || []).map((link, i) => (
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
            {activeStory?.caption && (
              <p className="text-balance text-sm leading-relaxed text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                {activeStory.caption}
              </p>
            )}
          </div>
        )}

        {/* Barra de ações do bee — mesmos poderes da timeline /bees */}
        {activeStory && (
          <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={toggleLike}
              aria-label={activeLike.liked ? t("unlike", "Descurtir") : t("like", "Curtir")}
              className="flex flex-col items-center gap-0.5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition active:scale-90"
            >
              <Heart className={cn("h-7 w-7", activeLike.liked && "fill-current text-yellow-400")} />
              {activeLike.count > 0 && (
                <span className="text-[11px] font-medium text-white/85">{activeLike.count}</span>
              )}
            </button>
            <button
              type="button"
              onClick={openComments}
              aria-label={t("comments", "Comentários")}
              className="flex flex-col items-center gap-0.5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition active:scale-90"
            >
              <MessageSquare className="h-7 w-7" />
              {(commentCounts[activeStory.id_story] ?? 0) > 0 && (
                <span className="text-[11px] font-medium text-white/85">
                  {commentCounts[activeStory.id_story]}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={shareStory}
              aria-label={t("share", "Compartilhar")}
              className="flex flex-col items-center gap-0.5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition active:scale-90"
            >
              {copied ? <Check className="h-7 w-7 text-emerald-400" /> : <Send className="h-7 w-7" />}
            </button>
          </div>
        )}

        {activeStory?.audio?.audio_url && (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
            <div className="flex max-w-[80%] items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-white/90 ring-1 ring-white/15 backdrop-blur-md">
              <Music className="h-3.5 w-3.5 shrink-0 animate-pulse text-amber-300" />
              <span className="truncate text-[11px] font-medium">
                {activeStory.audio.title || t("musicLabel", "Música")}
                {activeStory.audio.artist ? ` · ${activeStory.audio.artist}` : ""}
              </span>
            </div>
          </div>
        )}

        {activeStory && (
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 px-4">
            {["🔥", "👏", "😍", "😂", "😮"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                disabled={!!reactingEmoji}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-xl ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/60 active:scale-95 disabled:opacity-70",
                  reactingEmoji === emoji && "scale-110 bg-white/20"
                )}
                aria-label={t("reactWithEmoji", "Reagir com {emoji}").replace("{emoji}", emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={goPrevStory}
          className="absolute inset-y-0 left-0 z-[5] w-1/4"
          aria-label={t("previousStory", "Story anterior")}
        />
        <button
          type="button"
          onClick={goNextStory}
          className="absolute inset-y-0 right-0 z-[5] w-1/4"
          aria-label={t("nextStory", "Próxima story")}
        />

        {profileIndex > 0 && (
          <button
            type="button"
            onClick={() => setProfileIndex((i) => i - 1)}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur transition hover:bg-black/65 hover:text-white md:block"
            aria-label={t("previousProfile", "Perfil anterior")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {profileIndex < entries.length - 1 && (
          <button
            type="button"
            onClick={() => setProfileIndex((i) => i + 1)}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur transition hover:bg-black/65 hover:text-white md:block"
            aria-label={t("nextProfile", "Próximo perfil")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Comentários do bee — pausa o story enquanto o painel está aberto. */}
      <CommentsPanel
        postId={commentsFor}
        open={!!commentsFor}
        onClose={() => {
          setCommentsFor(null)
          setPaused(false)
        }}
        loginNextPath="/feed"
        apiBase="/api/bees"
        onCountChange={(idStory, delta) => {
          setCommentCounts((prev) => ({
            ...prev,
            [idStory]: Math.max(0, (prev[idStory] ?? 0) + delta),
          }))
        }}
      />

      <style jsx global>{`
        .story-progress-bar {
          width: 0%;
          animation-name: storyProgress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes storyProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
