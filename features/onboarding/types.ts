export type DismissReason = "later" | "no_thanks" | "closed"

export interface MonetizationPath {
  id: string
  path_key: string
  title: string
  description: string
  cta_label: string
  banner_image_url: string | null
  sort_order: number
  is_active: boolean
  version: number
}

export interface MonetizationState {
  dismissed: boolean
  dismissed_at: string | null
  dismissed_reason: DismissReason | null
  selected_path_key: string | null
  selected_at: string | null
  active_tour_path_key: string | null
}

export interface MonetizationStatus {
  state: MonetizationState
  paths: MonetizationPath[]
}

export interface TourPathStep {
  id: string
  step_order: number
  route: string
  target_selector: string | null
  wait_for_selector: string | null
  placement: "top" | "bottom" | "left" | "right" | "center"
  title: string
  content: string
  on_enter_action: string | null
  on_leave_action: string | null
}

export type TourPathStatus = "not_started" | "in_progress" | "completed" | "skipped"

export interface TourPathProgress {
  status: TourPathStatus
  current_step: number
  path_version: number
  started_at: string | null
  completed_at: string | null
  skipped_at: string | null
}

export interface TourPathDetail {
  path: MonetizationPath
  steps: TourPathStep[]
  progress: TourPathProgress
}
