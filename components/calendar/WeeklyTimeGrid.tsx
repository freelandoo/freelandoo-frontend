"use client"

import { useMemo, useRef, useEffect, useState, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import ptBrLocale from "@fullcalendar/core/locales/pt-br"
import type { CalendarEvent } from "./types"
import { STATUS_COLOR } from "./types"

interface WeeklyTimeGridProps {
  weekStart: Date
  events: CalendarEvent[]
  availableBackground?: { date: string; slots: { start: string; end: string }[] }[]
  slotMinTime?: string
  slotMaxTime?: string
  slotDuration?: string
  onAvailableClick?: (slot: { dateISO: string; startTime: string; endTime: string }) => void
  onEventClick?: (event: CalendarEvent) => void
  readOnly?: boolean
  showHeaderToolbar?: boolean
  height?: number | "auto"
}

export function WeeklyTimeGrid({
  weekStart,
  events,
  availableBackground,
  slotMinTime = "06:00:00",
  slotMaxTime = "23:00:00",
  slotDuration = "00:30:00",
  onAvailableClick,
  onEventClick,
  readOnly = false,
  showHeaderToolbar = false,
  height = "auto",
}: WeeklyTimeGridProps) {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [disabledSlots, setDisabledSlots] = useState<Set<string>>(new Set())

  const toggleDisabled = useCallback((key: string) => {
    setDisabledSlots(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (api) api.gotoDate(weekStart)
  }, [weekStart])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (api) api.changeView(isMobile ? "timeGridDay" : "timeGridWeek")
  }, [isMobile])

  const fcEvents = useMemo(() => {
    // Ranges ocupados (booking ativo) para filtrar slots por OVERLAP, não por start exato.
    const occupiedRanges = events.map(e => ({
      startMs: new Date(e.start).getTime(),
      endMs: new Date(e.end).getTime(),
    }))
    const overlapsBooking = (startMs: number, endMs: number) =>
      occupiedRanges.some(r => startMs < r.endMs && endMs > r.startMs)

    const bookedBlocks = events.map(e => {
      const c = STATUS_COLOR[e.status]
      return {
        id: e.id,
        title: e.status === "blocked" ? "indisp." : e.title,
        start: e.start,
        end: e.end,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        classNames: [`freelandoo-evt-${e.status}`],
        extendedProps: { ...e.meta, status: e.status, kind: "booking" },
      }
    })
    const nowMs = Date.now()
    const blockedColor = STATUS_COLOR.blocked
    const availableBlocks = (availableBackground || []).flatMap(d =>
      d.slots
        .filter(s => {
          const startMs = new Date(`${d.date}T${s.start}:00`).getTime()
          const endMs = new Date(`${d.date}T${s.end}:00`).getTime()
          return !overlapsBooking(startMs, endMs)
        })
        .map(s => {
          const startMs = new Date(`${d.date}T${s.start}:00`).getTime()
          const endMs = new Date(`${d.date}T${s.end}:00`).getTime()
          const isPast = endMs <= nowMs
          const slotKey = `${d.date}|${s.start}`
          const isDisabled = disabledSlots.has(slotKey)
          if (isPast || isDisabled) {
            return {
              id: isPast ? `past-${d.date}-${s.start}` : `dis-${d.date}-${s.start}`,
              title: "Indisp.",
              start: `${d.date}T${s.start}:00`,
              end: `${d.date}T${s.end}:00`,
              backgroundColor: blockedColor.bg,
              borderColor: blockedColor.border,
              textColor: blockedColor.text,
              classNames: ["freelandoo-evt-blocked"],
              extendedProps: {
                kind: isDisabled ? "disabled" : "past",
                status: "blocked",
                slotKey,
                dateISO: d.date,
                startTime: s.start,
                endTime: s.end,
              },
            }
          }
          return {
            id: `avail-${d.date}-${s.start}`,
            title: `${s.start} - ${s.end}`,
            start: `${d.date}T${s.start}:00`,
            end: `${d.date}T${s.end}:00`,
            display: "auto",
            backgroundColor: "rgba(59, 130, 246, 0.35)",
            borderColor: "rgba(59, 130, 246, 0.6)",
            textColor: "#ffffff",
            classNames: ["freelandoo-evt-available"],
            extendedProps: { kind: "available", dateISO: d.date, startTime: s.start, endTime: s.end, slotKey },
          }
        })
    )
    return [...bookedBlocks, ...availableBlocks]
  }, [events, availableBackground, disabledSlots])

  return (
    <div className="freelandoo-weekly-grid">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={weekStart}
        locale={ptBrLocale}
        firstDay={0}
        allDaySlot={false}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        slotDuration={slotDuration}
        nowIndicator
        selectable={!readOnly}
        selectMirror
        height={height}
        expandRows
        headerToolbar={showHeaderToolbar ? { left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay" } : false}
        events={fcEvents}
        eventClick={(info) => {
          info.jsEvent.preventDefault()
          const kind = info.event.extendedProps.kind
          if (kind === "available") {
            if (readOnly) return
            const key = info.event.extendedProps.slotKey as string
            toggleDisabled(key)
            return
          }
          if (kind === "disabled") {
            if (readOnly) return
            const key = info.event.extendedProps.slotKey as string
            toggleDisabled(key)
            return
          }
          if (kind === "booking" && onEventClick) {
            const ev = events.find(e => e.id === info.event.id)
            if (ev) onEventClick(ev)
          }
        }}
        eventDidMount={(info) => {
          const kind = info.event.extendedProps.kind
          if (kind === "available") {
            info.el.setAttribute("data-time", info.event.extendedProps.startTime)
          } else if (kind === "booking") {
            const status = info.event.extendedProps.status
            const labels: Record<string, string> = {
              confirmed: "Reservado",
              blocked: "Indisponível",
            }
            info.el.setAttribute("title", labels[status] || "Indisponível")
          }
        }}
      />
      <style jsx global>{`
        .freelandoo-weekly-grid .fc {
          --fc-border-color: rgb(39 39 42);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgb(24 24 27);
          --fc-list-event-hover-bg-color: rgb(39 39 42);
          --fc-today-bg-color: transparent;
          --fc-now-indicator-color: #facc15;
          color: rgb(228 228 231);
          font-family: inherit;
        }
        .freelandoo-weekly-grid .fc-col-header-cell {
          background: rgb(24 24 27);
          padding: 8px 0;
        }
        .freelandoo-weekly-grid .fc-col-header-cell-cushion {
          color: rgb(212 212 216);
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 4px 8px;
          text-decoration: none !important;
        }
        .freelandoo-weekly-grid .fc-timegrid-slot-label-cushion {
          color: rgb(113 113 122);
          font-size: 11px;
        }
        .freelandoo-weekly-grid .fc-timegrid-slot {
          height: 2.5em !important;
        }
        .freelandoo-weekly-grid .fc-timegrid-slot-lane:hover {
          background: transparent;
          cursor: ${readOnly ? "default" : "pointer"};
        }
        .freelandoo-weekly-grid .fc-event {
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }
        .freelandoo-weekly-grid .fc-bg-event {
          opacity: 1 !important;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available {
          cursor: ${readOnly ? "default" : "pointer"};
          transition: background-color 120ms ease, border-color 120ms ease;
          position: relative;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available:hover {
          background-color: ${readOnly ? "rgba(59, 130, 246, 0.35)" : "rgba(59, 130, 246, 0.55)"} !important;
          border-color: #3b82f6 !important;
          color: #ffffff !important;
          z-index: 5;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available .fc-event-title {
          font-weight: 600;
          font-size: 11px;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available .fc-event-time {
          display: none;
        }

        .freelandoo-weekly-grid .freelandoo-evt-blocked {
          cursor: ${readOnly ? "default" : "pointer"};
        }
        .freelandoo-weekly-grid .freelandoo-evt-blocked .fc-event-time {
          display: none;
        }
        .freelandoo-weekly-grid .freelandoo-evt-blocked .fc-event-title {
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          width: 100%;
          color: rgb(244 244 245);
          letter-spacing: 0.02em;
        }

        .freelandoo-weekly-grid .fc-button-primary {
          background: rgb(39 39 42) !important;
          border-color: rgb(63 63 70) !important;
          color: rgb(212 212 216) !important;
          text-transform: capitalize;
          font-size: 13px;
        }
        .freelandoo-weekly-grid .fc-button-primary:hover {
          background: rgb(63 63 70) !important;
        }
        .freelandoo-weekly-grid .fc-button-primary:not(:disabled).fc-button-active {
          background: #facc15 !important;
          border-color: #facc15 !important;
          color: rgb(24 24 27) !important;
        }
        .freelandoo-weekly-grid .fc-toolbar-title {
          color: rgb(244 244 245);
          font-size: 16px;
          font-weight: 600;
        }
        .freelandoo-weekly-grid .fc-timegrid-now-indicator-line {
          border-color: #facc15;
          border-width: 2px;
        }
        .freelandoo-weekly-grid .fc-timegrid-now-indicator-arrow {
          border-color: #facc15;
        }
      `}</style>
    </div>
  )
}
