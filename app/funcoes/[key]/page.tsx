"use client"

// Página inteira do produto da Loja de Funções (/funcoes/[key]) — continuação
// do carrossel: mesma linguagem visual (cor de fundo do produto, headline
// display gigante, card janela), com a compra Stripe (vitalícia) embaixo.
// Retorno do checkout chega por ?compra=success|cancel.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, BadgeCheck, Loader2 } from "lucide-react"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import {
  FUNCTION_ICONS,
  formatPriceBRL,
  type FunctionProduct,
} from "../_components/function-product"

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`

type CheckoutReturn = "success" | "cancel" | null

export default function FunctionProductPage() {
  const t = useTranslations("FunctionStore")
  const locale = useLocale()
  const router = useRouter()
  const params = useParams<{ key: string }>()
  const key = String(params?.key || "")

  const [product, setProduct] = useState<FunctionProduct | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [owned, setOwned] = useState<boolean | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [checkoutReturn, setCheckoutReturn] = useState<CheckoutReturn>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshOwned = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem("token")
    if (!token) return false
    try {
      const r = await fetch("/api/users/me/features", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!r.ok) return false
      const data = await r.json()
      const isOwned = data?.owned?.[key] === true
      setOwned(isOwned)
      return isOwned
    } catch {
      return false
    }
  }, [key])

  useEffect(() => {
    if (!key) return
    let cancelled = false

    setHasToken(Boolean(localStorage.getItem("token")))

    // Retorno do checkout (?compra=success|cancel) — lido fora do useSearchParams
    // de propósito (evita Suspense boundary só pra isso).
    const search = new URLSearchParams(window.location.search)
    const ret = search.get("compra")
    if (ret === "success" || ret === "cancel") setCheckoutReturn(ret)

    fetch(`/api/function-store/products/${encodeURIComponent(key)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("notfound"))))
      .then((data) => {
        if (!cancelled && data?.product) setProduct(data.product)
        else if (!cancelled) setNotFound(true)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })

    void refreshOwned()

    return () => {
      cancelled = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [key, refreshOwned])

  // Pós-sucesso: o webhook pode levar alguns segundos — re-consulta a posse
  // com backoff curto até confirmar (máx ~30s), sem poll perpétuo.
  useEffect(() => {
    if (checkoutReturn !== "success" || owned === true) return
    let attempt = 0
    let disposed = false
    const tick = async () => {
      if (disposed) return
      const isOwned = await refreshOwned()
      attempt += 1
      if (!isOwned && attempt < 8) {
        pollRef.current = setTimeout(tick, 2000 + attempt * 1000)
      }
    }
    pollRef.current = setTimeout(tick, 1500)
    return () => {
      disposed = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [checkoutReturn, owned, refreshOwned])

  const startCheckout = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setBuying(true)
    setBuyError(null)
    try {
      const r = await fetch(`/api/function-store/products/${encodeURIComponent(key)}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data?.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setBuyError(data?.error || t("buyError", "Erro ao iniciar a compra"))
    } catch {
      setBuyError(t("buyError", "Erro ao iniciar a compra"))
    }
    setBuying(false)
  }, [key, router, t])

  const Icon = FUNCTION_ICONS[key]
  const price = useMemo(
    () => (product ? formatPriceBRL(product.price_cents, locale) : ""),
    [product, locale],
  )

  if (notFound) {
    return (
      <main className="fl-sharp flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-[#0b0804] px-6 text-center text-white">
        <p className="fl-display text-3xl uppercase">{t("notFound", "Função não encontrada")}</p>
        <Link
          href="/funcoes"
          className="inline-flex min-h-[44px] items-center gap-2 border-2 border-white/80 px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.14]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          {t("allFunctions", "Todas as funções")}
        </Link>
      </main>
    )
  }

  if (!product) {
    return (
      <main
        aria-label={t("loading", "Carregando…")}
        className="fl-sharp min-h-[100svh] w-full"
        style={{ backgroundColor: "#0b0804" }}
      />
    )
  }

  const showImage = Boolean(product.image_url)

  return (
    <main
      className="fl-sharp relative min-h-[100svh] w-full overflow-hidden font-sans text-white"
      style={{ backgroundColor: product.background_color }}
    >
      {/* Grain + glow, mesma atmosfera do carrossel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.06]"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: "160px 160px" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[40%] z-[6] h-[55vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[140px]"
        style={{ backgroundColor: product.accent_color }}
      />

      {/* Header */}
      <header className="relative z-[80]">
        <div className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-6 lg:px-14">
          <Link
            href="/funcoes"
            aria-label={t("allFunctions", "Todas as funções")}
            className="flex min-h-[44px] items-center gap-3 text-white"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-xl font-bold uppercase" style={{ letterSpacing: "-0.04em" }}>
              {t("storeName", "Loja de Funções")}
              <span aria-hidden="true" style={{ color: product.accent_color }}>
                _
              </span>
            </span>
          </Link>
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.28em] text-white/60 md:block">
            {product.eyebrow}
          </span>
        </div>
      </header>

      <div className="relative z-[20] mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-20 pt-4 sm:px-10 md:pt-8 lg:px-14">
        {/* Headline display gigante */}
        <h1
          className="fl-display uppercase"
          style={{
            fontSize: "clamp(56px, 11vw, 160px)",
            lineHeight: 0.85,
            letterSpacing: "-0.035em",
            whiteSpace: "pre-line",
            color: product.text_color,
          }}
        >
          {product.headline}
        </h1>

        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-start">
          {/* Card janela com a arte */}
          <div className="relative flex aspect-[16/10] w-full flex-col overflow-hidden bg-[#101014] shadow-[0_40px_90px_-24px_rgba(0,0,0,0.55)]">
            <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/5 bg-[#17171C] px-4">
              <div className="flex shrink-0 gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 bg-[#28C840]" />
              </div>
              <div className="flex h-5 max-w-[60%] flex-1 items-center bg-white/[0.07] px-3">
                <span className="truncate text-[10px] font-medium tracking-wide text-white/45">
                  freelandoo.com.br/funcoes/{product.feature_key}
                </span>
              </div>
            </div>
            <div className="relative flex-1" style={{ backgroundColor: product.placeholder_color }}>
              {showImage ? (
                // Mídia do R2 — política de imagem: não passa pelo otimizador da Vercel.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url ?? undefined}
                  alt={product.nav_label}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                Icon && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon
                      aria-hidden="true"
                      className="h-32 w-32"
                      strokeWidth={1.1}
                      style={{ color: product.accent_color, opacity: 0.85 }}
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Coluna de compra */}
          <div className="flex flex-col gap-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/80">
              {product.eyebrow}
            </p>
            <p className="text-[15px] leading-[1.5] text-white/90">{product.short_description}</p>

            {/* Retorno do checkout */}
            {checkoutReturn === "success" && (
              <div className="border-2 px-4 py-3" style={{ borderColor: product.accent_color }}>
                <p className="flex items-center gap-2 text-sm font-bold" style={{ color: product.accent_color }}>
                  <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                  {owned
                    ? t("successTitle", "Compra confirmada!")
                    : t("successPendingTitle", "Pagamento recebido")}
                </p>
                <p className="mt-1 text-[13px] text-white/80">
                  {owned
                    ? t("successBody", "Função liberada na sua conta. Ela já aparece na seção Funções do menu lateral, pronta pra ativar ou desativar.")
                    : t("successPending", "Estamos confirmando o pagamento — a função libera automaticamente em instantes.")}
                </p>
              </div>
            )}
            {checkoutReturn === "cancel" && !owned && (
              <div className="border-2 border-white/30 px-4 py-3">
                <p className="text-[13px] text-white/80">
                  {t("cancelNotice", "Compra cancelada. Você pode tentar de novo quando quiser.")}
                </p>
              </div>
            )}

            {/* Preço + CTA */}
            {owned ? (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-lg font-bold" style={{ color: product.accent_color }}>
                  <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                  {t("ownedTitle", "Você já tem esta função")}
                </p>
                <p className="text-[13px] text-white/75">
                  {t("ownedHint", "Ative ou desative quando quiser na seção Funções do menu lateral.")}
                </p>
                <Link
                  href="/account"
                  className="inline-flex min-h-[48px] w-fit items-center gap-3 border-2 border-white px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.14]"
                >
                  {t("goAccount", "Ir pra minha conta")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="fl-display leading-none" style={{ fontSize: "clamp(36px, 5vw, 64px)", color: product.accent_color }}>
                  {price}
                </p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  {t("lifetime", "Pagamento único — sua pra sempre.")}
                </p>
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={buying}
                  className="group inline-flex min-h-[56px] w-fit items-center gap-4 px-8 text-[14px] font-bold uppercase tracking-[0.14em] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ backgroundColor: product.accent_color, color: "#111" }}
                >
                  {buying ? (
                    <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {hasToken
                        ? t("buy", "Comprar função")
                        : t("loginToBuy", "Entrar pra comprar")}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                        strokeWidth={2.5}
                      />
                    </>
                  )}
                </button>
                {buyError && <p className="text-[13px] font-semibold text-red-300">{buyError}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Descrição longa */}
        {product.full_description && (
          <section className="max-w-3xl border-t border-white/15 pt-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/70">
              {t("aboutTitle", "O que você leva")}
            </h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-white/90">
              {product.full_description}
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
