import { getBackendApiUrl } from "@/lib/backend"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const res = await fetch(`${getBackendApiUrl()}/subprofiles/${id}/xp-summary`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar resumo de XP" }, { status: 500 })
  }
}
