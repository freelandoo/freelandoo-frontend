"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/next"

const CONSENT_KEY = "fl_cookie_consent"

export function AnalyticsProvider() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    const check = () => setConsented(localStorage.getItem(CONSENT_KEY) === "accepted")
    check()
    window.addEventListener("cookieConsentChanged", check)
    return () => window.removeEventListener("cookieConsentChanged", check)
  }, [])

  if (!consented) return null
  return <Analytics />
}
