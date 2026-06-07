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
import { StoryBar, type StoryBarEntry } from "@/components/stories/story-bar"
import { StoryPlayer } from "@/components/stories/story-player"
import { MediaComposer } from "@/components/composer/MediaComposer"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"

const DEFAULT_ACCENT = "#F2B705"
const PAGE_LIMIT = 12
const PREFETCH_REMAINING_RATIO = 0.6

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0804] text-white/60 md:left-[80px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <FeedPageInner />
    </Suspense>
  )
}

function FeedPageInner() {
  const t = useTranslations("Feed")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { machines } = useMachinesCatalog()

  const [idMachine, setIdMachine] = useState<number | null>(null)
  const [estado, setEstado] = useState<string | null>(null)
  const [regionId, setRegionId] = useState<number | null>(null)
  const [regionName, setRegionName] = useState<string | null>(null)

  const [items, setItems] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [storyOpen, setStoryOpen] = useState<{ entries: StoryBarEntry[]; index: number } | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<"story" | "post" | "bee">("story")
  const [storyBarKey, setStoryBarKey] = useState(0)

  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const im = searchParams.get("id_machine")
    const e = searchParams.get("estado")
    const ri = searchParams.get("id_region")
    const rn = searchParams.get("regiao")
    if (im) setIdMachine(Number(im) || null)
    if (e) setEstado(e.toUpperCase().slice(0, 2))
    if (ri) setRegionId(Number(ri) || null)
    if (rn) setRegionName(rn)
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
    if (regionId) sp.set("id_region", String(regionId))
    if (regionName) sp.set("regiao", regionName)
    const qs = sp.toString()
    router.replace(qs ? `/feed?${qs}` : "/feed", { scroll: false })
  }, [idMachine, estado, regionId, regionName, router])

  const filtersKey = `${idMachine ?? ""}|${estado ?? ""}|${regionId ?? ""}`

  const fetchPage = useCallback(
    async (nextCursor: string | null, replace: boolean) => {
      const sp = new URLSearchParams()
      if (idMachine != null && idMachine > 0) sp.set("id_machine", String(idMachine))
      if (estado) sp.set("estado", estado)
      if (regionId) sp.set("id_region", String(regionId))
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
    [idMachine, estado, regionId]
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
        if (!cancelled) setError(e instanceof Error ? e.message : t("errorLoadingFeed", "Erro ao carregar feed"))
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
      .catch((e) => setError(e instanceof Error ? e.message : t("errorLoadingMore", "Erro ao carregar mais")))
      .finally(() => setLoadingMore(false))
  }, [cursor, hasMore, loadingInitial, loadingMore, fetchPage, t])

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
    setRegionId(null)
    setRegionName(null)
  }

  const hasFilters = !!(idMachine || estado || regionId)

  const filtersForEvents: FeedFilters = {
    id_machine: idMachine,
    id_category: null,
    estado,
    municipio: null,
    level_min: null,
  }

  return (
    <div data-tour="feed-root" className="fixed inset-0 z-30 flex flex-col bg-[#0b0804] md:left-[80px]">
      <FeedRetractableHeader
        machines={machines}
        selectedMachineId={idMachine}
        state={estado}
        regionId={regionId}
        regionName={regionName}
        accent={accent}
        scrollRef={scrollRef}
        onMachineChange={setIdMachine}
        onLocationChange={({ state: s, regionId: ri, regionName: rn }) => {
          setEstado(s)
          setRegionId(ri)
          setRegionName(rn)
        }}
        onClearAll={clearAll}
        onCreate={(kind) => {
          if (kind === "post") { setComposerMode("post"); setCreatorOpen(true) }
          else if (kind === "bees") { setComposerMode("bee"); setCreatorOpen(true) }
          else if (kind === "clan") router.push("/account/clans")
          else router.push("/account")
        }}
      />

      <div
        ref={scrollRef}
        role="feed"
        aria-label={t("feedAriaLabel", "Feed de portfólios. Role para ver o próximo post.")}
        className="relative h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="h-[64px] sm:h-[68px]" aria-hidden />
        <div className="border-b border-white/[0.06] bg-black/35 backdrop-blur-sm">
          <StoryBar
            key={storyBarKey}
            kind="rest"
            defaultAccent={accent}
            showCreateSlot
            onCreate={() => { setComposerMode("story"); setCreatorOpen(true) }}
            onOpenProfile={(entry, all) => {
              const idx = all.findIndex((e) => e.id_profile === entry.id_profile)
              setStoryOpen({ entries: all, index: Math.max(0, idx) })
            }}
          />
        </div>

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
          <div className="mx-auto flex w-full max-w-[470px] flex-col pb-10">
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
              <div className="fl-root py-10 text-center">
                <span className="fl-marker text-2xl text-[#F2B705]">
                  {t("feedEndMessage", "Você chegou ao fim do feed.")}
                </span>
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

      {storyOpen && (
        <StoryPlayer
          entries={storyOpen.entries}
          initialIndex={storyOpen.index}
          onClose={() => setStoryOpen(null)}
        />
      )}

      <MediaComposer
        open={creatorOpen}
        mode={composerMode}
        initialKind="rest"
        onClose={() => setCreatorOpen(false)}
        onPosted={() => setStoryBarKey((k) => k + 1)}
      />
    </div>
  )
}
