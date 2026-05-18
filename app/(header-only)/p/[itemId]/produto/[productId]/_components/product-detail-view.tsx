"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, MapPin, Package, ShoppingCart, Truck } from "lucide-react"
import Link from "next/link"
import { BuyProductDialog } from "./buy-product-dialog"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

interface Media {
  id_product_media: number
  media_url: string
  thumbnail_url: string | null
  media_type: "image" | "video"
  mime_type?: string
}

interface Product {
  id_profile_product: number
  id_profile: string
  name: string
  description: string | null
  price_amount: number
  currency: string
  stock_quantity: number
  weight_grams: number
  height_cm: number | string
  width_cm: number | string
  length_cm: number | string
  origin_zipcode_override: string | null
  is_active: boolean
  media: Media[]
}

interface ShippingOption {
  service_id: number | string
  service_name: string
  carrier: string
  carrier_picture: string | null
  price_cents: number
  delivery_days_min: number | null
  delivery_days_max: number | null
}

interface ShippingResponse {
  origin_zipcode: string
  destination_zipcode: string
  destination_address: {
    cep: string
    logradouro: string
    bairro: string
    localidade: string
    uf: string
  } | null
  options: ShippingOption[]
}

function formatBRL(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function ProductDetailView({ profileId, productId }: { profileId: string; productId: string }) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const [product, setProduct] = useState<Product | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeMedia, setActiveMedia] = useState(0)

  const [cepInput, setCepInput] = useState("")
  const [shipping, setShipping] = useState<ShippingResponse | null>(null)
  const [shippingState, setShippingState] = useState<"idle" | "loading" | "loaded" | "error">("idle")
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)

  const [buyOpen, setBuyOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState("loading")
      try {
        const res = await fetch(`/api/public/profile/${profileId}/products/${productId}`, { cache: "no-store" })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setErrorMsg(d?.error || t("productNotFoundError", "Produto não encontrado"))
          setState("error")
          return
        }
        setProduct(d.product as Product)
        setState("loaded")
      } catch {
        if (!cancelled) {
          setErrorMsg(t("loadProductError", "Erro ao carregar produto"))
          setState("error")
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [profileId, productId, t])

  const calcShipping = useCallback(async () => {
    const digits = cepInput.replace(/\D/g, "")
    if (digits.length !== 8) {
      setShippingError(t("invalidCepError", "CEP inválido (8 dígitos)"))
      return
    }
    setShippingError(null)
    setShippingState("loading")
    try {
      const res = await fetch(`/api/public/profile/${profileId}/products/${productId}/shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_zipcode: digits }),
      })
      const d = await res.json()
      if (!res.ok) {
        setShippingError(d?.error || t("shippingCalculateUnavailable", "Não foi possível calcular o frete"))
        setShippingState("error")
        return
      }
      setShipping(d as ShippingResponse)
      setSelectedShippingId(d.options?.[0] ? String(d.options[0].service_id) : null)
      setShippingState("loaded")
    } catch {
      setShippingError(t("shippingCalculateError", "Erro ao calcular frete"))
      setShippingState("error")
    }
  }, [profileId, productId, cepInput, t])

  const selectedOption = useMemo(() => {
    if (!shipping || !selectedShippingId) return null
    return shipping.options.find((o) => String(o.service_id) === selectedShippingId) || null
  }, [shipping, selectedShippingId])

  if (state === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </main>
    )
  }

  if (state === "error" || !product) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/40" aria-hidden />
        <h1 className="text-lg font-semibold">{t("productUnavailableTitle", "Produto indisponível")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMsg || t("tryAgainLater", "Tente novamente mais tarde.")}</p>
        <Link
          href={`/freelancer/${profileId}`}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> {t("backToStore", "Voltar à loja")}
        </Link>
      </main>
    )
  }

  const outOfStock = product.stock_quantity <= 0
  const media = product.media || []
  const cover = media[activeMedia]
  const description = product.description?.trim() || ""

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
      <Link
        href={`/freelancer/${profileId}`}
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> {t("backToStore", "Voltar à loja")}
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-zinc-900">
            {cover ? (
              cover.media_type === "video" ? (
                <video src={cover.media_url} poster={cover.thumbnail_url || undefined} controls className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.media_url} alt={product.name} className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-16 w-16 text-zinc-700" aria-hidden />
              </div>
            )}
            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveMedia((i) => (i - 1 + media.length) % media.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  aria-label={t("previousMediaAria", "Anterior")}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMedia((i) => (i + 1) % media.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  aria-label={t("nextMediaAria", "Próximo")}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
          </div>
          {media.length > 1 && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {media.map((m, idx) => (
                <button
                  key={m.id_product_media}
                  type="button"
                  onClick={() => setActiveMedia(idx)}
                  className={`aspect-square overflow-hidden rounded-lg border ${idx === activeMedia ? "border-primary" : "border-border"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbnail_url || m.media_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{product.name}</h1>
          <p className="mt-3 text-3xl font-bold tabular-nums md:text-4xl">
            {formatBRL(product.price_amount, locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {outOfStock ? (
              <span className="font-semibold text-amber-400">{t("outOfStock", "Esgotado")}</span>
            ) : (
              <>{t("inStockLabel", "Em estoque:")} <span className="font-semibold text-foreground">{product.stock_quantity}</span></>
            )}
          </p>

          {description && (
            <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          )}

          {/* Frete */}
          <div className="mt-8 rounded-2xl border border-border bg-card/40 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4" aria-hidden /> {t("calculateShippingTitle", "Calcular frete")}
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                value={cepInput}
                onChange={(e) => setCepInput(maskCep(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") calcShipping() }}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                maxLength={9}
              />
              <button
                type="button"
                onClick={calcShipping}
                disabled={shippingState === "loading"}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {shippingState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("calculateButton", "Calcular")}
              </button>
            </div>
            {shippingError && (
              <p className="mt-2 text-xs text-rose-400">{shippingError}</p>
            )}

            {shippingState === "loaded" && shipping && (
              <div className="mt-4">
                {shipping.destination_address && (
                  <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {shipping.destination_address.localidade}/{shipping.destination_address.uf}
                  </p>
                )}
                {shipping.options.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("noShippingOptions", "Nenhuma opção de frete disponível para este CEP.")}</p>
                ) : (
                  <ul className="space-y-2">
                    {shipping.options.map((opt) => {
                      const id = String(opt.service_id)
                      const selected = id === selectedShippingId
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setSelectedShippingId(id)}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                              selected ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input type="radio" readOnly checked={selected} className="accent-primary" />
                              <div>
                                <p className="font-semibold">{opt.carrier} · {opt.service_name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {opt.delivery_days_min && opt.delivery_days_max
                                    ? t("deliveryRange", "Entrega em {min}–{max} dias úteis")
                                        .replace("{min}", String(opt.delivery_days_min))
                                        .replace("{max}", String(opt.delivery_days_max))
                                    : t("deliveryToConfirm", "Prazo a confirmar")}
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold tabular-nums">{formatBRL(opt.price_cents, locale)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            disabled={outOfStock || !selectedOption}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {outOfStock
              ? t("outOfStock", "Esgotado")
              : selectedOption
                ? t("buyWithTotal", "Comprar — {total}").replace("{total}", formatBRL(product.price_amount + selectedOption.price_cents, locale))
                : t("selectShippingButton", "Selecione o frete")}
          </button>
        </div>
      </div>

      {selectedOption && shipping && (
        <BuyProductDialog
          open={buyOpen}
          onClose={() => setBuyOpen(false)}
          product={product}
          shipping={selectedOption}
          destinationZipcode={shipping.destination_zipcode}
          destinationAddress={shipping.destination_address}
        />
      )}
    </main>
  )
}
