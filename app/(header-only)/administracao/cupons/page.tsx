"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Ticket, Search, Percent, Wallet, Check, AlertCircle, Plus, RefreshCw, Calculator, GraduationCap, Briefcase, User, Package } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type Tab = "discount" | "commission" | "specific" | "create" | "simulation"

type DiscountSettings = {
  id_settings: string
  discount_type: "percent" | "amount"
  discount_value: string | number
  max_discount_cents: number | null
  is_active: boolean
  effective_from: string
} | null

type CommissionSettings = {
  id_settings: string
  default_commission_percent: string | number
  commission_base: "GROSS" | "NET_OF_DISCOUNT"
  min_order_cents: number
  max_commission_cents: number | null
  approval_delay_days: number
  effective_from: string
} | null

type CouponSearchResult = {
  coupon: {
    id_coupon: string
    code: string
    owner_user_id: string | null
    owner_name: string | null
    owner_email: string | null
    is_active: boolean
    discount_type: string
    value: number
    max_discount_cents: number | null
  }
  discount: {
    override: {
      discount_type: "percent" | "amount" | null
      discount_value: string | number | null
      max_discount_cents: number | null
    } | null
    general: DiscountSettings
    effective: { discount_type: string; discount_value: number; max_discount_cents: number | null; source: string }
  }
  commission: {
    override: { commission_percent: string | number | null } | null
    general: CommissionSettings
    effective_percent: number | null
    source: "override" | "general" | "none"
  }
}

function useToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

function Banner({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        ok
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
          : "bg-destructive/10 text-destructive border border-destructive/30"
      }`}
    >
      {ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg}
    </div>
  )
}

// ─────────────────────────────── Tab: Descontos ───────────────────────────────
function DiscountTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [current, setCurrent] = useState<DiscountSettings>(null)
  const [form, setForm] = useState({
    discount_type: "percent" as "percent" | "amount",
    discount_value: "",
    max_discount_cents: "",
    is_active: true,
    notes: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ settings: DiscountSettings }>("/api/admin/coupons/discount-settings")
      setCurrent(data.settings)
      if (data.settings) {
        setForm({
          discount_type: data.settings.discount_type,
          discount_value: String(data.settings.discount_value),
          max_discount_cents:
            data.settings.max_discount_cents != null ? String(data.settings.max_discount_cents) : "",
          is_active: data.settings.is_active,
          notes: "",
        })
      }
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      await api("/api/admin/coupons/discount-settings", {
        method: "POST",
        body: JSON.stringify({
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          max_discount_cents: form.max_discount_cents === "" ? null : Number(form.max_discount_cents),
          is_active: form.is_active,
          notes: form.notes || null,
        }),
      })
      setFeedback({ ok: true, msg: "Regra geral de desconto salva." })
      await load()
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro ao salvar" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="h-4 w-4 text-primary" /> Regra geral de desconto
        </CardTitle>
        <CardDescription>
          Aplicada a todos os cupons que não tiverem regra específica. Cada salvamento cria uma nova versão histórica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {current && (
          <div className="text-xs text-muted-foreground">
            Vigente desde {new Date(current.effective_from).toLocaleString()} ·{" "}
            <Badge variant={current.is_active ? "default" : "secondary"}>
              {current.is_active ? "Ativa" : "Desativada"}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.discount_type}
              onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as "percent" | "amount" }))}
            >
              <option value="percent">Percentual (%)</option>
              <option value="amount">Valor fixo (centavos)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input
              type="number"
              min="0"
              value={form.discount_value}
              onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
              placeholder={form.discount_type === "percent" ? "Ex.: 15" : "Ex.: 2000 (= R$ 20,00)"}
            />
          </div>
          <div className="space-y-1">
            <Label>Teto de desconto (centavos)</Label>
            <Input
              type="number"
              min="0"
              value={form.max_discount_cents}
              onChange={(e) => setForm((p) => ({ ...p, max_discount_cents: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Regra ativa
          </label>
        </div>

        <div className="space-y-1">
          <Label>Notas (opcional)</Label>
          <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>

        {feedback && <Banner ok={feedback.ok} msg={feedback.msg} />}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !form.discount_value}>
            {saving ? "Salvando…" : "Salvar regra geral"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────── Tab: Comissões ───────────────────────────────
function CommissionTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [current, setCurrent] = useState<CommissionSettings>(null)
  const [form, setForm] = useState({
    default_commission_percent: "",
    commission_base: "NET_OF_DISCOUNT" as "GROSS" | "NET_OF_DISCOUNT",
    max_commission_cents: "",
    min_order_cents: "0",
    approval_delay_days: "30",
    notes: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ settings: CommissionSettings }>("/api/admin/coupons/commission-settings")
      setCurrent(data.settings)
      if (data.settings) {
        setForm({
          default_commission_percent: String(data.settings.default_commission_percent),
          commission_base: data.settings.commission_base,
          max_commission_cents:
            data.settings.max_commission_cents != null ? String(data.settings.max_commission_cents) : "",
          min_order_cents: String(data.settings.min_order_cents ?? 0),
          approval_delay_days: String(data.settings.approval_delay_days ?? 30),
          notes: "",
        })
      }
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      await api("/api/admin/coupons/commission-settings", {
        method: "POST",
        body: JSON.stringify({
          default_commission_percent: Number(form.default_commission_percent),
          commission_base: form.commission_base,
          max_commission_cents: form.max_commission_cents === "" ? null : Number(form.max_commission_cents),
          min_order_cents: Number(form.min_order_cents || 0),
          approval_delay_days: Number(form.approval_delay_days || 30),
          notes: form.notes || null,
        }),
      })
      setFeedback({ ok: true, msg: "Regra geral de comissão salva." })
      await load()
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro ao salvar" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-primary" /> Regra geral de comissão
        </CardTitle>
        <CardDescription>
          Comissão de afiliado/indicador. Cupons sem regra específica herdam desta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {current && (
          <div className="text-xs text-muted-foreground">
            Vigente desde {new Date(current.effective_from).toLocaleString()}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Comissão (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.default_commission_percent}
              onChange={(e) => setForm((p) => ({ ...p, default_commission_percent: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Base</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.commission_base}
              onChange={(e) => setForm((p) => ({ ...p, commission_base: e.target.value as "GROSS" | "NET_OF_DISCOUNT" }))}
            >
              <option value="NET_OF_DISCOUNT">Após desconto</option>
              <option value="GROSS">Sobre valor bruto</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Teto de comissão (centavos)</Label>
            <Input
              type="number"
              min="0"
              value={form.max_commission_cents}
              onChange={(e) => setForm((p) => ({ ...p, max_commission_cents: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1">
            <Label>Pedido mínimo (centavos)</Label>
            <Input
              type="number"
              min="0"
              value={form.min_order_cents}
              onChange={(e) => setForm((p) => ({ ...p, min_order_cents: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Dias de aprovação</Label>
            <Input
              type="number"
              min="0"
              value={form.approval_delay_days}
              onChange={(e) => setForm((p) => ({ ...p, approval_delay_days: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>

        {feedback && <Banner ok={feedback.ok} msg={feedback.msg} />}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !form.default_commission_percent}>
            {saving ? "Salvando…" : "Salvar regra geral"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── Tab: Cupons específicos ───────────────────────────
function SpecificTab() {
  const [code, setCode] = useState("")
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<CouponSearchResult | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const [editDiscount, setEditDiscount] = useState(false)
  const [editCommission, setEditCommission] = useState(false)

  const [discountForm, setDiscountForm] = useState({
    discount_type: "percent" as "percent" | "amount",
    discount_value: "",
    max_discount_cents: "",
  })
  const [commissionForm, setCommissionForm] = useState({
    commission_percent: "",
    commission_base: "" as "" | "GROSS" | "NET_OF_DISCOUNT",
    max_commission_cents: "",
  })

  async function search() {
    if (!code.trim()) return
    setSearching(true)
    setFeedback(null)
    setResult(null)
    setEditDiscount(false)
    setEditCommission(false)
    try {
      const data = await api<CouponSearchResult>(
        `/api/admin/coupons/search?code=${encodeURIComponent(code.trim())}`
      )
      setResult(data)
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    } finally {
      setSearching(false)
    }
  }

  function openDiscountEditor() {
    if (!result) return
    const eff = result.discount.effective
    setDiscountForm({
      discount_type: (eff.discount_type as "percent" | "amount") || "percent",
      discount_value: String(eff.discount_value ?? ""),
      max_discount_cents: eff.max_discount_cents != null ? String(eff.max_discount_cents) : "",
    })
    setEditDiscount(true)
  }

  function openCommissionEditor() {
    if (!result) return
    setCommissionForm({
      commission_percent:
        result.commission.effective_percent != null ? String(result.commission.effective_percent) : "",
      commission_base: result.commission.general?.commission_base ?? "",
      max_commission_cents: "",
    })
    setEditCommission(true)
  }

  async function saveDiscountOverride() {
    if (!result) return
    setFeedback(null)
    try {
      await api(`/api/admin/coupons/${result.coupon.id_coupon}/discount-override`, {
        method: "PUT",
        body: JSON.stringify({
          discount_type: discountForm.discount_type,
          discount_value: Number(discountForm.discount_value),
          max_discount_cents:
            discountForm.max_discount_cents === "" ? null : Number(discountForm.max_discount_cents),
        }),
      })
      setFeedback({ ok: true, msg: `Desconto específico aplicado a ${result.coupon.code}.` })
      setEditDiscount(false)
      await searchAgain()
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    }
  }

  async function removeDiscountOverride() {
    if (!result) return
    if (!confirm("Remover override de desconto? O cupom volta a usar a regra geral.")) return
    try {
      await api(`/api/admin/coupons/${result.coupon.id_coupon}/discount-override`, { method: "DELETE" })
      setFeedback({ ok: true, msg: "Override de desconto removido." })
      await searchAgain()
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    }
  }

  async function saveCommissionOverride() {
    if (!result) return
    setFeedback(null)
    try {
      await api(`/api/admin/coupons/${result.coupon.id_coupon}/commission-override`, {
        method: "PUT",
        body: JSON.stringify({
          commission_percent: Number(commissionForm.commission_percent),
          commission_base: commissionForm.commission_base || undefined,
          max_commission_cents:
            commissionForm.max_commission_cents === "" ? null : Number(commissionForm.max_commission_cents),
        }),
      })
      setFeedback({ ok: true, msg: `Comissão específica aplicada a ${result.coupon.code}.` })
      setEditCommission(false)
      await searchAgain()
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    }
  }

  async function removeCommissionOverride() {
    if (!result) return
    if (!confirm("Remover override de comissão? O cupom volta a usar a regra geral.")) return
    try {
      await api(`/api/admin/coupons/${result.coupon.id_coupon}/commission-override`, { method: "DELETE" })
      setFeedback({ ok: true, msg: "Override de comissão removido." })
      await searchAgain()
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro" })
    }
  }

  async function searchAgain() {
    const prev = code
    if (!prev.trim()) return
    try {
      const data = await api<CouponSearchResult>(
        `/api/admin/coupons/search?code=${encodeURIComponent(prev.trim())}`
      )
      setResult(data)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" /> Buscar cupom por código
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex.: JOAO-VIEWS-30"
            onKeyDown={(e) => { if (e.key === "Enter") search() }}
          />
          <Button onClick={search} disabled={searching || !code.trim()}>
            {searching ? "Buscando…" : "Buscar"}
          </Button>
        </CardContent>
      </Card>

      {feedback && <Banner ok={feedback.ok} msg={feedback.msg} />}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4 text-primary" />
              {result.coupon.code}
              <Badge variant={result.coupon.is_active ? "default" : "secondary"}>
                {result.coupon.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Dono:{" "}
              {result.coupon.owner_name
                ? `${result.coupon.owner_name} (${result.coupon.owner_email || "—"})`
                : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Desconto */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" /> Desconto atual
                  <Badge variant="outline" className="text-[10px]">
                    {result.discount.effective.source === "override"
                      ? "Específico"
                      : result.discount.effective.source === "general"
                        ? "Regra geral"
                        : "Próprio cupom"}
                  </Badge>
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openDiscountEditor}>
                    Alterar desconto
                  </Button>
                  {result.discount.override && (
                    <Button size="sm" variant="ghost" onClick={removeDiscountOverride}>
                      Remover override
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Tipo: <span className="text-foreground">{result.discount.effective.discount_type}</span> ·{" "}
                Valor: <span className="text-foreground">{result.discount.effective.discount_value}</span>
                {result.discount.effective.max_discount_cents != null && (
                  <> · Teto: <span className="text-foreground">{result.discount.effective.max_discount_cents} cents</span></>
                )}
              </div>
              {editDiscount && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={discountForm.discount_type}
                      onChange={(e) =>
                        setDiscountForm((p) => ({ ...p, discount_type: e.target.value as "percent" | "amount" }))
                      }
                    >
                      <option value="percent">Percentual (%)</option>
                      <option value="amount">Valor fixo (cents)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={discountForm.discount_value}
                      onChange={(e) => setDiscountForm((p) => ({ ...p, discount_value: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Teto (cents)</Label>
                    <Input
                      type="number"
                      value={discountForm.max_discount_cents}
                      onChange={(e) => setDiscountForm((p) => ({ ...p, max_discount_cents: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditDiscount(false)}>Cancelar</Button>
                    <Button size="sm" onClick={saveDiscountOverride}>Aplicar só neste cupom</Button>
                  </div>
                </div>
              )}
            </section>

            {/* Comissão */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" /> Comissão atual
                  <Badge variant="outline" className="text-[10px]">
                    {result.commission.source === "override"
                      ? "Específica"
                      : result.commission.source === "general"
                        ? "Regra geral"
                        : "Não configurada"}
                  </Badge>
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={openCommissionEditor}>
                    Alterar comissão
                  </Button>
                  {result.commission.override && (
                    <Button size="sm" variant="ghost" onClick={removeCommissionOverride}>
                      Remover override
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {result.commission.effective_percent != null
                  ? <>Percentual: <span className="text-foreground">{result.commission.effective_percent}%</span></>
                  : "Nenhuma regra ativa. Configure a regra geral primeiro."}
              </div>
              {editCommission && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <Label>Percentual (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={commissionForm.commission_percent}
                      onChange={(e) =>
                        setCommissionForm((p) => ({ ...p, commission_percent: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Base</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={commissionForm.commission_base}
                      onChange={(e) =>
                        setCommissionForm((p) => ({ ...p, commission_base: e.target.value as "" | "GROSS" | "NET_OF_DISCOUNT" }))
                      }
                    >
                      <option value="">(usa geral)</option>
                      <option value="NET_OF_DISCOUNT">Após desconto</option>
                      <option value="GROSS">Bruto</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Teto (cents)</Label>
                    <Input
                      type="number"
                      value={commissionForm.max_commission_cents}
                      onChange={(e) =>
                        setCommissionForm((p) => ({ ...p, max_commission_cents: e.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditCommission(false)}>Cancelar</Button>
                    <Button size="sm" onClick={saveCommissionOverride}>Aplicar só neste cupom</Button>
                  </div>
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────── Tab: Criar cupom manual ──────────────────────────
function CreateManualCouponTab() {
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [created, setCreated] = useState<{ id_coupon: string; code: string } | null>(null)
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "amount",
    discount_value: "",
    max_discount_cents: "",
    min_order_cents: "",
    max_uses: "",
    expires_at: "",
  })

  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let s = ""
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
    setForm((p) => ({ ...p, code: `FREE-${s}` }))
  }

  async function save() {
    setSaving(true)
    setFeedback(null)
    setCreated(null)
    try {
      const body: Record<string, unknown> = {
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_discount_cents: form.max_discount_cents === "" ? null : Number(form.max_discount_cents),
        min_order_cents: form.min_order_cents === "" ? 0 : Number(form.min_order_cents),
        max_uses: form.max_uses === "" ? null : Number(form.max_uses),
        expires_at: form.expires_at || null,
      }
      if (form.code.trim()) body.code = form.code.trim().toUpperCase()

      const result = await api<{ id_coupon: string; code: string }>("/api/admin/coupons/manual", {
        method: "POST",
        body: JSON.stringify(body),
      })
      setCreated(result)
      setFeedback({ ok: true, msg: `Cupom ${result.code} criado com sucesso.` })
      setForm({ code: "", discount_type: "percent", discount_value: "", max_discount_cents: "", min_order_cents: "", max_uses: "", expires_at: "" })
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro ao criar cupom" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4 text-primary" /> Criar cupom manual
        </CardTitle>
        <CardDescription>
          Cupom sem afiliado — toda conversão fica para a plataforma. O código é gerado automaticamente se deixado em branco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label>Código (opcional)</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="Ex.: FREE-AB3K7M (deixe em branco para gerar)"
            />
          </div>
          <Button variant="outline" size="sm" onClick={randomCode} className="mb-0.5">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Gerar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Tipo de desconto</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.discount_type}
              onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as "percent" | "amount" }))}
            >
              <option value="percent">Percentual (%)</option>
              <option value="amount">Valor fixo (centavos)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input
              type="number"
              min="0"
              value={form.discount_value}
              onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
              placeholder={form.discount_type === "percent" ? "Ex.: 20" : "Ex.: 3000 (= R$ 30)"}
            />
          </div>
          <div className="space-y-1">
            <Label>Teto de desconto (centavos)</Label>
            <Input
              type="number"
              min="0"
              value={form.max_discount_cents}
              onChange={(e) => setForm((p) => ({ ...p, max_discount_cents: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-1">
            <Label>Pedido mínimo (centavos)</Label>
            <Input
              type="number"
              min="0"
              value={form.min_order_cents}
              onChange={(e) => setForm((p) => ({ ...p, min_order_cents: e.target.value }))}
              placeholder="Padrão: 0"
            />
          </div>
          <div className="space-y-1">
            <Label>Usos máximos</Label>
            <Input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))}
              placeholder="Ilimitado"
            />
          </div>
          <div className="space-y-1">
            <Label>Expira em</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
        </div>

        {created && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono">
            Código gerado: <span className="text-primary font-semibold">{created.code}</span>
          </div>
        )}

        {feedback && <Banner ok={feedback.ok} msg={feedback.msg} />}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || !form.discount_value}>
            {saving ? "Criando…" : "Criar cupom"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────── Tab: Simulação ───────────────────────────────
type SimCategory = "course" | "service" | "profile" | "product"

const SIM_CATEGORIES: { id: SimCategory; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "course",  label: "Curso",              icon: <GraduationCap className="h-4 w-4" />, hint: "Venda única do curso." },
  { id: "service", label: "Serviço (booking)",  icon: <Briefcase className="h-4 w-4" />,     hint: "Agendamento pago." },
  { id: "profile", label: "Perfil (ativação)", icon: <User className="h-4 w-4" />,         hint: "Ativação vitalícia do subperfil (pagamento único)." },
  { id: "product", label: "Produto (loja)",     icon: <Package className="h-4 w-4" />,       hint: "Venda da loja. Frete sai da margem da plataforma." },
]

function parseBRL(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".")
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function SimulationTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generalDiscount, setGeneralDiscount] = useState<DiscountSettings>(null)
  const [generalCommission, setGeneralCommission] = useState<CommissionSettings>(null)

  const [category, setCategory] = useState<SimCategory>("course")
  const [priceBRL, setPriceBRL] = useState("")
  const [shippingBRL, setShippingBRL] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [coupon, setCoupon] = useState<CouponSearchResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const [d, c] = await Promise.all([
          api<{ settings: DiscountSettings }>("/api/admin/coupons/discount-settings"),
          api<{ settings: CommissionSettings }>("/api/admin/coupons/commission-settings"),
        ])
        setGeneralDiscount(d.settings)
        setGeneralCommission(c.settings)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar regras")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function lookupCoupon() {
    setLookupError(null)
    setCoupon(null)
    const code = couponCode.trim()
    if (!code) return
    setLookupLoading(true)
    try {
      const data = await api<CouponSearchResult>(
        `/api/admin/coupons/search?code=${encodeURIComponent(code)}`
      )
      setCoupon(data)
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Cupom não encontrado")
    } finally {
      setLookupLoading(false)
    }
  }

  function clearCoupon() {
    setCouponCode("")
    setCoupon(null)
    setLookupError(null)
  }

  const priceCents = parseBRL(priceBRL)
  const shippingCents = category === "product" ? (parseBRL(shippingBRL) ?? 0) : 0

  const sim = useMemo(() => {
    if (priceCents == null || priceCents <= 0) return null

    // Desconto
    const effDiscount = coupon?.discount?.effective
    const discType: "percent" | "amount" =
      (effDiscount?.discount_type as "percent" | "amount")
      || (generalDiscount?.discount_type as "percent" | "amount")
      || "percent"
    const discValue = Number(
      effDiscount?.discount_value
      ?? generalDiscount?.discount_value
      ?? 0
    )
    const discMaxCents = (effDiscount?.max_discount_cents ?? generalDiscount?.max_discount_cents) ?? null
    const discountSource: "override" | "general" | "coupon" | "none" =
      coupon
        ? (effDiscount?.source === "override" ? "override"
          : effDiscount?.source === "general" ? "general"
          : effDiscount?.source === "coupon"  ? "coupon" : "none")
        : (generalDiscount && generalDiscount.is_active && discValue > 0 ? "general" : "none")

    let discountCents = 0
    if (discValue > 0 && (coupon ? effDiscount : (generalDiscount && generalDiscount.is_active))) {
      if (discType === "percent") {
        discountCents = Math.floor(priceCents * (discValue / 100))
      } else {
        discountCents = Math.floor(discValue)
      }
      if (discMaxCents != null && discMaxCents > 0) {
        discountCents = Math.min(discountCents, discMaxCents)
      }
      discountCents = Math.min(discountCents, priceCents)
    }

    const netCents = priceCents - discountCents

    // Comissão
    const commissionPercent = coupon?.commission?.effective_percent
      ?? Number(generalCommission?.default_commission_percent ?? 0)
    const commissionBase: "GROSS" | "NET_OF_DISCOUNT" = generalCommission?.commission_base ?? "NET_OF_DISCOUNT"
    const commissionMaxCents = generalCommission?.max_commission_cents ?? null
    const minOrderCents = generalCommission?.min_order_cents ?? 0
    const commissionSource: "override" | "general" | "none" =
      coupon
        ? coupon.commission.source
        : (generalCommission && commissionPercent > 0 ? "general" : "none")

    const baseForCommissionCents = commissionBase === "GROSS" ? priceCents : netCents
    const eligibleForCommission = baseForCommissionCents >= minOrderCents && commissionPercent > 0
    let commissionCents = 0
    if (eligibleForCommission) {
      commissionCents = Math.floor(baseForCommissionCents * (commissionPercent / 100))
      if (commissionMaxCents != null && commissionMaxCents > 0) {
        commissionCents = Math.min(commissionCents, commissionMaxCents)
      }
    }

    // Plataforma fica com (receita líquida da plataforma)
    // Para produto, plataforma paga o frete; para os demais, sem frete.
    const platformCents = netCents - commissionCents - shippingCents

    return {
      priceCents,
      shippingCents,
      discountCents,
      discType,
      discValue,
      discMaxCents,
      discountSource,
      netCents,
      commissionCents,
      commissionPercent,
      commissionBase,
      minOrderCents,
      commissionMaxCents,
      eligibleForCommission,
      commissionSource,
      platformCents,
      baseForCommissionCents,
    }
  }, [priceCents, shippingCents, coupon, generalDiscount, generalCommission])

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" /> Simular desconto e comissão
          </CardTitle>
          <CardDescription>
            Aplica as regras vigentes (geral + override de cupom, se informado) sobre um preço hipotético e mostra o breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Banner ok={false} msg={error} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as SimCategory)}
              >
                {SIM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                {SIM_CATEGORIES.find((c) => c.id === category)?.hint}
              </p>
            </div>

            <div className="space-y-1">
              <Label>Preço bruto (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex.: 199,90"
                value={priceBRL}
                onChange={(e) => setPriceBRL(e.target.value)}
              />
            </div>

            {category === "product" && (
              <div className="space-y-1">
                <Label>Frete (R$) — opcional</Label>
                <Input
                  inputMode="decimal"
                  placeholder="Ex.: 18,90"
                  value={shippingBRL}
                  onChange={(e) => setShippingBRL(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">A plataforma paga a etiqueta; o frete sai da margem.</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Cupom (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") lookupCoupon() }}
                  placeholder="Deixe em branco para usar regra geral"
                />
                {coupon ? (
                  <Button variant="outline" size="sm" onClick={clearCoupon}>Limpar</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={lookupCoupon} disabled={lookupLoading || !couponCode.trim()}>
                    {lookupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aplicar"}
                  </Button>
                )}
              </div>
              {lookupError && <p className="text-[11px] text-destructive">{lookupError}</p>}
              {coupon && (
                <p className="text-[11px] text-emerald-500">
                  Usando regras de <strong>{coupon.coupon.code}</strong>
                  {coupon.coupon.owner_name && <> · dono: {coupon.coupon.owner_name}</>}
                </p>
              )}
            </div>
          </div>

          {!generalDiscount?.is_active && !coupon && (
            <Banner ok={false} msg="Nenhuma regra geral de desconto ativa — só sobrará comissão para simular." />
          )}
          {!generalCommission && !coupon && (
            <Banner ok={false} msg="Regra geral de comissão não configurada. Cadastre na aba 'Comissões'." />
          )}
        </CardContent>
      </Card>

      {sim && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado da simulação</CardTitle>
            <CardDescription>
              Categoria: <span className="text-foreground">{SIM_CATEGORIES.find((c) => c.id === category)?.label}</span>
              {coupon && <> · Cupom: <span className="text-foreground font-mono">{coupon.coupon.code}</span></>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border divide-y divide-border">
              <SimRow label="Preço bruto" value={formatBRL(sim.priceCents)} />
              <SimRow
                label="Desconto aplicado"
                value={`− ${formatBRL(sim.discountCents)}`}
                hint={
                  sim.discountSource === "none"
                    ? "Nenhuma regra de desconto ativa"
                    : `${sim.discType === "percent" ? `${sim.discValue}%` : formatBRL(sim.discValue)}${sim.discMaxCents != null ? ` · teto ${formatBRL(sim.discMaxCents)}` : ""} · fonte: ${labelSource(sim.discountSource)}`
                }
                emphasis={sim.discountCents > 0 ? "discount" : undefined}
              />
              <SimRow label="Preço líquido (cobrado)" value={formatBRL(sim.netCents)} strong />
              {category === "product" && sim.shippingCents > 0 && (
                <SimRow label="Frete (pago pela plataforma)" value={`− ${formatBRL(sim.shippingCents)}`} hint="Plataforma cobre a etiqueta ME" />
              )}
              <SimRow
                label="Comissão de afiliado"
                value={`− ${formatBRL(sim.commissionCents)}`}
                hint={
                  !sim.eligibleForCommission
                    ? sim.minOrderCents > 0 && sim.baseForCommissionCents < sim.minOrderCents
                      ? `Não atinge pedido mínimo (${formatBRL(sim.minOrderCents)})`
                      : "Sem regra de comissão ativa"
                    : `${sim.commissionPercent}% sobre ${sim.commissionBase === "GROSS" ? "valor bruto" : "valor após desconto"} (${formatBRL(sim.baseForCommissionCents)})${sim.commissionMaxCents != null ? ` · teto ${formatBRL(sim.commissionMaxCents)}` : ""} · fonte: ${labelSource(sim.commissionSource)}`
                }
                emphasis={sim.commissionCents > 0 ? "commission" : undefined}
              />
              <SimRow label="Plataforma fica com" value={formatBRL(sim.platformCents)} strong emphasis="platform" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Kpi label="Desconto" value={formatBRL(sim.discountCents)} tone="discount" />
              <Kpi label="Comissão" value={formatBRL(sim.commissionCents)} tone="commission" />
              <Kpi label="Plataforma" value={formatBRL(sim.platformCents)} tone="platform" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function labelSource(s: "override" | "general" | "coupon" | "none"): string {
  switch (s) {
    case "override": return "específico do cupom"
    case "general": return "regra geral"
    case "coupon": return "valor do próprio cupom"
    case "none": return "—"
  }
}

function SimRow({
  label, value, hint, strong, emphasis,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
  emphasis?: "discount" | "commission" | "platform"
}) {
  const valueColor =
    emphasis === "discount" ? "text-rose-400"
    : emphasis === "commission" ? "text-amber-400"
    : emphasis === "platform" ? "text-emerald-400"
    : "text-foreground"
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <div className={`text-sm ${strong ? "font-semibold" : ""}`}>{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className={`text-sm font-mono tabular-nums ${strong ? "font-semibold" : ""} ${valueColor}`}>{value}</div>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "discount" | "commission" | "platform" }) {
  const cls =
    tone === "discount" ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
    : tone === "commission" ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-mono tabular-nums font-semibold mt-1">{value}</div>
    </div>
  )
}

// ─────────────────────────────── Página raiz ───────────────────────────────
export default function CouponsAdminPage() {
  const router = useRouter()
  const token = useToken()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>("discount")

  useEffect(() => {
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const ok = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!ok) { router.push("/"); return }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router, token])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAdmin) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "discount", label: "Descontos", icon: <Percent className="h-4 w-4" /> },
    { id: "commission", label: "Comissões", icon: <Wallet className="h-4 w-4" /> },
    { id: "specific", label: "Cupons específicos", icon: <Search className="h-4 w-4" /> },
    { id: "create", label: "Criar cupom", icon: <Plus className="h-4 w-4" /> },
    { id: "simulation", label: "Simulação", icon: <Calculator className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        <div className="mb-6 flex items-center gap-3">
          <Ticket className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Cupons</h1>
            <p className="text-sm text-muted-foreground">
              Desconto geral, comissão geral e regras específicas por cupom.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "discount" && <DiscountTab />}
        {tab === "commission" && <CommissionTab />}
        {tab === "specific" && <SpecificTab />}
        {tab === "create" && <CreateManualCouponTab />}
        {tab === "simulation" && <SimulationTab />}
      </main>
    </div>
  )
}
