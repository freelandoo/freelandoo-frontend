"use client"

// Primeiro acesso da conta criada pela academia (API de parceiro, mig 296 do
// backend). O aluno chega aqui pelo link que a academia mandou no WhatsApp,
// cria a senha (mesma regra do cadastro) e já entra — o e-mail conta como
// verificado porque a academia conferiu a identidade. Depois disso, o modal de
// termos da academia (AcademyConsentGate) aparece na primeira tela logada.
//
// Chamadas DIRETO no backend (getPublicBackendUrl): são duas, uma vez na vida
// de cada aluno — não vale uma rota de proxy nova.

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Check, Eye, EyeOff, KeyRound, Loader2, XCircle } from "lucide-react"
import { AuthShell, AuthCard } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { extractAuthSession, setSession } from "@/lib/auth"

type Info = { valido: boolean; nome?: string | null; academia?: { nome: string; slug: string; logo: string | null } | null }

/** Mesmas regras de `validatePasswordStrength` no backend. */
function passwordChecks(p: string) {
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    number: /[0-9]/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  }
}

export function FirstAccessContent() {
  const t = useTranslations("AcademyAccess")
  const router = useRouter()
  const token = useSearchParams().get("token") || ""

  const [info, setInfo] = useState<Info | null>(null)
  const [senha, setSenha] = useState("")
  const [confirma, setConfirma] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) {
      setInfo({ valido: false })
      return
    }
    let alive = true
    fetch(`${getPublicBackendUrl()}/auth/primeiro-acesso/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : { valido: false }))
      .then((d: Info) => alive && setInfo(d))
      .catch(() => alive && setInfo({ valido: false }))
    return () => {
      alive = false
    }
  }, [token])

  const checks = useMemo(() => passwordChecks(senha), [senha])
  const strong = checks.length && checks.upper && checks.number && checks.special

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError("")
    if (!strong) {
      setError(t("weakPassword", "A senha ainda não cumpre todas as regras abaixo."))
      return
    }
    if (senha !== confirma) {
      setError(t("mismatch", "As senhas não coincidem."))
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${getPublicBackendUrl()}/auth/primeiro-acesso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : t("genericError", "Não foi possível criar a senha. Tente de novo."))
        return
      }
      const session = extractAuthSession(data as Record<string, unknown>)
      if (!session) {
        setError(t("genericError", "Não foi possível criar a senha. Tente de novo."))
        return
      }
      setSession(session.token, session.user)
      // Entra direto no app de treinos; o modal de termos da academia abre lá.
      router.replace("/fitness")
    } catch {
      setError(t("network", "Erro ao conectar com o servidor. Tente de novo."))
    } finally {
      setSaving(false)
    }
  }

  const academyName = info?.academia?.nome || t("academyFallback", "sua academia")

  if (!info) {
    return (
      <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#F2B705]" aria-hidden />
      </div>
    )
  }

  if (!info.valido) {
    return (
      <AuthShell eyebrow={t("eyebrow", "Primeiro acesso")}>
        <AuthCard
          icon={<XCircle className="h-7 w-7" />}
          iconTone="red"
          title={t("invalidTitle", "Link inválido ou expirado")}
          subtitle={t(
            "invalidBody",
            "Este link de primeiro acesso não vale mais (ele dura 7 dias e só pode ser usado uma vez). Peça um novo na recepção da academia."
          )}
        >
          <p className="text-center text-sm text-[#5b554b]">
            {t("alreadyHasPassword", "Já criou sua senha?")}{" "}
            <Link href="/login" className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline">
              {t("goLogin", "Entrar")}
            </Link>
          </p>
        </AuthCard>
      </AuthShell>
    )
  }

  const rule = (ok: boolean, label: string) => (
    <li className={`flex items-center gap-1.5 ${ok ? "text-[#15803d]" : "text-[#5b554b]"}`}>
      <span
        aria-hidden
        className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 border-[#0B0B0D] ${ok ? "bg-[#16a34a] text-white" : "bg-transparent"}`}
      >
        {ok && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label}
    </li>
  )

  return (
    <AuthShell
      eyebrow={academyName}
      asideTitle={t("heroTitle", "Seu acesso ao app de")}
      asideHighlight={t("heroHighlight", "treinos")}
      asideSubtitle={t(
        "heroSubtitle",
        "Crie uma senha para entrar na Freelandoo. Depois é só entrar com seu e-mail e esta senha."
      )}
    >
      <AuthCard
        icon={
          info.academia?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo do R2 (host fora do remotePatterns)
            <img src={info.academia.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <KeyRound className="h-7 w-7" />
          )
        }
        title={info.nome ? t("hello", "Olá, {name}!").replace("{name}", info.nome) : t("helloNoName", "Olá!")}
        subtitle={t("cardSubtitle", "A {academy} criou sua conta. Falta só a senha.").replace("{academy}", academyName)}
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fa-senha" className="fl-label">
              {t("passwordLabel", "Crie sua senha")}
            </label>
            <div className="relative">
              <input
                id="fa-senha"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className="fl-input pr-11"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                aria-describedby="fa-regras"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? t("hidePassword", "Ocultar senha") : t("showPassword", "Mostrar senha")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5b554b] transition hover:text-[#0B0B0D]"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <ul id="fa-regras" className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {rule(checks.length, t("ruleLength", "8 caracteres ou mais"))}
              {rule(checks.upper, t("ruleUpper", "1 letra maiúscula"))}
              {rule(checks.number, t("ruleNumber", "1 número"))}
              {rule(checks.special, t("ruleSpecial", "1 caractere especial"))}
            </ul>
          </div>

          <div>
            <label htmlFor="fa-confirma" className="fl-label">
              {t("confirmLabel", "Confirme a senha")}
            </label>
            <input
              id="fa-confirma"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className="fl-input"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? t("submitting", "Criando…") : t("submit", "Criar senha e entrar")}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
