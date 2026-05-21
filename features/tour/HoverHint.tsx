"use client"

import { cn } from "@/lib/utils"
import { HINTS, type HintId } from "./hints"

type Side = "top" | "right" | "bottom" | "left"

interface HoverHintProps {
  id: HintId
  /** Lado em que o tooltip aparece em relação ao filho. */
  side?: Side
  /** Classe extra aplicada no wrapper externo. */
  className?: string
  children: React.ReactNode
}

const SIDE_CLASSES: Record<Side, string> = {
  right: "left-full top-1/2 ml-3 -translate-y-1/2",
  left: "right-full top-1/2 mr-3 -translate-y-1/2",
  top: "bottom-full left-1/2 mb-3 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-3 -translate-x-1/2",
}

/**
 * Tooltip de dica que aparece ao passar o mouse (ou ao focar via teclado).
 * Estilizado com Tailwind apenas — sem dependência extra. O texto vem do
 * catálogo em `hints.ts` pelo `id`; se o id não existir, renderiza só os
 * filhos sem wrapper.
 */
export function HoverHint({ id, side = "bottom", className, children }: HoverHintProps) {
  const hint = HINTS[id]
  if (!hint) return <>{children}</>

  return (
    <span className={cn("group/hint relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[60] hidden w-max max-w-[260px] rounded-xl",
          "border border-primary/30 bg-zinc-950/95 px-3 py-2 text-left",
          "text-xs leading-relaxed shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)] backdrop-blur",
          "group-hover/hint:block group-focus-within/hint:block",
          SIDE_CLASSES[side],
        )}
      >
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          {hint.title}
        </span>
        <span className="mt-1 block text-white/85">{hint.text}</span>
      </span>
    </span>
  )
}
