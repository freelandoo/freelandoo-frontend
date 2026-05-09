"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react"
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
}

type UiStatusKey = "confirmed" | "in_progress" | "completed" | "canceled"

function uiStatus(status: string): UiStatusKey {
  if (status === "completed") return "completed"
  if (status === "canceled" || status === "expired" || status === "no_show") return "canceled"
  if (status === "confirmed") return "confirmed"
  if (status === "pending_payment") return "in_progress"
  return "in_progress"
}

const UI_STATUS_LABEL: Record<UiStatusKey, string> = {
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  completed: "Finalizado",
  canceled: "Cancelado",
}

const UI_STATUS_CLASS: Record<UiStatusKey, string> = {
  confirmed:
    "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300/95 ring-1 ring-emerald-500/15",
  in_progress:
    "border-yellow-500/30 bg-yellow-400/[0.08] text-yellow-200 ring-1 ring-yellow-400/15",
  completed: "border-zinc-600/60 bg-zinc-800/40 text-zinc-300 ring-1 ring-white/[0.04]",
  canceled: "border-rose-500/20 bg-rose-500/[0.06] text-rose-200/90 ring-1 ring-rose-500/12",
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
  const { start: wStart, end: wEnd } = agendaWeekRange(weekAnchor)
  const weekRangeLabel = `${format(wStart, "d MMM", { locale: ptBR })} — ${format(wEnd, "d MMM yyyy", { locale: ptBR })}`

  const grouped = pickedDay === null ? groupBookingsByDate(bookings) : null
  const flatDay =
    pickedDay !== null ? sortBookingsByDateTime(bookings) : null

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)] backdrop-blur-md">
      <header className="flex flex-col gap-4 border-b border-zinc-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <Sparkles className="size-3.5 text-yellow-500/70" aria-hidden />
            Agendamentos
          </div>
          <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-50">
            {pickedDay ? formatAgendaDayHeading(pickedDay) : `Semana atual · ${weekRangeLabel}`}
          </h2>
          <p className="text-sm text-zinc-500">
            {pickedDay
              ? "Horários do dia selecionado."
              : "Visualização agrupada por dia da semana."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pickedDay ? (
            <button
              type="button"
              onClick={onClearDay}
              className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-yellow-500/25 hover:bg-yellow-400/5 hover:text-yellow-200"
            >
              Ver semana
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onGoCurrentWeek}
                className="rounded-xl border border-yellow-500/25 bg-yellow-400/10 px-4 py-2 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-400/15"
              >
                Esta semana
              </button>
              <div className="flex items-center rounded-xl border border-zinc-700/80 bg-zinc-900/50 p-0.5">
                <button
                  type="button"
                  onClick={onPrevWeek}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label="Semana anterior"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={onNextWeek}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label="Próxima semana"
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-20 text-center">
            <p className="text-sm font-medium text-zinc-400">Nenhum agendamento neste período</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-600">
              Escolha outro dia no calendário ou navegue entre semanas para ver mais compromissos.
            </p>
          </div>
        ) : pickedDay && flatDay ? (
          <ul className="space-y-3">
            {flatDay.map((b) => (
              <li key={b.id}>
                <BookingCard b={b} compactTime />
              </li>
            ))}
          </ul>
        ) : (
          grouped?.map((group) => (
            <div key={group.dateKey}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {formatAgendaDayHeading(group.date)}
              </h3>
              <ul className="space-y-3">
                {group.items.map((b) => (
                  <li key={b.id}>
                    <BookingCard b={b} />
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
}: {
  b: AgendaBookingRow
  compactTime?: boolean
}) {
  const startHm = agendaTimeHm(b.start_time)
  const endHm = agendaTimeHm(b.end_time)
  const dur = bookingDurationMinutes(startHm, endHm)
  const amount = b.service_price_amount ?? b.deposit_amount
  const ui = uiStatus(b.status)
  const label =
    b.status === "no_show"
      ? "Não compareceu"
      : UI_STATUS_LABEL[ui]

  const displayName = b.client_profile_display_name || b.client_name
  const timeLabel = startHm

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-4 transition duration-200",
        "hover:border-zinc-700 hover:bg-zinc-900/55 hover:shadow-[0_12px_40px_-28px_rgba(250,204,21,0.12)]",
      )}
    >
      <div className="flex gap-4">
        <Avatar className="size-12 shrink-0 border border-zinc-700/80 shadow-inner">
          <AvatarFallback className="bg-zinc-800 text-xs font-semibold text-zinc-300">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {compactTime ? (
                <p className="font-mono text-sm font-semibold tabular-nums text-yellow-400/95">
                  {timeLabel}{" "}
                  <span className="font-sans text-zinc-500">—</span>{" "}
                  <span className="font-sans font-medium text-zinc-100">
                    {b.service_name_snapshot || "Serviço"}
                  </span>
                </p>
              ) : (
                <>
                  <p className="text-xs font-medium text-zinc-500">
                    <Clock className="mr-1 inline size-3.5 align-text-bottom text-yellow-500/60" />
                    <span className="tabular-nums text-zinc-300">{timeLabel}</span>
                    <span className="mx-2 text-zinc-600">·</span>
                    <span>{dur} min</span>
                  </p>
                  <p className="mt-1 truncate text-base font-semibold tracking-tight text-zinc-50">
                    {b.service_name_snapshot || "Serviço"}
                  </p>
                </>
              )}
              {!compactTime && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {b.client_profile_id ? (
                    <Link
                      href={`/freelancer/${b.client_profile_id}`}
                      className="truncate text-sm font-medium text-yellow-400/95 underline-offset-2 hover:underline"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium text-zinc-200">{displayName}</span>
                  )}
                  <span className="text-xs text-zinc-600">{b.client_email}</span>
                </div>
              )}
              {compactTime && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {b.client_profile_id ? (
                    <Link
                      href={`/freelancer/${b.client_profile_id}`}
                      className="truncate text-sm font-medium text-yellow-400/95 underline-offset-2 hover:underline"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium text-zinc-200">{displayName}</span>
                  )}
                  <span className="text-xs tabular-nums text-zinc-500">{dur} min</span>
                </div>
              )}
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
                UI_STATUS_CLASS[ui],
              )}
            >
              {label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-800/70 pt-3 text-xs text-zinc-500">
            <span>
              Valor{" "}
              <strong className="font-semibold text-yellow-400/90 tabular-nums">
                {formatAgendaBRL(amount)}
              </strong>
            </span>
            {b.client_whatsapp ? (
              <span className="tabular-nums">{b.client_whatsapp}</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
