"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
interface Item {
  id_item: string
  desc_item: string
  details: string | null
  unity_price_cents: number
  currency: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface ItemForm {
  desc_item: string
  details: string
  unity_price_cents: string
  currency: string
  is_active: boolean
}

const emptyForm: ItemForm = {
  desc_item: "",
  details: "",
  unity_price_cents: "",
  currency: "BRL",
  is_active: true,
}

export default function AdminItensPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    // Verificar se é admin
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const admin = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!admin) {
          router.push("/")
          return
        }
        setIsAdmin(true)
        fetchItens(token)
      })
      .catch(() => router.push("/"))
  }, [router])

  const fetchItens = async (token: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/itens", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setItens(Array.isArray(data) ? data : data.data ?? [])
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: Item) => {
    setEditingItem(item)
    setForm({
      desc_item: item.desc_item,
      details: item.details ?? "",
      unity_price_cents: String(item.unity_price_cents),
      currency: item.currency,
      is_active: item.is_active,
    })
    setError(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!form.desc_item.trim()) {
      setError("Descrição é obrigatória.")
      return
    }
    if (!form.unity_price_cents || isNaN(Number(form.unity_price_cents))) {
      setError("Preço deve ser um número válido.")
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      desc_item: form.desc_item.trim(),
      details: form.details.trim() || null,
      unity_price_cents: Number(form.unity_price_cents),
      currency: form.currency,
      is_active: form.is_active,
    }

    try {
      const url = editingItem ? `/api/admin/itens/${editingItem.id_item}` : "/api/admin/itens"
      const method = editingItem ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchItens(token)
      } else {
        const data = await res.json()
        setError(data.error || data.message || "Erro ao salvar item.")
      }
    } catch {
      setError("Erro ao salvar item.")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (item: Item) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const res = await fetch(`/api/admin/itens/${item.id_item}/active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchItens(token)
      }
    } catch {
      // silencioso
    }
  }

  const handleDelete = async (item: Item) => {
    const token = localStorage.getItem("token")
    if (!token) return

    if (!confirm(`Deseja realmente excluir o item "${item.desc_item}"?`)) return

    try {
      const res = await fetch(`/api/admin/itens/${item.id_item}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchItens(token)
      }
    } catch {
      // silencioso
    }
  }

  const formatPrice = (cents: number, currency: string) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency })
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Package className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Itens</h1>
              <p className="text-sm text-muted-foreground">Gerencie os itens e preços da plataforma</p>
            </div>
          </div>
          <Button onClick={openCreateModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando itens...</p>
          </div>
        ) : itens.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum item cadastrado.</p>
              <Button onClick={openCreateModal} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {itens.map((item) => (
              <Card key={item.id_item}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.desc_item}</h3>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {item.details && (
                      <p className="text-sm text-muted-foreground mb-1">{item.details}</p>
                    )}
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(item.unity_price_cents, item.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(item)} title={item.is_active ? "Desativar" : "Ativar"}>
                      {item.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Criar/Editar Item */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize as informações do item." : "Preencha as informações do novo item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="desc_item">Descrição <span className="text-destructive">*</span></Label>
              <Input
                id="desc_item"
                placeholder="Ex: Taxa de ativação do perfil"
                value={form.desc_item}
                onChange={(e) => setForm((prev) => ({ ...prev, desc_item: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Detalhes</Label>
              <Input
                id="details"
                placeholder="Ex: Pagamento único para ativar o perfil"
                value={form.details}
                onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unity_price_cents">Preço (centavos) <span className="text-destructive">*</span></Label>
                <Input
                  id="unity_price_cents"
                  type="number"
                  placeholder="5000"
                  value={form.unity_price_cents}
                  onChange={(e) => setForm((prev) => ({ ...prev, unity_price_cents: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {form.unity_price_cents && !isNaN(Number(form.unity_price_cents))
                    ? `= ${formatPrice(Number(form.unity_price_cents), form.currency)}`
                    : "Ex: 5000 = R$ 50,00"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <Input
                  id="currency"
                  placeholder="BRL"
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Item ativo</Label>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? "Salvando..." : editingItem ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
