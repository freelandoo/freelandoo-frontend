"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PackageSearch, Loader2, Upload, X, Ban, Clock } from "lucide-react"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

interface ProductCategory {
  id_product_category: number
  name: string
  slug: string
}

interface ProductRequest {
  id_product_request: string
  id_product_category: number
  category_name: string
  title: string
  description: string
  city: string
  state: string
  min_price_cents: number | null
  max_price_cents: number | null
  reference_image_url: string | null
  status: "open" | "answered" | "negotiating" | "closed" | "canceled" | "expired"
  created_at: string
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function authHeaders(): HeadersInit {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function parsePriceReais(input: string): number | null {
  if (!input.trim()) return null
  const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return -1
  return Math.round(n * 100)
}

function formatPrice(cents: number | null) {
  if (cents == null) return "—"
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const STATUS_LABEL: Record<ProductRequest["status"], { text: string; color: string }> = {
  open:        { text: "Aberto",       color: "bg-emerald-500/20 text-emerald-300" },
  answered:    { text: "Respondido",   color: "bg-sky-500/20 text-sky-300" },
  negotiating: { text: "Negociando",   color: "bg-amber-500/20 text-amber-300" },
  closed:      { text: "Concluído",    color: "bg-zinc-500/20 text-zinc-300" },
  canceled:    { text: "Cancelado",    color: "bg-zinc-600/20 text-zinc-400" },
  expired:     { text: "Expirado",     color: "bg-zinc-600/20 text-zinc-400" },
}

export default function PedirProdutoPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"new" | "list">("list")
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const t = getToken()
    if (!t) {
      router.replace("/login?next=/pedir-produto")
      return
    }
    setAuthed(true)
  }, [router])

  if (!authed) {
    return (
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <PackageSearch className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Pedir Produto</h1>
          <p className="text-xs text-muted-foreground">
            Diga o que você procura — vendedores compatíveis verão no mural.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("list")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "list" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Meus pedidos
        </button>
        <button
          onClick={() => setTab("new")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "new" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Novo pedido
        </button>
      </div>

      {tab === "new" ? (
        <NewRequestForm onCreated={() => setTab("list")} />
      ) : (
        <MyRequestsList onNew={() => setTab("new")} />
      )}
    </main>
  )
}

function NewRequestForm({ onCreated }: { onCreated: () => void }) {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [form, setForm] = useState({
    title: "",
    description: "",
    id_product_category: "",
    state: "",
    city: "",
    min_price_reais: "",
    max_price_reais: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/product-categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d?.categories) ? d.categories : []))
      .catch(() => {})
  }, [])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    if (e.target) e.target.value = ""
    if (!f) return
    if (!f.type.startsWith("image/")) { setError("Imagem deve ser JPG/PNG/WebP"); return }
    if (f.size > 10 * 1024 * 1024) { setError("Imagem até 10MB"); return }
    setError(null)
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null); setPreview(null)
  }

  async function submit() {
    setError(null)

    const title = form.title.trim()
    const description = form.description.trim()
    const city = form.city.trim()
    const state = form.state.trim().toUpperCase()
    const catId = Number(form.id_product_category)

    if (title.length < 3) { setError("Título obrigatório (mín. 3 caracteres)"); return }
    if (description.length < 5) { setError("Descrição obrigatória (mín. 5 caracteres)"); return }
    if (!catId) { setError("Selecione uma categoria"); return }
    if (state.length !== 2) { setError("Estado obrigatório (UF)"); return }
    if (!city) { setError("Cidade obrigatória"); return }

    const minPrice = parsePriceReais(form.min_price_reais)
    const maxPrice = parsePriceReais(form.max_price_reais)
    if (minPrice === -1) { setError("Preço mínimo inválido"); return }
    if (maxPrice === -1) { setError("Preço máximo inválido"); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("title", title)
      fd.append("description", description)
      fd.append("id_product_category", String(catId))
      fd.append("city", city)
      fd.append("state", state)
      if (minPrice != null) fd.append("min_price_cents", String(minPrice))
      if (maxPrice != null) fd.append("max_price_cents", String(maxPrice))
      if (file) fd.append("reference_image", file)

      const r = await fetch("/api/product-requests", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      })
      const d = await r.json()
      if (!r.ok) { setError(d?.error || "Erro ao criar pedido"); return }
      onCreated()
    } catch {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/40 p-5">
      <Field label="Título" required>
        <input
          type="text"
          value={form.title}
          maxLength={160}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ex: Tênis de corrida masculino tam 42"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Categoria" required>
        <select
          value={form.id_product_category}
          onChange={(e) => setForm((f) => ({ ...f, id_product_category: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecione uma categoria…</option>
          {categories.map((c) => (
            <option key={c.id_product_category} value={c.id_product_category}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Estado (UF)" required>
          <select
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">UF</option>
            {ESTADOS_BRASIL.map((e) => (
              <option key={e.uf} value={e.uf}>{e.uf}</option>
            ))}
          </select>
        </Field>
        <Field label="Cidade" required>
          <input
            type="text"
            value={form.city}
            maxLength={120}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Ex: Santo André"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Descrição" required>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={4}
          maxLength={4000}
          placeholder="Detalhe o que está procurando, marca/modelo se importar, condição, cor, tamanho…"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Preço mínimo (R$)">
          <input
            type="text"
            value={form.min_price_reais}
            onChange={(e) => setForm((f) => ({ ...f, min_price_reais: e.target.value }))}
            placeholder="0,00"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </Field>
        <Field label="Preço máximo (R$)">
          <input
            type="text"
            value={form.max_price_reais}
            onChange={(e) => setForm((f) => ({ ...f, max_price_reais: e.target.value }))}
            placeholder="0,00"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
        </Field>
      </div>

      <Field label="Imagem de referência (opcional)">
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-32 w-32 rounded-md object-cover" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
            <Upload className="h-3.5 w-3.5" />
            Escolher imagem (JPG/PNG/WebP, até 10MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
          </label>
        )}
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Publicar pedido
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function MyRequestsList({ onNew }: { onNew: () => void }) {
  const [list, setList] = useState<ProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/product-requests/me", { headers: authHeaders() })
      const d = await r.json()
      if (r.ok) setList(Array.isArray(d?.requests) ? d.requests : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function cancel(id: string) {
    if (!confirm("Cancelar este pedido?")) return
    setCancelingId(id)
    try {
      await fetch(`/api/product-requests/${id}/cancel`, { method: "POST", headers: authHeaders() })
      await load()
    } finally { setCancelingId(null) }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
        <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Você ainda não publicou pedidos.</p>
        <button onClick={onNew} className="mt-4 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          Criar primeiro pedido
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {list.map((r) => {
        const st = STATUS_LABEL[r.status]
        const canCancel = ["open", "answered", "negotiating"].includes(r.status)
        const priceRange =
          r.min_price_cents != null || r.max_price_cents != null
            ? `${formatPrice(r.min_price_cents)} — ${formatPrice(r.max_price_cents)}`
            : null

        return (
          <div key={r.id_product_request} className="overflow-hidden rounded-lg border border-border bg-card/40">
            <div className="flex items-start gap-3 p-4">
              {r.reference_image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.reference_image_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{r.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${st.color}`}>{st.text}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{r.category_name}</span> · {r.city}/{r.state}
                  {priceRange && <> · <span className="tabular-nums">{priceRange}</span></>}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {canCancel && (
                <button
                  onClick={() => cancel(r.id_product_request)}
                  disabled={cancelingId === r.id_product_request}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  {cancelingId === r.id_product_request ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
