import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

function auth(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

// Os negócios que a pessoa lidera (mig 261) — o seletor "de qual negócio é"
// do lançamento na Vida Financeira.
export async function GET(request: Request) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/businesses`,
      { method: "GET", headers: { Authorization: a }, cache: "no-store" },
      8000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
