"use client"

// features/meu-mundo/ui/hospital-view.tsx — o INTERIOR do hospital (mm3d-26).
//
// Cobre a tela como o minijogo do jetpack: o centro fica suspenso por baixo
// (visita) ou nem é montado (internado — a casca abre esta tela no lugar da
// cena). Tela mínima: o joystick e um botão por vez.

import { useEffect, useRef, useState } from "react"
import { ArrowUpFromLine, BedDouble, Armchair, DoorOpen, HeartPulse, Hospital } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { createHospitalGame, type HospitalGameHandle, type HospitalMode } from "../engine/hospital-game"
import type { BodyId, InteriorDef, Interactable } from "../types"
import { Joystick, SAFE, SceneCurtain } from "./meu-mundo-view"
import { EvoButton, HudChip, IdPlate } from "./hud/hud-kit"

export interface HospitalViewProps {
  interior: InteriorDef
  body: BodyId
  mode: HospitalMode
  /** Leito do internado (GET /meu-mundo/hospital). */
  bed?: string
  /** Visita: a porta devolve ao centro. Internado: só depois da alta. */
  onExit?: () => void
  /** Internado: saúde agora (0–100) e a de alta, para a placa. */
  health?: number | null
  dischargeAt?: number
  /** Alta dada pela vida: libera "Sair do hospital". */
  discharged?: boolean
  onOpenStatus?: () => void
}

export function HospitalView({ interior, body, mode, bed, onExit, health, dischargeAt, discharged, onOpenStatus }: HospitalViewProps) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<HospitalGameHandle | null>(null)
  const exitRef = useRef(onExit)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [resting, setResting] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  // Internado com alta: a cena reabre a pé (o leito deixa de prender).
  const sceneMode: HospitalMode = mode === "patient" && !discharged ? "patient" : "visit"

  useEffect(() => {
    exitRef.current = onExit
  }, [onExit])

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let handle: HospitalGameHandle | null = null
    setStatus("loading")
    try {
      handle = createHospitalGame({
        canvas,
        interior,
        body,
        mode: sceneMode,
        bed,
        onReady: () => alive && setStatus("ready"),
        onNearbyChange: (it) => alive && setNearby(it),
        onRest: (b) => alive && setResting(!!b),
        onExit: () => alive && exitRef.current?.(),
        onError: () => alive && setStatus("error"),
      })
      gameRef.current = handle
    } catch (err) {
      console.error("[meu-mundo] falha ao abrir o hospital", err)
      setStatus("error")
    }
    return () => {
      alive = false
      handle?.dispose()
      gameRef.current = null
    }
  }, [interior, body, sceneMode, bed, attempt])

  const patient = sceneMode === "patient"
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  const action =
    nearby?.kind === "door"
      ? { label: t("hospitalLeave", "Sair"), icon: <DoorOpen className="h-5 w-5" /> }
      : nearby?.kind === "bed"
        ? { label: t("bedLie", "Deitar"), icon: <BedDouble className="h-5 w-5" /> }
        : nearby?.kind === "seat"
          ? { label: t("sit", "Sentar"), icon: <Armchair className="h-5 w-5" /> }
          : null

  return (
    <div className="fl-sharp fixed inset-0 z-[70] touch-none select-none overflow-hidden bg-[#33393d]">
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("hospitalAria", "Dentro do hospital")} />

      <div className="pointer-events-none absolute left-0 top-0" style={{ paddingTop: SAFE.top, paddingLeft: SAFE.left }}>
        <IdPlate seal={["医", "院"]} title={t("centerPlace_hospital", "Hospital")}>
          {patient ? (
            <HudChip tone="perigo" icon={<Hospital className="h-3 w-3" />}>
              {t("actHospital", "Internado")}
            </HudChip>
          ) : discharged ? (
            <HudChip tone="bom" icon={<HeartPulse className="h-3 w-3" />}>
              {t("hospitalDischarged", "Alta")}
            </HudChip>
          ) : null}
          {mode === "patient" && typeof health === "number" && (
            <HudChip icon={<HeartPulse className="h-3 w-3" />}>
              {t("hospitalHealth", "Saúde {n}/{max}")
                .replace("{n}", String(Math.round(health)))
                .replace("{max}", String(dischargeAt ?? 100))}
            </HudChip>
          )}
        </IdPlate>
      </div>

      {status === "ready" && (
        <div className="absolute flex flex-col items-end gap-2" style={{ bottom: bottom(isTouch ? 24 : 16), right: SAFE.right }}>
          {onOpenStatus && mode === "patient" && (
            <EvoButton variant="gold" icon={<HeartPulse className="h-5 w-5" />} onClick={onOpenStatus}>
              {t("stTitle", "Status")}
            </EvoButton>
          )}
          {!patient && resting && (
            <EvoButton variant="primary" icon={<ArrowUpFromLine className="h-5 w-5" />} onClick={() => gameRef.current?.stand()} kbd={isTouch ? undefined : "E"}>
              {t("stand", "Levantar")}
            </EvoButton>
          )}
          {!patient && !resting && action && (
            <EvoButton variant="primary" icon={action.icon} onClick={() => gameRef.current?.interact()} kbd={isTouch ? undefined : "E"}>
              {action.label}
            </EvoButton>
          )}
        </div>
      )}

      {status === "ready" && isTouch && !patient && <Joystick gameRef={gameRef} />}

      {status !== "ready" && (
        <SceneCurtain
          status={status}
          text={t("hospitalLoading", "Entrando no hospital…")}
          errorTitle={t("hospitalErrorTitle", "O hospital não abriu")}
          errorText={t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
          onRetry={() => setAttempt((n) => n + 1)}
          onLeave={onExit ?? (() => {})}
          leaveLabel={t("hospitalLeave", "Sair")}
        />
      )}
    </div>
  )
}
