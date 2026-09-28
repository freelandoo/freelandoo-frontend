import type { Metadata } from "next"
import { PrecosContent } from "./content"

export const metadata: Metadata = {
  title: "Preços — Freelandoo",
  description:
    "Primeiro perfil grátis; cada perfil adicional por R$ 9,99 em pagamento único. Vitrine pública e contato direto. Sem comissão por serviço fechado.",
}

export default function PrecosPage() {
  return (
    <>
      <PrecosContent />
    </>
  )
}
