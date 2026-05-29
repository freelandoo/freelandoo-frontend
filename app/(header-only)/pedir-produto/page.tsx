"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ServiceRequestModal } from "../account/_components/service-request-modal"
import { PageShell, LoadingState } from "@/components/tabloide"

export default function PedirProdutoPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.replace("/login?next=/pedir-produto")
      return
    }
    setOpen(true)
  }, [router])

  return (
    <PageShell>
      <main className="relative z-10 flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoadingState label="Abrindo pedido de produto…" />
          <p className="text-xs font-bold text-[#8a8275]">
            Se a janela não abrir,{" "}
            <button type="button" onClick={() => setOpen(true)} className="text-[#F2B705] underline-offset-2 hover:underline">
              clique aqui
            </button>
            .
          </p>
        </div>
        <ServiceRequestModal
          open={open}
          initialMode="product"
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) router.push("/account")
          }}
        />
      </main>
    </PageShell>
  )
}
