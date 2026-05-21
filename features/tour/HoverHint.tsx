"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { HINTS, type HintId } from "./hints"
import { useTour } from "./useTour"

type Side = "top" | "right" | "bottom" | "left"

interface HoverHintProps {
  id: HintId
  side?: Side
  className?: string
  dataTour?: string
  children: React.ReactNode
}

const GAP = 12
const TOOLTIP_MAX_W = 260

/**
 * Tooltip que aparece no hover/focus. Renderizado via portal em
 * `document.body` com `position: fixed` para escapar de containers com
 * `overflow:hidden|auto` (ex.: nav da dropside). Posição é calculada a
 * partir do bounding rect do trigger, com clamp aos limites do viewport.
 */
export function HoverHint({ id, side = "bottom", className, dataTour, children }: HoverHintProps) {
  const hint = HINTS[id]
  const { hideAllTours } = useTour()
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current
    const tip = tooltipRef.current
    if (!trigger || !tip) return
    const t = trigger.getBoundingClientRect()
    const tw = tip.offsetWidth || TOOLTIP_MAX_W
    const th = tip.offsetHeight || 0
    let top = 0
    let left = 0
    switch (side) {
      case "right":
        top = t.top + t.height / 2 - th / 2
        left = t.right + GAP
        break
      case "left":
        top = t.top + t.height / 2 - th / 2
        left = t.left - tw - GAP
        break
      case "top":
        top = t.top - th - GAP
        left = t.left + t.width / 2 - tw / 2
        break
      case "bottom":
      default:
        top = t.bottom + GAP
        left = t.left + t.width / 2 - tw / 2
        break
    }
    const margin = 8
    const maxLeft = window.innerWidth - tw - margin
    const maxTop = window.innerHeight - th - margin
    left = Math.max(margin, Math.min(left, maxLeft))
    top = Math.max(margin, Math.min(top, maxTop))
    setCoords({ top, left })
  }, [side])

  useLayoutEffect(() => {
    if (!open) return
    computePosition()
  }, [open, computePosition])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => computePosition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [open, computePosition])

  if (!hint) return <>{children}</>
  if (hideAllTours) {
    if (!dataTour) return <>{children}</>
    return (
      <span data-tour={dataTour} className={cn("relative inline-flex", className)}>
        {children}
      </span>
    )
  }

  return (
    <span
      ref={triggerRef}
      data-tour={dataTour}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {mounted && open
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              style={{
                position: "fixed",
                top: coords?.top ?? -9999,
                left: coords?.left ?? -9999,
                maxWidth: TOOLTIP_MAX_W,
                opacity: coords ? 1 : 0,
              }}
              className={cn(
                "pointer-events-none z-[200] w-max rounded-xl",
                "border border-primary/30 bg-zinc-950/95 px-3 py-2 text-left",
                "text-xs leading-relaxed shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)] backdrop-blur",
              )}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {hint.title}
              </span>
              <span className="mt-1 block text-white/85">{hint.text}</span>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
