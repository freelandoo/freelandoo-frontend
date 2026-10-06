"use client"

import { useRef, type CSSProperties, type ReactNode } from "react"

/**
 * Card editorial com perspectiva leve e luz que segue o cursor.
 * Só escreve QUATRO variáveis CSS (dentro de um rAF) — sem estado do React,
 * então o card não re-renderiza a cada movimento. Toque e movimento reduzido
 * não ganham tilt (a regra está no CSS e aqui).
 */
export function TiltCard({
  children,
  className = "",
  style,
  max = 5,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`)
      el.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`)
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`)
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`)
    })
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(raf.current)
    el.style.setProperty("--ry", "0deg")
    el.style.setProperty("--rx", "0deg")
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`rv-card ${className}`} style={style}>
      {children}
      <span aria-hidden className="rv-spot" />
      <span aria-hidden className="rv-sweep" />
    </div>
  )
}
