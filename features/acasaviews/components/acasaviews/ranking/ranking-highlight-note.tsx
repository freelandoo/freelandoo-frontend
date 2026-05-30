import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent } from "@/lib/acasaviews/ranking-data"

interface RankingHighlightNoteProps {
  icon: LucideIcon
  kicker: string
  text: string
  accent?: Accent
  rotate?: number
  className?: string
}

const accentBar: Record<Accent, string> = {
  magenta: "bg-[var(--magenta)]",
  cyan: "bg-[var(--cyan)]",
  gold: "bg-[var(--gold)]",
  ink: "bg-[var(--ink)]",
}
const accentText: Record<Accent, string> = {
  magenta: "text-[var(--magenta)]",
  cyan: "text-[var(--cyan)]",
  gold: "text-[var(--gold)]",
  ink: "text-[var(--ink)]",
}

/** Caixa de insight/curiosidade do ranking — papel com barra de acento. */
export function RankingHighlightNote({
  icon: Icon,
  kicker,
  text,
  accent = "cyan",
  rotate = 0,
  className,
}: RankingHighlightNoteProps) {
  return (
    <div
      className={cn("relative overflow-hidden border-2 border-[var(--ink)] bg-white p-5 casa-cut", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1.5", accentBar[accent])} />
      <Icon className={cn("h-5 w-5", accentText[accent])} strokeWidth={2.6} />
      <p className={cn("mt-3 casa-body text-[10px] font-extrabold uppercase tracking-[0.2em]", accentText[accent])}>
        {kicker}
      </p>
      <p className="mt-1 casa-display text-xl leading-tight text-[var(--ink)] md:text-2xl">{text}</p>
    </div>
  )
}
