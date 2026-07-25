"use client"

// Anel de "em alta": mesmo mecanismo do anel neon de bees (gradiente cônico
// girando com um facho quase branco + camada desfocada por baixo fazendo o
// glow), em duas cores por posição no dia:
//   - leader → laranja e DOURADO: maior engajamento do dia;
//   - rising → laranja e VERMELHO: até 10% abaixo do líder.
// Nenhum dos dois usa o rosa, que no resto do site significa "esse perfil tem
// bees" — aqui o sinal é do POST, não do perfil.
//
// Diferença de implementação em relação ao anel de bees: lá é framer-motion,
// aqui é keyframe de CSS (`.fl-heat-spin` em globals.css, que respeita
// prefers-reduced-motion) — o feed renderiza dezenas de cards em lista.
//
// Uso: dentro de um pai `relative` e SEM overflow-hidden — o anel vive fora da
// caixa do avatar.

import { cn } from "@/lib/utils"

export type HeatTier = "leader" | "rising"

const GRADIENTS: Record<HeatTier, string> = {
  leader:
    "conic-gradient(from 0deg, #F2B705, #FFD75E 55deg, #FFFDF0 80deg, #FFA53D 105deg, #FF6A00 160deg, #C24A00 250deg, #F2B705 360deg)",
  rising:
    "conic-gradient(from 0deg, #FF6A00, #FF9A3D 55deg, #FFE9D6 80deg, #FF4D2E 105deg, #E11D2E 160deg, #7F0F1C 250deg, #FF6A00 360deg)",
}

interface HeatRingProps {
  tier: HeatTier
  /** Acompanha o formato do avatar embaixo. */
  shape?: "square" | "circle"
}

export function HeatRing({ tier, shape = "square" }: HeatRingProps) {
  const radius = shape === "circle" ? "rounded-full" : ""
  const background = GRADIENTS[tier]
  return (
    <>
      {/* glow */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-[7px] overflow-hidden opacity-80 blur-[6px]",
          radius
        )}
      >
        <span className="fl-heat-spin absolute -inset-[120%] block" style={{ background }} />
      </span>
      {/* anel */}
      <span
        aria-hidden
        className={cn("pointer-events-none absolute -inset-[3px] overflow-hidden", radius)}
      >
        <span className="fl-heat-spin absolute -inset-[120%] block" style={{ background }} />
      </span>
    </>
  )
}
