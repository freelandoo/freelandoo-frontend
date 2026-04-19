"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function ActivateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">(() =>
    token ? "loading" : "error"
  )
  const [message, setMessage] = useState(() =>
    token ? "" : "Token de ativação não encontrado na URL"
  )

  useEffect(() => {
    if (!token) return

    const activateAccount = async () => {
      try {
        const response = await fetch(`/api/activate?token=${token}`, {
          method: "GET",
        })

        const data = await response.json()

        if (!response.ok) {
          setStatus("error")
          setMessage(data.message || "Erro ao ativar conta. Verifique se o link não expirou.")
          return
        }

        setStatus("success")
        setMessage(data.message || "Conta ativada com sucesso!")

        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } catch (error) {
        console.error("Erro ao ativar conta:", error)
        setStatus("error")
        setMessage("Erro ao conectar com o servidor. Tente novamente mais tarde.")
      }
    }

    activateAccount()
  }, [token, router])

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Card className="text-center">
          <CardHeader className="space-y-4 pb-8 pt-12">
            {status === "loading" && (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold">Ativando sua conta</CardTitle>
                <CardDescription className="text-base">
                  Por favor, aguarde enquanto verificamos seu e-mail
                </CardDescription>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <CardTitle className="text-3xl font-bold">Conta ativada com sucesso!</CardTitle>
                <CardDescription className="text-base">{message}</CardDescription>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <CardTitle className="text-3xl font-bold">Erro na ativação</CardTitle>
                <CardDescription className="text-base">{message}</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6 pb-12">
            {status === "success" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-green-500/10 p-4 text-left border border-green-500/20">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">Próximos passos</p>
                    <p className="text-sm text-muted-foreground">
                      Você será redirecionado para a página de login em alguns segundos. Faça login para acessar sua
                      conta!
                    </p>
                  </div>
                </div>

                <Link href="/login">
                  <Button className="w-full" size="lg">
                    Ir para o Login
                  </Button>
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg bg-red-500/10 p-4 text-left border border-red-500/20">
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <div className="space-y-1">
                    <p className="font-semibold">O que fazer?</p>
                    <p className="text-sm text-muted-foreground">
                      Verifique se o link está correto ou tente solicitar um novo e-mail de confirmação.
                    </p>
                  </div>
                </div>

                <Link href="/cadastro">
                  <Button variant="outline" className="w-full bg-transparent" size="lg">
                    Voltar para o Cadastro
                  </Button>
                </Link>
              </div>
            )}

            {status === "loading" && (
              <div className="text-sm text-muted-foreground">
                <p>Verificando seu token de ativação...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
