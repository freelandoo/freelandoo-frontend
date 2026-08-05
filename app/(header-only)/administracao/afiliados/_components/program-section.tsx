"use client"

/**
 * Programa de afiliados (mig 192) — trilhos globais + regra por tipo de compra.
 *
 * É a tela do X1: poléns, premium, manifestação, xp_boost e Loja de Funções
 * nascem DESLIGADOS porque cada um é custo direto e perpétuo de margem. Ligar
 * é decisão de negócio, e até aqui só dava pra fazer com um PATCH na mão.
 *
 * Admin interno: pt-only e dark utilitário, sem i18n (convenção do projeto).
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, Sliders, ToggleLeft } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface Rule {
  id_rule: string
  source_context: string
  regime: "platform" | "user"
  is_enabled: boolean
  percent: string | number
  percent_source: "rule" | "item"
  creates_bond: boolean
  grants_discount: boolean
  max_pool_cents: number | null
  min_order_cents: number | null
  recurring_allowed: boolean
  max_recurring_cycles: number | null
  notes: string | null
}

interface ProgramSettings {
  id_settings: string
  commission_split_percent: string | number
  seller_percent_min: string | number
  seller_percent_max: string | number
  default_percent: string | number
  effective_from: string
  notes: string | null
}

/** Nome de cada contexto na língua do Alex, não na do banco. */
const CONTEXT_LABEL: Record<string, string> = {
  profile_subscription: "Ativação de perfil",
  polen_purchase: "Compra de poléns",
  premium: "Premium (destaque)",
  manifestation: "Manifestação",
  xp_boost: "Booster de XP",
  function_purchase: "Loja de Funções",
  casa_conveniencia: "Casa Views — conveniência",
  loja_produto: "Produto de loja",
  course_purchase: "Curso",
  booking_deposit: "Sinal de agendamento",
}

const num = (v: string | number | null | undefined, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function ProgramSection() {
  const [rules, setRules] = useState<Rule[]>([])
  const [settings, setSettings] = useState<ProgramSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/affiliate/rules", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Erro ao carregar o programa")
        return
      }
      setRules(Array.isArray(data.rules) ? data.rules : [])
      setSettings(data.settings || null)
    } catch {
      setError("Erro de rede ao carregar o programa")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="fl-sharp border-red-500/40">
        <CardContent className="py-6">
          <p className="text-sm text-red-300">{error}</p>
          <Button variant="outline" className="mt-4" onClick={load}>
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    )
  }

  const split = num(settings?.commission_split_percent, 70)
  const platform = rules.filter((r) => r.regime === "platform")
  const user = rules.filter((r) => r.regime === "user")

  return (
    <div className="fl-sharp space-y-6">
      <GlobalRailsCard settings={settings} onSaved={load} />

      <Card className="fl-sharp">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ToggleLeft className="h-4 w-4" /> Plataforma vende — comissão + desconto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Estes contextos criam vínculo vitalício e saem da margem da Freelandoo. O
            pool é <code>preço × %</code>; a comissão é <code>pool × {split}%</code> e o
            resto vira desconto pro comprador.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {platform.map((rule) => (
            <RuleRow key={rule.source_context} rule={rule} split={split} onSaved={load} />
          ))}
        </CardContent>
      </Card>

      <Card className="fl-sharp">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="h-4 w-4" /> Usuário vende — só comissão
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            A % vem do dono do item (campo no modal de produto/curso/serviço), não daqui —
            por isso o percentual fica travado. Aqui só dá pra ligar/desligar o contexto
            inteiro e mexer nos limites.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.map((rule) => (
            <RuleRow key={rule.source_context} rule={rule} split={split} onSaved={load} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** Trilhos globais: versionados — cada save cria uma versão nova, sem apagar a anterior. */
function GlobalRailsCard({
  settings,
  onSaved,
}: {
  settings: ProgramSettings | null
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    commission_split_percent: String(num(settings?.commission_split_percent, 70)),
    seller_percent_min: String(num(settings?.seller_percent_min, 0)),
    seller_percent_max: String(num(settings?.seller_percent_max, 50)),
    default_percent: String(num(settings?.default_percent, 25)),
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    const split = Number(form.commission_split_percent)
    const min = Number(form.seller_percent_min)
    const max = Number(form.seller_percent_max)
    const def = Number(form.default_percent)
    if ([split, min, max, def].some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
      alert("Percentuais devem estar entre 0 e 100.")
      return
    }
    if (min > max) {
      alert("O mínimo do vendedor não pode ser maior que o máximo.")
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/affiliate/program", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          commission_split_percent: split,
          seller_percent_min: min,
          seller_percent_max: max,
          default_percent: def,
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data?.error || "Erro ao salvar os trilhos")
        return
      }
      setForm((f) => ({ ...f, notes: "" }))
      onSaved()
    } catch {
      alert("Erro de rede ao salvar os trilhos")
    } finally {
      setSaving(false)
    }
  }

  const split = Number(form.commission_split_percent) || 0

  return (
    <Card className="fl-sharp">
      <CardHeader>
        <CardTitle className="text-base">Trilhos globais</CardTitle>
        <p className="text-xs text-muted-foreground">
          Valem para todos os contextos. Salvar cria uma VERSÃO nova — as conversões
          antigas seguem com o snapshot da regra que valia na hora da venda.
          {settings?.effective_from
            ? ` Versão atual desde ${new Date(settings.effective_from).toLocaleString("pt-BR")}.`
            : " Nenhuma versão gravada ainda."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="split">Split da comissão (%)</Label>
            <Input
              id="split"
              value={form.commission_split_percent}
              onChange={(e) =>
                setForm({ ...form, commission_split_percent: e.target.value })
              }
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Quanto do pool vai pro afiliado. O resto ({100 - split}%) vira desconto pro
              comprador.
            </p>
          </div>
          <div>
            <Label htmlFor="pmin">% mínima do vendedor</Label>
            <Input
              id="pmin"
              value={form.seller_percent_min}
              onChange={(e) => setForm({ ...form, seller_percent_min: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="pmax">% máxima do vendedor</Label>
            <Input
              id="pmax"
              value={form.seller_percent_max}
              onChange={(e) => setForm({ ...form, seller_percent_max: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Teto do campo que o dono do item preenche.
            </p>
          </div>
          <div>
            <Label htmlFor="pdef">% padrão (itens legados)</Label>
            <Input
              id="pdef"
              value={form.default_percent}
              onChange={(e) => setForm({ ...form, default_percent: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Usada quando o item não tem % própria.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Motivo da mudança (fica na auditoria)</Label>
          <Input
            id="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Ex.: split 70/30 aprovado em 05/08"
          />
        </div>
        <Button onClick={submit} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar nova versão
        </Button>
      </CardContent>
    </Card>
  )
}

/** Uma regra de contexto: liga/desliga + números, com salvar por linha. */
function RuleRow({
  rule,
  split,
  onSaved,
}: {
  rule: Rule
  split: number
  onSaved: () => void
}) {
  const [draft, setDraft] = useState({
    is_enabled: rule.is_enabled,
    percent: String(num(rule.percent)),
    creates_bond: rule.creates_bond,
    grants_discount: rule.grants_discount,
    recurring_allowed: rule.recurring_allowed,
    max_recurring_cycles:
      rule.max_recurring_cycles == null ? "" : String(rule.max_recurring_cycles),
    max_pool_cents: rule.max_pool_cents == null ? "" : String(rule.max_pool_cents),
    min_order_cents: String(rule.min_order_cents ?? 0),
  })
  const [saving, setSaving] = useState(false)

  const byItem = rule.percent_source === "item"
  const pct = byItem ? 0 : Number(draft.percent) || 0

  // Prévia em cima de R$ 100 — é o que responde "quanto isso me custa" antes de ligar.
  const poolCents = Math.floor((10000 * pct) / 100)
  const commissionCents = Math.floor((poolCents * split) / 100)
  const discountCents = poolCents - commissionCents

  async function save() {
    const body: Record<string, unknown> = {
      is_enabled: draft.is_enabled,
      creates_bond: draft.creates_bond,
      grants_discount: draft.grants_discount,
      recurring_allowed: draft.recurring_allowed,
      min_order_cents: Number(draft.min_order_cents) || 0,
      max_pool_cents: draft.max_pool_cents === "" ? null : Number(draft.max_pool_cents),
      max_recurring_cycles:
        draft.max_recurring_cycles === "" ? null : Number(draft.max_recurring_cycles),
    }
    // % de item vem do dono do produto/curso/serviço — mandar daqui só sujaria a regra.
    if (!byItem) body.percent = Number(draft.percent) || 0

    if (!byItem && (Number(draft.percent) < 0 || Number(draft.percent) > 100)) {
      alert("A % deve estar entre 0 e 100.")
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(
        `/api/admin/affiliate/rules/${encodeURIComponent(rule.source_context)}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        alert(data?.error || "Erro ao salvar a regra")
        return
      }
      onSaved()
    } catch {
      alert("Erro de rede ao salvar a regra")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`fl-sharp border p-4 ${
        draft.is_enabled ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Checkbox
          id={`en-${rule.source_context}`}
          checked={draft.is_enabled}
          onCheckedChange={(v) => setDraft({ ...draft, is_enabled: v === true })}
        />
        <Label htmlFor={`en-${rule.source_context}`} className="cursor-pointer font-semibold">
          {CONTEXT_LABEL[rule.source_context] || rule.source_context}
        </Label>
        <Badge className={draft.is_enabled ? "bg-green-500/20 text-green-300" : "bg-zinc-500/20 text-zinc-300"}>
          {draft.is_enabled ? "Ligado" : "Desligado"}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{rule.source_context}</span>
      </div>

      {rule.notes && (
        <p className="mb-3 text-xs text-muted-foreground">{rule.notes}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor={`pct-${rule.source_context}`}>% do pool</Label>
          <Input
            id={`pct-${rule.source_context}`}
            value={byItem ? "—" : draft.percent}
            disabled={byItem}
            onChange={(e) => setDraft({ ...draft, percent: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {byItem ? "Definida pelo dono do item." : "Sobre o preço pago."}
          </p>
        </div>
        <div>
          <Label htmlFor={`pool-${rule.source_context}`}>Teto do pool (centavos)</Label>
          <Input
            id={`pool-${rule.source_context}`}
            value={draft.max_pool_cents}
            placeholder="sem teto"
            onChange={(e) => setDraft({ ...draft, max_pool_cents: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`min-${rule.source_context}`}>Pedido mínimo (centavos)</Label>
          <Input
            id={`min-${rule.source_context}`}
            value={draft.min_order_cents}
            onChange={(e) => setDraft({ ...draft, min_order_cents: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`cyc-${rule.source_context}`}>Ciclos recorrentes (máx.)</Label>
          <Input
            id={`cyc-${rule.source_context}`}
            value={draft.max_recurring_cycles}
            placeholder="sem limite"
            disabled={!draft.recurring_allowed}
            onChange={(e) => setDraft({ ...draft, max_recurring_cycles: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={draft.creates_bond}
            onCheckedChange={(v) => setDraft({ ...draft, creates_bond: v === true })}
          />
          Cria vínculo vitalício
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={draft.grants_discount}
            onCheckedChange={(v) => setDraft({ ...draft, grants_discount: v === true })}
          />
          Dá desconto ao comprador
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={draft.recurring_allowed}
            onCheckedChange={(v) => setDraft({ ...draft, recurring_allowed: v === true })}
          />
          Comissiona recorrência
        </label>
      </div>

      {!byItem && pct > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Numa venda de <strong>R$ 100,00</strong>: pool {brl(poolCents)} → afiliado{" "}
          <strong>{brl(commissionCents)}</strong>
          {draft.grants_discount ? (
            <>
              {" "}
              e desconto <strong>{brl(discountCents)}</strong> (comprador paga{" "}
              {brl(10000 - discountCents)})
            </>
          ) : (
            <> — sem desconto, comprador paga R$ 100,00</>
          )}
          .
        </p>
      )}

      <Button onClick={save} disabled={saving} size="sm" className="mt-4 gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar
      </Button>
    </div>
  )
}
