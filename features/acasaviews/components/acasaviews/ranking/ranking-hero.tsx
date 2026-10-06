import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AnimatedNumber } from "./animated-number"

interface RankingHeroProps {
  title1: string
  title2: string
  lead: ReactNode
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
  liveLabel: string
  bigStat: { label: string; value: number; compact?: boolean; suffix?: string }
  sideStat: { label: string; value: number; compact?: boolean; suffix?: string }
}

/**
 * Herói das páginas internas de ranking, na composição da página de
 * Rankings: manchete larga (1ª linha branca gasta, 2ª em rosa com brilho),
 * texto em letra de máquina e o placar num cartão de canto cortado.
 *
 * O tamanho da 2ª linha sai do COMPRIMENTO dela: "PARTICIPANTES" tem 13
 * letras na fonte expandida e, no tamanho de "GERAL", estouraria o celular.
 */
export function RankingHero({ title1, title2, lead, liveLabel, bigStat, sideStat }: RankingHeroProps) {
  const long = title2.length > 9
  const big = long ? "text-[8.4vw] lg:text-[clamp(3rem,5.4vw,5.6rem)]" : "text-[12vw] lg:text-[clamp(4.2rem,7.4vw,7.8rem)]"

  return (
    <section className="relative mx-auto max-w-[1600px] px-4 pb-10 pt-8 md:px-8 md:pb-14 md:pt-12">
      <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3" data-rv>
            <span className="rv-glow-box inline-flex items-center gap-2 bg-[var(--rv-pink)] px-3 py-1.5">
              <span className="rv-live-dot" aria-hidden style={{ background: "var(--rv-white)" }} />
              <span className="rv-type text-[11px] font-bold uppercase tracking-[0.18em]">{liveLabel}</span>
            </span>
            <span className="rv-type text-[11px] uppercase tracking-[0.16em] text-[var(--rv-muted)]">placar em tempo real</span>
          </div>

          <h1>
            <span data-rv className="rv-wide rv-grunge block whitespace-nowrap text-[6.6vw] leading-[0.95] lg:text-[clamp(2.2rem,3.4vw,3.6rem)]">
              {title1}
            </span>
            <span
              data-rv
              style={{ ["--rv-delay" as string]: "90ms" }}
              className={cn("rv-wide rv-glow-text block whitespace-nowrap leading-[0.88] text-[var(--rv-pink)]", big)}
            >
              {title2}
            </span>
          </h1>

          <div
            className="rv-type mt-6 max-w-2xl text-[13px] uppercase leading-relaxed tracking-[0.05em] md:text-[14px] [&_strong]:bg-[var(--rv-pink)] [&_strong]:px-1 [&_strong]:font-bold"
            data-rv
            style={{ ["--rv-delay" as string]: "160ms" }}
          >
            {lead}
          </div>
        </div>

        {/* placar */}
        <div data-rv style={{ ["--rv-delay" as string]: "220ms" }}>
          <div className="rv-frame rv-frame-pink [--c:24px]">
            <div className="rv-frame-in relative p-6 md:p-7">
              <span aria-hidden className="rv-glitch-stripes absolute -right-6 top-0 h-full w-32 opacity-[0.14]" />
              <div className="relative flex items-center justify-between">
                <span className="rv-type text-[11px] uppercase tracking-[0.2em] text-[var(--rv-muted)]">Placar geral</span>
                <span className="rv-type flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">
                  <span className="rv-live-dot" aria-hidden /> live
                </span>
              </div>
              <div className="rv-wide rv-glow-text relative mt-4 text-6xl leading-none text-[var(--rv-pink)] md:text-7xl">
                <AnimatedNumber value={bigStat.value} compact={bigStat.compact} suffix={bigStat.suffix} />
              </div>
              <p className="rv-type relative mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--rv-muted)]">{bigStat.label}</p>
              <div className="relative mt-6 flex items-end justify-between border-t border-[var(--rv-line-strong)] pt-4">
                <div>
                  <div className="rv-wide text-3xl leading-none">
                    <AnimatedNumber value={sideStat.value} compact={sideStat.compact} suffix={sideStat.suffix} />
                  </div>
                  <p className="rv-type mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--rv-faint)]">{sideStat.label}</p>
                </div>
                <span className="rv-type text-[11px] uppercase tracking-[0.14em] text-[var(--rv-pink-ink)]">+24h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
