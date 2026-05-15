"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Loader2, Send, Trash2, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface CommentUser {
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export interface CommentItem {
  id_portfolio_comment: string
  id_portfolio_item: string
  id_user: string
  content: string
  created_at: string
  updated_at: string
  user: CommentUser
}

interface CommentsPanelProps {
  postId: string | null
  open: boolean
  onClose: () => void
  /** Quando o user adiciona/remove, parent pode atualizar contadores. */
  onCountChange?: (postId: string, delta: number) => void
  /** Override pro fallback de "Entre pra comentar" */
  loginNextPath?: string
}

function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ""
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return "agora"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}sem`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}m`
  const y = Math.floor(d / 365)
  return `${y}a`
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

interface MeShape {
  id_user?: string | null
  is_admin?: boolean | null
}

function readMe(): MeShape | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem("user")
    if (!raw) return null
    return JSON.parse(raw) as MeShape
  } catch {
    return null
  }
}

export function CommentsPanel({
  postId,
  open,
  onClose,
  onCountChange,
  loginNextPath,
}: CommentsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const me = readMe()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const fetchComments = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      if (!postId) return
      const sp = new URLSearchParams()
      if (nextCursor) sp.set("cursor", nextCursor)
      sp.set("limit", "20")
      const headers: Record<string, string> = {}
      const token = getToken()
      if (token) headers["Authorization"] = `Bearer ${token}`
      const res = await fetch(`/api/portfolio/items/${postId}/comments?${sp.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        items: CommentItem[]
        has_more: boolean
        next_cursor: string | null
      }
      setComments((prev) => (replace ? data.items : [...prev, ...data.items]))
      setHasMore(!!data.has_more)
      setCursor(data.next_cursor ?? null)
    },
    [postId],
  )

  useEffect(() => {
    if (!open || !postId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setComments([])
    setCursor(null)
    setHasMore(false)
    fetchComments(null, true)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, postId, fetchComments])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !cursor) return
    setLoadingMore(true)
    try {
      await fetchComments(cursor, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar mais")
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postId || submitting) return
    const token = getToken()
    if (!token) {
      const next = encodeURIComponent(loginNextPath || "/feed")
      window.location.href = `/login?next=${next}`
      return
    }
    const content = draft.trim()
    if (content.length < 1) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/portfolio/items/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Erro ao publicar comentário")
        return
      }
      const created = data.comment as CommentItem | null
      if (created) {
        setComments((prev) => [created, ...prev])
        onCountChange?.(postId, 1)
      }
      setDraft("")
    } catch {
      setError("Erro ao publicar comentário")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!postId) return
    const token = getToken()
    if (!token) return
    if (!confirm("Remover esse comentário?")) return
    try {
      const res = await fetch(`/api/portfolio/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Erro ao remover")
        return
      }
      setComments((prev) => prev.filter((c) => c.id_portfolio_comment !== commentId))
      onCountChange?.(postId, -1)
    } catch {
      setError("Erro ao remover")
    }
  }

  if (!mounted) return null

  const node = (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[110] transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      {/* Painel — bottom sheet no mobile, side panel no desktop */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Comentários"
        className={cn(
          "absolute left-0 right-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-white/10",
          "md:right-0 md:top-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[420px] md:rounded-none md:border-t-0 md:border-l",
          "flex flex-col bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out",
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full",
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Comentários</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-white/60">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error && comments.length === 0 ? (
            <div className="py-8 text-center text-sm text-red-300">{error}</div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/55">
              Seja a primeira pessoa a comentar.
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {comments.map((c) => {
                const canDelete =
                  !!me &&
                  (me.id_user === c.id_user || !!me.is_admin)
                const handle = c.user?.username || c.user?.display_name || "perfil"
                return (
                  <li key={c.id_portfolio_comment} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/15">
                      {c.user?.avatar_url ? (
                        <AvatarImage src={c.user.avatar_url} alt={handle} />
                      ) : null}
                      <AvatarFallback className="bg-white/10 text-[10px] text-white/80">
                        {initials(c.user?.display_name || c.user?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        {c.user?.username ? (
                          <Link
                            href={`/account`}
                            className="font-semibold text-white/85 hover:text-white"
                          >
                            @{c.user.username}
                          </Link>
                        ) : (
                          <span className="font-semibold text-white/85">{handle}</span>
                        )}
                        <span aria-hidden>·</span>
                        <span>{timeAgo(c.created_at)}</span>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id_portfolio_comment)}
                            aria-label="Remover comentário"
                            className="ml-auto text-white/35 transition hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
                        {c.content}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {hasMore && !loading && comments.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {loadingMore ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 border-t border-white/8 px-3 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva um comentário…"
            maxLength={1000}
            rows={1}
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || draft.trim().length === 0}
            aria-label="Enviar comentário"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </aside>
    </div>
  )

  return createPortal(node, document.body)
}

export default CommentsPanel
