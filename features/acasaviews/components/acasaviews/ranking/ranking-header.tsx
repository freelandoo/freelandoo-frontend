import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { pad2 } from "@/features/acasaviews/components/reality/format"

interface RankingHeaderProps {
  /** Ex.: ["RANKING", "AUDIÊNCIA", "JOGO"] */
  category: string[]
  pageCurrent: number
  pageTotal: number
  backHref?: string
  switchHref: string
  switchLabel: string
}

/**
 * Faixa de topo das páginas internas de ranking, na pele escura: Voltar
 * quadrado, trilha da categoria em letra de máquina e o atalho para o outro
 * placar. O logo NÃO entra aqui — o cabeçalho global da seção já o carrega.
 */
export function RankingHeader({
  category,
  pageCurrent,
  pageTotal,
  backHref = "/acasaviews/rankings",
  switchHref,
  switchLabel,
}: RankingHeaderProps) {
  return (
    <div className="relative z-20 mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 pt-6 md:px-8 md:pt-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          aria-label="Voltar para os rankings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--rv-white)] text-[var(--rv-white)] transition-colors hover:border-[var(--rv-pink)] hover:bg-[var(--rv-pink)]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </Link>
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-[var(--rv-pink)] shadow-[0_0_10px_rgba(255,0,122,0.9)]" />
        <p className="rv-type truncate text-[11px] uppercase tracking-[0.2em] md:text-[12px]">
          {category.map((c, i) => (
            <span key={c}>
              <span className={i === category.length - 1 ? "text-[var(--rv-pink-ink)]" : ""}>{c}</span>
              {i < category.length - 1 && <span className="px-2 text-[var(--rv-faint)]">/</span>}
            </span>
          ))}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Link
          href={switchHref}
          className="rv-type hidden items-center gap-2 border-2 border-[var(--rv-white)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:border-[var(--rv-pink)] hover:text-[var(--rv-pink-ink)] sm:inline-flex"
        >
          {switchLabel.replace(/\s*→\s*$/, "")}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="rv-type text-[11px] text-[var(--rv-faint)]" aria-label={`página ${pageCurrent} de ${pageTotal}`}>
          {pad2(pageCurrent)}/{pad2(pageTotal)}
        </span>
      </div>
    </div>
  )
}
