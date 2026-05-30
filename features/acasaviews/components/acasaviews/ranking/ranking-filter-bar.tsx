"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface RankingFilterBarProps {
  options: string[]
  accent: "cyan" | "magenta"
  note?: string
}

/** Barra de filtros (período/recorte) — pills com estado ativo. */
export function RankingFilterBar({ options, accent, note }: RankingFilterBarProps) {
  const [active, setActive] = useState(0)
  const activeBg = accent === "cyan" ? "bg-[var(--cyan)] text-[var(--ink)]" : "bg-[var(--magenta)] text-white"

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 md:px-10">
      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "border-2 border-[var(--ink)] px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all",
              i === active ? activeBg : "bg-white text-[var(--ink)] hover:bg-[var(--paper-2)]",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {note && (
        <span className="casa-marker text-xl text-[var(--ink-soft)]/70">{note}</span>
      )}
    </div>
  )
}
