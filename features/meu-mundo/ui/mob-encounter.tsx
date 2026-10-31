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

const LaminasView = dynamic(() => import("../laminas/ui/laminas-view").then((m) => m.LaminasView), { ssr: false })

type MobKind = LaminasEncounter["kind"]
const KINDS = new Set<string>(["wolf", "golem", "harpy", "brute"])

export function useMobEncounter({ gameRef, busy, body, look }: { gameRef: RefObject<GameHandle | null>; busy: boolean; body: BodyId; look?: string }) {
  const t = useTranslations("MeuMundo")
  const [encounter, setEncounter] = useState<LaminasEncounter | null>(null)
  const [news, setNews] = useState<{ text: string; id: number } | null>(null)
  const known = useRef(new Set<number>())
  const reported = useRef(false)
  const live = useRef({ busy, encounter })

  const mobName = useCallback(
    (k: string) =>
      ({
        wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
        golem: t("laminasMobGolem", "Ciborgue"),
        harpy: t("laminasMobHarpy", "Dama das Garras"),
        brute: t("laminasMobBrute", "Brutamontes"),
      })[k] ?? k,
    [t],
  )
  const alertText = t("mobAlertNight", "Monstros à solta! Se um deles te encarar, ele vem atrás.")
  const winTpl = t("mobWin", "{name} derrotou: {mob}!")
  const caughtTpl = t("mobCaught", "{mob} te alcançou!")
  const labels = useRef({ mobName, alertText, winTpl, caughtTpl })
  useEffect(() => {
    live.current = { busy, encounter }
    labels.current = { mobName, alertText, winTpl, caughtTpl }
  }, [busy, encounter, mobName, alertText, winTpl, caughtTpl])

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
      if (type === "mobs") {
        const rows = ((p as { l?: unknown[] } | null)?.l ?? []) as unknown[][]
        const ids = new Set(rows.map((r) => Number(r[0])))
        const fresh = [...ids].some((id) => !known.current.has(id))
        known.current = ids
        if (fresh) setNews({ text: L.alertText, id: Date.now() })
      } else if (type === "mobwin") {
        const w = p as { kind?: string; name?: string }
        setNews({ text: L.winTpl.replace("{name}", w.name || "Alguém").replace("{mob}", L.mobName(w.kind || "")), id: Date.now() })
      } else if (type === "mcatch") {
        const c = p as { id?: number; kind?: string }
        if (!Number.isFinite(c?.id) || !KINDS.has(c?.kind ?? "")) return
        if (live.current.busy || live.current.encounter) return gameRef.current?.reportMob(c.id!, false, true)
        setNews({ text: L.caughtTpl.replace("{mob}", L.mobName(c.kind!)), id: Date.now() })
        start(c.id!, c.kind as MobKind)
      }
    },
    [gameRef, start],
  )

  /** "Lutar" apertado perto do monstro: ele para e espera o fim da luta. */
  const fight = useCallback(
    (it: Interactable) => {
      if (it.kind !== "monster" || live.current.encounter) return
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
      encounter={encounter}
      onExit={() => {
        // Saiu no meio: conta como derrota (o monstro volta a andar).
        if (!reported.current) gameRef.current?.reportMob(encounter.mobId, false)
        reported.current = true
        setEncounter(null)
      }}
      onEncounterEnd={(win) => {
        reported.current = true
        gameRef.current?.reportMob(encounter.mobId, win)
      }}
    />
  ) : null

  const toast =
    news && !encounter ? (
      <div key={news.id} className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 48px)" }}>
        <EvoToast icon={<Swords className="h-4 w-4" />}>{news.text}</EvoToast>
      </div>
    ) : null

  return { encounter, onServerMessage, fight, label, view, toast }
}
