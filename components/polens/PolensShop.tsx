"use client"

import { useCallback, useEffect, useState } from "react"
import { Hexagon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price_cents: number
  polens_amount: number
  bonus_polens: number
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function PolensShop({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const t = token()
      const headers: Record<string, string> = {}
      if (t) headers.Authorization = `Bearer ${t}`
      const res = await fetch("/api/polens/products", { headers, cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar pacotes")
      setProducts(data.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pacotes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function buy(p: Product) {
    const t = token()
    if (!t) {
      setError("Faça login para comprar Poléns")
      return
    }
    setBuyingId(p.id)
    setError(null)
    try {
      const res = await fetch(`/api/polens/products/${p.id}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data.error || "Erro ao iniciar checkout")
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar checkout")
      setBuyingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hexagon className="h-5 w-5 fill-amber-300 text-amber-300" />
            Loja de Polén
          </DialogTitle>
          <DialogDescription>
            Compre pacotes de Poléns com cartão e use dentro da Freelandoo.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-amber-300/15 bg-zinc-950/40 p-8 text-center text-sm text-white/70">
            Nenhum pacote disponível no momento.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => {
              const total = p.polens_amount + (p.bonus_polens || 0)
              return (
                <div
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-amber-300/15 bg-zinc-950/40"
                >
                  <div className="aspect-[16/9] w-full bg-zinc-900">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Hexagon className="h-10 w-10 fill-amber-300/40 text-amber-300/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div>
                      <p className="font-medium leading-tight">{p.name}</p>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-white/60">{p.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-amber-200">
                      <Hexagon className="h-4 w-4 fill-amber-300 text-amber-300" />
                      <span className="text-lg font-semibold tabular-nums">{total}</span>
                      {p.bonus_polens > 0 && (
                        <span className="text-xs text-amber-100/70">+{p.bonus_polens} bônus</span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="text-base font-semibold">{formatBRL(p.price_cents)}</span>
                      <Button
                        size="sm"
                        onClick={() => buy(p)}
                        disabled={buyingId !== null}
                        className="bg-amber-300 text-zinc-950 hover:bg-amber-200"
                      >
                        {buyingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Comprar"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
