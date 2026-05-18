import { getBackendApiUrl } from "@/lib/backend"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const { itemId } = await params
    const body = await request.json()
    const res = await fetch(`${getBackendApiUrl()}/portfolio/items/${itemId}/report`, {
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
