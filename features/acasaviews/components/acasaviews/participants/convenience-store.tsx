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

export function ConvenienceStore({ products, slug }: { products: ProductItem[]; slug: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ProductItem | null>(null)
  const [descModal, setDescModal] = useState<ProductItem | null>(null)
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
        // participant_slug = atribuição: registra qual participante recebeu a venda
        body: JSON.stringify({ product_id: product.id, participant_slug: slug }),
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
      <p className="rv-type border border-dashed border-[var(--rv-line-strong)] px-5 py-10 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--rv-muted)]">
        Nenhum produto deste participante por enquanto.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((prod) => {
          const soldOut = prod.stock !== null && prod.stock <= 0
          return (
            <div key={prod.id} className="rv-cut-tr flex flex-col border-[1.5px] border-[var(--rv-white)] bg-[var(--rv-bg)]">
              <div className="rv-shelf-art relative aspect-square overflow-hidden">
                {prod.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prod.image_url} alt={prod.name} className="relative h-full w-full object-cover" />
                )}
                {soldOut && <span className="rv-sticker rv-sticker-pink absolute left-3 top-3">esgotado</span>}
              </div>
              <div className="rv-paper flex flex-1 flex-col p-4">
                <h3 className="rv-display text-2xl leading-tight">{prod.name}</h3>
                {prod.description && (
                  <button
                    type="button"
                    onClick={() => setDescModal(prod)}
                    className="rv-type mt-1 w-fit text-[10px] uppercase tracking-[0.14em] text-[rgba(5,5,5,0.6)] underline hover:text-[var(--rv-bg)]"
                  >
                    ver descrição
                  </button>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="rv-display text-3xl text-[var(--rv-pink-deep)]">{brl(prod.price_cents)}</span>
                  <button type="button" disabled={soldOut} onClick={() => setSelected(prod)} className="rv-paper-btn px-3 py-2">
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(5,5,5,0.8)] p-4" onClick={() => !loading && setSelected(null)}>
          <div className="w-full max-w-md border-2 border-[var(--rv-pink)] bg-[var(--rv-bg)] text-[var(--rv-white)] rv-glow-box" onClick={(e) => e.stopPropagation()}>
            <div className="rv-block-head flex items-center justify-between px-4 py-3">
              <span className="rv-display flex items-center gap-2 text-2xl"><ShoppingBag className="h-5 w-5 text-[var(--rv-pink)]" /> Confirmar compra</span>
              <button onClick={() => !loading && setSelected(null)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden border border-[var(--rv-white)] bg-[var(--rv-surface-2)]">
                  {selected.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="rv-display text-xl leading-tight">{selected.name}</h4>
                  <span className="rv-display text-2xl text-[var(--rv-pink-ink)]">{brl(selected.price_cents)}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--rv-muted)]">
                Você será levado ao pagamento seguro. Produto digital/simbólico da Conveniência Views — sem frete.
              </p>
              {error && <p className="border border-[var(--rv-pink)] bg-[rgba(255,0,122,0.1)] px-3 py-2 text-xs font-semibold text-[var(--rv-pink-ink)]">{error}</p>}
              <button onClick={() => buy(selected)} disabled={loading} className="rv-btn w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecionando…</> : "Ir para o pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Descrição (somente leitura) */}
      {descModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(5,5,5,0.8)] p-4" onClick={() => setDescModal(null)}>
          <div className="w-full max-w-md border-2 border-[var(--rv-white)] bg-[var(--rv-bg)] text-[var(--rv-white)]" onClick={(e) => e.stopPropagation()}>
            <div className="rv-block-head flex items-center justify-between px-4 py-3">
              <span className="rv-display text-2xl leading-tight">{descModal.name}</span>
              <button onClick={() => setDescModal(null)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--rv-muted)]">{descModal.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
