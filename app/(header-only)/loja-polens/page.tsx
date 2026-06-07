"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, CreditCard, Hexagon, Loader2, Search, Sparkles, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCapturedCoupon } from "@/lib/share-coupon"
import { PageShell, EmptyState, ErrorState } from "@/components/tabloide"

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
    <Suspense fallback={<div className="fl-root fl-paper-texture min-h-[100dvh]" />}>
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
      const sharedCoupon = getCapturedCoupon()
      const res = await fetch(`/api/polens/products/${product.id}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
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
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-14">
        <div className="flex min-h-[480px] flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
              <Sparkles className="h-3.5 w-3.5" />
              Pacotes de Poléns
            </div>
            <h1 className="fl-display mt-5 text-5xl leading-[0.95] text-[#F5F1E8] md:text-7xl">
              Loja de Polén
            </h1>
            <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[#C9C2B6]">
              Compre Poléns para usar dentro da Freelandoo: ative perfis, destaque-se na vitrine e adquira recursos exclusivos.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#F5F1E8]/10 bg-[#1D1810] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A938A]">Saldo atual</p>
              <div className="mt-2 flex items-baseline gap-2">
                <Hexagon className="h-5 w-5 fill-[#F2B705] text-[#F2B705]" />
                <span className="text-3xl font-black tabular-nums tracking-tight text-[#F5F1E8]">
                  {wallet ? fmtNumber(wallet.balance) : "—"}
                </span>
                <span className="text-sm text-[#9A938A]">Poléns</span>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-[#F5F1E8]/10 bg-[#1D1810] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A938A]">Pacotes ativos</p>
              <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-[#F5F1E8]">{products.length}</p>
              <p className="mt-1 text-xs text-[#9A938A]">Disponíveis para compra agora.</p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] border-2 border-[#F5F1E8]/10 bg-[#1D1810]">
          {featured?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.image_url}
              alt={featured.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(242,183,5,0.32),transparent_38%),linear-gradient(135deg,#141009,#2a2212)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#141009]/85 via-[#141009]/45 to-[#141009]/10" />
          <div className="absolute inset-x-5 top-5 rounded-2xl border border-[#F5F1E8]/12 bg-[#0b0804]/45 p-4 text-[#F5F1E8] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#F2B705]/25 bg-[#F2B705]/12 text-[#F2B705]">
                <Hexagon className="h-7 w-7 fill-[#F2B705] text-[#F2B705]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{featured?.name || "Pacote em destaque"}</p>
                <p className="text-xs text-[#C9C2B6]">
                  {featured ? `${fmtNumber(featured.polens_amount + featured.bonus_polens)} Poléns no total` : "Selecione um pacote"}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-[#F5F1E8]">
            {featured ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B705]/40 bg-[#F2B705]/15 px-3 py-1 text-xs font-bold text-[#F2B705] backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  {fmtBRL(featured.price_cents)}
                </span>
                <h2 className="fl-display mt-3 text-3xl text-[#F5F1E8]">{featured.name}</h2>
                <p className="mt-1 max-w-[40ch] text-sm text-[#C9C2B6]">
                  {featured.description || "Pague com cartão e receba os Poléns na carteira em segundos."}
                </p>
              </>
            ) : (
              <>
                <h2 className="fl-display text-3xl text-[#F5F1E8]">Sem pacotes no momento</h2>
                <p className="mt-1 max-w-[40ch] text-sm text-[#C9C2B6]">
                  Volte em breve. Novos pacotes aparecem aqui assim que forem cadastrados.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <div className="flex flex-col gap-3 border-y border-[#F5F1E8]/10 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A938A]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pacote"
              className="h-11 w-full rounded-full border-2 border-[#F5F1E8]/12 bg-[#1D1810] pl-10 pr-4 text-sm text-[#F5F1E8] placeholder:text-[#9A938A] outline-none transition focus:border-[#F2B705]"
            />
          </div>
          <p className="text-xs text-[#9A938A]">
            Pagamento seguro via Stripe. Os Poléns são creditados automaticamente após a confirmação.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 py-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="aspect-[9/16] animate-pulse rounded-[1.5rem] bg-[#F5F1E8]/8" />
            ))}
          </div>
        ) : error ? (
          <div className="py-16">
            <ErrorState description={error} onRetry={() => void loadProducts()} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Hexagon className="h-6 w-6" />}
              title={products.length === 0 ? "Sem pacotes ainda" : "Nada encontrado"}
              description={
                products.length === 0
                  ? "Nenhum pacote disponível ainda. Volte em breve."
                  : "Nenhum pacote corresponde à busca."
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 py-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p, index) => {
              const total = p.polens_amount + (p.bonus_polens || 0)
              const isSelected = selected?.id === p.id
              return (
                <article
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-[1.5rem] border-2 bg-[#1D1810] transition active:scale-[0.99]",
                    "aspect-[9/16]",
                    isSelected ? "border-[#F2B705] ring-2 ring-[#F2B705]/30" : "border-[#F5F1E8]/10 hover:border-[#F5F1E8]/30"
                  )}
                  style={{ animation: `fade-in .42s cubic-bezier(.16,1,.3,1) both ${index * 55}ms` }}
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#141009,#2a2212)]">
                      <Hexagon className="h-20 w-20 fill-[#F2B705]/80 text-[#F2B705]" />
                    </div>
                  )}

                  {/* Gradient pra legibilidade do overlay inferior */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#141009]/90 via-[#141009]/55 to-transparent" />

                  {p.bonus_polens > 0 && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#F2B705]/50 bg-[#F2B705] px-2.5 py-1 text-xs font-bold text-[#1A1505] shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      +{fmtNumber(p.bonus_polens)} bônus
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4 text-[#F5F1E8]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{p.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[#F5F1E8]/75">
                          {p.description || "Receba os Poléns direto na sua carteira."}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 text-[#F2B705]">
                          <Hexagon className="h-4 w-4 fill-[#F2B705] text-[#F2B705]" />
                          <span className="text-base font-black tabular-nums tracking-tight">{fmtNumber(total)}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#F5F1E8]/60">Poléns</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-base font-black tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{fmtBRL(p.price_cents)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(p)
                          void buy(p)
                        }}
                        disabled={buyingId !== null}
                        className="inline-flex items-center rounded-full bg-[#F2B705] px-3 py-1.5 text-sm font-bold text-[#1A1505] transition hover:bg-[#ffc81f] active:scale-[0.98] disabled:opacity-60"
                      >
                        {buyingId === p.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1.5 h-4 w-4" />
                        )}
                        Comprar
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {feedback && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
          <div className="fl-card w-full max-w-sm rounded-2xl p-6">
            <div
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full",
                feedback.kind === "success" ? "bg-[#16a34a] text-white" : "bg-[#dc2626] text-white"
              )}
            >
              {feedback.kind === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <h3 className="fl-display mt-4 text-2xl text-[var(--fl-ink)]">{feedback.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#5b554b]">{feedback.message}</p>
            <div className="mt-5 flex justify-end">
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

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageShell>
  )
}
