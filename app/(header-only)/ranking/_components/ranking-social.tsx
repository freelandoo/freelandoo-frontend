"use client"

/**
 * Social do /ranking — likes e comentários sobre os perfis listados, no molde
 * do Ranking da Audiência da Casa Views. Leitura pública (summary em lote +
 * comentários paginados); curtir/comentar exige login e sai sempre pela conta
 * user (nunca subperfil). Backend: /ranking/social/* (mig 147).
 */
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import Link from "next/link"
import { Heart, Loader2, MessageSquare, Send, Trash2, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getStoredUser, getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

export interface RankingSocialSummary {
  id_profile: string
  likes_count: number
  comments_count: number
  viewer_has_liked: boolean
}

export interface RankingSocialComment {
  id_ranking_comment: string
  id_profile: string
  id_user: string
  content: string
  created_at: string
  updated_at: string
  likes_count: number
  viewer_has_liked: boolean
  user: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

export interface RankingSocialTarget {
  id_profile: string
  display_name: string
  avatar_url: string | null
  username: string | null
  href: string
  rank: number
  points: number
  is_clan?: boolean
}

interface InteractionResponse {
  target: RankingSocialSummary
  comments: RankingSocialComment[]
  has_more: boolean
  next_cursor: string | null
}

function authHeaders(contentType = false): HeadersInit {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (contentType) headers["Content-Type"] = "application/json"
  return headers
}

function redirectToLogin() {
  window.location.href = `/login?next=${encodeURIComponent("/ranking")}`
}

function shortCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
  return String(Math.max(0, n))
}

export function emptySummary(id: string): RankingSocialSummary {
  return { id_profile: id, likes_count: 0, comments_count: 0, viewer_has_liked: false }
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: summary em lote + toggle de like otimista
// ─────────────────────────────────────────────────────────────────────────────
export function useRankingSocial(profileIds: string[]) {
  const [summaryById, setSummaryById] = useState<Record<string, RankingSocialSummary>>({})
  const idsKey = profileIds.join(",")

  const mergeSummary = useCallback((summary: RankingSocialSummary) => {
    setSummaryById((prev) => ({ ...prev, [summary.id_profile]: summary }))
  }, [])

  useEffect(() => {
    if (!idsKey) return
    let cancelled = false
    const sp = new URLSearchParams({ ids: idsKey })
    fetch(`/api/ranking/social/summary?${sp.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: RankingSocialSummary[] } | null) => {
        if (cancelled || !data?.items) return
        const items = data.items
        setSummaryById((prev) => {
          const next = { ...prev }
          for (const item of items) next[item.id_profile] = item
          return next
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [idsKey])

  const toggleLike = useCallback(
    async (id_profile: string) => {
      if (!getToken()) {
        redirectToLogin()
        return
      }
      let current: RankingSocialSummary = emptySummary(id_profile)
      setSummaryById((prev) => {
        current = prev[id_profile] || emptySummary(id_profile)
        const wasLiked = current.viewer_has_liked
        return {
          ...prev,
          [id_profile]: {
            ...current,
            viewer_has_liked: !wasLiked,
            likes_count: Math.max(0, current.likes_count + (wasLiked ? -1 : 1)),
          },
        }
      })
      try {
        const res = await fetch(`/api/ranking/social/${encodeURIComponent(id_profile)}/like`, {
          method: "POST",
          headers: authHeaders(true),
        })
        const data = (await res.json().catch(() => ({}))) as { liked?: boolean; likes_count?: number }
        if (!res.ok) throw new Error("like failed")
        setSummaryById((prev) => {
          const base = prev[id_profile] || emptySummary(id_profile)
          return {
            ...prev,
            [id_profile]: {
              ...base,
              viewer_has_liked: !!data.liked,
              likes_count: typeof data.likes_count === "number" ? data.likes_count : base.likes_count,
            },
          }
        })
      } catch {
        const rollback = current
        setSummaryById((prev) => ({ ...prev, [id_profile]: rollback }))
      }
    },
    [],
  )

  return { summaryById, mergeSummary, toggleLike }
}

// ─────────────────────────────────────────────────────────────────────────────
// Botões like + comentários (usados no pódio e nas linhas — contexto papel)
// ─────────────────────────────────────────────────────────────────────────────
export function RankingSocialActions({
  summary,
  onLike,
  onComments,
  compact = false,
}: {
  summary: RankingSocialSummary
  onLike: () => void
  onComments: () => void
  compact?: boolean
}) {
  const t = useTranslations("Ranking")
  const stop = (event: MouseEvent, fn: () => void) => {
    event.preventDefault()
    event.stopPropagation()
    fn()
  }
  return (
    <>
      <button
        type="button"
        onClick={(event) => stop(event, onLike)}
        aria-label={summary.viewer_has_liked ? t("socialUnlikeAria", "Remover curtida") : t("socialLikeAria", "Curtir")}
        className={cn(
          "inline-flex items-center gap-1 border px-1.5 py-0.5 font-extrabold tabular-nums transition hover:-translate-y-0.5",
          compact ? "text-[10px]" : "text-[11px]",
          summary.viewer_has_liked
            ? "border-[#0B0B0D] bg-[#0B0B0D] text-[#F2B705]"
            : "border-[#0B0B0D]/25 bg-transparent text-[#0B0B0D] hover:border-[#0B0B0D]",
        )}
      >
        <Heart className={cn("h-3.5 w-3.5", summary.viewer_has_liked && "fill-current")} />
        {shortCount(summary.likes_count)}
      </button>
      <button
        type="button"
        onClick={(event) => stop(event, onComments)}
        aria-label={t("socialCommentsAria", "Ver comentários")}
        className={cn(
          "inline-flex items-center gap-1 border border-[#0B0B0D]/25 bg-transparent px-1.5 py-0.5 font-extrabold tabular-nums text-[#0B0B0D] transition hover:-translate-y-0.5 hover:border-[#0B0B0D]",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {shortCount(summary.comments_count)}
      </button>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel de comentários (bottom sheet mobile / painel lateral desktop)
// ─────────────────────────────────────────────────────────────────────────────
export function RankingSocialPanel({
  target,
  summary,
  onClose,
  onToggleLike,
  mergeSummary,
}: {
  target: RankingSocialTarget
  summary: RankingSocialSummary
  onClose: () => void
  onToggleLike: (id_profile: string) => void
  mergeSummary: (summary: RankingSocialSummary) => void
}) {
  const t = useTranslations("Ranking")
  const [comments, setComments] = useState<RankingSocialComment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const me = getStoredUser()

  const timeAgo = useCallback(
    (iso: string): string => {
      const ts = new Date(iso).getTime()
      if (!Number.isFinite(ts)) return ""
      const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
      if (seconds < 60) return t("timeNow", "agora")
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return t("timeMin", "{n}min").replace("{n}", String(minutes))
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return t("timeHours", "{n}h").replace("{n}", String(hours))
      const days = Math.floor(hours / 24)
      if (days < 7) return t("timeDays", "{n}d").replace("{n}", String(days))
      return t("timeWeeks", "{n}sem").replace("{n}", String(Math.floor(days / 7)))
    },
    [t],
  )

  const loadComments = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      const sp = new URLSearchParams({ limit: "20" })
      if (nextCursor) sp.set("cursor", nextCursor)
      const res = await fetch(
        `/api/ranking/social/${encodeURIComponent(target.id_profile)}/comments?${sp.toString()}`,
        { headers: authHeaders(), cache: "no-store" },
      )
      const data = (await res.json().catch(() => ({}))) as Partial<InteractionResponse> & { error?: string }
      if (!res.ok || !data.target || !Array.isArray(data.comments)) {
        throw new Error(data.error || t("errorLoadComments", "Erro ao carregar comentários"))
      }
      mergeSummary(data.target)
      setComments((prev) => (replace ? data.comments || [] : [...prev, ...(data.comments || [])]))
      setHasMore(!!data.has_more)
      setCursor(data.next_cursor || null)
    },
    [mergeSummary, t, target.id_profile],
  )

  useEffect(() => {
    setComments([])
    setDraft("")
    setError(null)
    setCursor(null)
    setHasMore(false)
    setLoading(true)
    loadComments(null, true)
      .catch((err) => setError(err instanceof Error ? err.message : t("errorLoadComments", "Erro ao carregar comentários")))
      .finally(() => setLoading(false))
  }, [loadComments, t])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const handleLoadMore = async () => {
    if (!cursor || !hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      await loadComments(cursor, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorLoadMore", "Erro ao carregar mais"))
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!getToken()) {
      redirectToLogin()
      return
    }
    const content = draft.trim()
    if (!content) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/ranking/social/${encodeURIComponent(target.id_profile)}/comments`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ content }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        comment?: RankingSocialComment | null
        target?: RankingSocialSummary
        error?: string
      }
      if (!res.ok || !data.comment) {
        setError(data.error || t("errorPublish", "Erro ao publicar comentário"))
        return
      }
      setComments((prev) => [data.comment as RankingSocialComment, ...prev])
      if (data.target) mergeSummary(data.target)
      setDraft("")
    } catch {
      setError(t("errorPublish", "Erro ao publicar comentário"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommentLike = async (commentId: string) => {
    if (!getToken()) {
      redirectToLogin()
      return
    }
    const current = comments.find((comment) => comment.id_ranking_comment === commentId)
    if (!current) return
    const optimistic = {
      ...current,
      viewer_has_liked: !current.viewer_has_liked,
      likes_count: Math.max(0, current.likes_count + (current.viewer_has_liked ? -1 : 1)),
    }
    setComments((prev) => prev.map((comment) => (comment.id_ranking_comment === commentId ? optimistic : comment)))
    try {
      const res = await fetch(`/api/ranking/social/comments/${encodeURIComponent(commentId)}/like`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = (await res.json().catch(() => ({}))) as { liked?: boolean; likes_count?: number }
      if (!res.ok) throw new Error("comment like failed")
      setComments((prev) =>
        prev.map((comment) =>
          comment.id_ranking_comment === commentId
            ? {
                ...comment,
                viewer_has_liked: typeof data.liked === "boolean" ? data.liked : optimistic.viewer_has_liked,
                likes_count: typeof data.likes_count === "number" ? data.likes_count : optimistic.likes_count,
              }
            : comment,
        ),
      )
    } catch {
      setComments((prev) => prev.map((comment) => (comment.id_ranking_comment === commentId ? current : comment)))
    }
  }

  const handleDeleteComment = async (comment: RankingSocialComment) => {
    if (!window.confirm(t("commentDeleteConfirm", "Remover este comentário?"))) return
    try {
      const res = await fetch(`/api/ranking/social/comments/${encodeURIComponent(comment.id_ranking_comment)}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("delete failed")
      setComments((prev) => prev.filter((item) => item.id_ranking_comment !== comment.id_ranking_comment))
      mergeSummary({ ...summary, comments_count: Math.max(0, summary.comments_count - 1) })
    } catch {
      setError(t("errorDeleteComment", "Erro ao remover comentário"))
    }
  }

  return (
    <div className="fl-root fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label={t("closeAria", "Fechar")}
        className="absolute inset-0 bg-[#0B0B0D]/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={target.display_name}
        className={cn(
          "absolute bottom-0 left-0 right-0 flex max-h-[88dvh] flex-col overflow-hidden border-2 border-[#0B0B0D] bg-[#F1EDE2]",
          "shadow-[0_-10px_0_0_#F2B705]",
          "md:bottom-auto md:left-auto md:top-0 md:h-full md:max-h-none md:w-[460px] md:shadow-[-10px_0_0_0_#F2B705]",
        )}
      >
        <header className="border-b-2 border-[#0B0B0D] bg-[#FBF8F1] p-4">
          <div className="flex items-start gap-3">
            <Link
              href={target.href}
              className="shrink-0 rotate-[-2deg] border-2 border-[#0B0B0D]"
              style={{ outline: "2px solid #F2B705", outlineOffset: "1px" }}
            >
              <Avatar className="h-16 w-16 rounded-none">
                {target.avatar_url && <AvatarImage src={target.avatar_url} alt={target.display_name} className="object-cover" />}
                <AvatarFallback className="rounded-none bg-[#1D1810] text-2xl font-bold text-[#F2B705]">
                  {getInitials(target.display_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#F2B705] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]">
                  {t("panelRankBadge", "#{n} no ranking").replace("{n}", String(target.rank))}
                </span>
                <span className="bg-[#0B0B0D] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#F1EDE2]">
                  {shortCount(target.points)} {t("pontos", "pontos")}
                </span>
              </div>
              <Link href={target.href} className="block">
                <h3 className="mt-2 truncate fl-display text-3xl leading-none text-[#0B0B0D] hover:text-[#9a7400]">
                  {target.display_name}
                </h3>
              </Link>
              {target.username && (
                <p className="truncate text-xs font-bold text-[#6B6457]/70">@{target.username}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("closeAria", "Fechar")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#0B0B0D] bg-[#FBF8F1] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleLike(target.id_profile)}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 text-xs font-extrabold uppercase tracking-[0.12em] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5",
                summary.viewer_has_liked ? "bg-[#0B0B0D] text-[#F2B705]" : "bg-[#FBF8F1] text-[#0B0B0D]",
              )}
            >
              <Heart className={cn("h-4 w-4", summary.viewer_has_liked && "fill-current")} strokeWidth={3} />
              {shortCount(summary.likes_count)}
            </button>

            <Link
              href={target.href}
              className="inline-flex h-11 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
            >
              {t("panelViewProfile", "Ver perfil")}
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2 bg-[#F2B705] px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={3} />
            {t("panelNote", "curtidas e comentários saem pela sua conta, não por subperfil")}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10 text-[#6B6457]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error && comments.length === 0 ? (
            <div className="border-2 border-[#0B0B0D] bg-[#FBF8F1] p-4 text-center text-sm font-bold text-red-700">
              {error}
            </div>
          ) : comments.length === 0 ? (
            <div className="border-2 border-dashed border-[#0B0B0D] bg-[#FBF8F1]/70 p-5 text-center text-sm font-extrabold uppercase tracking-[0.12em] text-[#6B6457]/70">
              {t("commentsEmpty", "Seja a primeira pessoa a comentar")}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => {
                const displayName = comment.user.display_name || comment.user.username || t("accountUser", "conta de usuário")
                const canDelete = me?.id_user === comment.id_user
                return (
                  <li key={comment.id_ranking_comment} className="border-2 border-[#0B0B0D] bg-[#FBF8F1] p-3 shadow-[3px_3px_0_0_#0B0B0D]">
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10 shrink-0 rounded-none border-2 border-[#0B0B0D]">
                        {comment.user.avatar_url && (
                          <AvatarImage src={comment.user.avatar_url} alt={displayName} className="object-cover" />
                        )}
                        <AvatarFallback className="rounded-none bg-[#1D1810] text-base font-bold text-[#F2B705]">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold uppercase tracking-[0.08em] text-[#0B0B0D]">{displayName}</p>
                            <p className="text-[10px] font-bold text-[#6B6457]/60">
                              {comment.user.username ? `@${comment.user.username}` : t("accountUser", "conta de usuário")} · {timeAgo(comment.created_at)}
                            </p>
                          </div>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment)}
                              aria-label={t("commentDeleteAria", "Remover comentário")}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[#0B0B0D] bg-[#FBF8F1] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-[#0B0B0D]">
                          {comment.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCommentLike(comment.id_ranking_comment)}
                          className={cn(
                            "mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em]",
                            comment.viewer_has_liked ? "text-[#9a7400]" : "text-[#6B6457]/60",
                          )}
                        >
                          <Heart className={cn("h-3.5 w-3.5", comment.viewer_has_liked && "fill-current")} strokeWidth={3} />
                          {shortCount(comment.likes_count)}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#FBF8F1] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] disabled:opacity-55"
            >
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("commentsLoadMore", "Carregar mais")}
            </button>
          )}

          {error && comments.length > 0 && (
            <p className="mt-3 text-xs font-bold text-red-700">{error}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t-2 border-[#0B0B0D] bg-[#FBF8F1] p-3">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
              placeholder={t("commentPlaceholder", "Escreva seu comentário...")}
              rows={2}
              className="min-h-12 flex-1 resize-none border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-sm font-semibold text-[#0B0B0D] outline-none placeholder:text-[#6B6457]/50 focus:ring-4 focus:ring-[#F2B705]/30"
            />
            <button
              type="submit"
              disabled={submitting || draft.trim().length === 0}
              aria-label={t("commentSendAria", "Enviar comentário")}
              className="inline-flex h-auto w-12 shrink-0 items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" strokeWidth={3} />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B6457]/60">
            <span>{me?.nome || me?.email || t("accountUser", "conta de usuário")}</span>
            <span>{draft.length}/1000</span>
          </div>
        </form>
      </aside>
    </div>
  )
}
