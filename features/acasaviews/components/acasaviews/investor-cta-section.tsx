import { ArrowRight, Layers, Calendar, Film, Users, Building2, GitBranch } from "lucide-react"

const PILLARS = [
  { icon: Layers, label: "Formato licenciável" },
  { icon: Calendar, label: "Temporadas temáticas" },
  { icon: Film, label: "Alto volume de conteúdo" },
  { icon: Users, label: "Audiência ativa" },
  { icon: Building2, label: "Marcas dentro da narrativa" },
  { icon: GitBranch, label: "Potencial de franquia" },
]

export default function InvestorCTASection() {
  return (
    <section id="investidor" className="relative overflow-hidden bg-[#06060c] py-28 md:py-40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.10),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:80px_80px]" />

      <div className="relative mx-auto max-w-6xl px-6 text-center md:px-10">
        <div className="inline-flex items-center gap-3 rounded-full bg-white/[0.04] px-4 py-1.5 ring-1 ring-white/10 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
          <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
            Proposta de investimento
          </span>
        </div>

        <h2 className="mx-auto mt-8 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
          A primeira temporada pode{" "}
          <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
            virar formato
          </span>
          .
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
          A Casa Views foi desenhada para ser replicável, patrocinável e licenciável. O objetivo
          não é apenas produzir um reality. É criar uma propriedade de mídia com temporadas,
          marcas, creators, comunidades e produtos derivados.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="mailto:contato@studioviews.com?subject=Proposta%20A%20Casa%20Views"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-black transition-all hover:bg-white/90"
          >
            Quero conhecer a proposta
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="https://www.instagram.com/studioviews.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-7 py-3.5 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-xl transition-all hover:bg-white/[0.08]"
          >
            Falar com Studio Views
          </a>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {PILLARS.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.label}
                className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-xl ring-1 ring-white/[0.08] transition-all hover:ring-white/[0.16]"
              >
                <Icon className="mx-auto h-5 w-5 text-fuchsia-300" />
                <p className="mt-4 text-xs font-medium leading-snug text-slate-200">{p.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
