import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"

interface RankingStatChipProps {
  icon?: LucideIcon
  label: string
  value: number
  compact?: boolean
  accent?: Accent
  animate?: boolean
  className?: string
}

const accentText: Record<Accent, string> = {
  magenta: "text-[var(--magenta)]",
  cyan: "text-[var(--cyan)]",
  gold: "text-[var(--gold)]",
  ink: "text-[var(--ink)]",
}

/** Chip compacto de métrica (views, likes, comentários...). */
export function RankingStatChip({
  icon: Icon,
  label,
  value,
  compact = false,
  accent = "ink",
  animate = true,
  className,
}: RankingStatChipProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Icon && <Icon className={cn("h-4 w-4 shrink-0", accentText[accent])} strokeWidth={2.6} />}
      <div className="leading-none">
        <div className={cn("casa-body text-base font-extrabold tabular-nums", accentText[accent])}>
          {animate ? (
            <AnimatedNumber value={value} compact={compact} />
          ) : (
            <span>{value.toLocaleString("pt-BR")}</span>
          )}
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">
          {label}
        </div>
      </div>
    </div>
  )
}
