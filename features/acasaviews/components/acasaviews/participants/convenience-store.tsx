"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShoppingBag, X } from "lucide-react"
import type { ProductItem } from "@/lib/acasaviews/participants-live"

function brl(cents: number) {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function ConvenienceStore({ products, accent, slug }: { products: ProductItem[]; accent: string; slug: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ProductItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buy(product: ProductItem) {
    setError(null)
    const token = getToken()
    if (!token) {
      const next = encodeURIComponent(`/acasaviews/participantes/${slug}`)
      router.push(`/login?next=${next}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/casa/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok || !data?.checkout_url) throw new Error(data?.error || "Não foi possível iniciar a compra.")
      window.location.href = data.checkout_url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.")
      setLoading(false)
    }
  }

  if (products.length === 0) {
    return (
      <p className="border-2 border-dashed border-[var(--ink)]/25 bg-white/50 px-5 py-10 text-center casa-body text-sm font-semibold text-[var(--ink-soft)]/55">
        Nenhum produto deste participante por enquanto.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((prod) => {
          const soldOut = prod.stock !== null && prod.stock <= 0
          return (
            <div key={prod.id} className="flex flex-col overflow-hidden border-2 border-[var(--ink)] bg-white shadow-[5px_5px_0_0_var(--ink)]">
              <div className="aspect-square overflow-hidden border-b-2 border-[var(--ink)] bg-[var(--paper-2)]">
                {prod.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prod.image_url} alt={prod.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="casa-display text-xl leading-tight text-[var(--ink)]">{prod.name}</h3>
                {prod.description && <p className="mt-1 line-clamp-2 casa-body text-xs text-[var(--ink-soft)]/70">{prod.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="casa-display text-2xl" style={{ color: accent }}>{brl(prod.price_cents)}</span>
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => setSelected(prod)}
                    className="border-2 border-[var(--ink)] px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: soldOut ? "transparent" : accent }}
                  >
                    {soldOut ? "esgotado" : "comprar"}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog de confirmação */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !loading && setSelected(null)}>
          <div className="w-full max-w-md border-2 border-[var(--ink)] bg-white shadow-[8px_8px_0_0_var(--ink)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-[var(--ink)] px-4 py-3">
              <span className="flex items-center gap-2 casa-display text-xl text-[var(--ink)]"><ShoppingBag className="h-5 w-5" style={{ color: accent }} /> Confirmar compra</span>
              <button onClick={() => !loading && setSelected(null)} className="text-[var(--ink)]"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden border-2 border-[var(--ink)] bg-[var(--paper-2)]">
                  {selected.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="casa-display text-lg leading-tight text-[var(--ink)]">{selected.name}</h4>
                  <span className="casa-display text-xl" style={{ color: accent }}>{brl(selected.price_cents)}</span>
                </div>
              </div>
              <p className="casa-body text-xs text-[var(--ink-soft)]/65">
                Você será levado ao pagamento seguro (Stripe). Produto digital/simbólico da Conveniência Views — sem frete.
              </p>
              {error && <p className="border border-[var(--magenta)] bg-[var(--magenta)]/10 px-3 py-2 casa-body text-xs font-semibold text-[var(--magenta-deep)]">{error}</p>}
              <button
                onClick={() => buy(selected)}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 border-2 border-[var(--ink)] py-2.5 casa-body text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: accent }}
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecionando…</> : "Ir para o pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
