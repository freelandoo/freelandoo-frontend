"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Star, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

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
      console.log("[v0] Enviando nova senha com token:", token)

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
      console.log("[v0] Resposta do reset:", data)

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
      console.error("[v0] Erro ao redefinir senha:", error)
      setStatus("error")
      setMessage("Erro ao conectar com o servidor. Tente novamente mais tarde.")
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md">
          <Card className="text-center">
            <CardHeader className="space-y-4 pb-8 pt-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-3xl font-bold">Token não encontrado</CardTitle>
              <CardDescription className="text-base">
                Por favor, use o link enviado no seu e-mail para redefinir sua senha.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12">
              <Link href="/forgot-password">
                <Button className="w-full" size="lg">
                  Solicitar novo link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (status === "success") {
    return (
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md">
          <Card className="text-center">
            <CardHeader className="space-y-4 pb-8 pt-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <CardTitle className="text-3xl font-bold">Senha redefinida!</CardTitle>
              <CardDescription className="text-base">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-12">
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-green-500/10 p-4 text-left border border-green-500/20">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">Próximos passos</p>
                    <p className="text-sm text-muted-foreground">
                      Você será redirecionado para a página de login em alguns segundos. Use sua nova senha para acessar
                      sua conta!
                    </p>
                  </div>
                </div>

                <Link href="/login">
                  <Button className="w-full" size="lg">
                    Ir para o Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary p-3">
                <Star className="h-8 w-8 fill-black text-black" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Criar nova senha</CardTitle>
            <CardDescription>Digite sua nova senha abaixo</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {status === "error" && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200 dark:bg-red-950/50 dark:border-red-900">
                  {message}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">A senha deve ter pelo menos 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Redefinindo..." : "Redefinir senha"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Lembrou sua senha?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Faça login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
