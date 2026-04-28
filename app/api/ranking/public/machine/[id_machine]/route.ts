import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request, { params }: { params: Promise<{ id_machine: string }> }) {
  try {
    const { id_machine } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ?? "5"

    const res = await fetch(`${getBackendApiUrl()}/ranking/public/machine/${id_machine}?limit=${limit}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar ranking" }, { status: 500 })
  }
}
