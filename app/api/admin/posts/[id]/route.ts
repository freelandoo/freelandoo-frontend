import { getBackendApiUrl } from "@/lib/backend"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })
    const { id } = await params
    const res = await fetch(`${getBackendApiUrl()}/admin/posts/${id}`, {
      method: "GET",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao carregar post" }, { status: 500 })
  }
}
