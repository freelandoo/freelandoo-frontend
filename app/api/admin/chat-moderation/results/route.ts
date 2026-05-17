import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Autorização necessária" }, { status: 401 })
  const url = `${getBackendApiUrl()}/admin/chat-moderation/results${new URL(request.url).search}`
  const res = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
