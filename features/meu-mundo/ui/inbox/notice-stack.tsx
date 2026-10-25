"use client"

// features/meu-mundo/ui/inbox/notice-stack.tsx — os cards temporários de
// notificação (mm3d-30). Substitui o balão do mm3d-28 e mantém a regra dele
// (needs-logic.ts decide QUANDO falar de cada necessidade); soma os avisos que
// o servidor empurra pela sala ("notice": presente, comunicado, recibo, vida).
//
// Cada card: retrato (expressão do personagem padrão, retrato da skin, ou a
// identidade da plataforma em comunicados), mensagem, ação e fechar. Entra
// descendo, fica 15 s (a barra encolhe; pausa com o ponteiro em cima ou foco
// dentro), sai subindo. No máximo 1 card no celular e 2 no computador; o
// resto espera ou vai só para o sino. Sair da tela NÃO marca como lido.
// Não bloqueia o jogo: só o card recebe toque (pointer-events).

import { useCallback, useEffect, useRef, useState } from "react"
import { Gift, Megaphone, ReceiptText, Tag, X } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { BodyId, LifeNeed, MMNotice } from "../../types"
import { archivo } from "../status/evo-skin"
import { MM } from "../hud/tokens"
import { DRAWER_EVENT } from "../hud/hud-kit"
import { expressionSrc } from "../portraits"
import { freshNeedsMemory, pickNeed, type NeedLine } from "../needs/needs-logic"
import {
  CARD_MS,
  NEED_EXPRESSION,
  dismiss,
  emptyQueue,
  enqueue,
  needTitle,
  noticeExpression,
  noticeText,
  promote,
  speaksAsCharacter,
  type Card,
  type Queue,
} from "./inbox-logic"
import s from "../hud/hud.module.css"

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
    const fit = () => setMaxVisible(window.innerWidth >= 760 && window.innerHeight >= 520 ? 2 : 1)
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
        .reduce((acc, n) => enqueue(acc, { key: n.id, group: `${n.kind}:${n.code}`, priority: n.priority, at: now, notice: n, need: null }, now), q),
    )
  }, [pushed])

  const paused = hidden || drawerOpen
  useEffect(() => {
    if (paused) return
    setQueue((q) => promote(q, maxVisible, Date.now()))
  }, [queue.waiting.length, queue.visible.length, maxVisible, paused])

  const close = useCallback((key: string) => setQueue((q) => dismiss(q, key)), [])

  if (paused || !queue.visible.length) return null
  return (
    <div
      // No celular desce abaixo do envelope e do sino (canto de cima à direita).
      className="pointer-events-none fixed left-0 z-[72] flex flex-col gap-2 px-3 max-[759px]:mt-[52px]"
      style={{ top: `calc(max(12px, env(safe-area-inset-top)) + ${below}px)`, paddingLeft: "max(12px, env(safe-area-inset-left))" }}
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
    window.setTimeout(onClose, 180)
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
  let img: string | null = null
  let badge: React.ReactNode = null
  let action: { label: string; run: () => void } | null = null
  if (card.need) {
    const l = needLines(card.need, t)
    title = l.main
    extra = l.extra
    img = expressionSrc(body, NEED_EXPRESSION[card.need.ids[0]])
    action = { label: t("needOpenStatus", "Ver status"), run: onOpenStatus }
  } else if (n) {
    const txt = noticeText(n, t)
    title = txt.title
    extra = txt.line
    if (speaksAsCharacter(n)) img = expressionSrc(body, noticeExpression(n))
    badge = n.kind === "gift" ? <Gift className="h-4 w-4" /> : n.kind === "purchase" ? <ReceiptText className="h-4 w-4" /> : null
    action =
      n.kind === "life"
        ? { label: t("needOpenStatus", "Ver status"), run: onOpenStatus }
        : {
            label: n.kind === "gift" ? t("ntOpenGift", "Abrir presente") : n.kind === "purchase" ? t("ntOpenReceipt", "Ver recibo") : t("ntRead", "Ler"),
            run: () => onOpenNotice(n),
          }
  } else return null

  return (
    <div
      className={`${archivo.className} ${leaving ? s.leaveTop : s.enterTop} pointer-events-auto relative flex w-[min(92vw,420px)] items-start gap-3 overflow-hidden p-3 pr-1.5 max-[759px]:w-[min(92vw,360px)] max-[759px]:gap-2.5 max-[759px]:p-2 max-[759px]:pr-1`}
      style={{ borderRadius: MM.radius.panel, background: MM.surface, border: `1px solid ${urgent ? MM.rubyBorder : MM.border}`, boxShadow: MM.shadow }}
      role={urgent ? "alert" : "status"}
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false)
      }}
    >
      <div className="relative shrink-0">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno e estático, mesmo arquivo em todo o jogo (cache)
          <img
            src={img}
            alt=""
            width={56}
            height={56}
            decoding="async"
            className="h-14 w-14 rounded-full object-cover max-[759px]:h-11 max-[759px]:w-11"
            style={{ boxShadow: `0 0 0 2px ${MM.ruby}`, background: "radial-gradient(circle at 50% 35%, #3a2a30 0%, #1a1d24 70%)" }}
          />
        ) : (
          <PlatformMark kind={n?.kind} />
        )}
        {badge && (
          <span
            className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full max-[759px]:h-5 max-[759px]:w-5"
            style={{ background: MM.drawer, color: MM.gold, border: `1px solid ${MM.border}` }}
            aria-hidden
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5">
        <p className="text-[15px] font-semibold leading-5 max-[759px]:text-[14px] max-[759px]:leading-[18px]" style={{ color: MM.text }}>
          {title}
        </p>
        {extra && (
          <p className="line-clamp-2 text-[13px] leading-[18px] max-[759px]:text-[12px] max-[759px]:leading-4" style={{ color: MM.muted }}>
            {extra}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={() => {
              action.run()
              leave()
            }}
            className="mt-0.5 self-start py-1 text-[13px] font-semibold underline decoration-1 underline-offset-[3px] max-[759px]:text-[12px]"
            style={{ color: MM.gold }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button type="button" onClick={leave} className="-my-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: MM.muted }} aria-label={t("close", "Fechar")}>
        <X className="h-4 w-4" />
      </button>
      {/* tempo restante (decorativo): encolhe por transform e para junto com o relógio */}
      <span
        aria-hidden
        className={`${s.timer} absolute inset-x-3 bottom-0 h-[2px] rounded-full`}
        data-paused={hold || undefined}
        style={{ background: urgent ? MM.ruby : MM.goldBorder, animationDuration: `${CARD_MS}ms` }}
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
