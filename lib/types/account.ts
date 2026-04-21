export interface RedeSocial {
  id?: string
  platform: string
  account: string
  followers_range: string
  social_media_type?: string
  social_id?: string | number
  url?: string
}

export interface Profile {
  bio?: string
  category?: string
  statuses?: { id_status: string; desc_status: string }[]
  avatar_url?: string | null
  id_profile: string
  display_name: string
  redes_sociais?: RedeSocial[]
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
