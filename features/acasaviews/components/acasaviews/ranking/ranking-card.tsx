"use client"

import type { KeyboardEvent } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent, Trend } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"
import { CasaAvatar } from "./casa-avatar"
import { tagClass } from "./tag-style"

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
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
  onSelect?: () => void
  selectLabel?: string
}

function TrendBadge({ trend, value }: { trend: Trend; value: number }) {
  if (trend === "same") {
    return (
      <span className="rv-type inline-flex items-center gap-1 text-[10px] text-[var(--rv-faint)]">
        <Minus className="h-3.5 w-3.5" /> =
      </span>
    )
  }
  const up = trend === "up"
  return (
    <span
      className="rv-type inline-flex items-center gap-0.5 text-[10px] font-bold"
      style={{ color: up ? "var(--rv-up)" : "var(--rv-down)" }}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {value}
    </span>
  )
}

/**
 * Linha do ranking na pele escura: moldura de canto cortado (fica rosa no
 * hover), posição grande em contorno, retrato P&B, pontos em rosa.
 */
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
  onSelect,
  selectLabel,
}: RankingCardProps) {
  const interactive = !!onSelect

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      className={cn(
        "group rv-frame [--c:14px] [--frame:var(--rv-line-strong)] hover:[--frame:var(--rv-pink)]",
        interactive && "cursor-pointer outline-none",
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? selectLabel || name : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      <div className="rv-frame-in flex items-center gap-3 px-3 py-3 transition-colors group-hover:bg-[var(--rv-surface-2)] md:gap-5 md:px-5 md:py-4">
        <span className="rv-wide rv-outline w-10 shrink-0 text-center text-2xl leading-none md:w-16 md:text-5xl">
          {String(rank).padStart(2, "0")}
        </span>

        <div className="relative shrink-0 overflow-hidden border-2 border-[var(--rv-white)] transition-colors group-hover:border-[var(--rv-pink)]">
          <CasaAvatar name={name} src={avatar} className="rv-photo h-12 w-12 md:h-16 md:w-16" textClassName="text-xl md:text-2xl" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="rv-display truncate text-xl leading-none md:text-2xl">{name}</h4>
            <span className={cn("rv-type hidden px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] sm:inline-block", tagClass(tagAccent))}>
              {tag}
            </span>
          </div>
          <p className="rv-type truncate text-[10px] text-[var(--rv-faint)]">{handle}</p>
          {stats.length > 0 && (
            <div className="mt-1.5 hidden items-center gap-4 md:flex">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline gap-1">
                  <span className="rv-type text-xs font-bold">
                    <AnimatedNumber value={s.value} compact={s.compact} />
                  </span>
                  <span className="rv-type text-[9px] uppercase tracking-[0.1em] text-[var(--rv-faint)]">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <div className="rv-wide text-2xl leading-none text-[var(--rv-pink)] md:text-4xl">
            <AnimatedNumber value={score} compact={score >= 100000} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rv-type text-[8px] uppercase tracking-[0.14em] text-[var(--rv-faint)]">{scoreLabel}</span>
            <TrendBadge trend={trend} value={trendValue} />
          </div>
        </div>
      </div>
    </div>
  )
}
