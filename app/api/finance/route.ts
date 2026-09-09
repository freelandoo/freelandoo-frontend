import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// A plataforma Financeiro (mig 229) — UMA para o site inteiro. Devolve o
// id_profile dela, que é o que a página usa para pedir o feed em
// /api/communities/<id>/feed-posts: o Financeiro É uma comunidade, e o feed
// dele é o feed de comunidade de sempre.
//
// Auth obrigatória: a Carteira inteira é área logada, e o backend pode CRIAR a
// linha na primeira visita.
export async function GET(request: Request) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/finance`,
      { method: "GET", headers: { Authorization: auth }, cache: "no-store" },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao carregar" }, {
      status: response.status,
    })
  } catch {
    return NextResponse.json({ error: "Falha ao carregar" }, { status: 502 })
  }
}
