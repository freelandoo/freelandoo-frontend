"use client"

// features/meu-mundo/ui/coliseu-duel.tsx — o COLISEU (2026-11-24): luta direta entre duas pessoas.
//
// Pedido do Alex: o prédio do Boxe virou o Coliseu. Chegando perto da porta, quem também
// estiver perto ganha um botão "Lutar" em cima da cabeça; o toque leva OS DOIS para a mesma
// luta no palco da Arena das Lâminas, sem aceite (como o monstro da rua que te alcança).
// A sala do centro confere a entrada e guarda a vida (src/realtime/meuMundoDuel.js); a luta
// corre com a rua guardada (offstage.ts) e o boneco do outro segue o que a sala repassa
// (laminas/engine/duel-link.ts). Sem prêmio por enquanto.

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { Swords } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { GameHandle } from "../engine/game"
import { BODY_IDS, type BodyId } from "../types"
import { DuelChannel } from "../laminas/engine/duel-link"
import { EvoToast } from "./hud/hud-kit"
import { emitBanter } from "../banter"

const LaminasView = dynamic(() => import("../laminas/ui/laminas-view").then((m) => m.LaminasView), { ssr: false })

/** Iguais aos da sala (DUEL.near / DUEL.pair em meuMundoDuel.js): o botão só aparece onde a sala aceita. */
export const COLISEU = { near: 14, pair: 10 } as const

type Sender = RefObject<Pick<GameHandle, "send">>

export function useColiseuDuel({ room, body, look }: { /** A sala (ui/offstage.ts): a rua pode nem estar montada. */ room: Sender; body: BodyId; look?: string }) {
  const t = useTranslations("MeuMundo")
  const [duel, setDuel] = useState<DuelChannel | null>(null)
  const live = useRef<DuelChannel | null>(null)
  const [news, setNews] = useState<{ text: string; id: number } | null>(null)
  const refusals = {
    far: t("coliseuFar", "Cheguem mais perto do Coliseu para lutar."),
    pair: t("coliseuPair", "Chegue mais perto da pessoa para lutar."),
    busy: t("coliseuBusy", "Essa pessoa está ocupada agora."),
    driving: t("coliseuDriving", "Desça do veículo para lutar."),
    gone: t("coliseuGone", "Essa pessoa saiu daqui."),
  }
  const labels = useRef({ refusals })
  useEffect(() => {
    labels.current = { refusals }
  })

  useEffect(() => {
    if (!news) return
    const id = setTimeout(() => setNews(null), 4000)
    return () => clearTimeout(id)
  }, [news])

  /** Mensagens da sala: "dgo" abre a luta (para os dois); "dno" é a recusa; o resto vai para a luta aberta. */
  const onServerMessage = useCallback(
    (type: string, p: unknown) => {
      if (type === "dgo") {
        const m = (p ?? {}) as { id?: number; side?: number; foe?: { sid?: string; name?: string; body?: string; look?: string } }
        if (!m.id || !m.foe?.sid || live.current) return
        const foeBody = (BODY_IDS as string[]).includes(m.foe.body ?? "") ? (m.foe.body as BodyId) : null
        const ch = new DuelChannel(m.id, Number(m.side) || 0, { sid: m.foe.sid, name: m.foe.name || "", body: foeBody, look: m.foe.look || "" }, (ty, msg) => room.current?.send(ty, msg))
        live.current = ch
        setDuel(ch)
        return
      }
      if (type === "dno") {
        const e = String((p as { e?: string } | null)?.e || "")
        const L = labels.current.refusals
        const text = (L as Record<string, string>)[e] ?? L.busy
        setNews({ text, id: Date.now() })
        return
      }
      live.current?.onMessage(type, p)
    },
    [room],
  )

  /** "Lutar" tocado em cima de alguém: a sala confere e abre a luta para os dois. */
  const challenge = useCallback(
    (sid: string) => {
      if (live.current) return
      room.current?.send("duel", { to: sid })
    },
    [room],
  )

  const close = useCallback(() => {
    const ch = live.current
    if (ch) {
      // saiu no meio = desistiu (o outro vence); acabou = nada a mandar
      ch.quit()
      if (ch.end) emitBanter({ topic: ch.end.win ? "fight_win" : "fight_lose" })
    }
    live.current = null
    setDuel(null)
  }, [])

  const view = duel ? <LaminasView key={duel.id} body={body} look={look} stage="arena" duel={duel} onExit={close} /> : null
  const toast = news ? (
    <div key={news.id} className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 48px)" }}>
      <EvoToast icon={<Swords className="h-4 w-4" />}>{news.text}</EvoToast>
    </div>
  ) : null

  return { active: !!duel, onServerMessage, challenge, view, toast }
}

/**
 * Os botões "Lutar" em cima de cada pessoa que pode ser chamada agora (só na porta do Coliseu).
 * Lê a cena a cada quadro; o React só re-renderiza quando muda quem aparece.
 */
export function ColiseuButtons({ gameRef, door, onFight }: { gameRef: RefObject<GameHandle | null>; door: { x: number; z: number } | null; onFight: (sid: string) => void }) {
  const t = useTranslations("MeuMundo")
  const [who, setWho] = useState<{ sid: string; name: string }[]>([])
  const els = useRef(new Map<string, HTMLButtonElement>())
  useEffect(() => {
    if (!door) return
    let raf = 0
    let key = ""
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const list = gameRef.current?.duelTargets(door, COLISEU.near, COLISEU.pair) ?? []
      const k = list.map((x) => x.sid).join("|")
      if (k !== key) {
        key = k
        setWho(list.map(({ sid, name }) => ({ sid, name })))
      }
      // acima da placa do nome (que fica logo em cima da cabeça)
      for (const x of list) {
        const el = els.current.get(x.sid)
        if (el) el.style.transform = `translate(${Math.round(x.x)}px, ${Math.round(x.top - 46)}px) translate(-50%, -100%)`
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gameRef, door])
  if (!who.length) return null
  return (
    <>
      {who.map((x) => (
        <button
          key={x.sid}
          ref={(el) => {
            if (el) els.current.set(x.sid, el)
            else els.current.delete(x.sid)
          }}
          type="button"
          data-duel={x.sid}
          onClick={() => onFight(x.sid)}
          className="pointer-events-auto fixed left-0 top-0 z-[5] flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-black uppercase tracking-wide shadow-lg"
          style={{ background: "linear-gradient(180deg, #E8463A 0%, #A21F18 100%)", color: "#FFF6E8", border: "2px solid #F2C14E", willChange: "transform" }}
          aria-label={`${t("mobFight", "Lutar")} · ${x.name}`}
        >
          <Swords className="h-4 w-4" /> {t("mobFight", "Lutar")}
        </button>
      ))}
    </>
  )
}
