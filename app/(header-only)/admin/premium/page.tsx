"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Crown, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Settings = {
  duration_days: number
  price_cents: number
  price_polens: number
  slots_per_city: number
  is_active: boolean
}

type CityOverride = {
  id: string
  uf: string
  city_name: string
  price_cents: number | null
  price_polens: number | null
  slots: number | null
}

type ActiveItem = {
  id: string
  profile_id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  uf: string
  city_name: string
  payment_method: string
  amount_cents: number | null
  amount_polens: number | null
  activated_at: string
  expires_at: string
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

function fmtBRL(cents: number | null | undefined) {
  if (cents == null) return "—"
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function parseBrl(value: string): number {
  const cleaned = value.replace(/\s/g, "").replace(/[R$]/gi, "").replace(/\./g, "").replace(",", ".")
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100)
}

export default function AdminPremiumPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)

  // Settings
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsForm, setSettingsForm] = useState({
    duration_days: "7",
    price_brl: "50,00",
    price_polens: "500",
    slots_per_city: "5",
    is_active: true,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // Overrides
  const [overrides, setOverrides] = useState<CityOverride[]>([])
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideForm, setOverrideForm] = useState({
    uf: "",
    city_name: "",
    price_brl: "",
    price_polens: "",
    slots: "",
  })
  const [savingOverride, setSavingOverride] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  // Active list
  const [active, setActive] = useState<ActiveItem[]>([])
  const [activeLoading, setActiveLoading] = useState(false)

  useEffect(() => {
    const t = token()
    if (!t) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((u) => {
        const admin = u.is_admin || u.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!admin) router.push("/")
        else setOk(true)
      })
      .catch(() => router.push("/"))
      .finally(() => setBootLoading(false))
  }, [router])

  const loadSettings = useCallback(async () => {
    const t = token()
    if (!t) return
    const res = await fetch("/api/admin/premium/settings", {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    })
    const data = await res.json()
    if (res.ok && data.settings) {
      setSettings(data.settings)
      setSettingsForm({
        duration_days: String(data.settings.duration_days),
        price_brl: (data.settings.price_cents / 100).toFixed(2).replace(".", ","),
        price_polens: String(data.settings.price_polens),
        slots_per_city: String(data.settings.slots_per_city),
        is_active: data.settings.is_active,
      })
    }
  }, [])

  const loadOverrides = useCallback(async () => {
    const t = token()
    if (!t) return
    const res = await fetch("/api/admin/premium/cities", {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    })
    const data = await res.json()
    if (res.ok) setOverrides(data.overrides || [])
  }, [])

  const loadActive = useCallback(async () => {
    const t = token()
    if (!t) return
    setActiveLoading(true)
    const res = await fetch("/api/admin/premium/active", {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    })
    const data = await res.json()
    if (res.ok) setActive(data.items || [])
    setActiveLoading(false)
  }, [])

  useEffect(() => {
    if (!ok) return
    void loadSettings()
    void loadOverrides()
    void loadActive()
  }, [ok, loadSettings, loadOverrides, loadActive])

  async function saveSettings() {
    const t = token()
    if (!t) return
    setSavingSettings(true)
    setSettingsError(null)
    try {
      const price_cents = parseBrl(settingsForm.price_brl)
      const polens = Number(settingsForm.price_polens)
      const days = Number(settingsForm.duration_days)
      const slots = Number(settingsForm.slots_per_city)
      if (!days || days <= 0) throw new Error("Dias deve ser > 0")
      if (price_cents <= 0) throw new Error("Preço deve ser > 0")
      if (!Number.isFinite(polens) || polens <= 0) throw new Error("Poléns deve ser > 0")
      const res = await fetch("/api/admin/premium/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_days: days,
          price_cents,
          price_polens: polens,
          slots_per_city: Number.isFinite(slots) ? slots : 0,
          is_active: settingsForm.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setSettings(data.settings)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Erro")
    } finally {
      setSavingSettings(false)
    }
  }

  function openOverrideCreate() {
    setOverrideForm({ uf: "", city_name: "", price_brl: "", price_polens: "", slots: "" })
    setOverrideError(null)
    setOverrideOpen(true)
  }

  function openOverrideEdit(o: CityOverride) {
    setOverrideForm({
      uf: o.uf,
      city_name: o.city_name,
      price_brl: o.price_cents != null ? (o.price_cents / 100).toFixed(2).replace(".", ",") : "",
      price_polens: o.price_polens != null ? String(o.price_polens) : "",
      slots: o.slots != null ? String(o.slots) : "",
    })
    setOverrideError(null)
    setOverrideOpen(true)
  }

  async function saveOverride() {
    const t = token()
    if (!t) return
    setSavingOverride(true)
    setOverrideError(null)
    try {
      const uf = overrideForm.uf.trim().toUpperCase()
      if (uf.length !== 2) throw new Error("UF inválida")
      if (!overrideForm.city_name.trim()) throw new Error("Cidade obrigatória")
      const body: Record<string, unknown> = {
        uf,
        city_name: overrideForm.city_name.trim(),
      }
      if (overrideForm.price_brl) {
        const cents = parseBrl(overrideForm.price_brl)
        if (cents <= 0) throw new Error("Preço inválido")
        body.price_cents = cents
      }
      if (overrideForm.price_polens) {
        const p = Number(overrideForm.price_polens)
        if (!Number.isFinite(p) || p <= 0) throw new Error("Poléns inválido")
        body.price_polens = p
      }
      if (overrideForm.slots) {
        const s = Number(overrideForm.slots)
        if (!Number.isFinite(s) || s < 0) throw new Error("Vagas inválidas")
        body.slots = s
      }
      const res = await fetch("/api/admin/premium/cities", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setOverrideOpen(false)
      await loadOverrides()
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : "Erro")
    } finally {
      setSavingOverride(false)
    }
  }

  async function removeOverride(o: CityOverride) {
    if (!confirm(`Remover override de ${o.city_name}/${o.uf}?`)) return
    const t = token()
    if (!t) return
    const res = await fetch(`/api/admin/premium/cities/${o.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    })
    if (res.ok) await loadOverrides()
  }

  if (bootLoading || !ok) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Button variant="ghost" className="mb-5" onClick={() => router.push("/admin")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <Crown className="h-7 w-7 fill-amber-300 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold">Premium</h1>
          <p className="text-sm text-muted-foreground">
            Destaque pago por perfil — preço, dias e vagas por cidade.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {/* Configurações globais */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Valores padrão usados quando não há override por cidade.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Duração (dias)</Label>
                <Input
                  inputMode="numeric"
                  value={settingsForm.duration_days}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, duration_days: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={settingsForm.price_brl}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, price_brl: e.target.value }))}
                />
              </div>
              <div>
                <Label>Preço em Poléns</Label>
                <Input
                  inputMode="numeric"
                  value={settingsForm.price_polens}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, price_polens: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
              <div>
                <Label>Vagas por cidade (default)</Label>
                <Input
                  inputMode="numeric"
                  value={settingsForm.slots_per_city}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, slots_per_city: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settingsForm.is_active}
                onChange={(e) => setSettingsForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Premium habilitado para compra
            </label>
            {settingsError && <p className="text-sm text-rose-400">{settingsError}</p>}
            <div>
              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              {settings && (
                <span className="ml-3 text-xs text-muted-foreground">
                  Atual: {fmtBRL(settings.price_cents)} · {settings.price_polens} Poléns ·{" "}
                  {settings.duration_days}d · {settings.slots_per_city} vagas/cidade ·{" "}
                  {settings.is_active ? "ativo" : "desabilitado"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overrides por cidade */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Overrides por cidade</CardTitle>
              <CardDescription>
                Aumentar preço ou vagas em uma cidade específica. Campos vazios usam o default.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openOverrideCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Novo override
            </Button>
          </CardHeader>
          <CardContent>
            {overrides.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum override cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2">Cidade</th>
                      <th className="py-2">Preço</th>
                      <th className="py-2">Poléns</th>
                      <th className="py-2">Vagas</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((o) => (
                      <tr key={o.id} className="border-t border-white/5">
                        <td className="py-2">{o.city_name}/{o.uf}</td>
                        <td className="py-2">{fmtBRL(o.price_cents)}</td>
                        <td className="py-2">{o.price_polens ?? "—"}</td>
                        <td className="py-2">{o.slots ?? "—"}</td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openOverrideEdit(o)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeOverride(o)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de premium ativos */}
        <Card>
          <CardHeader>
            <CardTitle>Perfis premium ativos</CardTitle>
            <CardDescription>Quem está em destaque agora e quando expira.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum perfil ativo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2">Perfil</th>
                      <th className="py-2">Cidade</th>
                      <th className="py-2">Pagamento</th>
                      <th className="py-2">Expira</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((a) => (
                      <tr key={a.id} className="border-t border-white/5">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {a.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-zinc-800" />
                            )}
                            <div>
                              <p className="font-medium">{a.display_name || "—"}</p>
                              {a.username && <p className="text-xs text-muted-foreground">@{a.username}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2">{a.city_name}/{a.uf}</td>
                        <td className="py-2">
                          {a.payment_method === "stripe"
                            ? `Cartão · ${fmtBRL(a.amount_cents)}`
                            : `Poléns · ${a.amount_polens ?? "—"}`}
                        </td>
                        <td className="py-2">
                          {new Date(a.expires_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Override */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override por cidade</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>UF</Label>
                <Input
                  maxLength={2}
                  value={overrideForm.uf}
                  onChange={(e) =>
                    setOverrideForm((f) => ({ ...f, uf: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))
                  }
                  placeholder="SP"
                />
              </div>
              <div className="col-span-2">
                <Label>Cidade</Label>
                <Input
                  value={overrideForm.city_name}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, city_name: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={overrideForm.price_brl}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, price_brl: e.target.value }))}
                  placeholder="default"
                />
              </div>
              <div>
                <Label>Poléns</Label>
                <Input
                  inputMode="numeric"
                  value={overrideForm.price_polens}
                  onChange={(e) =>
                    setOverrideForm((f) => ({ ...f, price_polens: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="default"
                />
              </div>
              <div>
                <Label>Vagas</Label>
                <Input
                  inputMode="numeric"
                  value={overrideForm.slots}
                  onChange={(e) =>
                    setOverrideForm((f) => ({ ...f, slots: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="default"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe em branco pra usar o valor padrão. Upsert: salvar com a mesma UF+cidade sobrescreve.
            </p>
            {overrideError && <p className="text-sm text-rose-400">{overrideError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideOpen(false)}>Cancelar</Button>
            <Button onClick={saveOverride} disabled={savingOverride}>
              {savingOverride && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
