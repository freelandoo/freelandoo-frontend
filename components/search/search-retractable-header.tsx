"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, MapPin, Star, X } from "lucide-react"
import type { CatalogCategory, CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MachineFilterSheet } from "@/components/feed/machine-filter-sheet"
import { ProfessionFilterSheet } from "@/components/feed/profession-filter-sheet"
import { RegionFilterSheet } from "@/components/feed/region-filter-sheet"
import { LevelFilterSheet, LEVEL_FILTER_OPTIONS } from "@/components/feed/level-filter-sheet"
import { cn } from "@/lib/utils"
import { HoverHint } from "@/features/tour/HoverHint"

type HeaderTab = "services" | "products" | "courses"

interface SearchRetractableHeaderProps {
  machines: CatalogMachine[]
  categories: CatalogCategory[]
  selectedMachineId: number | null
  selectedCategoryId: number | null
  state: string | null
  regionId: number | null
  regionName: string | null
  levelMin: number | null
  premiumOnly: boolean
  accent: string
  scrollRef: React.RefObject<HTMLElement | null>
  /** Aba ativa — define quais filtros aparecem. Default: services. */
  tab?: HeaderTab
  onMachineChange: (id: number | null) => void
  onCategoryChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; regionId: number | null; regionName: string | null }) => void
  onLevelChange: (level: number | null) => void
  onPremiumToggle: () => void
  onClearAll: () => void
}

/**
 * Cabeçalho tabloide da vitrine (Enxame) que retrai ao scrollar e reaparece ao
 * subir. Estilo "papel" do ranking/mensagens: logo fl-display dourado, filtros
 * de borda dura. Sem sino de notificações (vive na navegação lateral).
 */
export function SearchRetractableHeader({
  machines,
  categories,
  selectedMachineId,
  selectedCategoryId,
  state,
  regionId,
  regionName,
  levelMin,
  premiumOnly,
  accent,
  scrollRef,
  tab = "services",
  onMachineChange,
  onCategoryChange,
  onLocationChange,
  onLevelChange,
  onPremiumToggle,
  onClearAll,
}: SearchRetractableHeaderProps) {
  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const activeCategory = categories.find((c) => c.id_category === selectedCategoryId) || null
  const hasFilters = !!(activeMachine || activeCategory || state || regionId || levelMin || premiumOnly)

  // Visibilidade de filtro por aba:
  //  services → enxame, profissão, cidade, nível, premium
  //  products → cidade (categoria de produto vive na barra de chips da página)
  //  courses  → enxame, profissão
  const showMachine = tab === "services" || tab === "courses"
  const showProfession = tab === "services" || tab === "courses"
  const showCity = tab === "services" || tab === "products"
  const showLevel = tab === "services"
  const showPremium = tab === "services"
  const locationLabel = regionName || state || "Região"
  const levelLabel = LEVEL_FILTER_OPTIONS.find((o) => o.value === levelMin)?.label || "Nível"

  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const y = el.scrollTop
      const delta = y - lastScrollY.current
      if (y < 24) setHidden(false)
      else if (delta > 6) setHidden(true)
      else if (delta < -6) setHidden(false)
      lastScrollY.current = y
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [scrollRef])

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-300 will-change-transform md:left-[80px]",
        hidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="fl-root pointer-events-auto relative border-b-2 border-[#0B0B0D] bg-[#0b0804]/95 backdrop-blur-md">
        {/* faixa dourada inferior — assinatura tabloide */}
        <div aria-hidden className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-[#F2B705]" />

        <div className="relative flex items-center gap-2 px-4 pb-3 pt-3 sm:gap-3 sm:px-6">
          <Link
            href="/"
            className="fl-display shrink-0 text-2xl leading-none text-[#F2B705] transition-transform hover:-translate-y-0.5 sm:text-[1.7rem]"
            aria-label="Freelandoo"
          >
            freelandoo
            <span className="text-[#F1EDE2]">.</span>
          </Link>

          <div className="ml-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:ml-2">
            {showMachine && (
              <HoverHint id="search-filter-machine" side="bottom" dataTour="search-filter-machine">
                <MachineFilterSheet
                  machines={machines}
                  selectedId={selectedMachineId}
                  onChange={(id) => { onMachineChange(id); onCategoryChange(null) }}
                  trigger={
                    <Pill
                      label={activeMachine?.name?.replace(/^Enxame de\s+/i, "") || "Enxame"}
                      active={!!activeMachine}
                      accent={activeMachine?.color_accent || undefined}
                    />
                  }
                />
              </HoverHint>
            )}
            {showProfession && (
              <HoverHint id="search-filter-profession" side="bottom" dataTour="search-filter-profession">
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
              </HoverHint>
            )}
            {showCity && (
              <HoverHint id="search-filter-city" side="bottom" dataTour="search-filter-city">
                <RegionFilterSheet
                  state={state}
                  regionId={regionId}
                  regionName={regionName}
                  onChange={onLocationChange}
                  accent={accent}
                  trigger={
                    <Pill
                      label={locationLabel}
                      active={!!(state || regionId)}
                      accent={state || regionId ? accent : undefined}
                      icon={<MapPin className="h-3.5 w-3.5" />}
                    />
                  }
                />
              </HoverHint>
            )}
            {showLevel && (
              <HoverHint id="search-filter-level" side="bottom" dataTour="search-filter-level">
                <LevelFilterSheet
                  selectedLevel={levelMin}
                  onChange={onLevelChange}
                  accent={accent}
                  trigger={
                    <Pill
                      label={levelMin != null ? levelLabel : "Nível"}
                      active={levelMin != null}
                      accent={levelMin != null ? accent : undefined}
                    />
                  }
                />
              </HoverHint>
            )}
            {showPremium && (
              <HoverHint id="search-filter-premium" side="bottom" dataTour="search-filter-premium">
                <button
                  type="button"
                  onClick={onPremiumToggle}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 border-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                    premiumOnly
                      ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                      : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                  )}
                >
                  <Star className={cn("h-3.5 w-3.5", premiumOnly && "fill-current")} />
                  Premium
                </button>
              </HoverHint>
            )}
            {hasFilters && (
              <HoverHint id="search-clear-filters" side="bottom">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex h-9 shrink-0 items-center gap-1 border-2 border-[#F1EDE2]/25 bg-transparent px-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#C9C2B6] transition-colors hover:border-[#F1EDE2] hover:text-[#F1EDE2]"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              </HoverHint>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  accent?: string
  icon?: React.ReactNode
}

function Pill({ label, active, accent, disabled, icon, ...rest }: PillProps) {
  const tint = accent || "#F2B705"
  const activeStyle: React.CSSProperties = active
    ? { background: tint, borderColor: "#0B0B0D", color: "#0B0B0D" }
    : {}
  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 border-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
        active
          ? "shadow-[3px_3px_0_0_#0B0B0D]"
          : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
      )}
      style={activeStyle}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
}
