"use client"

// Validade da ficha de treino (mig 296 do backend): 30 / 60 / 90 dias, padrão 60,
// escolhida por quem monta a ficha — o aluno na ficha dele, o professor na
// proposta. O vencimento (`vence_em = created_at + validade_dias`) vem PRONTO da
// API; aqui só se escolhe e se escreve. Peça única para os três editores (ficha
// própria, grade do professor) e para as telas que mostram a ficha, senão o
// seletor de um lugar diverge do outro em silêncio.

import { useState } from "react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

export const VALIDADE_OPCOES = [30, 60, 90] as const
export type ValidadeDias = (typeof VALIDADE_OPCOES)[number]
export const VALIDADE_PADRAO: ValidadeDias = 60

export function asValidade(n: unknown): ValidadeDias {
  const v = Number(n)
  return (VALIDADE_OPCOES as readonly number[]).includes(v) ? (v as ValidadeDias) : VALIDADE_PADRAO
}

/** Seletor 30 / 60 / 90 dias (radio group em botões retos). */
export function ValidityPicker({
  value,
  onChange,
  disabled,
}: {
  value: ValidadeDias
  onChange: (v: ValidadeDias) => void
  disabled?: boolean
}) {
  const t = useTranslations("Workouts")
  return (
    <fieldset className="block" disabled={disabled}>
      <legend className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
        {t("validityLabel", "Validade da ficha")}
      </legend>
      <div role="radiogroup" aria-label={t("validityLabel", "Validade da ficha")} className="mt-1 flex">
        {VALIDADE_OPCOES.map((d) => {
          const active = d === value
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(d)}
              className={`-ml-[2px] min-h-[40px] flex-1 border-2 border-[#0B0B0D] px-3 py-2 text-xs font-black uppercase first:ml-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8C2B] ${
                active ? "relative z-10 bg-[#FF8C2B] text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8] hover:bg-[#2A231A]"
              }`}
            >
              {t("validityDays", "{n} dias").replace("{n}", String(d))}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** "Vence em 12/12 (30 dias)" / "Vencida em 12/12" — texto curto para a ficha. */
export function ValidityLine({
  validadeDias,
  venceEm,
  className = "",
}: {
  validadeDias?: number | null
  venceEm?: string | null
  className?: string
}) {
  const t = useTranslations("Workouts")
  const locale = useLocale()
  // Relógio lido uma vez por montagem (render precisa ser puro).
  const [agora] = useState(() => Date.now())
  if (!venceEm || !validadeDias) return null
  const date = new Date(venceEm)
  if (Number.isNaN(date.getTime())) return null
  const label = date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
  const vencida = date.getTime() <= agora
  return (
    <span className={`${vencida ? "font-black text-[#ff5a44]" : ""} ${className}`}>
      {vencida
        ? t("validityExpiredOn", "Vencida em {date}").replace("{date}", label)
        : t("validityExpiresOn", "Vence em {date} ({n} dias)")
            .replace("{date}", label)
            .replace("{n}", String(validadeDias))}
    </span>
  )
}
