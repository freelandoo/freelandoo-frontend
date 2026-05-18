"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, CheckCircle } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

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

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-3 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500 p-3">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">{t("successTitle", "Email enviado com sucesso!")}</CardTitle>
              <CardDescription className="text-base">
                {t("successDescription", "Enviamos um link de recuperação para")} <strong>{email}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
                <p className="mb-2">
                  <strong>{t("nextStepsTitle", "Próximos passos:")}</strong>
                </p>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>{t("step1", "Verifique sua caixa de entrada")}</li>
                  <li>{t("step2", "Clique no link de recuperação")}</li>
                  <li>{t("step3", "Crie uma nova senha")}</li>
                </ol>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {t("checkSpam", "Não recebeu o email? Verifique sua pasta de spam ou tente novamente em alguns minutos.")}
              </p>
            </CardContent>

            <CardFooter>
              <Link href="/login" className="w-full">
                <Button className="w-full bg-transparent" variant="outline">
                  {t("backToLogin", "Voltar para o login")}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary p-3">
                <Mail className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t("title", "Esqueceu sua senha?")}</CardTitle>
            <CardDescription>
              {t("description", "Não se preocupe! Digite seu email e enviaremos um link para redefinir sua senha.")}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("emailLabel", "Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? t("sending", "Enviando...") : t("submit", "Enviar link de recuperação")}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {t("rememberedPassword", "Lembrou sua senha?")}{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  {t("backToLogin", "Voltar para o login")}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
