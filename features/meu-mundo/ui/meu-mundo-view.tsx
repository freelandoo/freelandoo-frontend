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
  Construction,
  Footprints,
  Hand,
  Home,
  LocateFixed,
  RefreshCw,
  Shirt,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { createMeuMundoGame, type GameHandle } from "../engine/game"
import { fetchSession } from "../data"
import {
  BODY_IDS,
  type BodyId,
  type GameStats,
  type Interactable,
  type NeighborhoodPayload,
  type NetStatus,
} from "../types"

/** Versão do cliente. Sobe a cada entrega do Meu Mundo 3D. */
export const CLIENT_RELEASE = "mm3d-05"
const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)

const BTN =
  "inline-flex h-10 items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#0B0B0D]/85 px-3 text-[11px] font-bold uppercase tracking-wider text-[#F2B705] shadow-[2px_2px_0_0_#F2B705] active:translate-x-[1px] active:translate-y-[1px]"

const SAFE = {
  top: "max(12px, env(safe-area-inset-top))",
  bottom: "max(16px, env(safe-area-inset-bottom))",
  left: "max(12px, env(safe-area-inset-left))",
  right: "max(12px, env(safe-area-inset-right))",
}

export default function MeuMundoView({ payload }: { payload: NeighborhoodPayload }) {
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
          onNet: (s) => alive && setNet(s),
          onOnline: (n) => alive && setOnline(n),
          onBody: (b) => alive && setBody(b),
          onResidents: (n) => alive && setResidents(n),
          onReady: () => alive && setStatus("ready"),
          onNearbyChange: (it) => alive && setNearby(it),
          onInteract: (it) => alive && setOpen(it),
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
  }, [nb, payload, attempt])

  useEffect(() => {
    statsOpenRef.current = statsOpen
    gameRef.current?.setStatsEnabled(statsOpen)
  }, [statsOpen])

  useEffect(() => {
    gameRef.current?.setBlocked(!!open)
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
  }[net]
  const bodyLabel = (b: BodyId) =>
    ({
      normal: t("bodyNormal", "Normal"),
      slim: t("bodySlim", "Magro"),
      fat: t("bodyFat", "Gordo"),
      strong: t("bodyStrong", "Forte"),
    })[b]

  const nearbyLabel =
    nearby?.kind === "house"
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
            <span className="inline-flex items-center gap-1 bg-[#F2B705] px-1.5 py-0.5 text-[#0B0B0D]">
              <Home className="h-3 w-3" />
              {t("myHouse", "Sua casa {n}").replace("{n}", String(payload.me.house).padStart(2, "0"))}
            </span>
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
          {isTouch
            ? t("helpTouch2", "Joystick: andar · Correr: corrida lenta · Arraste a tela: girar a câmera · Botão: interagir")
            : t("helpDesktop2", "WASD ou setas: andar · Shift: corrida lenta · Arraste: girar a câmera · Roda: zoom · E: interagir")}
          <span className="ml-2 text-[#8A6400]">{t("hideHelp", "(ocultar)")}</span>
        </button>
      )}

      {/* Aviso de interação */}
      {status === "ready" && nearby && !open && !isTouch && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 border-2 border-[#0B0B0D] bg-[#0B0B0D]/90 px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-[#F7F0D9]"
          style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 48px)" }}
        >
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center bg-[#F2B705] text-[#0B0B0D]">E</span>
          {nearbyLabel}
        </div>
      )}

      {/* Controles de toque */}
      {status === "ready" && isTouch && !open && (
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
          {nearby && (
            <button
              type="button"
              onClick={() => gameRef.current?.interact()}
              className="absolute flex min-h-16 min-w-16 max-w-[44vw] items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-[13px] font-black uppercase leading-tight text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
              style={{ bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 24px)", right: SAFE.right }}
            >
              <Hand className="h-5 w-5 shrink-0" />
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
                <div className="mt-4 flex items-center gap-2 border-2 border-dashed border-[#0B0B0D]/40 px-3 py-2 text-sm font-semibold">
                  <Construction className="h-4 w-4 shrink-0" />
                  {t("interiorSoon", "Interior em construção")}
                </div>
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
function Joystick({ gameRef }: { gameRef: React.RefObject<GameHandle | null> }) {
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
