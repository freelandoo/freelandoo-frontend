import type { PolenLimits } from "./types"

export function DailyLimitProgress({ limits }: { limits: PolenLimits | null }) {
  if (!limits) return null
  const adsPct = limits.ads_per_day > 0 ? Math.min(100, (limits.ads_watched_today / limits.ads_per_day) * 100) : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-amber-100/65">
        <span>Progresso diário</span>
        <span>{limits.ads_watched_today}/{limits.ads_per_day} anúncios</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200"
          style={{ width: `${adsPct}%` }}
        />
      </div>
    </div>
  )
}
