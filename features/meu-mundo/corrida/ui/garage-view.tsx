"use client"

// features/meu-mundo/corrida/ui/garage-view.tsx — CORRIDA (mm3d-49): a GARAGEM.
//
// Primeira tela do Antigravidade (pedido do Alex: "como na loja de skin,
// aparecendo o holograma primeiro"). O hangar "Air Race" ao fundo e a nave em
// 3D flutuando no círculo do chão (engine/garage-stage.ts): cada nave entra
// como holograma e se materializa. Setas (ou ← →) trocam; arrastar gira. O
// painel mostra o nome e os 4 status (os mesmos números da regra: SHIPS em
// sim/race.ts) e "Escolher" leva aos modos de corrida. Todas são de graça
// por enquanto (o Meu Mundo é só de administrador).

import { useEffect, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Gauge, Rocket, RotateCw, X, Zap } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { archivo } from "../../ui/status/evo-skin"
import { SHIPS, shipOf } from "../sim/race"
import { SHIP_ART, SHIP_ASSETS, shipArt, statBars } from "../engine/ship-art"
import { garageLayout, type GarageLayout } from "../engine/garage-stage"
import type { GarageStage } from "../engine/garage-stage"

const BG = { big: `${SHIP_ASSETS}garagem-air-race.webp`, small: `${SHIP_ASSETS}garagem-air-race-1024.webp` }

function panelWidth(W: number, H: number) {
  return W / H < 0.9 ? 0 : Math.min(360, Math.max(280, W * 0.3))
}

export interface GarageViewProps {
  /** A nave escolhida antes (vem marcada). */
  current: string
  onChoose: (id: string) => void
  onExit: () => void
}

export function GarageView({ current, onChoose, onExit }: GarageViewProps) {
  const t = useTranslations("MeuMundo")
  const [idx, setIdx] = useState(() => Math.max(0, SHIP_ART.findIndex((s) => s.id === current)))
  const [solid, setSolid] = useState(false)
  const [frame, setFrame] = useState<(GarageLayout & { W: number; H: number; panelW: number }) | null>(null)
  const [small, setSmall] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<GarageStage | null>(null)
  const idxRef = useRef(idx)
  const art = SHIP_ART[idx]
  const stats = statBars(shipOf(art.id))

  // enquadramento da imagem (o palco usa o mesmo)
  useEffect(() => {
    const fit = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      setSmall(W * (window.devicePixelRatio || 1) < 1300)
      setFrame({ ...garageLayout(W, H, panelWidth(W, H)), W, H, panelW: panelWidth(W, H) })
      stageRef.current?.setPanel(panelWidth(W, H))
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])

  // palco 3D (motor só no cliente)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let stage: GarageStage | null = null
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    void import("../engine/garage-stage").then(({ GarageStage }) => {
      if (!alive) return
      stage = new GarageStage(canvas, reduced, panelWidth(window.innerWidth, window.innerHeight), () => setSolid(true))
      stageRef.current = stage
      void stage.show(SHIP_ART[idxRef.current].id)
    })
    return () => {
      alive = false
      stage?.dispose()
      stageRef.current = null
    }
  }, [])
  useEffect(() => {
    if (idxRef.current === idx) return
    idxRef.current = idx
    setSolid(false)
    void stageRef.current?.show(SHIP_ART[idx].id)
  }, [idx])

  const step = (d: number) => setIdx((i) => (i + d + SHIP_ART.length) % SHIP_ART.length)

  // teclado: ← → trocam, Enter escolhe, Esc sai
  const chooseRef = useRef(() => {})
  chooseRef.current = () => onChoose(art.id)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1)
      else if (e.key === "ArrowRight") step(1)
      else if (e.key === "Enter") chooseRef.current()
      else if (e.key === "Escape") onExit()
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onExit])

  const portrait = frame?.portrait ?? false
  // celular deitado: painel da altura da tela, status em 2 colunas
  const compact = !portrait && (frame?.H ?? 800) < 560
  const statName: Record<string, string> = {
    speed: t("corridaStatSpeed", "Velocidade"),
    accel: t("corridaStatAccel", "Aceleração"),
    turn: t("corridaStatTurn", "Curva"),
    turbo: t("corridaStatTurbo", "Turbo"),
  }
  const statIcon: Record<string, React.ReactNode> = {
    speed: <Gauge className="h-4 w-4" />,
    accel: <Rocket className="h-4 w-4" />,
    turn: <RotateCw className="h-4 w-4" />,
    turbo: <Zap className="h-4 w-4" />,
  }
  const arrowDX = frame ? Math.min(frame.ppm * 2.9, portrait ? frame.W / 2 - 30 : Infinity) : 0
  // a seta da direita nunca fica embaixo do painel
  const rightX = frame ? Math.min(frame.cx + arrowDX, portrait ? frame.W - 30 : frame.W - frame.panelW - 44) : 0

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#0b1220" }}>
      {frame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={small ? BG.small : BG.big}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{ left: frame.img.left, top: frame.img.top, width: frame.img.width, height: frame.img.height }}
        />
      )}
      {/* em pé: a imagem acaba no painel com um degradê */}
      {frame && portrait && (
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{ top: frame.img.height - 120, height: 120, background: "linear-gradient(180deg, rgba(11,18,32,0) 0%, #0b1220 100%)" }}
        />
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none outline-none" aria-label={t("corridaGarageCanvas", "Nave em 3D: arraste para girar")} />

      {/* topo: título e sair */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 max-[759px]:p-3">
        <div className="rounded-[16px] px-3.5 py-2.5" style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadowSoft }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#5FE1FF" }}>
            {t("corridaGarageKicker", "Antigravidade · Garagem")}
          </div>
          <div className={`text-[20px] font-black italic leading-tight ${archivo.className}`}>{t("corridaGarageTitle", "Escolha sua nave")}</div>
        </div>
        <button
          type="button"
          aria-label={t("corridaLeave", "Voltar ao centro")}
          onClick={onExit}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full"
          style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}` }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* setas em volta da nave */}
      {frame && (
        <>
          <button
            type="button"
            aria-label={t("corridaGaragePrev", "Nave anterior")}
            onClick={() => step(-1)}
            className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform active:scale-95"
            style={{ left: Math.max(30, frame.cx - arrowDX), top: frame.cy, background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={t("corridaGarageNext", "Próxima nave")}
            onClick={() => step(1)}
            className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform active:scale-95"
            style={{ left: rightX, top: frame.cy, background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* painel: nome, status e escolher */}
      <div
        className={`absolute flex flex-col ${portrait ? "inset-x-0 bottom-0 p-3" : compact ? "bottom-3 right-3 top-3" : "bottom-4 right-4 top-[92px]"} ${archivo.className}`}
        style={portrait ? undefined : { width: frame?.panelW ?? 320 }}
      >
        <div
          className={`flex flex-col rounded-[20px] ${compact ? "p-3" : "p-4"} ${portrait ? "" : "mt-auto"}`}
          style={{ background: MM.surface, color: MM.text, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[26px] font-black italic leading-none tracking-tight max-[759px]:text-[22px]">{t(art.labelKey, art.fallback)}</h2>
            {art.id === current && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold" style={{ background: MM.rubySoft, color: MM.gold }}>
                <Check className="h-3.5 w-3.5" /> {t("corridaGarageYours", "Sua nave")}
              </span>
            )}
          </div>
          <p className={`mt-1.5 text-[13px] leading-snug ${compact ? "line-clamp-1" : ""}`} style={{ color: MM.muted }}>
            {t(art.taglineKey, art.taglineFallback)}
          </p>
          <ul className={`grid gap-2 ${compact ? "mt-2" : "mt-3"} ${portrait || compact ? "grid-cols-2 gap-x-4" : ""}`}>
            {stats.map((s) => (
              <li key={s.key}>
                <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: MM.muted }}>
                  <span style={{ color: art.holo.color }}>{statIcon[s.key]}</span>
                  {statName[s.key]}
                </div>
                <div className="mt-1 flex gap-[3px]" role="meter" aria-valuemin={1} aria-valuemax={10} aria-valuenow={s.value} aria-label={statName[s.key]}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className="h-2 flex-1 rounded-full transition-colors duration-300"
                      style={{ background: i < s.value ? art.holo.color : "rgba(255,255,255,0.12)", boxShadow: i < s.value ? `0 0 6px ${art.holo.color}66` : undefined }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className={`mt-3 items-center justify-center gap-1.5 ${compact ? "hidden" : "flex"}`} aria-hidden>
            {SHIPS.map((s, i) => (
              <span key={s.id} className="h-1.5 rounded-full transition-all" style={{ width: i === idx ? 18 : 6, background: i === idx ? MM.text : "rgba(255,255,255,0.3)" }} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChoose(art.id)}
            className={`flex w-full ${compact ? "mt-2.5 min-h-[44px]" : "mt-3 min-h-[52px]"} items-center justify-center gap-2 rounded-[14px] text-[17px] font-bold transition-[transform,opacity] active:scale-[0.98]`}
            style={{ background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: "#fff", opacity: solid ? 1 : 0.75 }}
          >
            <Rocket className="h-5 w-5" /> {t("corridaGarageChoose", "Escolher {n}").replace("{n}", t(shipArt(art.id).labelKey, art.fallback))}
          </button>
        </div>
      </div>
    </div>
  )
}
