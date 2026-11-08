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

/*
 * A8 — convite do Meu Mundo. O link do botão "Compartilhar" do jogo leva
 * `?cupom=` para /meu-mundo; além do sessionStorage acima (que some ao fechar a
 * aba), o código fica 30 dias no aparelho para chegar até a 1ª compra de Gold.
 * Só atribui: o vínculo e a comissão seguem a regra do programa no servidor
 * (vínculo existente sempre vence).
 */
const MM_KEY = "freelandoo:mm-invite"
const MM_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function setMeuMundoInvite(code: string): void {
  if (typeof window === "undefined" || !code) return
  try {
    localStorage.setItem(MM_KEY, JSON.stringify({ code, at: Date.now() }))
  } catch {
    // ignora (modo privado / quota)
  }
}

export function getMeuMundoInvite(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(MM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { code?: string; at?: number }
    if (!parsed?.code || !parsed.at || Date.now() - parsed.at > MM_TTL_MS) return null
    return sanitizeCouponCode(parsed.code)
  } catch {
    return null
  }
}

/** Cupom a mandar no checkout do Gold do jogo: o da sessão, senão o convite. */
export function meuMundoCheckoutCoupon(): string | null {
  return getCapturedCoupon()?.code ?? getMeuMundoInvite()
}
