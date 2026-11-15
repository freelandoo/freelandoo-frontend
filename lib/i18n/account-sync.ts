// lib/i18n/account-sync.ts
// Grava o idioma escolhido na conta (preferred_locale) — best-effort, nunca
// bloqueia a tela. Vai direto no Railway: não há proxy `/api/users/me/locale`
// (o fetch antigo para lá dava 404 em silêncio).
import { getPublicBackendUrl } from "@/lib/backend-public"
import { LOCALE_COOKIE, isLocale, type Locale } from "./config"

export function syncAccountLocale(locale: Locale, token: string | null | undefined): void {
  if (!token) return
  fetch(`${getPublicBackendUrl()}/users/me/locale`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ locale }),
  }).catch(() => {})
}

/** Idioma que a pessoa ESCOLHEU (cookie gravado). Sem cookie = nunca escolheu → null. */
export function chosenLocaleFromCookie(): Locale | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  const v = m ? decodeURIComponent(m[1]) : null
  return isLocale(v) ? v : null
}
