"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Sparkles,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Category = {
  id_category: number
  desc_category: string
  is_active: boolean
}

// Enxame — a tabela física do backend ainda é tb_machine/id_machine (legado).
type Machine = {
  id_machine: number
  slug: string
  name: string
  display_order: number
  color_from: string | null
  color_to: string | null
  color_glow: string | null
  color_ring: string | null
  color_accent: string | null
  color_text: string | null
  description: string | null
  icon_name: string | null
  is_active: boolean
  categories: Category[]
}

const EMPTY_NEW_MACHINE = {
  slug: "",
  name: "",
  description: "",
  icon_name: "Sparkles",
  color_from: "#6d28d9",
  color_to: "#2563eb",
  color_accent: "#a78bfa",
  color_glow: "rgba(139,92,246,0.45)",
  color_ring: "rgba(139,92,246,0.7)",
  color_text: "#ddd6fe",
}

function autoSlug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

export default function AdminEnxamesPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState<Machine[]>([])
  const [error, setError] = useState<string | null>(null)

  const [addingCatFor, setAddingCatFor] = useState<number | null>(null)
  const [newCatName, setNewCatName] = useState("")
  const [savingCat, setSavingCat] = useState(false)

  const [editMachine, setEditMachine] = useState<Machine | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    icon_name: "",
    color_from: "",
    color_to: "",
    color_accent: "",
    color_glow: "",
    color_ring: "",
    color_text: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const [creatingOpen, setCreatingOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_NEW_MACHINE)
  const [savingCreate, setSavingCreate] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const [editingCat, setEditingCat] = useState<{ id: number; value: string } | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdminFlag = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdminFlag) {
          router.push("/")
          return
        }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router, token])

  const loadMachines = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/enxames", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMachines(Array.isArray(data.enxames) ? data.enxames : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAdmin) loadMachines()
  }, [isAdmin, loadMachines])

  async function toggleMachine(m: Machine) {
    if (!token) return
    const next = !m.is_active
    const confirmed = window.confirm(
      next
        ? `Reativar "${m.name}"? Volta a aparecer na home e nos filtros públicos.`
        : `Desativar "${m.name}"? Some da home, filtros e vitrine pública. Pode reativar depois.`,
    )
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/enxames/${m.id_machine}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    }
  }

  async function handleAddCategory(id_machine: number) {
    if (!token) return
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const res = await fetch(`/api/admin/enxames/${id_machine}/categories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ desc_category: newCatName.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNewCatName("")
      setAddingCatFor(null)
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    } finally {
      setSavingCat(false)
    }
  }

  async function toggleCategoryActive(cat: Category) {
    if (!token) return
    try {
      const res = await fetch(`/api/admin/categories/${cat.id_category}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    }
  }

  async function saveCategoryRename() {
    if (!token || !editingCat) return
    const { id, value } = editingCat
    if (!value.trim()) {
      setEditingCat(null)
      return
    }
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ desc_category: value.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditingCat(null)
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    }
  }

  function openEdit(m: Machine) {
    setEditMachine(m)
    setEditForm({
      name: m.name,
      description: m.description || "",
      icon_name: m.icon_name || "",
      color_from: m.color_from || "",
      color_to: m.color_to || "",
      color_accent: m.color_accent || "",
      color_glow: m.color_glow || "",
      color_ring: m.color_ring || "",
      color_text: m.color_text || "",
    })
  }

  async function handleCreateMachine() {
    if (!token) return
    if (!createForm.name.trim()) {
      alert("Nome obrigatório")
      return
    }
    setSavingCreate(true)
    try {
      const payload = {
        ...createForm,
        slug: createForm.slug.trim() || autoSlug(createForm.name),
      }
      const res = await fetch(`/api/admin/enxames`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setCreatingOpen(false)
      setCreateForm(EMPTY_NEW_MACHINE)
      setSlugTouched(false)
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    } finally {
      setSavingCreate(false)
    }
  }

  async function handleDeleteMachine(m: Machine) {
    if (!token) return
    const confirmed = window.confirm(
      `Excluir "${m.name}" PERMANENTEMENTE? As profissões vinculadas serão desvinculadas (não excluídas) e o enxame some da home, filtros e vitrine. Não dá para desfazer.`,
    )
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/enxames/${m.id_machine}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir")
    }
  }

  async function saveEditMachine() {
    if (!token || !editMachine) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/enxames/${editMachine.id_machine}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditMachine(null)
      await loadMachines()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro")
    } finally {
      setSavingEdit(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <button
          onClick={() => router.push("/administracao")}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold">Governança de Enxames</h1>
            <p className="text-sm text-muted-foreground">
              Habilitar/desabilitar enxames, gerenciar profissões e identidade visual.
            </p>
          </div>
          <Button onClick={() => setCreatingOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo enxame
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-destructive">{error}</CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {machines.map((m) => (
              <Card
                key={m.id_machine}
                className={m.is_active ? "" : "opacity-60 border-dashed"}
              >
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-md border"
                      style={{
                        background: `linear-gradient(135deg, ${m.color_from || "#666"}, ${m.color_to || "#444"})`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {m.name}
                        <Badge variant={m.is_active ? "default" : "secondary"}>
                          {m.is_active ? "Ativo" : "Desativado"}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {m.slug}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {m.categories.length} profissão(ões) · ordem {m.display_order}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant={m.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleMachine(m)}
                    >
                      {m.is_active ? (
                        <>
                          <PowerOff className="h-3.5 w-3.5 mr-1" /> Desativar
                        </>
                      ) : (
                        <>
                          <Power className="h-3.5 w-3.5 mr-1" /> Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteMachine(m)}
                      title="Excluir permanentemente"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {m.categories.map((c) => (
                      <div
                        key={c.id_category}
                        className={`group flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                          c.is_active
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/30 border-border line-through text-muted-foreground"
                        }`}
                      >
                        {editingCat?.id === c.id_category ? (
                          <>
                            <Input
                              className="h-6 text-xs w-48"
                              value={editingCat.value}
                              onChange={(e) =>
                                setEditingCat({ id: c.id_category, value: e.target.value })
                              }
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveCategoryRename()
                                if (e.key === "Escape") setEditingCat(null)
                              }}
                            />
                            <button onClick={saveCategoryRename} className="text-emerald-500">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingCat(null)}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span>{c.desc_category}</span>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition ml-1"
                              onClick={() =>
                                setEditingCat({ id: c.id_category, value: c.desc_category })
                              }
                              title="Renomear"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition"
                              onClick={() => toggleCategoryActive(c)}
                              title={c.is_active ? "Desativar" : "Reativar"}
                            >
                              {c.is_active ? (
                                <X className="h-3 w-3 text-rose-500" />
                              ) : (
                                <Check className="h-3 w-3 text-emerald-500" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    {addingCatFor === m.id_machine ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-7 text-xs w-56"
                          placeholder="Nome da profissão"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddCategory(m.id_machine)
                            if (e.key === "Escape") {
                              setAddingCatFor(null)
                              setNewCatName("")
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={savingCat}
                          onClick={() => handleAddCategory(m.id_machine)}
                        >
                          Adicionar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingCatFor(null)
                            setNewCatName("")
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddingCatFor(m.id_machine)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Profissão
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editMachine} onOpenChange={(v) => !v && setEditMachine(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar enxame</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Ícone (Lucide)</Label>
                  <Input
                    value={editForm.icon_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, icon_name: e.target.value }))}
                    placeholder="Sparkles"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Descrição curta</Label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Texto curto que aparece no card"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Cor inicial</Label>
                  <Input
                    value={editForm.color_from}
                    onChange={(e) => setEditForm((p) => ({ ...p, color_from: e.target.value }))}
                    placeholder="#6d28d9"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cor final</Label>
                  <Input
                    value={editForm.color_to}
                    onChange={(e) => setEditForm((p) => ({ ...p, color_to: e.target.value }))}
                    placeholder="#2563eb"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Accent</Label>
                  <Input
                    value={editForm.color_accent}
                    onChange={(e) => setEditForm((p) => ({ ...p, color_accent: e.target.value }))}
                    placeholder="#a78bfa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Glow</Label>
                  <Input
                    value={editForm.color_glow}
                    onChange={(e) => setEditForm((p) => ({ ...p, color_glow: e.target.value }))}
                    placeholder="#facc15"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ring</Label>
                  <Input
                    value={editForm.color_ring}
                    onChange={(e) => setEditForm((p) => ({ ...p, color_ring: e.target.value }))}
                    placeholder="#eab308"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Texto</Label>
                  <Input
                    value={editForm.color_text}
                    onChange={(e) => setEditForm((p) => ({ ...p, color_text: e.target.value }))}
                    placeholder="#fef3c7"
                  />
                </div>
              </div>
              <div
                className="h-12 rounded-md border"
                style={{
                  background: `linear-gradient(135deg, ${editForm.color_from || "#666"}, ${editForm.color_to || "#444"})`,
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditMachine(null)}>
                Cancelar
              </Button>
              <Button onClick={saveEditMachine} disabled={savingEdit}>
                {savingEdit ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={creatingOpen}
          onOpenChange={(v) => {
            if (!v) {
              setCreatingOpen(false)
              setCreateForm(EMPTY_NEW_MACHINE)
              setSlugTouched(false)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo enxame</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setCreateForm((p) => ({
                        ...p,
                        name,
                        slug: slugTouched ? p.slug : autoSlug(name),
                      }))
                    }}
                    placeholder="Enxame de Eventos"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input
                    value={createForm.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setCreateForm((p) => ({ ...p, slug: e.target.value }))
                    }}
                    placeholder="eventos"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Ícone (Lucide)</Label>
                  <Input
                    value={createForm.icon_name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, icon_name: e.target.value }))}
                    placeholder="Sparkles"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Descrição curta</Label>
                  <Input
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Aparece no card da home"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Cor inicial</Label>
                  <Input
                    value={createForm.color_from}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, color_from: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cor final</Label>
                  <Input
                    value={createForm.color_to}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, color_to: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Accent</Label>
                  <Input
                    value={createForm.color_accent}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, color_accent: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Glow</Label>
                  <Input
                    value={createForm.color_glow}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, color_glow: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ring</Label>
                  <Input
                    value={createForm.color_ring}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, color_ring: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Texto</Label>
                  <Input
                    value={createForm.color_text}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, color_text: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div
                className="h-12 rounded-md border"
                style={{
                  background: `linear-gradient(135deg, ${createForm.color_from}, ${createForm.color_to})`,
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreatingOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateMachine} disabled={savingCreate}>
                {savingCreate ? "Criando…" : "Criar enxame"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
