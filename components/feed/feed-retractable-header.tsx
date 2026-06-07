"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, MapPin, X } from "lucide-react"
import type { CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MachineFilterSheet } from "./machine-filter-sheet"
import { RegionFilterSheet } from "./region-filter-sheet"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface FeedRetractableHeaderProps {
  machines: CatalogMachine[]
  selectedMachineId: number | null
  state: string | null
  regionId: number | null
  regionName: string | null
  accent: string
  scrollRef: React.RefObject<HTMLElement | null>
  onMachineChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; regionId: number | null; regionName: string | null }) => void
  onClearAll: () => void
}

/**
 * Cabeçalho tabloide que retrai ao scrollar para baixo e reaparece ao subir.
 * Estilo "papel" do ranking/mensagens: logo em fl-display dourado, filtros como
 * botões de borda dura. Sem sino de notificações (vive na navegação lateral).
 */
export function FeedRetractableHeader({
  machines,
  selectedMachineId,
  state,
  regionId,
  regionName,
  accent,
  scrollRef,
  onMachineChange,
  onLocationChange,
  onClearAll,
}: FeedRetractableHeaderProps) {
  const t = useTranslations("Feed")
  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const hasFilters = !!(activeMachine || state || regionId)
  const locationLabel = regionName || state || t("regionLabel", "Região")

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

          <div
            data-tour="feed-filters"
            className="ml-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:ml-2"
          >
            <MachineFilterSheet
              machines={machines}
              selectedId={selectedMachineId}
              onChange={onMachineChange}
              trigger={
                <Pill
                  label={activeMachine?.name?.replace(/^Enxame de\s+/i, "") || t("machineLabel", "Enxame")}
                  active={!!activeMachine}
                  accent={activeMachine?.color_accent || undefined}
                />
              }
            />
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
            {hasFilters && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex h-9 shrink-0 items-center gap-1 border-2 border-[#F1EDE2]/25 bg-transparent px-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#C9C2B6] transition-colors hover:border-[#F1EDE2] hover:text-[#F1EDE2]"
              >
                <X className="h-3 w-3" />
                {t("clearButton", "Limpar")}
              </button>
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

const Pill = function Pill({ label, active, accent, icon, ...rest }: PillProps) {
  const tint = accent || "#F2B705"
  const activeStyle: React.CSSProperties = active
    ? { background: tint, borderColor: "#0B0B0D", color: "#0B0B0D" }
    : {}
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 border-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
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
