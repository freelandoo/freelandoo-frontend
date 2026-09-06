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
// A leitura de horário mora em lib/booking/slots: a página de agendamento do
// site da comunidade lê a MESMA agenda, e dois leitores discordariam no
// primeiro formato fora do feitio.
import { loadSlotsForDate, normalizeLabel, type ApiSlotMeta } from "@/lib/booking/slots"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"

const DATE_FNS_LOCALES = { "pt-BR": ptBR, en: enUS, es } as const

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
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
