"use client"

// Régua do SELO VERIFICADO (mig 268). Painel de admin: pt-only, como os outros.
//
// ⚠️ O PREÇO MORA NA TABELA, NUNCA NUMA CONSTANTE — a tela de admin da taxa do
// agendamento já passou meses escrevendo num lugar que ninguém lia (mig 244).
// Mexer no preço vale para quem assinar DEPOIS; a assinatura em curso segue
// com o valor com que nasceu no gateway.
//
// Desligar "À venda" para de vender; quem já assinou mantém o selo até o fim do
// período. Os administradores têm o selo pelo papel, sem pagar.

import { useEffect, useState } from "react"
import { BadgeCheck, Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import {
  PageBackLink,
  TabloidField,
  TabloidInput,
  TABLOID_ACTION_CLASSES,
} from "@/components/tabloide"
import { VerifiedBadge } from "@/components/profile/verified-badge"

type Settings = { monthly_cents: number; is_active: boolean }

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "", ...(init.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

export default function AdminVerifiedPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [price, setPrice] = useState("9,90")
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/verification")
      .then((r) => {
        setSettings(r.settings)
        setPrice((r.settings.monthly_cents / 100).toFixed(2).replace(".", ","))
        setActive(r.settings.is_active)
      })
      .catch((err) => setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao carregar" }))
  }, [])

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      const cents = Math.round(parseFloat(price.replace(/\./g, "").replace(",", ".")) * 100)
      if (!Number.isFinite(cents) || cents < 0 || cents > 100000) throw new Error("Preço entre R$0 e R$1.000")
      const r = await api<{ settings: Settings }>("/api/admin/verification", {
        method: "PUT",
        body: JSON.stringify({ monthly_cents: cents, is_active: active }),
      })
      setSettings(r.settings)
      setFeedback({ ok: true, msg: "Selo salvo." })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Erro ao salvar" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fl-sharp min-h-screen bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageBackLink href="/admin" className="mb-5" />
        <h1 className="fl-display flex items-center gap-3 text-3xl">
          <VerifiedBadge size="lg" /> Selo verificado
        </h1>
        <p className="mt-2 text-sm text-[#9A938A]">
          Assinatura mensal do selo que brilha ao lado do nome. Administradores têm o selo pelo papel, sem pagar.
        </p>

        {feedback && (
          <p className={`mt-4 border-2 border-[#0B0B0D] px-3 py-2 text-sm ${feedback.ok ? "bg-[#1D3B26]" : "bg-[#3B1D1D]"}`}>
            {feedback.msg}
          </p>
        )}

        <section className="mt-6 border-2 border-[#0B0B0D] bg-[#15120E] p-5 shadow-[6px_6px_0_0_#F2B705]">
          <h2 className="fl-display flex items-center gap-2 text-xl">
            <BadgeCheck className="h-5 w-5" /> Preço
          </h2>
          <div className="mt-4 max-w-xs">
            <TabloidField label="Mensalidade (R$)" hint="Vale para quem assinar depois de salvar.">
              <TabloidInput value={price} onChange={(e) => setPrice(e.target.value)} />
            </TabloidField>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            À venda (desmarcado para de vender; quem já assinou mantém o selo até o fim do período)
          </label>
          <button type="button" className={`${TABLOID_ACTION_CLASSES} mt-4`} disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
          {settings && (
            <p className="mt-3 text-[11px] text-[#9A938A]">
              Valendo agora: R$ {(settings.monthly_cents / 100).toFixed(2).replace(".", ",")} por mês ·{" "}
              {settings.is_active ? "à venda" : "fora de venda"}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
