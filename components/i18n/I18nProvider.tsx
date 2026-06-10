"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { MessageDict } from "@/lib/i18n/messages"
import {
  COUNTRY_COOKIE,
  DEFAULT_COUNTRY,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeCountry,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config"

interface I18nContextValue {
  locale: Locale
  country: string
  messages: MessageDict
  t: (namespace: string, key: string, fallback?: string) => string
  setLocale: (locale: Locale) => void
  setCountry: (country: string) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

const ONE_YEAR = 60 * 60 * 24 * 365

// Dicionários como chunks lazy: o bundle inicial e o HTML não pagam os ~51KB
// de JSON por página (antes o dict do locale ativo era serializado via props
// do layout raiz). pt-BR também é carregado async — até lá o t() devolve os
// fallbacks inline, que são pt-BR por convenção.
const MESSAGE_LOADERS: Record<Locale, () => Promise<MessageDict>> = {
  "pt-BR": () => import("@/messages/pt-BR.json").then((m) => m.default as MessageDict),
  en: () => import("@/messages/en.json").then((m) => m.default as MessageDict),
  es: () => import("@/messages/es.json").then((m) => m.default as MessageDict),
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const hit = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
}

/**
 * Resolve locale/country no CLIENTE (cookie lido pós-mount). O layout raiz não
 * lê mais cookies() — isso destrava prerender estático/ISR de todas as rotas
 * (F3.S5). SSR e primeiro render do client saem sempre em pt-BR (default);
 * quem tem cookie en/es vê o idioma trocar logo após a hidratação.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [country, setCountryState] = useState<string>(DEFAULT_COUNTRY)
  const [messages, setMessages] = useState<MessageDict>({})

  // Pós-mount: lê cookies (evita mismatch de hidratação com o HTML estático).
  useEffect(() => {
    setLocaleState(normalizeLocale(readCookie(LOCALE_COOKIE)))
    setCountryState(normalizeCountry(readCookie(COUNTRY_COOKIE)))
  }, [])

  // Locale efetivo → carrega o dicionário e ajusta o <html lang>.
  useEffect(() => {
    let cancelled = false
    document.documentElement.lang = locale
    MESSAGE_LOADERS[locale]()
      .then((dict) => {
        if (!cancelled) setMessages(dict)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    const safe = normalizeLocale(next)
    writeCookie(LOCALE_COOKIE, safe)
    setLocaleState(safe)
  }, [])

  const setCountry = useCallback((next: string) => {
    const safe = normalizeCountry(next)
    writeCookie(COUNTRY_COOKIE, safe)
    setCountryState(safe)
  }, [])

  const t = useCallback(
    (namespace: string, key: string, fallback?: string) => {
      const ns = messages[namespace]
      if (ns && typeof ns[key] === "string") return ns[key]
      return fallback ?? key
    },
    [messages]
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, country, messages, t, setLocale, setCountry }),
    [locale, country, messages, t, setLocale, setCountry]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback seguro: app sem provider continua funcionando (retorna a chave).
    return {
      locale: DEFAULT_LOCALE,
      country: "BR",
      messages: {},
      t: (_ns, key, fallback) => fallback ?? key,
      setLocale: () => {},
      setCountry: () => {},
    }
  }
  return ctx
}

// Hook semelhante ao next-intl: useTranslations("Namespace") devolve t(key).
export function useTranslations(namespace: string) {
  const { t } = useI18n()
  return useCallback(
    (key: string, fallback?: string) => t(namespace, key, fallback),
    [t, namespace]
  )
}

export function useLocale(): Locale {
  return useI18n().locale
}

export function useCountry(): string {
  return useI18n().country
}
