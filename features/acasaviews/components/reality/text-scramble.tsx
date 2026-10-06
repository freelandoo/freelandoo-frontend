"use client"

import { useEffect, useRef } from "react"

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/_+="

/**
 * Embaralha o texto UMA vez, na entrada (~700ms). Uso pontual: um kicker por
 * página. O texto real está no HTML (e no aria-label); o efeito só reescreve o
 * que se vê. Movimento reduzido: não acontece.
 */
export function TextScramble({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const t0 = performance.now()
    const dur = 720
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const reveal = Math.floor(k * text.length)
      let out = ""
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        out += i < reveal || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      }
      el.textContent = out
      if (k < 1) raf = requestAnimationFrame(tick)
      else el.textContent = text
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.textContent = text
    }
  }, [text])

  return (
    <span ref={ref} aria-label={text} className={className}>
      {text}
    </span>
  )
}
