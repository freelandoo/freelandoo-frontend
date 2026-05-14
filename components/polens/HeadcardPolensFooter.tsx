"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Coins, History, Store, Play, Loader2 } from "lucide-react"
import { PolensHistoryModal } from "./PolensHistoryModal"
import { RewardedAdModal } from "./RewardedAdModal"
import type { PolenLimits, PolenWallet } from "./types"
import { cn } from "@/lib/utils"

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

/**
 * Versão fina do PolensCard — colada como footer do headcard.
 * Mostra saldo + progresso diário compacto + 3 ações pequenas
 * (loja, assistir anúncio, histórico).
 */
export function HeadcardPolensFooter({ className }: { className?: string }) {
  const [wallet, setWallet] = useState<PolenWallet | null>(null)
  const [limits, setLimits] = useState<PolenLimits | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [adOpen, setAdOpen] = useState(false)
  const [rewardToken, setRewardToken] = useState("")
  const [rewardAmount, setRewardAmount] = useState(0)

  const load = useCallback(async () => {
    const t = token()
    if (!t) return
    try {
      const res = await fetch("/api/polens/wallet", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (res.ok) {
        setWallet(data.wallet)
        setLimits(data.limits)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { void load() }, [load])

  async function requestAd() {
    const t = token()
    if (!t) return
    setRequesting(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch("/api/polens/rewarded-ad/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Você não pode assistir agora.")
      setRewardToken(data.reward_token)
      setRewardAmount(data.reward_amount)
      setStatus(data.message)
      setAdOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar anúncio")
    } finally {
      setRequesting(false)
    }
  }

  async function completeAd(tokenValue: string) {
    const t = token()
    if (!t) return
    const res = await fetch("/api/polens/rewarded-ad/complete", {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reward_token: tokenValue }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Erro ao creditar recompensa")
    setWallet(data.wallet)
    setStatus(`Você ganhou ${Math.abs(Number(data.rewarded) || rewardAmount)} Poléns.`)
    await load()
  }

  const balance = wallet?.balance ?? 0
  const reachedAdLimit =
    !!limits && (
      limits.ads_watched_today >= limits.ads_per_day ||
      limits.polens_earned_today >= limits.daily_polens_limit ||
      !limits.system_active
    )

  const dailyEarned = limits?.polens_earned_today ?? 0
  const dailyMax = limits?.daily_polens_limit ?? 0
  const pct = dailyMax > 0 ? Math.min(100, Math.round((dailyEarned / dailyMax) * 100)) : 0

  return (
    <div
      className={cn(
        "relative overflow-hidden border-t border-amber-300/15 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_45%),linear-gradient(180deg,rgba(24,24,27,0.55),rgba(9,9,11,0.65))] px-4 py-3 md:px-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* Saldo */}
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-amber-200">
            <Coins className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Meus Poléns</div>
            <div className="text-base font-bold text-amber-100 tabular-nums">{balance.toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* Progresso diário compacto */}
        {dailyMax > 0 && (
          <div className="min-w-[140px] flex-1 max-w-[260px]">
            <div className="mb-1 flex items-center justify-between text-[10px] text-white/55">
              <span>Hoje</span>
              <span className="tabular-nums text-amber-200/80">{dailyEarned}/{dailyMax}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Ações compactas */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href="/loja-polens"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-300/20"
          >
            <Store className="h-3.5 w-3.5" />
            Loja
          </Link>
          <button
            type="button"
            onClick={requestAd}
            disabled={requesting || reachedAdLimit}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
              reachedAdLimit
                ? "border-white/10 bg-white/[0.03] text-white/40"
                : "border-emerald-300/35 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/60 hover:bg-emerald-300/20",
            )}
            title={reachedAdLimit ? "Limite diário atingido" : "Assistir anúncio para ganhar Poléns"}
          >
            {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Anúncio
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:border-white/25 hover:text-white"
          >
            <History className="h-3.5 w-3.5" />
            Histórico
          </button>
        </div>
      </div>

      {(error || status) && (
        <p
          className={cn(
            "mt-2 text-[11px]",
            error ? "text-red-300" : "text-emerald-200/85",
          )}
        >
          {error || status}
        </p>
      )}

      <PolensHistoryModal open={historyOpen} onOpenChange={setHistoryOpen} />
      <RewardedAdModal
        open={adOpen}
        onOpenChange={setAdOpen}
        rewardAmount={rewardAmount}
        token={rewardToken}
        onComplete={completeAd}
      />
    </div>
  )
}

export default HeadcardPolensFooter
