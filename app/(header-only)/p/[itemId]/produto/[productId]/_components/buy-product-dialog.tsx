"use client"

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getCapturedCoupon } from "@/lib/share-coupon"
import { useActionConsent } from "@/hooks/use-action-consent"

interface Product {
  id_profile_product: number
  name: string
  price_amount: number
}

interface ShippingOption {
  service_id: number | string
  service_name: string
  carrier: string
  price_cents: number
}

interface DestinationAddress {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

interface BuyProductDialogProps {
  open: boolean
  onClose: () => void
  product: Product
  shipping: ShippingOption
  destinationZipcode: string
  destinationAddress: DestinationAddress | null
}

function formatBRL(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function BuyProductDialog({
  open, onClose, product, shipping, destinationZipcode, destinationAddress,
}: BuyProductDialogProps) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const { ensureConsent } = useActionConsent()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [street, setStreet] = useState(destinationAddress?.logradouro || "")
  const [number, setNumber] = useState("")
  const [complement, setComplement] = useState("")
  const [neighborhood, setNeighborhood] = useState(destinationAddress?.bairro || "")
  const [city, setCity] = useState(destinationAddress?.localidade || "")
  const [uf, setUf] = useState(destinationAddress?.uf || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (destinationAddress) {
      setStreet((s) => s || destinationAddress.logradouro || "")
      setNeighborhood((b) => b || destinationAddress.bairro || "")
      setCity((c) => c || destinationAddress.localidade || "")
      setUf((u) => u || destinationAddress.uf || "")
    }
  }, [destinationAddress])

  if (!open) return null

  const total = product.price_amount + shipping.price_cents

  async function submit() {
    setError(null)
    if (!name.trim() || !email.trim()) {
      setError(t("nameEmailRequired", "Nome e e-mail são obrigatórios"))
      return
    }
    if (!street.trim() || !number.trim()) {
      setError(t("streetNumberRequired", "Rua e número são obrigatórios"))
      return
    }
    if (!(await ensureConsent("purchase"))) return
    setSubmitting(true)
    try {
      const token = getToken()
      if (!token) {
        setError(t("loginRequired", "Faça login para continuar"))
        setSubmitting(false)
        return
      }
      const sharedCoupon = getCapturedCoupon()
      const res = await fetch(`/api/me/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id_profile_product: product.id_profile_product,
          quantity: 1,
          destination_zipcode: destinationZipcode,
          shipping_service_id: shipping.service_id,
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          buyer_whatsapp: whatsapp.trim() || null,
          destination_full_address: {
            street: street.trim(),
            number: number.trim(),
            complement: complement.trim() || null,
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            uf: uf.trim().toUpperCase(),
          },
          ...(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.checkout_url) {
        setError(data?.error || t("checkoutStartError", "Não foi possível iniciar o checkout"))
        setSubmitting(false)
        return
      }
      window.location.href = data.checkout_url
    } catch {
      setError(t("connectionTryAgain", "Erro de conexão. Tente novamente."))
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6" role="dialog" aria-modal="true">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-6 md:rounded-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-accent"
          aria-label={t("closeButtonAria", "Fechar")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2 className="text-lg font-bold">{t("finishPurchaseTitle", "Finalizar compra")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {product.name} · {shipping.carrier} {shipping.service_name}
        </p>

        <dl className="mt-4 space-y-1 rounded-xl bg-muted/30 p-3 text-sm">
          <div className="flex justify-between"><dt>{t("productLineLabel", "Produto")}</dt><dd className="tabular-nums">{formatBRL(product.price_amount, locale)}</dd></div>
          <div className="flex justify-between"><dt>{t("shippingLineLabel", "Frete")}</dt><dd className="tabular-nums">{formatBRL(shipping.price_cents, locale)}</dd></div>
          <div className="flex justify-between border-t border-border/60 pt-1 font-semibold"><dt>{t("totalLineLabel", "Total")}</dt><dd className="tabular-nums">{formatBRL(total, locale)}</dd></div>
        </dl>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder={t("fullNamePlaceholder", "Nome completo")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder={t("emailPlaceholder", "E-mail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder={t("whatsappPlaceholder", "WhatsApp (opcional)")}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shippingAddressTitle", "Endereço de entrega")}</p>
          <div className="grid grid-cols-3 gap-2">
            <input className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("streetPlaceholder", "Rua")} value={street} onChange={(e) => setStreet(e.target.value)} />
            <input className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("numberPlaceholder", "Número")} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("complementPlaceholder", "Complemento (opcional)")} value={complement} onChange={(e) => setComplement(e.target.value)} />
          <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("neighborhoodPlaceholder", "Bairro")} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <input className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("cityPlaceholder", "Cidade")} value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder={t("ufPlaceholder", "UF")} maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
          </div>
          <p className="text-[11px] text-muted-foreground">CEP: {destinationZipcode.replace(/^(\d{5})(\d{3})$/, "$1-$2")}</p>
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("payButton", "Pagar {total}").replace("{total}", formatBRL(total, locale))}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t("stripeRedirectNotice", "Você será redirecionado ao Stripe para concluir o pagamento.")}
        </p>
      </div>
    </div>
  )
}
