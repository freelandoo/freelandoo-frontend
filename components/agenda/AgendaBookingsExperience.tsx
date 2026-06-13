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
import { useTranslations } from "@/components/i18n/I18nProvider"
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
  const t = useTranslations("Agenda")
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
    const now = new Date()
    setAgendaWeekAnchor(startOfWeek(now, { weekStartsOn: AGENDA_WEEK_STARTS_ON }))
    setAgendaPickedDay(null)
    setAgendaMonth(now)
  }, [])

  if (standalone && loadState === "loading") {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center border-2 border-[#F1EDE2]/12 bg-[#1D1810]",
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-[#F2B705]" aria-hidden />
      </div>
    )
  }

  if (standalone && loadState === "error") {
    return (
      <div
        className={cn(
          "border-2 border-dashed border-[#F1EDE2]/15 px-6 py-14 text-center",
          className,
        )}
      >
        <p className="text-sm font-semibold text-[#9A938A]">
          {t("loadErrorBookings", "Não foi possível carregar os agendamentos agora. Tente novamente em instantes.")}
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
            aria-label={t("configureAgenda", "Configurar agenda")}
            title={t("configureAgenda", "Configurar agenda")}
            className="flex items-center justify-center border-2 border-[#F1EDE2]/25 px-3 py-3 text-[#F1EDE2] transition hover:border-[#F2B705] hover:bg-[#F2B705]/10 hover:text-[#F2B705]"
          >
            <Settings className="size-4" aria-hidden />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setMobileAgendaTab("calendar")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 border-2 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition lg:hidden",
            mobileAgendaTab === "calendar"
              ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
              : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]",
          )}
        >
          <Calendar className="size-4" aria-hidden />
          {t("tabCalendar", "Calendário")}
        </button>
        <button
          type="button"
          onClick={() => setMobileAgendaTab("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 border-2 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition lg:hidden",
            mobileAgendaTab === "list"
              ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
              : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]",
          )}
        >
          <Briefcase className="size-4" aria-hidden />
          {t("bookingsEyebrow", "Agendamentos")}
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
