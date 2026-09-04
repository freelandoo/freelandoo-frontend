import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

function auth(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

// Soma vitalícia das ENTRADAS manuais da Vida Financeira — a metade "sua" do
// KPI "Total recebido" da Carteira. A outra metade vem de /me/earnings.
export async function GET(request: Request) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/received-in`,
      { method: "GET", headers: { Authorization: a }, cache: "no-store" },
      8000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
