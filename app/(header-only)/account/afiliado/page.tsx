"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock, CreditCard, Hourglass, Info, RotateCcw, Sparkles, Ticket } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ─────────────────────────── Types ───────────────────────────
type Affiliate = {
  id_affiliate: string
  id_user: string
  status: "ACTIVE" | "PAUSED" | "BLOCKED"
  pix_key: string | null
  pix_key_type: string | null
  legal_name: string | null
  tax_id: string | null
}

type Aggregates = {
  pending_cents: number
  approved_cents: number
  eligible_cents: number
  paid_cents: number
  reversed_cents: number
  total_count: number
  converted_count: number
}

type DefaultRule = {
  commission_percent: number
  commission_base: "GROSS" | "NET_OF_DISCOUNT"
  min_order_cents: number
  max_commission_cents: number | null
  approval_delay_days: number
}

type Coupon = {
  id_coupon: string
  code: string
  discount_type: string
  value: string | number
  is_active: boolean
}

type Conversion = {
  id_conversion: string
  coupon_code: string
  order_total_cents: number
  discount_cents: number
  commission_cents: number
  commission_percent: number
  status: "PENDING" | "APPROVED" | "REVERSED" | "PAID"
  eligible_at: string | null
  approved_at: string | null
  paid_at: string | null
  created_at: string
}

// ─────────────────────────── Helpers ───────────────────────────
const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const formatDate = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

const STATUS_CONFIG: Record<Conversion["status"], { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Aprovada", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  PAID: { label: "Paga", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  REVERSED: { label: "Revertida", className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
}

// ─────────────────────────── Page ───────────────────────────
export default function AfiliadoDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [aggregates, setAggregates] = useState<Aggregates | null>(null)
  const [defaultRule, setDefaultRule] = useState<DefaultRule | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])

  const [conversions, setConversions] = useState<Conversion[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [conversionsLoading, setConversionsLoading] = useState(false)

  const [pixForm, setPixForm] = useState({
    pix_key: "",
    pix_key_type: "",
    legal_name: "",
    tax_id: "",
  })
  const [savingPix, setSavingPix] = useState(false)
  const [pixSaved, setPixSaved] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadMe = useCallback(async () => {
    if (!token) {
      setError("Faça login para ver seu painel de afiliado.")
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/me/affiliate", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAffiliate(data.affiliate || null)
      setAggregates(data.aggregates || null)
      setDefaultRule(data.default_rule || null)
      setCoupons(Array.isArray(data.coupons) ? data.coupons : [])
      if (data.affiliate) {
        setPixForm({
          pix_key: data.affiliate.pix_key || "",
          pix_key_type: data.affiliate.pix_key_type || "",
          legal_name: data.affiliate.legal_name || "",
          tax_id: data.affiliate.tax_id || "",
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadConversions = useCallback(async () => {
    if (!token) return
    setConversionsLoading(true)
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" })
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      const res = await fetch(`/api/me/affiliate/conversions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setConversions(data.items || [])
    } finally {
      setConversionsLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    loadConversions()
  }, [loadConversions])

  const handleSavePix = async () => {
    if (!token) return
    setSavingPix(true)
    setPixSaved(false)
    try {
      const res = await fetch("/api/me/affiliate/payout-info", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pix_key: pixForm.pix_key || null,
          pix_key_type: pixForm.pix_key_type || null,
          legal_name: pixForm.legal_name || null,
          tax_id: pixForm.tax_id || null,
        }),
      })
      if (res.ok) {
        setPixSaved(true)
        setTimeout(() => setPixSaved(false), 2500)
        await loadMe()
      }
    } finally {
      setSavingPix(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-page-shell-dark min-h-screen">
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto text-center text-muted-foreground">Carregando…</div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-page-shell-dark min-h-screen">
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-destructive">{error}</p>
            <Link href="/account" className="text-sm text-muted-foreground underline mt-4 inline-block">
              Voltar para a conta
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const cards = [
    {
      label: "Pendente",
      value: aggregates?.pending_cents ?? 0,
      icon: Hourglass,
      hint: "Pedidos aguardando pagamento",
    },
    {
      label: "Aprovada",
      value: aggregates?.approved_cents ?? 0,
      icon: CheckCircle2,
      hint: "Pago pelo cliente · aguardando liberação",
    },
    {
      label: "Elegível",
      value: aggregates?.eligible_cents ?? 0,
      icon: Clock,
      hint: "Pronto pra entrar em um payout",
    },
    {
      label: "Paga",
      value: aggregates?.paid_cents ?? 0,
      icon: CreditCard,
      hint: "Transferida pra você",
    },
    {
      label: "Revertida",
      value: aggregates?.reversed_cents ?? 0,
      icon: RotateCcw,
      hint: "Cancelamento ou estorno",
    },
  ]

  return (
    <div className="bg-page-shell-dark min-h-screen">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-full border border-primary/30 bg-primary/10 p-2">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Painel de Afiliado</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhe conversões, comissões e dados de pagamento.
                </p>
              </div>
              <div className="ml-auto">
                <Badge variant={affiliate?.status === "ACTIVE" ? "default" : "secondary"}>
                  {affiliate?.status ?? "SEM AFILIAÇÃO"}
                </Badge>
              </div>
            </div>
          </div>

          {!affiliate && (
            <Card className="border-dashed">
              <CardContent className="flex gap-3 items-start p-4">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  Você ainda não está cadastrado no programa de afiliados. Todos os números abaixo
                  ficam zerados até sua primeira conversão. Fale com a equipe Freelandoo para
                  ativar sua afiliação oficial e habilitar pagamentos.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coupon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Seu cupom
              </CardTitle>
              <CardDescription>
                Divulgue seu cupom para gerar conversões e acumular comissão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coupons.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Você ainda não tem cupom ativo. Fale com a equipe Freelandoo para gerar o seu.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {coupons.map((c) => (
                    <div
                      key={c.id_coupon}
                      className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-sm"
                    >
                      {c.code}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {c.label}
                    </p>
                    <c.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-xl font-semibold">{formatBRL(c.value)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Default rule */}
          {defaultRule && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Regra vigente</CardTitle>
                <CardDescription>
                  Aplicada por padrão aos seus cupons. Um cupom específico pode ter override definido pelo admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Comissão</p>
                    <p className="font-semibold">{defaultRule.commission_percent}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Base</p>
                    <p className="font-semibold">
                      {defaultRule.commission_base === "GROSS" ? "Bruto" : "Líquido do desconto"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Pedido mínimo</p>
                    <p className="font-semibold">{formatBRL(defaultRule.min_order_cents)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Liberação após</p>
                    <p className="font-semibold">{defaultRule.approval_delay_days} dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payout info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados para pagamento</CardTitle>
              <CardDescription>
                Usaremos estas informações quando gerarmos um lote de pagamento pra você.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pix-type">Tipo de chave PIX</Label>
                  <Select
                    value={pixForm.pix_key_type}
                    onValueChange={(v) => setPixForm((p) => ({ ...p, pix_key_type: v }))}
                  >
                    <SelectTrigger id="pix-type">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="EMAIL">E-mail</SelectItem>
                      <SelectItem value="PHONE">Telefone</SelectItem>
                      <SelectItem value="RANDOM">Chave aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix-key">Chave PIX</Label>
                  <Input
                    id="pix-key"
                    placeholder="Sua chave"
                    value={pixForm.pix_key}
                    onChange={(e) => setPixForm((p) => ({ ...p, pix_key: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-name">Nome completo / Razão social</Label>
                  <Input
                    id="legal-name"
                    value={pixForm.legal_name}
                    onChange={(e) => setPixForm((p) => ({ ...p, legal_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-id">CPF / CNPJ</Label>
                  <Input
                    id="tax-id"
                    value={pixForm.tax_id}
                    onChange={(e) => setPixForm((p) => ({ ...p, tax_id: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSavePix} disabled={savingPix || !affiliate}>
                  {savingPix ? "Salvando…" : "Salvar"}
                </Button>
                {pixSaved && <span className="text-xs text-emerald-500">Dados salvos.</span>}
                {!affiliate && (
                  <span className="text-xs text-muted-foreground">
                    Disponível após ativação da afiliação.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conversions */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <CardTitle className="text-base">Conversões</CardTitle>
                  <CardDescription>
                    {aggregates?.total_count ?? 0} no total ·{" "}
                    {aggregates?.converted_count ?? 0} confirmadas.
                  </CardDescription>
                </div>
                <div className="w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="APPROVED">Aprovada</SelectItem>
                      <SelectItem value="PAID">Paga</SelectItem>
                      <SelectItem value="REVERSED">Revertida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {conversionsLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : conversions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhuma conversão neste filtro ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2 pr-4">Data</th>
                        <th className="py-2 pr-4">Cupom</th>
                        <th className="py-2 pr-4">Pedido</th>
                        <th className="py-2 pr-4">Desconto</th>
                        <th className="py-2 pr-4">Comissão</th>
                        <th className="py-2 pr-4">Elegível em</th>
                        <th className="py-2 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.map((c) => {
                        const cfg = STATUS_CONFIG[c.status]
                        return (
                          <tr key={c.id_conversion} className="border-t border-border/60">
                            <td className="py-3 pr-4">{formatDate(c.created_at)}</td>
                            <td className="py-3 pr-4 font-mono text-xs">{c.coupon_code}</td>
                            <td className="py-3 pr-4">{formatBRL(c.order_total_cents)}</td>
                            <td className="py-3 pr-4">{formatBRL(c.discount_cents)}</td>
                            <td className="py-3 pr-4 font-semibold">
                              {formatBRL(c.commission_cents)}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({Number(c.commission_percent).toFixed(0)}%)
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">{formatDate(c.eligible_at)}</td>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cfg.className}`}>
                                {cfg.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
