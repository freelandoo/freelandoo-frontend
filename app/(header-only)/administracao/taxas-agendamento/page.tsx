"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Receipt, Check, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type FeeSettings = {
  id: number
  stripe_fee_percent: number
  service_fee_cents: number
  is_active: boolean
  updated_at: string
  updated_by: string | null
} | null

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
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
      ok
        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
        : "bg-destructive/10 text-destructive border border-destructive/30"
    }`}>
      {ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg}
    </div>
  )
}

function previewCalc(baseReais: string, feePercent: number, feeCents: number) {
  const cleaned = baseReais.replace(/\./g, "").replace(",", ".").trim()
  const base = Math.round((parseFloat(cleaned) || 0) * 100)
  const stripe = Math.round(base * feePercent / 100)
  const service = feeCents
  const total = base + stripe + service
  const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  return { base, stripe, service, total, fmt }
}

export default function TaxasAgendamentoPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [current, setCurrent] = useState<FeeSettings>(null)

  const [stripePercent, setStripePercent] = useState("0")
  const [serviceFeeReais, setServiceFeeReais] = useState("0,00")
  const [isActive, setIsActive] = useState(true)
  const [previewBase, setPreviewBase] = useState("50,00")

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const isAdmin = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setAuthChecked(true)
      })
      .catch(() => router.push("/"))
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ settings: FeeSettings }>("/api/admin/booking-fees")
      setCurrent(data.settings)
      if (data.settings) {
        setStripePercent(String(data.settings.stripe_fee_percent))
        setServiceFeeReais((data.settings.service_fee_cents / 100).toFixed(2).replace(".", ","))
        setIsActive(data.settings.is_active)
      }
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao carregar" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authChecked) void load() }, [authChecked, load])

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const pct = parseFloat(stripePercent.replace(",", "."))
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error("Taxa Stripe deve ser entre 0 e 100")
      const feeReais = parseFloat(serviceFeeReais.replace(/\./g, "").replace(",", "."))
      if (!Number.isFinite(feeReais) || feeReais < 0) throw new Error("Taxa de serviço inválida")
      const updated = await api<{ settings: FeeSettings }>("/api/admin/booking-fees", {
        method: "PUT",
        body: JSON.stringify({
          stripe_fee_percent: pct,
          service_fee_cents: Math.round(feeReais * 100),
          is_active: isActive,
        }),
      })
      setCurrent(updated.settings)
      setFeedback({ ok: true, msg: "Taxas salvas com sucesso" })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao salvar" })
    } finally {
      setSaving(false)
    }
  }

  const feePercent = parseFloat(stripePercent.replace(",", ".")) || 0
  const feeCents = Math.round((parseFloat(serviceFeeReais.replace(/\./g, "").replace(",", ".")) || 0) * 100)
  const preview = previewCalc(previewBase, feePercent, feeCents)

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/administracao")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Taxas de Agendamento</h1>
            <p className="text-sm text-muted-foreground">
              Configure a taxa Stripe (%) e a taxa de serviço da plataforma (valor fixo).
            </p>
          </div>
        </div>

        {feedback && <div className="mb-4"><Banner ok={feedback.ok} msg={feedback.msg} /></div>}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração atual</CardTitle>
              <CardDescription>
                Essas taxas são somadas ao valor informado pelo profissional para calcular o valor final ao cliente.
                O backend recalcula e valida no momento do agendamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {current && (
                    <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa Stripe atual</span>
                        <span className="font-medium">{Number(current.stripe_fee_percent).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa de serviço atual</span>
                        <span className="font-medium">
                          {(current.service_fee_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`text-xs font-medium ${current.is_active ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {current.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="stripe_pct">Taxa Stripe (%)</Label>
                      <Input
                        id="stripe_pct"
                        inputMode="decimal"
                        placeholder="10"
                        value={stripePercent}
                        onChange={(e) => setStripePercent(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Sempre percentual. Ex.: 10 = 10%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service_fee">Taxa de serviço da plataforma (R$)</Label>
                      <Input
                        id="service_fee"
                        inputMode="decimal"
                        placeholder="2,50"
                        value={serviceFeeReais}
                        onChange={(e) => setServiceFeeReais(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Sempre valor fixo em reais. Ex.: 2,50</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label htmlFor="active" className="text-sm">Taxas ativas</Label>
                      <p className="text-xs text-muted-foreground">Desative para zerar o preview (0% + R$ 0,00).</p>
                    </div>
                    <Checkbox
                      id="active"
                      checked={isActive}
                      onCheckedChange={(v) => setIsActive(v === true)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Salvar taxas
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Simulador</CardTitle>
              <CardDescription>Veja o impacto das taxas sobre um valor de exemplo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preview_base">Valor base do profissional (R$)</Label>
                <Input
                  id="preview_base"
                  inputMode="decimal"
                  placeholder="50,00"
                  value={previewBase}
                  onChange={(e) => setPreviewBase(e.target.value)}
                />
              </div>
              <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional recebe</span>
                  <span className="font-medium text-foreground">{preview.fmt(preview.base)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa Stripe ({feePercent.toFixed(2)}%)</span>
                  <span className="text-yellow-500">+ {preview.fmt(preview.stripe)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa de serviço (fixo)</span>
                  <span className="text-yellow-500">+ {preview.fmt(preview.service)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span className="text-foreground">Cliente paga</span>
                  <span className="text-primary">{preview.fmt(preview.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
