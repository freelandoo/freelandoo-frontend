"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ShieldCheck, Star } from "lucide-react"
import { Section, YellowHighlight, AvatarStack } from "@/components/home/landing"
import { EditableImage } from "@/components/site-assets/EditableImage"

/** CTA sólida com dropshadow amarelo + animação (identidade tabloide). */
const CTA_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-6 py-3 text-sm font-bold text-[#1A1505] shadow-[4px_4px_0_0_#0B0B0D] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705] active:translate-y-0 active:shadow-[2px_2px_0_0_#0B0B0D]"

export function BuyerHero() {
  const router = useRouter()
  const [q, setQ] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search")
  }

  return (
    <Section className="pt-10 sm:pt-14">
      <div className="mx-auto max-w-[820px] text-center">
        <h1 className="fl-display text-5xl leading-[0.95] text-[#0B0B0D] sm:text-6xl md:text-7xl">
          Encontre <YellowHighlight mark>profissionais</YellowHighlight> e{" "}
          <YellowHighlight mark>influenciadores</YellowHighlight>
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-base text-[#3a352c] sm:text-lg">
          Contrate serviços, compre de criadores e feche com influenciadores — com
          pagamento protegido e avaliações reais, tudo num lugar só.
        </p>

        <form onSubmit={submit} className="mx-auto mt-8 flex max-w-[560px] items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-white px-4 py-3 shadow-[4px_4px_0_0_#0B0B0D]">
            <Search className="h-5 w-5 shrink-0 text-[#0B0B0D]/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="O que você precisa? (ex: fotógrafo, edição de vídeo…)"
              className="w-full bg-transparent text-sm text-[#0B0B0D] outline-none placeholder:text-[#0B0B0D]/40"
              aria-label="Buscar profissionais, influenciadores ou produtos"
            />
          </div>
          <button type="submit" className={`${CTA_CLASS} shrink-0`}>
            Encontrar
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-[#3a352c]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#0B0B0D]" /> Pagamento protegido
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 text-[#0B0B0D]" /> Avaliações reais
          </span>
          <span className="inline-flex items-center gap-1.5">
            <AvatarStack count={4} /> Profissionais perto de você
          </span>
        </div>
      </div>

      {/* Banner editável (admin troca clicando) */}
      <div className="mx-auto mt-10 max-w-[1100px]">
        <EditableImage
          slot="home_buyer_hero"
          className="aspect-[16/5] w-full rounded-2xl border-2 border-[#0B0B0D] shadow-[6px_6px_0_0_#F2B705]"
        />
      </div>
    </Section>
  )
}
