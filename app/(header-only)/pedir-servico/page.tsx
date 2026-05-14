"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ServiceRequestModal } from "../account/_components/service-request-modal"
import { Loader2 } from "lucide-react"

export default function PedirServicoPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.replace("/login?next=/pedir-servico")
      return
    }
    setOpen(true)
  }, [router])

  return (
    <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center text-white/55">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Abrindo solicitação de serviço…</p>
        <p className="text-xs text-white/40">
          Se a janela não abrir, <button onClick={() => setOpen(true)} className="underline hover:text-white">clique aqui</button>.
        </p>
      </div>
      <ServiceRequestModal
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) router.push("/account")
        }}
      />
    </main>
  )
}
