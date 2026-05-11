"use client"

import Link from "next/link"
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
  label: string
  icon: typeof Crown
  // Visual heights / orders applied via tailwind
  heightClass: string
  orderClass: string
  avatarSize: string
  cardScale: string
  accent: string // hex / rgba for glow + accent
  ring: string
  badgeBg: string
  badgeText: string
  pedestalGradient: string
  border: string
}

const TIERS: Record<1 | 2 | 3, Tier> = {
  1: {
    rank: 1,
    label: "1º lugar",
    icon: Crown,
    heightClass: "min-h-[300px] md:min-h-[360px]",
    orderClass: "order-1 md:order-2",
    avatarSize: "h-24 w-24 md:h-28 md:w-28",
    cardScale: "md:scale-[1.06]",
    accent: "#e6b800",
    ring: "rgba(230,184,0,0.55)",
    badgeBg: "bg-primary text-primary-foreground",
    badgeText: "text-primary",
    pedestalGradient:
      "bg-[linear-gradient(180deg,rgba(230,184,0,0.32),rgba(230,184,0,0.05))]",
    border: "border-primary/45",
  },
  2: {
    rank: 2,
    label: "2º lugar",
    icon: Medal,
    heightClass: "min-h-[250px] md:min-h-[300px]",
    orderClass: "order-2 md:order-1",
    avatarSize: "h-20 w-20 md:h-24 md:w-24",
    cardScale: "",
    accent: "#d8dde5",
    ring: "rgba(220,225,235,0.4)",
    badgeBg: "bg-zinc-200 text-zinc-950",
    badgeText: "text-zinc-200",
    pedestalGradient:
      "bg-[linear-gradient(180deg,rgba(220,225,235,0.22),rgba(220,225,235,0.04))]",
    border: "border-white/25",
  },
  3: {
    rank: 3,
    label: "3º lugar",
    icon: Trophy,
    heightClass: "min-h-[230px] md:min-h-[270px]",
    orderClass: "order-3 md:order-3",
    avatarSize: "h-20 w-20 md:h-24 md:w-24",
    cardScale: "",
    accent: "#c97b3a",
    ring: "rgba(201,123,58,0.45)",
    badgeBg: "bg-amber-700 text-white",
    badgeText: "text-amber-400",
    pedestalGradient:
      "bg-[linear-gradient(180deg,rgba(201,123,58,0.26),rgba(201,123,58,0.05))]",
    border: "border-amber-700/45",
  },
}

function formatPoints(value: number | null | undefined) {
  if (value == null) return "0 pts"
  return `${numberFormatter.format(Math.round(Number(value)))} pts`
}

function formatXp(value: number | null | undefined) {
  if (value == null) return "0 XP"
  return `${numberFormatter.format(Math.round(Number(value)))} XP`
}

function formatLevel(value: number | null | undefined) {
  const lvl = Number(value ?? 0)
  return `LV. ${Number.isFinite(lvl) ? lvl : 0}`
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
        "relative flex h-full w-full flex-col items-center text-center transition duration-300",
        tier.cardScale,
      )}
    >
      {/* Crown / medal floating above */}
      <div
        className="relative -mb-6 flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_8px_28px_-12px_rgba(0,0,0,0.7)]"
        style={{
          borderColor: tier.ring,
          background: `radial-gradient(circle at 50% 30%, ${tier.accent}55, rgba(10,10,12,0.95))`,
        }}
      >
        <Icon
          className="h-5 w-5"
          style={{ color: tier.accent }}
        />
      </div>

      {/* Card body */}
      <div
        className={cn(
          "relative flex w-full flex-1 flex-col items-center gap-3 rounded-[1.4rem] border bg-[#08090c] px-4 pt-9 pb-5 backdrop-blur",
          tier.border,
        )}
        style={{
          boxShadow: `0 24px 60px -28px ${tier.ring}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Soft glow halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[1.4rem]"
          style={{
            background: `radial-gradient(60% 60% at 50% 0%, ${tier.accent}1f, transparent 70%)`,
          }}
        />

        {/* Rank badge */}
        <span
          className={cn(
            "absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.8)]",
            tier.badgeBg,
          )}
        >
          #{tier.rank}
        </span>

        {/* Avatar */}
        <Avatar
          className={cn(
            "relative ring-2 ring-offset-[3px] ring-offset-[#08090c]",
            tier.avatarSize,
          )}
          style={{
            // ring color via inline style for tier accent
            // tailwind ring-* uses ring color var — fallback to box-shadow ring
            boxShadow: `0 0 0 2px ${tier.accent}, 0 12px 32px -14px ${tier.ring}`,
          }}
        >
          {row?.avatar_url && (
            <AvatarImage src={row.avatar_url} alt={row.display_name} />
          )}
          <AvatarFallback className="bg-white/[0.06] text-base font-bold text-white/85">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name + type badge */}
        <div className="flex w-full flex-col items-center gap-1.5">
          <p className="line-clamp-1 max-w-full text-base font-semibold text-white md:text-lg">
            {row?.display_name || "Aguardando dados"}
          </p>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]",
              isClan
                ? "border-primary/35 text-primary"
                : "border-white/15 text-white/55",
            )}
          >
            {isClan ? "Clan" : "Perfil"}
          </span>
        </div>

        {/* Profession + city (lápide padrão) */}
        <div className="flex w-full flex-col items-center gap-0.5 text-[11px] leading-tight text-white/[0.55]">
          <span className="line-clamp-1 max-w-full">
            {professionLabel(row ?? ({} as PodiumRow))}
          </span>
          <span className="line-clamp-1 max-w-full text-white/[0.4]">
            {locationLabel(row ?? ({} as PodiumRow))}
          </span>
        </div>

        {/* Points in highlight */}
        <div
          className="mt-1 inline-flex items-baseline gap-1 rounded-full border px-3 py-1"
          style={{
            borderColor: tier.ring,
            background: `${tier.accent}1a`,
          }}
        >
          <span
            className="text-lg font-black tabular-nums"
            style={{ color: tier.accent }}
          >
            {numberFormatter.format(Math.round(points))}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
            pts
          </span>
        </div>

        {/* Level + XP */}
        <div className="flex w-full items-center justify-center gap-3 border-t border-white/10 pt-3 text-[11px]">
          <span
            className={cn("font-bold uppercase tracking-[0.18em]", tier.badgeText)}
          >
            {formatLevel(level)}
          </span>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-semibold text-white/65">{formatXp(xpTotal)}</span>
        </div>
      </div>

      {/* Pedestal */}
      <div className="relative mt-3 flex w-full flex-col items-center">
        <div
          className={cn(
            "flex w-full items-center justify-center rounded-t-xl border border-b-0 border-white/10",
            tier.pedestalGradient,
            tier.rank === 1
              ? "h-16 md:h-20"
              : tier.rank === 2
                ? "h-10 md:h-14"
                : "h-7 md:h-10",
          )}
        >
          <span
            className="text-2xl font-black md:text-3xl"
            style={{ color: tier.accent, opacity: 0.55 }}
          >
            {tier.rank}
          </span>
        </div>
      </div>
    </div>
  )

  const wrapperClass = cn(
    "flex flex-col items-center justify-end transition duration-300 hover:-translate-y-1",
    tier.heightClass,
    tier.orderClass,
    !row && "pointer-events-none opacity-50",
  )

  if (!row || !href) {
    return <div className={wrapperClass}>{inner}</div>
  }

  return (
    <Link href={href} className={wrapperClass} aria-label={tier.label}>
      {inner}
    </Link>
  )
}

function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
      {[2, 1, 3].map((rank) => (
        <div
          key={rank}
          className={cn(
            "h-[260px] animate-pulse rounded-[1.4rem] border border-white/10 bg-white/[0.025]",
            rank === 1 ? "sm:h-[340px]" : "sm:h-[280px]",
          )}
        />
      ))}
    </div>
  )
}

export function RankingPodium({ rows, rowHref, loading = false }: Props) {
  if (loading) return <PodiumSkeleton />

  const first = rows[0] ?? null
  const second = rows[1] ?? null
  const third = rows[2] ?? null

  return (
    <div
      key={rows.map((r) => r.id_profile).join("|") || "empty"}
      className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3"
      style={{ animation: "podiumFadeIn 0.55s ease-out both" }}
    >
      <style>{`
        @keyframes podiumFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
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
