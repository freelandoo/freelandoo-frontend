"use client"

// Anel de "em alta": mesmo mecanismo do anel neon de bees (gradiente cônico
// girando com um facho quase branco + camada desfocada por baixo fazendo o
// glow), mas em dourado/laranja — pra ler como "esse post está pegando fogo" e
// não como "esse perfil tem bees", que é o que o rosa significa no resto do site.
//
// Diferença de implementação: o anel de bees usa framer-motion, mas o feed
// renderiza dezenas de cards em lista, então aqui a rotação é keyframe de CSS
// (`.fl-heat-spin` em globals.css, que também respeita prefers-reduced-motion).
//
// Uso: colocar dentro de um pai `relative` e DESLIGAR o overflow-hidden dele —
// o anel vive fora da caixa do avatar.

import { cn } from "@/lib/utils"

const HEAT_GRADIENT =
  "conic-gradient(from 0deg, #F2B705, #FFD75E 55deg, #FFFDF0 80deg, #FFA53D 105deg, #FF6A00 160deg, #C24A00 250deg, #F2B705 360deg)"

interface HeatRingProps {
  /** Acompanha o formato do avatar embaixo. */
  shape?: "square" | "circle"
}

export function HeatRing({ shape = "square" }: HeatRingProps) {
  const radius = shape === "circle" ? "rounded-full" : ""
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
        <span
          className="fl-heat-spin absolute -inset-[120%] block"
          style={{ background: HEAT_GRADIENT }}
        />
      </span>
      {/* anel */}
      <span
        aria-hidden
        className={cn("pointer-events-none absolute -inset-[3px] overflow-hidden", radius)}
      >
        <span
          className="fl-heat-spin absolute -inset-[120%] block"
          style={{ background: HEAT_GRADIENT }}
        />
      </span>
    </>
  )
}
