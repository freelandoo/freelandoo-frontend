import { getBackendApiUrl } from "@/lib/backend"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

    const res = await fetch(`${getBackendApiUrl()}/admin/ranking/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao recalcular ranking" }, { status: 500 })
  }
}
