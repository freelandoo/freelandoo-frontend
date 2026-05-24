import type { Metadata } from "next"
import { SiteHeader } from "@/components/layout"
import {
  SocialHero,
  PortfolioWorksSection,
  FeedShowcaseSection,
  MachinesIntentSection,
  MessagesSection,
  AcompanharClansSection,
  EarnMoneySection,
  ForWhomSection,
  SocialFinalCTASection,
} from "@/components/home/social"

const TITLE = "Freelandoo — A rede social de profissionais feita para ganhar dinheiro"
const DESCRIPTION =
  "Crie seu perfil, publique seus trabalhos, apareça no feed, receba mensagens e seja encontrado por quem precisa do que você faz. Posts de portfólio, enxames, clans, mensagens e indicações."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.freelandoo.com.br",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.freelandoo.com.br",
    siteName: "Freelandoo",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
        item: "https://www.freelandoo.com.br",
      },
    ],
  }
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Freelandoo",
    url: "https://www.freelandoo.com.br",
    description: DESCRIPTION,
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-zinc-950 text-white" data-tour-path="explore-home">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />

          <SocialHero />
        <PortfolioWorksSection />
        <FeedShowcaseSection />
        <MachinesIntentSection />
        <MessagesSection />
        <AcompanharClansSection />
        <EarnMoneySection />
        <ForWhomSection />
        <SocialFinalCTASection />
      </main>
    </>
  )
}
