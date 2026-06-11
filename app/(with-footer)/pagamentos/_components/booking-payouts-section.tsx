"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Calendar, Clock, CheckCircle2, RotateCcw } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type TFn = (key: string, fallback?: string) => string

interface PayoutItem {
  id_payout: number
  id_booking: number
  id_profile: string
  net_cents: number
  professional_cents: number
  platform_fee_cents: number
  deposit_cents: number
  status: "aguardando" | "aprovado" | "pago" | "revertido"
  available_at: string
  approved_at: string | null
  paid_out_at: string | null
  paid_out_note: string | null
  reverted_at: string | null
  booking_date: string | null
  booking_start_time: string | null
  client_name: string | null
  profile_display_name: string | null
  service_name: string | null
  created_at: string
}

interface PayoutSummary {
  aguardando_cents: number
  aprovado_cents: number
  pago_cents: number
  revertido_cents: number
  aguardando_count: number
  aprovado_count: number
  pago_count: number
}

const STATUS = {
  aguardando: { label: "Aguardando (8d)", labelKey: "balanceWaiting", icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800" },
  aprovado:   { label: "Liberado",        labelKey: "balanceReleased", icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  pago:       { label: "Pago",            labelKey: "balancePaid", icon: CheckCircle2,  color: "text-[#F2B705]",     bg: "bg-[#F2B705]/10",                        border: "border-[#F2B705]/30" },
  revertido:  { label: "Revertido",       labelKey: "balanceReverted", icon: RotateCcw,     color: "text-rose-600",    bg: "bg-rose-50 dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-800" },
} as const

function formatBRL(cents: number, locale = "pt-BR") {
  return ((cents || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}

function formatDate(s: string | null, locale = "pt-BR") {
  if (!s) return "—"
  try { return new Date(s).toLocaleDateString(locale) } catch { return "—" }
}

function formatBookingDate(s: string | null, locale = "pt-BR") {
  if (!s) return ""
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    return d.toLocaleDateString(locale)
  } catch {
    return s
  }
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function BookingPayoutsSection() {
  const t = useTranslations("Payments")
  const locale = useLocale()
  const [items, setItems] = useState<PayoutItem[]>([])
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "hidden" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = getToken()
      if (!token) { setState("hidden"); return }
      try {
        const res = await fetch("/api/me/booking-payouts", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) { setState("error"); return }
        const list = (d.items || []) as PayoutItem[]
        if (list.length === 0) { setState("hidden"); return }
        setItems(list)
        setSummary(d.summary || null)
        setState("loaded")
      } catch {
        if (!cancelled) setState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (state === "hidden") return null
  if (state === "loading") {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" aria-hidden />
      </div>
    )
  }
  if (state === "error") return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[#2A2218] bg-[#1D1810] p-5"
    >
      <header className="mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#F2B705]" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-widest text-[#9A938A]">
          {t("bookingBalance", "Saldo de agendamentos")}
        </p>
      </header>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          <SummaryTile label={t("summaryWaiting", "Aguardando")} value={summary.aguardando_cents} count={summary.aguardando_count} tone="amber" t={t} locale={locale} />
          <SummaryTile label={t("summaryReleased", "Liberado")}   value={summary.aprovado_cents}   count={summary.aprovado_count}   tone="emerald" t={t} locale={locale} />
          <SummaryTile label={t("summaryPaid", "Pago")}       value={summary.pago_cents}       count={summary.pago_count}       tone="primary" t={t} locale={locale} />
          <SummaryTile
            label={t("summaryNet", "Total líquido")}
            value={summary.aguardando_cents + summary.aprovado_cents + summary.pago_cents}
            count={items.length}
            tone="muted"
            t={t}
            locale={locale}
          />
        </div>
      )}

      <ul className="divide-y divide-[#2A2218]/70">
        {items.map((b) => {
          const cfg = STATUS[b.status] || STATUS.aguardando
          const Icon = cfg.icon
          return (
            <li key={b.id_payout} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-[#F5F1E8]">
                    {b.service_name || t("booking", "Agendamento")} · {b.profile_display_name || "—"}
                  </p>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                    <Icon className="h-3 w-3" aria-hidden /> {t(cfg.labelKey, cfg.label)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9A938A]">
                  {t("bookingShort", "Agend.")} #{b.id_booking}
                  {b.booking_date ? ` · ${formatBookingDate(b.booking_date, locale)}` : ""}
                  {b.booking_start_time ? ` ${String(b.booking_start_time).slice(0, 5)}` : ""}
                  {b.client_name ? ` · ${b.client_name}` : ""}
                </p>
                {b.status === "aguardando" && (
                  <p className="mt-0.5 text-[11px] text-amber-600">
                    {t("releasesOn", "Libera em")} {formatDate(b.available_at, locale)}
                  </p>
                )}
                {b.status === "pago" && b.paid_out_at && (
                  <p className="mt-0.5 text-[11px] text-[#9A938A]">
                    {t("paidOn", "Pago em")} {formatDate(b.paid_out_at, locale)}{b.paid_out_note ? ` · ${b.paid_out_note}` : ""}
                  </p>
                )}
                {b.status === "revertido" && b.reverted_at && (
                  <p className="mt-0.5 text-[11px] text-rose-500">
                    {t("revertedOn", "Revertido em")} {formatDate(b.reverted_at, locale)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-[#F5F1E8]">{formatBRL(b.net_cents, locale)}</p>
                <p className="text-[11px] text-[#9A938A]">{t("clientPaid", "Cliente pagou")} {formatBRL(b.deposit_cents, locale)}</p>
                <p className="text-[10px] text-[#9A938A]">({t("fee", "taxa")} {formatBRL(b.platform_fee_cents, locale)})</p>
              </div>
            </li>
          )
        })}
      </ul>
    </motion.section>
  )
}

function SummaryTile({
  label, value, count, tone, t, locale,
}: {
  label: string
  value: number
  count: number
  tone: "amber" | "emerald" | "primary" | "muted"
  t: TFn
  locale: string
}) {
  const toneClass = {
    amber:   "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-200",
    emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200",
    primary: "border-[#F2B705]/30 bg-[#F2B705]/10 text-[#F2B705]",
    muted:   "border-[#2A2218] bg-[#2A2218]/30 text-[#9A938A]",
  }[tone]
  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums">{formatBRL(value, locale)}</p>
      <p className="text-[10px] opacity-70">{count} {count === 1 ? t("itemSingular", "item") : t("itemPlural", "itens")}</p>
    </div>
  )
}
