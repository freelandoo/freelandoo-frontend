"use client"

// CHEGADA NO FEED (Feed Interativo) — o post lançado "cai voando" e encaixa.
//
//   0 ms ....... entra por cima, rápido, esticado na vertical (o "borrão" de
//                movimento é escala — transform puro, nada de filter)
//   ~600 ms .... desacelera e encaixa com uma mola curta; carimbo seco (som)
//   0–2,6 s .... contorno e sombra dura brilham em amarelo #F2B705 e apagam
//   sempre ..... etiqueta discreta "Lançado por @fulano"
//
// Variante `kind`: o baú cai mais pesado; a cápsula entra devagar, sem
// esticar, com brilho mais suave. prefers-reduced-motion = só aparece.

import { memo, useEffect, useRef, type ReactNode } from "react"
import { motion } from "framer-motion"
import { Clock, Gift, Send } from "lucide-react"
import { fx, prefersReducedMotion } from "@/lib/feed-fx"
import type { DropKind, FxUser } from "@/lib/feed-fx/api"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface Props {
  dropId: string
  kind: DropKind
  sender: FxUser
  /** Baú de doação: etiqueta própria (e "anônima" sem @). */
  donation?: boolean
  onArrived?: (dropId: string) => void
  children: ReactNode
}

const ENTER = {
  throw: { y: -360, scaleY: 1.16, scaleX: 0.95, spring: { type: "spring" as const, stiffness: 420, damping: 27, mass: 0.85 } },
  gift: { y: -280, scaleY: 1.06, scaleX: 1, spring: { type: "spring" as const, stiffness: 520, damping: 17, mass: 1.2 } },
  capsule: { y: -90, scaleY: 1, scaleX: 0.97, spring: { type: "spring" as const, stiffness: 140, damping: 22, mass: 1 } },
}

function DropArrivalImpl({ dropId, kind, sender, donation, onArrived, children }: Props) {
  const t = useTranslations("FeedFx")
  const done = useRef(false)
  const reduced = prefersReducedMotion()
  const e = ENTER[kind]

  useEffect(() => {
    if (kind === "throw") fx("chegar", "chegar")
    else if (kind === "gift") fx("bau-cai", "bau")
    else fx("capsula", "capsula")
    const glow = window.setTimeout(() => {
      if (kind !== "gift") fx("brilho", undefined, { gain: kind === "capsule" ? 0.6 : 1 })
    }, reduced ? 0 : kind === "capsule" ? 700 : 420)
    return () => window.clearTimeout(glow)
    // só na montagem: cada chegada toca uma vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label = donation
    ? sender.username
      ? t("donationFrom", "Doação de @{u}")
      : t("donationAnon", "Doação anônima")
    : kind === "gift"
      ? t("giftFrom", "Presente de @{u}")
      : kind === "capsule"
        ? t("capsuleFrom", "Mensagem programada de @{u}")
        : t("thrownBy", "Lançado por @{u}")
  const Icon = kind === "gift" ? Gift : kind === "capsule" ? Clock : Send
  const glowPeak = kind === "capsule" ? 0.55 : 1

  return (
    <motion.div
      className="relative"
      initial={reduced ? { opacity: 0 } : { y: e.y, scaleY: e.scaleY, scaleX: e.scaleX, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { y: 0, scaleY: 1, scaleX: 1, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0.2 }
          : { y: e.spring, scaleY: e.spring, scaleX: e.spring, opacity: { duration: kind === "capsule" ? 0.5 : 0.12 } }
      }
      style={{ transformOrigin: "50% 0%" }}
      onAnimationComplete={() => {
        if (done.current) return
        done.current = true
        onArrived?.(dropId)
      }}
    >
      {children}

      {/* contorno + sombra dura amarelos que brilham e apagam */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] border-[3px] border-[#F2B705] shadow-[0_0_0_2px_#000,8px_8px_0_#F2B705]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, glowPeak, glowPeak, 0] }}
        transition={{ duration: kind === "capsule" ? 3.2 : 2.6, times: [0, 0.12, 0.45, 1], delay: reduced ? 0 : 0.18 }}
      />
      {/* faixa de brilho que atravessa o card uma vez */}
      {!reduced && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
          <motion.div
            className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#F2B705]/35 to-transparent"
            initial={{ x: "0%" }}
            animate={{ x: "420%" }}
            transition={{ duration: kind === "capsule" ? 1.6 : 0.9, delay: kind === "capsule" ? 0.7 : 0.45, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      )}
      {/* etiqueta de quem mandou */}
      <motion.div
        className="pointer-events-none absolute left-2 top-14 z-[4] flex max-w-[80%] items-center gap-1.5 border-2 border-black bg-[#F2B705] py-0.5 pl-0.5 pr-2 text-[11px] font-black text-black shadow-[3px_3px_0_#000]"
        initial={reduced ? { opacity: 0 } : { x: -40, opacity: 0, rotate: -6 }}
        animate={{ x: 0, opacity: 1, rotate: -2 }}
        transition={{ type: "spring", stiffness: 500, damping: 24, delay: reduced ? 0 : 0.35 }}
      >
        {sender.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sender.avatar_url} alt="" className="h-5 w-5 rounded-full border border-black object-cover" />
        ) : (
          <Icon className="ml-1 h-3.5 w-3.5" />
        )}
        <span className="truncate">{label.replace("{u}", sender.username || "—")}</span>
      </motion.div>
    </motion.div>
  )
}

export const DropArrival = memo(DropArrivalImpl)
