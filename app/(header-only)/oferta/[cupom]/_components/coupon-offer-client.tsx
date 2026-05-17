"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Copy, ArrowRight, Check } from "lucide-react"
import { setCapturedCoupon } from "@/lib/share-coupon"

export function CouponOfferClient({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCapturedCoupon(code, window.location.href)
    }
  }, [code])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignora
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado!" : "Copiar código"}
      </button>
      <Link
        href="/"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
      >
        Explorar Freelandoo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
