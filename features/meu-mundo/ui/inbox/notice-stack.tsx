"use client"

// features/meu-mundo/ui/inbox/notice-stack.tsx — os cards temporários de
// notificação (mm3d-30). Substitui o balão do mm3d-28 e mantém a regra dele
// (needs-logic.ts decide QUANDO falar de cada necessidade); soma os avisos que
// o servidor empurra pela sala ("notice": presente, comunicado, recibo, vida).
//
// 2026-11-03: cada card é a NOTIFICAÇÃO EMOCIONAL (emotion-frame.tsx, moldura
// da referência do Alex) com o personagem na emoção do aviso (6 emoções).
// Cada card: retrato (expressão do personagem padrão, retrato da skin, ou a
// identidade da plataforma em comunicados), mensagem, ação e fechar. Entra
// descendo, fica 15 s (a barra encolhe; pausa com o ponteiro em cima ou foco
// dentro), sai subindo. No máximo 1 card no celular e 2 no computador; o
// resto espera ou vai só para o sino. Sair da tela NÃO marca como lido.
// Não bloqueia o jogo: só o card recebe toque (pointer-events).

import { useCallback, useEffect, useRef, useState } from "react"
import { Gift, Megaphone, MessageCircle, ReceiptText, Tag } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { BodyId, LifeNeed, MMNotice } from "../../types"
import { archivo } from "../status/evo-skin"
import { MM } from "../hud/tokens"
import { DRAWER_EVENT } from "../hud/hud-kit"
import { emotionArt } from "../portraits"
import { screenAnchor } from "../../engine/screen-anchor"
import { EmotionFrame } from "./emotion-frame"
import { freshNeedsMemory, pickNeed, type NeedLine } from "../needs/needs-logic"
import {
  CARD_MS,
  NEED_EMOTION,
  dismiss,
  emptyQueue,
  enqueue,
  needTitle,
  noticeEmotion,
  noticeText,
  promote,
  speaksAsCharacter,
  type Card,
  type Queue,
} from "./inbox-logic"

type Tr = (key: string, fallback: string) => string

/** As duas linhas de uma necessidade: o que ele sente + há quantas horas está acordado. */
function needLines(line: NonNullable<Card["need"]>, t: Tr): { main: string; extra: string | null } {
  const [first, second] = line.ids
  const awake = line.hours != null ? t("needAwakeHours", "Já estou há {h} horas acordado.").replace("{h}", String(line.hours)) : null
  if (first === "sleep") return { main: t("needSleepMain", "Preciso dormir."), extra: awake }
  if (second === "sleep") return { main: needTitle(first, t), extra: awake }
  return { main: needTitle(first, t), extra: null }
}

/** Prioridade do card de necessidade pelo nível da vida (1 emergência … 5 leve). */
const needPriority = (level: number) => (level <= 2 ? 1 : level === 3 ? 2 : 4)

export interface NoticeStackProps {
  needs: LifeNeed[]
  /** sobe a cada "life" da sala (mesmo com a lista igual: é o lembrete das graves) */
  needsTick: number
  /** notificações empurradas pelo servidor, na ordem em que chegaram */
  pushed: MMNotice[]
  body: BodyId
  /** px abaixo do topo (faixa da visita) */
  below?: number
  /** esconde sem perder a fila (STATUS, transição, sono) */
  hidden?: boolean
  onOpenStatus: () => void
  /** abrir o conteúdo no sino/caixa (carta, histórico) */
  onOpenNotice: (n: MMNotice) => void
}

export default function NoticeStack({ needs, needsTick, pushed, body, below = 0, hidden = false, onOpenStatus, onOpenNotice }: NoticeStackProps) {
  const t = useTranslations("MeuMundo")
  const [queue, setQueue] = useState<Queue>(emptyQueue)
  const memory = useRef(freshNeedsMemory())
  const [maxVisible, setMaxVisible] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    // 2026-11-03: um card por vez (fica embaixo dos pés do personagem; o resto espera na fila)
    const fit = () => setMaxVisible(1)
    fit()
    window.addEventListener("resize", fit)
    const on = (e: Event) => setDrawerOpen(!!(e as CustomEvent<boolean>).detail)
    window.addEventListener(DRAWER_EVENT, on)
    return () => {
      window.removeEventListener("resize", fit)
      window.removeEventListener(DRAWER_EVENT, on)
    }
  }, [])

  // Necessidades: a regra do mm3d-28 escolhe a frase; a fila decide o lugar.
  useEffect(() => {
    const now = Date.now()
    const r = pickNeed(needs, memory.current, now)
    memory.current = r.memory
    const line: NeedLine | null = r.line
    if (!line) return
    setQueue((q) =>
      enqueue(
        q,
        { key: `need:${line.key}:${now}`, group: `need:${line.ids[0]}`, priority: needPriority(line.level), at: now, notice: null, need: { ids: line.ids, level: line.level, hours: line.hours } },
        now,
      ),
    )
    // `needs` muda junto com `needsTick` (mesma mensagem).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsTick])

  // Notificações do servidor (a de necessidade só vai para o histórico: o card dela é o de cima).
  const consumed = useRef(0)
  useEffect(() => {
    if (pushed.length <= consumed.current) return
    const fresh = pushed.slice(consumed.current)
    consumed.current = pushed.length
    const now = Date.now()
    setQueue((q) =>
      fresh
        .filter((n) => n.kind !== "need" && !n.read)
        // Mensagem (dm): um card por conversa na tela; saiu, a próxima mensagem já ganha outro.
        .reduce((acc, n) => enqueue(acc, { key: n.id, group: `${n.kind}:${n.code}`, priority: n.priority, at: now, notice: n, need: null, repeatMs: n.kind === "dm" ? 0 : undefined }, now), q),
    )
  }, [pushed])

  const paused = hidden || drawerOpen
  useEffect(() => {
    if (paused) return
    setQueue((q) => promote(q, maxVisible, Date.now()))
  }, [queue.waiting.length, queue.visible.length, maxVisible, paused])

  const close = useCallback((key: string) => setQueue((q) => dismiss(q, key)), [])

  // 2026-11-03 (Alex): a notificação fica logo ABAIXO DOS PÉS do personagem, entre
  // os pés e o joystick (PC e celular). A posição é lida 4× por segundo só enquanto
  // há card na tela; sem cena (ou personagem fora da tela) volta ao canto de cima.
  const showing = !paused && queue.visible.length > 0
  const [feet, setFeet] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!showing) return
    const read = () => {
      const a = screenAnchor()
      setFeet((prev) => {
        const next = a && a.feet != null ? { x: Math.round(a.x), y: Math.round(a.feet) } : null
        if (!next || !prev) return next
        return Math.abs(next.x - prev.x) < 4 && Math.abs(next.y - prev.y) < 4 ? prev : next
      })
    }
    read()
    const id = window.setInterval(read, 250)
    return () => window.clearInterval(id)
  }, [showing])

  if (!showing) return null
  const vw = window.innerWidth
  const vh = window.innerHeight
  // mesma largura da moldura (emotion-frame.module.css: --w) e a altura dela
  const fw = vw < 760 ? Math.min(vw * 0.94, 420) : Math.min(560, Math.max(320, vw * 0.34))
  const head = fw * 0.18
  const fh = fw * (380 / 1110)
  const atFeet = feet != null && feet.y > 0 && feet.y < vh - 80
  // não desce por cima do joystick (celular) nem sai pela borda de baixo
  const floor = vh - (vw < 760 ? 176 : 16) - fh
  const top = atFeet ? Math.min(feet.y + 6, floor) - head : 0
  const cx = atFeet ? Math.max(fw / 2 + 8, Math.min(vw - fw / 2 - 8, feet.x)) : 0
  return (
    <div
      // No canto: no celular desce abaixo do envelope e do sino (canto de cima à direita).
      className={`pointer-events-none fixed z-[72] flex flex-col gap-2 ${atFeet ? "items-center" : "left-0 items-start px-3 max-[759px]:mt-[52px]"}`}
      style={
        atFeet
          ? {
              position: "fixed",
              zIndex: 72,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: fw,
              left: cx - fw / 2,
              // a moldura começa logo abaixo dos pés (o espaço de cima é o do retrato que sai da moldura)
              top,
              transition: "left 300ms ease-out, top 300ms ease-out",
            }
          : { top: `calc(max(12px, env(safe-area-inset-top)) + ${below}px)`, paddingLeft: "max(12px, env(safe-area-inset-left))" }
      }
      role="region"
      aria-label={t("ntRegion", "Notificações")}
    >
      {queue.visible.map((c) => (
        <NoticeCard key={c.key} card={c} body={body} t={t} onClose={() => close(c.key)} onOpenStatus={onOpenStatus} onOpenNotice={onOpenNotice} />
      ))}
    </div>
  )
}

function NoticeCard({
  card,
  body,
  t,
  onClose,
  onOpenStatus,
  onOpenNotice,
}: {
  card: Card
  body: BodyId
  t: Tr
  onClose: () => void
  onOpenStatus: () => void
  onOpenNotice: (n: MMNotice) => void
}) {
  const [leaving, setLeaving] = useState(false)
  const [hold, setHold] = useState(false)
  // Tempo restante: conta só enquanto ninguém está lendo (ponteiro/foco no card).
  const left = useRef(CARD_MS)
  const leave = useCallback(() => {
    setLeaving(true)
    window.setTimeout(onClose, 300)
  }, [onClose])
  useEffect(() => {
    if (hold || leaving) return
    const t0 = performance.now()
    const id = window.setTimeout(leave, left.current)
    return () => {
      window.clearTimeout(id)
      left.current = Math.max(0, left.current - (performance.now() - t0))
    }
  }, [hold, leaving, leave])

  const n = card.notice
  const urgent = card.priority <= 1
  let title: string
  let extra: string | null = null
  let art: { src: string; cutout: boolean } | null = null
  let badge: React.ReactNode = null
  let action: { label: string; run: () => void } | null = null
  if (card.need) {
    const l = needLines(card.need, t)
    title = l.main
    extra = l.extra
    art = emotionArt(body, NEED_EMOTION[card.need.ids[0]])
    action = { label: t("needOpenStatus", "Ver status"), run: onOpenStatus }
  } else if (n) {
    const txt = noticeText(n, t)
    title = txt.title
    extra = txt.line
    if (speaksAsCharacter(n)) art = emotionArt(body, noticeEmotion(n))
    badge = n.kind === "gift" ? <Gift className="h-4 w-4" /> : n.kind === "purchase" ? <ReceiptText className="h-4 w-4" /> : n.kind === "dm" ? <MessageCircle className="h-4 w-4" /> : null
    action =
      n.kind === "life"
        ? { label: t("needOpenStatus", "Ver status"), run: onOpenStatus }
        : {
            label:
              n.kind === "gift"
                ? t("ntOpenGift", "Abrir presente")
                : n.kind === "purchase"
                  ? t("ntOpenReceipt", "Ver recibo")
                  : n.kind === "dm"
                    ? t("ntDmReply", "Responder")
                    : t("ntRead", "Ler"),
            run: () => onOpenNotice(n),
          }
  } else return null

  return (
    <div
      // só a ação e o fechar recebem toque: o resto da moldura não tampa o jogo
      className={`${archivo.className} pointer-events-none`}
      role={urgent ? "alert" : "status"}
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false)
      }}
    >
      <EmotionFrame
        message={title}
        extra={extra}
        art={art}
        mark={art ? null : <PlatformMark kind={n?.kind} size={52} />}
        badge={badge}
        urgent={urgent}
        leaving={leaving}
        timerMs={CARD_MS}
        paused={hold}
        closeLabel={t("close", "Fechar")}
        onClose={leave}
        action={
          action
            ? {
                label: action.label,
                run: () => {
                  action.run()
                  leave()
                },
              }
            : null
        }
      />
    </div>
  )
}

/** Identidade da plataforma (comunicado e promoção): círculo rubi com o ícone, sem rosto. */
export function PlatformMark({ kind, size = 56 }: { kind?: MMNotice["kind"]; size?: number }) {
  const Icon = kind === "promo" ? Tag : Megaphone
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: MM.rubyFill, color: "#fff", boxShadow: `0 0 0 2px ${MM.goldBorder}` }}
      aria-hidden
    >
      <Icon className="h-6 w-6" />
    </span>
  )
}
