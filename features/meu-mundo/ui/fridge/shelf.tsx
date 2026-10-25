"use client"

// features/meu-mundo/ui/fridge/shelf.tsx — a PRATELEIRA EM ARCO (mm3d-28):
// cards verticais em arco, o do centro destacado. Peça única da geladeira e
// do Mercado do STATUS (pedido do Alex, 2026-10-25: as comidas em cards também
// no Mercado) — card escrito duas vezes diverge em silêncio.

import { useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Chamfer, EVO, FUNDO, teko } from "../status/evo-skin"
import { hoursText } from "../status/status-pages"
import type { Effect } from "./fridge-logic"

type Tr = (key: string, fallback: string) => string

export const ICE = "#bfe6ff"
export const ICE_DIM = "rgba(191,230,255,0.35)"

export function effectText(e: Effect, t: Tr) {
  const n = (v = 0) => `${v > 0 ? "+" : ""}${v}`
  switch (e.key) {
    case "satiety":
      return t("frEffSatiety", "{n} saciedade").replace("{n}", n(e.value))
    case "energy":
      return t("frEffEnergy", "{n} energia").replace("{n}", n(e.value))
    case "mood":
      return t("frEffMood", "{n} humor").replace("{n}", n(e.value))
    case "stress":
      return t("frEffStress", "{n} estresse").replace("{n}", n(e.value))
    case "good":
      return t("mkGood", "faz bem")
    case "bad":
      return t("mkBad", "faz mal")
    case "toxic":
      return t("mkTox", "tóxico")
    case "lasts":
      return t("mkLasts", "dura {h}").replace("{h}", hoursText(e.value ?? 0))
  }
}

export const toneColor = (tone: Effect["tone"]) => (tone === "good" ? EVO.bom : tone === "bad" ? "#ff6b78" : EVO.douradoClaro)

// ═══ a prateleira em arco ══════════════════════════════════════════════════
const MOUNT = 3.2

export function Arc({
  count,
  sel,
  onSel,
  onPick,
  render,
  cardW,
  cardH,
  spacing,
  compact,
  t,
}: {
  count: number
  sel: number
  onSel: (i: number) => void
  onPick: (i: number) => void
  render: (i: number, active: boolean) => ReactNode
  cardW: number
  cardH: number
  spacing: number
  compact: boolean
  t: Tr
}) {
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; id: number; moved: boolean } | null>(null)
  const movedAt = useRef(0)
  const lastWheel = useRef(0)
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i))
  const live = sel - drag / spacing

  // O arrasto é da prateleira: não chega a quem está por fora (no STATUS do
  // celular, arrastar de lado troca de página).
  const down = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (start.current || (e.pointerType === "mouse" && e.button !== 0)) return
    start.current = { x: e.clientX, id: e.pointerId, moved: false }
  }
  const move = (e: React.PointerEvent) => {
    e.stopPropagation()
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    // Arrasto de verdade: captura o ponteiro (o dedo sai da prateleira e o
    // soltar ainda chega aqui). Toque parado não captura — vira clique no card.
    if (!s.moved && Math.abs(dx) > 8) {
      s.moved = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (s.moved) setDrag(Math.max(-(count - 1 - sel) * spacing - 40, Math.min(sel * spacing + 40, dx)))
  }
  const up = (e: React.PointerEvent) => {
    e.stopPropagation()
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    start.current = null
    if (s.moved) {
      movedAt.current = performance.now()
      onSel(clamp(Math.round(sel - (e.clientX - s.x) / spacing)))
    }
    setDrag(0)
  }
  const wheel = (e: React.WheelEvent) => {
    const now = performance.now()
    if (now - lastWheel.current < 160) return
    lastWheel.current = now
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (d) onSel(clamp(sel + (d > 0 ? 1 : -1)))
  }

  const cards: ReactNode[] = []
  for (let i = 0; i < count; i++) {
    const p = i - live
    const a = Math.abs(p)
    if (a > MOUNT) continue
    const active = i === sel
    cards.push(
      <div
        key={i}
        className="absolute left-1/2 top-0"
        style={{
          width: cardW,
          height: cardH,
          marginLeft: -cardW / 2,
          transform: `translate3d(${p * spacing}px, ${a * a * 9}px, ${-a * 150}px) rotateY(${-p * 26}deg)`,
          opacity: Math.max(0, Math.min(1, 1 - (a - 2) * 0.8)),
          zIndex: 100 - Math.round(a * 10),
          transition: drag ? "none" : "transform 380ms cubic-bezier(.2,.8,.2,1), opacity 380ms",
          willChange: "transform, opacity",
          cursor: "pointer",
        }}
        onClick={() => {
          if (performance.now() - movedAt.current < 250) return
          if (active) onPick(i)
          else onSel(i)
        }}
        aria-current={active || undefined}
      >
        {render(i, active)}
      </div>,
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-[980px]">
      <div
        className="relative w-full select-none overflow-hidden"
        style={{ height: cardH + (compact ? 30 : 46), perspective: 1100, touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        <div className={`absolute inset-x-0 ${compact ? "top-2" : "top-4"}`} style={{ transformStyle: "preserve-3d", height: cardH }}>
          {cards}
        </div>
        {/* a prateleira: faixa fria acesa embaixo dos cards (estática) */}
        <div
          className="pointer-events-none absolute inset-x-[6%] bottom-2 h-[3px]"
          style={{ background: `linear-gradient(90deg, transparent, ${ICE}, transparent)`, boxShadow: `0 0 18px ${ICE}` }}
        />
      </div>
      <button
        type="button"
        onClick={() => onSel(clamp(sel - 1))}
        disabled={sel <= 0}
        aria-label={t("frPrev", "Anterior")}
        className={`absolute left-0 top-1/2 flex ${compact ? "h-10 w-8" : "h-14 w-11"} -translate-y-1/2 items-center justify-center disabled:opacity-25`}
        style={{ color: ICE, background: "rgba(8,7,11,0.6)" }}
      >
        <ChevronLeft className={compact ? "h-6 w-6" : "h-8 w-8"} />
      </button>
      <button
        type="button"
        onClick={() => onSel(clamp(sel + 1))}
        disabled={sel >= count - 1}
        aria-label={t("frNext", "Próximo")}
        className={`absolute right-0 top-1/2 flex ${compact ? "h-10 w-8" : "h-14 w-11"} -translate-y-1/2 items-center justify-center disabled:opacity-25`}
        style={{ color: ICE, background: "rgba(8,7,11,0.6)" }}
      >
        <ChevronRight className={compact ? "h-6 w-6" : "h-8 w-8"} />
      </button>
    </div>
  )
}

export function Card({
  active,
  empty,
  img,
  badge,
  w,
  h,
  compact,
  children,
}: {
  active: boolean
  empty: boolean
  img: string
  /** selo do canto (quantidade, preço); vazio = sem selo */
  badge?: string
  w: number
  h: number
  compact: boolean
  children: ReactNode
}) {
  const imgH = Math.round(h * 0.6)
  return (
    <div className="relative h-full w-full">
      {/* neon do escolhido: camada estática, só a opacidade muda */}
      <div
        className="pointer-events-none absolute -inset-[3px]"
        style={{ boxShadow: `inset 0 0 0 3px ${EVO.magenta}, 0 0 22px ${EVO.magenta}`, opacity: active ? 1 : 0, transition: "opacity 240ms" }}
      />
      <Chamfer cut={14} border={active ? EVO.rosaClaro : ICE_DIM} width={1.5} className="h-full" fill={FUNDO.card}>
        <div className="relative overflow-hidden" style={{ height: imgH, background: "radial-gradient(ellipse at 50% 35%, #2a3646, #0d1118)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail local pequena, só no jogo (admin) */}
          <img
            src={img}
            alt=""
            width={w}
            height={imgH}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
            style={{ opacity: empty ? 0.35 : 1 }}
          />
          {badge && (
          <span
            className={`${teko.className} absolute right-0 top-0 ${compact ? "px-1.5 pb-0 pt-[3px] text-[13px]" : "px-2 pb-0.5 pt-1 text-[18px]"} font-semibold leading-none`}
            style={{ background: empty ? EVO.vinho : EVO.douradoClaro, color: empty ? EVO.branco : EVO.preto }}
          >
            {badge}
          </span>
          )}
        </div>
        <div className={compact ? "px-2 pb-1.5 pt-1" : "px-2.5 pb-2 pt-1.5"}>{children}</div>
      </Chamfer>
    </div>
  )
}
