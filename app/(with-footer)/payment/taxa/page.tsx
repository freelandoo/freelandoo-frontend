"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CheckCircle2, Shield, Zap } from "lucide-react"

export default function TaxaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")

  async function handleCheckout() {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Você precisa estar logado para pagar a anuidade")
        return
      }

      const response = await fetch("/api/stripe/subscription/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coupon_code: couponCode.trim() || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Erro ao iniciar pagamento")
      }

      if (!data?.url) {
        throw new Error("Resposta do servidor sem URL de checkout")
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
      setIsLoading(false)
    }
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Anuidade Freelandoo</CardTitle>
              <CardDescription>Mantenha seu perfil ativo nos classificados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">Cobrança anual</p>
                <p className="text-4xl font-bold">R$ 300,00</p>
                <p className="text-xs text-muted-foreground mt-2">Renovação automática a cada ano</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Apareça nos Classificados</p>
                    <p className="text-sm text-muted-foreground">
                      Seu perfil fica visível para empresas e marcas pelo período da anuidade
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Ativação Imediata</p>
                    <p className="text-sm text-muted-foreground">
                      Assim que o pagamento é confirmado, seu perfil é ativado automaticamente
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Pagamento Seguro</p>
                    <p className="text-sm text-muted-foreground">
                      Processado pelo Stripe com criptografia ponta a ponta
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Finalizar Pagamento</CardTitle>
              <CardDescription>Você será redirecionado ao Stripe para concluir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="coupon">
                  Cupom de desconto (opcional)
                </label>
                <Input
                  id="coupon"
                  placeholder="Insira seu código"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full" onClick={handleCheckout} disabled={isLoading}>
                {isLoading ? "Redirecionando..." : "Pagar com Stripe"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Ao continuar, você concorda com nossos termos de serviço
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
