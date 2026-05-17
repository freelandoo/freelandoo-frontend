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
        {tab === "products" && <Placeholder label="Produtos" hint="Listagem e moderação de produtos das lojas — chega no Slice 5." />}
        {tab === "requests" && <Placeholder label="Pedidos de Produto" hint="Listagem de pedidos abertos no mural — chega nos próximos slices." />}
        {tab === "prohibited" && <Placeholder label="Produtos Proibidos" hint="Regras de bloqueio e revisão — chega no Slice 5." />}
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
