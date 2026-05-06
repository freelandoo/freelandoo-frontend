import { getBackendApiUrl } from "@/lib/backend"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: "body inválido" }, { status: 400 })

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = request.headers.get("Authorization")
    if (auth) headers["Authorization"] = auth

    const res = await fetch(`${getBackendApiUrl()}/feed/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (res.status === 204) return new Response(null, { status: 204 })
    const data = await res.json().catch(() => ({}))
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao registrar evento" }, { status: 500 })
  }
}
