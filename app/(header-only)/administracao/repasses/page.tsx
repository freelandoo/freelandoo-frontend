"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Loader2,
  HandCoins,
  CheckCircle2,
  Search,
  RotateCcw,
  Clock,
  ChevronLeft,
  Store,
  Calendar,
  ExternalLink,
} from "lucide-react"
import { useRouter } from "next/navigation"

type Status = "aguardando" | "aprovado" | "pago" | "revertido"
type Origin = "loja" | "agendamento" | "afiliado"

// ── Shapes dos 3 endpoints de leitura existentes ──────────────────────────────
interface SellerItem {
  id_balance: number
  id_order: number
  net_cents: number
  gross_cents: number
  status: Status
  available_at: string
  paid_out_at: string | null
  order_created_at: string
  product_name: string
  seller_display_name: string | null
  seller_username: string | null
  seller_email: string | null
}
interface BookingItem {
  id_payout: number
  id_booking: number
  net_cents: number
  status: Status
  available_at: string
  paid_out_at: string | null
  created_at: string
  service_name: string | null
  client_name: string | null
  profile_display_name: string | null
  owner_username: string | null
  owner_email: string | null
}
interface HoldbackSummary {
  aguardando_cents: number
  aprovado_cents: number
  pago_cents: number
  aguardando_count: number
  aprovado_count: number
  pago_count: number
}
interface AffiliateSummaryRow {
  id_affiliate: string
  user_name: string | null
  user_email: string | null
  red_cents: number // liberado a pagar (passou holdback)
  green_cents: number // ainda em holdback
  paid_cents: number
  oldest_unpaid_at: string | null
  unpaid_count: number
}

// ── Linha normalizada da tabela unificada ─────────────────────────────────────
interface Row {
  key: string
  origin: Origin
  status: Status
  payee: string
  payeeSub: string
  context: string
  amount_cents: number
  dateMain: { label: string; value: string | null }
  dateRelease: string | null
  paidAt: string | null
  // ação inline (Loja/Agendamento) — só quando aprovado
  payAction?: { url: string }
  // ação link-out (Afiliados)
  manageHref?: string
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: "aprovado", label: "Liberados" },
  { key: "aguardando", label: "Aguardando" },
  { key: "pago", label: "Pagos" },
  { key: "revertido", label: "Revertidos" },
]

const ORIGIN_META: Record<Origin, { label: string; icon: typeof Store; badge: string }> = {
  loja: { label: "Loja", icon: Store, badge: "bg-emerald-500/15 text-emerald-300 border-emerald-700" },
  agendamento: { label: "Agenda", icon: Calendar, badge: "bg-blue-500/15 text-blue-300 border-blue-700" },
  afiliado: { label: "Afiliado", icon: HandCoins, badge: "bg-amber-500/15 text-amber-300 border-amber-700" },
}

function formatBRL(cents: number) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function formatDate(s: string | null) {
  if (!s) return "—"
  try {
    return new Date(s).toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}
function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export default function RepassesPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<Status>("aprovado")
  const [originFilter, setOriginFilter] = useState<Origin | "todas">("todas")
  const [q, setQ] = useState("")
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [seller, setSeller] = useState<SellerItem[]>([])
  const [sellerSummary, setSellerSummary] = useState<HoldbackSummary | null>(null)
  const [booking, setBooking] = useState<BookingItem[]>([])
  const [bookingSummary, setBookingSummary] = useState<HoldbackSummary | null>(null)
  const [affiliates, setAffiliates] = useState<AffiliateSummaryRow[]>([])

  const [noteFor, setNoteFor] = useState<Row | null>(null)
  const [noteValue, setNoteValue] = useState("")

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }
    setState("loading")
    setError(null)
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [sRes, bRes, aRes] = await Promise.all([
        fetch(`/api/admin/seller-payouts?status=${statusFilter}`, { headers, cache: "no-store" }),
        fetch(`/api/admin/booking-payouts?status=${statusFilter}`, { headers, cache: "no-store" }),
        fetch(`/api/admin/affiliate/payouts/summary`, { headers, cache: "no-store" }),
      ])
      const [sData, bData, aData] = await Promise.all([sRes.json(), bRes.json(), aRes.json()])
      if (!sRes.ok && !bRes.ok && !aRes.ok) {
        setError(sData?.error || "Erro ao carregar repasses")
        setState("error")
        return
      }
      setSeller(sRes.ok ? (sData.items || []) : [])
      setSellerSummary(sRes.ok ? sData.summary || null : null)
      setBooking(bRes.ok ? (bData.items || []) : [])
      setBookingSummary(bRes.ok ? bData.summary || null : null)
      setAffiliates(aRes.ok ? (aData.items || []) : [])
      setState("loaded")
    } catch {
      setError("Erro de conexão")
      setState("error")
    }
  }, [statusFilter, router])

  useEffect(() => {
    load()
  }, [load])

  // ── Normaliza as 3 fontes em linhas únicas para o status atual ───────────────
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []

    for (const b of seller) {
      out.push({
        key: `loja-${b.id_balance}`,
        origin: "loja",
        status: b.status,
        payee: b.seller_display_name || "—",
        payeeSub: `@${b.seller_username || "—"} · ${b.seller_email || "—"}`,
        context: `${b.product_name} · pedido #${b.id_order}`,
        amount_cents: b.net_cents,
        dateMain: { label: "Pedido", value: b.order_created_at },
        dateRelease: b.available_at,
        paidAt: b.paid_out_at,
        payAction:
          b.status === "aprovado"
            ? { url: `/api/admin/seller-payouts/${b.id_balance}/mark-paid` }
            : undefined,
      })
    }

    for (const b of booking) {
      out.push({
        key: `agenda-${b.id_payout}`,
        origin: "agendamento",
        status: b.status,
        payee: b.profile_display_name || "—",
        payeeSub: `@${b.owner_username || "—"} · ${b.owner_email || "—"}`,
        context: `${b.service_name || "—"}${b.client_name ? ` · ${b.client_name}` : ""} · agend. #${b.id_booking}`,
        amount_cents: b.net_cents,
        dateMain: { label: "Criado", value: b.created_at },
        dateRelease: b.available_at,
        paidAt: b.paid_out_at,
        payAction:
          b.status === "aprovado"
            ? { url: `/api/admin/booking-payouts/${b.id_payout}/mark-paid` }
            : undefined,
      })
    }

    // Afiliados: modelo por conversão/batch (holdback + disputa). Aqui é só LEITURA;
    // a ação de pagar continua no fluxo dedicado /admin/afiliados.
    for (const a of affiliates) {
      const bucket =
        statusFilter === "aprovado"
          ? a.red_cents
          : statusFilter === "aguardando"
            ? a.green_cents
            : statusFilter === "pago"
              ? a.paid_cents
              : 0
      if (bucket <= 0) continue
      out.push({
        key: `afiliado-${a.id_affiliate}-${statusFilter}`,
        origin: "afiliado",
        status: statusFilter,
        payee: a.user_name || "—",
        payeeSub: a.user_email || "—",
        context: `${a.unpaid_count} conversão(ões) a pagar`,
        amount_cents: bucket,
        dateMain: { label: "Comissão + antiga", value: a.oldest_unpaid_at },
        dateRelease: a.oldest_unpaid_at,
        paidAt: null,
        manageHref: "/admin/afiliados",
      })
    }

    return out
  }, [seller, booking, affiliates, statusFilter])

  // Filtro origem + busca textual no client
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (originFilter !== "todas" && r.origin !== originFilter) return false
      if (!term) return true
      return (
        r.payee.toLowerCase().includes(term) ||
        r.payeeSub.toLowerCase().includes(term) ||
        r.context.toLowerCase().includes(term)
      )
    })
  }, [rows, originFilter, q])

  // Tiles combinados (somam as 3 origens, independentes do filtro de status).
  // ⚠️ Os totais do summary vêm como string (SUM do Postgres) — coerir p/ número
  // antes de somar, senão vira concatenação.
  const tiles = useMemo(() => {
    const n = (v: unknown) => Number(v) || 0
    const affAprovado = affiliates.reduce((s, a) => s + n(a.red_cents), 0)
    const affAguardando = affiliates.reduce((s, a) => s + n(a.green_cents), 0)
    const affPago = affiliates.reduce((s, a) => s + n(a.paid_cents), 0)
    return {
      aguardando:
        n(sellerSummary?.aguardando_cents) + n(bookingSummary?.aguardando_cents) + affAguardando,
      aprovado: n(sellerSummary?.aprovado_cents) + n(bookingSummary?.aprovado_cents) + affAprovado,
      pago: n(sellerSummary?.pago_cents) + n(bookingSummary?.pago_cents) + affPago,
    }
  }, [sellerSummary, bookingSummary, affiliates])

  async function markPaid(row: Row, note: string) {
    if (!row.payAction) return
    setBusyKey(row.key)
    setError(null)
    try {
      const token = getToken()
      const res = await fetch(row.payAction.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d?.error || "Falha ao marcar como pago")
        setBusyKey(null)
        return
      }
      setNoteFor(null)
      await load()
    } catch {
      setError("Erro de conexão")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Voltar
        </button>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HandCoins className="h-6 w-6 text-primary" aria-hidden />
            <div>
              <h1 className="text-2xl font-bold">Repasses</h1>
              <p className="text-xs text-muted-foreground">
                Saldos a pagar via PIX — Loja, Agendamentos e Afiliados num só extrato.
              </p>
            </div>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Tile label="Aguardando holdback" value={tiles.aguardando} icon={Clock} tone="amber" />
          <Tile label="Liberado a pagar" value={tiles.aprovado} icon={CheckCircle2} tone="emerald" />
          <Tile label="Já pago" value={tiles.pago} icon={CheckCircle2} tone="primary" />
          <Tile
            label="Total geral"
            value={tiles.aguardando + tiles.aprovado + tiles.pago}
            icon={HandCoins}
            tone="muted"
          />
        </div>

        {/* Status tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                statusFilter === t.key
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Origin filter + search */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["todas", "loja", "agendamento", "afiliado"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOriginFilter(o)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                originFilter === o
                  ? "bg-foreground/10 border-foreground/30 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {o === "todas" ? "Todas as origens" : ORIGIN_META[o].label}
            </button>
          ))}
          <div className="ml-auto flex w-full max-w-sm items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="beneficiário, email, contexto…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-rose-700 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
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
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Beneficiário</th>
                  <th className="px-3 py-2 text-left">Contexto</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Datas</th>
                  <th className="px-3 py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visible.map((r) => {
                  const meta = ORIGIN_META[r.origin]
                  const Icon = meta.icon
                  return (
                    <tr key={r.key} className="text-sm">
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}
                        >
                          <Icon className="h-3 w-3" aria-hidden /> {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium">{r.payee}</p>
                        <p className="text-[11px] text-muted-foreground">{r.payeeSub}</p>
                      </td>
                      <td className="px-3 py-2 align-top text-[12px]">{r.context}</td>
                      <td className="px-3 py-2 align-top text-right tabular-nums font-semibold">
                        {formatBRL(r.amount_cents)}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                        <p>
                          {r.dateMain.label}: {formatDate(r.dateMain.value)}
                        </p>
                        {r.dateRelease && <p>Libera: {formatDate(r.dateRelease)}</p>}
                        {r.paidAt && <p>Pago: {formatDate(r.paidAt)}</p>}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        {r.payAction ? (
                          <button
                            type="button"
                            disabled={busyKey === r.key}
                            onClick={() => {
                              setNoteFor(r)
                              setNoteValue("")
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {busyKey === r.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                            )}
                            Marcar pago
                          </button>
                        ) : r.manageHref ? (
                          <button
                            type="button"
                            onClick={() => router.push(r.manageHref!)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-700 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-950/30"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden /> Em Afiliados
                          </button>
                        ) : r.status === "pago" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                            <CheckCircle2 className="h-3 w-3" aria-hidden /> Pago
                          </span>
                        ) : r.status === "revertido" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-300">
                            <RotateCcw className="h-3 w-3" aria-hidden /> Revertido
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-300">Aguardando holdback</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {noteFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold">Confirmar pagamento</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {ORIGIN_META[noteFor.origin].label} · {noteFor.payee} · {formatBRL(noteFor.amount_cents)}.
              Confirme apenas após a transferência via PIX/banco.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Observação (opcional)
            </label>
            <input
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="ex: PIX e2e abcdef, 05/06"
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
                onClick={() => markPaid(noteFor, noteValue.trim())}
                disabled={busyKey === noteFor.key}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busyKey === noteFor.key ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Tile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  tone: "amber" | "emerald" | "primary" | "muted"
}) {
  const cls = {
    amber: "border-amber-700 bg-amber-950/30 text-amber-200",
    emerald: "border-emerald-700 bg-emerald-950/30 text-emerald-200",
    primary: "border-primary/40 bg-primary/10 text-primary",
    muted: "border-border bg-muted/30 text-muted-foreground",
  }[tone]
  return (
    <div className={`rounded-2xl border px-4 py-3 ${cls}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{formatBRL(value)}</p>
    </div>
  )
}
