"use client"

import { useConsentContext } from "@/components/consent/ConsentProvider"

/** Atalho: `const { ensureConsent } = useActionConsent()`. */
export function useActionConsent() {
  return useConsentContext()
}
