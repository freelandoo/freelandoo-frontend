import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/stripe/subscription/me`
    console.log("[stripe/subscription/me] Fetching:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    console.log("[stripe/subscription/me] Backend status:", response.status)

    const text = await response.text()
    console.log("[stripe/subscription/me] Backend body:", text.slice(0, 500))

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[stripe/subscription/me] Failed to parse JSON:", text.slice(0, 200))
      data = { error: "Resposta inválida do backend" }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[stripe/subscription/me] Exception:", msg)
    return NextResponse.json(
      { error: "Erro ao consultar ativação", detail: msg },
      { status: 500 }
    )
  }
}
