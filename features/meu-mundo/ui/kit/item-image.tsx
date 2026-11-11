"use client"

// features/meu-mundo/ui/kit/item-image.tsx — mm3d-59: TODO item tem área de imagem.
//
// O espaço é reservado antes de carregar (proporção fixa, sem salto de layout).
// Sem imagem, carregando ou com falha: o PLACEHOLDER desenhado da categoria
// (vetor próprio, sem rede) — nunca card vazio nem imagem quebrada. Trocar o
// placeholder por arte definitiva = passar `src`; a composição do card não muda.
// Nome, raridade, quantidade e preço ficam FORA da arte (texto do card).

import { useState, type ReactNode } from "react"
import { AE, RARITY, type Rarity } from "./aether-tokens"

export type ItemCategory =
  | "food"
  | "drink"
  | "health"
  | "energy"
  | "weapon"
  | "armor"
  | "accessory"
  | "material"
  | "recipe"
  | "quest"
  | "cosmetic"
  | "skin"
  | "vehicle"
  | "house"
  /** mm3d-60k: moedas do jogo (drop de luta/minijogo). */
  | "coins"
  /** Trilha E1: categorias novas do catálogo. */
  | "offhand"
  | "relic"
  | "fragment"
  | "rune"
  | "consumable"
  | "currency"

/** Desenho de cada categoria (viewBox 64×64, traço de latão sobre o poço). */
const ART: Record<ItemCategory, ReactNode> = {
  food: (
    <>
      <path d="M12 38h40a20 14 0 0 1-40 0z" />
      <path d="M22 30c0-6 4-8 4-14M32 30c0-6 4-8 4-14M42 30c0-6 4-8 4-14" />
    </>
  ),
  drink: (
    <>
      <path d="M20 14h24l-4 38H24z" />
      <path d="M22 26h20" />
    </>
  ),
  health: (
    <>
      <rect x="14" y="14" width="36" height="36" />
      <path d="M32 22v20M22 32h20" />
    </>
  ),
  energy: <path d="M36 8 18 36h12l-4 20 20-30H34z" />,
  weapon: (
    <>
      <path d="M46 8 22 40l2 2 32-24z" />
      <path d="M18 38l8 8M14 50l8-8" />
    </>
  ),
  armor: <path d="M32 8 12 16v14c0 14 10 22 20 26 10-4 20-12 20-26V16z" />,
  accessory: (
    <>
      <circle cx="32" cy="36" r="14" />
      <path d="M32 22V10M26 10h12M32 36l6-6" />
    </>
  ),
  material: (
    <>
      <path d="M32 8 52 20v24L32 56 12 44V20z" />
      <path d="M12 20l20 12 20-12M32 32v24" />
    </>
  ),
  recipe: (
    <>
      <path d="M16 10h26l8 8v36H16z" />
      <path d="M22 26h20M22 34h20M22 42h12" />
    </>
  ),
  quest: (
    <>
      <path d="M32 6 40 24l18 2-14 12 4 18-16-10-16 10 4-18L6 26l18-2z" />
    </>
  ),
  cosmetic: (
    <>
      <path d="M14 50 38 26l6 6-24 24z" />
      <path d="M38 26c4-10 12-14 16-12-2 4-6 12-10 18" />
    </>
  ),
  skin: (
    <>
      <circle cx="32" cy="18" r="9" />
      <path d="M14 56c2-14 10-22 18-22s16 8 18 22" />
    </>
  ),
  vehicle: (
    <>
      <path d="M8 40l6-14h36l6 14v8H8z" />
      <circle cx="20" cy="48" r="5" />
      <circle cx="44" cy="48" r="5" />
    </>
  ),
  house: (
    <>
      <path d="M10 30 32 12l22 18v24H10z" />
      <path d="M26 54V40h12v14" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="26" cy="40" rx="16" ry="6" />
      <path d="M10 40v6c0 3.3 7.2 6 16 6s16-2.7 16-6v-6" />
      <circle cx="38" cy="24" r="14" />
      <circle cx="38" cy="24" r="9" />
      <path d="M38 18v12" />
    </>
  ),
  // ── Trilha E1 ──
  offhand: (
    <>
      <path d="M20 10h24v20c0 12-6 20-12 24-6-4-12-12-12-24z" />
      <path d="M32 18v26M24 28h16" />
    </>
  ),
  relic: (
    <>
      <path d="M32 6 44 22 32 58 20 22z" />
      <path d="M20 22h24M32 6v52" />
      <circle cx="32" cy="22" r="4" />
    </>
  ),
  fragment: (
    <>
      <path d="M14 20 30 10l6 14-14 10z" />
      <path d="M36 30 52 26l-4 18-14-2z" />
      <path d="M20 42l12 4-6 10-10-6z" />
    </>
  ),
  rune: (
    <>
      <path d="M18 8h28l6 24-6 24H18l-6-24z" />
      <path d="M32 18v28M24 24l16 16M40 24 24 40" />
    </>
  ),
  consumable: (
    <>
      <path d="M26 8h12v10l10 16v16a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V34l10-16z" />
      <path d="M18 38h28" />
    </>
  ),
  currency: (
    <>
      <path d="M12 14h40v36H12z" />
      <circle cx="32" cy="32" r="9" />
      <path d="M12 22h6M46 22h6M12 42h6M46 42h6" />
    </>
  ),
}

export function ItemImage({
  src,
  category,
  rarity = "common",
  alt,
  ratio = 1,
  size,
  fit = "contain",
}: {
  src?: string | null
  category: ItemCategory
  rarity?: Rarity
  alt: string
  /** largura/altura do quadro (1 = quadrado). */
  ratio?: number
  /** px fixo da largura (sem = 100% do pai). */
  size?: number
  /** B5: "cover" preenche o quadro (retratos); padrão "contain" (itens). */
  fit?: "contain" | "cover"
}) {
  const [state, setState] = useState<"loading" | "ok" | "fail">(src ? "loading" : "fail")
  const [shownSrc, setShownSrc] = useState(src)
  // trocou o src: recomeça o carregamento (padrão de estado derivado, sem efeito)
  if (src !== shownSrc) {
    setShownSrc(src)
    setState(src ? "loading" : "fail")
  }
  const tone = RARITY[rarity]?.color || AE.brass
  const showArt = state !== "ok"
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: size ?? "100%",
        aspectRatio: String(ratio),
        background: `radial-gradient(70% 70% at 50% 40%, ${AE.steelHi} 0%, ${AE.well} 100%)`,
        boxShadow: `inset 0 0 0 1px ${AE.brassLine}`,
      }}
    >
      {showArt && (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={alt}
          className="absolute inset-0 m-auto h-[62%] w-[62%]"
          fill="none"
          stroke={tone}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${tone}55)` }}
        >
          {ART[category] ?? ART.material}
        </svg>
      )}
      {src && state !== "fail" && (
        // URL de catálogo do jogo; <img> por causa do custo do otimizador (regra 4)
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setState("ok")}
          onError={() => setState("fail")}
          className={`absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover object-top" : "object-contain"}`}
          style={{ visibility: state === "ok" ? "visible" : "hidden" }}
        />
      )}
    </div>
  )
}
