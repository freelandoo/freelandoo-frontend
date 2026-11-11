"use client"

// features/meu-mundo/ui/status/sheet-stage.tsx — o PALCO da Ficha (apresentação 14,
// Anexo A §7.1): no lugar do retrato, o personagem 3D de pé num palco escuro, com o
// facho de luz e o pedestal do SkinStage (o mesmo da Criogenia e do Hall). À esquerda
// do corpo: o temperamento, o nome e o Poder (o maior número da tela). As abas do
// palco TROCAM o que está nele: Corpo = o personagem; Alma = o mesmo corpo em
// holograma na cor da alma.
//
// Custo: um motor próprio só enquanto o palco está À VISTA (IntersectionObserver;
// a página vizinha do carrossel não liga o dela) e descartado ao sair. No nível `low`
// do jogo e sem WebGL, fica o retrato de antes.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { anton } from "../hud/fight-plate"
import { TYPE } from "../kit/type-scale"
import { archivo } from "./evo-skin"
import type { BodyId } from "../../types"
import type { SkinStage } from "../../engine/skin-stage"

type Tr = (k: string, fb: string) => string
type Tab = "body" | "soul"

/** Pés a 90% da altura, um pouco à direita (o texto mora à esquerda); corpo com 80% da altura. */
const FRAME = { feetX: 0.66, feetY: 0.9, figure: 0.8, still: true, face: Math.PI - 0.35 }
const LOOK: Record<Tab, { holo: boolean; color: string; accent: string }> = {
  body: { holo: false, color: "#FFD68A", accent: "#FFFFFF" },
  soul: { holo: true, color: "#B98AFF", accent: "#F2E6FF" },
}

function lowTier() {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-mm-fx") === "low"
}

export function SheetStage({
  body,
  portrait,
  name,
  temper,
  power,
  level,
  height,
  t,
  children,
}: {
  body: BodyId
  portrait: string
  name: string
  temper: string
  power: number | null
  level: number | null
  height: number
  t: Tr
  /** Botão do canto de baixo à direita (Personagens). */
  children?: ReactNode
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<SkinStage | null>(null)
  const [tab, setTab] = useState<Tab>("body")
  const tabRef = useRef<Tab>("body")
  const [visible, setVisible] = useState(false)
  const [flat, setFlat] = useState(false)

  // só liga o motor com o palco à vista
  useEffect(() => {
    setFlat(lowTier())
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true)
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || flat) return
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let stage: SkinStage | null = null
    void import("../../engine/skin-stage")
      .then(({ SkinStage }) => {
        if (!alive) return
        const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        stage = new SkinStage(canvas, reduced, FRAME)
        stageRef.current = stage
        void stage.show({ body, ...LOOK[tabRef.current], look: "" }).catch(() => {})
      })
      .catch(() => alive && setFlat(true))
    return () => {
      alive = false
      stageRef.current = null
      stage?.dispose()
    }
  }, [visible, flat, body])

  const pick = (k: Tab) => {
    setTab(k)
    tabRef.current = k
    void stageRef.current?.show({ body, ...LOOK[k], look: "" }, false).catch(() => {})
  }

  return (
    <div
      ref={boxRef}
      className="relative w-full shrink-0 overflow-hidden"
      style={{
        height,
        // palco escuro com o facho vindo de cima, sobre o corpo
        background:
          "radial-gradient(ellipse 34% 46% at 66% 100%, rgba(255,214,138,0.20) 0%, rgba(255,214,138,0) 70%), linear-gradient(100deg, rgba(0,0,0,0) 52%, rgba(255,226,170,0.10) 60%, rgba(255,226,170,0.04) 72%, rgba(0,0,0,0) 80%), radial-gradient(ellipse at 60% 20%, #1d2530 0%, #0b0e13 70%)",
        boxShadow: "inset 0 0 0 1px #8A6430",
      }}
    >
      {flat ? (
        // eslint-disable-next-line @next/next/no-img-element -- retrato local (nível low / sem WebGL)
        <img src={portrait} alt="" decoding="async" draggable={false} className="absolute bottom-0 h-[92%] object-cover object-top" style={{ right: "4%", aspectRatio: "4 / 5" }} />
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: "grab" }} aria-label={name} />
      )}

      {/* à esquerda do corpo: temperamento · nome · Poder */}
      <div className={`${archivo.className} pointer-events-none absolute left-3 top-3 flex w-[52%] flex-col`} style={{ bottom: 12 }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#E8B65B", textShadow: "0 1px 0 #000" }}>
          {tab === "soul" ? t("stPageSoul", "Alma") : temper}
        </span>
        <span className={`${anton.className} mt-1 uppercase leading-[1.1] [overflow-wrap:anywhere]`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.title, color: "#FFF4DC", textShadow: "0 2px 0 #000" }}>
          {name}
        </span>
        <span className="mt-auto text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#C9B48A", textShadow: "0 1px 0 #000" }}>
          {t("stPower", "PODER")}
        </span>
        <span className={`${anton.className} tabular-nums leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.banner, color: "#FFE2A6", textShadow: "0 3px 0 #000" }}>
          {power != null ? Math.round(power) : "—"}
        </span>
        {level != null && (
          <span className="mt-1 text-[13px] font-semibold" style={{ color: "#F3EAD8", textShadow: "0 1px 0 #000" }}>
            {t("hudLevel", "Nv. {n}").replace("{n}", String(level))}
          </span>
        )}
      </div>

      {/* as abas do palco (trocam o que está nele) */}
      <div className={`${archivo.className} absolute right-1 top-1 flex`} role="tablist" aria-label={t("stStageTabs", "O que mostrar no palco")}>
        {(["body", "soul"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => pick(k)}
            className="flex h-11 min-w-11 items-center justify-center px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A1F]"
          >
            <span
              className="px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={tab === k ? { background: "#FFE2A6", color: "#14171C" } : { color: "#F3EAD8", boxShadow: "inset 0 0 0 1px rgba(232,182,91,0.55)", background: "rgba(10,13,17,0.55)" }}
            >
              {k === "body" ? t("stStageBody", "Corpo") : t("stPageSoul", "Alma")}
            </span>
          </button>
        ))}
      </div>

      {children && <div className="absolute bottom-2 right-2">{children}</div>}
    </div>
  )
}
