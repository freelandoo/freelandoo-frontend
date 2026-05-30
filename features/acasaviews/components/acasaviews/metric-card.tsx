import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  icon?: LucideIcon
  label: string
  value: string
  hint?: string
  accent?: "fuchsia" | "cyan" | "violet" | "amber" | "slate"
  className?: string
}

const ACCENTS: Record<NonNullable<MetricCardProps["accent"]>, { text: string; ring: string; glow: string }> = {
  fuchsia: {
    text: "text-fuchsia-300",
    ring: "ring-fuchsia-400/20",
    glow: "shadow-[0_0_40px_-12px_rgba(232,121,249,0.4)]",
  },
  cyan: {
    text: "text-cyan-300",
    ring: "ring-cyan-400/20",
    glow: "shadow-[0_0_40px_-12px_rgba(34,211,238,0.4)]",
  },
  violet: {
    text: "text-violet-300",
    ring: "ring-violet-400/20",
    glow: "shadow-[0_0_40px_-12px_rgba(167,139,250,0.4)]",
  },
  amber: {
    text: "text-amber-300",
    ring: "ring-amber-400/20",
    glow: "shadow-[0_0_40px_-12px_rgba(252,211,77,0.4)]",
  },
  slate: {
    text: "text-slate-200",
    ring: "ring-white/10",
    glow: "",
  },
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "slate",
  className = "",
}: MetricCardProps) {
  const a = ACCENTS[accent]
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl ring-1 ${a.ring} ${a.glow} px-5 py-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className={`mt-1 font-semibold tabular-nums text-2xl md:text-3xl ${a.text}`}>{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 rounded-lg bg-white/[0.04] p-2 ring-1 ${a.ring}`}>
            <Icon className={`h-4 w-4 ${a.text}`} />
          </div>
        )}
      </div>
    </div>
  )
}
