"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useMachinesCatalog } from "@/components/home/machines/use-machines-catalog"
import { MACHINES } from "@/components/home/machines/tokens"
import { FeedRetractableHeader } from "@/components/feed/feed-retractable-header"
import { PortfolioPostCard } from "@/components/feed/portfolio-post-card"
import { EmptyFeedState } from "@/components/feed/empty-feed-state"
import { FeedSkeleton } from "@/components/feed/feed-skeleton"
import { StoryBar, type StoryBarEntry } from "@/components/stories/story-bar"
import { toast } from "sonner"
import { GesturePost } from "@/components/feed/interativo/gesture-post"
import { DropArrival } from "@/components/feed/interativo/drop-arrival"
import { GiftCard } from "@/components/feed/interativo/gift-card"
import { CapsuleCard } from "@/components/feed/interativo/capsule-card"
import { PathStrip } from "@/components/feed/interativo/path-player"
import { useFeedInterativo } from "@/components/feed/interativo/use-feed-interativo"
import { installFeedFx } from "@/lib/feed-fx"
import type { DropKind, FxDrop, FxUser } from "@/lib/feed-fx/api"

// Overlays/composer pesados carregados sob demanda — saem do First Load JS do
// /feed (rota mais pesada). O composer puxa câmera/crop/filtros; o player de
// story e o painel de comentários só aparecem por interação. (perf Tier 3)
const CommentsPanel = dynamic(
  () => import("@/components/comments/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false }
)
const StoryPlayer = dynamic(
  () => import("@/components/stories/story-player").then((m) => m.StoryPlayer),
  { ssr: false }
)
const RecadoComposer = dynamic(
  () => import("@/components/composer/RecadoComposer").then((m) => m.RecadoComposer),
  { ssr: false }
)
const MediaComposer = dynamic(
  () => import("@/components/composer/MediaComposer").then((m) => m.MediaComposer),
  { ssr: false }
)
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"

const DEFAULT_ACCENT = "#F2B705"

/** Item da lista: o post + chave estável (o drop entra no MEIO da lista sem
 *  remontar os cards de baixo) + de onde veio, se foi lançado. */
type FeedItem = FeedPost & {
  _k: string
  _drop?: { id_drop: string; kind: DropKind; sender: FxUser; full: FxDrop }
}

/** Drop SEM post (baú; cápsula só com mensagem): card próprio depois de `afterKey`. */
type FeedExtra = { _k: string; afterKey: string | null; drop: FxDrop }
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

  const [items, setItems] = useState<FeedItem[]>([])
  const keySeq = useRef(0)
  const [extras, setExtras] = useState<FeedExtra[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [storyOpen, setStoryOpen] = useState<{ entries: StoryBarEntry[]; index: number } | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<"story" | "post" | "bee">("story")
  // Recado (post só-texto, mig 209) tem composer próprio — sem módulo de câmera.
  const [recadoOpen, setRecadoOpen] = useState(false)
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
      const page: FeedItem[] = data.items.map((p) => ({ ...p, _k: `${p.post_id}:${keySeq.current++}` }))
      setItems((prev) => (replace ? page : [...prev, ...page]))
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
    setExtras([])
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

  // ⚠️ ESTÁVEIS POR EXIGÊNCIA DO `memo` do `PortfolioPostCard`: arrow inline no
  // JSX nasce nova a cada render e derruba a comparação, fazendo a lista
  // inteira de posts re-renderizar a cada estado desta tela.
  const filtersForEvents: FeedFilters = useMemo(
    () => ({
      id_machine: idMachine,
      id_category: null,
      estado,
      municipio: null,
      level_min: null,
    }),
    [idMachine, estado]
  )

  const openPostComments = useCallback((postId: string) => setOpenCommentsFor(postId), [])

  // Feed Interativo: o gesto de salvar (segurar + puxar para baixo).
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  const [logged, setLogged] = useState(false)
  useEffect(() => {
    installFeedFx()
    setLogged(!!getToken())
  }, [])
  const savePost = useCallback(async (postId: string): Promise<"saved" | "already" | "error"> => {
    const token = getToken()
    if (!token) return "error"
    const cur = itemsRef.current.find((p) => p.post_id === postId)
    if (cur?.viewer_has_bookmarked) return "already"
    const toggle = async () => {
      const res = await fetch("/api/me/bookmarks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: postId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return !!((await res.json()) as { bookmarked?: boolean }).bookmarked
    }
    try {
      let on = await toggle()
      let already = false
      // Já estava salvo no servidor (lista velha): o toggle tirou — põe de volta.
      if (!on) {
        on = await toggle()
        already = true
      }
      if (!on) return "error"
      setItems((prev) => prev.map((p) => (p.post_id === postId ? { ...p, viewer_has_bookmarked: true } : p)))
      return already ? "already" : "saved"
    } catch {
      return "error"
    }
  }, [])

  const extrasRef = useRef(extras)
  useEffect(() => {
    extrasRef.current = extras
  }, [extras])
  // Feed Interativo: o que outros lançaram cai logo DEPOIS do post na tela.
  const injectDrop = useCallback((drop: FxDrop): boolean => {
    const standalone = !drop.post && (drop.kind === "gift" || (drop.kind === "capsule" && !!drop.payload.message))
    if (!drop.post && !standalone) return false
    const el = scrollRef.current
    if (!el) return false
    const top = el.getBoundingClientRect().top + el.clientHeight * 0.35
    let afterKey: string | null = null
    for (const node of el.querySelectorAll<HTMLElement>("[data-entry-key]")) {
      if (node.getBoundingClientRect().bottom > top) {
        afterKey = node.dataset.entryKey || null
        break
      }
    }
    const key = `drop:${drop.id_drop}`
    // O nó achado pode ser um extra: o extra novo vai depois do mesmo post.
    const extraAt = afterKey?.startsWith("drop:") ? extrasRef.current.find((x) => x._k === afterKey) : null
    if (drop.post) {
      const entry: FeedItem = {
        ...drop.post,
        _k: key,
        _drop: { id_drop: drop.id_drop, kind: drop.kind, sender: drop.sender, full: drop },
      }
      const anchor = extraAt ? extraAt.afterKey : afterKey
      setItems((prev) => {
        if (prev.some((p) => p._k === entry._k)) return prev
        const at = anchor ? prev.findIndex((p) => p._k === anchor) : -1
        const next = [...prev]
        next.splice(at + 1, 0, entry)
        return next
      })
    } else {
      const anchor = extraAt ? extraAt.afterKey : afterKey
      setExtras((prev) => (prev.some((x) => x._k === key) ? prev : [...prev, { _k: key, afterKey: anchor, drop }]))
    }
    // Rola até ele enquanto ele cai: "como se a pessoa tivesse acabado de chegar nele".
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const node = el.querySelector<HTMLElement>(`[data-entry-key="${key}"]`)
        if (node) el.scrollTo({ top: Math.max(0, node.offsetTop - 64), behavior: "smooth" })
      })
    )
    return true
  }, [])

  const fxBlocked = !!openCommentsFor || !!storyOpen || creatorOpen || recadoOpen
  const { targets, throwPost, markSeen } = useFeedInterativo({
    enabled: logged,
    scrollRef,
    blocked: fxBlocked,
    inject: injectDrop,
  })
  const onNoTargets = useCallback(() => {
    toast(t("fxNoTargets", "Ninguém aceitou receber seus lançamentos ainda."), {
      action: { label: t("fxInvite", "Convidar"), onClick: () => router.push("/feed/lancar") },
    })
  }, [router, t])

  const handleLikeChange = useCallback((postId: string, liked: boolean, likes_count: number | null) => {
    setItems((prev) =>
      prev.map((p) =>
        p.post_id === postId ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count } : p
      )
    )
  }, [])

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
          else if (kind === "recado") { setRecadoOpen(true) }
          else if (kind === "bees") { setComposerMode("bee"); setCreatorOpen(true) }
          else if (kind === "clan") router.push("/account/clans")
          else if (kind === "lancar") router.push("/feed/lancar")
          else if (kind === "bau") router.push("/feed/bau")
          else if (kind === "capsula") router.push("/feed/capsula")
          else if (kind === "caminhos") router.push("/feed/caminhos")
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
            defaultAccent={accent}
            showCreateSlot
            onCreate={() => { setComposerMode("story"); setCreatorOpen(true) }}
            onOpenUser={(entry, all) => {
              const idx = all.findIndex((e) => e.id_user === entry.id_user)
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
            {/* feed infinito: o mesmo post volta numa volta seguinte — a chave leva a posição (a lista só cresce no fim) */}
            {extras
              .filter((x) => x.afterKey === null)
              .map((x) => (
                <div key={x._k} data-entry-key={x._k}>
                  <DropArrival dropId={x.drop.id_drop} kind={x.drop.kind} sender={x.drop.sender} onArrived={markSeen}>
                    {x.drop.kind === "gift" ? <GiftCard drop={x.drop} /> : <CapsuleCard drop={x.drop} />}
                  </DropArrival>
                </div>
              ))}
            {items.map((post) => {
              const card = (
                <GesturePost
                  postId={post.post_id}
                  enabled={logged}
                  targets={targets}
                  onThrow={throwPost}
                  onSave={savePost}
                  onNoTargets={onNoTargets}
                >
                  <PortfolioPostCard
                    post={post}
                    filters={filtersForEvents}
                    commentsCount={post.comments_count ?? 0}
                    onOpenComments={openPostComments}
                    onLikeChange={handleLikeChange}
                  />
                </GesturePost>
              )
              const after = extras.filter((x) => x.afterKey === post._k)
              return (
                <div key={post._k}>
                  <div data-entry-key={post._k}>
                    {post._drop ? (
                      <DropArrival
                        dropId={post._drop.id_drop}
                        kind={post._drop.kind}
                        sender={post._drop.sender}
                        onArrived={markSeen}
                      >
                        {post._drop.kind === "capsule" && <CapsuleCard drop={post._drop.full} compact />}
                        {card}
                      </DropArrival>
                    ) : (
                      card
                    )}
                    {post.path_story_id && <PathStrip postId={post.post_id} />}
                  </div>
                  {after.map((x) => (
                    <div key={x._k} data-entry-key={x._k}>
                      <DropArrival dropId={x.drop.id_drop} kind={x.drop.kind} sender={x.drop.sender} onArrived={markSeen}>
                        {x.drop.kind === "gift" ? <GiftCard drop={x.drop} /> : <CapsuleCard drop={x.drop} />}
                      </DropArrival>
                    </div>
                  ))}
                </div>
              )
            })}
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

      {recadoOpen && (
        <RecadoComposer
          open
          onClose={() => setRecadoOpen(false)}
          onPosted={() => setRecadoOpen(false)}
        />
      )}

      {creatorOpen && (
        <MediaComposer
          open
          mode={composerMode}
          onClose={() => setCreatorOpen(false)}
          onPosted={() => setStoryBarKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
