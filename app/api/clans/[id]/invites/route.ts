import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

async function forward(
  request: NextRequest,
  id: string,
  method: "GET" | "POST"
) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
  }

  const init: RequestInit = {
    method,
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
  }
  if (method === "POST") {
    init.body = JSON.stringify(await request.json())
  }

  const response = await fetch(`${BACKEND}/clans/${id}/invites`, init)
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  return NextResponse.json(data, { status: response.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return await forward(request, id, "GET")
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao listar convites", detail: msg }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return await forward(request, id, "POST")
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao convidar", detail: msg }, { status: 500 })
  }
}
