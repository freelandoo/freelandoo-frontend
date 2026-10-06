import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent } from "@/lib/acasaviews/ranking-data"

interface RankingHighlightNoteProps {
  icon: LucideIcon
  kicker: string
  text: string
  /** legado do tema claro: na pele escura todo destaque é rosa */
  accent?: Accent
  /** legado: a pele escura não inclina os cartões */
  rotate?: number
  className?: string
  /** numeração dos destaques (01, 02, 03) */
  index?: number
}

/**
 * Destaque do ranking na composição dos cartões de Rankings: moldura de canto
 * cortado, número no canto, ícone em quadrado rosa e o texto em manchete.
 */
export function RankingHighlightNote({ icon: Icon, kicker, text, className, index }: RankingHighlightNoteProps) {
  return (
    <div className={cn("rv-frame h-full [--c:18px]", className)} data-rv>
      <div className="rv-frame-in relative p-5 md:p-6">
        <span aria-hidden className="rv-glitch-stripes absolute -right-4 bottom-0 h-8 w-28 opacity-25" />
        <div className="relative flex items-start justify-between gap-3">
          {index != null ? (
            <span className="rv-wide text-2xl leading-none">{String(index).padStart(2, "0")}</span>
          ) : (
            <span />
          )}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--rv-pink)]">
            <Icon className="h-5 w-5 text-[var(--rv-bg)]" strokeWidth={2.5} />
          </span>
        </div>
        <p className="rv-type relative mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rv-pink-ink)]">{kicker}</p>
        <p className="rv-display relative mt-1.5 text-2xl leading-[0.95] md:text-[28px]">{text}</p>
      </div>
    </div>
  )
}
