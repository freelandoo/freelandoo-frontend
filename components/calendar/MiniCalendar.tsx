"use client"

import { useMemo } from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
import "react-day-picker/style.css"

interface MiniCalendarProps {
  selectedWeekStart: Date
  onWeekChange: (weekStart: Date, weekEnd: Date) => void
  month?: Date
  onMonthChange?: (m: Date) => void
}

export function MiniCalendar({ selectedWeekStart, onWeekChange, month, onMonthChange }: MiniCalendarProps) {
  const weekRange = useMemo(() => ({
    start: startOfWeek(selectedWeekStart, { weekStartsOn: 0 }),
    end: endOfWeek(selectedWeekStart, { weekStartsOn: 0 }),
  }), [selectedWeekStart])

  const isInSelectedWeek = (d: Date) => isWithinInterval(d, weekRange)

  return (
    <div className="freelandoo-mini-calendar">
      <DayPicker
        mode="single"
        locale={ptBR}
        month={month}
        onMonthChange={onMonthChange}
        selected={selectedWeekStart}
        onSelect={(d) => {
          if (!d) return
          const ws = startOfWeek(d, { weekStartsOn: 0 })
          const we = endOfWeek(d, { weekStartsOn: 0 })
          onWeekChange(ws, we)
        }}
        modifiers={{ inWeek: isInSelectedWeek }}
        modifiersClassNames={{
          inWeek: "freelandoo-week-day",
          selected: "freelandoo-week-day-selected",
          today: "freelandoo-today",
        }}
        showOutsideDays
        weekStartsOn={0}
      />
      <style jsx global>{`
        .freelandoo-mini-calendar .rdp-root {
          --rdp-accent-color: #facc15;
          --rdp-accent-background-color: rgba(250, 204, 21, 0.15);
          --rdp-day_button-width: 32px;
          --rdp-day_button-height: 32px;
          --rdp-day-width: 32px;
          --rdp-day-height: 32px;
          color: rgb(228 228 231);
          font-size: 13px;
        }
        .freelandoo-mini-calendar .rdp-month_caption {
          color: rgb(244 244 245);
          font-weight: 600;
        }
        .freelandoo-mini-calendar .rdp-weekday {
          color: rgb(113 113 122);
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 500;
        }
        .freelandoo-mini-calendar .rdp-day {
          color: rgb(212 212 216);
        }
        .freelandoo-mini-calendar .rdp-day_button:hover:not([disabled]) {
          background: rgba(250, 204, 21, 0.12);
          color: #facc15;
        }
        .freelandoo-mini-calendar .freelandoo-week-day .rdp-day_button {
          background: rgba(250, 204, 21, 0.18);
          color: #fde68a;
        }
        .freelandoo-mini-calendar .freelandoo-week-day-selected .rdp-day_button {
          background: #facc15 !important;
          color: #18181b !important;
          font-weight: 700;
        }
        .freelandoo-mini-calendar .freelandoo-today .rdp-day_button {
          outline: 1px solid rgba(250, 204, 21, 0.5);
        }
        .freelandoo-mini-calendar .rdp-outside .rdp-day_button {
          color: rgb(82 82 91);
        }
        .freelandoo-mini-calendar .rdp-button_previous,
        .freelandoo-mini-calendar .rdp-button_next {
          color: rgb(212 212 216);
        }
        .freelandoo-mini-calendar .rdp-button_previous:hover,
        .freelandoo-mini-calendar .rdp-button_next:hover {
          background: rgba(250, 204, 21, 0.12);
          color: #facc15;
        }
      `}</style>
    </div>
  )
}
