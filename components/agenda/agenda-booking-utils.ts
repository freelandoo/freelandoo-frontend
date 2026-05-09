import { endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"

/** Domingo como primeiro dia da coluna (alinha com MiniCalendar e expectativa pt-BR). */
export const AGENDA_WEEK_STARTS_ON = 0 as const

/**
 * API/Postgres frequentemente devolve `booking_date` como ISO (`2026-05-15T00:00:00.000Z`).
 * Filtros e agrupamento precisam de `yyyy-MM-dd`.
 */
export function bookingDateKey(raw: unknown): string {
  if (raw == null) return ""
  const s = String(raw).trim()
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  return m ? m[1] : s.slice(0, 10)
}

/** Normaliza TIME/`HH:mm:ss` para `HH:mm` (exibição e duração). */
export function agendaTimeHm(raw: unknown): string {
  if (raw == null) return "00:00"
  const s = String(raw).trim()
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!m) return "00:00"
  return `${m[1].padStart(2, "0")}:${m[2]}`
}

export function bookingDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

export function buildBookingCountByDate(bookings: { booking_date: string }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const b of bookings) {
    const d = bookingDateKey(b.booking_date)
    if (!d) continue
    m.set(d, (m.get(d) ?? 0) + 1)
  }
  return m
}

export function agendaWeekRange(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: AGENDA_WEEK_STARTS_ON })
  const end = endOfWeek(anchor, { weekStartsOn: AGENDA_WEEK_STARTS_ON })
  return { start, end }
}

export function filterBookingsForWeek<T extends { booking_date: string }>(bookings: T[], weekAnchor: Date): T[] {
  const { start, end } = agendaWeekRange(weekAnchor)
  return bookings.filter((b) => {
    const key = bookingDateKey(b.booking_date)
    if (!key) return false
    const d = parseISO(`${key}T12:00:00`)
    return isWithinInterval(d, { start, end })
  })
}

export function filterBookingsForDay<T extends { booking_date: string }>(bookings: T[], day: Date): T[] {
  const key = format(day, "yyyy-MM-dd")
  return bookings.filter((b) => bookingDateKey(b.booking_date) === key)
}

export function sortBookingsByDateTime<T extends { booking_date: string; start_time: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const da = bookingDateKey(a.booking_date).localeCompare(bookingDateKey(b.booking_date))
    if (da !== 0) return da
    return agendaTimeHm(a.start_time).localeCompare(agendaTimeHm(b.start_time))
  })
}

export function groupBookingsByDate<T extends { booking_date: string; start_time: string }>(
  list: T[],
): { dateKey: string; date: Date; items: T[] }[] {
  const sorted = sortBookingsByDateTime(list)
  const map = new Map<string, T[]>()
  for (const b of sorted) {
    const k = bookingDateKey(b.booking_date)
    if (!k) continue
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(b)
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({
    dateKey,
    date: parseISO(`${dateKey}T12:00:00`),
    items,
  }))
}

export function formatAgendaDayHeading(date: Date): string {
  const wd = format(date, "EEEE", { locale: ptBR }).replace(/^./, (c) => c.toUpperCase())
  const rest = format(date, "d MMM", { locale: ptBR }).replace(/^./, (c) => c.toUpperCase())
  return `${wd} — ${rest}`
}

export function datesForModifierFromCounts(
  counts: Map<string, number>,
  pred: (n: number) => boolean,
): Date[] {
  const out: Date[] = []
  counts.forEach((n, iso) => {
    if (pred(n)) out.push(parseISO(iso + "T12:00:00"))
  })
  return out
}

export function formatAgendaBRL(cents: number) {
  return `R$ ${(Math.max(0, cents) / 100).toFixed(2).replace(".", ",")}`
}
