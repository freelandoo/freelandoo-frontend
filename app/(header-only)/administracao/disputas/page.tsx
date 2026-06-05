"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldAlert, Loader2, X, Truck, Package } from "lucide-react"
import { getToken } from "@/lib/auth"

type DisputeRow = {
  id: number
  domain: "product" | "booking"
  ref_id: number
  reason_code: string
  state: string
  description: string | null
  resolution_note: string | null
  created_at: string
  buyer_username: string | null
  buyer_email: string | null
}

type Detail = {
  dispute: DisputeRow
  evidence: { id: number; role: string; photo_url: string | null; note: string | null }[]
  proofs: { id: number; kind: string; photo_url: string | null; tracking_code: string | null }[]
  return: {
    reverse_status: string
    reverse_tracking_code: string | null
    reverse_auth_code: string | null
    reverse_label_url: string | null
  } | null
  ref: Record<string, unknown> | null
}

const REASON_LABEL: Record<string, string> = {
  product_not_arrived: "Não chegou",
  product_wrong: "Chegou errado",
  product_defective: "Com defeito",
  service_no_show: "Não apareceu",
  scam: "Golpe",
  other: "Outro",
}
const STATE_LABEL: Record<string, string> = {
  open: "Aberta",
  awaiting_return: "Devolução pendente",
  return_in_transit: "Devolução a caminho",
  return_delivered: "Devolução entregue",
  resolved_refund: "Reembolsado",
  resolved_release: "Liberado",
  escalated_admin: "Escalado p/ admin",
}
const TABS = [
  { key: "escalated_admin", label: "Escalados" },
  { key: "awaiting_return", label: "Em devolução" },
  { key: "open", label: "Abertos" },
  { key: "resolved_refund", label: "Reembolsados" },
  { key: "resolved_release", label: "Liberados" },
  { key: "", label: "Todos" },
]

export default function AdminDisputesPage() {
  const router = useRouter()
  const [items, setItems] = useState<DisputeRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [tab, setTab] = useState("escalated_admin")
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [acting, setActing] = useState(false)
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    const tk = getToken()
    if (!tk) return
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (tab) qs.set("state", tab)
      const res = await fetch(`/api/admin/disputes?${qs.toString()}`, { headers: { Authorization: `Bearer ${tk}` } })
      const d = await res.json()
      if (res.ok) {
        setItems(d.items || [])
        const c: Record<string, number> = {}
        for (const row of d.counts || []) c[row.state] = row.c
        setCounts(c)
      }
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  const openDetail = async (id: number) => {
    setDetailId(id)
    setDetail(null)
    setNote("")
    const tk = getToken()
    const res = await fetch(`/api/admin/disputes/${id}`, { headers: { Authorization: `Bearer ${tk}` } })
    const d = await res.json()
    if (res.ok) setDetail(d)
  }

  const resolve = async (action: "refund" | "release") => {
    if (!detailId) return
    const tk = getToken()
    setActing(true)
    try {
      const res = await fetch(`/api/admin/disputes/${detailId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d?.error || "Falha ao resolver"); return }
      setDetailId(null); setDetail(null)
      await load()
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <button onClick={() => router.push("/admin")} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className="mt-4 mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-white/10">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Disputas</h1>
            <p className="text-sm text-muted-foreground">Proteção de pagamento — devoluções e reembolsos.</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key || "all"}
              onClick={() => setTab(t.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${tab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}{t.key && counts[t.key] ? ` (${counts[t.key]})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            <ShieldAlert className="mx-auto mb-3 h-7 w-7 opacity-50" />
            <p className="text-sm font-medium">Nenhuma disputa aqui</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-left">Comprador</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 tabular-nums">{d.id}</td>
                    <td className="px-3 py-2">{d.domain === "product" ? "Produto" : "Serviço"} #{d.ref_id}</td>
                    <td className="px-3 py-2">{REASON_LABEL[d.reason_code] || d.reason_code}</td>
                    <td className="px-3 py-2">{d.buyer_username || d.buyer_email || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{STATE_LABEL[d.state] || d.state}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => openDetail(d.id)} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium hover:border-primary/50 hover:text-primary">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <button onClick={() => { setDetailId(null); setDetail(null) }} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
              <X className="h-4 w-4" />
            </button>
            {!detail ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <div className="max-h-[85vh] overflow-y-auto p-5">
                <h2 className="text-lg font-semibold">
                  {REASON_LABEL[detail.dispute.reason_code] || detail.dispute.reason_code}
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] align-middle">{STATE_LABEL[detail.dispute.state] || detail.dispute.state}</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Disputa #{detail.dispute.id} · {detail.dispute.domain === "product" ? "Pedido" : "Agendamento"} #{detail.dispute.ref_id} · {detail.dispute.buyer_email}
                </p>
                {detail.dispute.description && <p className="mt-3 whitespace-pre-wrap text-sm">{detail.dispute.description}</p>}

                {detail.return && (
                  <div className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-xs">
                    <p className="flex items-center gap-1 font-medium"><Truck className="h-3.5 w-3.5" /> Devolução: {detail.return.reverse_status}</p>
                    {detail.return.reverse_tracking_code && <p className="mt-1 font-mono">Rastreio: {detail.return.reverse_tracking_code}</p>}
                  </div>
                )}

                {detail.proofs.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Provas do vendedor/prestador</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.proofs.map((p) => p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.id} src={p.photo_url} alt={p.kind} title={p.kind} className="h-20 w-20 rounded-md border border-border object-cover" />
                      ) : null)}
                    </div>
                  </div>
                )}

                {detail.evidence.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evidências da disputa</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.evidence.map((e) => e.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={e.id} src={e.photo_url} alt={e.role} title={e.role} className="h-20 w-20 rounded-md border border-border object-cover" />
                      ) : null)}
                    </div>
                  </div>
                )}

                {detail.dispute.state !== "resolved_refund" && detail.dispute.state !== "resolved_release" && (
                  <div className="mt-5 border-t border-border pt-4">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nota da resolução (obrigatória)"
                      rows={2}
                      className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={acting || !note.trim()}
                        onClick={() => resolve("refund")}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                        Reembolsar comprador
                      </button>
                      <button
                        disabled={acting || !note.trim()}
                        onClick={() => resolve("release")}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        Liberar vendedor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
