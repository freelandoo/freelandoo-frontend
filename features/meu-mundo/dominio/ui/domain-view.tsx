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
//
// Domínios v2 (DV2/DV3): quando a cena de mundo aberto do Domínio existe no aparelho
// (`engine/cena-codigo`, nome `<domínio>-<n>` que o servidor manda em `scenes`), monta
// ela no lugar do corredor (engine/open-domain-game.ts): 3 cenas por Domínio, passagem
// entre elas (o servidor confere o chefe), monstros soltos que abrem a luta ao encostar
// e o chefe parado no ponto dele. Domínio sem cena feita continua no corredor.

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DoorOpen, Footprints, Shield, Swords } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { onRealtime } from "@/lib/realtime"
import { GOD_HUNT, GOD_NAME } from "../../engine/god-view"
import { godIdOf, type GodId } from "../../laminas/sim/fight"
import { enterDomain, equipGear, getDomains, getGods, type GodWire, reachDomainPlace, startFight, type DomainAdvance, type DomainId, type DomainPact, type DomainInfo, type DomainScene, type FightTicket, type Receipt } from "../../data"
import { createDomainGame, passageKitOf, sceneKitOf, type DomainGameHandle, type DomainNear } from "../engine/domain-game"
import { createOpenDomainGame, hasOpenScene, sceneSky, type OpenDomainHandle, type OpenNear } from "../engine/open-domain-game"
import { Joystick, SAFE, SceneCurtain } from "../../ui/meu-mundo-view"
import { EvoButton, EvoToast } from "../../ui/hud/hud-kit"
import { useMobName } from "../../laminas/ui/laminas-view"
import type { DomainStageSpec } from "../../laminas/engine/domain-stage"
import type { BodyId } from "../../types"
import { domainName, foeName, lockText } from "./domain-portal"
import { GolemVoices } from "../../ui/quest/god-voice"
import { CityMapHud } from "../../ui/map/city-map-ui"
import { GOD_NAMES, type GodBody } from "../../gods"
import { StoryScene } from "../../ui/story/story-scene"
import { GOLEM_STORY, markGolemScene, seenGolemScene } from "../../ui/story/golem-scene"
import { NpcTalk, speakerArt, type NpcSay } from "./npc-talk"

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
  const [near, setNear] = useState<DomainNear | OpenNear>(null)
  // DV2: a cena do mundo aberto (1–3), de onde se chega nela e o que o servidor mandou dela
  const [sceneN, setSceneN] = useState(1)
  const [arrive, setArrive] = useState<"entrada" | "saida">("entrada")
  const [sceneInfo, setSceneInfo] = useState<DomainScene | null>(null)
  // DV3: monstros soltos vencidos (id → hora) — somem até reaparecer; quem encostou agora
  const defeatedRef = useRef<Record<string, number>>({})
  const engagedRef = useRef<string | null>(null)
  const [sector, setSector] = useState(0)
  const [place, setPlace] = useState<string | null>(null)
  // C5: perto do Golem (o servidor diz se valeu ou se a pessoa está armada)
  const [spot, setSpot] = useState<string | null>(null)
  const [golem, setGolem] = useState<{ run: number; armed: boolean }>({ run: 0, armed: false })
  const [stowing, setStowing] = useState(false)
  // apresentação 16: a primeira chegada ao Golem vira cena de história (depois, as vozes)
  const [story, setStory] = useState(false)
  const [spawn, setSpawn] = useState(0)
  const [fight, setFight] = useState<{ ticket: FightTicket; sector: number; foe: string; foeBody: BodyId | null; foeRig: boolean } | null>(null)
  const [opening, setOpening] = useState(false)
  const [news, setNews] = useState<{ text: string; id: number } | null>(null)
  // o chefe/monstro fala no card das notificações (retrato + texto), uma fala por vez
  const [npc, setNpc] = useState<NpcSay | null>(null)
  const endTalk = useCallback(() => setNpc(null), [])
  // Lore v2 N4: o deus solto que caça o povo desta conta (caça também aqui dentro)
  const [god, setGod] = useState<GodId | null>(null)
  const godDelay = useRef<number>(GOD_HUNT.DOMAIN_DELAY_MS)
  const godFightRef = useRef<GodId | null>(null)
  const sectorRef = useRef(0)
  const [isTouch, setIsTouch] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<DomainGameHandle | OpenDomainHandle | null>(null)

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches)
  }, [])
  useEffect(() => {
    if (!news) return
    const h = setTimeout(() => setNews(null), 4200)
    return () => clearTimeout(h)
  }, [news])

  // o servidor confere as travas e manda o Domínio pronto (setores, nível, Poder)
  const load = useCallback(async (which: DomainId, n: number) => {
    const token = getToken()
    if (!token) return
    setFailed(null)
    const r = await enterDomain(token, which, n > 1 ? n : undefined)
    if (r.ok) {
      setSceneInfo(r.data.scene ?? null)
      setInfo(r.data.domain)
    } else setFailed(r.error)
  }, [])
  useEffect(() => {
    setInfo(null)
    void load(id, sceneN)
  }, [id, sceneN, load])

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
  const askGod = useRef<(g: GodId) => void>(() => {})
  const cross = useRef<() => void>(() => {})
  const go = useRef<(n: number, at: "entrada" | "saida") => void>(() => {})
  /** Quem guarda o setor `n` diz `lines` (nome da lore ou do tipo de monstro + retrato). */
  const say = useRef<(n: number, lines: string[]) => void>(() => {})
  useEffect(() => {
    say.current = (n, lines) => {
      const d = labels.current.info
      const sec = d?.sectors[n - 1]
      if (!sec || !lines.length) return
      setNpc({ id: Date.now(), name: sec.foe ? foeName(t, sec.foe.id) : mobName(sec.kind), art: speakerArt(d, n), lines })
    }
  }, [t, mobName])
  /** O que o selado diz (portal fechado, chefe ainda sem os setores antes, bando selado). */
  const sealedLines = useRef<(n: Extract<OpenNear, { kind: "sealed" }>) => string[]>(() => [])
  useEffect(() => {
    sealedLines.current = (n) =>
      n.portal
        ? [t("talkBossOpen2", "O portal só se abre se você me vencer.")]
        : n.boss
          ? [t("talkBossSealed1", "Ainda não, viajante. Você não está pronto."), t("talkBossSealed3", "Depois volte e lute comigo para abrir o portal.")]
          : [t("talkMobSealed", "Ainda não é a sua vez. Vença o setor {n} primeiro.").replace("{n}", String(Math.max(1, n.sector - 1)))]
  }, [t])
  const sceneRef = useRef(sceneInfo)
  useEffect(() => {
    sceneRef.current = sceneInfo
  }, [sceneInfo])
  useEffect(() => {
    const canvas = canvasRef.current
    const d = infoRef.current
    if (!canvas || !ready || !d) return
    let alive = true
    setStatus("loading")
    let handle: DomainGameHandle | null = null
    const sc = sceneRef.current
    try {
      if (sc && hasOpenScene(sc.name)) {
        const open = createOpenDomainGame({
          canvas,
          body,
          look,
          domain: d,
          scene: sc,
          spawn: spawn ? { sector: spawn } : { at: arrive },
          defeated: defeatedRef.current,
          mapLabels: (() => {
            const tt = labels.current.t
            const godName = GOD_NAMES[d.god as GodBody] ?? d.god
            return {
              title: domainName(tt, d.id),
              exit: tt("domExit", "Voltar à praça"),
              passage: d.passage ? tt("mapCross", "Travessia: {name}").replace("{name}", domainName(tt, d.passage.to)) : tt("domPassage", "Passagem"),
              part: (n: number) => tt("domScenePart", "Parte {n}").replace("{n}", String(n)),
              sector: (n: number) => tt("domSectorTag", "Setor {n}").replace("{n}", String(n)),
              boss: (n: number) => tt("mapBoss", "Chefe · Setor {n}").replace("{n}", String(n)),
              guard: (n: number) => tt("mapGuard", "Guardião · Setor {n}").replace("{n}", String(n)),
              god: tt("mapGodCastle", "Castelo de {god}").replace("{god}", godName),
              place: (pid: string) => tt(`domPlace_${pid}`, pid),
              hunt: (g: GodId) => tt("mapHunt", "{god} te caçando").replace("{god}", GOD_NAMES[g as GodBody] ?? g),
            }
          })(),
          // o chefe explica a passagem (balões em sequência)
          talk: (c) => {
            const tt = labels.current.t
            const godName = GOD_NAMES[d.god as GodBody] ?? d.god
            if (!c.open) {
              const need =
                c.needFrom >= c.needTo
                  ? tt("talkBossNeedOne", "Vença primeiro o setor {a}.").replace("{a}", String(c.needTo))
                  : tt("talkBossNeedMany", "Vença primeiro os setores {a} a {b}.").replace("{a}", String(c.needFrom)).replace("{b}", String(c.needTo))
              return [tt("talkBossSealed1", "Ainda não, viajante. Você não está pronto."), need, tt("talkBossSealed3", "Depois volte e lute comigo para abrir o portal.")]
            }
            if (c.god) return [tt("talkGod1", "Então você chegou até mim."), tt("talkGod2", "Vença-me e o caminho para o próximo Domínio se abre.")]
            if (c.castle)
              return [tt("talkGuard1", "Ninguém entra no castelo de {god} sem passar por mim.").replace("{god}", godName), tt("talkGuard2", "Vença-me e a porta se abre.")]
            return [
              c.nextPart
                ? tt("talkBossOpen1", "Alto! Esta passagem leva à parte {n} do Domínio.").replace("{n}", String(c.nextPart))
                : tt("talkBossOpen1b", "Alto! Ninguém passa daqui."),
              tt("talkBossOpen2", "O portal só se abre se você me vencer."),
              tt("talkBossOpen3", "Chegue perto e lute, se tiver coragem."),
            ]
          },
          onReady: () => alive && setStatus("ready"),
          onNearbyChange: (n) => alive && setNear(n),
          onSector: (s) => alive && setSector(s),
          onPlace: (p) => alive && setPlace(p),
          onSpot: (s) => alive && setSpot(s),
          onGodCatch: (g) => alive && askGod.current(g),
          onEngage: (s, mid) => {
            if (!alive) return
            engagedRef.current = mid
            askFight.current(s)
          },
          onInteract: (n) => {
            if (!alive) return
            if (n.kind === "exit") onExit()
            else if (n.kind === "guard") askFight.current(n.sector)
            else if (n.kind === "passage") cross.current()
            else if (n.kind === "back") go.current(sc.n - 1, "saida")
            else if (n.kind === "next") go.current(sc.n + 1, "entrada")
            else if (n.kind === "sealed") say.current(n.sector, sealedLines.current(n))
          },
          // o chefe explica a passagem ao chegar perto: no card com o retrato dele, não em balão 3D
          onTalk: (s, lines) => alive && say.current(s, lines),
          onError: () => alive && setStatus("error"),
        })
        gameRef.current = open
        return () => {
          alive = false
          open.dispose()
          gameRef.current = null
          setNear(null)
          setPlace(null)
          setSpot(null)
        }
      }
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
        onGodCatch: (g) => alive && askGod.current(g),
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
  }, [ready, body, look, spawn, arrive, attempt, onExit])

  // ── N4: quem está solto e caça o meu povo (a queda chega pelo socket mm:god) ──
  const loadGods = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getGods(token)
    if (r.ok) setGod(r.data.loose.find((h) => h.huntsMe)?.god ?? null)
  }, [])
  useEffect(() => {
    void loadGods()
    return onRealtime("mm:god", (p: unknown) => {
      const w = p as GodWire | null
      if (w?.e === "down" && godIdOf(w.god)) setGod((cur) => (cur === w.god ? null : cur))
      else if (w?.e === "loose") void loadGods()
    })
  }, [loadGods])
  useEffect(() => {
    sectorRef.current = sector
  }, [sector])
  // a cena (re)montada recebe o deus: aparece atrás, depois de um tempo, e corre atrás
  useEffect(() => {
    if (status === "ready") gameRef.current?.setGod(god, godDelay.current)
  }, [god, status])

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
    if (r.ok && r.data.recorded && !r.data.armed && !seenGolemScene() && gameRef.current) {
      gameRef.current.setBlocked(true)
      setStory(true)
    } else if (r.ok && (r.data.recorded || r.data.armed)) setGolem((g) => ({ run: g.run + 1, armed: r.data.armed }))
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
        engagedRef.current = null
        gameRef.current?.setBlocked(false)
        setNews({ text: t("domFightFail", "A luta não abriu: {e}").replace("{e}", r.error), id: Date.now() })
        return
      }
      setSpawn(s)
      // D2: o nome e o corpo da criatura da lore (a regra é a do tipo que o servidor escolheu)
      const foe = d.sectors[s - 1]?.foe ?? null
      setFight({ ticket: r.data.fight, sector: s, foe: foe ? foeName(t, foe.id) : mobName(r.data.fight.setup.kind), foeBody: foe?.body ?? null, foeRig: !!foe?.rig })
    }
    // N4: o deus alcançou — o servidor confere (solto, caça o meu povo, Domínio aberto) e abre a luta
    askGod.current = async (g: GodId) => {
      const token = getToken()
      const d = labels.current.info
      if (!token || !d || openingRef.current) return
      openingRef.current = true
      setNews({ text: t("godCaught", "{god} te alcançou! Ele tem o dobro da sua força.").replace("{god}", GOD_NAME[g]), id: Date.now() })
      const r = await startFight(token, { origin: "god", god: g, where: "domain", domain: d.id })
      openingRef.current = false
      if (!r.ok) {
        setNews({ text: t("godFightFail", "A luta com o deus não abriu: {e}").replace("{e}", r.error), id: Date.now() })
        godDelay.current = GOD_HUNT.CALM_MS
        gameRef.current?.setGod(g, godDelay.current)
        return
      }
      const s = sectorRef.current
      godFightRef.current = g
      setSpawn(s >= 1 && s <= 10 ? s : 0)
      setFight({ ticket: r.data.fight, sector: s, foe: GOD_NAME[g], foeBody: g, foeRig: true })
    }
    // DV2: passagem entre as cenas do mesmo Domínio (o servidor confere o chefe no /domains/enter)
    go.current = (n: number, at: "entrada" | "saida") => {
      if (n < 1 || n > 3) return
      setSpawn(0)
      setArrive(at)
      setSceneN(n)
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
            setArrive("entrada")
            setSceneN(1)
            setId(next.id)
          } else if (next?.lock?.code === "trainer") {
            setNews({ text: t("domCrossLocked", "{name} abre no nível {n} do treinador").replace("{name}", domainName(t, next.id)).replace("{n}", String(next.lock.level)), id: Date.now() })
          } else if (next) setNews({ text: lockText(t, next) ?? "", id: Date.now() })
        })()
        return
      }
      setSpawn(0)
      setArrive("entrada")
      setSceneN(1)
      setId(d.passage.to)
    }
  }, [t, mobName])

  // o recibo da luta conferida: o setor vencido abre o portão
  const onReceipt = useCallback(
    (r: Receipt) => {
      // N4: a luta contra o deus solto (vitória = ele cai para todos; derrota = só energia)
      const g = godFightRef.current
      if (g) {
        godFightRef.current = null
        if (r.result?.win) {
          setGod(null)
          setNews({ text: t("godYouWon", "Você derrotou {god}! Ele voltou para a estátua.").replace("{god}", GOD_NAME[g]), id: Date.now() })
        } else {
          godDelay.current = GOD_HUNT.CALM_MS
          setNews({ text: t("godYouLost", "{god} venceu. Você só perdeu energia; ele volta a te caçar daqui a pouco.").replace("{god}", GOD_NAME[g]), id: Date.now() })
        }
        return
      }
      // DV3: o monstro solto vencido some até reaparecer
      const mid = engagedRef.current
      engagedRef.current = null
      if (mid && r.result?.win) defeatedRef.current[mid] = Date.now()
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
    // N4: saiu da luta do deus sem recibo (desistiu): ele volta a caçar depois da paz
    if (godFightRef.current) {
      godFightRef.current = null
      godDelay.current = GOD_HUNT.CALM_MS
    }
    engagedRef.current = null
    setFight(null)
    // recarrega pelo servidor (setores, passagem e travas do próximo)
    void load(id, sceneN)
  }, [id, sceneN, load])

  // o palco usa o céu da cena de onde a luta saiu (engine/sky: área do Domínio, dia ou noite da cena)
  const skyScene = sceneInfo?.name ?? `${id}-${sceneN}`
  const stageSpec: DomainStageSpec = useMemo(
    () => ({ kit: sceneKitOf(id), spot: fight ? (info?.sectors[fight.sector - 1]?.stage ?? "entrada") : "entrada", sky: sceneSky(skyScene), cena: skyScene }),
    [id, fight, info, skyScene],
  )

  const name = domainName(t, id)
  const guard = near?.kind === "guard" && info ? info.sectors[near.sector - 1] : null
  const action = guard
    ? { label: t("domFight", "Lutar · {mob}").replace("{mob}", guard.foe ? foeName(t, guard.foe.id) : mobName(guard.kind)), icon: <Swords className="h-5 w-5" /> }
    : near?.kind === "exit"
      ? { label: t("domExit", "Voltar à praça"), icon: <DoorOpen className="h-5 w-5" /> }
      : near?.kind === "back"
        ? { label: t("domBackScene", "Voltar à parte anterior"), icon: <Footprints className="h-5 w-5" /> }
        : near?.kind === "next"
          ? { label: t("domNextScene", "Seguir para a parte {n}").replace("{n}", String(sceneN + 1)), icon: <Footprints className="h-5 w-5" /> }
      // selado não tem botão: quem guarda fala no card (ver o efeito do `near` selado)
      : near?.kind === "passage" && info?.passage
        ? { label: t("domCross", "Atravessar para {name}").replace("{name}", domainName(t, info.passage.to)), icon: <Footprints className="h-5 w-5" /> }
        : null
  // chegou num selado (portal fechado ou bando selado): quem guarda fala uma vez por aproximação.
  // O chefe selado já fala sozinho ao chegar perto (onTalk), então fica de fora.
  const sealedKey = near?.kind === "sealed" && ("portal" in near && near.portal ? true : !near.boss) ? `${near.sector}:${"portal" in near && near.portal ? "p" : "m"}` : null
  useEffect(() => {
    if (!sealedKey || near?.kind !== "sealed") return
    say.current(near.sector, sealedLines.current(near))
    // só a chave muda a fala (o objeto `near` é novo a cada aviso do motor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealedKey])
  const bottom = (px: number) => `calc(max(16px, env(safe-area-inset-bottom)) + ${px}px)`
  const openScene = !!sceneInfo && hasOpenScene(sceneInfo.name)
  const here =
    place === "pedraverde"
      ? t("domPlace_pedraverde", "Pedraverde")
      : openScene && sector === 0
        ? t("domScenePart", "Parte {n}").replace("{n}", String(sceneN))
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

      {status === "ready" && !story && <NpcTalk say={npc} closeLabel={t("close", "Fechar")} onDone={endTalk} />}

      {status === "ready" && !story && (
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

      {/* mapa da cena (radar + pergaminho): a tela do Domínio cobre o jogo, então mostra o próprio */}
      <CityMapHud ignoreCover hidden={status !== "ready" || story || !openScene} />

      {status === "ready" && isTouch && !story && <Joystick gameRef={gameRef} />}
      {status === "ready" && story && (
        <StoryScene
          beats={GOLEM_STORY}
          onShot={(shot) => gameRef.current?.story(shot)}
          onDone={() => {
            markGolemScene()
            setStory(false)
            gameRef.current?.setBlocked(false)
          }}
        />
      )}

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
            // DV2: cena recusada (o chefe anterior ainda de pé) volta para a primeira
            if (failed) {
              if (sceneN > 1) setSceneN(1)
              else void load(id, 1)
            }
            setAttempt((n) => n + 1)
          }}
          onLeave={onExit}
          leaveLabel={t("domExit", "Voltar à praça")}
        />
      )}
    </div>
  )
}
