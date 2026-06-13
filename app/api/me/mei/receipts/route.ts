import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// Lista recibos emitidos do user.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const qs = new URL(request.url).searchParams.toString()
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/mei/receipts${qs ? `?${qs}` : ""}`,
      { method: "GET", headers: { Authorization: auth }, cache: "no-store" },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao carregar" }, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}

// Emite um novo recibo.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await request.text()
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/mei/receipts`,
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body,
        cache: "no-store",
      },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao emitir" }, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
