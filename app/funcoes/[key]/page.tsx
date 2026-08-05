"use client"

// Página inteira do produto da Loja de Funções (/funcoes/[key]) — continuação
// da vitrine: mesmo sistema tabloide (papel off-white, manchete Anton, sombra
// dura), com a compra (vitalícia) embaixo. Duas formas de pagar: dinheiro
// (Stripe) e, quando o admin configurou price_polens, a carteira de Poléns.
// Retorno do checkout chega por ?compra=success|cancel.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowRight, BadgeCheck, Loader2, Sparkles } from "lucide-react"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import {
  PageShell,
  TabloidPageIntro,
  TabloidBackLink,
  ErrorState,
  LoadingState,
} from "@/components/tabloide"
import {
  FUNCTION_ICONS,
  acceptsPolens,
  formatPolens,
  formatPriceBRL,
  type FunctionProduct,
} from "../_components/function-product"

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
  // Carteira de Poléns: null enquanto não sabemos (deslogado ou sem resposta).
  const [polenBalance, setPolenBalance] = useState<number | null>(null)
  const [buyingPolens, setBuyingPolens] = useState(false)
  const [polensDone, setPolensDone] = useState(false)

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

  const refreshWallet = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const r = await fetch("/api/polens/wallet", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!r.ok) return
      const data = await r.json()
      const balance = Number(data?.wallet?.balance)
      if (Number.isFinite(balance)) setPolenBalance(balance)
    } catch {
      // Saldo é informativo: sem ele o botão de Poléns some, a compra em
      // dinheiro segue disponível.
    }
  }, [])

  useEffect(() => {
    if (!key) return
    let cancelled = false

    setHasToken(Boolean(localStorage.getItem("token")))
    void refreshWallet()

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
  }, [key, refreshOwned, refreshWallet])

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

  // Compra pela carteira: liberação é imediata (sem webhook), então basta
  // reconsultar a posse e o saldo depois do 200.
  const buyWithPolens = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setBuyingPolens(true)
    setBuyError(null)
    try {
      const r = await fetch(`/api/function-store/products/${encodeURIComponent(key)}/polens`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data?.purchase) {
        const balance = Number(data?.wallet?.balance)
        if (Number.isFinite(balance)) setPolenBalance(balance)
        setPolensDone(true)
        setOwned(true)
        void refreshOwned()
      } else {
        setBuyError(data?.error || t("polensError", "Erro ao comprar com Poléns"))
      }
    } catch {
      setBuyError(t("polensError", "Erro ao comprar com Poléns"))
    }
    setBuyingPolens(false)
  }, [key, refreshOwned, router, t])

  const Icon = FUNCTION_ICONS[key]
  const price = useMemo(
    () => (product ? formatPriceBRL(product.price_cents, locale) : ""),
    [product, locale],
  )
  const polensPrice = Number(product?.price_polens) || 0
  const showPolens = Boolean(product && acceptsPolens(product))
  const enoughPolens = polenBalance !== null && polenBalance >= polensPrice

  if (notFound) {
    return (
      <PageShell className="fl-sharp md:pl-[80px]">
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <ErrorState
            title={t("notFound", "Função não encontrada")}
            description={t("empty", "Nenhuma função à venda no momento.")}
            homeHref="/funcoes"
            retryLabel={t("allFunctions", "Todas as funções")}
          />
        </div>
      </PageShell>
    )
  }

  if (!product) {
    return (
      <PageShell className="fl-sharp md:pl-[80px]">
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <LoadingState label={t("loading", "Carregando…")} />
        </div>
      </PageShell>
    )
  }

  const showImage = Boolean(product.image_url)

  return (
    <PageShell className="fl-sharp md:pl-[80px]">
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 md:py-12">
        <TabloidPageIntro
          eyebrow={product.eyebrow}
          title={product.nav_label}
          subtitle={product.short_description}
          back={<TabloidBackLink href="/funcoes">{t("allFunctions", "Todas as funções")}</TabloidBackLink>}
          size="compact"
          className="mb-8"
        />

        <div className="grid gap-8 md:grid-cols-[1.15fr_1fr] md:items-start">
          {/* Arte em bloco escuro com moldura de recorte */}
          <div
            className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] shadow-[6px_6px_0_0_#0B0B0D]"
            style={showImage ? undefined : { backgroundColor: product.placeholder_color }}
          >
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
                <Icon
                  aria-hidden="true"
                  className="h-28 w-28"
                  strokeWidth={1.1}
                  style={{ color: product.accent_color }}
                />
              )
            )}
          </div>

          {/* Coluna de compra — papel off-white, o bloco que decide */}
          <div className="fl-card flex flex-col gap-5 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D]">
            {product.headline && (
              <p className="fl-display text-3xl leading-[0.95]">{product.headline}</p>
            )}

            {/* Compra com Poléns: liberação imediata, sem retorno de gateway */}
            {polensDone && (
              <div className="border-2 border-[#0B0B0D] bg-[#F2B705]/25 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em]">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  {t("polensSuccessTitle", "Função liberada com Poléns!")}
                </p>
                <p className="mt-1 text-[13px] text-[#0B0B0D]/80">
                  {t("successBody", "Função liberada na sua conta. Ela já aparece na seção Funções do menu lateral, pronta pra ativar ou desativar.")}
                </p>
              </div>
            )}

            {/* Retorno do checkout */}
            {checkoutReturn === "success" && (
              <div className="border-2 border-[#0B0B0D] bg-[#F2B705]/25 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em]">
                  <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                  {owned
                    ? t("successTitle", "Compra confirmada!")
                    : t("successPendingTitle", "Pagamento recebido")}
                </p>
                <p className="mt-1 text-[13px] text-[#0B0B0D]/80">
                  {owned
                    ? t("successBody", "Função liberada na sua conta. Ela já aparece na seção Funções do menu lateral, pronta pra ativar ou desativar.")
                    : t("successPending", "Estamos confirmando o pagamento — a função libera automaticamente em instantes.")}
                </p>
              </div>
            )}
            {checkoutReturn === "cancel" && !owned && (
              <div className="border-2 border-[#0B0B0D]/30 px-4 py-3">
                <p className="text-[13px] text-[#0B0B0D]/80">
                  {t("cancelNotice", "Compra cancelada. Você pode tentar de novo quando quiser.")}
                </p>
              </div>
            )}

            {/* Preço + CTA */}
            {owned ? (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-lg font-black uppercase tracking-[0.08em]">
                  <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                  {t("ownedTitle", "Você já tem esta função")}
                </p>
                <p className="text-[13px] text-[#0B0B0D]/75">
                  {t("ownedHint", "Ative ou desative quando quiser na seção Funções do menu lateral.")}
                </p>
                <Link
                  href="/account"
                  className="inline-flex min-h-[48px] w-fit items-center gap-3 border-2 border-[#0B0B0D] px-6 text-[12px] font-black uppercase tracking-[0.14em] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2]"
                >
                  {t("goAccount", "Ir pra minha conta")}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 border-t-2 border-[#0B0B0D]/12 pt-4">
                <p className="fl-display leading-none" style={{ fontSize: "clamp(36px, 5vw, 64px)" }}>
                  {price}
                </p>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0B0B0D]/60">
                  {t("lifetime", "Pagamento único — sua pra sempre.")}
                </p>
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={buying || buyingPolens}
                  className="group inline-flex min-h-[52px] w-fit items-center gap-4 border-2 border-[#0B0B0D] bg-[#F2B705] px-7 text-[13px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D] disabled:cursor-not-allowed disabled:opacity-55"
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

                {/* Caminho alternativo: carteira de Poléns (quando o admin
                    configurou um preço). Liberação é na hora. */}
                {showPolens && (
                  <div className="mt-1 flex flex-col gap-2 border-t-2 border-dashed border-[#0B0B0D]/20 pt-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0B0B0D]/60">
                      {t("orPayWith", "Ou pague com Poléns")}
                    </p>
                    <p className="flex items-baseline gap-2">
                      <span className="fl-display text-3xl leading-none">
                        {formatPolens(polensPrice, locale)}
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B0B0D]/60">
                        {t("polensUnit", "Poléns")}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={buyWithPolens}
                      disabled={buying || buyingPolens || (hasToken && !enoughPolens)}
                      className="group inline-flex min-h-[48px] w-fit items-center gap-3 border-2 border-[#0B0B0D] bg-transparent px-6 text-[12px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-[#F1EDE2] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[#0B0B0D]"
                    >
                      {buyingPolens ? (
                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                          {hasToken
                            ? t("buyWithPolens", "Comprar com Poléns")
                            : t("loginToBuy", "Entrar pra comprar")}
                        </>
                      )}
                    </button>
                    {hasToken && polenBalance !== null && (
                      <p className="text-[12px] text-[#0B0B0D]/70">
                        {enoughPolens
                          ? t("polensBalance", "Seu saldo: {n} Poléns").replace(
                              "{n}",
                              formatPolens(polenBalance, locale),
                            )
                          : t(
                              "polensNotEnough",
                              "Você tem {n} Poléns — faltam {missing} pra esta função.",
                            )
                              .replace("{n}", formatPolens(polenBalance, locale))
                              .replace("{missing}", formatPolens(polensPrice - polenBalance, locale))}
                      </p>
                    )}
                    {hasToken && !enoughPolens && (
                      <Link
                        href="/loja-polens"
                        className="inline-flex w-fit items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] underline underline-offset-4"
                      >
                        {t("getPolens", "Conseguir Poléns")}
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </Link>
                    )}
                  </div>
                )}

                {buyError && (
                  <p className="text-[13px] font-bold text-[#B3261E]">{buyError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Descrição longa */}
        {product.full_description && (
          <section className="mt-10 max-w-3xl border-t-2 border-[#F1EDE2]/12 pt-8">
            <h2 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#F2B705]">
              {t("aboutTitle", "O que você leva")}
            </h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-[#F1EDE2]/85">
              {product.full_description}
            </p>
          </section>
        )}
      </div>
    </PageShell>
  )
}
