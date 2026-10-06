import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BarChart3, Crown, Globe, ShoppingBag, Users } from "lucide-react"
import { fetchParticipantsForGrid, type ParticipantCard } from "@/lib/acasaviews/participants-live"
import { fetchGeneralRanking, type GeneralEntry } from "@/lib/acasaviews/ranking-geral"
import { fetchLiveRanking } from "@/lib/acasaviews/ranking-live"
import type { AudienceEntry } from "@/lib/acasaviews/ranking-data"
import { AdminCasaToolbar } from "@/features/acasaviews/components/acasaviews/admin-store-button"
import { RealityMotion } from "@/features/acasaviews/components/reality/reality-motion"
import { RealityStage } from "@/features/acasaviews/components/reality/reality-stage"
import { TiltCard } from "@/features/acasaviews/components/reality/tilt-card"
import { ScoreCounter } from "@/features/acasaviews/components/reality/score-counter"
import { PlayingRail, type RailItem } from "@/features/acasaviews/components/reality/playing-rail"
import { compactBR, pad2 } from "@/features/acasaviews/components/reality/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rankings | A Casa Views",
  description:
    "Os rankings ao vivo da Casa Views: a audiência (o 9º jogador), o placar do dia e a temporada inteira.",
}

type GameCard = {
  n: string
  href: string
  title: [string, string]
  desc: string
  icon: typeof Users
  photo: string | null
  /** quem está na foto (quando a foto é de alguém) */
  photoLabel: string | null
}

/** Ordena pelo placar do dia: quem casou com o módulo primeiro, por posição. */
function byLivePosition(list: ParticipantCard[]): ParticipantCard[] {
  return [...list].sort((a, b) => {
    const pa = a.live.matched && a.live.posicao ? a.live.posicao : Infinity
    const pb = b.live.matched && b.live.posicao ? b.live.posicao : Infinity
    return pa - pb
  })
}

export default async function RankingsLandingPage() {
  const [participants, season, live] = await Promise.all([
    fetchParticipantsForGrid(),
    fetchGeneralRanking().catch(() => [] as GeneralEntry[]),
    fetchLiveRanking().catch(() => ({ audience: [] as AudienceEntry[], participants: [] })),
  ])
  const ordered = byLivePosition(participants)
  const matched = ordered.filter((p) => p.live.matched)
  const dayLeader = matched[0] ?? null
  const seasonLeader = season[0] ?? null
  const audienceLeader = live.audience[0] ?? null
  const topPoints = matched[0]?.live.pontuacao || 0
  const year = new Date().getFullYear()

  const cards: GameCard[] = [
    {
      n: "01",
      href: "/acasaviews/ranking-audiencia",
      title: ["Ranking da", "Audiência"],
      desc: "O público que move o jogo: teorias, comentários e engajamento ao vivo.",
      icon: BarChart3,
      photo: audienceLeader?.avatar || null,
      photoLabel: audienceLeader ? `1º da audiência · ${audienceLeader.name}` : null,
    },
    {
      n: "02",
      href: "/acasaviews/ranking-participantes",
      title: ["Ranking dos", "Participantes"],
      desc: "A pontuação crua do dia: views, likes, comentários, salvamentos e shares somados.",
      icon: Users,
      photo: dayLeader?.avatar_url || dayLeader?.cover_url || null,
      photoLabel: dayLeader ? `líder hoje · ${dayLeader.display_name}` : null,
    },
    {
      n: "03",
      href: "/acasaviews/ranking-geral",
      title: ["Ranking", "Geral"],
      desc: "Cada dia fecha valendo pontos por posição (8/7/6/5/4). Consistência vence o jogo viral.",
      icon: Crown,
      photo: seasonLeader?.avatar_url || null,
      photoLabel: seasonLeader ? `líder da temporada · ${seasonLeader.display_name}` : null,
    },
  ]

  const railParticipants: RailItem[] = ordered.map((p) => ({
    id: p.id,
    rank: p.live.matched && p.live.posicao ? p.live.posicao : null,
    name: p.display_name,
    img: p.avatar_url || p.cover_url || null,
    score: p.live.matched ? p.live.pontuacao : null,
    href: `/acasaviews/participantes/${p.slug}`,
    stats: p.live.matched
      ? [
          { kind: "views", value: p.live.views },
          { kind: "likes", value: p.live.likes },
        ]
      : [],
  }))
  const railAudience: RailItem[] = live.audience.slice(0, 24).map((a) => ({
    id: a.id,
    rank: a.rank,
    name: a.name,
    img: a.avatar || null,
    score: a.points,
    href: null,
    stats: [
      { kind: "likes", value: a.likes },
      { kind: "comments", value: a.comments },
    ],
  }))

  return (
    <div className="rv rv-page-in" suppressHydrationWarning>
      <RealityMotion />

      {/* ═══════════════ HERÓI ═══════════════ */}
      <section className="rv-grid rv-noise relative overflow-hidden">
        {/* faixas de luz diagonais (vidro) nas bordas — pintadas uma vez */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <span className="rv-streak -left-40 top-24 h-24 w-[520px]" />
          <span className="rv-streak -left-24 top-[340px] h-10 w-[420px] opacity-60" />
          <span className="rv-streak -right-44 top-10 h-20 w-[520px]" />
          <span className="rv-streak rv-streak-pink -right-16 top-[360px] h-3 w-[360px]" />
          <span className="rv-streak rv-streak-pink -left-10 top-[520px] h-2 w-[300px]" />
        </div>

        {/* "+" técnicos */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden md:block">
          <span className="rv-plus left-8 top-8" />
          <span className="rv-plus left-[44%] top-[46%]" />
          <span className="rv-plus right-10 top-[50%]" />
          <span className="rv-plus right-[30%] top-[18%]" />
        </div>

        {/* cubo de vidro rosa (WebGPU → WebGL2 → SVG) */}
        <RealityStage
          variant="cube"
          className="rv-stage-glow absolute -right-[22%] top-0 z-[1] h-[300px] w-[90%] opacity-60 sm:h-[360px] md:-right-[6%] md:top-0 md:h-[380px] md:w-[52%] md:opacity-100 lg:right-[4%] lg:w-[34%]"
        />

        <div className="relative z-[2] mx-auto max-w-[1600px] px-4 pb-8 pt-8 md:px-8 md:pt-12">
          <div className="grid gap-6 lg:grid-cols-[150px_minmax(0,1fr)_260px] lg:gap-8">
            {/* bloco técnico */}
            <div className="hidden lg:block" data-rv="left">
              <p className="rv-type mt-6 text-[13px] uppercase leading-[1.45] tracking-[0.18em]">
                A Casa
                <br />
                Views
                <br />
                Reality
                <br />
                Social
              </p>
              <span aria-hidden className="rv-barcode mt-3 block h-10 w-[96px]" />
              <p className="rv-type mt-1 text-[8px] tracking-[0.3em] text-[var(--rv-faint)]">0 7 3 4 8 9 2 1 1 4</p>
              <p className="rv-type mt-2 flex items-center gap-3 text-[13px] tracking-[0.12em]">
                {year} <span className="text-[var(--rv-pink)]">›</span>
                <span className="text-[var(--rv-pink)]">✦</span>
              </p>
            </div>

            {/* manchete — a fonte é medida pela COLUNA (cqw), não pela janela:
                o rv-grunge pinta a tinta com background-clip e a máscara de
                entrada recorta na caixa do h1, então letra que passa da
                borda fica transparente (era o "S" sumindo atrás do cubo). */}
            <div className="relative min-w-0 [container-type:inline-size]">
              <Crown
                aria-hidden
                className="absolute -left-3 -top-4 hidden h-7 w-7 -rotate-12 fill-[var(--rv-pink)] text-[var(--rv-pink)] lg:block"
              />
              <h1
                data-rv="mask"
                className="rv-wide rv-grunge whitespace-nowrap text-[12.6cqw] leading-[0.82]"
              >
                Rankings
              </h1>

              <div className="mt-4 flex items-center gap-1" data-rv style={{ ["--rv-delay" as string]: "120ms" }}>
                <p className="rv-arrowbar rv-type bg-[var(--rv-pink)] py-1.5 pl-3 pr-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--rv-bg)] md:text-[15px]">
                  Dois jogos, um placar ao vivo.
                </p>
                <span aria-hidden className="rv-type text-xl font-bold text-[var(--rv-pink)]">»</span>
              </div>
              <p
                className="rv-type mt-4 max-w-[46ch] text-[13px] uppercase leading-relaxed tracking-[0.06em] md:text-[15px]"
                data-rv
                style={{ ["--rv-delay" as string]: "200ms" }}
              >
                Escolha onde entrar: a audiência que move a narrativa ou os participantes que dominam a temporada.
              </p>
            </div>

            {/* legenda da fórmula + selo técnico (ao lado do cubo) */}
            <div className="relative z-[3] flex items-end justify-between gap-6 lg:flex-col lg:items-end lg:justify-start lg:pt-24">
              <div
                className="border border-[var(--rv-white)] bg-[rgba(5,5,5,0.7)] px-3 py-2.5 lg:mr-28"
                data-rv
                style={{ ["--rv-delay" as string]: "260ms" }}
              >
                <p className="rv-type text-[10px] uppercase leading-[1.7] tracking-[0.12em]">
                  Views
                  <br />
                  Likes
                  <br />
                  Comentários
                  <br />
                  Shares
                  <br />
                  <span className="text-[var(--rv-pink-ink)]">= Pontos</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Globe aria-hidden className="h-6 w-6 text-[var(--rv-pink)]" strokeWidth={1.5} />
                <p className="rv-type text-right text-[10px] uppercase leading-[1.5] tracking-[0.14em] text-[var(--rv-muted)]">
                  Reality
                  <br />
                  social
                  <br />
                  em tempo
                  <br />
                  real.
                </p>
              </div>
            </div>
          </div>

          {/* ═══ os três jogos ═══ */}
          <div className="mt-10 grid gap-6 md:mt-14 md:grid-cols-3 md:gap-5 xl:gap-8">
            {cards.map((c, i) => (
              <GameCardView key={c.href} c={c} delay={i * 90} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ QUEM ESTÁ JOGANDO ═══════════════ */}
      <section id="participantes" className="relative border-t border-[var(--rv-line)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="rv-streak -left-48 top-10 h-16 w-[460px] opacity-70" />
          <span className="rv-plus left-6 top-1/2" />
        </div>
        <div className="relative mx-auto max-w-[1600px] px-4 py-10 md:px-8 md:py-14">
          <PlayingRail participants={railParticipants} audience={railAudience} />
          <div className="mt-6 flex justify-end">
            <AdminCasaToolbar />
          </div>
        </div>
      </section>

      {/* ═══════════════ PLACAR EM BARRAS ═══════════════ */}
      {matched.length > 0 && (
        <section className="border-t border-[var(--rv-line)]">
          <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-14 md:grid-cols-[minmax(0,24rem)_1fr] md:px-8 md:py-20">
            <div data-rv="left">
              <p className="rv-type text-[11px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">agora · ao vivo</p>
              <h2 className="rv-wide rv-grunge mt-2 text-6xl leading-[0.85] md:text-7xl">
                Placar
                <br />
                do dia
              </h2>
              <p className="rv-type mt-4 text-[12px] uppercase leading-relaxed text-[var(--rv-muted)]">
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
                    <span className={`rv-wide text-4xl leading-none ${i === 0 ? "text-[var(--rv-pink)]" : "rv-outline"}`}>
                      {pad2(p.live.posicao || i + 1)}
                    </span>
                    <div className="min-w-0">
                      <Link href={`/acasaviews/participantes/${p.slug}`} className="rv-link rv-display block truncate text-2xl md:text-3xl">
                        {p.display_name}
                      </Link>
                      <div className="mt-1.5 h-1.5 w-full bg-[var(--rv-surface-3)]">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? "var(--rv-pink)" : "var(--rv-white)",
                            boxShadow: i === 0 ? "0 0 12px rgba(255,0,122,0.7)" : undefined,
                          }}
                        />
                      </div>
                      <p className="rv-type mt-1 text-[10px] text-[var(--rv-faint)]">
                        {compactBR(p.live.views)} views · {compactBR(p.live.likes)} likes · {compactBR(p.live.comments)} coment.
                      </p>
                    </div>
                    <ScoreCounter value={p.live.pontuacao} className="rv-type text-lg font-bold" />
                  </li>
                )
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ═══════════════ CONVENIÊNCIA (chamada) ═══════════════ */}
      <section className="mx-auto max-w-[1600px] px-4 pb-16 md:px-8">
        <Link href="/acasaviews/conveniencia" data-rv className="rv-frame rv-frame-pink group block [--c:26px]">
          <div className="rv-frame-in relative grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-10">
            <span aria-hidden className="rv-glitch-stripes absolute -right-10 top-0 h-full w-56 opacity-20" />
            <div className="relative">
              <p className="rv-type text-[11px] uppercase tracking-[0.2em] text-[var(--rv-pink-ink)]">loja oficial</p>
              <p className="rv-wide mt-2 text-[8.4vw] leading-[0.9] md:text-5xl lg:text-6xl">
                Conveniência <span className="text-[var(--rv-pink)]">Views</span>
              </p>
              <p className="rv-type mt-3 max-w-lg text-[12px] uppercase leading-relaxed text-[var(--rv-muted)]">
                Compre e escolha quem você apoia — cada venda fica registrada no nome do participante.
              </p>
            </div>
            <span className="rv-glow-box relative inline-flex items-center gap-3 bg-[var(--rv-pink)] px-5 py-3 rv-type text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--rv-white)] transition-transform group-hover:-translate-y-1">
              <ShoppingBag className="h-4 w-4" /> Entrar na loja
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      </section>

      <footer className="border-t border-[var(--rv-line)]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-6 md:px-8">
          <span className="rv-type text-[10px] uppercase text-[var(--rv-faint)]">Casa Views · placar ao vivo · atualiza sozinho</span>
          <Link href="/casa-views-regulamento" className="rv-link rv-type text-[11px] uppercase text-[var(--rv-muted)]">
            Regulamento
          </Link>
        </div>
      </footer>
    </div>
  )
}

/**
 * Cartão de um dos três jogos, na composição da referência: foto P&B em cima,
 * número e ícone rosa nos cantos, painel branco cortado com o título em duas
 * cores, seta redonda e a faixa rosa "VER RANKING" no pé.
 *
 * ⚠️ A foto é sempre de GENTE DE VERDADE: o 1º da audiência, o líder do dia
 * e o líder da temporada. A referência usa arte de banco (olho, rosto,
 * coroa); sem a pessoa, o card cai num desenho do ícone em vez de inventar
 * um rosto.
 */
function GameCardView({ c, delay }: { c: GameCard; delay: number }) {
  const Icon = c.icon
  return (
    <div data-rv style={{ ["--rv-delay" as string]: `${delay}ms` }}>
      <TiltCard className="h-full" max={4}>
        <Link href={c.href} className="group block h-full" aria-label={`${c.title.join(" ")}: ver ranking`}>
          <div className="rv-frame h-full [--c:28px]">
            <div className="rv-frame-in flex flex-col">
              {/* foto */}
              <div className="relative h-44 shrink-0 overflow-hidden md:h-36 lg:h-44 xl:h-52">
                {c.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photo}
                    alt=""
                    loading="lazy"
                    className="rv-photo absolute inset-0 h-full w-full object-cover object-[50%_30%]"
                  />
                ) : (
                  <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[var(--rv-surface-2)]">
                    <span className="rv-halftone absolute inset-0 opacity-25" />
                    <Icon className="relative h-24 w-24 text-[var(--rv-white)] opacity-20" strokeWidth={1} />
                  </span>
                )}
                <span aria-hidden className="rv-photo-tint" />
                <span aria-hidden className="rv-scan absolute inset-0" />
                {/* listras rosa de glitch */}
                <span aria-hidden className="rv-glitch-stripes absolute bottom-0 right-0 h-14 w-[42%] opacity-80" />
                <span aria-hidden className="absolute bottom-6 right-[14%] h-2 w-24 bg-[var(--rv-pink)]" />
                {/* número */}
                <span className="rv-wide absolute left-0 top-0 z-[3] bg-[var(--rv-bg)] py-1.5 pl-4 pr-5 text-[26px] leading-none md:text-[30px]">
                  {c.n}
                </span>
                <span
                  aria-hidden
                  className="absolute left-[70px] top-0 z-[2] h-full w-12 -skew-x-[30deg] md:left-[80px]"
                  style={{ background: "repeating-linear-gradient(90deg, rgba(5,5,5,0.85) 0 3px, transparent 3px 7px)" }}
                />
                {/* ícone */}
                <span className="rv-glow-box absolute right-4 top-4 z-[3] flex h-12 w-12 items-center justify-center bg-[var(--rv-pink)] md:h-14 md:w-14">
                  <Icon className="h-6 w-6 text-[var(--rv-bg)] md:h-7 md:w-7" strokeWidth={2.5} />
                </span>
                {c.photoLabel && (
                  <span className="rv-type absolute left-0 top-[52px] z-[3] max-w-[60%] truncate bg-[var(--rv-bg)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--rv-white)]">
                    {c.photoLabel}
                  </span>
                )}
              </div>

              {/* painel branco */}
              <div className="relative flex min-h-0 flex-1 flex-col">
                <span
                  aria-hidden
                  className="absolute -top-5 right-0 h-10 w-[30%] bg-[var(--rv-pink)]"
                  style={{ clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)" }}
                />
                <div
                  className="relative -mt-5 flex flex-1 flex-col bg-[var(--rv-white)] px-5 pb-0 pt-4 text-[var(--rv-bg)] md:px-6"
                  style={{ clipPath: "polygon(0 0, 78% 0, 86% 20px, 100% 20px, 100% 100%, 0 100%)" }}
                >
                  <h3 className="rv-title-shift rv-display text-[clamp(1.7rem,2.9vw,2.9rem)] leading-[0.86]">
                    {c.title[0]}
                    <br />
                    <span className="text-[var(--rv-pink)]">{c.title[1]}</span>
                  </h3>
                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <p className="rv-type max-w-[30ch] text-[10px] uppercase leading-[1.5] tracking-[0.04em] md:text-[11px]">
                      {c.desc}
                    </p>
                    <span
                      data-avatar
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--rv-bg)] transition-colors group-hover:bg-[var(--rv-pink)] group-hover:text-[var(--rv-white)] md:h-12 md:w-12"
                    >
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                    </span>
                  </div>
                  {/* faixa VER RANKING */}
                  <div className="relative -mx-5 mt-auto pt-3 md:-mx-6">
                    <span
                      className="rv-type flex w-[74%] items-center bg-[var(--rv-pink)] py-2 pl-5 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--rv-bg)] md:pl-6 md:text-[13px]"
                      style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 28px) 100%, 0 100%)" }}
                    >
                      Ver ranking
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </TiltCard>
    </div>
  )
}
