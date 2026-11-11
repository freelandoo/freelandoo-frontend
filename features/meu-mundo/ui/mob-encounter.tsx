"use client"

// features/meu-mundo/ui/mob-encounter.tsx — luta com os monstros da rua (mm3d-57b).
//
// Uma peça só para o centro e o bairro (a mesma sala decide os dois): avisa
// quando um monstro aparece e quem venceu, abre a luta das Lâminas quando a
// sala diz que o monstro ALCANÇOU você ("mcatch") ou quando você aperta
// "Lutar" perto dele, e devolve o resultado. Ocupado (minijogo, interior,
// tela por cima) = a sala ouve "ocupado" e deixa você em paz um tempo.

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Swords } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { GameHandle } from "../engine/game"
import type { LaminasEncounter } from "../laminas/ui/laminas-view"
import type { BodyId, Interactable } from "../types"
import { EvoToast } from "./hud/hud-kit"
import { cowardRefuses, currentSoul } from "../soul"
import { emitBanter } from "../banter"
import { getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"
import { startFight, type FightTicket, type GodWire } from "../data"
import { godIdOf, type GodId } from "../laminas/sim/fight"
import { GOD_NAME } from "../engine/god-view"

const LaminasView = dynamic(() => import("../laminas/ui/laminas-view").then((m) => m.LaminasView), { ssr: false })

type MobKind = LaminasEncounter["kind"]
/** N4: "há luta na tela" para quem só pergunta isso (a luta do deus não tem monstro da sala). */
const GOD_COVER: LaminasEncounter = { mobId: -1, kind: "cavaleiro" }
const KINDS = new Set<string>(["cavaleiro", "wolf", "ciborgue", "garras", "brute", "stone"])

export function useMobEncounter({ gameRef, busy, body, look, place = "bairro" }: { /** A sala (ui/offstage.ts): a rua pode nem estar montada. */ gameRef: RefObject<Pick<GameHandle, "reportMob" | "engageMob" | "reportGod">>; busy: boolean; body: BodyId; look?: string; /** mm3d-60l: o cenário da luta (elementos do bairro ou do centro). */ place?: "bairro" | "centro" }) {
  const t = useTranslations("MeuMundo")
  const [encounter, setEncounter] = useState<LaminasEncounter | null>(null)
  const [news, setNews] = useState<{ text: string; id: number } | null>(null)
  const known = useRef(new Set<number>())
  const reported = useRef(false)
  // Lore v2 N4: a luta contra o deus solto (o ticket já vem do servidor: origem "god")
  const [godFight, setGodFight] = useState<{ ticket: FightTicket; god: GodId } | null>(null)
  const knownGods = useRef(new Set<string>())
  const godOpening = useRef(false)
  const live = useRef({ busy, encounter, god: false })

  const mobName = useCallback(
    (k: string) =>
      ({
        stone: t("laminasMobStoneGolem", "Golem de Pedra"),
        cavaleiro: t("laminasMobKnight", "Cavaleiro Dourado"),
        wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
        ciborgue: t("laminasMobGolem", "Ciborgue"),
        garras: t("laminasMobHarpy", "Dama das Garras"),
        brute: t("laminasMobBrute", "Brutamontes"),
      })[k] ?? k,
    [t],
  )
  const alertText = t("mobAlertNight", "Monstros à solta! Se um deles te encarar, ele vem atrás.")
  const winTpl = t("mobWin", "{name} derrotou: {mob}!")
  const caughtTpl = t("mobCaught", "{mob} te alcançou!")
  // mm3d-72: o psicopata puxa briga sozinho; o covarde às vezes recusa
  const psychoText = t("mobPsycho", "Ah, vamos dar uma porrada naquele trouxa!")
  const refuseText = t("mobCowardRefuse", "Não vou lutar! Tô com medo! Vamos embora daqui!")
  // N4: o deus solto (nomes próprios não traduzem; o resto sim)
  const godHere = { aurion: t("godHereAurion", "Aurion está solto e caça Vampiros! Ele corre mais que você."), morkhan: t("godHereMorkhan", "Morkhan está solto e caça Raposas! Ele corre mais que você.") }
  const godCaughtTpl = t("godCaught", "{god} te alcançou! Ele tem o dobro da sua força.")
  const godDownTpl = t("godDown", "{name} derrotou {god}! O deus voltou para a estátua.")
  const godFailTpl = t("godFightFail", "A luta com o deus não abriu: {e}")
  const labels = useRef({ mobName, alertText, winTpl, caughtTpl, psychoText, refuseText, godHere, godCaughtTpl, godDownTpl, godFailTpl })
  useEffect(() => {
    live.current = { busy, encounter, god: !!godFight }
    labels.current = { mobName, alertText, winTpl, caughtTpl, psychoText, refuseText, godHere, godCaughtTpl, godDownTpl, godFailTpl }
  })

  // N4: a queda do deus chega a todo mundo (socket mm:god)
  useEffect(
    () =>
      onRealtime("mm:god", (p: unknown) => {
        const w = p as GodWire | null
        if (!w || w.e !== "down") return
        const god = godIdOf(w.god)
        if (!god) return
        knownGods.current.delete(god)
        setNews({ text: labels.current.godDownTpl.replace("{name}", w.name || "Alguém").replace("{god}", GOD_NAME[god]), id: Date.now() })
      }),
    [],
  )

  /** N4: o deus alcançou — o servidor confere (solto, caça o seu povo, a sala viu) e abre a luta. */
  const openGod = useCallback(
    async (god: GodId) => {
      const token = getToken()
      if (!token || godOpening.current) return
      godOpening.current = true
      const ask = async (tries: number): Promise<void> => {
        const r = await startFight(token, { origin: "god", god, where: "street" })
        if (r.ok) {
          live.current = { ...live.current, god: true }
          setGodFight({ ticket: r.data.fight, god })
          return
        }
        if (r.code === "where" && tries > 0) {
          await new Promise((ok) => setTimeout(ok, 400))
          return ask(tries - 1)
        }
        setNews({ text: labels.current.godFailTpl.replace("{e}", r.error), id: Date.now() })
        gameRef.current?.reportGod(god, true)
      }
      await ask(2)
      godOpening.current = false
    },
    [gameRef],
  )

  useEffect(() => {
    if (!news) return
    const id = setTimeout(() => setNews(null), 4500)
    return () => clearTimeout(id)
  }, [news])

  const start = useCallback((mobId: number, kind: MobKind) => {
    reported.current = false
    live.current = { ...live.current, encounter: { mobId, kind } }
    setEncounter({ mobId, kind })
  }, [])

  /** Mensagens da sala: "mobs", "mobwin", "mcatch" (as outras passam reto). */
  const onServerMessage = useCallback(
    (type: string, p: unknown) => {
      const L = labels.current
      if (type === "gods") {
        // N4: um deus apareceu nesta sala
        const rows = ((p as { l?: unknown[] } | null)?.l ?? []) as unknown[][]
        const ids = new Set(rows.map((r) => godIdOf(r[0])).filter((g): g is GodId => !!g))
        const fresh = [...ids].find((g) => !knownGods.current.has(g))
        knownGods.current = ids
        if (fresh) setNews({ text: L.godHere[fresh], id: Date.now() })
      } else if (type === "gcatch") {
        const god = godIdOf((p as { god?: unknown } | null)?.god)
        if (!god) return
        if (live.current.busy || live.current.encounter || live.current.god) return gameRef.current?.reportGod(god, true)
        setNews({ text: L.godCaughtTpl.replace("{god}", GOD_NAME[god]), id: Date.now() })
        void openGod(god)
      } else if (type === "mobs") {
        const rows = ((p as { l?: unknown[] } | null)?.l ?? []) as unknown[][]
        const ids = new Set(rows.map((r) => Number(r[0])))
        const fresh = [...ids].some((id) => !known.current.has(id))
        known.current = ids
        if (fresh) setNews({ text: L.alertText, id: Date.now() })
      } else if (type === "mobwin") {
        const w = p as { kind?: string; name?: string }
        setNews({ text: L.winTpl.replace("{name}", w.name || "Alguém").replace("{mob}", L.mobName(w.kind || "")), id: Date.now() })
      } else if (type === "mcatch") {
        const c = p as { id?: number; kind?: string; psycho?: boolean }
        if (!Number.isFinite(c?.id) || !KINDS.has(c?.kind ?? "")) return
        if (live.current.busy || live.current.encounter || live.current.god) return gameRef.current?.reportMob(c.id!, false, true)
        if (!c.psycho && cowardRefuses(currentSoul())) {
          // o covarde foge: a sala deixa ele em paz um tempo (como "ocupado")
          setNews({ text: L.refuseText, id: Date.now() })
          return gameRef.current?.reportMob(c.id!, false, true)
        }
        setNews({ text: c.psycho ? L.psychoText : L.caughtTpl.replace("{mob}", L.mobName(c.kind!)), id: Date.now() })
        // a frase do psicopata aparece antes da luta abrir (o aviso some com a luta na tela)
        if (c.psycho) setTimeout(() => !live.current.encounter && start(c.id!, c.kind as MobKind), 1800)
        else start(c.id!, c.kind as MobKind)
      }
    },
    [gameRef, start, openGod],
  )

  /** "Lutar" apertado perto do monstro: ele para e espera o fim da luta. */
  const fight = useCallback(
    (it: Interactable) => {
      if (it.kind !== "monster" || live.current.encounter) return
      if (cowardRefuses(currentSoul())) {
        setNews({ text: labels.current.refuseText, id: Date.now() })
        return
      }
      gameRef.current?.engageMob(it.mobId)
      start(it.mobId, it.mobKind)
    },
    [gameRef, start],
  )

  const label = useCallback((it: Interactable) => (it.kind === "monster" ? `${t("mobFight", "Lutar")} · ${mobName(it.mobKind)}` : ""), [t, mobName])

  const view = encounter ? (
    <LaminasView
      body={body}
      look={look}
      stage={place}
      encounter={encounter}
      onExit={() => {
        // Saiu no meio: conta como derrota (o monstro volta a andar).
        if (!reported.current) gameRef.current?.reportMob(encounter.mobId, false)
        reported.current = true
        setEncounter(null)
      }}
      onEncounterEnd={(win) => {
        // o personagem comenta a luta do jeito dele (banter.ts)
        emitBanter({ topic: win ? "fight_win" : "fight_lose" })
        reported.current = true
        gameRef.current?.reportMob(encounter.mobId, win)
      }}
    />
  ) : godFight ? (
    <LaminasView
      body={body}
      look={look}
      stage={place}
      opened={{ ticket: godFight.ticket, foe: GOD_NAME[godFight.god], foeBody: godFight.god, foeRig: true }}
      onExit={() => {
        // a vitória já foi do servidor (o deus sumiu para todos); aqui a sala só solta quem saiu
        gameRef.current?.reportGod(godFight.god)
        live.current = { ...live.current, god: false }
        setGodFight(null)
      }}
      onReceipt={(r) => emitBanter({ topic: r.result?.win ? "fight_win" : "fight_lose" })}
    />
  ) : null

  const toast =
    news && !encounter && !godFight ? (
      <div key={news.id} className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 48px)" }}>
        <EvoToast icon={<Swords className="h-4 w-4" />}>{news.text}</EvoToast>
      </div>
    ) : null

  return { /* N4: a luta do deus também cobre a rua (o resto só olha se há luta) */ encounter: encounter ?? (godFight ? GOD_COVER : null), onServerMessage, fight, label, view, toast }
}
