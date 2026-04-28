import { getBackendApiUrl } from "@/lib/backend"

export async function GET(_request: Request, { params }: { params: Promise<{ id_profile: string }> }) {
  try {
    const { id_profile } = await params
    const res = await fetch(`${getBackendApiUrl()}/ranking/ratings/${id_profile}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar avaliações" }, { status: 500 })
  }
}
