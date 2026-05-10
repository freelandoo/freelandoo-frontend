"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { History, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PolensBalance } from "./PolensBalance"
import { WatchAdButton } from "./WatchAdButton"
import { PolensHistoryModal } from "./PolensHistoryModal"
import { RewardedAdModal } from "./RewardedAdModal"
import { RewardedAdStatus } from "./RewardedAdStatus"
import { DailyLimitProgress } from "./DailyLimitProgress"
import type { PolenLimits, PolenWallet } from "./types"

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export function PolensCard() {
  const router = useRouter()
  const [wallet, setWallet] = useState<PolenWallet | null>(null)
  const [limits, setLimits] = useState<PolenLimits | null>(null)
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [adOpen, setAdOpen] = useState(false)
  const [rewardToken, setRewardToken] = useState("")
  const [rewardAmount, setRewardAmount] = useState(0)

  const load = useCallback(async () => {
    const t = token()
    if (!t) return
    setLoading(true)
    try {
      const res = await fetch("/api/polens/wallet", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar Poléns")
      setWallet(data.wallet)
      setLimits(data.limits)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Poléns")
    } finally {
      setLoading(false)
    }
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

  const reachedLimit = !!limits && (
    limits.ads_watched_today >= limits.ads_per_day ||
    limits.polens_earned_today >= limits.daily_polens_limit ||
    !limits.system_active
  )

  return (
    <section className="overflow-hidden rounded-[2rem] border border-amber-300/15 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">Meus Poléns</p>
            <PolensBalance balance={wallet?.balance || 0} />
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/62">
            Ganhe Poléns assistindo anúncios recompensados e use dentro da Freelandoo para ativar perfis,
            comprar destaques e acessar recursos extras. Poléns não são sacáveis, transferíveis nem conversíveis em dinheiro.
          </p>
          <DailyLimitProgress limits={limits} />
          <RewardedAdStatus message={status} error={error} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button onClick={() => router.push("/loja-polens")} className="bg-amber-300/15 text-amber-100 border border-amber-300/30 hover:bg-amber-300/25">
            <Store className="mr-1 h-4 w-4" />
            Loja de Polén
          </Button>
          <WatchAdButton disabled={loading || reachedLimit} loading={requesting} onClick={requestAd} />
          <Button variant="ghost" onClick={() => setHistoryOpen(true)} className="text-white/70 hover:text-white">
            <History className="mr-1 h-4 w-4" />
            Histórico
          </Button>
        </div>
      </div>
      {reachedLimit && limits?.system_active && (
        <p className="mt-3 text-xs text-amber-100/55">
          Você atingiu o limite de anúncios de hoje. Volte amanhã para ganhar mais Poléns.
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
    </section>
  )
}
