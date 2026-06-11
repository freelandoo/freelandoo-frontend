"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { ExternalLink, Heart, Instagram, Loader2, MessageSquare, Send, Trash2, X } from "lucide-react"
import { getStoredUser, getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { AudienceEntry } from "@/lib/acasaviews/ranking-data"
import { PodiumTop3, type PodiumItem } from "@/features/acasaviews/components/acasaviews/ranking/podium-top3"
import { RankingList } from "@/features/acasaviews/components/acasaviews/ranking/ranking-list"
import { RankingCard } from "@/features/acasaviews/components/acasaviews/ranking/ranking-card"
import { CasaAvatar } from "@/features/acasaviews/components/acasaviews/ranking/casa-avatar"

interface AudienceSummary {
  external_user_id: string
  likes_count: number
  comments_count: number
  viewer_has_liked: boolean
}

interface AudienceComment {
  id_casa_audience_comment: string
  external_user_id: string
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

interface InteractionResponse {
  target: AudienceSummary
  comments: AudienceComment[]
  has_more: boolean
  next_cursor: string | null
}

interface AudienceRankingInteractiveProps {
  audience: AudienceEntry[]
}

function authHeaders(contentType = false): HeadersInit {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (contentType) headers["Content-Type"] = "application/json"
  return headers
}

function loginFromEntry(entry: AudienceEntry | null): string {
  return (entry?.handle || entry?.name || "").replace(/^@/, "").trim()
}

function instagramHref(entry: AudienceEntry | null): string | null {
  const login = loginFromEntry(entry).replace(/[^A-Za-z0-9._]/g, "")
  if (!login) return null
  return `https://www.instagram.com/${login}`
}

function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ""
  const diff = Date.now() - ts
  const seconds = Math.max(0, Math.floor(diff / 1000))
  if (seconds < 60) return "agora"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}sem`
}

function shortCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
  return String(Math.max(0, n))
}

function emptySummary(id: string): AudienceSummary {
  return {
    external_user_id: id,
    likes_count: 0,
    comments_count: 0,
    viewer_has_liked: false,
  }
}

export function AudienceRankingInteractive({ audience }: AudienceRankingInteractiveProps) {
  const [summaryById, setSummaryById] = useState<Record<string, AudienceSummary>>({})
  const [selected, setSelected] = useState<AudienceEntry | null>(null)
  const [comments, setComments] = useState<AudienceComment[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const me = getStoredUser()

  const top3 = useMemo<PodiumItem[]>(
    () =>
      audience.slice(0, 3).map((entry) => {
        const summary = summaryById[entry.id] || emptySummary(entry.id)
        return {
          id: entry.id,
          rank: entry.rank,
          name: entry.name,
          handle: entry.handle,
          avatar: entry.avatar,
          score: entry.points,
          scoreLabel: "pontos",
          tag: entry.tag,
          tagAccent: entry.tagAccent,
          meta: [
            { label: "likes", value: summary.likes_count },
            { label: "comentários", value: summary.comments_count },
          ],
        }
      }),
    [audience, summaryById],
  )

  const rest = useMemo(() => audience.slice(3), [audience])
  const selectedSummary = selected ? summaryById[selected.id] || emptySummary(selected.id) : null
  const selectedInstagram = instagramHref(selected)

  const mergeSummary = useCallback((summary: AudienceSummary) => {
    setSummaryById((prev) => ({
      ...prev,
      [summary.external_user_id]: summary,
    }))
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token || audience.length === 0) return
    const ids = audience.map((entry) => entry.id).filter(Boolean)
    const sp = new URLSearchParams({ ids: ids.join(",") })
    fetch(`/api/casa/audience/summary?${sp.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: AudienceSummary[] } | null) => {
        if (!data?.items) return
        const items = data.items
        setSummaryById((prev) => {
          const next = { ...prev }
          for (const item of items) next[item.external_user_id] = item
          return next
        })
      })
      .catch(() => {})
  }, [audience])

  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [selected])

  const loadInteraction = useCallback(
    async (entry: AudienceEntry, nextCursor: string | null, replace: boolean) => {
      const token = getToken()
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent("/acasaviews/ranking-audiencia")}`
        return
      }
      const sp = new URLSearchParams({
        limit: "20",
        user_login: loginFromEntry(entry),
      })
      if (entry.avatar) sp.set("avatar_url", entry.avatar)
      if (nextCursor) sp.set("cursor", nextCursor)

      const res = await fetch(`/api/casa/audience/${encodeURIComponent(entry.id)}/interaction?${sp.toString()}`, {
        headers: authHeaders(),
        cache: "no-store",
      })
      const data = (await res.json().catch(() => ({}))) as Partial<InteractionResponse> & { error?: string }
      if (!res.ok || !data.target || !Array.isArray(data.comments)) {
        throw new Error(data.error || "Erro ao carregar comentários")
      }
      mergeSummary(data.target)
      setComments((prev) => (replace ? data.comments || [] : [...prev, ...(data.comments || [])]))
      setHasMore(!!data.has_more)
      setCursor(data.next_cursor || null)
    },
    [mergeSummary],
  )

  const openEntry = useCallback(
    (entry: AudienceEntry) => {
      setSelected(entry)
      setComments([])
      setDraft("")
      setError(null)
      setCursor(null)
      setHasMore(false)
      setLoading(true)
      loadInteraction(entry, null, true)
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
        .finally(() => setLoading(false))
    },
    [loadInteraction],
  )

  const handleLoadMore = async () => {
    if (!selected || !cursor || !hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      await loadInteraction(selected, cursor, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mais")
    } finally {
      setLoadingMore(false)
    }
  }

  const handleTargetLike = async () => {
    if (!selected || !selectedSummary) return
    const token = getToken()
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent("/acasaviews/ranking-audiencia")}`
      return
    }
    const wasLiked = selectedSummary.viewer_has_liked
    const optimistic: AudienceSummary = {
      ...selectedSummary,
      viewer_has_liked: !wasLiked,
      likes_count: Math.max(0, selectedSummary.likes_count + (wasLiked ? -1 : 1)),
    }
    mergeSummary(optimistic)
    try {
      const res = await fetch(`/api/casa/audience/${encodeURIComponent(selected.id)}/like`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ user_login: loginFromEntry(selected), avatar_url: selected.avatar || null }),
      })
      const data = (await res.json().catch(() => ({}))) as { liked?: boolean; likes_count?: number; error?: string }
      if (!res.ok) throw new Error(data.error || "Erro ao curtir")
      mergeSummary({
        ...selectedSummary,
        viewer_has_liked: !!data.liked,
        likes_count: typeof data.likes_count === "number" ? data.likes_count : optimistic.likes_count,
      })
    } catch (err) {
      mergeSummary(selectedSummary)
      setError(err instanceof Error ? err.message : "Erro ao curtir")
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || submitting) return
    const content = draft.trim()
    if (!content) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/casa/audience/${encodeURIComponent(selected.id)}/comments`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          content,
          user_login: loginFromEntry(selected),
          avatar_url: selected.avatar || null,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        comment?: AudienceComment | null
        target?: AudienceSummary
        error?: string
      }
      if (!res.ok || !data.comment) {
        setError(data.error || "Erro ao publicar comentário")
        return
      }
      setComments((prev) => [data.comment as AudienceComment, ...prev])
      if (data.target) mergeSummary(data.target)
      setDraft("")
    } catch {
      setError("Erro ao publicar comentário")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommentLike = async (commentId: string) => {
    const current = comments.find((comment) => comment.id_casa_audience_comment === commentId)
    if (!current) return
    const optimistic = {
      ...current,
      viewer_has_liked: !current.viewer_has_liked,
      likes_count: Math.max(0, current.likes_count + (current.viewer_has_liked ? -1 : 1)),
    }
    setComments((prev) => prev.map((comment) => (comment.id_casa_audience_comment === commentId ? optimistic : comment)))
    try {
      const res = await fetch(`/api/casa/audience/comments/${encodeURIComponent(commentId)}/like`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = (await res.json().catch(() => ({}))) as { liked?: boolean; likes_count?: number }
      if (!res.ok) throw new Error("Erro ao curtir comentário")
      setComments((prev) =>
        prev.map((comment) =>
          comment.id_casa_audience_comment === commentId
            ? {
                ...comment,
                viewer_has_liked: typeof data.liked === "boolean" ? data.liked : optimistic.viewer_has_liked,
                likes_count: typeof data.likes_count === "number" ? data.likes_count : optimistic.likes_count,
              }
            : comment,
        ),
      )
    } catch {
      setComments((prev) => prev.map((comment) => (comment.id_casa_audience_comment === commentId ? current : comment)))
    }
  }

  const handleDeleteComment = async (comment: AudienceComment) => {
    if (!selected) return
    if (!window.confirm("Remover este comentário?")) return
    try {
      const res = await fetch(`/api/casa/audience/comments/${encodeURIComponent(comment.id_casa_audience_comment)}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Erro ao remover")
      setComments((prev) => prev.filter((item) => item.id_casa_audience_comment !== comment.id_casa_audience_comment))
      const current = summaryById[selected.id] || emptySummary(selected.id)
      mergeSummary({
        ...current,
        comments_count: Math.max(0, current.comments_count - 1),
      })
    } catch {
      setError("Erro ao remover comentário")
    }
  }

  return (
    <>
      <PodiumTop3
        items={top3}
        accent="cyan"
        onSelect={(item) => {
          const entry = audience.find((candidate) => candidate.id === item.id)
          if (entry) openEntry(entry)
        }}
        getSelectLabel={(item) => `Abrir ${item.name}`}
      />

      <RankingList title="O resto do júri" subtitle="quem mais movimenta o jogo">
        {rest.map((entry) => {
          const summary = summaryById[entry.id] || emptySummary(entry.id)
          return (
            <RankingCard
              key={entry.id}
              rank={entry.rank}
              name={entry.name}
              handle={entry.handle}
              avatar={entry.avatar}
              score={entry.points}
              scoreLabel="pontos"
              trend={entry.trend}
              trendValue={entry.trendValue}
              tag={entry.tag}
              tagAccent={entry.tagAccent}
              accent="cyan"
              stats={[
                { label: "likes", value: summary.likes_count },
                { label: "comentários", value: summary.comments_count },
              ]}
              onSelect={() => openEntry(entry)}
              selectLabel={`Abrir ${entry.name}`}
            />
          )
        })}
      </RankingList>

      {selected && selectedSummary && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-[var(--ink)]/70 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Interações de ${selected.name}`}
            className={cn(
              "absolute bottom-0 left-0 right-0 flex max-h-[88dvh] flex-col overflow-hidden border-2 border-[var(--ink)] bg-[#f5f1e8]",
              "shadow-[0_-10px_0_0_var(--cyan)]",
              "md:bottom-auto md:left-auto md:top-0 md:h-full md:max-h-none md:w-[460px] md:shadow-[-10px_0_0_0_var(--cyan)]",
            )}
          >
            <header className="border-b-2 border-[var(--ink)] bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rotate-[-2deg] border-2 border-[var(--ink)]" style={{ outline: "2px solid var(--cyan)", outlineOffset: "1px" }}>
                  <CasaAvatar name={selected.name} src={selected.avatar} className="h-16 w-16" textClassName="text-2xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[var(--cyan)] px-2 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]">
                      #{selected.rank} audiência
                    </span>
                    <span className="bg-[var(--ink)] px-2 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.14em] text-white">
                      {shortCount(selected.points)} pts
                    </span>
                  </div>
                  <h3 className="mt-2 truncate casa-display text-3xl leading-none text-[var(--ink)]">{selected.name}</h3>
                  <p className="truncate casa-body text-xs font-bold text-[var(--ink-soft)]/60">{selected.handle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Fechar"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--ink)] bg-white text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition hover:-translate-y-0.5"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTargetLike}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] px-3 casa-body text-xs font-extrabold uppercase tracking-[0.12em] shadow-[3px_3px_0_0_var(--ink)] transition hover:-translate-y-0.5",
                    selectedSummary.viewer_has_liked ? "bg-[var(--magenta)] text-white" : "bg-white text-[var(--ink)]",
                  )}
                >
                  <Heart className={cn("h-4 w-4", selectedSummary.viewer_has_liked && "fill-current")} strokeWidth={3} />
                  {shortCount(selectedSummary.likes_count)}
                </button>

                <a
                  href={selectedInstagram || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-[var(--cyan)] px-3 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition hover:-translate-y-0.5",
                    !selectedInstagram && "pointer-events-none opacity-55",
                  )}
                >
                  <Instagram className="h-4 w-4" strokeWidth={3} />
                  Instagram
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={3} />
                </a>
              </div>

              <div className="mt-3 flex items-center gap-2 bg-[var(--gold)] px-2 py-1.5 casa-body text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={3} />
                comentários pela sua conta user, não por subperfil
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-10 text-[var(--ink-soft)]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : error && comments.length === 0 ? (
                <div className="border-2 border-[var(--ink)] bg-white p-4 text-center casa-body text-sm font-bold text-[var(--magenta)]">
                  {error}
                </div>
              ) : comments.length === 0 ? (
                <div className="border-2 border-dashed border-[var(--ink)] bg-white/70 p-5 text-center casa-body text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/60">
                  seja a primeira pessoa a comentar
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {comments.map((comment) => {
                    const displayName = comment.user.display_name || comment.user.username || "user"
                    const canDelete = me?.id_user === comment.id_user
                    return (
                      <li key={comment.id_casa_audience_comment} className="border-2 border-[var(--ink)] bg-white p-3 shadow-[3px_3px_0_0_var(--ink)]">
                        <div className="flex gap-3">
                          <CasaAvatar
                            name={displayName}
                            src={comment.user.avatar_url}
                            className="h-10 w-10 shrink-0 border-2 border-[var(--ink)]"
                            textClassName="text-base"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate casa-body text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--ink)]">{displayName}</p>
                                <p className="casa-body text-[10px] font-bold text-[var(--ink-soft)]/50">
                                  {comment.user.username ? `@${comment.user.username}` : "conta user"} - {timeAgo(comment.created_at)}
                                </p>
                              </div>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment)}
                                  aria-label="Remover comentário"
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--ink)] bg-white text-[var(--ink)] transition hover:bg-[var(--magenta)] hover:text-white"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap break-words casa-body text-sm font-semibold leading-snug text-[var(--ink)]">
                              {comment.content}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleCommentLike(comment.id_casa_audience_comment)}
                              className={cn(
                                "mt-3 inline-flex items-center gap-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.12em]",
                                comment.viewer_has_liked ? "text-[var(--magenta)]" : "text-[var(--ink-soft)]/55",
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
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 border-2 border-[var(--ink)] bg-white px-3 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-55"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  carregar mais
                </button>
              )}

              {error && comments.length > 0 && (
                <p className="mt-3 casa-body text-xs font-bold text-[var(--magenta)]">{error}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t-2 border-[var(--ink)] bg-white p-3">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                  placeholder="Escreva seu comentário..."
                  rows={2}
                  className="min-h-12 flex-1 resize-none border-2 border-[var(--ink)] bg-[#f5f1e8] px-3 py-2 casa-body text-sm font-semibold text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]/45 focus:ring-4 focus:ring-[var(--cyan)]/30"
                />
                <button
                  type="submit"
                  disabled={submitting || draft.trim().length === 0}
                  aria-label="Enviar comentário"
                  className="inline-flex h-auto w-12 shrink-0 items-center justify-center border-2 border-[var(--ink)] bg-[var(--cyan)] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-55"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" strokeWidth={3} />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between casa-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/50">
                <span>{me?.nome || me?.email || "conta user"}</span>
                <span>{draft.length}/1000</span>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  )
}
