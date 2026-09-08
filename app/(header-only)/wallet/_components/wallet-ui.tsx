"use client"

// Vocabulário visual e as peças pequenas que as QUATRO telas da Carteira
// dividem: a raiz (/wallet) e as páginas dos três botões retráteis
// (/wallet/vaquinha, /wallet/cupom e /wallet/mercado).
//
// Existe porque os pills deixaram de abrir painéis da própria página e passaram
// a NAVEGAR (pedido do Alex, 2026-09-08): com quatro rotas, a paleta, os
// formatadores e os cards de papel copiados em cada uma divergiriam na primeira
// mudança de tom — mesma razão do `community-ui.ts` e do `academy-ui.ts`.
//
// Tela nova da Carteira importa DAQUI.

import type { ReactNode } from "react"
import { ShoppingBag, Briefcase, GraduationCap, Percent, Ticket, Wallet } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

/* ── paleta (verde teal no lugar do dourado do ranking) ───────────────────── */
export const GREEN = "#16B79A"
export const GREEN_DEEP = "#00876B"
export const INK = "#0B0B0D"
export const PAPER = "#F1EDE2"

/* ── helpers ──────────────────────────────────────────────────────────────── */
export function brl(cents?: number | null, locale = "pt-BR") {
  return ((Number(cents) || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}
export function pct(n?: number | null) {
  // `Number(null)` é 0 e passa no isFinite — sem este guard, cotação SEM
  // variação (a open.er-api não traz o fechamento anterior) era exibida como
  // "+0,00%", dizendo "não mexeu" quando o certo é "não sei".
  if (n == null) return "—"
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
}
export function shortDay(iso: string, locale = "pt-BR") {
  return new Date(iso + "T00:00:00").toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
}
export function fmtDate(iso?: string | null, locale = "pt-BR") {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
}
export function initialsOf(name?: string | null) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "?"
  )
}

export const KIND_META: Record<string, { label: string; labelKey: string; Icon: typeof ShoppingBag }> = {
  product: { label: "Loja", labelKey: "kindStore", Icon: ShoppingBag },
  service: { label: "Serviço", labelKey: "kindService", Icon: Briefcase },
  course: { label: "Curso", labelKey: "kindCourse", Icon: GraduationCap },
  affiliate: { label: "Afiliado", labelKey: "kindAffiliate", Icon: Percent },
}
export const STATUS_META: Record<string, { label: string; labelKey: string; cls: string }> = {
  paid: { label: "Recebido", labelKey: "statusReceived", cls: "bg-[#00876B] text-white" },
  available: { label: "Disponível", labelKey: "statusAvailable", cls: "bg-[#16B79A] text-[#06251F]" },
  pending: { label: "Aguardando", labelKey: "statusPending", cls: "bg-[#0B0B0D] text-[#F1EDE2]" },
  reversed: { label: "Revertido", labelKey: "statusReverted", cls: "bg-[#9A3412] text-white" },
}

/* ── tipos ────────────────────────────────────────────────────────────────── */
export type Agg = {
  totals?: { received?: number; available?: number; pending?: number; reversed?: number; count?: number }
}
export type Earning = {
  kind: string; id: string; ref_id: string; title: string; status: string
  gross_cents: number; net_cents: number; created_at: string
  available_at: string | null; paid_at: string | null
}
export type SeriesPoint = { day: string; net_cents: number; count: number }
/** Venda feita com o cupom do usuário — o extrato do extinto /account/afiliado. */
export type CouponSale = {
  id: string
  created_at: string
  status: string
  coupon_code: string | null
  buyer: { id: string; name: string | null; email: string | null }
  item: { name: string | null; count: number }
  amounts: { discount_cents: number; final_cents: number; commission_cents: number }
}
export type MarketItem = {
  symbol: string; kind: string; label: string; price: number | null
  change_pct: number | null; currency: string; logo_url: string | null
}
export type NewsItem = {
  id: number; source?: string; category: string; title: string; url: string
  thumb_url?: string | null; published_at?: string | null
}

/* ── KPI ──────────────────────────────────────────────────────────────────── */
/**
 * `accent` = o verde do "Recebido". `emphasis` = o fundo preto do "Total
 * recebido": ele é a SOMA dos outros, e repetir o verde do Recebido faria os
 * dois parecerem o mesmo número.
 */
export function Kpi({
  label,
  value,
  accent,
  emphasis,
  hint,
}: {
  label: string
  value: string
  accent?: boolean
  emphasis?: boolean
  hint?: string
}) {
  const bg = emphasis ? INK : accent ? GREEN : PAPER
  return (
    <div className="border-2 border-[#0B0B0D] p-3.5 shadow-[5px_5px_0_0_#0B0B0D]" style={{ background: bg }}>
      <p
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[0.14em]",
          emphasis ? "text-[#C9C2B6]" : accent ? "text-[#06251F]" : "text-[#6B6457]"
        )}
      >
        {label}
      </p>
      <p
        className="mt-1 fl-display text-2xl leading-none sm:text-[1.7rem]"
        style={{ color: emphasis ? GREEN : accent ? INK : GREEN_DEEP }}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-1 text-[9px] font-bold uppercase tracking-[0.1em]",
            emphasis ? "text-[#8A8378]" : "text-[#6B6457]"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

/* ── Linha do extrato (card de papel reto, sombra dura) ───────────────────── */
export function ExtratoRow({ it }: { it: Earning }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const km = KIND_META[it.kind] || { label: it.kind, labelKey: "", Icon: Wallet }
  const sm = STATUS_META[it.status] || { label: it.status, labelKey: "", cls: "bg-[#0B0B0D] text-[#F1EDE2]" }
  const date = it.paid_at || it.available_at || it.created_at
  return (
    <div className="group flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 shadow-[5px_5px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[8px_8px_0_0_#16B79A] md:px-4">
      <span
        className="inline-flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-2 border-[#0B0B0D]"
        style={{ background: GREEN, outline: "2px solid #0B0B0D", outlineOffset: "1px" }}
      >
        <km.Icon className="h-5 w-5 text-[#06251F]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="fl-display truncate text-lg leading-none text-[#0B0B0D] md:text-xl">{it.title}</h4>
          <span className="-rotate-1 bg-[#0B0B0D] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2]">
            {km.labelKey ? tr(km.labelKey, km.label) : km.label}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">{fmtDate(date, locale)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="fl-display text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>
          {brl(it.net_cents, locale)}
        </span>
        <span className={cn("px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em]", sm.cls)}>
          {sm.labelKey ? tr(sm.labelKey, sm.label) : sm.label}
        </span>
      </div>
    </div>
  )
}

/**
 * Linha do extrato do CUPOM: uma venda feita com o cupom do usuário (quem
 * comprou, o que levou, quanto pagou e quanto virou comissão). É a única lista
 * do extinto /account/afiliado que não sai de `/me/earnings`.
 */
export function CouponSaleRow({ sale }: { sale: CouponSale }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const sm = STATUS_META[sale.status] || { label: sale.status, labelKey: "", cls: "bg-[#0B0B0D] text-[#F1EDE2]" }
  const buyerLabel = sale.buyer?.name || sale.buyer?.email || tr("buyer", "Comprador")
  const itemLabel = sale.item?.name
    ? sale.item.count > 1
      ? `${sale.item.name} +${sale.item.count - 1}`
      : sale.item.name
    : `${sale.item?.count || 0} ${tr("itemsCount", "item(s)")}`
  return (
    <div className="group flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 shadow-[5px_5px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[8px_8px_0_0_#16B79A] md:px-4">
      <span
        className="inline-flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-2 border-[#0B0B0D]"
        style={{ background: GREEN, outline: "2px solid #0B0B0D", outlineOffset: "1px" }}
      >
        <Ticket className="h-5 w-5 text-[#06251F]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="fl-display truncate text-lg leading-none text-[#0B0B0D] md:text-xl">{buyerLabel}</h4>
          {sale.coupon_code && (
            <span className="-rotate-1 bg-[#0B0B0D] px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2]">
              {sale.coupon_code}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[12px] font-semibold text-[#6B6457]">{itemLabel}</p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
          {fmtDate(sale.created_at, locale)}
          {sale.amounts?.discount_cents > 0 && (
            <>
              {" "}
              · {tr("discount", "desconto")} {brl(sale.amounts.discount_cents, locale)}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="fl-display text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>
          +{brl(sale.amounts?.commission_cents, locale)}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-[#6B6457]">
          {tr("saleOf", "venda de")} {brl(sale.amounts?.final_cents, locale)}
        </span>
        <span className={cn("px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em]", sm.cls)}>
          {sm.labelKey ? tr(sm.labelKey, sm.label) : sm.label}
        </span>
      </div>
    </div>
  )
}

/* ── Estados ──────────────────────────────────────────────────────────────── */
export function StateBox({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode
  title: string
  desc: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center border-2 border-dashed border-[#F1EDE2]/15 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center text-[#06251F]" style={{ background: GREEN }}>
        {icon}
      </span>
      <p className="mt-4 fl-display text-2xl text-[#F1EDE2]">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-[#C9C2B6]/70">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export function ExtratoSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
      ))}
    </div>
  )
}
export function RowsSkeleton({ n }: { n: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.05]" />
      ))}
    </div>
  )
}
export function Muted({ children }: { children: ReactNode }) {
  return <p className="px-1 py-2 text-xs font-semibold text-[#6B6457]">{children}</p>
}
