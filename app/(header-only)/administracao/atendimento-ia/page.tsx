"use client"

/**
 * Painel Atendimento IA (admin) — planos do bot (preço mensal + limite de
 * tokens de LLM por ciclo) e assinantes (status da assinatura + estado do
 * provisionamento no bot, com re-provisionar manual).
 * Estilo dark utilitário (padrão admin) — pt-only como as demais telas admin.
 */
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bot, Loader2, RefreshCw, Plus, Save, X, AlertTriangle, CheckCircle2, Pencil, EyeOff,
} from "lucide-react"
import { getToken } from "@/lib/auth"

interface Plan {
  id_plan: number
  name: string
  description: string | null
  monthly_cents: number
  token_limit_monthly: number
  sort_order: number
  is_active: boolean
}
interface Sub {
  id_sub: number
  username: string | null
  user_name: string | null
  plan_name: string | null
  monthly_cents: number
  token_limit_monthly: number
  status: string
  provisioning_status: string
  provision_attempts: number
  provision_last_error: string | null
  current_period_end: string | null
  created_at: string
  activated_at: string | null
}
type PlanDraft = { name: string; description: string; monthly: string; tokens: string; sort: string }

const EMPTY_DRAFT: PlanDraft = { name: "", description: "", monthly: "", tokens: "", sort: "0" }
const fmtBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtTokens = (n: number) => Number(n).toLocaleString("pt-BR")
// ~3,5k tokens por atendimento (turno com playbook no prompt) — só estimativa.
const estAtendimentos = (tokens: number) => Math.max(1, Math.round(Number(tokens) / 3500))

const SUB_STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  past_due: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  pending: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
  canceled: "bg-red-500/15 text-red-300 border-red-500/40",
  expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}
const PROV_STYLE: Record<string, string> = {
  provisioned: "text-emerald-300",
  pending: "text-zinc-300",
  failed: "text-red-300",
  deprovisioned: "text-zinc-500",
}

export default function AdminAtendimentoIaPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [tab, setTab] = useState<"planos" | "assinantes">("planos")
  const [subStatus, setSubStatus] = useState("")

  // edição de plano (inline)
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT)
  const [savingPlan, setSavingPlan] = useState(false)
  const [reprovisioning, setReprovisioning] = useState<number | null>(null)

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = getToken()
    const res = await fetch(`/api/admin/atendimento-ia/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 || res.status === 403) { setAuthorized(false); throw new Error("forbidden") }
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
    return data
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        api("plans"),
        api(`subs${subStatus ? `?status=${subStatus}` : ""}`),
      ])
      setPlans(Array.isArray(p.plans) ? p.plans : [])
      setSubs(Array.isArray(s.subs) ? s.subs : [])
      setAuthorized(true)
    } catch (err) {
      if ((err as Error).message !== "forbidden") setMsg((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [api, subStatus])

  useEffect(() => {
    if (!getToken()) { router.push("/login?next=/administracao/atendimento-ia"); return }
    void load()
  }, [load, router])

  const openEdit = (p: Plan | null) => {
    if (p) {
      setEditing(p.id_plan)
      setDraft({
        name: p.name,
        description: p.description || "",
        monthly: (p.monthly_cents / 100).toFixed(2).replace(".", ","),
        tokens: String(p.token_limit_monthly),
        sort: String(p.sort_order),
      })
    } else {
      setEditing("new")
      setDraft(EMPTY_DRAFT)
    }
  }

  const savePlan = async () => {
    const monthly_cents = Math.round(Number(draft.monthly.replace(/\./g, "").replace(",", ".")) * 100)
    const token_limit_monthly = Math.round(Number(draft.tokens.replace(/\D/g, "")))
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      monthly_cents,
      token_limit_monthly,
      sort_order: Math.round(Number(draft.sort)) || 0,
    }
    setSavingPlan(true); setMsg(null)
    try {
      if (editing === "new") await api("plans", { method: "POST", body: JSON.stringify(body) })
      else await api(`plans/${editing}`, { method: "PATCH", body: JSON.stringify(body) })
      setEditing(null)
      await load()
      setMsg("Plano salvo.")
    } catch (err) {
      setMsg((err as Error).message)
    } finally { setSavingPlan(false) }
  }

  const togglePlanActive = async (p: Plan) => {
    setMsg(null)
    try {
      await api(`plans/${p.id_plan}`, { method: "PATCH", body: JSON.stringify({ is_active: !p.is_active }) })
      await load()
    } catch (err) { setMsg((err as Error).message) }
  }

  const reprovision = async (id_sub: number) => {
    setReprovisioning(id_sub); setMsg(null)
    try {
      await api(`subs/${id_sub}/reprovision`, { method: "POST" })
      setMsg(`Assinatura #${id_sub} re-provisionada.`)
      await load()
    } catch (err) {
      setMsg(`Re-provisionar falhou: ${(err as Error).message}`)
    } finally { setReprovisioning(null) }
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-950 text-sm font-bold text-zinc-400">
        Acesso restrito a administradores.
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 pb-16 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
            <Bot className="h-6 w-6 text-amber-400" /> Atendimento IA
          </h1>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Planos do bot (preço + limite de tokens LLM por ciclo) e assinantes. A venda liga/desliga na flag <code className="text-amber-300">atendimento_ia_venda</code> (Painel de Controle).
        </p>

        {msg && <p className="mt-3 inline-block border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-200">{msg}</p>}

        <div className="mt-6 flex gap-1 border-b border-zinc-800">
          {(["planos", "assinantes"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider ${tab === k ? "border-b-2 border-amber-400 text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}>
              {k === "planos" ? `Planos (${plans.length})` : `Assinantes (${subs.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
        ) : tab === "planos" ? (
          <section className="mt-5">
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => openEdit(null)} className="inline-flex items-center gap-2 border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-black uppercase text-amber-300 hover:bg-amber-500/20">
                <Plus className="h-4 w-4" /> Novo plano
              </button>
            </div>
            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Plano</th>
                    <th className="px-3 py-2">Preço/mês</th>
                    <th className="px-3 py-2">Tokens/mês</th>
                    <th className="px-3 py-2">~Atendimentos*</th>
                    <th className="px-3 py-2">Ordem</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {plans.map((p) => (
                    <tr key={p.id_plan} className={p.is_active ? "" : "opacity-50"}>
                      <td className="px-3 py-2">
                        <p className="font-bold">{p.name}</p>
                        {p.description && <p className="text-xs text-zinc-500">{p.description}</p>}
                      </td>
                      <td className="px-3 py-2 font-mono">{fmtBRL(p.monthly_cents)}</td>
                      <td className="px-3 py-2 font-mono">{fmtTokens(p.token_limit_monthly)}</td>
                      <td className="px-3 py-2 text-zinc-400">~{estAtendimentos(p.token_limit_monthly)}</td>
                      <td className="px-3 py-2">{p.sort_order}</td>
                      <td className="px-3 py-2">
                        {p.is_active
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> ativo</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500"><EyeOff className="h-3.5 w-3.5" /> oculto</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => openEdit(p)} className="mr-2 inline-flex items-center gap-1 border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button type="button" onClick={() => togglePlanActive(p)} className="inline-flex items-center gap-1 border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800">
                          {p.is_active ? "Ocultar" : "Reativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Nenhum plano — a mig 175 seeda 3 exemplos no boot.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">* estimativa (~3,5k tokens por resposta com a base de conhecimento no prompt) — não é contrato. Mudar um plano NÃO muda assinaturas existentes (snapshot na compra).</p>

            {editing !== null && (
              <div className="mt-4 border border-amber-500/40 bg-zinc-900 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">{editing === "new" ? "Novo plano" : `Editar plano #${editing}`}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="text-xs font-bold text-zinc-400">Nome
                    <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none" />
                  </label>
                  <label className="text-xs font-bold text-zinc-400">Preço/mês (R$)
                    <input value={draft.monthly} onChange={(e) => setDraft((d) => ({ ...d, monthly: e.target.value }))} inputMode="decimal" placeholder="29,90" className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none" />
                  </label>
                  <label className="text-xs font-bold text-zinc-400">Tokens/mês
                    <input value={draft.tokens} onChange={(e) => setDraft((d) => ({ ...d, tokens: e.target.value }))} inputMode="numeric" placeholder="300000" className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none" />
                  </label>
                  <label className="text-xs font-bold text-zinc-400">Ordem
                    <input value={draft.sort} onChange={(e) => setDraft((d) => ({ ...d, sort: e.target.value }))} inputMode="numeric" className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none" />
                  </label>
                  <label className="text-xs font-bold text-zinc-400 sm:col-span-2 lg:col-span-1">Descrição
                    <input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} maxLength={300} className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none" />
                  </label>
                </div>
                {draft.tokens && (
                  <p className="mt-2 text-[11px] text-zinc-500">≈ {estAtendimentos(Number(draft.tokens.replace(/\D/g, "")) || 0)} atendimentos/mês</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={savingPlan} onClick={savePlan} className="inline-flex items-center gap-2 border border-amber-500/60 bg-amber-500/15 px-4 py-1.5 text-xs font-black uppercase text-amber-300 hover:bg-amber-500/25 disabled:opacity-50">
                    {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-2 border border-zinc-700 px-4 py-1.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800">
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-zinc-500">Status:</span>
              {["", "active", "past_due", "pending", "canceled"].map((s) => (
                <button key={s || "todos"} type="button" onClick={() => setSubStatus(s)}
                  className={`border px-2.5 py-1 text-xs font-bold ${subStatus === s ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>
                  {s || "todos"}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Assinante</th>
                    <th className="px-3 py-2">Plano</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Provisionamento</th>
                    <th className="px-3 py-2">Renova em</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {subs.map((s) => (
                    <tr key={s.id_sub}>
                      <td className="px-3 py-2">
                        <p className="font-bold">@{s.username || "?"}</p>
                        <p className="text-xs text-zinc-500">{s.user_name}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>{s.plan_name || "—"}</p>
                        <p className="text-xs font-mono text-zinc-500">{fmtBRL(s.monthly_cents)} · {fmtTokens(s.token_limit_monthly)} tk</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block border px-2 py-0.5 text-[11px] font-bold ${SUB_STATUS_STYLE[s.status] || SUB_STATUS_STYLE.pending}`}>{s.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        <p className={`text-xs font-bold ${PROV_STYLE[s.provisioning_status] || "text-zinc-400"}`}>
                          {s.provisioning_status}{s.provision_attempts ? ` (${s.provision_attempts}x)` : ""}
                        </p>
                        {s.provision_last_error && (
                          <p className="mt-0.5 flex items-start gap-1 text-[11px] text-red-400"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {s.provision_last_error}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-400">
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {["active", "past_due"].includes(s.status) && (
                          <button type="button" disabled={reprovisioning === s.id_sub} onClick={() => reprovision(s.id_sub)}
                            className="inline-flex items-center gap-1 border border-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
                            {reprovisioning === s.id_sub ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-provisionar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {subs.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-500">Nenhum assinante{subStatus ? ` com status "${subStatus}"` : ""}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Re-provisionar re-cunha os tokens e refaz o push pro bot (usar quando o bot ficou fora do ar e as tentativas esgotaram).</p>
          </section>
        )}
      </div>
    </div>
  )
}
