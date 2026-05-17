import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const res = await fetch(`${getBackendApiUrl()}/me/bookmarks/folders`, {
      headers: { Authorization: auth },
    })
    const data = await res.json().catch(() => [])
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao carregar pastas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const body = await request.json()
    const res = await fetch(`${getBackendApiUrl()}/me/bookmarks/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao criar pasta" }, { status: 500 })
  }
}
