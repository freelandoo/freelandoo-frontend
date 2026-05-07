"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMachinesCatalog } from "@/components/home/machines/use-machines-catalog"
import { MACHINES } from "@/components/home/machines/tokens"
import { PortfolioFeedHeadcard } from "@/components/feed/portfolio-feed-headcard"
import { PortfolioPostCard } from "@/components/feed/portfolio-post-card"
import { FeedSkeleton } from "@/components/feed/feed-skeleton"
import { EmptyFeedState } from "@/components/feed/empty-feed-state"
import { InfiniteScrollSentinel } from "@/components/feed/infinite-scroll-sentinel"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"

const DEFAULT_ACCENT = "#fbbf24"
const PAGE_LIMIT = 12

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black">
          <main className="mx-auto w-full max-w-xl px-4 py-6">
            <FeedSkeleton />
          </main>
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
  const [idCategory, setIdCategory] = useState<number | null>(null)
  const [estado, setEstado] = useState<string | null>(null)
  const [municipio, setMunicipio] = useState<string | null>(null)

  const [items, setItems] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const im = searchParams.get("id_machine")
    const ic = searchParams.get("id_category")
    const e = searchParams.get("estado")
    const m = searchParams.get("municipio")
    if (im) setIdMachine(Number(im) || null)
    if (ic) setIdCategory(Number(ic) || null)
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

  const machineCategories = useMemo(
    () => activeMachine?.categories ?? [],
    [activeMachine]
  )

  useEffect(() => {
    if (idCategory == null) return
    if (!activeMachine) {
      setIdCategory(null)
      return
    }
    const ok = activeMachine.categories.some((c) => c.id_category === idCategory)
    if (!ok) setIdCategory(null)
  }, [idMachine, activeMachine, idCategory])

  useEffect(() => {
    if (!hydrated.current) return
    const sp = new URLSearchParams()
    if (idMachine != null) sp.set("id_machine", String(idMachine))
    if (idCategory != null) sp.set("id_category", String(idCategory))
    if (estado) sp.set("estado", estado)
    if (municipio) sp.set("municipio", municipio)
    const qs = sp.toString()
    router.replace(qs ? `/feed?${qs}` : "/feed", { scroll: false })
  }, [idMachine, idCategory, estado, municipio, router])

  const filtersKey = `${idMachine ?? ""}|${idCategory ?? ""}|${estado ?? ""}|${municipio ?? ""}`

  const fetchPage = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      const sp = new URLSearchParams()
      if (idMachine != null && idMachine > 0) sp.set("id_machine", String(idMachine))
      if (idCategory != null && idCategory > 0) sp.set("id_category", String(idCategory))
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
    [idMachine, idCategory, estado, municipio]
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

  const clearAll = () => {
    setIdMachine(null)
    setIdCategory(null)
    setEstado(null)
    setMunicipio(null)
  }

  const hasFilters = !!(idMachine || idCategory || estado || municipio)

  const filtersForEvents: FeedFilters = {
    id_machine: idMachine,
    id_category: idCategory,
    estado,
    municipio,
  }

  return (
    <div className="min-h-screen bg-black">
      {activeMachine && (
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-40 h-px transition-colors duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              activeMachine.color_from || accent
            }, ${activeMachine.color_to || accent}, transparent)`,
          }}
        />
      )}
      <main className="mx-auto w-full max-w-xl px-4 pb-16">
        <PortfolioFeedHeadcard
          machines={machines}
          categories={machineCategories}
          selectedMachineId={idMachine}
          selectedCategoryId={idCategory}
          state={estado}
          city={municipio}
          accent={accent}
          onMachineChange={(id) => {
            setIdMachine(id)
            setIdCategory(null)
          }}
          onCategoryChange={setIdCategory}
          onLocationChange={({ state: s, city: c }) => {
            setEstado(s)
            setMunicipio(c)
          }}
          onClearAll={clearAll}
        />

        {error && !loadingInitial && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loadingInitial ? (
          <FeedSkeleton />
        ) : items.length === 0 ? (
          <EmptyFeedState hasFilters={hasFilters} onReset={clearAll} accent={accent} />
        ) : (
          <div className="flex flex-col gap-6">
            {items.map((post) => (
              <PortfolioPostCard
                key={post.post_id}
                post={post}
                filters={filtersForEvents}
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
          </div>
        )}

        {!loadingInitial && hasMore && items.length > 0 && (
          <>
            <InfiniteScrollSentinel onIntersect={loadMore} disabled={loadingMore} />
            {loadingMore && (
              <div className="mt-4">
                <FeedSkeleton count={1} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
