"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, DollarSign, CheckCircle2, Clock, XCircle, AlertTriangle, Loader2 } from "lucide-react"

interface Subscription {
  id_subscription: string
  id_user: string
  id_profile: string | null
  profile_name: string | null
  status: "pending" | "active" | "past_due" | "canceled" | "incomplete"
  amount_cents: number
  currency: string
  stripe_customer_id: string | null
  stripe_checkout_session_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  stripe_promotion_code: string | null
  id_coupon: string | null
  current_period_start: string | null
  current_period_end: string | null
  paid_at: string | null
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export default function PagamentosPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAutenticado, setIsAutenticado] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (!token || !user) {
      router.push("/login")
      return
    }

    setIsAutenticado(true)

    const fetchSubscriptions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/stripe/subscription/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login")
            return
          }
          const errBody = await response.text().catch(() => "")
          console.error("[pagamentos] API error:", response.status, errBody)
          throw new Error(`Erro ${response.status}: ${errBody}`)
        }

        const data = await response.json()
        setSubscriptions(data.subscriptions || [])
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[pagamentos] Erro ao buscar assinaturas:", msg)
        setError(msg || "Erro ao carregar dados de assinatura. Tente novamente mais tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptions()
  }, [router])

  const activeSubscription = subscriptions.find(
    (s) => s.status === "active" || s.status === "past_due"
  ) || subscriptions.find((s) => s.status === "pending") || null

  const paidEntries = subscriptions.filter((s) => s.status === "active")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "past_due":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "canceled":
      case "incomplete":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "past_due":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "canceled":
      case "incomplete":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativa"
      case "pending":
        return "Pendente"
      case "past_due":
        return "Pagamento atrasado"
      case "canceled":
        return "Cancelada"
      case "incomplete":
        return "Incompleta"
      default:
        return status
    }
  }

  const formatarValor = (amount_cents: number, currency: string = "BRL") => {
    return (amount_cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
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

  const formatarDataCurta = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const handleCancel = async (id_subscription: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setCancellingId(id_subscription)
    try {
      const res = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_subscription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao cancelar")
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id_subscription === id_subscription
            ? { ...s, canceled_at: data.cancel_at }
            : s
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar assinatura")
    } finally {
      setCancellingId(null)
      setConfirmId(null)
    }
  }

  if (!isAutenticado) {
    return null
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-8 bg-background">
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Minha Assinatura
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie sua anuidade e veja o status da sua assinatura
          </p>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : subscriptions.length === 0 ? (
          /* Sem assinatura */
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-semibold text-xl mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Para aparecer nas buscas e receber propostas de trabalho, você precisa ativar sua anuidade.
              </p>
              <Button
                onClick={() => router.push("/payment/taxa")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-base"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Ativar Anuidade
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Card de status da assinatura mais recente */}
            {activeSubscription && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Anuidade Freelandoo</CardTitle>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(activeSubscription.status)}`}>
                        {getStatusIcon(activeSubscription.status)}
                        {getStatusLabel(activeSubscription.status)}
                      </span>
                    </div>
                    <CardDescription>
                      Taxa anual para visibilidade na plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Valor</span>
                      </div>
                      <span className="text-xl font-bold text-foreground">
                        {formatarValor(activeSubscription.amount_cents, activeSubscription.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Data de adesão</span>
                      </div>
                      <span className="text-foreground font-medium">
                        {formatarData(activeSubscription.created_at)}
                      </span>
                    </div>

                    {activeSubscription.current_period_start && activeSubscription.current_period_end && (
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Período vigente</span>
                        </div>
                        <span className="text-foreground font-medium">
                          {formatarDataCurta(activeSubscription.current_period_start)} — {formatarDataCurta(activeSubscription.current_period_end)}
                        </span>
                      </div>
                    )}

                    {activeSubscription.id_coupon && (
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-lg">🏷️</span>
                          <span>Cupom aplicado</span>
                        </div>
                        <span className="text-green-600 font-medium">Sim</span>
                      </div>
                    )}

                    {activeSubscription.status === "active" && activeSubscription.canceled_at && (
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center gap-2 text-amber-600">
                          <Clock className="h-4 w-4" />
                          <span>Cancelamento agendado — ativo até</span>
                        </div>
                        <span className="text-amber-700 font-medium">
                          {formatarDataCurta(activeSubscription.canceled_at)}
                        </span>
                      </div>
                    )}

                    {activeSubscription.status === "active" && !activeSubscription.canceled_at && (
                      <div className="pt-2">
                        {confirmId === activeSubscription.id_subscription ? (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                            <p className="text-sm font-medium text-foreground mb-1">Confirmar cancelamento?</p>
                            <p className="text-xs text-muted-foreground mb-3">
                              Seu perfil permanece ativo até o fim do período pago. Não há reembolso.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={cancellingId === activeSubscription.id_subscription}
                                onClick={() => handleCancel(activeSubscription.id_subscription)}
                              >
                                {cancellingId === activeSubscription.id_subscription
                                  ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Cancelando...</>
                                  : "Sim, cancelar"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                                Voltar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full"
                            onClick={() => setConfirmId(activeSubscription.id_subscription)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar renovação automática
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {activeSubscription.status === "pending" && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-900">Pagamento pendente</p>
                          <p className="text-amber-700 text-sm mt-1">
                            Seu pagamento está sendo processado. Caso não tenha concluído, clique abaixo para finalizar.
                          </p>
                          <Button
                            onClick={() => router.push("/payment/taxa")}
                            variant="outline"
                            className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                          >
                            Finalizar Pagamento
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeSubscription.status === "active" && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-900">Assinatura ativa</p>
                          <p className="text-green-700 text-sm mt-1">
                            Seu perfil está visível nas buscas e você pode receber propostas de trabalho normalmente.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Tabela de histórico de pagamentos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
                <CardDescription>Todas as entradas de pagamento da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {paidEntries.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                    Nenhum pagamento confirmado ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nome do perfil</th>
                          <th className="px-6 py-3 text-left font-medium text-muted-foreground">Data e hora</th>
                          <th className="px-6 py-3 text-right font-medium text-muted-foreground">Valor pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidEntries.map((s) => (
                          <tr key={s.id_subscription} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">
                              {s.profile_name || "—"}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {formatarData(s.paid_at || s.created_at)}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-foreground">
                              {formatarValor(s.amount_cents, s.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
