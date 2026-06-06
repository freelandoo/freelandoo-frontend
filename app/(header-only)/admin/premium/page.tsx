"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// A configuração de Premium agora vive no hub /administracao/monetizacao (aba
// Premium). Esta rota legada redireciona pra manter deep-links funcionando.
export default function AdminPremiumRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/administracao/monetizacao?tab=premium")
  }, [router])
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
