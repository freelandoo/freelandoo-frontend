import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// Detalhe de um recibo (para impressão/PDF).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/mei/receipts/${encodeURIComponent(id)}`,
      { method: "GET", headers: { Authorization: auth }, cache: "no-store" },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao carregar" }, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
