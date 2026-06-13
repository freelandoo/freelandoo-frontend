"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ptBR, enUS, es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Clock, Sparkles, MessageCircle, Check, CalendarX, BellRing } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  agendaTimeHm,
  agendaWeekRange,
  bookingDurationMinutes,
  formatAgendaDayHeading,
  formatAgendaBRL,
  groupBookingsByDate,
  sortBookingsByDateTime,
} from "@/components/agenda/agenda-booking-utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

export interface AgendaBookingRow {
  id: number
  client_name: string
  client_email: string
  client_whatsapp: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  payment_status: string
  deposit_amount: number
  professional_amount: number
  created_at: string
  service_name_snapshot?: string | null
  service_price_amount?: number | null
  client_profile_id?: string | null
  client_profile_display_name?: string | null
  reminder_sent_at?: string | null
  client_confirm_status?: "confirmed" | "reschedule" | null
}

/* Link wa.me pré-preenchido pro profissional lembrar o cliente com 1 toque. */
function waReminderLink(b: AgendaBookingRow, t: TFn): string | null {
  const digits = String(b.client_whatsapp || "").replace(/\D/g, "")
  if (!digits) return null
  const phone = digits.startsWith("55") ? digits : `55${digits}`
  const dateStr = String(b.booking_date || "").slice(0, 10).split("-").reverse().join("/")
  const time = agendaTimeHm(b.start_time)
  const msg = t("waMessage", "Oi {client}! Passando pra lembrar do seu horário em {date} às {time}. Você confirma?")
    .replace("{client}", b.client_profile_display_name || b.client_name || "")
    .replace("{date}", dateStr)
    .replace("{time}", time)
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

type TFn = (key: string, fallback?: string) => string
type UiStatusKey = "confirmed" | "in_progress" | "completed" | "canceled"

const DATE_FNS_LOCALES: Record<string, typeof ptBR> = { "pt-BR": ptBR, en: enUS, es }

function uiStatus(status: string): UiStatusKey {
  if (status === "completed") return "completed"
  if (status === "canceled" || status === "expired" || status === "no_show") return "canceled"
  if (status === "confirmed") return "confirmed"
  if (status === "pending_payment") return "in_progress"
  return "in_progress"
}

const UI_STATUS_LABEL: Record<UiStatusKey, { key: string; pt: string }> = {
  confirmed: { key: "statusConfirmed", pt: "Confirmado" },
  in_progress: { key: "statusInProgress", pt: "Em andamento" },
  completed: { key: "statusCompleted", pt: "Finalizado" },
  canceled: { key: "statusCanceled", pt: "Cancelado" },
}

/* Pílulas de status no papel (cores semânticas do tabloide). */
const UI_STATUS_CLASS: Record<UiStatusKey, string> = {
  confirmed: "bg-[#00876B] text-white",
  in_progress: "bg-[#F2B705] text-[#0B0B0D]",
  completed: "bg-[#0B0B0D] text-[#F1EDE2]",
  canceled: "bg-[#9A3412] text-white",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface AgendaBookingsPanelProps {
  bookings: AgendaBookingRow[]
  pickedDay: Date | null
  weekAnchor: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  onGoCurrentWeek: () => void
  onClearDay: () => void
}

export function AgendaBookingsPanel({
  bookings,
  pickedDay,
  weekAnchor,
  onPrevWeek,
  onNextWeek,
  onGoCurrentWeek,
  onClearDay,
}: AgendaBookingsPanelProps) {
  const t = useTranslations("Agenda")
  const locale = useLocale()
  const dfLocale = DATE_FNS_LOCALES[locale] || ptBR

  const { start: wStart, end: wEnd } = agendaWeekRange(weekAnchor)
  const weekRangeLabel = `${format(wStart, "d MMM", { locale: dfLocale })} — ${format(wEnd, "d MMM yyyy", { locale: dfLocale })}`

  const grouped = pickedDay === null ? groupBookingsByDate(bookings) : null
  const flatDay = pickedDay !== null ? sortBookingsByDateTime(bookings) : null

  return (
    <section className="flex min-h-0 flex-1 flex-col border-2 border-[#F1EDE2]/12 bg-[#1D1810]">
      <header className="flex flex-col gap-4 border-b-2 border-[#F1EDE2]/12 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            <Sparkles className="size-3.5 text-[#F2B705]" aria-hidden />
            {t("bookingsEyebrow", "Agendamentos")}
          </div>
          <h2 className="fl-display truncate text-2xl leading-none text-[#F1EDE2]">
            {pickedDay
              ? formatAgendaDayHeading(pickedDay, dfLocale)
              : `${t("currentWeek", "Semana atual")} · ${weekRangeLabel}`}
          </h2>
          <p className="text-sm font-medium text-[#9A938A]">
            {pickedDay
              ? t("daySubtitle", "Horários do dia selecionado.")
              : t("weekSubtitle", "Visualização agrupada por dia da semana.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pickedDay ? (
            <button
              type="button"
              onClick={onClearDay}
              className="border-2 border-[#F1EDE2]/25 bg-transparent px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
            >
              {t("viewWeek", "Ver semana")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onGoCurrentWeek}
                className="border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5"
              >
                {t("thisWeek", "Esta semana")}
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onPrevWeek}
                  className="inline-flex size-9 items-center justify-center border-2 border-[#F1EDE2]/25 text-[#F1EDE2] transition hover:border-[#F1EDE2] hover:bg-[#F1EDE2]/5"
                  aria-label={t("prevWeek", "Semana anterior")}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={onNextWeek}
                  className="inline-flex size-9 items-center justify-center border-2 border-[#F1EDE2]/25 text-[#F1EDE2] transition hover:border-[#F1EDE2] hover:bg-[#F1EDE2]/5"
                  aria-label={t("nextWeek", "Próxima semana")}
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-8 px-4 py-6 sm:px-6">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#F1EDE2]/15 px-6 py-20 text-center">
            <p className="fl-display text-2xl text-[#F1EDE2]">
              {t("emptyBookingsTitle", "Nenhum agendamento neste período")}
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#9A938A]">
              {t(
                "emptyBookingsDesc",
                "Escolha outro dia no calendário ou navegue entre semanas para ver mais compromissos.",
              )}
            </p>
          </div>
        ) : pickedDay && flatDay ? (
          <ul className="space-y-3">
            {flatDay.map((b) => (
              <li key={b.id}>
                <BookingCard b={b} compactTime t={t} />
              </li>
            ))}
          </ul>
        ) : (
          grouped?.map((group) => (
            <div key={group.dateKey}>
              <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                {formatAgendaDayHeading(group.date, dfLocale)}
              </h3>
              <ul className="space-y-3">
                {group.items.map((b) => (
                  <li key={b.id}>
                    <BookingCard b={b} t={t} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function BookingCard({
  b,
  compactTime,
  t,
}: {
  b: AgendaBookingRow
  compactTime?: boolean
  t: TFn
}) {
  const startHm = agendaTimeHm(b.start_time)
  const endHm = agendaTimeHm(b.end_time)
  const dur = bookingDurationMinutes(startHm, endHm)
  const amount = b.service_price_amount ?? b.deposit_amount
  const ui = uiStatus(b.status)
  const label =
    b.status === "no_show"
      ? t("statusNoShow", "Não compareceu")
      : t(UI_STATUS_LABEL[ui].key, UI_STATUS_LABEL[ui].pt)

  const displayName = b.client_profile_display_name || b.client_name
  const timeLabel = startHm
  const serviceName = b.service_name_snapshot || t("serviceFallback", "Serviço")
  const minLabel = t("minutesShort", "min")
  const waLink = waReminderLink(b, t)

  return (
    <article className="group relative overflow-hidden border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[4px_4px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]">
      <div className="flex gap-4">
        <Avatar className="size-12 shrink-0 rounded-none border-2 border-[#0B0B0D]" style={{ outline: "2px solid #F2B705", outlineOffset: "1px" }}>
          <AvatarFallback className="rounded-none bg-[#1D1810] text-xs font-bold text-[#F2B705]">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {compactTime ? (
                <p className="font-mono text-sm font-bold tabular-nums text-[#E0A500]">
                  {timeLabel}{" "}
                  <span className="font-sans text-[#6B6457]">—</span>{" "}
                  <span className="font-sans font-bold text-[#0B0B0D]">{serviceName}</span>
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-[#6B6457]">
                    <Clock className="mr-1 inline size-3.5 align-text-bottom text-[#E0A500]" />
                    <span className="tabular-nums text-[#0B0B0D]">{timeLabel}</span>
                    <span className="mx-2 text-[#6B6457]">·</span>
                    <span>{dur} {minLabel}</span>
                  </p>
                  <p className="fl-display mt-1 truncate text-xl leading-none text-[#0B0B0D]">{serviceName}</p>
                </>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {b.client_profile_id ? (
                  <Link
                    href={`/freelancer/${b.client_profile_id}`}
                    className="truncate text-sm font-bold text-[#E0A500] underline-offset-2 hover:underline"
                  >
                    {displayName}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-bold text-[#0B0B0D]">{displayName}</span>
                )}
                {compactTime ? (
                  <span className="text-xs tabular-nums text-[#6B6457]">{dur} {minLabel}</span>
                ) : (
                  <span className="text-xs text-[#6B6457]">{b.client_email}</span>
                )}
              </div>
            </div>

            <span className={cn("shrink-0 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]", UI_STATUS_CLASS[ui])}>
              {label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-[#0B0B0D]/12 pt-3 text-xs text-[#6B6457]">
            <span>
              {t("amount", "Valor")}{" "}
              <strong className="font-extrabold tabular-nums text-[#E0A500]">{formatAgendaBRL(amount)}</strong>
            </span>

            {/* Status do lembrete / confirmação do cliente */}
            {b.client_confirm_status === "confirmed" ? (
              <span className="inline-flex items-center gap-1 bg-[#00876B] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                <Check className="h-3 w-3" /> {t("clientConfirmed", "Cliente confirmou")}
              </span>
            ) : b.client_confirm_status === "reschedule" ? (
              <span className="inline-flex items-center gap-1 bg-[#9A3412] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                <CalendarX className="h-3 w-3" /> {t("clientReschedule", "Quer remarcar")}
              </span>
            ) : b.reminder_sent_at ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#6B6457]">
                <BellRing className="h-3 w-3" /> {t("reminderSent", "Lembrete enviado")}
              </span>
            ) : null}

            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0B0B0D] transition hover:bg-[#25D366] hover:text-white"
              >
                <MessageCircle className="h-3 w-3" /> {t("whatsappReminder", "Lembrar no WhatsApp")}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
