"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, KeyRound, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { AuthShell, AuthCard } from "@/components/tabloide"

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setStatus("error")
      setMessage("Token não encontrado. Por favor, use o link enviado no seu e-mail.")
      return
    }

    if (password.length < 6) {
      setStatus("error")
      setMessage("A senha deve ter pelo menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setStatus("error")
      setMessage("As senhas não coincidem")
      return
    }

    setIsLoading(true)
    setStatus("idle")

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus("error")
        setMessage(data.message || "Erro ao redefinir senha. Verifique se o link não expirou.")
        setIsLoading(false)
        return
      }

      setStatus("success")
      setMessage(data.message || "Senha redefinida com sucesso!")

      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      console.error("Erro ao redefinir senha:", error)
      setStatus("error")
      setMessage("Erro ao conectar com o servidor. Tente novamente mais tarde.")
      setIsLoading(false)
    }
  }

  const aside = {
    eyebrow: "Segurança da conta",
    asideTitle: "Crie uma senha",
    asideHighlight: "forte",
    asideSubtitle: "Escolha uma senha que só você conhece. Em segundos sua conta volta a ficar protegida.",
  }

  if (!token) {
    return (
      <AuthShell {...aside}>
        <AuthCard
          icon={<XCircle className="h-7 w-7" />}
          iconTone="red"
          title="Token não encontrado"
          subtitle="Por favor, use o link enviado no seu e-mail para redefinir sua senha."
        >
          <Link
            href="/forgot-password"
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
          >
            Solicitar novo link
          </Link>
        </AuthCard>
      </AuthShell>
    )
  }

  if (status === "success") {
    return (
      <AuthShell {...aside}>
        <AuthCard
          icon={<CheckCircle2 className="h-7 w-7" />}
          iconTone="green"
          title="Senha redefinida!"
          subtitle={message}
        >
          <div className="rounded-xl border-2 border-[#16a34a]/30 bg-[#16a34a]/8 p-4 text-sm text-[#3a352d]">
            <p className="font-bold text-[#0B0B0D]">Próximos passos</p>
            <p className="mt-1">
              Você será redirecionado para a página de login em alguns segundos. Use sua nova senha para acessar sua conta!
            </p>
          </div>
          <Link
            href="/login"
            className="fl-btn-gold mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
          >
            Ir para o Login
          </Link>
        </AuthCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell {...aside}>
      <AuthCard
        icon={<KeyRound className="h-7 w-7" />}
        title="Criar nova senha"
        subtitle="Digite sua nova senha abaixo"
        footer={
          <>
            Lembrou sua senha?{" "}
            <Link href="/login" className="font-bold text-[#0B0B0D] underline-offset-2 hover:underline">
              Faça login
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === "error" && (
            <div className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/8 p-3 text-sm font-medium text-[#b91c1c]">
              {message}
            </div>
          )}

          <div>
            <label htmlFor="password" className="fl-label">Nova senha</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="fl-input pr-11"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5b554b] transition hover:text-[#0B0B0D]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#5b554b]">A senha deve ter pelo menos 6 caracteres</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="fl-label">Confirmar nova senha</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="fl-input pr-11"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5b554b] transition hover:text-[#0B0B0D]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="fl-btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {isLoading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  )
}
