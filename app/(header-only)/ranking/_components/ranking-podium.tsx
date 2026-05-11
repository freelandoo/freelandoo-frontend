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
  orderClass: string
  liftClass: string
  avatarSize: string
  accent: string
  ring: string
  badgeBg: string
  border: string
}

const TIERS: Record<1 | 2 | 3, Tier> = {
  1: {
    rank: 1,
    label: "1º lugar",
    icon: Crown,
    orderClass: "order-1 md:order-2",
    liftClass: "md:-translate-y-3",
    avatarSize: "h-16 w-16",
    accent: "#e6b800",
    ring: "rgba(230,184,0,0.55)",
    badgeBg: "bg-primary text-primary-foreground",
    border: "border-primary/45",
  },
  2: {
    rank: 2,
    label: "2º lugar",
    icon: Medal,
    orderClass: "order-2 md:order-1",
    liftClass: "",
    avatarSize: "h-14 w-14",
    accent: "#d8dde5",
    ring: "rgba(220,225,235,0.45)",
    badgeBg: "bg-zinc-200 text-zinc-950",
    border: "border-white/25",
  },
  3: {
    rank: 3,
    label: "3º lugar",
    icon: Trophy,
    orderClass: "order-3 md:order-3",
    liftClass: "",
    avatarSize: "h-14 w-14",
    accent: "#c97b3a",
    ring: "rgba(201,123,58,0.5)",
    badgeBg: "bg-amber-700 text-white",
    border: "border-amber-700/45",
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
        "relative flex h-full w-full flex-col items-center gap-2 rounded-2xl border bg-[#08090c]/95 px-3 py-4 text-center transition duration-300",
        tier.border,
      )}
      style={{
        boxShadow: `0 18px 44px -28px ${tier.ring}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Soft glow halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, ${tier.accent}1c, transparent 70%)`,
        }}
      />

      {/* Position chip + icon */}
      <span
        className={cn(
          "absolute -top-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.8)]",
          tier.badgeBg,
        )}
      >
        <Icon className="h-3 w-3" />#{tier.rank}
      </span>

      {/* Avatar */}
      <Avatar
        className={cn("relative mt-1 shrink-0", tier.avatarSize)}
        style={{
          boxShadow: `0 0 0 2px ${tier.accent}, 0 10px 24px -12px ${tier.ring}`,
        }}
      >
        {row?.avatar_url && (
          <AvatarImage src={row.avatar_url} alt={row.display_name} />
        )}
        <AvatarFallback className="bg-white/[0.06] text-sm font-bold text-white/85">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name + clan/perfil */}
      <div className="flex w-full flex-col items-center gap-0.5">
        <p className="line-clamp-1 max-w-full text-[13px] font-semibold leading-tight text-white">
          {row?.display_name || "Aguardando dados"}
        </p>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.16em]",
            isClan
              ? "border-primary/35 text-primary"
              : "border-white/15 text-white/55",
          )}
        >
          {isClan ? "Clan" : "Perfil"}
        </span>
      </div>

      {/* Profession + city */}
      <div className="flex w-full flex-col items-center gap-0 text-[10px] leading-tight text-white/55">
        <span className="line-clamp-1 max-w-full">
          {professionLabel(row ?? ({} as PodiumRow))}
        </span>
        <span className="line-clamp-1 max-w-full text-white/40">
          {locationLabel(row ?? ({} as PodiumRow))}
        </span>
      </div>

      {/* Points */}
      <div
        className="inline-flex items-baseline gap-1 rounded-full border px-2.5 py-0.5"
        style={{
          borderColor: tier.ring,
          background: `${tier.accent}1a`,
        }}
      >
        <span
          className="text-sm font-black tabular-nums"
          style={{ color: tier.accent }}
        >
          {numberFormatter.format(Math.round(points))}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">
          pts
        </span>
      </div>

      {/* LV + XP */}
      <div className="flex w-full items-center justify-center gap-2 border-t border-white/10 pt-2 text-[10px]">
        <span
          className="font-bold uppercase tracking-[0.14em]"
          style={{ color: tier.accent }}
        >
          LV. {Number.isFinite(level) ? level : 0}
        </span>
        <span className="h-2.5 w-px bg-white/15" />
        <span className="font-semibold text-white/65">
          {numberFormatter.format(Math.round(xpTotal))} XP
        </span>
      </div>
    </div>
  )

  const wrapperClass = cn(
    "flex transition duration-300 hover:-translate-y-1",
    tier.orderClass,
    tier.liftClass,
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
    <div className="grid grid-cols-3 gap-3">
      {[2, 1, 3].map((rank) => (
        <div
          key={rank}
          className={cn(
            "h-[200px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.025]",
            rank === 1 && "md:-translate-y-3",
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
      className="grid grid-cols-3 items-end gap-2 sm:gap-3"
      style={{ animation: "podiumFadeIn 0.45s ease-out both" }}
    >
      <style>{`
        @keyframes podiumFadeIn {
          from { opacity: 0; transform: translateY(10px); }
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
