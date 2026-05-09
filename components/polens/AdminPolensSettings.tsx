"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

const FIELDS = [
  ["polens_per_ad", "Poléns por anúncio"],
  ["ads_per_day_per_user", "Anúncios por dia por usuário"],
  ["cooldown_seconds", "Cooldown entre anúncios (segundos)"],
  ["daily_polens_limit", "Limite diário de Poléns"],
  ["price_profile_activation", "Preço para ativar perfil"],
  ["price_premium_highlight", "Preço para destaque premium"],
  ["price_post_boost", "Preço para impulsionar post"],
  ["price_profile_boost", "Preço para impulsionar perfil"],
  ["price_clan_highlight", "Preço para destacar clan"],
] as const

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export function AdminPolensSettings({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const t = token()
    if (!t) return
    fetch("/api/admin/polens/settings", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings || {}
        const next: Record<string, string | boolean> = { is_active: !!s.is_active }
        for (const [key] of FIELDS) next[key] = String(s[key] ?? 0)
        next.rewarded_provider = s.rewarded_provider || "mock"
        next.rewarded_ad_unit_id = s.rewarded_ad_unit_id || ""
        setForm(next)
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    const t = token()
    if (!t) return
    setSaving(true)
    setMsg("")
    const body: Record<string, unknown> = {
      is_active: !!form.is_active,
      rewarded_provider: form.rewarded_provider,
      rewarded_ad_unit_id: form.rewarded_ad_unit_id,
    }
    for (const [key] of FIELDS) body[key] = Number(form[key]) || 0
    try {
      const res = await fetch("/api/admin/polens/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setMsg("Configurações salvas.")
      onSaved()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label>Sistema ativo</Label>
          <p className="text-xs text-muted-foreground">Liga ou desliga ganhos e gastos com Poléns.</p>
        </div>
        <Checkbox checked={!!form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v === true }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <Input value={String(form[key] || "")} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} inputMode="numeric" />
          </div>
        ))}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Input value={String(form.rewarded_provider || "")} onChange={(e) => setForm((p) => ({ ...p, rewarded_provider: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Ad unit id</Label>
          <Input value={String(form.rewarded_ad_unit_id || "")} onChange={(e) => setForm((p) => ({ ...p, rewarded_ad_unit_id: e.target.value }))} />
        </div>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar
      </Button>
    </div>
  )
}
