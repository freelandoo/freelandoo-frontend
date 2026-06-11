"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { fetchWithLog } from "@/lib/fetch-with-log"
import { getCapturedCoupon } from "@/lib/share-coupon"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { PageShell, LoadingState, ErrorState, TabloidPageIntro } from "@/components/tabloide"
import { useActionConsent } from "@/hooks/use-action-consent"

const ITEM_ID = "0fe91e60-12f0-4a1c-a297-262d73e5fce5"

interface CheckoutData {
  checkout: {
    id_checkout: string
    status: string
    subtotal_cents: number
    discount_cents: number
    total_cents: number
    currency: string
    items: {
      current_item_name: string
      unit_price_cents_snapshot: number
    }[]
    coupon: { code: string } | null
  }
}

function numCents(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Aceita `{ checkout }`, `{ data: { checkout } }`, checkout na raiz ou camelCase nos centavos. */
function normalizeCheckoutPayload(
  payload: unknown,
  preserveItems?: CheckoutData["checkout"]["items"]
): CheckoutData | null {
  if (!payload || typeof payload !== "object") return null
  const root = payload as Record<string, unknown>

  let raw: Record<string, unknown> | null = null
  if (root.checkout && typeof root.checkout === "object") {
    raw = root.checkout as Record<string, unknown>
  } else if (root.data && typeof root.data === "object") {
    const d = root.data as Record<string, unknown>
    if (d.checkout && typeof d.checkout === "object") {
      raw = d.checkout as Record<string, unknown>
    } else if (typeof (d as { id_checkout?: string }).id_checkout === "string") {
      raw = d as Record<string, unknown>
    }
  } else if (typeof root.id_checkout === "string") {
    raw = root
  }

  if (!raw) return null

  const items = Array.isArray(raw.items) && raw.items.length > 0
    ? (raw.items as CheckoutData["checkout"]["items"])
    : preserveItems ?? []

  const couponRaw = raw.coupon
  let coupon: { code: string } | null = null
  if (couponRaw && typeof couponRaw === "object") {
    const code =
      (couponRaw as { code?: string }).code ??
      (couponRaw as { code_snapshot?: string }).code_snapshot
    if (code) coupon = { code: String(code) }
  } else if (couponRaw === null) {
    coupon = null
  }

  const id_checkout = String(raw.id_checkout ?? "")
  if (!id_checkout) return null

  return {
    checkout: {
      id_checkout,
      status: String(raw.status ?? ""),
      subtotal_cents: numCents(raw.subtotal_cents ?? raw.subtotalCents),
      discount_cents: numCents(raw.discount_cents ?? raw.discountCents),
      total_cents: numCents(raw.total_cents ?? raw.totalCents),
      currency: String(raw.currency ?? "BRL"),
      items,
      coupon,
    },
  }
}

function CheckoutContent() {
  const t = useTranslations("Checkout")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const idProfile = searchParams.get("id_profile")
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cupom, setCupom] = useState("")
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null)
  const [cupomError, setCupomError] = useState<string | null>(null)
  const [isAplicandoCupom, setIsAplicandoCupom] = useState(false)
  const { ensureConsent } = useActionConsent()

  useEffect(() => {
    const fetchCheckout = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/")
        return
      }

      try {
        const sharedCoupon = getCapturedCoupon()
        const res = await fetchWithLog("checkout:page", "/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id_item: ITEM_ID,
            ...(idProfile ? { id_profile: idProfile } : {}),
            ...(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
          }),
        })

        const data = await res.json()
        if (res.ok) {
          const normalized = normalizeCheckoutPayload(data)
          if (normalized) {
            setCheckoutData(normalized)
            if (normalized.checkout.coupon?.code) {
              setCupomAplicado(normalized.checkout.coupon.code)
            }
          } else {
            setCheckoutData(data as CheckoutData)
            const c = (data as CheckoutData).checkout?.coupon
            if (c?.code) setCupomAplicado(c.code)
          }
        } else {
          setError(data.error || t("loadCheckoutError", "Erro ao carregar checkout"))
        }
      } catch (err) {
        setError(t("loadCheckoutTryAgain", "Erro ao carregar checkout. Tente novamente."))
        console.error("[v0] Fetch checkout error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCheckout()
  }, [router, idProfile, t])

  const handleAplicarCupom = async () => {
    if (!cupom.trim() || !checkoutData) return

    const token = localStorage.getItem("token")
    if (!token) return

    setIsAplicandoCupom(true)
    setCupomError(null)
    try {
      const res = await fetchWithLog(
        "checkout:cupom",
        `/api/checkout/${checkoutData.checkout.id_checkout}/apply-coupon`,
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: cupom.trim() }),
      }
      )

      const data = await res.json()

      if (res.ok) {
        const normalized = normalizeCheckoutPayload(data, checkoutData.checkout.items)
        if (normalized) {
          setCheckoutData(normalized)
          setCupomAplicado(
            normalized.checkout.coupon?.code ?? cupom.trim().toUpperCase()
          )
          setCupom("")
        } else {
          setCupomError(t("couponUpdateError", "Não foi possível atualizar os valores do checkout. Tente novamente."))
        }
      } else {
        const msg =
          (typeof data === "object" && data !== null && "message" in data
            ? String((data as { message?: string }).message)
            : null) ||
          (typeof data === "object" && data !== null && "error" in data
            ? String((data as { error?: string }).error)
            : null) ||
          t("couponInvalidError", "Cupom inválido ou expirado.")
        setCupomError(msg)
      }
    } catch (err) {
      console.error("[v0] Erro ao aplicar cupom:", err)
      setCupomError(t("couponApplyError", "Erro ao aplicar cupom. Tente novamente."))
    } finally {
      setIsAplicandoCupom(false)
    }
  }

  const handleRemoverCupom = () => {
    setCupom("")
    setCupomAplicado(null)
    setCupomError(null)
  }

  const handleCheckout = async () => {
    const token = localStorage.getItem("token")
    if (!token || !checkoutData) {
      router.push("/")
      return
    }
    if (!(await ensureConsent("purchase"))) return

    setIsProcessing(true)
    setError(null)

    try {
      const res = await fetchWithLog(
        "checkout:confirm",
        `/api/checkout/${checkoutData.checkout.id_checkout}/confirm`,
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(idProfile ? { "Content-Type": "application/json" } : {}),
        },
        ...(idProfile ? { body: JSON.stringify({ id_profile: idProfile }) } : {}),
      }
      )

      const data = await res.json()

      if (res.ok) {
        const idOrder = data.order?.id_order
        if (idOrder) {
          router.push(`/order/${idOrder}`)
        } else {
          router.push("/order")
        }
      } else {
        setError(data.error || data.message || t("confirmCheckoutError", "Erro ao confirmar checkout"))
      }
    } catch (err) {
      setError(t("confirmCheckoutTryAgain", "Erro ao confirmar checkout. Tente novamente."))
      console.error("[v0] Checkout confirm error:", err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <PageShell className="tabloid-account-page">
        <div className="relative z-10 px-4 py-16">
          <LoadingState label={t("loadingCheckout", "Carregando checkout...")} />
        </div>
      </PageShell>
    )
  }

  if (!checkoutData) {
    return (
      <PageShell className="tabloid-account-page">
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-16">
          <ErrorState
            title={t("loadCheckoutError", "Erro ao carregar checkout")}
            description={error || t("loadCheckoutTryAgain", "Erro ao carregar checkout. Tente novamente.")}
            onRetry={() => router.back()}
            retryLabel={t("backButton", "Voltar")}
          />
        </div>
      </PageShell>
    )
  }

  const subtotal = checkoutData.checkout.subtotal_cents
  const discount = checkoutData.checkout.discount_cents
  const total = checkoutData.checkout.total_cents
  const item = checkoutData.checkout.items[0]

  return (
    <PageShell className="tabloid-account-page">
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-10 md:py-12">
        <TabloidPageIntro
          size="compact"
          eyebrow={t("eyebrowPayment", "Pagamento")}
          title="CHECKOUT."
          subtitle={item?.current_item_name}
          back={
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backButton", "Voltar")}
            </button>
          }
          className="mb-8"
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("paymentTitle", "Pagamento - {item}").replace("{item}", item.current_item_name)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumo */}
            <div className="space-y-3 border-b pb-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("subtotalLabel", "Subtotal")}</span>
                <span className="font-medium">{(subtotal / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm">{t("discountLabel", "Desconto")}</span>
                  <span className="font-medium">-{(discount / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <span className="font-semibold">{t("totalLabel", "Total")}</span>
                <span className="text-xl font-bold text-primary">{(total / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>

            {/* Campo de cupom */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("couponSectionTitle", "Cupom de desconto")}</p>
              {cupomError && (
                <p className="text-sm text-destructive">{cupomError}</p>
              )}
              {cupomAplicado ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t("couponApplied", "Cupom {code} aplicado").replace("{code}", cupomAplicado)}</span>
                  </div>
                  <button
                    onClick={handleRemoverCupom}
                    disabled={isAplicandoCupom}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder={t("couponPlaceholder", "Digite seu cupom")}
                    value={cupom}
                    onChange={(e) => {
                      setCupom(e.target.value.toUpperCase())
                      if (cupomError) setCupomError(null)
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAplicarCupom()}
                    className="font-mono tracking-wider uppercase"
                    disabled={isAplicandoCupom}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAplicarCupom}
                    disabled={!cupom.trim() || isAplicandoCupom}
                  >
                    {isAplicandoCupom ? <Loader2 className="h-4 w-4 animate-spin" /> : t("applyCouponButton", "Aplicar")}
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isProcessing}
                className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0B0B0D] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("processingButton", "Processando...")}
                  </>
                ) : (
                  t("proceedPaymentButton", "Proceder com Pagamento")
                )}
              </button>

              <Button
                onClick={() => router.back()}
                variant="outline"
                className="w-full"
                disabled={isProcessing}
              >
                {t("cancelButton", "Cancelar")}
              </Button>
            </div>

            <p className="text-center text-xs font-bold text-[#9A938A]">
              {t("securePaymentRedirectNotice", "Você será redirecionado para a plataforma de pagamento segura após confirmar.")}
            </p>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  )
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout")
  return (
    <Suspense
      fallback={
        <PageShell className="tabloid-account-page">
          <div className="relative z-10 px-4 py-16">
            <LoadingState label={t("loadingCheckout", "Carregando checkout...")} />
          </div>
        </PageShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
