"use client"

import { Handshake } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface Props {
  allowed: boolean
  onAllowedChange: (allowed: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * Opt-in de afiliados por item (curso / produto / serviço).
 * O criador só aceita ou recusa — a comissão é a regra global do admin.
 */
export function AffiliateOptInField({
  allowed,
  onAllowedChange,
  disabled = false,
  className,
}: Props) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
        className,
      )}
    >
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
          Afiliados podem divulgar e vender por você. A comissão por venda
          segue a regra da plataforma.
        </span>
      </span>
    </label>
  )
}
