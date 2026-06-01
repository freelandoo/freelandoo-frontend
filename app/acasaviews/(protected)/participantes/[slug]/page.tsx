import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft, Eye, Heart, MessageCircle, Trophy, Hash, Vault,
  Flame, Camera, ScrollText, Lock, Lightbulb, ShoppingBag,
} from "lucide-react"
import { casaFontVars } from "@/lib/acasaviews/fonts"
import { fetchParticipantBySlug } from "@/lib/acasaviews/participants-live"
import { ConvenienceStore } from "@/features/acasaviews/components/acasaviews/participants/convenience-store"
import { AdminCasaToolbar } from "@/features/acasaviews/components/acasaviews/admin-store-button"

export const dynamic = "force-dynamic"

function accentVar(accent: string): string {
  if (accent === "cyan") return "var(--cyan)"
  if (accent === "gold") return "var(--gold)"
  return "var(--magenta)"
}
const STATUS_LABEL: Record<string, string> = { active: "na casa", eliminated: "eliminado", finalist: "finalista", winner: "campeão" }
function brl(cents: number) { return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

export default async function ParticipantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ compra?: string }>
}) {
  const { slug } = await params
  const { compra } = await searchParams
  const p = await fetchParticipantBySlug(slug)
  if (!p) notFound()
  const accent = accentVar(p.accent_color)
  const live = p.live

  return (
    <div className={`${casaFontVars} casa-rank casa-paper relative min-h-screen overflow-hidden pb-20`}>
      <div className="casa-dots pointer-events-none absolute right-0 top-40 h-40 w-40 opacity-[0.06]" />

      {/* voltar */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 pt-6 md:px-10">
        <Link href="/acasaviews/rankings" className="inline-flex items-center gap-2 casa-body text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70 hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> rankings
        </Link>
      </div>

      {/* ── HERO ── */}
      <header className="relative mx-auto mt-4 max-w-5xl px-5 md:px-10">
        <div className="relative overflow-hidden border-2 border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)]">
          <div className="relative h-44 md:h-56" style={{ background: accent }}>
            {p.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-luminosity" />
            )}
            <div className="casa-dots absolute inset-0 opacity-10" />
            <span className="absolute left-4 top-4 -rotate-2 border-2 border-[var(--ink)] bg-white px-3 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]">
              {STATUS_LABEL[p.status] || p.status}
            </span>
            {live.matched && live.posicao && (
              <span className="absolute right-4 top-4 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white px-2 text-[var(--ink)]">
                <span className="casa-body text-[8px] font-bold uppercase">posição</span>
                <span className="casa-display text-2xl leading-none">#{live.posicao}</span>
              </span>
            )}
          </div>
        </div>

        {/* identidade — avatar 100% à frente do banner (sobreposto) + nome ao lado */}
        <div className="relative z-20 -mt-12 flex items-end gap-4 px-2 md:-mt-16 md:px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.avatar_url || "/placeholder-user.jpg"}
            alt={p.display_name}
            className="h-28 w-28 shrink-0 border-2 border-[var(--ink)] object-cover shadow-[5px_5px_0_0_var(--ink)] md:h-36 md:w-36"
            style={{ background: "var(--paper-2)" }}
          />
          <div className="pb-1 md:pb-2">
            <h1 className="casa-display text-4xl leading-[0.85] text-[var(--ink)] sm:text-5xl md:text-6xl">{p.display_name}</h1>
            {p.tagline && <p className="mt-2 max-w-xl casa-body text-sm font-semibold text-[var(--ink-soft)]/75">{p.tagline}</p>}
          </div>
        </div>
      </header>

      {/* ── KPIs ao vivo ── */}
      <section className="relative z-10 mx-auto mt-6 max-w-5xl px-5 md:px-10">
        {!live.matched && (
          <p className="mb-3 inline-block -rotate-1 border border-[var(--ink)]/30 bg-white/60 px-3 py-1 casa-body text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/60">
            números ao vivo aparecem quando o participante é vinculado ao ranking
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi icon={<Trophy className="h-4 w-4" />} label="pontos" value={compact(live.pontuacao)} pct={live.matched ? live.pontuacao_pct_24h : null} accent={accent} />
          <Kpi icon={<Hash className="h-4 w-4" />} label="posição" value={live.posicao ? `#${live.posicao}` : "—"} pct={null} accent={accent} />
          <Kpi icon={<Eye className="h-4 w-4" />} label="views" value={compact(live.views)} pct={live.matched ? live.views_pct_24h : null} accent={accent} />
          <Kpi icon={<Heart className="h-4 w-4" />} label="likes" value={compact(live.likes)} pct={live.matched ? live.likes_pct_24h : null} accent={accent} />
          <Kpi icon={<MessageCircle className="h-4 w-4" />} label="comentários" value={compact(live.comments)} pct={live.matched ? live.comments_pct_24h : null} accent={accent} />
        </div>
      </section>

      {/* ── grid principal ── */}
      <div className="relative z-10 mx-auto mt-8 grid max-w-5xl gap-6 px-5 md:grid-cols-3 md:px-10">
        {/* coluna esquerda */}
        <div className="space-y-6 md:col-span-2">
          {p.quote && (
            <blockquote className="border-l-4 bg-white px-5 py-4 casa-marker text-2xl text-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)]" style={{ borderColor: accent }}>
              “{p.quote}”
            </blockquote>
          )}

          {p.bio && (
            <Block title="Perfil" icon={<ScrollText className="h-4 w-4" />} accent={accent}>
              <p className="whitespace-pre-line casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85">{p.bio}</p>
            </Block>
          )}

          {/* Desempenho 24h */}
          {live.matched && (
            <Block title="Desempenho · últimas 24h" icon={<Flame className="h-4 w-4" />} accent={accent}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Delta label="pontos" delta={live.pontuacao_delta_24h} pct={live.pontuacao_pct_24h} />
                <Delta label="views" delta={live.views_delta_24h} pct={live.views_pct_24h} />
                <Delta label="likes" delta={live.likes_delta_24h} pct={live.likes_pct_24h} />
                <Delta label="comentários" delta={live.comments_delta_24h} pct={live.comments_pct_24h} />
              </div>
            </Block>
          )}

          {/* Jornada na casa */}
          {p.journey.length > 0 && (
            <Block title="Jornada na casa" icon={<ScrollText className="h-4 w-4" />} accent={accent}>
              <ol className="relative space-y-4 border-l-2 border-[var(--ink)]/15 pl-5">
                {p.journey.map((j) => (
                  <li key={j.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--ink)]" style={{ background: j.sentiment === "positive" ? "var(--cyan)" : j.sentiment === "negative" ? "var(--magenta)" : "var(--paper-2)" }} />
                    {j.label && <span className="casa-body text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]/55">{j.label}</span>}
                    <h4 className="casa-display text-xl leading-tight text-[var(--ink)]">{j.title}</h4>
                    {j.description && <p className="mt-0.5 casa-body text-sm text-[var(--ink-soft)]/75">{j.description}</p>}
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {/* Teorias da audiência */}
          {p.theories.length > 0 && (
            <Block title="Teorias da audiência" icon={<Lightbulb className="h-4 w-4" />} accent={accent}>
              <div className="space-y-3">
                {p.theories.map((t) => (
                  <div key={t.id} className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                    <p className="casa-body text-sm text-[var(--ink-soft)]/85">{t.content}</p>
                    <div className="mt-1 flex items-center justify-between casa-body text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50">
                      <span>— {t.author_label}</span>
                      <span style={{ color: accent }}>{t.votes} votos</span>
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          )}
        </div>

        {/* coluna direita */}
        <div className="space-y-6">
          {/* Cofre */}
          <div className="border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-5 text-white shadow-[6px_6px_0_0_var(--magenta)]">
            <div className="flex items-center gap-2 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/60">
              <Vault className="h-4 w-4" /> cofre da casa
            </div>
            <div className="mt-1 casa-display text-4xl" style={{ color: "var(--gold)" }}>{brl(p.vault_amount_cents)}</div>
          </div>

          {/* Termômetro de suspeita */}
          <Block title="Termômetro de suspeita" icon={<Flame className="h-4 w-4" />} accent={accent}>
            <div className="flex items-end justify-between">
              <span className="casa-display text-5xl text-[var(--ink)]">{p.suspicion_pct}%</span>
              <span className="casa-body text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/50">audiência</span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden border-2 border-[var(--ink)] bg-white">
              <div className="h-full" style={{ width: `${p.suspicion_pct}%`, background: "linear-gradient(90deg, var(--cyan), var(--magenta))" }} />
            </div>
          </Block>

          {/* Capturas */}
          <Block title="Capturas" icon={<Camera className="h-4 w-4" />} accent={accent}>
            <div className="flex items-baseline gap-2">
              <span className="casa-display text-5xl text-[var(--ink)]">{p.captures_count}</span>
              <span className="casa-body text-sm font-semibold text-[var(--ink-soft)]/60">flagras registrados</span>
            </div>
          </Block>

          {/* Caixinha de segredos */}
          {p.secrets.length > 0 && (
            <Block title="Caixinha de segredos" icon={<Lock className="h-4 w-4" />} accent={accent}>
              <div className="space-y-2">
                {p.secrets.map((s) => (
                  <div key={s.id} className="-rotate-[0.4deg] border border-[var(--ink)]/20 bg-white px-3 py-2 shadow-[2px_2px_0_0_var(--ink)]">
                    <p className="casa-marker text-lg leading-tight text-[var(--ink)]">{s.content}</p>
                    <span className="casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/45">— {s.author_label}</span>
                  </div>
                ))}
              </div>
            </Block>
          )}
        </div>
      </div>

      {/* ── Conveniência Views (vitrine; compra no Slice 6) ── */}
      <section className="relative z-10 mx-auto mt-10 max-w-5xl px-5 md:px-10">
        <div className="mb-5 flex flex-wrap items-center gap-3 border-b-2 border-[var(--ink)] pb-3">
          <ShoppingBag className="h-6 w-6" style={{ color: accent }} />
          <h2 className="casa-display text-3xl leading-none text-[var(--ink)] md:text-4xl">CONVENIÊNCIA VIEWS</h2>
          <div className="ml-auto"><AdminCasaToolbar only="store" /></div>
        </div>
        {compra === "success" && (
          <div className="mb-5 border-2 border-emerald-600 bg-emerald-50 px-4 py-3 casa-body text-sm font-bold text-emerald-700">
            ✓ Compra confirmada! Obrigado por apoiar {p.display_name}.
          </div>
        )}
        {compra === "cancel" && (
          <div className="mb-5 border-2 border-[var(--ink)]/40 bg-white px-4 py-3 casa-body text-sm font-bold text-[var(--ink-soft)]/70">
            Compra cancelada. Você pode tentar de novo quando quiser.
          </div>
        )}
        <ConvenienceStore products={p.products} accent={accent} slug={p.slug} />
      </section>
    </div>
  )
}

function Kpi({ icon, label, value, pct, accent }: { icon: React.ReactNode; label: string; value: string; pct: number | null; accent: string }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-white px-3 py-3 shadow-[3px_3px_0_0_var(--ink)]">
      <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/55">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="casa-display text-2xl leading-none text-[var(--ink)]">{value}</span>
        {pct !== null && pct !== 0 && (
          <span className={`casa-body text-[10px] font-extrabold ${pct > 0 ? "text-emerald-600" : "text-rose-600"}`}>{pct > 0 ? "↑" : "↓"}{Math.abs(pct)}%</span>
        )}
      </div>
    </div>
  )
}

function Block({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)]">
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--line)] pb-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">
        <span style={{ color: accent }}>{icon}</span>{title}
      </div>
      {children}
    </div>
  )
}

function Delta({ label, delta, pct }: { label: string; delta: number; pct: number }) {
  const up = delta >= 0
  return (
    <div className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
      <div className="casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50">{label}</div>
      <div className={`casa-display text-xl ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "+" : ""}{delta.toLocaleString("pt-BR")}</div>
      <div className={`casa-body text-[10px] font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "↑" : "↓"}{Math.abs(pct)}% / 24h</div>
    </div>
  )
}
