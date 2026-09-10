"use client"

// O PLANO NEGÓCIO no front (migs 225/234) — a única fonte de "que plano é" e
// "esta pessoa assina?" para as telas que o vendem: o modal, a página do
// negócio e o construtor do site.
//
// ─── POR QUE UM CACHE DE MÓDULO ─────────────────────────────────────────────
//
// O modal e a tela que o abre montam juntos, e os dois precisam do plano.
// Duas buscas do mesmo `/api/plans` na mesma tela é exatamente o tipo de
// requisição repetida que a regra da economia da Vercel proíbe. O cache dedupa
// a promessa (chamadas simultâneas esperam a mesma) e vale por alguns
// minutos; `refresh()` derruba-o quando algo mudou (voltou do checkout,
// cancelou).
//
// ─── QUAL É "O" PLANO ───────────────────────────────────────────────────────
//
// O que vende `site_share` — a chave da porta do site. Não o slug: o slug é
// identificador de banco e o dia em que um segundo plano existir a pergunta
// certa continua sendo "qual plano libera esta porta".

import { useCallback, useEffect, useState } from "react"
import { getToken } from "@/lib/auth"

export type BusinessPlan = {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  price_cents: number
  features: string[]
}

export type BusinessPlanSubscription = {
  plan_slug: string
  plan_name: string
  status: "active" | "past_due" | "pending" | "canceled"
  price_cents: number
  features: string[]
  current_period_end: string | null
}

type Snapshot = { plan: BusinessPlan | null; subscription: BusinessPlanSubscription | null }

export const BUSINESS_GATE_SITE_SHARE = "site_share"
export const BUSINESS_GATE_MEMBERS = "community_members"

const TTL_MS = 3 * 60 * 1000
let cache: { at: number; token: string | null; data: Snapshot } | null = null
let inflight: Promise<Snapshot> | null = null
const listeners = new Set<() => void>()

async function fetchSnapshot(token: string | null): Promise<Snapshot> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const [listRes, mineRes] = await Promise.all([
    fetch("/api/plans", { headers, cache: "no-store" }),
    token ? fetch("/api/plans/mine", { headers, cache: "no-store" }) : Promise.resolve(null),
  ])
  const list = listRes.ok ? await listRes.json().catch(() => null) : null
  const plans: BusinessPlan[] = Array.isArray(list?.plans) ? list.plans : []
  const plan =
    plans.find((p) => (p.features || []).includes(BUSINESS_GATE_SITE_SHARE)) || plans[0] || null
  let subscription: BusinessPlanSubscription | null = null
  if (mineRes && mineRes.ok) {
    const mine = await mineRes.json().catch(() => null)
    subscription = mine?.subscription || null
  } else if (list?.subscription) {
    subscription = list.subscription
  }
  return { plan, subscription }
}

function load(force = false): Promise<Snapshot> {
  const token = getToken()
  if (!force && cache && cache.token === token && Date.now() - cache.at < TTL_MS) {
    return Promise.resolve(cache.data)
  }
  if (!force && inflight) return inflight
  inflight = fetchSnapshot(token)
    .then((data) => {
      cache = { at: Date.now(), token, data }
      listeners.forEach((fn) => fn())
      return data
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Derruba o cache e avisa quem está montado — depois do checkout ou de cancelar. */
export function refreshBusinessPlan() {
  cache = null
  return load(true)
}

export function useBusinessPlan() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(cache?.data ?? null)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let alive = true
    const sync = () => {
      if (alive && cache) setSnapshot(cache.data)
    }
    listeners.add(sync)
    load()
      .then((data) => {
        if (alive) setSnapshot(data)
      })
      .catch(() => {
        /* sem plano na tela é menos grave do que derrubar a tela */
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
      listeners.delete(sync)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await refreshBusinessPlan()
      setSnapshot(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const subscription = snapshot?.subscription ?? null
  const isActive = !!subscription && (subscription.status === "active" || subscription.status === "past_due")

  /**
   * Abre o checkout e leva a pessoa ao Stripe. `returnTo` é o caminho desta
   * tela — é para cá que ela volta, com `?plano=sucesso|cancelado`.
   */
  const subscribe = useCallback(
    async (returnTo: string): Promise<{ error?: string }> => {
      const token = getToken()
      const plan = snapshot?.plan
      if (!token) return { error: "login" }
      if (!plan) return { error: "no_plan" }
      const res = await fetch(`/api/plans/${encodeURIComponent(plan.slug)}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ return_to: returnTo }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.checkout_url) return { error: data?.error || "checkout" }
      window.location.href = data.checkout_url
      return {}
    },
    [snapshot?.plan],
  )

  const cancel = useCallback(async (): Promise<{ error?: string; active_until?: string | null }> => {
    const token = getToken()
    if (!token) return { error: "login" }
    const res = await fetch("/api/plans/mine", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { error: data?.error || "cancel" }
    await refreshBusinessPlan()
    return { active_until: data?.active_until ?? null }
  }, [])

  return { plan: snapshot?.plan ?? null, subscription, isActive, loading, subscribe, cancel, refresh }
}
