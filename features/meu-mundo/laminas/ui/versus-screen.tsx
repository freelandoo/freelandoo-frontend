"use client"

// features/meu-mundo/laminas/ui/versus-screen.tsx — a MÁQUINA DE VERSUS antes de toda luta.
//
// Pedido do Alex (2026-11-06): dois cards, núcleo VS, atributos e o botão INICIAR LUTA,
// no material da notificação dos personagens (ui/inbox/emotion-frame.tsx): ouro em
// camadas, painel translúcido, losango, brilho vermelho e laranja embaixo. Retrato,
// texto, número e barra são componentes vivos. A luta fica parada até o botão (ou
// Enter/Espaço). Os números são os da regra (LaminasGameHandle.sheet).
//
// O palco tem medida fixa e escala pela janela: `wide` no computador, `short` no celular
// deitado (mais baixo, letra maior) e `tall` no celular em pé.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Feather, Heart, Shield, Swords, Target } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { gearPath } from "../../ui/kit/steam/steam-frame"
import { anton } from "../../ui/hud/fight-plate"
import { cinzel, teko } from "../../ui/status/evo-skin"
import type { FightSheet } from "../engine/laminas-game"
import s from "./versus.module.css"

export interface VersusSide {
  name: string
  level: number
  portrait: string | null
  /** Cor da energia do card. */
  accent: string
}

interface Layout {
  W: number
  H: number
  /** Corpo da máquina: x0, y0, x1, y1. */
  body: [number, number, number, number]
  card: { w: number; h: number; y: number; lx: number; rx: number; name: number; sub: number; plate: number }
  vs: { x: number; y: number; r: number }
  stats: { x: number; y: number; w: number; row: number; val: number; bar: number; mid: number; num: number; lab: number; icon: number }
  btn: { x: number; y: number; w: number; h: number; font: number }
}

const WIDE: Layout = {
  W: 1600,
  H: 900,
  body: [70, 118, 1530, 832],
  card: { w: 372, h: 388, y: 26, lx: 268, rx: 960, name: 31, sub: 20, plate: 0.2 },
  vs: { x: 800, y: 268, r: 128 },
  stats: { x: 226, y: 436, w: 1148, row: 52, val: 104, bar: 320, mid: 260, num: 32, lab: 23, icon: 24 },
  btn: { x: 560, y: 712, w: 480, h: 128, font: 44 },
}
const SHORT: Layout = {
  W: 1600,
  H: 740,
  body: [40, 40, 1560, 700],
  card: { w: 340, h: 262, y: 8, lx: 260, rx: 1000, name: 30, sub: 21, plate: 0.3 },
  vs: { x: 800, y: 136, r: 104 },
  stats: { x: 90, y: 276, w: 1420, row: 58, val: 130, bar: 390, mid: 340, num: 42, lab: 31, icon: 32 },
  btn: { x: 540, y: 578, w: 520, h: 118, font: 46 },
}
const TALL: Layout = {
  W: 720,
  H: 1090,
  body: [14, 60, 706, 1010],
  card: { w: 306, h: 372, y: 14, lx: 34, rx: 380, name: 27, sub: 19, plate: 0.2 },
  vs: { x: 360, y: 182, r: 78 },
  stats: { x: 36, y: 410, w: 648, row: 84, val: 76, bar: 142, mid: 196, num: 34, lab: 23, icon: 24 },
  btn: { x: 120, y: 860, w: 480, h: 122, font: 44 },
}

/** Mede a janela e escolhe o palco. */
function useStage() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [view, setView] = useState<{ L: Layout; k: number } | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const L = w / h < 0.85 ? TALL : h < 520 ? SHORT : WIDE
      setView({ L, k: Math.min((w - 8) / L.W, (h - 8) / L.H) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, view }
}

/** Contorno com as quinas cortadas. */
function machine(x0: number, y0: number, x1: number, y1: number, c: number) {
  return `M${x0 + c} ${y0}L${x1 - c} ${y0}L${x1} ${y0 + c}L${x1} ${y1 - c}L${x1 - c} ${y1}L${x0 + c} ${y1}L${x0} ${y1 - c}L${x0} ${y0 + c}Z`
}

/** Polígono de oito lados. */
const octagon = (w: number, h: number, c: number, i = 0) => `${c + i},${i} ${w - c - i},${i} ${w - i},${c + i} ${w - i},${h - c - i} ${w - c - i},${h - i} ${c + i},${h - i} ${i},${h - c - i} ${i},${c + i}`

/** Peça no desenho da notificação (emotion-frame.tsx): ouro em camadas, fio de luz e filete. */
function Gold({ d, w = 1 }: { d: string; w?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke="#72400c" strokeWidth={11 * w} strokeLinejoin="miter" />
      <path d={d} fill="none" stroke="url(#vsBronze)" strokeWidth={6.5 * w} strokeLinejoin="miter" />
      <path d={d} fill="none" stroke="url(#vsLight)" strokeWidth={1.6 * w} strokeLinejoin="miter" />
    </>
  )
}

/** O painel: o mesmo material da notificação dos personagens. */
function Frame({ L }: { L: Layout }) {
  const [x0, y0, x1, y1] = L.body
  const mid = (x0 + x1) / 2
  const outer = machine(x0, y0, x1, y1, 40)
  const inner = machine(x0 + 12, y0 + 12, x1 - 12, y1 - 12, 34)
  const spots: [number, number, number][] = [
    [x0 + 40, y0, 18],
    [x1 - 40, y1, 22],
    [mid, y1, 32],
  ]
  return (
    <>
      {/* brilho atrás: dourado nas bordas, vermelho e laranja embaixo; só esta camada pulsa */}
      <svg className={`${s.svg} ${s.glowBack}`} viewBox={`0 0 ${L.W} ${L.H}`} width={L.W} height={L.H} aria-hidden>
        <defs>
          <filter id="vsBlurG" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="vsBlurR" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <radialGradient id="vsHot">
            <stop offset="0%" stopColor="#fffabe" stopOpacity="0.96" />
            <stop offset="14%" stopColor="#ffad2d" stopOpacity="0.84" />
            <stop offset="36%" stopColor="#ff410e" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#b40000" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#b40000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={outer} fill="none" stroke="#ffb92d" strokeWidth={9} filter="url(#vsBlurG)" />
        <path d={`M${x0 + 40} ${y1 + 4}H${x1 - 40}`} fill="none" stroke="#c40d0d" strokeWidth={40} filter="url(#vsBlurR)" />
        <path d={`M${x0 + 40} ${y1}H${x1 - 40}`} fill="none" stroke="#ff6a00" strokeWidth={14} filter="url(#vsBlurG)" />
        <ellipse cx={mid} cy={y1} rx={(x1 - x0) * 0.26} ry={34} fill="url(#vsHot)" />
      </svg>
      <svg className={`${s.svg} ${s.frame}`} viewBox={`0 0 ${L.W} ${L.H}`} width={L.W} height={L.H} aria-hidden>
        <defs>
          <linearGradient id="vsBronze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff0a0" />
            <stop offset="13%" stopColor="#ffc64f" />
            <stop offset="35%" stopColor="#b97715" />
            <stop offset="65%" stopColor="#edaa29" />
            <stop offset="88%" stopColor="#ffe07b" />
            <stop offset="100%" stopColor="#8c4d0d" />
          </linearGradient>
          <linearGradient id="vsGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF0C2" />
            <stop offset="0.5" stopColor="#FFB43B" />
            <stop offset="1" stopColor="#B4631A" />
          </linearGradient>
          {/* fio de luz: forte em cima e à esquerda, some no meio */}
          <linearGradient id="vsLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbd4" stopOpacity="1" />
            <stop offset="40%" stopColor="#fff1ad" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#fff1ad" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fff1ad" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="vsPanel" x1="0" y1="0" x2="1" y2="0.42">
            <stop offset="0%" stopColor="#1c1e28" stopOpacity="0.8" />
            <stop offset="42%" stopColor="#171820" stopOpacity="0.76" />
            <stop offset="78%" stopColor="#251c27" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#17141b" stopOpacity="0.82" />
          </linearGradient>
          <radialGradient id="vsPanelRed" cx="0.9" cy="1" r="0.6">
            <stop offset="0%" stopColor="#691b23" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#691b23" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vsPanelBottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="78%" stopColor="#ff6a1a" stopOpacity="0" />
            <stop offset="100%" stopColor="#ff6a1a" stopOpacity="0.16" />
          </linearGradient>
          <radialGradient id="vsSpot">
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" />
            <stop offset="18%" stopColor="#ffe17c" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#ff9b20" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ff6a00" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vsCoreGlow">
            <stop offset="0.55" stopColor="#FF8700" stopOpacity="0" />
            <stop offset="1" stopColor="#FF8700" stopOpacity="0.75" />
          </radialGradient>
          <radialGradient id="vsBtnGlow">
            <stop offset="0" stopColor="#FF8700" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FF8700" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={outer} fill="url(#vsPanel)" />
        <path d={outer} fill="url(#vsPanelRed)" />
        <path d={outer} fill="url(#vsPanelBottom)" />
        <Gold d={outer} />
        <path d={inner} fill="none" stroke="#a6650d" strokeWidth={1.4} opacity={0.85} />
        {spots.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="url(#vsSpot)" />
        ))}
      </svg>
    </>
  )
}

function Card({ L, side, x, left, sub }: { L: Layout; side: VersusSide; x: number; left: boolean; sub: string }) {
  const { w, h, y, name, sub: subSize } = L.card
  const c = Math.round(w * 0.1)
  const plate = Math.round(h * L.card.plate)
  const fit = Math.min(name, ((w - c - plate * 0.6 - 24) / Math.max(1, side.name.length)) * 1.7)
  const poly = (i: number) =>
    `polygon(${[
      [c + i, i],
      [w - c - i, i],
      [w - i, c + i],
      [w - i, h - c - i],
      [w - c - i, h - i],
      [c + i, h - i],
      [i, h - c - i],
      [i, c + i],
    ]
      .map(([a, b]) => `${a}px ${b}px`)
      .join(",")})`
  return (
    <div className={`${s.abs} ${left ? s.cardL : s.cardR}`} style={{ left: x, top: y, width: w, height: h }}>
      <div className={s.abs} style={{ inset: 0, clipPath: poly(9), background: "#0A0D11", overflow: "hidden" }}>
        {side.portrait && <div aria-hidden className={s.abs} style={{ inset: 0, backgroundImage: `url(${side.portrait})`, backgroundSize: "cover", backgroundPosition: "center 10%" }} />}
        <div className={s.abs} style={{ inset: 0, background: `linear-gradient(180deg, transparent 58%, ${side.accent}33 100%)` }} />
        <div className={s.sweep} />
      </div>
      <svg className={s.svg} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
        <polygon points={octagon(w, h, c)} fill="none" stroke="#72400c" strokeWidth={11} />
        <polygon points={octagon(w, h, c)} fill="none" stroke="url(#vsBronze)" strokeWidth={6.5} />
        <polygon points={octagon(w, h, c)} fill="none" stroke="url(#vsLight)" strokeWidth={1.6} />
        <polygon points={octagon(w, h, c, 8)} fill="none" stroke={side.accent} strokeWidth={1.6} opacity={0.85} />
        <path d={`M${c} ${h - plate}H${w - c * 0.7}L${w - 14} ${h - plate + 16}V${h - c}L${w - c} ${h - 12}H${c}L14 ${h - c}V${h - plate + 16}Z`} fill="#171820" opacity={0.82} stroke="#a6650d" strokeWidth={1.4} />
        <circle cx={c + plate * 0.2} cy={h - plate * 0.52} r={plate * 0.42} fill="#14161C" stroke="url(#vsBronze)" strokeWidth={4} />
        <path d={gearPath(c + plate * 0.2, h - plate * 0.52, 8, plate * 0.27, plate * 0.19)} fill={side.accent} />
      </svg>
      <div className={`${s.abs} ${s.cardName} ${teko.className} text-center uppercase`} style={{ left: c + plate * 0.6, right: 16, bottom: 14, height: plate - 8, display: "flex", flexDirection: "column", justifyContent: "center", color: "#F6EFE2", lineHeight: 1 }}>
        <span className="whitespace-nowrap font-semibold" style={{ fontSize: fit, textShadow: "0 2px 0 #000" }}>
          {side.name}
        </span>
        <span className="font-medium" style={{ fontSize: subSize, color: "#E8D9BC" }}>
          {sub}
        </span>
      </div>
    </div>
  )
}

function Core({ L }: { L: Layout }) {
  const { x, y, r } = L.vs
  const wing = (m: 1 | -1) => (
    <g transform={`translate(${x} ${y}) scale(${m} 1)`}>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${r * 0.82} ${-r * 0.1 + i * r * 0.15}L${r * (1.42 - i * 0.14)} ${-r * 0.3 + i * r * 0.17}L${r * (1.24 - i * 0.14)} ${-r * 0.02 + i * r * 0.15}L${r * 0.82} ${r * 0.06 + i * r * 0.15}Z`} fill="url(#vsGold)" stroke="#5E3B12" strokeWidth={2} />
      ))}
    </g>
  )
  return (
    <svg className={`${s.svg} ${s.core}`} viewBox={`0 0 ${L.W} ${L.H}`} width={L.W} height={L.H} aria-hidden style={{ transformOrigin: `${x}px ${y}px` }}>
      {wing(-1)}
      {wing(1)}
      <path className={s.spin} d={gearPath(x, y, 22, r, r * 0.88)} fill="url(#vsBronze)" stroke="#72400c" strokeWidth={2.5} />
      <circle cx={x} cy={y} r={r * 0.84} fill="#171820" stroke="#72400c" strokeWidth={4} />
      <circle className={s.spinBack} cx={x} cy={y} r={r * 0.74} fill="none" stroke="#FF8700" strokeWidth={r * 0.05} strokeDasharray={`${r * 0.34} ${r * 0.12}`} />
      <circle cx={x} cy={y} r={r * 0.64} fill="#0E0F14" stroke="url(#vsBronze)" strokeWidth={r * 0.05} />
      <circle className={s.pulse} cx={x} cy={y} r={r * 0.62} fill="url(#vsCoreGlow)" />
      <path d={`M${x} ${y + r * 1.02}l${r * 0.16} ${-r * 0.17}h${-r * 0.32}Z`} fill="url(#vsGold)" stroke="#5E3B12" strokeWidth={2} />
      <path d={`M${x} ${y - r * 1.02}l${r * 0.16} ${r * 0.17}h${-r * 0.32}Z`} fill="url(#vsGold)" stroke="#5E3B12" strokeWidth={2} />
      <text x={x} y={y + r * 0.23} textAnchor="middle" fontSize={r * 0.7} fontStyle="italic" fill="url(#vsGold)" stroke="#5E3B12" strokeWidth={r * 0.02} style={{ fontFamily: anton.style.fontFamily, letterSpacing: "-0.02em" }}>
        VS
      </text>
    </svg>
  )
}

/** Trilho reto; a energia nasce do centro da tela e clareia até a ponta. */
function Bar({ f, color, h, left, lead, delay }: { f: number; color: string; h: number; left: boolean; lead: boolean; delay: number }) {
  const along = `linear-gradient(to ${left ? "left" : "right"}, ${color}55 0%, ${color} 72%, ${color} 100%)`
  const gloss = "linear-gradient(180deg, rgba(255,255,255,.38) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,.24) 100%)"
  return (
    <div className={s.abs} style={{ inset: 0 }}>
      {/* a luz fica fora do recorte da barra, senão some */}
      <div className={`${s.fill} ${left ? s.fillL : s.fillR}`} style={{ width: `${f * 100}%`, ["--d" as string]: `${delay}ms`, boxShadow: `0 0 ${h * 0.8}px ${color}`, opacity: lead ? 0.9 : 0.5 }} />
      <div className={s.abs} style={{ inset: 0, background: "linear-gradient(180deg, #edaa29, #72400c)" }}>
        <div className={s.abs} style={{ inset: 2, background: "#0b0c12", overflow: "hidden" }}>
          <div className={`${s.fill} ${left ? s.fillL : s.fillR}`} style={{ width: `${f * 100}%`, ["--d" as string]: `${delay}ms`, overflow: "hidden", background: `${gloss}, ${along}` }}>
            <div className={s.shine} style={{ ["--d" as string]: `${delay + 500}ms` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ L, i, icon, label, a, b, color }: { L: Layout; i: number; icon: ReactNode; label: string; a: number; b: number; color: string }) {
  const { x, y, w, row, val, bar, mid, num, lab, icon: ic } = L.stats
  const top = Math.max(a, b, 1)
  const gap = (w - 2 * val - 2 * bar - mid) / 4
  const h = row - 10
  const rowY = y + i * row
  const delay = 450 + i * 60
  const left = a > b
  const right = b > a
  const value = (v: number, px: number) => (
    <div className={`${s.abs} ${anton.className} flex items-center justify-center`} style={{ left: px, top: 0, width: val, height: h, fontFamily: anton.style.fontFamily, fontSize: num, color: "#F6EFE2", lineHeight: 1, textShadow: "0 2px 0 #000" }}>
      {Math.round(v)}
    </div>
  )
  return (
    <div className={`${s.abs} ${s.row}`} style={{ left: x, top: rowY, width: w, height: h, ["--d" as string]: `${delay - 120}ms` }}>
      {value(a, 0)}
      <div className={s.abs} style={{ left: val + gap, top: h * 0.18, width: bar, height: h * 0.64 }}>
        <Bar f={a / top} color={color} h={h * 0.64} left lead={left} delay={delay} />
      </div>
      <div className={`${s.abs} ${teko.className} flex items-center justify-center gap-2 uppercase`} style={{ left: val + bar + gap * 2, top: 0, width: mid, height: h, fontSize: lab, fontWeight: 600, color: "#F6EFE2", lineHeight: 1, textShadow: "0 2px 0 #000" }}>
        <span className="flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full" style={{ width: ic, height: ic, color }}>
          {icon}
        </span>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <div className={s.abs} style={{ left: val + bar + mid + gap * 3, top: h * 0.18, width: bar, height: h * 0.64 }}>
        <Bar f={b / top} color={color} h={h * 0.64} left={false} lead={right} delay={delay} />
      </div>
      {value(b, w - val)}
    </div>
  )
}

function StartButton({ L, label, fired, onPress }: { L: Layout; label: string; fired: boolean; onPress: () => void }) {
  const { x, y, w, h, font } = L.btn
  const c = h * 0.34
  const text = Math.min(font, ((w - c * 2) / (label.length + 2.4)) * 1.9)
  const shape = (i: number) => `${c + i},${i} ${w - c - i},${i} ${w - i},${h / 2} ${w - c - i},${h - i} ${c + i},${h - i} ${i},${h / 2}`
  return (
    <button type="button" className={s.button} data-fired={fired ? "" : undefined} onClick={onPress} style={{ left: x, top: y, width: w, height: h }}>
      <svg className={s.svg} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
        <polygon points={shape(3)} fill="#1c1e28" />
        <polygon className={s.buttonGlow} points={shape(8)} fill="url(#vsBtnGlow)" />
        <polygon points={shape(3)} fill="none" stroke="#72400c" strokeWidth={10} />
        <polygon points={shape(3)} fill="none" stroke="url(#vsBronze)" strokeWidth={6} />
        <polygon points={shape(3)} fill="none" stroke="url(#vsLight)" strokeWidth={1.6} />
        <polygon points={shape(12)} fill="none" stroke="#a6650d" strokeWidth={1.4} />
      </svg>
      <span className={`${s.abs} ${teko.className} flex items-center justify-center uppercase`} style={{ inset: 0, gap: text * 0.3, fontSize: text, fontWeight: 700, color: "#FFE9B8", lineHeight: 1, textShadow: "0 2px 0 #5E3B12, 0 0 12px rgba(255,135,0,.8)" }}>
        <Swords style={{ width: text * 0.92, height: text * 0.92 }} />
        {label}
      </span>
    </button>
  )
}

export function VersusScreen({ me, foe, sheet, onStart }: { me: VersusSide; foe: VersusSide; sheet: FightSheet; onStart: () => void }) {
  const t = useTranslations("MeuMundo")
  const { ref, view } = useStage()
  const [fired, setFired] = useState(false)
  const firedRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef(onStart)
  useEffect(() => {
    startRef.current = onStart
  }, [onStart])
  // dispara uma vez só; o botão desce antes de a máquina sair da frente
  const press = useRef(() => {
    if (firedRef.current) return
    firedRef.current = true
    setFired(true)
    timer.current = setTimeout(() => startRef.current(), 140)
  })
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return
      e.preventDefault()
      press.current()
    }
    window.addEventListener("keydown", key)
    return () => {
      window.removeEventListener("keydown", key)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  const rows = [
    { key: "hp", icon: <Heart />, label: t("vsLife", "Vida"), a: sheet.me.hp, b: sheet.foe.hp, color: "#FF315A" },
    { key: "atk", icon: <Swords />, label: t("stAttack", "Ataque"), a: sheet.me.atk, b: sheet.foe.atk, color: "#FF4569" },
    { key: "def", icon: <Shield />, label: t("stDefense", "Defesa"), a: sheet.me.def, b: sheet.foe.def, color: "#28B9FF" },
    { key: "acc", icon: <Target />, label: t("atStrength", "Acuracidade"), a: sheet.me.acc, b: sheet.foe.acc, color: "#FFAD24" },
    { key: "spd", icon: <Feather />, label: t("atSpeed", "Velocidade"), a: sheet.me.spd, b: sheet.foe.spd, color: "#FFE14B" },
  ]
  const lvl = (n: number) => t("laminasFoeLevel", "Nv. {n}").replace("{n}", String(n))
  const foeSide = sheet.count > 1 ? { ...foe, name: `${foe.name} ×${sheet.count}` } : foe
  return (
    <div ref={ref} className={`${s.root} ${cinzel.className}`} style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {view && (
        <div className={s.stage} style={{ width: view.L.W, height: view.L.H, transform: `translate(-50%, -50%) scale(${view.k})` }}>
          <Frame L={view.L} />
          <Card L={view.L} side={me} x={view.L.card.lx} left sub={lvl(me.level)} />
          <Card L={view.L} side={foeSide} x={view.L.card.rx} left={false} sub={lvl(foe.level)} />
          <Core L={view.L} />
          {rows.map(({ key, ...r }, i) => (
            <StatRow key={key} L={view.L} i={i} {...r} />
          ))}
          <StartButton L={view.L} label={t("vsStart", "Iniciar luta")} fired={fired} onPress={() => press.current()} />
        </div>
      )}
    </div>
  )
}
