"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { CONSENT_ACTIONS, type ConsentActionKey } from "@/lib/action-consents"
import { ActionConsentModal } from "./ActionConsentModal"

const CACHE_KEY = "fl_consents"

type ConsentMap = Partial<Record<ConsentActionKey, number>>

interface ConsentContextValue {
  ensureConsent: (key: ConsentActionKey) => Promise<boolean>
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function useConsentContext() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error("useConsentContext fora do ConsentProvider")
  return ctx
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consents, setConsents] = useState<ConsentMap>({})
  const [pending, setPending] = useState<ConsentActionKey | null>(null)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  // Carrega aceites 1x (cache local só pra não piscar).
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) setConsents(JSON.parse(cached))
    } catch {
      /* ignore */
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    fetch("/api/me/consents", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.consents) {
          setConsents(d.consents)
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(d.consents))
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {})
  }, [])

  const ensureConsent = useCallback(
    (key: ConsentActionKey) =>
      new Promise<boolean>((resolve) => {
        const required = CONSENT_ACTIONS[key].version
        if ((consents[key] ?? 0) >= required) {
          resolve(true)
          return
        }
        resolverRef.current = resolve
        setPending(key)
      }),
    [consents],
  )

  function finish(ok: boolean) {
    const r = resolverRef.current
    resolverRef.current = null
    setPending(null)
    if (r) r(ok)
  }

  async function handleAccept(key: ConsentActionKey) {
    const version = CONSENT_ACTIONS[key].version
    const token = localStorage.getItem("token")
    try {
      await fetch("/api/me/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action_key: key, terms_version: version }),
      })
    } catch {
      /* mesmo se a gravação falhar, libera a ação nesta sessão */
    }
    setConsents((prev) => {
      const next = { ...prev, [key]: version }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
    finish(true)
  }

  return (
    <ConsentContext.Provider value={{ ensureConsent }}>
      {children}
      <ActionConsentModal
        actionKey={pending}
        onAccept={handleAccept}
        onDecline={() => finish(false)}
      />
    </ConsentContext.Provider>
  )
}
