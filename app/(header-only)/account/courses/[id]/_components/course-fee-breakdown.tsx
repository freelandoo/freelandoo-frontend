"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { formatPriceBRL } from "@/lib/courses/format"

type Pricing = {
  seller_amount_cents: number
  service_fee_cents: number
  processor_fee_cents: number
  affiliate_commission_cents: number
  display_price_cents: number
}

/**
 * Mostra o breakdown do preço de um curso: quanto o dono recebe, a taxa de
 * serviço, a taxa da maquininha e a comissão do afiliado — e quanto o cliente
 * paga no fim. Busca em /api/store/price-preview (fee model unificado da Loja).
 */
export function CourseFeeBreakdown({
  priceCents,
  affiliatesAllowed,
}: {
  priceCents: number | null
  affiliatesAllowed?: boolean
}) {
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!priceCents || priceCents <= 0) {
      setPricing(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const params = new URLSearchParams({ seller_cents: String(priceCents) })
    if (affiliatesAllowed) params.set("affiliates_allowed", "true")
    fetch(`/api/store/price-preview?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setPricing(d?.pricing ?? null)
      })
      .catch(() => {
        if (!cancelled) setPricing(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [priceCents, affiliatesAllowed])

  if (!priceCents || priceCents <= 0) {
    return (
      <p className="mt-2 text-xs text-[#5b554b]">
        Defina um preço (mín. R$ 5,00 para publicar) e veja aqui o que você
        recebe e o que o cliente paga.
      </p>
    )
  }

  return (
    <div className="mt-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[4px_4px_0_0_#0B0B0D]">
      <div className="mb-2 flex items-center justify-between">
        <span className="fl-display text-sm uppercase tracking-wide text-[#F2B705]">
          Quem paga o quê
        </span>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5b554b]" />}
      </div>

      {pricing ? (
        <div className="space-y-1.5 text-sm">
          <Row label="Você recebe" value={pricing.seller_amount_cents} tone="seller" />
          <Row label="+ Taxa de serviço" value={pricing.service_fee_cents} tone="fee" />
          <Row label="+ Taxa da maquininha" value={pricing.processor_fee_cents} tone="fee" />
          {pricing.affiliate_commission_cents > 0 && (
            <Row label="+ Comissão do afiliado" value={pricing.affiliate_commission_cents} tone="fee" />
          )}
          <div className="my-1 h-px bg-[#0B0B0D]/10" />
          <Row label="Cliente paga" value={pricing.display_price_cents} tone="total" />
        </div>
      ) : (
        !loading && <p className="text-xs text-[#5b554b]">Não foi possível calcular as taxas agora.</p>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "seller" | "fee" | "total"
}) {
  const labelCls =
    tone === "total"
      ? "fl-display text-base text-[#0B0B0D]"
      : tone === "seller"
        ? "font-bold text-[#0B0B0D]/85"
        : "text-[#0B0B0D]/55"
  const valueCls =
    tone === "total"
      ? "fl-display text-lg text-[#F2B705]"
      : tone === "seller"
        ? "font-bold text-emerald-600"
        : "text-[#0B0B0D]/55"
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={labelCls}>{label}</span>
      <span className={valueCls}>{formatPriceBRL(value)}</span>
    </div>
  )
}
