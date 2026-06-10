/**
 * MoneyPathCards — "Escolha seu caminho dentro da Freelandoo."
 * 5 cards brancos com foto + selo dourado de ícone. Server component puro;
 * entrada via data-stagger/data-card (RevealMount). Hover = CSS.
 */
import { MONEY_PATHS } from "./tokens"
import { Section, PhotoFrame, Icon, CardButton, DoodleArrow, Squiggle, Halftone } from "./primitives"
import { EditableImage } from "@/components/site-assets/EditableImage"
import { EditableText } from "@/components/site-texts/EditableText"

export function MoneyPathCards() {
  return (
    <Section id="caminhos" className="pt-4">
      <div className="relative mb-14 text-center">
        <Squiggle className="absolute -top-3 left-1/4 hidden h-7 w-20 text-[#F2B705]/70 md:block" />
        <p className="fl-marker mb-1 text-2xl font-bold text-[#F2B705]">
          <EditableText as="span" mark={false} slot="home_seller_paths_eyebrow" fallback="escolha o seu" />
        </p>
        <h2 className="fl-display mx-auto max-w-2xl text-4xl text-[#F5F1E8] sm:text-5xl md:text-6xl">
          <EditableText as="span" slot="home_seller_paths_heading" fallback="Seu caminho dentro da *Freelandoo.*" />
        </h2>
        <DoodleArrow dir="down-right" className="absolute -right-2 top-0 hidden h-10 w-20 text-[#F2B705] lg:block" />
      </div>

      <div data-stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {MONEY_PATHS.map((p) => (
          <div
            key={p.id}
            data-card
            className="group mp-card relative flex flex-col overflow-hidden fl-card"
          >
            <div className="relative">
              <EditableImage
                slot={`home_seller_path_${String(p.id).replace(/[^a-z0-9_]/gi, "")}`}
                slotConfig={{ aspectRatio: 3 / 4, outputWidth: 900, outputHeight: 1200 }}
                className="aspect-[3/4] w-full"
                sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
                fallback={
                  <PhotoFrame src={p.photo} alt={`Caminho ${p.kicker} na Freelandoo`} icon={p.icon} ready className="h-full w-full" />
                }
              />
              <Halftone className="absolute right-2 top-2 h-10 w-10 opacity-30" />
              <span className="absolute -bottom-5 left-4 flex h-12 w-12 items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]">
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 pt-8">
              <h3 className="text-lg font-black uppercase tracking-wide text-[#0B0B0D]">
                <EditableText
                  as="span"
                  slot={`home_seller_path_${String(p.id).replace(/[^a-z0-9_]/gi, "")}_kicker`}
                  fallback={p.kicker}
                />
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B6457]">
                <EditableText
                  as="span"
                  slot={`home_seller_path_${String(p.id).replace(/[^a-z0-9_]/gi, "")}_desc`}
                  fallback={p.desc}
                />
              </p>
              <CardButton href={p.href} className="mt-4 self-start">Começar</CardButton>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
