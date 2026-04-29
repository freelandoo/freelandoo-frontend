import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
    }

    const url = new URL(request.url)
    const username = url.searchParams.get("username") || ""
    const response = await fetch(
      `${BACKEND}/clans/invitable?username=${encodeURIComponent(username)}`,
      { method: "GET", headers: { Authorization: authHeader } }
    )

    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao buscar perfis", detail: msg }, { status: 500 })
  }
}
