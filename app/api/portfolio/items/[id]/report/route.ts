import { getBackendApiUrl } from "@/lib/backend"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const res = await fetch(`${getBackendApiUrl()}/portfolio/items/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao denunciar post" }, { status: 500 })
  }
}
