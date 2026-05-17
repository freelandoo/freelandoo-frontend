"use client"

import { useEffect, useState } from "react"
import { Loader2, Package, Truck, ShoppingBag } from "lucide-react"

interface Order {
  id_order: number
  id_profile_product: number
  id_seller_profile: string
  product_name: string
  product_cover_url: string | null
  seller_display_name: string | null
  seller_username: string | null
  quantity: number
  unit_price_cents: number
  shipping_cents: number
  total_cents: number
  shipping_service_name: string | null
  shipping_carrier: string | null
  tracking_code: string | null
  status: "pending" | "paid" | "shipped" | "delivered" | "canceled" | "refunded"
  destination_zipcode: string
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}

const STATUS_LABEL: Record<Order["status"], { label: string; classes: string }> = {
  pending:   { label: "Aguardando pagamento", classes: "bg-zinc-700/30 text-zinc-300 border-zinc-700" },
  paid:      { label: "Pago",                 classes: "bg-emerald-500/15 text-emerald-300 border-emerald-700" },
  shipped:   { label: "Enviado",              classes: "bg-sky-500/15 text-sky-300 border-sky-700" },
  delivered: { label: "Entregue",             classes: "bg-primary/15 text-primary border-primary/40" },
  canceled:  { label: "Cancelado",            classes: "bg-zinc-700/30 text-zinc-400 border-zinc-700" },
  refunded:  { label: "Reembolsado",          classes: "bg-rose-500/15 text-rose-300 border-rose-700" },
}

function formatBRL(cents: number) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(s: string | null) {
  if (!s) return "—"
  try { return new Date(s).toLocaleDateString("pt-BR") } catch { return "—" }
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export default function ComprasPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error" | "unauth">("loading")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) { setState("unauth"); return }
      setState("loading")
      try {
        const res = await fetch("/api/me/orders", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(d?.error || "fail")
        setOrders((d.orders || []) as Order[])
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <header className="mb-6 flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" aria-hidden />
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Minhas compras</h1>
          <p className="text-xs text-muted-foreground">Pedidos da Loja de criadores Freelandoo.</p>
        </div>
      </header>

      {state === "loading" && (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
        </div>
      )}

      {state === "unauth" && (
        <p className="text-sm text-muted-foreground">Faça login para ver suas compras.</p>
      )}

      {state === "error" && (
        <p className="text-sm text-rose-400">Erro ao carregar pedidos.</p>
      )}

      {state === "loaded" && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm text-muted-foreground">Você ainda não comprou nada na Loja.</p>
        </div>
      )}

      {state === "loaded" && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => {
            const status = STATUS_LABEL[o.status] || STATUS_LABEL.pending
            return (
              <li
                key={o.id_order}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4 md:flex-row md:items-center"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900 md:h-24 md:w-24">
                  {o.product_cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.product_cover_url} alt={o.product_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-8 w-8 text-zinc-600" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold md:text-base">{o.product_name}</h2>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.classes}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    Vendedor: {o.seller_display_name || o.seller_username || "—"} · pedido #{o.id_order}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.shipping_carrier ? `${o.shipping_carrier} · ${o.shipping_service_name}` : "—"} · CEP {o.destination_zipcode}
                  </p>
                  {o.tracking_code && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-sky-300">
                      <Truck className="h-3.5 w-3.5" aria-hidden /> Rastreio: <span className="font-mono">{o.tracking_code}</span>
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Realizado em {formatDate(o.created_at)}{o.paid_at ? ` · Pago em ${formatDate(o.paid_at)}` : ""}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-base font-bold tabular-nums md:text-lg">{formatBRL(o.total_cents)}</p>
                  <p className="text-[11px] text-muted-foreground">{formatBRL(o.unit_price_cents)} + frete {formatBRL(o.shipping_cents)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
