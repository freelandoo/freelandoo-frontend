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

const TITLE = "Freelandoo — Encontre profissionais, influenciadores e produtos"
const DESCRIPTION =
  "Contrate profissionais, compre de criadores e feche com influenciadores com pagamento protegido e avaliações reais. Encontre perto de você, num lugar só."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.freelandoo.com.br" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.freelandoo.com.br",
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

export default function BuyerHomePage() {
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Freelandoo",
    url: "https://www.freelandoo.com.br",
    description: DESCRIPTION,
  }
  const jsonLdSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Freelandoo",
    url: "https://www.freelandoo.com.br",
    inLanguage: "pt-BR",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.freelandoo.com.br/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSite) }} />

      <LandingHeader />
      <main className="flex-1 overflow-x-clip">
        {/* 1 · Hero do comprador + busca */}
        <BuyerHero />
        {/* 2 · Prova social (qualitativa, sem números falsos) */}
        <BuyerSocialProof />
        {/* 3 · Como funciona em 3 passos */}
        <BuyerHowItWorks />
        {/* 4 · Atalho por área (enxames) */}
        <BuyerCategories />
        {/* 5 · Confiança / segurança */}
        <BuyerTrust />
        {/* 6 · CTA final + cross-link pro lado vendedor */}
        <BuyerFinalCTA />
      </main>
      <LandingFooter />
      <RevealMount />
    </>
  )
}
