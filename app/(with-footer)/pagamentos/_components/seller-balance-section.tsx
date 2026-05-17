"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Store, Clock, CheckCircle2, RotateCcw, Printer, Truck, AlertTriangle } from "lucide-react"

interface BalanceItem {
  id_balance: number
  id_order: number
  net_cents: number
  gross_cents: number
  shipping_cents: number
  status: "aguardando" | "aprovado" | "pago" | "revertido"
  available_at: string
  approved_at: string | null
  paid_out_at: string | null
  paid_out_note: string | null
  reverted_at: string | null
  product_name: string
  order_status: string
  order_total_cents: number
  buyer_name: string | null
  order_created_at: string
  label_pdf_url: string | null
  label_purchased_at: string | null
  label_purchase_error: string | null
  label_purchase_attempts: number
  melhor_envio_order_id: string | null
  tracking_code: string | null
  shipping_carrier: string | null
  shipping_service_name: string | null
}

interface BalanceSummary {
  aguardando_cents: number
  aprovado_cents: number
  pago_cents: number
  revertido_cents: number
  aguardando_count: number
  aprovado_count: number
  pago_count: number
}

const STATUS = {
  aguardando: { label: "Aguardando (8d)", icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",   border: "border-amber-200 dark:border-amber-800" },
  aprovado:   { label: "Liberado",        icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  pago:       { label: "Pago ao vendedor", icon: CheckCircle2, color: "text-primary",     bg: "bg-primary/10",                       border: "border-primary/30" },
  revertido:  { label: "Revertido",       icon: RotateCcw,     color: "text-rose-600",    bg: "bg-rose-50 dark:bg-rose-950/30",     border: "border-rose-200 dark:border-rose-800" },
} as const

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

export function SellerBalanceSection() {
  const [items, setItems] = useState<BalanceItem[]>([])
  const [summary, setSummary] = useState<BalanceSummary | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "hidden" | "error">("loading")
  const [labelBusy, setLabelBusy] = useState<number | null>(null)

  async function openLabel(id_order: number) {
    const token = getToken()
    if (!token) return
    setLabelBusy(id_order)
    try {
      const res = await fetch(`/api/me/orders/${id_order}/label`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const d = await res.json()
      if (res.ok && d?.label_pdf_url) {
        window.open(d.label_pdf_url, "_blank", "noopener,noreferrer")
        setItems((prev) => prev.map((it) =>
          it.id_order === id_order
            ? { ...it, label_pdf_url: d.label_pdf_url, melhor_envio_order_id: d.melhor_envio_order_id || it.melhor_envio_order_id, tracking_code: d.tracking_code || it.tracking_code, label_purchased_at: new Date().toISOString(), label_purchase_error: null }
            : it
        ))
      } else {
        alert(d?.error || "Não foi possível gerar a etiqueta agora — tente novamente em alguns minutos.")
      }
    } catch {
      alert("Erro de conexão ao gerar etiqueta.")
    } finally {
      setLabelBusy(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) { setState("hidden"); return }
      try {
        const res = await fetch("/api/me/seller-balance", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) { setState("error"); return }
        const list = (d.items || []) as BalanceItem[]
        if (list.length === 0) { setState("hidden"); return }
        setItems(list)
        setSummary(d.summary || null)
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (state === "hidden") return null
  if (state === "loading") {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }
  if (state === "error") return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <header className="mb-4 flex items-center gap-2">
        <Store className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Vendas da Loja
        </p>
      </header>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <SummaryTile label="Aguardando" value={summary.aguardando_cents} count={summary.aguardando_count} tone="amber" />
          <SummaryTile label="Liberado"   value={summary.aprovado_cents}   count={summary.aprovado_count}   tone="emerald" />
          <SummaryTile label="Pago"       value={summary.pago_cents}       count={summary.pago_count}       tone="primary" />
          <SummaryTile label="Total bruto" value={summary.aguardando_cents + summary.aprovado_cents + summary.pago_cents} count={items.length} tone="muted" />
        </div>
      )}

      <ul className="divide-y divide-border/70">
        {items.map((b) => {
          const cfg = STATUS[b.status] || STATUS.aguardando
          const Icon = cfg.icon
          return (
            <li key={b.id_balance} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{b.product_name}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                    <Icon className="h-3 w-3" aria-hidden /> {cfg.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pedido #{b.id_order} · {formatDate(b.order_created_at)}
                  {b.buyer_name ? ` · ${b.buyer_name}` : ""}
                </p>
                {b.status === "aguardando" && (
                  <p className="mt-0.5 text-[11px] text-amber-600">
                    Libera em {formatDate(b.available_at)}
                  </p>
                )}
                {b.status === "pago" && b.paid_out_at && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Pago em {formatDate(b.paid_out_at)}{b.paid_out_note ? ` · ${b.paid_out_note}` : ""}
                  </p>
                )}
                {b.tracking_code && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-300">
                    <Truck className="h-3 w-3" aria-hidden /> Rastreio: <span className="font-mono">{b.tracking_code}</span>
                  </p>
                )}
                {!b.label_purchased_at && b.label_purchase_error && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-500">
                    <AlertTriangle className="h-3 w-3" aria-hidden /> Etiqueta pendente · {b.label_purchase_error.slice(0, 80)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openLabel(b.id_order)}
                    disabled={labelBusy === b.id_order}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                  >
                    {labelBusy === b.id_order
                      ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      : <Printer className="h-3 w-3" aria-hidden />}
                    {b.label_purchased_at ? "Reimprimir etiqueta" : "Imprimir etiqueta"}
                  </button>
                  {b.shipping_carrier && (
                    <span className="text-[11px] text-muted-foreground">
                      {b.shipping_carrier} · {b.shipping_service_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-foreground">{formatBRL(b.net_cents)}</p>
                <p className="text-[11px] text-muted-foreground">Bruto {formatBRL(b.gross_cents)}</p>
                <p className="text-[10px] text-muted-foreground">(frete {formatBRL(b.shipping_cents)} retido)</p>
              </div>
            </li>
          )
        })}
      </ul>
    </motion.section>
  )
}

function SummaryTile({
  label, value, count, tone,
}: {
  label: string
  value: number
  count: number
  tone: "amber" | "emerald" | "primary" | "muted"
}) {
  const toneClass = {
    amber:   "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-200",
    emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200",
    primary: "border-primary/30 bg-primary/10 text-primary",
    muted:   "border-border bg-muted/30 text-muted-foreground",
  }[tone]
  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums">{formatBRL(value)}</p>
      <p className="text-[10px] opacity-70">{count} venda(s)</p>
    </div>
  )
}
