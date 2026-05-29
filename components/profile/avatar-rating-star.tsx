"use client"

import { Star } from "lucide-react"
import { useRankingPublicProfileMeta } from "@/hooks/use-ranking-public-profile-meta"

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
  const { data } = useRankingPublicProfileMeta(profileId)

  if (data === undefined) return null

  const avg = data.avg_rating != null ? Number(data.avg_rating) : 0
  const count = data.ratings_count ?? 0
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
                fill: filled ? "#E0A500" : "transparent",
                color: filled ? "#E0A500" : "rgba(11,11,13,0.25)",
              }}
            />
          )
        })}
      </div>
      <span className="text-[11px] font-bold text-[#5b554b] tabular-nums">
        {avg > 0 ? `${avg.toFixed(1)} (${count})` : "Sem avaliações"}
      </span>
    </div>
  )
}
