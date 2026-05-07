export type EntityFollowType = "profile" | "clan"

export interface FollowEntity {
  id: string
  type: EntityFollowType
  display_name: string | null
  bio?: string | null
  avatar_url?: string | null
  estado?: string | null
  municipio?: string | null
  username?: string | null
  sub_profile_slug?: string | null
  profession_name?: string | null
  profession_slug?: string | null
  machine_name?: string | null
  machine_slug?: string | null
  members_count?: number | null
  followed_at?: string | null
}

export interface FollowCounts {
  followers_count: number
  following_count: number
  followers_label: string
  following_label: string
}

export interface FollowActor extends FollowEntity {
  type: EntityFollowType
}

export interface FollowListResponse {
  items: FollowEntity[]
  next_cursor: string | null
  has_more: boolean
  title: string
}
