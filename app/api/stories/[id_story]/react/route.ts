import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id_story: string }> }
) {
  const { id_story } = await params
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const response = await fetch(
      `${BACKEND}/stories/${encodeURIComponent(id_story)}/react`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify(body),
      }
    )
    const data = await response.json().catch(() => ({}))
    return Response.json(data, { status: response.status })
  } catch {
    return Response.json({ error: "Erro ao reagir ao story" }, { status: 500 })
  }
}
