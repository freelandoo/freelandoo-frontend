"use client"

// features/meu-mundo/ui/rewards/reward-overlay.tsx — mm3d-59: a GRAMÁTICA DOS GANHOS na tela.
//
// Três escalas, nunca confundidas:
//  • ganho cotidiano (XP, atributo, vital, item): centelhas e um arco breve
//    junto ao personagem (centro da tela), número + símbolo + nome, ~1,8 s;
//  • recompensa especial (item raro, missão): o mesmo com materialização e
//    moldura de raridade, um pouco mais longa;
//  • SUBIU DE NÍVEL: composição própria, MUITO maior — coluna de energia, anéis
//    concêntricos que passam da tela, partículas coloridas, a luz de éter na
//    GPU (AetherFx), "SUBIU DE NÍVEL!" ocupando ~70% da largura e o número do
//    nível novo ainda maior. 3,6 s, dispensável (toque/Esc/botão), versão de
//    movimento reduzido com o mesmo texto grande e as mesmas cores.
// Recibos que chegam juntos viram UMA apresentação; vários níveis de uma vez
// viram UMA celebração do nível final. Os números são o delta EFETIVO do
// servidor. Pular não muda nada — o prêmio já está gravado.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { Receipt } from "../../data"
import { AE, RARITY, type Rarity } from "../kit/aether-tokens"
import { AetherFx } from "../kit/aether-fx"
import { archivo, teko } from "../status/evo-skin"
import { ATTR_META, VITAL_META, fmtDelta, toneOf } from "./reward-grammar"
import { onCelebrate } from "./reward-bus"

const GROUP_MS = 600
const GAIN_MS = 1900
const LEVEL_MS = 3600
const MAX_CHIPS = 5

interface Bundle {
  xp: number
  from: number
  to: number
  unlocks: string[]
  attrs: Record<string, number>
  vitals: Record<string, number>
  items: { id: string; qty: number; rarity: Rarity }[]
  special: boolean
}

function merge(list: Receipt[]): Bundle {
  const b: Bundle = { xp: 0, from: Infinity, to: 0, unlocks: [], attrs: {}, vitals: {}, items: [], special: false }
  for (const r of list) {
    const x = r.deltas.xp
    if (x) {
      b.xp += x.xp
      b.from = Math.min(b.from, x.from)
      b.to = Math.max(b.to, x.to)
      b.unlocks.push(...(x.unlocks || []))
    }
    for (const [k, v] of Object.entries(r.deltas.attrs || {})) b.attrs[k] = (b.attrs[k] || 0) + Number(v)
    for (const [k, v] of Object.entries(r.deltas.vitals || {})) b.vitals[k] = (b.vitals[k] || 0) + Number(v)
    for (const it of r.items || []) {
      if (it.qty <= 0) continue
      const cur = b.items.find((i) => i.id === it.id)
      if (cur) cur.qty += it.qty
      else b.items.push({ id: it.id, qty: it.qty, rarity: (it.rarity as Rarity) || "common" })
    }
    if (r.source === "quest" || (r.items || []).some((i) => i.rarity && i.rarity !== "common")) b.special = true
  }
  if (b.from === Infinity) b.from = b.to
  return b
}

export function RewardOverlay() {
  const t = useTranslations("MeuMundo")
  const reduce = useReducedMotion()
  const [gain, setGain] = useState<{ id: number; b: Bundle } | null>(null)
  const [level, setLevel] = useState<{ id: number; b: Bundle } | null>(null)
  const pending = useRef<Receipt[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)

  const show = useCallback(() => {
    const list = pending.current.splice(0)
    if (!list.length) return
    const b = merge(list)
    const id = ++seq.current
    setGain({ id, b })
    if (b.to > b.from) setTimeout(() => setLevel({ id, b }), reduce ? 400 : 1100)
  }, [reduce])

  useEffect(
    () =>
      onCelebrate((r) => {
        pending.current.push(r)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(show, GROUP_MS)
      }),
    [show],
  )
  useEffect(() => {
    if (!gain) return
    const id = setTimeout(() => setGain((g) => (g && g.id === gain.id ? null : g)), GAIN_MS + (gain.b.special ? 700 : 0))
    return () => clearTimeout(id)
  }, [gain])
  const closeLevel = useCallback(() => setLevel(null), [])
  useEffect(() => {
    if (!level) return
    const id = setTimeout(closeLevel, LEVEL_MS)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLevel()
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(id)
      window.removeEventListener("keydown", onKey)
    }
  }, [level, closeLevel])

  return (
    <>
      <AnimatePresence>{gain && !level && <GainBurst key={gain.id} b={gain.b} reduce={!!reduce} t={t} />}</AnimatePresence>
      <AnimatePresence>{level && <LevelUp key={level.id} b={level.b} reduce={!!reduce} t={t} onClose={closeLevel} />}</AnimatePresence>
    </>
  )
}

type T = (k: string, f: string) => string

/** Ganho cotidiano: arco breve + chips junto ao personagem. */
function GainBurst({ b, reduce, t }: { b: Bundle; reduce: boolean; t: T }) {
  const chips = useMemo(() => {
    const out: { key: string; icon: string; text: string; name: string; color: string; glow?: string }[] = []
    if (b.xp > 0) out.push({ key: "xp", icon: "✦", text: `+${b.xp}`, name: t("rewardXpShort", "XP"), color: AE.gold })
    for (const [k, v] of Object.entries(b.attrs)) {
      const m = ATTR_META[k as keyof typeof ATTR_META]
      if (m && Math.abs(v) >= 0.005) out.push({ key: k, icon: m.icon, text: fmtDelta(v, 2), name: t(m.labelKey, m.label), color: m.color })
    }
    for (const [k, v] of Object.entries(b.vitals)) {
      const m = VITAL_META[k as keyof typeof VITAL_META]
      if (m && Math.abs(v) >= 0.5) out.push({ key: k, icon: m.icon, text: fmtDelta(v, 0), name: t(m.labelKey, m.label), color: toneOf(k, v) === "good" ? AE.good : AE.bad })
    }
    for (const it of b.items) {
      const r = RARITY[it.rarity] || RARITY.common
      out.push({ key: `i-${it.id}`, icon: "◆", text: `×${it.qty}`, name: t(`gear_${it.id}`, it.id), color: r.color, glow: r.glow })
    }
    if (out.length > MAX_CHIPS) {
      const rest = out.length - (MAX_CHIPS - 1)
      return [...out.slice(0, MAX_CHIPS - 1), { key: "more", icon: "+", text: String(rest), name: t("rewardMore", "mais"), color: AE.muted }]
    }
    return out
  }, [b, t])
  if (!chips.length) return null
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[95] grid place-items-center" aria-live="polite" initial={false} exit={{ y: -24 }} transition={{ duration: 0.25 }}>
      {/* arco breve em volta do personagem (escala pequena — o nível é que é grande) */}
      {!reduce && (
        <motion.svg viewBox="0 0 200 200" className="absolute h-[220px] w-[220px]" initial={{ scale: 0.5, rotate: -40 }} animate={{ scale: 1.15, rotate: 30 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <motion.circle cx="100" cy="100" r="80" fill="none" stroke={AE.gold} strokeWidth="3" strokeDasharray="160 340" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />
          <circle cx="100" cy="100" r="66" fill="none" stroke={AE.aether} strokeWidth="1.5" strokeDasharray="40 380" />
        </motion.svg>
      )}
      <div className="relative -mt-24 flex flex-col items-center gap-1.5">
        {chips.map((c, i) => (
          <motion.div
            key={c.key}
            className={`${archivo.className} flex items-center gap-2 px-3 py-1`}
            style={{ background: AE.iron, boxShadow: `inset 0 0 0 1px ${c.color}, ${AE.hardSm}${c.glow ? `, 0 0 18px ${c.glow}66` : ""}` }}
            initial={reduce ? false : { y: 18, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.08 * i, type: "spring", stiffness: 520, damping: 30 }}
          >
            <span className="text-[16px]" style={{ color: c.color }} aria-hidden>
              {c.icon}
            </span>
            <span className={`${teko.className} text-[24px] font-semibold leading-none tabular-nums`} style={{ color: c.color }}>
              {c.text}
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: AE.text }}>
              {c.name}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

const PARTICLES = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2 + (i % 3) * 0.21
  const d = 38 + ((i * 37) % 30)
  const colors = [AE.gold, AE.aether, AE.violet, AE.coral]
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, c: colors[i % 4], s: 6 + (i % 4) * 3, delay: (i % 8) * 0.03 }
})

/** SUBIU DE NÍVEL — a composição grande. */
function LevelUp({ b, reduce, t, onClose }: { b: Bundle; reduce: boolean; t: T; onClose: () => void }) {
  const unlockLabel = (u: string) => t(`unlock_${u}`, u)
  return (
    <motion.div
      role="dialog"
      aria-modal="false"
      aria-label={t("levelUpAria", "Subiu para o nível {n}").replace("{n}", String(b.to))}
      className="fixed inset-0 z-[96] flex cursor-pointer flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(80% 70% at 50% 50%, #1c1405 0%, #07080b 80%)" }}
      initial={false}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.35, ease: [0.4, 0, 1, 1] }}
      onClick={onClose}
    >
      <AetherFx burst={1} pixelCap={reduce ? 120_000 : 420_000} />
      {/* coluna de energia */}
      <motion.div
        aria-hidden
        className="absolute bottom-0 left-1/2 w-[22vmin] -translate-x-1/2"
        style={{ height: "100%", background: `linear-gradient(0deg, ${AE.gold} 0%, ${AE.aether}aa 45%, transparent 100%)`, transformOrigin: "bottom", filter: "blur(2px)" }}
        initial={reduce ? false : { scaleY: 0, scaleX: 0.4 }}
        animate={{ scaleY: 1, scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* anéis concêntricos MUITO maiores que o arco do ganho comum */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{ width: "60vmin", height: "60vmin", marginLeft: "-30vmin", marginTop: "-30vmin", border: `${6 - i * 1.5}px solid ${[AE.gold, AE.aether, AE.violet][i]}`, boxShadow: `0 0 40px ${[AE.gold, AE.aether, AE.violet][i]}` }}
          initial={reduce ? { scale: 1 + i * 0.35 } : { scale: 0.2 }}
          animate={reduce ? { scale: 1 + i * 0.35 } : { scale: [0.2, 2.6 + i * 0.4] }}
          transition={reduce ? undefined : { duration: 1.6, delay: 0.15 + i * 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {/* partículas coloridas */}
      {!reduce &&
        PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute left-1/2 top-1/2"
            style={{ width: p.s, height: p.s, background: p.c, boxShadow: `0 0 12px ${p.c}` }}
            initial={{ x: 0, y: 0, scale: 0.4 }}
            animate={{ x: `${p.x}vmin`, y: `${p.y}vmin`, scale: [0.4, 1.4, 0], rotate: 180 }}
            transition={{ duration: 1.5, delay: 0.25 + p.delay, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      <div className="relative flex w-full flex-col items-center px-4 text-center">
        <motion.h2
          className={`${teko.className} font-bold uppercase leading-[0.85]`}
          style={{
            // ~70% da largura útil, sem cortar no celular
            fontSize: "min(12vw, 150px)",
            maxWidth: "92vw",
            color: AE.gold,
            // contorno por sombras (o text-stroke riscava os contornos internos da Teko)
            textShadow: `2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 28px ${AE.gold}, 0 0 60px ${AE.coral}, 6px 6px 0 #000`,
            letterSpacing: "0.01em",
          }}
          initial={reduce ? false : { scale: 2.4, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.2 }}
        >
          {t("levelUpTitle", "SUBIU DE NÍVEL!")}
        </motion.h2>
        <motion.div
          className={`${teko.className} font-bold leading-[0.8] tabular-nums`}
          style={{
            fontSize: "min(44vw, 320px)",
            color: "#fff",
            textShadow: `3px 0 0 #000, -3px 0 0 #000, 0 3px 0 #000, 0 -3px 0 #000, 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 0 40px ${AE.aether}, 0 0 90px ${AE.violet}, 8px 8px 0 #000`,
          }}
          initial={reduce ? false : { scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.55 }}
        >
          {b.to}
        </motion.div>
        <p className={`${archivo.className} mt-1 text-[clamp(14px,3.6vw,20px)] font-semibold uppercase tracking-[0.18em]`} style={{ color: AE.text }}>
          {b.to - b.from > 1
            ? t("levelUpMany", "Nível {from} → {to}").replace("{from}", String(b.from)).replace("{to}", String(b.to))
            : t("levelUpSub", "Nível de aventura")}
        </p>
        {!!b.unlocks.length && (
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {b.unlocks.map((u) => (
              <li key={u} className={`${archivo.className} px-3 py-1 text-[14px] font-bold uppercase`} style={{ background: AE.iron, color: AE.aether, boxShadow: `inset 0 0 0 1px ${AE.aether}` }}>
                {t("levelUpUnlocked", "Liberado: {u}").replace("{u}", unlockLabel(u))}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className={`${teko.className} mt-6 min-h-11 px-6 text-[20px] font-semibold uppercase outline-none focus-visible:ring-2`}
          style={{ background: AE.goldPlate, color: AE.ink }}
        >
          {t("levelUpContinue", "Continuar")}
        </button>
      </div>
    </motion.div>
  )
}
