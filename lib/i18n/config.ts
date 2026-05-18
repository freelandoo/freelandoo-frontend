// lib/i18n/config.ts
// Configuração central do i18n. MVP cookie-only (sem prefixo de URL).
// Para adicionar um idioma novo:
//   1. Adicione o código em SUPPORTED_LOCALES
//   2. Crie messages/<code>.json com as mesmas chaves de pt-BR.json
//   3. Registre o nome amigável em LOCALE_LABELS
//   4. Importe o JSON em lib/i18n/messages.ts

export const DEFAULT_LOCALE = "pt-BR" as const
export const DEFAULT_COUNTRY = "BR" as const

export const SUPPORTED_LOCALES = ["pt-BR", "en", "es"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
}

// Flags emoji por locale (usadas no seletor).
export const LOCALE_FLAGS: Record<Locale, string> = {
  "pt-BR": "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
}

export const LOCALE_COOKIE = "NEXT_LOCALE"
export const COUNTRY_COOKIE = "NEXT_COUNTRY"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function normalizeCountry(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_COUNTRY
  const upper = value.trim().toUpperCase()
  return upper.length === 2 ? upper : DEFAULT_COUNTRY
}
