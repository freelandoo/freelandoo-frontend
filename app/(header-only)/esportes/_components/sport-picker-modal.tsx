"use client"

// O ESPORTE DA PESSOA (mig 306 do backend) — o modal do primeiro acesso a
// /esportes e o "trocar" da aba Meu esporte. Um esporte só (decisão do Alex).
// A lista vem do backend (GET /fitness/sport), fonte única: esporte novo é uma
// linha em src/utils/sports.js de lá, sem deploy aqui.

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

export type SportOption = { key: string; label: string }

export function SportPickerModal({
  options,
  current,
  firstTime,
  onClose,
  onPicked,
}: {
  options: SportOption[]
  current: string | null
  /** Primeiro acesso: o texto convida; depois, só troca. */
  firstTime: boolean
  onClose: () => void
  onPicked: (sport: string) => void
}) {
  const t = useTranslations("Sports")
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState("")

  const pick = async (key: string) => {
    if (saving) return
    setSaving(key)
    setError("")
    try {
      const res = await fetch("/api/fitness/sport", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() || ""}` },
        body: JSON.stringify({ sport: key }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "")
      onPicked(key)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("pickError", "Não deu para salvar. Tente de novo."))
    } finally {
      setSaving(null)
    }
  }

  return (
    <TabloidDialog
      open
      onOpenChange={(o) => {
        if (!o && !saving) onClose()
      }}
      size="lg"
      eyebrow={t("eyebrow", "Esportes")}
      title={firstTime ? t("pickTitleFirst", "Qual é o seu esporte?") : t("pickTitle", "Trocar meu esporte")}
      description={t(
        "pickDescription",
        "A aba Meu esporte mostra só os posts dele. O feed Geral continua com todos os esportes."
      )}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const on = o.key === current
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => void pick(o.key)}
              disabled={!!saving}
              aria-pressed={on}
              className={`flex items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-3 text-[12px] font-black uppercase tracking-[0.08em] transition ${
                on
                  ? "bg-[#FF8C2B] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                  : "bg-[#1D1810] text-[#F5F1E8] hover:border-[#FB923C]"
              } disabled:opacity-60`}
            >
              {saving === o.key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {o.label}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    </TabloidDialog>
  )
}
