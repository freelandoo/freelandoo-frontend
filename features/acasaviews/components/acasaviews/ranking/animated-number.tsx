"use client"

import { useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { cn } from "@/lib/utils"

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface AnimatedNumberProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  /** Compacta grandes números: 2840000 -> "2,84M" */
  compact?: boolean
  className?: string
}

function format(n: number, compact: boolean) {
  if (compact) {
    if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "M"
    if (n >= 1_000) return (n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k"
  }
  return Math.round(n).toLocaleString("pt-BR")
}

/** Contador numérico animado por GSAP, disparado ao entrar na viewport. */
export function AnimatedNumber({
  value,
  duration = 1.6,
  prefix = "",
  suffix = "",
  compact = false,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (prefersReduced) {
        setDisplay(value)
        return
      }
      const obj = { v: 0 }
      gsap.to(obj, {
        v: value,
        duration,
        ease: "power2.out",
        onUpdate: () => setDisplay(obj.v),
        scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
      })
    },
    { scope: ref, dependencies: [value] },
  )

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {format(display, compact)}
      {suffix}
    </span>
  )
}
