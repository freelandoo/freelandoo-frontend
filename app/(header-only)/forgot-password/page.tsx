"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Mail, CheckCircle } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { AuthShell, AuthCard } from "@/components/tabloide"

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPassword")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 500) {
          setError(t("err500", "Erro temporário no servidor. Por favor, tente novamente em alguns instantes ou entre em contato com o suporte se o problema persistir."))
        } else if (response.status === 404) {
          setError(t("err404", "Email não encontrado. Verifique se o email está correto ou crie uma nova conta."))
        } else {
          setError(data.message || data.error || t("errGeneric", "Erro ao enviar email de recuperação"))
        }
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setIsLoading(false)
    } catch (error) {
      console.error(error)
      setError(t("errNetwork", "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente."))
      setIsLoading(false)
    }
  }

  const aside = {
    eyebrow: t("asideEyebrow", "Recuperação de conta"),
    asideTitle: t("asideTitle", "Acontece com"),
    asideHighlight: t("asideHighlight", "todo mundo"),
    asideSubtitle: t("asideSubtitle", "Em poucos segundos você recebe um link seguro para criar uma senha nova e voltar pra colmeia."),
  }

  if (success) {
    return (
      <AuthShell {...aside}>
        <AuthCard
          icon={<CheckCircle className="h-7 w-7" />}
          iconTone="green"
          title={t("successTitle", "Email enviado com sucesso!")}
          subtitle={
            <>
              {t("successDescription", "Enviamos um link de recuperação para")} <strong className="text-[#0B0B0D]">{email}</strong>
            </>
          }
          footer={
            <Link href="/login" className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline">
              {t("backToLogin", "Voltar para o login")}
            </Link>
          }
        >
          <div className="rounded-xl border-2 border-[#0B0B0D]/12 bg-white/60 p-4 text-sm text-[#3a352d]">
            <p className="mb-2 font-bold text-[#0B0B0D]">{t("nextStepsTitle", "Próximos passos:")}</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>{t("step1", "Verifique sua caixa de entrada")}</li>
              <li>{t("step2", "Clique no link de recuperação")}</li>
              <li>{t("step3", "Crie uma nova senha")}</li>
            </ol>
          </div>
          <p className="mt-4 text-center text-sm text-[#5b554b]">
            {t("checkSpam", "Não recebeu o email? Verifique sua pasta de spam ou tente novamente em alguns minutos.")}
          </p>
        </AuthCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell {...aside}>
      <AuthCard
        icon={<Mail className="h-7 w-7" />}
        title={t("title", "Esqueceu sua senha?")}
        subtitle={t("description", "Não se preocupe! Digite seu email e enviaremos um link para redefinir sua senha.")}
        footer={
          <>
            {t("rememberedPassword", "Lembrou sua senha?")}{" "}
            <Link href="/login" className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline">
              {t("backToLogin", "Voltar para o login")}
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="fl-label">{t("emailLabel", "Email")}</label>
            <input
              id="email"
              type="email"
              className="fl-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {isLoading ? t("sending", "Enviando...") : t("submit", "Enviar link de recuperação")}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
