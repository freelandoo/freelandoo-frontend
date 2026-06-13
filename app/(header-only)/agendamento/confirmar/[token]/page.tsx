"use client"

// Confirmação de presença pelo cliente (link do e-mail de lembrete anti-no-show).
// Público — o token UUID é a credencial. Identidade tabloide gold da Agenda.

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CalendarCheck, Clock, Loader2, Check, CalendarX, AlertCircle } from "lucide-react"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { Underline } from "@/components/tabloide"
import { cn } from "@/lib/utils"

interface ConfirmBooking {
  client_name: string
  pro_name: string
  booking_date: string
  start_time: string
  status: string
  client_confirm_status: "confirmed" | "reschedule" | null
}

export default function ConfirmarAgendamentoPage() {
  const params = useParams()
  const token = params.token as string
  const t = useTranslations("Agenda")
  const locale = useLocale()

  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading")
  const [booking, setBooking] = useState<ConfirmBooking | null>(null)
  const [result, setResult] = useState<"confirmed" | "reschedule" | null>(null)
  const [submitting, setSubmitting] = useState<"confirm" | "reschedule" | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    try {
      const r = await clientFetchWithTimeout(`/api/bookings/confirm/${token}`, { cache: "no-store" }, 9000)
      if (!r.ok) return setState("notfound")
      const d = await r.json()
      setBooking(d.booking)
      setResult(d.booking?.client_confirm_status || null)
      setState("ok")
    } catch {
      setState("notfound")
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  const submit = async (action: "confirm" | "reschedule") => {
    setSubmitting(action)
    try {
      const r = await clientFetchWithTimeout(`/api/bookings/confirm/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }, 9000)
      if (r.ok) setResult(action === "confirm" ? "confirmed" : "reschedule")
    } catch {
      /* mantém a tela; usuário pode tentar de novo */
    } finally {
      setSubmitting(null)
    }
  }

  const dateLabel = booking
    ? new Date(booking.booking_date + "T12:00:00").toLocaleDateString(locale, { weekday: "long", day: "2-digit", month: "long" })
    : ""

  return (
    <main className="fl-root fl-paper-texture relative flex min-h-[100dvh] items-center justify-center overflow-x-clip px-4 py-16">
      <div className="w-full max-w-md">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 text-[#C9C2B6]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F2B705]" />
            <p className="fl-marker text-xl">{t("confirmLoading", "Carregando...")}</p>
          </div>
        )}

        {state === "notfound" && (
          <div className="border-2 border-dashed border-[#F1EDE2]/20 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#F2B705]" />
            <p className="fl-display text-2xl text-[#F1EDE2]">{t("confirmNotFound", "Link inválido ou expirado.")}</p>
          </div>
        )}

        {state === "ok" && booking && (
          <>
            <p className="fl-marker text-2xl text-[#F2B705]">{t("confirmEyebrow", "lembrete de horário")}</p>
            <h1 className="relative mb-6 inline-block">
              <span className="fl-display block text-5xl leading-[0.9] text-[#F2B705]">
                {t("confirmTitle", "Seu horário")}<span className="text-[#F1EDE2]">.</span>
              </span>
              <Underline className="absolute -bottom-2 left-0 h-3.5 w-40 text-[#F2B705]" />
            </h1>

            {/* Card do agendamento (papel) */}
            <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]">
              <p className="text-sm font-bold">
                {t("confirmGreeting", "Olá, {name}!").replace("{name}", booking.client_name)}
              </p>
              <p className="mt-1 text-sm text-[#6B6457]">
                {t("confirmLead", "Lembrete do seu horário com {pro}.").replace("{pro}", booking.pro_name)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 fl-display text-2xl text-[#0B0B0D]">
                <span className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> {dateLabel}</span>
                <span className="flex items-center gap-2"><Clock className="h-5 w-5" /> {booking.start_time}</span>
              </div>
            </div>

            {result ? (
              <div className={cn(
                "mt-5 flex items-center gap-3 border-2 border-[#0B0B0D] p-4 text-white shadow-[5px_5px_0_0_#0B0B0D]",
              )} style={{ background: result === "confirmed" ? "#00876B" : "#9A3412" }}>
                {result === "confirmed" ? <Check className="h-6 w-6 shrink-0" /> : <CalendarX className="h-6 w-6 shrink-0" />}
                <div>
                  <p className="fl-display text-xl">
                    {result === "confirmed" ? t("confirmedTitle", "Presença confirmada!") : t("rescheduleTitle", "Tudo bem!")}
                  </p>
                  <p className="text-sm opacity-90">
                    {result === "confirmed"
                      ? t("confirmedDesc", "Obrigado! Te esperamos no horário.")
                      : t("rescheduleDesc", "Avisamos o profissional que você precisa remarcar.")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => submit("confirm")}
                  disabled={submitting !== null}
                  className="flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t("confirmConfirmBtn", "Confirmar presença")}
                </button>
                <button
                  type="button"
                  onClick={() => submit("reschedule")}
                  disabled={submitting !== null}
                  className="flex flex-1 items-center justify-center gap-2 border-2 border-[#F1EDE2]/30 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2] disabled:opacity-60"
                >
                  {submitting === "reschedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX className="h-4 w-4" />}
                  {t("confirmRescheduleBtn", "Preciso remarcar")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
