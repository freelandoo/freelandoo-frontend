"use client"

// Loja de Funções — vitrine fullscreen com a coreografia da home do TENKA
// (gsap + @gsap/react + Observer) vestida de tabloide. Produtos vêm do
// catálogo (admin edita em /administracao/loja-funcoes); a posse (owned) vem
// de /api/users/me/features quando há sessão.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Store } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import {
  PageShell,
  EmptyState,
  LoadingState,
  ErrorState,
  TABLOID_ACTION_CLASSES,
} from "@/components/tabloide"
import FunctionStoreHero from "./_components/function-store-hero"
import type { FunctionProduct } from "./_components/function-product"

export default function FunctionStorePage() {
  const t = useTranslations("FunctionStore")
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

  // Estados fora da vitrine usam o kit tabloide (mesmo desenho do resto do site).
  if (error || (products && products.length === 0)) {
    return (
      <PageShell rail className="fl-sharp">
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          {error ? (
            <ErrorState
              title={t("storeName", "Loja de Funções")}
              description={t("loadError", "Erro ao carregar a loja. Tente de novo em instantes.")}
              homeHref="/account"
            />
          ) : (
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
      </PageShell>
    )
  }

  if (!products) {
    return (
      <PageShell rail className="fl-sharp">
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <LoadingState label={t("loading", "Carregando…")} />
        </div>
      </PageShell>
    )
  }

  return (
    <main className="fl-sharp">
      <FunctionStoreHero products={products} owned={owned} />
    </main>
  )
}
