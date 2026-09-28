"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { getToken } from "@/lib/auth"

/**
 * Retorno do pagamento do pet/carro adicional (mig 264).
 *
 * Quem cria o espaço é o WEBHOOK, não esta tela: o pagamento é a existência.
 * Aqui só se espera ele cair e leva a pessoa para a página nova. O session id é
 * lido do `window` num efeito — `useSearchParams` obrigaria Suspense e tiraria
 * a rota do pré-render.
 */

type Phase = "waiting" | "slow" | "expired" | "error"

export default function ExtraSpaceReturnPage() {
  const t = useTranslations("Community")
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("waiting")

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id")
    const token = getToken()
    if (!sessionId || !token) {
      setPhase("error")
      return
    }
    let stop = false
    let tries = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      if (stop) return
      tries += 1
      try {
        const res = await fetch(`/api/me/space-slots/session/${encodeURIComponent(sessionId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok && json?.id_profile) {
          router.replace(`/comunidades/${json.id_profile}`)
          return
        }
        if (res.ok && json?.status === "expired") {
          setPhase("expired")
          return
        }
      } catch {
        /* rede oscilando: tenta de novo */
      }
      // Pix pode levar alguns segundos; depois de ~30s a tela diz o que fazer,
      // mas continua esperando.
      if (tries === 10) setPhase("slow")
      if (tries < 40) timer = setTimeout(tick, tries < 10 ? 3000 : 6000)
    }
    void tick()
    return () => {
      stop = true
      if (timer) clearTimeout(timer)
    }
  }, [router])

  return (
    <main className="fl-root fl-sharp mx-auto min-h-[70dvh] max-w-md px-4 py-10">
      <PageBackLink href="/account" className="mb-6" />
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-6 text-[#0B0B0D] shadow-[6px_6px_0_0_#F2B705]">
        {phase === "waiting" || phase === "slow" ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <h1 className="fl-display mt-4 text-3xl leading-none">
              {t("extraSpaceWaitingTitle", "Confirmando o pagamento")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed">
              {phase === "slow"
                ? t(
                    "extraSpaceSlow",
                    "Está demorando mais que o normal. Se você pagou por Pix, pode levar alguns minutos — assim que cair, o espaço aparece no menu da sua foto de perfil.",
                  )
                : t("extraSpaceWaiting", "Assim que o pagamento cair, abrimos a página nova para você editar.")}
            </p>
          </>
        ) : phase === "expired" ? (
          <>
            <h1 className="fl-display text-3xl leading-none">
              {t("extraSpaceExpiredTitle", "Pagamento não concluído")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed">
              {t("extraSpaceExpired", "Nada foi cobrado. Você pode tentar de novo pelo \"+\" da foto.")}
            </p>
          </>
        ) : (
          <>
            <h1 className="fl-display text-3xl leading-none">
              {t("extraSpaceErrorTitle", "Não encontramos este pagamento")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed">
              {t("extraSpaceError", "Se você pagou, o espaço aparece no menu da sua foto de perfil assim que o pagamento cair.")}
            </p>
          </>
        )}
      </div>
    </main>
  )
}
