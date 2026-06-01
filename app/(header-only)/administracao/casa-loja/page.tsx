"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Upload, ShoppingBag,
  Package, Receipt, ArrowUp, ArrowDown, X, EyeOff,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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

function brl(cents: number) { return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
const STATUS_BADGE: Record<string, string> = { paid: "pago", pending: "pendente", canceled: "cancelado", refunded: "reembolsado" }

export default function AdminCasaStorePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<"produtos" | "pedidos">("produtos")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { setToken(typeof window !== "undefined" ? localStorage.getItem("token") : null) }, [])
  const headers = useCallback((json = true): Record<string, string> => ({
    Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}),
  }), [token])

  const loadProducts = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/casa/store/products", { headers: headers() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar")
      setProducts(data.products || [])
    } catch (e) { setError(e instanceof Error ? e.message : "Erro") } finally { setLoading(false) }
  }, [token, headers])

  const loadOrders = useCallback(async () => {
    if (!token) return
    const res = await fetch("/api/admin/casa/store/orders", { headers: headers() })
    const data = await res.json()
    if (res.ok) setOrders(data.orders || [])
  }, [token, headers])

  useEffect(() => { if (token) loadProducts() }, [token, loadProducts])
  useEffect(() => { if (token && tab === "pedidos") loadOrders() }, [token, tab, loadOrders])

  async function removeProduct(p: Product) {
    if (!confirm(`Desativar "${p.name}"?`)) return
    await fetch(`/api/admin/casa/store/products/${p.id}`, { method: "DELETE", headers: headers() })
    loadProducts()
  }

  if (!token) {
    return <div className="flex min-h-[60dvh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando sessão…</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/administracao")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><ShoppingBag className="h-6 w-6" /> Conveniência Views</h1>
            <p className="text-sm text-muted-foreground">Loja única espelhada em todas as páginas de participante. A venda registra qual participante recebeu.</p>
          </div>
        </div>
        {tab === "produtos" && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="mr-1 h-4 w-4" /> Novo produto</Button>
        )}
      </div>

      <div className="mb-5 flex gap-2 border-b">
        <TabBtn active={tab === "produtos"} onClick={() => setTab("produtos")} icon={<Package className="h-4 w-4" />}>Produtos</TabBtn>
        <TabBtn active={tab === "pedidos"} onClick={() => setTab("pedidos")} icon={<Receipt className="h-4 w-4" />}>Pedidos</TabBtn>
      </div>

      {error && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {tab === "produtos" ? (
        loading ? (
          <div className="flex items-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
        ) : products.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground"><ShoppingBag className="mx-auto mb-3 h-10 w-10 opacity-40" />Nenhum produto. Crie o primeiro.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="aspect-video overflow-hidden bg-muted">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    {!p.is_active && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{brl(p.price_cents)} · {p.stock === null ? "estoque ∞" : `${p.stock} un`} · {p.media?.length || 0} mídia(s)</div>
                </div>
                <div className="flex items-center gap-1 border-t p-2">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setEditing(p); setShowForm(true) }}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                  <Button size="icon" variant="ghost" onClick={() => removeProduct(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <OrdersTable orders={orders} />
      )}

      {showForm && (
        <ProductForm token={token} editing={editing} headers={headers} onClose={() => setShowForm(false)} onSaved={() => loadProducts()} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {icon}{children}
    </button>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <Card><CardContent className="py-16 text-center text-muted-foreground"><Receipt className="mx-auto mb-3 h-10 w-10 opacity-40" />Nenhum pedido ainda.</CardContent></Card>
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Participante (recebeu)</th><th className="px-3 py-2">Comprador</th><th className="px-3 py-2">Valor</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Data</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="px-3 py-2 font-medium">{o.product_name}</td>
              <td className="px-3 py-2"><Badge variant="outline">{o.participant_name}</Badge></td>
              <td className="px-3 py-2 text-muted-foreground">{o.buyer_name || o.buyer_user_email || o.buyer_email || "—"}</td>
              <td className="px-3 py-2">{brl(o.amount_cents)}</td>
              <td className="px-3 py-2"><Badge variant={o.status === "paid" ? "default" : "secondary"}>{STATUS_BADGE[o.status] || o.status}</Badge></td>
              <td className="px-3 py-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════ Modal do produto (enxuto, com galeria) ════════════════════
function ProductForm({ token, editing, headers, onClose, onSaved }: {
  token: string; editing: Product | null; headers: (json?: boolean) => Record<string, string>; onClose: () => void; onSaved: () => void
}) {
  const [product, setProduct] = useState<Product | null>(editing)
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    price_reais: editing ? (editing.price_cents / 100).toFixed(2).replace(".", ",") : "",
    stock: editing?.stock != null ? String(editing.stock) : "",
    is_active: editing ? String(editing.is_active) : "true",
  })
  const [media, setMedia] = useState<Media[]>(editing?.media ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }
  function priceCents() { return Math.round((Number(form.price_reais.replace(",", ".")) || 0) * 100) }

  async function save() {
    if (!form.name.trim()) { setErr("Nome é obrigatório."); return }
    setSaving(true); setErr(null)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price_cents: priceCents(),
        stock: form.stock === "" ? "" : Number(form.stock),
        is_active: form.is_active === "true",
      }
      const url = product ? `/api/admin/casa/store/products/${product.id}` : "/api/admin/casa/store/products"
      const res = await fetch(url, { method: product ? "PUT" : "POST", headers: headers(), body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar")
      setProduct(data.product)         // entra em modo edição → libera galeria
      onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setSaving(false) }
  }

  async function uploadMedia(file: File) {
    if (!product) { setErr("Salve o produto antes de adicionar mídias."); return }
    setUploading(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/admin/casa/store/products/${product.id}/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha no upload")
      setMedia((m) => [...m, data.media])
      onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro") } finally { setUploading(false) }
  }

  async function delMedia(id: string) {
    await fetch(`/api/admin/casa/store/media/${id}`, { method: "DELETE", headers: headers() })
    setMedia((m) => m.filter((x) => x.id !== id))
    onSaved()
  }

  async function move(idx: number, dir: -1 | 1) {
    const next = [...media]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setMedia(next)
    if (product) {
      await fetch(`/api/admin/casa/store/products/${product.id}/media/reorder`, {
        method: "PUT", headers: headers(), body: JSON.stringify({ ordered_ids: next.map((m) => m.id) }),
      })
      onSaved()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{product ? "Editar produto" : "Novo produto"} — Conveniência Views</DialogTitle></DialogHeader>
        {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}

        {/* Preview ao vivo (como aparece na loja do participante) */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pré-visualização</div>
          <div className="mx-auto max-w-[220px] overflow-hidden border-2 border-foreground bg-background shadow-[5px_5px_0_0] shadow-foreground">
            <div className="aspect-square overflow-hidden bg-muted">
              {(media[0]?.media_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media[0].media_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">sem imagem</div>
              )}
            </div>
            <div className="p-3">
              <div className="truncate font-bold">{form.name || "Nome do produto"}</div>
              {form.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{form.description}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-extrabold text-amber-500">{brl(priceCents())}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {form.stock === "" ? "disponível" : Number(form.stock) > 0 ? `${form.stock} un` : "esgotado"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Nome*</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Preço (R$)</Label><Input value={form.price_reais} onChange={(e) => set("price_reais", e.target.value)} placeholder="0,00" /></div>
          <div className="space-y-1"><Label className="text-xs">Estoque (vazio = ∞)</Label><Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Ativo</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.is_active} onChange={(e) => set("is_active", e.target.value)}>
              <option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>
        </div>

        {/* Galeria de mídia */}
        <div className="mt-2 space-y-2 rounded-md border p-3">
          <Label className="text-xs font-semibold">Galeria de mídia {!product && <span className="text-muted-foreground">(salve o produto primeiro)</span>}</Label>
          <div className="flex flex-wrap gap-2">
            {media.map((m, idx) => (
              <div key={m.id} className="group relative h-20 w-20 overflow-hidden rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.media_url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-0.5 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => move(idx, -1)} className="text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => delMedia(m.id)} className="text-white"><X className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(idx, 1)} className="text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            <label className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded border border-dashed text-muted-foreground ${!product || uploading ? "pointer-events-none opacity-40" : ""}`}>
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="mt-1 text-[10px]">imagem</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = "" }} />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{product ? "Salvar alterações" : "Criar produto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
