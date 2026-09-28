"use client"

// O SELO VERIFICADO (mig 268) — peça única de todas as telas que mostram o nome
// de alguém (cabeçalho do perfil, card do feed, vitrine).
//
// Decisão do Alex: "o nosso selo brilha como as fotos de perfis de vídeos
// virais". O brilho é o MESMO do anel de "em alta" do feed (`HeatRing`, tier
// leader): gradiente cônico dourado girando por `.fl-heat-spin` (CSS, que já
// respeita prefers-reduced-motion — parado, o brilho continua) com uma camada
// desfocada por baixo fazendo o glow.
//
// ⚠️ QUEM DECIDE SE A PESSOA TEM O SELO É O BACKEND (`is_verified`, que já
// soma "pagou e está no período" com "é admin"). Esta peça só desenha; nunca
// recalcule a regra aqui.
//
// Sem cantos arredondados (regra do tabloide): o selo é um quadrado.

import { BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

const GLOW =
  "conic-gradient(from 0deg, #F2B705, #FFD75E 55deg, #FFFDF0 80deg, #FFA53D 105deg, #FF6A00 160deg, #C24A00 250deg, #F2B705 360deg)"

const SIZES = {
  sm: { box: "h-4 w-4", icon: "h-3 w-3" },
  md: { box: "h-5 w-5", icon: "h-3.5 w-3.5" },
  lg: { box: "h-6 w-6", icon: "h-4 w-4" },
} as const

interface VerifiedBadgeProps {
  size?: keyof typeof SIZES
  className?: string
}

export function VerifiedBadge({ size = "md", className }: VerifiedBadgeProps) {
  const t = useTranslations("Verified")
  const s = SIZES[size]
  const label = t("badgeLabel", "Perfil verificado")
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("relative inline-flex shrink-0 items-center justify-center align-middle", s.box, className)}
    >
      {/* glow */}
      <span aria-hidden className="pointer-events-none absolute -inset-[4px] overflow-hidden opacity-80 blur-[4px]">
        <span className="fl-heat-spin absolute -inset-[120%] block" style={{ background: GLOW }} />
      </span>
      {/* moldura que gira */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="fl-heat-spin absolute -inset-[120%] block" style={{ background: GLOW }} />
      </span>
      {/* miolo */}
      <span className="relative flex h-[calc(100%-3px)] w-[calc(100%-3px)] items-center justify-center bg-[#0B0B0D]">
        <BadgeCheck className={cn(s.icon, "text-[#F2B705]")} strokeWidth={2.6} />
      </span>
    </span>
  )
}
