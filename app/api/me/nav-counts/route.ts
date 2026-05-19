import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout, isFetchTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

export const runtime = "edge"

const BACKEND = getBackendApiUrl()

const EMPTY = {
  conversations: { total: 0, by_actor: [] },
  serviceRequests: { has_new: false, unread_chats: 0 },
  notifications: { unread_count: 0 },
}

export async function GET(request: Request) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) return NextResponse.json(EMPTY)

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
    if (!response.ok) return NextResponse.json(EMPTY)
    let data: unknown = null
    try {
      const text = await readBodyWithTimeout(response, 2000)
      if (text) data = JSON.parse(text)
    } catch {
      data = null
    }
    if (!data) return NextResponse.json(EMPTY)
    return NextResponse.json(data)
  } catch (error) {
    if (isFetchTimeout(error)) {
      return NextResponse.json(EMPTY, { status: 200 })
    }
    return NextResponse.json(EMPTY, { status: 200 })
  }
}
