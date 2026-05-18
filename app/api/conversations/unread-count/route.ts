import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../_proxy"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ total: 0, by_actor: [] }, { status: 200 })
  }
  try {
    const response = await fetchWithTimeout(backendUrl("/conversations/unread-count"), {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    }, 2500)
    return proxyJson(response)
  } catch (error) {
    if (isFetchTimeout(error)) {
      return NextResponse.json({ total: 0, by_actor: [], timeout: true }, { status: 200 })
    }
    return NextResponse.json({ total: 0, by_actor: [] }, { status: 500 })
  }
}
