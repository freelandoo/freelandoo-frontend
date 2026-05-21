import type { Metadata } from "next"
import { ContentAd } from "@/components/ads/content-ad"
import { DicasDeSegurancaContent } from "./content"

export const metadata: Metadata = {
  title: "Dicas de Segurança — Freelandoo",
  description:
    "Orientações para clientes e profissionais sobre cuidados na contratação, negociação e divulgação na Freelandoo.",
}

export default function DicasDeSegurancaPage() {
  return (
    <>
      <DicasDeSegurancaContent />
      <ContentAd />
    </>
  )
}
