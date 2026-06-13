"use client"

import { useMemo } from "react"
import { DayPicker } from "react-day-picker"
import { ptBR, enUS, es } from "date-fns/locale"
import { isWithinInterval } from "date-fns"
import {
  AGENDA_WEEK_STARTS_ON,
  agendaWeekRange,
  datesForModifierFromCounts,
} from "@/components/agenda/agenda-booking-utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
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

const DATE_FNS_LOCALES: Record<string, typeof ptBR> = { "pt-BR": ptBR, en: enUS, es }

export function AgendaMonthCalendar({
  month,
  onMonthChange,
  weekAnchor,
  pickedDay,
  bookingCountByDate,
  onPickDay,
}: AgendaMonthCalendarProps) {
  const t = useTranslations("Agenda")
  const locale = useLocale()
  const dfLocale = DATE_FNS_LOCALES[locale] || ptBR

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
    <div className="agenda-premium-calendar border-2 border-[#0B0B0D] bg-[#F1EDE2] p-3 shadow-[5px_5px_0_0_#0B0B0D]">
      <DayPicker
        mode="single"
        locale={dfLocale}
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
          today: "rdp-today agenda-cal-today",
          selected: "agenda-cal-selected",
          inFocusWeek: "agenda-cal-in-week",
          bookingSparse: "agenda-cal-sparse",
          bookingDense: "agenda-cal-dense",
        }}
        showOutsideDays
        classNames={{
          root: "w-full",
          month_caption:
            "fl-display flex justify-center px-1 pb-3 pt-1 text-xl capitalize tracking-wide text-[#0B0B0D]",
          nav: "flex items-center justify-between gap-1 absolute inset-x-2 top-2",
          button_previous:
            "inline-flex size-8 items-center justify-center border-2 border-[#0B0B0D] bg-transparent text-[#0B0B0D] transition hover:bg-[#F2B705]",
          button_next:
            "inline-flex size-8 items-center justify-center border-2 border-[#0B0B0D] bg-transparent text-[#0B0B0D] transition hover:bg-[#F2B705]",
          month_grid: "w-full border-collapse table-fixed",
          weekdays: "",
          weekday:
            "w-[14.28%] px-0 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#6B6457]",
          week: "",
          day: "p-0 align-middle text-center",
          day_button:
            "relative mx-auto flex size-10 items-center justify-center text-sm font-bold text-[#0B0B0D] transition-all duration-150 hover:bg-[#F2B705]/30 active:scale-[0.96]",
          outside: "opacity-30",
          disabled: "opacity-25 pointer-events-none",
        }}
      />
      <style jsx global>{`
        .agenda-premium-calendar .rdp-root {
          position: relative;
          padding-top: 2.25rem;
          --rdp-accent-color: #f2b705;
          --rdp-accent-background-color: rgba(242, 183, 5, 0.16);
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
        /* Hoje: contorno gold forte no número (sobre o papel). */
        .agenda-premium-calendar td.agenda-cal-today.opacity-30:not(.agenda-cal-selected) {
          opacity: 1 !important;
        }
        .agenda-premium-calendar td.agenda-cal-today:not(.agenda-cal-selected) .rdp-day_button,
        .agenda-premium-calendar td[data-today]:not([data-selected]) .rdp-day_button {
          position: relative;
          z-index: 1;
          outline: 2px solid #0b0b0d;
          outline-offset: -2px;
          box-shadow: inset 0 0 0 3px #f2b705 !important;
          font-weight: 800 !important;
          color: #0b0b0d !important;
        }
        .agenda-premium-calendar td.agenda-cal-today.agenda-cal-in-week:not(.agenda-cal-selected)
          .rdp-day_button,
        .agenda-premium-calendar td[data-today].agenda-cal-in-week:not([data-selected]) .rdp-day_button {
          background: rgba(242, 183, 5, 0.22) !important;
        }
        .agenda-premium-calendar .agenda-cal-selected .rdp-day_button {
          background: #f2b705 !important;
          color: #0b0b0d !important;
          font-weight: 800;
          box-shadow: 3px 3px 0 0 #0b0b0d;
        }
        .agenda-premium-calendar .agenda-cal-in-week:not(.agenda-cal-selected) .rdp-day_button {
          background: rgba(242, 183, 5, 0.14);
          color: #0b0b0d;
        }
        .agenda-premium-calendar .agenda-cal-sparse:not(.agenda-cal-selected) .rdp-day_button::after {
          content: "";
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          background: rgba(11, 11, 13, 0.55);
        }
        .agenda-premium-calendar .agenda-cal-dense:not(.agenda-cal-selected) .rdp-day_button::after {
          content: "";
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 7px;
          height: 7px;
          background: #0b0b0d;
        }
      `}</style>
      <p className="mt-3 border-t-2 border-[#0B0B0D]/15 px-1 pt-3 text-[10px] font-semibold leading-relaxed text-[#6B6457]">
        <span className="font-extrabold text-[#0B0B0D]">{t("legendTodayLabel", "Hoje:")}</span>{" "}
        {t("legendTodayDesc", "contorno forte no número.")}
        <span className="mx-1.5 text-[#0B0B0D]/30">·</span>
        <span className="font-extrabold text-[#0B0B0D]">{t("legendDotLabel", "Ponto sob o dia:")}</span>{" "}
        {t("legendDotDesc", "agendamentos (mais intenso = mais cheio).")}
      </p>
    </div>
  )
}
