"use client"

// Freelandoo Ads — cliente de /impulsos/* (rewrite /api/* → backend).
import { getToken } from "@/lib/auth"
import type { FeedPost } from "@/lib/types/portfolio-feed"

export type AdTier = "cidade" | "regiao" | "estado" | "brasil"
export type AdObjective = "views" | "profile" | "whatsapp"
export type AdStatus = "pending_payment" | "active" | "paused" | "completed" | "canceled" | "expired" | "refunded" | "rejected"

export interface AdCampaign {
  id_campaign: string
  post_id: string
  objective: AdObjective
  tier: AdTier
  place: { city_name: string | null; uf: string | null; region_name: string | null }
  budget_cents: number
  credit_used_cents: number
  paid_cents: number
  cpm_cents: number
  goal_impressions: number
  days: number
  status: AdStatus
  start_at: string | null
  end_at: string | null
  impressions: number
  reach: number
  clicks_profile: number
  clicks_whatsapp: number
  spent_cents: number
  credited_back_cents: number
  created_at: string
  ended_at: string | null
  ended_reason: string | null
  post: (Partial<FeedPost> & { title?: string | null; thumb?: string | null }) | null
}

export interface AdConfig {
  tiers: { tier: AdTier; cpm_cents: number }[]
  min_budget_cents: number
  max_budget_cents: number
  max_days: number
  credit_cents: number
}

export interface AdEstimate {
  cpm_cents: number
  impressions: number
  reach_low: number
  reach_high: number
  audience: number
  per_day: number
  place: { city_name: string | null; uf: string | null; region_name: string | null }
  saturated: boolean
}

export class AdsError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function adsApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken()
  if (!token) throw new AdsError("login", 401)
  const res = await fetch(`/api/impulsos${path}`, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) throw new AdsError((data as { error?: string } | null)?.error || `HTTP ${res.status}`, res.status)
  return data as T
}

/** Evento de anúncio (impressão na tela / clique). Fogo-e-esquece. */
export function adEvent(id_campaign: string, type: "impression" | "profile" | "whatsapp") {
  const token = getToken()
  if (!token) return
  void fetch("/api/impulsos/eventos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id_campaign, type }),
    keepalive: true,
  }).catch(() => {})
}

export const TIER_ORDER: AdTier[] = ["cidade", "regiao", "estado", "brasil"]
