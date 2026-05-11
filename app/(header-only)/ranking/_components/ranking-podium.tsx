"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { Crown, Medal, Trophy } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

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

const numberFormatter = new Intl.NumberFormat("pt-BR")

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

type Tier = {
  rank: 1 | 2 | 3
  topLabel: string
  ariaLabel: string
  icon: typeof Crown
  orderClass: string
  liftClass: string
  avatarSize: string
  bgGradient: string
  borderStyle: string
  shadow: string
  textMuted: string
  pointsAccent: string
  chipAccent: string
  ringColor: string
}

const TIERS: Record<1 | 2 | 3, Tier> = {
  1: {
    rank: 1,
    topLabel: "TOP 01",
    ariaLabel: "1º lugar",
    icon: Crown,
    orderClass: "order-1 md:order-2",
    liftClass: "md:-translate-y-3",
    avatarSize: "h-16 w-16",
    bgGradient:
      "linear-gradient(155deg, #fde047 0%, #facc15 42%, #ca8a04 100%)",
    borderStyle: "border-yellow-200/70",
    shadow:
      "0 26px 60px -22px rgba(250,204,21,0.7), 0 0 0 1px rgba(250,204,21,0.45)",
    textMuted: "text-zinc-900/70",
    pointsAccent: "text-yellow-300",
    chipAccent: "text-yellow-300",
    ringColor: "#854d0e",
  },
  2: {
    rank: 2,
    topLabel: "TOP 02",
    ariaLabel: "2º lugar",
    icon: Medal,
    orderClass: "order-2 md:order-1",
    liftClass: "",
    avatarSize: "h-14 w-14",
    bgGradient:
      "linear-gradient(155deg, #f4f4f5 0%, #d4d4d8 45%, #71717a 100%)",
    borderStyle: "border-zinc-200/70",
    shadow:
      "0 22px 50px -24px rgba(212,212,216,0.55), 0 0 0 1px rgba(212,212,216,0.4)",
    textMuted: "text-zinc-900/70",
    pointsAccent: "text-zinc-100",
    chipAccent: "text-zinc-100",
    ringColor: "#52525b",
  },
  3: {
    rank: 3,
    topLabel: "TOP 03",
    ariaLabel: "3º lugar",
    icon: Trophy,
    orderClass: "order-3 md:order-3",
    liftClass: "",
    avatarSize: "h-14 w-14",
    bgGradient:
      "linear-gradient(155deg, #e69c66 0%, #c97b3a 45%, #7c4623 100%)",
    borderStyle: "border-orange-300/60",
    shadow:
      "0 22px 50px -24px rgba(201,123,58,0.65), 0 0 0 1px rgba(201,123,58,0.4)",
    textMuted: "text-zinc-900/70",
    pointsAccent: "text-orange-200",
    chipAccent: "text-orange-200",
    ringColor: "#5b3216",
  },
}

function locationLabel(row: PodiumRow) {
  if (row.municipio && row.estado) return `${row.municipio}, ${row.estado}`
  if (row.municipio) return row.municipio
  return "Cidade não informada"
}

function professionLabel(row: PodiumRow) {
  return row.specialty || row.machine_name || "Profissão não informada"
}

function PodiumCard({
  row,
  tier,
  href,
}: {
  row: PodiumRow | null
  tier: Tier
  href: string | null
}) {
  const Icon = tier.icon
  const initials = getInitials(row?.display_name)
  const points = Number(row?.ranking_score ?? row?.total_points ?? 0)
  const xpTotal = Number(row?.xp_total ?? 0)
  const level = Number(row?.level ?? row?.xp_level ?? 0)
  const isClan = !!row?.is_clan

  const inner = (
    <div
      className={cn(
        "relative isolate flex h-full w-full flex-col items-center gap-2 overflow-hidden rounded-2xl border px-3 py-4 pt-7 text-center text-zinc-900",
        tier.borderStyle,
      )}
      style={{
        background: tier.bgGradient,
        boxShadow: tier.shadow,
      }}
    >
      {/* Inner soft white sheen + shimmer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(80% 50% at 50% 0%, rgba(255,255,255,0.35), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -translate-x-full rotate-12"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)",
          animation: "podiumShimmer 3.6s ease-in-out infinite",
          animationDelay: `${tier.rank * 0.5}s`,
        }}
      />

      {/* TOP chip — canto superior direito */}
      <span
        className={cn(
          "absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]",
          tier.chipAccent,
        )}
      >
        <Icon className="h-3 w-3" />
        {tier.topLabel}
      </span>

      {/* Avatar */}
      <Avatar
        className={cn("relative mt-1 shrink-0", tier.avatarSize)}
        style={{
          boxShadow: `0 0 0 2px ${tier.ringColor}, 0 10px 26px -10px rgba(0,0,0,0.45)`,
        }}
      >
        {row?.avatar_url && (
          <AvatarImage src={row.avatar_url} alt={row.display_name} />
        )}
        <AvatarFallback className="bg-zinc-900/80 text-sm font-black text-white">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name + badge */}
      <div className="flex w-full flex-col items-center gap-1">
        <p className="line-clamp-1 max-w-full text-[14px] font-black leading-tight text-zinc-900">
          {row?.display_name || "Aguardando dados"}
        </p>
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-zinc-900 px-1.5 py-px text-[9px] font-black uppercase tracking-[0.18em]",
            isClan ? tier.chipAccent : "text-white/90",
          )}
        >
          {isClan ? "Clan" : "Perfil"}
        </span>
      </div>

      {/* Profession + city */}
      <div className="flex w-full flex-col items-center gap-0 text-[10px] font-semibold leading-tight">
        <span
          className={cn("line-clamp-1 max-w-full", "text-zinc-900/85")}
        >
          {professionLabel(row ?? ({} as PodiumRow))}
        </span>
        <span className={cn("line-clamp-1 max-w-full", tier.textMuted)}>
          {locationLabel(row ?? ({} as PodiumRow))}
        </span>
      </div>

      {/* Points pill */}
      <div className="inline-flex items-baseline gap-1 rounded-full bg-zinc-900/90 px-3 py-1 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.6)] ring-1 ring-black/40">
        <span
          className={cn(
            "text-base font-black tabular-nums",
            tier.pointsAccent,
          )}
        >
          {numberFormatter.format(Math.round(points))}
        </span>
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-[0.18em] opacity-80",
            tier.pointsAccent,
          )}
        >
          pts
        </span>
      </div>

      {/* LV · XP */}
      <div className="mt-auto flex w-full items-center justify-center gap-2 border-t border-zinc-900/15 pt-2 text-[10px] font-bold">
        <span className="uppercase tracking-[0.16em] text-zinc-900">
          LV. {Number.isFinite(level) ? level : 0}
        </span>
        <span className="h-2.5 w-px bg-zinc-900/25" />
        <span className="text-zinc-900/80">
          {numberFormatter.format(Math.round(xpTotal))} XP
        </span>
      </div>
    </div>
  )

  const wrapperClass = cn(
    "flex transition-transform duration-300 hover:-translate-y-1",
    tier.orderClass,
    tier.liftClass,
    !row && "pointer-events-none opacity-60",
  )

  const wrapperProps = {
    "data-podium-card": "",
    className: wrapperClass,
  } as const

  if (!row || !href) {
    return <div {...wrapperProps}>{inner}</div>
  }

  return (
    <Link
      {...wrapperProps}
      href={href}
      aria-label={tier.ariaLabel}
    >
      {inner}
    </Link>
  )
}

function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[2, 1, 3].map((rank) => (
        <div
          key={rank}
          className={cn(
            "h-[220px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.025]",
            rank === 1 && "md:-translate-y-3",
          )}
        />
      ))}
    </div>
  )
}

export function RankingPodium({ rows, rowHref, loading = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardsKey = rows.map((r) => r.id_profile).join("|") || "empty"

  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-podium-card]",
        { y: 32, scale: 0.9, autoAlpha: 0 },
        {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.65,
          stagger: { each: 0.12, from: "start" },
          ease: "back.out(1.6)",
        },
      )
    }, containerRef)
    return () => ctx.revert()
  }, [cardsKey])

  if (loading) return <PodiumSkeleton />

  const first = rows[0] ?? null
  const second = rows[1] ?? null
  const third = rows[2] ?? null

  return (
    <div
      ref={containerRef}
      key={cardsKey}
      className="grid grid-cols-3 items-end gap-2 sm:gap-3"
    >
      <style>{`
        @keyframes podiumShimmer {
          0%   { transform: translateX(-150%) rotate(12deg); }
          55%  { transform: translateX(420%) rotate(12deg); }
          100% { transform: translateX(420%) rotate(12deg); }
        }
      `}</style>
      <PodiumCard
        row={second}
        tier={TIERS[2]}
        href={second ? rowHref(second) : null}
      />
      <PodiumCard
        row={first}
        tier={TIERS[1]}
        href={first ? rowHref(first) : null}
      />
      <PodiumCard
        row={third}
        tier={TIERS[3]}
        href={third ? rowHref(third) : null}
      />
    </div>
  )
}
