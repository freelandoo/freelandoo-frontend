import Navbar from "@/features/acasaviews/components/shared/navbar"
import Footer from "@/features/acasaviews/components/shared/footer"
import InvestorHeroSection from "@/features/acasaviews/components/acasaviews/investor-hero-section"
import MarketOpportunitySection from "@/features/acasaviews/components/acasaviews/market-opportunity-section"
import InvestmentThesisSection from "@/features/acasaviews/components/acasaviews/investment-thesis-section"
import GroupsConflictSection from "@/features/acasaviews/components/acasaviews/groups-conflict-section"
import HorizontalGameDeckSection from "@/features/acasaviews/components/acasaviews/horizontal-game-deck-section"
import BrandOpportunitySection from "@/features/acasaviews/components/acasaviews/brand-opportunity-section"
import RankingTechnologySection from "@/features/acasaviews/components/acasaviews/ranking-technology-section"
import InvestorCTASection from "@/features/acasaviews/components/acasaviews/investor-cta-section"

export default function ACasaViewsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#06060c] pt-16 text-white">
        <InvestorHeroSection />
        <MarketOpportunitySection />
        <InvestmentThesisSection />
        <GroupsConflictSection />
        <HorizontalGameDeckSection />
        <BrandOpportunitySection />
        <RankingTechnologySection />
        <InvestorCTASection />
        <Footer />
      </main>
    </>
  )
}
