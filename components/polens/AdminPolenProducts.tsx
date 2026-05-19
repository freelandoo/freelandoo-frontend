"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Hexagon, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price_cents: number
  polens_amount: number
  bonus_polens: number
  is_active: boolean
  sort_order: number
}

type FormState = {
  name: string
  description: string
  price_brl: string
  polens_amount: string
  bonus_polens: string
  sort_order: string
  is_active: boolean
  image_url: string
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price_brl: "",
  polens_amount: "",
  bonus_polens: "0",
  sort_order: "0",
  is_active: true,
  image_url: "",
}

const PRESET_PACKAGES = [
  { amount: 10, image: "/polens/polens-10.svg" },
  { amount: 50, image: "/polens/polens-50.svg" },
  { amount: 100, image: "/polens/polens-100.svg" },
  { amount: 1000, image: "/polens/polens-1000.svg" },
  { amount: 10000, image: "/polens/polens-10000.svg" },
  { amount: 50000, image: "/polens/polens-50000.svg" },
]

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatPolens(n: number) {
  return n.toLocaleString("pt-BR")
}

function parseBrlToCents(value: string): number {
  const cleaned = value.replace(/\s/g, "").replace(/[R$]/gi, "").replace(/\./g, "").replace(",", ".")
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}

export function AdminPolenProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "price_brl" | "polens_amount", string>>>({})
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    const t = token()
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/polens/products", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao listar produtos")
      setProducts(data.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao listar produtos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFile(null)
    setFieldErrors({})
    setError(null)
    setOpen(true)
  }

  function openPreset(amount: number, image: string) {
    const existing = products.find((p) => p.polens_amount === amount)
    if (existing) {
      openEdit(existing)
      setForm((f) => ({ ...f, image_url: f.image_url || image }))
      return
    }
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      name: `Pacote ${formatPolens(amount)} Pollens`,
      description: `${formatPolens(amount)} Pollens para usar dentro da Freelandoo.`,
      polens_amount: String(amount),
      sort_order: String(amount),
      image_url: image,
    })
    setFile(null)
    setFieldErrors({})
    setError(null)
    setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name,
      description: p.description || "",
      price_brl: (p.price_cents / 100).toFixed(2).replace(".", ","),
      polens_amount: String(p.polens_amount),
      bonus_polens: String(p.bonus_polens),
      sort_order: String(p.sort_order),
      is_active: p.is_active,
      image_url: p.image_url || "",
    })
    setFile(null)
    setFieldErrors({})
    setError(null)
    setOpen(true)
  }

  async function save() {
    const t = token()
    if (!t) return
    const price_cents = parseBrlToCents(form.price_brl)
    const polens_amount = Number(form.polens_amount)

    const nextErrors: typeof fieldErrors = {}
    if (!form.name.trim()) nextErrors.name = "Insira o nome do produto"
    if (!form.price_brl.trim()) nextErrors.price_brl = "Insira o preço"
    else if (price_cents <= 0) nextErrors.price_brl = "Preço deve ser maior que zero"
    if (!form.polens_amount.trim()) nextErrors.polens_amount = "Insira a quantidade de Poléns"
    else if (!Number.isFinite(polens_amount) || polens_amount <= 0) nextErrors.polens_amount = "Quantidade deve ser maior que zero"

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setFieldErrors({})

    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("name", form.name.trim())
      if (form.description.trim()) fd.append("description", form.description.trim())
      fd.append("price_cents", String(price_cents))
      fd.append("polens_amount", String(polens_amount))
      fd.append("bonus_polens", String(Number(form.bonus_polens) || 0))
      fd.append("sort_order", String(Number(form.sort_order) || 0))
      fd.append("is_active", String(form.is_active))
      if (form.image_url.trim() && !file) fd.append("image_url", form.image_url.trim())
      if (file) fd.append("image", file)

      const url = editing
        ? `/api/admin/polens/products/${editing.id}`
        : "/api/admin/polens/products"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Desativar o produto "${p.name}"?`)) return
    const t = token()
    if (!t) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/polens/products/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao remover")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cadastre pacotes de Poléns vendidos via Stripe na Loja de Polén.
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Novo produto
        </Button>
      </div>

      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3">
        <div className="mb-3">
          <p className="text-sm font-semibold text-amber-100">Pacotes prontos</p>
          <p className="text-xs text-muted-foreground">
            Clique em um pacote para definir o valor em reais e publicar na loja.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_PACKAGES.map((preset) => {
            const existing = products.find((p) => p.polens_amount === preset.amount)
            return (
              <button
                type="button"
                key={preset.amount}
                onClick={() => openPreset(preset.amount, preset.image)}
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/40 p-2 text-left transition hover:border-amber-300/35 hover:bg-amber-300/[0.06] active:scale-[0.99]"
              >
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.image} alt={`Pacote ${formatPolens(preset.amount)} Pollens`} className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {formatPolens(preset.amount)} Pollens
                  </span>
                  <span className="mt-0.5 block text-xs text-white/45">
                    {existing ? `Editar valor: ${formatBRL(existing.price_cents)}` : "Definir valor em R$"}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-zinc-950/40 p-8 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/30 p-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Hexagon className="h-6 w-6 fill-amber-300/40 text-amber-300/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{p.name}</p>
                  {!p.is_active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(p.price_cents)} · {p.polens_amount} Poléns
                  {p.bonus_polens > 0 ? ` (+${p.bonus_polens} bônus)` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-rose-400 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="pp-name">Nome</Label>
              <Input
                id="pp-name"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }))
                }}
                placeholder="Ex.: Pacote 100 Poléns"
                aria-invalid={!!fieldErrors.name}
                className={fieldErrors.name ? "border-rose-500 focus-visible:ring-rose-500/40" : undefined}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-rose-400">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="pp-desc">Descrição</Label>
              <Textarea
                id="pp-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Texto curto opcional exibido na loja"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pp-price">Preço (R$)</Label>
                <Input
                  id="pp-price"
                  inputMode="decimal"
                  value={form.price_brl}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, price_brl: e.target.value }))
                    if (fieldErrors.price_brl) setFieldErrors((p) => ({ ...p, price_brl: undefined }))
                  }}
                  placeholder="9,90"
                  aria-invalid={!!fieldErrors.price_brl}
                  className={fieldErrors.price_brl ? "border-rose-500 focus-visible:ring-rose-500/40" : undefined}
                />
                {fieldErrors.price_brl && <p className="mt-1 text-xs text-rose-400">{fieldErrors.price_brl}</p>}
              </div>
              <div>
                <Label htmlFor="pp-polens">Poléns</Label>
                <Input
                  id="pp-polens"
                  inputMode="numeric"
                  value={form.polens_amount}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, polens_amount: e.target.value.replace(/\D/g, "") }))
                    if (fieldErrors.polens_amount) setFieldErrors((p) => ({ ...p, polens_amount: undefined }))
                  }}
                  placeholder="100"
                  aria-invalid={!!fieldErrors.polens_amount}
                  className={fieldErrors.polens_amount ? "border-rose-500 focus-visible:ring-rose-500/40" : undefined}
                />
                {fieldErrors.polens_amount && <p className="mt-1 text-xs text-rose-400">{fieldErrors.polens_amount}</p>}
              </div>
              <div>
                <Label htmlFor="pp-bonus">Bônus</Label>
                <Input
                  id="pp-bonus"
                  inputMode="numeric"
                  value={form.bonus_polens}
                  onChange={(e) => setForm((f) => ({ ...f, bonus_polens: e.target.value.replace(/\D/g, "") }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="pp-order">Ordem</Label>
                <Input
                  id="pp-order"
                  inputMode="numeric"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value.replace(/\D/g, "") }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Imagem</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
              </div>
              {!file && form.image_url && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{form.image_url}</p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1 h-3 w-3" />
                Selecionar arquivo
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Ativo na loja
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
