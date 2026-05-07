import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../_proxy"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ error: "Autorizacao necessaria" }, { status: 401 })
  }
  const { id } = await context.params
  const url = new URL(request.url)
  const qs = url.search ? url.search : ""
  const response = await fetch(
    backendUrl(`/conversations/${encodeURIComponent(id)}${qs}`),
    {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    }
  )
  return proxyJson(response)
}
