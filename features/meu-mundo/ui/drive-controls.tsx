"use client"

// features/meu-mundo/ui/drive-controls.tsx
//
// Dirigindo (mm3d-12): o painel de ajuste do administrador.
//
// No celular não há pedal nem volante na tela (mm3d-25): o joystick de andar
// dirige todos os veículos (input.ts → driveAxis).
//
// Painel de ajuste: só aparece dentro do painel técnico (a página inteira já
// é restrita a administradores). Os números vão à sala, que os limita às
// faixas e devolve; a previsão local usa os mesmos.

import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { GameHandle } from "../engine/game"
import { TUNING_RANGES, VEHICLE, type Tuning, type TuningKey } from "../engine/vehicle"
import type { GameStats } from "../types"

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
