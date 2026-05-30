import { Sparkles, Film, Heart, Scissors, Building2 } from "lucide-react"

const CARDS = [
  {
    icon: Sparkles,
    title: "Conteúdo Humano",
    text: "Participantes reais, emoções reais e decisões que mudam a história.",
    accent: "text-fuchsia-300",
    ring: "ring-fuchsia-400/15",
  },
  {
    icon: Film,
    title: "Storytelling Diário",
    text: "Cada dia termina com uma pergunta para manter o público voltando.",
    accent: "text-violet-300",
    ring: "ring-violet-400/15",
  },
  {
    icon: Heart,
    title: "Engajamento Orgânico",
    text: "Views, likes e comentários não são apenas métricas. Eles viram parte do jogo.",
    accent: "text-cyan-300",
    ring: "ring-cyan-400/15",
  },
  {
    icon: Scissors,
    title: "Cortes Nativos",
    text: "Cada quadro nasce pensado para Reels, Shorts, TikTok, Kwai, YouTube e lives.",
    accent: "text-amber-300",
    ring: "ring-amber-400/15",
  },
  {
    icon: Building2,
    title: "Marca na História",
    text: "A marca deixa de interromper o conteúdo e passa a viver dentro dele.",
    accent: "text-rose-300",
    ring: "ring-rose-400/15",
  },
]

export default function MarketOpportunitySection() {
  return (
    <section className="relative bg-[#06060c] py-28 md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.08),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
          <span className="h-px w-10 bg-violet-400/60" />
          <span>Tese de mercado</span>
        </div>

        <div className="mt-8 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Conteúdo humano e original{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                voltou a ser vantagem
              </span>
              .
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              As plataformas estão reduzindo espaço para conteúdo genérico, repetitivo e pouco
              transformado. Ao mesmo tempo, conteúdos com presença humana real, narrativa,
              participação do público e alto potencial de cortes ganham mais valor.
            </p>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              A Casa Views nasce exatamente nesse momento: um formato original, humano, gamificado
              e feito para gerar conteúdo todos os dias.
            </p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className={`group relative overflow-hidden rounded-2xl bg-white/[0.03] p-6 backdrop-blur-xl ring-1 ${card.ring} transition-all duration-500 hover:bg-white/[0.05]`}
              >
                <Icon className={`h-5 w-5 ${card.accent}`} />
                <h3 className="mt-6 text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.text}</p>
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
