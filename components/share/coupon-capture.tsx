"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { sanitizeCouponCode, setCapturedCoupon } from "@/lib/share-coupon"

function CouponCaptureInner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    const raw = searchParams?.get("cupom")
    const code = sanitizeCouponCode(raw)
    if (!code) return
    const landing = typeof window !== "undefined" ? window.location.href : pathname || ""
    // Último cupom vence — sobrescreve qualquer atribuição anterior da sessão.
    setCapturedCoupon(code, landing)
  }, [searchParams, pathname])

  return null
}

/** Monta no layout raiz dentro de Suspense (useSearchParams requer). */
export function CouponCapture() {
  return (
    <Suspense fallback={null}>
      <CouponCaptureInner />
    </Suspense>
  )
}
