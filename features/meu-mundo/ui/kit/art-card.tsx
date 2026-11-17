"use client"

// features/meu-mundo/ui/kit/art-card.tsx — 17/11: cartão de item com a ARTE 2:3 de fundo (pedido do Alex).
// A thumbnail da arma (com o selo da classe no canto inferior esquerdo) ocupa o cartão inteiro; nome,
// status e o botão (Comprar, Forjar, Equipar…) ficam POR CIMA, sobre um degradê escuro na metade de baixo.
// Dentro de um carrossel (altura fixa) ele preenche a altura; num painel de altura livre vale o 2:3.
// Se a imagem falhar, fica o desenho da categoria (mesmo comportamento do ItemImage).

import type { ReactNode } from "react"
import { ItemImage, type ItemCategory } from "./item-image"
import { AE, type Rank, type Rarity } from "./aether-tokens"

export function ArtCard({
  src,
  category,
  rarity,
  alt,
  badge,
  dim = false,
  children,
}: {
  src: string
  category: ItemCategory
  rarity?: Rank | Rarity
  alt: string
  /** canto de cima da arte (preço, ×N) */
  badge?: ReactNode
  dim?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ aspectRatio: "2 / 3", background: AE.well }}>
      <div className="absolute inset-0" style={{ opacity: dim ? 0.38 : 1, filter: dim ? "grayscale(1)" : undefined }}>
        <ItemImage src={src} category={category} rarity={rarity} alt={alt} fill fit="cover" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(8,10,14,0) 46%, rgba(8,10,14,0.7) 66%, rgba(8,10,14,0.93) 84%, rgba(8,10,14,0.97) 100%)" }}
      />
      {badge}
      <div
        className="absolute inset-0 flex flex-col gap-2 overflow-y-auto overscroll-contain p-3"
        style={{ textShadow: "0 1px 2px #000, 0 0 8px rgba(0,0,0,0.85)" }}
      >
        <div aria-hidden className="flex-1" style={{ minHeight: "42%" }} />
        {children}
      </div>
    </div>
  )
}
