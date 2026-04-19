import {
  MachinesHeroSection,
  HorizontalMachinesSection,
  RankingSection,
  HowItWorksSection,
  NewCategoriesSection,
  TrustSection,
  FinalCTASection,
} from "@/components/home"

export default function HomePage() {
  return (
    <main className="flex-1 bg-machines-dark">
      <MachinesHeroSection />
      <HorizontalMachinesSection />
      <RankingSection />
      <HowItWorksSection />
      <NewCategoriesSection />
      <TrustSection />
      <FinalCTASection />
    </main>
  )
}
