"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, CalendarDays, ArrowLeft } from "lucide-react"
import Link from "next/link"

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-2">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-100">Agendamento confirmado!</h1>

        <p className="text-zinc-400">
          Seu pagamento foi processado com sucesso e o profissional foi notificado.
          Você receberá um email com os detalhes do agendamento.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-left space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CalendarDays className="w-4 h-4" />
            <span>Os detalhes do agendamento foram enviados para o email informado.</span>
          </div>
          {sessionId && (
            <p className="text-xs text-zinc-500 font-mono break-all">
              Referência: {sessionId}
            </p>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-600 border-t-emerald-500" />
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  )
}
