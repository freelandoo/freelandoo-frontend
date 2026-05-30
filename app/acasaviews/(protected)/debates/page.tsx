import Navbar from "@/features/acasaviews/components/shared/navbar"
import Footer from "@/features/acasaviews/components/shared/footer"
import DebatesHeroSection from "@/features/acasaviews/components/debates/hero-section"
import DebatesStatsSection from "@/features/acasaviews/components/debates/stats-section"
import UpcomingDebatesSection from "@/features/acasaviews/components/debates/upcoming-debates"
import CastSection from "@/features/acasaviews/components/debates/cast-section"
import RankingSection from "@/features/acasaviews/components/debates/ranking-section"
import PastDebatesSection from "@/features/acasaviews/components/debates/past-debates"

export default function DebatesPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <DebatesHeroSection />
      <DebatesStatsSection />
      <RankingSection />
      <UpcomingDebatesSection />
      <CastSection />
      <PastDebatesSection />
      <Footer />
    </div>
  )
}
