"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface OrderData {
  order: {
    id_order: string
    id_user: string
    status: string
    subtotal_cents: number
    total_cents: number
    currency: string
    created_at: string
    updated_at: string
    approved_at: string | null
    paid_at: string | null
    payment_url: string | null
    items: Array<{
      id_order_item: string
      id_item: string
      item_name_snapshot: string
      unit_price_cents_snapshot: number
      quantity: number
      total_cents: number
      discount_cents: number
      current_item_name: string
      current_price_cents: number
    }>
    coupon: {
      id_order_coupon: string
      id_coupon: string
      code_snapshot: string
      code: string
      discount_cents: number
      discount_type: string
      value: number
    } | null
  }
}

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING_PAYMENT: {
    label: "Aguardando pagamento",
    icon: <Clock className="h-5 w-5" />,
    color: "text-amber-600",
  },
  PAID: {
    label: "Pago",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-500",
  },
  COMPLETED: {
    label: "Concluído",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-500",
  },
  CANCELLED: {
    label: "Cancelado",
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-destructive",
  },
}

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const idOrder = params.id_order as string

  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/")
        return
      }

      try {
        const res = await fetch(`/api/orders/${idOrder}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) {
          setOrderData(data)
        } else {
          setError(data.error || "Erro ao carregar pedido")
        }
      } catch {
        setError("Erro ao carregar pedido. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    if (idOrder) fetchOrder()
  }, [idOrder, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando pedido...</p>
        </div>
      </main>
    )
  }

  if (!orderData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-2xl py-12">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error || "Pedido não encontrado"}</p>
              <Button onClick={() => router.push("/")} className="mt-4">Voltar ao início</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const { order } = orderData
  const item = order.items[0]
  const subtotal = order.subtotal_cents
  const discount = item.discount_cents
  const total = order.total_cents

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl py-12">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </button>

        <div className="space-y-4">
          {/* Status do pedido */}
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center gap-3 ${STATUS_MAP[order.status]?.color || "text-muted-foreground"}`}>
                {STATUS_MAP[order.status]?.icon || <Clock className="h-5 w-5" />}
                <div>
                  <p className="font-semibold">{STATUS_MAP[order.status]?.label || order.status}</p>
                  <p className="text-xs text-muted-foreground">Pedido #{order.id_order.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes do pedido */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes do pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item</span>
                <span className="font-medium capitalize">{item.current_item_name.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantidade</span>
                <span>{item.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{(subtotal / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto {order.coupon ? `(${order.coupon.code})` : ""}</span>
                  <span>-{(discount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-3">
                <span>Total</span>
                <span className="text-lg font-semibold text-primary">{(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Data do pedido */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data do pedido</span>
                <span>{new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Pago em</span>
                  <span>{new Date(order.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {order.status === "PENDING_PAYMENT" && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamento</CardTitle>
                <CardDescription>Aguardando confirmação</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Este pedido está aguardando processamento de pagamento. Entre em contato com o
                  suporte caso tenha dúvidas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
