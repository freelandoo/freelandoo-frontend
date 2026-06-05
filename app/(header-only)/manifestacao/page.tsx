"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ShareIconButton } from "@/components/share/share-icon-button"
import { PageShell, EmptyState, ErrorState } from "@/components/tabloide"

type ManifestationType = "motivational" | "emotion" | null

type Product = {
  id: string
  slug: string | null
  name: string
  type: ManifestationType
  headline: string | null
  description: string | null
  banner_url: string
  price_polens: number
  price_cents: number
  tag_label?: string | null
  tag_color?: string | null
}

// Pills da tag combinam com o gradiente escuro do overlay inferior.
const TAG_COLOR_CLASSES: Record<string, string> = {
  emerald: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
  amber:   "border-amber-300/40 bg-amber-500/15 text-amber-100",
  rose:    "border-rose-300/40 bg-rose-500/15 text-rose-100",
  sky:     "border-sky-300/40 bg-sky-500/15 text-sky-100",
  violet:  "border-violet-300/40 bg-violet-500/15 text-violet-100",
  primary: "border-amber-300/40 bg-amber-500/15 text-amber-100",
  zinc:    "border-zinc-200/40 bg-zinc-500/15 text-zinc-100",
  red:     "border-red-300/40 bg-red-500/15 text-red-100",
  blue:    "border-blue-300/40 bg-blue-500/15 text-blue-100",
  green:   "border-green-300/40 bg-green-500/15 text-green-100",
  yellow:  "border-yellow-300/40 bg-yellow-500/15 text-yellow-100",
  orange:  "border-orange-300/40 bg-orange-500/15 text-orange-100",
}

type OwnedRow = { product_id: string; is_active: boolean }
type Mine = {
  active?: { product_id?: string } | null
  owned?: OwnedRow[]
}

type Filter = "all" | "motivational" | "emotion" | "owned" | "not_owned"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "motivational", label: "Motivacionais" },
  { id: "emotion", label: "Emoções" },
  { id: "owned", label: "Comprados" },
  { id: "not_owned", label: "Não comprados" },
]

function typeLabel(type: ManifestationType): string {
  if (type === "motivational") return "Motivacional"
  if (type === "emotion") return "Emoção"
  return "Manifestação"
}

function fmtBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (cents || 0) / 100,
  )
}

/** Imagem do banner com fallback — se o arquivo não existir, não quebra a UI. */
function BannerImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(217,119,6,0.28),transparent_40%),linear-gradient(135deg,#18181b,#3f3f46)]">
        <Sparkles className="h-7 w-7 text-white/35" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover object-left transition duration-500 group-hover:scale-[1.03]"
    />
  )
}

export default function ManifestacaoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [mine, setMine] = useState<Mine | null>(null)
  const [polens, setPolens] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; title: string; message: string } | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadMine = useCallback(async () => {
    if (!token) return
    try {
      const [meRes, walletRes] = await Promise.all([
        fetch("/api/manifestations/me", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/polens/wallet", { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (meRes.ok) setMine(await meRes.json())
      if (walletRes.ok) {
        const w = await walletRes.json()
        setPolens(Number(w?.wallet?.balance ?? w?.balance ?? 0))
      }
    } catch {
      /* best-effort — a loja funciona mesmo sem o /me */
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/manifestations/products", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Não foi possível carregar a loja")
        if (!cancelled) setProducts(Array.isArray(data?.products) ? data.products : [])
        await loadMine()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [loadMine])

  // Retorno do checkout Stripe: o webhook desbloqueia; recarrega "owned".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") === "success") {
      window.history.replaceState(null, "", "/manifestacao")
      setFeedback({
        ok: true,
        title: "Pagamento confirmado",
        message:
          'Sua manifestação foi desbloqueada. Clique em "Usar no perfil" para aplicá-la.',
      })
      void loadMine()
    }
  }, [loadMine])

  const ownedIds = useMemo(
    () => new Set((mine?.owned || []).map((o) => o.product_id)),
    [mine],
  )
  const activeId = mine?.active?.product_id ?? null

  const previewProduct = useMemo(
    () => products.find((p) => p.id === previewId) ?? null,
    [products, previewId],
  )

  useEffect(() => {
    if (!previewId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [previewId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const owned = ownedIds.has(p.id)
      if (filter === "motivational" && p.type !== "motivational") return false
      if (filter === "emotion" && p.type !== "emotion") return false
      if (filter === "owned" && !owned) return false
      if (filter === "not_owned" && owned) return false
      if (q) {
        const haystack = `${p.name} ${p.slug || ""} ${p.headline || ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [products, ownedIds, filter, query])

  async function buy(product: Product) {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    setBusy(`buy:${product.id}`)
    try {
      const res = await fetch("/api/manifestations/checkout/polens", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Compra não concluída")
      await loadMine()
      setPreviewId(null)
      setFeedback({
        ok: true,
        title: "Tudo certo!",
        message: data?.message || "Manifestação desbloqueada com sucesso.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro na compra"
      setFeedback({
        ok: false,
        title: message.toLowerCase().includes("pólens") ? "Saldo insuficiente" : "Compra não concluída",
        message,
      })
    } finally {
      setBusy(null)
    }
  }

  async function buyStripe(product: Product) {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    setBusy(`stripe:${product.id}`)
    try {
      const res = await fetch("/api/manifestations/checkout/stripe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Não foi possível iniciar o pagamento")
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      throw new Error("Checkout indisponível")
    } catch (err) {
      setFeedback({
        ok: false,
        title: "Pagamento não iniciado",
        message: err instanceof Error ? err.message : "Erro no checkout",
      })
      setBusy(null)
    }
  }

  async function apply(product: Product) {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    setBusy(`apply:${product.id}`)
    try {
      const res = await fetch("/api/manifestations/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Não foi possível aplicar")
      await loadMine()
      setPreviewId(null)
      setFeedback({
        ok: true,
        title: "Manifestação aplicada",
        message: data?.message || "Pronto, ela já aparece no headcard do seu perfil.",
      })
    } catch (err) {
      setFeedback({
        ok: false,
        title: "Não foi possível aplicar",
        message: err instanceof Error ? err.message : "Erro ao aplicar",
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Sparkles className="h-3.5 w-3.5" />
            Banners para o seu perfil
          </span>
          <ShareIconButton path="/manifestacao" title="Loja de Manifestações no Freelandoo" />
          {token && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B705]/30 bg-[#F2B705]/12 px-3 py-1 text-xs font-bold text-[#F2B705]">
              <Coins className="h-3.5 w-3.5" />
              {polens == null ? "—" : polens.toLocaleString("pt-BR")} Poléns
              <Link href="/loja-polens" className="ml-1 underline underline-offset-2">
                comprar
              </Link>
            </span>
          )}
        </div>
        <h1 className="fl-display mt-5 max-w-[760px] text-5xl leading-[0.95] text-[#F5F1E8] md:text-7xl">
          Loja de Manifestações
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[#C9C2B6]">
          Desbloqueie banners de manifestação com Poléns ou cartão e aplique um deles no
          headcard do seu perfil. Depois de desbloqueada, ela fica sua para sempre.
        </p>
      </section>

      {/* Filtros + busca */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="mt-8 flex flex-col gap-3 border-y border-[#F5F1E8]/10 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[340px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A938A]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou estado"
              className="h-11 w-full rounded-md border-2 border-[#F5F1E8]/12 bg-[#1D1810] pl-10 pr-4 text-sm text-[#F5F1E8] placeholder:text-[#9A938A] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] outline-none transition focus:border-[#F2B705]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-10 shrink-0 rounded-md border-2 px-4 text-sm font-bold transition active:translate-x-[1px] active:translate-y-[1px]",
                  filter === f.id
                    ? "border-[#F2B705] bg-[#F2B705] text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]"
                    : "border-[#F5F1E8]/12 bg-[#1D1810] text-[#C9C2B6] hover:border-[#F5F1E8]/30",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estados */}
        {loading ? (
          <div className="grid gap-5 py-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="overflow-hidden rounded-md border-2 border-[#F5F1E8]/10 bg-[#1D1810]">
                <div className="aspect-[16/7] animate-pulse bg-[#F5F1E8]/8" />
                <div className="space-y-2 border-t-2 border-[#F5F1E8]/10 p-3">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#F5F1E8]/8" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#F5F1E8]/8" />
                  <div className="h-4 w-1/4 animate-pulse rounded bg-[#F5F1E8]/8" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16">
            <ErrorState description={error} onRetry={() => window.location.reload()} />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title={products.length === 0 ? "Sem manifestações" : "Nada encontrado"}
              description={
                products.length === 0
                  ? "Nenhuma manifestação disponível no momento."
                  : "Nenhuma manifestação encontrada para esse filtro."
              }
            />
          </div>
        ) : (
          <div className="grid gap-5 py-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p, index) => {
              const owned = ownedIds.has(p.id)
              const isActive = activeId === p.id
              return (
                <article
                  key={p.id}
                  onClick={() => setPreviewId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setPreviewId(p.id)
                    }
                  }}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-md border-2 border-[#F5F1E8]/12 bg-[#1D1810] shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:border-[#F2B705] hover:shadow-[8px_8px_0_0_#F2B705]"
                  style={{
                    animation: `fade-in .42s cubic-bezier(.16,1,.3,1) both ${index * 45}ms`,
                  }}
                >
                  {/* Banner LIMPO no topo (a arte já traz o nome) */}
                  <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#141009]">
                    <BannerImage src={p.banner_url} alt={p.name} />
                    {isActive && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-950/85 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur">
                        <CheckCircle2 className="h-3 w-3" />
                        Ativo
                      </span>
                    )}
                  </div>

                  {/* Faixa de dados embaixo (fundo escuro, separada do banner) */}
                  <div className="flex flex-1 flex-col gap-2 border-t-2 border-[#F5F1E8]/10 bg-[#15100A] p-3">
                    <span
                      className={cn(
                        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        p.type === "motivational"
                          ? "border-amber-300/30 bg-amber-500/12 text-amber-200"
                          : "border-sky-300/30 bg-sky-500/12 text-sky-200",
                      )}
                    >
                      {typeLabel(p.type)}
                    </span>
                    <h3 className="fl-display text-lg leading-none text-[#F5F1E8]">{p.name}</h3>

                    {p.tag_label && (
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          TAG_COLOR_CLASSES[p.tag_color || "emerald"] ?? TAG_COLOR_CLASSES.emerald,
                        )}
                      >
                        <BadgeCheck className="h-2.5 w-2.5" />
                        {p.tag_label}
                      </span>
                    )}

                    {p.headline && (
                      <p className="line-clamp-1 text-xs font-medium text-[#9A938A]">{p.headline}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#F5F1E8]/8 pt-2">
                      <span className="fl-display text-base text-[#F2B705]">
                        {p.price_cents > 0
                          ? fmtBRL(p.price_cents)
                          : p.price_polens > 0
                            ? `${p.price_polens.toLocaleString("pt-BR")} P`
                            : "Grátis"}
                      </span>
                      {owned && !isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F5F1E8]/15 bg-[#F5F1E8]/8 px-2 py-0.5 text-[10px] font-medium text-[#C9C2B6]">
                          <BadgeCheck className="h-3 w-3" />
                          Comprado
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal de preview + compra */}
      {previewProduct && (() => {
        const p = previewProduct
        const owned = ownedIds.has(p.id)
        const isActive = activeId === p.id
        return (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}
            role="presentation"
          >
            <div
              className="fl-card relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Preview de ${p.name}`}
            >
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#0b0804]/55 text-white backdrop-blur transition hover:bg-[#0b0804]/75"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Preview do banner — proporcao 16:5 (formato real do headcard) */}
              <div className="group relative aspect-[16/5] w-full overflow-hidden bg-[#1D1810]">
                <BannerImage src={p.banner_url} alt={p.name} />
              </div>

              <div className="flex flex-col gap-3 p-5">
                <div>
                  <span
                    className={cn(
                      "mb-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      p.type === "motivational"
                        ? "border-amber-400/40 bg-amber-400/15 text-amber-700"
                        : "border-sky-400/40 bg-sky-400/15 text-sky-700",
                    )}
                  >
                    {typeLabel(p.type)}
                  </span>
                  <h3 className="fl-display text-2xl text-[var(--fl-ink)]">{p.name}</h3>
                  {p.headline && (
                    <p className="mt-1 text-sm font-bold text-[#3a352d]">{p.headline}</p>
                  )}
                  {p.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-[#5b554b]">{p.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[#0B0B0D]/10 pt-3">
                  {p.price_cents > 0 && (
                    <span className="text-2xl font-black tracking-tight text-[#0B0B0D]">
                      {fmtBRL(p.price_cents)}
                    </span>
                  )}
                  {p.price_polens > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#9c6e2a]">
                      <Coins className="h-4 w-4" />
                      ou {p.price_polens.toLocaleString("pt-BR")} Poléns
                    </span>
                  )}
                  {p.price_cents === 0 && p.price_polens === 0 && (
                    <span className="text-2xl font-black tracking-tight text-[#15803d]">Grátis</span>
                  )}
                </div>

                <div className="mt-1 space-y-2">
                  {isActive ? (
                    <button type="button" disabled className="inline-flex w-full items-center justify-center rounded-full bg-[#16a34a] py-3 text-sm font-bold text-white opacity-90">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aplicada no seu perfil
                    </button>
                  ) : owned ? (
                    <button
                      type="button"
                      onClick={() => apply(p)}
                      disabled={busy != null}
                      className="fl-btn-ink inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-bold disabled:opacity-60"
                    >
                      {busy === `apply:${p.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="mr-2 h-4 w-4" />
                      )}
                      Usar no perfil
                    </button>
                  ) : (
                    <>
                      {p.price_cents > 0 && (
                        <button
                          type="button"
                          onClick={() => buyStripe(p)}
                          disabled={busy != null}
                          className="fl-btn-gold inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-bold disabled:opacity-60"
                        >
                          {busy === `stripe:${p.id}` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                          )}
                          Comprar · {fmtBRL(p.price_cents)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => buy(p)}
                        disabled={busy != null}
                        className="fl-btn-card inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60"
                      >
                        {busy === `buy:${p.id}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Coins className="mr-2 h-4 w-4" />
                        )}
                        {p.price_polens > 0
                          ? `Comprar · ${p.price_polens.toLocaleString("pt-BR")} Poléns`
                          : "Resgatar grátis"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Feedback de compra/aplicação */}
      {feedback && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
          onClick={() => setFeedback(null)}
        >
          <div
            className="fl-card w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full text-white",
                feedback.ok ? "bg-[#16a34a]" : "bg-[#F2B705] !text-[#1A1505]",
              )}
            >
              {feedback.ok ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Coins className="h-5 w-5" />
              )}
            </div>
            <h3 className="fl-display mt-4 text-2xl text-[var(--fl-ink)]">{feedback.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#5b554b]">{feedback.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              {!feedback.ok && feedback.title === "Saldo insuficiente" && (
                <Link
                  href="/loja-polens"
                  className="fl-btn-card inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                >
                  Comprar Poléns
                </Link>
              )}
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="fl-btn-gold inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
