import { getBackendApiUrl } from "@/lib/backend"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Autorização necessária" }, { status: 401 })
  const body = await request.text()
  const res = await fetch(
    `${getBackendApiUrl()}/admin/chat-moderation/users/${encodeURIComponent(id)}/mute`,
    { method: "POST", headers: { Authorization: authHeader, "Content-Type": "application/json" }, body, cache: "no-store" }
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
