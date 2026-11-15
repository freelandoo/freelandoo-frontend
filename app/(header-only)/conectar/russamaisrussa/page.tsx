import type { Metadata } from "next"
import { PartnerConnectBridge } from "@/components/auth/partner-connect-bridge"

// Ponte de login da A Russa Mais Russa (site servido em /russamaisrussa por
// rewrite). Página de passagem como /login e /aceitar-termos: sem Voltar.
export const metadata: Metadata = {
  title: "Entrar com a Freelandoo",
  robots: { index: false, follow: false },
}

export default function ConectarRussaMaisRussaPage() {
  return (
    <PartnerConnectBridge
      partner={{
        prefix: "/russamaisrussa",
        landing: "/russamaisrussa/entrar/freelandoo",
        name: "A Russa Mais Russa",
      }}
    />
  )
}
