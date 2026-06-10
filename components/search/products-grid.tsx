"use client"

import { useEffect, useState } from "react"
import { Loader2, Package } from "lucide-react"
import { ProductTile } from "@/components/search/product-tile"

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
  /** Subfiltros por categoria já normalizados (attr_*, price_min/max). */
  extraParams?: Record<string, string>
}

export function ProductsGrid({ categoryId, state, regionId, q, extraParams }: Props) {
  const [items, setItems] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const extraKey = JSON.stringify(extraParams ?? {})

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (categoryId) params.set("id_product_category", String(categoryId))
    if (state) params.set("state", state)
    if (regionId) params.set("id_region", String(regionId))
    if (q) params.set("q", q)
    for (const [k, v] of Object.entries(JSON.parse(extraKey) as Record<string, string>)) {
      params.set(k, v)
    }
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
  }, [categoryId, state, regionId, q, extraKey])

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
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-3 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] lg:max-w-none lg:grid-cols-4">
      {items.map((p) => (
        <ProductTile key={p.id_profile_product} p={p} />
      ))}
    </div>
  )
}
