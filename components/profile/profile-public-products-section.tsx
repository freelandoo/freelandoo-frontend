"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package } from "lucide-react"
import type { ProfileProduct } from "@/components/profile/profile-product-edit-modal"
import { EmptyState, LoadingState } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface ProfilePublicProductsSectionProps {
  profileId: string
}

function formatPriceParts(cents: number) {
  const safe = Math.max(0, Math.round(Number.isFinite(cents) ? cents : 0))
  const intPart = Math.floor(safe / 100)
  const frac = safe % 100
  return {
    integer: intPart.toLocaleString("pt-BR"),
    cents: frac.toString().padStart(2, "0"),
  }
}

function getCoverUrl(product: ProfileProduct) {
  const media = product.media || []
  const cover =
    media.find((m) => m.media_type === "image" || m.mime_type?.startsWith("image/")) ||
    media[0]
  return cover?.url || cover?.media_url || cover?.thumbnail_url || ""
}

export function ProfilePublicProductsSection({ profileId }: ProfilePublicProductsSectionProps) {
  const t = useTranslations("Profile")
  const [products, setProducts] = useState<ProfileProduct[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState("loading")
      try {
        const res = await fetch(`/api/public/profile/${profileId}/products`)
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(d?.error || "fail")
        setProducts((d.products || []) as ProfileProduct[])
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [profileId])

  if (state === "loading") {
    return (
      <section id="public-products-section" className="mb-20 scroll-mt-24">
        <LoadingState label={t("loadingShop", "Carregando loja…")} />
      </section>
    )
  }

  if (state === "error") {
    return (
      <section id="public-products-section" className="mb-20 scroll-mt-24">
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={t("shopUnavailable", "Loja indisponível")}
          description={t("shopUnavailableDesc", "Não foi possível carregar a loja agora.")}
        />
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section id="public-products-section" className="mb-20 scroll-mt-24">
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={t("shopEmpty", "Loja vazia")}
          description={t("shopEmptyDesc", "Nenhum produto disponível na loja no momento.")}
        />
      </section>
    )
  }

  return (
    <section id="public-products-section" className="mb-20 scroll-mt-24">
      <ul className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3">
        {products.map((p) => {
          const img = getCoverUrl(p)
          const { integer, cents } = formatPriceParts(p.price_amount)
          const desc = p.description?.trim()
          const outOfStock = p.stock_quantity <= 0

          return (
            <li
              key={p.id_profile_product}
              className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-left shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]"
            >
              <Link
                href={`/p/${profileId}/produto/${p.id_profile_product}`}
                className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 border-b-2 border-[#0B0B0D] bg-[#1d1810]">
                  {outOfStock && (
                    <span className="absolute left-2 top-2 z-10 rounded-full border border-[#0B0B0D] bg-[#0B0B0D]/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F1EDE2]">
                      {t("outOfStock", "Esgotado")}
                    </span>
                  )}
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2212] to-[#141009]">
                      <Package className="h-11 w-11 text-[#F2B705]/40 sm:h-12 sm:w-12" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
                  <h3 className="truncate text-xs font-bold leading-snug text-[#0B0B0D] md:text-sm">{p.name}</h3>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-[#5b554b] md:text-[11px]">{desc}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto shrink-0">
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-[#0B0B0D] tabular-nums md:text-xl">
                        R$ {integer}
                        <span className="align-top text-[10px] font-semibold text-[#0B0B0D]/75 md:text-xs">,{cents}</span>
                      </p>
                      <span className="shrink-0 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-[#1A1505] md:px-3 md:text-[10px]">
                        {t("view", "Ver")}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
