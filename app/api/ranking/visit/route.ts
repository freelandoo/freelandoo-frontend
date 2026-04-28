import { getBackendApiUrl } from "@/lib/backend"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const authHeader = request.headers.get("Authorization")

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (authHeader) headers["Authorization"] = authHeader

    const res = await fetch(`${getBackendApiUrl()}/ranking/visit`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (res.status === 204) return new Response(null, { status: 204 })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao registrar visita" }, { status: 500 })
  }
}
