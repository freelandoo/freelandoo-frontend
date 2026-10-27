"use client"

// Repasses das mensalidades de academia pagas pela Freelandoo (mig 310).
// O PIX é MANUAL: depois do holdback o repasse fica "Liberado"; o admin copia
// a chave, faz a transferência no banco e marca pago aqui. Admin interno —
// sem i18n (regra 1).

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Copy, Dumbbell, Loader2 } from "lucide-react"
import { PageBackLink } from "@/components/tabloide/PageBackLink"

type Status = "aguardando" | "aprovado" | "pago" | "revertido" | "devido"

interface Item {
  id_payout: string
  academy_nome: string
  academy_slug: string
  member_name: string | null
  external_id: string
  charge_cents: number
  processor_fee_cents: number
  platform_fee_cents: number
  net_cents: number
  status: Status
  available_at: string
  paid_out_at: string | null
  paid_out_note: string | null
  pix_key_type: string | null
  pix_key: string | null
  holder_name: string | null
  holder_doc_type: string | null
  holder_doc: string | null
  academy_notified_at: string | null
  academy_notify_error: string | null
}

const TABS: { key: Status; label: string }[] = [
  { key: "aprovado", label: "Liberados (pagar)" },
  { key: "aguardando", label: "Aguardando holdback" },
  { key: "pago", label: "Pagos" },
  { key: "devido", label: "Devido pela academia" },
  { key: "revertido", label: "Revertidos" },
]

const brl = (c: number) => ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—")

export default function AcademyPayoutsAdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Status>("aprovado")
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.push("/login")
      return
    }
    setItems(null)
    setError(null)
    try {
      const r = await fetch(`/api/admin/academy-payouts?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || "Erro ao carregar")
      setItems(d.payouts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro")
      setItems([])
    }
  }, [tab, router])

  useEffect(() => {
    void load()
  }, [load])

  async function markPaid(id: string) {
    const note = window.prompt("Nota do PIX (opcional — id da transação, banco…)") ?? null
    if (note === null) return
    setBusy(id)
    try {
      const token = localStorage.getItem("token")
      const r = await fetch(`/api/admin/academy-payouts/${id}/paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || "Falha")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro")
    } finally {
      setBusy(null)
    }
  }

  const total = (items ?? []).reduce((s, i) => s + i.net_cents, 0)

  return (
    <main className="fl-sharp min-h-[100dvh] bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <PageBackLink href="/admin" />
        <header className="mb-6 mt-3 flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold">Academias — repasses de mensalidade</h1>
            <p className="text-xs text-muted-foreground">
              Aluno pagou pela Freelandoo; líquido = mensalidade − tarifa Mercado Pago − taxa Freelandoo. PIX manual após o holdback.
            </p>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${tab === t.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
          {items && items.length > 0 && (
            <span className="ml-auto self-center text-sm font-bold">
              {items.length} · {brl(total)}
            </span>
          )}
        </div>

        {error && <p className="mb-3 border border-rose-700 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p>}

        {items === null ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">Nada por aqui.</div>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.id_payout} className="border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {i.academy_nome} <span className="text-xs text-muted-foreground">/{i.academy_slug}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aluno: {i.member_name || "—"} · cobrança {i.external_id} · liberado em {day(i.available_at)}
                      {i.paid_out_at ? ` · pago em ${day(i.paid_out_at)}` : ""}
                    </p>
                    {i.academy_notify_error && (
                      <p className="mt-1 text-xs font-semibold text-amber-500">
                        Academia: {i.academy_notify_error}
                        {!i.academy_notified_at ? " (baixa ainda não confirmada — tentando de novo)" : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{brl(i.net_cents)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {brl(i.charge_cents)} − {brl(i.processor_fee_cents)} MP − {brl(i.platform_fee_cents)} Freelandoo
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="text-xs">
                    {i.pix_key ? (
                      <>
                        <p>
                          PIX ({i.pix_key_type}): <span className="font-mono font-bold">{i.pix_key}</span>{" "}
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard?.writeText(i.pix_key || "")}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Copy className="h-3 w-3" /> copiar
                          </button>
                        </p>
                        <p className="text-muted-foreground">
                          Titular: {i.holder_name} · {i.holder_doc_type?.toUpperCase()} {i.holder_doc}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-rose-400">Academia sem chave PIX cadastrada (ou selo ilegível).</p>
                    )}
                  </div>
                  {i.status === "aprovado" && (
                    <button
                      type="button"
                      disabled={busy === i.id_payout || !i.pix_key}
                      onClick={() => void markPaid(i.id_payout)}
                      className="inline-flex items-center gap-1.5 border border-emerald-600 bg-emerald-600/15 px-3 py-1.5 text-xs font-bold uppercase text-emerald-400 disabled:opacity-50"
                    >
                      {busy === i.id_payout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Marcar PIX feito
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
