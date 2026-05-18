"use client"

import type { ReactNode } from "react"
import { SearchX } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface EmptyFeedStateProps {
  hasFilters: boolean
  onReset?: () => void
  onClearLevel?: () => void
  levelFiltered?: boolean
  accent?: string
}

export function EmptyFeedState({
  hasFilters,
  onReset,
  onClearLevel,
  levelFiltered = false,
  accent = "#fbbf24",
}: EmptyFeedStateProps) {
  const t = useTranslations("Feed")
  return (
    <div
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 px-6 py-16 text-center"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 0%, ${accent}10, transparent 60%)`,
      }}
    >
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full ring-1 transition"
        style={{
          background: `${accent}10`,
          borderColor: `${accent}30`,
          boxShadow: `0 0 40px ${accent}15`,
        }}
      >
        <SearchX className="h-7 w-7" style={{ color: accent }} />
      </div>
      <h3 className="text-base font-semibold text-white">
        {levelFiltered
          ? t("noProfessionalsAtLevel", "Nenhum profissional encontrado neste nível.")
          : hasFilters
            ? t("nothingHere", "Nada por aqui")
            : t("noPostsYet", "Sem posts no momento")}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-white/55">
        {levelFiltered
          ? t("trySelectAllLevels", "Tente selecionar Todos os níveis ou ajustar os filtros.")
          : hasFilters
            ? t("tryAdjustFilters", "Tente ajustar os filtros pra ver outros posts do feed.")
            : t("newProfessionalsDaily", "Volte em instantes - novos profissionais publicam todo dia.")}
      </p>
      {levelFiltered && onClearLevel && (
        <FilterButton accent={accent} onClick={onClearLevel}>
          {t("clearLevelFilter", "Limpar filtro de nível")}
        </FilterButton>
      )}
      {!levelFiltered && hasFilters && onReset && (
        <FilterButton accent={accent} onClick={onReset}>
          {t("clearFilters", "Limpar filtros")}
        </FilterButton>
      )}
    </div>
  )
}

function FilterButton({
  accent,
  onClick,
  children,
}: {
  accent: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 rounded-full px-5 py-2 text-xs font-semibold transition active:scale-95"
      style={{
        color: accent,
        border: `1px solid ${accent}55`,
        background: `${accent}10`,
      }}
    >
      {children}
    </button>
  )
}
