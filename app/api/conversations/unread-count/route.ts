import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../_proxy"

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ total: 0, by_actor: [] }, { status: 200 })
  }
  const response = await fetch(backendUrl("/conversations/unread-count"), {
    method: "GET",
    headers: { Authorization: auth },
    cache: "no-store",
  })
  return proxyJson(response)
}
