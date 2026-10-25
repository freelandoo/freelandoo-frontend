"use client"

// features/meu-mundo/ui/meu-mundo-view.tsx
//
// A tela do Meu Mundo 3D: o canvas e a interface por cima (barra, aviso de
// interação, joystick do celular, painel da casa e painel técnico).
//
// Este módulo é o que carrega o Babylon. A página só o importa depois que o
// servidor confirmou o acesso de administrador — abrir o perfil ou o feed não
// baixa nem inicializa o motor 3D.

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Activity,
  Bike,
  Building2,
  CarFront,
  Construction,
  DoorOpen,
  Footprints,
  Gamepad2,
  Hand,
  HeartPulse,
  Loader2,
  LocateFixed,
  Lock,
  LogOut,
  RefreshCw,
  Send,
  WifiOff,
  X,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { createMeuMundoGame, type GameHandle } from "../engine/game"
import { kindOfId, type RideKind } from "../engine/motion"
import { CarTuningPanel } from "./drive-controls"
import { Drawer, EvoButton, EvoDialog, EvoToast, HudChip, WindedToast, InfoRow, type DrawerItem } from "./hud/hud-kit"
import { useQualityItem } from "./hud/quality-item"
import { Chamfer, EVO, archivo, teko } from "./status/evo-skin"
import { fetchSession, postHouseLevel } from "../data"
import {
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
export const CLIENT_RELEASE = "mm3d-28"
const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)

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
  /** Ir ao centro da cidade (mm3d-17): portão do bairro ou menu. */
  onGoCenter?: () => void
  onOpenInvite: () => void
  /** O servidor levou o jogador para outro ambiente: pedir o destino de novo. */
  onMoved: () => void
  onServerMessage: (type: string, payload: unknown) => void
  /** Algum painel da casca está aberto (convite): o jogo não lê teclas. */
  blocked?: boolean
  /** Abre a tela de STATUS do hóspede (mm3d-13), com o corpo que está em cena. */
  onOpenStatus?: (body: BodyId) => void
  /** Outra tela 3D por cima (hospital, mm3d-26): a sala segue ligada, o desenho para. */
  suspended?: boolean
}

export default function MeuMundoView({
  payload,
  visits,
  onEnterHouse,
  onGoCenter,
  onOpenInvite,
  onMoved,
  onServerMessage,
  blocked,
  onOpenStatus,
  suspended,
}: NeighborhoodSceneProps) {
  const t = useTranslations("MeuMundo")
  const nb = payload.neighborhood
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<GameHandle | null>(null)
  const qualityItem = useQualityItem((c) => gameRef.current?.setQuality(c))
  const statsOpenRef = useRef(false)
  const exitLabelRef = useRef("")

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [open, setOpen] = useState<Interactable | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  // Tela limpa: a ajuda dos controles só abre pelo menu.
  const [helpOpen, setHelpOpen] = useState(false)
  const [net, setNet] = useState<NetStatus>("connecting")
  const [online, setOnline] = useState(1)
  // Tipo físico: não se escolhe (2026-10-21) — vem da vida, pela sala.
  const [body, setBody] = useState<BodyId>(payload.me.body)
  // Sem fôlego (mm3d-28): a sala parou a corrida até ele recuperar.
  const [winded, setWinded] = useState(false)
  const [, setResidents] = useState(nb.residents)
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
  // A gaveta do menu (direita): abre puxando, clicando no puxador ou com M.
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  // Menu da própria casa: entrar, alterar o nível (teste) e convidar.
  // Casa que este jogador pode visitar aqui. Quem é do MESMO bairro não troca
  // de ambiente ao aceitar: a visita ativa chega pelo estado de visitas.
  const activeGuest = visits?.active?.role === "guest" && visits.active.neighborhoodName === nb.name ? visits.active.house : null
  const visitingLot = payload.me.visiting?.house ?? activeGuest
  const cbRef = useRef({ onEnterHouse, onGoCenter, onMoved, onServerMessage, visitingLot })
  useEffect(() => {
    cbRef.current = { onEnterHouse, onGoCenter, onMoved, onServerMessage, visitingLot }
  }, [onEnterHouse, onGoCenter, onMoved, onServerMessage, visitingLot])
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
          onWinded: (w) => alive && setWinded(w),
          onResidents: (n) => alive && setResidents(n),
          onDriving: (lot) => alive && setDrivingLot(lot),
          onReady: () => alive && setStatus("ready"),
          onNearbyChange: (it) => alive && setNearby(it),
          // Montado em bike/skate/patins: dá para entrar na própria casa (ou
          // na visitada) sem descer (mm3d-15). O carro não entra.
          canRideInto: (it) =>
            it.kind === "house" && ((it.house.isMine && !payload.me.visitor) || it.lot.number === cbRef.current.visitingLot),
          // Própria casa ou casa visitada: E entra (o "Alterar casa" é botão
          // ao lado). Nas outras: a ficha (que diz que é preciso convite).
          onInteract: (it) => {
            if (!alive) return
            // Portão do bairro (mm3d-17): agora leva ao centro (o servidor decide a sala).
            if (it.kind === "exit" && cbRef.current.onGoCenter) return cbRef.current.onGoCenter()
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
    gameRef.current?.setBlocked(!!open || levelOpen || menuOpen || !!blocked)
  }, [open, levelOpen, menuOpen, blocked])

  useEffect(() => {
    gameRef.current?.setSuspended(!!suspended)
  }, [suspended, status])

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

  const netLabel = {
    connecting: t("netConnecting", "Conectando"),
    online: t("netOnline", "Online"),
    reconnecting: t("netReconnecting", "Reconectando"),
    offline: t("netOffline", "Conexão interrompida"),
    replaced: t("netReplaced", "Aberto em outra janela"),
    moved: t("netMoved", "Mudando de lugar…"),
  }[net]

  const drivingKind = (drivingLot && kindOfId(drivingLot)) || "car"
  const nearbyMine = nearby?.kind === "house" && nearby.house.isMine && !payload.me.visitor
  const nearbyVisit = nearby?.kind === "house" && nearby.lot.number === visitingLot
  // Carro (mm3d-11): entrar no próprio carro, ou sair dirigindo.
  const nearbyCar = nearby?.kind === "car" || nearby?.kind === "car-exit"
  const nearbyExit = nearby?.kind === "exit" && !!onGoCenter
  const nearbyAction = nearbyMine || nearbyVisit || nearbyCar || nearbyExit
  const vehicleKind = nearby?.kind === "car" ? nearby.vkind : drivingKind
  // Veículos (mm3d-14): "Usar" para todos — carro, bike, skate e patins — e "Descer".
  const nearbyLabel = nearby?.kind === "car"
    ? t("useVehicle", "Usar")
    : nearby?.kind === "car-exit"
      ? t("leaveVehicle", "Descer")
      : nearbyMine
    ? t("enterMyHouse", "Entrar na casa")
    : nearbyVisit
      ? t("enterVisit", "Entrar na casa {n}").replace("{n}", String(visitingLot).padStart(2, "0"))
      : nearby?.kind === "house"
      ? t("seeHouse", "Ver casa {n}").replace("{n}", String(nearby.lot.number).padStart(2, "0"))
      : nearby?.kind === "exit"
        ? onGoCenter
          ? t("goCenter", "Ir ao centro")
          : exitLabel
        : ""

  const menuItems: DrawerItem[] = [
    ...(onOpenStatus
      ? [{ id: "status", label: t("stTitle", "Status"), hint: t("menuStatusHint", "Vida, mercado e rotina"), icon: <HeartPulse className="h-5 w-5" />, onSelect: () => onOpenStatus(body) }]
      : []),
    ...(!payload.me.visitor
      ? [{ id: "invite", label: t("invite", "Convidar"), hint: t("menuInviteHint", "Chamar alguém para a sua casa"), icon: <Send className="h-5 w-5" />, onSelect: onOpenInvite }]
      : []),
    ...(onGoCenter && !payload.me.visitor
      ? [{ id: "center", label: t("goCenter", "Ir ao centro"), hint: t("goCenterHint", "Encontrar gente de outros bairros"), icon: <Building2 className="h-5 w-5" />, onSelect: onGoCenter }]
      : []),
    ...(drivingLot
      ? [{ id: "recover", label: t("recoverCar", "Recuperar"), hint: t("recoverHintAny", "Preso? Volta para a vaga da casa (parado, a cada 15 s)."), icon: <RefreshCw className="h-5 w-5" />, onSelect: () => gameRef.current?.recoverCar() }]
      : []),
    { id: "recenter", label: t("menuRecenter", "Câmera"), hint: t("recenter", "Centralizar a câmera"), icon: <LocateFixed className="h-5 w-5" />, onSelect: recenter },
    { id: "help", label: t("menuControls", "Controles"), icon: <Gamepad2 className="h-5 w-5" />, onSelect: () => setHelpOpen(true) },
    qualityItem,
    { id: "tech", label: t("menuTech", "Técnico"), hint: t("techPanel", "Painel técnico"), icon: <Activity className="h-5 w-5" />, active: statsOpen, onSelect: () => setStatsOpen((v) => !v) },
    ...(net === "offline" || net === "replaced"
      ? [{ id: "reconnect", label: t("reconnect", "Reconectar"), icon: <RefreshCw className="h-5 w-5" />, onSelect: () => gameRef.current?.reconnect() }]
      : []),
    { id: "leave", label: t("menuExitGame", "Sair do jogo"), hint: t("back", "Voltar ao perfil"), icon: <LogOut className="h-5 w-5" />, onSelect: () => router.push("/account") },
  ]
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`

  return (
    <div className="fl-sharp fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-[#A8D4F2]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full outline-none"
        style={{ touchAction: "none" }}
        aria-label={t("canvasAria", "Bairro do Meu Mundo")}
      />

      {/* Painel técnico (leitura ao vivo; não bloqueia o jogo) */}
      {statsOpen && (
        <div className="pointer-events-auto absolute left-0 max-w-[min(92vw,320px)]" style={{ top: "max(12px, env(safe-area-inset-top))", marginLeft: SAFE.left }}>
          <Chamfer cut={12} border={`${EVO.dourado}99`}>
            <div className="relative px-3 py-2 font-mono text-[11px] leading-5" style={{ color: EVO.branco }}>
              <button
                type="button"
                onClick={() => setStatsOpen(false)}
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center"
                style={{ color: EVO.mudo }}
                aria-label={t("close", "Fechar")}
              >
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
              <div className="mt-1 border-t pt-1" style={{ borderColor: EVO.linha, color: EVO.mudo }}>
                {CLIENT_RELEASE} · {payload.release} · {BUILD}
              </div>
            </div>
          </Chamfer>
        </div>
      )}

      {/* Ajuda dos controles (some ao tocar; volta pelo menu) */}
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

      {/* Aviso de interação (só leitura: casa alheia, saída) */}
      {status === "ready" && nearby && !nearbyAction && !open && !levelOpen && !isTouch && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ bottom: bottom(48) }}>
          <EvoToast icon={<kbd className="border px-1.5 pt-0.5 text-[15px]">E</kbd>}>{nearbyLabel}</EvoToast>
        </div>
      )}

      {/* Computador: a própria casa (e a casa visitada) ganha botão clicável, com o atalho E nele */}
      {status === "ready" && nearbyAction && !open && !levelOpen && !isTouch && !drivingLot && (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-stretch gap-2" style={{ bottom: bottom(48) }}>
          {nearbyMine && (
            <EvoButton variant="gold" size="lg" icon={<Construction className="h-5 w-5" />} onClick={() => setLevelOpen(true)}>
              {t("changeHouse", "Alterar casa")}
            </EvoButton>
          )}
          <EvoButton
            variant="primary"
            size="lg"
            kbd="E"
            icon={nearbyCar ? <VehicleIcon kind={vehicleKind}  className="h-5 w-5" /> : nearbyExit ? <Building2 className="h-5 w-5" /> : <DoorOpen className="h-5 w-5" />}
            onClick={() => gameRef.current?.interact()}
            aria-label={nearbyLabel}
          >
            {nearbyLabel}
          </EvoButton>
        </div>
      )}

      {/* Dirigindo: descer — e, montado perto de casa, entrar com o veículo. No
          celular fica embaixo à direita (o joystick dirige); "Recuperar" mora no menu. */}
      {status === "ready" && !!drivingLot && !open && !levelOpen && (!isTouch || !menuOpen) && (
        <div
          className={isTouch ? "absolute flex flex-col items-end gap-2" : "absolute left-1/2 flex -translate-x-1/2 gap-2"}
          style={isTouch ? { bottom: bottom(24), right: SAFE.right } : { top: "max(12px, env(safe-area-inset-top))" }}
        >
          {(nearbyMine || nearbyVisit) && drivingKind !== "car" && (
            <EvoButton variant="primary" icon={<DoorOpen className="h-5 w-5" />} onClick={() => gameRef.current?.interact()} kbd={isTouch ? undefined : "E"}>
              {nearbyLabel}
            </EvoButton>
          )}
          {nearbyExit && (
            <EvoButton variant="primary" icon={<Building2 className="h-5 w-5" />} onClick={() => gameRef.current?.interact()} kbd={isTouch ? undefined : "E"}>
              {t("goCenter", "Ir ao centro")}
            </EvoButton>
          )}
          <EvoButton
            variant={((nearbyMine || nearbyVisit) && drivingKind !== "car") || nearbyExit ? "gold" : "primary"}
            icon={<VehicleIcon kind={drivingKind} className="h-5 w-5" />}
            onClick={() => gameRef.current?.leaveVehicle()}
            kbd={isTouch || ((nearbyMine || nearbyVisit) && drivingKind !== "car") || nearbyExit ? undefined : "E"}
          >
            {t("leaveVehicle", "Descer")}
          </EvoButton>
        </div>
      )}

      {/* Celular: o MESMO joystick anda e dirige (mm3d-25) */}
      {status === "ready" && isTouch && !open && !levelOpen && !menuOpen && <Joystick gameRef={gameRef} />}

      {status === "ready" && isTouch && !open && !levelOpen && !menuOpen && !drivingLot && (
        <>
          {nearbyMine && (
            <EvoButton
              variant="gold"
              onClick={() => setLevelOpen(true)}
              size="none"
              className="!absolute min-h-14 max-w-[44vw] text-[17px] leading-tight"
              style={{ bottom: bottom(196), right: SAFE.right }}
              icon={<Construction className="h-5 w-5 shrink-0" />}
            >
              {t("changeHouse", "Alterar casa")}
            </EvoButton>
          )}
          {nearby && (
            <EvoButton
              variant="primary"
              onClick={() => gameRef.current?.interact()}
              aria-label={nearbyLabel}
              size="none"
              className="!absolute min-h-16 min-w-16 max-w-[44vw] text-[18px] leading-tight"
              style={{ bottom: bottom(24), right: SAFE.right }}
              icon={nearbyCar ? <VehicleIcon kind={vehicleKind}  className="h-6 w-6 shrink-0" /> : nearbyExit ? <Building2 className="h-6 w-6 shrink-0" /> : nearbyAction ? <DoorOpen className="h-6 w-6 shrink-0" /> : <Hand className="h-5 w-5 shrink-0" />}
            >
              {nearbyLabel}
            </EvoButton>
          )}
        </>
      )}

      {/* A gaveta do menu (direita) */}
      {status === "ready" && (
        <div className="pointer-events-none absolute inset-0">
          <Drawer
            open={menuOpen}
            onOpenChange={setMenuOpen}
            heading={t("menuStreet", "O bairro")}
            items={menuItems}
            hotkeys={!blocked && !open && !levelOpen}
            footer={
              <>
                {nb.name} · {CLIENT_RELEASE} · {BUILD}
              </>
            }
          />
        </div>
      )}

      {/* Ficha da casa / da saída */}
      {open && (
        <EvoDialog
          labelId="mm-open-title"
          eyebrow={
            open.kind === "house"
              ? `${t("houseEyebrow", "Casa")} · ${
                  open.house.isMine ? t("yourHouse", "Sua casa") : open.house.ownerName ? t("occupied", "Ocupada") : t("available", "Disponível")
                }`
              : t("exitEyebrow", "Saída do bairro")
          }
          title={open.kind === "house" ? t("lot", "Lote {n}").replace("{n}", String(open.lot.number).padStart(2, "0")) : `${exitLabel} — ${t("nextStage", "próxima etapa")}`}
          onClose={() => setOpen(null)}
          width="max-w-sm"
          footer={
            <EvoButton variant="primary" className="w-full" onClick={() => setOpen(null)}>
              {t("ok", "Entendi")}
            </EvoButton>
          }
        >
          {open.kind === "house" ? (
            <>
              <InfoRow label={t("level", "Nível da casa")}>{String(open.house.level).padStart(2, "0")}</InfoRow>
              <InfoRow label={t("owner", "Proprietário")}>
                {open.house.isMine ? t("yourHouse", "Sua casa") : (open.house.ownerName ?? t("available", "Disponível"))}
              </InfoRow>
              {open.house.ownerName && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 font-semibold" style={{ boxShadow: `inset 0 0 0 1px ${EVO.linhaForte}` }}>
                  <Lock className="h-4 w-4 shrink-0" style={{ color: EVO.douradoClaro }} />
                  {t("needsInvite", "Esta casa só abre com convite do morador.")}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: EVO.mudo }}>{t("exitDesc", "O centro da cidade ainda está sendo construído. Por enquanto, o portão fica fechado.")}</p>
          )}
        </EvoDialog>
      )}

      {/* Seletor de nível da própria casa (teste) */}
      {levelOpen && nb.houseCatalog && (
        <HouseLevelPanel catalog={nb.houseCatalog} lot={myLot} visual={houseVis} gameRef={gameRef} onClose={() => setLevelOpen(false)} />
      )}

      {status === "ready" && winded && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
          <WindedToast />
        </div>
      )}
      {status === "ready" && (net === "offline" || net === "replaced") && (
        <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
          <button type="button" onClick={() => gameRef.current?.reconnect()} aria-label={t("reconnect", "Reconectar")}>
            <EvoToast icon={<WifiOff className="h-4 w-4 shrink-0" />}>{netLabel}</EvoToast>
          </button>
        </div>
      )}
      {/* Carregando / erro */}
      {status !== "ready" && <SceneCurtain status={status} text={t("loading", "Montando o bairro…")} errorTitle={t("errorTitle", "O bairro não abriu")} errorText={t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")} onRetry={retry} onLeave={() => router.push("/account")} leaveLabel={t("back", "Voltar ao perfil")} />}
    </div>
  )
}

/** Ícone do veículo (mm3d-14): carro, bicicleta, skate ou patins. */
export function VehicleIcon({ kind, className }: { kind: RideKind; className?: string }) {
  if (kind === "car") return <CarFront className={className} />
  if (kind === "bike") return <Bike className={className} />
  if (kind === "skates") return <Footprints className={className} />
  // skate: a prancha vista de lado
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M3 10h18l-2 3H5z" />
      <circle cx="7" cy="17" r="1.8" />
      <circle cx="17" cy="17" r="1.8" />
    </svg>
  )
}

/** Cortina de carregamento/erro dos ambientes (rua e casa). */
export function SceneCurtain({
  status,
  text,
  errorTitle,
  errorText,
  onRetry,
  onLeave,
  leaveLabel,
}: {
  status: "loading" | "error" | "ready"
  text: string
  errorTitle: string
  errorText?: string
  onRetry: () => void
  onLeave: () => void
  leaveLabel: string
}) {
  const t = useTranslations("MeuMundo")
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ background: `radial-gradient(ellipse at 50% 40%, ${EVO.vinho}, ${EVO.preto} 70%)` }}>
      {status === "loading" ? (
        <EvoToast icon={<Loader2 className="h-4 w-4 animate-spin" />}>{text}</EvoToast>
      ) : (
        <Chamfer cut={16} border={`${EVO.dourado}bb`} className="w-full max-w-sm">
          <div className="p-5 text-left">
            <div className={`${teko.className} text-[30px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
              {errorTitle}
            </div>
            {errorText && (
              <p className={`${archivo.className} mt-2 text-[14px]`} style={{ color: EVO.mudo }}>
                {errorText}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <EvoButton variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
                {t("retry", "Tentar de novo")}
              </EvoButton>
              <EvoButton variant="gold" onClick={onLeave}>
                {leaveLabel}
              </EvoButton>
            </div>
          </div>
        </Chamfer>
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
      className="absolute flex h-36 w-36 items-center justify-center"
      // Redondo, sem contorno, transparente e com sombra leve (pedido do Alex,
      // 2026-10-25). data-dot: o .fl-sharp zera todo arredondamento, menos círculos.
      data-dot=""
      style={{
        bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 16px)",
        left: SAFE.left,
        touchAction: "none",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.14)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.16)",
      }}
      onPointerDown={(e) => {
        if (idRef.current !== null) return
        idRef.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        ref={knobRef}
        className="pointer-events-none relative h-16 w-16"
        data-dot=""
        style={{ borderRadius: "50%", background: "rgba(255,255,255,0.42)", boxShadow: "0 3px 10px rgba(0,0,0,0.18)" }}
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
    <EvoDialog
      labelId="mm-level-title"
      eyebrow={`${t("lot", "Lote {n}").replace("{n}", pad(lot))} · ${t("testFeature", "Recurso de teste")}`}
      title={t("levelTitle", "Escolher nível da casa")}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <div className="w-full">
          <div role="status" aria-live="polite" className="min-h-5 text-[13px] font-semibold" style={{ color: EVO.branco }}>
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("levelLoading", "Carregando nível {n}…").replace("{n}", pad(visual.confirmed))}
                {pct != null && ` ${pct}%`}
              </span>
            ) : failed ? (
              <span className="inline-flex flex-wrap items-center gap-2" style={{ color: EVO.perigo }}>
                {t("levelLoadFail", "O modelo do nível {n} não carregou — mostrando o nível {m}.")
                  .replace("{n}", pad(visual.confirmed))
                  .replace("{m}", pad(visual.shown))}
                <EvoButton variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => gameRef.current?.retryHouse(lot)}>
                  {t("retry", "Tentar de novo")}
                </EvoButton>
              </span>
            ) : error ? (
              <span style={{ color: EVO.perigo }}>{error}</span>
            ) : (
              <span>
                {t("levelConfirmed", "Nível confirmado: {n}").replace("{n}", pad(visual.confirmed))}
                {current?.size && (
                  <span style={{ color: EVO.mudo }}>
                    {" · "}
                    {t("levelSize", "{w} × {d} m").replace("{w}", current.size.width.toFixed(1)).replace("{d}", current.size.depth.toFixed(1))}
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-tight" style={{ color: EVO.mudo }}>
            {t("levelTestNote", "Teste visual: todos os níveis estão liberados, sem custo. Não é loja nem evolução.")}
          </p>
          <div className="mt-3 flex gap-2">
            <EvoButton
              variant="primary"
              className="flex-1"
              onClick={apply}
              disabled={pending || !current?.available || selected === visual.confirmed}
              icon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {t("levelApply", "Aplicar nível {n}").replace("{n}", pad(selected))}
            </EvoButton>
            <EvoButton variant="ghost" onClick={onClose}>
              {t("close", "Fechar")}
            </EvoButton>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-5">
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
              className={`text-left ${l.available ? "" : "cursor-not-allowed opacity-45"}`}
            >
              <Chamfer cut={10} border={isSel ? "#ff5fae" : EVO.linhaForte} width={isSel ? 2 : 1}>
                <div className="flex aspect-[4/3] items-center justify-center" style={{ background: isSel ? "rgba(128,0,51,0.55)" : "rgba(245,240,237,0.06)" }}>
                  {l.thumb ? (
                    // Miniatura estática pequena (WebP com hash), dentro de um jogo só de admin.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={catalog.basePath + l.thumb} alt="" loading="lazy" className="h-full w-full object-contain" draggable={false} />
                  ) : (
                    <Construction className="h-6 w-6" style={{ color: EVO.mudo }} />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 pb-1 pt-1.5">
                  <span className={`${teko.className} text-[17px] font-semibold uppercase leading-none`} style={{ color: EVO.branco }}>
                    {t("levelN", "Nível {n}").replace("{n}", pad(l.level))}
                  </span>
                  {isConfirmed && <HudChip tone="ouro">{t("levelCurrent", "Atual")}</HudChip>}
                </div>
                {!l.available && (
                  <div className="px-2 pb-1.5 text-[10px] font-semibold leading-tight" style={{ color: EVO.mudo }}>
                    {t("levelNoModel", "Modelo ainda não fornecido")}
                  </div>
                )}
              </Chamfer>
            </button>
          )
        })}
      </div>
    </EvoDialog>
  )
}
