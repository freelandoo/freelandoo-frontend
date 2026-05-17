"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Package } from "lucide-react"
import type { ProfileProduct } from "@/components/profile/profile-product-edit-modal"

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
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </section>
    )
  }

  if (state === "error") {
    return (
      <section id="public-products-section" className="mb-20 scroll-mt-24">
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar a loja agora.
          </p>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section id="public-products-section" className="mb-20 scroll-mt-24">
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Nenhum produto disponível na loja no momento.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="public-products-section" className="mb-20 scroll-mt-24">
      <ul className="-mx-4 grid grid-cols-3 items-stretch gap-px md:mx-0">
        {products.map((p) => {
          const img = getCoverUrl(p)
          const { integer, cents } = formatPriceParts(p.price_amount)
          const desc = p.description?.trim()
          const outOfStock = p.stock_quantity <= 0

          return (
            <li
              key={p.id_profile_product}
              className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#121212] text-left"
            >
              <Link
                href={`/p/${profileId}/produto/${p.id_profile_product}`}
                className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 bg-zinc-900">
                  {outOfStock && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-zinc-700/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-100">
                      Esgotado
                    </span>
                  )}
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <Package className="h-11 w-11 text-zinc-600/90 sm:h-12 sm:w-12" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
                  <h3 className="truncate text-xs font-bold leading-snug text-white md:text-sm">{p.name}</h3>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-zinc-300 md:text-[11px]">{desc}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto shrink-0">
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-white tabular-nums md:text-xl">
                        R$ {integer}
                        <span className="align-top text-[10px] font-semibold text-white/95 md:text-xs">,{cents}</span>
                      </p>
                      <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-primary md:px-3 md:text-[10px]">
                        Ver
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
