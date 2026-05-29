"use client"

/**
 * FeatureCarousel — "Tudo que você precisa para ganhar mais."
 * Carrossel horizontal (embla) com setas + dots, igual ao mockup: painel
 * branco com número NN/10, título, descrição, CTA, foto e mini-painel de
 * métricas. Acessível (botões com aria-label, dots navegáveis).
 */
import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, TrendingUp, ArrowRight } from "lucide-react"
import { CAROUSEL_SLIDES } from "./tokens"
import { Section, YellowHighlight, PhotoFrame, DoodleArrow, GoldButton, StrokeNumber, WashiTape } from "./primitives"

export function FeatureCarousel() {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center", containScroll: "trimSnaps" })
  const [selected, setSelected] = useState(0)
  const total = CAROUSEL_SLIDES.length

  const onSelect = useCallback(() => embla && setSelected(embla.selectedScrollSnap()), [embla])
  useEffect(() => {
    if (!embla) return
    onSelect()
    embla.on("select", onSelect).on("reInit", onSelect)
    return () => {
      embla.off("select", onSelect).off("reInit", onSelect)
    }
  }, [embla, onSelect])

  const prev = useCallback(() => embla?.scrollPrev(), [embla])
  const next = useCallback(() => embla?.scrollNext(), [embla])
  const goTo = useCallback((i: number) => embla?.scrollTo(i), [embla])

  return (
    <Section id="ganhar-mais" className="overflow-hidden">
      <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.4fr]">
        {/* Coluna do título (dark) */}
        <div data-reveal className="relative">
          <h2 className="fl-display text-4xl text-[#F5F1E8] sm:text-5xl">
            Tudo que você precisa para <YellowHighlight mark>ganhar mais.</YellowHighlight>
          </h2>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-[#C9C2B6]">
            Feito para o lado de criação e vendas da Freelandoo: rápido e fácil.
          </p>
          <DoodleArrow dir="down-right" className="mt-6 hidden h-10 w-24 text-[#F2B705] lg:block" />
        </div>

        {/* Carrossel */}
        <div className="relative">
          <button
            type="button" onClick={prev} aria-label="Slide anterior"
            className="absolute -left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F5F1E8]/25 bg-[#15120E]/70 text-[#F5F1E8] backdrop-blur transition hover:border-[#F2B705] hover:text-[#F2B705] sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button" onClick={next} aria-label="Próximo slide"
            className="absolute -right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F5F1E8]/25 bg-[#15120E]/70 text-[#F5F1E8] backdrop-blur transition hover:border-[#F2B705] hover:text-[#F2B705] sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
            <div className="flex">
              {CAROUSEL_SLIDES.map((s) => (
                <div key={s.n} className="min-w-0 flex-[0_0_100%] px-1.5">
                  <div className="fl-card flex flex-col gap-6 rounded-3xl p-6 sm:p-8 md:flex-row md:items-center">
                    {/* Texto */}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <StrokeNumber tone="ink" className="text-6xl">{String(s.n).padStart(2, "0")}</StrokeNumber>
                        <span className="font-mono text-sm text-[#9a8f7a]">/ {String(total).padStart(2, "0")}</span>
                      </div>
                      <h3 className="fl-display mt-3 text-3xl text-[#0B0B0D] sm:text-4xl">{s.title}</h3>
                      <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#6B6457]">{s.desc}</p>
                      <GoldButton href={s.href} className="mt-5 px-5 py-2.5 text-xs uppercase tracking-wider">
                        {s.cta} <ArrowRight className="h-4 w-4" />
                      </GoldButton>
                    </div>
                    {/* Foto + métricas */}
                    <div className="relative w-full md:flex-1">
                      <PhotoFrame src={s.photo} alt={s.title} className="h-44 w-full rounded-2xl sm:h-56 md:h-auto md:aspect-[4/3]" />
                      <div className="absolute -bottom-3 -right-1 hidden w-40 rounded-xl border-2 border-[#0B0B0D] bg-white p-3 shadow-[4px_4px_0_0_#0B0B0D] sm:block">
                        <WashiTape className="-top-3 right-3" rotate={7} />
                        <div className="text-[10px] font-bold uppercase tracking-wide text-[#9a8f7a]">Métricas</div>
                        <ul className="mt-1.5 space-y-1">
                          {s.metrics.map((m) => (
                            <li key={m} className="flex items-center gap-1.5 text-[11px] text-[#14110B]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F2B705]" /> {m}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 border-t border-black/5 pt-2">
                          <div className="text-[10px] text-[#9a8f7a]">Faturamento total</div>
                          <div className="flex items-center gap-1 text-base font-black text-[#14110B]">
                            1.234 <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {CAROUSEL_SLIDES.map((s, i) => (
              <button
                key={s.n} type="button" onClick={() => goTo(i)} aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === selected}
                className={`h-2 rounded-full transition-all ${i === selected ? "w-6 bg-[#F2B705]" : "w-2 bg-[#F5F1E8]/25 hover:bg-[#F5F1E8]/50"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
