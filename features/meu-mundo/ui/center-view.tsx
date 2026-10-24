"use client"

// features/meu-mundo/ui/center-view.tsx — o Centro da cidade (mm3d-17).
//
// A mesma casca do bairro (canvas + HUD na pele EVO, peças de ui/hud): o jogo
// é o mesmo motor (engine/game.ts) com o mundo do centro. Aqui só muda o que
// o jogador pode fazer: chegar perto de um estabelecimento mostra o nome e
// "Em breve" (nenhum interior existe ainda — nada de cena vazia nem de
// atravessar a fachada), e o portal "Bairros" (ou o menu) volta para casa.
// Quem decide a sala, o bairro de casa e o veículo é o SERVIDOR.

import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { Activity, Footprints, Gamepad2, Hand, HeartPulse, Home, LocateFixed, LogOut, RefreshCw, Store, Users, Wifi, WifiOff, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { createMeuMundoGame, type GameHandle } from "../engine/game"
import { kindOfId } from "../engine/motion"
import { CarTuningPanel } from "./drive-controls"
import { Drawer, EvoButton, EvoDialog, EvoToast, HudChip, IdPlate, type DrawerItem } from "./hud/hud-kit"
import { useQualityItem } from "./hud/quality-item"
import { Chamfer, EVO, archivo, teko } from "./status/evo-skin"
import { CLIENT_RELEASE, Joystick, SAFE, SceneCurtain, VehicleIcon } from "./meu-mundo-view"
import { fetchSession, postJetpackJoin } from "../data"
import type { BodyId, CenterPayload, CenterPlace, GameStats, Interactable, NetStatus, VisitState } from "../types"

// Minijogos dos locais (mm3d-20): só baixam (three.js incluso) quando alguém vai jogar.
const JetpackView = dynamic(() => import("../jetpack/jetpack-view").then((m) => m.JetpackView), { ssr: false })

/** O local abre um minijogo agora (o registro do servidor decide). */
/** Lugar na sala do jetpack em grupo (null = sem acesso: o jogo cai no sozinho). */
async function fetchJetpackParty(roomId: string | null) {
  const token = getToken()
  if (!token) return null
  const r = await postJetpackJoin(token, roomId)
  return r.ok ? r.data : null
}

const gameOf = (p: CenterPlace) => (p.available && p.destination.startsWith("game:") ? p.destination.slice(5) : null)

const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)

/** Nome em português (fallback do dicionário). */
const PLACE_PT: Record<CenterPlace["id"], string> = {
  pizzaria: "Pizzaria",
  hamburgueria: "Hamburgueria",
  supermercado: "Supermercado",
  universidade: "Universidade",
  biblioteca: "Biblioteca",
  escola: "Escola",
  academia: "Academia",
  jetpack: "Jetpack",
  igreja: "Igreja",
  delegacia: "Delegacia",
  hospital: "Hospital",
}

export interface CenterSceneProps {
  payload: CenterPayload
  visits: VisitState | null
  /** Voltar para casa (o servidor decide o bairro). */
  onGoHome: () => void
  onMoved: () => void
  onServerMessage: (type: string, payload: unknown) => void
  blocked?: boolean
  onOpenStatus?: (body: BodyId) => void
}

export default function CenterView({ payload, onGoHome, onMoved, onServerMessage, blocked, onOpenStatus }: CenterSceneProps) {
  const t = useTranslations("MeuMundo")
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<GameHandle | null>(null)
  const qualityItem = useQualityItem((c) => gameRef.current?.setQuality(c))
  const statsOpenRef = useRef(false)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [open, setOpen] = useState<CenterPlace | null>(null)
  const [minigame, setMinigame] = useState<string | null>(null)
  /** O minijogo aberto aceita grupo (place.party, mm3d-21). */
  const [minigameParty, setMinigameParty] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  // Tela limpa: a ajuda dos controles só abre pelo menu.
  const [helpOpen, setHelpOpen] = useState(false)
  const [net, setNet] = useState<NetStatus>("connecting")
  const [online, setOnline] = useState(1)
  const [body, setBody] = useState<BodyId>(payload.me.body)
  const [running, setRunning] = useState(false)
  const [drivingLot, setDrivingLot] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const cbRef = useRef({ onGoHome, onMoved, onServerMessage })
  useEffect(() => {
    cbRef.current = { onGoHome, onMoved, onServerMessage }
  }, [onGoHome, onMoved, onServerMessage])
  const [isTouch] = useState(
    () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0),
  )

  const placeName = useCallback((p: CenterPlace) => t(p.nameKey, PLACE_PT[p.id] ?? p.id), [t])
  const labelsRef = useRef({ place: placeName, portal: "" })
  const portalSign = t("centerPortalSign", "Bairros")
  useEffect(() => {
    labelsRef.current = { place: placeName, portal: portalSign }
  }, [placeName, portalSign])

  // Página do jogo não rola.
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

  // UM jogo por montagem (a casca troca a chave ao mudar de sala ou ambiente).
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
          exitLabel: labelsRef.current.portal || "Bairros",
          centerLabels: { place: (p) => labelsRef.current.place(p), portal: labelsRef.current.portal || "Bairros" },
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
          onDriving: (lot) => alive && setDrivingLot(lot),
          onReady: () => alive && setStatus("ready"),
          onNearbyChange: (it) => alive && setNearby(it),
          onInteract: (it) => {
            if (!alive) return
            if (it.kind === "portal") cbRef.current.onGoHome()
            else if (it.kind === "place") {
              const g = gameOf(it.place)
              if (g === "jetpack") {
                setMinigameParty((it.place.party ?? 0) > 1)
                setMinigame(g)
              }
              else setOpen(it.place)
            }
          },
          onStats: (s) => alive && setStats(s),
          onError: () => alive && setStatus("error"),
        })
        handle.setStatsEnabled(statsOpenRef.current)
        gameRef.current = handle
      } catch (err) {
        console.error("[meu-mundo] falha ao iniciar o centro", err)
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
    statsOpenRef.current = statsOpen
    gameRef.current?.setStatsEnabled(statsOpen)
  }, [statsOpen])

  useEffect(() => {
    gameRef.current?.setBlocked(!!open || menuOpen || !!blocked || !!minigame)
  }, [open, menuOpen, blocked, minigame])

  // Minijogo aberto: o centro para de desenhar (dois 3D ao mesmo tempo pesam no celular).
  useEffect(() => {
    gameRef.current?.setSuspended(!!minigame)
  }, [minigame])

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

  const netLabel = {
    connecting: t("netConnecting", "Conectando"),
    online: t("netOnline", "Online"),
    reconnecting: t("netReconnecting", "Reconectando"),
    offline: t("netOffline", "Conexão interrompida"),
    replaced: t("netReplaced", "Aberto em outra janela"),
    moved: t("netMoved", "Mudando de lugar…"),
  }[net]
  const netTone = net === "online" ? "bom" : net === "offline" || net === "replaced" ? "perigo" : "ambar"

  const drivingKind = (drivingLot && kindOfId(drivingLot)) || "car"
  const nearPortal = nearby?.kind === "portal"
  const nearPlace = nearby?.kind === "place" ? nearby.place : null
  const nearCar = nearby?.kind === "car" || nearby?.kind === "car-exit"
  const nearbyLabel =
    nearby?.kind === "car"
      ? t("useVehicle", "Usar")
      : nearby?.kind === "car-exit"
        ? t("leaveVehicle", "Descer")
        : nearPortal
          ? t("backHome", "Voltar para casa")
          : nearPlace
            ? placeName(nearPlace)
            : ""
  // "Jogar" nos locais com minijogo; "Em breve" nos outros.
  const placeTag = nearPlace && gameOf(nearPlace) ? t("centerPlay", "Jogar") : t("centerSoon", "Em breve")
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`

  const menuItems: DrawerItem[] = [
    { id: "home", label: t("backHome", "Voltar para casa"), hint: t("centerHomeHint", "Para a frente da sua casa, no seu bairro"), icon: <Home className="h-5 w-5" />, onSelect: onGoHome },
    ...(onOpenStatus
      ? [{ id: "status", label: t("stTitle", "Status"), hint: t("menuStatusHint", "Vida, mercado e rotina"), icon: <HeartPulse className="h-5 w-5" />, onSelect: () => onOpenStatus(body) }]
      : []),
    ...(drivingLot
      ? [{ id: "recover", label: t("recoverCar", "Recuperar"), hint: t("centerRecoverHint", "Preso? Volta para uma vaga livre (parado, a cada 15 s)."), icon: <RefreshCw className="h-5 w-5" />, onSelect: () => gameRef.current?.recoverCar() }]
      : []),
    { id: "recenter", label: t("menuRecenter", "Câmera"), hint: t("recenter", "Centralizar a câmera"), icon: <LocateFixed className="h-5 w-5" />, onSelect: () => gameRef.current?.recenter() },
    { id: "help", label: t("menuControls", "Controles"), icon: <Gamepad2 className="h-5 w-5" />, onSelect: () => setHelpOpen(true) },
    qualityItem,
    { id: "tech", label: t("menuTech", "Técnico"), hint: t("techPanel", "Painel técnico"), icon: <Activity className="h-5 w-5" />, active: statsOpen, onSelect: () => setStatsOpen((v) => !v) },
    ...(net === "offline" || net === "replaced"
      ? [{ id: "reconnect", label: t("reconnect", "Reconectar"), icon: <RefreshCw className="h-5 w-5" />, onSelect: () => gameRef.current?.reconnect() }]
      : []),
    { id: "leave", label: t("menuExitGame", "Sair do jogo"), hint: t("back", "Voltar ao perfil"), icon: <LogOut className="h-5 w-5" />, onSelect: () => router.push("/account") },
  ]

  return (
    <div className="fl-sharp fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-[#A8D4F2]">
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={t("canvasAriaCenter", "Centro da cidade do Meu Mundo")} />

      <div className="pointer-events-none absolute left-0 top-0" style={{ paddingTop: SAFE.top, paddingLeft: SAFE.left }}>
        <IdPlate seal={["天", "地"]} title={t("title", "Meu Mundo")} sub={<>{t("devBadge", "Em desenvolvimento")}</>}>
          <HudChip tone="ouro" icon={<Store className="h-3 w-3" />}>
            {t("exitLabel", "Centro da cidade")}
          </HudChip>
          <HudChip icon={<Users className="h-3 w-3" />} title={t("centerRoomHint", "Cada centro recebe até {n} pessoas").replace("{n}", String(payload.center.capacity))}>
            {t("centerOnline", "{n} no centro").replace("{n}", String(online))}
          </HudChip>
          <span role="status" aria-live="polite">
            <HudChip
              tone={netTone}
              icon={net === "online" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              onClick={net === "offline" || net === "replaced" ? () => gameRef.current?.reconnect() : undefined}
            >
              {netLabel}
            </HudChip>
          </span>
        </IdPlate>
      </div>

      {statsOpen && (
        <div className="pointer-events-auto absolute left-0 max-w-[min(92vw,320px)]" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 96px)", marginLeft: SAFE.left }}>
          <Chamfer cut={12} border={`${EVO.dourado}99`}>
            <div className="relative px-3 py-2 font-mono text-[11px] leading-5" style={{ color: EVO.branco }}>
              <button type="button" onClick={() => setStatsOpen(false)} className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center" style={{ color: EVO.mudo }} aria-label={t("close", "Fechar")}>
                <X className="h-4 w-4" />
              </button>
              <div className={`${teko.className} mb-0.5 text-[18px] uppercase tracking-[0.14em]`} style={{ color: EVO.ambar }}>
                {t("techPanel", "Painel técnico")}
              </div>
              {stats ? (
                <>
                  <div>FPS {stats.fps.toFixed(0)}</div>
                  <div>
                    {t("frameMs", "Quadro")} {stats.frameMs != null ? `${stats.frameMs.toFixed(1)} ms` : "—"}
                  </div>
                  <div>
                    {t("meshes", "Malhas")} {stats.meshes} ({t("active", "ativas")} {stats.activeMeshes})
                  </div>
                  <div>Draw calls {stats.drawCalls ?? "—"}</div>
                  <div>
                    x {stats.x.toFixed(1)} · z {stats.z.toFixed(1)}
                  </div>
                  <div>
                    {t("liveGames", "Jogos ativos")} {stats.liveGames} · {t("avatars", "Avatares")} {stats.avatars}
                  </div>
                  <div>
                    {t("netShort", "Rede")} {net} · {online}/{payload.center.capacity}
                  </div>
                  <CarTuningPanel stats={stats} gameRef={gameRef} />
                </>
              ) : (
                <div>…</div>
              )}
              <div className="mt-1 border-t pt-1" style={{ borderColor: EVO.linha, color: EVO.mudo }}>
                {CLIENT_RELEASE} · {payload.release} · {payload.sceneKey.slice(0, 16)} · {BUILD}
              </div>
            </div>
          </Chamfer>
        </div>
      )}

      {status === "ready" && helpOpen && !open && !menuOpen && (
        <button
          type="button"
          onClick={() => setHelpOpen(false)}
          className="pointer-events-auto absolute max-w-[min(92vw,440px)] text-left"
          style={isTouch ? { bottom: bottom(176), left: SAFE.left } : { bottom: SAFE.bottom, left: SAFE.left }}
        >
          <Chamfer cut={10} border={`${EVO.dourado}99`}>
            <div className={`${archivo.className} px-3 py-2 text-[12px] font-medium leading-4`} style={{ color: EVO.branco }}>
              <span className={`${teko.className} mr-2 text-[16px] uppercase tracking-[0.14em]`} style={{ color: EVO.ambar }}>
                {t("menuControls", "Controles")}
              </span>
              {drivingLot
                ? isTouch
                  ? t("helpDriveTouch2", "Joystick: para a frente acelera, para trás freia e dá ré, para os lados vira")
                  : t("helpDriveDesktop", "W/↑ acelerar · S/↓ frear (parado, ré) · A/D ou ←/→ direção · Espaço: freio de mão · E: sair")
                : isTouch
                  ? t("helpTouch3", "Joystick: andar · Correr: corrida lenta · Arraste a tela: girar a câmera · Botão: interagir · Puxe a aba da direita: menu")
                  : t("helpDesktop3", "WASD ou setas: andar · Shift: corrida lenta · Arraste: girar a câmera · Roda: zoom · E: interagir · M: menu")}
              <span className="ml-2" style={{ color: EVO.mudo }}>
                {t("hideHelp", "(ocultar)")}
              </span>
            </div>
          </Chamfer>
        </button>
      )}

      {/* Computador: nome do local + "Em breve", ou o botão do portal / do veículo */}
      {status === "ready" && nearby && !open && !isTouch && !drivingLot && (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-stretch gap-2" style={{ bottom: bottom(48) }}>
          {nearPlace ? (
            <EvoButton variant="gold" size="lg" kbd="E" icon={<Store className="h-5 w-5" />} onClick={() => gameRef.current?.interact()} aria-label={nearbyLabel}>
              {nearbyLabel} · {placeTag}
            </EvoButton>
          ) : (
            <EvoButton
              variant="primary"
              size="lg"
              kbd="E"
              icon={nearCar ? <VehicleIcon kind={nearby.kind === "car" ? nearby.vkind : drivingKind} className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              onClick={() => gameRef.current?.interact()}
              aria-label={nearbyLabel}
            >
              {nearbyLabel}
            </EvoButton>
          )}
        </div>
      )}

      {/* Dirigindo: voltar para casa com o veículo (no portal) e descer. No celular
          fica embaixo à direita (o joystick dirige); "Recuperar" mora no menu. */}
      {status === "ready" && !!drivingLot && !open && (!isTouch || !menuOpen) && (
        <div
          className={isTouch ? "absolute flex flex-col items-end gap-2" : "absolute left-1/2 flex -translate-x-1/2 gap-2"}
          style={isTouch ? { bottom: bottom(24), right: SAFE.right } : { top: "calc(max(12px, env(safe-area-inset-top)) + 104px)" }}
        >
          {nearPortal && (
            <EvoButton variant="primary" icon={<Home className="h-5 w-5" />} onClick={() => gameRef.current?.interact()} kbd={isTouch ? undefined : "E"}>
              {t("backHome", "Voltar para casa")}
            </EvoButton>
          )}
          <EvoButton variant={nearPortal ? "gold" : "primary"} icon={<VehicleIcon kind={drivingKind} className="h-5 w-5" />} onClick={() => gameRef.current?.leaveVehicle()} kbd={isTouch || nearPortal ? undefined : "E"}>
            {t("leaveVehicle", "Descer")}
          </EvoButton>
        </div>
      )}

      {/* Celular: o MESMO joystick anda e dirige (mm3d-25) */}
      {status === "ready" && isTouch && !open && !menuOpen && <Joystick gameRef={gameRef} />}

      {status === "ready" && isTouch && !open && !menuOpen && !drivingLot && (
        <>
          <EvoButton
            variant="gold"
            onClick={() =>
              setRunning((r) => {
                gameRef.current?.setRun(!r)
                return !r
              })
            }
            aria-pressed={running}
            aria-label={t("runAria", "Corrida lenta (liga e desliga)")}
            size="none"
            className="!absolute h-16 w-16 flex-col !gap-0.5 !px-0 text-[14px]"
            style={{ bottom: bottom(112), right: SAFE.right }}
            icon={<Footprints className="h-6 w-6" />}
          >
            {t("run", "Correr")}
          </EvoButton>
          {nearby && (
            <EvoButton
              variant={nearPlace ? "gold" : "primary"}
              onClick={() => gameRef.current?.interact()}
              aria-label={nearbyLabel}
              size="none"
              className="!absolute min-h-16 min-w-16 max-w-[48vw] text-[18px] leading-tight"
              style={{ bottom: bottom(24), right: SAFE.right }}
              icon={nearCar ? <VehicleIcon kind={nearby.kind === "car" ? nearby.vkind : drivingKind} className="h-6 w-6 shrink-0" /> : nearPortal ? <Home className="h-6 w-6 shrink-0" /> : <Hand className="h-5 w-5 shrink-0" />}
            >
              {nearPlace ? `${nearbyLabel} · ${placeTag}` : nearbyLabel}
            </EvoButton>
          )}
        </>
      )}

      {status === "ready" && (
        <div className="pointer-events-none absolute inset-0">
          <Drawer
            open={menuOpen}
            onOpenChange={setMenuOpen}
            heading={t("menuCenter", "O centro")}
            kanjiMark="市"
            items={menuItems}
            hotkeys={!blocked && !open && !minigame}
            footer={
              <>
                {t("exitLabel", "Centro da cidade")} · {CLIENT_RELEASE} · {BUILD}
              </>
            }
          />
        </div>
      )}

      {/* Estabelecimento: só a fachada por enquanto */}
      {open && (
        <EvoDialog
          labelId="mm-place-title"
          eyebrow={`${t("exitLabel", "Centro da cidade")} · ${t("centerSoon", "Em breve")}`}
          title={placeName(open)}
          kanjiMark="市"
          onClose={() => setOpen(null)}
          width="max-w-sm"
          footer={
            <EvoButton variant="primary" className="w-full" onClick={() => setOpen(null)}>
              {t("ok", "Entendi")}
            </EvoButton>
          }
        >
          <p style={{ color: EVO.mudo }}>{t("centerSoonDesc", "O interior de {name} ainda está sendo construído. Por enquanto, só a fachada.").replace("{name}", placeName(open))}</p>
        </EvoDialog>
      )}

      {/* Minijogo do local (mm3d-20): cobre a tela; ao sair, volta à porta do prédio */}
      {minigame === "jetpack" && (
        <JetpackView body={body} onExit={() => setMinigame(null)} fetchParty={minigameParty ? fetchJetpackParty : undefined} />
      )}

      {status !== "ready" && (
        <SceneCurtain
          status={status}
          text={t("centerLoading", "Montando o centro…")}
          errorTitle={t("centerErrorTitle", "O centro não abriu")}
          errorText={t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
          onRetry={retry}
          onLeave={onGoHome}
          leaveLabel={t("backHome", "Voltar para casa")}
        />
      )}
      {status === "ready" && net === "offline" && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 104px)" }}>
          <EvoToast icon={<WifiOff className="h-4 w-4" />}>{t("netOffline", "Conexão interrompida")}</EvoToast>
        </div>
      )}
    </div>
  )
}
