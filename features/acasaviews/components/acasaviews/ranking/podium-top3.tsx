"use client"

import type { KeyboardEvent } from "react"
import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"
import { CasaAvatar } from "./casa-avatar"
import { tagClass } from "./tag-style"

export interface PodiumMeta {
  label: string
  value: number
  compact?: boolean
}

export interface PodiumItem {
  id?: string
  rank: number
  name: string
  handle: string
  avatar: string
  score: number
  scoreLabel: string
  tag: string
  tagAccent: Accent
  meta: PodiumMeta[]
}

interface PodiumTop3Props {
  items: PodiumItem[] // [rank1, rank2, rank3]
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
  onSelect?: (item: PodiumItem) => void
  getSelectLabel?: (item: PodiumItem) => string
}

/**
 * Pódio na pele escura: retrato em moldura de canto cortado (rosa e com
 * brilho no 1º, branca no 2º e 3º), coroa sobre o campeão, placa com nome e
 * pontos e o pedestal com o número. Ordem visual 2 · 1 · 3.
 * A entrada é CSS (`rv-page-in` com atraso): 3º e 2º sobem antes do campeão.
 */
function PodiumColumn({
  item,
  onSelect,
  selectLabel,
}: {
  item: PodiumItem
  onSelect?: (item: PodiumItem) => void
  selectLabel?: string
}) {
  const isFirst = item.rank === 1
  const interactive = !!onSelect
  const order = item.rank === 1 ? "order-2" : item.rank === 2 ? "order-1" : "order-3"
  const width = isFirst ? "w-[38%]" : "w-[31%]"
  const pedestalH = isFirst ? "h-16 md:h-36" : item.rank === 2 ? "h-11 md:h-24" : "h-8 md:h-16"
  const delay = item.rank === 1 ? 360 : item.rank === 2 ? 180 : 0

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(item)
    }
  }

  return (
    <div
      className={cn("rv-page-in group flex min-w-0 flex-col items-center outline-none", interactive && "cursor-pointer", order, width)}
      style={{ animationDelay: `${delay}ms` }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? selectLabel || item.name : undefined}
      onClick={interactive ? () => onSelect?.(item) : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      <div className="relative w-full">
        {isFirst && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-8 -z-10"
              style={{ background: "radial-gradient(closest-side, rgba(255,0,122,0.35), transparent)" }}
            />
            <Crown
              aria-hidden
              className="absolute -top-8 left-1/2 z-20 h-7 w-7 -translate-x-1/2 fill-[var(--rv-pink)] text-[var(--rv-pink)] drop-shadow-[0_0_10px_rgba(255,0,122,0.9)] md:-top-12 md:h-10 md:w-10"
            />
          </>
        )}

        {/* retrato */}
        <div className={cn("rv-frame [--c:14px] md:[--c:22px]", isFirst && "rv-frame-pink")}>
          <div className="rv-frame-in">
            <div className="relative">
              <CasaAvatar
                name={item.name}
                src={item.avatar}
                className={cn("rv-photo w-full", isFirst ? "aspect-[4/5]" : "aspect-square")}
                textClassName={isFirst ? "text-5xl md:text-9xl" : "text-4xl md:text-7xl"}
              />
              <span aria-hidden className="rv-scan absolute inset-0" />
              <span
                className={cn(
                  "rv-wide absolute left-0 top-0 z-[3] px-1.5 py-0.5 text-lg leading-none md:px-3 md:py-1 md:text-3xl",
                  isFirst ? "bg-[var(--rv-pink)] text-[var(--rv-white)]" : "bg-[var(--rv-bg)] text-[var(--rv-white)]",
                )}
              >
                {String(item.rank).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        {/* placa */}
        <div className="mt-2 border border-[var(--rv-line-strong)] bg-[var(--rv-surface)] px-1.5 py-2 text-center md:mt-3 md:p-3">
          <span className={cn("rv-type inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] md:text-[9px]", tagClass(item.tagAccent))}>
            {item.tag}
          </span>
          <h3 className={cn("rv-display mt-1.5 truncate leading-none md:mt-2", isFirst ? "text-base md:text-4xl" : "text-sm md:text-3xl")}>
            {item.name}
          </h3>
          <p className="rv-type truncate text-[8px] text-[var(--rv-faint)] md:text-[10px]">{item.handle}</p>
          <div className={cn("rv-wide mt-1.5 leading-none text-[var(--rv-pink)] md:mt-2", isFirst ? "text-2xl md:text-5xl" : "text-xl md:text-4xl")}>
            <AnimatedNumber value={item.score} compact={item.score >= 100000} />
          </div>
          <p className="rv-type text-[8px] uppercase tracking-[0.16em] text-[var(--rv-faint)] md:text-[10px]">{item.scoreLabel}</p>
          {item.meta.length > 0 && (
            <div className="mt-2 flex items-center justify-center gap-2 border-t border-[var(--rv-line)] pt-2 md:mt-3 md:gap-4">
              {item.meta.slice(0, 3).map((m) => (
                <div key={m.label} className="text-center">
                  <div className="rv-type text-[11px] font-bold">
                    <AnimatedNumber value={m.value} compact={m.compact} />
                  </div>
                  <div className="rv-type text-[7px] uppercase tracking-[0.1em] text-[var(--rv-faint)] md:text-[8px]">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* pedestal */}
      <div className={cn("relative mt-3 flex w-[82%] items-center justify-center md:w-full", pedestalH)}>
        <div
          className={cn("absolute inset-0", isFirst ? "bg-[var(--rv-pink)]" : "bg-[var(--rv-surface-3)]")}
          style={{
            clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)",
            boxShadow: isFirst ? "0 0 40px rgba(255,0,122,0.6)" : undefined,
          }}
        />
        <span className={cn("rv-wide relative z-10 text-3xl md:text-7xl", isFirst ? "text-[var(--rv-white)]" : "rv-outline")}>
          {item.rank}
        </span>
      </div>
    </div>
  )
}

export function PodiumTop3({ items, onSelect, getSelectLabel }: PodiumTop3Props) {
  if (items.length === 0) return null
  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-16 md:px-8 md:pt-20">
      <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6">
        {items.map((item) => (
          <PodiumColumn key={item.rank} item={item} onSelect={onSelect} selectLabel={getSelectLabel?.(item)} />
        ))}
      </div>
    </div>
  )
}
