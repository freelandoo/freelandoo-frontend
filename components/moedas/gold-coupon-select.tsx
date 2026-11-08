"use client"

// A7 — escolher um cupom Gold do próprio usuário na hora de pagar em dinheiro.
// O backend reserva o cupom na cobrança e resgata quando o pagamento cai;
// aqui só listamos os disponíveis que cabem no preço (cobrança fica ≥ R$ 1).

import { useEffect, useState } from "react"
import { Ticket } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type Coupon = { id: string; code: string; discount_cents: number; status: "available" | "reserved" | "used" }

export function GoldCouponSelect({
  priceCents,
  value,
  onChange,
  light = false,
}: {
  priceCents: number
  value: string
  onChange: (id: string) => void
  /** Página clara (papel): tinta escura. */
  light?: boolean
}) {
  const t = useTranslations("Moedas")
  const locale = useLocale()
  const [coupons, setCoupons] = useState<Coupon[]>([])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    let cancelled = false
    fetch("/api/polens/coupons", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { coupons: [] }))
      .then((d) => {
        if (!cancelled) setCoupons(Array.isArray(d.coupons) ? d.coupons : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const usable = coupons.filter((c) => c.status === "available" && priceCents - c.discount_cents >= 100)
  if (usable.length === 0) return null
  const brl = (c: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(c / 100)

  return (
    <label className={`fl-sharp flex items-center gap-2 text-xs ${light ? "text-[#0B0B0D]/70" : "text-[#C9C2B6]"}`}>
      <Ticket className="h-4 w-4 text-[#F2B705]" aria-hidden />
      <span className="font-bold uppercase tracking-[0.14em]">{t("couponUse", "Cupom Gold")}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={light
          ? "h-9 flex-1 border-2 border-[#0B0B0D] bg-white px-2 text-xs text-[#0B0B0D] outline-none focus:border-[#F2B705]"
          : "h-9 flex-1 border-2 border-[#F5F1E8]/12 bg-[#141009] px-2 text-xs text-[#F5F1E8] outline-none focus:border-[#F2B705]"}
      >
        <option value="">{t("couponNone", "Sem cupom")}</option>
        {usable.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} · −{brl(c.discount_cents)}
          </option>
        ))}
      </select>
    </label>
  )
}
