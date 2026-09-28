"use client"

// O SELO VERIFICADO (mig 268) — peça única de todas as telas que mostram o nome
// de alguém (cabeçalho do perfil, card do feed, vitrine, ranking).
//
// Desenho (Alex, 2026-09-28): uma ROSETA dourada em 3D, SEM fundo, com um
// check branco grande saltando para fora dela. O que brilha é a PRÓPRIA forma
// — o mesmo gradiente cônico girando do anel de "em alta" (`.fl-heat-spin`,
// que já respeita prefers-reduced-motion), agora preenchendo a roseta inteira
// em vez de só o contorno. O check NÃO brilha e não há glow/drop-shadow
// luminoso em volta.
//
// Como a forma recorta o brilho: a roseta vira MÁSCARA (mask-image com o SVG
// dela), e tudo que está dentro — o gradiente que gira e as duas camadas de
// luz/sombra que dão o volume — só aparece dentro do desenho.
//
// ⚠️ QUEM DECIDE SE A PESSOA TEM O SELO É O BACKEND (`is_verified`, que já
// soma "pagou e está no período" com "é admin"). Esta peça só desenha; nunca
// recalcule a regra aqui.

import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

const GLOW =
  "conic-gradient(from 0deg, #F2B705, #FFD75E 55deg, #FFFDF0 80deg, #FFA53D 105deg, #FF6A00 160deg, #C24A00 250deg, #F2B705 360deg)"

// A roseta (12 ondas), no mesmo viewBox 24×24 do lucide.
const ROSETTE =
  "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
const MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${ROSETTE}' fill='black'/></svg>`,
)}")`
const MASK_STYLE: CSSProperties = {
  WebkitMaskImage: MASK,
  maskImage: MASK,
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
}

const SIZES = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const

interface VerifiedBadgeProps {
  size?: keyof typeof SIZES
  className?: string
}

export function VerifiedBadge({ size = "md", className }: VerifiedBadgeProps) {
  const t = useTranslations("Verified")
  const label = t("badgeLabel", "Perfil verificado")
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("relative inline-block shrink-0 align-middle", SIZES[size], className)}
    >
      {/* A roseta: o brilho que gira, recortado pela forma. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={MASK_STYLE}>
        <span className="fl-heat-spin absolute -inset-[60%] block" style={{ background: GLOW }} />
        {/* Volume: luz no alto-esquerda, sombra no baixo-direita. */}
        <span
          className="absolute inset-0 block"
          style={{
            background:
              "radial-gradient(circle at 30% 26%, rgba(255,255,255,0.55), rgba(255,255,255,0) 46%), radial-gradient(circle at 74% 80%, rgba(110,40,0,0.45), rgba(110,40,0,0) 55%)",
          }}
        />
      </span>
      {/* O check: branco, grande, saltando para fora pela quina de cima. A
          sombra é dura e escura (volume), não luminosa. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute -right-[18%] -top-[26%] h-[108%] w-[108%]"
        style={{ filter: "drop-shadow(1px 1.5px 0 rgba(90,35,0,0.55))" }}
      >
        <path
          d="M5 12.5l4.6 4.6L20 6.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={4.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
