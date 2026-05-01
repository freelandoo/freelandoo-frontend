"use client"

import { motion } from "framer-motion"
import { Star, Eye, Heart } from "lucide-react"
import Link from "next/link"
import type { MachineTheme } from "./tokens"

type RankingCardProps = {
  rank: number
  id_profile: string
  name: string
  avatar_url: string | null
  specialty: string
  rating: number
  visits: number
  likes: number
  machine: MachineTheme
  is_clan?: boolean
  members_count?: number | null
}

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3 w-3"
          style={{
            fill: i < full ? "#fbbf24" : i === full && half ? "url(#half)" : "transparent",
            color: i < full || (i === full && half) ? "#fbbf24" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </span>
  )
}

export function RankingCard({
  rank,
  id_profile,
  name,
  avatar_url,
  specialty,
  rating,
  visits,
  likes,
  machine,
  is_clan,
  members_count,
}: RankingCardProps) {
  const profileHref = is_clan ? `/clans/${id_profile}` : `/freelancer/${id_profile}`
  const specialtyLabel = is_clan
    ? `Clan${members_count ? ` · ${members_count} membro${members_count !== 1 ? "s" : ""}` : ""}`
    : specialty
  const isTop = rank === 1
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: rank * 0.06 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur transition hover:border-white/20"
      style={{
        boxShadow: isTop ? `0 0 40px -12px ${machine.colors.glow}` : undefined,
      }}
    >
      {isTop && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${machine.colors.from}33, transparent, ${machine.colors.to}33)`,
          }}
        />
      )}

      <div className="relative flex items-center gap-4 p-4">
        {/* Rank */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{
            background: isTop
              ? `linear-gradient(135deg, ${machine.colors.from}, ${machine.colors.to})`
              : "rgba(255,255,255,0.05)",
            color: isTop ? "#fff" : machine.colors.accent,
          }}
        >
          #{rank}
        </div>

        {/* Avatar */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 overflow-hidden text-lg font-semibold"
          style={{
            background: `linear-gradient(135deg, ${machine.colors.from}33, ${machine.colors.to}22)`,
            color: machine.colors.text,
          }}
        >
          {avatar_url ? (
            <img src={avatar_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-white">{name}</h4>
          <p className="truncate text-xs text-white/50">{specialtyLabel}</p>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-white/40">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {visits.toLocaleString("pt-BR")}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {likes.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Right stats */}
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-white">
              {rating > 0 ? rating.toFixed(1) : "—"}
            </span>
          </div>
          <StarRating value={rating} />
        </div>

        {/* Profile link */}
        <Link
          href={profileHref}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white text-xs font-bold"
          aria-label={`Ver perfil de ${name}`}
        >
          →
        </Link>
      </div>
    </motion.div>
  )
}
