/**
 * FinalCTA — chamada final dark: foto de grupo + headline poster + botão gold.
 * Server component puro; entrada via data-reveal.
 */
import { ArrowRight } from "lucide-react"
import { LINKS } from "./tokens"
import { GoldButton, PhotoFrame, HiveDoodle, Squiggle, DoodleArrow, HoneycombField, DoodleCrown, Halftone, WashiTape } from "./primitives"
import { EditableImage } from "@/components/site-assets/EditableImage"
import { EditableText } from "@/components/site-texts/EditableText"

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-5 py-20 sm:px-8 md:py-28">
      <HoneycombField opacity={0.05} />
      <Halftone className="absolute left-6 top-10 hidden h-24 w-24 opacity-20 lg:block" />
      <div className="relative mx-auto grid w-full max-w-[1180px] items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div data-reveal className="relative">
          <EditableImage
            slot="home_seller_cta"
            slotConfig={{ aspectRatio: 5 / 4, outputWidth: 1250, outputHeight: 1000 }}
            className="aspect-[5/4] w-full"
            sizes="(min-width: 768px) 45vw, 100vw"
            fallback={
              <PhotoFrame src="/landing/cta-grupo.png" alt="Pessoas felizes ganhando com a Freelandoo" ready torn cut className="h-full w-full" />
            }
          />
          <WashiTape className="-left-2 top-8" rotate={-12} />
          <Squiggle className="absolute -left-3 -top-4 h-8 w-24 text-[#F2B705]" />
          <HiveDoodle className="absolute -bottom-4 -right-3 h-14 w-14 text-[#F2B705]" />
        </div>

        <div data-reveal className="relative">
          <DoodleCrown className="mb-3 h-12 w-16 text-[#F2B705]" />
          <DoodleArrow dir="left" className="absolute -right-2 -top-8 hidden h-10 w-24 text-[#F2B705] lg:block" />
          <h2 className="fl-display text-4xl text-[#F5F1E8] sm:text-5xl md:text-[3.4rem]">
            <EditableText
              as="span"
              slot="home_seller_final_headline"
              fallback="Serviços, cursos, produtos, afiliados, influenciadores e oportunidades. *Tudo em um só lugar.*"
            />
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#C9C2B6]">
            <EditableText
              as="span"
              mark={false}
              slot="home_seller_final_subcopy"
              fallback="A Freelandoo é para quem quer vender, ensinar, aprender e ganhar mais todos os dias."
            />
          </p>
          <GoldButton href={LINKS.cadastro} className="group mt-8 px-7 py-4 text-base">
            <EditableText as="span" slot="home_seller_final_cta" fallback="Entrar na Freelandoo e começar agora" />
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </GoldButton>
        </div>
      </div>
    </section>
  )
}
