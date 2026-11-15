"use client"

// FEED SINCRONIZADO (Feed Interativo F6, mig 459) — duas pessoas, o mesmo feed.
//
// O feed é o do ANFITRIÃO: ele manda a lista de posts (post_ids) e o post na
// tela; o convidado carrega esses posts com a régua dele e acompanha. A tela é
// um post por vez (snap vertical), então "acompanhar" é ir para o mesmo post —
// telas de tamanhos diferentes não brigam por pixel. Vídeo: tocar/pausar/pular
// passa junto; com o vídeo tocando, um pulso a cada 4 s corrige desvio > 0,6 s
// (somando a latência medida pelo `sent_at`).
// Controle: só o anfitrião, ou dividido (os dois conduzem; o último manda).
// Estados na barra: conectando · sincronizado · reconectando · encerrado.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Link2, Loader2, LogOut, Users } from "lucide-react"
import { toast } from "sonner"
import { PortfolioPostCard } from "@/components/feed/portfolio-post-card"
import { emitRealtime, onRealtime } from "@/lib/realtime"
import { getToken } from "@/lib/auth"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { fxApi, type FxUser } from "@/lib/feed-fx/api"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { FeedFilters, FeedPost, FeedResponse } from "@/lib/types/portfolio-feed"
import { SYNC_LIST_KEY } from "./sync-picker"

interface Session {
  id_session: string
  status: "invited" | "active" | "ended"
  control: "host" | "shared"
  role: "host" | "guest"
  expires_at: string | null
}
interface SyncState {
  id_session: string
  seq: number
  index: number
  post_id: string | null
  post_ids?: string[]
  video?: { playing: boolean; t: number }
  from: string
  sent_at: number
}

const FILTERS: FeedFilters = { id_machine: null, id_category: null, estado: null, municipio: null, level_min: null }
const noop = () => {}

export function SyncFeed({ id }: { id: string }) {
  const t = useTranslations("FeedFx")
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [other, setOther] = useState<FxUser | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [peerOnline, setPeerOnline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const seq = useRef(0)
  const applying = useRef(0) // até quando ignorar o próprio scroll (aplicando estado remoto)
  const current = useRef(0)
  const postsRef = useRef<FeedPost[]>([])
  const sessionRef = useRef<Session | null>(null)
  useEffect(() => {
    postsRef.current = posts
    sessionRef.current = session
  })

  const active = session?.status === "active"
  const isHost = session?.role === "host"
  const canDrive = !!session && (isHost || session.control === "shared")

  // ── carregar a sessão ──
  useEffect(() => {
    installFeedFx()
    if (!getToken()) {
      setError(t("needLogin", "Entre na sua conta para usar."))
      return
    }
    fxApi<{ session: Session; other: FxUser }>(`/sync/${id}`)
      .then((r) => {
        setSession(r.session)
        setOther(r.other)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"))
  }, [id, t])

  // ── ciclo pela notificação ──
  useEffect(() => {
    return onRealtime("fi:sync", (raw) => {
      const p = (raw || {}) as { type?: string; id_session?: string; control?: "host" | "shared" }
      if (p.id_session !== id) return
      if (p.type === "started") {
        setSession((s) => (s ? { ...s, status: "active" } : s))
        fx("sync-conectado", "sync")
      } else if (p.type === "ended") {
        setSession((s) => (s ? { ...s, status: "ended" } : s))
        fx("sync-sair", "cancelar")
      } else if (p.type === "control" && p.control) {
        setSession((s) => (s ? { ...s, control: p.control! } : s))
        fx("carimbo")
      }
    })
  }, [id])

  // ── convite esperando: contagem regressiva ──
  useEffect(() => {
    if (session?.status !== "invited" || !session.expires_at) return
    const end = new Date(session.expires_at).getTime()
    const tick = () => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)))
    tick()
    const iv = window.setInterval(tick, 1000)
    return () => window.clearInterval(iv)
  }, [session?.status, session?.expires_at])

  // ── feed do anfitrião ──
  useEffect(() => {
    if (!active || !isHost || posts.length) return
    // Começou jogando um post para o lado: o feed é o MEU, a partir dele.
    let list: string[] = []
    try {
      list = JSON.parse(sessionStorage.getItem(SYNC_LIST_KEY(id)) || "[]")
    } catch {
      list = []
    }
    if (Array.isArray(list) && list.length) {
      fxApi<{ items: FeedPost[] }>(`/posts?ids=${list.slice(0, 30).join(",")}`)
        .then((r) => {
          const by = new Map(r.items.map((p) => [p.post_id, p]))
          const ordered = list.map((pid) => by.get(pid)).filter(Boolean) as FeedPost[]
          if (ordered.length) setPosts(ordered)
        })
        .catch(() => {})
      return
    }
    const token = getToken()
    fetch(`/api/feed/portfolio?limit=12`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<FeedResponse>) : null))
      .then((d) => d && setPosts(d.items.filter((p) => p.feed_kind !== "bees").slice(0, 30)))
      .catch(() => {})
  }, [active, isHost, posts.length, id])

  const videoOf = (idx: number) =>
    scrollRef.current?.querySelector<HTMLVideoElement>(`[data-sync-index="${idx}"] video`) || null

  const send = useCallback(
    (extra: Partial<SyncState> = {}, withList = false) => {
      const s = sessionRef.current
      if (!s || s.status !== "active") return
      if (!(s.role === "host" || s.control === "shared")) return
      const idx = current.current
      const v = videoOf(idx)
      emitRealtime("sync:state", {
        id_session: s.id_session,
        seq: ++seq.current,
        index: idx,
        post_id: postsRef.current[idx]?.post_id || null,
        ...(withList ? { post_ids: postsRef.current.map((p) => p.post_id) } : {}),
        ...(v ? { video: { playing: !v.paused, t: v.currentTime } } : {}),
        ...extra,
      })
    },
    []
  )

  // ── entrar na sala ──
  useEffect(() => {
    if (!active) return
    emitRealtime("sync:join", { id_session: id })
    fx("sync-conectado", "sync")
    const offPeer = onRealtime("fi:sync:peer", (raw) => {
      const p = (raw || {}) as { id_session?: string; online?: boolean; self?: boolean }
      if (p.id_session !== id || p.self) return
      setPeerOnline(!!p.online)
      // Chegou alguém: quem conduz reenvia a lista e a posição.
      if (p.online) window.setTimeout(() => send({}, true), 150)
    })
    return () => {
      offPeer()
      emitRealtime("sync:leave", { id_session: id })
    }
  }, [active, id, send])

  // Lista nova do anfitrião: manda para o outro lado.
  useEffect(() => {
    if (active && isHost && posts.length) send({}, true)
  }, [active, isHost, posts, send])

  // ── aplicar o estado do outro lado ──
  useEffect(() => {
    if (!active) return
    return onRealtime("fi:sync:state", async (raw) => {
      const st = raw as SyncState
      if (!st || st.id_session !== id) return
      setPeerOnline(true)
      if (st.post_ids && st.post_ids.join(",") !== postsRef.current.map((p) => p.post_id).join(",")) {
        try {
          const r = await fxApi<{ items: FeedPost[] }>(`/posts?ids=${st.post_ids.join(",")}`)
          const by = new Map(r.items.map((p) => [p.post_id, p]))
          const next = st.post_ids.map((pid) => by.get(pid)).filter(Boolean) as FeedPost[]
          postsRef.current = next
          setPosts(next)
          await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
        } catch {
          return
        }
      }
      const idx = st.post_id ? postsRef.current.findIndex((p) => p.post_id === st.post_id) : st.index
      if (idx < 0) return
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-sync-index="${idx}"]`)
      if (el && idx !== current.current) {
        applying.current = performance.now() + 700
        current.current = idx
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        fx("mirar")
      }
      const v = videoOf(idx)
      if (v && st.video) {
        applying.current = Math.max(applying.current, performance.now() + 400)
        const target = st.video.t + (st.video.playing ? Math.max(0, (Date.now() - st.sent_at) / 1000) : 0)
        if (Math.abs(v.currentTime - target) > 0.6) v.currentTime = target
        if (st.video.playing && v.paused) void v.play().catch(() => {})
        if (!st.video.playing && !v.paused) v.pause()
      }
    })
  }, [active, id])

  // ── o meu scroll e o meu vídeo ──
  useEffect(() => {
    const root = scrollRef.current
    if (!root || !active || !posts.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || e.intersectionRatio < 0.6) continue
          const idx = Number((e.target as HTMLElement).dataset.syncIndex)
          if (idx === current.current) continue
          current.current = idx
          if (performance.now() < applying.current) continue
          send()
        }
      },
      { root, threshold: [0.6] }
    )
    root.querySelectorAll("[data-sync-index]").forEach((n) => io.observe(n))
    const onMedia = (e: Event) => {
      if (performance.now() < applying.current) return
      const v = e.target as HTMLVideoElement
      const holder = v.closest<HTMLElement>("[data-sync-index]")
      if (!holder || Number(holder.dataset.syncIndex) !== current.current) return
      send()
    }
    root.addEventListener("play", onMedia, true)
    root.addEventListener("pause", onMedia, true)
    root.addEventListener("seeked", onMedia, true)
    const beat = window.setInterval(() => {
      const v = videoOf(current.current)
      if (v && !v.paused && performance.now() >= applying.current) send()
    }, 4000)
    return () => {
      io.disconnect()
      root.removeEventListener("play", onMedia, true)
      root.removeEventListener("pause", onMedia, true)
      root.removeEventListener("seeked", onMedia, true)
      window.clearInterval(beat)
    }
  }, [active, posts, send])

  const act = async (action: "end" | "control", body?: unknown) => {
    try {
      const r = await fxApi<{ session: Session }>(`/sync/${id}/${action}`, { method: "POST", body })
      setSession((s) => (s ? { ...s, ...r.session } : r.session))
      if (action === "end") fx("sync-sair", "cancelar")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    }
  }

  const status = useMemo(() => {
    if (!session) return t("syncConnecting", "conectando")
    if (session.status === "ended") return t("syncEnded", "encerrado")
    if (session.status === "invited") return t("syncWaiting", "esperando aceitar")
    return peerOnline ? t("syncSynced", "sincronizado") : t("syncReconnecting", "reconectando")
  }, [session, peerOnline, t])

  if (error) return <p className="p-6 font-bold text-red-300">{error}</p>

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#0b0804] md:left-[80px]">
      {/* barra da sessão */}
      <div className="fl-sharp relative z-10 flex items-center gap-2 border-b-2 border-[#F2B705] bg-[#0b0804]/95 px-3 py-2">
        <div className="flex -space-x-2">
          {[other].filter(Boolean).map((u) => (
            <span key={u!.id_user} className="relative block h-8 w-8 overflow-hidden rounded-full border-2 border-[#F2B705] bg-zinc-800">
              {u!.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u!.avatar_url} alt="" className="h-full w-full object-cover" />
              )}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black uppercase tracking-wider text-[#F5F1E8]">
            {t("syncWith", "Feed sincronizado com @{u}").replace("{u}", other?.username || "—")}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#9A938A]">
            <motion.span
              className={"block h-2 w-2 " + (active && peerOnline ? "bg-[#3DDC97]" : session?.status === "ended" ? "bg-red-400" : "bg-[#F2B705]")}
              animate={active && peerOnline ? { scale: [1, 1.6, 1] } : { opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            {status}
            {active && <span>· {session.control === "shared" ? t("syncShared", "controle dividido") : isHost ? t("syncYouLead", "você conduz") : t("syncTheyLead", "@{u} conduz").replace("{u}", other?.username || "—")}</span>}
          </div>
        </div>
        {active && isHost && (
          <button
            onClick={() => act("control", { control: session.control === "shared" ? "host" : "shared" })}
            className="inline-flex h-9 items-center gap-1 border-2 border-black bg-[#15120E] px-2 text-[10px] font-black uppercase text-[#F5F1E8] shadow-[2px_2px_0_#000]"
            aria-label={t("syncToggleControl", "Trocar o controle")}
          >
            <Users className="h-4 w-4" />
          </button>
        )}
        {session?.status !== "ended" && (
          <button
            onClick={() => act("end")}
            className="inline-flex h-9 items-center gap-1 border-2 border-black bg-[#F2B705] px-2 text-[10px] font-black uppercase text-black shadow-[2px_2px_0_#000]"
          >
            <LogOut className="h-4 w-4" />
            {t("syncLeave", "Sair")}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!session ? (
          <div key="load" className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
          </div>
        ) : session.status === "invited" ? (
          <div key="wait" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <motion.div animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <Link2 className="h-14 w-14 text-[#F2B705]" />
            </motion.div>
            <p className="fl-display text-3xl text-[#F5F1E8]">
              {isHost ? t("syncWaitingFor", "Esperando @{u} aceitar").replace("{u}", other?.username || "—") : t("syncInvitedYou", "@{u} te chamou para ver o feed junto").replace("{u}", other?.username || "—")}
            </p>
            {left != null && <p className="text-sm font-bold text-[#9A938A]">{t("syncExpires", "O convite vence em {n} s").replace("{n}", String(left))}</p>}
            {!isHost && (
              <button
                onClick={async () => {
                  try {
                    const r = await fxApi<{ session: Session }>(`/sync/${id}/accept`, { method: "POST" })
                    setSession(r.session)
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
                  }
                }}
                className="inline-flex h-12 items-center gap-2 border-[3px] border-black bg-[#F2B705] px-6 font-black uppercase text-black shadow-[5px_5px_0_#000]"
              >
                {t("syncAccept", "Entrar junto")}
              </button>
            )}
          </div>
        ) : session.status === "ended" ? (
          <div key="end" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <motion.p className="fl-display text-3xl text-[#F5F1E8]" initial={{ opacity: 0, y: 12, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }}>
              {t("syncEndedTitle", "Sessão encerrada")}
            </motion.p>
            <button onClick={() => router.push("/feed")} className="inline-flex h-11 items-center border-[3px] border-black bg-[#F2B705] px-5 font-black uppercase text-black shadow-[4px_4px_0_#000]">
              {t("syncBackToFeed", "Voltar ao feed")}
            </button>
          </div>
        ) : (
          // Nada do tamanho da janela anima (regra 7): o contêiner entra seco.
          <div
            key="feed"
            ref={scrollRef}
            className="relative flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={canDrive ? undefined : { touchAction: "none" }}
          >
            {posts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#9A938A]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[470px]">
                {posts.map((p, i) => (
                  <div key={p.post_id} data-sync-index={i} className="flex min-h-full snap-start flex-col justify-center">
                    <PortfolioPostCard post={p} filters={FILTERS} commentsCount={p.comments_count ?? 0} onOpenComments={noop} onLikeChange={noop} />
                  </div>
                ))}
              </div>
            )}
            {!canDrive && (
              <div className="pointer-events-none fixed bottom-6 left-1/2 z-10 -translate-x-1/2 border-2 border-black bg-[#F2B705] px-3 py-1 text-[11px] font-black uppercase text-black shadow-[3px_3px_0_#000] md:ml-10">
                {t("syncFollowing", "Acompanhando @{u}").replace("{u}", other?.username || "—")}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
