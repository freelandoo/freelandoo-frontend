/**
 * MoneyPathCards (2) — "Como você quer ganhar dinheiro?"
 * 5 caminhos: Afiliado, Cursos, Produtos, Serviços, Influenciador.
 * Server component puro: entrada via data-stagger/data-card (useScrollReveal
 * roda no RevealMount client da página). Hover é CSS (group-hover).
 * Variância editorial: offsets verticais + leve rotação (sem grid de 3 iguais).
 */
import Link from "next/link"
import { ArrowUpRight, Ticket, GraduationCap, Package, Briefcase, Megaphone } from "lucide-react"
import { MONEY_PATHS } from "./tokens"
import { Section, SectionHeading, DoodleArrow } from "./primitives"

const ICONS: Record<string, typeof Ticket> = {
  afiliado: Ticket,
  cursos: GraduationCap,
  produtos: Package,
  servicos: Briefcase,
  influenciador: Megaphone,
}

// offsets/rotação por índice para quebrar a grade
const OFFSET = ["lg:translate-y-6", "lg:-translate-y-2", "lg:translate-y-8", "lg:translate-y-0", "lg:translate-y-5"]
const ROT = ["-1deg", "1.2deg", "-0.8deg", "1deg", "-1.4deg"]

export function MoneyPathCards() {
  return (
    <Section id="ganhar" className="pt-6">
      <div className="relative mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading kicker="Como você quer ganhar dinheiro?">
          Escolha seu caminho dentro da Freelandoo.
        </SectionHeading>
        <DoodleArrow dir="down-right" className="hidden h-12 w-24 shrink-0 text-[#E6A800] md:block" />
      </div>

      <div
        data-stagger
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-5 lg:items-start"
      >
        {MONEY_PATHS.map((p, i) => {
          const Icon = ICONS[p.id]
          return (
            <Link
              key={p.id}
              href={p.href}
              data-card
              className={`group relative flex min-w-[78%] shrink-0 snap-center flex-col overflow-hidden rounded-3xl fl-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-24px_rgba(20,17,11,0.4)] sm:min-w-[46%] md:min-w-0 ${OFFSET[i]}`}
              style={{ transform: `rotate(${ROT[i]})` }}
            >
              {/* Topo 9:16-ish (visual de cor + ícone) */}
              <div
                className="relative aspect-[4/5] w-full overflow-hidden"
                style={{ background: `linear-gradient(160deg, ${p.accent} 0%, ${p.accent}cc 60%, ${p.accent}99 100%)` }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='70' viewBox='0 0 40 70'%3E%3Cg fill='none' stroke='white' stroke-width='1.5'%3E%3Cpolygon points='20,2 38,12 38,32 20,42 2,32 2,12'/%3E%3C/g%3E%3C/svg%3E\")",
                    backgroundSize: "40px 70px",
                  }}
                />
                <Icon className="absolute left-5 top-5 h-9 w-9 text-white drop-shadow" strokeWidth={2.2} />
                <span className="absolute bottom-4 left-5 text-xs font-black uppercase tracking-[0.18em] text-white/90">
                  {p.kicker}
                </span>
                <ArrowUpRight className="absolute right-4 top-4 h-7 w-7 rounded-full bg-white/20 p-1 text-white transition-transform duration-300 group-hover:rotate-45" />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-black leading-tight text-[#14110B]">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B6457]">{p.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#14110B]">
                  {p.cta}
                  <ArrowUpRight className="h-4 w-4 text-[#E6A800] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}
