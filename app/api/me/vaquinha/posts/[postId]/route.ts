import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function DELETE(request: Request, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const res = await fetch(`${BACKEND}/me/vaquinha/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    headers: { Authorization: auth },
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
