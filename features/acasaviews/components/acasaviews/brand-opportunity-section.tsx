import { Megaphone, Tv, Sparkles } from "lucide-react"

const PHASES = [
  {
    label: "Pré-reality",
    icon: Megaphone,
    items: ["Anúncio da parceria", "Casting", "Bastidores", "Aquecimento", "Contagem regressiva"],
    accent: "text-fuchsia-300",
    ring: "ring-fuchsia-400/15",
    bar: "from-fuchsia-400 via-fuchsia-400 to-fuchsia-400/0",
    dot: "bg-fuchsia-400",
  },
  {
    label: "Durante",
    icon: Tv,
    items: [
      "Quadros diários",
      "Provas patrocinadas",
      "Ranking",
      "Cortes",
      "Collabs",
      "Stories",
      "Presença visual na casa",
    ],
    accent: "text-violet-300",
    ring: "ring-violet-400/15",
    bar: "from-violet-400 via-violet-400 to-violet-400/0",
    dot: "bg-violet-400",
  },
  {
    label: "Pós-reality",
    icon: Sparkles,
    items: [
      "Melhores momentos",
      "Encontros com participantes",
      "Conteúdo derivado",
      "Ativações",
      "Comunidade engajada",
    ],
    accent: "text-cyan-300",
    ring: "ring-cyan-400/15",
    bar: "from-cyan-400 via-cyan-400 to-cyan-400/0",
    dot: "bg-cyan-400",
  },
]

export default function BrandOpportunitySection() {
  return (
    <section className="relative bg-[#06060c] py-28 md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,70,239,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span className="h-px w-10 bg-fuchsia-400/60" />
              <span>Oportunidade para marcas</span>
            </div>
            <h2 className="mt-8 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Não é comprar anúncio.{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                É entrar na história.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              A marca pode participar da narrativa antes, durante e depois da temporada. Em vez de
              aparecer como interrupção, ela se torna parte do universo Casa Views.
            </p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PHASES.map((phase, i) => {
            const Icon = phase.icon
            return (
              <div
                key={phase.label}
                className={`relative overflow-hidden rounded-2xl bg-white/[0.025] p-7 backdrop-blur-xl ring-1 ${phase.ring}`}
              >
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${phase.bar}`} />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Fase {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className={`rounded-lg bg-white/[0.04] p-2 ring-1 ${phase.ring}`}>
                    <Icon className={`h-4 w-4 ${phase.accent}`} />
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-white">{phase.label}</h3>
                <ul className="mt-5 space-y-2.5">
                  {phase.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-300"
                    >
                      <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${phase.dot}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-violet-500/8 to-cyan-500/10 p-8 ring-1 ring-fuchsia-400/20 backdrop-blur-xl md:p-10">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">
            <span className="h-px w-10 bg-fuchsia-400/60" />
            <span>Frase de destaque</span>
          </div>
          <p className="mt-5 text-balance text-2xl font-semibold leading-snug tracking-tight text-white md:text-4xl">
            Uma cota não compra apenas mídia. Compra uma{" "}
            <span className="bg-gradient-to-r from-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              temporada inteira de presença estratégica
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
