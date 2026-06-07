"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

/**
 * Faixa de métricas da /account — estética Casa Views (papel creme + bloco
 * preto com número dourado). Data-driven: recebe a lista de stats e não quebra
 * se um valor vier vazio (mostra "—"). Preparada pra receber Ranking/Pontos/
 * Views/Saldo quando o backend expuser — hoje alimentada pelas contagens reais.
 */
export interface ProfileStat {
  key: string
  label: string
  value: number | string | null | undefined
  icon?: ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  /** Bloco preto com número dourado (ex.: Saldo). */
  dark?: boolean
  /** Destaca o número em dourado mesmo no card claro. */
  highlight?: boolean
}

function fmt(v: ProfileStat["value"]): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "number") return v.toLocaleString("pt-BR")
  return v
}

function Cell({ stat }: { stat: ProfileStat }) {
  const Icon = stat.icon
  const inner = (
    <>
      <span
        className={cn(
          "flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.14em]",
          stat.dark ? "text-[#E6BE4A]/80" : "text-[#7A6A50]",
        )}
      >
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {stat.label}
      </span>
      <span
        className={cn(
          "fl-display mt-0.5 text-2xl leading-none tabular-nums",
          stat.dark
            ? "text-[#E6BE4A]"
            : stat.highlight
              ? "text-[#8A650D]"
              : "text-[#080808]",
        )}
      >
        {fmt(stat.value)}
      </span>
    </>
  )
  const interactive = !!stat.href || !!stat.onClick
  const className = cn(
    "flex flex-col justify-center px-3 py-2.5 text-left transition-transform duration-200",
    stat.dark ? "cv-stat cv-stat-dark" : "cv-stat",
    interactive && "hover:-translate-y-0.5",
  )
  if (stat.onClick) {
    return (
      <button type="button" onClick={stat.onClick} className={className}>
        {inner}
      </button>
    )
  }
  if (stat.href) {
    return (
      <Link href={stat.href} className={className}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}

export function ProfileStatsStrip({
  stats,
  className,
}: {
  stats: ProfileStat[]
  className?: string
}) {
  if (!stats.length) return null
  return (
    <div
      data-cv-stats
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      {stats.map((s) => (
        <Cell key={s.key} stat={s} />
      ))}
    </div>
  )
}
