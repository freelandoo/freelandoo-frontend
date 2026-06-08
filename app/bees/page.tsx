"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Radio, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"
import { BeesPost } from "@/components/bees/bees-post"
import { CommentsPanel } from "@/components/comments/comments-panel"
import { LivesView } from "@/components/lives/lives-view"

const PAGE_LIMIT = 6
const PREFETCH_THRESHOLD = 2

export default function BeesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-[#0b0804] text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <BeesPageInner />
    </Suspense>
  )
}

function BeesPageInner() {
  const [items, setItems] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  // Aba Lives dentro do próprio /bees (sem header de site): só um botão flutuante
  // que troca o conteúdo para a lista de lives.
  const [view, setView] = useState<"bees" | "lives">("bees")

  const fetchPage = useCallback(async (nextCursor: string | null, replace: boolean) => {
    const sp = new URLSearchParams()
    if (nextCursor) sp.set("cursor", nextCursor)
    sp.set("limit", String(PAGE_LIMIT))

    const headers: Record<string, string> = {}
    const token = getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`/api/feed/bees?${sp.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as FeedResponse
    setItems((prev) => (replace ? data.items : [...prev, ...data.items]))
    setCursor(data.next_cursor)
    setHasMore(!!data.has_more)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingInitial(true)
    setError(null)
    fetchPage(null, true)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar Bees")
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage])

  // Prefetch quando estiver perto do fim
  useEffect(() => {
    if (loadingInitial || loadingMore || !hasMore || !cursor) return
    if (activeIndex < items.length - PREFETCH_THRESHOLD) return
    setLoadingMore(true)
    fetchPage(cursor, false)
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [activeIndex, items.length, cursor, hasMore, loadingInitial, loadingMore, fetchPage])

  const filtersForEvents: FeedFilters = {
    id_machine: null,
    id_category: null,
    estado: null,
    municipio: null,
    level_min: null,
  }

  if (view === "lives") {
    return (
      <div className="fixed inset-0 z-30 bg-[#0b0804] md:left-[80px]">
        <LivesView onBack={() => setView("bees")} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-30 bg-[#0b0804] md:left-[80px]">
      {/* Botão flutuante LIVE — abre a aba Lives dentro do próprio Bees */}
      <motion.button
        type="button"
        onClick={() => setView("lives")}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.7)] backdrop-blur transition hover:bg-red-600"
        aria-label="Ver lives"
      >
        <Radio className="h-4 w-4" /> Live
      </motion.button>

      {loadingInitial ? (
        <LoadingState />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchPage(null, true)} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <BeesScroller
            items={items}
            filtersForEvents={filtersForEvents}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            activeIndex={activeIndex}
            onActiveChange={setActiveIndex}
            onOpenComments={(postId) => setOpenCommentsFor(postId)}
            onLikeChange={(postId, liked, likes_count) => {
              setItems((prev) =>
                prev.map((p) =>
                  p.post_id === postId
                    ? {
                        ...p,
                        viewer_has_liked: liked,
                        likes_count: likes_count ?? p.likes_count,
                      }
                    : p,
                ),
              )
            }}
          />
          <CommentsPanel
            postId={openCommentsFor}
            open={!!openCommentsFor}
            onClose={() => setOpenCommentsFor(null)}
            loginNextPath="/bees"
            onCountChange={(postId, delta) => {
              setItems((prev) =>
                prev.map((p) =>
                  p.post_id === postId
                    ? {
                        ...p,
                        comments_count: Math.max(0, (p.comments_count ?? 0) + delta),
                      }
                    : p,
                ),
              )
            }}
          />
        </>
      )}
    </div>
  )
}

function BeesScroller({
  items,
  filtersForEvents,
  muted,
  onToggleMute,
  activeIndex,
  onActiveChange,
  onLikeChange,
  onOpenComments,
}: {
  items: FeedPost[]
  filtersForEvents: FeedFilters
  muted: boolean
  onToggleMute: () => void
  activeIndex: number
  onActiveChange: (i: number) => void
  onLikeChange: (postId: string, liked: boolean, likes_count: number | null) => void
  onOpenComments: (postId: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={scrollerRef}
      className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth"
      style={{ scrollbarWidth: "none" }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {items.map((post, idx) => (
        <BeesPost
          key={post.post_id}
          post={post}
          filters={filtersForEvents}
          isActive={idx === activeIndex}
          muted={muted}
          onToggleMute={onToggleMute}
          onActivate={() => {
            if (activeIndex !== idx) onActiveChange(idx)
          }}
          onLikeChange={onLikeChange}
          onOpenComments={onOpenComments}
          commentsCount={post.comments_count ?? 0}
        />
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-white/70">
      <Loader2 className="h-7 w-7 animate-spin" />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
      >
        Tentar de novo
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/75">
      <Sparkles className="h-10 w-10 text-[#F2B705]" />
      <p className="text-base font-semibold">Ainda não tem Bees por aqui</p>
      <p className="max-w-xs text-sm text-white/55">
        Bees é o feed vertical 9:16. Quando alguém publicar um vídeo nesse formato, ele aparece
        aqui automaticamente.
      </p>
    </div>
  )
}
