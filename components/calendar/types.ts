export type SlotStatus = "available" | "confirmed" | "pending_payment" | "blocked"

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  status: SlotStatus
  meta?: {
    serviceName?: string | null
    clientName?: string | null
    bookingId?: number
  }
}

export interface ProfileService {
  id_profile_service: number
  name: string
  description: string | null
  duration_minutes: number
  price_amount: number
  is_active?: boolean
  /** Capa do serviço, quando o backend enviar. */
  image_url?: string | null
  /** Midias anexadas ao servico. */
  media?: Array<{
    id_service_media?: number
    url?: string | null
    media_url?: string | null
    thumbnail_url?: string | null
    media_type?: "image" | "video" | string | null
    mime_type?: string | null
    sort_order?: number | null
  }>
  /** Perfis membro (serviços em clan). */
  member_profile_ids?: string[]
  /** Opt-in de afiliados (migration 090). */
  affiliates_allowed?: boolean
}

export interface AvailableSlot {
  start: string
  end: string
}

export interface WeekData {
  weekStart: string
  weekEnd: string
  availableSlots: { date: string; slots: AvailableSlot[] }[]
  events: CalendarEvent[]
}

export const STATUS_COLOR: Record<SlotStatus, { bg: string; border: string; text: string }> = {
  available:       { bg: "transparent",        border: "transparent",   text: "inherit" },
  confirmed:       { bg: "rgb(220 38 38 / 0.85)", border: "rgb(185 28 28)", text: "white" },
  pending_payment: { bg: "rgb(234 179 8 / 0.85)", border: "rgb(202 138 4)", text: "black" },
  blocked:         { bg: "rgb(212 212 216 / 0.35)", border: "rgb(161 161 170 / 0.6)", text: "rgb(244 244 245)" },
}
