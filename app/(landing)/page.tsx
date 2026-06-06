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
import { RevealMount } from "@/components/home/landing/RevealMount"

const TITLE = "Freelandoo — Venda serviços, cursos e produtos, e ganhe como afiliado"
const DESCRIPTION =
  "A Freelandoo conecta quem quer ganhar dinheiro com quem precisa aprender, criar, comprar e empreender. Ofereça serviços, crie cursos de graça, venda produtos, abra sua lojinha, divulgue como influenciador e ganhe indicando."

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

export default function HomePage() {
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
        {/* 1 · Hero principal */}
        <HeroSection />
        {/* 2 · Escolha seu caminho (5 caminhos de renda) */}
        <MoneyPathCards />
        {/* 3 · Carrossel "tudo que você precisa para ganhar mais" */}
        <FeatureCarousel />
        {/* 4 · Grade numerada de recursos 01-13 */}
        <FeatureBento />
        {/* 5 · CTA final */}
        <FinalCTA />
      </main>
      <LandingFooter />
      <RevealMount />
    </>
  )
}
