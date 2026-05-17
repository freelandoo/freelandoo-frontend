"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Store, CheckCircle2, Search, RotateCcw, Clock, ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface PayoutItem {
  id_balance: number
  id_order: number
  id_seller_user: string
  id_seller_profile: string
  net_cents: number
  gross_cents: number
  shipping_cents: number
  status: "aguardando" | "aprovado" | "pago" | "revertido"
  available_at: string
  approved_at: string | null
  paid_out_at: string | null
  paid_out_note: string | null
  product_name: string
  seller_display_name: string | null
  seller_username: string | null
  seller_email: string | null
  order_status: string
  order_total_cents: number
  order_created_at: string
}

interface Summary {
  aguardando_cents: number
  aprovado_cents: number
  pago_cents: number
  aguardando_count: number
  aprovado_count: number
  pago_count: number
}

const STATUS_TABS: { key: PayoutItem["status"]; label: string; tone: string }[] = [
  { key: "aprovado",  label: "Liberados",  tone: "text-emerald-300 border-emerald-700" },
  { key: "aguardando", label: "Aguardando", tone: "text-amber-300 border-amber-700" },
  { key: "pago",      label: "Pagos",      tone: "text-primary border-primary/40" },
  { key: "revertido", label: "Revertidos", tone: "text-rose-300 border-rose-700" },
]

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

export default function LojaPayoutsPage() {
  const router = useRouter()
  const [items, setItems] = useState<PayoutItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [statusFilter, setStatusFilter] = useState<PayoutItem["status"]>("aprovado")
  const [q, setQ] = useState("")
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<{ id: number; defaultNote: string } | null>(null)
  const [noteValue, setNoteValue] = useState("")

  async function load() {
    const token = getToken()
    if (!token) { router.push("/login"); return }
    setState("loading")
    setError(null)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (q.trim()) params.set("q", q.trim())
      const res = await fetch(`/api/admin/seller-payouts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d?.error || "Erro ao carregar")
        setState("error")
        return
      }
      setItems((d.items || []) as PayoutItem[])
      setSummary(d.summary || null)
      setState("loaded")
    } catch {
      setError("Erro de conexão")
      setState("error")
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const visible = useMemo(() => items, [items])

  async function markPaid(id_balance: number, note: string) {
    setBusyId(id_balance)
    setError(null)
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/seller-payouts/${id_balance}/mark-paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d?.error || "Falha ao marcar como pago"); setBusyId(null); return }
      setNoteFor(null)
      await load()
    } catch {
      setError("Erro de conexão")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/administracao")}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Voltar
        </button>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-primary" aria-hidden />
            <div>
              <h1 className="text-2xl font-bold">Loja — Payouts</h1>
              <p className="text-xs text-muted-foreground">Saldo dos vendedores após holdback de 8 dias.</p>
            </div>
          </div>
        </header>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Tile label="Aguardando" value={summary.aguardando_cents} count={summary.aguardando_count} icon={Clock} tone="amber" />
            <Tile label="Liberado a pagar" value={summary.aprovado_cents} count={summary.aprovado_count} icon={CheckCircle2} tone="emerald" />
            <Tile label="Já pago" value={summary.pago_cents} count={summary.pago_count} icon={CheckCircle2} tone="primary" />
            <Tile label="Total geral" value={summary.aguardando_cents + summary.aprovado_cents + summary.pago_cents} count={summary.aguardando_count + summary.aprovado_count + summary.pago_count} icon={Store} tone="muted" />
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${statusFilter === t.key ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex w-full max-w-sm items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") load() }}
              placeholder="username, email, produto…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            />
            <button type="button" onClick={load} className="text-xs font-semibold text-primary hover:underline">Buscar</button>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-rose-700 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p>
        )}

        {state === "loading" ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Nada por aqui.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Vendedor</th>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-left">Pedido</th>
                  <th className="px-3 py-2 text-right">Líquido</th>
                  <th className="px-3 py-2 text-left">Datas</th>
                  <th className="px-3 py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visible.map((b) => (
                  <tr key={b.id_balance} className="text-sm">
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium">{b.seller_display_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">@{b.seller_username || "—"} · {b.seller_email || "—"}</p>
                    </td>
                    <td className="px-3 py-2 align-top">{b.product_name}</td>
                    <td className="px-3 py-2 align-top">
                      <p>#{b.id_order}</p>
                      <p className="text-[11px] text-muted-foreground">Bruto {formatBRL(b.gross_cents)}</p>
                    </td>
                    <td className="px-3 py-2 align-top text-right tabular-nums font-semibold">{formatBRL(b.net_cents)}</td>
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      <p>Pedido: {formatDate(b.order_created_at)}</p>
                      <p>Libera: {formatDate(b.available_at)}</p>
                      {b.paid_out_at && <p>Pago: {formatDate(b.paid_out_at)}</p>}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      {b.status === "aprovado" ? (
                        <button
                          type="button"
                          disabled={busyId === b.id_balance}
                          onClick={() => { setNoteFor({ id: b.id_balance, defaultNote: "" }); setNoteValue("") }}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {busyId === b.id_balance ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <CheckCircle2 className="h-3 w-3" aria-hidden />}
                          Marcar pago
                        </button>
                      ) : b.status === "pago" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                          <CheckCircle2 className="h-3 w-3" aria-hidden /> Pago
                        </span>
                      ) : b.status === "revertido" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-300">
                          <RotateCcw className="h-3 w-3" aria-hidden /> Revertido
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-300">Aguardando holdback</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {noteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold">Confirmar pagamento</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirme apenas após realizar a transferência via PIX/banco. Você pode anotar comprovante/data.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Observação (opcional)
            </label>
            <input
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="ex: PIX e2e abcdef, 16/05"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteFor(null)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => markPaid(noteFor.id, noteValue.trim())}
                disabled={busyId === noteFor.id}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busyId === noteFor.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Tile({
  label, value, count, icon: Icon, tone,
}: {
  label: string
  value: number
  count: number
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  tone: "amber" | "emerald" | "primary" | "muted"
}) {
  const cls = {
    amber:   "border-amber-700 bg-amber-950/30 text-amber-200",
    emerald: "border-emerald-700 bg-emerald-950/30 text-emerald-200",
    primary: "border-primary/40 bg-primary/10 text-primary",
    muted:   "border-border bg-muted/30 text-muted-foreground",
  }[tone]
  return (
    <div className={`rounded-2xl border px-4 py-3 ${cls}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{formatBRL(value)}</p>
      <p className="text-[10px] opacity-70">{count} item(s)</p>
    </div>
  )
}
