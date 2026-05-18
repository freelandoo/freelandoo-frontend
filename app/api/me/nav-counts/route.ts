import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

interface ConversationCounts {
  total?: number
  by_actor?: Array<{ actor_id: string; unread_count: number }>
}

interface ServiceBadgeCounts {
  has_new?: boolean
  unread_chats?: number
  mural_count?: number
  chat_unread?: number
}

interface NotificationCounts {
  unread_count?: number
  count?: number
}

async function readJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function fetchBackend<T>(path: string, auth: string): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(`${BACKEND}${path}`, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    }, 2500)
    return readJson<T>(response)
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({
      conversations: { total: 0, by_actor: [] },
      serviceRequests: { has_new: false, unread_chats: 0 },
      notifications: { unread_count: 0 },
    })
  }

  const [conversations, serviceRequests, notifications] = await Promise.all([
    fetchBackend<ConversationCounts>("/conversations/unread-count", auth),
    fetchBackend<ServiceBadgeCounts>("/service-requests/badge/me", auth),
    fetchBackend<NotificationCounts>("/me/notifications/unread-count", auth),
  ])

  const serviceUnread =
    Number(serviceRequests?.unread_chats) ||
    Number(serviceRequests?.chat_unread) ||
    Number(serviceRequests?.mural_count) ||
    0
  const notificationUnread = Number(notifications?.unread_count ?? notifications?.count) || 0

  return NextResponse.json({
    conversations: {
      total: Number(conversations?.total) || 0,
      by_actor: Array.isArray(conversations?.by_actor) ? conversations.by_actor : [],
    },
    serviceRequests: {
      has_new: !!serviceRequests?.has_new || serviceUnread > 0,
      unread_chats: serviceUnread,
    },
    notifications: {
      unread_count: notificationUnread,
    },
  })
}
