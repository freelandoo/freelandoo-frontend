import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

export const runtime = "edge"

const BACKEND = getBackendApiUrl()

interface NavCountsResponse {
  conversations?: { total?: number }
  serviceRequests?: { unread_chats?: number; has_new?: boolean }
  notifications?: { unread_count?: number }
}

// Alias compacto para /me/nav-counts — retorna apenas os números, sem
// detalhamento por ator. Existe para casos onde só queremos contadores.
// Cache privado curto pra reduzir invocations Vercel quando vários
// componentes pedem ao mesmo tempo.
export async function GET(request: Request) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json(
      { serviceRequests: 0, notifications: 0, conversations: 0 },
      { status: 401 }
    )
  }

  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/nav-counts`,
      {
        method: "GET",
        headers: { Authorization: auth },
        cache: "no-store",
      },
      6000
    )
    if (!response.ok) {
      return NextResponse.json(
        { serviceRequests: 0, notifications: 0, conversations: 0 },
        { status: 200 }
      )
    }
    const data = (await response.json().catch(() => null)) as NavCountsResponse | null
    return NextResponse.json(
      {
        serviceRequests: Number(data?.serviceRequests?.unread_chats) || 0,
        notifications: Number(data?.notifications?.unread_count) || 0,
        conversations: Number(data?.conversations?.total) || 0,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    )
  } catch {
    return NextResponse.json(
      { serviceRequests: 0, notifications: 0, conversations: 0 },
      { status: 200 }
    )
  }
}
