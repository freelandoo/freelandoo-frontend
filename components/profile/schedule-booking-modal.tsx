"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, endOfWeek, format, startOfDay, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
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

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

/** Extrai HH:mm para casar com a grelha (suporta "09:00", "9:00:00", ISO). */
function extractSlotStartTime(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const isoOrSpace = /[T ](\d{2}):(\d{2})(?::\d{2})?/.exec(s)
  if (isoOrSpace) {
    return `${isoOrSpace[1]}:${isoOrSpace[2]}`
  }
  const hmOnly = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
  if (hmOnly) return `${hmOnly[1].padStart(2, "0")}:${hmOnly[2]}`
  return null
}

function normalizeLabel(label: string): string {
  const e = extractSlotStartTime(label)
  return e ?? label
}

type ApiSlotMeta = { start: string; spots_remaining?: number | null }

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

function slotRecordToMeta(sl: unknown): ApiSlotMeta | null {
  if (typeof sl === "string") {
    const t = extractSlotStartTime(sl)
    return t ? { start: t, spots_remaining: undefined } : null
  }
  if (!sl || typeof sl !== "object") return null
  const x = sl as Record<string, unknown>
  const keys = [
    "start",
    "start_time",
    "begin",
    "slot_start",
    "slotStart",
    "from",
    "hora_inicio",
    "horaInicio",
    "time",
  ] as const
  for (const k of keys) {
    const t = extractSlotStartTime(x[k])
    if (t) return { start: t, spots_remaining: parseSpotRemaining(x) }
  }
  for (const v of Object.values(x)) {
    if (v !== null && typeof v === "object") continue
    const t = extractSlotStartTime(v)
    if (t) return { start: t, spots_remaining: parseSpotRemaining(x) }
  }
  return null
}

function unwrapPayloadRoot(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  const inner = o.data ?? o.result ?? o.payload
  if (inner && typeof inner === "object") return inner as Record<string, unknown>
  return o
}

function parseSlotsPayload(data: unknown): ApiSlotMeta[] {
  const root = unwrapPayloadRoot(data)
  if (!root) return []
  const raw = (root.slots ??
    root.available_slots ??
    root.availableSlots ??
    root.free_slots ??
    []) as unknown
  if (!Array.isArray(raw)) return []

  const rows: ApiSlotMeta[] = []
  for (const item of raw) {
    const meta = slotRecordToMeta(item)
    if (meta) rows.push(meta)
  }
  return rows
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
  if (!data || typeof data !== "object") return []
  const d = data as Record<string, unknown>
  let daysRaw: unknown =
    d.available_slots ?? d.availableSlots ?? d.days ?? d.by_day ?? d.slots_by_day
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

async function loadSlotsForDate(profileId: string, dateISO: string): Promise<ApiSlotMeta[]> {
  const day = new Date(dateISO + "T12:00:00")
  const ws = format(startOfWeek(day, { weekStartsOn: 0 }), "yyyy-MM-dd")
  const we = format(endOfWeek(day, { weekStartsOn: 0 }), "yyyy-MM-dd")

  let merged: ApiSlotMeta[] = []

  try {
    const weekRes = await fetch(
      `/api/public/profile/${profileId}/calendar/week?weekStart=${encodeURIComponent(ws)}&weekEnd=${encodeURIComponent(we)}`,
    )
    if (weekRes.ok) {
      const wd = await weekRes.json()
      merged = parseSlotsFromWeekPayload(wd, dateISO)
    }
  } catch {
    /* segue para available-slots */
  }

  if (merged.length === 0) {
    try {
      const qs = new URLSearchParams({ date: dateISO })
      const slotRes = await fetch(`/api/public/profile/${profileId}/available-slots?${qs}`)
      if (slotRes.ok) {
        const sd = await slotRes.json()
        merged = parseSlotsPayload(sd)
      }
    } catch {
      /* vazio */
    }
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
  /** Chamado ao concluir escolha de data/hora (antes de dados do cliente / pagamento). */
  onContinue: (dateISO: string, startTime: string) => void
}

function buildTimelineMinutes(step: number): number[] {
  const out: number[] = []
  for (let m = 8 * 60; m < 20 * 60; m += step) {
    out.push(m)
  }
  return out
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
  onContinue,
}: ScheduleBookingModalProps) {
  const stepMinutes = useMemo(() => {
    const d = service?.duration_minutes ?? 30
    if (d <= 15) return 15
    if (d <= 30) return 30
    return 30
  }, [service])

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
      format(selectedDate, "MMMM yyyy", { locale: ptBR }).replace(/^./, (c) => c.toUpperCase()),
    [selectedDate],
  )

  const selectedDateLong = useMemo(
    () =>
      format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).replace(/^./, (c) =>
        c.toUpperCase(),
      ),
    [selectedDate],
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
        const parsed = await loadSlotsForDate(profileId, dateStr)
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
  }, [open, profileId, service, selectedDate])

  const apiByStart = useMemo(() => {
    const m = new Map<string, ApiSlotMeta>()
    for (const s of apiSlots) {
      const key = normalizeLabel(s.start)
      m.set(key, s)
    }
    return m
  }, [apiSlots])

  const mergedTimeLabels = useMemo(() => {
    const labels = new Set<string>()
    for (const mins of buildTimelineMinutes(stepMinutes)) {
      const hh = String(Math.floor(mins / 60)).padStart(2, "0")
      const mm = String(mins % 60).padStart(2, "0")
      labels.add(`${hh}:${mm}`)
    }
    for (const s of apiSlots) {
      labels.add(normalizeLabel(s.start))
    }
    return [...labels].sort((a, b) => labelToMinutes(a) - labelToMinutes(b))
  }, [stepMinutes, apiSlots])

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

      return { label, status }
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
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-zinc-800 px-4 py-4">
          <h2 id="schedule-booking-title" className="text-center text-base font-semibold text-zinc-100">
            {monthTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Fechar"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Datas anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2">
              {visibleDates.map((d) => {
                const active =
                  format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                const dow = format(d, "EEE", { locale: ptBR }).replace(".", "")
                const dd = format(d, "dd")
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(startOfDay(d))
                      setSelectedTime(null)
                    }}
                    className={`flex flex-col items-center rounded-xl py-2 text-[11px] font-medium transition sm:py-2.5 sm:text-xs ${
                      active
                        ? "bg-yellow-400 text-zinc-950 shadow-[0_0_0_1px_rgba(250,204,21,0.4)]"
                        : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Próximas datas"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 flex items-start gap-2 border-b border-zinc-800/80 pb-4">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" aria-hidden />
            <div>
              <p className="text-sm font-semibold capitalize text-zinc-100">{selectedDateLong}</p>
              <p className="text-xs text-zinc-500">Horários disponíveis</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2 text-zinc-200">
              <Clock className="h-4 w-4 text-zinc-400" aria-hidden />
              <span className="text-sm font-medium">Escolha um horário</span>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" aria-hidden />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {timelineSlots.map(({ label, status }) => {
                  const selectable = status === "available" || status === "few"
                  const selected = selectedTime === label
                  const statusLabel =
                    status === "available"
                      ? "Disponível"
                      : status === "few"
                        ? "Poucas vagas"
                        : "Indisponível"

                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectable && setSelectedTime(label)}
                      className={`rounded-xl border px-2 py-3 text-center transition ${
                        !selectable
                          ? "cursor-not-allowed border-zinc-800/80 bg-zinc-900/40 opacity-50"
                          : selected
                            ? "border-yellow-400 bg-yellow-400/15 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.35)]"
                            : "border-zinc-700 bg-zinc-900/80 hover:border-zinc-500"
                      }`}
                    >
                      <span className="block text-lg font-semibold tabular-nums text-zinc-100">{label}</span>
                      <span
                        className={`mt-1 block text-[11px] font-medium ${
                          status === "available"
                            ? "text-emerald-400"
                            : status === "few"
                              ? "text-amber-400"
                              : "text-zinc-500"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/40 px-3 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <p className="text-xs leading-relaxed text-zinc-400">
                Os horários exibidos já consideram o tempo de duração do serviço.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-800 bg-zinc-950/95 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
              <Scissors className="h-5 w-5 text-yellow-400/90" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Serviço selecionado
              </p>
              <p className="truncate font-semibold text-zinc-100">{service.name}</p>
              <p className="text-xs text-zinc-500">
                {service.duration_minutes} min • {formatBRL(service.price_amount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!selectedTime}
            onClick={handleContinue}
            className="h-11 shrink-0 rounded-full bg-yellow-400 px-8 text-sm font-bold text-zinc-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
          </button>
        </footer>
      </div>
    </div>
  )
}
