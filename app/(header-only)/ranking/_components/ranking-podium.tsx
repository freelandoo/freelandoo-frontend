"use client"

/**
 * RankingPodium — pódio Top 3 no estilo tabloide editorial (paleta Freelandoo
 * dark: canvas escuro, cards de papel off-white, dourado de "poder").
 * #1 maior, com coroa, glow dourado, foto rasgada e pedestal mais alto.
 * Entrada em cascata via GSAP (back.out) no scroll; respeita reduced-motion.
 */
import { useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { Star, Eye, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { DoodleCrown } from "@/components/home/landing/primitives"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { AnimatedNumber } from "./ranking-ui"

gsap.registerPlugin(ScrollTrigger, useGSAP)

export type PodiumRow = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  username: string | null
  sub_profile_slug: string | null
  municipio: string | null
  estado: string | null
  specialty: string | null
  profession_slug: string | null
  machine_name: string | null
  total_points: number | null
  ranking_score?: number | null
  avg_rating?: number | null
  visits_count?: number | null
  likes_count?: number | null
  xp_total?: number | null
  xp_level?: number | null
  level?: number | null
  is_clan?: boolean
}

interface Props {
  rows: PodiumRow[]
  rowHref: (row: PodiumRow) => string
  loading?: boolean
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

function PodiumColumn({ row, rank, rowHref }: { row: PodiumRow; rank: 1 | 2 | 3; rowHref: (r: PodiumRow) => string }) {
  const t = useTranslations("Ranking")
  const isFirst = rank === 1
  const points = Number(row.ranking_score ?? row.total_points ?? 0)
  const location = row.municipio && row.estado ? `${row.municipio}, ${row.estado}` : null
  const tag = row.specialty || row.machine_name || location || (row.is_clan ? t("badgeClan", "Clan") : t("badgePerfil", "Perfil"))

  const order = rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"
  const width = isFirst ? "w-[40%]" : "w-[30%]"
  const pedestalH = isFirst ? "h-14 md:h-36" : rank === 2 ? "h-10 md:h-24" : "h-8 md:h-16"
  const frame = isFirst ? "#F2B705" : "#0B0B0D"

  return (
    <div className={cn("flex min-w-0 flex-col items-center", order, width)} data-podium-col data-rank={rank}>
      <div className="relative w-full">
        {isFirst && (
          <>
            <div className="absolute -inset-6 -z-10 rounded-full blur-3xl" style={{ background: "#F2B705", opacity: 0.25 }} />
            <DoodleCrown className="absolute -top-7 left-1/2 z-20 h-8 w-12 -translate-x-1/2 text-[#F2B705] md:-top-11 md:h-11 md:w-16" />
          </>
        )}

        {/* Selo de posição (canto) */}
        <span
          className={cn(
            "absolute -left-1.5 -top-1.5 z-20 flex h-6 w-6 rotate-[-6deg] items-center justify-center fl-display text-base md:h-12 md:w-12 md:text-3xl",
            isFirst ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#0B0B0D] text-[#F1EDE2]",
          )}
        >
          {rank}
        </span>

        {/* Foto rasgada */}
        <div className="fl-torn-1 fl-cut relative overflow-hidden p-2" style={{ background: frame }}>
          {row.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatar_url}
              alt={row.display_name}
              className={cn("w-full object-cover", isFirst ? "aspect-[4/5]" : "aspect-square")}
            />
          ) : (
            <div className={cn("flex w-full items-center justify-center bg-[#1D1810] fl-display text-5xl text-[#F2B705]", isFirst ? "aspect-[4/5]" : "aspect-square")}>
              {getInitials(row.display_name)}
            </div>
          )}
        </div>

        {/* Nome + score */}
        <div className="fl-card relative mt-2 p-2 text-center md:mt-3 md:p-3">
          <span className={cn("inline-block -rotate-1 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em]", row.is_clan ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#0B0B0D] text-[#F1EDE2]")}>
            {row.is_clan ? t("badgeClan", "Clan") : t("badgePerfil", "Perfil")}
          </span>
          <Link href={rowHref(row)} className="block">
            <h3 className={cn("fl-display mt-1.5 leading-none text-[#0B0B0D] hover:text-[#9a7400] md:mt-2", isFirst ? "text-sm md:text-4xl" : "text-xs md:text-3xl")}>
              {row.display_name}
            </h3>
          </Link>
          <p className="truncate text-[9px] font-semibold text-[#6B6457] md:text-[11px]">{tag}</p>

          <div className="mt-1.5 fl-display leading-none text-[#E0A500] md:mt-2">
            <span className={isFirst ? "text-xl md:text-5xl" : "text-lg md:text-4xl"}>
              <AnimatedNumber value={points} compact={points >= 100000} />
            </span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#6B6457] md:text-[10px]">{t("pontos", "pontos")}</p>

          <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-[#0B0B0D]/10 pt-2 md:mt-3 md:gap-3">
            <Meta icon={<Star className="h-3 w-3 text-[#E0A500]" />} value={row.avg_rating ? Number(row.avg_rating).toFixed(1) : "0.0"} />
            <Meta icon={<Eye className="h-3 w-3 text-[#6B6457]" />} value={<AnimatedNumber value={row.visits_count ?? 0} compact />} />
            <Meta icon={<Heart className="h-3 w-3 text-[#6B6457]" />} value={<AnimatedNumber value={row.likes_count ?? 0} compact />} />
          </div>
        </div>
      </div>

      {/* Pedestal */}
      <div className={cn("relative mt-3 flex w-[78%] items-center justify-center md:w-full", pedestalH)}>
        <div className={cn("absolute inset-0", isFirst ? "bg-[#F2B705]" : "bg-[#0B0B0D]")} style={{ clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0 100%)" }} />
        <span className={cn("fl-display relative z-10 text-2xl md:text-7xl", isFirst ? "text-[#0B0B0D]/85" : "text-[#F1EDE2]/85")}>{rank}</span>
      </div>
    </div>
  )
}

function Meta({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold tabular-nums text-[#0B0B0D] md:gap-1 md:text-[11px]">
      {icon}
      {value}
    </span>
  )
}

export function RankingPodium({ rows, rowHref, loading }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const top3 = rows.slice(0, 3)

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const cols = gsap.utils.toArray<HTMLElement>("[data-podium-col]")
      if (!cols.length) return
      const sorted = cols.sort((a, b) => Number(b.dataset.rank) - Number(a.dataset.rank))
      gsap.fromTo(
        sorted,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)", stagger: 0.16, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } },
      )
    },
    { scope: root, dependencies: [rows.length, loading] },
  )

  if (loading) {
    return (
      <div className="flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
        {[2, 1, 3].map((r) => (
          <div key={r} className={cn("min-w-0", r === 1 ? "w-[40%]" : "w-[30%]")}>
            <div className={cn("animate-pulse rounded-sm bg-[#1D1810]", r === 1 ? "aspect-[4/5]" : "aspect-square")} />
            <div className="mt-3 h-20 animate-pulse bg-[#1D1810] md:h-28" />
          </div>
        ))}
      </div>
    )
  }

  if (top3.length === 0) return null

  return (
    <div ref={root} className="mx-auto max-w-4xl">
      <div className="flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
        {top3.map((row, i) => (
          <PodiumColumn key={row.id_profile} row={row} rank={(i + 1) as 1 | 2 | 3} rowHref={rowHref} />
        ))}
      </div>
    </div>
  )
}
