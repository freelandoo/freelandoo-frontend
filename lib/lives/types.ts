// Tipos compartilhados das Lives (espelham o LiveService do backend).

export interface LiveMachine {
  name: string | null
  slug: string | null
  color_from: string | null
  color_to: string | null
  color_ring: string | null
  color_accent: string | null
}

export interface LiveProfileLite {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  is_clan: boolean
  username: string | null
}

export interface Live {
  id_live: string
  id_profile: string
  id_user: string
  room_name: string
  title: string | null
  status: "live" | "ended"
  peak_viewers: number
  started_at: string
  ended_at: string | null
  is_owner?: boolean
  profile: LiveProfileLite
  machine: LiveMachine | null
}

// Resposta de start/join: live + credenciais LiveKit.
export interface LiveSession {
  live: Live
  token: string
  ws_url: string
  role?: "broadcaster" | "viewer"
}

export interface LiveGift {
  id_live_gift: string
  name: string
  emoji: string
  color: string
  animation: string
  price_polens: number
}

export interface SendGiftResult {
  polens_spent: number
  wallet?: { balance: number }
  gift: Pick<LiveGift, "id_live_gift" | "name" | "emoji" | "color" | "animation">
}
