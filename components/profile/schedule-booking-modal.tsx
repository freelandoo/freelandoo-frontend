"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, format, startOfDay } from "date-fns"
import { ptBR, enUS, es } from "date-fns/locale"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Scissors,
  X,
} from "lucide-react"
import type { ProfileService } from "@/components/calendar/types"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"

const DATE_FNS_LOCALES = { "pt-BR": ptBR, en: enUS, es } as const

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

/** HH:mm no fuso local (para casar com a grade do modal). */
function localHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/**
 * Extrai HH:mm para casar com a grelha.
 * ISO com timezone → usa horário local do navegador (evita descasar com grade quando o backend manda UTC).
 */
function extractSlotStartTime(raw: unknown): string | null {
  if (raw == null) return null

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = raw
    if (n > 1_000_000_000_000) {
      const d = new Date(n)
      if (!Number.isNaN(d.getTime())) return localHM(d)
      return null
    }
    if (n > 1_000_000_000) {
      const d = new Date(n * 1000)
      if (!Number.isNaN(d.getTime())) return localHM(d)
      return null
    }
    if (n >= 0 && n < 24 * 60 && Number.isInteger(n)) {
      const h = Math.floor(n / 60)
      const m = n % 60
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    }
    return null
  }

  const s = String(raw).trim()
  if (!s) return null

  const brHm = /^(\d{1,2})h(\d{2})$/i.exec(s)
  if (brHm) return `${brHm[1].padStart(2, "0")}:${brHm[2]}`

  const hmExec = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (hmExec && !/^\d{4}-\d{2}-\d{2}/.test(s) && !s.includes("T")) {
    return `${hmExec[1].padStart(2, "0")}:${hmExec[2]}`
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const asDate = new Date(s)
    if (!Number.isNaN(asDate.getTime())) return localHM(asDate)
  }

  const isoOrSpace = /[T ](\d{2}):(\d{2})(?::\d{2})?/.exec(s)
  if (isoOrSpace) return `${isoOrSpace[1]}:${isoOrSpace[2]}`

  const hmFallback = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (hmFallback) return `${hmFallback[1].padStart(2, "0")}:${hmFallback[2]}`
  return null
}

function normalizeLabel(label: string): string {
  const e = extractSlotStartTime(label)
  return e ?? label
}

type ApiSlotMeta = { start: string; end?: string; spots_remaining?: number | null }

/** Normaliza datas vindas da API para yyyy-MM-dd. */
function toDateOnlyISO(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  if (ymd) return ymd[1]
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (dmy) {
    const dd = dmy[1].padStart(2, "0")
    const mm = dmy[2].padStart(2, "0")
    return `${dmy[3]}-${mm}-${dd}`
  }
  return null
}

function parseSpotRemaining(x: Record<string, unknown>): number | undefined {
  const sr = x.spots_remaining ?? x.remaining ?? x.vagas ?? x.spots_left ?? x.capacity_remaining
  if (typeof sr === "number" && !Number.isNaN(sr)) return sr
  if (typeof sr === "string" && sr.trim() !== "" && !Number.isNaN(Number(sr))) return Number(sr)
  return undefined
}

function slotRecordToMeta(sl: unknown, depth = 0): ApiSlotMeta | null {
  if (depth > 4) return null
  if (typeof sl === "string") {
    const t = extractSlotStartTime(sl)
    return t ? { start: t, spots_remaining: undefined } : null
  }
  if (!sl || typeof sl !== "object") return null
  const x = sl as Record<string, unknown>

  if (x.available === false || x.is_available === false || x.bookable === false) {
    const t =
      extractSlotStartTime(x.start) ??
      extractSlotStartTime(x.start_time) ??
      extractSlotStartTime(x.startTime)
    if (t) return { start: t, spots_remaining: 0 }
  }

  const keys = [
    "start",
    "start_time",
    "startTime",
    "slot_start_time",
    "slot_start",
    "slotStart",
    "starts_at",
    "startsAt",
    "begin",
    "from",
    "hora_inicio",
    "horaInicio",
    "hora",
    "inicio",
    "time",
  ] as const
  const endRaw = x.end ?? x.end_time ?? x.endTime
  const endHm = endRaw != null ? extractSlotStartTime(endRaw) ?? undefined : undefined

  for (const k of keys) {
    const t = extractSlotStartTime(x[k])
    if (t) return { start: t, end: endHm, spots_remaining: parseSpotRemaining(x) }
  }

  for (const nest of ["period", "interval", "slot", "range", "window"] as const) {
    const inner = x[nest]
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const nested = slotRecordToMeta(inner, depth + 1)
      if (nested)
        return {
          ...nested,
          end: nested.end ?? endHm,
          spots_remaining: parseSpotRemaining(x) ?? nested.spots_remaining,
        }
    }
  }

  for (const v of Object.values(x)) {
    if (v !== null && typeof v === "object") continue
    const t = extractSlotStartTime(v)
    if (t) return { start: t, end: endHm, spots_remaining: parseSpotRemaining(x) }
  }
  return null
}

/** Remove wrappers comuns (`data`, `result`, `payload`) até o objeto útil (vários backends enviam um nível extra). */
function unwrapPayloadRoot(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  let cur: unknown = data
  for (let depth = 0; depth < 6; depth++) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) break
    const o = cur as Record<string, unknown>
    const inner = o.data ?? o.result ?? o.payload ?? o.body ?? o.response
    if (inner && typeof inner === "object" && !Array.isArray(inner)) cur = inner
    else break
  }
  if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null
  return cur as Record<string, unknown>
}

/** `slots: { "yyyy-mm-dd": [ ... ] }` ou chaves equivalentes. */
function parseSlotsKeyedByDate(raw: Record<string, unknown>, dateISO: string): ApiSlotMeta[] {
  const rows: ApiSlotMeta[] = []
  for (const [key, val] of Object.entries(raw)) {
    const day = toDateOnlyISO(key)
    if (day != null && day !== dateISO) continue
    if (!Array.isArray(val)) continue
    for (const item of val) {
      const meta = slotRecordToMeta(item)
      if (meta) rows.push(meta)
    }
  }
  return rows
}

function parseSlotsPayload(data: unknown, dateISO?: string): ApiSlotMeta[] {
  if (Array.isArray(data)) {
    const rows: ApiSlotMeta[] = []
    for (const item of data) {
      const meta = slotRecordToMeta(item)
      if (meta) rows.push(meta)
    }
    return rows
  }
  const root = unwrapPayloadRoot(data)
  if (!root) return []

  for (const ak of ["data", "items", "results", "records"] as const) {
    const v = root[ak]
    if (Array.isArray(v) && v.length > 0) {
      const parsed = parseSlotsPayload(v, dateISO)
      if (parsed.length) return parsed
    }
  }

  const candidates = [
    root.slots,
    root.available_slots,
    root.availableSlots,
    root.free_slots,
    root.open_slots,
    root.horarios,
  ]
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue
    if (Array.isArray(c)) {
      const rows: ApiSlotMeta[] = []
      for (const item of c) {
        const meta = slotRecordToMeta(item)
        if (meta) rows.push(meta)
      }
      if (rows.length) return rows
      continue
    }
    if (dateISO) {
      const fromKeys = parseSlotsKeyedByDate(c as Record<string, unknown>, dateISO)
      if (fromKeys.length) return fromKeys
    }
  }

  return []
}

/** Lista plana: cada item pode ter `date` / `day` + horário. */
function parseFlatSlotsForDay(slots: unknown[], dateISO: string): ApiSlotMeta[] {
  const out: ApiSlotMeta[] = []
  for (const sl of slots) {
    if (!sl || typeof sl !== "object") continue
    const x = sl as Record<string, unknown>
    const sd =
      toDateOnlyISO(x.date) ??
      toDateOnlyISO(x.day) ??
      toDateOnlyISO(x.date_iso) ??
      toDateOnlyISO(x.slot_date) ??
      toDateOnlyISO(x.booking_date)
    if (sd != null && sd !== dateISO) continue
    const meta = slotRecordToMeta(sl)
    if (meta) out.push(meta)
  }
  return out
}

/** Resposta GET calendar/week: agrupado por dia ou lista plana. */
function parseSlotsFromWeekPayload(data: unknown, dateISO: string): ApiSlotMeta[] {
  const unwrapped = unwrapPayloadRoot(data)
  if (!unwrapped) return []
  const d = unwrapped
  let daysRaw: unknown =
    d.available_slots ??
    d.availableSlots ??
    d.days ??
    d.by_day ??
    d.slots_by_day

  const calendar = d.calendar
  if (!Array.isArray(daysRaw) && calendar && typeof calendar === "object" && !Array.isArray(calendar)) {
    const c = calendar as Record<string, unknown>
    daysRaw =
      c.available_slots ??
      c.availableSlots ??
      c.days ??
      daysRaw
  }

  if (!Array.isArray(daysRaw) && Array.isArray(d.slots)) {
    const first = (d.slots as unknown[])[0]
    if (first && typeof first === "object" && first !== null && "slots" in first) {
      daysRaw = d.slots
    }
  }

  const out: ApiSlotMeta[] = []

  if (Array.isArray(daysRaw)) {
    for (const entry of daysRaw) {
      if (!entry || typeof entry !== "object") continue
      const e = entry as Record<string, unknown>
      const entryDate =
        toDateOnlyISO(e.date) ??
        toDateOnlyISO(e.day) ??
        toDateOnlyISO(e.date_iso) ??
        toDateOnlyISO(e.booking_date)
      if (entryDate != null && entryDate !== dateISO) continue

      const slotsRaw = e.slots ?? e.available_slots ?? e.availableSlots ?? e.times ?? e.hours
      if (Array.isArray(slotsRaw)) {
        for (const sl of slotsRaw) {
          const meta = slotRecordToMeta(sl)
          if (meta) out.push(meta)
        }
      }
    }
  }

  if (out.length === 0 && Array.isArray(d.slots)) {
    out.push(...parseFlatSlotsForDay(d.slots as unknown[], dateISO))
  }

  return out
}

function dedupeSlotsByStart(slots: ApiSlotMeta[]): ApiSlotMeta[] {
  const m = new Map<string, ApiSlotMeta>()
  for (const s of slots) {
    const key = normalizeLabel(s.start)
    if (!m.has(key)) m.set(key, s)
  }
  return [...m.values()]
}

/**
 * Intervalo inclusivo [weekStart, weekEnd] alinhado ao backend (`BookingAvailabilityService`):
 * usa `dateISO + T12:00:00.000Z` e `getUTCDay()` → semana domingo–sábado em datas UTC.
 */
function utcWeekRangeInclusive(dateISO: string): { weekStart: string; weekEnd: string } {
  const anchor = new Date(`${dateISO}T12:00:00.000Z`)
  const dow = anchor.getUTCDay()
  const start = new Date(anchor)
  start.setUTCDate(anchor.getUTCDate() - dow)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  }
}

function ownerWeekAuthHeaders(): HeadersInit | undefined {
  if (typeof window === "undefined") return undefined
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

async function loadSlotsForDate(
  profileId: string,
  dateISO: string,
  preferOwnerCalendarWeek: boolean,
): Promise<ApiSlotMeta[]> {
  const { weekStart, weekEnd } = utcWeekRangeInclusive(dateISO)
  const qs = new URLSearchParams({ date: dateISO })
  const weekParams = `weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`
  const publicWeekUrl = `/api/public/profile/${profileId}/calendar/week?${weekParams}`
  const ownerWeekUrl = `/api/profile/${profileId}/calendar/week?${weekParams}`

  async function fetchWeek(): Promise<Response> {
    const ah = preferOwnerCalendarWeek ? ownerWeekAuthHeaders() : undefined
    if (ah) {
      const r = await fetch(ownerWeekUrl, { cache: "no-store", headers: ah })
      if (r.ok) return r
    }
    return fetch(publicWeekUrl, { cache: "no-store" })
  }

  const [weekRes, slotRes] = await Promise.all([
    fetchWeek(),
    fetch(`/api/public/profile/${profileId}/available-slots?${qs}`, { cache: "no-store" }),
  ])

  const merged: ApiSlotMeta[] = []

  try {
    if (weekRes.ok) {
      const wd = await weekRes.json()
      merged.push(...parseSlotsFromWeekPayload(wd, dateISO))
    }
  } catch {
    /* ignora */
  }

  try {
    if (slotRes.ok) {
      const sd = await slotRes.json()
      merged.push(...parseSlotsPayload(sd, dateISO))
    }
  } catch {
    /* ignora */
  }

  return dedupeSlotsByStart(merged)
}

const CAROUSEL_SIZE = 7
const FUTURE_RANGE_DAYS = 42

type SlotDisplayStatus = "available" | "few" | "unavailable"

interface ScheduleBookingModalProps {
  open: boolean
  onClose: () => void
  profileId: string
  service: ProfileService | null
  /**
   * Quando true (ex.: dono no próprio perfil), tenta GET `/profile/:id/calendar/week` com JWT
   * antes do endpoint público — ver AGENDA_SISTEMA.md §4.2 (modo dono).
   */
  preferOwnerCalendarWeek?: boolean
  /** Chamado ao concluir escolha de data/hora (antes de dados do cliente / pagamento). */
  onContinue: (dateISO: string, startTime: string) => void
}

function labelToMinutes(label: string): number {
  const [h, min] = label.split(":").map(Number)
  return (h || 0) * 60 + (min || 0)
}

export function ScheduleBookingModal({
  open,
  onClose,
  profileId,
  service,
  preferOwnerCalendarWeek = false,
  onContinue,
}: ScheduleBookingModalProps) {
  const t = useTranslations("Profile")
  const locale = useLocale()
  const dfLocale = DATE_FNS_LOCALES[locale] ?? ptBR
  const [windowStart, setWindowStart] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [apiSlots, setApiSlots] = useState<ApiSlotMeta[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  const futureDays = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: FUTURE_RANGE_DAYS }, (_, i) => addDays(today, i))
  }, [])

  const visibleDates = useMemo(
    () => futureDays.slice(windowStart, windowStart + CAROUSEL_SIZE),
    [futureDays, windowStart],
  )

  const monthTitle = useMemo(
    () =>
      format(selectedDate, "MMMM yyyy", { locale: dfLocale }).replace(/^./, (c) => c.toUpperCase()),
    [selectedDate, dfLocale],
  )

  const selectedDateLong = useMemo(
    () =>
      format(selectedDate, "PPPP", { locale: dfLocale }).replace(/^./, (c) =>
        c.toUpperCase(),
      ),
    [selectedDate, dfLocale],
  )

  useEffect(() => {
    if (!open || !service) return
    const today = startOfDay(new Date())
    setWindowStart(0)
    setSelectedDate(today)
    setSelectedTime(null)
  }, [open, service])

  useEffect(() => {
    if (!open || !service) return
    let cancelled = false
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    setSlotsLoading(true)
    ;(async () => {
      try {
        const parsed = await loadSlotsForDate(profileId, dateStr, preferOwnerCalendarWeek)
        if (!cancelled) setApiSlots(parsed)
      } catch {
        if (!cancelled) setApiSlots([])
      } finally {
        if (!cancelled) setSlotsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, profileId, service, selectedDate, preferOwnerCalendarWeek])

  const apiByStart = useMemo(() => {
    const m = new Map<string, ApiSlotMeta>()
    for (const s of apiSlots) {
      const key = normalizeLabel(s.start)
      m.set(key, s)
    }
    return m
  }, [apiSlots])

  /** Contrato §4.1 / §4.2: horários são só os `{ start, end }` gerados pela regra semanal no backend — não misturar com grade fictícia pelo `duration_minutes` do serviço. */
  const mergedTimeLabels = useMemo(() => {
    const labels = apiSlots.map((s) => normalizeLabel(s.start))
    return [...new Set(labels)].sort((a, b) => labelToMinutes(a) - labelToMinutes(b))
  }, [apiSlots])

  const timelineSlots = useMemo(() => {
    const now = new Date()
    const dayStart = startOfDay(selectedDate)
    const isPastDay = dayStart < startOfDay(now)
    const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")

    return mergedTimeLabels.map((label) => {
      const mins = labelToMinutes(label)
      const slotStart = new Date(dayStart)
      slotStart.setHours(Math.floor(mins / 60), mins % 60, 0, 0)

      let status: SlotDisplayStatus = "unavailable"
      const meta = apiByStart.get(label)

      if (isPastDay) {
        status = "unavailable"
      } else if (isToday && slotStart <= now) {
        status = "unavailable"
      } else if (meta) {
        const sr = meta.spots_remaining
        if (sr != null && sr > 0 && sr <= 2) status = "few"
        else status = "available"
      }

      return { label, status, endLabel: meta?.end }
    })
  }, [selectedDate, apiByStart, mergedTimeLabels])

  const canShiftPrev = windowStart > 0
  const canShiftNext = windowStart + CAROUSEL_SIZE < futureDays.length

  const shiftPrev = useCallback(() => {
    setWindowStart((w) => Math.max(0, w - CAROUSEL_SIZE))
  }, [])

  const shiftNext = useCallback(() => {
    setWindowStart((w) => Math.min(futureDays.length - CAROUSEL_SIZE, w + CAROUSEL_SIZE))
  }, [futureDays.length])

  const handleContinue = () => {
    if (!service || !selectedTime) return
    onContinue(format(selectedDate, "yyyy-MM-dd"), selectedTime)
  }

  if (!open || !service) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-booking-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex shrink-0 items-center justify-center border-b-2 border-[#0B0B0D]/15 px-4 py-4">
          <h2 id="schedule-booking-title" className="fl-display text-center text-xl text-[#0B0B0D]">
            {monthTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#0B0B0D] text-[#0B0B0D]/70 transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
            aria-label={t("close", "Fechar")}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shiftPrev}
              disabled={!canShiftPrev}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={t("prevDates", "Datas anteriores")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2">
              {visibleDates.map((d) => {
                const active =
                  format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                const dow = format(d, "EEE", { locale: dfLocale }).replace(".", "")
                const dd = format(d, "dd")
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(startOfDay(d))
                      setSelectedTime(null)
                    }}
                    className={`flex flex-col items-center rounded-xl py-2 text-[11px] font-bold transition sm:py-2.5 sm:text-xs ${
                      active
                        ? "border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]"
                        : "border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] hover:bg-[#0B0B0D]/[0.08]"
                    }`}
                  >
                    <span className="uppercase opacity-90">{dow}</span>
                    <span className="mt-0.5 text-sm font-bold tabular-nums sm:text-base">{dd}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={shiftNext}
              disabled={!canShiftNext}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={t("nextDates", "Próximas datas")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 flex items-start gap-2 border-b-2 border-[#0B0B0D]/15 pb-4">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[#E0A500]" aria-hidden />
            <div>
              <p className="text-sm font-bold capitalize text-[#0B0B0D]">{selectedDateLong}</p>
              <p className="text-xs text-[#5b554b]">{t("availableTimes", "Horários disponíveis")}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2 text-[#0B0B0D]">
              <Clock className="h-4 w-4 text-[#5b554b]" aria-hidden />
              <span className="text-sm font-bold">{t("chooseTime", "Escolha um horário")}</span>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0B0B0D]/40" aria-hidden />
              </div>
            ) : apiSlots.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-[#0B0B0D]/25 bg-[#0B0B0D]/[0.03] px-4 py-10 text-center text-sm text-[#5b554b]">
                {t("noSlotsBefore", "Nenhum horário disponível nesta data (sem regra para esse dia da semana, dia bloqueado ou já ocupado). Configure em")}{" "}
                <span className="text-[#0B0B0D] font-bold">{t("availabilityWord", "Disponibilidade")}</span>{" "}
                {t("noSlotsAfter", "na agenda do perfil ou escolha outra data.")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {timelineSlots.map(({ label, status, endLabel }) => {
                  const selectable = status === "available" || status === "few"
                  const selected = selectedTime === label
                  const statusLabel =
                    status === "available"
                      ? endLabel
                        ? t("untilTime", "Até {time}").replace("{time}", endLabel)
                        : t("slotAvailable", "Disponível")
                      : status === "few"
                        ? t("slotFew", "Poucas vagas")
                        : t("slotUnavailable", "Indisponível")

                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectable && setSelectedTime(label)}
                      className={`rounded-xl border-2 px-2 py-3 text-center transition ${
                        !selectable
                          ? "cursor-not-allowed border-[#0B0B0D]/10 bg-[#0B0B0D]/[0.02] opacity-50"
                          : selected
                            ? "border-[#0B0B0D] bg-[#F2B705]/25"
                            : "border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] hover:border-[#0B0B0D]"
                      }`}
                    >
                      <span className="block text-lg font-bold tabular-nums text-[#0B0B0D]">{label}</span>
                      <span
                        className={`mt-1 block text-[11px] font-bold ${
                          status === "available"
                            ? "text-[#16683f]"
                            : status === "few"
                              ? "text-[#b8860b]"
                              : "text-[#8a8275]"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2 rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] px-3 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5b554b]" aria-hidden />
              <p className="text-xs leading-relaxed text-[#5b554b]">
                {t("bookingInfo", "Os intervalos vêm das regras semanais da agenda (duração do slot no painel). O pagamento usa o preço do serviço escolhido; o servidor valida sobreposição ao confirmar.")}
              </p>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t-2 border-[#0B0B0D]/15 bg-[#e8e2d4] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2]">
              <Scissors className="h-5 w-5 text-[#E0A500]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#5b554b]">
                {t("selectedService", "Serviço selecionado")}
              </p>
              <p className="truncate font-bold text-[#0B0B0D]">{service.name}</p>
              <p className="text-xs text-[#5b554b]">
                {service.duration_minutes} {t("minShort", "min")} • {formatBRL(service.price_amount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!selectedTime}
            onClick={handleContinue}
            className="fl-btn-gold h-11 shrink-0 rounded-full px-8 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("continue", "Continuar")}
          </button>
        </footer>
      </div>
    </div>
  )
}
