"use client"

// features/meu-mundo/ui/rewards/reward-overlay.tsx — mm3d-59: a GRAMÁTICA DOS GANHOS na tela.
//
// Três escalas, nunca confundidas:
//  • ganho cotidiano (XP, atributo, vital): mm3d-60 — SÓ O NÚMERO colorido
//    flutuando acima da cabeça do personagem (gain-layer.tsx), ~1,3 s;
//  • item: placa de drop ao lado do personagem (medalhão, nome, quantidade,
//    raridade), ~2,4 s;
//  • SUBIU DE NÍVEL (mm3d-60j): sem tela cheia — vários tubos de luz coloridos
//    no personagem, "LEVEL UP" + o nível em letra grande e um modal pequeno
//    com o que foi liberado (level-up.tsx).
// Recibos que chegam juntos viram UMA apresentação; vários níveis de uma vez
// viram UMA celebração do nível final. Os números são o delta EFETIVO do
// servidor. Pular não muda nada — o prêmio já está gravado.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { Receipt } from "../../data"
import { RARITY, type Rarity } from "../kit/aether-tokens"
import { applyUiFx } from "../kit/steam/fx-tier"
import { FLOAT_COLOR, type FloatKind } from "../kit/steam/steam-tokens"
import { ATTR_META, VITAL_META, fmtDelta } from "./reward-grammar"
import { onCelebrate } from "./reward-bus"
import { GainLayer, MAX_NUMS, MAX_PLATES, type DropItem, type FloatNum } from "./gain-layer"
import { playGainFx } from "../../engine/gain-pillar"
import { LevelUp } from "./level-up"

const GROUP_MS = 600

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
  // nível de efeito da interface (gráficos + movimento reduzido) no <html>
  useEffect(() => {
    applyUiFx()
  }, [])

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
  const gainDone = useCallback(() => setGain(null), [])
  const closeLevel = useCallback(() => setLevel(null), [])
  useEffect(() => {
    if (!level) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLevel()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [level, closeLevel])

  return (
    <>
      {gain && <GainBurst key={gain.id} b={gain.b} t={t} onDone={gainDone} />}
      {level && <LevelUp key={`lv${level.id}`} from={level.b.from} to={level.b.to} unlocks={[...new Set(level.b.unlocks)]} reduce={!!reduce} t={t} onClose={closeLevel} />}
    </>
  )
}

type T = (k: string, f: string) => string

/** Ganho cotidiano: números coloridos (sem nome) + placas de drop (gain-layer.tsx). */
function GainBurst({ b, t, onDone }: { b: Bundle; t: T; onDone: () => void }) {
  const { nums, drops, more } = useMemo(() => {
    const nums: FloatNum[] = []
    if (b.xp > 0) nums.push({ key: "xp", kind: "xp", text: `+${b.xp}`, label: t("rewardXpShort", "XP") })
    for (const [k, v] of Object.entries(b.attrs)) {
      const m = ATTR_META[k as keyof typeof ATTR_META]
      if (m && Math.abs(v) >= 0.005) nums.push({ key: k, kind: k as FloatKind, text: fmtDelta(v, 2), label: t(m.labelKey, m.label) })
    }
    for (const [k, v] of Object.entries(b.vitals)) {
      const m = VITAL_META[k as keyof typeof VITAL_META]
      if (m && Math.abs(v) >= 0.5) nums.push({ key: k, kind: k as FloatKind, text: fmtDelta(v, 0), label: t(m.labelKey, m.label) })
    }
    const all: DropItem[] = b.items.map((it) => ({ id: it.id, qty: it.qty, rarity: it.rarity, name: t(`gear_${it.id}`, it.id) }))
    const drops = all.length > MAX_PLATES ? all.slice(0, MAX_PLATES - 1) : all
    return { nums: nums.slice(0, MAX_NUMS), drops, more: all.length - drops.length }
  }, [b, t])
  useEffect(() => {
    if (!nums.length && !drops.length && !more) onDone()
  }, [nums.length, drops.length, more, onDone])
  // o tubo de luz no personagem (cor do primeiro ganho; item raro pinta com a raridade)
  useEffect(() => {
    const color = nums.length ? FLOAT_COLOR[nums[0].kind] : drops.length ? (RARITY[drops[0].rarity] || RARITY.common).color : null
    if (color) playGainFx(color)
  }, [nums, drops])
  if (!nums.length && !drops.length && !more) return null
  return <GainLayer nums={nums} drops={drops} more={more} onDone={onDone} />
}
