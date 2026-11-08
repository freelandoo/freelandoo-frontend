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

// ── Anel do PATAMAR DE ALCANCE (regra do Alex, 2026-11-08) ─────────────────
// O post e o bee sobem cidade → área → região → estado → Brasil (feedReach no
// back) e a cor mostra para TODO MUNDO até onde chegou: na cidade, sem cor;
// área = prata brilhante; região = azul elétrico; estado = roxo; Brasil = o
// colorido (viral). Mesmo mecanismo do anel de "em alta" (que vence quando os
// dois valem: é o pico do dia).
export type ReachTier = 1 | 2 | 3 | 4

const REACH_GRADIENTS: Record<ReachTier, string> = {
  1: "conic-gradient(from 0deg, #8E979F, #DDE3E8 55deg, #FFFFFF 80deg, #B7C0C8 105deg, #6B737B 180deg, #C9D0D6 270deg, #8E979F 360deg)",
  2: "conic-gradient(from 0deg, #0A6CFF, #5CC8FF 55deg, #F0FBFF 80deg, #2E9BFF 105deg, #0047B3 180deg, #38B6FF 270deg, #0A6CFF 360deg)",
  3: "conic-gradient(from 0deg, #8A2BE2, #C77DFF 55deg, #FBF2FF 80deg, #A64DFF 105deg, #5A0FA0 180deg, #E04DFF 270deg, #8A2BE2 360deg)",
  4: "conic-gradient(from 0deg, #FF3B30, #FF9500 50deg, #FFCC00 100deg, #34C759 150deg, #00C7FF 200deg, #5856D6 250deg, #FF2D92 305deg, #FF3B30 360deg)",
}

export function reachTierOf(v: unknown): ReachTier | null {
  const n = Number(v)
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : null
}

export function ReachRing({ tier, shape = "square" }: { tier: ReachTier; shape?: "square" | "circle" }) {
  const radius = shape === "circle" ? "rounded-full" : ""
  const background = REACH_GRADIENTS[tier]
  return (
    <>
      <span aria-hidden className={cn("pointer-events-none absolute -inset-[7px] overflow-hidden blur-[6px]", tier === 1 ? "opacity-60" : "opacity-80", radius)}>
        <span className="fl-heat-spin absolute -inset-[120%] block" style={{ background }} />
      </span>
      <span aria-hidden className={cn("pointer-events-none absolute -inset-[3px] overflow-hidden", radius)}>
        <span className="fl-heat-spin absolute -inset-[120%] block" style={{ background }} />
      </span>
    </>
  )
}
