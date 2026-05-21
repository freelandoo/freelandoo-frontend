import type { Metadata } from "next"
import { ContentAd } from "@/components/ads/content-ad"
import { SobreNosContent } from "./content"

export const metadata: Metadata = {
  title: "Sobre Nós — Freelandoo",
  description:
    "A Freelandoo nasceu para facilitar a conexão entre profissionais, prestadores, criadores, empresas e pessoas que precisam resolver algo.",
}

export default function SobreNosPage() {
  return (
    <>
      <SobreNosContent />
      <ContentAd />
    </>
  )
}
