import type { ReactNode } from "react"
import { Crown, Globe } from "lucide-react"
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
  /** faixa rosa em seta abaixo da manchete ("a audiência também joga") */
  kicker?: string
  /** rótulo do alto da caixa grande (ex.: "pontos em disputa") */
  boxLabel?: string
}

/**
 * Herói das páginas internas de ranking, na composição da referência
 * (2026-10-05): bloco técnico à esquerda, manchete larga no meio (1ª linha
 * branca gasta, 2ª gigante em rosa) com a faixa em seta, e à direita as duas
 * caixas de número empilhadas.
 *
 * ⚠️ A referência mostra "votos na última hora" — esse número NÃO existe (o
 * placar não guarda contagem por hora). As caixas mostram os números que a
 * página tem de verdade, no mesmo desenho.
 *
 * O tamanho da 2ª linha sai do COMPRIMENTO dela: "PARTICIPANTES" tem 13
 * letras na fonte expandida e, no tamanho de "GERAL", estouraria o celular.
 */
export function RankingHero({ title1, title2, lead, liveLabel, bigStat, sideStat, kicker, boxLabel }: RankingHeroProps) {
  const long = title2.length > 9
  const big = long ? "text-[8.4vw] lg:text-[clamp(3rem,4.8vw,5.4rem)]" : "text-[12vw] lg:text-[clamp(4.2rem,7vw,7.6rem)]"
  const year = new Date().getFullYear()

  return (
    <section className="relative overflow-hidden">
      {/* faixas de luz diagonais e "+" técnicos — pintados uma vez */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <span className="rv-streak -left-40 top-10 h-24 w-[520px]" />
        <span className="rv-streak rv-streak-pink -left-16 top-[260px] h-3 w-[360px]" />
        <span className="rv-streak -right-44 top-4 h-20 w-[520px]" />
        <span className="rv-streak rv-streak-pink -right-20 top-[230px] h-2 w-[320px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden md:block">
        <span className="rv-plus left-8 top-6" />
        <span className="rv-plus left-[52%] top-[70%]" />
        <span className="rv-plus right-[24%] top-[12%]" />
      </div>

      <div className="relative z-[2] mx-auto max-w-[1600px] px-4 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
        <div className="grid items-start gap-7 lg:grid-cols-[140px_minmax(0,1fr)_280px] lg:gap-8">
          {/* bloco técnico */}
          <div className="hidden lg:block lg:pt-3" data-rv="left">
            <p className="rv-type text-[12px] uppercase leading-[1.5] tracking-[0.16em]">
              Reality
              <br />
              social
              <br />
              em tempo
              <br />
              real.
            </p>
            <span aria-hidden className="rv-barcode mt-3 block h-9 w-[90px]" />
            <p className="rv-type mt-1 text-[8px] tracking-[0.3em] text-[var(--rv-faint)]">0 7 3 4 8 9 2 1 1 4</p>
            <p className="rv-type mt-2 flex items-center gap-3 text-[12px] tracking-[0.12em]">
              {year} <span className="text-[var(--rv-pink)]">›</span>
              <span className="text-[var(--rv-pink)]">✦</span>
            </p>
          </div>

          {/* manchete */}
          <div className="relative min-w-0">
            <Crown
              aria-hidden
              className="absolute -left-4 -top-3 hidden h-6 w-6 -rotate-12 fill-[var(--rv-pink)] text-[var(--rv-pink)] lg:block"
            />
            <h1>
              <span
                data-rv="mask"
                className="rv-wide rv-grunge block whitespace-nowrap text-[7.4vw] leading-[0.9] lg:text-[clamp(2.6rem,4.2vw,4.6rem)]"
              >
                {title1}
              </span>
              <span
                data-rv="mask"
                style={{ ["--rv-delay" as string]: "90ms" }}
                className={cn("rv-wide rv-glow-text block whitespace-nowrap leading-[0.86] text-[var(--rv-pink)]", big)}
              >
                {title2}
              </span>
            </h1>

            <div className="mt-4 flex items-center gap-1" data-rv style={{ ["--rv-delay" as string]: "140ms" }}>
              <p className="rv-arrowbar rv-type flex items-center gap-2 bg-[var(--rv-pink)] py-1.5 pl-3 pr-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--rv-bg)] md:text-[13px]">
                <span className="rv-live-dot" aria-hidden style={{ background: "var(--rv-bg)" }} />
                {kicker || "placar em tempo real"}
              </p>
              <span aria-hidden className="rv-type text-xl font-bold text-[var(--rv-pink)]">»</span>
            </div>

            <div
              className="rv-type mt-4 max-w-[52ch] text-[12px] uppercase leading-relaxed tracking-[0.05em] text-[var(--rv-muted)] md:text-[13px] [&_strong]:bg-[var(--rv-pink)] [&_strong]:px-1 [&_strong]:font-bold [&_strong]:text-[var(--rv-white)]"
              data-rv
              style={{ ["--rv-delay" as string]: "200ms" }}
            >
              {lead}
            </div>
          </div>

          {/* as duas caixas de número */}
          <div className="grid grid-cols-[1.4fr_1fr] gap-3 lg:grid-cols-1" data-rv="right" style={{ ["--rv-delay" as string]: "240ms" }}>
            <div className="rv-frame [--c:18px]">
              <div className="rv-frame-in relative p-4 md:p-5">
                <span aria-hidden className="rv-glitch-stripes absolute -right-6 top-0 h-full w-24 opacity-[0.12]" />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="rv-type text-[9px] uppercase tracking-[0.18em] text-[var(--rv-muted)] md:text-[10px]">
                    {boxLabel || "placar geral"}
                  </span>
                  <span className="rv-type flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--rv-pink-ink)]">
                    <span className="rv-live-dot" aria-hidden /> {liveLabel}
                  </span>
                </div>
                <div className="rv-wide relative mt-2 text-5xl leading-none md:text-6xl">
                  <AnimatedNumber value={bigStat.value} compact={bigStat.compact} suffix={bigStat.suffix} />
                </div>
                <p className="rv-type relative mt-1.5 text-[9px] uppercase tracking-[0.18em] text-[var(--rv-pink-ink)] md:text-[10px]">
                  {bigStat.label}
                </p>
              </div>
            </div>

            <div className="rv-frame [--c:14px]">
              <div className="rv-frame-in flex h-full items-center gap-3 p-4 md:p-5">
                <span className="rv-wide text-4xl leading-none text-[var(--rv-pink)] md:text-5xl">
                  <AnimatedNumber value={sideStat.value} compact={sideStat.compact} suffix={sideStat.suffix} />
                </span>
                <span className="rv-type text-[9px] uppercase leading-[1.5] tracking-[0.14em] md:text-[10px]">{sideStat.label}</span>
                <Globe aria-hidden className="ml-auto hidden h-5 w-5 shrink-0 text-[var(--rv-pink)] lg:block" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
