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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ShareIconButton } from "@/components/share/share-icon-button"

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
      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
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
      setFeedback({
        ok: true,
        title: "Manifestação aplicada",
        message: data?.message || "Pronto — ela já aparece no headcard do seu perfil.",
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
    <main className="min-h-[100dvh] bg-[#f8faf9] text-zinc-950">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Banners para o seu perfil
          </span>
          <ShareIconButton path="/manifestacao" title="Loja de Manifestações no Freelandoo" />
          {token && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/25 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <Coins className="h-3.5 w-3.5" />
              {polens == null ? "—" : polens.toLocaleString("pt-BR")} Poléns
              <Link href="/loja-polens" className="ml-1 underline underline-offset-2">
                comprar
              </Link>
            </span>
          )}
        </div>
        <h1 className="mt-6 max-w-[760px] text-4xl font-semibold leading-none tracking-tight md:text-6xl">
          Loja de Manifestações
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-zinc-600">
          Desbloqueie banners de manifestação com Poléns ou cartão e aplique um deles no
          headcard do seu perfil. Depois de desbloqueada, ela fica sua para sempre.
        </p>
      </section>

      {/* Filtros + busca */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="mt-8 flex flex-col gap-3 border-y border-zinc-200 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[340px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou estado"
              className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm transition active:scale-[0.98]",
                  filter === f.id
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400",
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
              <div key={i} className="aspect-[9/16] animate-pulse rounded-[1.5rem] bg-zinc-200" />
            ))}
          </div>
        ) : error ? (
          <div className="grid place-items-center gap-3 py-20 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="rounded-full"
            >
              Tentar de novo
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="grid place-items-center gap-2 py-20 text-center">
            <Sparkles className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              {products.length === 0
                ? "Nenhuma manifestação disponível no momento."
                : "Nenhuma manifestação encontrada para esse filtro."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 py-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p, index) => {
              const owned = ownedIds.has(p.id)
              const isActive = activeId === p.id
              return (
                <article
                  key={p.id}
                  className="group relative aspect-[9/16] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-900 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.45)] transition hover:border-zinc-300"
                  style={{
                    animation: `fade-in .42s cubic-bezier(.16,1,.3,1) both ${index * 45}ms`,
                  }}
                >
                  <div className="absolute inset-0">
                    <BannerImage src={p.banner_url} alt={p.name} />
                  </div>

                  {/* Gradiente pra legibilidade do overlay inferior */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-zinc-950/92 via-zinc-950/65 to-transparent" />

                  {isActive && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-950/85 px-2.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ativo
                    </span>
                  )}

                  <span
                    className={cn(
                      "absolute left-3 top-3 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur",
                      p.type === "motivational"
                        ? "border-amber-300/40 bg-amber-50/90 text-amber-800"
                        : "border-sky-300/40 bg-sky-50/90 text-sky-800",
                    )}
                  >
                    {typeLabel(p.type)}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 text-white">
                    <h3 className="truncate text-lg font-semibold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{p.name}</h3>
                    {p.headline && (
                      <p className="line-clamp-1 text-xs font-medium text-white/85">{p.headline}</p>
                    )}
                    {p.description && (
                      <p className="line-clamp-2 text-[11px] text-white/65">{p.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-amber-300">
                        <Coins className="h-3.5 w-3.5" />
                        {p.price_polens > 0
                          ? `${p.price_polens.toLocaleString("pt-BR")} Poléns`
                          : "Grátis"}
                      </span>
                      {p.price_cents > 0 && (
                        <span className="text-white/70">· {fmtBRL(p.price_cents)} cartão</span>
                      )}
                    </div>

                    <div className="mt-1 space-y-1.5">
                      {isActive ? (
                        <Button
                          disabled
                          size="sm"
                          className="w-full rounded-full bg-emerald-500/90 text-white"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Aplicada
                        </Button>
                      ) : owned ? (
                        <Button
                          onClick={() => apply(p)}
                          disabled={busy != null}
                          size="sm"
                          className="w-full rounded-full bg-white text-zinc-950 hover:bg-amber-100 active:scale-[0.98]"
                        >
                          {busy === `apply:${p.id}` ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Usar no perfil
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => buy(p)}
                            disabled={busy != null}
                            size="sm"
                            className="w-full rounded-full bg-amber-400 text-zinc-950 hover:bg-amber-300 active:scale-[0.98]"
                          >
                            {busy === `buy:${p.id}` ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Coins className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {p.price_polens > 0
                              ? `${p.price_polens.toLocaleString("pt-BR")} Poléns`
                              : "Resgatar"}
                          </Button>
                          {p.price_cents > 0 && (
                            <Button
                              onClick={() => buyStripe(p)}
                              disabled={busy != null}
                              size="sm"
                              variant="outline"
                              className="w-full rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 active:scale-[0.98]"
                            >
                              {busy === `stripe:${p.id}` ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {fmtBRL(p.price_cents)}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Feedback de compra/aplicação */}
      {feedback && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/55 px-4"
          onClick={() => setFeedback(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full",
                feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {feedback.ok ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Coins className="h-5 w-5" />
              )}
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{feedback.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{feedback.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              {!feedback.ok && feedback.title === "Saldo insuficiente" && (
                <Link href="/loja-polens">
                  <Button variant="outline" className="rounded-full">
                    Comprar Poléns
                  </Button>
                </Link>
              )}
              <Button
                onClick={() => setFeedback(null)}
                className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
