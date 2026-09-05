"use client"

import { Star } from "lucide-react"
import { useRankingPublicProfileMeta } from "@/hooks/use-ranking-public-profile-meta"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

type Props = {
  profileId: string
  /** Onde a coluna encosta. No headcard as estrelas ficam na coluna da
   *  direita, alinhadas com os contadores; centradas era o lugar antigo,
   *  debaixo da foto. */
  align?: "center" | "end"
  className?: string
}

// Regra de exibição: a cada 0.5+ arredonda para cima.
// 4.5 → 5, 4.49 → 4, 4.4 → 4. Math.floor(avg + 0.5) implementa exatamente isso.
function roundForDisplay(avg: number): number {
  if (!avg || avg <= 0) return 0
  return Math.min(5, Math.max(0, Math.floor(avg + 0.5)))
}

export function AvatarRatingStar({ profileId, align = "center", className }: Props) {
  const { data } = useRankingPublicProfileMeta(profileId)
  const t = useTranslations("Profile")

  if (data === undefined) return null

  const avg = data.avg_rating != null ? Number(data.avg_rating) : 0
  const count = data.ratings_count ?? 0
  const stars = roundForDisplay(avg)

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        align === "end" ? "items-end" : "mt-3 items-center",
        className,
      )}
    >
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
        {avg > 0 ? `${avg.toFixed(1)} (${count})` : t("noRatings", "Sem avaliações")}
      </span>
    </div>
  )
}
