import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

function auth(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

// Extrato OFX/CSV (grátis): o texto do arquivo vai no JSON `{ content }`.
// O back limita a 3 MB; aqui só repassa.
export async function POST(request: Request) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const body = await request.text()
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/import`,
      { method: "POST", headers: { Authorization: a, "Content-Type": "application/json" }, body, cache: "no-store" },
      30000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
