// lib/i18n/server.ts
// Helpers usados em Server Components. Lê locale/country do cookie da request.
// Para componentes server-only: import { getLocale, getCountry } from "@/lib/i18n/server".

import { cookies } from "next/headers"
import {
  COUNTRY_COOKIE,
  DEFAULT_COUNTRY,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeCountry,
  normalizeLocale,
  type Locale,
} from "./config"

export async function getLocale(): Promise<Locale> {
  const c = await cookies()
  const raw = c.get(LOCALE_COOKIE)?.value
  return normalizeLocale(raw)
}

export async function getCountry(): Promise<string> {
  const c = await cookies()
  const raw = c.get(COUNTRY_COOKIE)?.value
  return normalizeCountry(raw)
}

export { DEFAULT_LOCALE, DEFAULT_COUNTRY }
