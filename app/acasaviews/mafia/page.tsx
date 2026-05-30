import Navbar from "@/features/acasaviews/components/shared/navbar"
import Footer from "@/features/acasaviews/components/shared/footer"
import MafiaHero from "@/features/acasaviews/components/mafia/hero-section"
import GameOverview from "@/features/acasaviews/components/mafia/game-overview"
import RolesSection from "@/features/acasaviews/components/mafia/roles-section"
import HowToPlay from "@/features/acasaviews/components/mafia/how-to-play"

export default function MafiaPage() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <MafiaHero />
      <GameOverview />
      <RolesSection />
      <HowToPlay />
      <Footer />
    </main>
  )
}
