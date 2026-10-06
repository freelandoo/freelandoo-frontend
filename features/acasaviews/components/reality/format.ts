/** Formatação compartilhada pela pele "reality" (servidor e cliente). */

export function compactBR(n: number): string {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K`
  return Math.round(v).toLocaleString("pt-BR")
}

export function brl(cents: number): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0")
}
