import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../_proxy"

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ is_following: false }, { status: 200 })
  }

  const url = new URL(request.url)
  const response = await fetch(
    backendUrl(`/entity-follows/status?${url.searchParams.toString()}`),
    {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    }
  )
  return proxyJson(response)
}
