"use client"

// features/meu-mundo/ui/shop/shop-card.tsx — B5 (2026-11-08): o CARD ÚNICO da Loja.
// As quatro abas (Equipamento, Monstros, Personagens, Comidas e itens) desenham com
// esta peça, dentro do carrossel do kit (que roda pela prateleira em arco do mercado).
// Imagem em cima (item, retrato ou o desenho da categoria), nome, selo, linhas e a
// ação embaixo. Rolagem só vertical dentro do card.

import type { ReactNode } from "react"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { AE, RARITY, type Rarity } from "../kit/aether-tokens"
import { archivo, teko } from "../status/evo-skin"

export interface ShopLine {
  text: string
  tone?: "good" | "bad" | "gold" | "muted"
}

const TONE = { good: AE.good, bad: AE.bad, gold: AE.goldSoft, muted: AE.muted } as const

export function ShopCard({
  img,
  category,
  rarity = "common",
  title,
  tag,
  tagColor,
  badge,
  subtitle,
  lines,
  note,
  portrait = false,
  dim = false,
  children,
}: {
  img?: string | null
  category: ItemCategory
  rarity?: Rarity
  title: string
  /** selo ao lado do nome (raridade, "Seu", "Classe"…) */
  tag?: string
  tagColor?: string
  /** canto da imagem (preço, ×N) */
  badge?: string
  subtitle?: string
  lines?: ShopLine[]
  /** texto pequeno no fim (como conseguir, por que está travado) */
  note?: string
  /** retrato (4:5, preenche o quadro) em vez de miniatura de item */
  portrait?: boolean
  /** ainda não tem / nunca enfrentou: a imagem apagada */
  dim?: boolean
  children?: ReactNode
}) {
  const color = tagColor ?? RARITY[rarity]?.color ?? AE.goldSoft
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      <div className="relative shrink-0" style={{ opacity: dim ? 0.38 : 1, filter: dim ? "grayscale(1)" : undefined }}>
        <ItemImage src={img} category={category} rarity={rarity} alt={title} ratio={portrait ? 16 / 11 : 16 / 8} fit={portrait ? "cover" : "contain"} />
        {badge && (
          <span
            className={`${archivo.className} absolute right-1.5 top-1.5 px-2 py-1 text-[12px] font-bold leading-none`}
            style={{ background: "rgba(12,15,20,0.86)", color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h4 className={`${teko.className} text-[24px] font-semibold uppercase leading-tight`} style={{ color: AE.text }}>
          {title}
        </h4>
        {tag && (
          <span className="shrink-0 px-1.5 py-1 text-[10px] font-bold uppercase" style={{ color, boxShadow: "inset 0 0 0 1px " + color }}>
            {tag}
          </span>
        )}
      </div>
      {subtitle && (
        <p className={`${archivo.className} text-[12px]`} style={{ color: AE.muted }}>
          {subtitle}
        </p>
      )}
      {!!lines?.length && (
        <ul className={`${archivo.className} grid gap-1 text-[13px] font-semibold`}>
          {lines.map((l) => (
            <li key={l.text} style={{ color: TONE[l.tone ?? "gold"] }}>
              {l.text}
            </li>
          ))}
        </ul>
      )}
      {note && (
        <p className={`${archivo.className} text-[12px] leading-snug`} style={{ color: AE.muted }}>
          {note}
        </p>
      )}
      {children && <div className="mt-auto grid gap-2 pt-1">{children}</div>}
    </div>
  )
}
