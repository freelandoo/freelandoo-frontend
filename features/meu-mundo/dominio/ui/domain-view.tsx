"use client"

// features/meu-mundo/dominio/ui/domain-view.tsx — lore v2 D1: a TELA DO DOMÍNIO.
//
// Cobre a tela como um minijogo (o centro sai da memória: ui/offstage.ts). Monta a
// cena genérica de 10 setores (engine/domain-game.ts) e, no "Lutar" do guardião,
// pede a luta ao SERVIDOR (POST /fight/start com origin "domain": ele confere as
// travas e escolhe monstro e nível pelo setor) e troca a cena pela das Lâminas no
// palco do Domínio (entrada, fundo ou palácio) — um ambiente 3D por vez. O recibo
// da luta conferida traz o setor vencido; a cena volta na frente do guardião, com
// o portão aberto se ele caiu. No fim do setor 10, a passagem leva ao próximo.

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DoorOpen, Footprints, Shield, Swords } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { enterDomain, equipGear, getDomains, reachDomainPlace, startFight, type DomainAdvance, type DomainId, type DomainPact, type DomainInfo, type FightTicket, type Receipt } from "../../data"
import { createDomainGame, passageKitOf, sceneKitOf, type DomainGameHandle, type DomainNear } from "../engine/domain-game"
import { Joystick, SAFE, SceneCurtain } from "../../ui/meu-mundo-view"
import { EvoButton, EvoToast } from "../../ui/hud/hud-kit"
import { useMobName } from "../../laminas/ui/laminas-view"
import type { DomainStageSpec } from "../../laminas/engine/domain-stage"
import type { BodyId } from "../../types"
import { domainName, foeName, lockText } from "./domain-portal"
import { GolemVoices } from "../../ui/quest/god-voice"

const LaminasView = dynamic(() => import("../../laminas/ui/laminas-view").then((m) => m.LaminasView), { ssr: false })

type Tr = (key: string, fallback: string) => string

export function DomainView({ body, look, domain: first, onExit }: { body: BodyId; look?: string; domain: DomainId; onExit: () => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const mobName = useMobName(false)
  const [id, setId] = useState<DomainId>(first)
  const [info, setInfo] = useState<DomainInfo | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)
  const [near, setNear] = useState<DomainNear>(null)
  const [sector, setSector] = useState(0)
  const [place, setPlace] = useState<string | null>(null)
  // C5: perto do Golem (o servidor diz se valeu ou se a pessoa está armada)
  const [spot, setSpot] = useState<string | null>(null)
  const [golem, setGolem] = useState<{ run: number; armed: boolean }>({ run: 0, armed: false })
  const [stowing, setStowing] = useState(false)
  const [spawn, setSpawn] = useState(0)
  const [fight, setFight] = useState<{ ticket: FightTicket; sector: number; foe: string; foeBody: BodyId | null; foeRig: boolean } | null>(null)
  const [opening, setOpening] = useState(false)
  const [news, setNews] = useState<{ text: string; id: number } | null>(null)
  const [isTouch, setIsTouch] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<DomainGameHandle | null>(null)

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches)
  }, [])
  useEffect(() => {
    if (!news) return
    const h = setTimeout(() => setNews(null), 4200)
    return () => clearTimeout(h)
  }, [news])

  // o servidor confere as travas e manda o Domínio pronto (setores, nível, Poder)
  const load = useCallback(async (which: DomainId) => {
    const token = getToken()
    if (!token) return
    setFailed(null)
    const r = await enterDomain(token, which)
    if (r.ok) setInfo(r.data.domain)
    else setFailed(r.error)
  }, [])
  useEffect(() => {
    setInfo(null)
    void load(id)
  }, [id, load])

  // ── a cena (só sem luta aberta: um ambiente 3D por vez) ──
  const labels = useRef({ t, info, near })
  useEffect(() => {
    labels.current = { t, info, near }
  }, [t, info, near])
  const ready = !!info && !fight
  const infoRef = useRef(info)
  useEffect(() => {
    infoRef.current = info
  }, [info])
  const askFight = useRef<(s: number) => void>(() => {})
  const cross = useRef<() => void>(() => {})
  useEffect(() => {
    const canvas = canvasRef.current
    const d = infoRef.current
    if (!canvas || !ready || !d) return
    let alive = true
    setStatus("loading")
    let handle: DomainGameHandle | null = null
    try {
      handle = createDomainGame({
        canvas,
        body,
        look,
        domain: d,
        kit: sceneKitOf(d.id),
        nextKit: passageKitOf(d.id),
        spawnSector: spawn,
        onReady: () => alive && setStatus("ready"),
        onNearbyChange: (n) => alive && setNear(n),
        onSector: (s) => alive && setSector(s),
        onPlace: (p) => alive && setPlace(p),
        onSpot: (s) => alive && setSpot(s),
        onInteract: (n) => {
          if (!alive) return
          if (n.kind === "exit") onExit()
          else if (n.kind === "guard") askFight.current(n.sector)
          else if (n.kind === "passage") cross.current()
        },
        onError: () => alive && setStatus("error"),
      })
      gameRef.current = handle
    } catch (err) {
      console.error("[meu-mundo] o Domínio não abriu", err)
      setStatus("error")
    }
    return () => {
      alive = false
      handle?.dispose()
      gameRef.current = null
      setNear(null)
      setPlace(null)
      setSpot(null)
    }
    // a cena remonta ao trocar de Domínio, ao voltar da luta e no "tentar de novo"
  }, [ready, body, look, spawn, attempt, onExit])

  // o portão abre na hora em que o servidor diz (sem remontar)
  useEffect(() => {
    if (info) gameRef.current?.setProgress(info.best)
  }, [info])

  // ── C5: Pedraverde e o Golem — a cena é do aparelho, então a CHEGADA vira pedido e
  // o servidor confere (Domínio aberto, setor ao alcance, sem arma) e grava a visita ──
  const domainId = info?.id ?? null
  useEffect(() => {
    const token = getToken()
    if (!token || !domainId || !place) return
    void reachDomainPlace(token, domainId, place)
  }, [domainId, place])
  const reachSpot = useCallback(async () => {
    const token = getToken()
    if (!token || !domainId || !place || !spot) return
    const r = await reachDomainPlace(token, domainId, place, spot)
    if (r.ok && (r.data.recorded || r.data.armed)) setGolem((g) => ({ run: g.run + 1, armed: r.data.armed }))
  }, [domainId, place, spot])
  useEffect(() => {
    void reachSpot()
  }, [reachSpot])
  // "Larga o ferro": guarda a arma na mochila (POST /gear/equip vazio) e chega de novo
  const stow = useCallback(async () => {
    const token = getToken()
    if (!token || stowing) return
    setStowing(true)
    const r = await equipGear(token, "weapon", null)
    setStowing(false)
    if (!r.ok) return setNews({ text: r.error, id: Date.now() })
    setNews({ text: t("domWeaponStowed", "Arma guardada na mochila."), id: Date.now() })
    await reachSpot()
  }, [stowing, reachSpot, t])

  const openingRef = useRef(false)
  useEffect(() => {
    askFight.current = async (s: number) => {
      const token = getToken()
      const d = labels.current.info
      if (!token || !d || openingRef.current) return
      openingRef.current = true
      setOpening(true)
      const r = await startFight(token, { origin: "domain", domain: d.id, sector: s })
      openingRef.current = false
      setOpening(false)
      if (!r.ok) {
        setNews({ text: t("domFightFail", "A luta não abriu: {e}").replace("{e}", r.error), id: Date.now() })
        return
      }
      setSpawn(s)
      // D2: o nome e o corpo da criatura da lore (a regra é a do tipo que o servidor escolheu)
      const foe = d.sectors[s - 1]?.foe ?? null
      setFight({ ticket: r.data.fight, sector: s, foe: foe ? foeName(t, foe.id) : mobName(r.data.fight.setup.kind), foeBody: foe?.body ?? null, foeRig: !!foe?.rig })
    }
    cross.current = () => {
      const d = labels.current.info
      if (!d?.passage) return
      // a passagem existe, mas o próximo ainda pede o nível do treinador: o servidor diz qual
      if (!d.passage.open) {
        void (async () => {
          const token = getToken()
          const r = token ? await getDomains(token) : null
          const next = r && r.ok ? r.data.domains.find((x) => x.id === d.passage!.to) : null
          if (next?.open) {
            setSpawn(0)
            setId(next.id)
          } else if (next?.lock?.code === "trainer") {
            setNews({ text: t("domCrossLocked", "{name} abre no nível {n} do treinador").replace("{name}", domainName(t, next.id)).replace("{n}", String(next.lock.level)), id: Date.now() })
          } else if (next) setNews({ text: lockText(t, next) ?? "", id: Date.now() })
        })()
        return
      }
      setSpawn(0)
      setId(d.passage.to)
    }
  }, [t, mobName])

  // o recibo da luta conferida: o setor vencido abre o portão
  const onReceipt = useCallback(
    (r: Receipt) => {
      const adv = (r as Receipt & { domain?: DomainAdvance }).domain
      if (!adv) return
      setInfo((cur) => (cur && cur.id === adv.domain ? { ...cur, best: Math.max(cur.best, adv.best), crossed: adv.crossed } : cur))
      const name = domainName(t, adv.domain)
      // D4: vencer o deus chefão sela o pacto do povo (7 dias de néctar extra no jogo dele)
      const pact = (r as Receipt & { pact?: DomainPact }).pact
      const won = adv.crossedNow ? t("domCrossedNow", "Você atravessou {name}! A passagem abriu.").replace("{name}", name) : t("domWon", "Setor {n} vencido! O portão abriu.").replace("{n}", String(adv.sector))
      const sealed = pact
        ? pact.fresh
          ? t("domPactSealed", "Pacto selado: o seu povo ganha néctar extra por 7 dias.")
          : t("domPactKept", "O pacto do seu povo com este deus já está de pé.")
        : ""
      setNews({ text: sealed ? `${won} ${sealed}` : won, id: Date.now() })
    },
    [t],
  )
  const closeFight = useCallback(() => {
    setFight(null)
    // recarrega pelo servidor (setores, passagem e travas do próximo)
    void load(id)
  }, [id, load])

  const stageSpec: DomainStageSpec = useMemo(() => ({ kit: sceneKitOf(id), spot: fight ? (info?.sectors[fight.sector - 1]?.stage ?? "entrada") : "entrada" }), [id, fight, info])

  const name = domainName(t, id)
  const guard = near?.kind === "guard" && info ? info.sectors[near.sector - 1] : null
  const action = guard
    ? { label: t("domFight", "Lutar · {mob}").replace("{mob}", guard.foe ? foeName(t, guard.foe.id) : mobName(guard.kind)), icon: <Swords className="h-5 w-5" /> }
    : near?.kind === "exit"
      ? { label: t("domExit", "Voltar à praça"), icon: <DoorOpen className="h-5 w-5" /> }
      : near?.kind === "passage" && info?.passage
        ? { label: t("domCross", "Atravessar para {name}").replace("{name}", domainName(t, info.passage.to)), icon: <Footprints className="h-5 w-5" /> }
        : null
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  const here =
    place === "pedraverde"
      ? t("domPlace_pedraverde", "Pedraverde")
      : sector === 0
        ? t("domEntrance", "Entrada")
        : sector === 11
          ? t("domPassage", "Passagem")
          : t("domSectorTag", "Setor {n}").replace("{n}", String(sector))

  if (fight) {
    return (
      <LaminasView
        body={body}
        look={look}
        stage="dominio"
        domain={stageSpec}
        opened={{ ticket: fight.ticket, foe: fight.foe, foeBody: fight.foeBody, foeRig: fight.foeRig }}
        onReceipt={onReceipt}
        onExit={closeFight}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[70] touch-none select-none overflow-hidden" style={{ background: "#0a171f" }}>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" style={{ touchAction: "none" }} aria-label={name} />

      {status === "ready" && info && (
        <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-center" style={{ top: SAFE.top }}>
          <span className="bg-black/70 px-3 py-1 text-[15px] font-bold uppercase tracking-wide text-white">
            {name} · {here}
          </span>
          {guard && (
            <span className="bg-black/60 px-3 py-1 text-[12px] font-semibold text-white">
              {guard.cleared
                ? t("domFarm", "Setor vencido: lute de novo para treinar")
                : t("domGuardInfo", "Setor {n} · Nv. {lv} · Poder recomendado {p}").replace("{n}", String(guard.n)).replace("{lv}", String(guard.level)).replace("{p}", String(guard.power))}
            </span>
          )}
        </div>
      )}

      {news && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 64px)" }}>
          <EvoToast icon={<Swords className="h-4 w-4" />}>{news.text}</EvoToast>
        </div>
      )}

      {status === "ready" && (
        <div className="absolute flex flex-col items-end gap-2" style={{ bottom: bottom(isTouch ? 24 : 16), right: SAFE.right }}>
          {action && (
            <EvoButton variant="primary" icon={action.icon} loading={opening} onClick={() => gameRef.current?.interact()} kbd={isTouch ? undefined : "E"}>
              {action.label}
            </EvoButton>
          )}
          <EvoButton variant="gold" icon={<DoorOpen className="h-5 w-5" />} onClick={onExit}>
            {t("domExit", "Voltar à praça")}
          </EvoButton>
        </div>
      )}

      {status === "ready" && isTouch && <Joystick gameRef={gameRef} />}

      {/* C5: as vozes do Golem (ou "Larga o ferro") e o botão de guardar a arma */}
      {status === "ready" && <GolemVoices run={golem.run} armed={golem.armed} />}
      {status === "ready" && spot === "golem" && golem.armed && (
        <div className="absolute flex flex-col items-start gap-2" style={{ bottom: bottom(isTouch ? 180 : 16), left: SAFE.left }}>
          <EvoButton variant="primary" icon={<Shield className="h-5 w-5" />} loading={stowing} onClick={() => void stow()}>
            {t("domStowWeapon", "Guardar a arma")}
          </EvoButton>
        </div>
      )}

      {(status !== "ready" || !info) && (
        <SceneCurtain
          status={failed || status === "error" ? "error" : "loading"}
          text={t("domLoading", "Entrando: {name}…").replace("{name}", name)}
          errorTitle={t("domErrorTitle", "O Domínio não abriu")}
          errorText={failed ?? t("errorDesc", "O navegador não conseguiu iniciar o 3D. Tente de novo; se continuar, volte ao perfil.")}
          onRetry={() => {
            if (failed) void load(id)
            setAttempt((n) => n + 1)
          }}
          onLeave={onExit}
          leaveLabel={t("domExit", "Voltar à praça")}
        />
      )}
    </div>
  )
}
