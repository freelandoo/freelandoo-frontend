"use client"

import { TrendingUp, Users, LineChart, Swords, FileText } from "lucide-react"
import { AnimatedCounter } from "./animated-counter"

const CARDS = [
  {
    icon: TrendingUp,
    title: "Ranking dos Participantes",
    text: "Mede o desempenho dos participantes com base em views, likes e comentários dos posts.",
    color: "text-fuchsia-300",
    ring: "ring-fuchsia-400/15",
  },
  {
    icon: Users,
    title: "Ranking da Audiência",
    text: "Valoriza comentários relevantes, com respostas, curtidas e força narrativa.",
    color: "text-cyan-300",
    ring: "ring-cyan-400/15",
  },
  {
    icon: LineChart,
    title: "Métricas que importam",
    text: "Views, likes, comentários, retenção, evolução diária e performance por plataforma.",
    color: "text-violet-300",
    ring: "ring-violet-400/15",
  },
  {
    icon: Swords,
    title: "Placar Homens × Mulheres",
    text: "A rivalidade entre grupos gera comparação, torcida e conversa orgânica.",
    color: "text-amber-300",
    ring: "ring-amber-400/15",
  },
  {
    icon: FileText,
    title: "Relatórios para marcas",
    text: "A temporada gera dados de alcance, engajamento e conteúdos criados para patrocinadores.",
    color: "text-rose-300",
    ring: "ring-rose-400/15",
  },
]

export default function RankingTechnologySection() {
  return (
    <section className="relative bg-[#06060c] py-28 md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span className="h-px w-10 bg-cyan-400/60" />
              <span>Tecnologia de ranking</span>
            </div>
            <h2 className="mt-8 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Tecnologia que transforma audiência em{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
                protagonista
              </span>
              .
            </h2>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
              A Casa Views usa rankings para transformar engajamento em consequência narrativa. A
              audiência deixa de assistir passivamente e passa a interferir na história.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.025] p-6 backdrop-blur-xl ring-1 ring-white/[0.08]">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <span>Dashboard · Live</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
                  Em tempo real
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Views</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-fuchsia-300">
                    <AnimatedCounter to={2840000} />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">+18% nas últimas 24h</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Engajamento</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-cyan-300">
                    <AnimatedCounter to={9.4} decimals={1} suffix="%" />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Acima da média do segmento</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Cortes gerados</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-violet-300">
                    <AnimatedCounter to={147} />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Em 7 dias de jogo</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Audiência ativa</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-300">
                    <AnimatedCounter to={62} suffix="%" />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Comenta, vota, indica</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <span>Placar — Homens × Mulheres</span>
                  <span className="font-mono text-slate-400">live</span>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="bg-gradient-to-r from-cyan-400/80 to-cyan-300/60" style={{ width: "46%" }} />
                  <div className="bg-gradient-to-r from-fuchsia-400/60 to-fuchsia-400/80" style={{ width: "54%" }} />
                </div>
                <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-slate-400">
                  <span>♂ 46%</span>
                  <span>♀ 54%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {CARDS.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.title}
                className={`rounded-2xl bg-white/[0.025] p-6 backdrop-blur-xl ring-1 ${c.ring} transition-all hover:bg-white/[0.04]`}
              >
                <Icon className={`h-5 w-5 ${c.color}`} />
                <h3 className="mt-6 text-base font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
