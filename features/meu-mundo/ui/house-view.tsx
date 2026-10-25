"use client"

// features/meu-mundo/ui/house-view.tsx — o INTERIOR de uma casa (mm3d-09).
//
// Um jogo por montagem, como o bairro: a casca troca de ambiente desmontando
// esta tela (o descarte do motor acontece aqui) antes de montar a próxima.
// A porta pede a saída ao servidor pela casca; sentar, deitar, dormir e
// levantar vão pela sala (mm3d-13: deitar e dormir gravam a vida do hóspede —
// ele continua dormindo com o jogo fechado).
//
// mm3d-28: a geladeira do titular. Abrir e comer são pedidos à sala; a
// prateleira (ui/fridge) é só desta tela e, aberta, bloqueia o andar do
// personagem local. Cada prato confirmado ganha UMA chave: o reenvio (rede
// lenta) usa a mesma chave, então a sala nunca come duas vezes.

import { useCallback, useEffect, useRef, useState } from "react"
import { DoorOpen, Info, Armchair, ArrowUpFromLine, BedDouble, HeartPulse, Moon, Refrigerator, RefreshCw, Send, Sun, WifiOff } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { createHouseGame, type FridgeReply, type HouseGameHandle } from "../engine/house-game"
import { kindOfId } from "../engine/motion"
import { fetchSession } from "../data"
import type { BodyId, FridgeStock, GameStats, HousePayload, Interactable, LifeCharacter, LifeItem, NetStatus, VisitState } from "../types"
import { CLIENT_RELEASE, Joystick, SAFE, SceneCurtain, VehicleIcon } from "./meu-mundo-view"
import { Drawer, EvoButton, EvoDialog, EvoToast, InfoRow, WindedToast, presenceState, type DrawerItem } from "./hud/hud-kit"
import { useQualityItem } from "./hud/quality-item"
import { EVO } from "./status/evo-skin"
import { itemName } from "./status/status-pages"
import FridgePanel from "./fridge/fridge-panel"
import { newEatKey } from "./fridge/fridge-logic"

interface FridgeView {
  id: string
  items: LifeItem[]
  stock: FridgeStock
  character: LifeCharacter | null
}

export interface HouseSceneProps {
  payload: HousePayload
  visits: VisitState | null
  onExit: () => void
  onOpenInvite: () => void
  onMoved: () => void
  onServerMessage: (type: string, payload: unknown) => void
  blocked?: boolean
  /** Abre a tela de STATUS do hóspede (mm3d-13). */
  onOpenStatus?: (body: BodyId) => void
  /** Outra tela 3D por cima (hospital, mm3d-26): a sala segue ligada, o desenho para. */
  suspended?: boolean
}

export default function HouseView({ payload, visits, onExit, onOpenInvite, onMoved, onServerMessage, blocked, onOpenStatus, suspended }: HouseSceneProps) {
  const t = useTranslations("MeuMundo")
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<HouseGameHandle | null>(null)
  const qualityItem = useQualityItem((c) => gameRef.current?.setQuality(c))
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [net, setNet] = useState<NetStatus>("connecting")
  const [online, setOnline] = useState<number | null>(null)
  const [nearby, setNearby] = useState<Interactable | null>(null)
  const [seat, setSeat] = useState<string | null>(null)
  const [rest, setRest] = useState<{ bed: string; sleeping: boolean } | null>(null)
  const [denied, setDenied] = useState<string | null>(null)
  const [restDenied, setRestDenied] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  // A gaveta do menu (direita): abre puxando, clicando no puxador ou com M.
  const [menuOpen, setMenuOpen] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  // Tipo físico: vem da vida, pela sala (não se escolhe).
  const [body, setBody] = useState<BodyId>(payload.me.body)
  // Montado numa bike/skate/patins (id; 0 = a pé) e recusa de usar/descer (mm3d-15).
  const [riding, setRiding] = useState(0)
  const [rideDenied, setRideDenied] = useState<string | null>(null)
  const rideKind = (riding && kindOfId(riding)) || "bike"
  // Geladeira aberta (mm3d-28), o prato esperando a sala e o aviso curto dela.
  const [fridge, setFridge] = useState<FridgeView | null>(null)
  const [eating, setEating] = useState<{ item: string; key: string } | null>(null)
  const eatingRef = useRef<{ item: string; key: string } | null>(null)
  const [fridgeNotice, setFridgeNotice] = useState<string | null>(null)
  const [fridgeDenied, setFridgeDenied] = useState<string | null>(null)
  // Sem fôlego (mm3d-28): a sala só deixa andar até recuperar.
  const [winded, setWinded] = useState(false)
  const cbRef = useRef({ onExit, onMoved, onServerMessage, onFridge: (_m: FridgeReply) => {} })
  useEffect(() => {
    cbRef.current = { ...cbRef.current, onExit, onMoved, onServerMessage }
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
          onBody: (b) => alive && setBody(b),
          onRiding: (id) => alive && setRiding(id),
          onFridge: (m) => alive && cbRef.current.onFridge(m),
          onFridgeClosed: () => {
            if (!alive) return
            setFridge(null)
            eatingRef.current = null
            setEating(null)
          },
          onWinded: (w) => alive && setWinded(w),
          onRideDenied: (r) => {
            if (!alive) return
            setRideDenied(r)
            setTimeout(() => alive && setRideDenied(null), 2500)
          },
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
    gameRef.current?.setBlocked(infoOpen || menuOpen || !!blocked || !!fridge)
    gameRef.current?.setSuspended(!!suspended)
  }, [infoOpen, menuOpen, blocked, suspended, status, fridge])

  // ── geladeira ──────────────────────────────────────────────────────────────
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sayFridge = useCallback((msg: string) => {
    setFridgeNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setFridgeNotice(null), 3200)
  }, [])
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
  }, [])
  const fridgeReason = useCallback(
    (r?: string) =>
      r === "empty"
        ? t("frEmpty", "Acabou na geladeira.")
        : r === "far"
          ? t("frFar", "Chegue mais perto da geladeira.")
          : r === "not_owner"
            ? t("frNotOwner", "Só o morador abre a geladeira.")
            : r === "full"
              ? t("frFull", "Ele está satisfeito — não cabe mais nada agora.")
              : r === "sleeping"
                ? t("frSleeping", "Ele está dormindo.")
                : r === "hospital"
                  ? t("lifeInHospital", "Ele está internado no hospital")
                  : r === "dead"
                    ? t("lifeDead", "Seu hóspede morreu")
                    : r === "riding"
                      ? t("frRiding", "Desça do veículo primeiro.")
                      : r === "timeout"
                        ? t("frTimeout", "A geladeira não respondeu. Tente de novo.")
                        : t("frDenied", "Não deu agora. Tente de novo."),
    [t],
  )
  useEffect(() => {
    cbRef.current.onFridge = (m: FridgeReply) => {
      if (m.a === "open") {
        if (m.ok) {
          setFridge({ id: m.fridge, items: m.catalog?.items ?? [], stock: m.stock ?? {}, character: m.character ?? null })
          setFridgeNotice(null)
        } else {
          setFridgeDenied(fridgeReason(m.reason))
          setTimeout(() => setFridgeDenied(null), 2800)
        }
        return
      }
      if (m.a !== "eat") return
      const cur = eatingRef.current
      // Resposta de um pedido antigo (outra chave): ignorada.
      if (!cur || cur.key !== m.key) return
      eatingRef.current = null
      setEating(null)
      if (!m.ok) return sayFridge(fridgeReason(m.reason))
      setFridge((f) => (f ? { ...f, stock: m.stock ?? f.stock, character: m.character ?? f.character } : f))
      const it = fridge?.items.find((x) => x.id === (m.ate?.item ?? cur.item))
      const name = it ? itemName(it, t) : ""
      const meal = m.ate?.meal
      sayFridge(
        meal
          ? meal.done
            ? t("frAteMeal", "{item}: refeição das {h} h feita.").replace("{item}", name).replace("{h}", String(meal.at))
            : t("frAtePart", "{item}: parte da refeição das {h} h.").replace("{item}", name).replace("{h}", String(meal.at))
          : t("frAte", "{item}: pronto.").replace("{item}", name),
      )
    }
  }, [fridge, fridgeReason, sayFridge, t])

  const eat = useCallback(
    (item: LifeItem) => {
      if (eatingRef.current) return
      const req = { item: item.id, key: newEatKey() }
      eatingRef.current = req
      setEating(req)
      gameRef.current?.eatFridge(item.id, req.key)
      // Sem resposta: reenvia com a MESMA chave (a sala devolve o já gravado),
      // e desiste depois da segunda espera.
      setTimeout(() => {
        if (eatingRef.current?.key !== req.key) return
        gameRef.current?.eatFridge(item.id, req.key)
        setTimeout(() => {
          if (eatingRef.current?.key !== req.key) return
          eatingRef.current = null
          setEating(null)
          sayFridge(t("frTimeout", "A geladeira não respondeu. Tente de novo."))
        }, 6000)
      }, 6000)
    },
    [sayFridge, t],
  )
  const closeFridge = useCallback(() => {
    gameRef.current?.closeFridge()
    setFridge(null)
    eatingRef.current = null
    setEating(null)
  }, [])
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const fit = () => setCompact(window.innerWidth < 760 || window.innerHeight < 560)
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
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
      : nearby?.kind === "car"
        ? t("useVehicle", "Usar")
        : nearby?.kind === "car-exit"
          ? t("leaveVehicle", "Descer")
        : nearby?.kind === "fridge"
          ? t("frOpen", "Abrir geladeira")
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
  ) : nearby?.kind === "car" ? (
    <VehicleIcon kind={nearby.vkind} className="h-5 w-5 shrink-0" />
  ) : nearby?.kind === "car-exit" ? (
    <VehicleIcon kind={rideKind} className="h-5 w-5 shrink-0" />
  ) : nearby?.kind === "door" ? (
    <DoorOpen className="h-5 w-5 shrink-0" />
  ) : nearby?.kind === "bed" ? (
    <BedDouble className="h-5 w-5 shrink-0" />
  ) : nearby?.kind === "fridge" ? (
    <Refrigerator className="h-5 w-5 shrink-0" />
  ) : (
    <Armchair className="h-5 w-5 shrink-0" />
  )
  const hasAction = !!seat || !!rest || !!nearby
  // Montado na porta: "Sair da casa" (ele sai junto) e, ao lado, "Descer".
  const rideAtDoor = !!riding && nearby?.kind === "door"
  const rideDeniedLabel =
    rideDenied === "stairs"
      ? t("rideStairs", "Na escada não dá para descer.")
      : rideDenied === "far"
        ? t("vehicleTooFar", "Chegue mais perto.")
        : rideDenied === "busy"
          ? t("vehicleBusy", "Alguém já está usando.")
          : t("vehicleUnavailable", "Não está disponível agora.")
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

  const nearDoor = nearby?.kind === "door"
  const menuItems: DrawerItem[] = [
    ...(onOpenStatus
      ? [{ id: "status", label: t("stTitle", "Status"), hint: t("menuStatusHint", "Vida, mercado e rotina"), icon: <HeartPulse className="h-5 w-5" />, kind: "nav" as const, onSelect: () => onOpenStatus(body) }]
      : []),
    ...(isOwner
      ? [{ id: "invite", label: t("invite", "Convidar"), hint: t("menuInviteHint", "Chamar alguém para a sua casa"), icon: <Send className="h-5 w-5" />, kind: "nav" as const, onSelect: onOpenInvite }]
      : []),
    qualityItem,
    { id: "info", label: t("houseInfoShort", "Casa"), hint: t("houseInfo", "Informações da casa"), icon: <Info className="h-5 w-5" />, kind: "nav", active: infoOpen, onSelect: () => setInfoOpen(true) },
    ...(net === "offline" || net === "replaced"
      ? [{ id: "reconnect", label: t("reconnect", "Reconectar"), icon: <RefreshCw className="h-5 w-5" />, onSelect: () => gameRef.current?.reconnect() }]
      : []),
    // Sair é na porta (o servidor confere); longe dela o item só orienta.
    {
      id: "exit",
      label: t("exitHouse", "Sair da casa"),
      hint: nearDoor ? undefined : t("exitGoToDoor", "Vá até a porta para sair"),
      icon: <DoorOpen className="h-5 w-5" />,
      disabled: !nearDoor,
      onSelect: onExit,
    },
  ]
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  const overlay = infoOpen || menuOpen || !!fridge

  return (
    <div className="fixed inset-0 z-[60] touch-none select-none overflow-hidden bg-[#29262B]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full outline-none"
        style={{ touchAction: "none" }}
        aria-label={t("houseCanvasAria", "Interior da casa")}
      />

      {/* Dormindo (pedido do Alex, 2026-10-25): a tela escurece bastante; o
          "Acordar" e os avisos ficam por cima. Camada estática, sem animação. */}
      {rest?.sleeping && <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(4,4,10,0.82)" }} aria-hidden />}

      {status === "ready" && (net === "offline" || net === "replaced") && (
        <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
          <button type="button" onClick={() => gameRef.current?.reconnect()} aria-label={t("reconnect", "Reconectar")}>
            <EvoToast icon={<WifiOff className="h-4 w-4 shrink-0" />}>{netLabel}</EvoToast>
          </button>
        </div>
      )}
      {/* Avisos curtos (lugar ocupado, cama longe, dormindo) */}
      {(denied || restDenied || rideDenied || fridgeDenied || rest?.sleeping || (winded && !overlay)) && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
          {denied ? (
            <EvoToast>{denied === "taken" ? t("seatTaken", "Esse lugar já está ocupado") : t("seatDenied", "Chegue mais perto para sentar")}</EvoToast>
          ) : rideDenied ? (
            <EvoToast>{rideDeniedLabel}</EvoToast>
          ) : fridgeDenied ? (
            <EvoToast>{fridgeDenied}</EvoToast>
          ) : winded && !rest?.sleeping ? (
            <WindedToast />
          ) : restDenied ? (
            <EvoToast>{restDeniedLabel}</EvoToast>
          ) : (
            <EvoToast tone="magenta" icon={<Moon className="h-4 w-4 shrink-0" />}>
              {t("bedSleepingLine", "Dormindo — ele continua dormindo mesmo com o jogo fechado")}
            </EvoToast>
          )}
        </div>
      )}

      {/* Deitado: dormir (8 h). Computador e celular. */}
      {status === "ready" && canSleep && !overlay && (
        <EvoButton
          variant="gold"
          size="lg"
          onClick={() => gameRef.current?.sleep(8)}
          aria-label={t("bedSleep", "Dormir")}
          className="!absolute"
          style={{ bottom: bottom(isTouch ? 80 : 96), right: SAFE.right }}
          icon={<Moon className="h-5 w-5 shrink-0" />}
        >
          {t("bedSleep", "Dormir")}
        </EvoButton>
      )}

      {/* Montado e perto da porta: descer aqui dentro (o E sai com ele) */}
      {status === "ready" && rideAtDoor && !overlay && (
        <EvoButton
          variant="gold"
          size="lg"
          onClick={() => gameRef.current?.leaveRide()}
          aria-label={t("leaveVehicle", "Descer")}
          className="!absolute"
          style={{ bottom: bottom(isTouch ? 80 : 96), right: SAFE.right }}
          icon={<VehicleIcon kind={rideKind} className="h-5 w-5 shrink-0" />}
        >
          {t("leaveVehicle", "Descer")}
        </EvoButton>
      )}

      {/* Computador: ação clicável com o atalho E */}
      {status === "ready" && hasAction && !overlay && !isTouch && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: bottom(24) }}>
          <EvoButton variant="primary" size="lg" kbd="E" icon={actionIcon} onClick={() => gameRef.current?.interact()} aria-label={actionLabel}>
            {actionLabel}
          </EvoButton>
        </div>
      )}

      {status === "ready" && isTouch && !overlay && (
        <>
          {!seat && !rest && <Joystick gameRef={gameRef} />}
          {hasAction && (
            <EvoButton
              variant="primary"
              onClick={() => gameRef.current?.interact()}
              aria-label={actionLabel}
              className="!absolute !min-h-12 max-w-[46vw]"
              style={{ bottom: bottom(20), right: SAFE.right }}
              icon={actionIcon}
            >
              {actionLabel}
            </EvoButton>
          )}
        </>
      )}

      {/* A gaveta do menu (direita); some com a geladeira aberta (a aba ficava por cima dela) */}
      {status === "ready" && !fridge && (
        <div className="pointer-events-none absolute inset-0">
          <Drawer
            open={menuOpen}
            onOpenChange={setMenuOpen}
            heading={t("menuHouse", "A casa")}
            items={menuItems}
            hotkeys={!blocked && !infoOpen && !fridge}
            presence={{ count: online, scope: t("presenceHouse", "Nesta casa"), state: presenceState(net) }}
          />
        </div>
      )}

      {fridge && status === "ready" && (
        <FridgePanel
          items={fridge.items}
          stock={fridge.stock}
          character={fridge.character}
          pending={eating?.item ?? null}
          notice={fridgeNotice}
          compact={compact}
          t={t}
          onEat={eat}
          onClose={closeFridge}
        />
      )}

      {infoOpen && (
        <EvoDialog labelId="mm-house-info" eyebrow={t("houseInfo", "Informações da casa")} title={t("lot", "Lote {n}").replace("{n}", lotLabel)} onClose={() => setInfoOpen(false)} width="max-w-sm">
          <InfoRow label={t("infoOwner", "Titular")}>{h.ownerName}</InfoRow>
          <InfoRow label={t("infoLevel", "Nível")}>{String(h.level).padStart(2, "0")}</InfoRow>
          <InfoRow label={t("infoPlace", "Bairro e número")}>
            {h.neighborhoodName} · {lotLabel}
          </InfoRow>
          <InfoRow label={t("infoFloors", "Andares")}>{payload.interior.floors.length}</InfoRow>
          <InfoRow label={t("infoVisit", "Visita")}>{visitLine}</InfoRow>
          <div className="mt-3 font-mono text-[10px] leading-4" style={{ color: EVO.mudo }}>
            {payload.release} · {CLIENT_RELEASE} · {payload.interior.version ?? ""}
            {stats && <> · {Math.round(stats.fps)} fps</>}
          </div>
        </EvoDialog>
      )}

      {status !== "ready" && (
        <SceneCurtain
          status={status}
          text={t("houseLoading", "Abrindo a casa…")}
          errorTitle={t("houseErrorTitle", "A casa não abriu")}
          onRetry={() => {
            setStatus("loading")
            setAttempt((a) => a + 1)
          }}
          onLeave={onExit}
          leaveLabel={t("exitHouse", "Sair da casa")}
        />
      )}
    </div>
  )
}
