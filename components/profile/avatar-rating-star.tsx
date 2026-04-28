"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"

type Props = {
  profileId: string
}

// Regra de exibição: a cada 0.5+ arredonda para cima.
// 4.5 → 5, 4.49 → 4, 4.4 → 4. Math.floor(avg + 0.5) implementa exatamente isso.
function roundForDisplay(avg: number): number {
  if (!avg || avg <= 0) return 0
  return Math.min(5, Math.max(0, Math.floor(avg + 0.5)))
}

export function AvatarRatingStar({ profileId }: Props) {
  const [avg, setAvg] = useState<number | null>(null)
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/ranking/public/profile/${profileId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        const v = d.avg_rating != null ? Number(d.avg_rating) : 0
        setAvg(v)
        setCount(d.ratings_count ?? 0)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profileId])

  if (avg == null) return null
  const stars = roundForDisplay(avg)

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < stars
          return (
            <Star
              key={i}
              className="h-4 w-4"
              style={{
                fill: filled ? "#facc15" : "transparent",
                color: filled ? "#facc15" : "#d4d4d8",
              }}
            />
          )
        })}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
        {avg > 0 ? `${avg.toFixed(1)} (${count})` : "Sem avaliações"}
      </span>
    </div>
  )
}
