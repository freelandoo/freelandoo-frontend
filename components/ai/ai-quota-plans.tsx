"use client"

/**
 * A COTA E OS PLANOS DO ATENDENTE DE IA (mig 263) — o topo de /account/atendente.
 *
 * Decisão do Alex (2026-09-27): todo mundo conecta de graça, e o atendente
 * atende até 2 PESSOAS POR DIA. Depois disso ele para e pede para assinar:
 * R$29 / R$59 / R$99 por mês, conforme a cota de respostas.
 *
 * ⚠️ OS NÚMEROS VÊM DO BACKEND, e da MESMA régua que o worker usa para decidir
 * (`utils/aiQuota.js`). Calcular aqui faria a tela dizer "sobra uma pessoa"
 * enquanto o worker já recusa.
 */

import { useCallback, useEffect, useState } from "react"
import { Bot, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type Plan = {
  id_plan: number
  name: string
  description: string | null
  monthly_cents: number
  reply_limit_monthly: number | null
}

type Sub = {
  id_sub: number
  id_plan: number
  status: string
  reply_limit_monthly: number | null
  current_period_end: string | null
  included: boolean
}

type Quota = {
  tier: "free" | "paid"
  plan_name: string | null
  limit: number
  used: number
  period: "day" | "cycle"
}

type Payload = { plans: Plan[]; sub: Sub | null; quota: Quota | null }

const GOLD = "#F2B705"

async function call(path: string, init: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export function AiQuotaPlans() {
  const t = useTranslations("AiAttendant")
  const locale = useLocale()
  const [data, setData] = useState<Payload | null>(null)
  const [busy, setBusy] = useState<number | "cancel" | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await call("/api/me/atendimento-ia"))
    } catch {
      setData({ plans: [], sub: null, quota: null })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Volta do checkout. O webhook pode chegar segundos depois do redirect.
  useEffect(() => {
    if (typeof window === "undefined") return
    const st = new URLSearchParams(window.location.search).get("atendimento_ia")
    if (!st) return
    if (st === "sucesso") {
      toast.success(t("planSuccess", "Plano ativo! O atendente volta a responder."))
      const timer = setTimeout(() => void load(), 4000)
      window.history.replaceState({}, "", window.location.pathname)
      return () => clearTimeout(timer)
    }
    if (st === "cancelado") toast.error(t("planCanceledCheckout", "Pagamento cancelado — você não foi cobrado."))
    window.history.replaceState({}, "", window.location.pathname)
  }, [t, load])

  const money = (cents: number) =>
    (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

  const subscribe = async (id_plan: number) => {
    setBusy(id_plan)
    try {
      const r = await call("/api/me/atendimento-ia/checkout", {
        method: "POST",
        body: JSON.stringify({ id_plan }),
      })
      if (r?.checkout_url) {
        window.location.assign(r.checkout_url)
        return
      }
      toast.error(t("planCheckoutError", "Não foi possível abrir o pagamento."))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("planCheckoutError", "Não foi possível abrir o pagamento."))
    }
    setBusy(null)
  }

  const cancel = async () => {
    if (!window.confirm(t("planCancelConfirm", "Cancelar o plano? O atendente volta para a camada grátis (2 pessoas por dia)."))) return
    setBusy("cancel")
    try {
      await call("/api/me/atendimento-ia/cancel", { method: "POST" })
      toast.success(t("planCanceled", "Plano cancelado."))
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("planCancelError", "Não foi possível cancelar agora."))
    }
    setBusy(null)
  }

  if (!data) {
    return (
      <div className="mb-8 flex items-center gap-2 py-4 text-sm text-[#9A938A]">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading", "Carregando…")}
      </div>
    )
  }

  const q = data.quota
  const live = data.sub && !data.sub.included && (data.sub.status === "active" || data.sub.status === "past_due")
  const esgotou = !!q && q.used >= q.limit
  const pct = q && q.limit > 0 ? Math.min(100, Math.round((q.used / q.limit) * 100)) : 0

  return (
    <section className="mb-8 border-2 border-[#0B0B0D] bg-[#15120E] p-4" style={{ boxShadow: `6px 6px 0 0 ${GOLD}` }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
            <Bot className="h-4 w-4" style={{ color: GOLD }} />
            {q?.tier === "paid"
              ? t("quotaPaidEyebrow", "Plano {name}").replace("{name}", q.plan_name || "")
              : t("quotaFreeEyebrow", "Camada grátis")}
          </p>
          {q ? (
            <p className="fl-display mt-1 text-2xl leading-none">
              {q.period === "day"
                ? t("quotaFreeLine", "{used} de {limit} pessoas atendidas hoje")
                    .replace("{used}", String(q.used))
                    .replace("{limit}", String(q.limit))
                : t("quotaPaidLine", "{used} de {limit} respostas neste ciclo")
                    .replace("{used}", String(q.used))
                    .replace("{limit}", String(q.limit))}
            </p>
          ) : null}
        </div>
        {live ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void cancel()}
            className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60"
          >
            {busy === "cancel" ? t("planCanceling", "Cancelando…") : t("planCancel", "Cancelar plano")}
          </button>
        ) : null}
      </div>

      {q ? (
        <div className="mt-3 h-2 w-full border border-[#0B0B0D] bg-[#0b0804]">
          <div className="h-full" style={{ width: `${pct}%`, background: esgotou ? "#EF4444" : "#22C55E" }} />
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-[#9A938A]">
        {esgotou
          ? q?.tier === "paid"
            ? t("quotaPaidOut", "A cota do plano acabou: o atendente parou até o próximo ciclo. Troque para um plano maior se precisar de mais respostas.")
            : t("quotaFreeOut", "O limite grátis de hoje acabou: o atendente parou e volta amanhã. Assine um plano para ele continuar respondendo.")
          : q?.tier === "paid"
            ? t("quotaPaidHint", "Cada resposta do atendente conta uma vez, no WhatsApp e nas mensagens da Freelandoo.")
            : t("quotaFreeHint", "De graça, o atendente conversa com até 2 pessoas por dia. Quem já foi atendido hoje continua sendo atendido.")}
      </p>

      {!live && data.plans.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {data.plans.map((p) => (
            <div key={p.id_plan} className="flex flex-col border-2 border-[#0B0B0D] bg-[#0b0804] p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">{p.name}</p>
              <p className="fl-display mt-1 text-2xl leading-none" style={{ color: GOLD }}>
                {money(p.monthly_cents)}
                <span className="ml-1 text-xs font-bold text-[#9A938A]">{t("perMonth", "/mês")}</span>
              </p>
              {p.reply_limit_monthly ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#F5F1E8]">
                  <Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={3} />
                  {t("planReplies", "{n} respostas por mês").replace(
                    "{n}",
                    p.reply_limit_monthly.toLocaleString(locale)
                  )}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void subscribe(p.id_plan)}
                className="mt-3 inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-60"
                style={{ background: GOLD, boxShadow: "3px 3px 0 0 #0B0B0D" }}
              >
                {busy === p.id_plan ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("planSubscribe", "Assinar")}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
