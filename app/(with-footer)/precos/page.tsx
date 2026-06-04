import type { Metadata } from "next"
import { PrecosContent } from "./content"

export const metadata: Metadata = {
  title: "Preços — Freelandoo",
  description:
    "Ativação única de R$ 300 para profissionais. Perfil profissional ativo, vitrine pública e contato direto. Sem comissão por serviço fechado.",
}

export default function PrecosPage() {
  return (
    <>
      <PrecosContent />
    </>
  )
}
