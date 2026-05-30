import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent, Trend } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"

export interface RankingCardStat {
  label: string
  value: number
  compact?: boolean
}

interface RankingCardProps {
  rank: number
  name: string
  handle: string
  avatar: string
  score: number
  scoreLabel: string
  trend: Trend
  trendValue: number
  tag: string
  tagAccent: Accent
  stats: RankingCardStat[]
  accent: "cyan" | "magenta"
}

const accentBg: Record<Accent, string> = {
  magenta: "bg-[var(--magenta)] text-white",
  cyan: "bg-[var(--cyan)] text-[var(--ink)]",
  gold: "bg-[var(--gold)] text-[var(--ink)]",
  ink: "bg-[var(--ink)] text-white",
}

function TrendBadge({ trend, value }: { trend: Trend; value: number }) {
  if (trend === "same") {
    return (
      <span className="inline-flex items-center gap-1 casa-body text-[11px] font-bold text-[var(--ink-soft)]/60">
        <Minus className="h-3.5 w-3.5" strokeWidth={3} /> =
      </span>
    )
  }
  const up = trend === "up"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 casa-body text-[11px] font-extrabold tabular-nums",
        up ? "text-[var(--cyan)]" : "text-[var(--magenta)]",
      )}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={3} /> : <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={3} />}
      {value}
    </span>
  )
}

export function RankingCard({
  rank,
  name,
  handle,
  avatar,
  score,
  scoreLabel,
  trend,
  trendValue,
  tag,
  tagAccent,
  stats,
  accent,
}: RankingCardProps) {
  const accentVar = accent === "cyan" ? "var(--cyan)" : "var(--magenta)"
  return (
    <div
      data-rank-card
      className={cn(
        "group relative flex items-center gap-3 border-2 border-[var(--ink)] bg-white px-3 py-3 md:gap-5 md:px-5 md:py-4",
        "transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg]",
        "shadow-[5px_5px_0_0_var(--ink)] hover:shadow-[8px_8px_0_0_var(--ink)]",
      )}
    >
      {/* Posição */}
      <div className="flex w-10 shrink-0 justify-center md:w-14">
        <span className="casa-display text-3xl text-[var(--ink)] md:text-5xl">{rank}</span>
      </div>

      {/* Avatar */}
      <div
        className="relative shrink-0 rotate-[-2deg] overflow-hidden border-2 border-[var(--ink)]"
        style={{ outline: `2px solid ${accentVar}`, outlineOffset: "1px" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar || "/acasaviews/placeholder-user.jpg"} alt={name} className="h-12 w-12 object-cover md:h-16 md:w-16" />
      </div>

      {/* Nome + tag */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="casa-display truncate text-xl leading-none text-[var(--ink)] md:text-2xl">{name}</h4>
          <span
            className={cn(
              "hidden -rotate-1 px-1.5 py-0.5 casa-body text-[8px] font-extrabold uppercase tracking-[0.12em] sm:inline-block",
              accentBg[tagAccent],
            )}
          >
            {tag}
          </span>
        </div>
        <p className="truncate casa-body text-[11px] font-semibold text-[var(--ink-soft)]/55">{handle}</p>

        {/* Stats secundárias */}
        <div className="mt-1.5 hidden items-center gap-4 md:flex">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1">
              <span className="casa-body text-xs font-extrabold tabular-nums text-[var(--ink)]">
                <AnimatedNumber value={s.value} compact={s.compact} />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/45">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Score + variação */}
      <div className="flex shrink-0 flex-col items-end">
        <div className="casa-display text-2xl leading-none md:text-4xl" style={{ color: accentVar }}>
          <AnimatedNumber value={score} compact={score >= 100000} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/45">
            {scoreLabel}
          </span>
          <TrendBadge trend={trend} value={trendValue} />
        </div>
      </div>
    </div>
  )
}
