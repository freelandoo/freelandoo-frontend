import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

function auth(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

// Editar (PATCH) e excluir (DELETE) um lançamento.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const { id } = await params
  const body = await request.text()
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/${encodeURIComponent(id)}`,
      { method: "PATCH", headers: { Authorization: a, "Content-Type": "application/json" }, body, cache: "no-store" },
      8000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const { id } = await params
  try {
    const r = await fetchWithTimeout(
      `${BACKEND}/me/wallet/finance/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Authorization: a }, cache: "no-store" },
      8000
    )
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
