import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight, Eye, Heart, MessageCircle, MessageSquare,
  Trophy, Vault, Flame, Camera, Lock, Sparkles, ShoppingBag, Crown, Gift,
  BarChart3, Check, ListChecks,
} from "lucide-react"
import { casaFontVars } from "@/lib/acasaviews/fonts"
import { fetchParticipantBySlug } from "@/lib/acasaviews/participants-live"
import { ConvenienceStore } from "@/features/acasaviews/components/acasaviews/participants/convenience-store"
import { AdminCasaToolbar } from "@/features/acasaviews/components/acasaviews/admin-store-button"

export const dynamic = "force-dynamic"

function accentVar(a: string) { return a === "cyan" ? "var(--cyan)" : a === "gold" ? "var(--gold)" : "var(--magenta)" }
const STATUS_LABEL: Record<string, string> = { active: "na casa", eliminated: "eliminado", finalist: "finalista", winner: "campeão" }
function brl(c: number) { return (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}
function pipes(s: string | null) { return (s || "").split("|").map((x) => x.trim()).filter(Boolean) }

export default async function ParticipantPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ compra?: string }> }) {
  const { slug } = await params
  const { compra } = await searchParams
  const p = await fetchParticipantBySlug(slug)
  if (!p) notFound()
  const accent = accentVar(p.accent_color)
  const live = p.live
  const nameWords = p.display_name.trim().split(/\s+/)
  const firstWord = nameWords[0]
  const restWords = nameWords.slice(1).join(" ")

  return (
    <div className={`${casaFontVars} casa-rank casa-paper relative min-h-screen overflow-hidden pb-10`}>
      <div className="casa-dots pointer-events-none absolute right-0 top-72 h-40 w-40 opacity-[0.06]" />

      {/* ── topo / marca ── */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-6 md:px-8">
        <Link href="/acasaviews/rankings" className="inline-flex items-center gap-2">
          <span className="border-2 border-[var(--ink)] bg-[var(--ink)] px-2 py-1 casa-display text-base leading-none text-white">casaviews<span style={{ color: accent }}>_</span></span>
        </Link>
        <div className="hidden items-center gap-3 md:flex">
          <AdminCasaToolbar only="store" />
          <Link href="/acasaviews/rankings" className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] transition-transform hover:-translate-y-0.5">
            ver participantes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ════════ HERO ════════ */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-6 px-5 pt-6 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:pt-8">
        {/* esquerda */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} /> ao vivo
            </span>
            <span className="casa-marker text-xl text-[var(--cyan)]">24h por dia, o jogo nunca para.</span>
          </div>

          <h1 className="casa-display text-[19vw] leading-[0.82] text-[var(--ink)] sm:text-[7rem] md:text-[8.5rem]">
            <span className="block">{firstWord}</span>
            {restWords && <span className="block" style={{ color: accent }}>{restWords}</span>}
          </h1>

          {p.tagline && (
            <span className="mt-3 inline-block -rotate-1 bg-[var(--ink)] px-3 py-1.5 casa-body text-sm font-bold text-white">
              {p.tagline}
            </span>
          )}

          {p.bio && (
            <p className="mt-4 max-w-lg casa-body text-base font-semibold leading-relaxed text-[var(--ink-soft)]/80">{p.bio}</p>
          )}

          <span className="mt-4 inline-block border-2 border-[var(--ink)] bg-white px-3 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">
            {STATUS_LABEL[p.status] || p.status}
          </span>
        </div>

        {/* direita — foto com recorte/fitas/rabiscos */}
        <div className="relative mx-auto w-full max-w-sm">
          {/* fundos rasgados */}
          <div aria-hidden className="absolute -left-2 top-6 h-[88%] w-3/4 -rotate-3" style={{ background: "var(--cyan)" }} />
          <div aria-hidden className="casa-torn-b absolute right-0 top-0 h-[94%] w-2/3 rotate-2" style={{ background: accent }} />
          {/* foto */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.avatar_url || p.cover_url || "/placeholder-user.jpg"}
              alt={p.display_name}
              className="relative z-10 mx-auto aspect-[3/4] w-full object-cover casa-cut"
            />
            <span className="absolute left-1/2 top-3 z-20 -translate-x-1/2 -rotate-2 border-2 border-[var(--ink)] bg-white px-3 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]">time</span>
            {p.quote && (
              <p className="absolute -right-1 bottom-6 z-20 max-w-[120px] casa-marker text-lg leading-tight text-[var(--ink)]">“{p.quote.length > 40 ? p.quote.slice(0, 40) + "…" : p.quote}”</p>
            )}
          </div>
          <Crown aria-hidden className="absolute -top-5 left-2 h-8 w-8 -rotate-12 text-[var(--ink)]" />
        </div>
      </section>

      {/* ════════ BARRA KPI (preta) ════════ */}
      <section className="relative z-10 mx-auto mt-7 max-w-6xl px-5 md:px-8">
        {!live.matched && (
          <p className="mb-2 inline-block -rotate-1 border border-[var(--ink)]/30 bg-white/60 px-3 py-1 casa-body text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/60">
            números ao vivo aparecem quando o participante é vinculado ao ranking
          </p>
        )}
        <div className="grid grid-cols-2 gap-px overflow-hidden border-2 border-[var(--ink)] bg-[var(--ink)] sm:grid-cols-3 lg:grid-cols-6">
          <KpiBar label="ranking geral" value={live.posicao ? `${live.posicao}º` : "—"} sub={live.posicao ? "no jogo" : ""} accent={accent} />
          <KpiBar label="pontos" value={compact(live.pontuacao)} sub="pts" accent={accent} />
          <KpiBar label="views" value={compact(live.views)} delta={live.matched ? live.views_pct_24h : null} accent={accent} icon={<Eye className="h-3.5 w-3.5" />} />
          <KpiBar label="likes" value={compact(live.likes)} delta={live.matched ? live.likes_pct_24h : null} accent={accent} icon={<Heart className="h-3.5 w-3.5" />} />
          <KpiBar label="comentários" value={compact(live.comments)} delta={live.matched ? live.comments_pct_24h : null} accent={accent} icon={<MessageCircle className="h-3.5 w-3.5" />} />
          <KpiBar label="saldo (cofre)" value={brl(p.vault_amount_cents)} sub="" accent="var(--gold)" />
        </div>
      </section>

      {/* ════════ GRID DE CARDS ════════ */}
      <div className="relative z-10 mx-auto mt-6 grid max-w-6xl gap-5 px-5 md:grid-cols-3 md:px-8">
        {/* Cofre (escuro) */}
        <div className="border-2 border-[var(--ink)] bg-[var(--ink)] p-5 text-white shadow-[6px_6px_0_0_var(--magenta)]">
          <div className="flex items-center gap-2 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/55"><Vault className="h-4 w-4" /> cofre / saldo</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="casa-display text-5xl" style={{ color: "var(--gold)" }}>{brl(p.vault_amount_cents)}</span>
            <span className="mb-1 casa-marker text-base text-[var(--cyan)]">em alta ↗</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-white/15 p-3">
              <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-white/45"><Camera className="h-3 w-3" /> capturas</div>
              <div className="casa-display text-3xl">{p.captures_count}</div>
              <div className="casa-body text-[10px] text-white/45">momentos</div>
            </div>
            <div className="border border-white/15 p-3">
              <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-white/45"><Eye className="h-3 w-3" /> suspeita</div>
              <div className="casa-display text-3xl">{p.suspicion_pct}%</div>
              <div className="casa-body text-[10px] text-white/45">{p.suspicion_pct >= 66 ? "alto" : p.suspicion_pct >= 33 ? "médio" : "baixo"}</div>
            </div>
          </div>
        </div>

        {/* Perfil narrativo */}
        <Block title="Perfil narrativo" icon={<Sparkles className="h-4 w-4" />} accent={accent}>
          <dl className="space-y-2">
            <Row label="Profissão" value={p.profession} />
            <Row label="Arquétipo" value={p.archetype} />
            <Row label="Força" pills={pipes(p.strengths)} accent={accent} />
            <Row label="Risco" pills={pipes(p.risks)} accent={accent} />
          </dl>
          {p.quote && (
            <blockquote className="mt-3 border-t border-[var(--line)] pt-3 casa-marker text-xl leading-snug text-[var(--ink)]">“{p.quote}”</blockquote>
          )}
        </Block>

        {/* Desempenho 24h */}
        <Block title="Desempenho (últimas 24h)" icon={<Flame className="h-4 w-4" />} accent={accent}
          chip={live.matched ? "em alta" : undefined}>
          {live.matched ? (
            <div className="space-y-3">
              <Perf icon={<Eye className="h-4 w-4" />} label="views" value={compact(live.views)} pct={live.views_pct_24h} />
              <Perf icon={<Heart className="h-4 w-4" />} label="likes" value={compact(live.likes)} pct={live.likes_pct_24h} />
              <Perf icon={<MessageCircle className="h-4 w-4" />} label="comentários" value={compact(live.comments)} pct={live.comments_pct_24h} />
              <div className="flex items-center gap-1 border-t border-[var(--line)] pt-3 casa-body text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/60">
                <BarChart3 className="h-3.5 w-3.5" /> dados ao vivo do ranking
              </div>
            </div>
          ) : (
            <p className="casa-body text-sm text-[var(--ink-soft)]/55">Sem dados ao vivo ainda — vincule o participante ao ranking.</p>
          )}
        </Block>

        {/* Jornada na casa */}
        {p.journey.length > 0 && (
          <div className="casa-torn-tb border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)] md:col-span-2">
            <div className="mb-3 flex items-center gap-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]"><ListChecks className="h-4 w-4" style={{ color: accent }} /> jornada na casa</div>
            <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
              {p.journey.map((j, i) => (
                <div key={j.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="casa-body text-[8px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]/50">{j.label || `dia ${i + 1}`}</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)]" style={{ background: i === p.journey.length - 1 ? accent : "white" }}>
                      <Check className="h-3.5 w-3.5 text-[var(--ink)]" />
                    </span>
                  </div>
                  {i < p.journey.length - 1 && <span className="mx-1 h-0.5 w-6 bg-[var(--ink)]/25" />}
                </div>
              ))}
            </div>
            {(() => { const last = p.journey[p.journey.length - 1]; return (
              <div className="border-l-4 bg-[var(--paper)] p-4" style={{ borderColor: accent }}>
                <div className="casa-body text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>{last.label || "destaque"}</div>
                <h4 className="casa-display text-xl leading-tight text-[var(--ink)]">{last.title}</h4>
                {last.description && <p className="mt-1 casa-body text-sm text-[var(--ink-soft)]/75">{last.description}</p>}
              </div>
            )})()}
          </div>
        )}

        {/* Termômetro de suspeita */}
        <Block title="Termômetro de suspeita" icon={<Flame className="h-4 w-4" />} accent={accent}>
          <SemiGauge pct={p.suspicion_pct} />
          <p className="mt-2 text-center casa-body text-xs font-semibold text-[var(--ink-soft)]/65">
            {p.suspicion_pct >= 66 ? "A audiência está de olho." : p.suspicion_pct >= 33 ? "O público está desconfiado, mas sem certeza." : "Tranquilidade — por enquanto."}
          </p>
        </Block>

        {/* Caixinha de segredos */}
        {p.secrets.length > 0 && (
          <Block title="Caixinha de segredos" icon={<Lock className="h-4 w-4" />} accent={accent}>
            <p className="-mt-2 mb-2 casa-body text-[11px] text-[var(--ink-soft)]/50">Mensagens anônimas da casa</p>
            <div className="space-y-2">
              {p.secrets.slice(0, 4).map((s, i) => {
                const Ic = [Eye, Crown, Heart, Sparkles][i % 4]
                return (
                  <div key={s.id} className="flex items-start gap-2 -rotate-[0.3deg] border border-[var(--ink)]/15 bg-white px-3 py-2 shadow-[2px_2px_0_0_var(--ink)]">
                    <div className="min-w-0 flex-1">
                      <p className="casa-body text-sm text-[var(--ink-soft)]/85">{s.content}</p>
                      <span className="casa-body text-[9px] uppercase tracking-[0.1em] text-[var(--ink-soft)]/40">({s.author_label})</span>
                    </div>
                    <Ic className="h-4 w-4 shrink-0" style={{ color: accent }} />
                  </div>
                )
              })}
            </div>
          </Block>
        )}

        {/* Teorias da audiência */}
        {p.theories.length > 0 && (
          <div className="border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)] md:col-span-2">
            <div className="mb-3 flex items-center gap-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]"><MessageSquare className="h-4 w-4" style={{ color: accent }} /> teorias da audiência</div>
            <p className="-mt-2 mb-3 casa-body text-[11px] text-[var(--ink-soft)]/50">As teorias que estão dominando o jogo.</p>
            <div className="space-y-3">
              {p.theories.slice(0, 4).map((t, i) => (
                <div key={t.id} className="flex items-start gap-3 border-b border-[var(--line)] pb-3 last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] casa-display text-xs text-[var(--ink)]" style={{ background: ["var(--cyan)", "var(--magenta)", "var(--gold)", "white"][i % 4] }}>{(t.author_label || "?").replace("@", "").slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="casa-body text-xs font-extrabold text-[var(--ink)]">{t.author_label.startsWith("@") ? t.author_label : `@${t.author_label}`}</span>
                      {i === 0 && <span className="casa-body text-[8px] font-extrabold uppercase tracking-[0.12em]" style={{ color: accent }}>• em alta</span>}
                    </div>
                    <p className="casa-body text-sm text-[var(--ink-soft)]/80">{t.content}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 casa-body text-xs font-bold text-[var(--ink-soft)]/60"><Heart className="h-4 w-4" style={{ color: accent }} /> {compact(t.votes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conveniência Views */}
        <div id="loja" className="border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)] md:col-span-3">
          <div className="mb-4 flex flex-wrap items-center gap-3 border-b-2 border-[var(--ink)] pb-3">
            <ShoppingBag className="h-6 w-6" style={{ color: accent }} />
            <div>
              <h2 className="casa-display text-2xl leading-none text-[var(--ink)] md:text-3xl">CONVENIÊNCIA VIEWS</h2>
              <p className="casa-body text-[11px] text-[var(--ink-soft)]/55">Mimos e recados que {firstWord} pode receber.</p>
            </div>
            <div className="ml-auto"><AdminCasaToolbar only="store" /></div>
          </div>
          {compra === "success" && <div className="mb-4 border-2 border-emerald-600 bg-emerald-50 px-4 py-3 casa-body text-sm font-bold text-emerald-700">✓ Compra confirmada! Obrigado por apoiar {p.display_name}.</div>}
          {compra === "cancel" && <div className="mb-4 border-2 border-[var(--ink)]/40 bg-white px-4 py-3 casa-body text-sm font-bold text-[var(--ink-soft)]/70">Compra cancelada. Tente de novo quando quiser.</div>}
          <ConvenienceStore products={p.products} accent={accent} slug={p.slug} />
        </div>
      </div>

      {/* ════════ BARRA DE AÇÕES (preta) ════════ */}
      <section className="relative z-10 mx-auto mt-6 max-w-6xl px-5 md:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden border-2 border-[var(--ink)] bg-[var(--ink)] md:grid-cols-4">
          <ActionBtn href="#teorias" icon={<MessageSquare className="h-5 w-5" />} label="comentar teoria" accent={accent} />
          <ActionBtn href="#loja" icon={<Gift className="h-5 w-5" />} label="enviar mimo" accent={accent} />
          <ActionBtn href="#loja" icon={<Crown className="h-5 w-5" />} label="votar" accent={accent} />
          <ActionBtn href="/acasaviews/rankings" icon={<Trophy className="h-5 w-5" />} label="ver ranking" accent={accent} />
        </div>
      </section>
    </div>
  )
}

/* ───────────── helpers ───────────── */

function KpiBar({ label, value, sub, delta, accent, icon }: { label: string; value: string; sub?: string; delta?: number | null; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[var(--ink)] px-4 py-3 text-white">
      <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">{icon}{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="casa-display text-2xl leading-none" style={{ color: accent }}>{value}</span>
        {sub && <span className="casa-body text-[10px] text-white/40">{sub}</span>}
        {delta != null && delta !== 0 && <span className={`casa-body text-[10px] font-extrabold ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>+24h</span>}
      </div>
    </div>
  )
}

function Block({ title, icon, accent, chip, children }: { title: string; icon: React.ReactNode; accent: string; chip?: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)]">
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--line)] pb-2">
        <span className="flex flex-1 items-center gap-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]"><span style={{ color: accent }}>{icon}</span>{title}</span>
        {chip && <span className="border-2 border-[var(--ink)] px-2 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]" style={{ background: accent }}>{chip}</span>}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, pills, accent }: { label: string; value?: string | null; pills?: string[]; accent?: string }) {
  if (!value && (!pills || pills.length === 0)) return null
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-20 shrink-0 casa-body text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50">{label}</dt>
      <dd className="flex flex-1 flex-wrap items-center gap-1 casa-body text-sm font-semibold text-[var(--ink)]">
        {pills && pills.length > 0
          ? pills.map((x, i) => <span key={i} className="border border-[var(--ink)]/20 px-1.5 py-0.5 text-xs" style={{ background: i % 2 ? "transparent" : `color-mix(in srgb, ${accent} 18%, transparent)` }}>{x}</span>)
          : value}
      </dd>
    </div>
  )
}

function Perf({ icon, label, value, pct }: { icon: React.ReactNode; label: string; value: string; pct: number }) {
  const up = pct >= 0
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 casa-body text-sm font-bold text-[var(--ink-soft)]/75"><span className="text-[var(--ink-soft)]/50">{icon}</span>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="casa-display text-xl text-[var(--ink)]">{value}</span>
        <span className={`casa-body text-xs font-extrabold ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "↑" : "↓"}{Math.abs(pct)}%</span>
      </span>
    </div>
  )
}

function ActionBtn({ href, icon, label, accent }: { href: string; icon: React.ReactNode; label: string; accent: string }) {
  return (
    <a href={href} className="group flex items-center justify-center gap-2 bg-[var(--ink)] px-4 py-4 casa-body text-xs font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:text-[var(--ink)]" style={{ background: "var(--ink)" }}>
      <span className="transition-colors group-hover:text-[var(--ink)]" style={{ color: accent }}>{icon}</span>
      <span className="border-b-2 border-transparent pb-0.5 transition-colors group-hover:border-[var(--cyan)]">{label}</span>
    </a>
  )
}

function SemiGauge({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 110" className="w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--magenta)" />
          </linearGradient>
        </defs>
        <path d="M20,95 A80,80 0 0 1 180,95" fill="none" stroke="rgba(11,11,13,0.12)" strokeWidth="14" pathLength={100} strokeLinecap="round" />
        <path d="M20,95 A80,80 0 0 1 180,95" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" pathLength={100} strokeDasharray={`${clamped} 100`} strokeLinecap="round" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
        <div className="casa-display text-5xl leading-none text-[var(--ink)]">{clamped}%</div>
        <div className="casa-body text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/50">nível {clamped >= 66 ? "alto" : clamped >= 33 ? "médio" : "baixo"}</div>
      </div>
      <div className="mt-1 flex justify-between casa-body text-[9px] font-bold text-[var(--ink-soft)]/40"><span>0%</span><span>100%</span></div>
    </div>
  )
}
