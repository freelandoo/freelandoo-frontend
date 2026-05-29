"use client"

import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"
import { TABLOID_ACTION_CLASSES } from "@/components/tabloide"

export default function CanceladoPage() {
  const router = useRouter()

  return (
    <main className="fl-root relative flex flex-1 items-center justify-center bg-[#141009] px-4 py-16">
      <div className="relative w-full max-w-xl">
        <div className="fl-card fl-hard rounded-[6px] p-8 text-center sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[6px] border-2 border-[#0B0B0D] bg-red-500/15 text-red-700">
            <XCircle className="h-8 w-8" />
          </span>
          <p className="fl-marker text-xl font-bold leading-none text-[#0B0B0D]/55">Pagamento</p>
          <h1 className="fl-display mt-1 text-5xl leading-[0.9] text-[#0B0B0D] sm:text-6xl">CANCELADO.</h1>
          <p className="mx-auto mt-5 max-w-md text-sm font-bold leading-relaxed text-[#5b554b]">
            Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => router.push("/payment/taxa")} className={TABLOID_ACTION_CLASSES}>
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center border-2 border-[#0B0B0D] bg-transparent px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
