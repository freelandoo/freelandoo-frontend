"use client"

import { useEffect } from "react"
import { AnimatePresence, motion, type Variants } from "framer-motion"
import type { GiftBurst } from "@/lib/lives/use-live-room"

// Presets de animação (espelham o enum do backend: float/burst/rain/pulse/spin/slide).
// Cada um anima um emoji grande + um halo na cor do presente, e se auto-remove.
const DURATIONS: Record<string, number> = {
  float: 2600, burst: 1800, rain: 2800, pulse: 2000, spin: 2200, slide: 2400,
}

function variantsFor(animation: string): Variants {
  switch (animation) {
    case "burst":
      return {
        initial: { scale: 0.2, opacity: 0 },
        animate: { scale: [0.2, 1.6, 1.2], opacity: [0, 1, 0], transition: { duration: 1.8, times: [0, 0.4, 1] } },
      }
    case "rain":
      return {
        initial: { y: -120, opacity: 0 },
        animate: { y: [-120, 40, 220], opacity: [0, 1, 0], transition: { duration: 2.8, ease: "easeIn" } },
      }
    case "pulse":
      return {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: [0.6, 1.25, 0.95, 1.15, 0.9], opacity: [0, 1, 1, 1, 0], transition: { duration: 2 } },
      }
    case "spin":
      return {
        initial: { rotate: -180, scale: 0.4, opacity: 0 },
        animate: { rotate: [-180, 360], scale: [0.4, 1.3, 1], opacity: [0, 1, 0], transition: { duration: 2.2 } },
      }
    case "slide":
      return {
        initial: { x: -160, opacity: 0 },
        animate: { x: [-160, 0, 180], opacity: [0, 1, 0], transition: { duration: 2.4, ease: "easeInOut" } },
      }
    case "float":
    default:
      return {
        initial: { y: 60, scale: 0.7, opacity: 0 },
        animate: { y: [60, -180, -320], scale: [0.7, 1.1, 1], opacity: [0, 1, 0], transition: { duration: 2.6, ease: "easeOut" } },
      }
  }
}

// Espalha horizontalmente para não empilhar tudo no centro.
function offsetFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100
  return h - 50 // -50..49 (%)
}

export function GiftAnimationLayer({
  gifts,
  onDone,
}: {
  gifts: GiftBurst[]
  onDone: (id: string) => void
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        {gifts.map((g) => (
          <GiftItem key={g.id} gift={g} onDone={onDone} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function GiftItem({ gift, onDone }: { gift: GiftBurst; onDone: (id: string) => void }) {
  useEffect(() => {
    const ms = DURATIONS[gift.animation] || 2400
    const t = setTimeout(() => onDone(gift.id), ms + 200)
    return () => clearTimeout(t)
  }, [gift.id, gift.animation, onDone])

  const v = variantsFor(gift.animation)
  const dx = offsetFor(gift.id)

  return (
    <motion.div
      className="absolute bottom-[28%] left-1/2 flex flex-col items-center"
      style={{ x: `calc(-50% + ${dx}px)` }}
      variants={v}
      initial="initial"
      animate="animate"
    >
      <span
        className="text-6xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
        style={{ filter: `drop-shadow(0 0 18px ${gift.color}aa)` }}
      >
        {gift.emoji}
      </span>
      <span
        className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
        style={{ backgroundColor: `${gift.color}cc` }}
      >
        {gift.name}
      </span>
    </motion.div>
  )
}
