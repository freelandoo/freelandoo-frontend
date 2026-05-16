"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useMachinesCatalog } from "@/components/home/machines/use-machines-catalog"
import { MACHINES } from "@/components/home/machines/tokens"
import { FeedRetractableHeader } from "@/components/feed/feed-retractable-header"
import { PortfolioPostCard } from "@/components/feed/portfolio-post-card"
import { EmptyFeedState } from "@/components/feed/empty-feed-state"
import { FeedSkeleton } from "@/components/feed/feed-skeleton"
import { CommentsPanel } from "@/components/comments/comments-panel"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"

const DEFAULT_ACCENT = "#fbbf24"
const PAGE_LIMIT = 12
const PREFETCH_REMAINING_RATIO = 0.6

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black text-white/60 md:left-[80px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <FeedPageInner />
    </Suspense>
  )
}

function FeedPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { machines } = useMachinesCatalog()

  const [idMachine, setIdMachine] = useState<number | null>(null)
  const [estado, setEstado] = useState<string | null>(null)
  const [municipio, setMunicipio] = useState<string | null>(null)

  const [items, setItems] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)

  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const im = searchParams.get("id_machine")
    const e = searchParams.get("estado")
    const m = searchParams.get("municipio")
    if (im) setIdMachine(Number(im) || null)
    if (e) setEstado(e.toUpperCase().slice(0, 2))
    if (m) setMunicipio(m)
  }, [searchParams])

  const activeMachine = useMemo(
    () => machines.find((m) => m.id_machine === idMachine) || null,
    [machines, idMachine]
  )

  const accent = useMemo(() => {
    if (activeMachine?.color_accent) return activeMachine.color_accent
    if (activeMachine) {
      const seed = MACHINES.find((m) => m.id === activeMachine.slug)
      if (seed) return seed.colors.accent
    }
    return DEFAULT_ACCENT
  }, [activeMachine])

  useEffect(() => {
    if (!hydrated.current) return
    const sp = new URLSearchParams()
    if (idMachine != null) sp.set("id_machine", String(idMachine))
    if (estado) sp.set("estado", estado)
    if (municipio) sp.set("municipio", municipio)
    const qs = sp.toString()
    router.replace(qs ? `/feed?${qs}` : "/feed", { scroll: false })
  }, [idMachine, estado, municipio, router])

  const filtersKey = `${idMachine ?? ""}|${estado ?? ""}|${municipio ?? ""}`

  const fetchPage = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      const sp = new URLSearchParams()
      if (idMachine != null && idMachine > 0) sp.set("id_machine", String(idMachine))
      if (estado) sp.set("estado", estado)
      if (municipio) sp.set("municipio", municipio)
      if (nextCursor) sp.set("cursor", nextCursor)
      sp.set("limit", String(PAGE_LIMIT))

      const headers: Record<string, string> = {}
      const token = getToken()
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`/api/feed/portfolio?${sp.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as FeedResponse
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]))
      setCursor(data.next_cursor)
      setHasMore(!!data.has_more)
    },
    [idMachine, estado, municipio]
  )

  useEffect(() => {
    let cancelled = false
    setLoadingInitial(true)
    setError(null)
    setItems([])
    setCursor(null)
    setHasMore(true)
    fetchPage(null, true)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar feed")
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  const loadMore = useCallback(() => {
    if (loadingInitial || loadingMore || !hasMore || !cursor) return
    setLoadingMore(true)
    fetchPage(cursor, false)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar mais"))
      .finally(() => setLoadingMore(false))
  }, [cursor, hasMore, loadingInitial, loadingMore, fetchPage])

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = 0
  }, [filtersKey])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || loadingInitial) return

    const maybeLoadMore = () => {
      if (!hasMore || !cursor || loadingMore) return
      const { scrollTop, scrollHeight, clientHeight } = el
      const remaining = scrollHeight - scrollTop - clientHeight
      if (remaining < clientHeight * PREFETCH_REMAINING_RATIO) loadMore()
    }

    maybeLoadMore()
    el.addEventListener("scroll", maybeLoadMore, { passive: true })
    return () => el.removeEventListener("scroll", maybeLoadMore)
  }, [loadingInitial, loadingMore, hasMore, cursor, items.length, loadMore])

  const clearAll = () => {
    setIdMachine(null)
    setEstado(null)
    setMunicipio(null)
  }

  const hasFilters = !!(idMachine || estado || municipio)

  const filtersForEvents: FeedFilters = {
    id_machine: idMachine,
    id_category: null,
    estado,
    municipio,
    level_min: null,
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-black md:left-[80px]">
      <FeedRetractableHeader
        machines={machines}
        selectedMachineId={idMachine}
        state={estado}
        city={municipio}
        accent={accent}
        scrollRef={scrollRef}
        onMachineChange={setIdMachine}
        onLocationChange={({ state: s, city: c }) => {
          setEstado(s)
          setMunicipio(c)
        }}
        onClearAll={clearAll}
      />

      <div
        ref={scrollRef}
        role="feed"
        aria-label="Feed de portfólios. Role para ver o próximo post."
        className="relative h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {error && !loadingInitial && (
          <div className="sticky top-16 z-10 mx-auto mt-16 max-w-md px-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur">
              {error}
            </div>
          </div>
        )}

        {loadingInitial ? (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center px-4">
            <div className="w-full max-w-md">
              <EmptyFeedState
                hasFilters={hasFilters}
                levelFiltered={false}
                onReset={clearAll}
                onClearLevel={() => {}}
                accent={accent}
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-6 pt-2 sm:gap-4 sm:pt-3">
            {items.map((post) => (
              <PortfolioPostCard
                key={post.post_id}
                post={post}
                filters={filtersForEvents}
                commentsCount={post.comments_count ?? 0}
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
                        : p
                    )
                  )
                }}
              />
            ))}
            {loadingMore && hasMore && (
              <div className="px-3">
                <FeedSkeleton />
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <div className="py-8 text-center text-xs text-white/30">
                Você chegou ao fim do feed.
              </div>
            )}
          </div>
        )}
      </div>

      <CommentsPanel
        postId={openCommentsFor}
        open={!!openCommentsFor}
        onClose={() => setOpenCommentsFor(null)}
        loginNextPath="/feed"
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
    </div>
  )
}
