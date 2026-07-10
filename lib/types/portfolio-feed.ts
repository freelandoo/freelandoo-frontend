export type FeedMediaType = "image" | "video"

export interface FeedMedia {
  url: string
  type: FeedMediaType
  thumbnail_url: string | null
}

/** Música anexada a um post/bee/story (metadado — tocada pelo player, não queimada). */
export interface FeedAudio {
  id_audio_track: string
  start_ms: number
  title: string | null
  artist: string | null
  audio_url: string | null
  cover_url: string | null
  duration_ms: number
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
  audio?: FeedAudio | null
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
  viewer_has_bookmarked?: boolean
  public_profile_url: string | null
  whatsapp_url: string | null
  social_links: FeedSocialLink[]
  /** Comunidade à qual o post está ligado (mig 160). Alimenta o botão
   *  "Acessar comunidade" no header do card do /feed. Null se não pertence. */
  community?: FeedCommunity | null
  /** Academia à qual o post está ligado (mig 181). Alimenta o chip "Acessar
   *  academia" no header do card do /feed. Null se não pertence. */
  academy?: FeedAcademy | null
  /** Recado: nota só-texto exclusiva do feed de uma comunidade (mig 162). */
  is_recado?: boolean
  recado_id?: number
  author_user_id?: string | null
}

export interface FeedCommunity {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
}

export interface FeedAcademy {
  id_academy: string
  slug: string | null
  nome: string | null
  avatar_url: string | null
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
  | "content_retention"

// ── Bees v2 (stories) ────────────────────────────────────────────────────────

/** Link estilizado anexado a um bee (máx. 3 por bee). */
export interface BeeLink {
  label: string
  url: string
  style: "gold" | "paper" | "ink"
}

/** Item da timeline /bees — GET /bees/timeline. post_id === id_story
 *  (espelha o FeedPost pra reaproveitar CommentsPanel e a anatomia do card). */
export interface BeeItem {
  id_story: string
  post_id: string
  profile_id: string
  profile_name: string | null
  avatar_url: string | null
  username: string | null
  is_clan: boolean
  sub_profile_slug: string | null
  machine: FeedMachine | null
  city: string | null
  state: string | null
  caption: string | null
  media_type: FeedMediaType
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number
  width: number | null
  height: number | null
  location: string | null
  links: BeeLink[]
  audio: FeedAudio | null
  likes_count: number
  comments_count: number
  shares_count: number
  impressions_count: number
  engagement_score: number
  created_at: string
  published_at: string
  effective_expires_at: string
  viewer_has_liked: boolean
  viewer_has_bookmarked: boolean
  public_profile_url: string | null
}

export interface BeeTimelineResponse {
  items: BeeItem[]
  next_cursor: string | null
  has_more: boolean
  scope: "global" | "following"
}
