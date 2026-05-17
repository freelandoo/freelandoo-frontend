import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../../_proxy"

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json(
      { following_count: 0, following_label: "perfis acompanhados" },
      { status: 200 }
    )
  }

  const response = await fetch(backendUrl("/entity-follows/me/summary"), {
    method: "GET",
    headers: { Authorization: auth },
    cache: "no-store",
  })
  return proxyJson(response)
}
