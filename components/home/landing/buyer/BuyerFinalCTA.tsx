import Link from "next/link"
import { Section } from "@/components/home/landing"
import { AudienceCrossLink } from "@/components/home/landing/AudienceCrossLink"

export function BuyerFinalCTA() {
  return (
    <Section className="text-center">
      <h2 className="fl-display text-4xl text-[#0B0B0D] sm:text-5xl">
        Encontre quem você precisa hoje
      </h2>
      <div className="mt-7 flex flex-col items-center gap-3">
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-7 py-3 text-sm font-bold text-[#1A1505] shadow-[5px_5px_0_0_#0B0B0D] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#F2B705] active:translate-y-0 active:shadow-[2px_2px_0_0_#0B0B0D]"
        >
          Encontrar agora
        </Link>
        <AudienceCrossLink href="/">
          É profissional ou influenciador? Ganhe dinheiro
        </AudienceCrossLink>
      </div>
    </Section>
  )
}
