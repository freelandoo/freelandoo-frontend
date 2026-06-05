import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout, isFetchTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authorization) {
    return NextResponse.json({ error: "Token nao fornecido" }, { status: 401 })
  }

  try {
    const body = await request.text()
    const response = await fetchWithTimeout(
      `${getBackendApiUrl()}/ranking/heartbeat`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: body || "{}",
        cache: "no-store",
      },
      4000
    )
    const text = await readBodyWithTimeout(response, 2000)
    let data: unknown = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text || "Erro de proxy" }
    }
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    if (isFetchTimeout(error)) {
      return NextResponse.json({ error: "Heartbeat demorou para responder" }, { status: 504 })
    }
    return NextResponse.json({ error: "Erro no heartbeat" }, { status: 500 })
  }
}
