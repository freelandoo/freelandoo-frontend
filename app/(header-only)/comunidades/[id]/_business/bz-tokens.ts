// OS TOKENS DO BUSINESS ("BALCÃO ACESO", 2026-10-31) — a fonte única de cor,
// luz e sombra das peças novas da comunidade de negócio.
//
// ⚠️ A COR É DO DONO: tudo que brilha recebe o `accent` que o líder escolheu.
// As superfícies usam os hex PADRÃO da plataforma (#15120E, #1D1810…) de
// propósito — é por eles que a pele `.fl-business` (globals.css) troca o fundo
// pela paleta escolhida. Hex de superfície NOVO aqui não seria recolorido.

import type { CSSProperties } from "react"

export const BZ = {
  ink: "#F5F1E8",
  muted: "#9A938A",
  /** Superfície de painel (a pele troca). */
  panel: "#15120E",
  /** Superfície interna (a pele troca). */
  inner: "#1D1810",
  /** Contorno duro do tabloide. */
  line: "#0B0B0D",
  ok: "#22C55E",
  warn: "#9A3412",
} as const

/** `#RRGGBB` + alfa 0–1 → `#RRGGBBAA`. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
  return `${hex.slice(0, 7)}${v.toString(16).padStart(2, "0")}`
}

/** Letreiro: o texto aceso na cor do dono, com núcleo nítido e halo. */
export function neonText(accent: string, strength = 1): CSSProperties {
  return {
    textShadow: `0 0 1px ${alpha(accent, 0.9 * strength)}, 0 0 14px ${alpha(accent, 0.55 * strength)}, 0 0 34px ${alpha(accent, 0.3 * strength)}`,
  }
}

/** Caixa acesa: a sombra dura do tabloide + o halo da vitrine. */
export function litBox(accent: string, offset = 6): CSSProperties {
  return {
    boxShadow: `${offset}px ${offset}px 0 0 ${BZ.line}, 0 0 0 1px ${alpha(accent, 0.35)}, 0 18px 44px -20px ${alpha(accent, 0.7)}`,
  }
}

/** O número herói (visor da caixa registradora). */
export function heroNumber(accent: string): CSSProperties {
  return { color: accent, ...neonText(accent, 0.8), fontVariantNumeric: "tabular-nums" }
}

/** Rótulo pequeno em caixa alta acima dos números. */
export const EYEBROW =
  "text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]"
