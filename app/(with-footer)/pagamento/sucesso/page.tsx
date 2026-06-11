"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { TABLOID_ACTION_CLASSES } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

function SucessoContent() {
  const t = useTranslations("Checkout")
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get("session_id")

  useEffect(() => {
    // Placeholder: futuramente podemos puxar /api/stripe/subscription/me
    // para refletir o estado na UI enquanto o webhook processa.
  }, [sessionId])

  return (
    <main className="fl-root relative flex flex-1 items-center justify-center bg-[#0b0804] px-4 py-16">
      <div className="relative w-full max-w-xl">
        <div className="fl-card fl-hard rounded-[6px] p-8 text-center sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[6px] border-2 border-[#0B0B0D] bg-green-500/15 text-green-700">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="fl-marker text-xl font-bold leading-none text-[#0B0B0D]/55">{t("eyebrowPayment", "Pagamento")}</p>
          <h1 className="fl-display mt-1 text-5xl leading-[0.9] text-[#0B0B0D] sm:text-6xl">{t("successHeading", "CONFIRMADO.")}</h1>
          <p className="mx-auto mt-5 max-w-md text-sm font-bold leading-relaxed text-[#5b554b]">
            {t("successDescription", "Recebemos seu pagamento. Assim que o Stripe confirmar, seu perfil será ativado automaticamente nos classificados — em alguns segundos o status aparece em \"Minha conta\".")}
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => router.push("/account")} className={TABLOID_ACTION_CLASSES}>
              {t("goToMyAccount", "Ir para minha conta")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center border-2 border-[#0B0B0D] bg-transparent px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
            >
              {t("backToHome", "Voltar ao início")}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function SucessoPage() {
  return (
    <Suspense fallback={
      <main className="fl-root flex flex-1 items-center justify-center bg-[#0b0804] px-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6B6354] border-t-[#F2B705]" />
      </main>
    }>
      <SucessoContent />
    </Suspense>
  )
}
