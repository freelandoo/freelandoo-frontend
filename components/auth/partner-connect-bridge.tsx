"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { AuthShell, AuthCard } from "@/components/tabloide"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { SIGNUP_TERMS_VERSION } from "@/lib/action-consents"
import { clearSession, completeAuthRedirect, getToken } from "@/lib/auth"
import { safeInternalPath } from "@/lib/safe-return"
import { formatCPF, isValidCPF, onlyDigits } from "@/lib/validation/signup"

/**
 * Ponte de login para um site parceiro que roda no mesmo domínio por rewrite
 * (hoje só A Russa Mais Russa, em /russamaisrussa). O parceiro manda a pessoa
 * para cá com `?next=/russamaisrussa/...`; aqui ela:
 *   1. entra (Google ou e-mail e senha da Freelandoo);
 *   2. aceita os Termos, se ainda não aceitou (tela /aceitar-termos);
 *   3. informa nascimento + CPF, se faltar — SÓ isso: a atuação (enxame,
 *      profissão, cidade) não é cobrada de quem veio pelo parceiro
 *      (`identity_only` no back);
 *   4. volta ao parceiro, que lê o login salvo no navegador (mesma origem) e
 *      confere no servidor dele pelo /users/me do back.
 */
export type PartnerConfig = {
  /** Prefixo do site parceiro; `next` fora dele é ignorado. */
  prefix: string
  /** Página do parceiro que completa o login. */
  landing: string
  name: string
}

type Me = {
  nome?: string | null
  username?: string | null
  email?: string | null
  has_cpf?: boolean
  cpf_waived?: boolean
  data_nascimento?: string | null
  idade?: number | null
}

type Phase = "checking" | "login" | "confirm" | "identity" | "leaving" | "error"

function ageOf(birthdate: string): number | null {
  const d = new Date(birthdate)
  if (!birthdate || Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

export function PartnerConnectBridge({ partner }: { partner: PartnerConfig }) {
  const t = useTranslations("Connect")
  const tOn = useTranslations("Onboarding")
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("checking")
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState("")
  const [next, setNext] = useState(partner.landing)
  const [selfUrl, setSelfUrl] = useState("")
  const [needBirthdate, setNeedBirthdate] = useState(false)
  const [needCpf, setNeedCpf] = useState(false)
  const [birthdate, setBirthdate] = useState("")
  const [cpf, setCpf] = useState("")
  const [responsibleCode, setResponsibleCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const started = useRef(false)

  const leave = useCallback((target: string) => {
    setPhase("leaving")
    completeAuthRedirect(target)
  }, [])

  // Confere sessão, termos e identidade. `auto`: a pessoa acabou de entrar
  // nesta tela, então não pergunta "continuar como".
  const check = useCallback(
    async (target: string, self: string, auto: boolean) => {
      setPhase("checking")
      setError("")
      const token = getToken()
      if (!token) {
        setPhase("login")
        return
      }
      const headers = { Authorization: `Bearer ${token}` }
      try {
        const res = await fetch("/api/users/me", { headers, cache: "no-store" })
        if (res.status === 401 || res.status === 403) {
          clearSession()
          setPhase("login")
          return
        }
        if (!res.ok) throw new Error("me")
        const data = (await res.json()) as Me
        setMe(data)

        const cRes = await fetch("/api/me/consents", { headers, cache: "no-store" })
        const consents = cRes.ok ? ((await cRes.json())?.consents ?? {}) : {}
        if (Number(consents.signup || 0) < SIGNUP_TERMS_VERSION) {
          const gate = `/aceitar-termos?next=${encodeURIComponent(self)}&v=${SIGNUP_TERMS_VERSION}`
          router.replace(gate)
          return
        }

        const waived = !!data.cpf_waived
        const missBirth = !waived && !data.data_nascimento && !data.idade
        const missCpf = !waived && !data.has_cpf
        setNeedBirthdate(missBirth)
        setNeedCpf(missCpf)
        if (missBirth || missCpf) {
          setPhase("identity")
          return
        }
        if (auto) leave(target)
        else setPhase("confirm")
      } catch {
        setError(t("loadFail", "Não foi possível falar com a Freelandoo. Tente de novo."))
        setPhase("error")
      }
    },
    [leave, router, t],
  )

  useEffect(() => {
    if (started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const safe = safeInternalPath(params.get("next"))
    const target =
      safe && (safe === partner.prefix || safe.startsWith(`${partner.prefix}/`)) ? safe : partner.landing
    const self = `${window.location.pathname}?next=${encodeURIComponent(target)}&auto=1`
    setNext(target)
    setSelfUrl(self)
    void check(target, self, params.get("auto") === "1")
  }, [check, partner.landing, partner.prefix])

  const age = ageOf(birthdate)
  const isMinor = needBirthdate && age !== null && age < 18
  const cpfOk = isValidCPF(cpf)
  const canSubmit =
    !submitting &&
    (!needBirthdate || (age !== null && age >= 0 && age <= 120)) &&
    (!needCpf || cpfOk) &&
    (!isMinor || responsibleCode.trim().length >= 6)

  const submitIdentity = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/me/onboarding/birthdate", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_only: true,
          data_nascimento: needBirthdate ? birthdate : undefined,
          cpf: needCpf ? onlyDigits(cpf) : undefined,
          responsible_code: isMinor ? responsibleCode.trim().toUpperCase() : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : tOn("saveFail", "Falha ao salvar"))
        setSubmitting(false)
        return
      }
      leave(next)
    } catch {
      setError(tOn("connError", "Erro de conexão. Tente novamente."))
      setSubmitting(false)
    }
  }

  const switchAccount = () => {
    clearSession()
    setMe(null)
    setPhase("login")
  }

  const who = me?.nome || me?.username || me?.email || ""

  return (
    <AuthShell
      eyebrow={t("eyebrow", "Entrar com a Freelandoo")}
      asideTitle={partner.name}
      asideHighlight={t("asideHighlight", "+ Freelandoo")}
      asideSubtitle={t(
        "asideSubtitle",
        "Uma conta só: você entra com o Google pela Freelandoo e volta direto para o site.",
      )}
      bullets={[
        t("bullet1", "Login com Google, sem senha nova"),
        t("bullet2", "CPF e data de nascimento uma vez só"),
        t("bullet3", "Seus livros e compras ligados à sua conta"),
      ]}
    >
      <AuthCard
        className="fl-sharp"
        title={
          phase === "identity"
            ? t("identityTitle", "Falta só o seu CPF")
            : t("title", "Continue para {site}").replace("{site}", partner.name)
        }
        subtitle={
          phase === "identity"
            ? t(
                "identitySubtitle",
                "A Freelandoo pede CPF e data de nascimento uma vez só, para proteger compras e acessos.",
              )
            : t("subtitle", "Entre com sua conta da Freelandoo. Se ainda não tem, ela é criada agora.")
        }
      >
        {error && (
          <div className="fl-sharp mb-4 border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
            {error}
          </div>
        )}

        {(phase === "checking" || phase === "leaving") && (
          <div className="flex items-center gap-2 py-6 text-sm font-semibold text-[#3a352d]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {phase === "leaving"
              ? t("leaving", "Voltando para {site}…").replace("{site}", partner.name)
              : t("checking", "Conferindo sua conta…")}
          </div>
        )}

        {phase === "login" && (
          <div className="space-y-4">
            <GoogleSignInButton
              text="continue_with"
              shape="rectangular"
              redirectTo={selfUrl}
              onComplete={() => void check(next, selfUrl, true)}
            />
            <p className="text-sm text-[#3a352d]">
              {t("emailOption", "Já tem conta na Freelandoo com e-mail e senha?")}{" "}
              <Link
                href={`/login?next=${encodeURIComponent(selfUrl)}`}
                className="font-bold text-[#0B0B0D] underline underline-offset-2"
              >
                {t("emailLogin", "Entrar com e-mail")}
              </Link>
            </p>
          </div>
        )}

        {phase === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-[#3a352d]">
              {t("signedAs", "Você está na Freelandoo como")} <b className="text-[#0B0B0D]">{who}</b>
            </p>
            <button
              type="button"
              onClick={() => leave(next)}
              className="fl-btn-gold fl-sharp inline-flex w-full items-center justify-center px-6 py-3 text-sm font-bold"
            >
              {t("continueAs", "Continuar para {site}").replace("{site}", partner.name)}
            </button>
            <button
              type="button"
              onClick={switchAccount}
              className="w-full text-sm font-semibold text-[#3a352d] underline underline-offset-2"
            >
              {t("switchAccount", "Usar outra conta")}
            </button>
          </div>
        )}

        {phase === "identity" && (
          <div className="space-y-4">
            {needBirthdate && (
              <div>
                <label htmlFor="cn-birth" className="fl-label">
                  {tOn("birthdateLabel", "Data de nascimento")}
                </label>
                <input
                  id="cn-birth"
                  type="date"
                  className="fl-input fl-sharp"
                  value={birthdate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </div>
            )}
            {needCpf && (
              <div>
                <label htmlFor="cn-cpf" className="fl-label">
                  {tOn("cpfLabel", "CPF")}
                </label>
                <input
                  id="cn-cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  className="fl-input fl-sharp"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                />
                {onlyDigits(cpf).length === 11 && !cpfOk && (
                  <p className="mt-1 text-xs font-semibold text-[#b91c1c]">
                    {tOn("cpfInvalid", "CPF inválido")}
                  </p>
                )}
              </div>
            )}
            {isMinor && (
              <div>
                <p className="mb-2 text-xs text-[#3a352d]">
                  {tOn(
                    "minorNotice",
                    "Menores de 18 anos precisam do código parental de um responsável adulto.",
                  )}
                </p>
                <label htmlFor="cn-code" className="fl-label">
                  {tOn("codeLabel", "Código do responsável")}
                </label>
                <input
                  id="cn-code"
                  className="fl-input fl-sharp uppercase"
                  value={responsibleCode}
                  onChange={(e) => setResponsibleCode(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))}
                />
              </div>
            )}
            <button
              type="button"
              onClick={submitIdentity}
              disabled={!canSubmit}
              className="fl-btn-gold fl-sharp inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? t("saving", "Salvando…") : t("saveAndContinue", "Salvar e continuar")}
            </button>
            <button
              type="button"
              onClick={switchAccount}
              className="w-full text-sm font-semibold text-[#3a352d] underline underline-offset-2"
            >
              {t("switchAccount", "Usar outra conta")}
            </button>
          </div>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={() => void check(next, selfUrl, false)}
            className="fl-btn-gold fl-sharp inline-flex w-full items-center justify-center px-6 py-3 text-sm font-bold"
          >
            {t("retry", "Tentar de novo")}
          </button>
        )}
      </AuthCard>
    </AuthShell>
  )
}
