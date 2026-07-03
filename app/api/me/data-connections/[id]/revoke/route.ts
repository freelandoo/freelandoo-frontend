import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../../_proxy"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ error: "Autorizacao necessaria" }, { status: 401 })
  }
  const { id } = await params
  const response = await fetch(backendUrl(`/me/data-connections/${id}/revoke`), {
    method: "POST",
    headers: { Authorization: auth },
  })
  return proxyJson(response)
}
