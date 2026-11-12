"use client"

// features/meu-mundo/ui/status/equip-page.tsx — a página EQUIPAMENTOS do STATUS (2026-11-12,
// pedido do Alex): como a Ficha, com o personagem 3D no palco, mas para EQUIPAR. As 8 casas
// ficam em volta do corpo; tocar uma casa lista as peças que cabem nela; equipar ou tirar:
//   • brilho no personagem (SkinStage.flash: anel nos pés, feixe subindo, corpo clareia);
//   • o número de cada atributo que mudou sobe (ou desce) contando, com o nome do atributo;
//   • som: a peça encaixando (ui-equipar), o brilho (ui-equip-brilho) e os estalos da contagem
//     (ui-equip-numero, com o tom subindo); tirou = ui-tirar + ui-equip-baixa.
//
// Regra: nenhuma. Quem equipa é o servidor (POST /gear/equip); o número mostrado é a diferença
// entre o `bag.bonus` de antes e o de depois (o total com teto que o servidor calcula).
// Custo: um motor só com o palco à vista (como a Ficha); no nível `low` e sem WebGL, o retrato.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { Check, X } from "lucide-react"
import type { GearBag, GearCatalog, GearInstance, GearItem, GearSlot } from "../../data"
import type { GearBonus } from "../../laminas/sim/fight"
import type { BodyId } from "../../types"
import type { SkinStage } from "../../engine/skin-stage"
import { playSample, preloadSamples, uiSound } from "../../engine/audio"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { RARITY } from "../kit/aether-tokens"
import { gearThumb, nameOf, percentage } from "../gear/gear-card"
import { anton } from "../hud/fight-plate"
import { TYPE } from "../kit/type-scale"
import { EVO, Tag, archivo, teko } from "./evo-skin"
import type { LoadoutData } from "./loadout-page"

type Tr = (key: string, fallback: string) => string

const LEFT: GearSlot[] = ["weapon", "helm", "chest", "gloves"]
const RIGHT: GearSlot[] = ["offhand", "amulet", "relic", "boots"]
const KEYS: (keyof GearBonus)[] = ["dmg", "def", "hp", "acc", "spd", "int", "dex", "stam", "warn", "power"]
/** Cor do número de cada atributo (a mesma família das barras da Ficha). */
const KEY_COLOR: Record<string, string> = {
  dmg: "#FF7A45", def: "#5BB8FF", hp: "#5FE39A", acc: "#FFD166", spd: "#7CF3FF",
  int: "#B98AFF", dex: "#FF9BD2", stam: "#9BE36B", warn: "#FFE2A6", power: "#FF5C7A",
}
const SND = { glow: "ui-equip-brilho", tick: "ui-equip-numero", down: "ui-equip-baixa" }
/** Como a Ficha: corpo de 3/4 no centro; pés acima do Poder (o Poder mora embaixo, entre as casas). */
const FRAME = { feetX: 0.5, feetY: 0.8, figure: 0.66, still: true, face: Math.PI - 0.35 }
const COUNT_MS = 900

const slotName = (s: GearSlot, t: Tr) =>
  ({
    weapon: t("lkSlotWeapon", "Arma"),
    offhand: t("lkSlotOffhand", "Mão secundária"),
    helm: t("lkSlotHelm", "Cabeça"),
    chest: t("lkSlotChest", "Peito"),
    gloves: t("lkSlotGloves", "Mãos"),
    boots: t("lkSlotBoots", "Pés"),
    amulet: t("lkSlotAmulet", "Amuleto"),
    relic: t("lkSlotRelic", "Relíquia"),
  })[s]
const keyName = (k: string, t: Tr) =>
  ({
    dmg: t("lkBonusDmg", "Dano"),
    def: t("lkBonusDef", "Defesa"),
    stam: t("lkBonusStam", "Fôlego"),
    warn: t("lkBonusWarn", "Aviso"),
    power: t("lkBonusPower", "Poder máximo"),
    hp: t("lkBonusHp", "Vida"),
    acc: t("lkBonusAcc", "Acuracidade"),
    spd: t("lkBonusSpd", "Velocidade"),
    int: t("lkBonusInt", "Inteligência"),
    dex: t("lkBonusDex", "Destreza"),
  })[k] ?? k

const lowTier = () => typeof document !== "undefined" && document.documentElement.getAttribute("data-mm-fx") === "low"
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
const thumbCategory = (item: GearItem) => (item.category === "shield" ? "armor" : item.category) as ItemCategory

/** Uma linha do que mudou: atributo, de quanto para quanto (frações do `bag.bonus`). */
interface Change {
  key: string
  from: number
  to: number
}
export function bonusChanges(before: Partial<GearBonus> | undefined, after: Partial<GearBonus> | undefined): Change[] {
  const out: Change[] = []
  for (const k of KEYS) {
    const a = Number(before?.[k]) || 0
    const b = Number(after?.[k]) || 0
    if (Math.abs(b - a) >= 0.0005) out.push({ key: k, from: a, to: b })
  }
  return out
}

/** Peças da mochila que cabem na casa (cada cópia é uma linha; sem cópias, uma por item). */
function candidates(catalog: GearCatalog, bag: GearBag, slot: GearSlot) {
  const byId = new Map(catalog.items.map((i) => [i.id, i]))
  const rows: { item: GearItem; inst: GearInstance | null; plus: number; here: boolean; elsewhere: boolean }[] = []
  const seen = new Set<string>()
  for (const inst of bag.instances ?? []) {
    const item = byId.get(inst.item)
    if (!item || item.slot !== slot) continue
    seen.add(item.id)
    rows.push({ item, inst, plus: inst.plus, here: inst.equippedHere && inst.equippedSlot === slot, elsewhere: !!inst.equippedBy && !inst.equippedHere })
  }
  for (const [id, own] of Object.entries(bag.owned)) {
    const item = byId.get(id)
    if (!item || item.slot !== slot || seen.has(id) || own.qty <= 0) continue
    rows.push({ item, inst: null, plus: own.level || 0, here: bag.equipped[slot] === id, elsewhere: false })
  }
  const rank = ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
  return rows.sort((a, b) => Number(b.here) - Number(a.here) || rank.indexOf(b.item.rarity) - rank.indexOf(a.item.rarity) || b.plus - a.plus)
}

export function EquipPage({
  body,
  portrait,
  name,
  temper,
  power,
  data,
  compact,
  busy,
  onEquip,
  t,
}: {
  body?: BodyId
  portrait: string
  name: string
  /** O temperamento (o rótulo dourado acima do nome, como na Ficha). */
  temper: string
  power: number | null
  data: LoadoutData
  compact: boolean
  busy: boolean
  /** Equipa (item) ou tira (item null) no servidor; devolve a mochila nova, ou null se recusou. */
  onEquip?: (slot: GearSlot, item: string | null, instance?: string | null) => Promise<GearBag | null>
  t: Tr
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<SkinStage | null>(null)
  const [visible, setVisible] = useState(false)
  const [flat, setFlat] = useState(false)
  const [slot, setSlot] = useState<GearSlot | null>(null)
  const [working, setWorking] = useState(false)
  const [changes, setChanges] = useState<{ id: number; rows: Change[] } | null>(null)
  const [glow, setGlow] = useState<{ id: number; color: string } | null>(null)
  const seq = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => {
    setFlat(lowTier())
    preloadSamples(Object.values(SND))
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true)
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  useEffect(() => {
    if (!visible || flat || !body) return
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let stage: SkinStage | null = null
    void import("../../engine/skin-stage")
      .then(({ SkinStage }) => {
        if (!alive) return
        stage = new SkinStage(canvas, reducedMotion(), FRAME)
        stageRef.current = stage
        void stage.show({ body, holo: false, color: "#FFD68A", accent: "#FFFFFF", look: "" }).catch(() => {})
      })
      .catch(() => alive && setFlat(true))
    return () => {
      alive = false
      stageRef.current = null
      stage?.dispose()
    }
  }, [visible, flat, body])

  const gear = data.gear
  const byId = useMemo(() => new Map((gear?.catalog.items ?? []).map((i) => [i.id, i])), [gear])
  const list = useMemo(() => (gear && slot ? candidates(gear.catalog, gear.bag, slot) : []), [gear, slot])

  /** O espetáculo: brilho, números contando e som. `rows` = o que mudou no total. */
  const celebrate = useCallback((rows: Change[], put: boolean) => {
    const up = rows.some((r) => r.to > r.from)
    const main = rows.slice().sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))[0]
    const color = up ? (main ? KEY_COLOR[main.key] : "#FFD68A") : "#FF7B86"
    const id = ++seq.current
    uiSound(put ? "equip" : "unequip")
    if (up) {
      stageRef.current?.flash(color)
      setGlow({ id, color })
      playSample(SND.glow, { bus: "ui", gain: 0.7 })
      // a contagem: estalos com o tom subindo enquanto o número corre
      const steps = reducedMotion() ? 1 : 7
      for (let i = 0; i < steps; i++) {
        timers.current.push(window.setTimeout(() => playSample(SND.tick, { bus: "ui", gain: 0.35, rate: 0.9 + i * 0.09 }), 160 + (i * (COUNT_MS - 200)) / steps))
      }
    } else if (rows.length) {
      playSample(SND.down, { bus: "ui", gain: 0.6 })
    }
    if (rows.length) setChanges({ id, rows })
    timers.current.push(
      window.setTimeout(() => {
        setChanges((c) => (c?.id === id ? null : c))
        setGlow((g) => (g?.id === id ? null : g))
      }, 2600),
    )
  }, [])

  const apply = async (s: GearSlot, item: string | null, instance?: string | null) => {
    if (!gear || !onEquip || working || busy) return
    setWorking(true)
    const before = gear.bag.bonus
    const bag = await onEquip(s, item, instance)
    setWorking(false)
    if (!bag) {
      uiSound("error")
      return
    }
    celebrate(bonusChanges(before, bag.bonus), !!item)
    setSlot(null)
  }

  const slotButton = (s: GearSlot) => {
    const id = gear?.bag.equipped[s]
    const item = id ? byId.get(id) : null
    const inst = gear?.bag.instances?.find((i) => i.equippedHere && i.equippedSlot === s)
    const plus = inst?.plus ?? (id ? gear?.bag.owned[id]?.level || 0 : 0)
    const tone = item ? RARITY[item.rarity].color : "rgba(232,182,91,0.45)"
    const on = slot === s
    return (
      <button
        key={s}
        type="button"
        onClick={() => {
          uiSound("bagPick")
          setSlot(on ? null : s)
        }}
        aria-pressed={on}
        aria-label={`${slotName(s, t)}: ${item ? nameOf(item, t) : t("lkEmpty", "vazio")}`}
        className="group relative flex w-[72px] flex-col items-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A1F]"
      >
        <span
          className="relative block h-14 w-14 overflow-hidden transition-transform duration-150 group-active:scale-95"
          style={{ background: "rgba(12,15,20,0.72)", boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? "#FFE2A6" : tone}`, borderRadius: 10 }}
        >
          {item ? (
            <ItemImage src={gearThumb(item)} category={thumbCategory(item)} rarity={item.rarity} alt="" ratio={1} />
          ) : (
            <span className={`${teko.className} absolute inset-0 flex items-center justify-center text-[22px]`} style={{ color: "rgba(232,182,91,0.5)" }}>
              +
            </span>
          )}
          {plus > 0 && (
            <span className={`${teko.className} absolute bottom-0 right-0 px-1 text-[13px] leading-[1.15] tabular-nums`} style={{ background: "rgba(0,0,0,0.78)", color: "#FFE2A6" }}>
              +{plus}
            </span>
          )}
        </span>
        <span className={`${archivo.className} w-full truncate text-center text-[11px] font-semibold uppercase tracking-[0.06em]`} style={{ color: on ? "#FFE2A6" : EVO.mudo, textShadow: "0 1px 0 #000" }}>
          {slotName(s, t)}
        </span>
      </button>
    )
  }

  const stageH = compact ? 360 : 520
  const stage = (
    <div
      ref={boxRef}
      className="relative w-full shrink-0 overflow-hidden"
      style={{
        height: stageH,
        // o palco da Ficha (sheet-stage.tsx), centrado: facho de cima sobre o corpo e chão aceso
        background:
          "radial-gradient(ellipse 30% 40% at 50% 84%, rgba(255,214,138,0.22) 0%, rgba(255,214,138,0) 70%), linear-gradient(100deg, rgba(0,0,0,0) 34%, rgba(255,226,170,0.10) 44%, rgba(255,226,170,0.04) 56%, rgba(0,0,0,0) 66%), radial-gradient(ellipse at 50% 20%, #1d2530 0%, #0b0e13 70%)",
        boxShadow: "inset 0 0 0 1px #8A6430",
      }}
    >
      {flat || !body ? (
        // eslint-disable-next-line @next/next/no-img-element -- retrato local (nível low / sem WebGL)
        <img src={portrait} alt="" decoding="async" draggable={false} className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2 object-cover object-top" style={{ aspectRatio: "4 / 5" }} />
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: "grab" }} aria-label={name} />
      )}

      {/* brilho por cima (vale também para o retrato do nível low): só opacity/transform */}
      {glow && (
        <div
          key={glow.id}
          aria-hidden
          className="mm-equip-glow pointer-events-none absolute bottom-0 left-1/2 h-[88%] w-[46%]"
          style={{ background: `radial-gradient(ellipse 50% 50% at 50% 60%, ${glow.color}66 0%, ${glow.color}00 70%)`, mixBlendMode: "screen" }}
        />
      )}

      {/* as 8 casas em volta do corpo */}
      <div className="absolute inset-y-0 left-2 flex flex-col justify-center gap-2">{LEFT.map(slotButton)}</div>
      <div className="absolute inset-y-0 right-2 flex flex-col justify-center gap-2">{RIGHT.map(slotButton)}</div>

      {/* em cima: temperamento e nome (como a Ficha) */}
      <div className={`${archivo.className} pointer-events-none absolute inset-x-[88px] top-2 flex flex-col items-center text-center`}>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#E8B65B", textShadow: "0 1px 0 #000" }}>
          {temper}
        </span>
        <span className={`${anton.className} max-w-full truncate uppercase leading-[1.1]`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.title, color: "#FFF4DC", textShadow: "0 2px 0 #000" }}>
          {name}
        </span>
      </div>

      {/* embaixo, sob os pés: o Poder (o maior número da tela), contando quando muda */}
      <div className={`${archivo.className} pointer-events-none absolute inset-x-[88px] bottom-2 flex flex-col items-center`}>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#C9B48A", textShadow: "0 1px 0 #000" }}>
          {t("stPower", "PODER")}
        </span>
        <CountUp value={power} className={`${anton.className} tabular-nums leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.banner, textShadow: "0 3px 0 #000" }} color="#FFE2A6" />
      </div>

      {/* os números que mudaram, subindo sobre o corpo */}
      {changes && (
        <div key={changes.id} className="pointer-events-none absolute inset-x-0 top-[30%] flex flex-col items-center gap-1" role="status" aria-live="polite">
          {changes.rows.map((r, i) => (
            <div key={r.key} className="mm-equip-rise flex items-baseline gap-2" style={{ animationDelay: `${i * 110}ms` }}>
              <span className={`${archivo.className} text-[13px] font-bold uppercase tracking-[0.12em]`} style={{ color: "#F3EAD8", textShadow: "0 1px 0 #000, 0 0 8px #000" }}>
                {keyName(r.key, t)}
              </span>
              <CountPct from={r.from} to={r.to} delay={i * 110} color={r.to >= r.from ? KEY_COLOR[r.key] : "#FF7B86"} />
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes mm-equip-rise { 0% { opacity: 0; transform: translateY(26px) scale(0.92) } 14% { opacity: 1; transform: translateY(0) scale(1.06) } 22% { transform: translateY(0) scale(1) } 82% { opacity: 1; transform: translateY(-10px) } 100% { opacity: 0; transform: translateY(-34px) } }
        @keyframes mm-equip-glow { 0% { opacity: 0; transform: translateX(-50%) scaleY(0.3) } 30% { opacity: 1; transform: translateX(-50%) scaleY(1) } 100% { opacity: 0; transform: translateX(-50%) scaleY(1.12) } }
        .mm-equip-rise { opacity: 0; animation: mm-equip-rise 2.4s cubic-bezier(.2,.8,.2,1) forwards; will-change: transform, opacity }
        .mm-equip-glow { transform-origin: 50% 100%; animation: mm-equip-glow 1.3s ease-out forwards }
        @media (prefers-reduced-motion: reduce) { .mm-equip-rise { animation: none; opacity: 1 } .mm-equip-glow { animation: none; opacity: 0 } }
      `}</style>
    </div>
  )

  const total = gear ? KEYS.filter((k) => gear.bag.bonus?.[k]) : []
  const panel = (
    <div className={`${archivo.className} flex min-h-0 flex-col gap-2`}>
      {!gear && <p className="text-[13px]" style={{ color: EVO.mudo }}>{t("lkGearLoading", "Carregando o equipamento…")}</p>}
      {gear && !slot && (
        <>
          <p className="text-[13px] leading-snug" style={{ color: EVO.mudo }}>
            {t("eqHint", "Toque numa casa em volta do personagem para escolher a peça.")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {total.length === 0 && <Tag tone="mudo">{t("lkNoBonus", "sem bônus")}</Tag>}
            {total.map((k) => (
              <Tag key={k} tone="bom">
                {keyName(k, t)} +{percentage(gear.bag.bonus[k] || 0)}
              </Tag>
            ))}
          </div>
        </>
      )}
      {gear && slot && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className={`${teko.className} text-[20px] font-semibold uppercase leading-none tracking-[0.04em]`} style={{ color: "#FFD68A" }}>
              {slotName(slot, t)}
            </h3>
            <div className="flex items-center gap-2">
              {gear.bag.equipped[slot] && (
                <button
                  type="button"
                  disabled={working || busy}
                  onClick={() => void apply(slot, null)}
                  className="inline-flex min-h-11 items-center gap-1.5 px-3 text-[13px] font-semibold outline-none transition-transform active:scale-[0.97] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#FF8A1F]"
                  style={{ color: "#ff7b86", boxShadow: "inset 0 0 0 1px rgba(255,123,134,0.5)", borderRadius: 8 }}
                >
                  <X className="h-4 w-4" /> {t("eqTakeOff", "Tirar")}
                </button>
              )}
              <button type="button" onClick={() => setSlot(null)} aria-label={t("eqClose", "Fechar a lista")} className="flex h-11 w-11 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A1F]" style={{ color: EVO.mudo }}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {list.length === 0 && <p className="text-[13px]" style={{ color: EVO.mudo }}>{t("eqNone", "Você ainda não tem peça para esta casa.")}</p>}
          <ul className={`grid gap-1.5 ${compact ? "" : "min-h-0 overflow-y-auto pr-1"}`}>
            {list.map((row) => {
              const r = RARITY[row.item.rarity]
              const b = row.item.bonus ?? {}
              return (
                <li key={row.inst?.id ?? row.item.id}>
                  <button
                    type="button"
                    disabled={row.here || working || busy}
                    onClick={() => void apply(slot, row.item.id, row.inst?.id)}
                    className="flex w-full items-center gap-2.5 p-1.5 text-left outline-none transition-transform active:scale-[0.99] disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#FF8A1F]"
                    style={{ background: row.here ? "rgba(255,226,166,0.10)" : "rgba(12,15,20,0.5)", boxShadow: `inset 0 0 0 1px ${row.here ? "#FFE2A6" : "rgba(232,182,91,0.28)"}`, borderRadius: 10 }}
                  >
                    <span className="block h-12 w-12 shrink-0 overflow-hidden" style={{ borderRadius: 8 }}>
                      <ItemImage src={gearThumb(row.item)} category={thumbCategory(row.item)} rarity={row.item.rarity} alt="" ratio={1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold" style={{ color: r.color }}>
                        {nameOf(row.item, t)}
                        {row.plus > 0 ? ` +${row.plus}` : ""}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {KEYS.filter((k) => b[k]).map((k) => (
                          <Tag key={k} tone="bom">
                            {keyName(k, t)} +{percentage(b[k] || 0)}
                          </Tag>
                        ))}
                        {row.elsewhere && <Tag tone="mudo">{t("eqElsewhere", "com outro personagem")}</Tag>}
                      </span>
                    </span>
                    {row.here ? (
                      <span className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: "#FFE2A6" }}>
                        <Check className="h-4 w-4" /> {t("eqWorn", "Vestindo")}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ background: "#FFE2A6", color: "#14171C", borderRadius: 6 }}>
                        {t("eqEquip", "Equipar")}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )

  if (compact)
    return (
      <div className="flex flex-col gap-2 pb-3">
        {stage}
        {panel}
      </div>
    )
  return (
    <div className="grid h-full grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 overflow-hidden">
      {stage}
      <div className="min-h-0 overflow-y-auto pr-1">{panel}</div>
    </div>
  )
}

/** Número inteiro que corre até o valor novo quando ele muda (o Poder). */
function CountUp({ value, className, style, color }: { value: number | null; className?: string; style?: CSSProperties; color: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const shown = useRef<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value == null) {
      el.textContent = "—"
      return
    }
    const from = shown.current
    shown.current = value
    if (from == null || from === value || reducedMotion()) {
      el.textContent = String(Math.round(value))
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / COUNT_MS)
      const e = 1 - Math.pow(1 - k, 3)
      el.textContent = String(Math.round(from + (value - from) * e))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span ref={ref} className={className} style={{ ...style, color }} />
}

/** "12,0% → 15,2%": o valor corre do antigo ao novo, com o sinal da diferença na frente. */
function CountPct({ from, to, delay, color }: { from: number; to: number; delay: number; color: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const diff = to - from
    // só a diferença (grande); o total fica nas pílulas de baixo
    const text = (v: number) => `${diff >= 0 ? "+" : "−"}${percentage(Math.abs(v - from))}`
    if (reducedMotion()) {
      el.textContent = text(to)
      return
    }
    el.textContent = text(from)
    let raf = 0
    const t0 = performance.now() + delay + 150
    const step = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / COUNT_MS))
      const e = 1 - Math.pow(1 - k, 3)
      el.textContent = text(from + diff * e)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [from, to, delay])
  return <span ref={ref} className={`${teko.className} text-[30px] font-semibold leading-none tabular-nums`} style={{ color, textShadow: "0 2px 0 #000, 0 0 12px rgba(0,0,0,0.9)" }} />
}
