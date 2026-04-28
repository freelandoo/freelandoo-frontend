import { getBackendApiUrl } from "@/lib/backend"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

    const body = await request.json()
    const res = await fetch(`${getBackendApiUrl()}/ranking/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao registrar avaliação" }, { status: 500 })
  }
}
