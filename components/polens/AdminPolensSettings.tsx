"use client"

import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type PolenSettings = {
  id: number
  is_active: boolean
  polens_per_ad: number
  ads_per_day_per_user: number
  cooldown_seconds: number
  daily_polens_limit: number
  price_profile_activation: number
  price_premium_highlight: number
  price_post_boost: number
  price_profile_boost: number
  price_clan_highlight: number
  manifestation_admin_enabled: boolean
  manifestation_users_enabled: boolean
  manifestation_min_xp_level: number
  rewarded_provider: string
  rewarded_ad_unit_id: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

type NumericField = {
  key: keyof Pick<
    PolenSettings,
    | "polens_per_ad"
    | "ads_per_day_per_user"
    | "cooldown_seconds"
    | "daily_polens_limit"
    | "price_profile_activation"
    | "price_premium_highlight"
    | "price_post_boost"
    | "price_profile_boost"
    | "price_clan_highlight"
    | "manifestation_min_xp_level"
  >
  label: string
  helper: string
  suffix?: string
}

const REWARD_FIELDS: NumericField[] = [
  {
    key: "polens_per_ad",
    label: "Polens por anuncio",
    helper: "Credito gerado quando um anuncio recompensado e validado.",
    suffix: "P",
  },
  {
    key: "ads_per_day_per_user",
    label: "Anuncios por usuario/dia",
    helper: "Limite de eventos recompensados por usuario no dia.",
  },
  {
    key: "cooldown_seconds",
    label: "Cooldown entre anuncios",
    helper: "Intervalo minimo entre tentativas do mesmo usuario.",
    suffix: "s",
  },
  {
    key: "daily_polens_limit",
    label: "Limite diario de Polens",
    helper: "Teto maximo de creditos emitidos por usuario no dia.",
    suffix: "P",
  },
]

const PRICE_FIELDS: NumericField[] = [
  {
    key: "price_profile_activation",
    label: "Ativar perfil",
    helper: "Preco para ativacao de perfil profissional via Polens.",
    suffix: "P",
  },
  {
    key: "price_premium_highlight",
    label: "Destaque premium",
    helper: "Preco reservado para destaque premium.",
    suffix: "P",
  },
  {
    key: "price_post_boost",
    label: "Impulsionar post",
    helper: "Preco reservado para boost de publicacao.",
    suffix: "P",
  },
  {
    key: "price_profile_boost",
    label: "Impulsionar perfil",
    helper: "Preco reservado para boost de perfil.",
    suffix: "P",
  },
  {
    key: "price_clan_highlight",
    label: "Destacar clan",
    helper: "Preco reservado para destaque de clan.",
    suffix: "P",
  },
]

const MANIFESTATION_FIELDS: NumericField[] = [
  {
    key: "manifestation_min_xp_level",
    label: "Nivel minimo do usuario",
    helper: "Maximo nivel XP entre subperfis profissionais. Use 20 para liberar apenas users nivel 20+.",
  },
]

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

function fmtDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function normalizeSettings(settings: Partial<PolenSettings>): Record<string, string | boolean | number | null> {
  const next: Record<string, string | boolean | number | null> = {
    id: settings.id ?? 1,
    is_active: !!settings.is_active,
    rewarded_provider: settings.rewarded_provider || "mock",
    rewarded_ad_unit_id: settings.rewarded_ad_unit_id || "",
    manifestation_admin_enabled: settings.manifestation_admin_enabled !== false,
    manifestation_users_enabled: settings.manifestation_users_enabled !== false,
    created_at: settings.created_at || null,
    updated_at: settings.updated_at || null,
    updated_by: settings.updated_by || null,
  }
  for (const field of [...REWARD_FIELDS, ...PRICE_FIELDS, ...MANIFESTATION_FIELDS]) {
    next[field.key] = String(settings[field.key] ?? 0)
  }
  return next
}

function fieldValue(form: Record<string, string | boolean | number | null>, key: string) {
  return String(form[key] ?? "")
}

export function AdminPolensSettings({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string | boolean | number | null>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")

  async function load() {
    const t = token()
    if (!t) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/polens/settings", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Erro ao carregar configuracoes")
      setForm(normalizeSettings(data.settings || {}))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar configuracoes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const invalidFields = useMemo(() => {
    const invalid: string[] = []
    for (const field of [...REWARD_FIELDS, ...PRICE_FIELDS, ...MANIFESTATION_FIELDS]) {
      const value = Number(form[field.key])
      if (!Number.isFinite(value) || value < 0) invalid.push(field.label)
    }
    return invalid
  }, [form])

  async function save() {
    const t = token()
    if (!t) return
    if (invalidFields.length > 0) {
      setMsg("")
      setError(`Revise valores negativos ou invalidos: ${invalidFields.join(", ")}`)
      return
    }
    setSaving(true)
    setMsg("")
    setError("")
    const body: Record<string, unknown> = {
      is_active: !!form.is_active,
      rewarded_provider: String(form.rewarded_provider || "mock").trim() || "mock",
      rewarded_ad_unit_id: String(form.rewarded_ad_unit_id || "").trim() || null,
      manifestation_admin_enabled: !!form.manifestation_admin_enabled,
      manifestation_users_enabled: !!form.manifestation_users_enabled,
    }
    for (const field of [...REWARD_FIELDS, ...PRICE_FIELDS, ...MANIFESTATION_FIELDS]) {
      body[field.key] = Math.floor(Number(form[field.key]) || 0)
    }
    try {
      const res = await fetch("/api/admin/polens/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setForm(normalizeSettings(data.settings || body))
      setMsg("Configuracoes salvas.")
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Carregando configuracoes de Polens
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {msg && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-500">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      <section className="rounded-lg border border-border bg-background/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-semibold">Sistema ativo</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Liga ou desliga ganhos por anuncios e gastos com Polens.
            </p>
          </div>
          <Checkbox
            checked={!!form.is_active}
            onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v === true }))}
          />
        </div>
      </section>

      <SettingsSection
        title="Rewarded ads"
        description="Campos da emissao diaria, cooldown e provider do anuncio recompensado."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {REWARD_FIELDS.map((field) => (
            <NumberField key={field.key} field={field} form={form} setForm={setForm} />
          ))}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Input
              value={fieldValue(form, "rewarded_provider")}
              onChange={(e) => setForm((p) => ({ ...p, rewarded_provider: e.target.value }))}
              placeholder="mock"
            />
            <p className="text-xs text-muted-foreground">Ex.: mock, admob, unity, appodeal.</p>
          </div>
          <div className="space-y-2">
            <Label>Ad unit id</Label>
            <Input
              value={fieldValue(form, "rewarded_ad_unit_id")}
              onChange={(e) => setForm((p) => ({ ...p, rewarded_ad_unit_id: e.target.value }))}
              placeholder="Opcional"
            />
            <p className="text-xs text-muted-foreground">Identificador do bloco de anuncio no provider.</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Precos em Polens"
        description="Todos os precos editaveis da tabela polen_settings. Manifestacao usa preco por produto no catalogo."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {PRICE_FIELDS.map((field) => (
            <NumberField key={field.key} field={field} form={form} setForm={setForm} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Manifestacao"
        description="Controle quem pode comprar ou habilitar banners da loja Manifestacao."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
          <BooleanControl
            label="Admins habilitados"
            helper="Administradores podem comprar/testar Manifestacao mesmo sem nivel minimo."
            checked={!!form.manifestation_admin_enabled}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, manifestation_admin_enabled: checked }))}
          />
          <BooleanControl
            label="Users habilitados"
            helper="Usuarios comuns podem comprar quando tambem atingirem o nivel minimo."
            checked={!!form.manifestation_users_enabled}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, manifestation_users_enabled: checked }))}
          />
          {MANIFESTATION_FIELDS.map((field) => (
            <NumberField key={field.key} field={field} form={form} setForm={setForm} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Metadados" description="Campos readonly do registro singleton de polen_settings.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReadonlyMeta label="ID" value={fieldValue(form, "id")} />
          <ReadonlyMeta label="Criado em" value={fmtDate(fieldValue(form, "created_at"))} />
          <ReadonlyMeta label="Atualizado em" value={fmtDate(fieldValue(form, "updated_at"))} />
          <ReadonlyMeta label="Atualizado por" value={fieldValue(form, "updated_by") || "-"} />
        </div>
      </SettingsSection>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving || invalidFields.length > 0}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar configuracoes
        </Button>
        <Button type="button" variant="outline" onClick={load} disabled={saving}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recarregar
        </Button>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4 border-t border-border pt-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function NumberField({
  field,
  form,
  setForm,
}: {
  field: NumericField
  form: Record<string, string | boolean | number | null>
  setForm: Dispatch<SetStateAction<Record<string, string | boolean | number | null>>>
}) {
  const value = fieldValue(form, field.key)
  const number = Number(value)
  const invalid = value !== "" && (!Number.isFinite(number) || number < 0)

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
          inputMode="numeric"
          className={field.suffix ? "pr-12" : undefined}
        />
        {field.suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {field.suffix}
          </span>
        )}
      </div>
      <p className={invalid ? "text-xs text-red-400" : "text-xs text-muted-foreground"}>
        {invalid ? "Informe um numero inteiro maior ou igual a zero." : field.helper}
      </p>
    </div>
  )
}

function BooleanControl({
  label,
  helper,
  checked,
  onCheckedChange,
}: {
  label: string
  helper: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/30 p-3">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </div>
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
    </div>
  )
}

function ReadonlyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
  )
}
