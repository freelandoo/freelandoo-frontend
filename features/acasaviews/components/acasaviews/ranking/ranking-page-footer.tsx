import Link from "next/link"
import { ArrowRight, Bookmark, MessageCircle, Send } from "lucide-react"

interface RankingPageFooterProps {
  tagline: string
  ctaLabel: string
  ctaHref: string
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
}

const ACTIONS = [
  { icon: MessageCircle, label: "Comente", sub: "sua opinião" },
  { icon: Send, label: "Compartilhe", sub: "com a galera" },
  { icon: Bookmark, label: "Salve", sub: "pra depois" },
]

/** Fecho das páginas de ranking: ações de post, manchete e a chamada. */
export function RankingPageFooter({ tagline, ctaLabel, ctaHref }: RankingPageFooterProps) {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-[var(--rv-line)]">
      <span aria-hidden className="rv-streak -left-40 top-16 h-20 w-[480px]" />
      <span aria-hidden className="rv-streak rv-streak-pink -right-20 bottom-20 h-3 w-[360px]" />
      <div className="relative mx-auto max-w-[1600px] px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-3 gap-4 border-b border-[var(--rv-line-strong)] pb-8">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <div key={a.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--rv-pink)] md:h-11 md:w-11">
                  <Icon className="h-4 w-4 text-[var(--rv-bg)] md:h-5 md:w-5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 leading-none">
                  <p className="rv-type truncate text-[10px] font-bold uppercase tracking-[0.14em] md:text-[13px]">{a.label}</p>
                  <p className="rv-type mt-1 hidden text-[10px] uppercase tracking-[0.1em] text-[var(--rv-faint)] sm:block md:text-[11px]">
                    {a.sub}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-10 flex flex-col items-center text-center">
          <h2 className="rv-wide rv-grunge text-[8vw] leading-[0.9] md:text-[clamp(2.6rem,5vw,4.6rem)]">{tagline}</h2>
          <Link
            href={ctaHref}
            className="rv-glow-box rv-type mt-8 inline-flex items-center gap-3 bg-[var(--rv-pink)] px-7 py-4 text-[13px] font-bold uppercase tracking-[0.16em] text-[var(--rv-white)] transition-transform hover:-translate-y-1"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="rv-type mt-8 text-[11px] uppercase tracking-[0.24em] text-[var(--rv-muted)]">
            siga <span className="text-[var(--rv-pink-ink)]">@casaviews_</span> e entre no jogo
          </p>
        </div>
      </div>
    </footer>
  )
}
