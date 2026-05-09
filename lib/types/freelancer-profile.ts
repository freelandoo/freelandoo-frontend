export interface SocialMediaType {
  id_social_media_type: number
  desc_social_media_type: string
  icon: string
  base_url: string
}

export interface FollowerRange {
  id_follower_range: number
  follower_range: string
}

export interface Category {
  id_category: number
  desc_category: string
  subcategories: Subcategory[]
}

export interface SocialMedia {
  id_profile_social_media: string
  id_profile: string
  id_social_media_type: number
  desc_social_media_type: string
  icon: string
  base_url: string
  profile_url: string
  id_follower_range: number
  follower_range: string
  phone_number_normalized?: string | null
  is_active: boolean
}

export interface Subcategory {
  id_subcategory: number
  desc_subcategory: string
  id_category: number
}

export interface Status {
  id_status: string
  desc_status: string
  created_at: string
}

export interface FreelancerProfile {
  id_profile: string
  id_user: string
  username?: string | null
  id_category: number
  desc_category: string
  profession_slug?: string | null
  id_machine?: number | null
  machine_slug?: string | null
  machine_name?: string | null
  display_name: string
  bio: string
  avatar_url: string | null
  user_avatar: string | null
  is_active: boolean
  is_visible?: boolean
  is_paid?: boolean
  is_published?: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
  estado: string
  municipio: string
  subcategories: Subcategory[]
  statuses: Status[]
  social_media: SocialMedia[]
  /** Quando exposto pelo backend (tb_profile_booking_settings). */
  allow_booking?: boolean | null
  booking_settings?: { allow_booking?: boolean | null } | null
}

export interface PortfolioMedia {
  id_portfolio_media: string
  id_portfolio_item: string
  media_url: string
  media_type: string
  is_active: boolean
}

export interface PortfolioItem {
  id_portfolio_item: string
  id_profile: string
  title: string | null
  description: string | null
  project_url: string | null
  is_active?: boolean
  created_at: string
  media: PortfolioMedia[]
  likes_count?: number
  liked_by_me?: boolean
  author_display_name?: string | null
  author_avatar_url?: string | null
  author_username?: string | null
  is_clan_self?: boolean
}
