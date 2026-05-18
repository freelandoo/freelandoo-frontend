"use server"

// lib/i18n/actions.ts
// Server actions para persistir locale/country no cookie. Quando o user está
// autenticado e passa um token (via header em componentes client), o backend
// também é sincronizado via /me/locale e /me/country. Aqui só lidamos com o
// cookie — o sync com backend fica nos componentes de seletor para evitar
// duplicar lógica de fetch.

import { cookies } from "next/headers"
import {
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  normalizeCountry,
  normalizeLocale,
  type Locale,
} from "./config"

const ONE_YEAR = 60 * 60 * 24 * 365

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const safe = normalizeLocale(locale)
  const jar = await cookies()
  jar.set(LOCALE_COOKIE, safe, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  })
}

export async function setCountryCookie(iso2: string): Promise<void> {
  const safe = normalizeCountry(iso2)
  const jar = await cookies()
  jar.set(COUNTRY_COOKIE, safe, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  })
}
