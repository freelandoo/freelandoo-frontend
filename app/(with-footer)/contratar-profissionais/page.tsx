import type { Metadata } from "next"
import { ContentAd } from "@/components/ads/content-ad"
import { ContratarProfissionaisContent } from "./content"

export const metadata: Metadata = {
  title: "Contratar Profissionais — Freelandoo",
  description:
    "Encontre profissionais, freelancers e prestadores de serviço na Freelandoo. Filtre por enxame, localização e profissão. Contato direto pelo WhatsApp.",
}

export default function ContratarProfissionaisPage() {
  return (
    <>
      <ContratarProfissionaisContent />
      <ContentAd />
    </>
  )
}
