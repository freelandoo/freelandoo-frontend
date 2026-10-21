"use client"

// features/meu-mundo/ui/drive-controls.tsx
//
// Dirigindo (mm3d-12): controles de toque e o painel de ajuste do
// administrador.
//
// Toque: volante à ESQUERDA (◀ ▶), pedais à DIREITA (acelerar, freio/ré,
// freio de mão). Cada botão segue o SEU dedo (pointer capture), então
// acelerar + virar + freio de mão ao mesmo tempo funciona. Soltar, cancelar
// ou perder o dedo solta o botão — e a perda de foco limpa tudo (input.ts).
//
// Painel de ajuste: só aparece dentro do painel técnico (a página inteira já
// é restrita a administradores). Os números vão à sala, que os limita às
// faixas e devolve; a previsão local usa os mesmos.

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { GameHandle } from "../engine/game"
import { TUNING_RANGES, VEHICLE, type Tuning, type TuningKey } from "../engine/vehicle"
import type { GameStats } from "../types"
import { teko } from "./status/evo-skin"
import hud from "./hud/hud.module.css"

type Key = "left" | "right" | "gas" | "brake" | "hb"

function HoldButton({
  k,
  gameRef,
  className,
  style,
  label,
  children,
}: {
  k: Key
  gameRef: React.RefObject<GameHandle | null>
  className: string
  style: React.CSSProperties
  label: string
  children: React.ReactNode
}) {
  const [down, setDown] = useState(false)
  const id = useRef<number | null>(null)
  const release = () => {
    id.current = null
    setDown(false)
    gameRef.current?.setTouchDrive(k, false)
  }
  // Pele EVO (hud.module.css): placa chanfrada; apertado acende magenta.
  return (
    <div className={`absolute ${className}`} style={style}>
    <button
      type="button"
      aria-label={label}
      aria-pressed={down}
      className={`${hud.btn} ${hud.gold} ${teko.className} h-full w-full select-none flex-col !gap-0.5 !px-0`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (id.current !== null) return
        id.current = e.pointerId
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // Ponteiro sintético/encerrado: segue sem captura (o pointerup ainda solta).
        }
        setDown(true)
        gameRef.current?.setTouchDrive(k, true)
      }}
      onPointerUp={(e) => e.pointerId === id.current && release()}
      onPointerCancel={(e) => e.pointerId === id.current && release()}
      onLostPointerCapture={(e) => e.pointerId === id.current && release()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
    </div>
  )
}

const PAD = "text-[16px]"
const B = "max(16px, env(safe-area-inset-bottom))"
const L = "max(12px, env(safe-area-inset-left))"
const R = "max(12px, env(safe-area-inset-right))"

export function TouchDriveControls({ gameRef }: { gameRef: React.RefObject<GameHandle | null> }) {
  const t = useTranslations("MeuMundo")
  // Desmontar (sair do carro) solta todos os botões.
  useEffect(
    () => () => {
      for (const k of ["left", "right", "gas", "brake", "hb"] as Key[]) gameRef.current?.setTouchDrive(k, false)
    },
    [gameRef],
  )
  return (
    <>
      <HoldButton k="left" gameRef={gameRef} label={t("steerLeft", "Virar à esquerda")} className={`${PAD} h-20 w-20`} style={{ bottom: B, left: L }}>
        <ChevronLeft className="h-10 w-10" />
      </HoldButton>
      <HoldButton
        k="right"
        gameRef={gameRef}
        label={t("steerRight", "Virar à direita")}
        className={`${PAD} h-20 w-20`}
        style={{ bottom: B, left: `calc(${L} + 92px)` }}
      >
        <ChevronRight className="h-10 w-10" />
      </HoldButton>
      <HoldButton k="gas" gameRef={gameRef} label={t("gas", "Acelerar")} className={`${PAD} h-28 w-20`} style={{ bottom: B, right: R }}>
        ▲<span>{t("gasShort", "Acelera")}</span>
      </HoldButton>
      <HoldButton
        k="brake"
        gameRef={gameRef}
        label={t("brakeReverse", "Frear e dar ré")}
        className={`${PAD} h-20 w-20`}
        style={{ bottom: B, right: `calc(${R} + 92px)` }}
      >
        ▼<span>{t("brakeShort", "Freio/Ré")}</span>
      </HoldButton>
      <HoldButton
        k="hb"
        gameRef={gameRef}
        label={t("handbrake", "Freio de mão")}
        className={`${PAD} h-16 w-[172px]`}
        style={{ bottom: `calc(${B} + 124px)`, right: R }}
      >
        {t("handbrakeShort", "Freio de mão")}
      </HoldButton>
    </>
  )
}

const LABELS: Record<TuningKey, [string, string]> = {
  ENGINE: ["tuneEngine", "Força do motor (N)"],
  MAX_SPEED: ["tuneMaxSpeed", "Velocidade máxima (m/s)"],
  REVERSE_SPEED: ["tuneReverse", "Ré máxima (m/s)"],
  BRAKE: ["tuneBrake", "Freio (N)"],
  GRIP_FRONT: ["tuneGripFront", "Aderência dianteira"],
  GRIP_REAR: ["tuneGripRear", "Aderência traseira"],
  HB_GRIP: ["tuneHbGrip", "Aderência com freio de mão"],
  STEER_MAX: ["tuneSteerMax", "Esterço máximo (rad)"],
  STEER_FALL: ["tuneSteerFall", "Queda do esterço com velocidade"],
  STEER_RATE: ["tuneSteerRate", "Rapidez do volante"],
  ASSIST: ["tuneAssist", "Assistência de drift"],
  STIFF: ["tuneStiff", "Rigidez lateral do pneu"],
}

/** Telemetria + ajuste da dirigibilidade (dentro do painel técnico). */
export function CarTuningPanel({ stats, gameRef }: { stats: GameStats | null; gameRef: React.RefObject<GameHandle | null> }) {
  const t = useTranslations("MeuMundo")
  const [vals, setVals] = useState<Tuning>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const car = stats?.car
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  if (!car) return null
  const push = (next: Tuning) => {
    setVals(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => gameRef.current?.setTuning(Object.keys(next).length ? next : null), 150)
  }
  return (
    <div className="mt-1 border-t border-white/15 pt-1">
      <div className="font-bold text-[#ffaa4a]">{t("carTelemetry", "Carro")}</div>
      <div>
        {car.kmh.toFixed(0)} km/h · {t("gear", "marcha")} {car.gear > 0 ? "D" : car.gear < 0 ? "R" : "N"} · {t("steerShort", "esterço")} {car.steerDeg.toFixed(0)}°
      </div>
      <div>
        {t("contacts", "Rodas no chão")} {car.contacts}/4 · {t("slip", "traseira")} {(car.slip * 100).toFixed(0)}%
      </div>
      <div className={car.drifting ? "text-[#ffaa4a]" : ""}>
        β {car.betaDeg.toFixed(0)}° {car.drifting ? `· ${t("drifting", "DERRAPANDO")}` : ""} · {t("handbrakeShort", "Freio de mão")} {(car.handbrake * 100).toFixed(0)}%
      </div>
      <div>
        {t("serverErr", "Diferença p/ servidor")} {car.serverErr.toFixed(2)} m
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-[#ffaa4a]">{t("tuning", "Ajustar dirigibilidade")}</summary>
        <div className="mt-1 max-h-[42vh] w-64 overflow-y-auto pr-1">
          {(Object.keys(TUNING_RANGES) as TuningKey[]).map((k) => {
            const [lo, hi] = TUNING_RANGES[k]
            const v = vals[k] ?? VEHICLE[k]
            const stepSize = hi - lo > 50 ? (hi - lo) / 100 : 0.01
            return (
              <label key={k} className="block py-0.5">
                <span className="flex justify-between">
                  <span>{t(LABELS[k][0], LABELS[k][1])}</span>
                  <span className="text-[#ffaa4a]">{Number(v.toFixed(2))}</span>
                </span>
                <input
                  type="range"
                  min={lo}
                  max={hi}
                  step={stepSize}
                  value={v}
                  onChange={(e) => push({ ...vals, [k]: Number(e.target.value) })}
                  className="w-full accent-[#ffaa4a]"
                />
              </label>
            )
          })}
          <button
            type="button"
            onClick={() => push({})}
            className="mt-1 inline-flex items-center gap-1 border border-white/30 px-2 py-0.5 text-[10px] uppercase"
          >
            <RotateCcw className="h-3 w-3" />
            {t("tuneReset", "Voltar ao padrão")}
          </button>
        </div>
      </details>
    </div>
  )
}
