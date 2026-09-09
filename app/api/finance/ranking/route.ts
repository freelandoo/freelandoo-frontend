import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// A fila do Financeiro (?scope=city|state). A conta é a mesma do ranking de
// games e vive no backend — inclusive os PESOS, que descem no payload para a
// legenda não guardar uma segunda cópia deles.
export async function GET(request: Request) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const qs = new URL(request.url).searchParams.toString()
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/finance/ranking${qs ? `?${qs}` : ""}`,
      { method: "GET", headers: { Authorization: auth }, cache: "no-store" },
      9000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao carregar" }, {
      status: response.status,
    })
  } catch {
    return NextResponse.json({ error: "Falha ao carregar" }, { status: 502 })
  }
}
