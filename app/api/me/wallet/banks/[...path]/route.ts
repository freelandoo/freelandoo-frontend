import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

function auth(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

// Lista FECHADA do que passa por aqui: checkout, cancel, connect-token, items
// (POST) e /<id_connection> (DELETE). Qualquer outro caminho é 404 — o proxy
// não vira túnel para o resto do back.
const POST_PATHS = new Set(["checkout", "cancel", "connect-token", "items"])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Ctx = { params: Promise<{ path: string[] }> }

async function forward(url: string, init: RequestInit) {
  try {
    const r = await fetchWithTimeout(url, { ...init, cache: "no-store" }, 20000)
    return NextResponse.json(await r.json().catch(() => null), { status: r.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const { path } = await params
  if (path.length !== 1 || !POST_PATHS.has(path[0])) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  const body = await request.text()
  return forward(`${BACKEND}/me/wallet/banks/${path[0]}`, {
    method: "POST",
    headers: { Authorization: a, "Content-Type": "application/json" },
    body: body || "{}",
  })
}

export async function DELETE(request: Request, { params }: Ctx) {
  const a = auth(request)
  if (!a) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const { path } = await params
  if (path.length !== 1 || !UUID_RE.test(path[0])) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return forward(`${BACKEND}/me/wallet/banks/${encodeURIComponent(path[0])}`, {
    method: "DELETE",
    headers: { Authorization: a },
  })
}
