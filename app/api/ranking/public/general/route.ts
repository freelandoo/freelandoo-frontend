import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ?? "10"

    const res = await fetch(`${getBackendApiUrl()}/ranking/public/general?limit=${limit}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar ranking geral" }, { status: 500 })
  }
}
