"use client"

import { Handshake } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface Props {
  allowed: boolean
  onAllowedChange: (allowed: boolean) => void
  disabled?: boolean
  className?: string
  /** "dark" (padrão) para fundos escuros; "light" para modais de tema claro. */
  variant?: "dark" | "light"
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
  variant = "dark",
}: Props) {
  const light = variant === "light"
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4",
        light
          ? "border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03]"
          : "border-white/[0.08] bg-white/[0.02]",
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
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            light ? "text-[#0B0B0D]" : "text-white",
          )}
        >
          <Handshake className={cn("h-4 w-4", light ? "text-[#b8860b]" : "text-amber-300")} />
          Aceito que afiliados vendam este item
        </span>
        <span
          className={cn(
            "block text-[12px] leading-relaxed",
            light ? "text-[#5b554b]" : "text-white/55",
          )}
        >
          Afiliados podem divulgar e vender por você. A comissão por venda
          segue a regra da plataforma.
        </span>
      </span>
    </label>
  )
}
