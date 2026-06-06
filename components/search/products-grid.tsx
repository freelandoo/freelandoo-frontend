"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Package } from "lucide-react"
import { cn } from "@/lib/utils"

type ProductItem = {
  id_profile_product: number
  id_profile: string
  name: string
  description: string | null
  price_amount: number
  currency: string
  stock_quantity: number
  id_product_category: number | null
  category_name: string | null
  profile_display_name: string | null
  sub_profile_slug: string | null
  estado: string | null
  municipio: string | null
  username: string | null
  thumb_url: string | null
}

interface Props {
  categoryId: number | null
  state: string | null
  regionId: number | null
  q?: string | null
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ProductsGrid({ categoryId, state, regionId, q }: Props) {
  const [items, setItems] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (categoryId) params.set("id_product_category", String(categoryId))
    if (state) params.set("state", state)
    if (regionId) params.set("id_region", String(regionId))
    if (q) params.set("q", q)
    fetch(`/api/search/products?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Falha ${r.status}`)
        const d = await r.json()
        if (!alive) return
        setItems(Array.isArray(d?.items) ? d.items : [])
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [categoryId, state, regionId, q])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }
  if (error) {
    return <div className="px-4 py-10 text-center text-sm text-red-300">{error}</div>
  }
  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div className="rounded-full border border-white/[0.08] bg-white/[0.02] p-3">
          <Package className="h-5 w-5 text-white/55" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-tight text-white">Nenhum produto encontrado</p>
        <p className="mt-1 text-[13px] text-white/55">
          Tente outro filtro ou abra um chamado pra avisar os vendedores.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 gap-3 px-3 pb-8 pt-3 md:max-w-[760px] md:grid-cols-3 lg:max-w-[1080px] lg:grid-cols-4">
      {items.map((p) => {
        const href = p.sub_profile_slug
          ? `/p/${p.sub_profile_slug}`
          : p.username
            ? `/${p.username}`
            : "#"
        return (
          <Link
            key={p.id_profile_product}
            href={href}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all",
              "hover:border-yellow-400/30 hover:bg-white/[0.04] active:scale-[0.98]",
            )}
            style={{ transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
              {p.thumb_url ? (
                <Image
                  src={p.thumb_url}
                  alt={p.name}
                  fill
                  sizes="(max-width:768px) 50vw, 240px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/30">
                  <Package className="h-8 w-8" />
                </div>
              )}
              {p.category_name && (
                <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 backdrop-blur">
                  {p.category_name}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 p-3">
              <p className="line-clamp-2 text-[13px] font-semibold tracking-tight text-white">{p.name}</p>
              <p className="text-[15px] font-bold tracking-tight" style={{ color: "#fbbf24" }}>
                {formatBRL(p.price_amount)}
              </p>
              {(p.municipio || p.estado) && (
                <p className="truncate text-[11px] text-white/45">
                  {p.municipio}{p.municipio && p.estado ? "/" : ""}{p.estado}
                </p>
              )}
              {p.profile_display_name && (
                <p className="mt-1 truncate text-[11px] text-white/60">
                  por <span className="font-medium text-white/80">{p.profile_display_name}</span>
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
