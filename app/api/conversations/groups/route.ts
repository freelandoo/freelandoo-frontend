import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "../_proxy"

export async function POST(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ error: "Autorizacao necessaria" }, { status: 401 })
  }
  const body = await request.text()
  const response = await fetch(backendUrl("/conversations/groups"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body,
  })
  return proxyJson(response)
}
