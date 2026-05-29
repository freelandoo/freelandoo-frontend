import type { Metadata } from "next"
import {
  LandingHeader,
  LandingFooter,
  HeroSection,
  MoneyPathCards,
  HorizontalFeatureDeck,
  CourseShowcase,
  MultiProfileShowcase,
  ServiceShowcase,
  ProductStoreShowcase,
  LojinhaShowcase,
  SearchShowcase,
  RequestShowcase,
  OpportunityShowcase,
  AffiliateCouponCard,
  VideoShowcase,
  PostsShowcase,
  StoriesShowcase,
  WorkLifestyleShowcase,
  InfluencerMarketplaceShowcase,
  InfluencerLocalShowcase,
  MoreThanSocialShowcase,
  ParentalControlShowcase,
  FinalCTA,
} from "@/components/home/landing"
import { RevealMount } from "@/components/home/landing/RevealMount"

const TITLE = "Freelandoo — Venda serviços, cursos e produtos, e ganhe como afiliado"
const DESCRIPTION =
  "A Freelandoo conecta quem quer ganhar dinheiro com quem precisa contratar, comprar, aprender ou divulgar. Ofereça serviços, crie cursos de graça, venda produtos, abra sua lojinha, divulgue como influenciador e ganhe indicando."

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
      <main className="flex-1">
        {/* 1 · Hero */}
        <HeroSection />
        {/* 2 · Caminhos de renda */}
        <MoneyPathCards />
        {/* Motion · Deck horizontal (GSAP) */}
        <HorizontalFeatureDeck />
        {/* 3 · Cursos */}
        <CourseShowcase />
        {/* 4 · Vários perfis */}
        <MultiProfileShowcase />
        {/* 5 · Serviços */}
        <ServiceShowcase />
        {/* 6 · Produtos */}
        <ProductStoreShowcase />
        {/* 7 · Lojinha */}
        <LojinhaShowcase />
        {/* 8 · Busca */}
        <SearchShowcase />
        {/* 9 · Chamados */}
        <RequestShowcase />
        {/* 10 · Oportunidades */}
        <OpportunityShowcase />
        {/* 11 · Afiliados */}
        <AffiliateCouponCard />
        {/* 12 · Vídeos curtos */}
        <VideoShowcase />
        {/* 13 · Posts */}
        <PostsShowcase />
        {/* 14 · Stories */}
        <StoriesShowcase />
        {/* 15 · Trabalho + lifestyle */}
        <WorkLifestyleShowcase />
        {/* 16 · Influenciadores */}
        <InfluencerMarketplaceShowcase />
        {/* 17 · Influenciadores locais */}
        <InfluencerLocalShowcase />
        {/* 18 · Mais que rede social */}
        <MoreThanSocialShowcase />
        {/* 19 · Controle parental */}
        <ParentalControlShowcase />
        {/* 20 · CTA final */}
        <FinalCTA />
      </main>
      <LandingFooter />
      <RevealMount />
    </>
  )
}
