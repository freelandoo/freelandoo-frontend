import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageCounterBadge } from "./page-counter-badge"

interface RankingHeaderProps {
  /** Ex.: ["RANKING", "AUDIÊNCIA", "JOGO"] */
  category: string[]
  pageCurrent: number
  pageTotal: number
  backHref?: string
  switchHref: string
  switchLabel: string
}

export function RankingHeader({
  category,
  pageCurrent,
  pageTotal,
  backHref = "/acasaviews/investidores",
  switchHref,
  switchLabel,
}: RankingHeaderProps) {
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-10 md:py-7">
      {/* Logo */}
      <Link href={backHref} className="group flex items-center gap-2">
        <span className="relative inline-flex items-center bg-[var(--ink)] px-3 py-1.5 text-white">
          <span className="casa-body text-lg font-black tracking-tight md:text-xl">
            casaviews<span className="text-[var(--magenta)]">_</span>
          </span>
          <span className="absolute -bottom-1 left-1 h-1 w-10 -rotate-1 bg-[var(--magenta)]" />
        </span>
      </Link>

      {/* Categoria editorial (esconde no mobile) */}
      <div className="hidden items-center gap-2 md:flex">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--magenta)]" />
        {category.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            <span className="casa-body text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--ink)]">
              {c}
            </span>
            {i < category.length - 1 && <span className="text-[var(--ink-soft)]/40">•</span>}
          </span>
        ))}
      </div>

      {/* Navegação + badge */}
      <div className="flex items-center gap-3 md:gap-4">
        <Link
          href={backHref}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-white",
            "transition-transform hover:-translate-y-0.5 hover:bg-[var(--ink)] hover:text-white md:h-10 md:w-10",
          )}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={3} />
        </Link>
        <Link
          href={switchHref}
          className="hidden border-2 border-[var(--ink)] bg-white px-3 py-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors hover:bg-[var(--cyan)] sm:inline-flex"
        >
          {switchLabel}
        </Link>
        <PageCounterBadge current={pageCurrent} total={pageTotal} />
      </div>
    </header>
  )
}
