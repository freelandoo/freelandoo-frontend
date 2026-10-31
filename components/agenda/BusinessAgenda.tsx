"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR, enUS, es } from "date-fns/locale"
import { CalendarClock, Loader2, MessageCircle, Settings, Timer } from "lucide-react"
import { AgendaBookingsExperience } from "@/components/agenda/AgendaBookingsExperience"
import type { AgendaBookingRow } from "@/components/agenda/AgendaBookingsPanel"
import {
  agendaTimeHm,
  bookingDateKey,
  formatAgendaBRL,
  sortBookingsByDateTime,
} from "@/components/agenda/agenda-booking-utils"
import { CountUp, PressButton, Reveal, TiltCard } from "@/components/motion/motion-kit"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

/**
 * A AGENDA DO NEGÓCIO (aba da comunidade de negócio, 2026-10-31).
 *
 * Pedido do Alex: o dono abre o negócio e vê, ANTES de tudo, o PRÓXIMO
 * horário; embaixo o calendário completo — a MESMA `AgendaBookingsExperience`
 * do /account, nunca uma segunda — com a lista já carregada aqui (uma
 * requisição só); por último o valor acumulado do mês.
 *
 * Repaginada "BALCÃO ACESO" (N4): o próximo horário é o cartão herói (hora
 * acesa na cor do dono, contagem regressiva, inclinação), e os valores contam
 * como visor de caixa registradora. Movimento só pelo kit compartilhado
 * (`components/motion`), que respeita "reduzir movimento".
 *
 * A lista é a do perfil-conta do líder: é nele que o site e o perfil marcam
 * (agenda da conta, mig 190).
 */

const DATE_FNS_LOCALES: Record<string, typeof ptBR> = { "pt-BR": ptBR, en: enUS, es }

/** Ainda vai acontecer e não caiu: confirmado, ou esperando o pagamento. */
const UPCOMING_STATUSES = new Set(["confirmed", "pending_payment"])

const LINE = "#0B0B0D"

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

/** Início do atendimento no relógio local. */
function startsAt(b: AgendaBookingRow): number {
  return new Date(`${bookingDateKey(b.booking_date)}T${agendaTimeHm(b.start_time)}:00`).getTime()
}

/** Fim do atendimento no relógio local. */
function endsAt(b: AgendaBookingRow): number {
  return new Date(`${bookingDateKey(b.booking_date)}T${agendaTimeHm(b.end_time || b.start_time)}:00`).getTime()
}

/** Visor de caixa: formatador estável (módulo) para o CountUp. */
const brl = (n: number) => formatAgendaBRL(Math.round(n))

function alphaHex(hex: string, a: number) {
  return `${hex.slice(0, 7)}${Math.round(a * 255).toString(16).padStart(2, "0")}`
}

export function BusinessAgenda({ profileId, accent }: { profileId: string; accent: string }) {
  const t = useTranslations("Agenda")
  const locale = useLocale()
  const dfLocale = DATE_FNS_LOCALES[locale] || ptBR

  const [bookings, setBookings] = useState<AgendaBookingRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  // O relógio da contagem: anda de minuto em minuto enquanto a aba está na
  // tela (o componente só existe com a aba aberta).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

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

  // Próximos = ainda não TERMINARAM (o que está acontecendo agora conta).
  const upcoming = useMemo(() => {
    if (!bookings) return []
    return sortBookingsByDateTime(
      bookings.filter((b) => UPCOMING_STATUSES.has(b.status) && endsAt(b) > now)
    )
  }, [bookings, now])

  // ─── O VALOR ACUMULADO DO MÊS (pedido do Alex, 2026-10-31) ────────────────
  // Conta pelo DIA DO ATENDIMENTO no mês corrente. Pago pelo site entra pelo
  // LÍQUIDO (`professional_amount`: preço − taxa − tarifa) — é o que vira
  // repasse; no balcão o dinheiro não passa pela plataforma, então entra o
  // preço cheio. Aguardando pagamento fica FORA do total: ainda pode cair.
  const totals = useMemo(() => {
    const month = format(new Date(), "yyyy-MM")
    const sum = { paid: 0, onSite: 0, pending: 0, count: 0 }
    for (const b of bookings || []) {
      if (!bookingDateKey(b.booking_date).startsWith(month)) continue
      if (b.status === "pending_payment" && b.payment_status === "pending") {
        // Líquido ESTIMADO: a tarifa real do Mercado Pago só é apurada quando
        // o pagamento confirma (e aí a linha passa para "pago").
        sum.pending += Number(b.professional_amount) || 0
        continue
      }
      if (!["confirmed", "completed"].includes(b.status)) continue
      if (b.payment_status === "paid") {
        sum.paid += Number(b.professional_amount) || 0
        sum.count++
      } else if (b.payment_status === "on_site") {
        sum.onSite += Number(b.service_price_amount) || 0
        sum.count++
      }
    }
    return sum
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

  // No topo, SÓ o próximo horário (pedido do Alex): o resto da fila está no
  // calendário logo abaixo.
  const next = upcoming[0] || null
  const nextPaid = next?.payment_status === "paid"
  const nextOnSite = next?.payment_status === "on_site"
  const nextWa = next ? waLink(next.client_whatsapp) : null

  let countdown: string | null = null
  if (next) {
    const mins = Math.round((startsAt(next) - now) / 60_000)
    if (mins <= 0) countdown = t("countNow", "Acontecendo agora")
    else if (mins < 60) countdown = t("countMin", "Em {m} min").replace("{m}", String(mins))
    else if (mins < 24 * 60)
      countdown = t("countHours", "Em {h} h {m} min")
        .replace("{h}", String(Math.floor(mins / 60)))
        .replace("{m}", String(mins % 60))
    else {
      const days = Math.round(mins / (24 * 60))
      countdown = days === 1 ? t("countTomorrow", "Amanhã") : t("countDays", "Em {d} dias").replace("{d}", String(days))
    }
  }

  return (
    <div className="fl-sharp space-y-8">
      {/* ─── 1ª seção: o próximo agendamento (cartão herói) ──────────────── */}
      <Reveal>
        <TiltCard shadow={LINE} offset={8} max={4}>
          <section
            className="relative overflow-hidden border-2 border-[#0B0B0D] bg-[#15120E]"
            style={{ boxShadow: `0 0 0 1px ${alphaHex(accent, 0.35)}, 0 22px 50px -24px ${alphaHex(accent, 0.75)}` }}
          >
            {/* Luz de vitrine parada (CSS) — o efeito vivo mora só no banner. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(70% 120% at 0% 0%, ${alphaHex(accent, 0.18)}, transparent 60%)` }}
            />
            <header className="relative flex items-center justify-between gap-3 border-b-2 border-[#F1EDE2]/12 px-5 py-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  <CalendarClock className="size-3.5" style={{ color: accent }} aria-hidden />
                  {t("nextEyebrow", "Próximo agendamento")}
                </p>
                {upcoming.length > 1 && (
                  <p className="mt-1 text-xs text-[#9A938A]">
                    {t("nextMore", "+{n} marcados depois deste").replace("{n}", String(upcoming.length - 1))}
                  </p>
                )}
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

            {!next ? (
              <p className="relative px-5 py-10 text-center text-sm text-[#9A938A]">
                {t(
                  "upcomingEmptyDesc",
                  "Quando alguém marcar pelo seu site ou pelo seu perfil, aparece aqui na hora."
                )}
              </p>
            ) : (
              <div className="relative flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  {countdown && (
                    <span
                      className="mb-2 inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
                      style={{ background: accent }}
                    >
                      <Timer className="h-3 w-3" /> {countdown}
                    </span>
                  )}
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">
                    {format(new Date(`${bookingDateKey(next.booking_date)}T12:00:00`), "EEEE, d MMM", {
                      locale: dfLocale,
                    })}
                  </p>
                  <p
                    className="fl-display text-6xl leading-none tabular-nums"
                    style={{
                      color: accent,
                      textShadow: `0 0 1px ${alphaHex(accent, 0.9)}, 0 0 18px ${alphaHex(accent, 0.55)}, 0 0 40px ${alphaHex(accent, 0.3)}`,
                    }}
                  >
                    {agendaTimeHm(next.start_time)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="fl-display break-words text-3xl leading-none text-[#F1EDE2]">
                    {next.client_profile_display_name || next.client_name}
                  </p>
                  <p className="mt-1.5 text-sm text-[#9A938A]">
                    {next.service_name_snapshot || t("serviceFallback", "Serviço")}
                    {next.service_price_amount != null && ` · ${formatAgendaBRL(next.service_price_amount)}`}
                  </p>
                  {next.client_whatsapp && (
                    <p className="mt-0.5 text-sm tabular-nums text-[#9A938A]">{formatPhone(next.client_whatsapp)}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      nextPaid
                        ? "bg-[#00876B] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white"
                        : nextOnSite
                          ? "bg-[#F1EDE2] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0B0B0D]"
                          : "bg-[#9A3412] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white"
                    }
                  >
                    {nextPaid
                      ? t("payPaid", "Pago")
                      : nextOnSite
                        ? t("payOnSite", "Paga no balcão")
                        : t("payPending", "Aguardando pagamento")}
                  </span>
                  {nextWa && (
                    <PressButton
                      type="button"
                      onClick={() => window.open(nextWa, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#25D366] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </PressButton>
                  )}
                </div>
              </div>
            )}
          </section>
        </TiltCard>
      </Reveal>

      {/* ─── 2ª seção: o calendário inteiro ─────────────────────────────── */}
      <Reveal tilt={false}>
        <AgendaBookingsExperience profileId={profileId} controlledBookings={bookings} />
      </Reveal>

      {/* ─── Por último: o valor acumulado do mês (visor de caixa) ────────── */}
      <Reveal tilt={false}>
        <section className="border-2 border-[#0B0B0D] bg-[#15120E]" style={{ boxShadow: `6px 6px 0 0 ${LINE}` }}>
          <div className="grid grid-cols-2 gap-px bg-[#F1EDE2]/8 sm:grid-cols-4">
            <div className="col-span-2 bg-[#15120E] px-5 py-4 sm:col-span-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("totalMonth", "Acumulado no mês")}
              </p>
              <span
                className="block"
                style={{ color: accent, textShadow: `0 0 16px ${alphaHex(accent, 0.45)}` }}
              >
                <CountUp
                  value={totals.paid + totals.onSite}
                  format={brl}
                  className="fl-display mt-1 block text-3xl leading-none tabular-nums"
                />
              </span>
              <p className="mt-1 text-[10px] text-[#9A938A]">
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
              <div key={key} className="bg-[#15120E] px-5 py-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                  {t(key, label)}
                </p>
                <CountUp
                  value={cents}
                  format={brl}
                  className="mt-1 block text-base font-extrabold tabular-nums text-[#F1EDE2]"
                />
              </div>
            ))}
            {/* Fecha a grade de 2 colunas no celular (3 blocos + o total). */}
            <div className="bg-[#15120E] sm:hidden" aria-hidden />
            <p className="col-span-2 bg-[#15120E] px-5 py-3 text-[10px] leading-snug text-[#9A938A] sm:col-span-4">
              {t(
                "totalNetNote",
                "Valores do site já sem a tarifa do Mercado Pago e a taxa da Freelandoo. No balcão o valor é cheio: o pagamento é feito direto com você."
              )}
            </p>
          </div>
        </section>
      </Reveal>
    </div>
  )
}
