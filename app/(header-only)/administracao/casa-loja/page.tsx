"use client"

import "@/app/acasaviews/casa.css"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Plus, Trash2, ShoppingBag, Package, Receipt,
  ImagePlus, Save, ChevronDown, ChevronUp, EyeOff, Eye,
} from "lucide-react"

type Media = { id: string; media_url: string; media_type: string; sort_order: number }
type Product = {
  id: string; name: string; description: string | null; image_url: string | null
  price_cents: number; stock: number | null; is_active: boolean; sort_order: number; media?: Media[]
}
type Order = {
  id: string; product_name: string; participant_name: string; participant_slug: string
  buyer_name: string | null; buyer_email: string | null; buyer_user_email: string | null
  amount_cents: number; status: string; created_at: string
}

function brl(cents: number) {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
const STATUS_BADGE: Record<string, string> = { paid: "pago", pending: "pendente", canceled: "cancelado", refunded: "reembolsado" }

export default function AdminCasaStorePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<"produtos" | "pedidos">("produtos")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setToken(typeof window !== "undefined" ? localStorage.getItem("token") : null) }, [])
  const authHeaders = useCallback((json = true): Record<string, string> => ({
    Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}),
  }), [token])

  const loadProducts = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/casa/store/products", { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar")
      setProducts(data.products || [])
    } catch (e) { setError(e instanceof Error ? e.message : "Erro") } finally { setLoading(false) }
  }, [token, authHeaders])

  const loadOrders = useCallback(async () => {
    if (!token) return
    const res = await fetch("/api/admin/casa/store/orders", { headers: authHeaders() })
    const data = await res.json()
    if (res.ok) setOrders(data.orders || [])
  }, [token, authHeaders])

  useEffect(() => { if (token) loadProducts() }, [token, loadProducts])
  useEffect(() => { if (token && tab === "pedidos") loadOrders() }, [token, tab, loadOrders])

  async function addProduct() {
    if (creating) return
    setCreating(true); setError(null)
    try {
      const res = await fetch("/api/admin/casa/store/products", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ name: "Novo produto", price_cents: 0, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao criar")
      setProducts((prev) => [data.product, ...prev])
    } catch (e) { setError(e instanceof Error ? e.message : "Erro") } finally { setCreating(false) }
  }

  if (!token) {
    return (
      <div className="casa-app">
        <div className="casa-rank casa-paper flex min-h-[60dvh] items-center justify-center casa-body font-bold text-[var(--ink-soft)]/70">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando sessão…
        </div>
      </div>
    )
  }

  return (
    <div className="casa-app">
      <div className="casa-rank casa-paper min-h-screen">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--ink)] pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/admin")} className="border-2 border-[var(--ink)] p-2 text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="casa-marker text-xl text-[var(--gold)] md:text-2xl">loja oficial</p>
                <h1 className="casa-display flex items-center gap-2 text-4xl leading-[0.85] text-[var(--ink)] md:text-5xl">
                  <ShoppingBag className="h-7 w-7" /> CONVENIÊNCIA VIEWS
                </h1>
                <p className="mt-1 casa-body text-sm font-semibold text-[var(--ink-soft)]/65">
                  Loja única espelhada em todas as páginas de participante. A venda registra qual participante recebeu.
                </p>
              </div>
            </div>
            {tab === "produtos" && (
              <button
                onClick={addProduct}
                disabled={creating}
                className="inline-flex items-center gap-2 border-2 border-[var(--ink)] px-4 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: "var(--gold)" }}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar produto
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-2">
            <TabBtn active={tab === "produtos"} onClick={() => setTab("produtos")} icon={<Package className="h-4 w-4" />}>Produtos</TabBtn>
            <TabBtn active={tab === "pedidos"} onClick={() => setTab("pedidos")} icon={<Receipt className="h-4 w-4" />}>Pedidos</TabBtn>
          </div>

          {error && (
            <div className="mb-4 border-2 border-[var(--magenta)] bg-[var(--magenta)]/10 px-4 py-3 casa-body text-sm font-bold text-[var(--magenta-deep)]">{error}</div>
          )}

          {tab === "produtos" ? (
            loading ? (
              <div className="flex items-center gap-2 py-20 casa-body font-bold text-[var(--ink-soft)]/60"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
            ) : products.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--ink)]/30 bg-white/60 px-6 py-16 text-center">
                <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-[var(--ink)]/30" />
                <p className="casa-display text-2xl text-[var(--ink)]/70">VITRINE VAZIA</p>
                <p className="mt-1 casa-body text-sm font-semibold text-[var(--ink-soft)]/55">Clique em “Adicionar produto” pra criar o primeiro card.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <ProductCardEditable key={p.id} product={p} token={token} authHeaders={authHeaders} onChanged={loadProducts} />
                ))}
              </div>
            )
          ) : (
            <OrdersTable orders={orders} />
          )}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-2 border-[var(--ink)] px-4 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5 ${active ? "text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)]" : "text-[var(--ink-soft)]/60"}`}
      style={active ? { background: "var(--cyan)" } : { background: "transparent" }}
    >
      {icon}{children}
    </button>
  )
}

// ════════════════════ Card editável inline (sem modal) ════════════════════
function ProductCardEditable({ product, token, authHeaders, onChanged }: {
  product: Product; token: string; authHeaders: (json?: boolean) => Record<string, string>; onChanged: () => void
}) {
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2).replace(".", ","))
  const [description, setDescription] = useState(product.description ?? "")
  const [stock, setStock] = useState(product.stock != null ? String(product.stock) : "")
  const [active, setActive] = useState(product.is_active)
  const [image, setImage] = useState(product.image_url)
  const [media, setMedia] = useState<Media[]>(product.media ?? [])
  const [showDesc, setShowDesc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty =
    name !== product.name ||
    description !== (product.description ?? "") ||
    price !== (product.price_cents / 100).toFixed(2).replace(".", ",") ||
    stock !== (product.stock != null ? String(product.stock) : "") ||
    active !== product.is_active

  function priceCents() { return Math.round((Number(price.replace(",", ".")) || 0) * 100) }

  async function save() {
    if (!name.trim()) { setErr("Nome obrigatório"); return }
    setSaving(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/casa/store/products/${product.id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          name, description, price_cents: priceCents(),
          stock: stock === "" ? "" : Number(stock), is_active: active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar")
      onChanged()
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setSaving(false) }
  }

  async function changePhoto(file: File) {
    setUploading(true); setErr(null)
    try {
      // "trocar a foto": remove mídias antigas e sobe a nova (imagem única do card)
      for (const m of media) {
        await fetch(`/api/admin/casa/store/media/${m.id}`, { method: "DELETE", headers: authHeaders() })
      }
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/admin/casa/store/products/${product.id}/media`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha no upload")
      setMedia([data.media]); setImage(data.media.media_url)
      onChanged()
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setUploading(false) }
  }

  async function remove() {
    if (!confirm(`Excluir “${product.name}”?`)) return
    await fetch(`/api/admin/casa/store/products/${product.id}`, { method: "DELETE", headers: authHeaders() })
    onChanged()
  }

  return (
    <div className="flex flex-col border-2 border-[var(--ink)] bg-white shadow-[5px_5px_0_0_var(--ink)]">
      {/* Foto (clicável) */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group relative aspect-square overflow-hidden border-b-2 border-[var(--ink)] bg-[var(--paper-2)]"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--ink)]/40">
            <ImagePlus className="h-8 w-8" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--ink)]/65 opacity-0 transition group-hover:opacity-100">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : (
            <span className="inline-flex items-center gap-2 casa-body text-xs font-extrabold uppercase tracking-[0.14em] text-white">
              <ImagePlus className="h-5 w-5" /> trocar foto
            </span>
          )}
        </span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) changePhoto(f); e.target.value = "" }} />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Nome editável */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do produto"
          className="w-full border-b-2 border-dashed border-[var(--ink)]/30 bg-transparent casa-display text-xl leading-tight text-[var(--ink)] outline-none focus:border-[var(--gold)]"
        />

        {/* Preço editável */}
        <div className="flex items-center gap-2">
          <span className="casa-display text-lg" style={{ color: "var(--magenta)" }}>R$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="w-24 border-b-2 border-dashed border-[var(--ink)]/30 bg-transparent casa-display text-2xl text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          />
        </div>

        {/* Ver/editar descrição */}
        <button
          type="button"
          onClick={() => setShowDesc((s) => !s)}
          className="inline-flex w-fit items-center gap-1 casa-body text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/70 underline hover:text-[var(--ink)]"
        >
          {showDesc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {description ? "editar descrição" : "+ descrição"}
        </button>
        {showDesc && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descrição do produto…"
            className="w-full border-2 border-[var(--ink)]/30 bg-[var(--paper-2)] p-2 casa-body text-xs text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          />
        )}

        {/* Estoque + ativo */}
        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-1 casa-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/55">
            estoque
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="∞"
              className="w-12 border-b-2 border-dashed border-[var(--ink)]/30 bg-transparent text-center casa-body text-sm font-bold text-[var(--ink)] outline-none focus:border-[var(--gold)]"
            />
          </label>
          <button
            type="button"
            onClick={() => setActive((a) => !a)}
            className="inline-flex items-center gap-1 casa-body text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}
          >
            {active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {active ? "ativo" : "oculto"}
          </button>
        </div>

        {err && <p className="casa-body text-[11px] font-bold text-[var(--magenta)]">{err}</p>}

        {/* Ações */}
        <div className="mt-auto flex items-center gap-2 border-t-2 border-[var(--ink)]/15 pt-2">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex flex-1 items-center justify-center gap-1.5 border-2 border-[var(--ink)] py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none"
            style={{ background: dirty ? "var(--cyan)" : "transparent" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {dirty ? "salvar" : "salvo"}
          </button>
          <button onClick={remove} className="border-2 border-[var(--ink)] p-1.5 text-[var(--magenta)] transition-transform hover:-translate-y-0.5">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="border-2 border-dashed border-[var(--ink)]/30 bg-white/60 px-6 py-16 text-center">
        <Receipt className="mx-auto mb-3 h-10 w-10 text-[var(--ink)]/30" />
        <p className="casa-body text-sm font-semibold text-[var(--ink-soft)]/55">Nenhum pedido ainda.</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto border-2 border-[var(--ink)] bg-white">
      <table className="w-full casa-body text-sm">
        <thead className="border-b-2 border-[var(--ink)] text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/60">
          <tr><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Participante (recebeu)</th><th className="px-3 py-2">Comprador</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Data</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-[var(--ink)]/15">
              <td className="px-3 py-2 font-bold text-[var(--ink)]">{o.product_name}</td>
              <td className="px-3 py-2"><span className="border border-[var(--ink)]/40 px-1.5 py-0.5 text-[11px] font-bold text-[var(--ink)]">{o.participant_name}</span></td>
              <td className="px-3 py-2 text-[var(--ink-soft)]/70">{o.buyer_name || o.buyer_user_email || o.buyer_email || "—"}</td>
              <td className="px-3 py-2 font-bold text-[var(--ink)]">{brl(o.amount_cents)}</td>
              <td className="px-3 py-2"><span className="font-extrabold uppercase text-[11px] tracking-[0.1em]" style={{ color: o.status === "paid" ? "var(--ink)" : "var(--ink-soft)" }}>{STATUS_BADGE[o.status] || o.status}</span></td>
              <td className="px-3 py-2 text-[var(--ink-soft)]/70">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
