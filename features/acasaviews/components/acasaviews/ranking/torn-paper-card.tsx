import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TornPaperCardProps {
  children: ReactNode
  className?: string
  edge?: "bottom" | "both"
  tone?: "paper" | "ink" | "magenta" | "cyan"
}

const toneMap: Record<NonNullable<TornPaperCardProps["tone"]>, string> = {
  paper: "bg-white text-[var(--ink)]",
  ink: "bg-[var(--ink)] text-white",
  magenta: "bg-[var(--magenta)] text-white",
  cyan: "bg-[var(--cyan)] text-[var(--ink)]",
}

/** Card com borda rasgada (clip-path) + sombra de recorte de revista. */
export function TornPaperCard({ children, className, edge = "bottom", tone = "paper" }: TornPaperCardProps) {
  return (
    <div className={cn("casa-cut relative", edge === "both" ? "casa-torn-tb" : "casa-torn-b", toneMap[tone], className)}>
      {children}
    </div>
  )
}
