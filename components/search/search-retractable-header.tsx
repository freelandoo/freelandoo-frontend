"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Bell, ChevronDown, MapPin, Star, X } from "lucide-react"
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown"
import type { CatalogCategory, CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MachineFilterSheet } from "@/components/feed/machine-filter-sheet"
import { ProfessionFilterSheet } from "@/components/feed/profession-filter-sheet"
import { CityFilterSheet } from "@/components/feed/city-filter-sheet"
import { LevelFilterSheet, LEVEL_FILTER_OPTIONS } from "@/components/feed/level-filter-sheet"
import { cn } from "@/lib/utils"
import { useNavCounts } from "@/components/navigation/use-nav-counts"
import { HoverHint } from "@/features/tour/HoverHint"

interface SearchRetractableHeaderProps {
  machines: CatalogMachine[]
  categories: CatalogCategory[]
  selectedMachineId: number | null
  selectedCategoryId: number | null
  state: string | null
  city: string | null
  levelMin: number | null
  premiumOnly: boolean
  accent: string
  scrollRef: React.RefObject<HTMLElement | null>
  onMachineChange: (id: number | null) => void
  onCategoryChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; city: string | null }) => void
  onLevelChange: (level: number | null) => void
  onPremiumToggle: () => void
  onClearAll: () => void
}

export function SearchRetractableHeader({
  machines,
  categories,
  selectedMachineId,
  selectedCategoryId,
  state,
  city,
  levelMin,
  premiumOnly,
  accent,
  scrollRef,
  onMachineChange,
  onCategoryChange,
  onLocationChange,
  onLevelChange,
  onPremiumToggle,
  onClearAll,
}: SearchRetractableHeaderProps) {
  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const activeCategory = categories.find((c) => c.id_category === selectedCategoryId) || null
  const hasFilters = !!(activeMachine || activeCategory || state || city || levelMin || premiumOnly)
  const locationLabel = city || state || "Cidade"
  const levelLabel = LEVEL_FILTER_OPTIONS.find((o) => o.value === levelMin)?.label || "Nível"

  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const navCounts = useNavCounts()
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

  const unread = navCounts.notificationUnread

  const bellActive = unread > 0
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement | null>(null)

  return (
    <>
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-300 will-change-transform md:left-[80px]",
        hidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="pointer-events-auto relative">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent backdrop-blur-md"
        />
        <div className="relative flex items-center gap-2 px-4 pb-4 pt-3 sm:gap-3 sm:px-6">
          <Link
            href="/"
            className="shrink-0 text-lg font-black tracking-tight transition-opacity hover:opacity-80 sm:text-xl"
            style={{ color: accent, textShadow: `0 1px 12px ${accent}66` }}
            aria-label="Freelandoo"
          >
            freelandoo
          </Link>

          <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <HoverHint id="search-filter-city" side="bottom" dataTour="search-filter-city">
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
            </HoverHint>
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
            <HoverHint id="search-filter-premium" side="bottom" dataTour="search-filter-premium">
              <button
                type="button"
                onClick={onPremiumToggle}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition-all duration-200 hover:border-white/40 hover:text-white active:scale-95"
                style={
                  premiumOnly
                    ? {
                        color: accent,
                        borderColor: `${accent}66`,
                        background: `${accent}22`,
                        boxShadow: `0 0 0 1px ${accent}22, 0 4px 16px -8px ${accent}55`,
                      }
                    : undefined
                }
              >
                <Star className={cn("h-3.5 w-3.5", premiumOnly && "fill-current")} />
                Premium
              </button>
            </HoverHint>
            {hasFilters && (
              <HoverHint id="search-clear-filters" side="bottom">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              </HoverHint>
            )}
          </div>

          <HoverHint id="search-bell" side="left" dataTour="search-bell">
          <button
            type="button"
            ref={bellRef}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label={bellActive ? `Notificações (${unread} não lidas)` : "Notificações"}
            aria-expanded={dropdownOpen}
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur transition hover:bg-black/55 active:scale-95"
            style={bellActive ? { borderColor: `${accent}88`, boxShadow: `0 0 0 1px ${accent}33, 0 6px 24px -10px ${accent}` } : undefined}
          >
            <Bell
              className="h-5 w-5 transition-colors duration-300"
              style={{ color: bellActive ? accent : "#ffffff" }}
              strokeWidth={2}
            />
            {bellActive && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-black"
                style={{ background: accent }}
                aria-hidden
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          </HoverHint>
        </div>
      </div>
    </div>
    <NotificationsDropdown
      open={dropdownOpen}
      anchorRef={bellRef}
      onClose={() => setDropdownOpen(false)}
      onUnreadCountChange={() => {
        window.dispatchEvent(new Event("notifications:unread-changed"))
      }}
    />
    </>
  )
}

interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  accent?: string
  icon?: React.ReactNode
}

function Pill({ label, active, accent, disabled, icon, ...rest }: PillProps) {
  const accentStyle: React.CSSProperties = active && accent
    ? {
        color: accent,
        borderColor: `${accent}66`,
        background: `${accent}22`,
        boxShadow: `0 0 0 1px ${accent}22, 0 4px 16px -8px ${accent}55`,
      }
    : {}
  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition-all duration-200 hover:border-white/40 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      style={accentStyle}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
}
