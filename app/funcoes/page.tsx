"use client"

// Loja de Funções — vitrine fullscreen (layout portado da home do TENKA).
// Produtos vêm do catálogo (admin edita em /administracao/loja-funcoes);
// a posse (owned) vem de /api/users/me/features quando há sessão.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
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

  if (error || (products && products.length === 0)) {
    return (
      <main className="fl-sharp flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-[#0b0804] px-6 text-center text-white">
        <p className="fl-display text-3xl uppercase">{t("storeName", "Loja de Funções")}</p>
        <p className="max-w-md text-sm text-white/70">
          {error
            ? t("loadError", "Erro ao carregar a loja. Tente de novo em instantes.")
            : t("empty", "Nenhuma função à venda no momento.")}
        </p>
        <Link
          href="/account"
          className="inline-flex min-h-[44px] items-center gap-2 border-2 border-white/80 px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/[0.14]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          {t("backToAccount", "Voltar pra minha conta")}
        </Link>
      </main>
    )
  }

  if (!products) {
    return (
      <main
        aria-label={t("loading", "Carregando…")}
        className="fl-sharp min-h-[100svh] w-full"
        style={{ backgroundColor: "#0b0804" }}
      />
    )
  }

  return (
    <main className="fl-sharp">
      <FunctionStoreHero products={products} owned={owned} />
    </main>
  )
}
