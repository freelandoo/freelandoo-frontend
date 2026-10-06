"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { compactBR } from "./format"

/**
 * Número que conta. O VALOR DE VERDADE sai no HTML do servidor — sem JS, e
 * para o robô, a página mostra o número, nunca um zero.
 *
 * - Fora da tela na hidratação: zera e conta quando entra (contar algo que a
 *   pessoa já está lendo pareceria defeito, então o que já está na tela fica).
 * - Valor mudou (dado ao vivo): anima do antigo ao novo e dá um brilho curto.
 * Escreve no DOM por ref — nunca setState por quadro.
 */
export function ScoreCounter({ value, compact = true, className = "" }: { value: number; compact?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)
  const fmt = (n: number) => (compact ? compactBR(n) : Math.round(n).toLocaleString("pt-BR"))

  const run = (from: number, to: number, ms: number, bump: boolean) => {
    const el = ref.current
    if (!el) return
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const v = from + (to - from) * e
      shown.current = v
      el.textContent = fmt(v)
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    if (bump) {
      el.classList.remove("rv-bump")
      void el.offsetWidth
      el.classList.add("rv-bump")
    }
  }

  // entrada: só conta o que ainda não estava na tela
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || value <= 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) return
    el.textContent = fmt(0)
    shown.current = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      run(0, value, 1100, false)
    })
    io.observe(el)
    return () => io.disconnect()
    // só na montagem: mudanças posteriores são tratadas abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // atualização ao vivo
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current === value) return
    const from = shown.current
    prev.current = value
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (ref.current) ref.current.textContent = fmt(value)
      shown.current = value
      return
    }
    run(from, value, 600, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {fmt(value)}
    </span>
  )
}
