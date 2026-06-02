import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Eye, Trophy, Crown } from "lucide-react"
import { casaFontVars } from "@/lib/acasaviews/fonts"
import { fetchParticipantsForGrid } from "@/lib/acasaviews/participants-live"
import { ParticipantCard } from "@/features/acasaviews/components/acasaviews/participants/participant-card"
import { AdminCasaToolbar } from "@/features/acasaviews/components/acasaviews/admin-store-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rankings | A Casa Views",
  description:
    "Os rankings ao vivo da Casa Views: a audiência (o 9º jogador) e os participantes que dominam a temporada.",
}

interface RankingLink {
  href: string
  kicker: string
  title: string
  desc: string
  icon: typeof Eye
  accent: "cyan" | "magenta" | "gold"
}

const LINKS: RankingLink[] = [
  {
    href: "/acasaviews/ranking-audiencia",
    kicker: "o 9º jogador",
    title: "Ranking da Audiência",
    desc: "O público que mais move o jogo: teorias, comentários e engajamento ao vivo.",
    icon: Eye,
    accent: "cyan",
  },
  {
    href: "/acasaviews/ranking-participantes",
    kicker: "o dia de hoje",
    title: "Ranking dos Participantes",
    desc: "A pontuação crua do dia: views, likes, comentários, salvamentos e shares somados.",
    icon: Trophy,
    accent: "magenta",
  },
  {
    href: "/acasaviews/ranking-geral",
    kicker: "a temporada",
    title: "Ranking Geral",
    desc: "Cada dia fecha valendo pontos por posição (8/7/6/5/4). Consistência vence o pico viral.",
    icon: Crown,
    accent: "gold",
  },
]

export default async function RankingsLandingPage() {
  const participants = await fetchParticipantsForGrid()
  return (
    <div className={`${casaFontVars} casa-rank casa-paper relative min-h-screen overflow-hidden`}>
      <div className="casa-dots pointer-events-none absolute right-0 top-20 h-40 w-40 opacity-[0.07]" />
      <div className="casa-dots pointer-events-none absolute left-0 bottom-10 h-32 w-32 opacity-[0.06]" />

      {/* topo / marca */}
      <header className="relative mx-auto flex max-w-5xl items-center justify-end px-5 pt-8 md:px-10">
        <span className="casa-tape inline-block -rotate-2 px-3 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]">
          ao vivo
        </span>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-5 pb-4 pt-10 md:px-10 md:pt-14">
        <p className="casa-marker text-2xl text-[var(--magenta)] md:text-3xl">A Casa Views apresenta</p>
        <h1 className="casa-display mt-1 text-[18vw] leading-[0.84] text-[var(--ink)] sm:text-[8rem] md:text-[10rem]">
          RANKINGS
        </h1>
        <p className="mt-5 max-w-2xl casa-body text-base font-semibold text-[var(--ink-soft)]/75 md:text-lg">
          Dois jogos, um placar ao vivo. Escolha onde entrar:{" "}
          <span className="casa-hl casa-hl-magenta font-bold text-white">a audiência</span> que move a narrativa ou os{" "}
          <span className="casa-hl font-bold">participantes</span> que dominam a temporada.
        </p>
      </section>

      {/* 2 botões */}
      <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-16 pt-6 md:grid-cols-3 md:px-10">
        {LINKS.map((l) => {
          const accentVar =
            l.accent === "cyan" ? "var(--cyan)" : l.accent === "gold" ? "var(--gold)" : "var(--magenta)"
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className="group relative flex flex-col gap-4 border-2 border-[var(--ink)] bg-white p-6 shadow-[6px_6px_0_0_var(--ink)] transition-transform duration-200 hover:-translate-y-1.5 hover:-rotate-[0.5deg] md:p-7"
            >
              {/* selo de canto */}
              <span
                className="absolute -right-2 -top-2 flex h-10 w-10 rotate-6 items-center justify-center border-2 border-[var(--ink)] casa-display text-lg text-[var(--ink)]"
                style={{ background: accentVar }}
              >
                <Icon className="h-5 w-5" />
              </span>

              <span
                className="inline-block w-fit -rotate-1 border-2 border-[var(--ink)] px-2 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]"
                style={{ background: accentVar }}
              >
                {l.kicker}
              </span>

              <h2 className="casa-display text-4xl leading-[0.9] text-[var(--ink)] md:text-5xl">{l.title}</h2>
              <p className="casa-body text-sm font-semibold leading-relaxed text-[var(--ink-soft)]/70">{l.desc}</p>

              <span
                className="mt-1 inline-flex items-center gap-2 casa-body text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]"
                style={{ color: accentVar }}
              >
                Ver ranking
                <ArrowRight className="h-5 w-5 text-[var(--ink)] transition-transform group-hover:translate-x-1" />
              </span>

              {/* barra de cor inferior */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1.5"
                style={{ background: accentVar }}
              />
            </Link>
          )
        })}
      </section>

      {/* grid de participantes */}
      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--ink)] pb-3">
          <div>
            <p className="casa-marker text-2xl text-[var(--cyan)]">quem está jogando</p>
            <h2 className="casa-display text-4xl leading-[0.85] text-[var(--ink)] md:text-5xl">OS PARTICIPANTES</h2>
          </div>
          <AdminCasaToolbar />
        </div>

        {participants.length === 0 ? (
          <div className="border-2 border-dashed border-[var(--ink)]/30 bg-white/50 px-6 py-14 text-center">
            <p className="casa-display text-3xl text-[var(--ink)]/70">EM BREVE</p>
            <p className="mt-2 casa-body text-sm font-semibold text-[var(--ink-soft)]/60">
              Os dossiês dos participantes ainda estão sendo montados. Volte logo.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {participants.map((p) => (
              <ParticipantCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-12 md:px-10">
        <div className="border-t-2 border-[var(--line)] pt-5 casa-body text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]/50">
          Casa Views · placar ao vivo · atualiza sozinho
        </div>
      </footer>
    </div>
  )
}
