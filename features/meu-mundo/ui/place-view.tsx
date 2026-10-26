"use client"

// features/meu-mundo/ui/place-view.tsx — o INTERIOR de um prédio do centro
// (mm3d-26 hospital; mm3d-37 todos os outros).
//
// Cobre a tela como o minijogo do jetpack: o centro fica suspenso por baixo
// (visita) ou nem é montado (internado/preso — a casca abre esta tela no
// lugar da cena). Tela mínima: o joystick e um botão por vez. O que se faz
// num ponto (treinar, estudar, rezar, pedir, pagar, conversar) é da tela de
// quem chamou (`onUse`); esta só diz onde a pessoa está.

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ArrowUpFromLine,
  Armchair,
  BedDouble,
  BookOpen,
  DoorOpen,
  Dumbbell,
  HandCoins,
  HeartPulse,
  MessagesSquare,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { createPlaceGame, type PlaceGameHandle, type PlaceMode, type PlaceState } from "../engine/place-game"
import type { PlacePose } from "../engine/avatars"
import type { BodyId, InteriorDef, Interactable, PlaceUse } from "../types"
import { Joystick, SAFE, SceneCurtain } from "./meu-mundo-view"
import { EvoButton } from "./hud/hud-kit"

type Tr = (key: string, fallback: string) => string

/** Rótulo e ícone do que se faz em cada uso. */
function actionOf(use: PlaceUse, t: Tr): { label: string; icon: ReactNode } {
  switch (use) {
    case "train":
      return { label: t("pvTrain", "Treinar"), icon: <Dumbbell className="h-5 w-5" /> }
    case "study":
      return { label: t("pvStudy", "Estudar"), icon: <BookOpen className="h-5 w-5" /> }
    case "pray":
      return { label: t("pvPray", "Rezar"), icon: <Sparkles className="h-5 w-5" /> }
    case "order":
      return { label: t("pvOrder", "Fazer pedido"), icon: <UtensilsCrossed className="h-5 w-5" /> }
    case "market":
      return { label: t("pvMarket", "Comprar"), icon: <ShoppingCart className="h-5 w-5" /> }
    case "seller":
      return { label: t("pvSeller", "Conversar"), icon: <MessagesSquare className="h-5 w-5" /> }
    case "police":
      return { label: t("pvPolice", "Falar com o delegado"), icon: <ShieldCheck className="h-5 w-5" /> }
  }
}

/** O uso de onde a pessoa está (assento com uso ou ponto de uso). */
export const placeUseOf = (s: PlaceState): PlaceUse | null => (s.kind === "spot" ? s.spot.use : s.kind === "seat" ? (s.seat.use ?? null) : null)

export interface PlaceViewProps {
  interior: InteriorDef
  body: BodyId
  /** Cores do personagem (mm3d-36). */
  look?: string
  mode: PlaceMode
  /** Leito do internado / cama do preso. */
  bed?: string
  /** Nome do lugar para a cortina ("Entrando na academia…"). */
  placeName?: string
  /** Visita: a porta devolve ao centro. Internado/preso: só depois da liberação. */
  onExit?: () => void
  /** Ação no ponto (treinar, estudar…); sem ela, "em breve". */
  onUse?: (use: PlaceUse, state: PlaceState) => void
  /** Botões extras da tela de quem chamou (placa do internado, cronômetro do preso…). */
  extra?: ReactNode
  /** Mudou onde a pessoa está (a tela de quem chamou pode reagir). */
  onState?: (state: PlaceState) => void
  /** O movimento da atividade em andamento (treino, reza), null = parado. */
  pose?: PlacePose | null
  /** Onde fazer o movimento (a reza ajoelha em frente ao banco). */
  poseAt?: { x: number; z: number; facing: number } | null
  /** Bloqueia o andar (diálogo aberto por cima). */
  blocked?: boolean
  /** Esconde o botão da ação (já em andamento). */
  hideUse?: boolean
  /** Internado: saúde agora (0–100) e a de alta, para a placa. */
  health?: number | null
  dischargeAt?: number
  /** Alta (ou fim da pena) dada pela vida: libera sair. */
  discharged?: boolean
  onOpenStatus?: () => void
}

export function PlaceView({ interior, body, look = "", mode, bed, placeName, onExit, onUse, extra, onState, pose = null, poseAt = null, blocked = false, hideUse = false, discharged, onOpenStatus }: PlaceViewProps) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<PlaceGameHandle | null>(null)
  const exitRef = useRef(onExit)
  const stateRef = useRef(onState)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [where, setWhere] = useState<PlaceState>({ kind: "free" })
  const [soon, setSoon] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  // Internado/preso liberado: a cena reabre a pé (a cama deixa de prender).
  const sceneMode: PlaceMode = mode !== "visit" && discharged ? "visit" : mode

  useEffect(() => {
    exitRef.current = onExit
    stateRef.current = onState
  }, [onExit, onState])

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches)
  }, [])

  useEffect(() => {
    if (!soon) return
    const id = window.setTimeout(() => setSoon(false), 2600)
    return () => window.clearTimeout(id)
  }, [soon])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let handle: PlaceGameHandle | null = null
    setStatus("loading")
    try {
      handle = createPlaceGame({
        canvas,
        interior,
        body,
        look,
        mode: sceneMode,
        bed,
        onReady: () => alive && setStatus("ready"),
        onNearbyChange: (it) => alive && setNearby(it),
        onState: (s) => {
          if (!alive) return
          setWhere(s)
          stateRef.current?.(s)
        },
        onExit: () => alive && exitRef.current?.(),
        onError: () => alive && setStatus("error"),
      })
      gameRef.current = handle
    } catch (err) {
      console.error("[meu-mundo] falha ao abrir o interior", err)
      setStatus("error")
    }
    return () => {
      alive = false
      handle?.dispose()
      gameRef.current = null
    }
  }, [interior, body, look, sceneMode, bed, attempt])

  useEffect(() => {
    gameRef.current?.setPose(pose, poseAt ?? undefined)
  }, [pose, poseAt, status])

  useEffect(() => {
    gameRef.current?.setBlocked(blocked)
  }, [blocked, status])

  const patient = sceneMode === "patient"
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  const action =
    nearby?.kind === "door"
      ? { label: t("hospitalLeave", "Sair"), icon: <DoorOpen className="h-5 w-5" /> }
      : nearby?.kind === "bed"
        ? { label: t("bedLie", "Deitar"), icon: <BedDouble className="h-5 w-5" /> }
        : nearby?.kind === "seat"
          ? { label: t("sit", "Sentar"), icon: <Armchair className="h-5 w-5" /> }
          : nearby?.kind === "spot"
            ? { label: t("pvGoTo", "Usar"), icon: actionOf(nearby.spot.use, t).icon }
            : null
  const use = placeUseOf(where)
  const doUse = () => {
    if (!use) return
    if (onUse) onUse(use, where)
    else setSoon(true)
  }

  return (
    <div className="fixed inset-0 z-[70] touch-none select-none overflow-hidden bg-[#33393d]">
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={placeName ?? t("hospitalAria", "Dentro do hospital")} />

      {status === "ready" && soon && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-xl bg-black/70 px-4 py-2 text-[15px] font-semibold text-white">
          {t("pvSoon", "Em breve")}
        </div>
      )}

      {status === "ready" && (
        <div className="absolute flex flex-col items-end gap-2" style={{ bottom: bottom(isTouch ? 24 : 16), right: SAFE.right }}>
          {extra}
          {onOpenStatus && mode === "patient" && (
            <EvoButton variant="gold" icon={<HeartPulse className="h-5 w-5" />} onClick={onOpenStatus}>
              {t("stTitle", "Status")}
            </EvoButton>
          )}
          {!patient && use && !hideUse && (
            <EvoButton variant="gold" icon={actionOf(use, t).icon} onClick={doUse}>
              {actionOf(use, t).label}
            </EvoButton>
          )}
          {!patient && where.kind !== "free" && (
            <EvoButton variant="primary" icon={<ArrowUpFromLine className="h-5 w-5" />} onClick={() => gameRef.current?.stand()} kbd={isTouch ? undefined : "E"}>
              {where.kind === "spot" ? t("pvLeaveSpot", "Sair daqui") : t("stand", "Levantar")}
            </EvoButton>
          )}
          {!patient && where.kind === "free" && action && (
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
          text={placeName ? t("pvLoading", "Entrando: {place}…").replace("{place}", placeName) : t("hospitalLoading", "Entrando no hospital…")}
          errorTitle={t("pvErrorTitle", "O lugar não abriu")}
          errorText={t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
          onRetry={() => setAttempt((n) => n + 1)}
          onLeave={onExit ?? (() => {})}
          leaveLabel={t("hospitalLeave", "Sair")}
        />
      )}
    </div>
  )
}

/** O hospital (mm3d-26): a mesma tela, com o texto dele. */
export function HospitalView(props: Omit<PlaceViewProps, "placeName">) {
  return <PlaceView {...props} />
}
