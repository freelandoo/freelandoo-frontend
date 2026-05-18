"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import type { MessageDict } from "@/lib/i18n/messages"
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config"

interface I18nContextValue {
  locale: Locale
  country: string
  messages: MessageDict
  t: (namespace: string, key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  locale: Locale
  country: string
  messages: MessageDict
  children: React.ReactNode
}

export function I18nProvider({ locale, country, messages, children }: I18nProviderProps) {
  const t = useCallback(
    (namespace: string, key: string, fallback?: string) => {
      const ns = messages[namespace]
      if (ns && typeof ns[key] === "string") return ns[key]
      return fallback ?? key
    },
    [messages]
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, country, messages, t }),
    [locale, country, messages, t]
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
