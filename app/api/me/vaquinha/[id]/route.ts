import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const body = await request.text()
  const res = await fetch(`${BACKEND}/me/vaquinha/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
