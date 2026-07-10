"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Radio, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { onRealtime } from "@/lib/realtime"
import { cn } from "@/lib/utils"
import type { BeeItem, BeeTimelineResponse } from "@/lib/types/portfolio-feed"
import { BeePost } from "@/components/bees/bee-post"
import { CommentsPanel } from "@/components/comments/comments-panel"
import { useTranslations } from "@/components/i18n/I18nProvider"

// Lives carregam livekit-client (pesado). Só importam quando o usuário abre a
// aba de lives — fora do bundle inicial do /bees (rota mais pesada). (perf Tier 3)
const LivesView = dynamic(
  () => import("@/components/lives/lives-view").then((m) => m.LivesView),
  { ssr: false }
)

const PAGE_LIMIT = 6
const PREFETCH_THRESHOLD = 2

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function dedupeBees(prev: BeeItem[], next: BeeItem[]) {
  const seen = new Set(prev.map((b) => b.id_story))
  return [...prev, ...next.filter((b) => !seen.has(b.id_story))]
}

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
  const t = useTranslations("Bees")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<BeeItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  // Aba Lives dentro do próprio /bees (sem header de site): só um botão flutuante
  // que troca o conteúdo para a lista de lives.
  const [view, setView] = useState<"bees" | "lives">("bees")
  const [liveCount, setLiveCount] = useState(0)
  // Deep-link ?bee=<id> (share/Salvos/notificações) — prepend do bee na lista.
  const deepLinkBee = searchParams.get("bee")

  // Conta lives ativas para o selo no botão. O backend empurra "lives:changed"
  // via WebSocket quando uma live abre/encerra — o poll virou só fallback
  // raro (10 min). Fetch direto no Railway (fora da Vercel).
  useEffect(() => {
    let active = true
    const token = getToken()
    if (!token) return
    const tick = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetch(`${getPublicBackendUrl()}/lives`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (!res.ok) return
        const data = (await res.json()) as { items?: unknown[] }
        if (active) setLiveCount(Array.isArray(data.items) ? data.items.length : 0)
      } catch { /* silencioso */ }
    }
    tick()
    const id = setInterval(tick, 600_000)
    const offLives = onRealtime("lives:changed", () => { void tick() })
    // Ao voltar pra aba, atualiza na hora (sem esperar o intervalo).
    const onVisibility = () => { if (document.visibilityState === "visible") tick() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      active = false
      clearInterval(id)
      offLives()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const fetchPage = useCallback(async (nextCursor: string | null, replace: boolean) => {
    const token = getToken()
    if (!token) {
      setNeedsLogin(true)
      return
    }
    const sp = new URLSearchParams()
    if (nextCursor) sp.set("cursor", nextCursor)
    sp.set("limit", String(PAGE_LIMIT))

    const res = await fetch(`/api/bees/timeline?${sp.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (res.status === 401) {
      setNeedsLogin(true)
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as BeeTimelineResponse
    setItems((prev) => (replace ? data.items : dedupeBees(prev, data.items)))
    setCursor(data.next_cursor)
    setHasMore(!!data.has_more)
  }, [])

  // Carga inicial
  useEffect(() => {
    let cancelled = false
    setLoadingInitial(true)
    setError(null)
    setActiveIndex(0)
    fetchPage(null, true)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t("loadError", "Erro ao carregar os bees"))
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage, t])

  // Deep-link: busca o bee apontado e coloca no topo da timeline.
  useEffect(() => {
    if (!deepLinkBee || !UUID_RE.test(deepLinkBee)) return
    const token = getToken()
    if (!token) return
    let cancelled = false
    fetch(`/api/bees/${encodeURIComponent(deepLinkBee)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { item?: BeeItem } | null) => {
        if (cancelled || !data?.item) return
        const item = data.item
        setItems((prev) => [item, ...prev.filter((b) => b.id_story !== item.id_story)])
        setActiveIndex(0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [deepLinkBee])

  // Prefetch quando estiver perto do fim
  useEffect(() => {
    if (loadingInitial || loadingMore || !hasMore || !cursor) return
    if (activeIndex < items.length - PREFETCH_THRESHOLD) return
    setLoadingMore(true)
    fetchPage(cursor, false)
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [activeIndex, items.length, cursor, hasMore, loadingInitial, loadingMore, fetchPage])

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
        aria-label={t("viewLives", "Ver lives")}
      >
        {liveCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-red-600 shadow">
            {liveCount}
          </span>
        )}
        <Radio className={cn("h-4 w-4", liveCount > 0 && "animate-pulse")} /> {t("liveButton", "Live")}
      </motion.button>

      {needsLogin ? (
        <LoginState
          title={t("loginTitle", "Entre pra ver os bees")}
          description={t("loginDescription", "Os bees são os stories da Freelandoo — vídeos que duram de 24h a 7 dias, dependendo do engajamento.")}
          cta={t("loginCta", "Entrar")}
          onLogin={() => router.push(`/login?next=${encodeURIComponent("/bees")}`)}
        />
      ) : loadingInitial ? (
        <LoadingState />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchPage(null, true)} retryLabel={t("retry", "Tentar de novo")} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("emptyTimelineTitle", "Ainda não tem bees por aqui")}
          description={t("emptyTimelineDescription", "Bees são os stories da Freelandoo. Quando alguém publicar, eles aparecem aqui — os melhores ficam no ar por até 7 dias.")}
        />
      ) : (
        <>
          <BeesScroller
            items={items}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            activeIndex={activeIndex}
            onActiveChange={setActiveIndex}
            onOpenComments={(idStory) => setOpenCommentsFor(idStory)}
            onLikeChange={(idStory, liked, likes_count) => {
              setItems((prev) =>
                prev.map((b) =>
                  b.id_story === idStory
                    ? {
                        ...b,
                        viewer_has_liked: liked,
                        likes_count: likes_count ?? b.likes_count,
                      }
                    : b,
                ),
              )
            }}
          />
          <CommentsPanel
            postId={openCommentsFor}
            open={!!openCommentsFor}
            onClose={() => setOpenCommentsFor(null)}
            loginNextPath="/bees"
            apiBase="/api/bees"
            onCountChange={(idStory, delta) => {
              setItems((prev) =>
                prev.map((b) =>
                  b.id_story === idStory
                    ? {
                        ...b,
                        comments_count: Math.max(0, (b.comments_count ?? 0) + delta),
                      }
                    : b,
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
  muted,
  onToggleMute,
  activeIndex,
  onActiveChange,
  onLikeChange,
  onOpenComments,
}: {
  items: BeeItem[]
  muted: boolean
  onToggleMute: () => void
  activeIndex: number
  onActiveChange: (i: number) => void
  onLikeChange: (idStory: string, liked: boolean, likes_count: number | null) => void
  onOpenComments: (idStory: string) => void
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
      {items.map((bee, idx) => (
        <BeePost
          key={bee.id_story}
          bee={bee}
          isActive={idx === activeIndex}
          muted={muted}
          onToggleMute={onToggleMute}
          onActivate={() => {
            if (activeIndex !== idx) onActiveChange(idx)
          }}
          onLikeChange={onLikeChange}
          onOpenComments={onOpenComments}
          commentsCount={bee.comments_count ?? 0}
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

function ErrorState({ message, onRetry, retryLabel }: { message: string; onRetry: () => void; retryLabel: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
      <p className="text-sm">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="fl-sharp border border-white/20 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
      >
        {retryLabel}
      </button>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/75">
      <Sparkles className="h-10 w-10 text-[#F2B705]" />
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-white/55">
        {description}
      </p>
    </div>
  )
}

function LoginState({ title, description, cta, onLogin }: { title: string; description: string; cta: string; onLogin: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
      <Sparkles className="h-10 w-10 text-[#F2B705]" />
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-white/55">{description}</p>
      <button
        type="button"
        onClick={onLogin}
        className="fl-sharp bg-[#F2B705] px-5 py-2 text-sm font-bold uppercase tracking-wide text-[#0B0B0D] transition active:scale-95"
      >
        {cta}
      </button>
    </div>
  )
}
