import { getBackendApiUrl } from "@/lib/backend"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const { id } = await params
    const res = await fetch(`${getBackendApiUrl()}/admin/posts/${id}/ban`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    const data = await res.json().catch(() => ({}))
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao banir post" }, { status: 500 })
  }
}
