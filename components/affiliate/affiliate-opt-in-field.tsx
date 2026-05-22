"use client"

import { Handshake } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const AFFILIATE_COMMISSION_MIN = 0
export const AFFILIATE_COMMISSION_MAX = 90
export const AFFILIATE_COMMISSION_DEFAULT = 25

interface Props {
  allowed: boolean
  /** Comissão em % (0–90). */
  pct: number
  onAllowedChange: (allowed: boolean) => void
  onPctChange: (pct: number) => void
  disabled?: boolean
  className?: string
}

/**
 * Opt-in de afiliados por item (curso / produto / serviço).
 * Toggle "aceito que afiliados vendam" + campo de % de comissão.
 */
export function AffiliateOptInField({
  allowed,
  pct,
  onAllowedChange,
  onPctChange,
  disabled = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
        className,
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={allowed}
          onCheckedChange={(v) => onAllowedChange(v === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
            <Handshake className="h-4 w-4 text-amber-300" />
            Aceito que afiliados vendam este item
          </span>
          <span className="block text-[12px] leading-relaxed text-white/55">
            Afiliados podem divulgar e vender por você. A cada venda, eles
            ganham a comissão definida abaixo.
          </span>
        </span>
      </label>

      {allowed && (
        <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
          <Label htmlFor="affiliate-pct">Comissão do afiliado (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="affiliate-pct"
              type="number"
              inputMode="decimal"
              min={AFFILIATE_COMMISSION_MIN}
              max={AFFILIATE_COMMISSION_MAX}
              step="1"
              value={Number.isFinite(pct) ? String(pct) : ""}
              onChange={(e) => {
                const n = Number(e.target.value)
                onPctChange(Number.isFinite(n) ? n : 0)
              }}
              disabled={disabled}
              className="w-28"
            />
            <span className="text-sm text-white/55">% por venda</span>
          </div>
          <p className="text-[11px] text-white/45">
            Entre {AFFILIATE_COMMISSION_MIN}% e {AFFILIATE_COMMISSION_MAX}%.
            Sugerido: {AFFILIATE_COMMISSION_DEFAULT}%.
          </p>
        </div>
      )}
    </div>
  )
}
