"use client"

import { motion } from "framer-motion"
import { MessageCircle, Star, Clock, TrendingUp, CheckCircle, Flame, Zap } from "lucide-react"
import type { MachineTheme } from "./tokens"

type RankingCardProps = {
  rank: number
  name: string
  specialty: string
  rating: number
  responseTime: string
  badges: string[]
  machine: MachineTheme
}

const BADGE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  "Em alta": { icon: Flame, color: "#f59e0b" },
  "Responde rápido": { icon: Zap, color: "#22c55e" },
  "Muito procurado": { icon: TrendingUp, color: "#8b5cf6" },
  "Bem avaliado": { icon: Star, color: "#eab308" },
  "Perfil completo": { icon: CheckCircle, color: "#06b6d4" },
}

export function RankingCard({
  rank,
  name,
  specialty,
  rating,
  responseTime,
  badges,
  machine,
}: RankingCardProps) {
  const isTop = rank === 1

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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg font-semibold"
          style={{
            background: `linear-gradient(135deg, ${machine.colors.from}33, ${machine.colors.to}22)`,
            color: machine.colors.text,
          }}
        >
          {name.charAt(0)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-white">{name}</h4>
          <p className="truncate text-xs text-white/50">{specialty}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {badges.slice(0, 2).map((badge) => {
              const config = BADGE_CONFIG[badge]
              if (!config) return null
              const Icon = config.icon
              return (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider"
                  style={{ color: config.color }}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {badge}
                </span>
              )
            })}
          </div>
        </div>

        {/* Right stats */}
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Clock className="h-3 w-3" />
            {responseTime}
          </div>
        </div>

        {/* WhatsApp button */}
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-emerald-500/20 hover:text-emerald-400"
          aria-label={`Conversar com ${name}`}
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}
