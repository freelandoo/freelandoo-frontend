"use client"

import { useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import type { ReactNode } from "react"
import { DoodleAccent } from "./doodle-accent"

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface RankingListProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Lista do ranking com revelação em cascata ao scroll. */
export function RankingList({ title, subtitle, children }: RankingListProps) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const cards = gsap.utils.toArray<HTMLElement>("[data-rank-card]")
      if (prefersReduced) {
        gsap.set(cards, { opacity: 1, x: 0 })
        return
      }
      gsap.fromTo(
        cards,
        { opacity: 0, x: -28 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="mx-auto max-w-4xl px-5 py-12 md:px-10 md:py-16">
      <div className="mb-7 flex items-end justify-between">
        <div className="relative">
          <h2 className="casa-display text-4xl text-[var(--ink)] md:text-6xl">{title}</h2>
          {subtitle && (
            <p className="mt-2 casa-marker text-2xl text-[var(--ink-soft)]/70">{subtitle}</p>
          )}
          <DoodleAccent type="underline" className="absolute -bottom-3 left-0 h-4 w-44 text-[var(--magenta)]" />
        </div>
        <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink-soft)]/50">
          ranking completo
        </span>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
