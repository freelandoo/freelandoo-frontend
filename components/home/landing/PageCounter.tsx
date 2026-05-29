"use client"

/**
 * PageCounter — número que sobe (count-up) ao entrar na viewport.
 * Usado em estatísticas/contadores. Respeita prefers-reduced-motion
 * (mostra o valor final direto, sem animar).
 */
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function PageCounter({
  to,
  suffix = "",
  prefix = "",
  duration = 1400,
  className,
  label,
}: {
  to: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduce) {
      setValue(to)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e.isIntersecting || done.current) return
        done.current = true
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          // easeOutCubic — coerente com cubic-bezier(0.16,1,0.3,1)
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(to * eased))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return (
    <div ref={ref} className={className}>
      <div className="fl-display text-4xl font-black tabular-nums sm:text-5xl">
        {prefix}
        {value.toLocaleString("pt-BR")}
        {suffix}
      </div>
      {label ? <div className={cn("mt-1 text-sm font-medium text-[#6B6457]")}>{label}</div> : null}
    </div>
  )
}
