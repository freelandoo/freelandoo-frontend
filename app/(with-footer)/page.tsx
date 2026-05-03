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
  title: "Freelandoo — Freelancers e influenciadores para o seu projeto",
  description: "Encontre o melhor profissional freelancer para o seu projeto na Freelandoo.",
  alternates: {
    canonical: "https://www.freelandoo.com.br",
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
