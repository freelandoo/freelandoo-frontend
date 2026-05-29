"use client"

/**
 * FeatureCarousel — 3ª seção: carrossel de BANNERS (18:7), sem tipografia.
 * Cada slide é o banner inteiro (object-cover num box 18:7, igual à arte).
 * Botões de voltar/avançar ficam um de cada lado do card. Dots embaixo.
 */
import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CAROUSEL_SLIDES } from "./tokens"
import { Section, YellowHighlight, DoodleArrow } from "./primitives"

export function FeatureCarousel() {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center" })
  const [selected, setSelected] = useState(0)

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
    <Section id="ganhar-mais" className="overflow-x-clip">
      {/* Título da seção (fora do card) */}
      <div className="relative mx-auto mb-10 max-w-2xl text-center">
        <p className="fl-marker mb-1 text-2xl font-bold text-[#F2B705]">é rápido e fácil</p>
        <h2 className="fl-display text-4xl text-[#F5F1E8] sm:text-5xl">
          Tudo que você precisa para <YellowHighlight mark>ganhar mais.</YellowHighlight>
        </h2>
        <DoodleArrow dir="down" className="absolute -right-2 -top-4 hidden h-9 w-16 text-[#F2B705] lg:block" />
      </div>

      {/* Card de slides — full-bleed no mobile (cancela o padding da Section),
          setas sobrepostas e transparentes por cima do carrossel. */}
      <div className="relative -mx-5 sm:mx-0">
        <div className="overflow-hidden sm:rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {CAROUSEL_SLIDES.map((s) => (
              <div key={s.n} className="min-w-0 flex-[0_0_100%]">
                <Link
                  href={s.href}
                  aria-label={s.alt}
                  className="relative block aspect-[16/10] w-full overflow-hidden border-y-2 border-[#0B0B0D] bg-[#1D1810] sm:aspect-[18/7] sm:rounded-2xl sm:border-2 sm:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.85)]"
                >
                  <Image
                    src={s.img}
                    alt={s.alt}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 92vw, 1000px"
                    className="object-cover object-left"
                    priority={s.n === 1}
                  />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button" onClick={prev} aria-label="Banner anterior"
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-[#F5F1E8] backdrop-blur-sm transition hover:bg-black/50 hover:text-[#F2B705] sm:left-4 sm:h-12 sm:w-12"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <button
          type="button" onClick={next} aria-label="Próximo banner"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-[#F5F1E8] backdrop-blur-sm transition hover:bg-black/50 hover:text-[#F2B705] sm:right-4 sm:h-12 sm:w-12"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {CAROUSEL_SLIDES.map((s, i) => (
          <button
            key={s.n} type="button" onClick={() => goTo(i)} aria-label={`Ir para o banner ${i + 1}`}
            aria-current={i === selected}
            className={`h-2 rounded-full transition-all ${i === selected ? "w-6 bg-[#F2B705]" : "w-2 bg-[#F5F1E8]/25 hover:bg-[#F5F1E8]/50"}`}
          />
        ))}
      </div>
    </Section>
  )
}
