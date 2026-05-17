"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Store,
  Tag,
  Package,
  Inbox,
  ShieldAlert,
  Flag,
  Settings,
  X,
} from "lucide-react"

type Tab = "products" | "categories" | "requests" | "prohibited" | "reports" | "settings"

type ProductCategory = {
  id_product_category: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  parent_id: number | null
  status: "active" | "inactive"
  sort_order: number
  created_at: string
  updated_at: string
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function authHeaders(): HeadersInit {
  const t = getToken()
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }
}

const TAB_LIST: { key: Tab; label: string; icon: typeof Tag }[] = [
  { key: "products",   label: "Produtos",          icon: Package },
  { key: "categories", label: "Categorias",        icon: Tag },
  { key: "requests",   label: "Pedidos de Produto",icon: Inbox },
  { key: "prohibited", label: "Produtos Proibidos",icon: ShieldAlert },
  { key: "reports",    label: "Denúncias",         icon: Flag },
  { key: "settings",   label: "Configurações",     icon: Settings },
]

export default function AdminLojaPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("categories")

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <div className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.push("/administracao")}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Loja</h1>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {TAB_LIST.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {tab === "categories" && <CategoriesTab />}
        {tab === "products" && <PendingProductsTab />}
        {tab === "requests" && <Placeholder label="Pedidos de Produto" hint="Listagem de pedidos abertos no mural — chega nos próximos slices." />}
        {tab === "prohibited" && <ProhibitedRulesTab />}
        {tab === "reports" && <Placeholder label="Denúncias da Loja" hint="Em breve." />}
        {tab === "settings" && <Placeholder label="Configurações da Loja" hint="Em breve." />}
      </div>
    </div>
  )
}

function Placeholder({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

// ─── Categorias ──────────────────────────────────────────────────────────────

function CategoriesTab() {
  const [list, setList] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/api/admin/store/product-categories", { headers: authHeaders() })
      const d = await r.json()
      if (r.ok) setList(Array.isArray(d?.categories) ? d.categories : [])
      else setError(d?.error || "Erro ao carregar")
    } catch {
      setError("Erro de conexão")
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: number) {
    if (!confirm("Excluir categoria? Só funciona se não houver produtos vinculados.")) return
    try {
      const r = await fetch(`/api/admin/store/product-categories/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const d = await r.json()
      if (!r.ok) { alert(d?.error || "Erro ao excluir"); return }
      load()
    } catch { alert("Erro de conexão") }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Categorias de Produto</h2>
          <p className="text-xs text-muted-foreground">
            Categorias usadas na vitrine das lojas e no fluxo &quot;Pedir Produto&quot;. Separadas das máquinas de serviço.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova categoria
        </button>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Slug</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Ordem</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id_product_category} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.slug}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{c.sort_order}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(c)} className="mr-2 inline-flex rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id_product_category)} className="inline-flex rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhuma categoria cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <CategoryModal
          category={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Produtos Proibidos (regras) ─────────────────────────────────────────────

type ProhibitedRule = {
  id_rule: number
  rule_type: "term" | "category" | "regex" | "brand" | "product_name" | "manual_allow"
  term: string | null
  normalized_term: string | null
  id_product_category: number | null
  category_name: string | null
  severity: "low" | "medium" | "high" | "critical"
  action: "allow" | "review" | "block" | "ban_product" | "hide_product" | "ban_category"
  reason: string | null
  status: "active" | "paused" | "deleted"
  created_at: string
  updated_at: string
}

const SEVERITY_COLOR: Record<ProhibitedRule["severity"], string> = {
  low: "bg-zinc-500/15 text-zinc-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-orange-500/15 text-orange-300",
  critical: "bg-red-500/15 text-red-300",
}

const ACTION_LABEL: Record<ProhibitedRule["action"], string> = {
  allow: "Permitir",
  review: "Revisar",
  block: "Bloquear",
  ban_product: "Banir produto",
  hide_product: "Ocultar",
  ban_category: "Banir categoria",
}

function ProhibitedRulesTab() {
  const [rules, setRules] = useState<ProhibitedRule[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ProhibitedRule | null>(null)
  const [occurrencesFor, setOccurrencesFor] = useState<ProhibitedRule | null>(null)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rRes, cRes] = await Promise.all([
        fetch("/api/admin/store/prohibited-rules", { headers: authHeaders() }),
        fetch("/api/admin/store/product-categories", { headers: authHeaders() }),
      ])
      const rData = await rRes.json()
      const cData = await cRes.json()
      if (rRes.ok) setRules(Array.isArray(rData?.rules) ? rData.rules : [])
      else setError(rData?.error || "Erro ao carregar regras")
      if (cRes.ok) setCategories(Array.isArray(cData?.categories) ? cData.categories : [])
    } catch {
      setError("Erro de conexão")
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function togglePause(r: ProhibitedRule) {
    const newStatus = r.status === "active" ? "paused" : "active"
    try {
      const res = await fetch(`/api/admin/store/prohibited-rules/${r.id_rule}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d?.error || "Erro"); return }
      load()
    } catch { alert("Erro de conexão") }
  }

  async function remove(r: ProhibitedRule) {
    if (!confirm(`Excluir regra "${r.term || r.category_name || r.id_rule}"?`)) return
    try {
      const res = await fetch(`/api/admin/store/prohibited-rules/${r.id_rule}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const d = await res.json()
      if (!res.ok) { alert(d?.error || "Erro"); return }
      load()
    } catch { alert("Erro de conexão") }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Produtos Proibidos</h2>
          <p className="text-xs text-muted-foreground">
            Regras que bloqueiam ou enviam produtos para revisão nas lojas dos subperfis.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova regra
        </button>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Termo / Categoria</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Severidade</th>
                <th className="px-3 py-2 text-left">Ação</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id_rule} className="border-t border-border">
                  <td className="max-w-[260px] px-3 py-2 text-foreground">
                    <div className="truncate">{r.term || r.category_name || "—"}</div>
                    {r.reason && <div className="truncate text-[10px] text-muted-foreground">{r.reason}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.rule_type}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${SEVERITY_COLOR[r.severity]}`}>{r.severity}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">{ACTION_LABEL[r.action]}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      r.status === "active" ? "bg-emerald-500/15 text-emerald-400"
                      : r.status === "paused" ? "bg-amber-500/15 text-amber-300"
                      : "bg-zinc-500/15 text-zinc-400"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setOccurrencesFor(r)} className="mr-1 rounded p-1 text-muted-foreground hover:text-foreground" title="Ocorrências">
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => togglePause(r)} className="mr-1 rounded p-1 text-muted-foreground hover:text-amber-300" title="Pausar/Ativar">
                      {r.status === "active" ? <span className="text-[10px] uppercase">⏸</span> : <span className="text-[10px] uppercase">▶</span>}
                    </button>
                    <button onClick={() => setEditing(r)} className="mr-1 rounded p-1 text-muted-foreground hover:text-foreground" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(r)} className="rounded p-1 text-muted-foreground hover:text-destructive" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhuma regra cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ProhibitedRuleModal
          rule={editing}
          categories={categories}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}

      {occurrencesFor && (
        <OccurrencesModal
          rule={occurrencesFor}
          onClose={() => setOccurrencesFor(null)}
        />
      )}
    </div>
  )
}

function ProhibitedRuleModal({
  rule, categories, onClose, onSaved,
}: {
  rule: ProhibitedRule | null
  categories: ProductCategory[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = rule !== null
  const [form, setForm] = useState({
    rule_type: rule?.rule_type || "term",
    term: rule?.term || "",
    id_product_category: rule?.id_product_category != null ? String(rule.id_product_category) : "",
    severity: rule?.severity || "medium",
    action: rule?.action || "review",
    reason: rule?.reason || "",
    status: rule?.status || "active",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        rule_type: form.rule_type,
        severity: form.severity,
        action: form.action,
        reason: form.reason.trim() || null,
        status: form.status,
      }
      if (form.rule_type !== "category") body.term = form.term.trim()
      if (form.id_product_category) body.id_product_category = Number(form.id_product_category)
      else body.id_product_category = null

      const url = isEdit ? `/api/admin/store/prohibited-rules/${rule!.id_rule}` : "/api/admin/store/prohibited-rules"
      const r = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setError(d?.error || "Erro ao salvar"); return }
      onSaved()
    } catch { setError("Erro de conexão") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-xl border border-border bg-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-semibold">{isEdit ? "Editar regra" : "Nova regra"}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
              <select
                value={form.rule_type}
                onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value as ProhibitedRule["rule_type"] }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="term">Termo</option>
                <option value="category">Categoria</option>
                <option value="regex">Regex</option>
                <option value="brand">Marca</option>
                <option value="product_name">Nome de produto</option>
                <option value="manual_allow">Liberação manual</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProhibitedRule["status"] }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
                <option value="deleted">Excluída</option>
              </select>
            </div>
          </div>

          {form.rule_type !== "category" && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Termo / Padrão</label>
              <input
                type="text"
                value={form.term}
                onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
                placeholder="Ex: pistola"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          {(form.rule_type === "category" || form.action === "ban_category") && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Categoria</label>
              <select
                value={form.id_product_category}
                onChange={(e) => setForm((f) => ({ ...f, id_product_category: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Selecione —</option>
                {categories.map((c) => (
                  <option key={c.id_product_category} value={c.id_product_category}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Severidade</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as ProhibitedRule["severity"] }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Ação</label>
              <select
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as ProhibitedRule["action"] }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="allow">Permitir</option>
                <option value="review">Revisar</option>
                <option value="block">Bloquear</option>
                <option value="hide_product">Ocultar</option>
                <option value="ban_product">Banir produto</option>
                <option value="ban_category">Banir categoria</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Motivo (visível ao vendedor)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function OccurrencesModal({ rule, onClose }: { rule: ProhibitedRule; onClose: () => void }) {
  const [data, setData] = useState<{
    products: Array<{ id_profile_product: number; name: string; moderation_status: string }>
    requests: Array<{ id_product_request: string; title: string; moderation_status: string }>
  }>({ products: [], requests: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/store/prohibited-rules/${rule.id_rule}/occurrences`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setData(d?.occurrences || { products: [], requests: [] }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rule.id_rule])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="presentation">
      <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Ocorrências da regra</h3>
            <p className="text-xs text-muted-foreground">{rule.term || rule.category_name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <section>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Produtos afetados ({data.products.length})</h4>
                {data.products.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum produto bloqueado por esta regra.</p>
                ) : (
                  <ul className="space-y-1">
                    {data.products.map((p) => (
                      <li key={p.id_profile_product} className="flex items-center justify-between rounded border border-border bg-background px-3 py-1.5 text-xs">
                        <span className="truncate">{p.name}</span>
                        <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] uppercase">{p.moderation_status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Pedidos afetados ({data.requests.length})</h4>
                {data.requests.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum pedido bloqueado por esta regra.</p>
                ) : (
                  <ul className="space-y-1">
                    {data.requests.map((p) => (
                      <li key={p.id_product_request} className="flex items-center justify-between rounded border border-border bg-background px-3 py-1.5 text-xs">
                        <span className="truncate">{p.title}</span>
                        <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] uppercase">{p.moderation_status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fila de revisão de produtos ─────────────────────────────────────────────

type PendingProduct = {
  id_profile_product: number
  id_profile: string
  name: string
  description: string | null
  moderation_status: "pending_review" | "blocked" | "banned" | "active"
  created_at: string
  category_name: string | null
  profile_display_name: string | null
  sub_profile_slug: string | null
}

const STATUS_TAG: Record<PendingProduct["moderation_status"], string> = {
  pending_review: "bg-amber-500/15 text-amber-300",
  blocked: "bg-red-500/15 text-red-300",
  banned: "bg-zinc-700/40 text-zinc-300",
  active: "bg-emerald-500/15 text-emerald-300",
}

function PendingProductsTab() {
  const [list, setList] = useState<PendingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOn, setActingOn] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/store/products/pending", { headers: authHeaders() })
      const d = await r.json()
      if (r.ok) setList(Array.isArray(d?.products) ? d.products : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function act(p: PendingProduct, decision: "approve" | "block" | "ban" | "pause" | "allow_exception") {
    if (!confirm(`Confirmar ${decision} no produto "${p.name}"?`)) return
    setActingOn(p.id_profile_product)
    try {
      const r = await fetch(`/api/admin/store/products/${p.id_profile_product}/review`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ decision }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d?.error || "Erro"); return }
      load()
    } catch { alert("Erro de conexão") }
    finally { setActingOn(null) }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Produtos — fila de moderação</h2>
        <p className="text-xs text-muted-foreground">
          Produtos pendentes de revisão, bloqueados ou banidos. Aprove para devolver à vitrine ou bana para remover permanentemente.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum produto pendente.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-left">Subperfil</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id_profile_product} className="border-t border-border">
                  <td className="max-w-[280px] px-3 py-2">
                    <div className="truncate text-foreground">{p.name}</div>
                    {p.description && <div className="truncate text-[10px] text-muted-foreground">{p.description}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.profile_display_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.category_name || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${STATUS_TAG[p.moderation_status]}`}>
                      {p.moderation_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => act(p, "approve")}
                        disabled={actingOn === p.id_profile_product}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >Aprovar</button>
                      <button
                        onClick={() => act(p, "block")}
                        disabled={actingOn === p.id_profile_product}
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                      >Bloquear</button>
                      <button
                        onClick={() => act(p, "ban")}
                        disabled={actingOn === p.id_profile_product}
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >Banir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: ProductCategory | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = category !== null
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    icon: category?.icon || "",
    status: category?.status || "active",
    sort_order: category?.sort_order ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      }
      if (form.slug.trim()) body.slug = form.slug.trim()

      const url = isEdit
        ? `/api/admin/store/product-categories/${category!.id_product_category}`
        : "/api/admin/store/product-categories"
      const r = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setError(d?.error || "Erro ao salvar"); return }
      onSaved()
    } catch { setError("Erro de conexão") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-xl border border-border bg-card" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{isEdit ? "Editar categoria" : "Nova categoria"}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex: Vestuário"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Slug (opcional — gerado do nome)</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              placeholder="vestuario"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Descrição (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Ordem</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
