import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { id } = await params
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || ""
    const beforeId = url.searchParams.get("before_id") || ""
    const qs = new URLSearchParams()
    if (limit) qs.set("limit", limit)
    if (beforeId) qs.set("before_id", beforeId)

    const response = await fetch(
      `${BACKEND}/clans/${id}/messages${qs.toString() ? `?${qs}` : ""}`,
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
    return NextResponse.json({ error: "Erro ao listar mensagens", detail: msg }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const response = await fetch(`${BACKEND}/clans/${id}/messages`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
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
    return NextResponse.json({ error: "Erro ao postar mensagem", detail: msg }, { status: 500 })
  }
}
