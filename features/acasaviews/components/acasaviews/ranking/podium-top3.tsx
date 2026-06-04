"use client"

import { useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { cn } from "@/lib/utils"
import type { Accent } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"
import { DoodleAccent } from "./doodle-accent"
import { CasaAvatar } from "./casa-avatar"

gsap.registerPlugin(ScrollTrigger, useGSAP)

export interface PodiumMeta {
  label: string
  value: number
  compact?: boolean
}

export interface PodiumItem {
  rank: number
  name: string
  handle: string
  avatar: string
  score: number
  scoreLabel: string
  tag: string
  tagAccent: Accent
  meta: PodiumMeta[]
}

interface PodiumTop3Props {
  items: PodiumItem[] // [rank1, rank2, rank3]
  accent: "cyan" | "magenta"
}

const accentBg: Record<Accent, string> = {
  magenta: "bg-[var(--magenta)] text-white",
  cyan: "bg-[var(--cyan)] text-[var(--ink)]",
  gold: "bg-[var(--gold)] text-[var(--ink)]",
  ink: "bg-[var(--ink)] text-white",
}

function PodiumColumn({ item, accent }: { item: PodiumItem; accent: "cyan" | "magenta" }) {
  const isFirst = item.rank === 1
  const accentVar = accent === "cyan" ? "var(--cyan)" : "var(--magenta)"
  const frameColor = isFirst ? accentVar : "var(--ink)"

  const order = item.rank === 1 ? "order-2" : item.rank === 2 ? "order-1" : "order-3"
  const width = isFirst ? "w-[40%]" : "w-[30%]"
  const pedestalH = isFirst ? "h-14 md:h-40" : item.rank === 2 ? "h-10 md:h-28" : "h-8 md:h-20"

  return (
    <div className={cn("flex min-w-0 flex-col items-center", order, width)} data-podium-col data-rank={item.rank}>
      {/* Card flutuante */}
      <div className="relative w-full">
        {isFirst && (
          <>
            <div
              className="absolute -inset-6 -z-10 rounded-full blur-3xl"
              style={{ background: accentVar, opacity: 0.28 }}
            />
            <DoodleAccent
              type="crown"
              className="absolute -top-7 left-1/2 z-20 h-8 w-12 -translate-x-1/2 md:-top-12 md:h-12 md:w-16"
              style={{ color: accentVar }}
            />
          </>
        )}

        {/* Selo de posição */}
        <span
          className={cn(
            "absolute -left-1.5 -top-1.5 z-20 flex h-6 w-6 rotate-[-6deg] items-center justify-center casa-display text-base md:-left-2 md:-top-2 md:h-12 md:w-12 md:text-3xl",
            isFirst ? accentBg[accent] : "bg-[var(--ink)] text-white",
          )}
        >
          {item.rank}
        </span>

        {/* Foto recortada */}
        <div
          className="casa-torn-b casa-cut relative overflow-hidden bg-white p-2 md:p-2.5"
          style={{ background: frameColor }}
        >
          <CasaAvatar
            name={item.name}
            src={item.avatar}
            className={cn("w-full", isFirst ? "aspect-[4/5]" : "aspect-square")}
            textClassName={isFirst ? "text-3xl md:text-8xl" : "text-2xl md:text-6xl"}
          />
        </div>

        {/* Bloco de nome + score */}
        <div className="relative mt-2 bg-white p-2 text-center casa-cut md:mt-3 md:p-3">
          <span
            className={cn(
              "inline-block -rotate-1 px-2 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.14em]",
              accentBg[item.tagAccent],
            )}
          >
            {item.tag}
          </span>
          <h3 className={cn("casa-display mt-1.5 leading-none text-[var(--ink)] md:mt-2", isFirst ? "text-sm md:text-4xl" : "text-xs md:text-3xl")}>
            {item.name}
          </h3>
          <p className="casa-body text-[9px] font-semibold text-[var(--ink-soft)]/60 md:text-[11px]">{item.handle}</p>

          <div className="mt-1.5 casa-display leading-none md:mt-2" style={{ color: accentVar }}>
            <span className={isFirst ? "text-xl md:text-5xl" : "text-lg md:text-4xl"}>
              <AnimatedNumber value={item.score} compact={item.score >= 100000} />
            </span>
          </div>
          <p className="casa-body text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]/55 md:text-[10px]">
            {item.scoreLabel}
          </p>

          {item.meta.length > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-[var(--line)] pt-2 md:mt-3 md:gap-3">
              {item.meta.slice(0, 3).map((m) => (
                <div key={m.label} className="text-center">
                  <div className="casa-body text-xs font-extrabold tabular-nums text-[var(--ink)]">
                    <AnimatedNumber value={m.value} compact={m.compact} />
                  </div>
                  <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pedestal */}
      <div
        className={cn("relative mt-3 flex w-[78%] items-center justify-center md:w-full", pedestalH)}
      >
        <div
          className={cn("absolute inset-0", isFirst ? accentBg[accent] : "bg-[var(--ink)]")}
          style={{ clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0 100%)" }}
        />
        <span
          className={cn(
            "casa-display relative z-10 text-2xl md:text-8xl",
            isFirst ? "text-white/90" : "text-white/85",
          )}
        >
          {item.rank}
        </span>
      </div>
    </div>
  )
}

export function PodiumTop3({ items, accent }: PodiumTop3Props) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const cols = gsap.utils.toArray<HTMLElement>("[data-podium-col]")
      if (prefersReduced) {
        gsap.set(cols, { opacity: 1, y: 0 })
        return
      }
      // Ordem de entrada: 2 e 3 primeiro, depois o campeão com destaque
      const sorted = cols.sort(
        (a, b) =>
          Number(b.dataset.rank) - Number(a.dataset.rank),
      )
      gsap.fromTo(
        sorted,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "back.out(1.4)",
          stagger: 0.18,
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        },
      )
    },
    { scope: root },
  )

  return (
    <div ref={root} className="mx-auto max-w-5xl px-5 pb-10 pt-16 md:px-10 md:pt-20">
      <div className="flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
        {items.map((item) => (
          <PodiumColumn key={item.rank} item={item} accent={accent} />
        ))}
      </div>
    </div>
  )
}
