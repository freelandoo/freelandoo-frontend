"use client"

// features/meu-mundo/ui/meu-mundo-view.tsx
//
// A tela do Meu Mundo 3D: o canvas e a interface por cima (barra, aviso de
// interação, joystick do celular, painel da casa e painel técnico).
//
// Este módulo é o que carrega o Babylon. A página só o importa depois que o
// servidor confirmou o acesso de administrador — abrir o perfil ou o feed não
// baixa nem inicializa o motor 3D.

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Activity,
  ArrowLeft,
  CarFront,
  Construction,
  DoorOpen,
  Footprints,
  Hand,
  HeartPulse,
  Home,
  Loader2,
  LocateFixed,
  Lock,
  RefreshCw,
  Send,
  Shirt,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { createMeuMundoGame, type GameHandle } from "../engine/game"
import { CarTuningPanel, TouchDriveControls } from "./drive-controls"
import { fetchSession, postHouseLevel } from "../data"
import {
  BODY_IDS,
  type BodyId,
  type GameStats,
  type HouseCatalog,
  type HouseVisual,
  type Interactable,
  type NeighborhoodPayload,
  type NetStatus,
  type VisitState,
} from "../types"

/** Versão do cliente. Sobe a cada entrega do Meu Mundo 3D. */
export const CLIENT_RELEASE = "mm3d-13"
const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)

export const BTN =
  "inline-flex h-10 items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#0B0B0D]/85 px-3 text-[11px] font-bold uppercase tracking-wider text-[#F2B705] shadow-[2px_2px_0_0_#F2B705] active:translate-x-[1px] active:translate-y-[1px]"

export const SAFE = {
  top: "max(12px, env(safe-area-inset-top))",
  bottom: "max(16px, env(safe-area-inset-bottom))",
  left: "max(12px, env(safe-area-inset-left))",
  right: "max(12px, env(safe-area-inset-right))",
}

export interface NeighborhoodSceneProps {
  payload: NeighborhoodPayload
  visits: VisitState | null
  /** Entrar na casa do lote (o servidor confere porta, dono e convite). */
  onEnterHouse: (lot: number) => void
  onOpenInvite: () => void
  /** O servidor levou o jogador para outro ambiente: pedir o destino de novo. */
  onMoved: () => void
  onServerMessage: (type: string, payload: unknown) => void
  /** Algum painel da casca está aberto (convite): o jogo não lê teclas. */
  blocked?: boolean
  /** Abre a tela de STATUS do hóspede (mm3d-13), com o corpo que está em cena. */
  onOpenStatus?: (body: BodyId) => void
}

export default function MeuMundoView({
  payload,
  visits,
  onEnterHouse,
  onOpenInvite,
  onMoved,
  onServerMessage,
  blocked,
  onOpenStatus,
}: NeighborhoodSceneProps) {
  const t = useTranslations("MeuMundo")
  const nb = payload.neighborhood
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<GameHandle | null>(null)
  const statsOpenRef = useRef(false)
  const exitLabelRef = useRef("")

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [open, setOpen] = useState<Interactable | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [helpOpen, setHelpOpen] = useState(true)
  const [net, setNet] = useState<NetStatus>("connecting")
  const [online, setOnline] = useState(1)
  const [body, setBody] = useState<BodyId>(payload.me.body)
  const [bodyOpen, setBodyOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [residents, setResidents] = useState(nb.residents)
  // Lote do carro que você dirige (0 = a pé) — confirmado pela sala.
  const [drivingLot, setDrivingLot] = useState(0)
  // Casa do jogador: nível confirmado × exibido (o seletor de teste mostra os dois).
  const myLot = payload.me.house
  const myHouse = nb.houses[myLot - 1]
  const [houseVis, setHouseVis] = useState<HouseVisual>({
    lot: myLot,
    confirmed: myHouse?.level ?? 1,
    shown: myHouse?.level ?? 1,
    status: "ok",
  })
  const [levelOpen, setLevelOpen] = useState(false)
  // Menu da própria casa: entrar, alterar o nível (teste) e convidar.
  // Casa que este jogador pode visitar aqui. Quem é do MESMO bairro não troca
  // de ambiente ao aceitar: a visita ativa chega pelo estado de visitas.
  const activeGuest = visits?.active?.role === "guest" && visits.active.neighborhoodName === nb.name ? visits.active.house : null
  const visitingLot = payload.me.visiting?.house ?? activeGuest
  const cbRef = useRef({ onEnterHouse, onMoved, onServerMessage, visitingLot })
  useEffect(() => {
    cbRef.current = { onEnterHouse, onMoved, onServerMessage, visitingLot }
  }, [onEnterHouse, onMoved, onServerMessage, visitingLot])
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0),
  )

  const exitLabel = t("exitLabel", "Centro da cidade")
  useEffect(() => {
    exitLabelRef.current = exitLabel
  }, [exitLabel])

  // Página do jogo não rola: sem isso o arraste do dedo puxa a página junto.
  useEffect(() => {
    const html = document.documentElement
    const prev = [html.style.overflow, document.body.style.overflow, html.style.overscrollBehavior]
    html.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    html.style.overscrollBehavior = "none"
    return () => {
      html.style.overflow = prev[0]
      document.body.style.overflow = prev[1]
      html.style.overscrollBehavior = prev[2]
    }
  }, [])

  // UM jogo por montagem. Criado no próximo quadro (o canvas já tem tamanho),
  // e o descarte cancela a criação pendente — sair antes de o jogo nascer não
  // deixa um motor órfão para trás.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let handle: GameHandle | null = null
    let alive = true
    const raf = requestAnimationFrame(() => {
      if (!alive) return
      try {
        handle = createMeuMundoGame({
          canvas,
          payload,
          exitLabel: exitLabelRef.current || nb.exit.label,
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
          onBody: (b) => alive && setBody(b),
          onResidents: (n) => alive && setResidents(n),
          onDriving: (lot) => alive && setDrivingLot(lot),
          onReady: () => alive && setStatus("ready"),
          onNearbyChange: (it) => alive && setNearby(it),
          // Própria casa ou casa visitada: E entra (o "Alterar casa" é botão
          // ao lado). Nas outras: a ficha (que diz que é preciso convite).
          onInteract: (it) => {
            if (!alive) return
            if (it.kind === "house" && ((it.house.isMine && !payload.me.visitor) || it.lot.number === cbRef.current.visitingLot))
              cbRef.current.onEnterHouse(it.lot.number)
            else setOpen(it)
          },
          onHouseVisual: (v) => alive && v.lot === myLot && setHouseVis(v),
          onStats: (s) => alive && setStats(s),
          onError: () => alive && setStatus("error"),
        })
        handle.setStatsEnabled(statsOpenRef.current)
        gameRef.current = handle
      } catch (err) {
        console.error("[meu-mundo] falha ao iniciar o 3D", err)
        setStatus("error")
      }
    })
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      handle?.dispose()
      gameRef.current = null
    }
  }, [nb, payload, attempt, myLot])

  useEffect(() => {
    statsOpenRef.current = statsOpen
    gameRef.current?.setStatsEnabled(statsOpen)
  }, [statsOpen])

  useEffect(() => {
    gameRef.current?.setBlocked(!!open || levelOpen || !!blocked)
  }, [open, levelOpen, blocked])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault()
        setOpen(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const retry = useCallback(() => {
    setStatus("loading")
    setNearby(null)
    setOpen(null)
    setAttempt((a) => a + 1)
  }, [])

  const recenter = useCallback(() => {
    setOpen(null)
    gameRef.current?.recenter()
  }, [])

  const chooseBody = useCallback((b: BodyId) => {
    gameRef.current?.setBody(b)
    setBodyOpen(false)
  }, [])

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
  const bodyLabel = (b: BodyId) =>
    ({
      normal: t("bodyNormal", "Normal"),
      slim: t("bodySlim", "Magro"),
      fat: t("bodyFat", "Gordo"),
      strong: t("bodyStrong", "Forte"),
      sergio: t("bodySergio", "Sergio"),
    })[b]

  const nearbyMine = nearby?.kind === "house" && nearby.house.isMine && !payload.me.visitor
  const nearbyVisit = nearby?.kind === "house" && nearby.lot.number === visitingLot
  // Carro (mm3d-11): entrar no próprio carro, ou sair dirigindo.
  const nearbyCar = nearby?.kind === "car" || nearby?.kind === "car-exit"
  const nearbyAction = nearbyMine || nearbyVisit || nearbyCar
  const nearbyLabel = nearby?.kind === "car"
    ? t("enterCar", "Entrar no carro")
    : nearby?.kind === "car-exit"
      ? t("exitCar", "Sair do carro")
      : nearbyMine
    ? t("enterMyHouse", "Entrar na casa")
    : nearbyVisit
      ? t("enterVisit", "Entrar na casa {n}").replace("{n}", String(visitingLot).padStart(2, "0"))
      : nearby?.kind === "house"
      ? t("seeHouse", "Ver casa {n}").replace("{n}", String(nearby.lot.number).padStart(2, "0"))
      : nearby?.kind === "exit"
        ? exitLabel
        : ""

  return (
    <div className="fl-sharp fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-[#A8D4F2]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full outline-none"
        style={{ touchAction: "none" }}
        aria-label={t("canvasAria", "Bairro do Meu Mundo")}
      />

      {/* Barra superior */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2"
        style={{ paddingTop: SAFE.top, paddingLeft: SAFE.left, paddingRight: SAFE.right }}
      >
        <div className="pointer-events-auto border-2 border-[#0B0B0D] bg-[#F7F0D9] px-3 py-1.5 shadow-[3px_3px_0_0_#0B0B0D]">
          <div className="text-[13px] font-black uppercase leading-none tracking-wide text-[#0B0B0D]">
            {t("title", "Meu Mundo")}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8A6400]">
            <Construction className="h-3 w-3" />
            {t("devBadge", "Em desenvolvimento")}
            <span className="hidden sm:inline">· {nb.name}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            {payload.me.visitor && payload.me.visiting ? (
              <span className="inline-flex items-center gap-1 bg-[#F2B705] px-1.5 py-0.5 text-[#0B0B0D]">
                <DoorOpen className="h-3 w-3" />
                {t("visitingChip", "Visitando {name} · casa {n}")
                  .replace("{name}", payload.me.visiting.hostName)
                  .replace("{n}", String(payload.me.visiting.house).padStart(2, "0"))}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-[#F2B705] px-1.5 py-0.5 text-[#0B0B0D]">
                <Home className="h-3 w-3" />
                {t("myHouse", "Sua casa {n}").replace("{n}", String(payload.me.house).padStart(2, "0"))}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 bg-[#0B0B0D] px-1.5 py-0.5 text-[#F7F0D9]"
              title={t("residentsHint", "Moradores titulares do bairro")}
            >
              <Users className="h-3 w-3" />
              {t("residents", "{n} moradores").replace("{n}", String(residents))}
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
              {net === "online" && <> · {t("onlineNow", "{n} conectados").replace("{n}", String(online))}</>}
            </span>
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 justify-end gap-2">
          {(net === "offline" || net === "replaced") && (
            <button type="button" onClick={() => gameRef.current?.reconnect()} className={BTN}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("reconnect", "Reconectar")}</span>
            </button>
          )}
          {onOpenStatus && (
            <button
              type="button"
              onClick={() => onOpenStatus(body)}
              className={BTN}
              aria-label={t("stOpen", "Status do hóspede")}
            >
              <HeartPulse className="h-4 w-4" />
              <span className="hidden sm:inline">{t("stTitle", "Status")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setBodyOpen((v) => !v)}
            className={BTN}
            aria-pressed={bodyOpen}
            aria-label={t("bodyPicker", "Tipo físico (teste)")}
          >
            <Shirt className="h-4 w-4" />
            <span className="hidden sm:inline">{bodyLabel(body)}</span>
          </button>
          <button type="button" onClick={recenter} className={BTN} aria-label={t("recenter", "Centralizar a câmera")}>
            <LocateFixed className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setStatsOpen((v) => !v)}
            className={BTN}
            aria-pressed={statsOpen}
            aria-label={t("techPanel", "Painel técnico")}
          >
            <Activity className="h-4 w-4" />
          </button>
          <Link href="/account" className={BTN}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("back", "Voltar ao perfil")}</span>
          </Link>
        </div>
      </div>

      {/* Seletor administrativo de tipo físico (teste — não é loja nem guarda-roupa) */}
      {bodyOpen && (
        <div
          className="pointer-events-auto absolute right-0 border-2 border-[#0B0B0D] bg-[#F7F0D9] p-2 text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
          style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 52px)", marginRight: SAFE.right }}
        >
          <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8A6400]">
            {t("bodyPicker", "Tipo físico (teste)")}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {BODY_IDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => chooseBody(b)}
                aria-pressed={body === b}
                className={`h-11 min-w-24 border-2 border-[#0B0B0D] px-3 text-[12px] font-black uppercase ${
                  body === b ? "bg-[#0B0B0D] text-[#F2B705]" : "bg-white"
                }`}
              >
                {bodyLabel(b)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 max-w-[14rem] px-1 text-[10px] font-medium leading-tight text-[#6B645A]">
            {t("bodyHint", "Teste visual: nenhum corpo tem vantagem de velocidade.")}
          </p>
        </div>
      )}

      {/* Painel técnico */}
      {statsOpen && (
        <div
          className="pointer-events-auto absolute right-0 border-2 border-[#0B0B0D] bg-[#0B0B0D]/90 px-3 py-2 font-mono text-[11px] leading-5 text-[#E8E2D2]"
          style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 52px)", marginRight: SAFE.right }}
        >
          <div className="mb-1 font-bold text-[#F2B705]">{t("techPanel", "Painel técnico")}</div>
          {stats ? (
            <>
              <div>FPS {stats.fps.toFixed(0)}</div>
              <div>
                {t("frameMs", "Quadro")} {stats.frameMs != null ? `${stats.frameMs.toFixed(1)} ms` : "—"}
              </div>
              <div>
                {t("meshes", "Malhas")} {stats.meshes} ({t("active", "ativas")} {stats.activeMeshes})
              </div>
              <div>
                {t("materials", "Materiais")} {stats.materials}
              </div>
              <div>Draw calls {stats.drawCalls ?? "—"}</div>
              <div>WebGL {stats.webgl}</div>
              <div>
                x {stats.x.toFixed(1)} · z {stats.z.toFixed(1)}
              </div>
              <div>
                {t("liveGames", "Jogos ativos")} {stats.liveGames} · {t("avatars", "Avatares")} {stats.avatars}
              </div>
              <div>
                {t("netShort", "Rede")} {net} · {online}
              </div>
              <CarTuningPanel stats={stats} gameRef={gameRef} />
              <div>
                {t("houseModels", "Casas na GPU")} {stats.houseModels.length ? stats.houseModels.map((n) => String(n).padStart(2, "0")).join(",") : "—"}
              </div>
            </>
          ) : (
            <div>…</div>
          )}
          <div className="mt-1 border-t border-white/15 pt-1 text-[#9A938A]">
            {CLIENT_RELEASE} · {payload.release} · {BUILD}
          </div>
        </div>
      )}

      {/* Ajuda dos controles */}
      {status === "ready" && helpOpen && !open && (
        <button
          type="button"
          onClick={() => setHelpOpen(false)}
          className="absolute max-w-[min(92vw,420px)] border-2 border-[#0B0B0D] bg-[#F7F0D9]/95 px-3 py-2 text-left text-[11px] font-semibold leading-4 text-[#2B2620] shadow-[3px_3px_0_0_#0B0B0D]"
          style={
            isTouch
              ? { bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 176px)", left: SAFE.left }
              : { bottom: SAFE.bottom, left: SAFE.left }
          }
        >
          {drivingLot
            ? isTouch
              ? t("helpDriveTouch", "◀ ▶: volante · Acelera · Freio/Ré (parado, engata a ré) · Freio de mão: derrapar")
              : t("helpDriveDesktop", "W/↑ acelerar · S/↓ frear (parado, ré) · A/D ou ←/→ direção · Espaço: freio de mão · E: sair")
            : isTouch
              ? t("helpTouch2", "Joystick: andar · Correr: corrida lenta · Arraste a tela: girar a câmera · Botão: interagir")
              : t("helpDesktop2", "WASD ou setas: andar · Shift: corrida lenta · Arraste: girar a câmera · Roda: zoom · E: interagir")}
          <span className="ml-2 text-[#8A6400]">{t("hideHelp", "(ocultar)")}</span>
        </button>
      )}

      {/* Aviso de interação */}
      {status === "ready" && nearby && !nearbyAction && !open && !levelOpen && !isTouch && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 border-2 border-[#0B0B0D] bg-[#0B0B0D]/90 px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-[#F7F0D9]"
          style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 48px)" }}
        >
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center bg-[#F2B705] text-[#0B0B0D]">E</span>
          {nearbyLabel}
        </div>
      )}

      {/* Computador: a própria casa (e a casa visitada) ganha botão clicável, com o atalho E nele */}
      {status === "ready" && nearbyAction && !open && !levelOpen && !isTouch && !drivingLot && (
        <div
          className="absolute left-1/2 flex -translate-x-1/2 items-stretch gap-2"
          style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 48px)" }}
        >
        {nearbyMine && (
          <button
            type="button"
            onClick={() => setLevelOpen(true)}
            className="inline-flex h-12 items-center gap-2 border-2 border-[#0B0B0D] bg-[#F7F0D9] px-4 text-[13px] font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
          >
            <Construction className="h-5 w-5" />
            {t("changeHouse", "Alterar casa")}
          </button>
        )}
        <button
          type="button"
          onClick={() => gameRef.current?.interact()}
          aria-label={nearbyLabel}
          className="inline-flex h-12 items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 text-[13px] font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center bg-[#0B0B0D] text-[#F2B705]" aria-hidden>
            E
          </span>
          {nearbyCar ? <CarFront className="h-5 w-5" /> : <DoorOpen className="h-5 w-5" />}
          {nearbyLabel}
        </button>
        </div>
      )}

      {/* Controles de toque */}
      {status === "ready" && !!drivingLot && !open && !levelOpen && (
        <div
          className="absolute left-1/2 flex -translate-x-1/2 gap-2"
          style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 96px)" }}
        >
          <button
            type="button"
            onClick={() => gameRef.current?.interact()}
            className="inline-flex h-11 items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 text-[12px] font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
          >
            <CarFront className="h-5 w-5" />
            {t("exitCar", "Sair do carro")}
          </button>
          <button
            type="button"
            onClick={() => gameRef.current?.recoverCar()}
            className="inline-flex h-11 items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F7F0D9] px-3 text-[11px] font-black uppercase text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
            title={t("recoverHint", "Carro preso? Volta para a vaga da casa (parado, a cada 15 s).")}
          >
            <RefreshCw className="h-4 w-4" />
            {t("recoverCar", "Recuperar")}
          </button>
        </div>
      )}

      {status === "ready" && isTouch && !open && !levelOpen && !!drivingLot && <TouchDriveControls gameRef={gameRef} />}

      {status === "ready" && isTouch && !open && !levelOpen && !drivingLot && (
        <>
          <Joystick gameRef={gameRef} />
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
          {nearbyMine && (
            <button
              type="button"
              onClick={() => setLevelOpen(true)}
              className="absolute flex min-h-14 max-w-[44vw] items-center gap-2 border-2 border-[#0B0B0D] bg-[#F7F0D9] px-4 py-2 text-[13px] font-black uppercase leading-tight text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
              style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 196px)", right: SAFE.right }}
            >
              <Construction className="h-5 w-5 shrink-0" />
              {t("changeHouse", "Alterar casa")}
            </button>
          )}
          {nearby && (
            <button
              type="button"
              onClick={() => gameRef.current?.interact()}
              aria-label={nearbyLabel}
              className="absolute flex min-h-16 min-w-16 max-w-[44vw] items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-[13px] font-black uppercase leading-tight text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
              style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 24px)", right: SAFE.right }}
            >
              {nearbyCar ? <CarFront className="h-6 w-6 shrink-0" /> : nearbyAction ? <DoorOpen className="h-6 w-6 shrink-0" /> : <Hand className="h-5 w-5 shrink-0" />}
              {nearbyLabel}
            </button>
          )}
        </>
      )}

      {/* Painel da casa / da saída */}
      {open && (
        <div
          className="absolute inset-0 flex items-end justify-center bg-black/30 sm:items-center"
          style={{ paddingBottom: SAFE.bottom, paddingLeft: SAFE.left, paddingRight: SAFE.right }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setOpen(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]"
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center"
              aria-label={t("close", "Fechar")}
            >
              <X className="h-5 w-5" />
            </button>
            {open.kind === "house" ? (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A6400]">
                  {t("houseEyebrow", "Casa")} ·{" "}
                  {open.house.isMine
                    ? t("yourHouse", "Sua casa")
                    : open.house.ownerName
                      ? t("occupied", "Ocupada")
                      : t("available", "Disponível")}
                </div>
                <div className="mt-1 text-3xl font-black uppercase leading-none">
                  {t("lot", "Lote {n}").replace("{n}", String(open.lot.number).padStart(2, "0"))}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <dt className="font-semibold text-[#6B645A]">{t("level", "Nível da casa")}</dt>
                  <dd className="font-bold">{String(open.house.level).padStart(2, "0")}</dd>
                  <dt className="font-semibold text-[#6B645A]">{t("owner", "Proprietário")}</dt>
                  <dd className="font-bold">
                    {open.house.isMine ? t("yourHouse", "Sua casa") : (open.house.ownerName ?? t("available", "Disponível"))}
                  </dd>
                </dl>
                {open.house.ownerName && (
                  <div className="mt-4 flex items-center gap-2 border-2 border-dashed border-[#0B0B0D]/40 px-3 py-2 text-sm font-semibold">
                    <Lock className="h-4 w-4 shrink-0" />
                    {t("needsInvite", "Esta casa só abre com convite do morador.")}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A6400]">
                  {t("exitEyebrow", "Saída do bairro")}
                </div>
                <div className="mt-1 text-2xl font-black uppercase leading-tight">
                  {exitLabel} — {t("nextStage", "próxima etapa")}
                </div>
                <p className="mt-3 text-sm font-medium text-[#3D372F]">
                  {t("exitDesc", "O centro da cidade ainda está sendo construído. Por enquanto, o portão fica fechado.")}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mt-5 inline-flex h-11 w-full items-center justify-center border-2 border-[#0B0B0D] bg-[#0B0B0D] text-sm font-bold uppercase tracking-wider text-[#F2B705]"
            >
              {t("ok", "Entendi")}
            </button>
          </div>
        </div>
      )}

      {/* Seletor de nível da própria casa (teste) */}
      {levelOpen && nb.houseCatalog && (
        <HouseLevelPanel
          catalog={nb.houseCatalog}
          lot={myLot}
          visual={houseVis}
          gameRef={gameRef}
          onClose={() => setLevelOpen(false)}
        />
      )}

      {/* Carregando / erro */}
      {status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#A8D4F2] p-6 text-center">
          {status === "loading" ? (
            <div className="border-2 border-[#0B0B0D] bg-[#F7F0D9] px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
              {t("loading", "Montando o bairro…")}
            </div>
          ) : (
            <div className="max-w-sm border-2 border-[#0B0B0D] bg-[#F7F0D9] p-5 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
              <div className="text-lg font-black uppercase">{t("errorTitle", "O bairro não abriu")}</div>
              <p className="mt-2 text-sm">
                {t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={retry} className={BTN}>
                  {t("retry", "Tentar de novo")}
                </button>
                <Link href="/account" className={BTN}>
                  {t("back", "Voltar ao perfil")}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Joystick virtual: escreve direto no estado de entrada do jogo, sem passar
// por estado do React (seriam dezenas de renders por segundo).
export function Joystick({ gameRef }: { gameRef: React.RefObject<{ setJoystick: (x: number, y: number) => void } | null> }) {
  const baseRef = useRef<HTMLDivElement | null>(null)
  const knobRef = useRef<HTMLDivElement | null>(null)
  const idRef = useRef<number | null>(null)
  const RADIUS = 52

  const set = (x: number, y: number) => {
    gameRef.current?.setJoystick(x, y)
    if (knobRef.current) knobRef.current.style.transform = `translate(${x * RADIUS}px, ${-y * RADIUS}px)`
  }

  const move = (e: React.PointerEvent) => {
    const base = baseRef.current
    if (!base || e.pointerId !== idRef.current) return
    const r = base.getBoundingClientRect()
    let dx = (e.clientX - (r.left + r.width / 2)) / RADIUS
    let dy = (e.clientY - (r.top + r.height / 2)) / RADIUS
    const m = Math.hypot(dx, dy)
    if (m > 1) {
      dx /= m
      dy /= m
    }
    set(dx, -dy)
  }
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== idRef.current) return
    idRef.current = null
    set(0, 0)
  }

  // Só ao desmontar (painel abriu, saiu do jogo): o personagem para.
  useEffect(
    () => () => gameRef.current?.setJoystick(0, 0),
    [gameRef],
  )

  return (
    <div
      ref={baseRef}
      className="absolute flex h-36 w-36 items-center justify-center rounded-full border-2 border-[#0B0B0D]/60 bg-[#0B0B0D]/25"
      style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 16px)", left: SAFE.left, touchAction: "none" }}
      onPointerDown={(e) => {
        if (idRef.current !== null) return
        idRef.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      data-avatar
    >
      <div
        ref={knobRef}
        className="pointer-events-none h-16 w-16 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] shadow-[2px_2px_0_0_#0B0B0D]"
        data-avatar
      />
    </div>
  )
}

/**
 * Painel "Escolher nível da casa" (recurso de TESTE: sem preço, cadeado ou
 * compra). Miniaturas estáticas — nenhuma cena 3D é aberta aqui, e nenhum
 * modelo é baixado só por abrir o painel: o download começa ao APLICAR.
 * O nível confirmado vem do servidor; o exibido pode ficar para trás enquanto
 * o modelo carrega ou se ele falhar — o painel mostra os dois.
 */
function HouseLevelPanel({
  catalog,
  lot,
  visual,
  gameRef,
  onClose,
}: {
  catalog: HouseCatalog
  lot: number
  visual: HouseVisual
  gameRef: React.RefObject<GameHandle | null>
  onClose: () => void
}) {
  const t = useTranslations("MeuMundo")
  const [selected, setSelected] = useState(visual.confirmed)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)
  const pad = (n: number) => String(n).padStart(2, "0")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const apply = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const seq = ++seqRef.current
    setPending(true)
    setError(null)
    const r = await postHouseLevel(token, selected)
    // Resposta confirmada SEMPRE chega ao jogo (a revisão decide a ordem);
    // só a mensagem de uma resposta antiga é ignorada.
    if (r.ok) gameRef.current?.applyHouseLevel(r.house, r.level, r.rev)
    if (seq !== seqRef.current) return
    setPending(false)
    if (!r.ok)
      setError(
        r.status === 0
          ? t("levelNetError", "Sem conexão. Tente de novo.")
          : r.code === "occupied"
            ? t("levelOccupied", "Peça para todos saírem da casa antes de trocar o nível.")
            : r.error,
      )
  }, [selected, gameRef, t])

  const loading = visual.status === "loading"
  const failed = visual.status === "error"
  const pct = visual.progress != null ? Math.round(visual.progress * 100) : null
  const current = catalog.levels.find((l) => l.level === selected)

  return (
    <div
      className="absolute inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center"
      style={{ paddingBottom: SAFE.bottom, paddingLeft: SAFE.left, paddingRight: SAFE.right, paddingTop: SAFE.top }}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-level-title"
        className="relative flex max-h-full w-full max-w-2xl flex-col border-2 border-[#0B0B0D] bg-[#F7F0D9] text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]"
      >
        <div className="flex items-start justify-between gap-2 border-b-2 border-[#0B0B0D] px-4 py-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#8A6400]">
              {t("lot", "Lote {n}").replace("{n}", pad(lot))} · {t("testFeature", "Recurso de teste")}
            </div>
            <h2 id="mm-level-title" className="mt-0.5 text-xl font-black uppercase leading-none">
              {t("levelTitle", "Escolher nível da casa")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#0B0B0D] bg-white"
            aria-label={t("close", "Fechar")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-5">
          {catalog.levels.map((l) => {
            const isConfirmed = l.level === visual.confirmed
            const isSel = l.level === selected
            return (
              <button
                key={l.level}
                type="button"
                disabled={!l.available}
                onClick={() => setSelected(l.level)}
                aria-pressed={isSel}
                aria-label={t("levelN", "Nível {n}").replace("{n}", pad(l.level))}
                className={`relative flex flex-col border-2 text-left transition-colors ${
                  isSel ? "border-[#0B0B0D] bg-[#F2B705]" : "border-[#0B0B0D]/30 bg-white"
                } ${l.available ? "" : "cursor-not-allowed opacity-50"}`}
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-[#A8D4F2]">
                  {l.thumb ? (
                    // Miniatura estática pequena (WebP com hash), dentro de um jogo só de admin.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={catalog.basePath + l.thumb}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <Construction className="h-6 w-6 text-[#0B0B0D]/50" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="text-[13px] font-black uppercase">{t("levelN", "Nível {n}").replace("{n}", pad(l.level))}</span>
                  {isConfirmed && (
                    <span className="bg-[#0B0B0D] px-1 text-[9px] font-black uppercase text-[#F2B705]">
                      {t("levelCurrent", "Atual")}
                    </span>
                  )}
                </div>
                {!l.available && (
                  <div className="px-2 pb-1.5 text-[10px] font-semibold leading-tight text-[#6B645A]">
                    {t("levelNoModel", "Modelo ainda não fornecido")}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="border-t-2 border-[#0B0B0D] px-4 py-3">
          <div role="status" aria-live="polite" className="min-h-5 text-[12px] font-semibold text-[#3D372F]">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("levelLoading", "Carregando nível {n}…").replace("{n}", pad(visual.confirmed))}
                {pct != null && ` ${pct}%`}
              </span>
            ) : failed ? (
              <span className="inline-flex flex-wrap items-center gap-2 text-[#B91C1C]">
                {t("levelLoadFail", "O modelo do nível {n} não carregou — mostrando o nível {m}.")
                  .replace("{n}", pad(visual.confirmed))
                  .replace("{m}", pad(visual.shown))}
                <button
                  type="button"
                  onClick={() => gameRef.current?.retryHouse(lot)}
                  className="inline-flex h-8 items-center gap-1 border-2 border-[#0B0B0D] bg-white px-2 text-[11px] font-black uppercase text-[#0B0B0D]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("retry", "Tentar de novo")}
                </button>
              </span>
            ) : error ? (
              <span className="text-[#B91C1C]">{error}</span>
            ) : (
              <span>
                {t("levelConfirmed", "Nível confirmado: {n}").replace("{n}", pad(visual.confirmed))}
                {current?.size && (
                  <span className="text-[#6B645A]">
                    {" · "}
                    {t("levelSize", "{w} × {d} m").replace("{w}", current.size.width.toFixed(1)).replace("{d}", current.size.depth.toFixed(1))}
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] font-medium leading-tight text-[#6B645A]">
            {t("levelTestNote", "Teste visual: todos os níveis estão liberados, sem custo. Não é loja nem evolução.")}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={pending || !current?.available || selected === visual.confirmed}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#0B0B0D] text-sm font-bold uppercase tracking-wider text-[#F2B705] disabled:opacity-40"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("levelApply", "Aplicar nível {n}").replace("{n}", pad(selected))}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center border-2 border-[#0B0B0D] bg-white px-4 text-sm font-bold uppercase tracking-wider"
            >
              {t("close", "Fechar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
