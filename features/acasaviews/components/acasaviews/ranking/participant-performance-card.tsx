import { Eye, Flame } from "lucide-react"
import { AnimatedNumber } from "./animated-number"

interface ParticipantPerformanceCardProps {
  menPct: number
  womenPct: number
  totalViews: number
  leaderName: string
  leaderHandle: string
}

/** Card de performance: placar Homens × Mulheres + dono(a) da atenção. */
export function ParticipantPerformanceCard({
  menPct,
  womenPct,
  totalViews,
  leaderName,
  leaderHandle,
}: ParticipantPerformanceCardProps) {
  return (
    <div className="relative overflow-hidden bg-[var(--ink)] p-7 text-white casa-cut md:p-9" style={{ transform: "rotate(1deg)" }}>
      <div className="casa-dots absolute inset-0 opacity-[0.06]" />
      <span className="casa-tape -top-3 left-10 rotate-[-6deg]" style={{ background: "rgba(255,31,142,0.5)" }} />

      <div className="relative flex items-center gap-2 text-[var(--magenta)]">
        <Flame className="h-5 w-5" strokeWidth={2.6} />
        <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.24em]">Disputa da casa</span>
      </div>
      <h3 className="casa-display relative mt-3 text-4xl leading-none md:text-5xl">
        Homens <span className="text-[var(--cyan)]">×</span> Mulheres
      </h3>

      {/* Placar de barras */}
      <div className="relative mt-6">
        <div className="flex h-4 w-full overflow-hidden border border-white/15">
          <div className="bg-[var(--cyan)]" style={{ width: `${menPct}%` }} />
          <div className="bg-[var(--magenta)]" style={{ width: `${womenPct}%` }} />
        </div>
        <div className="mt-2 flex justify-between casa-body text-sm font-extrabold tabular-nums">
          <span className="text-[var(--cyan)]">♂ {menPct}%</span>
          <span className="text-[var(--magenta)]">{womenPct}% ♀</span>
        </div>
      </div>

      <div className="relative mt-7 flex flex-wrap items-end justify-between gap-5 border-t border-white/12 pt-6">
        <div>
          <p className="flex items-center gap-1.5 casa-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            <Eye className="h-3.5 w-3.5" /> views da temporada
          </p>
          <div className="casa-display mt-1 text-5xl text-[var(--magenta)] md:text-6xl">
            <AnimatedNumber value={totalViews} compact />
          </div>
        </div>
        <div className="text-right">
          <p className="casa-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">dono(a) da atenção</p>
          <p className="casa-display text-2xl md:text-3xl">{leaderName}</p>
          <p className="casa-body text-[11px] font-semibold text-white/45">{leaderHandle}</p>
        </div>
      </div>
    </div>
  )
}
