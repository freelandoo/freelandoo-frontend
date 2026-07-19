import { getBackendApiUrl } from "@/lib/backend"
import { UserAccountPublicClient } from "./user-account-public-client"

export type Media = {
  id_portfolio_media: string
  media_url: string
  media_type: "image" | "video"
  is_active?: boolean
}

export type Item = {
  id_portfolio_item: string
  title: string | null
  description: string | null
  project_url: string | null
  feed_kind?: "feed" | "bees"
  media: Media[]
}

export type PublicUserProfile = {
  id_profile: string
  display_name: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  estado: string | null
  municipio: string | null
  manifestation?: {
    banner_url?: string | null
    banner_thumb_url?: string | null
    tag_label?: string | null
    tag_color?: string | null
    tag_icon?: string | null
  } | null
}

export type Course = {
  id: string
  title: string
  slug: string | null
  short_description: string | null
  cover_url: string | null
  price_cents: number | null
  published_at: string | null
}

export type AccountSocialMedia = {
  id_social_media_type: number
  desc_social_media_type: string
  icon?: string | null
  url: string | null
  follower_range?: string | null
}

// Paridade user≡subperfil: XP/nível + seguidores + redes do perfil-conta.
export type AccountInfo = {
  id_profile: string
  xp_total: number
  xp_level: number
  xp_progress_percent: number
  followers_count: number
  following_count: number
  social_media: AccountSocialMedia[]
}

export type AccountSummary = {
  profiles_count: number
  clans_count: number
  courses: Course[]
  account: AccountInfo | null
}

const emptySummary: AccountSummary = {
  profiles_count: 0,
  clans_count: 0,
  courses: [],
  account: null,
}

async function fetchPortfolio(id_profile: string): Promise<Item[]> {
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/profile/${id_profile}/portfolio`,
      { cache: "no-store" }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.items || []
  } catch {
    return []
  }
}

async function fetchAccountSummary(handle: string | null): Promise<AccountSummary> {
  if (!handle) return emptySummary
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/public/users/${encodeURIComponent(handle)}/account-summary`,
      { cache: "no-store" }
    )
    if (!res.ok) return emptySummary
    const data = await res.json()
    const rawAccount = data.account
    return {
      profiles_count: Number(data.profiles_count || 0),
      clans_count: Number(data.clans_count || 0),
      courses: Array.isArray(data.courses) ? data.courses : [],
      account: rawAccount?.id_profile
        ? {
            id_profile: String(rawAccount.id_profile),
            xp_total: Number(rawAccount.xp_total || 0),
            xp_level: Number(rawAccount.xp_level || 0),
            xp_progress_percent: Number(rawAccount.xp_progress_percent || 0),
            followers_count: Number(rawAccount.followers_count || 0),
            following_count: Number(rawAccount.following_count || 0),
            social_media: Array.isArray(rawAccount.social_media)
              ? rawAccount.social_media
              : [],
          }
        : null,
    }
  } catch {
    return emptySummary
  }
}

export async function UserAccountPublicView({ profile }: { profile: PublicUserProfile }) {
  const [items, summary] = await Promise.all([
    fetchPortfolio(profile.id_profile),
    fetchAccountSummary(profile.username),
  ])

  return <UserAccountPublicClient profile={profile} items={items} summary={summary} />
}

export default UserAccountPublicView
