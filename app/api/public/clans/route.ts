import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const qs = url.searchParams.toString()
    const response = await fetch(
      `${BACKEND}/public/clans${qs ? `?${qs}` : ""}`,
      { method: "GET", cache: "no-store" }
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
    return NextResponse.json({ error: "Erro ao listar clans", detail: msg }, { status: 500 })
  }
}
