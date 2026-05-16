"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Bell, ChevronDown, MapPin, X } from "lucide-react"
import type { CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MachineFilterSheet } from "./machine-filter-sheet"
import { CityFilterSheet } from "./city-filter-sheet"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface FeedRetractableHeaderProps {
  machines: CatalogMachine[]
  selectedMachineId: number | null
  state: string | null
  city: string | null
  accent: string
  scrollRef: React.RefObject<HTMLElement | null>
  onMachineChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; city: string | null }) => void
  onClearAll: () => void
}

/**
 * Header transparente que retrai ao scrollar para baixo e reaparece ao subir.
 * Logo "freelandoo" amarelo, filtros máquina/cidade e sino de notificações.
 */
export function FeedRetractableHeader({
  machines,
  selectedMachineId,
  state,
  city,
  accent,
  scrollRef,
  onMachineChange,
  onLocationChange,
  onClearAll,
}: FeedRetractableHeaderProps) {
  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const hasFilters = !!(activeMachine || state || city)
  const locationLabel = city || state || "Cidade"

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

  const [unread, setUnread] = useState(0)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/me/notifications/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        const n = typeof data.unread_count === "number" ? data.unread_count : typeof data.count === "number" ? data.count : 0
        if (!cancelled) setUnread(n)
      } catch { /* silent */ }
    }
    load()
    const i = setInterval(load, 45000)
    return () => { cancelled = true; clearInterval(i) }
  }, [])

  const bellActive = unread > 0
  const bellColor = bellActive ? accent : "#ffffff"

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-300 will-change-transform md:left-[80px]",
        hidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="pointer-events-auto relative">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-transparent backdrop-blur-md"
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
            <MachineFilterSheet
              machines={machines}
              selectedId={selectedMachineId}
              onChange={onMachineChange}
              trigger={
                <Pill
                  label={activeMachine?.name?.replace(/^Máquina de\s+/i, "") || "Máquina"}
                  active={!!activeMachine}
                  accent={activeMachine?.color_accent || undefined}
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
            {hasFilters && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
              >
                <X className="h-3 w-3" />
                Limpar
              </button>
            )}
          </div>

          <Link
            href="/notificacoes"
            aria-label={bellActive ? `Notificações (${unread} não lidas)` : "Notificações"}
            className={cn(
              "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur transition hover:bg-black/55 active:scale-95"
            )}
            style={bellActive ? { borderColor: `${accent}88`, boxShadow: `0 0 0 1px ${accent}33, 0 6px 24px -10px ${accent}` } : undefined}
          >
            <Bell
              className="h-5 w-5 transition-colors duration-300"
              style={{ color: bellColor }}
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
          </Link>
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
      {...rest}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition-all duration-200 hover:border-white/40 hover:text-white active:scale-95"
      style={accentStyle}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
}
