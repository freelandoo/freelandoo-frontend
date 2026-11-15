"use client"

// Peças visuais do Feed Interativo: o BAÚ (desenhado em CSS, tampa que abre em
// 3D), a FIGURINHA, a explosão de PARTÍCULAS e as REAÇÕES surpresa. Tudo em
// transform/opacity, dentro do card (nada do tamanho da janela — regra 7).
// Aleatório é determinístico (semente pelo id), então o render é puro.

import { memo, useMemo } from "react"
import { motion } from "framer-motion"
import { Heart } from "lucide-react"
import { CHEST_BY_ID, RARITY_COLOR, REACTIONS, STICKER_BY_ID, type Reaction } from "@/lib/feed-fx/gifts"

/** PRNG pequeno (mulberry32) com semente de texto. */
export function seeded(seedText: string) {
  let h = 1779033703 ^ seedText.length
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Baú ───────────────────────────────────────────────────────────────────
export const ChestArt = memo(function ChestArt({
  chest,
  open,
  shake,
  size = 1,
}: {
  chest: string
  open: boolean
  shake?: boolean
  size?: number
}) {
  const c = CHEST_BY_ID[chest] || CHEST_BY_ID.madeira
  const W = 150 * size
  const H = 118 * size
  return (
    <motion.div
      className="relative"
      style={{ width: W, height: H, perspective: 500 * size }}
      animate={shake ? { rotate: [0, -4, 4, -3, 3, 0], y: [0, -4, 0, -2, 0] } : { rotate: 0, y: 0 }}
      transition={shake ? { duration: 0.6, repeat: Infinity, repeatDelay: 1.4 } : { duration: 0.2 }}
    >
      {/* brilho atrás (só opacidade/escala) */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -ml-[60%] -mt-[60%] h-[120%] w-[120%] rounded-full"
        style={{ background: `radial-gradient(circle, ${c.glow}88 0%, ${c.glow}00 62%)` }}
        animate={{ opacity: open ? [0.6, 1, 0.8] : [0.25, 0.55, 0.25], scale: open ? 1.35 : [0.95, 1.05, 0.95] }}
        transition={{ duration: open ? 0.6 : 2.2, repeat: open ? 0 : Infinity }}
      />
      {/* corpo */}
      <div
        className="absolute inset-x-0 bottom-0 border-[3px] border-black shadow-[6px_6px_0_#000]"
        style={{ height: H * 0.56, background: c.body }}
      >
        <div className="absolute inset-y-0 left-[18%] w-[9%] border-x-2 border-black" style={{ background: c.band }} />
        <div className="absolute inset-y-0 right-[18%] w-[9%] border-x-2 border-black" style={{ background: c.band }} />
        <div
          className="absolute left-1/2 top-0 -ml-[9%] h-[42%] w-[18%] border-[3px] border-black"
          style={{ background: "#F2B705" }}
        />
      </div>
      {/* tampa */}
      <motion.div
        className="absolute inset-x-0 border-[3px] border-black"
        style={{ top: H * 0.06, height: H * 0.4, background: c.body, transformOrigin: "50% 0%", zIndex: 2 }}
        initial={false}
        animate={open ? { rotateX: 118, y: -H * 0.08 } : { rotateX: 0, y: 0 }}
        transition={open ? { type: "spring", stiffness: 260, damping: 14 } : { duration: 0.2 }}
      >
        <div className="absolute inset-y-0 left-[18%] w-[9%] border-x-2 border-black" style={{ background: c.band }} />
        <div className="absolute inset-y-0 right-[18%] w-[9%] border-x-2 border-black" style={{ background: c.band }} />
      </motion.div>
    </motion.div>
  )
})

// ── Figurinha ─────────────────────────────────────────────────────────────
export const StickerBadge = memo(function StickerBadge({
  id,
  size = 72,
  label,
}: {
  id: string
  size?: number
  label?: string
}) {
  const s = STICKER_BY_ID[id]
  if (!s) return null
  const Icon = s.icon
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0_#000]"
        style={{ width: size, height: size, background: s.bg, color: s.fg, outline: `2px solid ${RARITY_COLOR[s.rarity]}`, outlineOffset: 2 }}
      >
        <Icon style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.4} />
      </div>
      {label && <span className="text-[11px] font-black uppercase tracking-wider text-[#F5F1E8]">{label}</span>}
    </div>
  )
})

// ── Explosão de partículas (abrir o baú) ──────────────────────────────────
export const Burst = memo(function Burst({ seed, colors, count = 26 }: { seed: string; colors: string[]; count?: number }) {
  const parts = useMemo(() => {
    const r = seeded(seed)
    return Array.from({ length: count }, (_, i) => {
      const ang = (i / count) * Math.PI * 2 + r() * 0.5
      const dist = 70 + r() * 110
      return {
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist - 30,
        rot: (r() - 0.5) * 540,
        s: 6 + r() * 9,
        c: colors[Math.floor(r() * colors.length)],
        d: 0.7 + r() * 0.5,
      }
    })
  }, [seed, colors, count])
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-[5]">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block border border-black"
          style={{ width: p.s, height: p.s, background: p.c, left: -p.s / 2, top: -p.s / 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, rotate: p.rot, opacity: 0, scale: 1 }}
          transition={{ duration: p.d, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  )
})

// ── Reação surpresa (por cima do card, uma vez) ───────────────────────────
export const ReactionOverlay = memo(function ReactionOverlay({ kind, seed }: { kind: Reaction; seed: string }) {
  const def = REACTIONS.find((r) => r.id === kind) || REACTIONS[0]
  const parts = useMemo(() => {
    const r = seeded(seed + kind)
    const n = kind === "fogos" ? 3 : 30
    return Array.from({ length: n }, () => ({
      left: r() * 100,
      delay: r() * 0.9,
      d: 1.4 + r() * 1.2,
      s: 7 + r() * 10,
      rot: (r() - 0.5) * 720,
      drift: (r() - 0.5) * 60,
      c: def.colors[Math.floor(r() * def.colors.length)],
      top: 15 + r() * 45,
    }))
  }, [seed, kind, def.colors])

  if (kind === "fogos") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
        {parts.map((p, i) => (
          <div key={i} className="absolute" style={{ left: `${p.left}%`, top: `${p.top}%` }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.35 }}>
              <Burst seed={`${seed}:${i}`} colors={def.colors} count={18} />
            </motion.div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {parts.map((p, i) => {
        const up = kind === "coracoes"
        return (
          <motion.span
            key={i}
            className="absolute block"
            style={{ left: `${p.left}%`, top: up ? "100%" : -20, color: p.c }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: up ? -420 : 520, x: p.drift, rotate: up ? p.rot / 6 : p.rot, opacity: [0, 1, 1, 0] }}
            transition={{ duration: p.d, delay: p.delay, ease: up ? [0.2, 0.6, 0.4, 1] : [0.4, 0, 0.6, 1] }}
          >
            {up ? (
              <Heart style={{ width: p.s + 6, height: p.s + 6 }} fill={p.c} color="#000" strokeWidth={1.5} />
            ) : kind === "chuva-de-mel" ? (
              <span className="block rotate-45 border border-black" style={{ width: p.s, height: p.s, background: p.c }} />
            ) : (
              <span className="block border border-black" style={{ width: p.s, height: p.s * 0.55, background: p.c }} />
            )}
          </motion.span>
        )
      })}
    </div>
  )
})
