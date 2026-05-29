"use client"

/**
 * HorizontalFeatureDeck — apresentação horizontal das features (GSAP).
 *
 * Desktop + motion permitido:
 *   ScrollTrigger faz o PIN da seção em tela cheia e traduz o track na
 *   horizontal conforme o scroll (scrub). `snap` faz cada gesto de scroll
 *   parar em um slide (efeito "um gesto, um slide", com debounce embutido).
 *   Observer lê wheel/touch/pointer para indicar a direção no contador.
 *   Ao chegar no fim do deck, o pin libera e o scroll normal continua.
 *
 * Mobile / prefers-reduced-motion:
 *   Sem GSAP. O mesmo track vira um carrossel nativo com scroll-snap
 *   horizontal (overflow-x-auto), acessível e leve. Sem scroll-hijack.
 *
 * Mitigação do bug conhecido de ScrollTrigger + troca de fonte: refresh()
 * após `document.fonts.ready` e um timeout curto, com invalidateOnRefresh.
 */
import { useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Observer } from "gsap/Observer"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { DECK_SLIDES, type DeckSlideData } from "./tokens"
import { Badge, HoneycombField, DeckCounter, HiveDoodle } from "./primitives"

export function DeckSlide({ slide, total, active }: { slide: DeckSlideData; total: number; active: boolean }) {
  return (
    <div className="flex h-[100dvh] w-screen shrink-0 snap-center items-center justify-center px-6 sm:px-10 lg:w-screen">
      <div className="mx-auto grid w-full max-w-[1100px] items-center gap-10 md:grid-cols-[auto_1fr]">
        <div
          className="fl-display select-none text-[7rem] font-black leading-none text-[#F2B705] sm:text-[10rem] lg:text-[13rem]"
          aria-hidden
        >
          {String(slide.n).padStart(2, "0")}
        </div>
        <div className={`transition-all duration-500 ${active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-70"}`}>
          <Badge tone="ink">{slide.kicker}</Badge>
          <h3 className="fl-display mt-4 text-4xl font-black text-[#14110B] sm:text-6xl">{slide.title}</h3>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#2A2418]/75">{slide.desc}</p>
          <Link
            href={slide.href}
            className="fl-btn-ink mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
          >
            {slide.cta}
            <ArrowUpRight className="h-4 w-4 text-[#F2B705]" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function HorizontalFeatureDeck() {
  const root = useRef<HTMLElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const total = DECK_SLIDES.length

  useGSAP(
    () => {
      if (typeof window === "undefined" || !track.current || !scroller.current || !root.current) return

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const isDesktop =
        window.matchMedia("(min-width: 1024px)").matches && window.matchMedia("(pointer: fine)").matches

      // Fallback nativo (mobile / reduced-motion): mantém scroll-snap, sem GSAP.
      if (reduce || !isDesktop) return

      gsap.registerPlugin(ScrollTrigger, Observer)
      scroller.current.style.overflow = "hidden" // desativa o scroll nativo do carrossel

      const setActive = (i: number) =>
        setIndex((prev) => (prev === i ? prev : Math.max(0, Math.min(total - 1, i))))

      const tween = gsap.to(track.current, {
        xPercent: -100 * (total - 1),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + (total - 1) * window.innerHeight,
          pin: true,
          anticipatePin: 1,
          scrub: 0.7,
          invalidateOnRefresh: true,
          snap: {
            snapTo: 1 / (total - 1),
            duration: { min: 0.2, max: 0.5 },
            ease: "power2.inOut",
          },
          onUpdate: (self) => setActive(Math.round(self.progress * (total - 1))),
        },
      })

      const st = tween.scrollTrigger

      // Observer: lê o gesto (wheel/touch/pointer) e sincroniza o slide ativo
      // a partir do progresso atual. Sem preventDefault, para não conflitar
      // com o scrub do ScrollTrigger acima (que já controla a navegação).
      const observer = Observer.create({
        target: root.current,
        type: "wheel,touch,pointer",
        tolerance: 8,
        preventDefault: false,
        onChangeY: () => {
          if (st) setActive(Math.round(st.progress * (total - 1)))
        },
      })

      // Mitigação font-shift: recalcula posições quando as fontes terminam.
      const refresh = () => ScrollTrigger.refresh()
      const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
      if (fonts?.ready) fonts.ready.then(refresh)
      const t = window.setTimeout(refresh, 450)

      return () => {
        window.clearTimeout(t)
        observer.kill()
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    },
    { scope: root },
  )

  return (
    <section ref={root} id="tour" className="relative isolate overflow-hidden bg-[#F2EDE1]">
      <HoneycombField opacity={0.05} />
      <HiveDoodle className="pointer-events-none absolute -left-10 top-10 h-40 w-40 text-[#14110B]/5" />

      {/* HUD: kicker + contador de página + barra de progresso */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-6 sm:px-10">
        <Badge tone="gold">Conheça a plataforma</Badge>
        <DeckCounter current={index + 1} total={total} className="text-[#14110B]" />
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-6 z-20 h-1 overflow-hidden rounded-full bg-[#14110B]/10 sm:inset-x-10">
        <div
          className="h-full rounded-full bg-[#F2B705] transition-[width] duration-300 ease-out"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {/* Track: scroll-snap nativo no fallback; pin+translate no desktop */}
      <div ref={scroller} className="snap-x snap-mandatory overflow-x-auto scrollbar-hide">
        <div ref={track} className="flex">
          {DECK_SLIDES.map((s, i) => (
            <DeckSlide key={s.id} slide={s} total={total} active={i === index} />
          ))}
        </div>
      </div>
    </section>
  )
}
