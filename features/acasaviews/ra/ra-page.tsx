"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowRight, Box, Crown, Lock, ScanLine, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { realityFontVars } from "@/features/acasaviews/components/reality/fonts"
import { COLISEU, HOLOGRAMS, VAULT_SLOTS, hologramByKey, type Hologram } from "./catalog"
import type { ArSession } from "./ar-session"
import type { SlotTurntable } from "./slot-turntable"

/**
 * Aba RA da Casa Views.
 *
 * Fluxo: INICIAR RA → câmera reconhece a figura → holograma rosa → COLECIONAR →
 * modal com o preço (vem do backend) → checkout do Mercado Pago → volta com
 * `?session_id=` → a página pergunta ao backend até o webhook confirmar →
 * o holograma aparece no pedestal do Coliseu, a linha sobe e ele ganha a cor da
 * textura → entra na vitrine.
 *
 * ⚠️ "Pago" é SEMPRE o que o backend diz (webhook), nunca o parâmetro de retorno
 * do Mercado Pago na URL.
 */

type Owned = { key: string; collected_at: string }
type Priced = { key: string; name: string; price_cents: number }
type Phase =
  | { kind: "idle" }
  | { kind: "confirming"; item: Hologram }
  | { kind: "materializing"; item: Hologram }
  | { kind: "pending"; item: Hologram }
  | { kind: "failed"; message: string }

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".")
const priceLabel = (cents: number) => (cents === 0 ? "Grátis" : brl(cents))
const pad2 = (n: number) => String(n).padStart(2, "0")

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api/casa/holograms${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(data?.error || "Falha ao falar com o servidor."), { status: res.status })
  return data as T
}

const STAGE_TEXT = {
  hologram: "Confirmado. Materializando…",
  solidifying: "A linha sobe: ele ganha as cores.",
  solid: "Ele é seu.",
  taking: "Guardando na sua vitrine…",
} as const

export function RaPage() {
  const [reduced, setReduced] = useState(false)
  const [owned, setOwned] = useState<Owned[] | null>(null)
  const [prices, setPrices] = useState<Priced[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [arBusy, setArBusy] = useState(false)
  const [arError, setArError] = useState<string | null>(null)
  const [buying, setBuying] = useState<Hologram | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [stage, setStage] = useState<keyof typeof STAGE_TEXT>("hologram")
  const [notice, setNotice] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Hologram | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const arRef = useRef<ArSession | null>(null)
  const turntableRef = useRef<SlotTurntable | null>(null)
  const vaultRef = useRef<HTMLElement | null>(null)

  const pauseTurntable = useCallback((v: boolean) => turntableRef.current?.setPaused(v), [])
  const closeViewer = useCallback(() => setViewing(null), [])

  const ownedKeys = new Set((owned || []).map((o) => o.key))
  const ownedOf = (key: string) => owned?.find((o) => o.key === key) || null
  const priceOf = (key: string) => prices.find((p) => p.key === key)?.price_cents ?? null

  const load = useCallback(async () => {
    try {
      const data = await api<{ holograms: Priced[]; owned: Owned[]; is_admin?: boolean }>("")
      setPrices(data.holograms)
      setIsAdmin(!!data.is_admin)
      setOwned(data.owned)
      setLoadError(null)
      return data.owned
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar a sua vitrine.")
      setOwned((o) => o ?? [])
      return null
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    load()
  }, [load])

  // ── retorno do Mercado Pago ──────────────────────────────────────────────
  // A URL é lida UMA vez e limpa: no modo estrito o efeito roda duas vezes, e a
  // segunda não acharia mais o session_id (ficava preso em "confirmando").
  const returnRef = useRef<{ session: string | null; key: string | null } | null>(null)
  useEffect(() => {
    if (!returnRef.current) {
      const q = new URLSearchParams(window.location.search)
      returnRef.current = { session: q.get("session_id"), key: q.get("holograma") }
      if (returnRef.current.key) window.history.replaceState(null, "", window.location.pathname)
    }
    const { session, key } = returnRef.current
    if (key === "cancelado") {
      setNotice("Pagamento cancelado. O holograma continua esperando por você na RA.")
      return
    }
    const item = hologramByKey(key)
    if (!session || !item) return
    setPhase({ kind: "confirming", item })
    let stop = false
    const started = Date.now()
    const poll = async () => {
      while (!stop) {
        try {
          const r = await api<{ status: string; paid: boolean }>(`/session/${encodeURIComponent(session)}`)
          if (r.paid) {
            setPhase({ kind: "materializing", item })
            return
          }
          if (r.status === "expired" || r.status === "refunded") {
            setPhase({ kind: "failed", message: "Este pagamento não foi aprovado. Nada foi cobrado pelo holograma." })
            return
          }
        } catch (e) {
          if ((e as { status?: number }).status === 404) {
            setPhase({ kind: "failed", message: "Não encontramos esta compra na sua conta." })
            return
          }
        }
        if (Date.now() - started > 120_000) {
          setPhase({ kind: "pending", item })
          return
        }
        await new Promise((r) => setTimeout(r, 2500))
      }
    }
    poll()
    return () => {
      stop = true
    }
  }, [])

  // ── materialização no pedestal ───────────────────────────────────────────
  const matHost = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (phase.kind !== "materializing" || !matHost.current) return
    const item = phase.item
    const host = matHost.current
    const abort = new AbortController()
    turntableRef.current?.setPaused(true)
    import("./materialize")
      .then(({ materialize }) =>
        materialize(host, item, { reduced, signal: abort.signal, onStage: (s) => !abort.signal.aborted && setStage(s) }),
      )
      // sem WebGL a cena falha; o holograma já é da pessoa, então segue para a vitrine
      .catch(() => {})
      .then(async () => {
        if (abort.signal.aborted) return
        await load()
        setFresh(item.key)
        setPhase({ kind: "idle" })
        requestAnimationFrame(() => vaultRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }))
      })
    return () => abort.abort()
  }, [phase, reduced, load])

  // ── vitrine: personagens girando nos slots (um renderer para todos) ──────
  useEffect(() => {
    if (!owned?.length) return
    let cancelled = false
    ;(async () => {
      try {
        const { SlotTurntable } = await import("./slot-turntable")
        if (cancelled) return
        turntableRef.current ??= new SlotTurntable(reduced)
        const tt = turntableRef.current
        tt.clear()
        document.querySelectorAll<HTMLCanvasElement>("canvas[data-cv-model]").forEach((cnv) => {
          const item = hologramByKey(cnv.dataset.cvModel)
          const slot = cnv.closest(".cv-slot")
          if (!item || !slot) return
          tt.add(cnv, item.model, item.faceFront, () => slot.classList.add("is-3d")).catch(() => {})
        })
      } catch {
        /* sem WebGL: fica a arte 2D do card */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [owned, reduced])

  useEffect(
    () => () => {
      turntableRef.current?.dispose()
      turntableRef.current = null
      arRef.current?.close()
    },
    [],
  )

  // ── RA ───────────────────────────────────────────────────────────────────
  async function startAr(item: Hologram = HOLOGRAMS[HOLOGRAMS.length - 1]) {
    if (arBusy) return
    setArBusy(true)
    setArError(null)
    setNotice(null)
    turntableRef.current?.setPaused(true)
    try {
      const { openArSession } = await import("./ar-session")
      arRef.current = await openArSession({
        item,
        owned: ownedKeys.has(item.key),
        reduced,
        fontClass: realityFontVars,
        onCollect: () => {
          setCheckoutError(null)
          setBuying(item)
          arRef.current?.setBlocked(true)
        },
        onOwnedTap: () => setViewing(item),
        onClose: () => {
          arRef.current = null
          setArBusy(false)
          setBuying(null)
          turntableRef.current?.setPaused(false)
        },
      })
    } catch {
      setArError("Não foi possível iniciar a RA neste aparelho. Tente no celular, pelo navegador padrão.")
      setArBusy(false)
      turntableRef.current?.setPaused(false)
    }
  }

  function closeBuy() {
    if (checkoutBusy) return
    setBuying(null)
    arRef.current?.setBlocked(false)
  }

  async function pay() {
    if (!buying) return
    setCheckoutBusy(true)
    setCheckoutError(null)
    try {
      const item = buying
      const r = await api<{ checkout_url?: string; free?: boolean }>("/checkout", {
        method: "POST",
        body: JSON.stringify({ key: item.key }),
      })
      if (r.free) {
        // admin: o backend já gravou a compra paga a R$0 — materializa direto
        arRef.current?.close()
        setBuying(null)
        setCheckoutBusy(false)
        setPhase({ kind: "materializing", item })
        return
      }
      if (!r.checkout_url) throw new Error("Não foi possível abrir o pagamento.")
      arRef.current?.close()
      window.location.href = r.checkout_url
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Erro inesperado.")
      setCheckoutBusy(false)
    }
  }

  const have = HOLOGRAMS.filter((h) => ownedKeys.has(h.key)).length
  const art = HOLOGRAMS[HOLOGRAMS.length - 1]

  return (
    <div className="rv rv-page-in">
      {/* ═══════════════ HERÓI ═══════════════ */}
      <section className="rv-grid rv-noise relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <span className="rv-streak -left-40 top-24 h-24 w-[520px]" />
          <span className="rv-streak -right-44 top-10 h-20 w-[520px]" />
          <span className="rv-streak rv-streak-pink -right-16 top-[360px] h-3 w-[360px]" />
          <span className="rv-streak rv-streak-pink -left-10 top-[520px] h-2 w-[300px]" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden md:block">
          <span className="rv-plus left-8 top-8" />
          <span className="rv-plus left-[44%] top-[46%]" />
          <span className="rv-plus right-10 top-[50%]" />
        </div>

        <div className="relative z-[2] mx-auto grid max-w-[1600px] gap-10 px-4 pb-12 pt-8 md:px-8 md:pt-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <div className="min-w-0">
            <div className="relative [container-type:inline-size]">
              <Crown
                aria-hidden
                className="absolute -left-3 -top-4 hidden h-7 w-7 -rotate-12 fill-[var(--rv-pink)] text-[var(--rv-pink)] lg:block"
              />
              <h1 className="rv-wide rv-grunge whitespace-nowrap text-[34cqw] leading-[0.8] md:text-[26cqw]">RA</h1>
            </div>
            <div className="mt-4 flex items-center gap-1">
              <p className="rv-arrowbar rv-type bg-[var(--rv-pink)] py-1.5 pl-3 pr-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--rv-bg)] md:text-[15px]">
                Hologramas da casa. Colecione.
              </p>
              <span aria-hidden className="rv-type text-xl font-bold text-[var(--rv-pink)]">
                »
              </span>
            </div>
            <p className="rv-type mt-4 max-w-[52ch] text-[13px] uppercase leading-relaxed tracking-[0.06em] md:text-[15px]">
              Aponte a câmera para a figura do lutador. Ele aparece em holograma na sua frente — colecione e leve para a sua
              vitrine.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => startAr()} disabled={arBusy} className="rv-btn rv-glow-box px-7 py-4 text-[13px]">
                <ScanLine className="h-5 w-5" /> {arBusy ? "Abrindo a câmera…" : "Iniciar RA"}
              </button>
              <a href="#vitrine" className="rv-btn rv-btn-ghost px-6 py-4">
                Minha vitrine{" "}
                <span className="rv-type">
                  {have}/{VAULT_SLOTS}
                </span>
              </a>
            </div>
            <p className="rv-type mt-4 max-w-[60ch] text-[11px] uppercase leading-relaxed text-[var(--rv-faint)]">
              Usa a câmera do celular; nenhuma imagem é gravada. {isAdmin
                ? "Administrador: você coleciona de graça."
                : `Cada holograma custa ${brl(priceOf(art.key) ?? 199)}, pago uma vez pelo Mercado Pago.`}
            </p>
            {arError && (
              <p role="alert" className="rv-type mt-3 text-[12px] uppercase text-[var(--rv-pink-ink)]">
                {arError}
              </p>
            )}
            {notice && (
              <p role="status" className="rv-type mt-3 border-l-2 border-[var(--rv-pink)] pl-3 text-[12px] uppercase">
                {notice}
              </p>
            )}
          </div>

          {/* o alvo: a figura que a câmera reconhece */}
          <figure className="rv-frame rv-frame-pink self-start [--c:22px]">
            <div className="rv-frame-in">
              <div className="flex items-center justify-between border-b border-[var(--rv-line)] px-4 py-2.5">
                <span className="rv-type text-[10px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">alvo // nº {art.number}</span>
                <span className="rv-type text-[10px] uppercase tracking-[0.2em] text-[var(--rv-faint)]">aponte aqui</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art.art} alt={`Figura de ${art.name}: aponte a câmera para ela`} className="block w-full" />
              <figcaption className="rv-type px-4 py-3 text-[10px] uppercase leading-relaxed text-[var(--rv-muted)]">
                Impressa, num cartaz ou noutra tela: a câmera reconhece a figura.{" "}
                <a href={art.art.replace(".webp", "-alvo.jpg")} target="_blank" rel="noreferrer" className="rv-link text-[var(--rv-white)]">
                  Abrir em tela cheia ›
                </a>
              </figcaption>
            </div>
          </figure>
        </div>
      </section>

      {/* ═══════════════ VITRINE ═══════════════ */}
      <section id="vitrine" ref={vaultRef} className="relative scroll-mt-20 border-t border-[var(--rv-line)]">
        <div className="mx-auto max-w-[1600px] px-4 py-12 md:px-8 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="rv-type text-[11px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">coleção // casa views</p>
              <h2 className="rv-wide rv-grunge mt-2 text-6xl leading-[0.85] md:text-7xl">Sua vitrine</h2>
            </div>
            <p className="rv-type text-[13px] uppercase tracking-[0.14em]">
              <b className="text-[var(--rv-pink)]">{have}</b>/{VAULT_SLOTS} coletados
            </p>
          </div>
          {loadError && (
            <p role="alert" className="rv-type mt-4 text-[12px] uppercase text-[var(--rv-pink-ink)]">
              {loadError}
            </p>
          )}

          <ol className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:gap-8">
            {Array.from({ length: VAULT_SLOTS }, (_, i) => {
              const item = HOLOGRAMS[i]
              const own = item ? ownedOf(item.key) : null
              const num = item?.number ?? String(i + 1).padStart(3, "0")
              return (
                <li key={i} className="rv-page-in" style={{ animationDelay: `${i * 70}ms` }}>
                  {item && own ? (
                    <button
                      type="button"
                      onClick={() => setViewing(item)}
                      aria-label={`Ver ${item.name} no pedestal`}
                      className={`cv-slot rv-frame rv-frame-pink group block w-full text-left [--c:20px] ${fresh === item.key ? "is-new" : ""}`}
                    >
                      <SlotBody n={i} num={num}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.art} alt="" className="cv-slot-art absolute inset-0 h-full w-full object-contain p-4 transition-opacity" />
                        <canvas className="cv-slot-3d" data-cv-model={item.key} aria-hidden />
                        {fresh === item.key && (
                          <span className="rv-type absolute right-3 top-3 bg-[var(--rv-pink)] px-2 py-1 text-[10px] font-bold tracking-[0.16em]">
                            NOVO
                          </span>
                        )}
                        <SlotMeta num={num} name={item.name} cta="Ver no Coliseu ›" />
                      </SlotBody>
                    </button>
                  ) : item ? (
                    <button
                      type="button"
                      onClick={() => startAr(item)}
                      aria-label={`Coletar ${item.name} na RA`}
                      className="cv-slot rv-frame group block w-full text-left [--c:20px]"
                    >
                      <SlotBody n={i} num={num}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.art}
                          alt=""
                          className="rv-duo absolute inset-0 h-full w-full object-contain p-4 opacity-50 transition-opacity group-hover:opacity-80"
                        />
                        <span className="rv-duo-tint" />
                        <SlotMeta num={num} name="Disponível agora" cta={`Coletar na RA · ${priceLabel(priceOf(item.key) ?? 199)} ›`} />
                      </SlotBody>
                    </button>
                  ) : (
                    <div className="cv-slot rv-frame block [--c:20px] [--frame:rgba(244,244,240,0.2)]">
                      <SlotBody n={i} num={num}>
                        <span aria-hidden className="absolute inset-0 grid place-items-center">
                          <Lock className="h-10 w-10 text-[var(--rv-faint)]" strokeWidth={1.25} />
                        </span>
                        <SlotMeta num={num} name="???" cta="Próximo drop" muted />
                      </SlotBody>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* ═══════════════ PORTAIS ═══════════════ */}
      {mounted && buying &&
        createPortal(
          <BuyModal
            item={buying}
            price={priceOf(buying.key)}
            busy={checkoutBusy}
            error={checkoutError}
            onClose={closeBuy}
            onPay={pay}
          />,
          document.body,
        )}

      {mounted && viewing &&
        createPortal(
          <Pedestal item={viewing} own={ownedOf(viewing.key)} reduced={reduced} onClose={closeViewer} pause={pauseTurntable} />,
          document.body,
        )}

      {mounted && phase.kind !== "idle" &&
        createPortal(
          <div className={`cvx rv-tokens ${realityFontVars}`} style={{ position: "fixed", inset: 0, zIndex: 100 }}>
            <div className="cvx-stage" style={{ backgroundImage: `url("${COLISEU.src}")` }}>
              <div ref={matHost} className="absolute inset-0" />
              <div className="cvx-ui flex flex-col items-center justify-end px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] text-center text-[var(--rv-white)]">
                {phase.kind === "confirming" && (
                  <>
                    <span aria-hidden className="mb-5 h-14 w-14 animate-spin rounded-full border-2 border-[rgba(255,0,122,0.25)] border-t-[var(--rv-pink)]" />
                    <p className="rv-type text-[13px] uppercase tracking-[0.16em]" role="status">
                      Confirmando o pagamento no Mercado Pago…
                    </p>
                  </>
                )}
                {phase.kind === "materializing" && (
                  <>
                    <p className="rv-type text-[11px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">
                      nº {phase.item.number}{" // "}{phase.item.rarity}
                    </p>
                    <p className="rv-wide mt-2 text-4xl leading-[0.9] md:text-6xl">{phase.item.name}</p>
                    <p className="rv-type mt-3 text-[12px] uppercase tracking-[0.14em]" role="status">
                      {STAGE_TEXT[stage]}
                    </p>
                  </>
                )}
                {(phase.kind === "pending" || phase.kind === "failed") && (
                  <div className="max-w-md border border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.85)] p-6">
                    <p className="rv-type text-[13px] uppercase leading-relaxed tracking-[0.08em]" role="alert">
                      {phase.kind === "pending"
                        ? "O Mercado Pago ainda está confirmando o pagamento. Assim que ele cair, o holograma aparece na sua vitrine — pode voltar mais tarde."
                        : phase.message}
                    </p>
                    <button
                      type="button"
                      className="rv-btn mt-5"
                      onClick={() => {
                        setPhase({ kind: "idle" })
                        load()
                      }}
                    >
                      Voltar à vitrine
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function SlotBody({ n, num, children }: { n: number; num: string; children: ReactNode }) {
  return (
    <div className="rv-frame-in relative aspect-[3/4] w-full bg-[radial-gradient(ellipse_at_50%_80%,rgba(255,0,122,0.16),transparent_65%)]">
      <span className="rv-wide absolute left-3 top-2 z-[1] bg-[var(--rv-bg)] px-1 text-2xl leading-none md:text-3xl" aria-hidden>
        {pad2(n + 1)}
      </span>
      <span className="sr-only">Nº {num}</span>
      {children}
    </div>
  )
}

function SlotMeta({ num, name, cta, muted }: { num: string; name: string; cta: string; muted?: boolean }) {
  return (
    <span className="absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-0.5 bg-gradient-to-t from-[rgba(5,5,5,0.95)] via-[rgba(5,5,5,0.7)] to-transparent px-3 pb-3 pt-10">
      <span className="rv-type text-[10px] uppercase tracking-[0.18em] text-[var(--rv-faint)]">Nº {num}</span>
      <b className={`rv-display pr-4 text-xl leading-[0.95] md:text-2xl ${muted ? "text-[var(--rv-faint)]" : ""}`}>{name}</b>
      <span className={`rv-type text-[10px] uppercase tracking-[0.14em] ${muted ? "text-[var(--rv-faint)]" : "text-[var(--rv-pink-ink)]"}`}>
        {cta}
      </span>
    </span>
  )
}

function BuyModal({
  item,
  price,
  busy,
  error,
  onClose,
  onPay,
}: {
  item: Hologram
  price: number | null
  busy: boolean
  error: string | null
  onClose: () => void
  onPay: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className={`rv-tokens ${realityFontVars} fixed inset-0 grid place-items-end md:place-items-center`} style={{ zIndex: 100 }}>
      <button type="button" aria-label="Fechar" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/70" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-buy-title"
        className="rv-page-in relative w-full border-t-2 border-[var(--rv-pink)] bg-[var(--rv-bg)] text-[var(--rv-white)] md:w-[460px] md:border-2"
      >
        <header className="flex items-center justify-between border-b border-[var(--rv-line-strong)] px-5 py-4">
          <span id="cv-buy-title" className="rv-type flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]">
            <Box className="h-4 w-4 text-[var(--rv-pink)]" /> Colecionar holograma
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 items-center justify-center border border-[var(--rv-line-strong)] hover:border-[var(--rv-pink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="grid grid-cols-[120px_1fr] gap-5 px-5 py-5">
          <div className="relative overflow-hidden border border-[var(--rv-line-strong)] bg-[radial-gradient(ellipse_at_50%_80%,rgba(255,0,122,0.3),transparent_70%)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.art} alt={item.name} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="rv-type text-[10px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">
              nº {item.number}{" // "}{item.rarity}
            </p>
            <p className="rv-wide mt-1 text-2xl leading-[0.95]">{item.name}</p>
            <p className="rv-type mt-1 text-[11px] uppercase text-[var(--rv-muted)]">{item.title}</p>
            <p className="rv-display mt-4 text-5xl text-[var(--rv-pink)]">{price != null ? priceLabel(price) : "—"}</p>
          </div>
        </div>
        <div className="space-y-3 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
          <p className="rv-type text-[11px] uppercase leading-relaxed text-[var(--rv-muted)]">
            {price === 0
              ? "Cortesia de administrador: sem pagamento. O holograma ganha as cores e entra na sua vitrine."
              : "Pagamento único pelo Mercado Pago. Confirmado o pagamento, o holograma ganha as cores e entra na sua vitrine."}
          </p>
          {error && (
            <p role="alert" className="rv-type text-[12px] uppercase text-[var(--rv-pink-ink)]">
              {error}
            </p>
          )}
          <button type="button" onClick={onPay} disabled={busy || price == null} className="rv-btn w-full py-4 text-[13px]">
            {price === 0
              ? busy
                ? "Colecionando…"
                : "Colecionar grátis"
              : busy
                ? "Abrindo o Mercado Pago…"
                : `Pagar ${price != null ? brl(price) : ""} com Mercado Pago`}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function Pedestal({
  item,
  own,
  reduced,
  onClose,
  pause,
}: {
  item: Hologram
  own: Owned | null
  reduced: boolean
  onClose: () => void
  pause: (v: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let viewer: import("./pedestal-viewer").PedestalViewer | null = null
    let alive = true
    pause(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    import("./pedestal-viewer")
      .then(({ PedestalViewer }) => {
        if (!alive) return
        viewer = new PedestalViewer(canvas, reduced)
        return viewer.show(item.model, item.faceFront)
      })
      .catch(() => alive && setFailed(true))
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => {
      alive = false
      viewer?.dispose()
      pause(false)
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [item, reduced, onClose, pause])

  return (
    <div
      className={`cvx rv-tokens ${realityFontVars}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cv-ped-name"
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
    >
      <div className="cvx-stage" style={{ backgroundImage: `url("${COLISEU.src}")` }}>
        <canvas ref={canvasRef} aria-label="Personagem em 3D. Arraste para girar." />
        <div className="cvx-ui text-[var(--rv-white)]">
          <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] md:px-8">
            <button
              type="button"
              onClick={onClose}
              className="rv-type border border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.6)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] hover:border-[var(--rv-pink)]"
            >
              ‹ Vitrine
            </button>
            {own && (
              <span className="rv-type text-[10px] uppercase tracking-[0.16em] text-[var(--rv-muted)]">
                Coletado em {fmtDate(own.collected_at)}
              </span>
            )}
          </header>
          <div className="absolute bottom-0 left-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] md:px-8 md:pb-10">
            <p className="rv-type text-[11px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">
              nº {item.number}{" // "}{item.rarity}
            </p>
            <h2 id="cv-ped-name" className="rv-wide mt-2 text-4xl leading-[0.9] md:text-6xl">
              {item.name}
            </h2>
            <p className="rv-type mt-2 text-[12px] uppercase tracking-[0.1em] text-[var(--rv-muted)]">
              {failed ? "Não foi possível abrir o 3D neste aparelho." : item.title}
            </p>
          </div>
          <p className="rv-type pointer-events-none absolute bottom-6 right-4 hidden text-[10px] uppercase tracking-[0.2em] text-[var(--rv-faint)] md:block md:right-8">
            Toque e arraste para girar
          </p>
        </div>
      </div>
    </div>
  )
}
