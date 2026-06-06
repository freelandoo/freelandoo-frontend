import { Section, GoldButton } from "@/components/home/landing"
import { AudienceCrossLink } from "@/components/home/landing/AudienceCrossLink"

export function BuyerFinalCTA() {
  return (
    <Section className="text-center">
      <h2 className="fl-display text-4xl text-[#0B0B0D] sm:text-5xl">
        Encontre quem você precisa hoje
      </h2>
      <div className="mt-7 flex flex-col items-center gap-3">
        <GoldButton href="/search">Encontrar agora</GoldButton>
        <AudienceCrossLink href="/ganhar">
          É profissional ou influenciador? Ganhe dinheiro
        </AudienceCrossLink>
      </div>
    </Section>
  )
}
