import { getBackendApiUrl } from "@/lib/backend"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id_profile: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) return Response.json({ can_rate: false }, { status: 200 })

    const { id_profile } = await params
    const res = await fetch(`${getBackendApiUrl()}/ranking/can-rate/${id_profile}`, {
      headers: { Authorization: authHeader },
    })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao verificar permissão de avaliação" }, { status: 500 })
  }
}
