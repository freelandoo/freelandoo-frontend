import type { Metadata } from "next"
import { ContentAd } from "@/components/ads/content-ad"
import { CentralDeAjudaContent } from "./content"

export const metadata: Metadata = {
  title: "Central de Ajuda — Freelandoo",
  description:
    "Encontre respostas sobre conta, ativação, perfis, enxames, serviços, agenda, cupons e segurança na Freelandoo.",
}

export default function CentralDeAjudaPage() {
  return (
    <>
      <CentralDeAjudaContent />
      <ContentAd />
    </>
  )
}
