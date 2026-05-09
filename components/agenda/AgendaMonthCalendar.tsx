"use client"

import { useMemo } from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { isWithinInterval } from "date-fns"
import {
  AGENDA_WEEK_STARTS_ON,
  agendaWeekRange,
  datesForModifierFromCounts,
} from "@/components/agenda/agenda-booking-utils"
import "react-day-picker/style.css"

interface AgendaMonthCalendarProps {
  month: Date
  onMonthChange: (d: Date) => void
  /** Semana em destaque quando não há dia único selecionado */
  weekAnchor: Date
  /** `null` = modo semana; caso contrário dia único na lista */
  pickedDay: Date | null
  bookingCountByDate: Map<string, number>
  onPickDay: (d: Date) => void
}

export function AgendaMonthCalendar({
  month,
  onMonthChange,
  weekAnchor,
  pickedDay,
  bookingCountByDate,
  onPickDay,
}: AgendaMonthCalendarProps) {
  const weekInterval = useMemo(() => agendaWeekRange(weekAnchor), [weekAnchor])

  const bookingSparseDays = useMemo(
    () => datesForModifierFromCounts(bookingCountByDate, (n) => n >= 1 && n <= 2),
    [bookingCountByDate],
  )

  const bookingDenseDays = useMemo(
    () => datesForModifierFromCounts(bookingCountByDate, (n) => n >= 3),
    [bookingCountByDate],
  )

  const inFocusWeek = (d: Date) =>
    pickedDay === null && isWithinInterval(d, { start: weekInterval.start, end: weekInterval.end })

  return (
    <div className="agenda-premium-calendar rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3 shadow-sm backdrop-blur-sm">
      <DayPicker
        mode="single"
        locale={ptBR}
        weekStartsOn={AGENDA_WEEK_STARTS_ON}
        month={month}
        onMonthChange={onMonthChange}
        selected={pickedDay ?? undefined}
        onSelect={(d) => {
          if (d) onPickDay(d)
        }}
        modifiers={{
          inFocusWeek,
          bookingSparse: bookingSparseDays,
          bookingDense: bookingDenseDays,
        }}
        modifiersClassNames={{
          /** Mantém `rdp-today` (CSS base) e acrescenta classe própria para o destaque abaixo */
          today: "rdp-today agenda-cal-today",
          selected: "agenda-cal-selected",
          inFocusWeek: "agenda-cal-in-week",
          bookingSparse: "agenda-cal-sparse",
          bookingDense: "agenda-cal-dense",
        }}
        showOutsideDays
        classNames={{
          root: "w-full",
          month_caption: "flex justify-center px-1 pb-3 pt-1 text-sm font-semibold capitalize tracking-wide text-zinc-100",
          nav: "flex items-center justify-between gap-1 absolute inset-x-2 top-2",
          button_previous:
            "inline-flex size-9 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-800/50 text-zinc-300 transition hover:border-yellow-500/30 hover:bg-yellow-400/10 hover:text-yellow-300",
          button_next:
            "inline-flex size-9 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-800/50 text-zinc-300 transition hover:border-yellow-500/30 hover:bg-yellow-400/10 hover:text-yellow-300",
          month_grid: "w-full border-collapse table-fixed",
          weekdays: "",
          weekday:
            "w-[14.28%] px-0 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500",
          week: "",
          day: "p-0 align-middle text-center",
          day_button:
            "relative mx-auto flex size-10 items-center justify-center rounded-xl text-sm font-medium text-zinc-200 transition-all duration-150 hover:bg-zinc-800 hover:text-yellow-200 active:scale-[0.96]",
          outside: "opacity-35",
          disabled: "opacity-25 pointer-events-none",
        }}
      />
      <style jsx global>{`
        .agenda-premium-calendar .rdp-root {
          position: relative;
          padding-top: 2.25rem;
          --rdp-accent-color: #facc15;
          --rdp-accent-background-color: rgba(250, 204, 21, 0.12);
          font-size: 13px;
        }
        .agenda-premium-calendar .rdp-month {
          width: 100%;
        }
        .agenda-premium-calendar .rdp-month_grid {
          table-layout: fixed;
        }
        .agenda-premium-calendar .rdp-weekday,
        .agenda-premium-calendar .rdp-day {
          width: 14.285714%;
          box-sizing: border-box;
        }
        .agenda-premium-calendar .rdp-day {
          height: auto;
          min-height: 2.75rem;
          vertical-align: middle;
        }
        /* Hoje: classe agenda-cal-today + atributo data-today na celula. Dias outside usam opacity-35 na celula (herdado pelo botao); voltamos a opacidade total no dia atual. */
        .agenda-premium-calendar td.agenda-cal-today.opacity-35:not(.agenda-cal-selected) {
          opacity: 1 !important;
        }
        .agenda-premium-calendar td.agenda-cal-today:not(.agenda-cal-selected) .rdp-day_button,
        .agenda-premium-calendar td[data-today]:not([data-selected]) .rdp-day_button {
          position: relative;
          z-index: 1;
          outline: 2px solid rgba(250, 204, 21, 0.85);
          outline-offset: -2px;
          box-shadow:
            inset 0 0 0 2px rgba(250, 204, 21, 0.95),
            0 0 0 1px rgba(250, 204, 21, 0.35),
            0 4px 14px rgba(250, 204, 21, 0.22) !important;
          font-weight: 700 !important;
          color: #fef9c3 !important;
        }
        .agenda-premium-calendar td.agenda-cal-today.agenda-cal-in-week:not(.agenda-cal-selected)
          .rdp-day_button,
        .agenda-premium-calendar td[data-today].agenda-cal-in-week:not([data-selected]) .rdp-day_button {
          background: rgba(250, 204, 21, 0.14) !important;
        }
        .agenda-premium-calendar .agenda-cal-selected .rdp-day_button {
          background: linear-gradient(145deg, #facc15 0%, #eab308 100%) !important;
          color: #18181b !important;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(250, 204, 21, 0.25);
        }
        .agenda-premium-calendar .agenda-cal-in-week:not(.agenda-cal-selected) .rdp-day_button {
          background: rgba(250, 204, 21, 0.08);
          color: #fde68a;
        }
        .agenda-premium-calendar .agenda-cal-sparse:not(.agenda-cal-selected) .rdp-day_button::after {
          content: "";
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          background: rgba(250, 204, 21, 0.45);
        }
        .agenda-premium-calendar .agenda-cal-dense:not(.agenda-cal-selected) .rdp-day_button::after {
          content: "";
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: rgba(250, 204, 21, 0.85);
          box-shadow: 0 0 10px rgba(250, 204, 21, 0.35);
        }
      `}</style>
      <p className="mt-3 border-t border-zinc-800/80 px-1 pt-3 text-[10px] leading-relaxed text-zinc-600">
        <span className="font-semibold text-zinc-500">Hoje:</span> contorno amarelo forte no número.
        <span className="mx-1.5 text-zinc-700">·</span>
        <span className="font-semibold text-zinc-500">Ponto sob o dia:</span> agendamentos (mais intenso = mais cheio).
      </p>
    </div>
  )
}
