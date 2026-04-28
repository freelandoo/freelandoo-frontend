import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()

    const res = await fetch(`${getBackendApiUrl()}/admin/rankings${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: authHeader },
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar rankings" }, { status: 500 })
  }
}
