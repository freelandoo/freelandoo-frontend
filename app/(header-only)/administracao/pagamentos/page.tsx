"use client"

/**
 * Painel de Pagamentos (admin) — saúde do fluxo de dinheiro (projeto PayDebug).
 * Três blocos: eventos de webhook (failed/pending/done) com reprocessar,
 * pendentes "presos" por fluxo, e reconciliação manual contra o Stripe.
 * Estilo dark utilitário (padrão admin) — pt-only como as demais telas admin.
 */
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock, Wallet,
  RotateCcw, PlayCircle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// tipos
// ---------------------------------------------------------------------------
interface WebhookEvent {
  id_event: number
  event_id: string
  event_type: string
  status: string
  attempts: number
  last_error: string | null
  processed_at: string | null
  completed_at: string | null
  updated_at: string | null
}
interface StuckFlow { flow: string; count: number; error?: string }
type Counts = Record<string, number>

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const FLOW_LABEL: Record<string, string> = {
  loja_produto: "Loja (produto)",
  polens: "Poléns",
  premium: "Premium",
  ativacao: "Ativação",
  casa: "Casa Views",
  agendamento: "Agendamento",
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

function statusStyle(status: string) {
  switch (status) {
    case "failed": return { dot: "bg-red-500", text: "text-red-400", ring: "border-red-500/30" }
    case "pending": return { dot: "bg-amber-500", text: "text-amber-400", ring: "border-amber-500/30" }
    case "done": return { dot: "bg-green-500", text: "text-green-400", ring: "border-green-500/30" }
    default: return { dot: "bg-gray-500", text: "text-gray-400", ring: "border-gray-500/30" }
  }
}

// ---------------------------------------------------------------------------
// página
// ---------------------------------------------------------------------------
export default function PagamentosAdminPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdmin = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Pagamentos</h1>
            <p className="text-sm text-muted-foreground">Saúde do webhook · pendentes presos · reconciliação com o Stripe</p>
          </div>
        </div>

        <StuckSection />
        <EventsSection />
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pendentes presos + reconciliação
// ---------------------------------------------------------------------------
function StuckSection() {
  const [hours, setHours] = useState(24)
  const [data, setData] = useState<{ total: number; flows: StuckFlow[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback((h: number) => {
    setLoading(true)
    fetch(`/api/admin/payments/stuck?hours=${h}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setData({ total: d.total || 0, flows: d.flows || [] }))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load(hours) }, [load, hours])

  async function reconcile() {
    setReconciling(true); setMsg(null)
    try {
      const r = await fetch("/api/admin/payments/reconcile", { method: "POST", headers: authHeaders() })
      const d = await r.json()
      if (r.ok) {
        setMsg({ ok: true, text: `Reconciliação: ${d.checked} sessões verificadas, ${d.recovered} recuperada(s).` })
        load(hours)
      } else {
        setMsg({ ok: false, text: d.error || "Erro ao reconciliar." })
      }
    } catch { setMsg({ ok: false, text: "Erro de rede ao reconciliar." }) } finally { setReconciling(false) }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground">Pendentes presos</h2>
          <span className="text-xs text-muted-foreground">pagamentos sem confirmação há mais de</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary/40 focus:outline-none">
            {[1, 6, 12, 24, 48, 72, 168].map((h) => <option key={h} value={h}>{h}h</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(hours)} disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/40 hover:text-primary disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </button>
          <button onClick={reconcile} disabled={reconciling}
            className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50">
            {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reconciliar com o Stripe
          </button>
        </div>
      </div>

      {msg && (
        <p className={`rounded-md border px-3 py-2 text-sm ${msg.ok ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          {msg.text}
        </p>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {data && data.total === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" /> Nenhum pagamento preso na janela de {hours}h.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {(data?.flows || []).map((f) => (
                <div key={f.flow} className={`rounded-lg border p-3 ${f.count > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"}`}>
                  <div className={`text-xl font-bold ${f.count > 0 ? "text-amber-400" : "text-foreground"}`}>{f.count}</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{FLOW_LABEL[f.flow] || f.flow}</p>
                  {f.error && <p className="mt-1 text-[10px] text-red-400/70" title={f.error}>tabela indisponível</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Eventos de webhook
// ---------------------------------------------------------------------------
const STATUS_FILTERS: [string, string][] = [
  ["failed", "Com falha"],
  ["pending", "Pendentes"],
  ["done", "Concluídos"],
  ["", "Todos"],
]

function EventsSection() {
  const [status, setStatus] = useState("failed")
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [counts, setCounts] = useState<Counts>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback((st: string) => {
    setLoading(true)
    const qs = st ? `?status=${st}&limit=100` : "?limit=100"
    fetch(`/api/admin/payments/webhook-events${qs}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setEvents(d.events || []); setCounts(d.counts || {}) })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load(status) }, [load, status])

  async function reprocess(eventId: string) {
    setBusyId(eventId); setMsg(null)
    try {
      const r = await fetch(`/api/admin/payments/webhook-events/${encodeURIComponent(eventId)}/reprocess`, {
        method: "POST", headers: authHeaders(),
      })
      const d = await r.json()
      if (r.ok && d.ok) {
        setMsg({ ok: true, text: `Evento ${eventId} reprocessado com sucesso.` })
        load(status)
      } else {
        setMsg({ ok: false, text: d.error ? `Falha ao reprocessar: ${d.error}` : "Falha ao reprocessar." })
      }
    } catch { setMsg({ ok: false, text: "Erro de rede ao reprocessar." }) } finally { setBusyId(null) }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-foreground">Eventos de webhook</h2>
        </div>
        <button onClick={() => load(status)} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/40 hover:text-primary disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </button>
      </div>

      {/* Filtros com contagem */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(([id, label]) => {
          const c = id ? (counts[id] ?? 0) : Object.values(counts).reduce((s, n) => s + n, 0)
          const active = status === id
          return (
            <button key={id || "all"} onClick={() => setStatus(id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${active ? "bg-primary/20" : "bg-muted/40"}`}>{c}</span>
            </button>
          )
        })}
      </div>

      {msg && (
        <p className={`rounded-md border px-3 py-2 text-sm ${msg.ok ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          {msg.text}
        </p>
      )}

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : events.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" /> Nenhum evento {status ? `"${STATUS_FILTERS.find((f) => f[0] === status)?.[1].toLowerCase()}"` : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Event ID</th>
                <th className="px-3 py-2 font-medium">Tent.</th>
                <th className="px-3 py-2 font-medium">Recebido</th>
                <th className="px-3 py-2 font-medium">Erro</th>
                <th className="px-3 py-2 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const s = statusStyle(e.status)
                return (
                  <tr key={e.id_event} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${s.ring} ${s.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{e.event_type}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{e.event_id}</td>
                    <td className="px-3 py-2 text-center text-foreground">{e.attempts}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{fmtDate(e.processed_at)}</td>
                    <td className="max-w-[260px] px-3 py-2 text-xs text-red-400/80">
                      {e.last_error ? <span className="line-clamp-2" title={e.last_error}>{e.last_error}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {e.status === "done" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> ok</span>
                      ) : (
                        <button onClick={() => reprocess(e.event_id)} disabled={busyId === e.event_id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50">
                          {busyId === e.event_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          Reprocessar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
