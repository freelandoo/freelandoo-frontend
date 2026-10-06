"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface RankingFilterBarProps {
  options: string[]
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
  note?: string
}

/** Barra de recortes do ranking, nos botões da referência (rosa ativo). */
export function RankingFilterBar({ options, note }: RankingFilterBarProps) {
  const [active, setActive] = useState(0)

  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 md:px-8">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "rv-type border-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
              i === active
                ? "rv-glow-box border-[var(--rv-pink)] bg-[var(--rv-pink)] text-[var(--rv-white)]"
                : "border-[var(--rv-white)] text-[var(--rv-white)] hover:border-[var(--rv-pink)] hover:text-[var(--rv-pink-ink)]",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {note && (
        <span className="rv-type flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--rv-muted)]">
          <span className="rv-live-dot" aria-hidden />
          {note}
        </span>
      )}
    </div>
  )
}
