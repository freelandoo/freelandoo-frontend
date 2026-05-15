"use client"

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMachinesCatalog } from "@/components/home/machines/use-machines-catalog"
import { MACHINES } from "@/components/home/machines/tokens"
import { PortfolioFeedHeadcard } from "@/components/feed/portfolio-feed-headcard"
import { PortfolioPostCard } from "@/components/feed/portfolio-post-card"
import { EmptyFeedState } from "@/components/feed/empty-feed-state"
import { FeedSkeleton } from "@/components/feed/feed-skeleton"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"

const DEFAULT_ACCENT = "#fbbf24"
const PAGE_LIMIT = 12
const LEVEL_OPTIONS = new Set([1, 5, 10, 20, 30])

function parseLevelMin(value: string | null): number | null {
  if (!value || value === "all" || value === "todos") return null
  const parsed = Number(value)
  return LEVEL_OPTIONS.has(parsed) ? parsed : null
}

/** Altura do header do site para o feed ocupar só o espaço visível (evita scroll duplo). */
function useSiteHeaderOffsetPx() {
  const [px, setPx] = useState(64)
  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector("header.sticky")
      setPx(el ? Math.ceil(el.getBoundingClientRect().height) : 64)
    }
    measure()
    const el = document.querySelector("header.sticky")
    const ro = new ResizeObserver(measure)
    if (el) ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])
  return px
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid w-full grid-rows-[auto_1fr] overflow-hidden bg-black"
          style={{ height: "calc(100dvh - 64px)", maxHeight: "calc(100dvh - 64px)" }}
        >
          <div className="h-28 shrink-0 px-4 pt-2">
            <div className="h-full rounded-xl bg-white/[0.04]" />
          </div>
          <div className="min-h-0 px-3 pb-2 pt-1">
            <FeedSkeleton paged />
          </div>
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
  const headerOffsetPx = useSiteHeaderOffsetPx()

  const [idMachine, setIdMachine] = useState<number | null>(null)
  const [idCategory, setIdCategory] = useState<number | null>(null)
  const [estado, setEstado] = useState<string | null>(null)
  const [municipio, setMunicipio] = useState<string | null>(null)
  const [levelMin, setLevelMin] = useState<number | null>(null)

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
    const level = parseLevelMin(searchParams.get("level_min"))
    if (im) setIdMachine(Number(im) || null)
    if (ic) setIdCategory(Number(ic) || null)
    if (e) setEstado(e.toUpperCase().slice(0, 2))
    if (m) setMunicipio(m)
    if (level) setLevelMin(level)
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
    if (levelMin != null) sp.set("level_min", String(levelMin))
    const qs = sp.toString()
    router.replace(qs ? `/feed?${qs}` : "/feed", { scroll: false })
  }, [idMachine, idCategory, estado, municipio, levelMin, router])

  const filtersKey = `${idMachine ?? ""}|${idCategory ?? ""}|${estado ?? ""}|${municipio ?? ""}|${levelMin ?? ""}`

  const fetchPage = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      const sp = new URLSearchParams()
      if (idMachine != null && idMachine > 0) sp.set("id_machine", String(idMachine))
      if (idCategory != null && idCategory > 0) sp.set("id_category", String(idCategory))
      if (estado) sp.set("estado", estado)
      if (municipio) sp.set("municipio", municipio)
      if (levelMin != null) sp.set("level_min", String(levelMin))
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
    [idMachine, idCategory, estado, municipio, levelMin]
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

  useLayoutEffect(() => {
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
      if (remaining < clientHeight * 0.45) loadMore()
    }

    maybeLoadMore()
    el.addEventListener("scroll", maybeLoadMore, { passive: true })
    return () => el.removeEventListener("scroll", maybeLoadMore)
  }, [loadingInitial, loadingMore, hasMore, cursor, items.length, loadMore])

  const clearAll = () => {
    setIdMachine(null)
    setIdCategory(null)
    setEstado(null)
    setMunicipio(null)
    setLevelMin(null)
  }

  const hasFilters = !!(idMachine || idCategory || estado || municipio || levelMin)

  const filtersForEvents: FeedFilters = {
    id_machine: idMachine,
    id_category: idCategory,
    estado,
    municipio,
    level_min: levelMin,
  }

  return (
    <div
      className="relative grid w-full min-w-0 max-w-full grid-rows-[auto_1fr] overflow-x-hidden overflow-y-hidden bg-black"
      style={{
        height: `calc(100dvh - ${headerOffsetPx}px)`,
        maxHeight: `calc(100dvh - ${headerOffsetPx}px)`,
      }}
    >
      {activeMachine && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-40 h-px transition-colors duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              activeMachine.color_from || accent
            }, ${activeMachine.color_to || accent}, transparent)`,
          }}
        />
      )}

      <div className="min-h-0 min-w-0 shrink-0">
        <div className="px-4 pt-1">
          <PortfolioFeedHeadcard
            machines={machines}
            categories={machineCategories}
            selectedMachineId={idMachine}
            selectedCategoryId={idCategory}
            state={estado}
            city={municipio}
            levelMin={levelMin}
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
            onLevelChange={setLevelMin}
            onClearAll={clearAll}
          />
        </div>
        {error && !loadingInitial && (
          <div className="px-4 pb-2">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        role="feed"
        aria-label="Feed de portfólios. Deslize verticalmente ou use a roda do rato para ver o próximo post."
        className="mx-auto min-h-0 min-w-0 w-full max-w-xl overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-2 [scrollbar-width:none] snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
      >
        {loadingInitial ? (
          <div className="box-border h-full min-h-full min-w-0 max-w-full shrink-0 snap-start">
            <FeedSkeleton paged />
          </div>
        ) : items.length === 0 ? (
          <div className="box-border flex h-full min-h-full min-w-0 max-w-full shrink-0 snap-start items-center justify-center py-2">
            <div className="w-full">
              <EmptyFeedState
                hasFilters={hasFilters}
                levelFiltered={levelMin != null}
                onReset={clearAll}
                onClearLevel={() => setLevelMin(null)}
                accent={accent}
              />
            </div>
          </div>
        ) : (
          <>
            {items.map((post) => (
              <div
                key={post.post_id}
                className="box-border h-full min-h-full min-w-0 max-w-full shrink-0 snap-start pb-2"
              >
                <PortfolioPostCard
                  paged
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
              </div>
            ))}
            {loadingMore && hasMore && (
              <div className="box-border h-full min-h-full min-w-0 max-w-full shrink-0 snap-start pb-2">
                <FeedSkeleton paged />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
