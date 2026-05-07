import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../../_proxy"

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
    backendUrl(`/conversations/${encodeURIComponent(id)}/messages${qs}`),
    {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    }
  )
  return proxyJson(response)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ error: "Autorizacao necessaria" }, { status: 401 })
  }
  const { id } = await context.params
  const body = await request.text()
  const response = await fetch(
    backendUrl(`/conversations/${encodeURIComponent(id)}/messages`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body,
    }
  )
  return proxyJson(response)
}
