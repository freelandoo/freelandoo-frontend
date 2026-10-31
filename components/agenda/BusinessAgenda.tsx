"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR, enUS, es } from "date-fns/locale"
import { CalendarClock, Loader2, MessageCircle, Settings } from "lucide-react"
import { AgendaBookingsExperience } from "@/components/agenda/AgendaBookingsExperience"
import type { AgendaBookingRow } from "@/components/agenda/AgendaBookingsPanel"
import {
  agendaTimeHm,
  bookingDateKey,
  formatAgendaBRL,
  sortBookingsByDateTime,
} from "@/components/agenda/agenda-booking-utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

/**
 * A AGENDA DO NEGÓCIO (aba da comunidade de negócio, 2026-10-31).
 *
 * Pedido do Alex: o dono abre o negócio e vê, ANTES de tudo, quem agendou.
 * Por isso a primeira seção é a fila dos próximos horários (nome, serviço,
 * dia/hora, pagamento e o WhatsApp a um toque); o calendário completo —
 * a MESMA `AgendaBookingsExperience` do /account, nunca uma segunda — vem
 * embaixo, com a lista já carregada aqui (uma requisição só).
 *
 * A lista é a do perfil-conta do líder: é nele que o site e o perfil marcam
 * (agenda da conta, mig 190).
 */

const DATE_FNS_LOCALES: Record<string, typeof ptBR> = { "pt-BR": ptBR, en: enUS, es }

/** Ainda vai acontecer e não caiu: confirmado, ou esperando o pagamento. */
const UPCOMING_STATUSES = new Set(["confirmed", "pending_payment"])

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function waLink(raw: string | null | undefined): string | null {
  const digits = String(raw || "").replace(/\D/g, "")
  if (digits.length < 10) return null
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`
}

function formatPhone(raw: string | null | undefined): string {
  const d = String(raw || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

export function BusinessAgenda({ profileId, accent }: { profileId: string; accent: string }) {
  const t = useTranslations("Agenda")
  const locale = useLocale()
  const dfLocale = DATE_FNS_LOCALES[locale] || ptBR

  const [bookings, setBookings] = useState<AgendaBookingRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/profile/${profileId}/bookings`, { headers: authHeaders() })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) { setFailed(true); return }
        const list = (d.bookings || []) as AgendaBookingRow[]
        list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
        setBookings(list)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [profileId])

  const upcoming = useMemo(() => {
    if (!bookings) return []
    const today = format(new Date(), "yyyy-MM-dd")
    return sortBookingsByDateTime(
      bookings.filter((b) => UPCOMING_STATUSES.has(b.status) && bookingDateKey(b.booking_date) >= today)
    )
  }, [bookings])

  // ─── O VALOR ACUMULADO DO MÊS (pedido do Alex, 2026-10-31) ────────────────
  // Conta pelo DIA DO ATENDIMENTO no mês corrente. Pago pelo site entra pelo
  // LÍQUIDO (`professional_amount`: preço − taxa − tarifa) — é o que vira
  // repasse; no balcão o dinheiro não passa pela plataforma, então entra o
  // preço cheio. Aguardando pagamento fica FORA do total: ainda pode cair.
  const totals = useMemo(() => {
    const month = format(new Date(), "yyyy-MM")
    const t = { paid: 0, onSite: 0, pending: 0, count: 0 }
    for (const b of bookings || []) {
      if (!bookingDateKey(b.booking_date).startsWith(month)) continue
      if (b.status === "pending_payment" && b.payment_status === "pending") {
        // Líquido ESTIMADO: a tarifa real do Mercado Pago só é apurada quando
        // o pagamento confirma (e aí a linha passa para "pago").
        t.pending += Number(b.professional_amount) || 0
        continue
      }
      if (!["confirmed", "completed"].includes(b.status)) continue
      if (b.payment_status === "paid") {
        t.paid += Number(b.professional_amount) || 0
        t.count++
      } else if (b.payment_status === "on_site") {
        t.onSite += Number(b.service_price_amount) || 0
        t.count++
      }
    }
    return t
  }, [bookings])

  if (failed) {
    return (
      <div className="border-2 border-dashed border-[#F1EDE2]/15 px-6 py-14 text-center">
        <p className="text-sm font-semibold text-[#9A938A]">
          {t("loadErrorBookings", "Não foi possível carregar os agendamentos agora. Tente novamente em instantes.")}
        </p>
      </div>
    )
  }
  if (!bookings) {
    return (
      <div className="flex min-h-[240px] items-center justify-center border-2 border-[#F1EDE2]/12 bg-[#1D1810]">
        <Loader2 className="size-8 animate-spin" style={{ color: accent }} aria-hidden />
      </div>
    )
  }

  const settingsHref = `/account/profile/${profileId}/agenda`

  return (
    <div className="fl-sharp space-y-8">
      {/* ─── 1ª seção: quem agendou ─────────────────────────────────────── */}
      <section className="border-2 border-[#0B0B0D] bg-[#15120E]">
        <header className="flex items-center justify-between gap-3 border-b-2 border-[#F1EDE2]/12 px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              <CalendarClock className="size-3.5" style={{ color: accent }} aria-hidden />
              {t("upcomingEyebrow", "Próximos agendamentos")}
            </p>
            <h2 className="fl-display mt-1 text-2xl leading-none text-[#F1EDE2]">
              {upcoming.length === 0
                ? t("upcomingNone", "Nenhum horário marcado")
                : upcoming.length === 1
                  ? t("upcomingOne", "1 horário marcado")
                  : t("upcomingMany", "{n} horários marcados").replace("{n}", String(upcoming.length))}
            </h2>
          </div>
          <Link
            href={settingsHref}
            aria-label={t("configureAgenda", "Configurar agenda")}
            title={t("configureAgenda", "Configurar agenda")}
            className="flex shrink-0 items-center justify-center border-2 border-[#F1EDE2]/25 px-3 py-3 text-[#F1EDE2] transition hover:border-[#F1EDE2]"
          >
            <Settings className="size-4" aria-hidden />
          </Link>
        </header>

        {/* Valor acumulado do mês */}
        <div className="grid grid-cols-2 gap-px border-b-2 border-[#F1EDE2]/12 bg-[#F1EDE2]/8 sm:grid-cols-4">
          <div className="col-span-2 bg-[#15120E] px-5 py-3 sm:col-span-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
              {t("totalMonth", "Acumulado no mês")}
            </p>
            <p className="fl-display mt-0.5 text-2xl leading-none tabular-nums" style={{ color: accent }}>
              {formatAgendaBRL(totals.paid + totals.onSite)}
            </p>
            <p className="mt-0.5 text-[10px] text-[#9A938A]">
              {(totals.count === 1
                ? t("totalCountOne", "1 atendimento")
                : t("totalCountMany", "{n} atendimentos")
              ).replace("{n}", String(totals.count))}
            </p>
          </div>
          {([
            ["totalPaid", "Pago pelo site", totals.paid],
            ["totalOnSite", "No balcão", totals.onSite],
            ["totalPending", "Aguardando pagamento", totals.pending],
          ] as const).map(([key, label, cents]) => (
            <div key={key} className="bg-[#15120E] px-5 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t(key, label)}
              </p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[#F1EDE2]">
                {formatAgendaBRL(cents)}
              </p>
            </div>
          ))}
          <p className="col-span-2 bg-[#15120E] px-5 pb-3 text-[10px] leading-snug text-[#9A938A] sm:col-span-4">
            {t(
              "totalNetNote",
              "Valores do site já sem a tarifa do Mercado Pago e a taxa da Freelandoo. No balcão o valor é cheio: o pagamento é feito direto com você."
            )}
          </p>
        </div>

        {upcoming.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#9A938A]">
            {t(
              "upcomingEmptyDesc",
              "Quando alguém marcar pelo seu site ou pelo seu perfil, aparece aqui na hora."
            )}
          </p>
        ) : (
          <ul className="divide-y-2 divide-[#F1EDE2]/8">
            {upcoming.map((b) => {
              const date = new Date(`${bookingDateKey(b.booking_date)}T12:00:00`)
              const name = b.client_profile_display_name || b.client_name
              const wa = waLink(b.client_whatsapp)
              const paid = b.payment_status === "paid"
              const onSite = b.payment_status === "on_site"
              const payLabel = paid
                ? t("payPaid", "Pago")
                : onSite
                  ? t("payOnSite", "Paga no balcão")
                  : t("payPending", "Aguardando pagamento")
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                  <div className="w-24 shrink-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
                      {format(date, "EEE d MMM", { locale: dfLocale })}
                    </p>
                    <p className="fl-display text-2xl leading-none tabular-nums" style={{ color: accent }}>
                      {agendaTimeHm(b.start_time)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold text-[#F1EDE2]">{name}</p>
                    <p className="truncate text-xs text-[#9A938A]">
                      {b.service_name_snapshot || t("serviceFallback", "Serviço")}
                      {b.service_price_amount != null && ` · ${formatAgendaBRL(b.service_price_amount)}`}
                      {b.client_whatsapp && ` · ${formatPhone(b.client_whatsapp)}`}
                    </p>
                  </div>
                  <span
                    className={
                      paid
                        ? "shrink-0 bg-[#00876B] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
                        : onSite
                          ? "shrink-0 bg-[#F1EDE2] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#0B0B0D]"
                          : "shrink-0 bg-[#9A3412] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
                    }
                  >
                    {payLabel}
                  </span>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] bg-[#25D366] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ─── 2ª seção: o calendário inteiro ─────────────────────────────── */}
      <AgendaBookingsExperience profileId={profileId} controlledBookings={bookings} />
    </div>
  )
}
