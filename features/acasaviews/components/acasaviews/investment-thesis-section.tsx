import { Calendar, Film, Scissors, TrendingUp, Building2, Users } from "lucide-react"

const CARDS = [
  { icon: Calendar, label: "Uma temporada", hint: "compacta e episódica" },
  { icon: Film, label: "7 dias de acontecimentos", hint: "uma virada por dia" },
  { icon: Scissors, label: "Múltiplos cortes", hint: "nativos por quadro" },
  { icon: TrendingUp, label: "Ranking gamificado", hint: "consequência narrativa" },
  { icon: Building2, label: "Marca dentro da narrativa", hint: "não em intervalo" },
  { icon: Users, label: "Comunidade ativa", hint: "antes, durante e depois" },
]

export default function InvestmentThesisSection() {
  return (
    <section className="relative bg-[#06060c] py-28 md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,121,249,0.08),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(167,139,250,0.06),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span className="h-px w-10 bg-fuchsia-400/60" />
              <span>Tese de investimento</span>
            </div>
            <h2 className="mt-8 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Atenção virou{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                ativo
              </span>
              .
            </h2>
            <p className="mt-6 max-w-2xl text-pretty text-lg font-light leading-snug text-slate-200 md:text-xl">
              Quem controla narrativa controla engajamento.
            </p>
          </div>
          <div className="lg:col-span-5">
            <p className="text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              Marcas não precisam apenas aparecer. Elas precisam entrar em histórias que o público
              acompanha, comenta, defende, acusa e compartilha.
            </p>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              A Casa Views transforma uma temporada curta em múltiplos conteúdos: episódios,
              cortes, debates, rankings, teorias, bastidores e ativações patrocinadas.
            </p>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-violet-500/8 to-cyan-500/10 p-7 ring-1 ring-fuchsia-400/20 backdrop-blur-xl md:p-10">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
            <span className="h-px w-10 bg-fuchsia-400/60" />
            <span>Frase forte</span>
          </div>
          <p className="mt-5 text-balance text-3xl font-semibold leading-snug tracking-tight text-white md:text-5xl">
            Anúncio passa.{" "}
            <span className="bg-gradient-to-r from-fuchsia-200 via-rose-200 to-amber-200 bg-clip-text text-transparent">
              História fica.
            </span>
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {CARDS.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.label}
                className="rounded-2xl bg-white/[0.03] p-5 backdrop-blur-xl ring-1 ring-white/[0.08] transition-all hover:ring-white/[0.16]"
              >
                <Icon className="h-5 w-5 text-fuchsia-300" />
                <p className="mt-4 text-sm font-semibold leading-snug text-white">{c.label}</p>
                <p className="mt-1 text-[11px] text-slate-400">{c.hint}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
