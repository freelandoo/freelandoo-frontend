"use client"

// features/meu-mundo/ui/house-view.tsx — o INTERIOR de uma casa (mm3d-09).
//
// Um jogo por montagem, como o bairro: a casca troca de ambiente desmontando
// esta tela (o descarte do motor acontece aqui) antes de montar a próxima.
// A porta pede a saída ao servidor pela casca; sentar, deitar, dormir e
// levantar vão pela sala (mm3d-13: deitar e dormir gravam a vida do hóspede —
// ele continua dormindo com o jogo fechado).

import { useCallback, useEffect, useRef, useState } from "react"
import { DoorOpen, Footprints, Info, Armchair, ArrowUpFromLine, BedDouble, Moon, RefreshCw, Send, Sun, Users, Wifi, WifiOff, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { createHouseGame, type HouseGameHandle } from "../engine/house-game"
import { fetchSession } from "../data"
import type { GameStats, HousePayload, Interactable, NetStatus, VisitState } from "../types"
import { BTN, CLIENT_RELEASE, Joystick, SAFE } from "./meu-mundo-view"

export interface HouseSceneProps {
  payload: HousePayload
  visits: VisitState | null
  onExit: () => void
  onOpenInvite: () => void
  onMoved: () => void
  onServerMessage: (type: string, payload: unknown) => void
  blocked?: boolean
}

export default function HouseView({ payload, visits, onExit, onOpenInvite, onMoved, onServerMessage, blocked }: HouseSceneProps) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<HouseGameHandle | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [net, setNet] = useState<NetStatus>("connecting")
  const [online, setOnline] = useState(1)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [seat, setSeat] = useState<string | null>(null)
  const [rest, setRest] = useState<{ bed: string; sleeping: boolean } | null>(null)
  const [denied, setDenied] = useState<string | null>(null)
  const [restDenied, setRestDenied] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  const cbRef = useRef({ onExit, onMoved, onServerMessage })
  useEffect(() => {
    cbRef.current = { onExit, onMoved, onServerMessage }
  }, [onExit, onMoved, onServerMessage])
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0),
  )
  const h = payload.house
  const isOwner = payload.me.role === "owner"

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let handle: HouseGameHandle | null = null
    let alive = true
    const raf = requestAnimationFrame(() => {
      if (!alive) return
      try {
        handle = createHouseGame({
          canvas,
          payload,
          fetchSession: async () => {
            const token = getToken()
            return token ? fetchSession(token) : null
          },
          onNet: (s) => {
            if (!alive) return
            setNet(s)
            if (s === "moved") cbRef.current.onMoved()
          },
          onServerMessage: (type, p) => alive && cbRef.current.onServerMessage(type, p),
          onOnline: (n) => alive && setOnline(n),
          onReady: () => alive && setStatus("ready"),
          onNearbyChange: (it) => alive && setNearby(it),
          onSeat: (s) => alive && setSeat(s),
          onSeatDenied: (r) => {
            if (!alive) return
            setDenied(r)
            setTimeout(() => alive && setDenied(null), 2500)
          },
          onRest: (r) => alive && setRest(r),
          onRestDenied: (r) => {
            if (!alive) return
            setRestDenied(r)
            setTimeout(() => alive && setRestDenied(null), 3000)
          },
          onInteract: (it) => {
            if (!alive) return
            if (it.kind === "door") cbRef.current.onExit()
            else if (it.kind === "seat") handle?.sit(it.seat.id)
            else if (it.kind === "bed") handle?.lie(it.bed.id)
          },
          onStats: (s) => alive && setStats(s),
          onError: () => alive && setStatus("error"),
        })
        handle.setStatsEnabled(true)
        gameRef.current = handle
      } catch (err) {
        console.error("[meu-mundo] falha ao iniciar o interior", err)
        setStatus("error")
      }
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      handle?.dispose()
      gameRef.current = null
    }
  }, [payload, attempt])

  useEffect(() => {
    gameRef.current?.setBlocked(infoOpen || !!blocked)
  }, [infoOpen, blocked])

  useEffect(() => {
    if (!infoOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setInfoOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [infoOpen])

  const toggleRun = useCallback(() => {
    setRunning((r) => {
      gameRef.current?.setRun(!r)
      return !r
    })
  }, [])

  const netLabel = {
    connecting: t("netConnecting", "Conectando"),
    online: t("netOnline", "Online"),
    reconnecting: t("netReconnecting", "Reconectando"),
    offline: t("netOffline", "Conexão interrompida"),
    replaced: t("netReplaced", "Aberto em outra janela"),
    moved: t("netMoved", "Mudando de lugar…"),
  }[net]

  const actionLabel = rest
    ? rest.sleeping
      ? t("bedWake", "Acordar")
      : t("stand", "Levantar")
    : seat
      ? t("stand", "Levantar")
      : nearby?.kind === "door"
        ? t("exitHouse", "Sair da casa")
        : nearby?.kind === "seat"
          ? t("sit", "Sentar")
          : nearby?.kind === "bed"
            ? t("bedLie", "Deitar")
            : ""
  const actionIcon = rest?.sleeping ? (
    <Sun className="h-5 w-5 shrink-0" />
  ) : seat || rest ? (
    <ArrowUpFromLine className="h-5 w-5 shrink-0" />
  ) : nearby?.kind === "door" ? (
    <DoorOpen className="h-5 w-5 shrink-0" />
  ) : nearby?.kind === "bed" ? (
    <BedDouble className="h-5 w-5 shrink-0" />
  ) : (
    <Armchair className="h-5 w-5 shrink-0" />
  )
  const hasAction = !!seat || !!rest || !!nearby
  // Deitado (acordado): "Dormir" ao lado da ação. Dormir fica 8 h.
  const canSleep = !!rest && !rest.sleeping
  const restDeniedLabel =
    restDenied === "taken"
      ? t("bedTaken", "Essa cama já está ocupada")
      : restDenied === "far"
        ? t("bedFar", "Chegue mais perto da cama")
        : restDenied === "stimulated"
          ? t("bedStimulated", "Com estimulante no corpo ele não consegue dormir")
          : restDenied === "hospital"
            ? t("lifeInHospital", "Ele está internado no hospital")
            : restDenied === "dead"
              ? t("lifeDead", "Seu hóspede morreu")
              : t("bedDenied", "Não deu para deitar agora")
  const lotLabel = String(h.number).padStart(2, "0")

  const visitLine = (() => {
    const a = visits?.active
    if (a && a.house === h.number) {
      return a.role === "host"
        ? t("visitHostLine", "Visita de {name}").replace("{name}", a.guestName)
        : t("visitGuestLine", "Você está visitando {name}").replace("{name}", a.hostName)
    }
    if (visits?.outgoing) return t("visitPendingLine", "Convite para {name} aguardando").replace("{name}", visits.outgoing.guestName)
    return t("visitNone", "Sem visita")
  })()

  return (
    <div className="fl-sharp fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-[#29262B]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full outline-none"
        style={{ touchAction: "none" }}
        aria-label={t("houseCanvasAria", "Interior da casa")}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2"
        style={{ paddingTop: SAFE.top, paddingLeft: SAFE.left, paddingRight: SAFE.right }}
      >
        <div className="pointer-events-auto border-2 border-[#0B0B0D] bg-[#F7F0D9] px-3 py-1.5 shadow-[3px_3px_0_0_#0B0B0D]">
          <div className="text-[13px] font-black uppercase leading-none tracking-wide text-[#0B0B0D]">
            {isOwner
              ? t("yourHouse", "Sua casa")
              : t("houseOf", "Casa de {name}").replace("{name}", h.ownerName)}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8A6400]">
            {t("houseSub", "Casa {n} · nível {l}")
              .replace("{n}", lotLabel)
              .replace("{l}", String(h.level).padStart(2, "0"))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 bg-[#0B0B0D] px-1.5 py-0.5 text-[#F7F0D9]">
              <Users className="h-3 w-3" />
              {t("insideNow", "{n} aqui dentro").replace("{n}", String(online))}
            </span>
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-white ${
                net === "online" ? "bg-[#15803D]" : net === "offline" || net === "replaced" ? "bg-[#B91C1C]" : "bg-[#8A6400]"
              }`}
            >
              {net === "online" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {netLabel}
            </span>
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-2">
          {(net === "offline" || net === "replaced") && (
            <button type="button" onClick={() => gameRef.current?.reconnect()} className={BTN}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("reconnect", "Reconectar")}</span>
            </button>
          )}
          {isOwner && (
            <button type="button" onClick={onOpenInvite} className={BTN} aria-label={t("invite", "Convidar")}>
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t("invite", "Convidar")}</span>
            </button>
          )}
          <button type="button" onClick={() => setInfoOpen(true)} className={BTN} aria-label={t("houseInfo", "Informações da casa")}>
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">{t("houseInfoShort", "Casa")}</span>
          </button>
          {/* Sair é na porta (o servidor confere); longe dela o botão só orienta. */}
          <button
            type="button"
            onClick={onExit}
            disabled={nearby?.kind !== "door"}
            className={`${BTN} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={nearby?.kind === "door" ? t("exitHouse", "Sair da casa") : t("exitGoToDoor", "Vá até a porta para sair")}
            title={nearby?.kind === "door" ? undefined : t("exitGoToDoor", "Vá até a porta para sair")}
          >
            <DoorOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{t("exitHouse", "Sair da casa")}</span>
          </button>
        </div>
      </div>

      {denied && (
        <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-4">
          <div className="border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2 text-xs font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
            {denied === "taken" ? t("seatTaken", "Esse lugar já está ocupado") : t("seatDenied", "Chegue mais perto para sentar")}
          </div>
        </div>
      )}

      {restDenied && (
        <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-4">
          <div className="border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2 text-xs font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
            {restDeniedLabel}
          </div>
        </div>
      )}

      {rest?.sleeping && (
        <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-4">
          <div className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-3 py-2 text-xs font-black uppercase text-[#F7F0D9] shadow-[3px_3px_0_0_#F2B705]">
            <Moon className="h-4 w-4 shrink-0" />
            {t("bedSleepingLine", "Dormindo — ele continua dormindo mesmo com o jogo fechado")}
          </div>
        </div>
      )}

      {/* Deitado: dormir (8 h). Computador e celular. */}
      {status === "ready" && canSleep && !infoOpen && (
        <button
          type="button"
          onClick={() => gameRef.current?.sleep(8)}
          aria-label={t("bedSleep", "Dormir")}
          className="absolute flex min-h-12 items-center gap-2 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-4 py-3 text-sm font-black uppercase text-[#F2B705] shadow-[3px_3px_0_0_#F2B705]"
          style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 96px)", right: SAFE.right }}
        >
          <Moon className="h-5 w-5 shrink-0" />
          {t("bedSleep", "Dormir")}
        </button>
      )}

      {/* Computador: ação clicável com o atalho E */}
      {status === "ready" && hasAction && !infoOpen && !isTouch && (
        <button
          type="button"
          onClick={() => gameRef.current?.interact()}
          aria-label={actionLabel}
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
          style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 24px)" }}
        >
          {actionIcon}
          {actionLabel}
          <kbd className="ml-1 border border-[#0B0B0D] px-1.5 text-[11px]">E</kbd>
        </button>
      )}

      {status === "ready" && isTouch && !infoOpen && (
        <>
          {!seat && !rest && <Joystick gameRef={gameRef} />}
          {!seat && !rest && (
            <button
              type="button"
              onClick={toggleRun}
              aria-pressed={running}
              aria-label={t("runAria", "Corrida lenta (liga e desliga)")}
              className={`absolute flex h-16 w-16 flex-col items-center justify-center gap-0.5 border-2 border-[#0B0B0D] text-[10px] font-black uppercase shadow-[3px_3px_0_0_#0B0B0D] ${
                running ? "bg-[#0B0B0D] text-[#F2B705]" : "bg-[#F7F0D9] text-[#0B0B0D]"
              }`}
              style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 112px)", right: SAFE.right }}
            >
              <Footprints className="h-6 w-6" />
              {t("run", "Correr")}
            </button>
          )}
          {hasAction && (
            <button
              type="button"
              onClick={() => gameRef.current?.interact()}
              aria-label={actionLabel}
              className="absolute flex min-h-16 min-w-16 max-w-[44vw] items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-[13px] font-black uppercase leading-tight text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
              style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 24px)", right: SAFE.right }}
            >
              {actionIcon}
              {actionLabel}
            </button>
          )}
        </>
      )}

      {infoOpen && (
        <div
          className="absolute inset-0 flex items-end justify-center bg-black/30 sm:items-center"
          style={{ paddingBottom: SAFE.bottom, paddingLeft: SAFE.left, paddingRight: SAFE.right }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setInfoOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-house-info"
            className="relative w-full max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]"
          >
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center"
              aria-label={t("close", "Fechar")}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A6400]">{t("houseInfo", "Informações da casa")}</div>
            <h2 id="mm-house-info" className="mt-0.5 text-2xl font-black uppercase leading-none">
              {t("lot", "Lote {n}").replace("{n}", lotLabel)}
            </h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="font-bold">{t("infoOwner", "Titular")}</dt>
              <dd>{h.ownerName}</dd>
              <dt className="font-bold">{t("infoLevel", "Nível")}</dt>
              <dd>{String(h.level).padStart(2, "0")}</dd>
              <dt className="font-bold">{t("infoPlace", "Bairro e número")}</dt>
              <dd>
                {h.neighborhoodName} · {lotLabel}
              </dd>
              <dt className="font-bold">{t("infoFloors", "Andares")}</dt>
              <dd>{payload.interior.floors.length}</dd>
              <dt className="font-bold">{t("infoVisit", "Visita")}</dt>
              <dd>{visitLine}</dd>
            </dl>
            <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
              {payload.release} · {CLIENT_RELEASE} · {payload.interior.version ?? ""}
              {stats && <> · {Math.round(stats.fps)} fps</>}
            </div>
          </div>
        </div>
      )}

      {status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#29262B] p-6 text-center">
          {status === "loading" ? (
            <div className="border-2 border-[#0B0B0D] bg-[#F7F0D9] px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
              {t("houseLoading", "Abrindo a casa…")}
            </div>
          ) : (
            <div className="max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
              <div className="text-lg font-black uppercase">{t("houseErrorTitle", "A casa não abriu")}</div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("loading")
                    setAttempt((a) => a + 1)
                  }}
                  className={BTN}
                >
                  {t("retry", "Tentar de novo")}
                </button>
                <button type="button" onClick={onExit} className={BTN}>
                  {t("exitHouse", "Sair da casa")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
