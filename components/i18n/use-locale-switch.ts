"use client"

import { useCallback, useTransition } from "react"
import { useI18n } from "@/components/i18n/I18nProvider"
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config"

/** Troca o idioma: cookie + provider na hora, conta em segundo plano. */
export function useLocaleSwitch() {
  const { locale, setLocale } = useI18n()
  const [pending, startTransition] = useTransition()

  const change = useCallback(
    (next: Locale) => {
      if (next === locale || pending) return
      startTransition(async () => {
        // 1. Cookie + estado do provider (a troca é client-side; o layout raiz
        //    não lê mais cookie de locale — F3.S5).
        setLocale(next)

        // 2. Sync backend se autenticado (best-effort, não bloqueia UX)
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        if (token) {
          fetch("/api/users/me/locale", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ locale: next }),
          }).catch(() => {})
        }
      })
    },
    [locale, pending, setLocale],
  )

  const cycle = useCallback(() => {
    change(SUPPORTED_LOCALES[(SUPPORTED_LOCALES.indexOf(locale) + 1) % SUPPORTED_LOCALES.length])
  }, [change, locale])

  return { locale, pending, change, cycle }
}
