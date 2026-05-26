"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { startOfWeek, addDays } from "date-fns"
import { Briefcase, Calendar, Loader2, Settings } from "lucide-react"
import { AgendaMonthCalendar } from "@/components/agenda/AgendaMonthCalendar"
import { AgendaBookingsPanel, type AgendaBookingRow } from "@/components/agenda/AgendaBookingsPanel"
import {
  AGENDA_WEEK_STARTS_ON,
  buildBookingCountByDate,
  filterBookingsForDay,
  filterBookingsForWeek,
} from "@/components/agenda/agenda-booking-utils"
import { cn } from "@/lib/utils"

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface AgendaBookingsExperienceProps {
  profileId: string
  /**
   * Lista já carregada (ex.: página `/agenda`).
   * Se omitido, este componente busca `/api/profile/{id}/bookings`.
   */
  controlledBookings?: AgendaBookingRow[]
  className?: string
  /** Se passado, mostra um botão de engrenagem que linka para a página de configuração da agenda. */
  settingsHref?: string
}

export function AgendaBookingsExperience({
  profileId,
  controlledBookings,
  className,
  settingsHref,
}: AgendaBookingsExperienceProps) {
  const standalone = controlledBookings === undefined

  const [internalBookings, setInternalBookings] = useState<AgendaBookingRow[]>([])
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">(
    standalone ? "loading" : "ok",
  )

  const [agendaMonth, setAgendaMonth] = useState<Date>(() => new Date())
  const [agendaWeekAnchor, setAgendaWeekAnchor] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: AGENDA_WEEK_STARTS_ON }),
  )
  const [agendaPickedDay, setAgendaPickedDay] = useState<Date | null>(null)
  const [mobileAgendaTab, setMobileAgendaTab] = useState<"calendar" | "list">("list")

  useEffect(() => {
    if (!standalone) return
    let cancelled = false
    async function load() {
      setLoadState("loading")
      try {
        const res = await fetch(`/api/profile/${profileId}/bookings`, { headers: authHeaders() })
        const d = await res.json()
        if (cancelled) return
        if (res.ok) {
          const list = (d.bookings || []) as AgendaBookingRow[]
          list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
          setInternalBookings(list)
          setLoadState("ok")
        } else {
          setLoadState("error")
        }
      } catch {
        if (!cancelled) setLoadState("error")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profileId, standalone])

  const bookings = standalone ? internalBookings : controlledBookings!

  const bookingCountByDate = useMemo(() => buildBookingCountByDate(bookings), [bookings])

  useEffect(() => {
    if (agendaPickedDay) return
    setAgendaMonth(agendaWeekAnchor)
  }, [agendaWeekAnchor, agendaPickedDay])

  const agendaFilteredBookings = useMemo(() => {
    if (agendaPickedDay) return filterBookingsForDay(bookings, agendaPickedDay)
    return filterBookingsForWeek(bookings, agendaWeekAnchor)
  }, [bookings, agendaPickedDay, agendaWeekAnchor])

  const handlePickAgendaDay = useCallback((d: Date) => {
    setAgendaPickedDay(d)
    setAgendaWeekAnchor(startOfWeek(d, { weekStartsOn: AGENDA_WEEK_STARTS_ON }))
    setAgendaMonth(d)
    setMobileAgendaTab("list")
  }, [])

  const handleClearAgendaDay = useCallback(() => setAgendaPickedDay(null), [])

  const handleAgendaPrevWeek = useCallback(() => {
    setAgendaWeekAnchor((prev) => addDays(prev, -7))
  }, [])

  const handleAgendaNextWeek = useCallback(() => {
    setAgendaWeekAnchor((prev) => addDays(prev, 7))
  }, [])

  const handleAgendaThisWeek = useCallback(() => {
    const t = new Date()
    setAgendaWeekAnchor(startOfWeek(t, { weekStartsOn: AGENDA_WEEK_STARTS_ON }))
    setAgendaPickedDay(null)
    setAgendaMonth(t)
  }, [])

  if (standalone && loadState === "loading") {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40",
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-yellow-500/60" aria-hidden />
      </div>
    )
  }

  if (standalone && loadState === "error") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-14 text-center",
          className,
        )}
      >
        <p className="text-sm text-zinc-400">
          Não foi possível carregar os agendamentos agora. Tente novamente em instantes.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn("flex gap-2", !settingsHref && "lg:hidden")}>
        {settingsHref ? (
          <Link
            href={settingsHref}
            aria-label="Configurar agenda"
            title="Configurar agenda"
            className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-zinc-300 transition hover:border-yellow-500/35 hover:bg-yellow-400/10 hover:text-yellow-200"
          >
            <Settings className="size-4" aria-hidden />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setMobileAgendaTab("calendar")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition lg:hidden",
            mobileAgendaTab === "calendar"
              ? "border-yellow-500/35 bg-yellow-400/15 text-yellow-200"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
          )}
        >
          <Calendar className="size-4" aria-hidden />
          Calendário
        </button>
        <button
          type="button"
          onClick={() => setMobileAgendaTab("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition lg:hidden",
            mobileAgendaTab === "list"
              ? "border-yellow-500/35 bg-yellow-400/15 text-yellow-200"
              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
          )}
        >
          <Briefcase className="size-4" aria-hidden />
          Agendamentos
        </button>
      </div>

      <div className="grid min-h-[420px] gap-6 lg:min-h-[560px] lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className={cn("min-w-0", mobileAgendaTab !== "calendar" && "hidden lg:block")}>
          <AgendaMonthCalendar
            month={agendaMonth}
            onMonthChange={setAgendaMonth}
            weekAnchor={agendaWeekAnchor}
            pickedDay={agendaPickedDay}
            bookingCountByDate={bookingCountByDate}
            onPickDay={handlePickAgendaDay}
          />
        </div>
        <div className={cn("min-w-0", mobileAgendaTab !== "list" && "hidden lg:block")}>
          <AgendaBookingsPanel
            bookings={agendaFilteredBookings}
            pickedDay={agendaPickedDay}
            weekAnchor={agendaWeekAnchor}
            onPrevWeek={handleAgendaPrevWeek}
            onNextWeek={handleAgendaNextWeek}
            onGoCurrentWeek={handleAgendaThisWeek}
            onClearDay={handleClearAgendaDay}
          />
        </div>
      </div>
    </div>
  )
}
