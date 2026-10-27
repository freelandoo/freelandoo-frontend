"use client"

// HISTÓRICO DE MENSALIDADES (pedido do Alex, 2026-10-27): cada mensalidade é
// um TALÃO de papel — canhoto com o mês separado por picote (linha tracejada +
// dois entalhes QUADRADOS: o picote sem curva), vencimento e forma no meio,
// valor e situação à direita. Vencida leva o CARIMBO vermelho.
//
// "Pagar" só aparece em pendente/vencida E quando a academia recebe pela
// Freelandoo (`pay_enabled` do back: capacidade da API + chave PIX). Sem isso,
// "Pague na recepção" — nunca esconder a dívida.

import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { AlertTriangle, Loader2, Receipt } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { DUR, EASE, STAGGER, stepFor } from "./motion"
import { PressButton, StampMark, useInViewOnce } from "./motion-kit"
import { TextStamp } from "./stamp"
import { SpeedBand } from "./speed-band"
import { SP, TX } from "./sp-tokens"

export type DuePayment = {
  external_id: string
  amount_cents: number
  due_date: string | null
  status: string
  paid_at: string | null
  method: string | null
  paid_via: "academy" | "freelandoo"
  pending_checkout: { status: string; checkout_url: string | null } | null
}

const PAYABLE = ["pending", "overdue"]

const METHOD_KEYS: Record<string, [string, string]> = {
  pix: ["methodPix", "PIX"],
  boleto: ["methodBoleto", "Boleto"],
  credito: ["methodCredit", "Cartão de crédito"],
  credit_card: ["methodCredit", "Cartão de crédito"],
  debito: ["methodDebit", "Cartão de débito"],
  debit_card: ["methodDebit", "Cartão de débito"],
  dinheiro: ["methodCash", "Dinheiro"],
  freelandoo: ["methodFreelandoo", "Freelandoo"],
}

export function DuesList({
  payments,
  payEnabled,
  onPay,
  highlight,
}: {
  payments: DuePayment[] | null
  payEnabled: boolean
  /** Abre o checkout; devolve false quando falhou (o botão faz o "não"). */
  onPay: (p: DuePayment) => Promise<boolean>
  /** external_id que acabou de voltar pago do checkout (carimbo PAGO 1×). */
  highlight?: string | null
}) {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const [showAll, setShowAll] = useState(false)
  const money = useCallback(
    (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale]
  )

  const open = (payments ?? []).filter((p) => PAYABLE.includes(p.status))
  const overdue = open.filter((p) => p.status === "overdue")
  const openTotal = open.reduce((s, p) => s + p.amount_cents, 0)
  const list = payments ?? []
  const shown = showAll ? list : list.slice(0, 6)
  const first = open.slice().sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0]

  return (
    <section>
      <SpeedBand
        title={t("duesTitle", "Histórico de mensalidades")}
        icon={<Receipt className="h-5 w-5" />}
      />

      {payEnabled && open.length > 0 && first && (
        <PayCallout
          tone={overdue.length > 0 ? "bad" : "warn"}
          text={(overdue.length > 0
            ? overdue.length === 1
              ? t("duesOverdueOne", "1 mensalidade vencida")
              : t("duesOverdueMany", "{n} mensalidades vencidas").replace("{n}", String(overdue.length))
            : open.length === 1
              ? t("duesOpenOne", "1 mensalidade em aberto")
              : t("duesOpenMany", "{n} mensalidades em aberto").replace("{n}", String(open.length))) +
            " · " +
            money(openTotal)}
          payLabel={t("payNow", "Pagar")}
          onPay={() => onPay(first)}
        />
      )}

      <div className="mt-3 space-y-2.5">
        {payments === null ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] border-2 border-dashed border-[#1A0A05]/40" style={{ background: `${SP.paper}22` }} />
          ))
        ) : list.length === 0 ? (
          <div
            className="flex items-center gap-3 border-2 border-dashed px-4 py-5 text-sm font-bold"
            style={{ borderColor: SP.paperMute, color: SP.mute }}
          >
            <Receipt className="h-5 w-5 shrink-0" />
            {t("duesEmpty", "Nenhuma mensalidade registrada ainda.")}
          </div>
        ) : (
          <TicketStack>
            {shown.map((p) => (
              <DueTicket
                key={p.external_id}
                p={p}
                money={money}
                payEnabled={payEnabled}
                onPay={onPay}
                highlight={highlight === p.external_id}
              />
            ))}
          </TicketStack>
        )}
      </div>

      {list.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.16em] underline underline-offset-4"
          style={{ color: SP.glow }}
        >
          {showAll
            ? t("duesShowLess", "Mostrar menos")
            : t("duesShowAll", "Ver todas ({n})").replace("{n}", String(list.length))}
        </button>
      )}
    </section>
  )
}

/** Talões empilhando: RECORTE em cascata curta (até 6; o resto vem junto). */
function TicketStack({ children }: { children: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const s = stepFor(Math.min(children.length, 6), STAGGER.rows)
  return (
    <div ref={ref} className="space-y-2.5">
      {children.map((c, i) => (
        <motion.div
          key={(c as { key?: string }).key ?? i}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: DUR.enter, ease: EASE.paper, delay: Math.min(i, 5) * s }}
        >
          {c}
        </motion.div>
      ))}
    </div>
  )
}

export function PayCallout({
  tone,
  text,
  payLabel,
  onPay,
}: {
  tone: "bad" | "warn"
  text: string
  payLabel: string
  onPay: () => Promise<boolean>
}) {
  const color = tone === "bad" ? SP.bad : SP.warn
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.enter, ease: EASE.paper, delay: 0.35 }}
      className="relative mt-3 flex items-center justify-between gap-3 overflow-hidden border-2 border-[#0B0B0D] px-3 py-2.5"
      style={{ background: `${color}22` }}
    >
      <span aria-hidden className="absolute inset-0" style={{ background: TX.speed, opacity: 0.6 }} />
      <p className="relative flex min-w-0 items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em]" style={{ color }}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">{text}</span>
      </p>
      <PayButton label={payLabel} onPay={onPay} big />
    </motion.div>
  )
}

/**
 * "Pagar": PRENSA no toque; carregando troca o rótulo por "Abrindo…" com a
 * largura travada e a fita de obra correndo DENTRO do botão; erro faz o "não"
 * de duas batidas. O redirecionamento ao checkout é imediato (sem saída
 * animada: atrasaria o pagamento).
 */
function PayButton({ label, onPay, big = false }: { label: string; onPay: () => Promise<boolean>; big?: boolean }) {
  const t = useTranslations("Fitness")
  const [busy, setBusy] = useState(false)
  const [nope, setNope] = useState(0)
  async function click() {
    if (busy) return
    setBusy(true)
    const ok = await onPay()
    if (!ok) {
      setBusy(false)
      setNope((n) => n + 1)
    }
  }
  return (
    <motion.span
      key={nope}
      initial={false}
      animate={nope ? { x: [0, -4, 4, -2, 0] } : undefined}
      transition={{ duration: 0.28 }}
      className="relative shrink-0"
    >
      <PressButton
        type="button"
        onClick={click}
        disabled={busy}
        aria-busy={busy}
        className={`relative inline-flex items-center justify-center gap-2 overflow-hidden border-2 border-[#0B0B0D] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D] ${big ? "min-w-[112px] px-4 py-2.5 text-xs" : "min-w-[92px] px-3 py-1.5 text-[11px]"}`}
        style={{ background: SP.ember }}
      >
        {busy && (
          <span
            aria-hidden
            className="sp-tape absolute inset-y-0 -left-full w-[200%]"
            style={{ background: "repeating-linear-gradient(135deg, rgba(11,11,13,.22) 0 8px, transparent 8px 16px)" }}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={busy ? "b" : "l"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.instant }}
            className="relative inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? t("payOpening", "Abrindo…") : label}
          </motion.span>
        </AnimatePresence>
      </PressButton>
    </motion.span>
  )
}

function DueTicket({
  p,
  money,
  payEnabled,
  onPay,
  highlight,
}: {
  p: DuePayment
  money: (c: number) => string
  payEnabled: boolean
  onPay: (p: DuePayment) => Promise<boolean>
  highlight: boolean
}) {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const due = p.due_date ? new Date(p.due_date) : null
  const month = due
    ? new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(due).replace(".", "").toUpperCase()
    : "—"
  const year = due ? String(due.getUTCFullYear()).slice(2) : ""
  const viaFreelandoo = p.status === "paid" && p.paid_via === "freelandoo"
  const methodKey = viaFreelandoo ? "freelandoo" : (p.method || "").toLowerCase()
  const method = METHOD_KEYS[methodKey]
  const open = PAYABLE.includes(p.status)
  const struck = p.status === "canceled" || p.status === "refunded"
  const waiting = open && p.pending_checkout?.status === "pending" && p.pending_checkout.checkout_url

  return (
    <div className="relative flex min-h-[76px] items-stretch border-2 border-[#1A0A05]" style={{ background: SP.paper, color: SP.paperInk, backgroundImage: TX.paperGrain }}>
      {/* canhoto + picote reto */}
      <div className="relative flex w-14 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-[#1A0A05]/50">
        <span className="fl-display text-lg leading-none">{month}</span>
        <span className="font-mono text-[11px] font-semibold" style={{ color: SP.paperMute }}>
          {year}
        </span>
        <span aria-hidden className="absolute -right-[4px] -top-[2px] h-1.5 w-1.5 bg-[#0c0503]" />
        <span aria-hidden className="absolute -bottom-[2px] -right-[4px] h-1.5 w-1.5 bg-[#0c0503]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold">
            {t("duesDue", "Vencimento")} {due ? due.toLocaleDateString(locale, { timeZone: "UTC" }) : "—"}
          </p>
          <p className="font-mono text-[11px]" style={{ color: SP.paperMute }}>
            {method ? t(method[0], method[1]) : p.status === "paid" ? t("methodAcademy", "Na academia") : "—"}
            {p.paid_at && p.status === "paid" ? ` · ${t("duesPaidOn", "pago em")} ${new Date(p.paid_at).toLocaleDateString(locale)}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`fl-display text-[22px] leading-none tabular-nums ${struck ? "line-through opacity-50" : ""}`}>
            {money(p.amount_cents)}
          </span>
          <StatusChip p={p} viaFreelandoo={viaFreelandoo} highlight={highlight} />
        </div>

        {open && (
          <div className="flex w-full justify-end">
            {payEnabled ? (
              waiting ? (
                <a
                  href={p.pending_checkout!.checkout_url!}
                  className="text-[11px] font-extrabold uppercase tracking-[0.14em] underline underline-offset-4"
                  style={{ color: SP.emberDeep }}
                >
                  {t("payResume", "Continuar pagamento")}
                </a>
              ) : (
                <PayButton label={t("payNow", "Pagar")} onPay={() => onPay(p)} />
              )
            ) : (
              <span className="font-mono text-[11px]" style={{ color: SP.paperMute }}>
                {t("payAtDesk", "Pague na recepção")}
              </span>
            )}
          </div>
        )}
      </div>

      {p.status === "overdue" && (
        <span className="pointer-events-none absolute -right-1 top-1 md:right-2">
          <StampMark id={`venc-${p.external_id}`} play range={12}>
            <TextStamp color={SP.badPaper}>{t("payOverdueStamp", "Vencida")}</TextStamp>
          </StampMark>
        </span>
      )}
    </div>
  )
}

function StatusChip({ p, viaFreelandoo, highlight }: { p: DuePayment; viaFreelandoo: boolean; highlight: boolean }) {
  const t = useTranslations("Fitness")
  if (viaFreelandoo) {
    return (
      <StampMark id={`paid-${p.external_id}`} play={highlight} from={1.8} range={6}>
        <span className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0B0D]" style={{ background: SP.ember }}>
          <span className="fl-display grid h-4 w-4 place-items-center bg-[#0B0B0D] text-[11px] leading-none" style={{ color: SP.ember }}>
            F
          </span>
          {t("payViaFreelandoo", "Pago via Freelandoo")}
        </span>
      </StampMark>
    )
  }
  const map: Record<string, [string, string, string]> = {
    paid: ["payPaidChip", "Paga", SP.ok],
    pending: ["payPending", "Pendente", SP.warn],
    overdue: ["payOverdue", "Atrasado", SP.bad],
    canceled: ["payCanceled", "Cancelado", "#C9BFB3"],
    refunded: ["payRefunded", "Estornado", "#C9BFB3"],
  }
  const [k, fb, bg] = map[p.status] || map.pending
  if (p.status === "overdue") return null // o carimbo VENCIDA já diz
  return (
    <span className="border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B0B0D]" style={{ background: bg }}>
      {t(k, fb)}
    </span>
  )
}
