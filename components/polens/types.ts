export type PolenWallet = {
  id: string
  user_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
}

export type PolenLimits = {
  ads_per_day: number
  polens_per_ad: number
  daily_polens_limit: number
  cooldown_seconds: number
  ads_watched_today: number
  polens_earned_today: number
  system_active: boolean
}

export type PolenTransaction = {
  id: string
  type: string
  amount: number
  source: string | null
  status: string
  metadata: Record<string, unknown>
  created_at: string
}

export type PolenProductKey =
  | "profile_activation"
  | "premium_highlight"
  | "post_boost"
  | "profile_boost"
  | "clan_highlight"
