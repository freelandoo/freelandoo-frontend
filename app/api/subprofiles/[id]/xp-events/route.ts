import { getBackendApiUrl } from "@/lib/backend"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") ?? "20"
    const offset = url.searchParams.get("offset") ?? "0"

    const res = await fetch(
      `${getBackendApiUrl()}/subprofiles/${id}/xp-events?limit=${limit}&offset=${offset}`
    )
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar eventos de XP" }, { status: 500 })
  }
}
