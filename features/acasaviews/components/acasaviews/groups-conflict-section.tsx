import { ShieldAlert, Swords, Coins, GitMerge, EyeOff } from "lucide-react"

const CARDS = [
  {
    icon: Swords,
    title: "1 sabotador por grupo",
    text: "Um homem. Uma mulher. Identidade conhecida apenas pela produção.",
    color: "text-fuchsia-300",
    ring: "ring-fuchsia-400/15",
  },
  {
    icon: EyeOff,
    title: "Missões secretas",
    text: "Tarefas que precisam ser executadas sem deixar pistas para o próprio grupo.",
    color: "text-rose-300",
    ring: "ring-rose-400/15",
  },
  {
    icon: Coins,
    title: "Risco de perder saldo",
    text: "Se o sabotador não cumpre a missão, ele perde o próprio Saldo Secreto.",
    color: "text-amber-300",
    ring: "ring-amber-400/15",
  },
  {
    icon: GitMerge,
    title: "Alianças cruzadas permitidas",
    text: "Acordos secretos entre grupos opostos transformam a casa em três jogos paralelos.",
    color: "text-cyan-300",
    ring: "ring-cyan-400/15",
  },
]

export default function GroupsConflictSection() {
  return (
    <section className="relative bg-[#06060c] py-28 md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.06),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,0.06),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span className="h-px w-10 bg-cyan-400/60" />
              <span>Homens × Mulheres</span>
            </div>
            <h2 className="mt-8 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Dois grupos. Dois{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-rose-300 bg-clip-text text-transparent">
                sabotadores
              </span>
              . Uma casa em disputa.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              A casa começa dividida entre homens e mulheres. Essa separação cria rivalidade
              imediata, torcida, comparação e disputa narrativa. Mas o jogo permite traições,
              alianças cruzadas e sabotagem interna.
            </p>
            <p className="mt-3 text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              Cada grupo terá um sabotador. Se eles não cumprirem a missão, perdem o próprio saldo.
            </p>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent p-7 ring-1 ring-cyan-400/25 backdrop-blur-xl md:p-9">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-cyan-500/15 p-2 text-2xl text-cyan-200 ring-1 ring-cyan-400/30">
                  ♂
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/80">
                  Grupo Homens
                </span>
              </div>
              <ShieldAlert className="h-4 w-4 text-rose-300" />
            </div>
            <p className="mt-5 text-balance text-2xl font-semibold leading-tight text-white">
              4 participantes
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Pontuam em conjunto, disputam rankings e tentam dominar a narrativa do dia.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 ring-1 ring-rose-400/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
                1 sabotador entre eles
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500/15 via-fuchsia-500/5 to-transparent p-7 ring-1 ring-fuchsia-400/25 backdrop-blur-xl md:p-9">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-fuchsia-500/15 p-2 text-2xl text-fuchsia-200 ring-1 ring-fuchsia-400/30">
                  ♀
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/80">
                  Grupo Mulheres
                </span>
              </div>
              <ShieldAlert className="h-4 w-4 text-rose-300" />
            </div>
            <p className="mt-5 text-balance text-2xl font-semibold leading-tight text-white">
              4 participantes
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Pontuam em conjunto, disputam rankings e tentam dominar a narrativa do dia.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 ring-1 ring-rose-400/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
                1 sabotadora entre elas
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.title}
                className={`rounded-2xl bg-white/[0.025] p-5 backdrop-blur-xl ring-1 ${c.ring}`}
              >
                <Icon className={`h-5 w-5 ${c.color}`} />
                <h3 className="mt-5 text-sm font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{c.text}</p>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm italic text-slate-400">
          “Todo mundo escolhe um lado. Até alguém trair.”
        </p>
      </div>
    </section>
  )
}
