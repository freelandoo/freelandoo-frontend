/**
 * MoneyPathCards — "Escolha seu caminho dentro da Freelandoo."
 * 5 cards brancos com foto + selo dourado de ícone. Server component puro;
 * entrada via data-stagger/data-card (RevealMount). Hover = CSS.
 */
import { MONEY_PATHS } from "./tokens"
import { Section, YellowHighlight, PhotoFrame, Icon, CardButton, DoodleArrow, Squiggle } from "./primitives"

export function MoneyPathCards() {
  return (
    <Section id="caminhos" className="pt-4">
      <div className="relative mb-12 text-center">
        <Squiggle className="absolute -top-2 left-2 hidden h-7 w-20 text-[#F2B705]/70 md:block" />
        <h2 className="fl-display mx-auto max-w-2xl text-4xl text-[#F5F1E8] sm:text-5xl">
          Escolha seu caminho dentro da <YellowHighlight>Freelandoo.</YellowHighlight>
        </h2>
        <DoodleArrow dir="down-right" className="absolute -right-2 top-0 hidden h-10 w-20 text-[#F2B705] lg:block" />
      </div>

      <div data-stagger className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5">
        {MONEY_PATHS.map((p) => (
          <div
            key={p.id}
            data-card
            className="group flex min-w-[74%] shrink-0 snap-center flex-col overflow-hidden rounded-3xl fl-card transition-transform duration-300 hover:-translate-y-1.5 sm:min-w-[44%] md:min-w-0"
          >
            <div className="relative">
              <PhotoFrame src={p.photo} alt={`Caminho ${p.kicker} na Freelandoo`} icon={p.icon} className="aspect-[4/5] w-full" />
              <span className="absolute -bottom-5 left-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2B705] text-[#1A1505] shadow-[0_10px_24px_-10px_rgba(242,183,5,0.9)]">
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 pt-8">
              <h3 className="text-lg font-black uppercase tracking-wide text-[#14110B]">{p.kicker}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B6457]">{p.desc}</p>
              <CardButton href={p.href} className="mt-4 self-start">Começar</CardButton>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
