"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, CreditCard, Hexagon, Loader2, Search, Sparkles, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price_cents: number
  polens_amount: number
  bonus_polens: number
}

type Wallet = { balance: number; lifetime_earned?: number; lifetime_spent?: number }

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100)
}

function fmtNumber(n: number) {
  return n.toLocaleString("pt-BR")
}

export default function LojaPolensPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-[#f8faf9]" />}>
      <LojaPolensContent />
    </Suspense>
  )
}

function LojaPolensContent() {
  const params = useSearchParams()
  const checkout = params.get("polens_checkout")

  const [products, setProducts] = useState<Product[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [feedback, setFeedback] = useState<{ kind: "success" | "error" | "cancel"; title: string; message: string } | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadWallet = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch("/api/polens/wallet", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setWallet(data.wallet || null)
      }
    } catch {
      /* ignore */
    }
  }, [token])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/polens/products", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar a loja")
      setProducts(data.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
    void loadWallet()
  }, [loadProducts, loadWallet])

  useEffect(() => {
    if (checkout === "success") {
      setFeedback({
        kind: "success",
        title: "Pagamento confirmado",
        message: "Seus Poléns foram creditados na sua carteira. O saldo aparece em instantes.",
      })
      // Recarrega o saldo periodicamente até refletir o crédito (webhook async).
      let attempts = 0
      const id = setInterval(() => {
        void loadWallet()
        attempts += 1
        if (attempts >= 6) clearInterval(id)
      }, 1500)
      return () => clearInterval(id)
    }
    if (checkout === "cancel") {
      setFeedback({
        kind: "cancel",
        title: "Compra cancelada",
        message: "Você voltou sem concluir o pagamento. Tente novamente quando quiser.",
      })
    }
  }, [checkout, loadWallet])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => `${p.name} ${p.description || ""}`.toLowerCase().includes(q))
  }, [products, query])

  const featured = useMemo(() => {
    if (selected) return selected
    return filtered[0] || products[0] || null
  }, [filtered, products, selected])

  async function buy(product: Product) {
    if (!token) {
      window.location.href = "/login?next=/loja-polens"
      return
    }
    setBuyingId(product.id)
    setError("")
    try {
      const res = await fetch(`/api/polens/products/${product.id}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data.error || "Não foi possível abrir o checkout")
      window.location.href = data.checkout_url
    } catch (err) {
      setFeedback({
        kind: "error",
        title: "Compra não concluída",
        message: err instanceof Error ? err.message : "Erro ao abrir checkout",
      })
      setBuyingId(null)
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f8faf9] text-zinc-950">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-12">
        <div className="flex min-h-[480px] flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Pacotes de Poléns
            </div>
            <h1 className="mt-7 max-w-[760px] text-4xl font-semibold leading-none tracking-tighter text-zinc-950 md:text-6xl">
              Loja de Polén
            </h1>
            <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-zinc-600">
              Compre Poléns para usar dentro da Freelandoo: ative perfis, destaque-se na vitrine e adquira recursos exclusivos.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.35)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Saldo atual</p>
              <div className="mt-2 flex items-baseline gap-2">
                <Hexagon className="h-5 w-5 fill-amber-400 text-amber-500" />
                <span className="text-3xl font-semibold tabular-nums tracking-tight">
                  {wallet ? fmtNumber(wallet.balance) : "—"}
                </span>
                <span className="text-sm text-zinc-500">Poléns</span>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.35)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Pacotes ativos</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{products.length}</p>
              <p className="mt-1 text-xs text-zinc-500">Disponíveis para compra agora.</p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-900">
          {featured?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.image_url}
              alt={featured.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(217,119,6,0.32),transparent_34%),linear-gradient(135deg,#18181b,#3f3f46)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/82 via-zinc-950/42 to-zinc-950/12" />
          <div className="absolute inset-x-5 top-5 rounded-2xl border border-white/12 bg-zinc-950/40 p-4 text-white backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-amber-300/15 text-amber-200">
                <Hexagon className="h-7 w-7 fill-amber-300 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{featured?.name || "Pacote em destaque"}</p>
                <p className="text-xs text-white/60">
                  {featured ? `${fmtNumber(featured.polens_amount + featured.bonus_polens)} Poléns no total` : "Selecione um pacote"}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {featured ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  {fmtBRL(featured.price_cents)}
                </span>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{featured.name}</h2>
                <p className="mt-1 max-w-[40ch] text-sm text-white/70">
                  {featured.description || "Pague com cartão e receba os Poléns na carteira em segundos."}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold tracking-tight">Sem pacotes no momento</h2>
                <p className="mt-1 max-w-[40ch] text-sm text-white/70">
                  Volte em breve — novos pacotes aparecem aqui assim que forem cadastrados.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <div className="flex flex-col gap-3 border-y border-zinc-200 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pacote"
              className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Pagamento seguro via Stripe. Os Poléns são creditados automaticamente após a confirmação.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 py-8 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[1.5rem] bg-zinc-200/70" />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-3 py-20 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-700">
              <Hexagon className="h-6 w-6" />
            </div>
            <p className="text-sm text-zinc-500">
              {products.length === 0
                ? "Nenhum pacote disponível ainda. Volte em breve."
                : "Nenhum pacote corresponde à busca."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 py-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, index) => {
              const total = p.polens_amount + (p.bonus_polens || 0)
              const isSelected = selected?.id === p.id
              return (
                <article
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_18px_40px_-34px_rgba(0,0,0,0.35)] transition active:scale-[0.99]",
                    isSelected ? "border-zinc-950 ring-2 ring-zinc-950/10" : "border-zinc-200 hover:border-zinc-400"
                  )}
                  style={{ animation: `fade-in .42s cubic-bezier(.16,1,.3,1) both ${index * 55}ms` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-zinc-100">
                        <Hexagon className="h-14 w-14 fill-amber-300 text-amber-400" />
                      </div>
                    )}
                    {p.bonus_polens > 0 && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-50/95 px-2.5 py-1 text-xs font-medium text-amber-800 backdrop-blur">
                        <Sparkles className="h-3 w-3" />
                        +{fmtNumber(p.bonus_polens)} bônus
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-semibold tracking-tight">{p.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                          {p.description || "Receba os Poléns direto na sua carteira."}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 text-amber-700">
                          <Hexagon className="h-4 w-4 fill-amber-400 text-amber-500" />
                          <span className="text-lg font-semibold tabular-nums tracking-tight">{fmtNumber(total)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">Poléns</p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-base font-semibold tracking-tight">{fmtBRL(p.price_cents)}</span>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(p)
                          void buy(p)
                        }}
                        disabled={buyingId !== null}
                        className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]"
                      >
                        {buyingId === p.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        Comprar
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {feedback && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/55 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
            <div
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full",
                feedback.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}
            >
              {feedback.kind === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{feedback.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{feedback.message}</p>
            <div className="mt-5 flex justify-end">
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

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
