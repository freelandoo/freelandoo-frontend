export type FeedMediaType = "image" | "video"

export interface FeedMedia {
  url: string
  type: FeedMediaType
  thumbnail_url: string | null
}

export interface FeedSocialLink {
  social_id: string
  type: string
  url: string
}

export interface FeedMachine {
  id: number
  slug: string | null
  name: string | null
  color_from: string | null
  color_to: string | null
  color_glow: string | null
  color_ring: string | null
  color_accent: string | null
  color_text: string | null
}

export interface FeedProfession {
  id: number
  name: string | null
  slug: string | null
}

export interface FeedPost {
  post_id: string
  profile_id: string
  profile_name: string | null
  avatar_url: string | null
  username: string | null
  is_clan: boolean
  sub_profile_slug: string | null
  machine: FeedMachine | null
  profession: FeedProfession | null
  city: string | null
  state: string | null
  title: string | null
  caption: string | null
  project_url: string | null
  source_type: "portfolio" | "course"
  source_course_id: string | null
  media: FeedMedia[]
  likes_count: number
  shares_count: number
  impressions_count: number
  profile_clicks_count: number
  whatsapp_clicks_count: number
  social_clicks_count: number
  comments_count?: number
  engagement_score: number
  published_at: string | null
  feed_kind: "feed" | "bees"
  viewer_has_liked: boolean
  public_profile_url: string | null
  whatsapp_url: string | null
  social_links: FeedSocialLink[]
}

export interface FeedResponse {
  items: FeedPost[]
  next_cursor: string | null
  has_more: boolean
}

export interface FeedFilters {
  id_machine: number | null
  id_category: number | null
  estado: string | null
  municipio: string | null
  level_min?: number | null
}

export type FeedEventType =
  | "impression"
  | "like"
  | "unlike"
  | "share"
  | "profile_click"
  | "whatsapp_click"
  | "social_click"
  | "view_more_caption"
