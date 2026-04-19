"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, ArrowLeft, Calendar, DollarSign } from "lucide-react"

interface Pagamento {
  id: string
  provider: string
  provider_preference_id: string
  provider_payment_id: string | null
  type: string
  status: "pending" | "approved" | "failed" | "cancelled"
  amount_cents: number
  currency: string
  created_at: string
  updated_at: string
  approved_at: string | null
}

export default function PagamentosPage() {
  const router = useRouter()
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAutenticado, setIsAutenticado] = useState(false)

  useEffect(() => {
    // Verificar autenticação
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (!token || !user) {
      router.push("/login")
      return
    }

    setIsAutenticado(true)
    // Carregar histórico de pagamentos
    const fetchPagamentos = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch("/api/payments/history", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Erro ao carregar histórico de pagamentos")
        }

        const data = await response.json()
        console.log("[v0] Histórico de pagamentos carregado:", data)
        // O backend retorna {items: [], page, limit, total, totalPages}
        setPagamentos(data.items || [])
      } catch (error) {
        console.error("[v0] Erro ao buscar histórico:", error)
        setError("Erro ao carregar histórico de pagamentos. Tente novamente mais tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPagamentos()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-amber-100 text-amber-800"
      case "failed":
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprovado"
      case "pending":
        return "Pendente"
      case "failed":
        return "Falhou"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  const formatarValor = (amount_cents: number) => {
    return (amount_cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatarData = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isAutenticado) {
    return null
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-8 bg-background">
        <div className="space-y-6">
          {/* Header da página */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-8 w-8 text-primary" />
                Histórico de Pagamentos
              </h1>
              <p className="text-muted-foreground mt-2">
                Visualize todos os seus pagamentos e status das transações
              </p>
            </div>
          </div>

          {/* Lista de pagamentos */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : error ? (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : pagamentos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum pagamento ainda</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Você não possui nenhum histórico de pagamentos no momento
                </p>
                <Button onClick={() => router.push("/payment/taxa")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Efetuar Pagamento da Taxa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pagamentos.map((pagamento) => (
                <Card key={pagamento.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{pagamento.provider}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pagamento.status)}`}>
                            {getStatusLabel(pagamento.status)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatarData(pagamento.created_at)}
                          </div>
                          {pagamento.provider_preference_id && (
                            <div>ID: {pagamento.provider_preference_id}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                          <DollarSign className="h-5 w-5" />
                          {formatarValor(pagamento.amount_cents)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Resumo financeiro */}
          {pagamentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Resumo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total gasto:</span>
                  <span className="font-semibold text-foreground">
                    {formatarValor(pagamentos
                      .filter((p) => p.status === "approved")
                      .reduce((sum, p) => sum + p.amount_cents, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pagamentos pendentes:</span>
                  <span className="font-semibold text-amber-700">
                    {formatarValor(pagamentos
                      .filter((p) => p.status === "pending")
                      .reduce((sum, p) => sum + p.amount_cents, 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
  )
}
