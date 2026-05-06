"use client"

import { ChevronDown, MapPin, Sparkles, X } from "lucide-react"
import type { CatalogCategory, CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MachineFilterSheet } from "./machine-filter-sheet"
import { ProfessionFilterSheet } from "./profession-filter-sheet"
import { CityFilterSheet } from "./city-filter-sheet"

interface PortfolioFeedHeadcardProps {
  machines: CatalogMachine[]
  categories: CatalogCategory[]
  selectedMachineId: number | null
  selectedCategoryId: number | null
  state: string | null
  city: string | null
  accent: string
  onMachineChange: (id: number | null) => void
  onCategoryChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; city: string | null }) => void
  onClearAll: () => void
}

export function PortfolioFeedHeadcard({
  machines,
  categories,
  selectedMachineId,
  selectedCategoryId,
  state,
  city,
  accent,
  onMachineChange,
  onCategoryChange,
  onLocationChange,
  onClearAll,
}: PortfolioFeedHeadcardProps) {
  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const activeCategory = categories.find((c) => c.id_category === selectedCategoryId) || null
  const hasFilters = !!(activeMachine || activeCategory || state || city)

  const locationLabel = city || state || "Cidade"

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
      <div className="flex items-center gap-2">
        <Sparkles
          className="h-5 w-5 shrink-0"
          style={{ color: accent }}
          aria-hidden
        />
        <h1 className="text-base font-semibold text-white">Explorar</h1>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-auto inline-flex items-center gap-1 text-xs text-white/60 transition hover:text-white"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MachineFilterSheet
          machines={machines}
          selectedId={selectedMachineId}
          onChange={onMachineChange}
          trigger={
            <Pill
              label={activeMachine?.name || "Máquina"}
              active={!!activeMachine}
              accent={activeMachine?.color_accent || undefined}
            />
          }
        />
        <ProfessionFilterSheet
          categories={categories}
          selectedId={selectedCategoryId}
          onChange={onCategoryChange}
          disabled={!activeMachine}
          accent={accent}
          trigger={
            <Pill
              label={activeCategory?.desc_category || "Profissão"}
              active={!!activeCategory}
              accent={activeCategory ? accent : undefined}
              disabled={!activeMachine}
            />
          }
        />
        <CityFilterSheet
          state={state}
          city={city}
          onChange={onLocationChange}
          accent={accent}
          trigger={
            <Pill
              label={locationLabel}
              active={!!(state || city)}
              accent={state || city ? accent : undefined}
              icon={<MapPin className="h-3.5 w-3.5" />}
            />
          }
        />
      </div>
    </div>
  )
}

interface PillProps {
  label: string
  active?: boolean
  accent?: string
  disabled?: boolean
  icon?: React.ReactNode
}

function Pill({ label, active, accent, disabled, icon }: PillProps) {
  const style: React.CSSProperties = active && accent
    ? {
        color: accent,
        borderColor: `${accent}66`,
        background: `${accent}18`,
        boxShadow: `0 0 0 1px ${accent}22, 0 4px 16px -8px ${accent}55`,
      }
    : {}
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      style={style}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
}
