"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, FlaskConical, Loader2, Trash2, RefreshCw } from "lucide-react"
import { getToken } from "@/lib/auth"

type Product = { id_profile_product: number; name: string; price_amount: number; display_name: string }
type State = {
  order?: Record<string, unknown>
  case?: { state: string; window_ends_at: string | null; cleared_at: string | null } | null
  proofs?: { kind: string; tracking_code: string | null }[]
  dispute?: { id: number; reason_code: string; state: string; resolution_note: string | null } | null
  return?: { reverse_status: string; reverse_auth_code: string | null; reverse_tracking_code: string | null } | null
  balance?: { status: string; net_cents: number; available_at: string } | null
}

const REASONS = [
  { value: "product_wrong", label: "Chegou errado (gera devolução)" },
  { value: "product_defective", label: "Com defeito (gera devolução)" },
  { value: "product_not_arrived", label: "Não chegou" },
  { value: "scam", label: "Golpe" },
  { value: "other", label: "Outro" },
]

function brl(c?: number) { return ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }

export default function ProtecaoTestePage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState<number | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [state, setState] = useState<State | null>(null)
  const [reason, setReason] = useState("product_wrong")
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])

  const api = useCallback(async (path: string, body?: Record<string, unknown>) => {
    const tk = getToken()
    const res = await fetch(`/api/admin/protection-test/${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${tk}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d?.error || `HTTP ${res.status}`)
    return d
  }, [])

  const addLog = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString("pt-BR")} · ${s}`, ...l].slice(0, 20))

  const loadProducts = useCallback(async () => {
    try {
      const d = await api("products")
      setProducts(d.products || [])
      if (d.products?.[0]) setProductId(d.products[0].id_profile_product)
    } catch (e) { addLog(`erro produtos: ${(e as Error).message}`) }
  }, [api])

  useEffect(() => { loadProducts() }, [loadProducts])

  const run = async (label: string, fn: () => Promise<State>) => {
    setBusy(label)
    try {
      const d = await fn()
      setState(d)
      if (d.order && (d.order as { id_order?: number }).id_order) setOrderId((d.order as { id_order: number }).id_order)
      addLog(`${label}: caso=${d.case?.state || "—"} disputa=${d.dispute?.state || "—"} saldo=${d.balance?.status || "—"}`)
    } catch (e) {
      addLog(`${label} FALHOU: ${(e as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const refresh = () => { if (orderId) run("atualizar", () => api(`state?order_id=${orderId}`)) }

  const Btn = ({ id, label, onClick, disabled }: { id: string; label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!!busy || disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary/50 hover:text-primary disabled:opacity-40"
    >
      {busy === id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  )

  const caseState = state?.case?.state
  const disputeState = state?.dispute?.state

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <button onClick={() => router.push("/admin")} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className="mt-4 mb-2 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 ring-1 ring-white/10">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Proteção — Painel de teste</h1>
            <p className="text-sm text-muted-foreground">Simula a compra e o recebimento com o seu próprio perfil, sem Stripe/Melhor Envio reais.</p>
          </div>
        </div>
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Ferramenta temporária. Pedidos criados aqui são marcados como <code>TEST-</code> e podem ser apagados no botão “Limpar testes”.
        </div>

        {/* Setup */}
        <section className="mb-6 rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">1 · Criar pedido de teste</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você não tem produtos. Crie um produto na sua Loja (subperfil pago) para simular a compra de si mesmo.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select value={productId ?? ""} onChange={(e) => setProductId(Number(e.target.value))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                {products.map((p) => <option key={p.id_profile_product} value={p.id_profile_product}>{p.name} · {brl(p.price_amount)}</option>)}
              </select>
              <Btn id="seed" label="Comprar (simular pagamento)" onClick={() => run("seed", () => api("seed", { id_profile_product: productId }))} />
            </div>
          )}
        </section>

        {orderId && (
          <>
            {/* Estado */}
            <section className="mb-6 rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Estado atual — pedido #{orderId}</h2>
                <button onClick={refresh} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /> atualizar</button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile label="Caso" value={caseState || "—"} />
                <Tile label="Disputa" value={disputeState || "—"} />
                <Tile label="Devolução" value={state?.return?.reverse_status || "—"} />
                <Tile label="Saldo vendedor" value={state?.balance ? `${state.balance.status} · ${brl(state.balance.net_cents)}` : "não armado"} />
              </div>
              {state?.return?.reverse_auth_code && (
                <p className="mt-2 text-xs text-muted-foreground">Código de devolução (fake): <span className="font-mono text-foreground">{state.return.reverse_auth_code}</span></p>
              )}
              {state?.dispute?.resolution_note && (
                <p className="mt-1 text-xs text-muted-foreground">Nota: {state.dispute.resolution_note}</p>
              )}
            </section>

            {/* Vendedor */}
            <section className="mb-6 rounded-xl border border-border p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">2 · Vendedor (você)</h2>
              <div className="flex flex-wrap gap-2">
                <Btn id="ship" label="Confirmar postagem (foto + rastreio)" onClick={() => run("ship", () => api("ship", { order_id: orderId }))} disabled={caseState !== "awaiting_fulfillment"} />
                <Btn id="advance-window" label="Pular janela de 7 dias → liberar repasse" onClick={() => run("advance-window", () => api("advance-window", { order_id: orderId }))} disabled={caseState !== "dispute_window"} />
              </div>
            </section>

            {/* Comprador */}
            <section className="mb-6 rounded-xl border border-border p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">3 · Comprador (você) — abrir disputa</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <Btn id="dispute" label="Abrir disputa" onClick={() => run("dispute", () => api("dispute", { order_id: orderId, reason_code: reason }))} disabled={!caseState || !["dispute_window", "awaiting_fulfillment"].includes(caseState)} />
              </div>
            </section>

            {/* Resolução / simulações */}
            <section className="mb-6 rounded-xl border border-border p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">4 · Desfecho</h2>
              <div className="flex flex-wrap gap-2">
                <Btn id="reverse-delivered" label="Simular devolução entregue → reembolso" onClick={() => run("reverse-delivered", () => api("reverse-delivered", { order_id: orderId }))} disabled={!disputeState || !["awaiting_return", "return_in_transit"].includes(disputeState)} />
                <Btn id="not-arrived-refund" label="Forçar reembolso (não chegou/escalado)" onClick={() => run("not-arrived-refund", () => api("not-arrived-refund", { order_id: orderId }))} disabled={disputeState !== "escalated_admin"} />
                <Btn id="admin-refund" label="Admin: Reembolsar" onClick={() => run("admin-refund", () => api("admin-resolve", { order_id: orderId, action: "refund" }))} disabled={disputeState !== "escalated_admin"} />
                <Btn id="admin-release" label="Admin: Liberar vendedor" onClick={() => run("admin-release", () => api("admin-resolve", { order_id: orderId, action: "release" }))} disabled={disputeState !== "escalated_admin"} />
              </div>
            </section>
          </>
        )}

        {/* Log + limpeza */}
        <section className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h2>
            <button onClick={() => run("cleanup", async () => { const d = await api("cleanup", {}); setOrderId(null); setState(null); return d as State })} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Limpar testes
            </button>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {log.length === 0 ? <li>Nenhuma ação ainda.</li> : log.map((l, i) => <li key={i} className="font-mono">{l}</li>)}
          </ul>
        </section>
      </main>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  )
}
