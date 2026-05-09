"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Sparkles,
  BadgeCheck,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Category = {
  id: string
  slug: string
  name: string
  sort_order: number
  is_active: boolean
}

type Product = {
  id: string
  category_id: string | null
  category_name: string | null
  category_slug: string | null
  name: string
  description: string | null
  banner_url: string
  banner_thumb_url: string | null
  tag_label: string
  tag_color: string
  tag_icon: string | null
  price_cents: number
  price_polens: number
  duration_days: number
  stock: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

const TAG_COLORS = ["emerald", "amber", "rose", "sky", "violet", "primary", "zinc", "red", "blue", "green", "yellow", "orange"]

const TAG_COLOR_CLASSES: Record<string, string> = {
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  amber:   "border-amber-400/25 bg-amber-400/10 text-amber-300",
  rose:    "border-rose-400/25 bg-rose-400/10 text-rose-300",
  sky:     "border-sky-400/25 bg-sky-400/10 text-sky-300",
  violet:  "border-violet-400/25 bg-violet-400/10 text-violet-300",
  primary: "border-primary/25 bg-primary/10 text-primary",
  zinc:    "border-zinc-400/25 bg-zinc-400/10 text-zinc-300",
  red:     "border-red-400/25 bg-red-400/10 text-red-300",
  blue:    "border-blue-400/25 bg-blue-400/10 text-blue-300",
  green:   "border-green-400/25 bg-green-400/10 text-green-300",
  yellow:  "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
  orange:  "border-orange-400/25 bg-orange-400/10 text-orange-300",
}

const EMPTY_PRODUCT_FORM = {
  name: "",
  description: "",
  category_id: "",
  tag_label: "",
  tag_color: "emerald",
  tag_icon: "Sparkles",
  price_cents: 0,
  price_polens: 0,
  duration_days: 365,
  stock: "",
  sort_order: 0,
  is_active: true,
  is_featured: false,
}

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100)
}

export default function AdminManifestationPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products")

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [loadingProds, setLoadingProds] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Categoria modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catEditing, setCatEditing] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState({ name: "", slug: "", sort_order: 0, is_active: true })
  const [catSaving, setCatSaving] = useState(false)

  // Produto modal
  const [prodModalOpen, setProdModalOpen] = useState(false)
  const [prodEditing, setProdEditing] = useState<Product | null>(null)
  const [prodForm, setProdForm] = useState(EMPTY_PRODUCT_FORM)
  const [prodFile, setProdFile] = useState<File | null>(null)
  const [prodSaving, setProdSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdminFlag = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdminFlag) { router.push("/"); return }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router, token])

  const loadCategories = useCallback(async () => {
    if (!token) return
    setLoadingCats(true)
    try {
      const res = await fetch("/api/admin/manifestations/categories", { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar categorias")
    } finally {
      setLoadingCats(false)
    }
  }, [token])

  const loadProducts = useCallback(async () => {
    if (!token) return
    setLoadingProds(true)
    try {
      const res = await fetch("/api/admin/manifestations/products", { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar produtos")
    } finally {
      setLoadingProds(false)
    }
  }, [token])

  useEffect(() => {
    if (isAdmin) {
      loadCategories()
      loadProducts()
    }
  }, [isAdmin, loadCategories, loadProducts])

  // ---------- Category actions ----------

  function openNewCategory() {
    setCatEditing(null)
    setCatForm({ name: "", slug: "", sort_order: 0, is_active: true })
    setCatModalOpen(true)
  }

  function openEditCategory(c: Category) {
    setCatEditing(c)
    setCatForm({ name: c.name, slug: c.slug, sort_order: c.sort_order, is_active: c.is_active })
    setCatModalOpen(true)
  }

  async function saveCategory() {
    if (!token) return
    if (!catForm.name.trim()) { alert("Nome obrigatório"); return }
    setCatSaving(true)
    try {
      const url = catEditing
        ? `/api/admin/manifestations/categories/${catEditing.id}`
        : "/api/admin/manifestations/categories"
      const res = await fetch(url, {
        method: catEditing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setCatModalOpen(false)
      await loadCategories()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setCatSaving(false)
    }
  }

  async function deleteCategory(c: Category) {
    if (!token) return
    if (!window.confirm(`Excluir categoria "${c.name}"? Produtos ligados a ela ficam órfãos (sem categoria).`)) return
    try {
      const res = await fetch(`/api/admin/manifestations/categories/${c.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      await loadCategories()
      await loadProducts()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    }
  }

  // ---------- Product actions ----------

  function openNewProduct() {
    setProdEditing(null)
    setProdForm(EMPTY_PRODUCT_FORM)
    setProdFile(null)
    setProdModalOpen(true)
  }

  function openEditProduct(p: Product) {
    setProdEditing(p)
    setProdForm({
      name: p.name,
      description: p.description || "",
      category_id: p.category_id || "",
      tag_label: p.tag_label,
      tag_color: p.tag_color,
      tag_icon: p.tag_icon || "",
      price_cents: p.price_cents,
      price_polens: p.price_polens,
      duration_days: p.duration_days,
      stock: p.stock == null ? "" : String(p.stock),
      sort_order: p.sort_order,
      is_active: p.is_active,
      is_featured: p.is_featured,
    })
    setProdFile(null)
    setProdModalOpen(true)
  }

  async function saveProduct() {
    if (!token) return
    if (!prodForm.name.trim()) { alert("Nome obrigatório"); return }
    if (!prodForm.tag_label.trim()) { alert("Tag (label) obrigatória"); return }
    if (!prodEditing && !prodFile) { alert("Banner obrigatório no cadastro"); return }
    setProdSaving(true)
    try {
      const fd = new FormData()
      Object.entries(prodForm).forEach(([k, v]) => {
        if (v == null || v === "") return
        fd.append(k, String(v))
      })
      if (prodFile) fd.append("banner", prodFile)

      const url = prodEditing
        ? `/api/admin/manifestations/products/${prodEditing.id}`
        : "/api/admin/manifestations/products"
      const res = await fetch(url, {
        method: prodEditing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setProdModalOpen(false)
      await loadProducts()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setProdSaving(false)
    }
  }

  async function deleteProduct(p: Product) {
    if (!token) return
    if (!window.confirm(`Desativar "${p.name}"? Ele some da loja, mas usuários que já compraram mantêm o banner.`)) return
    try {
      const res = await fetch(`/api/admin/manifestations/products/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      await loadProducts()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    }
  }

  async function toggleFeature(p: Product) {
    if (!token) return
    try {
      const method = p.is_featured ? "DELETE" : "POST"
      const res = await fetch(`/api/admin/manifestations/products/${p.id}/feature`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      await loadProducts()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    }
  }

  const featuredCount = useMemo(() => products.filter((p) => p.is_featured).length, [products])

  if (checkingAuth) {
    return (
      <div className="bg-page-shell-dark min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="bg-page-shell-dark min-h-[100dvh]">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-[1200px] space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/administracao")} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Administração
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" /> Manifestação — Loja
              </h1>
              <p className="mt-1 text-sm text-white/55">
                Gerencie banners, tags e categorias da loja Manifestação.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`relative px-4 py-2 text-sm font-medium transition ${
                activeTab === "products" ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              Produtos
              {activeTab === "products" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`relative px-4 py-2 text-sm font-medium transition ${
                activeTab === "categories" ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              Categorias
              {activeTab === "categories" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/55">
                  {products.length} produto(s) cadastrado(s) · {featuredCount} em destaque
                </div>
                <Button onClick={openNewProduct} className="bg-primary text-zinc-950 hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Novo produto
                </Button>
              </div>

              {loadingProds ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.02]">
                  <CardContent className="py-12 text-center text-sm text-white/55">
                    Nenhum produto cadastrado ainda.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <Card key={p.id} className="overflow-hidden border-white/10 bg-white/[0.02]">
                      <div
                        className="h-40 bg-zinc-900 bg-cover bg-center"
                        style={{ backgroundImage: `url(${p.banner_url})` }}
                      />
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-semibold text-white">{p.name}</h3>
                              {!p.is_active && <Badge variant="outline" className="text-[10px] text-white/50 border-white/20">Inativo</Badge>}
                              {p.is_featured && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Destaque</Badge>}
                            </div>
                            {p.category_name && (
                              <p className="mt-0.5 text-xs text-white/50">{p.category_name}</p>
                            )}
                          </div>
                        </div>

                        {/* Tag preview */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            TAG_COLOR_CLASSES[p.tag_color] || TAG_COLOR_CLASSES.emerald
                          }`}
                        >
                          <BadgeCheck className="h-3 w-3" /> {p.tag_label}
                        </span>

                        <div className="flex items-center justify-between text-sm">
                          <div className="text-white/85">{fmtBRL(p.price_cents)}</div>
                          <div className="text-primary font-medium">{p.price_polens.toLocaleString("pt-BR")} P</div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => openEditProduct(p)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleFeature(p)} disabled={!p.is_active && !p.is_featured}>
                            {p.is_featured ? (
                              <><StarOff className="mr-1.5 h-3.5 w-3.5" /> Tirar destaque</>
                            ) : (
                              <><Star className="mr-1.5 h-3.5 w-3.5" /> Destacar</>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteProduct(p)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {p.is_active ? "Desativar" : "Reativar"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/55">{categories.length} categoria(s)</div>
                <Button onClick={openNewCategory} className="bg-primary text-zinc-950 hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Nova categoria
                </Button>
              </div>

              {loadingCats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : categories.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.02]">
                  <CardContent className="py-12 text-center text-sm text-white/55">
                    Nenhuma categoria cadastrada ainda.
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-white/10 bg-white/[0.02]">
                  <CardContent className="divide-y divide-white/5 p-0">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{c.name}</span>
                            {!c.is_active && <Badge variant="outline" className="text-[10px] text-white/50 border-white/20">Inativa</Badge>}
                          </div>
                          <p className="text-xs text-white/40">/{c.slug} · ordem {c.sort_order}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditCategory(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteCategory(c)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Category modal */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{catEditing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug (opcional — gerado do nome se vazio)</Label>
              <Input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/85">
              <input
                type="checkbox"
                checked={catForm.is_active}
                onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
              />
              Ativa
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory} disabled={catSaving} className="bg-primary text-zinc-950 hover:bg-primary/90">
              {catSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product modal */}
      <Dialog open={prodModalOpen} onOpenChange={setProdModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{prodEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Banner upload + preview */}
            <div>
              <Label>Banner (recomendado 1600×500, 16:5)</Label>
              <div className="mt-1 space-y-2">
                {(prodFile || prodEditing?.banner_url) && (
                  <div
                    className="h-32 w-full rounded-lg bg-zinc-900 bg-cover bg-center"
                    style={{
                      backgroundImage: prodFile
                        ? `url(${URL.createObjectURL(prodFile)})`
                        : `url(${prodEditing?.banner_url})`,
                    }}
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setProdFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {prodFile ? prodFile.name : prodEditing ? "Substituir banner" : "Escolher arquivo"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Nome</Label>
                <Input value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <select
                  value={prodForm.category_id}
                  onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  <option value="">— sem categoria —</option>
                  {categories.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={prodForm.description}
                onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="text-xs uppercase tracking-wider text-white/55">Tag acoplada</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Label da tag</Label>
                  <Input value={prodForm.tag_label} onChange={(e) => setProdForm({ ...prodForm, tag_label: e.target.value })} />
                </div>
                <div>
                  <Label>Ícone (lucide)</Label>
                  <Input
                    value={prodForm.tag_icon}
                    onChange={(e) => setProdForm({ ...prodForm, tag_icon: e.target.value })}
                    placeholder="ex.: Sparkles, Crown, Heart"
                  />
                </div>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProdForm({ ...prodForm, tag_color: c })}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${TAG_COLOR_CLASSES[c]} ${
                        prodForm.tag_color === c ? "ring-2 ring-white/40" : ""
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Preview</Label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      TAG_COLOR_CLASSES[prodForm.tag_color] || TAG_COLOR_CLASSES.emerald
                    }`}
                  >
                    <BadgeCheck className="h-3 w-3" /> {prodForm.tag_label || "Sua tag aqui"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Preço (R$ centavos)</Label>
                <Input
                  type="number"
                  value={prodForm.price_cents}
                  onChange={(e) => setProdForm({ ...prodForm, price_cents: Number(e.target.value) })}
                />
                <p className="mt-1 text-[10px] text-white/40">{fmtBRL(prodForm.price_cents)}</p>
              </div>
              <div>
                <Label>Preço (Poléns)</Label>
                <Input
                  type="number"
                  value={prodForm.price_polens}
                  onChange={(e) => setProdForm({ ...prodForm, price_polens: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Vigência (dias)</Label>
                <Input
                  type="number"
                  value={prodForm.duration_days}
                  onChange={(e) => setProdForm({ ...prodForm, duration_days: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Estoque (vazio = ilimitado)</Label>
                <Input
                  type="number"
                  value={prodForm.stock}
                  onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                  placeholder="ilimitado"
                />
              </div>
              <div>
                <Label>Ordem na vitrine</Label>
                <Input
                  type="number"
                  value={prodForm.sort_order}
                  onChange={(e) => setProdForm({ ...prodForm, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={prodForm.is_active}
                  onChange={(e) => setProdForm({ ...prodForm, is_active: e.target.checked })}
                />
                {prodForm.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} Ativo na loja
              </label>
              {!prodEditing && (
                <label className="flex items-center gap-2 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={prodForm.is_featured}
                    onChange={(e) => setProdForm({ ...prodForm, is_featured: e.target.checked })}
                  />
                  <Star className="h-3.5 w-3.5" /> Marcar como destaque (substitui o destaque atual)
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProdModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveProduct} disabled={prodSaving} className="bg-primary text-zinc-950 hover:bg-primary/90">
              {prodSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {prodEditing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
