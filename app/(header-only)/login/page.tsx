"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { AuthShell, AuthCard } from "@/components/tabloide"
import { extractAuthSession, setSession } from "@/lib/auth"
import { clientFetchWithTimeout, isClientFetchTimeout } from "@/lib/fetch-with-timeout"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  // Destino pós-login: ?next=<rota interna> (ex.: vindo da Casa Views). Só
  // aceita caminhos internos para evitar open-redirect.
  const [nextParam, setNextParam] = useState<string | null>(null)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("next")
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) setNextParam(raw)
  }, [])
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const tErr = useTranslations("Errors")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setError("")
    setIsLoading(true)

    let didRedirect = false
    try {
      const response = await clientFetchWithTimeout(
        "/api/signin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha: password }),
        },
        9000
      )

      const data = await response.json().catch(() => ({} as Record<string, unknown>))

      if (!response.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : tErr("loginFailed", "Erro ao fazer login")
        setError(msg)
        return
      }

      const session = extractAuthSession(data as Record<string, unknown>)
      if (!session) {
        setError(tErr("loginFailed", "Erro ao fazer login"))
        return
      }

      setSession(session.token, session.user)
      const target =
        session.emailVerified === false ? "/verify-email" : nextParam ?? "/search"
      didRedirect = true
      // SPA primeiro (rápido, mantém socket), fallback duro depois.
      try {
        router.replace(target)
        router.refresh()
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        if (window.location.pathname !== target) {
          window.location.replace(target)
        }
      }, 400)
    } catch (err) {
      if (isClientFetchTimeout(err)) {
        setError(tErr("timeout", "Servidor demorou para responder. Tente novamente."))
      } else {
        setError(tErr("network", "Erro ao conectar com o servidor"))
      }
    } finally {
      // Loading só fica preso se já estamos saindo da página.
      if (!didRedirect) setIsLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow={t("welcomeBack", "Bem-vindo de volta")}
      asideTitle={t("asideLoginTitle", "Sua próxima")}
      asideHighlight={t("asideLoginHighlight", "renda")}
      asideSubtitle={t("asideLoginSubtitle", "Entre e continue de onde parou: vendas, cursos, clientes e comissões em um lugar só.")}
      bullets={[
        t("asideBullet1", "Vitrine pública e contato direto"),
        t("asideBullet2", "Venda produtos, cursos e serviços"),
        t("asideBullet3", "Comissões e saques transparentes"),
      ]}
    >
      <AuthCard
        title={t("login", "Entrar")}
        subtitle={t("alreadyHaveAccount", "Faça login para acessar sua conta na Freelandoo")}
        footer={
          <>
            {t("noAccount", "Não tem uma conta?")}{" "}
            <Link
              href={nextParam ? `/cadastro?next=${encodeURIComponent(nextParam)}` : "/cadastro"}
              className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline"
            >
              {t("register", "Cadastre-se")}
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <GoogleSignInButton text="signin_with" redirectTo={nextParam ?? undefined} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#0B0B0D]/12" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--fl-paper)] px-2 font-semibold text-[#5b554b]">{tCommon("or", "ou")}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="fl-label">{t("email", "Email")}</label>
            <input
              id="email"
              type="email"
              className="fl-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="fl-label mb-0">{t("password", "Senha")}</label>
              <Link href="/forgot-password" className="text-sm font-semibold text-[#0B0B0D] underline-offset-2 hover:underline">
                {t("forgotPassword", "Esqueceu a senha?")}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="fl-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {isLoading ? t("loggingIn", "Entrando...") : t("login", "Entrar")}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
