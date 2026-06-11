"use client"

import React, { useEffect, useRef } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Props = {
  label?: string
  /** Variante "lg" usa fonte e padding maiores (para uso no headcard). "sm" para uso no dropside. */
  size?: "sm" | "lg"
  className?: string
  /** Conteúdo extra à esquerda do label (ex.: ícone customizado). Se omitido, usa Sparkles. */
  iconNode?: React.ReactNode
}

/**
 * Tag premium de Manifestação — gradiente metálico dourado com highlight diagonal animado.
 * Respeita prefers-reduced-motion. Loop sutil; hover dá scale + glow extra.
 */
export function ManifestationBadge({ label, size = "sm", className, iconNode }: Props) {
  const t = useTranslations("Manifestation")
  const text = label ?? t("badge", "Manifestação")
  const shineRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    if (!shineRef.current) return

    let cancelled = false
    let tween: gsap.core.Tween | null = null

    ;(async () => {
      const { gsap } = await import("gsap")
      if (cancelled || !shineRef.current) return
      gsap.set(shineRef.current, { xPercent: -120 })
      tween = gsap.to(shineRef.current, {
        xPercent: 220,
        duration: 2.8,
        ease: "power2.inOut",
        repeat: -1,
        repeatDelay: 3.2,
      })
    })()

    return () => {
      cancelled = true
      tween?.kill()
    }
  }, [])

  const sizeClasses =
    size === "lg"
      ? "px-3.5 py-1.5 text-[12px] gap-2"
      : "px-2.5 py-1 text-[11px] gap-1.5"

  const iconSize = size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"

  return (
    <span
      className={cn(
        "group/manif relative inline-flex items-center overflow-hidden rounded-full font-semibold tracking-wide text-amber-950 ring-1 ring-amber-200/40 transition-transform duration-300 hover:scale-[1.04]",
        sizeClasses,
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg, #f8d77a 0%, #f5b531 24%, #c98a18 52%, #f3c054 78%, #f8e7a3 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(120,75,0,0.45) inset, 0 6px 18px -8px rgba(242,178,52,0.55), 0 0 0 1px rgba(255,225,160,0.35)",
      }}
    >
      {/* Reflexo diagonal animado */}
      <span
        ref={shineRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12"
        style={{
          background:
            "linear-gradient(110deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.78) 50%, rgba(255,255,255,0) 65%, rgba(255,255,255,0) 100%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Glow externo no hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover/manif:opacity-100"
        style={{
          boxShadow:
            "0 0 22px 4px rgba(255,200,80,0.45), 0 0 8px 2px rgba(255,225,150,0.55)",
        }}
      />
      <span className="relative inline-flex items-center gap-1 drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
        {iconNode ?? <Sparkles className={cn(iconSize, "fill-amber-100")} />}
        <span className={cn("leading-none", size === "lg" ? "" : "")}>
          {text}
        </span>
      </span>
    </span>
  )
}

export default ManifestationBadge
