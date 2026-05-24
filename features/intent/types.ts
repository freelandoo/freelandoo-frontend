export type DismissReason = "later" | "no_thanks" | "closed"

export interface IntentPath {
  id: string
  path_key: string
  title: string
  description: string
  cta_label: string
  accent_color: string
  video_url: string | null
  poster_url: string | null
  banner_image_url: string | null
  sort_order: number
}

export interface IntentState {
  dismissed: boolean
  dismissed_at?: string | null
  selected_path_key: string | null
  selected_at?: string | null
}

export interface IntentStatus {
  state: IntentState
  paths: IntentPath[]
}

export interface ChosenPath {
  path_key: string
  title: string
  video_url: string | null
  poster_url: string | null
}
