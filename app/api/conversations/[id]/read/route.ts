import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../../_proxy"

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
    backendUrl(`/conversations/${encodeURIComponent(id)}/read`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body,
    }
  )
  return proxyJson(response)
}
