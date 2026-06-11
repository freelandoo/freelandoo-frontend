"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageShell, LoadingState, ErrorState, TabloidPageIntro } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

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

const STATUS_MAP: Record<string, { label: string; labelKey: string; icon: React.ReactNode; color: string }> = {
  PENDING_PAYMENT: {
    label: "Aguardando pagamento",
    labelKey: "statusPendingPayment",
    icon: <Clock className="h-5 w-5" />,
    color: "text-amber-600",
  },
  PAID: {
    label: "Pago",
    labelKey: "statusPaid",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-500",
  },
  COMPLETED: {
    label: "Concluído",
    labelKey: "statusCompleted",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-500",
  },
  CANCELLED: {
    label: "Cancelado",
    labelKey: "statusCancelled",
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-destructive",
  },
}

export default function OrderPage() {
  const t = useTranslations("Order")
  const locale = useLocale()
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
          setError(data.error || t("loadError", "Erro ao carregar pedido"))
        }
      } catch {
        setError(t("loadErrorRetry", "Erro ao carregar pedido. Tente novamente."))
      } finally {
        setLoading(false)
      }
    }

    if (idOrder) fetchOrder()
  }, [idOrder, router, t])

  if (loading) {
    return (
      <PageShell className="tabloid-account-page">
        <div className="relative z-10 px-4 py-16">
          <LoadingState label={t("loadingOrder", "Carregando pedido...")} />
        </div>
      </PageShell>
    )
  }

  if (!orderData) {
    return (
      <PageShell className="tabloid-account-page">
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16">
          <ErrorState
            title={t("notFound", "Pedido não encontrado")}
            description={error || t("notFoundDesc", "Não foi possível carregar este pedido.")}
            onRetry={() => router.push("/")}
            retryLabel={t("backToHome", "Voltar ao início")}
          />
        </div>
      </PageShell>
    )
  }

  const { order } = orderData
  const item = order.items[0]
  const subtotal = order.subtotal_cents
  const discount = item.discount_cents
  const total = order.total_cents

  return (
    <PageShell className="tabloid-account-page">
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-10 md:py-12">
        <TabloidPageIntro
          size="compact"
          eyebrow={t("eyebrow", "Compra")}
          title="PEDIDO."
          subtitle={t("reference", "Referência #{ref}").replace("{ref}", order.id_order.slice(0, 8).toUpperCase())}
          back={
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToHome", "Voltar ao início")}
            </button>
          }
          className="mb-8"
        />

        <div className="space-y-4">
          {/* Status do pedido */}
          <Card>
            <CardContent className="pt-6">
              <div className={`flex items-center gap-3 ${STATUS_MAP[order.status]?.color || "text-muted-foreground"}`}>
                {STATUS_MAP[order.status]?.icon || <Clock className="h-5 w-5" />}
                <div>
                  <p className="font-semibold">{STATUS_MAP[order.status] ? t(STATUS_MAP[order.status].labelKey, STATUS_MAP[order.status].label) : order.status}</p>
                  <p className="text-xs text-muted-foreground">{t("orderNumber", "Pedido #{ref}").replace("{ref}", order.id_order.slice(0, 8).toUpperCase())}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes do pedido */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("orderDetails", "Detalhes do pedido")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("item", "Item")}</span>
                <span className="font-medium capitalize">{item.current_item_name.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("quantity", "Quantidade")}</span>
                <span>{item.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal", "Subtotal")}</span>
                <span>{(subtotal / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("discount", "Desconto")} {order.coupon ? `(${order.coupon.code})` : ""}</span>
                  <span>-{(discount / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-3">
                <span>{t("total", "Total")}</span>
                <span className="text-lg font-semibold text-primary">{(total / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Data do pedido */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("orderDate", "Data do pedido")}</span>
                <span>{new Date(order.created_at).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">{t("paidOn", "Pago em")}</span>
                  <span>{new Date(order.paid_at).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {order.status === "PENDING_PAYMENT" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("paymentTitle", "Pagamento")}</CardTitle>
                <CardDescription>{t("awaitingConfirmation", "Aguardando confirmação")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t("pendingPaymentNote", "Este pedido está aguardando processamento de pagamento. Entre em contato com o suporte caso tenha dúvidas.")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </PageShell>
  )
}
