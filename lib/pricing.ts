"use client"

import { useEffect, useState } from "react"

export interface PublicPricing {
  subscription_annual: { amount_cents: number; currency: string }
}

const DEFAULT_PRICING: PublicPricing = {
  subscription_annual: { amount_cents: 30000, currency: "BRL" },
}

let cached: PublicPricing | null = null
let inFlight: Promise<PublicPricing> | null = null

async function fetchPricing(): Promise<PublicPricing> {
  if (cached) return cached
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch("/api/public/pricing", { cache: "force-cache" })
      if (!res.ok) return DEFAULT_PRICING
      const data = (await res.json()) as PublicPricing
      cached = data
      return data
    } catch {
      return DEFAULT_PRICING
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export function usePricing(): PublicPricing {
  const [pricing, setPricing] = useState<PublicPricing>(cached || DEFAULT_PRICING)
  useEffect(() => {
    let cancelled = false
    fetchPricing().then((p) => { if (!cancelled) setPricing(p) })
    return () => { cancelled = true }
  }, [])
  return pricing
}

export function formatBRL(cents: number, currency = "BRL"): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 })
}
