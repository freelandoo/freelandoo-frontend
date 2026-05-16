"use client"

import { useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export interface ShareCoupon {
  id_coupon: string
  code: string
  discount_type: string | null
  value: number | string | null
}

interface State {
  coupon: ShareCoupon | null
  isLoading: boolean
}

let cache: ShareCoupon | null | undefined = undefined
const subscribers = new Set<(c: ShareCoupon | null) => void>()
let inflight: Promise<void> | null = null

async function fetchOnce() {
  if (inflight) return inflight
  inflight = (async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      cache = null
      subscribers.forEach((cb) => cb(null))
      return
    }
    try {
      const res = await fetchWithLog("useShareCoupon", "/api/me/affiliate/share-coupon", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        cache = null
      } else {
        const data = await res.json()
        cache = data?.coupon ?? null
      }
    } catch {
      cache = null
    } finally {
      subscribers.forEach((cb) => cb(cache ?? null))
    }
  })()
  await inflight
  inflight = null
}

/** Hook que retorna o cupom de share do user logado. Cacheado em memória. */
export function useShareCoupon(): State {
  const [state, setState] = useState<State>(() => ({
    coupon: cache ?? null,
    isLoading: cache === undefined,
  }))

  useEffect(() => {
    const update = (c: ShareCoupon | null) => setState({ coupon: c, isLoading: false })
    subscribers.add(update)
    if (cache === undefined) {
      fetchOnce()
    } else {
      setState({ coupon: cache, isLoading: false })
    }
    return () => {
      subscribers.delete(update)
    }
  }, [])

  return state
}

/** Constrói URL absoluta com `?cupom=` (ou `&cupom=`) preservando query existente. */
export function buildShareUrlWithCoupon(baseUrl: string, couponCode: string): string {
  if (!couponCode) return baseUrl
  try {
    const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "https://freelandoo.com.br")
    url.searchParams.set("cupom", couponCode)
    return url.toString()
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?"
    return `${baseUrl}${sep}cupom=${encodeURIComponent(couponCode)}`
  }
}
