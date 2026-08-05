"use client"

// Loja de Funções — vitrine editorial no sistema tabloide da plataforma.
// Produtos vêm do catálogo (admin edita em /administracao/loja-funcoes);
// a posse (owned) vem de /api/users/me/features quando há sessão.
//
// O formato é o de sempre — cards GRANDES que rolam, um por vez —, mas a
// linguagem visual é a tabloide: papel off-white, manchete Anton, sombra
// dura. O que saiu do layout portado do TENKA foi o fundo colorido por
// produto, o blur 3D e a janela de browser, que faziam a página parecer
// outro site. A rolagem agora é nativa (scroll-snap), sem GSAP.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Store } from "lucide-react"
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
import { FunctionCarousel } from "./_components/function-carousel"
import type { FunctionProduct } from "./_components/function-product"

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
          back={
            <TabloidBackLink href="/account">
              {t("backToAccount", "Voltar pra minha conta")}
            </TabloidBackLink>
          }
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
      </div>

      {/* A faixa de cards sangra até a borda da tela: fica fora do container
          com padding, como a régua de fotos de um jornal. */}
      {products && products.length > 0 && (
        <div className="relative z-10 mx-auto w-full max-w-[1400px] pb-14 md:pb-16">
          <FunctionCarousel products={products} owned={owned} locale={locale} t={t} />
        </div>
      )}
    </PageShell>
  )
}
