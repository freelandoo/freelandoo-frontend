"use client"

/**
 * A porta antiga do Atendimento IA (mig 175) — hoje só REDIRECIONA.
 *
 * Desde a mig 263 existe um atendente só: o da plataforma, aberto a todos com
 * camada grátis de 2 pessoas por dia, e os planos de resposta (R$29/59/99) são
 * comprados na MESMA tela onde ele é configurado, `/account/atendente`. A rota
 * fica de pé porque links antigos, notificações e o retorno de checkouts
 * abertos antes do deploy ainda apontam para cá — e a querystring
 * (`?atendimento_ia=sucesso`) segue junto para o aviso de pagamento aparecer.
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function AtendimentoIaRedirect() {
  const router = useRouter()
  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search : ""
    router.replace(`/account/atendente${qs}`)
  }, [router])
  return (
    <div className="fl-sharp flex min-h-screen items-center justify-center bg-[#0b0804] text-[#9A938A]">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}
