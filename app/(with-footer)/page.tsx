import type { Metadata } from "next"
import {
  MachinesHeroSection,
  SegmentationCards,
  MachinesGridSection,
  PopularShortcutsSection,
  RankingSection,
  HowItWorksSection,
  NewCategoriesSection,
  TrustSection,
  ForProfessionalsSection,
  AffiliatesSection,
  AboutFreelandooSection,
  FinalCTASection,
} from "@/components/home"

export const metadata: Metadata = {
  title: "Freelandoo — Plataforma para freelancers e clientes",
  description:
    "Freelandoo é a plataforma que conecta freelancers, influenciadores e prestadores de serviço com seus clientes. Ative uma máquina, encontre quem resolve e fale direto pelo WhatsApp.",
  alternates: {
    canonical: "https://www.freelandoo.com.br",
  },
  openGraph: {
    title: "Freelandoo — Plataforma para freelancers e clientes",
    description:
      "Conecta freelancers, influenciadores e prestadores de serviço com clientes. Ative uma máquina e encontre quem resolve.",
    url: "https://www.freelandoo.com.br",
    siteName: "Freelandoo",
    type: "website",
    locale: "pt_BR",
  },
}

export default function HomePage() {
  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.freelandoo.com.br"
      }
    ]
  }

  return (
    <main className="flex-1 bg-machines-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <MachinesHeroSection />
      <SegmentationCards />
      <MachinesGridSection />
      <PopularShortcutsSection />
      <RankingSection />
      <AboutFreelandooSection />
      <HowItWorksSection />
      <NewCategoriesSection />
      <TrustSection />
      <ForProfessionalsSection />
      <AffiliatesSection />
      <FinalCTASection />
    </main>
  )
}
