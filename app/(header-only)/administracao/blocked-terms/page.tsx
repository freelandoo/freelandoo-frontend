"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, Loader2, Plus, Trash2, Save, Undo2, ShieldX } from "lucide-react"
import { useRouter } from "next/navigation"

interface BlockedTerm {
  id_blocked_term: number
  term: string
  normalized_term: string
  category: string
  severity: "low" | "medium" | "high" | "critical"
  action: "allow" | "warn" | "mask" | "block" | "review" | "mute_temp" | "ban_temp"
  language: string
  is_regex: boolean
  status: "active" | "paused"
  notes: string | null
}

interface PendingAdd {
  _temp_id: string
  term: string
  category: string
  severity: BlockedTerm["severity"]
  action: BlockedTerm["action"]
  language: string
  is_regex: boolean
  status: BlockedTerm["status"]
  notes?: string | null
}

const CATEGORIES = [
  "profanity","harassment","hate","sexual","drugs","weapons","fraud","spam",
  "platform_evasion","personal_data","minors_safety","forbidden_services",
  "forbidden_products","suspicious_links",
] as const

const SEVERITIES = ["low","medium","high","critical"] as const
const ACTIONS = ["allow","warn","mask","block","review","mute_temp","ban_temp"] as const

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export default function BlockedTermsPage() {
  const router = useRouter()
  const [items, setItems] = useState<BlockedTerm[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<"active" | "paused" | "">("active")
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Partial<BlockedTerm> | null>(null)

  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set())
  const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>([])
  const [saving, setSaving] = useState(false)

  const pendingCount = pendingDeletes.size + pendingAdds.length

  async function load() {
    const token = getToken()
    if (!token) { router.push("/login"); return }
    setState("loading"); setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (category) params.set("category", category)
      if (statusFilter) params.set("status", statusFilter)
      params.set("limit", "200")
      const res = await fetch(`/api/admin/blocked-terms?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      })
      const d = await res.json()
      if (!res.ok) { setError(d?.error || "Erro"); setState("error"); return }
      setItems((d.items || []) as BlockedTerm[])
      setState("loaded")
    } catch {
      setError("Erro de conexão"); setState("error")
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, statusFilter])

  function toggleDelete(id: number) {
    setPendingDeletes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removePendingAdd(tempId: string) {
    setPendingAdds((prev) => prev.filter((p) => p._temp_id !== tempId))
  }

  async function handleEditingSave() {
    if (!editing) return
    if (!editing.term || !editing.category) {
      setError("term e category são obrigatórios"); return
    }
    if (editing.id_blocked_term) {
      const token = getToken()
      try {
        const res = await fetch(`/api/admin/blocked-terms/${editing.id_blocked_term}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        })
        const d = await res.json()
        if (!res.ok) { setError(d?.error || "Falha ao salvar"); return }
        setEditing(null)
        await load()
      } catch { setError("Erro de conexão") }
      return
    }
    setPendingAdds((prev) => [
      ...prev,
      {
        _temp_id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        term: editing.term!,
        category: editing.category!,
        severity: (editing.severity || "medium") as BlockedTerm["severity"],
        action: (editing.action || "mask") as BlockedTerm["action"],
        language: editing.language || "pt-BR",
        is_regex: !!editing.is_regex,
        status: (editing.status || "active") as BlockedTerm["status"],
        notes: editing.notes ?? null,
      },
    ])
    setEditing(null)
    setError(null)
  }

  async function commitChanges() {
    if (pendingCount === 0) return
    const token = getToken()
    if (!token) { router.push("/login"); return }
    setSaving(true); setError(null)
    try {
      for (const id of pendingDeletes) {
        const res = await fetch(`/api/admin/blocked-terms/${id}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const d = await res.json().catch(() => null)
          throw new Error(d?.error || `Falha ao apagar termo #${id}`)
        }
      }
      for (const add of pendingAdds) {
        const payload = {
          term: add.term,
          category: add.category,
          severity: add.severity,
          action: add.action,
          language: add.language,
          is_regex: add.is_regex,
          status: add.status,
          notes: add.notes ?? null,
        }
        const res = await fetch(`/api/admin/blocked-terms`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => null)
          throw new Error(d?.error || `Falha ao criar termo "${add.term}"`)
        }
      }
      setPendingDeletes(new Set())
      setPendingAdds([])
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao aplicar alterações")
    } finally {
      setSaving(false)
    }
  }

  function discardChanges() {
    setPendingDeletes(new Set())
    setPendingAdds([])
    setError(null)
  }

  const visiblePendingAdds = useMemo(() => {
    return pendingAdds.filter((a) => {
      if (q.trim() && !a.term.toLowerCase().includes(q.trim().toLowerCase())) return false
      if (category && a.category !== category) return false
      if (statusFilter && a.status !== statusFilter) return false
      return true
    })
  }, [pendingAdds, q, category, statusFilter])

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-8 pb-28">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/administracao")}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Voltar
        </button>

        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldX className="h-6 w-6 text-primary" aria-hidden />
            <div>
              <h1 className="text-2xl font-bold">Termos bloqueados</h1>
              <p className="text-xs text-muted-foreground">Lista própria do Freelandoo (complementa o filtro base).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing({
              term: "", category: "profanity", severity: "medium",
              action: "mask", language: "pt-BR", is_regex: false, status: "active",
            })}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Novo termo
          </button>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load() }}
            placeholder="Buscar..."
            className="w-full max-w-xs rounded-full border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary">
            <option value="">Todas categorias</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "active" | "paused" | "")}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary">
            <option value="">Todos status</option>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
          </select>
          <button type="button" onClick={load} className="text-xs font-semibold text-primary hover:underline">Buscar</button>
        </div>

        {error && <p className="mb-3 rounded-lg border border-rose-700 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p>}

        {state === "loading" ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : items.length === 0 && visiblePendingAdds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum termo encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Termo</th>
                  <th className="px-3 py-2 text-left">Normalizado</th>
                  <th className="px-3 py-2 text-left">Categoria</th>
                  <th className="px-3 py-2 text-left">Severity</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visiblePendingAdds.map((a) => (
                  <tr key={a._temp_id} className="text-sm bg-emerald-500/5">
                    <td className="px-3 py-2 align-top font-mono">
                      {a.term}
                      <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">novo</span>
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">—</td>
                    <td className="px-3 py-2 align-top">{a.category}</td>
                    <td className="px-3 py-2 align-top">{a.severity}</td>
                    <td className="px-3 py-2 align-top">{a.action}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="rounded-full border border-emerald-700 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <button
                        onClick={() => removePendingAdd(a._temp_id)}
                        title="Remover desta lista pendente"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.map((t) => {
                  const isPendingDelete = pendingDeletes.has(t.id_blocked_term)
                  return (
                    <tr
                      key={t.id_blocked_term}
                      className={`text-sm ${isPendingDelete ? "bg-rose-500/5 line-through opacity-60" : ""}`}
                    >
                      <td className="px-3 py-2 align-top font-mono">
                        {t.term}
                        {t.is_regex && <span className="ml-1 rounded bg-primary/15 px-1 text-[10px] text-primary">regex</span>}
                        {isPendingDelete && <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-300 no-underline">remover</span>}
                      </td>
                      <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">{t.normalized_term}</td>
                      <td className="px-3 py-2 align-top">{t.category}</td>
                      <td className="px-3 py-2 align-top">{t.severity}</td>
                      <td className="px-3 py-2 align-top">{t.action}</td>
                      <td className="px-3 py-2 align-top">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase no-underline ${t.status === "active" ? "border-emerald-700 bg-emerald-500/15 text-emerald-300" : "border-zinc-700 bg-zinc-500/15 text-zinc-300"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          {!isPendingDelete && (
                            <button onClick={() => setEditing(t)} className="text-xs text-primary hover:underline">
                              Editar
                            </button>
                          )}
                          <button
                            onClick={() => toggleDelete(t.id_blocked_term)}
                            title={isPendingDelete ? "Desfazer remoção" : "Marcar para remover"}
                            className={`ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full ${isPendingDelete ? "text-emerald-300 hover:bg-emerald-500/10" : "text-rose-300 hover:bg-rose-500/10"}`}
                          >
                            {isPendingDelete
                              ? <Undo2 className="h-3.5 w-3.5" aria-hidden />
                              : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold">{editing.id_blocked_term ? "Editar termo" : "Novo termo"}</h2>
            {!editing.id_blocked_term && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                O termo será adicionado à lista pendente. Clique em <strong>Salvar alterações</strong> no rodapé para aplicar.
              </p>
            )}

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Termo</label>
              <input
                value={editing.term || ""}
                onChange={(e) => setEditing({ ...editing, term: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary font-mono"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoria</label>
                  <select value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity</label>
                  <select value={editing.severity || "medium"} onChange={(e) => setEditing({ ...editing, severity: e.target.value as BlockedTerm["severity"] })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</label>
                  <select value={editing.action || "mask"} onChange={(e) => setEditing({ ...editing, action: e.target.value as BlockedTerm["action"] })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                    {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
                  <select value={editing.status || "active"} onChange={(e) => setEditing({ ...editing, status: e.target.value as BlockedTerm["status"] })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!editing.is_regex} onChange={(e) => setEditing({ ...editing, is_regex: e.target.checked })} />
                Tratar como regex (avançado)
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (opcional)</label>
              <input
                value={editing.notes || ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">Cancelar</button>
              <button type="button" onClick={handleEditingSave} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
                <Save className="h-3 w-3" aria-hidden />
                {editing.id_blocked_term ? "Salvar" : "Adicionar à lista"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{pendingCount}</strong> alteração{pendingCount > 1 ? "ões" : ""} pendente{pendingCount > 1 ? "s" : ""}
              {pendingDeletes.size > 0 && <> · <span className="text-rose-300">{pendingDeletes.size} a remover</span></>}
              {pendingAdds.length > 0 && <> · <span className="text-emerald-300">{pendingAdds.length} a adicionar</span></>}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardChanges}
                disabled={saving}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={commitChanges}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Aplicando…</>
                  : <><Save className="h-3.5 w-3.5" aria-hidden /> Salvar alterações</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
