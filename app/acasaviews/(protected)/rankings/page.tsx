import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Crown, Eye, ShoppingBag, Trophy } from "lucide-react"
import { fetchParticipantsForGrid, type ParticipantCard } from "@/lib/acasaviews/participants-live"
import { fetchGeneralRanking, type GeneralEntry } from "@/lib/acasaviews/ranking-geral"
import { AdminCasaToolbar } from "@/features/acasaviews/components/acasaviews/admin-store-button"
import { MotionGate, RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { RealityStage } from "@/features/acasaviews/components/reality/reality-stage"
import { TiltCard } from "@/features/acasaviews/components/reality/tilt-card"
import { TextScramble } from "@/features/acasaviews/components/reality/text-scramble"
import { ScoreCounter } from "@/features/acasaviews/components/reality/score-counter"
import { ParticipantReelCard } from "@/features/acasaviews/components/reality/participant-reel-card"
import { compactBR, pad2 } from "@/features/acasaviews/components/reality/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rankings | A Casa Views",
  description:
    "Os rankings ao vivo da Casa Views: a audiência (o 9º jogador), o placar do dia e a temporada inteira.",
}

/** A fórmula do placar do dia — é o que o módulo de ranking soma. */
const FORMULA = ["views", "likes", "comentários", "salvos", "shares"]

type RankingType = {
  n: string
  href: string
  kicker: string
  title: [string, string]
  desc: string
  icon: typeof Eye
  tone: "pink" | "white" | "yellow"
}

const TYPES: RankingType[] = [
  {
    n: "01",
    href: "/acasaviews/ranking-audiencia",
    kicker: "o 9º jogador",
    title: ["Ranking da", "Audiência"],
    desc: "O público que mais move o jogo: teorias, comentários e engajamento ao vivo.",
    icon: Eye,
    tone: "white",
  },
  {
    n: "02",
    href: "/acasaviews/ranking-participantes",
    kicker: "o dia de hoje",
    title: ["Ranking dos", "Participantes"],
    desc: "A pontuação crua do dia: views, likes, comentários, salvamentos e shares somados.",
    icon: Trophy,
    tone: "pink",
  },
  {
    n: "03",
    href: "/acasaviews/ranking-geral",
    kicker: "a temporada",
    title: ["Ranking", "Geral"],
    desc: "Cada dia fecha valendo pontos por posição (8/7/6/5/4). Consistência vence o pico viral.",
    icon: Crown,
    tone: "yellow",
  },
]

/** Ordena pelo placar do dia: quem casou com o módulo primeiro, por posição. */
function byLivePosition(list: ParticipantCard[]): ParticipantCard[] {
  return [...list].sort((a, b) => {
    const pa = a.live.matched && a.live.posicao ? a.live.posicao : Infinity
    const pb = b.live.matched && b.live.posicao ? b.live.posicao : Infinity
    return pa - pb
  })
}

export default async function RankingsLandingPage() {
  const [participants, season] = await Promise.all([
    fetchParticipantsForGrid(),
    fetchGeneralRanking().catch(() => [] as GeneralEntry[]),
  ])
  const ordered = byLivePosition(participants)
  const matched = ordered.filter((p) => p.live.matched)
  const dayLeader = matched[0] ?? null
  const seasonLeader = season[0] ?? null
  const totals = matched.reduce(
    (acc, p) => {
      acc.views += p.live.views
      acc.likes += p.live.likes
      acc.comments += p.live.comments
      acc.shares += p.live.shares
      acc.points += p.live.pontuacao
      return acc
    },
    { views: 0, likes: 0, comments: 0, shares: 0, points: 0 },
  )
  const inHouse = participants.filter((p) => p.status === "active" || p.status === "finalist").length
  const topPoints = matched[0]?.live.pontuacao || 0
  const year = new Date().getFullYear()

  return (
    <div className="rv rv-page-in" suppressHydrationWarning>
      <MotionGate />
      <RealityMotion />

      {/* ═══════════════ HERÓI ═══════════════ */}
      <section className="rv-grid rv-noise relative overflow-hidden border-b border-[var(--rv-line)]">
        {/* palco 3D — sai parcialmente da tela à direita, de propósito */}
        <RealityStage className="absolute -right-[34%] top-4 z-0 h-[340px] w-[115%] opacity-60 md:-right-[18%] md:top-[6%] md:h-[78%] md:w-[62%] md:opacity-100 lg:-right-[6%] lg:w-[52%]" />

        {/* HUD: marcações técnicas */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden md:block">
          <span className="rv-mono absolute right-8 top-6 text-[10px] text-[var(--rv-faint)]">LIVE DATA · {year}</span>
          <span className="absolute right-[34%] top-[18%] h-4 w-4 border-l border-t border-[var(--rv-pink)]" />
          <span className="absolute right-8 top-[62%] h-4 w-4 border-b border-r border-[var(--rv-pink)]" />
          <span className="rv-mono absolute bottom-8 right-8 text-right text-[10px] leading-relaxed text-[var(--rv-faint)]">
            SOCIAL SCORE
            <br />
            {matched.length ? `${matched.length} perfis no placar` : "aguardando placar"}
          </span>
          <span className="absolute left-0 top-1/2 h-px w-16 bg-[var(--rv-pink)]" />
        </div>

        <div className="relative z-[2] mx-auto max-w-[1440px] px-4 pb-14 pt-10 md:px-8 md:pb-20 md:pt-14">
          <div className="flex flex-wrap items-center gap-2" data-rv>
            <span className="rv-sticker rv-sticker-pink -rotate-2">
              <span className="rv-live-dot" aria-hidden style={{ background: "var(--rv-white)" }} />
              <TextScramble text="placar ao vivo" />
            </span>
            <span className="rv-sticker rotate-1">reality social</span>
            <span className="rv-mono text-[11px] text-[var(--rv-muted)]">TEMPORADA {year} · EM TEMPO REAL</span>
          </div>

          <p className="rv-script mt-8 text-3xl text-[var(--rv-pink-ink)] md:text-4xl" data-rv>
            A Casa Views apresenta
          </p>
          <h1
            data-rv="mask"
            className="rv-display -ml-1 mt-1 text-[clamp(5.2rem,21vw,15.5rem)] leading-[0.8] text-[var(--rv-white)]"
          >
            Rankings
          </h1>

          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,30rem)_1fr] md:items-end">
            <div data-rv style={{ ["--rv-delay" as string]: "120ms" }}>
              <p className="rv-display text-3xl leading-[0.9] md:text-4xl">
                Dois jogos,
                <br />
                <span className="text-[var(--rv-pink)]">um placar ao vivo.</span>
              </p>
              <p className="mt-4 max-w-md text-[15px] font-semibold leading-relaxed text-[var(--rv-muted)]">
                Escolha onde entrar: a <strong className="text-[var(--rv-white)]">audiência</strong> que move a narrativa ou os{" "}
                <strong className="text-[var(--rv-white)]">participantes</strong> que dominam a temporada.
              </p>

              {/* a fórmula */}
              <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-l-2 border-[var(--rv-pink)] pl-3">
                {FORMULA.map((f, i) => (
                  <span key={f} className="flex items-center gap-2">
                    <span className="rv-label text-[var(--rv-white)]">{f}</span>
                    {i < FORMULA.length - 1 && <span className="rv-mono text-[var(--rv-pink)]">+</span>}
                  </span>
                ))}
                <span className="rv-mono text-[var(--rv-pink)]">=</span>
                <span className="bg-[var(--rv-yellow)] px-1.5 py-0.5 rv-label text-[var(--rv-bg)]">pontos</span>
              </div>
            </div>

            {/* números reais do dia */}
            <dl
              data-rv
              style={{ ["--rv-delay" as string]: "220ms" }}
              className="grid grid-cols-2 gap-px self-end border border-[var(--rv-line-strong)] bg-[var(--rv-line-strong)] sm:grid-cols-4 md:max-w-xl md:justify-self-end"
            >
              <HeroStat label="na casa" value={inHouse} compact={false} />
              {matched.length > 0 ? (
                <>
                  <HeroStat label="views hoje" value={totals.views} />
                  <HeroStat label="likes hoje" value={totals.likes} />
                  <HeroStat label="pontos no ar" value={totals.points} accent />
                </>
              ) : (
                // Sem placar casado não há número para mostrar: três zeros
                // fingiriam um dia sem audiência, que é outra coisa.
                <div className="col-span-1 flex items-center gap-2 bg-[var(--rv-bg)] px-4 py-3 sm:col-span-3">
                  <span className="rv-live-dot" aria-hidden />
                  <span className="rv-label text-[var(--rv-muted)]">placar abrindo — os números chegam das redes</span>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAIXA ═══════════════ */}
      <div className="rv-marquee border-b border-[var(--rv-bg)] bg-[var(--rv-pink)] py-2.5 text-[var(--rv-white)]" aria-hidden>
        <div className="rv-marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="flex items-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="rv-display flex items-center gap-4 pr-4 text-xl tracking-wide md:text-2xl">
                  VIEWS + LIKES + COMENTÁRIOS + SALVOS + SHARES = PONTOS
                  <span className="text-[var(--rv-bg)]">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════ OS TRÊS JOGOS ═══════════════ */}
      <section className="mx-auto max-w-[1440px] px-4 py-14 md:px-8 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4" data-rv>
          <div>
            <p className="rv-script text-2xl text-[var(--rv-pink-ink)]">escolha o placar</p>
            <h2 className="rv-display text-5xl md:text-7xl">Três placares</h2>
          </div>
          <p className="rv-mono max-w-xs text-[11px] leading-relaxed text-[var(--rv-faint)]">
            {"// audiência · dia · temporada"}
            <br />
            atualiza sozinho
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {TYPES.map((t, i) => (
            <RankingTypeCard
              key={t.href}
              t={t}
              delay={i * 90}
              leader={
                t.n === "02" && dayLeader
                  ? { name: dayLeader.display_name, avatar: dayLeader.avatar_url, label: "líder hoje" }
                  : t.n === "03" && seasonLeader
                    ? { name: seasonLeader.display_name, avatar: seasonLeader.avatar_url, label: "líder da temporada" }
                    : null
              }
            />
          ))}
        </div>
      </section>

      {/* ═══════════════ QUEM ESTÁ JOGANDO ═══════════════ */}
      <section id="participantes" className="relative border-y border-[var(--rv-line)] bg-[var(--rv-surface)] py-14 md:py-20">
        <div aria-hidden className="rv-halftone pointer-events-none absolute right-0 top-0 h-48 w-48 opacity-20" />
        <div className="relative mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rv-line-strong)] pb-4" data-rv>
            <div>
              <p className="rv-script text-2xl text-[var(--rv-pink-ink)]">quem está jogando</p>
              <h2 className="rv-display text-5xl leading-[0.85] md:text-7xl">
                Os participantes
                <span className="rv-mono ml-3 align-top text-sm text-[var(--rv-faint)]">[{pad2(participants.length)}]</span>
              </h2>
            </div>
            <AdminCasaToolbar />
          </div>

          {participants.length === 0 ? (
            <EmptyBlock title="Ainda não tem ninguém aqui." text="Os dossiês dos participantes ainda estão sendo montados. Volte logo." />
          ) : (
            <div className="rv-rail [grid-auto-columns:82%] sm:[grid-auto-columns:46%] lg:[grid-auto-columns:calc((100%-48px)/4)]">
              {ordered.map((p, i) => (
                <ParticipantReelCard key={p.id} p={p} delay={Math.min(i, 6) * 70} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ PLACAR EM BARRAS ═══════════════ */}
      {matched.length > 0 && (
        <section className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 md:grid-cols-[minmax(0,22rem)_1fr] md:px-8 md:py-20">
          <div data-rv="left">
            <p className="rv-script text-2xl text-[var(--rv-pink-ink)]">agora</p>
            <h2 className="rv-display text-6xl leading-[0.85] md:text-8xl">
              Placar
              <br />
              ao vivo
            </h2>
            <p className="mt-4 text-sm font-semibold text-[var(--rv-muted)]">
              Pontos do dia, relativos a quem lidera. Os números vêm direto das redes — a barra só mostra a distância.
            </p>
            <Link href="/acasaviews/ranking-participantes" className="rv-btn mt-6">
              Ranking completo <ArrowRight className="rv-arrow h-4 w-4" />
            </Link>
          </div>

          <ol className="flex flex-col">
            {matched.slice(0, 6).map((p, i) => {
              const pct = topPoints > 0 ? Math.max(4, Math.round((p.live.pontuacao / topPoints) * 100)) : 0
              return (
                <li
                  key={p.id}
                  data-rv
                  style={{ ["--rv-delay" as string]: `${i * 60}ms` }}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-[var(--rv-line)] py-3"
                >
                  <span className={`rv-display text-5xl leading-none ${i === 0 ? "text-[var(--rv-pink)]" : "rv-outline"}`}>
                    {pad2(p.live.posicao || i + 1)}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/acasaviews/participantes/${p.slug}`} className="rv-link rv-display block truncate text-2xl md:text-3xl">
                      {p.display_name}
                    </Link>
                    <div className="mt-1.5 h-1.5 w-full bg-[var(--rv-surface-3)]">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, background: i === 0 ? "var(--rv-pink)" : "var(--rv-white)" }}
                      />
                    </div>
                    <p className="rv-mono mt-1 text-[10px] text-[var(--rv-faint)]">
                      {compactBR(p.live.views)} views · {compactBR(p.live.likes)} likes · {compactBR(p.live.comments)} coment.
                    </p>
                  </div>
                  <ScoreCounter value={p.live.pontuacao} className="rv-mono text-lg font-semibold" />
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* ═══════════════ CONVENIÊNCIA (chamada) ═══════════════ */}
      <section className="mx-auto max-w-[1440px] px-4 pb-16 md:px-8">
        <Link
          href="/acasaviews/conveniencia"
          data-rv
          className="rv-cut group relative grid items-center gap-6 overflow-hidden bg-[var(--rv-yellow)] p-6 text-[var(--rv-bg)] md:grid-cols-[1fr_auto] md:p-10"
        >
          <div>
            <p className="rv-script text-3xl text-[var(--rv-pink)]">loja oficial</p>
            <p className="rv-display text-5xl leading-[0.85] md:text-7xl">Conveniência Views</p>
            <p className="mt-3 max-w-lg text-sm font-bold">
              Compre e escolha quem você apoia — cada venda fica registrada no nome do participante.
            </p>
          </div>
          <span className="inline-flex items-center gap-3 border-2 border-[var(--rv-bg)] bg-[var(--rv-bg)] px-5 py-3 rv-label text-[11px] text-[var(--rv-white)] transition-transform group-hover:-translate-y-1">
            <ShoppingBag className="h-4 w-4 text-[var(--rv-yellow)]" /> Entrar na loja
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
          <span aria-hidden className="rv-display pointer-events-none absolute -bottom-10 right-40 hidden text-[180px] leading-none opacity-10 md:block">
            $
          </span>
        </Link>
      </section>

      <footer className="border-t border-[var(--rv-line)]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 md:px-8">
          <span className="rv-mono text-[10px] text-[var(--rv-faint)]">CASA VIEWS · PLACAR AO VIVO · ATUALIZA SOZINHO</span>
          <Link href="/casa-views-regulamento" className="rv-link rv-label text-[var(--rv-muted)]">
            Regulamento
          </Link>
        </div>
      </footer>
    </div>
  )
}

function HeroStat({ label, value, accent = false, compact = true }: { label: string; value: number; accent?: boolean; compact?: boolean }) {
  return (
    <div className="bg-[var(--rv-bg)] px-4 py-3">
      <dt className="rv-label text-[9px] text-[var(--rv-faint)]">{label}</dt>
      <dd className={`rv-display mt-1 text-4xl leading-none ${accent ? "text-[var(--rv-pink-ink)]" : ""}`}>
        <ScoreCounter value={value} compact={compact} />
      </dd>
    </div>
  )
}

function RankingTypeCard({
  t,
  delay,
  leader,
}: {
  t: RankingType
  delay: number
  leader: { name: string; avatar: string | null; label: string } | null
}) {
  const Icon = t.icon
  const accent = t.tone === "pink" ? "var(--rv-pink)" : t.tone === "yellow" ? "var(--rv-yellow)" : "var(--rv-white)"
  return (
    <div data-rv style={{ ["--rv-delay" as string]: `${delay}ms` }}>
      <TiltCard className="rv-cut h-full border border-[var(--rv-line-strong)] bg-[var(--rv-surface-2)]">
        <Link href={t.href} className="group relative flex aspect-[4/5] flex-col overflow-hidden p-5 md:aspect-square md:p-6">
          {/* fundo: retrato real do líder (P&B) ou textura técnica */}
          {leader?.avatar ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={leader.avatar} alt="" loading="lazy" className="rv-photo absolute inset-0 h-full w-full object-cover opacity-45" />
              <span aria-hidden className="rv-photo-tint" />
            </>
          ) : (
            <span aria-hidden className="rv-halftone absolute inset-0 opacity-[0.12]" />
          )}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(160deg, rgba(5,5,5,0.15) 20%, rgba(5,5,5,0.94) 78%)" }}
          />
          <span aria-hidden className="rv-scan absolute inset-0" />

          <div className="relative z-[3] flex items-start justify-between">
            <span className="rv-display text-[84px] leading-[0.8]" style={{ color: "transparent", WebkitTextStroke: `1.5px ${accent}` }}>
              {t.n}
            </span>
            <span className="flex h-11 w-11 rotate-6 items-center justify-center border-2 border-[var(--rv-bg)]" style={{ background: accent }}>
              <Icon className="h-5 w-5 text-[var(--rv-bg)]" />
            </span>
          </div>

          <div className="relative z-[3] mt-auto">
            <span
              className="inline-block -rotate-1 px-2 py-0.5 rv-label text-[9px] text-[var(--rv-bg)]"
              style={{ background: accent }}
            >
              {t.kicker}
            </span>
            <h3 className="rv-title-shift rv-display mt-3 text-[44px] leading-[0.86] md:text-[52px]">
              {t.title[0]}
              <br />
              {t.title[1]}
            </h3>
            <p className="mt-3 text-[13px] font-semibold leading-relaxed text-[var(--rv-muted)]">{t.desc}</p>
            {leader && (
              <p className="rv-mono mt-3 text-[10px] text-[var(--rv-white)]">
                <span className="text-[var(--rv-faint)]">{leader.label.toUpperCase()} →</span> {leader.name}
              </p>
            )}
            <span className="mt-4 flex items-center justify-between border-t border-[var(--rv-line-strong)] pt-3 rv-label text-[11px]">
              Ver ranking
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" style={{ color: accent }} />
            </span>
          </div>
        </Link>
      </TiltCard>
    </div>
  )
}

function EmptyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-dashed border-[var(--rv-line-strong)] px-6 py-14 text-center">
      <p className="rv-display text-4xl">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--rv-muted)]">{text}</p>
    </div>
  )
}
