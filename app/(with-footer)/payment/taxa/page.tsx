"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, Shield, Zap } from "lucide-react"
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react"

export default function TaxaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Inicializar Mercado Pago
    initMercadoPago("APP_USR-495b19e5-4bd3-406c-a2e3-f34651303948", {
      locale: "pt-BR",
    })

    // Buscar preferenceId do backend
    const fetchPreference = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const token = localStorage.getItem("token")
        
        if (!token) {
          setError("Você precisa estar logado para pagar a taxa")
          setIsLoading(false)
          return
        }

        console.log("[v0] Buscando preferência de pagamento")

        const response = await fetch("/api/payment/create-preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Erro ao criar preferência de pagamento")
        }

        const data = await response.json()
        console.log("[v0] Preferência criada:", data.preferenceId)
        setPreferenceId(data.preferenceId)
      } catch (error) {
        console.error("[v0] Erro ao buscar preferência:", error)
        setError("Erro ao carregar opções de pagamento. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreference()
  }, [])

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações sobre a taxa */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Ativação</CardTitle>
                <CardDescription>
                  Ative seu perfil e apareça nos classificados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-2">Valor único</p>
                  <p className="text-4xl font-bold">R$ 10,00</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Apareça nos Classificados</p>
                      <p className="text-sm text-muted-foreground">
                        Seu perfil ficará visível para empresas e marcas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Ativação Imediata</p>
                      <p className="text-sm text-muted-foreground">
                        Seu perfil é ativado automaticamente após a confirmação
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Pagamento Seguro</p>
                      <p className="text-sm text-muted-foreground">
                        Processado pelo Mercado Pago com total segurança
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Área de pagamento */}
            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
                <CardDescription>
                  Escolha como deseja pagar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Você será redirecionado para o Mercado Pago para concluir o pagamento de forma segura.
                  </p>

                  {/* Área de pagamento do Mercado Pago */}
                  <div className="min-h-[100px] flex items-center justify-center">
                    {isLoading && (
                      <p className="text-sm text-muted-foreground">Carregando opções de pagamento...</p>
                    )}
                    
                    {error && (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.reload()}
                        >
                          Tentar Novamente
                        </Button>
                      </div>
                    )}
                    
                    {!isLoading && !error && preferenceId && (
                      <div className="w-full">
                        <Wallet initialization={{ preferenceId: preferenceId }} />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao clicar em pagar, você concorda com nossos termos de serviço
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dúvidas frequentes */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Dúvidas Frequentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium mb-1">O que acontece após o pagamento?</p>
                <p className="text-sm text-muted-foreground">
                  Seu perfil é ativado automaticamente e fica visível nos classificados para empresas e marcas.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">A taxa é recorrente?</p>
                <p className="text-sm text-muted-foreground">
                  Não, é um pagamento único. Após pagar, seu perfil permanece ativo indefinidamente.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Quais formas de pagamento são aceitas?</p>
                <p className="text-sm text-muted-foreground">
                  Aceitamos cartão de crédito, débito, PIX e boleto através do Mercado Pago.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
  )
}
