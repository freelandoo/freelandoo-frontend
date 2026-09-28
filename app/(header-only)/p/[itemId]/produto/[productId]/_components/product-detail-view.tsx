"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Package, ShoppingCart, Store } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BuyProductDialog } from "./buy-product-dialog"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

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
  delivery_mode?: "shipping" | "local_pickup"
  /** Preço que o COMPRADOR paga (preço do vendedor + taxas) — é o que o checkout cobra. */
  pricing?: { display_price_cents?: number } | null
}

function formatBRL(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

export function ProductDetailView({ profileId, productId }: { profileId: string; productId: string }) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const router = useRouter()
  // Loja/Produtos desligada no Painel de Controle → página de produto some.
  const storeOn = useFeature("store")
  useEffect(() => {
    if (!storeOn) router.replace("/")
  }, [storeOn, router])
  const [product, setProduct] = useState<Product | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeMedia, setActiveMedia] = useState(0)


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


  if (!storeOn) return null

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
  // O checkout cobra o preço de comprador; mostrar o do vendedor aqui faria a
  // página anunciar um valor e o pagamento cobrar outro.
  const buyerPrice = Number(product.pricing?.display_price_cents) || product.price_amount

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
            {formatBRL(buyerPrice, locale)}
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

          {/* SÓ RETIRADA (mig 264): a Loja voltou sem frete. Quem compra paga
              aqui e combina a retirada com o vendedor na conversa que abre
              sozinha depois do pagamento. */}
          <div className="mt-8 border-2 border-[#0B0B0D] bg-[#F2B705]/15 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Store className="h-4 w-4" aria-hidden /> {t("localPickupTitle", "Retirada combinada com o vendedor")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "pickupOnlyDesc",
                "Sem frete: você paga pela Freelandoo e, assim que o pagamento cair, abrimos uma conversa com o vendedor para combinar onde e quando retirar.",
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            disabled={outOfStock}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {outOfStock
              ? t("outOfStock", "Esgotado")
              : t("buyWithTotal", "Comprar — {total}").replace("{total}", formatBRL(buyerPrice, locale))}
          </button>
          <Link
            href={`/mensagens?with=${encodeURIComponent(profileId)}`}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-6 py-3 text-sm font-semibold transition hover:bg-[#0B0B0D]/5"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t("talkToSeller", "Falar com vendedor")}
          </Link>
        </div>
      </div>

      <BuyProductDialog
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        product={{ ...product, price_amount: buyerPrice }}
      />
    </main>
  )
}
