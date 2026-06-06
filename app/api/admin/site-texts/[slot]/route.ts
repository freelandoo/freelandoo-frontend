import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function POST(
  request: Request,
  ctx: { params: Promise<{ slot: string }> },
) {
  const { slot } = await ctx.params
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

  const body = await request.text()
  const res = await fetch(`${BACKEND}/admin/site-texts/${encodeURIComponent(slot)}`, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
