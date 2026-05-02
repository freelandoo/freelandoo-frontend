"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/next"
import { track } from "@vercel/analytics"

const CONSENT_KEY = "fl_cookie_consent"

export function AnalyticsProvider() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    const check = () => setConsented(localStorage.getItem(CONSENT_KEY) === "accepted")
    check()
    window.addEventListener("cookieConsentChanged", check)
    return () => window.removeEventListener("cookieConsentChanged", check)
  }, [])

  useEffect(() => {
    if (!consented) return

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>("[data-cta]")
      if (!el) return
      const cta = el.dataset.cta
      const action = el.dataset.ctaAction
      if (!cta) return
      track("cta_click", {
        cta,
        action: action ?? "",
        href: el.getAttribute("href") ?? "",
      })
    }

    document.addEventListener("click", onClick, { capture: true })
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [consented])

  if (!consented) return null
  return <Analytics />
}
