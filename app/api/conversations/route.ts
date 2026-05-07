import { NextResponse } from "next/server"
import { authHeader, backendUrl, proxyJson } from "./_proxy"

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ error: "Autorizacao necessaria" }, { status: 401 })
  }
  const url = new URL(request.url)
  const qs = url.search ? url.search : ""
  const response = await fetch(backendUrl(`/conversations${qs}`), {
    method: "GET",
    headers: { Authorization: auth },
    cache: "no-store",
  })
  return proxyJson(response)
}

export async function POST(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json({ error: "Autorizacao necessaria" }, { status: 401 })
  }
  const body = await request.text()
  const response = await fetch(backendUrl("/conversations"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body,
  })
  return proxyJson(response)
}
