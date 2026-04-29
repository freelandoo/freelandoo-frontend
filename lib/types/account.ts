import type { SocialMedia } from "./freelancer-profile"

export interface RedeSocial {
  id?: string
  platform: string
  account: string
  followers_range: string
  social_media_type?: string
  social_id?: string | number
  url?: string
}

export interface ProfileSubscription {
  id_subscription?: string
  status?: "pending" | "active" | "past_due" | "canceled" | "expired" | "failed"
  amount_cents?: number
  currency?: string
  current_period_start?: string | null
  current_period_end?: string | null
  paid_at?: string | null
  canceled_at?: string | null
}

export interface Profile {
  bio?: string
  id_category?: number
  category?: string
  id_machine?: number | null
  machine_slug?: string | null
  machine_name?: string | null
  statuses?: { id_status: string; desc_status: string }[]
  avatar_url?: string | null
  id_profile: string
  display_name: string
  estado?: string | null
  municipio?: string | null
  is_active?: boolean
  is_visible?: boolean
  is_paid?: boolean
  is_published?: boolean
  is_clan?: boolean
  deleted_at?: string | null
  subscription?: ProfileSubscription | null
  redes_sociais?: RedeSocial[]
  social_media?: SocialMedia[]
}

export interface PerfilCompleto {
  id_user: string
  nome: string
  username?: string
  idade?: number | null
  data_nascimento?: string
  sexo?: string | null
  email: string
  telefone?: string
  estado?: string
  municipio?: string
  bio?: string
  avatar?: string | null
  ativo?: boolean
  premium?: boolean
  taxa_paga?: boolean
  redes_sociais?: RedeSocial[]
  media?: MediaItem[]
  statuses?: { id_status: string; desc_status: string }[]
  roles?: { id_role: string; desc_role: string }[]
  profiles?: Profile[]
  coupon_code?: string | null
}

export interface MediaItem {
  id?: string
  id_media?: number
  media_url: string
  media_type: "image" | "video"
  title?: string
  description?: string
  external_link?: string
  original_name?: string
  created_at?: string
  position?: number
}
