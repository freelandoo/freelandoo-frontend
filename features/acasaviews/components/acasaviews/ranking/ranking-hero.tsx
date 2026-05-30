"use client"

import type { ReactNode } from "react"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { cn } from "@/lib/utils"
import { DoodleAccent } from "./doodle-accent"
import { AnimatedNumber } from "./animated-number"

gsap.registerPlugin(useGSAP)

interface RankingHeroProps {
  title1: string
  title2: string
  lead: ReactNode
  accent: "cyan" | "magenta"
  liveLabel: string
  bigStat: { label: string; value: number; compact?: boolean; suffix?: string }
  sideStat: { label: string; value: number; compact?: boolean; suffix?: string }
  /** Override do tamanho dos títulos (para títulos longos). */
  titleClassName?: string
}

export function RankingHero({
  title1,
  title2,
  lead,
  accent,
  liveLabel,
  bigStat,
  sideStat,
  titleClassName = "text-[18vw] sm:text-[14vw] lg:text-[8.5rem]",
}: RankingHeroProps) {
  const root = useRef<HTMLDivElement>(null)
  const accentVar = accent === "cyan" ? "var(--cyan)" : "var(--magenta)"

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]")
      if (prefersReduced) {
        gsap.set(targets, { opacity: 1, y: 0, rotate: 0, scale: 1 })
        return
      }
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo("[data-reveal='t1']", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo("[data-reveal='t2']", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.45")
        .fromTo("[data-reveal='lead']", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, "-=0.4")
        .fromTo(
          "[data-reveal='panel']",
          { opacity: 0, y: 30, rotate: 2 },
          { opacity: 1, y: 0, rotate: -1.2, duration: 0.7 },
          "-=0.5",
        )
        .fromTo(
          "[data-reveal='doodle']",
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.5, stagger: 0.12 },
          "-=0.4",
        )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative mx-auto max-w-7xl px-5 pt-4 pb-10 md:px-10 md:pt-6 md:pb-16">
      <div className="grid items-center gap-8 lg:grid-cols-12">
        {/* Coluna texto */}
        <div className="lg:col-span-7">
          <div data-reveal="lead" className="mb-4 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-[var(--ink)] px-3 py-1.5 text-white">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: accentVar }} />
              <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.2em]">{liveLabel}</span>
            </span>
            <span className="casa-marker text-2xl text-[var(--ink-soft)]" style={{ color: accentVar }}>
              ao vivo, todo dia
            </span>
          </div>

          <h1 className="relative">
            <span data-reveal="t1" className={cn("casa-display block text-[var(--ink)]", titleClassName)}>
              {title1}
            </span>
            <span
              data-reveal="t2"
              className={cn("casa-display relative z-10 block", titleClassName)}
              style={{ color: accentVar }}
            >
              {title2}
              <DoodleAccent
                type="underline"
                data-reveal="doodle"
                className="absolute -bottom-3 left-0 h-5 w-[62%] text-[var(--cyan)]"
              />
            </span>
            <DoodleAccent
              type="spark"
              data-reveal="doodle"
              className="absolute -left-2 -top-4 h-10 w-10 text-[var(--magenta)] md:-left-8"
            />
          </h1>

          <p data-reveal="lead" className="mt-7 max-w-xl text-pretty text-base font-medium leading-relaxed text-[var(--ink-soft)] md:text-lg">
            {lead}
          </p>
        </div>

        {/* Coluna painel de números */}
        <div className="lg:col-span-5">
          <div
            data-reveal="panel"
            className="casa-cut relative bg-[var(--ink)] p-6 text-white md:p-8"
            style={{ transform: "rotate(-1.2deg)" }}
          >
            <span className="casa-tape -top-3 left-8 rotate-[8deg]" style={{ background: `${accentVar}73` }} />
            <div className="flex items-center justify-between">
              <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/60">
                Placar geral
              </span>
              <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.2em]" style={{ color: accentVar }}>
                live
              </span>
            </div>

            <div className="mt-5">
              <div className="casa-display text-6xl md:text-7xl" style={{ color: accentVar }}>
                <AnimatedNumber value={bigStat.value} compact={bigStat.compact} suffix={bigStat.suffix} />
              </div>
              <div className="mt-2 casa-body text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                {bigStat.label}
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-white/12 pt-5">
              <div>
                <div className="casa-display text-3xl text-white">
                  <AnimatedNumber value={sideStat.value} compact={sideStat.compact} suffix={sideStat.suffix} />
                </div>
                <div className="mt-1 casa-body text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {sideStat.label}
                </div>
              </div>
              <div className={cn("casa-marker text-3xl leading-none")} style={{ color: accentVar }}>
                +24h
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 pr-2">
            <DoodleAccent data-reveal="doodle" type="arrow" className="h-10 w-16 text-[var(--ink)]" />
            <span className="casa-marker text-xl text-[var(--ink-soft)]">o jogo é aqui</span>
          </div>
        </div>
      </div>
    </section>
  )
}
