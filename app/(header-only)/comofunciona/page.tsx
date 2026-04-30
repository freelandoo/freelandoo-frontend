import type { Metadata } from "next"
import { ComoFuncionaClient } from "./_components/como-funciona-client"

export const metadata: Metadata = {
  title: "Como funciona | Freelandoo",
  description:
    "Entenda como a Freelandoo conecta quem precisa de serviços com profissionais reais. Máquinas, perfis, portfólios, serviços, clans, afiliados e ranking — tudo explicado.",
  openGraph: {
    title: "Como funciona a Freelandoo",
    description:
      "Uma plataforma criada para conectar quem precisa resolver algo com profissionais prontos para aparecer, atender e crescer.",
  },
}

export default function ComoFuncionaPage() {
  return <ComoFuncionaClient />
}
