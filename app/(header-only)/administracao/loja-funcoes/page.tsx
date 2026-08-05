"use client"

/**
 * Admin — Loja de Funções (mig 191). Catálogo FECHADO: uma linha por função
 * da whitelist; aqui o admin edita preço/textos/cores/imagem e o "à venda"
 * (is_for_sale=false = função grátis, comporta-se como antes da loja).
 * Também lista compras e faz concessão/revogação manual (suporte).
 * Estilo dark utilitário pt-only (padrão admin), cantos retos.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, RefreshCw, ShoppingBag, Pencil, X, Check, Gift, Ban, ImageIcon,
} from "lucide-react"

interface FunctionProductAdmin {
  id: string
  feature_key: string
  nav_label: string
  eyebrow: string
  headline: string
  short_description: string
  full_description: string
  background_color: string
  accent_color: string
  text_color: string
  placeholder_color: string
  image_url: string | null
  price_cents: number
  /** Preço alternativo em Poléns (mig 195). 0/null = só dinheiro. */
  price_polens: number | null
  is_for_sale: boolean
  sort_order: number
  owners: number
  revenue_cents: number
  revenue_polens: number
}

interface PurchaseRow {
  id: string
  username: string
  email: string
  feature_key: string
  status: string
  amount_cents: number
  amount_polens: number
  payment_provider: string
  paid_at: string | null
  refunded_at: string | null
  created_at: string
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

function fmtBRL(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export default function LojaFuncoesAdminPage() {
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
      <div className="fl-sharp flex min-h-screen items-center justify-center bg-background py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fl-sharp min-h-screen bg-background">
      <main className="container mx-auto space-y-8 px-4 py-8">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Loja de Funções</h1>
            <p className="text-sm text-muted-foreground">
              Funções da conta como produtos — preço, vitrine e concessões. &quot;À venda&quot; desligado = função grátis pra todo mundo.
            </p>
          </div>
        </div>

        <ProductsSection />
        <GrantSection />
        <PurchasesSection />
      </main>
    </div>
  )
}

/* ------------------------------- produtos ------------------------------- */

function ProductsSection() {
  const [products, setProducts] = useState<FunctionProductAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<FunctionProductAdmin | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/function-store/products", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d?.products) ? d.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section className="border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Catálogo ({products.length})</h2>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2">Função</th>
              <th className="px-2 py-2">Chave</th>
              <th className="px-2 py-2">Preço</th>
              <th className="px-2 py-2">Poléns</th>
              <th className="px-2 py-2">À venda</th>
              <th className="px-2 py-2">Donos</th>
              <th className="px-2 py-2">Receita</th>
              <th className="px-2 py-2">Cores</th>
              <th className="px-2 py-2">Ordem</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50 text-foreground">
                <td className="px-2 py-2 font-semibold">{p.nav_label}</td>
                <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{p.feature_key}</td>
                <td className="px-2 py-2">{fmtBRL(p.price_cents)}</td>
                <td className="px-2 py-2 tabular-nums">
                  {Number(p.price_polens) > 0
                    ? `${Number(p.price_polens).toLocaleString("pt-BR")} ⬢`
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-2">
                  {p.is_for_sale ? (
                    <span className="inline-flex items-center gap-1 text-green-500"><Check className="h-3.5 w-3.5" /> sim</span>
                  ) : (
                    <span className="text-muted-foreground">grátis</span>
                  )}
                </td>
                <td className="px-2 py-2 tabular-nums">{p.owners}</td>
                <td className="px-2 py-2 tabular-nums">
                  {fmtBRL(p.revenue_cents)}
                  {Number(p.revenue_polens) > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      + {Number(p.revenue_polens).toLocaleString("pt-BR")} ⬢
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <span className="inline-flex gap-1">
                    <span className="h-4 w-4 border border-border" style={{ backgroundColor: p.background_color }} title={`fundo ${p.background_color}`} />
                    <span className="h-4 w-4 border border-border" style={{ backgroundColor: p.accent_color }} title={`destaque ${p.accent_color}`} />
                    <span className="h-4 w-4 border border-border" style={{ backgroundColor: p.placeholder_color }} title={`card ${p.placeholder_color}`} />
                  </span>
                </td>
                <td className="px-2 py-2 tabular-nums">{p.sort_order}</td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                </td>
              </tr>
            ))}
            {!loading && products.length === 0 && (
              <tr><td colSpan={10} className="px-2 py-6 text-center text-muted-foreground">Nada aqui — a mig 191 roda no boot do backend.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductEditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </section>
  )
}

function ProductEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: FunctionProductAdmin
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    nav_label: product.nav_label,
    eyebrow: product.eyebrow,
    headline: product.headline,
    short_description: product.short_description,
    full_description: product.full_description,
    background_color: product.background_color,
    accent_color: product.accent_color,
    text_color: product.text_color,
    placeholder_color: product.placeholder_color,
    price_reais: (product.price_cents / 100).toFixed(2).replace(".", ","),
    price_polens: String(Number(product.price_polens) || 0),
    is_for_sale: product.is_for_sale,
    sort_order: String(product.sort_order),
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const priceCents = Math.round(Number(form.price_reais.replace(/\./g, "").replace(",", ".")) * 100)
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        setError("Preço inválido")
        setSaving(false)
        return
      }
      const fd = new FormData()
      fd.append("nav_label", form.nav_label)
      fd.append("eyebrow", form.eyebrow)
      fd.append("headline", form.headline)
      fd.append("short_description", form.short_description)
      fd.append("full_description", form.full_description)
      fd.append("background_color", form.background_color)
      fd.append("accent_color", form.accent_color)
      fd.append("text_color", form.text_color)
      fd.append("placeholder_color", form.placeholder_color)
      const pricePolens = Math.round(Number(form.price_polens.replace(/\D/g, "") || 0))
      if (!Number.isFinite(pricePolens) || pricePolens < 0) {
        setError("Preço em Poléns inválido")
        setSaving(false)
        return
      }
      fd.append("price_cents", String(priceCents))
      fd.append("price_polens", String(pricePolens))
      fd.append("is_for_sale", String(form.is_for_sale))
      fd.append("sort_order", form.sort_order)
      if (file) fd.append("image", file)

      const token = localStorage.getItem("token")
      const r = await fetch(`/api/admin/function-store/products/${product.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(data?.error || "Erro ao salvar")
        setSaving(false)
        return
      }
      onSaved()
    } catch {
      setError("Erro ao salvar")
      setSaving(false)
    }
  }

  const colorField = (label: string, key: "background_color" | "accent_color" | "text_color" | "placeholder_color") => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(form[key]) ? form[key] : "#000000"}
          onChange={(e) => set(key, e.target.value)}
          className="h-8 w-10 cursor-pointer border border-border bg-transparent p-0"
        />
        <input
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          className="w-24 border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
        />
      </span>
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div
        className="my-8 w-full max-w-2xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Editar — {product.nav_label} <span className="font-mono text-xs text-muted-foreground">({product.feature_key})</span>
          </h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Nome (nav)
            <input value={form.nav_label} onChange={(e) => set("nav_label", e.target.value)} className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Eyebrow (kicker)
            <input value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            Headline gigante (quebra de linha = Enter)
            <textarea value={form.headline} onChange={(e) => set("headline", e.target.value)} rows={2} className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            Descrição curta (card do carrossel)
            <textarea value={form.short_description} onChange={(e) => set("short_description", e.target.value)} rows={2} className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            Descrição completa (página do produto)
            <textarea value={form.full_description} onChange={(e) => set("full_description", e.target.value)} rows={4} className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>

          {colorField("Fundo", "background_color")}
          {colorField("Destaque", "accent_color")}
          {colorField("Texto", "text_color")}
          {colorField("Card (placeholder)", "placeholder_color")}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Preço (R$)
            <input value={form.price_reais} onChange={(e) => set("price_reais", e.target.value)} inputMode="decimal" className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Preço em Poléns (0 = não vende por Poléns)
            <input value={form.price_polens} onChange={(e) => set("price_polens", e.target.value)} inputMode="numeric" className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Ordem
            <input value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} inputMode="numeric" className="border border-border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.is_for_sale} onChange={(e) => set("is_for_sale", e.target.checked)} className="h-4 w-4" />
            À venda (desligado = função grátis pra todo mundo)
          </label>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            Imagem do card
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 border border-border px-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {file ? file.name : product.image_url ? "Trocar imagem" : "Subir imagem"}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="border border-border px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------- grant / revoke ----------------------------- */

const FEATURE_KEYS = [
  "courses", "store", "services", "vaquinha", "communities",
  "wallet", "fitness_academias", "profiles", "agenda", "vitrine",
]

function GrantSection() {
  const [username, setUsername] = useState("")
  const [featureKey, setFeatureKey] = useState(FEATURE_KEYS[0])
  const [busy, setBusy] = useState<"grant" | "revoke" | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const act = async (kind: "grant" | "revoke") => {
    if (!username.trim()) { setMsg({ ok: false, text: "Informe o @username" }); return }
    setBusy(kind)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/function-store/${kind}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ username: username.trim(), feature_key: featureKey }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) setMsg({ ok: false, text: data?.error || "Erro" })
      else setMsg({ ok: true, text: kind === "grant" ? "Função concedida." : "Função revogada." })
    } catch {
      setMsg({ ok: false, text: "Erro de rede" })
    }
    setBusy(null)
  }

  return (
    <section className="border border-border bg-card p-5">
      <h2 className="mb-1 text-lg font-semibold text-foreground">Concessão manual</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Suporte: dá (compra paga de R$ 0, provider admin_grant) ou tira uma função de um usuário.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          @username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@usuario"
            className="w-52 border border-border bg-background px-2 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Função
          <select
            value={featureKey}
            onChange={(e) => setFeatureKey(e.target.value)}
            className="border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            {FEATURE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => act("grant")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy === "grant" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          Conceder
        </button>
        <button
          type="button"
          onClick={() => act("revoke")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 disabled:opacity-60"
        >
          {busy === "revoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Revogar
        </button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-500" : "text-red-400"}`}>{msg.text}</p>}
    </section>
  )
}

/* ------------------------------- compras -------------------------------- */

function PurchasesSection() {
  const [rows, setRows] = useState<PurchaseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    const qs = filter ? `?feature_key=${encodeURIComponent(filter)}` : ""
    fetch(`/api/admin/function-store/purchases${qs}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d?.purchases) ? d.purchases : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <section className="border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Compras recentes</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            <option value="">Todas as funções</option>
            {FEATURE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Atualizar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2">Usuário</th>
              <th className="px-2 py-2">Função</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Valor</th>
              <th className="px-2 py-2">Origem</th>
              <th className="px-2 py-2">Pago em</th>
              <th className="px-2 py-2">Reembolso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/50 text-foreground">
                <td className="px-2 py-2">@{p.username}</td>
                <td className="px-2 py-2 font-mono text-xs">{p.feature_key}</td>
                <td className="px-2 py-2">
                  <span className={
                    p.refunded_at ? "text-red-400" :
                    p.status === "paid" ? "text-green-500" :
                    p.status === "pending" ? "text-amber-400" : "text-muted-foreground"
                  }>
                    {p.refunded_at ? "reembolsada" : p.status}
                  </span>
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {Number(p.amount_polens) > 0
                    ? `${Number(p.amount_polens).toLocaleString("pt-BR")} ⬢`
                    : fmtBRL(p.amount_cents)}
                </td>
                <td className="px-2 py-2 text-xs text-muted-foreground">{p.payment_provider}</td>
                <td className="px-2 py-2 text-xs">{fmtDate(p.paid_at)}</td>
                <td className="px-2 py-2 text-xs">{fmtDate(p.refunded_at)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">Nenhuma compra ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
