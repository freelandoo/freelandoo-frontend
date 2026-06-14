"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { AuthShell, AuthCard } from "@/components/tabloide"
import { SIGNUP_TERMS_VERSION } from "@/lib/action-consents"
import { getToken } from "@/lib/auth"
import { clientFetchWithTimeout, isClientFetchTimeout } from "@/lib/fetch-with-timeout"

// Tela obrigatória de aceite dos Termos + Privacidade. Aparece quando o backend
// devolve needs_terms=true (cadastro novo via Google ou bump de versão dos termos).
// Sem aceitar, o usuário não avança — é o consentimento afirmativo que faltava no
// fluxo OAuth do Google.
export default function AcceptTermsPage() {
  const router = useRouter()
  const t = useTranslations("Auth")
  const tErr = useTranslations("Errors")
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [next, setNext] = useState("/search")
  const [version, setVersion] = useState(SIGNUP_TERMS_VERSION)

  useEffect(() => {
    // Sem sessão não há o que aceitar — manda pro login.
    if (!getToken()) {
      router.replace("/login")
      return
    }
    const params = new URLSearchParams(window.location.search)
    const rawNext = params.get("next")
    if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) setNext(rawNext)
    const v = Number(params.get("v"))
    if (Number.isInteger(v) && v >= 1) setVersion(v)
  }, [router])

  const goNext = () => {
    router.replace(next)
    router.refresh()
    window.setTimeout(() => {
      if (window.location.pathname !== next) window.location.replace(next)
    }, 400)
  }

  const handleAccept = async () => {
    if (submitting || !accepted) return
    setError("")
    setSubmitting(true)
    const token = getToken()
    try {
      const res = await clientFetchWithTimeout(
        "/api/me/consents",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action_key: "signup", terms_version: version }),
        },
        9000,
      )
      if (!res.ok) {
        setError(tErr("network", "Erro ao conectar com o servidor"))
        setSubmitting(false)
        return
      }
      // Reflete no cache local que o ConsentProvider lê (não pisca em ações futuras).
      try {
        const raw = localStorage.getItem("fl_consents")
        const map = raw ? JSON.parse(raw) : {}
        map.signup = version
        localStorage.setItem("fl_consents", JSON.stringify(map))
      } catch {
        /* ignore */
      }
      goNext()
    } catch (err) {
      setError(
        isClientFetchTimeout(err)
          ? tErr("timeout", "Servidor demorou para responder. Tente novamente.")
          : tErr("network", "Erro ao conectar com o servidor"),
      )
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow={t("termsGateEyebrow", "Quase lá")}
      asideTitle={t("termsGateAsideTitle", "Falta só")}
      asideHighlight={t("termsGateAsideHighlight", "um passo")}
      asideSubtitle={t(
        "termsGateAsideSubtitle",
        "Para usar a Freelandoo — vender, comprar, publicar e receber — precisamos do seu aceite aos nossos termos.",
      )}
      bullets={[
        t("termsGateBullet1", "Você controla seus dados (LGPD)"),
        t("termsGateBullet2", "Pagamentos protegidos e repasses transparentes"),
        t("termsGateBullet3", "Regras claras para a comunidade"),
      ]}
    >
      <AuthCard
        title={t("termsGateTitle", "Aceite os termos para continuar")}
        subtitle={t(
          "termsGateSubtitle",
          "Você entrou com sucesso. Antes de continuar, leia e aceite os documentos abaixo.",
        )}
      >
        <div className="space-y-5">
          <p className="text-sm text-[#3a352d]">
            {t(
              "termsGateBody",
              "A Freelandoo conecta profissionais e clientes e processa pagamentos de cursos, produtos, serviços e recursos digitais. Ao continuar, você concorda com os documentos a seguir:",
            )}
          </p>

          <div className="flex flex-col gap-2">
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="fl-btn-card inline-flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold"
            >
              {t("termsOfUse", "Termos de Uso")}
              <span aria-hidden className="text-[#5b554b]">↗</span>
            </Link>
            <Link
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="fl-btn-card inline-flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold"
            >
              {t("privacyPolicy", "Política de Privacidade")}
              <span aria-hidden className="text-[#5b554b]">↗</span>
            </Link>
          </div>

          {error && (
            <div className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
              {error}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#F2B705]"
            />
            <span className="text-[#3a352d]">
              {t(
                "termsGateCheckbox",
                "Li e aceito os Termos de Uso e a Política de Privacidade da Freelandoo.",
              )}
            </span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {submitting
              ? t("termsGateSubmitting", "Salvando...")
              : t("termsGateAccept", "Concordar e continuar")}
          </button>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
