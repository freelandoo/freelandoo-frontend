"use client"

/**
 * AnimatedNumber — contador que sobe ao entrar na viewport (GSAP ScrollTrigger).
 * Formata pt-BR e compacta grandes números (1.2M / 45k). Respeita
 * prefers-reduced-motion (mostra o valor final direto).
 */
import { useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { cn } from "@/lib/utils"

gsap.registerPlugin(ScrollTrigger, useGSAP)

function format(n: number, compact: boolean) {
  if (compact) {
    if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "M"
    if (n >= 1_000) return (n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k"
  }
  return Math.round(n).toLocaleString("pt-BR")
}

export function AnimatedNumber({
  value,
  compact = false,
  prefix = "",
  suffix = "",
  duration = 1.5,
  className,
}: {
  value: number
  compact?: boolean
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplay(value)
        return
      }
      const obj = { v: 0 }
      gsap.to(obj, {
        v: value,
        duration,
        ease: "power2.out",
        onUpdate: () => setDisplay(obj.v),
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
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
