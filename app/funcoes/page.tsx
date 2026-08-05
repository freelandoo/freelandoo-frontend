"use client"

// Loja de Funções — vitrine editorial no sistema tabloide da plataforma.
// Produtos vêm do catálogo (admin edita em /administracao/loja-funcoes);
// a posse (owned) vem de /api/users/me/features quando há sessão.
//
// O layout portado do TENKA (carrossel GSAP fullscreen, fundo por produto)
// saiu: destoava do resto do site. As cores do admin viraram ACENTO do card
// (ícone/arte), não fundo de página — a identidade é a do tabloide.

import { useEffect, useState } from "react"
import Link from "next/link"
import { BadgeCheck, Store } from "lucide-react"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import {
  PageShell,
  TabloidPageIntro,
  TabloidBackLink,
  EmptyState,
  LoadingState,
  ErrorState,
  TABLOID_ACTION_CLASSES,
} from "@/components/tabloide"
import {
  FUNCTION_ICONS,
  formatPriceBRL,
  padIndex,
  type FunctionProduct,
} from "./_components/function-product"

export default function FunctionStorePage() {
  const t = useTranslations("FunctionStore")
  const locale = useLocale()
  const [products, setProducts] = useState<FunctionProduct[] | null>(null)
  const [owned, setOwned] = useState<Record<string, boolean>>({})
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch("/api/function-store/products", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((data) => {
        if (!cancelled) setProducts(Array.isArray(data?.products) ? data.products : [])
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    const token = localStorage.getItem("token")
    if (token) {
      fetch("/api/users/me/features", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data?.owned) setOwned(data.owned)
        })
        .catch(() => {
          /* deslogado/offline — vitrine funciona sem posse */
        })
    }

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageShell className="fl-sharp md:pl-[80px]">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 md:py-12">
        <TabloidPageIntro
          eyebrow={t("eyebrow", "Loja")}
          title={t("pageTitle", "FUNÇÕES.")}
          subtitle={t(
            "pageSubtitle",
            "Cada função é uma parte da Freelandoo que você liga na sua conta. Pagamento único, sua pra sempre.",
          )}
          back={<TabloidBackLink href="/account">{t("backToAccount", "Voltar pra minha conta")}</TabloidBackLink>}
          className="mb-8"
        />

        {!products && !error && (
          <div className="py-10">
            <LoadingState label={t("loading", "Carregando…")} />
          </div>
        )}

        {error && (
          <ErrorState
            title={t("storeName", "Loja de Funções")}
            description={t("loadError", "Erro ao carregar a loja. Tente de novo em instantes.")}
            homeHref="/account"
          />
        )}

        {products && products.length === 0 && !error && (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title={t("storeName", "Loja de Funções")}
            description={t("empty", "Nenhuma função à venda no momento.")}
            action={
              <Link href="/account" className={TABLOID_ACTION_CLASSES}>
                {t("backToAccount", "Voltar pra minha conta")}
              </Link>
            }
          />
        )}

        {products && products.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <li key={product.id}>
                <FunctionCard
                  product={product}
                  index={index}
                  owned={owned[product.feature_key] === true}
                  locale={locale}
                  t={t}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

/** Recorte de jornal: número, arte, manchete, preço e chamada. */
function FunctionCard({
  product,
  index,
  owned,
  locale,
  t,
}: {
  product: FunctionProduct
  index: number
  owned: boolean
  locale: string
  t: (key: string, fallback: string) => string
}) {
  const Icon = FUNCTION_ICONS[product.feature_key]

  return (
    <Link
      href={`/funcoes/${product.feature_key}`}
      aria-label={`${product.nav_label} — ${owned ? t("ctaOwned", "Ver função") : t("ctaBuy", "Comprar")}`}
      className="fl-card fl-hard mp-card group flex h-full flex-col border-[#0B0B0D] bg-[#F1EDE2] p-4 text-[#0B0B0D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="fl-display text-2xl leading-none text-[#0B0B0D]/25">
          {padIndex(index + 1)}
        </span>
        {owned ? (
          <span className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
            <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
            {t("ownedBadge", "Sua")}
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0B0B0D]/55">
            {product.eyebrow}
          </span>
        )}
      </div>

      {/* Arte: bloco escuro editorial. A cor do admin entra como acento aqui. */}
      <div
        className="relative mb-4 flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]"
        style={product.image_url ? undefined : { backgroundColor: product.placeholder_color }}
      >
        {product.image_url ? (
          // Mídia do R2 — política de imagem: não passa pelo otimizador da Vercel.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.nav_label}
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          Icon && (
            <Icon
              aria-hidden="true"
              className="h-16 w-16 transition-transform duration-300 group-hover:scale-110"
              strokeWidth={1.2}
              style={{ color: product.accent_color }}
            />
          )
        )}
      </div>

      <h2 className="fl-display text-3xl leading-[0.92]">{product.nav_label}</h2>
      <p className="mt-2 flex-1 text-[13px] leading-[1.5] text-[#0B0B0D]/75">
        {product.short_description}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t-2 border-[#0B0B0D]/12 pt-3">
        {owned ? (
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0B0B0D]/70">
            {t("ownedLine", "Você já tem esta função")}
          </p>
        ) : (
          <div>
            <p className="fl-display text-2xl leading-none">
              {formatPriceBRL(product.price_cents, locale)}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0B0B0D]/55">
              {t("lifetimeShort", "pagamento único")}
            </p>
          </div>
        )}
        <span
          className={
            owned
              ? "inline-flex items-center border-2 border-[#0B0B0D] bg-transparent px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition group-hover:bg-[#0B0B0D] group-hover:text-[#F1EDE2]"
              : "inline-flex items-center border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] shadow-[3px_3px_0_0_#0B0B0D] transition group-hover:shadow-[5px_5px_0_0_#0B0B0D]"
          }
        >
          {owned ? t("ctaOwned", "Ver função") : t("ctaBuy", "Comprar")}
        </span>
      </div>
    </Link>
  )
}
