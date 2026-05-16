/** Helpers de captura de cupom de share (sessionStorage, vence ao fechar a aba). */

const KEY = "freelandoo:share-coupon"

export interface CapturedCoupon {
  code: string
  captured_at: number
  landing_url: string
}

export function getCapturedCoupon(): CapturedCoupon | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CapturedCoupon
    if (!parsed?.code) return null
    return parsed
  } catch {
    return null
  }
}

export function setCapturedCoupon(code: string, landingUrl: string): void {
  if (typeof window === "undefined") return
  if (!code) return
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        code,
        captured_at: Date.now(),
        landing_url: landingUrl,
      })
    )
  } catch {
    // ignora (modo privado / quota)
  }
}

export function clearCapturedCoupon(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignora
  }
}

/** Normaliza o código (uppercase, trim). Retorna null se inválido (regex básico). */
export function sanitizeCouponCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim().toUpperCase()
  if (!trimmed) return null
  // aceita letras, números, hífen e underscore — bloqueia injeção
  if (!/^[A-Z0-9_-]{2,40}$/.test(trimmed)) return null
  return trimmed
}
