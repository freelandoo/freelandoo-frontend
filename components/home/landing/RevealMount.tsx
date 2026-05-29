"use client"

/**
 * RevealMount — ilha client que ativa o scroll-reveal (IntersectionObserver)
 * para todos os elementos `[data-reveal]` e `[data-stagger] > [data-card]` da
 * landing. Permite que as seções sejam server components puros.
 * Respeita prefers-reduced-motion (ver lib/scroll-reveal.ts).
 */
import { useScrollReveal } from "@/lib/scroll-reveal"

export function RevealMount() {
  useScrollReveal()
  return null
}
