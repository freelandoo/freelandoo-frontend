import Link from "next/link"
import { ArrowUpRight, Eye, Trophy } from "lucide-react"
import type { ParticipantCard as TCard } from "@/lib/acasaviews/participants-live"

function accentVar(accent: string): string {
  if (accent === "cyan") return "var(--cyan)"
  if (accent === "gold") return "var(--gold)"
  return "var(--magenta)"
}

const STATUS_LABEL: Record<string, string> = {
  active: "na casa",
  eliminated: "eliminado",
  finalist: "finalista",
  winner: "campeão",
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

export function ParticipantCard({ p }: { p: TCard }) {
  const accent = accentVar(p.accent_color)
  const pos = p.live.matched && p.live.posicao ? p.live.posicao : null
  return (
    <Link
      href={`/acasaviews/participantes/${p.slug}`}
      className="group relative flex flex-col overflow-hidden border-2 border-[var(--ink)] bg-white shadow-[6px_6px_0_0_var(--ink)] transition-transform duration-200 hover:-translate-y-1.5 hover:-rotate-[0.4deg]"
    >
      {/* topo: cover + avatar */}
      <div className="relative h-28 overflow-hidden border-b-2 border-[var(--ink)]" style={{ background: accent }}>
        {p.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-luminosity" />
        )}
        <div className="casa-dots absolute inset-0 opacity-10" />
        <span className="absolute left-3 top-3 -rotate-2 border-2 border-[var(--ink)] bg-white px-2 py-0.5 casa-body text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">
          {STATUS_LABEL[p.status] || p.status}
        </span>
        {pos && (
          <span className="absolute right-3 top-3 flex h-9 min-w-9 items-center justify-center border-2 border-[var(--ink)] bg-white px-1 casa-display text-xl text-[var(--ink)]">
            #{pos}
          </span>
        )}
      </div>

      <div className="-mt-9 flex items-end gap-3 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.avatar_url || "/placeholder-user.jpg"}
          alt={p.display_name}
          className="h-16 w-16 border-2 border-[var(--ink)] object-cover shadow-[3px_3px_0_0_var(--ink)]"
          style={{ background: "var(--paper-2)" }}
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="casa-display text-2xl leading-[0.9] text-[var(--ink)]">{p.display_name}</h3>
        {p.tagline && (
          <p className="mt-1 line-clamp-2 casa-body text-xs font-semibold text-[var(--ink-soft)]/70">{p.tagline}</p>
        )}

        {/* KPIs ao vivo (ou neutros) */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Kpi icon={<Trophy className="h-3.5 w-3.5" />} label="pontos" value={compact(p.live.pontuacao)} delta={p.live.matched ? p.live.pontuacao_pct_24h : null} accent={accent} />
          <Kpi icon={<Eye className="h-3.5 w-3.5" />} label="views" value={compact(p.live.views)} delta={p.live.matched ? p.live.views_pct_24h : null} accent={accent} />
        </div>

        <span className="mt-4 inline-flex items-center gap-1 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
          ver dossiê
          <ArrowUpRight className="h-4 w-4 text-[var(--ink)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>

      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: accent }} />
    </Link>
  )
}

function Kpi({ icon, label, value, delta, accent }: { icon: React.ReactNode; label: string; value: string; delta: number | null; accent: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5">
      <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/55">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="casa-display text-lg leading-none text-[var(--ink)]">{value}</span>
        {delta !== null && delta !== 0 && (
          <span className={`casa-body text-[10px] font-extrabold ${delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
}
