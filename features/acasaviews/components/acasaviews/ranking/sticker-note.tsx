import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StickerNoteProps {
  children: ReactNode
  className?: string
  rotate?: number
  tape?: "cyan" | "magenta" | "none"
  variant?: "paper" | "ink"
}

/**
 * Bilhete recortado com fita adesiva e leve rotação — "sticker note".
 * Usa fonte manuscrita (.casa-marker) quando o conteúdo é texto curto.
 */
export function StickerNote({
  children,
  className,
  rotate = -2,
  tape = "cyan",
  variant = "paper",
}: StickerNoteProps) {
  return (
    <div
      className={cn(
        "casa-cut relative px-5 py-4",
        variant === "paper" ? "bg-white text-[var(--ink)]" : "bg-[var(--ink)] text-white",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {tape !== "none" && (
        <span
          className={cn(
            "casa-tape left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rotate-[-3deg]",
            tape === "magenta" && "casa-tape-magenta",
          )}
        />
      )}
      {children}
    </div>
  )
}
