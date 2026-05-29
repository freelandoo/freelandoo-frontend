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
        className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-transparent px-5 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado!" : "Copiar código"}
      </button>
      <Link
        href="/"
        className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D]"
      >
        Explorar Freelandoo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
