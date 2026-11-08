"use client"

// A7 — a carteira das duas moedas: GOLD (comprada, 1 Gold = R$ 1) e VERDE
// ESMERALDA (ganha engajando, no Meu Mundo ou convertendo Gold, 1 Gold =
// 1.000 Esmeralda). Converter só vai de Gold para Esmeralda. Cupom de desconto
// se compra só com Gold. Estilo tabloide reto (.fl-sharp).

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Gem, Hexagon, Loader2, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

export const GOLD = "#F2B705"
export const EMERALD = "#1FBF75"

type Wallet = { balance: number; lifetime_earned?: number; lifetime_spent?: number }
type EmeraldSummary = {
  wallet: Wallet
  emerald_per_gold: number
  conversion_enabled: boolean
  engagement: { enabled: boolean; daily_cap: number; earned_today: number; points: Record<string, number> }
}
type Tx = { id: string; type: string; amount: number; unit?: "polen" | "gold"; created_at: string }
type Coupon = { id: string; code: string; discount_cents: number; gold_spent: number; status: "available" | "reserved" | "used"; created_at: string }

const TYPE_KEYS: Record<string, string> = {
  earn_purchase_stripe: "txPurchase",
  earn_live_gift: "txLiveGift",
  earn_rewarded_ad: "txAd",
  earn_level_up: "txLevel",
  earn_community_goal: "txGoal",
  earn_engagement: "txEngagement",
  earn_reach: "txReach",
  earn_meu_mundo: "txMeuMundo",
  earn_meu_mundo_work: "txWork",
  earn_coin_migration: "txCoinMigration",
  earn_gold_conversion: "txConvertIn",
  spend_emerald_conversion: "txConvertOut",
  spend_gold_coupon: "txCoupon",
  spend_manifestation: "txManifestation",
  spend_premium: "txHighlight",
  spend_premium_highlight: "txHighlight",
  spend_clan_highlight: "txHighlight",
  spend_post_boost: "txBoost",
  spend_profile_boost: "txBoost",
  spend_live_gift: "txLiveGiftSent",
  spend_function_purchase: "txFunction",
  spend_meu_mundo: "txMeuMundo",
  redenomination: "txRedenomination",
  reversal: "txReversal",
  refund: "txRefund",
  admin_adjustment: "txAdmin",
}

function authToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const t = authToken()
  const res = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data as T
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`.replace(/\D/g, "")
}

export function GoldMark({ className = "h-5 w-5" }: { className?: string }) {
  return <Hexagon className={className} style={{ color: GOLD, fill: GOLD }} aria-hidden />
}

export function EmeraldMark({ className = "h-5 w-5" }: { className?: string }) {
  return <Gem className={className} style={{ color: EMERALD }} aria-hidden />
}

export function CoinWallet({ onChange }: { onChange?: () => void }) {
  const t = useTranslations("Moedas")
  const locale = useLocale()
  const fmt = useCallback((n: number) => Math.round(n).toLocaleString(locale), [locale])
  const brl = useCallback(
    (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100),
    [locale],
  )

  const [gold, setGold] = useState<Wallet | null>(null)
  const [emerald, setEmerald] = useState<EmeraldSummary | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [goldPer10, setGoldPer10] = useState(12)
  const [convertGold, setConvertGold] = useState("")
  const [discount, setDiscount] = useState(1000)
  const [busy, setBusy] = useState<"convert" | "coupon" | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [tab, setTab] = useState<"gold" | "emerald">("gold")
  const [history, setHistory] = useState<Tx[] | null>(null)

  const load = useCallback(async () => {
    if (!authToken()) return
    try {
      const w = await call<{ wallet: Wallet; emerald: EmeraldSummary }>("/api/polens/wallet")
      setGold(w.wallet)
      setEmerald(w.emerald)
      const c = await call<{ coupons: Coupon[]; gold_per_10_brl: number }>("/api/polens/coupons")
      setCoupons(c.coupons || [])
      setGoldPer10(c.gold_per_10_brl || 12)
    } catch {
      /* a carteira some em silêncio sem login */
    }
  }, [])

  const loadHistory = useCallback(async (which: "gold" | "emerald") => {
    setHistory(null)
    try {
      const path = which === "gold" ? "/api/polens/history?limit=50" : "/api/polens/emerald/history?limit=50"
      const d = await call<{ transactions: Tx[] }>(path)
      setHistory(d.transactions || [])
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    // Carga inicial fora do corpo do efeito (lint: sem setState síncrono).
    const id = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(id)
  }, [load])

  useEffect(() => {
    const id = window.setTimeout(() => void loadHistory(tab), 0)
    return () => window.clearTimeout(id)
  }, [tab, loadHistory])

  const rate = emerald?.emerald_per_gold || 1000
  const goldN = Math.floor(Number(convertGold) || 0)
  const couponCost = Math.round((discount / 1000) * goldPer10)

  async function convert() {
    if (goldN <= 0) return
    setBusy("convert")
    setMsg(null)
    try {
      await call("/api/polens/convert", { method: "POST", body: JSON.stringify({ gold: goldN, key: newKey() }) })
      setMsg({ ok: true, text: t("convertDone", "{g} Gold viraram {e} Esmeraldas.").replace("{g}", fmt(goldN)).replace("{e}", fmt(goldN * rate)) })
      setConvertGold("")
      await load()
      await loadHistory(tab)
      onChange?.()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("genericError", "Não foi possível concluir.") })
    } finally {
      setBusy(null)
    }
  }

  async function buyCoupon() {
    setBusy("coupon")
    setMsg(null)
    try {
      const r = await call<{ coupon: Coupon }>("/api/polens/coupons", {
        method: "POST",
        body: JSON.stringify({ discount_cents: discount, key: newKey() }),
      })
      setMsg({ ok: true, text: t("couponDone", "Cupom {code} de {v} pronto para usar.").replace("{code}", r.coupon.code).replace("{v}", brl(r.coupon.discount_cents)) })
      await load()
      onChange?.()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("genericError", "Não foi possível concluir.") })
    } finally {
      setBusy(null)
    }
  }

  const eng = emerald?.engagement
  const engPct = eng && eng.daily_cap > 0 ? Math.min(100, (eng.earned_today / eng.daily_cap) * 100) : 0
  const available = useMemo(() => coupons.filter((c) => c.status !== "used"), [coupons])

  return (
    <section className="fl-sharp mx-auto max-w-7xl px-4 pb-6 md:px-8" aria-label={t("walletTitle", "Carteira")}>
      <div className="grid gap-3 md:grid-cols-2">
        {/* Gold */}
        <div className="border-2 bg-[#1D1810] p-5" style={{ borderColor: `${GOLD}66` }}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9A938A]">{t("goldTitle", "Gold")}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <GoldMark />
            <span className="text-3xl font-black tabular-nums text-[#F5F1E8]">{gold ? fmt(gold.balance) : "—"}</span>
            <span className="text-sm text-[#9A938A]">{t("goldUnit", "Gold")}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#9A938A]">
            {t("goldHow", "1 Gold = R$ 1. Só se obtém comprando (ou recebendo presente em live). Vale para manifestações, destaques, impulsionar e cupons de desconto.")}
          </p>
        </div>
        {/* Esmeralda */}
        <div className="border-2 bg-[#0F1A14] p-5" style={{ borderColor: `${EMERALD}66` }}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8FB3A0]">{t("emeraldTitle", "Verde Esmeralda")}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <EmeraldMark />
            <span className="text-3xl font-black tabular-nums text-[#F5F1E8]">{emerald ? fmt(emerald.wallet.balance) : "—"}</span>
            <span className="text-sm text-[#8FB3A0]">{t("emeraldUnit", "Esmeraldas")}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#8FB3A0]">
            {t("emeraldHow", "Ganhe curtindo, salvando, comentando e compartilhando, com o alcance dos seus posts, subindo de nível e no Meu Mundo. Vale para manifestações, destaques e itens do jogo. Não vira Gold.")}
          </p>
          {eng?.enabled ? (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-[#8FB3A0]">
                <span>{t("engagementToday", "Engajamento hoje")}</span>
                <span className="tabular-nums">{fmt(eng.earned_today)} / {fmt(eng.daily_cap)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-[#F5F1E8]/10">
                <div className="h-full" style={{ width: `${engPct}%`, background: EMERALD }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* Converter */}
        <div className="border-2 border-[#F5F1E8]/10 bg-[#141009] p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#F5F1E8]">{t("convertTitle", "Converter Gold em Esmeralda")}</h3>
          <p className="mt-1 text-xs text-[#9A938A]">
            {t("convertRule", "1 Gold = {n} Esmeraldas. Só nessa direção: Esmeralda nunca volta a ser Gold.").replace("{n}", fmt(rate))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              inputMode="numeric"
              value={convertGold}
              onChange={(e) => setConvertGold(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("convertPlaceholder", "Gold")}
              aria-label={t("convertPlaceholder", "Gold")}
              className="h-11 w-28 border-2 border-[#F5F1E8]/12 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
            />
            <ArrowRight className="h-4 w-4 text-[#9A938A]" aria-hidden />
            <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-[#F5F1E8]">
              <EmeraldMark className="h-4 w-4" /> {fmt(goldN * rate)}
            </span>
            <button
              type="button"
              onClick={() => void convert()}
              disabled={busy !== null || goldN <= 0 || goldN > (gold?.balance || 0) || emerald?.conversion_enabled === false}
              className="ml-auto inline-flex h-11 items-center gap-2 px-4 text-sm font-bold text-[#06140C] disabled:opacity-50"
              style={{ background: EMERALD }}
            >
              {busy === "convert" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("convertCta", "Converter")}
            </button>
          </div>
        </div>

        {/* Cupom Gold */}
        <div className="border-2 border-[#F5F1E8]/10 bg-[#141009] p-5">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#F5F1E8]">{t("couponTitle", "Cupom de desconto")}</h3>
          <p className="mt-1 text-xs text-[#9A938A]">
            {t("couponRule", "{g} Gold a cada R$ 10 de desconto. Vale em funções, destaques, manifestações e no booster de nível. Só com Gold, uso único.").replace("{g}", fmt(goldPer10))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              aria-label={t("couponValue", "Valor do desconto")}
              className="h-11 border-2 border-[#F5F1E8]/12 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
            >
              {[1000, 2000, 3000, 5000, 10000].map((c) => (
                <option key={c} value={c}>{brl(c)}</option>
              ))}
            </select>
            <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-[#F5F1E8]">
              <GoldMark className="h-4 w-4" /> {fmt(couponCost)}
            </span>
            <button
              type="button"
              onClick={() => void buyCoupon()}
              disabled={busy !== null || couponCost > (gold?.balance || 0)}
              className="ml-auto inline-flex h-11 items-center gap-2 px-4 text-sm font-bold text-[#1A1505] disabled:opacity-50"
              style={{ background: GOLD }}
            >
              {busy === "coupon" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              {t("couponCta", "Comprar cupom")}
            </button>
          </div>
          {available.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {available.map((c) => (
                <li key={c.id} className="flex items-center justify-between border border-[#F5F1E8]/10 px-3 py-2 text-xs text-[#C9C2B6]">
                  <span className="font-mono font-bold text-[#F5F1E8]">{c.code}</span>
                  <span>{brl(c.discount_cents)}</span>
                  <span className="text-[#9A938A]">{c.status === "reserved" ? t("couponReserved", "em uma compra aberta") : t("couponAvailable", "disponível")}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {msg ? (
        <p role="status" className={cn("mt-3 border-2 px-4 py-2 text-sm", msg.ok ? "border-[#1FBF75]/50 text-[#BFF0D6]" : "border-[#dc2626]/60 text-[#FCA5A5]")}>
          {msg.text}
        </p>
      ) : null}

      {/* Histórico separado por moeda */}
      <div className="mt-3 border-2 border-[#F5F1E8]/10 bg-[#141009]">
        <div role="tablist" className="flex border-b-2 border-[#F5F1E8]/10">
          {(["gold", "emerald"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("flex-1 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]", tab === k ? "text-[#F5F1E8]" : "text-[#9A938A]")}
              style={tab === k ? { boxShadow: `inset 0 -3px 0 ${k === "gold" ? GOLD : EMERALD}` } : undefined}
            >
              {k === "gold" ? t("historyGold", "Histórico Gold") : t("historyEmerald", "Histórico Esmeralda")}
            </button>
          ))}
        </div>
        {history === null ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" /></div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#9A938A]">{t("historyEmpty", "Nenhuma movimentação ainda.")}</p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-[#F5F1E8]/10 overflow-y-auto">
            {history.map((tx) => {
              const old = tx.unit === "polen"
              return (
                <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#F5F1E8]">{t(TYPE_KEYS[tx.type] || "txOther", tx.type.replace(/_/g, " "))}</p>
                    <p className="text-[11px] text-[#9A938A]">
                      {new Date(tx.created_at).toLocaleString(locale)}
                      {old ? ` · ${t("oldUnit", "em Pólens, antes do Gold")}` : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-sm font-bold tabular-nums", tx.amount >= 0 ? "text-[#7FE3B0]" : "text-[#F5C26B]")}>
                    {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
