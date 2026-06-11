"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, ShoppingBag, Truck } from "lucide-react"
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageShell,
  TabloidBackLink,
  TabloidPageIntro,
  TABLOID_ACTION_CLASSES,
} from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface Order {
  id_order: number
  id_profile_product: number
  id_seller_profile: string
  product_name: string
  product_cover_url: string | null
  seller_display_name: string | null
  seller_username: string | null
  quantity: number
  unit_price_cents: number
  shipping_cents: number
  total_cents: number
  shipping_service_name: string | null
  shipping_carrier: string | null
  tracking_code: string | null
  status: "pending" | "paid" | "shipped" | "delivered" | "canceled" | "refunded"
  destination_zipcode: string
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}

const STATUS_LABEL: Record<Order["status"], { i18nKey: string; label: string; classes: string }> = {
  pending:   { i18nKey: "orderStatusPending",   label: "Aguardando pagamento", classes: "border-[#A16207] bg-[#FEF3C7] text-[#854D0E]" },
  paid:      { i18nKey: "orderStatusPaid",      label: "Pago",                 classes: "border-[#15803D] bg-[#DCFCE7] text-[#166534]" },
  shipped:   { i18nKey: "orderStatusShipped",   label: "Enviado",              classes: "border-[#0369A1] bg-[#E0F2FE] text-[#075985]" },
  delivered: { i18nKey: "orderStatusDelivered", label: "Entregue",             classes: "border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]" },
  canceled:  { i18nKey: "orderStatusCanceled",  label: "Cancelado",            classes: "border-[#52525B] bg-[#E4E4E7] text-[#3F3F46]" },
  refunded:  { i18nKey: "orderStatusRefunded",  label: "Reembolsado",          classes: "border-[#BE123C] bg-[#FFE4E6] text-[#9F1239]" },
}

function formatBRL(cents: number) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(s: string | null) {
  if (!s) return "-"
  try { return new Date(s).toLocaleDateString("pt-BR") } catch { return "-" }
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export default function ComprasPage() {
  const t = useTranslations("Account")
  const [orders, setOrders] = useState<Order[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error" | "unauth">("loading")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) { setState("unauth"); return }
      setState("loading")
      try {
        const res = await fetch("/api/me/orders", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(d?.error || "fail")
        setOrders((d.orders || []) as Order[])
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <PageShell className="tabloid-account-page md:pl-[80px]">
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 md:py-12">
        <TabloidPageIntro
          eyebrow={t("storeEyebrow", "Loja")}
          title={t("purchasesTitle", "COMPRAS.")}
          subtitle={t("purchasesSubtitle", "Pedidos da Loja de criadores Freelandoo, com status, frete e rastreio em um bloco de papel editorial.")}
          back={<TabloidBackLink href="/account">{t("back", "Voltar")}</TabloidBackLink>}
          className="mb-8"
        />

        {state === "loading" && (
          <div className="py-10">
            <LoadingState label={t("loadingPurchases", "Carregando suas compras...")} />
          </div>
        )}

        {state === "unauth" && (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title={t("loginToSeePurchases", "Entre para ver compras")}
            description={t("loginToSeePurchasesDesc", "Faça login para acompanhar seus pedidos da Loja.")}
            action={<Link href="/login" className={TABLOID_ACTION_CLASSES}>{t("login", "Entrar")}</Link>}
          />
        )}

        {state === "error" && (
          <ErrorState title={t("ordersUnavailable", "Pedidos indisponíveis")} description={t("ordersUnavailableDesc", "Não foi possível carregar suas compras agora.")} />
        )}

        {state === "loaded" && orders.length === 0 && (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={t("nothingPurchased", "Nada comprado ainda")}
            description={t("nothingPurchasedDesc", "Quando você comprar produtos da Loja, os pedidos aparecem aqui.")}
          />
        )}

        {state === "loaded" && orders.length > 0 && (
          <ul className="flex flex-col gap-4">
            {orders.map((o) => {
              const status = STATUS_LABEL[o.status] || STATUS_LABEL.pending
              return (
                <li
                  key={o.id_order}
                  className="fl-card fl-hard flex flex-col gap-4 rounded-[6px] p-4 md:flex-row md:items-center"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[4px] border-2 border-[#0B0B0D] bg-[#1D1810] md:h-24 md:w-24">
                    {o.product_cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.product_cover_url} alt={o.product_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-8 w-8 text-[#F2B705]" aria-hidden />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-black text-[var(--fl-ink)] md:text-base">{o.product_name}</h2>
                      <span className={`inline-flex rounded-[2px] border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${status.classes}`}>
                        {t(status.i18nKey, status.label)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#5b554b]">
                      {t("sellerLabel", "Vendedor")}: {o.seller_display_name || o.seller_username || "-"} · {t("orderLabel", "pedido")} #{o.id_order}
                    </p>
                    <p className="mt-1 text-xs text-[#5b554b]">
                      {o.shipping_carrier ? `${o.shipping_carrier} · ${o.shipping_service_name}` : "-"} · CEP {o.destination_zipcode}
                    </p>
                    {o.tracking_code && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#075985]">
                        <Truck className="h-3.5 w-3.5" aria-hidden />
                        {t("trackingLabel", "Rastreio")}: <span className="font-mono">{o.tracking_code}</span>
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-[#756d5f]">
                      {t("placedOn", "Realizado em")} {formatDate(o.created_at)}{o.paid_at ? ` · ${t("paidOn", "Pago em")} ${formatDate(o.paid_at)}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-left md:text-right">
                    <p className="text-base font-black tabular-nums text-[var(--fl-ink)] md:text-lg">{formatBRL(o.total_cents)}</p>
                    <p className="text-[11px] text-[#5b554b]">{formatBRL(o.unit_price_cents)} + {t("shippingWord", "frete")} {formatBRL(o.shipping_cents)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </PageShell>
  )
}
