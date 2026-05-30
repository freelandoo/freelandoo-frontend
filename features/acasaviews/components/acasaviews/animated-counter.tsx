"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedCounterProps {
  to: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  to,
  duration = 1.8,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReduced) {
      setDisplay(to)
      return
    }

    let raf = 0
    let start = 0
    let observer: IntersectionObserver | null = null
    let triggered = false

    const animate = (ts: number) => {
      if (!start) start = ts
      const elapsed = (ts - start) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(to * eased)
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered) {
            triggered = true
            raf = requestAnimationFrame(animate)
          }
        })
      },
      { threshold: 0.4 },
    )

    observer.observe(node)

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [to, duration])

  const formatted = display.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
