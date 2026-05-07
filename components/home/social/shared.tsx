"use client"

import { motion, useReducedMotion, type Variants } from "framer-motion"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: SPRING },
}

export const stagger = (delayChildren = 0, staggerChildren = 0.06): Variants => ({
  hidden: {},
  visible: {
    transition: { delayChildren, staggerChildren },
  },
})

export function SectionWrap({
  id,
  children,
  className,
  bg = "default",
}: {
  id?: string
  children: ReactNode
  className?: string
  bg?: "default" | "lift" | "deep"
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full",
        bg === "deep" && "bg-zinc-950",
        bg === "lift" && "bg-zinc-900/40",
        bg === "default" && "bg-transparent",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1400px] px-5 py-20 md:px-10 md:py-28">
        {children}
      </div>
    </section>
  )
}

export function Eyebrow({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        accent
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-white/10 bg-white/[0.03] text-white/60"
      )}
    >
      {children}
    </span>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  align = "left",
  accent,
}: {
  eyebrow?: string
  title: ReactNode
  desc?: ReactNode
  align?: "left" | "center"
  accent?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger(0, 0.08)}
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start text-left"
      )}
    >
      {eyebrow && (
        <motion.div variants={fadeUp}>
          <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
        </motion.div>
      )}
      <motion.h2
        variants={fadeUp}
        className="max-w-3xl text-balance text-3xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl md:leading-[1.02]"
      >
        {title}
      </motion.h2>
      {desc && (
        <motion.p
          variants={fadeUp}
          className="max-w-2xl text-pretty text-base leading-relaxed text-white/65 md:text-lg"
        >
          {desc}
        </motion.p>
      )}
    </motion.div>
  )
}

export function GhostBorder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-white/[0.07]",
        "bg-gradient-to-b from-white/[0.04] to-white/[0.01]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(255,255,255,0.02)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function ChipRow({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((it) => (
        <li
          key={it}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-medium",
            accent
              ? "border-primary/25 bg-primary/[0.08] text-primary/90"
              : "border-white/10 bg-white/[0.03] text-white/65"
          )}
        >
          {it}
        </li>
      ))}
    </ul>
  )
}
