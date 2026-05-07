import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../_proxy"

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ actors: [] }, { status: 200 })
  }

  const response = await fetch(backendUrl("/entity-follows/actors"), {
    method: "GET",
    headers: { Authorization: auth },
    cache: "no-store",
  })
  return proxyJson(response)
}
