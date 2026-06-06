import type { Metadata } from "next"
import { LandingHeader, LandingFooter } from "@/components/home/landing"
import {
  BuyerHero,
  BuyerSocialProof,
  BuyerHowItWorks,
  BuyerCategories,
  BuyerTrust,
  BuyerFinalCTA,
} from "@/components/home/landing/buyer"
import { RevealMount } from "@/components/home/landing/RevealMount"

// Home do comprador PARQUEADA (órfã) — não linkada e não indexada por enquanto.
// O wedge comprador × vendedor está pausado; a / voltou a ser a home do vendedor.
const TITLE = "Freelandoo — Encontre profissionais, influenciadores e produtos"
const DESCRIPTION =
  "Contrate profissionais, compre de criadores e feche com influenciadores com pagamento protegido e avaliações reais. Encontre perto de você, num lugar só."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
}

export default function BuyerHomePage() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1 overflow-x-clip">
        <BuyerHero />
        <BuyerSocialProof />
        <BuyerHowItWorks />
        <BuyerCategories />
        <BuyerTrust />
        <BuyerFinalCTA />
      </main>
      <LandingFooter />
      <RevealMount />
    </>
  )
}
