"use client"

import { forwardRef } from "react"
import { ChevronDown, MapPin, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { CatalogCategory, CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MachineFilterSheet } from "./machine-filter-sheet"
import { ProfessionFilterSheet } from "./profession-filter-sheet"
import { CityFilterSheet } from "./city-filter-sheet"
import { LevelFilterSheet, LEVEL_FILTER_OPTIONS } from "./level-filter-sheet"

interface PortfolioFeedHeadcardProps {
  machines: CatalogMachine[]
  categories: CatalogCategory[]
  selectedMachineId: number | null
  selectedCategoryId: number | null
  state: string | null
  city: string | null
  levelMin: number | null
  accent: string
  onMachineChange: (id: number | null) => void
  onCategoryChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; city: string | null }) => void
  onLevelChange: (level: number | null) => void
  onClearAll: () => void
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

export function PortfolioFeedHeadcard({
  machines,
  categories,
  selectedMachineId,
  selectedCategoryId,
  state,
  city,
  levelMin,
  accent,
  onMachineChange,
  onCategoryChange,
  onLocationChange,
  onLevelChange,
  onClearAll,
}: PortfolioFeedHeadcardProps) {
  const t = useTranslations("Feed")
  const { user, status } = useAuth()
  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const activeCategory = categories.find((c) => c.id_category === selectedCategoryId) || null
  const hasFilters = !!(activeMachine || activeCategory || state || city || levelMin)

  const locationLabel = city || state || t("cityLabel", "Cidade")
  const levelLabelRaw =
    LEVEL_FILTER_OPTIONS.find((option) => option.value === levelMin)?.label ||
    "Todos os níveis"
  const levelLabelKeyMap: Record<string, string> = {
    "Todos os níveis": "allLevels",
    "Nível 1+": "level1Plus",
    "Nível 5+": "level5Plus",
    "Nível 10+": "level10Plus",
    "Nível 20+": "level20Plus",
    "Nível 30+": "level30Plus",
  }
  const levelLabel = t(levelLabelKeyMap[levelLabelRaw] || levelLabelRaw, levelLabelRaw)
  const isLoggedIn = status === "authenticated" && !!user
  const greetingName = (user?.nome || "").trim().split(/\s+/)[0] || ""

  return (
    <div className="z-30 -mx-4 mb-2 box-border min-w-0 w-full border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/15">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.nome} />}
            <AvatarFallback className="bg-white/10 text-[11px] font-semibold text-white">
              {getInitials(user?.nome)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: `${accent}22`, color: accent }}
            aria-hidden
          >
            <span className="text-base">✨</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight text-white">{t("title", "Feed")}</h1>
          <p className="truncate text-[11px] text-white/50">
            {isLoggedIn && greetingName
              ? t("greetingUser", "Olá, {name}").replace("{name}", greetingName)
              : t("discoverNearby", "Descubra trabalhos perto de você")}
          </p>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-3 w-3" />
            {t("clearButton", "Limpar")}
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
              label={activeMachine?.name || t("machineLabel", "Máquina")}
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
              label={activeCategory?.desc_category || t("professionLabel", "Profissão")}
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
        <LevelFilterSheet
          selectedLevel={levelMin}
          onChange={onLevelChange}
          accent={accent}
          trigger={
            <Pill
              label={levelLabel}
              active={levelMin != null}
              accent={levelMin != null ? accent : undefined}
            />
          }
        />
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

const Pill = forwardRef<HTMLButtonElement, PillProps>(function Pill(
  { label, active, accent, disabled, icon, style, className, ...rest },
  ref
) {
  const accentStyle: React.CSSProperties = active && accent
    ? {
        color: accent,
        borderColor: `${accent}66`,
        background: `${accent}18`,
        boxShadow: `0 0 0 1px ${accent}22, 0 4px 16px -8px ${accent}55`,
      }
    : {}
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      {...rest}
      className={
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50" +
        (className ? ` ${className}` : "")
      }
      style={{ ...accentStyle, ...(style || {}) }}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
})
