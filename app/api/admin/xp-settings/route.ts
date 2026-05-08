import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

    const res = await fetch(`${getBackendApiUrl()}/admin/xp-settings`, {
      headers: { Authorization: authHeader },
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar configuração de XP" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

    const body = await request.json()
    const res = await fetch(`${getBackendApiUrl()}/admin/xp-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao salvar configuração de XP" }, { status: 500 })
  }
}
