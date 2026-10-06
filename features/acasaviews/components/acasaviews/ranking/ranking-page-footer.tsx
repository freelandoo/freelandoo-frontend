import Link from "next/link"
import { ArrowRight, Crown } from "lucide-react"

interface RankingPageFooterProps {
  tagline: string
  ctaLabel: string
  ctaHref: string
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
  /** selo manuscrito no canto da faixa */
  script?: string
}

/**
 * Fecho das páginas de ranking, na faixa da referência: manchete larga gasta
 * com a ÚLTIMA palavra em rosa ("O 9º JOGADOR / SUBIU."), coroa, selo
 * manuscrito e a chamada.
 *
 * A fileira "Comente / Compartilhe / Salve" que existia aqui SAIU: eram
 * ícones que não faziam nada ao toque — botão que parece ação e não age é
 * pior que nenhum.
 */
export function RankingPageFooter({ tagline, ctaLabel, ctaHref, script }: RankingPageFooterProps) {
  const words = tagline.trim().split(/\s+/)
  const last = words.pop() || ""
  const head = words.join(" ")

  return (
    <footer className="relative mt-6 overflow-hidden border-t border-[var(--rv-line)]">
      <span aria-hidden className="rv-streak -left-40 top-10 h-20 w-[480px]" />
      <span aria-hidden className="rv-streak rv-streak-pink -right-20 bottom-16 h-3 w-[360px]" />
      <div className="relative mx-auto max-w-[1600px] px-4 py-10 md:px-8 md:py-14">
        <div className="rv-frame rv-frame-pink [--c:28px]" data-rv>
          <div className="rv-frame-in rv-grid relative grid items-center gap-6 px-5 py-7 md:grid-cols-[auto_minmax(0,1fr)_auto] md:px-10 md:py-9">
            <span aria-hidden className="rv-glitch-stripes absolute -right-10 top-0 h-full w-56 opacity-[0.16]" />
            <Crown aria-hidden className="relative h-10 w-10 -rotate-12 fill-[var(--rv-pink)] text-[var(--rv-pink)] md:h-14 md:w-14" />
            <h2 className="rv-wide relative min-w-0 leading-[0.86]">
              {head && <span className="rv-grunge block text-[8.4vw] md:text-[clamp(2.2rem,4.4vw,4.4rem)]">{head}</span>}
              <span className="rv-glow-text block text-[13vw] text-[var(--rv-pink)] md:text-[clamp(3.4rem,7vw,7rem)]">{last}</span>
            </h2>
            <div className="relative flex flex-col items-start gap-4 md:items-end">
              {script && <p className="rv-script -rotate-6 text-3xl leading-none text-[var(--rv-white)]">{script}</p>}
              <Link
                href={ctaHref}
                className="rv-glow-box rv-type inline-flex items-center gap-3 bg-[var(--rv-pink)] px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--rv-white)] transition-transform hover:-translate-y-1"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <p className="rv-type mt-8 text-center text-[11px] uppercase tracking-[0.24em] text-[var(--rv-muted)]">
          siga <span className="text-[var(--rv-pink-ink)]">@casaviews_</span> e entre no jogo
        </p>
      </div>
    </footer>
  )
}
