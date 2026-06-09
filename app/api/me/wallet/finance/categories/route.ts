import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

function auth(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

// Categorias (presets + recentes) por direction/recurrence (GET) e custom (POST).
export async function GET(request: Request) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const qs = new URL(request.url).searchParams.toString()
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/categories${qs ? `?${qs}` : ""}`,
      { method: "GET", headers: { Authorization: a }, cache: "no-store" },
      8000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const body = await request.text()
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/categories`,
      { method: "POST", headers: { Authorization: a, "Content-Type": "application/json" }, body, cache: "no-store" },
      8000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
