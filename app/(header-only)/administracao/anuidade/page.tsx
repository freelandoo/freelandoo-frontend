"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Wallet, Check, AlertCircle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

type Settings = {
  id: number
  amount_cents: number
  currency: string
  stripe_price_id: string | null
  stripe_product_id: string | null
  is_active: boolean
  created_at: string
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

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function AtivacaoAdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [current, setCurrent] = useState<Settings>(null)
  const [amountReais, setAmountReais] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const isAdmin =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) {
          router.push("/")
          return
        }
        setAuthChecked(true)
      })
      .catch(() => router.push("/"))
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ settings: Settings }>("/api/admin/annual-fee")
      setCurrent(data.settings)
      if (data.settings) {
        setAmountReais((data.settings.amount_cents / 100).toFixed(2).replace(".", ","))
        setIsActive(data.settings.is_active)
      }
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao carregar" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authChecked) void load()
  }, [authChecked, load])

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const normalized = amountReais.replace(/\./g, "").replace(",", ".")
      const reais = Number(normalized)
      if (!Number.isFinite(reais) || reais < 0) {
        throw new Error("Valor inválido")
      }
      const amount_cents = Math.round(reais * 100)
      const updated = await api<{ settings: Settings }>("/api/admin/annual-fee", {
        method: "PUT",
        body: JSON.stringify({ amount_cents, is_active: isActive }),
      })
      setCurrent(updated.settings)
      setFeedback({ ok: true, msg: "Configurações salvas" })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao salvar" })
    } finally {
      setSaving(false)
    }
  }

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
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Ativação do perfil</h1>
            <p className="text-sm text-muted-foreground">
              Configurar valor e status da ativação única de criadores.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="mb-4">
            <Banner ok={feedback.ok} msg={feedback.msg} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuração atual</CardTitle>
            <CardDescription>
              O valor é cobrado uma única vez por perfil via Stripe. Alterações aqui afetam novas ativações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor atual</span>
                    <span className="font-medium">
                      {current ? formatBRL(current.amount_cents) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moeda</span>
                    <span className="font-medium">{current?.currency ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={current?.is_active ? "default" : "secondary"}>
                      {current?.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stripe Price ID</span>
                    <span className="font-mono text-xs break-all">
                      {current?.stripe_price_id ?? "não configurado"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stripe Product ID</span>
                    <span className="font-mono text-xs break-all">
                      {current?.stripe_product_id ?? "não configurado"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="300,00"
                    value={amountReais}
                    onChange={(e) => setAmountReais(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use vírgula para decimais. Ex.: 300,00
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="active" className="text-sm">
                      Cobrança ativa
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Desative para pausar novas ativações.
                    </p>
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
                    Salvar alterações
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  No modelo atual, o checkout usa o valor configurado aqui para criar o pagamento único.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
