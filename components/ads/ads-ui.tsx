"use client"

// Peças do Freelandoo Ads (pele `.fa`, ver app/(header-only)/impulsionar/ads.css).

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { animate, motion } from "framer-motion"
import { PageBackLink } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import type { AdStatus, AdTier } from "@/lib/ads-api"

export function useMoney() {
  const locale = useLocale()
  return useMemo(() => {
    const f = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" })
    const n = new Intl.NumberFormat(locale)
    return { brl: (c: number) => f.format((Number(c) || 0) / 100), num: (v: number) => n.format(Math.round(Number(v) || 0)) }
  }, [locale])
}

/** Número que corre até o valor (só o texto muda — placar). */
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const ctl = animate(0, value, { duration: 1.1, ease: [0.25, 1, 0.5, 1], onUpdate: (x) => setV(x) })
    return () => ctl.stop()
  }, [value])
  return <>{format(v)}</>
}

export function AdsShell({ children, back = "/feed" }: { children: ReactNode; back?: string }) {
  const t = useTranslations("Ads")
  return (
    <div className="fa fa-grid fa-noise">
      <div className="relative z-[1] mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <PageBackLink href={back} />
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="fa-live-dot" aria-hidden />
            <span className="fa-label" style={{ color: "var(--fa-y)" }}>
              {t("brand", "Freelandoo Ads")}
            </span>
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

const STATUS_STYLE: Record<AdStatus, string> = {
  active: "fa-sticker fa-sticker-y",
  paused: "fa-sticker",
  pending_payment: "fa-sticker fa-sticker-dark",
  completed: "fa-sticker fa-sticker-dark",
  canceled: "fa-sticker fa-sticker-dark",
  expired: "fa-sticker fa-sticker-dark",
  refunded: "fa-sticker fa-sticker-dark",
  rejected: "fa-sticker fa-sticker-dark",
}

export function StatusSticker({ status }: { status: AdStatus }) {
  const t = useTranslations("Ads")
  const label: Record<AdStatus, string> = {
    active: t("stActive", "No ar"),
    paused: t("stPaused", "Pausada"),
    pending_payment: t("stPending", "Esperando pagamento"),
    completed: t("stCompleted", "Concluída"),
    canceled: t("stCanceled", "Cancelada"),
    expired: t("stExpired", "Não paga"),
    refunded: t("stRefunded", "Estornada"),
    rejected: t("stRejected", "Post saiu do ar"),
  }
  return (
    <span className={STATUS_STYLE[status]}>
      {status === "active" && <span className="fa-live-dot" style={{ background: "var(--fa-bg)" }} aria-hidden />}
      {label[status]}
    </span>
  )
}

export function useTierLabel() {
  const t = useTranslations("Ads")
  return (tier: AdTier) =>
    ({
      cidade: t("tierCity", "Cidade"),
      regiao: t("tierRegion", "Região"),
      estado: t("tierState", "Estado"),
      brasil: t("tierBrasil", "Brasil"),
    })[tier]
}

/** Barra de entrega: visualizações / meta (só scaleX). */
export function DeliveryBar({ value, goal }: { value: number; goal: number }) {
  const p = goal > 0 ? Math.min(1, value / goal) : 0
  return (
    <div className="relative h-2 w-full overflow-hidden" style={{ background: "var(--fa-surface-3)" }}>
      <motion.div
        className="absolute inset-y-0 left-0 w-full origin-left"
        style={{ background: "var(--fa-y)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: p }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

/** Faixa contínua de números (pequena). */
export function Marquee({ items }: { items: string[] }) {
  const row = items.join("   ✦   ")
  return (
    <div className="fa-marquee border-y py-2" style={{ borderColor: "var(--fa-line)" }} aria-hidden>
      <div className="fa-marquee-track">
        <span className="fa-mono px-4 text-xs uppercase" style={{ color: "var(--fa-y)" }}>
          {row}   ✦   {row}   ✦
        </span>
      </div>
    </div>
  )
}

/** O "alvo" do degrau: quadrados concêntricos que acendem até o degrau. */
export function TierRings({ level, size = 64 }: { level: number; size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden>
      {[3, 2, 1, 0].map((i) => {
        const s = ((i + 1) / 4) * size
        const on = i <= level
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{
              width: s,
              height: s,
              left: (size - s) / 2,
              top: (size - s) / 2,
              border: `2px solid ${on ? "var(--fa-y)" : "var(--fa-line-strong)"}`,
              background: i === 0 && on ? "var(--fa-y)" : "transparent",
            }}
            initial={false}
            animate={{ scale: on ? 1 : 0.94, opacity: on ? 1 : 0.5 }}
            transition={{ type: "spring", stiffness: 420, damping: 22, delay: on ? i * 0.05 : 0 }}
          />
        )
      })}
    </div>
  )
}
