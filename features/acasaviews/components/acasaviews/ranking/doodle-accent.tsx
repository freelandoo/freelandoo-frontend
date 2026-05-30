import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type DoodleType = "arrow" | "circle" | "scribble" | "underline" | "spark" | "crown" | "cross"

interface DoodleAccentProps extends HTMLAttributes<HTMLSpanElement> {
  type: DoodleType
  color?: string
  strokeWidth?: number
}

/**
 * Rabiscos vetoriais (setas, círculos, grifos, coroa) no estilo
 * "caneta sobre papel" da referência. Puramente decorativo.
 */
export function DoodleAccent({ type, className, color = "currentColor", strokeWidth = 4, ...rest }: DoodleAccentProps) {
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  return (
    <span className={cn("pointer-events-none inline-block select-none", className)} aria-hidden="true" {...rest}>
      {type === "arrow" && (
        <svg viewBox="0 0 120 70" className="h-full w-full">
          <path {...common} d="M8 14c34 6 64 14 92 38" />
          <path {...common} d="M82 36l20 18M104 28l-2 26" />
        </svg>
      )}
      {type === "circle" && (
        <svg viewBox="0 0 160 110" className="h-full w-full">
          <path
            {...common}
            d="M82 10C40 6 14 28 12 56c-2 30 34 46 78 44 38-2 60-22 56-48C142 28 116 12 78 12"
          />
        </svg>
      )}
      {type === "scribble" && (
        <svg viewBox="0 0 120 40" className="h-full w-full">
          <path {...common} d="M6 26c12-18 20 12 32-4s18 16 30 0 18 14 30-2" />
        </svg>
      )}
      {type === "underline" && (
        <svg viewBox="0 0 240 24" className="h-full w-full">
          <path {...common} d="M6 14c46-10 150-12 228 2" />
          <path {...common} strokeWidth={strokeWidth * 0.7} d="M14 20c44-6 140-8 214 0" opacity={0.6} />
        </svg>
      )}
      {type === "spark" && (
        <svg viewBox="0 0 60 60" className="h-full w-full">
          <path {...common} d="M30 6v16M30 38v16M6 30h16M38 30h16M14 14l11 11M35 35l11 11M46 14L35 25M25 35L14 46" />
        </svg>
      )}
      {type === "crown" && (
        <svg viewBox="0 0 120 90" className="h-full w-full">
          <path {...common} d="M14 70h92M16 70L8 28l28 22L60 14l24 36 28-22-8 42" />
        </svg>
      )}
      {type === "cross" && (
        <svg viewBox="0 0 60 60" className="h-full w-full">
          <path {...common} d="M12 12l36 36M48 12L12 48" />
        </svg>
      )}
    </span>
  )
}
