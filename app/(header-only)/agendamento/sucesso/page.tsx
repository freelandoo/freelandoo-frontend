"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, CalendarDays, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"

function BookingSuccessContent() {
  const t = useTranslations("Profile")
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  return (
    <div className="fl-root flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="fl-card fl-hard rounded-[6px] p-8 sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[6px] border-2 border-[#0B0B0D] bg-green-500/15 text-green-700">
            <CheckCircle className="h-9 w-9" />
          </span>
          <p className="fl-marker text-xl font-bold leading-none text-[#0B0B0D]/55">{t("bookingWord", "Agendamento")}</p>
          <h1 className="fl-display mt-1 text-4xl leading-[0.9] text-[#0B0B0D] sm:text-5xl">{t("confirmedUpper", "CONFIRMADO.")}</h1>
          <p className="mx-auto mt-5 max-w-sm text-sm font-bold leading-relaxed text-[#5b554b]">
            {t("bookingSuccessBody", "Seu pagamento foi processado e o profissional foi notificado. Você receberá um email com os detalhes do agendamento.")}
          </p>

          <div className="mt-6 rounded-[6px] border-2 border-[#0B0B0D] bg-[#0B0B0D]/[0.04] p-5 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-[#5b554b]">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>{t("bookingSuccessEmail", "Os detalhes do agendamento foram enviados para o email informado.")}</span>
            </div>
            {sessionId && (
              <p className="mt-3 break-all font-mono text-[11px] text-[#8a8275]">
                {t("reference", "Referência")}: {sessionId}
              </p>
            )}
          </div>

          <Link
            href="/"
            className="mt-7 inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToHome", "Voltar para o início")}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="fl-root flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6B6354] border-t-[#F2B705]" />
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
