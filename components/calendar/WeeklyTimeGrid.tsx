"use client"

import { useMemo, useRef, useEffect, useState } from "react"
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
    const taken = new Set(events.map(e => `${e.start.substring(0, 16)}`)) // bloqueia slots já com booking
    const bookedBlocks = events.map(e => {
      const c = STATUS_COLOR[e.status]
      return {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        classNames: [`freelandoo-evt-${e.status}`],
        extendedProps: { ...e.meta, status: e.status, kind: "booking" },
      }
    })
    const availableBlocks = (availableBackground || []).flatMap(d =>
      d.slots
        .filter(s => !taken.has(`${d.date}T${s.start}`))
        .map(s => ({
          id: `avail-${d.date}-${s.start}`,
          title: s.start,
          start: `${d.date}T${s.start}:00`,
          end: `${d.date}T${s.end}:00`,
          backgroundColor: "rgba(250, 204, 21, 0.10)",
          borderColor: "rgba(250, 204, 21, 0.40)",
          textColor: "#fde68a",
          classNames: ["freelandoo-evt-available"],
          extendedProps: { kind: "available", dateISO: d.date, startTime: s.start, endTime: s.end },
        }))
    )
    return [...bookedBlocks, ...availableBlocks]
  }, [events, availableBackground])

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
            if (readOnly || !onAvailableClick) return
            onAvailableClick({
              dateISO: info.event.extendedProps.dateISO,
              startTime: info.event.extendedProps.startTime,
              endTime: info.event.extendedProps.endTime,
            })
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
            info.el.setAttribute("title", `Disponível • ${info.event.extendedProps.startTime}`)
          } else if (kind === "booking") {
            const status = info.event.extendedProps.status
            const labels: Record<string, string> = {
              confirmed: "Reservado",
              pending_payment: "Aguardando pagamento",
              blocked: "Bloqueado",
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
          --fc-today-bg-color: rgba(250, 204, 21, 0.04);
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
          background: rgba(250, 204, 21, 0.04);
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
          transition: background-color 120ms ease, border-color 120ms ease, transform 80ms ease;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available:hover {
          background-color: ${readOnly ? "rgba(250, 204, 21, 0.10)" : "rgba(250, 204, 21, 0.30)"} !important;
          border-color: #facc15 !important;
          color: #fde68a !important;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available .fc-event-title {
          font-weight: 600;
          font-size: 11px;
        }
        .freelandoo-weekly-grid .freelandoo-evt-available .fc-event-time {
          display: none;
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
