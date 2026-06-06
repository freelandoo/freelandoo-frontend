import type { Metadata } from "next"
import {
  LandingHeader,
  LandingFooter,
  HeroSection,
  MoneyPathCards,
  FeatureCarousel,
  FeatureBento,
  FinalCTA,
} from "@/components/home/landing"
import { AudienceCrossLink } from "@/components/home/landing/AudienceCrossLink"
import { RevealMount } from "@/components/home/landing/RevealMount"

const TITLE = "Freelandoo — Venda serviços, cursos e produtos, e ganhe como afiliado"
const DESCRIPTION =
  "Transforme seu talento ou sua audiência em renda. Ofereça serviços, crie cursos de graça, venda produtos, abra sua lojinha e ganhe indicando. Comece de graça."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.freelandoo.com.br/ganhar" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.freelandoo.com.br/ganhar",
    siteName: "Freelandoo",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og-image.png", width: 1024, height: 1024, alt: "Freelandoo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
}

export default function SellerHomePage() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1 overflow-x-clip">
        {/* 1 · Hero principal */}
        <HeroSection />
        {/* 2 · Escolha seu caminho (5 caminhos de renda) */}
        <MoneyPathCards />
        {/* 3 · Carrossel "tudo que você precisa para ganhar mais" */}
        <FeatureCarousel />
        {/* 4 · Grade numerada de recursos 01-13 */}
        <FeatureBento />
        {/* Cross-link pro lado comprador */}
        <div className="flex justify-center px-5 pb-2">
          <AudienceCrossLink href="/">Quer contratar ou comprar?</AudienceCrossLink>
        </div>
        {/* 5 · CTA final */}
        <FinalCTA />
      </main>
      <LandingFooter />
      <RevealMount />
    </>
  )
}
