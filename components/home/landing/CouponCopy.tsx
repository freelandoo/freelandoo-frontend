"use client"

/** CouponCopy — botão de copiar cupom/link com feedback (estado tátil). */
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function CouponCopy({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${label ?? value}`}
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl border border-dashed border-[#14110B]/25 bg-[#FAF7F0] px-3 py-2 font-mono text-sm font-bold text-[#14110B] transition active:scale-[0.98]",
        copied && "border-emerald-500 bg-emerald-50",
        className,
      )}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-[#6B6457] transition group-hover:text-[#14110B]" />
      )}
    </button>
  )
}
