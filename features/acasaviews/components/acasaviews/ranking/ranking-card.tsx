"use client"

import type { KeyboardEvent } from "react"
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent, Trend } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"
import { CasaAvatar } from "./casa-avatar"
import { statIcon } from "./stat-icon"

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
  /** legado do tema claro — o selo é amarelo em todos os placares */
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
      <span className="rv-type inline-flex items-center text-[9px] text-[var(--rv-faint)]" aria-label="estável">
        <Minus className="h-3 w-3" />
      </span>
    )
  }
  const up = trend === "up"
  return (
    <span
      className="rv-type inline-flex items-center gap-0.5 text-[9px] font-bold"
      style={{ color: up ? "var(--rv-up)" : "var(--rv-down)" }}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {value}
    </span>
  )
}

/**
 * Linha da tabela "O resto do júri" (composição da referência, 2026-10-05):
 * posição grande na célula com filete rosa, retrato, nome com o selo amarelo,
 * os números com ícone em colunas fixas (só no computador), os pontos em rosa
 * e a seta. Acende em rosa no hover. Mesmas props de antes — as três páginas
 * trocaram de visual sem mudar uma linha de dado.
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
        "group rv-frame [--c:10px] [--frame:var(--rv-line)] hover:[--frame:var(--rv-pink)]",
        interactive && "cursor-pointer outline-none focus-visible:[--frame:var(--rv-pink)]",
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? selectLabel || name : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      <div className="rv-frame-in flex items-center gap-2.5 bg-[rgba(10,10,10,0.92)] py-1.5 pr-2.5 transition-colors group-hover:bg-[rgba(255,0,122,0.08)] md:gap-4 md:py-2 md:pr-4">
        <span className="rv-wide flex w-11 shrink-0 items-center justify-center self-stretch border-r-2 border-[var(--rv-pink)] text-xl leading-none md:w-16 md:text-3xl">
          {String(rank).padStart(2, "0")}
        </span>

        <CasaAvatar
          name={name}
          src={avatar}
          className="rv-photo h-10 w-10 shrink-0 border border-[var(--rv-line-strong)] transition-colors group-hover:border-[var(--rv-pink)] md:h-12 md:w-12"
          textClassName="text-lg md:text-xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="rv-wide truncate text-[13px] leading-none md:text-base">{name}</h4>
            <span className="rv-type hidden shrink-0 bg-[var(--rv-yellow)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--rv-bg)] sm:inline-block">
              {tag}
            </span>
          </div>
          <p className="rv-type mt-1 truncate text-[9px] uppercase tracking-[0.1em] text-[var(--rv-faint)]">{handle}</p>
        </div>

        {stats.length > 0 && (
          <div className="hidden shrink-0 items-center lg:flex">
            {stats.slice(0, 4).map((s) => {
              const Icon = statIcon(s.label)
              return (
                <span key={s.label} className="rv-type flex w-[5.5rem] items-center gap-1.5 text-[11px] font-bold" title={s.label}>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--rv-pink-ink)]" aria-hidden />
                  <AnimatedNumber value={s.value} compact={s.compact} />
                  <span className="sr-only">{s.label}</span>
                </span>
              )
            })}
          </div>
        )}

        <div className="flex w-[4.2rem] shrink-0 flex-col items-end md:w-24">
          <span className="rv-wide text-xl leading-none text-[var(--rv-pink)] md:text-3xl">
            <AnimatedNumber value={score} compact={score >= 100000} />
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="rv-type text-[8px] uppercase tracking-[0.14em] text-[var(--rv-faint)]">{scoreLabel}</span>
            <TrendBadge trend={trend} value={trendValue} />
          </span>
        </div>

        <ChevronRight
          aria-hidden
          className="hidden h-4 w-4 shrink-0 text-[var(--rv-faint)] transition-colors group-hover:text-[var(--rv-pink)] sm:block"
        />
      </div>
    </div>
  )
}
