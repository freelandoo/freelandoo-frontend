"use client"

import { Crown } from "lucide-react"
import { useRankingPublicProfileMeta } from "@/hooks/use-ranking-public-profile-meta"
import { cn } from "@/lib/utils"

type Props = {
  profileId: string
  /** Cor do ícone (ex.: accent do enxame). Sem isso usa `text-primary`. */
  accentColor?: string | null
  className?: string
  iconClassName?: string
}

/** Coroa + `#posição` quando `position_machine` está entre 1 e 10 (perfis e clans). */
export function MachineTop10Crown({
  profileId,
  accentColor,
  className,
  iconClassName,
}: Props) {
  const { data } = useRankingPublicProfileMeta(profileId)

  const pos =
    data?.position_machine != null ? Number(data.position_machine) : NaN
  const show =
    data !== undefined &&
    Number.isFinite(pos) &&
    pos >= 1 &&
    pos <= 10

  if (!show) return null

  const label = `Top ${pos} no ranking do enxame`

  const toneStyle =
    accentColor != null && accentColor !== ""
      ? { color: accentColor }
      : undefined

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5",
        !toneStyle && "text-primary",
        className
      )}
      aria-label={label}
      title={label}
    >
      <Crown
        className={cn("shrink-0", iconClassName)}
        style={toneStyle}
        aria-hidden
      />
      <span
        className="font-bold tabular-nums leading-none tracking-tight text-[10px] md:text-[11px]"
        style={toneStyle}
      >
        #{pos}
      </span>
    </span>
  )
}
