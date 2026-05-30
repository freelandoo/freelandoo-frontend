interface ProgressRailProps {
  total: number
  current: number
  className?: string
}

export function ProgressRail({ total, current, className = "" }: ProgressRailProps) {
  const pct = Math.min(Math.max((current / Math.max(total - 1, 1)) * 100, 0), 100)
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="font-mono text-xs tabular-nums text-slate-400">
        {String(current + 1).padStart(2, "0")}
        <span className="mx-1 text-slate-600">/</span>
        <span className="text-slate-500">{String(total).padStart(2, "0")}</span>
      </span>
      <div className="relative h-px flex-1 bg-white/10">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
