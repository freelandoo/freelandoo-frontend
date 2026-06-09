import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// Extrato de ganhos do user (Loja/Serviço/Curso/Afiliado), escopável por
// subperfil. Repassa auth + querystring (kind, profile, page, per_page).
export async function GET(request: Request) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const qs = new URL(request.url).searchParams.toString()
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/earnings${qs ? `?${qs}` : ""}`,
      { method: "GET", headers: { Authorization: auth }, cache: "no-store" },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao carregar" }, {
      status: response.status,
      headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=40" },
    })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
