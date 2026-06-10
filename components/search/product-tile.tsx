"use client"

// Tile de produto edge-to-edge para a vitrine do /search — espelha o
// FreelancerTile (full-bleed, overlay inferior, sem borda/rounded/margem).
// aspect-[3/4]: foto de produto é quadrada; 3:4 preserva o produto e deixa
// espaço pro overlay (9:16 cortaria demais).

import Image from "next/image"
import Link from "next/link"
import { Package } from "lucide-react"
import { useTaxonomy } from "@/lib/i18n/taxonomy"

export type ProductTileItem = {
  id_profile_product: number
  name: string
  price_amount: number
  category_name: string | null
  profile_display_name: string | null
  sub_profile_slug: string | null
  username: string | null
  estado: string | null
  municipio: string | null
  thumb_url: string | null
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ProductTile({ p }: { p: ProductTileItem }) {
  const tx = useTaxonomy()
  const href = p.sub_profile_slug ? `/p/${p.sub_profile_slug}` : p.username ? `/${p.username}` : "#"
  return (
    <Link
      href={href}
      className="group relative block aspect-[3/4] w-full overflow-hidden bg-zinc-900 transition-transform duration-300 active:scale-[0.98]"
    >
      {p.thumb_url ? (
        <Image
          src={p.thumb_url}
          alt={p.name}
          fill
          sizes="(max-width: 768px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/25">
          <Package className="h-10 w-10" />
        </div>
      )}

      {p.category_name && (
        <span className="absolute left-2 top-2 z-10 bg-[#0B0B0D]/80 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#F1EDE2]">
          {tx.productCategory(null, p.category_name)}
        </span>
      )}

      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-0.5 p-3">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]">
          {p.name}
        </h3>
        <p className="text-[15px] font-black tracking-tight text-[#F2B705] drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {formatBRL(p.price_amount)}
        </p>
        <p className="line-clamp-1 text-[10px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {p.municipio}{p.municipio && p.estado ? ", " : ""}{p.estado}
          {p.profile_display_name ? ` · ${p.profile_display_name}` : ""}
        </p>
      </div>
    </Link>
  )
}
