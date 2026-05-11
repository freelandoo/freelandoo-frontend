export const COURSE_MIN_PUBLISH_PRICE_CENTS = 500

export function formatPriceBRL(priceCents: number | null | undefined): string {
  if (priceCents == null || priceCents <= 0) return "Sem preço"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100)
}

/** Aceita texto livre ("49,90" / "R$ 49,90" / "49.9") e devolve cents (ou null). */
export function parsePriceInput(input: string): number | null {
  if (!input || !input.trim()) return null
  const cleaned = input
    .replace(/[R$\s]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToInputText(priceCents: number | null | undefined): string {
  if (priceCents == null) return ""
  return (priceCents / 100).toFixed(2).replace(".", ",")
}
